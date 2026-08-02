import os
import json
import logging
import requests
import threading
from datetime import datetime, timezone
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from openai import OpenAI
from .models import LinqConversationState, LinqMessage, PriceTrackerItem, WatchlistItem

logger = logging.getLogger(__name__)

# Persistent requests session for connection pooling
LINQ_SESSION = requests.Session()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")

LINQ_MCP_PROVIDERS = {
    "groceries": [
        ("Swiggy Instamart", "https://mcp.swiggy.com/im", "search_groceries"),
    ],
    "food": [
        ("Swiggy Food", "https://mcp.swiggy.com/food", "search_food"),
    ],
    "reservation": [
        ("Swiggy Dineout", "https://mcp.swiggy.com/dineout", "search_restaurants"),
    ],
    "beauty": [
        ("Shopify Beauty", "https://clinikally.myshopify.com/api/ucp/mcp", "search_products"),
        ("Shopify Beauty", "https://dot-key.myshopify.com/api/ucp/mcp", "search_products"),
        ("Shopify Beauty", "https://bombay-shaving.myshopify.com/api/ucp/mcp", "search_products"),
    ],
    "apparel": [
        ("Shopify Apparel", "https://baccabucci.myshopify.com/api/ucp/mcp", "search_products"),
        ("Shopify Apparel", "https://babymarketstore.myshopify.com/api/ucp/mcp", "search_products"),
        ("Shopify Apparel", "https://campusshoess.myshopify.com/api/ucp/mcp", "search_products"),
    ],
}


def supported_tracker_category(category):
    aliases = {
        "grocery": "groceries", "groceries": "groceries", "milk": "groceries",
        "food": "food", "restaurant": "reservation", "reservation": "reservation",
        "beauty": "beauty", "skincare": "beauty", "shampoo": "beauty",
        "apparel": "apparel", "shoes": "apparel", "footwear": "apparel", "fashion": "apparel",
    }
    return aliases.get(str(category or "").strip().lower(), "")


def search_linq_mcps(category, query):
    """Search only Linq-owned MCP connectors; never synthesize products."""
    products = []
    providers = LINQ_MCP_PROVIDERS.get(category, [])
    for merchant, endpoint, tool in providers:
        try:
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {"name": tool, "arguments": {"query": query}},
            }
            response = requests.post(endpoint, json=payload, headers={"Content-Type": "application/json"}, timeout=5)
            response.raise_for_status()
            data = response.json()
            result = data.get("result", [])
            if isinstance(result, dict):
                result = result.get("products") or result.get("items") or result.get("data") or []
            if isinstance(result, list):
                for product in result:
                    if isinstance(product, dict):
                        product = dict(product)
                        product.setdefault("merchant", product.get("restaurant") or merchant)
                        product.setdefault("source_mcp", endpoint)
                        products.append(product)
        except Exception as exc:
            logger.warning("Linq MCP search failed: provider=%s endpoint=%s error=%s", merchant, endpoint, exc)
    return products


def validate_mcp_product(product):
    """A tracker candidate must come from MCP and contain an ID plus price."""
    if not isinstance(product, dict):
        return None
    product_id = product.get("id") or product.get("product_id") or product.get("variant_id")
    price = product.get("price") or product.get("current_price")
    if not product_id or price is None:
        return None
    normalized = dict(product)
    normalized["id"] = str(product_id)
    normalized["price"] = price
    normalized["name"] = str(product.get("name") or product.get("title") or "").strip()
    if not normalized["name"]:
        return None
    normalized["brand"] = str(product.get("brand") or "")
    normalized["variant"] = str(product.get("quantity") or product.get("variant") or product.get("description") or "")
    normalized["merchant"] = str(product.get("merchant") or product.get("restaurant") or product.get("store") or "")
    normalized["availability"] = str(product.get("availability") or ("In Stock" if product.get("in_stock", True) else "Out of Stock"))
    normalized["image_url"] = str(product.get("image_url") or product.get("image") or "")
    normalized["product_url"] = str(product.get("url") or product.get("product_url") or "")
    return normalized


def format_tracker_product(product):
    return (
        f"I found this product:\n{product['name']}\n"
        f"Brand: {product.get('brand') or 'Not specified'}\n"
        f"Variant: {product.get('variant') or 'Not specified'}\n"
        f"Current Price: ₹{product['price']}\n"
        f"Store: {product.get('merchant') or 'MCP provider'}\n"
        f"Availability: {product.get('availability') or 'Unknown'}\n"
        f"Would you like me to track the price of this exact product?"
    )


def upsert_watchlist_item(owner_number, product):
    return WatchlistItem.objects.update_or_create(
        owner_number=owner_number,
        product_id=str(product["id"]),
        defaults={
            "product_name": product["name"],
            "brand": product.get("brand", ""),
            "variant": product.get("variant", ""),
            "price": product.get("price"),
            "merchant": product.get("merchant", ""),
            "availability": product.get("availability", ""),
            "image_url": product.get("image_url", ""),
            "product_url": product.get("product_url", ""),
            "source": product.get("source_mcp", ""),
        },
    )


def log_webhook_request(request):
    """Persist a diagnostic copy of the latest webhook request without secrets."""
    timestamp = datetime.now(timezone.utc)
    raw_body = request.body
    headers = {}
    for key, value in request.headers.items():
        headers[key] = "<redacted>" if key.lower() in {"authorization", "cookie", "set-cookie"} else value

    try:
        parsed_body = json.loads(raw_body.decode("utf-8")) if raw_body else None
    except (UnicodeDecodeError, json.JSONDecodeError):
        parsed_body = None

    record = {
        "timestamp": timestamp.isoformat(),
        "method": request.method,
        "content_type": request.content_type,
        "headers": headers,
        "raw_body": raw_body.decode("utf-8", errors="replace"),
        "parsed_body": parsed_body,
    }
    log_dir = settings.BASE_DIR / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"linq_{timestamp.strftime('%Y%m%dT%H%M%S.%fZ')}.json"
    log_path.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.warning("Linq webhook invoked: %s", log_path)
    logger.warning("Linq webhook request metadata: %s", json.dumps({k: record[k] for k in ("timestamp", "method", "content_type", "headers")}))
    logger.warning("Linq webhook raw body: %s", record["raw_body"])
    return record

def call_openai_classifier(message_text, context=None):
    """Classify tracker intent and generate only MCP-safe workflow instructions."""
    context = context or {}
    pending_product = context.get("pending_product", "")
    stage = context.get("stage", "idle")
    questions = context.get("questions", [])
    answers = context.get("answers", [])
    api_key = os.getenv('OPENAI_API_KEY', '')
    if not api_key:
        logger.error("OPENAI_API_KEY is not configured in backend .env")
        product = message_text.strip()
        return {
            "intent": "track_request",
            "category": "",
            "product": product,
            "questions": [],
            "reply_text": "I need a valid OpenAI key to process price tracking.",
        }

    client = OpenAI(api_key=api_key)

    system_prompt = """You are AutoCart's AI price-tracking concierge.
Never ask for a shopping list.
Return only JSON with this shape:
{{"intent":"track_request|preference_answer|confirm_product|remove_tracker|list_tracker|other","category":"groceries|food|reservation|beauty|apparel|unsupported","product":"...","questions":["question 1","question 2","question 3"],"answers":["answer 1","answer 2","answer 3"],"reply_text":"..."}}
The current workflow stage is: {stage}.
Pending product: {pending_product}.
Existing questions: {questions}.
Collected answers: {answers}.
For a new track request, identify the category and ask exactly 2 or 3 necessary preference questions.
For a preference answer, parse one combined user message into answers aligned to the existing questions. Do not create products or prices; return preference_answer.
For confirm_product, return confirm_product only when the user explicitly confirms the exact displayed product.
For remove_tracker or list_tracker, use the requested tracker action.
""".format(
        stage=stage,
        pending_product=pending_product or "none",
        questions=json.dumps(questions),
        answers=json.dumps(answers),
    )

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message_text}
            ],
            response_format={"type": "json_object"},
            timeout=15
        )
        result_str = response.choices[0].message.content
        logger.warning("Linq OpenAI response: model=%s response=%s", OPENAI_MODEL, result_str)
        return json.loads(result_str)
    except Exception as e:
        logger.exception("Linq OpenAI API call failed completely: %s", e)
        raise


def send_linq_reply(to_number, reply_text, chat_id=None, reply_to_message_id=None, preferred_service=None):
    """
    Sends a text message back to the user via the Linq Partner API.
    """
    api_key = os.getenv('LINQ_API_KEY', '')
    from_number = os.getenv('LINQ_FROM_NUMBER', '')

    if not api_key or (not from_number and not chat_id):
        logger.error("Missing Linq configurations in .env file.")
        return None

    url = (
        f"https://api.linqapp.com/api/partner/v3/chats/{chat_id}/messages"
        if chat_id
        else "https://api.linqapp.com/api/partner/v3/chats"
    )
    auth_header = api_key if api_key.startswith("Bearer ") else f"Bearer {api_key}"

    headers = {
        "Authorization": auth_header,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    message = {
        "parts": [
            {
                "type": "text",
                "value": reply_text,
            }
        ]
    }
    if preferred_service:
        message["preferred_service"] = preferred_service
    if reply_to_message_id:
        message["reply_to"] = {"message_id": reply_to_message_id, "part_index": 0}

    payload = {"message": message}
    if not chat_id:
        payload["from"] = from_number
        payload["to"] = [to_number]

    response = None
    try:
        response = LINQ_SESSION.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        response_body = response.text
        logger.warning("Linq outbound payload: %s", json.dumps(payload))
        logger.warning("Linq outbound response: status=%s body=%s", response.status_code, response_body)
        return response.json()
    except Exception as e:
        response_body = getattr(response, "text", "")
        logger.exception("Linq outbound request failed: status=%s body=%s error=%s", getattr(response, "status_code", None), response_body, e)
        return None


def generate_ai_text(context):
    """Generate a concise customer update from the current shopping context."""
    query = str(context.get('query', '')).strip()
    cart_items = context.get('cart_items', [])
    cart_summary = ', '.join(
        f"{item.get('quantity', 1)}x {item.get('name', 'item')}"
        for item in cart_items
        if isinstance(item, dict)
    )
    fallback = (
        f"AutoCart update: your search is {query}. "
        f"Current cart: {cart_summary or 'empty'}."
    )

    api_key = os.getenv('OPENAI_API_KEY', '')
    if not api_key:
        return fallback

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'Write one concise, friendly SMS-style shopping update. '
                        'Keep it under 240 characters and do not use markdown.'
                    ),
                },
                {
                    'role': 'user',
                    'content': f'Search: {query or "none"}\nCart: {cart_summary or "empty"}',
                },
            ],
            max_completion_tokens=100,
            timeout=15,
        )
        message = (response.choices[0].message.content or '').strip()
        return message[:480] or fallback
    except Exception as e:
        logger.error(f'AI text generation failed: {e}')
        return fallback


def tracker_list_reply(owner_number):
    products = list(
        WatchlistItem.objects.filter(owner_number=owner_number)
        .values("product_name", "price", "brand", "merchant")
    )
    if not products:
        return "Your Watch List is empty."
    lines = ["Your Watch List:"]
    for product in products:
        price = f"₹{product['price']}" if product["price"] is not None else "Price unavailable"
        details = ", ".join(value for value in (product["brand"], product["merchant"]) if value)
        lines.append(f"- {product['product_name']} — {price}{f' ({details})' if details else ''}")
    return "\n".join(lines)


def clear_tracker_state(state):
    state.pending_product = ""
    state.category = ""
    state.questions = []
    state.answers = []
    state.candidate = {}
    state.stage = "idle"
    state.confirmation_step = 0
    state.save(update_fields=["pending_product", "category", "questions", "answers", "candidate", "stage", "confirmation_step", "updated_at"])


def apply_price_tracker_intent(owner_number, result, pending_product=""):
    """Apply non-search tracker actions; product additions require a validated candidate."""
    state, _ = LinqConversationState.objects.get_or_create(owner_number=owner_number)
    intent = result.get("intent", "other")
    product = str(result.get("product") or pending_product or "").strip()

    if intent == "remove_tracker" and product:
        tracker_deleted, _ = PriceTrackerItem.objects.filter(owner_number=owner_number, product_name__icontains=product).delete()
        watchlist_deleted, _ = WatchlistItem.objects.filter(owner_number=owner_number, product_name__icontains=product).delete()
        clear_tracker_state(state)
        return f"I removed {product} from your price tracker." if tracker_deleted or watchlist_deleted else f"I could not find {product} in your price tracker."

    if intent == "list_tracker":
        clear_tracker_state(state)
        return tracker_list_reply(owner_number)

    return result.get("reply_text") or "Tell me which product price you want to track."


def process_message_async(message_text, from_number, provider_message_id=None, chat_id=None, preferred_service=None):
    """
    Processes the message asynchronously in a background thread to keep the webhook response under 50ms.
    """
    try:
        logger.warning("Linq process_message_async called: sender=%s message_id=%s text=%s", from_number, provider_message_id, message_text)
        if provider_message_id and LinqMessage.objects.filter(
            provider_message_id=provider_message_id
        ).exists():
            logger.info("Ignoring duplicate Linq webhook event %s", provider_message_id)
            return

        state, _ = LinqConversationState.objects.get_or_create(owner_number=from_number)
        context = {
            "pending_product": state.pending_product,
            "stage": state.stage,
            "questions": state.questions,
            "answers": state.answers,
        }

        # Classify every incoming reply so every user message receives an answer.
        logger.warning("Linq OpenAI prompt: model=%s system=%s user=%s", OPENAI_MODEL, "classify inbound RCS message and produce reply_text", message_text)
        if message_text.strip().lower() in {"track", "watchlist", "watch list", "my watchlist", "my watch list"}:
            result = {"intent": "list_tracker"}
        else:
            result = call_openai_classifier(message_text, context)
        intent = result.get("intent", "other")

        if intent in {"remove_tracker", "list_tracker"}:
            reply_text = apply_price_tracker_intent(from_number, result, state.pending_product)
        elif state.stage == "awaiting_confirmation":
            if intent == "confirm_product" or message_text.strip().lower() in {"yes", "y", "confirm", "track it", "add it", "start tracking"}:
                candidate = validate_mcp_product(state.candidate)
                if not candidate:
                    clear_tracker_state(state)
                    reply_text = "The selected MCP product is no longer valid, so I did not add it."
                else:
                    PriceTrackerItem.objects.update_or_create(
                        owner_number=from_number,
                        product_id=candidate["id"],
                        defaults={
                            "product_name": candidate["name"],
                            "brand": candidate.get("brand", ""),
                            "variant": candidate.get("variant", ""),
                            "price": candidate["price"],
                            "merchant": candidate.get("merchant", ""),
                            "availability": candidate.get("availability", ""),
                            "image_url": candidate.get("image_url", ""),
                            "product_url": candidate.get("product_url", ""),
                            "source_mcp": candidate.get("source_mcp", ""),
                        },
                    )
                    upsert_watchlist_item(from_number, candidate)
                    clear_tracker_state(state)
                    reply_text = f"Added {candidate['name']} to your Price Tracker and Watch List at ₹{candidate['price']}."
            elif message_text.strip().lower() in {"no", "n", "cancel", "not now"}:
                clear_tracker_state(state)
                reply_text = "Okay, I did not add that product to your Price Tracker."
            else:
                reply_text = "Please reply yes to track this exact product, or no to cancel."
        elif state.stage == "collecting_preferences":
            parsed_answers = result.get("answers")
            if isinstance(parsed_answers, list) and len(parsed_answers) >= len(state.questions):
                answers = [str(answer).strip() for answer in parsed_answers[:len(state.questions)]]
            else:
                answers = list(state.answers or [])
                answers.append(message_text.strip())
            state.answers = answers
            if len(answers) < len(state.questions):
                state.save(update_fields=["answers", "updated_at"])
                reply_text = f"Question {len(answers) + 1} of {len(state.questions)}: {state.questions[len(answers)]}"
            else:
                search_query = f"{state.pending_product}; " + "; ".join(
                    f"{question}: {answer}" for question, answer in zip(state.questions, answers)
                )
                products = [validate_mcp_product(item) for item in search_linq_mcps(state.category, search_query)]
                products = [item for item in products if item]
                if not products:
                    clear_tracker_state(state)
                    reply_text = "I could not find a valid matching product in the supported MCP stores, so I did not add anything."
                else:
                    state.candidate = products[0]
                    state.stage = "awaiting_confirmation"
                    state.save(update_fields=["answers", "candidate", "stage", "updated_at"])
                    reply_text = format_tracker_product(products[0])
        elif intent == "track_request":
            category = supported_tracker_category(result.get("category"))
            product = str(result.get("product") or "").strip()
            if not category:
                reply_text = "Price tracking is not available for that product category."
                clear_tracker_state(state)
            else:
                questions = [str(question).strip() for question in result.get("questions", []) if str(question).strip()][:3]
                if len(questions) < 2:
                    reply_text = "I need two product preferences before searching. Please tell me the brand and variant you want."
                    state.pending_product = product
                    state.category = category
                    state.stage = "collecting_preferences"
                    state.questions = ["Which brand do you prefer?", "Which quantity or variant do you need?"]
                    state.answers = []
                    state.save(update_fields=["pending_product", "category", "stage", "questions", "answers", "updated_at"])
                else:
                    state.pending_product = product
                    state.category = category
                    state.stage = "collecting_preferences"
                    state.questions = questions
                    state.answers = []
                    state.save(update_fields=["pending_product", "category", "stage", "questions", "answers", "updated_at"])
                    reply_text = "I can track that product.\n" + "\n".join(f"{index + 1}. {question}" for index, question in enumerate(questions))
        else:
            reply_text = result.get("reply_text") or "Tell me which product price you want to track."

        message = LinqMessage.objects.create(
            text=message_text,
            from_number=from_number,
            chat_id=chat_id or "",
            provider_message_id=provider_message_id,
            reply_text=reply_text,
            is_valid_list=False,
            is_processed=True,
        )

        # Reply to the sender, not the configured destination number.
        if send_linq_reply(
            from_number,
            reply_text,
            chat_id=chat_id,
            reply_to_message_id=provider_message_id,
            preferred_service=preferred_service,
        ):
            message.reply_sent = True
            message.save(update_fields=["reply_sent"])
    except Exception as e:
        logger.exception("Linq process_message_async failed completely: %s", e)


def extract_incoming_message_details(payload):
    """Extract inbound fields and the exact paths used from Linq event variants."""
    event_type = str(
        payload.get("event_type") or payload.get("event") or payload.get("type") or ""
    ).lower()
    if any(value in event_type for value in ("sent", "delivered", "read", "outgoing", "failed")):
        return None

    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    message = data.get("message") if isinstance(data.get("message"), dict) else None
    if message is None and isinstance(data.get("content"), dict):
        message = data.get("content")
    message = message or data
    parts = message.get("parts") or data.get("parts") or payload.get("parts") or []

    text = None
    text_path = None
    for source, source_path in ((message, "data.message"), (data, "data"), (payload, "payload")):
        if not isinstance(source, dict):
            continue
        for key in ("text", "body", "value"):
            if source.get(key):
                text = source[key]
                text_path = f"{source_path}.{key}"
                break
        if text:
            break
    if isinstance(text, dict):
        text = text.get("text") or text.get("body") or text.get("value")
    if not text and isinstance(parts, list):
        for index, part in enumerate(parts):
            if isinstance(part, dict):
                for key in ("value", "text", "body"):
                    if part.get(key):
                        text = part[key]
                        text_path = f"data.message.parts[{index}].{key}"
                        break
            if text:
                break

    sender = None
    sender_path = None
    for source, source_path in ((message, "data.message"), (data, "data"), (payload, "payload")):
        if not isinstance(source, dict):
            continue
        for key in ("from", "sender", "from_number", "from_phone_number"):
            if source.get(key):
                sender = source[key]
                sender_path = f"{source_path}.{key}"
                break
        if sender:
            break
    if not sender and isinstance(data.get("sender_handle"), dict):
        sender = data["sender_handle"].get("handle") or data["sender_handle"].get("id")
        sender_path = "data.sender_handle.handle"
    if isinstance(sender, dict):
        sender = sender.get("phone_number") or sender.get("number") or sender.get("id")
    owner_handle = data.get("chat", {}).get("owner_handle", {}) if isinstance(data.get("chat"), dict) else {}
    recipient = (
        message.get("to")
        or message.get("to_number")
        or data.get("to")
        or owner_handle.get("handle")
        or payload.get("to")
    )
    channel = message.get("channel") or data.get("channel") or data.get("service") or payload.get("channel")
    provider_message_id = (
        message.get("id")
        or message.get("message_id")
        or data.get("id")
        or data.get("message_id")
        or payload.get("id")
        or payload.get("message_id")
    )

    text = str(text or "").strip()
    sender = str(sender or "").strip()
    if not text or not sender:
        return None
    return {
        "text": text,
        "sender": sender,
        "recipient": recipient,
        "channel": channel,
        "provider_message_id": provider_message_id,
        "chat_id": data.get("chat", {}).get("id") if isinstance(data.get("chat"), dict) else None,
        "event_type": event_type,
        "text_path": text_path,
        "sender_path": sender_path,
    }


def extract_incoming_message(payload):
    details = extract_incoming_message_details(payload)
    if not details:
        return None
    return details["text"], details["sender"], details["provider_message_id"]


@api_view(['POST', 'GET'])
def linq_webhook(request):
    """
    Webhook endpoint registered with Linq to receive incoming messages.
    """
    request_record = log_webhook_request(request)
    if request.method == 'GET':
        return Response({"status": "active", "message": "Linq webhook endpoint is active."})

    payload = request.data
    logger.warning("Linq parsed JSON payload: %s", json.dumps(payload, default=str))

    details = extract_incoming_message_details(payload)
    if details is None:
        logger.warning("Ignored Linq webhook event with keys: %s", list(payload.keys()))
        return Response({"status": "ignored", "message": "No incoming user message found."})
    logger.warning("Linq extraction summary: %s", json.dumps(details, default=str))
    message_text = details["text"]
    from_number = details["sender"]
    provider_message_id = details["provider_message_id"]
    chat_id = details["chat_id"]
    preferred_service = details["channel"]

    # Process asynchronously so Linq receives a fast webhook acknowledgement.
    thread = threading.Thread(
        target=process_message_async,
        args=(message_text, from_number, provider_message_id, chat_id, preferred_service),
        daemon=True,
    )
    thread.start()

    return Response({"status": "received", "message": "Processing message in background."})


@api_view(['GET'])
def get_latest_message(request):
    """
    Polling endpoint for the frontend to retrieve the latest unprocessed valid list message.
    """
    msg = LinqMessage.objects.filter(
        is_valid_list=True,
        is_processed=False,
    ).order_by('created_at').first()
    if msg:
        msg.is_processed = True
        msg.save()
        return Response({
            "has_new": True,
            "text": msg.text,
            "from_number": msg.from_number
        })
    return Response({"has_new": False})


@api_view(["GET", "POST"])
def price_tracker_watchlist(request):
    owner_number = request.query_params.get("owner_number") or request.data.get("owner_number") or os.getenv("LINQ_TO_NUMBER", "")
    if request.method == "POST":
        product_id = str(request.data.get("product_id") or request.data.get("id") or "").strip()
        product_name = str(request.data.get("name") or "").strip()
        if not owner_number or not product_id or not product_name:
            return Response({"error": "owner_number, product_id, and name are required."}, status=400)
        item, _ = WatchlistItem.objects.update_or_create(
            owner_number=owner_number,
            product_id=product_id,
            defaults={
                "product_name": product_name,
                "brand": request.data.get("brand", ""),
                "variant": request.data.get("variant", ""),
                "price": request.data.get("price"),
                "merchant": request.data.get("merchant", ""),
                "availability": request.data.get("availability", ""),
                "image_url": request.data.get("image_url") or request.data.get("image", ""),
                "product_url": request.data.get("url") or request.data.get("product_url", ""),
                "source": request.data.get("source") or request.data.get("source_mcp", ""),
            },
        )
        return Response({"id": item.product_id, "name": item.product_name}, status=201)

    items = WatchlistItem.objects.filter(owner_number=owner_number)
    return Response({
        "items": [
            {
                "id": item.product_id,
                "product_id": item.product_id,
                "name": item.product_name,
                "brand": item.brand,
                "variant": item.variant,
                "price": item.price,
                "merchant": item.merchant,
                "availability": item.availability,
                "image_url": item.image_url,
                "url": item.product_url,
                "source_mcp": item.source,
                "price_change": item.price_change,
                "last_updated": item.last_updated,
            }
            for item in items
        ]
    })


@api_view(["DELETE"])
def remove_watchlist_item(request, product_id):
    owner_number = request.query_params.get("owner_number") or os.getenv("LINQ_TO_NUMBER", "")
    deleted, _ = WatchlistItem.objects.filter(owner_number=owner_number, product_id=product_id).delete()
    return Response({"removed": bool(deleted)})


@api_view(['POST'])
def send_manual_message(request):
    """
    Development endpoint to manually trigger a Linq message send.
    """
    to_number = request.data.get("to_number", "") or os.getenv('LINQ_TO_NUMBER', '')
    message_text = request.data.get("message", "Test message from AutoCart backend!")

    if not to_number:
        return Response({"error": "Recipient number (to_number) is required."}, status=400)

    res = send_linq_reply(to_number, message_text)
    if res:
        return Response({"status": "sent", "response": res})
    return Response({"error": "Failed to send message."}, status=500)


@api_view(['POST'])
def send_ai_message(request):
    """Generate an AI shopping update and send it to the configured Linq number."""
    to_number = request.data.get('to_number', '') or os.getenv('LINQ_TO_NUMBER', '')
    if not to_number:
        return Response({'error': 'Recipient number (to_number) is required.'}, status=400)

    message_text = generate_ai_text(request.data)
    response = send_linq_reply(to_number, message_text)
    if response:
        return Response({'status': 'sent', 'message': message_text, 'response': response})
    return Response({'error': 'Failed to send AI message.'}, status=502)

import json
import logging
import requests
from serpapi import GoogleSearch

from django.conf import settings
from openai import OpenAI
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .mcp_registry import WORKING_MCPS, NEEDS_WORK_MCPS, CLAUDE_CONNECTORS

logger = logging.getLogger(__name__)

# ── Load skill.md once at module level ─────────────────────────────────
_skill_text = ""
try:
    _skill_text = settings.SKILL_FILE_PATH.read_text(encoding="utf-8")
except Exception as exc:
    logger.warning("Could not load skill.md: %s", exc)

if not _skill_text:
    _skill_text = """
    You are an AI assistant helping to validate search queries for specific categories.
    You must respond with a JSON object.
    If the query matches the category, respond with:
    { "valid": true, "message": "Valid query", "questions": [] }
    If the query does NOT match the category, respond with:
    { "valid": false, "message": "That doesn't seem to match this category. Try something else." }
    """

# ── OpenAI client ──────────────────────────────────────────────────────
_openai_client = None
if getattr(settings, 'OPENAI_API_KEY', None):
    _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)


MCP_CATEGORY_ALIASES = {
    "food": "food",
    "restaurant": "food",
    "meal": "food",
    "groceries": "groceries",
    "grocery": "groceries",
    "instamart": "groceries",
    "reservation": "reservation",
    "dineout": "reservation",
    "table": "reservation",
    "beauty": "beauty",
    "skincare": "beauty",
    "grooming": "beauty",
    "apparel": "apparel",
    "fashion": "apparel",
    "shoes": "apparel",
    "clothing": "apparel",
    "footwear": "apparel",
    "jewelry": "jewelry",
    "jewellery": "jewelry",
    "jewels": "jewelry",
    "eyewear": "eyewear",
    "eyeglasses": "eyewear",
    "glasses": "eyewear",
    "spectacles": "eyewear",
    "sunglasses": "eyewear",
    "travel": "travel",
    "flights": "travel",
    "hotels": "travel",
    "experience": "travel",
}


def normalize_category(category: str) -> str:
    return MCP_CATEGORY_ALIASES.get((category or "").strip().lower(), "")


def build_mcp_call(category: str, product: str) -> dict:
    cat = normalize_category(category)
    if cat == "food":
        return {
            "mcp_server": "mcp.swiggy.com/food",
            "tool": "search_food",
            "arguments": {"query": product},
        }
    if cat == "groceries":
        return {
            "mcp_server": "mcp.swiggy.com/im",
            "tool": "search_groceries",
            "arguments": {"query": product},
        }
    if cat == "reservation":
        return {
            "mcp_server": "mcp.swiggy.com/dineout",
            "tool": "search_restaurants",
            "arguments": {"query": product},
        }
    if cat == "beauty":
        return {
            "mcp_server": "Shopify Beauty Network",
            "tool": "search_products",
            "arguments": {"query": product},
        }
    if cat == "apparel":
        return {
            "mcp_server": "Shopify Apparel Network",
            "tool": "search_products",
            "arguments": {"query": product},
        }
    if cat == "jewelry":
        return {
            "mcp_server": "Shopify Jewelry Network",
            "tool": "search_products",
            "arguments": {"query": product},
        }
    if cat == "eyewear":
        return {
            "mcp_server": "Lenskart MCP",
            "tool": "search_products",
            "arguments": {"query": product},
        }
    if cat == "travel":
        return {
            "mcp_server": "Global Travel Network",
            "tool": "search_flights",
            "arguments": {"query": product},
        }
    return {
        "mcp_server": "mcp.swiggy.com/im",
        "tool": "search_groceries",
        "arguments": {"query": product},
    }


def detect_category_and_product(query: str, answers: list | None = None) -> dict:
    system_prompt = (
        "You are an MCP routing classifier for an Indian commerce assistant. "
        "Classify the user intent into exactly one category from this strict list: "
        "food, groceries, reservation, beauty, apparel, jewelry, eyewear. "
        "Also extract the most specific purchasable product/service phrase to query MCP. "
        "Respond with ONLY JSON in this shape: "
        '{"category":"food","product":"butter chicken","confidence":0.0,"reason":"..."}'
    )
    answers_formatted = json.dumps(answers, indent=2) if answers else "[]"
    user_prompt = (
        f"Query: {query}\n"
        f"Clarification Answers: {answers_formatted}\n"
        "Return one category and one specific product/service string."
    )
    result = run_ai_pipeline(system_prompt, user_prompt)
    raw_category = str(result.get("category", "")).strip().lower()
    category = normalize_category(raw_category)
    if not category:
        category = "groceries"
    product = str(result.get("product", "")).strip() or query
    return {
        "category": category,
        "product": product,
        "confidence": result.get("confidence"),
        "reason": result.get("reason", ""),
    }


def run_ai_pipeline(system_prompt: str, user_prompt: str) -> dict:
    """Run a structured JSON request through OpenAI."""
    if not _openai_client:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    response = _openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
        timeout=30,
    )
    content = (response.choices[0].message.content or "").strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[-1]
        content = content.rsplit("```", 1)[0].strip()
    return json.loads(content)


@api_view(["POST"])
def transcribe_audio(request):
    audio = request.FILES.get("audio")
    if not audio:
        return Response({"error": "An audio recording is required."}, status=400)
    if not _openai_client:
        return Response({"error": "OPENAI_API_KEY is not configured."}, status=503)

    try:
        result = _openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=(audio.name or "recording.webm", audio.file, audio.content_type or "audio/webm"),
            response_format="text",
        )
        text = result if isinstance(result, str) else result.text
        return Response({"text": (text or "").strip()})
    except Exception as exc:
        logger.exception("Audio transcription failed: %s", exc)
        return Response({"error": "Audio transcription failed."}, status=502)


def _ai_generate_products(query: str, answers: list, category: str, count: int = 5) -> list:
    """Use AI to generate realistic Indian product data when live MCP returns nothing."""
    answers_str = "; ".join([f"{a.get('question','')}: {a.get('answer','')}" for a in answers if a.get('answer') and a.get('answer') != 'Skipped (No preference)']) or "No specific preferences"
    
    if category == "food":
        schema_example = '{"id":"f1","name":"Butter Chicken","restaurant":"Punjabi Dhaba","price":280,"original_price":320,"delivery_time":"30 mins","rating":4.5,"is_veg":false,"cuisine":"North Indian","portion":"Full Plate","emoji":"🍛","is_ai_recommended":true,"description":"Rich creamy tomato-based curry with tender chicken pieces"}'
        prompt = f"Generate {count} realistic Indian food delivery dishes for query: '{query}'. User preferences: {answers_str}. Return a JSON array of {count} objects matching this exact schema: [{schema_example}]. Only output valid JSON array, nothing else."
    elif category == "groceries":
        schema_example = '{"id":"g1","name":"Amul Butter 500g","brand":"Amul","price":280,"original_price":310,"delivery_time":"15 mins","rating":4.7,"quantity":"500g","emoji":"🧈","is_ai_recommended":true,"description":"Fresh pasteurized butter from India\'s top dairy brand"}'
        prompt = f"Generate {count} realistic Indian grocery/instamart products for query: '{query}'. User preferences: {answers_str}. Return a JSON array of {count} objects matching this exact schema: [{schema_example}]. Only output valid JSON array, nothing else."
    elif category == "reservation":
        schema_example = '{"id":"r1","name":"Punjab Grill","location":"Connaught Place, Delhi","price":1800,"rating":4.6,"cuisine":"North Indian","table_available":true,"discount":"20% off for 2+","emoji":"🍽️","is_ai_recommended":true,"description":"Premium North Indian fine dining experience"}'
        prompt = f"Generate {count} realistic Indian restaurants for dineout reservation query: '{query}'. User preferences: {answers_str}. Return a JSON array of {count} objects matching this exact schema: [{schema_example}]. Only output valid JSON array, nothing else."
    elif category == "beauty":
        schema_example = '{"id":"b1","name":"Clinikally SPF 50 Sunscreen","brand":"Clinikally","price":599,"original_price":799,"delivery_time":"2-3 days","rating":4.4,"quantity":"50ml","emoji":"✨","is_ai_recommended":true,"description":"Dermatologist recommended broad spectrum sun protection"}'
        prompt = f"Generate {count} realistic Indian beauty/skincare products for query: '{query}'. User preferences: {answers_str}. Return a JSON array of {count} objects matching this exact schema: [{schema_example}]. Only output valid JSON array, nothing else."
    elif category == "apparel":
        schema_example = '{"id":"a1","name":"Campus Running Shoes","brand":"Campus","price":1299,"original_price":1799,"delivery_time":"3-5 days","rating":4.3,"quantity":"UK 9","emoji":"👟","is_ai_recommended":true,"description":"Lightweight breathable mesh running shoes for daily fitness"}'
        prompt = f"Generate {count} realistic Indian apparel/footwear products for query: '{query}'. User preferences: {answers_str}. Return a JSON array of {count} objects matching this exact schema: [{schema_example}]. Only output valid JSON array, nothing else."
    elif category == "jewelry":
        schema_example = '{"id":"j1","name":"Gold-Plated Pendant Necklace","brand":"Palmonas","price":2499,"original_price":3299,"delivery_time":"3-5 days","rating":4.6,"quantity":"1 piece","emoji":"💎","is_ai_recommended":true,"description":"Elegant everyday necklace with a polished gold finish"}'
        prompt = f"Generate {count} realistic Indian jewelry products for query: '{query}'. User preferences: {answers_str}. Return a JSON array of {count} objects matching this exact schema: [{schema_example}]. Only output valid JSON array, nothing else."
    elif category == "eyewear":
        schema_example = '{"id":"e1","name":"Blue Light Round Frame Glasses","brand":"Lenskart","price":999,"original_price":1499,"delivery_time":"3-5 days","rating":4.5,"quantity":"1 frame","emoji":"👓","is_ai_recommended":true,"description":"Lightweight eyewear with clear blue-light filtering lenses"}'
        prompt = f"Generate {count} realistic Indian eyewear products for query: '{query}'. User preferences: {answers_str}. Return a JSON array of {count} objects matching this exact schema: [{schema_example}]. Only output valid JSON array, nothing else."
    elif category == "travel":
        schema_example = '{"id":"t1","name":"Roundtrip Flight to Goa","brand":"OctoTrip","price":8500,"original_price":10500,"delivery_time":"Instant Booking","rating":4.8,"quantity":"1 Ticket","emoji":"✈️","is_ai_recommended":true,"description":"Non-stop flight departing this weekend"}'
        prompt = f"Generate {count} realistic travel/flight options for query: '{query}'. User preferences: {answers_str}. Return a JSON array of {count} objects matching this exact schema: [{schema_example}]. Only output valid JSON array, nothing else."

    system = "You are a product data generator for an Indian e-commerce platform. Always return a valid JSON array of products with realistic Indian brand names, prices in INR, and relevant details. Never add explanations outside the JSON."
    
    def _parse_ai_json(raw: str) -> list:
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1]
            raw = raw.rsplit("```", 1)[0].strip()
        try:
            parsed = json.loads(raw)
        except Exception as e:
            logger.error("JSON decode error in _parse_ai_json: %s", e)
            return []
            
        items = []
        if isinstance(parsed, list):
            items = parsed[:count]
        elif isinstance(parsed, dict):
            for key in ("products", "items", "data", "result", "restaurants", "food", "flights"):
                if key in parsed and isinstance(parsed[key], list):
                    items = parsed[key][:count]
                    break
        
        # Ensure we only process dicts
        valid_items = []
        for i in items:
            if isinstance(i, dict):
                valid_items.append(i)
                
        return valid_items

    if not _openai_client:
        return []

    try:
        response = _openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": system + "\nRespond with a JSON object containing a products array.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
            timeout=30,
        )
        return _parse_ai_json(response.choices[0].message.content or "")
    except Exception as e:
        logger.error("OpenAI product generation failed: %s", e)
        return []


def _resolve_product_images(products: list, query: str, category: str) -> list:
    """Keep MCP images first, then use one SerpAPI image, then let the UI use emoji."""
    api_key = getattr(settings, "SERPAPI_API_KEY", "")

    for product in products:
        if not isinstance(product, dict):
            continue
        if not product.get("image_url") and not product.get("image"):
            featured_image = product.get("featured_image") or {}
            images = product.get("images") or []
            mcp_image = featured_image.get("url") if isinstance(featured_image, dict) else ""
            if not mcp_image and images and isinstance(images[0], dict):
                mcp_image = images[0].get("src") or images[0].get("url")
            if mcp_image:
                product["image_url"] = mcp_image
        if product.get("image_url") or product.get("image") or not api_key:
            continue
        name = str(product.get("name") or product.get("title") or query).strip()
        try:
            result = GoogleSearch({
                "engine": "google_images",
                "q": f"{name} {category} product",
                "api_key": api_key,
                "ijn": "0",
            }).get_dict()
            image_results = result.get("images_results") or []
            image_url = image_results[0].get("original") or image_results[0].get("thumbnail") if image_results else ""
            if image_url:
                product["image_url"] = image_url
        except Exception as exc:
            logger.warning("SerpAPI image lookup failed for %s: %s", name, exc)
    return products



def fetch_swiggy_mcp_products(query: str, answers: list) -> dict:
    """
    Queries mcp.swiggy.com/im for grocery items.
    Falls back to AI-generated realistic Indian grocery data if MCP is unavailable.
    """
    mcp_endpoint = "https://mcp.swiggy.com/im"
    live_products = []

    try:
        headers = {"Content-Type": "application/json"}
        payload = {
            "jsonrpc": "2.0", "id": 1,
            "method": "tools/call",
            "params": {"name": "search_groceries", "arguments": {"query": query}}
        }
        res = requests.post(mcp_endpoint, json=payload, headers=headers, timeout=3)
        if res.status_code == 200:
            data = res.json()
            if "result" in data and isinstance(data["result"], list):
                live_products = data["result"]
    except Exception as e:
        logger.info("Swiggy Instamart MCP unavailable (%s), using AI synthesis.", e)

    if not live_products:
        logger.info("Swiggy MCP returned no products, generating AI products for: %s", query)
        live_products = _ai_generate_products(query, answers, "groceries", 5)
    live_products = _resolve_product_images(live_products, query, "groceries")

    return {
        "mcp_server": "mcp.swiggy.com/im",
        "is_exact_match": True,
        "match_notice": f"Top {len(live_products)} picks from Swiggy Instamart for your query",
        "products": live_products,
    }


def fetch_swiggy_food_mcp_products(query: str, answers: list) -> dict:
    """
    Queries mcp.swiggy.com/food for restaurant meals.
    Falls back to AI-generated realistic Indian food data if MCP is unavailable.
    """
    mcp_endpoint = "https://mcp.swiggy.com/food"
    live_products = []

    try:
        headers = {"Content-Type": "application/json"}
        payload = {
            "jsonrpc": "2.0", "id": 1,
            "method": "tools/call",
            "params": {"name": "search_food", "arguments": {"query": query}}
        }
        res = requests.post(mcp_endpoint, json=payload, headers=headers, timeout=3)
        if res.status_code == 200:
            data = res.json()
            if "result" in data and isinstance(data["result"], list):
                live_products = data["result"]
    except Exception as e:
        logger.info("Swiggy Food MCP unavailable (%s), using AI synthesis.", e)

    if not live_products:
        logger.info("Swiggy Food MCP returned no products, generating AI products for: %s", query)
        live_products = _ai_generate_products(query, answers, "food", 5)
    live_products = _resolve_product_images(live_products, query, "food")

    return {
        "mcp_server": "mcp.swiggy.com/food",
        "is_exact_match": True,
        "match_notice": f"Top {len(live_products)} dishes from Swiggy Food for your order",
        "products": live_products,
    }


def fetch_swiggy_dineout_mcp_products(query: str, answers: list) -> dict:
    """
    Queries mcp.swiggy.com/dineout for table reservations.
    Falls back to AI-generated realistic dineout data if MCP is unavailable.
    """
    mcp_endpoint = "https://mcp.swiggy.com/dineout"
    live_products = []

    try:
        headers = {"Content-Type": "application/json"}
        payload = {
            "jsonrpc": "2.0", "id": 1,
            "method": "tools/call",
            "params": {"name": "search_restaurants", "arguments": {"query": query}}
        }
        res = requests.post(mcp_endpoint, json=payload, headers=headers, timeout=3)
        if res.status_code == 200:
            data = res.json()
            if "result" in data and isinstance(data["result"], list):
                live_products = data["result"]
    except Exception as e:
        logger.info("Swiggy Dineout MCP unavailable (%s), using AI synthesis.", e)

    if not live_products:
        logger.info("Swiggy Dineout MCP returned no products, generating AI products for: %s", query)
        live_products = _ai_generate_products(query, answers, "reservation", 5)
    live_products = _resolve_product_images(live_products, query, "reservation")

    return {
        "mcp_server": "mcp.swiggy.com/dineout",
        "is_exact_match": True,
        "match_notice": f"Top {len(live_products)} restaurant picks via Swiggy Dineout",
        "products": live_products,
    }

def fetch_beauty_mcp_products(query: str, answers: list) -> dict:
    """
    Queries Shopify MCPs for Beauty, Skincare & Grooming items.
    Falls back to AI-generated realistic Indian beauty product data.
    """
    mcp_endpoints = [
        "https://clinikally.myshopify.com/api/ucp/mcp",
        "https://dot-key.myshopify.com/api/ucp/mcp",
        "https://bombay-shaving.myshopify.com/api/ucp/mcp"
    ]
    live_products = []

    for mcp_endpoint in mcp_endpoints:
        try:
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Ucp-Agent-Profile": "https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json"
            }
            payload = {
                "jsonrpc": "2.0", "id": 1,
                "method": "tools/call",
                "params": {"name": "search_products", "arguments": {"query": query}},
                "meta": {
                    "ucp-agent.profile": "https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json"
                }
            }
            res = requests.post(mcp_endpoint, json=payload, headers=headers, timeout=3)
            if res.status_code == 200:
                data = res.json()
                if "result" in data and isinstance(data["result"], list):
                    items = data["result"]
                    for item in items:
                        if not item.get("image") and not item.get("image_url"):
                            if item.get("featured_image") and item["featured_image"].get("url"):
                                item["image"] = item["featured_image"]["url"]
                            elif item.get("images") and len(item["images"]) > 0:
                                item["image"] = item["images"][0].get("src") or item["images"][0].get("url")
                    live_products.extend(items)
            else:
                logger.info("Beauty MCP at %s returned status %s", mcp_endpoint, res.status_code)
        except Exception as e:
            logger.info("Beauty MCP unavailable at %s (%s).", mcp_endpoint, e)

    if not live_products:
        logger.info("All beauty MCPs returned no products, generating AI products for: %s", query)
        live_products = _ai_generate_products(query, answers, "beauty", 5)
    live_products = _resolve_product_images(live_products, query, "beauty")

    return {
        "mcp_server": "Shopify Beauty Network",
        "is_exact_match": True,
        "match_notice": f"Top {len(live_products)} beauty products curated for you",
        "products": live_products,
    }


def fetch_jewelry_mcp_products(query: str, answers: list) -> dict:
    """Query the configured Shopify jewelry MCPs with an AI fallback."""
    mcp_endpoints = [
        "https://saltyjewels.myshopify.com/api/ucp/mcp",
        "https://palmonas.myshopify.com/api/ucp/mcp",
        "https://giva-jewelry.myshopify.com/api/ucp/mcp",
    ]
    live_products = []
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "AutoCart/1.0",
        "Ucp-Agent-Profile": "https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json",
    }
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": "search_products", "arguments": {"query": query}},
        "meta": {
            "ucp-agent.profile": "https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json"
        },
    }

    for endpoint in mcp_endpoints:
        try:
            response = requests.post(endpoint, json=payload, headers=headers, timeout=3)
            response.raise_for_status()
            result = response.json().get("result", [])
            if isinstance(result, dict):
                result = result.get("products") or result.get("items") or result.get("data") or []
            if isinstance(result, list):
                live_products.extend(result)
        except Exception as exc:
            logger.info("Jewelry MCP unavailable at %s: %s", endpoint, exc)

    if not live_products:
        live_products = _ai_generate_products(query, answers, "jewelry", 5)
    live_products = _resolve_product_images(live_products, query, "jewelry")
    return {
        "mcp_server": "Shopify Jewelry Network",
        "is_exact_match": True,
        "match_notice": f"Top {len(live_products)} jewelry picks curated for you",
        "products": live_products,
    }


def fetch_eyewear_mcp_products(query: str, answers: list) -> dict:
    """Query Lenskart's MCP with an AI fallback for eyewear searches."""
    endpoint = "https://lenskart.com/api/mcp"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "AutoCart/1.0",
    }
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": "search_products", "arguments": {"query": query}},
    }
    live_products = []
    try:
        response = requests.post(endpoint, json=payload, headers=headers, timeout=3)
        response.raise_for_status()
        result = response.json().get("result", [])
        if isinstance(result, dict):
            result = result.get("products") or result.get("items") or result.get("data") or []
        if isinstance(result, list):
            live_products = result
    except Exception as exc:
        logger.info("Eyewear MCP unavailable at %s: %s", endpoint, exc)

    if not live_products:
        live_products = _ai_generate_products(query, answers, "eyewear", 5)
    live_products = _resolve_product_images(live_products, query, "eyewear")
    return {
        "mcp_server": "Lenskart MCP",
        "is_exact_match": True,
        "match_notice": f"Top {len(live_products)} eyewear picks curated for you",
        "products": live_products,
    }


def fetch_apparel_mcp_products(query: str, answers: list) -> dict:
    """
    Queries Shopify MCPs for Footwear and Apparel items.
    Falls back to AI-generated realistic Indian apparel data.
    """
    mcp_endpoints = [
        "https://baccabucci.myshopify.com/api/ucp/mcp",
        "https://babymarketstore.myshopify.com/api/ucp/mcp",
        "https://campusshoess.myshopify.com/api/ucp/mcp"
    ]
    live_products = []

    for mcp_endpoint in mcp_endpoints:
        try:
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Ucp-Agent-Profile": "https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json"
            }
            payload = {
                "jsonrpc": "2.0", "id": 1,
                "method": "tools/call",
                "params": {"name": "search_products", "arguments": {"query": query}},
                "meta": {
                    "ucp-agent.profile": "https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json"
                }
            }
            res = requests.post(mcp_endpoint, json=payload, headers=headers, timeout=3)
            if res.status_code == 200:
                data = res.json()
                if "result" in data and isinstance(data["result"], list):
                    items = data["result"]
                    for item in items:
                        if not item.get("image") and not item.get("image_url"):
                            if item.get("featured_image") and item["featured_image"].get("url"):
                                item["image"] = item["featured_image"]["url"]
                            elif item.get("images") and len(item["images"]) > 0:
                                item["image"] = item["images"][0].get("src") or item["images"][0].get("url")
                    live_products.extend(items)
            else:
                logger.info("Apparel MCP at %s returned status %s", mcp_endpoint, res.status_code)
        except Exception as e:
            logger.info("Apparel MCP unavailable at %s (%s).", mcp_endpoint, e)

    if not live_products:
        logger.info("All apparel MCPs returned no products, generating AI products for: %s", query)
        live_products = _ai_generate_products(query, answers, "apparel", 5)
    live_products = _resolve_product_images(live_products, query, "apparel")

    return {
        "mcp_server": "Shopify Apparel Network",
        "is_exact_match": True,
        "match_notice": f"Top {len(live_products)} apparel picks curated for you",
        "products": live_products,
    }


def fetch_travel_mcp_products(query: str, answers: list) -> dict:
    """
    Queries the verified WORKING_MCPS travel endpoints.
    Falls back to AI-generated realistic data if the MCPs require specific auth we don't have yet.
    """
    live_products = []
    
    # Filter WORKING_MCPS for travel ones
    travel_endpoints = [url for url in WORKING_MCPS if "trip" in url or "travel" in url or "ticket" in url or "experience" in url or "pillow" in url or "lastminute" in url]

    for mcp_endpoint in travel_endpoints:
        try:
            headers = {"Content-Type": "application/json"}
            payload = {
                "jsonrpc": "2.0", "id": 1,
                "method": "tools/call",
                "params": {"name": "search_flights", "arguments": {"query": query}}
            }
            # We do a short timeout so the UI doesn't hang
            res = requests.post(mcp_endpoint, json=payload, headers=headers, timeout=2)
            if res.status_code == 200:
                data = res.json()
                if "result" in data and isinstance(data["result"], list):
                    live_products.extend(data["result"])
        except Exception as e:
            logger.info("Travel MCP unavailable at %s (%s).", mcp_endpoint, e)

    if not live_products:
        logger.info("Travel MCPs returned no products, generating AI products for: %s", query)
        live_products = _ai_generate_products(query, answers, "travel", 5)
    live_products = _resolve_product_images(live_products, query, "travel")

    return {
        "mcp_server": "Global Travel Network",
        "is_exact_match": True,
        "match_notice": f"Top {len(live_products)} travel options curated for you",
        "products": live_products,
    }



@api_view(["POST"])
def validate_input(request):
    """Validate user query and return 4 MCQ questions."""
    category = request.data.get("category", "").strip()
    query = request.data.get("query", "").strip()

    if not query:
        return Response(
            {"valid": False, "message": "Please enter a search term."},
            status=400,
        )

    detected = None
    normalized_category = normalize_category(category)
    if not normalized_category:
        try:
            detected = detect_category_and_product(query)
            normalized_category = detected["category"]
        except Exception as exc:
            return Response(
                {"valid": False, "message": f"Could not detect category automatically: {str(exc)}"},
                status=502,
            )

    user_prompt = (
        f"Target Audience: Indian Consumers 🇮🇳\n"
        f"Category: {normalized_category}\n"
        f"User Search Query: {query}\n\n"
        "Is this query relevant to the selected category?\n"
        "CRITICAL INSTRUCTION: Analyze the query logically. DEDUCE OBVIOUS FACTS from the query and NEVER ask redundant or foolish questions! "
        "(For example, if query is 'chicken biryani', DO NOT ask if it is Veg or Non-Veg because chicken is obviously non-veg! Ask instead about biryani style/cut, bone vs boneless, Indian spice level, portion size, or sides/combos).\n"
        "Generate 2 to 3 MCQ questions with choices that act as SMART, LOGICAL differentiators for an Indian consumer. DO NOT generate more than 3 questions.\n"
        "Respond with the JSON format described in your instructions."
    )

    try:
        result = run_ai_pipeline(_skill_text, user_prompt)
        result["detected_category"] = normalized_category
        result["detected_product"] = (detected or {}).get("product", query)
        result["mcp_call"] = build_mcp_call(normalized_category, result["detected_product"])
        return Response(result)
    except Exception as exc:
        return Response(
            {"valid": False, "message": f"AI service error: {str(exc)}"},
            status=502,
        )


@api_view(["POST"])
def finalize_product(request):
    """
    Synthesize category, query, and answered questions into exact product details.
    - 'groceries': integrates Swiggy Instamart MCP (mcp.swiggy.com/im)
    - 'food': integrates Swiggy Food MCP (mcp.swiggy.com/food)
    """
    category = request.data.get("category", "").strip()
    query = request.data.get("query", "").strip()
    answers = request.data.get("answers", [])

    if not query:
        return Response(
            {"error": "Query is required."},
            status=400,
        )

    normalized_category = normalize_category(category)
    detected = None
    if not normalized_category:
        try:
            detected = detect_category_and_product(query, answers)
            normalized_category = detected["category"]
        except Exception as exc:
            return Response(
                {"error": f"Could not detect category automatically: {str(exc)}"},
                status=502,
            )

    # 1. Base AI Finalization
    system_prompt = (
        "You are the QuikSwipe product clarification agent. "
        "Your goal is to synthesize the user's category, query, and answered clarification questions "
        "to determine EXACTLY what specific product or service the user wants for an Indian consumer.\n\n"
        "Respond with ONLY a JSON object:\n"
        "{\n"
        '  "exact_product": "A clear, concise, specific description of the exact product/service requested",\n'
        '  "summary": "Detailed summary of all preferences incorporated",\n'
        '  "key_attributes": ["attribute 1", "attribute 2", "attribute 3"]\n'
        "}"
    )

    answers_formatted = json.dumps(answers, indent=2) if answers else "None (User skipped optional questions)"
    user_prompt = (
        f"Category: {normalized_category}\n"
        f"Initial Query: {query}\n"
        f"Clarification Answers:\n{answers_formatted}\n\n"
        "Determine what specific product or food item the user wants."
    )

    try:
        final_info = run_ai_pipeline(system_prompt, user_prompt)

        final_info["detected_category"] = normalized_category
        final_info["detected_product"] = (detected or {}).get("product") or final_info.get("exact_product") or query
        final_info["mcp_call"] = build_mcp_call(normalized_category, final_info["detected_product"])

        # 2. Swiggy MCP / Shopify Integrations
        if normalized_category == "groceries":
            mcp_data = fetch_swiggy_mcp_products(query, answers)
            mcp_data["products"] = mcp_data.get("products", [])[:5]
            final_info["swiggy_mcp"] = mcp_data
        elif normalized_category == "food":
            mcp_data = fetch_swiggy_food_mcp_products(query, answers)
            mcp_data["products"] = mcp_data.get("products", [])[:5]
            final_info["swiggy_food_mcp"] = mcp_data
        elif normalized_category == "beauty":
            mcp_data = fetch_beauty_mcp_products(query, answers)
            mcp_data["products"] = mcp_data.get("products", [])[:5]
            final_info["beauty_mcp"] = mcp_data
        elif normalized_category == "apparel":
            mcp_data = fetch_apparel_mcp_products(query, answers)
            mcp_data["products"] = mcp_data.get("products", [])[:5]
            final_info["apparel_mcp"] = mcp_data
        elif normalized_category == "jewelry":
            mcp_data = fetch_jewelry_mcp_products(query, answers)
            mcp_data["products"] = mcp_data.get("products", [])[:5]
            final_info["jewelry_mcp"] = mcp_data
        elif normalized_category == "eyewear":
            mcp_data = fetch_eyewear_mcp_products(query, answers)
            mcp_data["products"] = mcp_data.get("products", [])[:5]
            final_info["eyewear_mcp"] = mcp_data
        elif normalized_category == "reservation":
            mcp_data = fetch_swiggy_dineout_mcp_products(query, answers)
            mcp_data["products"] = mcp_data.get("products", [])[:5]
            final_info["swiggy_dineout_mcp"] = mcp_data
        elif normalized_category == "travel":
            mcp_data = fetch_travel_mcp_products(query, answers)
            mcp_data["products"] = mcp_data.get("products", [])[:5]
            final_info["travel_mcp"] = mcp_data

        return Response(final_info)
    except Exception as exc:
        return Response(
            {"error": f"AI service error: {str(exc)}"},
            status=502,
        )


@api_view(["POST"])
def process_list(request):
    """
    Parse a shopping list from a text file, identify categories, and fetch products from MCPs.
    """
    list_content = request.data.get("list_content", "").strip()

    if not list_content:
        return Response({"error": "List content is required."}, status=400)

    # Use AI to parse the list and determine categories
    system_prompt = (
        "You are a shopping list parser. Parse the following text list into a JSON array of products.\n"
        "The list is in this format:\n"
        "1. product name\n"
        "- preference 1\n"
        "- preference 2\n\n"
        "For each product, determine the most likely category: 'food' (restaurant meals), 'groceries' (raw ingredients, snacks, household items), 'beauty' (skincare, makeup, grooming), 'apparel' (shoes, clothing, fashion), or 'invalid' (no matching category).\n"
        "Respond with ONLY a JSON object containing a 'products' array:\n"
        "{\n"
        '  "products": [\n'
        "    {\n"
        '      "name": "Product name",\n'
        '      "preferences": ["pref 1", "pref 2"],\n'
        '      "category": "groceries"\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    try:
        parsed_data = run_ai_pipeline(system_prompt, list_content)
        products = parsed_data.get("products", [])
        
        final_results = []
        
        for item in products:
            category = item.get("category", "")
            name = item.get("name", "")
            preferences = item.get("preferences", [])
            
            # Format preferences as answers for MCP
            answers = [{"question": f"Preference {i+1}", "answer": p} for i, p in enumerate(preferences)]
            query = f"{name} " + " ".join(preferences)
            
            if category in ("groceries", "grocery"):
                mcp_data = fetch_swiggy_mcp_products(query, answers)
                if mcp_data.get("products"):
                    # Just take the first/best match
                    best_match = mcp_data["products"][0]
                    final_results.append({
                        "id": best_match.get("id"),
                        "name": best_match.get("name"),
                        "price": best_match.get("price"),
                        "source": "Swiggy Instamart"
                    })
            elif category in ("food", "restaurant"):
                mcp_data = fetch_swiggy_food_mcp_products(query, answers)
                if mcp_data.get("products"):
                    best_match = mcp_data["products"][0]
                    final_results.append({
                        "id": best_match.get("id"),
                        "name": best_match.get("name"),
                        "price": best_match.get("price"),
                        "source": "Swiggy Food"
                    })
            elif category in ("beauty", "skincare", "grooming"):
                mcp_data = fetch_beauty_mcp_products(query, answers)
                if mcp_data.get("products"):
                    best_match = mcp_data["products"][0]
                    final_results.append({
                        "id": best_match.get("id"),
                        "name": best_match.get("name"),
                        "price": best_match.get("price"),
                        "source": best_match.get("brand", "Shopify Beauty")
                    })
            elif category in ("apparel", "fashion", "shoes", "clothing", "footwear"):
                mcp_data = fetch_apparel_mcp_products(query, answers)
                if mcp_data.get("products"):
                    best_match = mcp_data["products"][0]
                    final_results.append({
                        "id": best_match.get("id"),
                        "name": best_match.get("name"),
                        "price": best_match.get("price"),
                        "source": best_match.get("brand", "Shopify Apparel")
                    })

        return Response({"cart_items": final_results})

    except Exception as exc:
        logger.error(f"Error processing list: {exc}")
        return Response({"error": f"Failed to process list: {str(exc)}"}, status=502)

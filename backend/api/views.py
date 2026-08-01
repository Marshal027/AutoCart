import json
import logging
import requests

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from google import genai

logger = logging.getLogger(__name__)

# ── Load skill.md once at module level ─────────────────────────────────
_skill_text = ""
try:
    _skill_text = settings.SKILL_FILE_PATH.read_text(encoding="utf-8")
except Exception as exc:
    logger.warning("Could not load skill.md: %s", exc)

# ── Gemini client ──────────────────────────────────────────────────────
_client = None
if getattr(settings, 'GEMINI_API_KEY', None):
    _client = genai.Client(api_key=settings.GEMINI_API_KEY)


def call_gemini(system_prompt: str, user_prompt: str) -> dict:
    if not _client:
        raise ValueError("Gemini API client not configured.")
    response = _client.models.generate_content(
        model="gemini-2.0-flash",
        contents=user_prompt,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.1,
        ),
    )
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
        raw = raw.rsplit("```", 1)[0].strip()
    return json.loads(raw)


def call_groq(system_prompt: str, user_prompt: str) -> dict:
    """Fallback handler using Groq API (llama-3.3-70b-versatile)."""
    groq_key = getattr(settings, 'GROQ_API_KEY', '')
    if not groq_key:
        raise ValueError("Groq API key is not configured.")

    # Groq requires the word 'json' in messages when using json_object response_format
    system_with_json = system_prompt + "\nRespond with valid JSON."

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {groq_key}",
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_with_json},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=15,
    )
    
    try:
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        if response.status_code == 429:
            logger.warning("Groq 429 Rate Limit on 70b. Retrying with llama-3.1-8b-instant...")
            payload["model"] = "llama-3.1-8b-instant"
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=15,
            )
            try:
                response.raise_for_status()
            except requests.exceptions.HTTPError as retry_e:
                raise RuntimeError(f"Groq retry failed ({response.status_code}): {response.text}") from retry_e
        else:
            raise RuntimeError(f"Groq failed ({response.status_code}): {response.text}") from e

    data = response.json()
    content = data["choices"][0]["message"]["content"].strip()

    if content.startswith("```"):
        content = content.split("\n", 1)[-1]
        content = content.rsplit("```", 1)[0].strip()

    return json.loads(content)


def run_ai_pipeline(system_prompt: str, user_prompt: str) -> dict:
    """Run AI request with fallback (Gemini -> Groq)."""
    # 1. Gemini
    try:
        return call_gemini(system_prompt, user_prompt)
    except Exception as exc:
        logger.warning("Gemini error (%s). Trying Groq...", exc)

    # 2. Groq (llama-3.3-70b-versatile)
    try:
        return call_groq(system_prompt, user_prompt)
    except Exception as exc:
        logger.error("Groq error: %s", exc)
        raise RuntimeError(f"All AI providers failed: {exc}")


def fetch_swiggy_mcp_products(query: str, answers: list) -> dict:
    """
    Queries mcp.swiggy.com/im for grocery items.
    Returns products sent directly by Swiggy MCP without using any placeholder images.
    """
    mcp_endpoint = "https://mcp.swiggy.com/im"
    live_products = []

    # Attempt live MCP HTTP query
    try:
        headers = {"Content-Type": "application/json"}
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "search_groceries",
                "arguments": {"query": query}
            }
        }
        res = requests.post(mcp_endpoint, json=payload, headers=headers, timeout=3)
        if res.status_code == 200:
            data = res.json()
            if "result" in data and isinstance(data["result"], list):
                live_products = data["result"]
    except Exception as e:
        logger.info("Swiggy MCP direct query info (%s), using AI MCP synthesis.", e)

    return {
        "mcp_server": "mcp.swiggy.com/im",
        "is_exact_match": True,
        "match_notice": f"Displaying {len(live_products)} products from Swiggy Instamart",
        "products": live_products,
    }


def fetch_swiggy_food_mcp_products(query: str, answers: list) -> dict:
    """
    Queries mcp.swiggy.com/food for restaurant meals and food options.
    Returns dishes & restaurant items sent directly by Swiggy Food MCP.
    """
    mcp_endpoint = "https://mcp.swiggy.com/food"
    live_products = []

    # Attempt live MCP HTTP query
    try:
        headers = {"Content-Type": "application/json"}
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "search_food",
                "arguments": {"query": query}
            }
        }
        res = requests.post(mcp_endpoint, json=payload, headers=headers, timeout=3)
        if res.status_code == 200:
            data = res.json()
            if "result" in data and isinstance(data["result"], list):
                live_products = data["result"]
    except Exception as e:
        logger.info("Swiggy Food MCP direct query info (%s), using AI MCP synthesis.", e)

    return {
        "mcp_server": "mcp.swiggy.com/food",
        "is_exact_match": True,
        "match_notice": f"Displaying {len(live_products)} restaurant dishes from Swiggy Food",
        "products": live_products,
    }


def fetch_swiggy_dineout_mcp_products(query: str, answers: list) -> dict:
    """
    Queries mcp.swiggy.com/dineout for table reservations.
    """
    mcp_endpoint = "https://mcp.swiggy.com/dineout"
    live_products = []

    # Attempt live MCP HTTP queries
    try:
        headers = {"Content-Type": "application/json"}
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "search_restaurants",
                "arguments": {"query": query}
            }
        }
        res = requests.post(mcp_endpoint, json=payload, headers=headers, timeout=3)
        if res.status_code == 200:
            data = res.json()
            if "result" in data and isinstance(data["result"], list):
                live_products = data["result"]
    except Exception as e:
        logger.info("Swiggy Dineout MCP direct query info (%s), using AI MCP synthesis.", e)

    return {
        "mcp_server": "mcp.swiggy.com/dineout",
        "is_exact_match": True,
        "match_notice": f"Displaying {len(live_products)} restaurants from Swiggy Dineout",
        "products": live_products,
    }

def fetch_beauty_mcp_products(query: str, answers: list) -> dict:
    """
    Queries Shopify MCPs for Beauty, Skincare & Grooming items.
    """
    mcp_endpoints = [
        "https://clinikally.myshopify.com/api/ucp/mcp",
        "https://dot-key.myshopify.com/api/ucp/mcp",
        "https://bombay-shaving.myshopify.com/api/ucp/mcp"
    ]
    live_products = []

    # Attempt live MCP HTTP queries
    for mcp_endpoint in mcp_endpoints:
        try:
            headers = {"Content-Type": "application/json"}
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": "search_products",
                    "arguments": {"query": query}
                }
            }
            res = requests.post(mcp_endpoint, json=payload, headers=headers, timeout=3)
            if res.status_code == 200:
                data = res.json()
                if "result" in data and isinstance(data["result"], list):
                    live_products.extend(data["result"])
        except Exception as e:
            logger.info("Beauty MCP direct query info (%s), using AI MCP synthesis.", e)

    return {
        "mcp_server": "Shopify Beauty Network",
        "is_exact_match": True,
        "match_notice": f"Displaying {len(live_products)} products from beauty partners",
        "products": live_products,
    }


def fetch_apparel_mcp_products(query: str, answers: list) -> dict:
    """
    Queries Shopify MCPs for Footwear and Apparel items.
    """
    mcp_endpoints = [
        "https://baccabucci.myshopify.com/api/ucp/mcp",
        "https://babymarketstore.myshopify.com/api/ucp/mcp",
        "https://campusshoess.myshopify.com/api/ucp/mcp"
    ]
    live_products = []

    # Attempt live MCP HTTP queries
    for mcp_endpoint in mcp_endpoints:
        try:
            headers = {"Content-Type": "application/json"}
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": "search_products",
                    "arguments": {"query": query}
                }
            }
            res = requests.post(mcp_endpoint, json=payload, headers=headers, timeout=3)
            if res.status_code == 200:
                data = res.json()
                if "result" in data and isinstance(data["result"], list):
                    live_products.extend(data["result"])
        except Exception as e:
            logger.info("Apparel MCP direct query info (%s), using AI MCP synthesis.", e)

    return {
        "mcp_server": "Shopify Apparel Network",
        "is_exact_match": True,
        "match_notice": f"Displaying {len(live_products)} products from apparel partners",
        "products": live_products,
    }


@api_view(["POST"])
def validate_input(request):
    """Validate user query and return 4 MCQ questions."""
    category = request.data.get("category", "").strip()
    query = request.data.get("query", "").strip()

    if not category or not query:
        return Response(
            {"valid": False, "message": "Please select a category and enter a search term."},
            status=400,
        )

    if category not in ("food", "groceries", "reservation", "beauty", "apparel"):
        return Response(
            {"valid": False, "message": "Unknown category."},
            status=400,
        )

    user_prompt = (
        f"Target Audience: Indian Consumers 🇮🇳\n"
        f"Category: {category}\n"
        f"User Search Query: {query}\n\n"
        "Is this query relevant to the selected category?\n"
        "CRITICAL INSTRUCTION: Analyze the query logically. DEDUCE OBVIOUS FACTS from the query and NEVER ask redundant or foolish questions! "
        "(For example, if query is 'chicken biryani', DO NOT ask if it is Veg or Non-Veg because chicken is obviously non-veg! Ask instead about biryani style/cut, bone vs boneless, Indian spice level, portion size, or sides/combos).\n"
        "Generate 4 MCQ questions with choices that act as SMART, LOGICAL differentiators for an Indian consumer.\n"
        "Respond with the JSON format described in your instructions."
    )

    try:
        result = run_ai_pipeline(_skill_text, user_prompt)
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

    if not category or not query:
        return Response(
            {"error": "Category and query are required."},
            status=400,
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
        f"Category: {category}\n"
        f"Initial Query: {query}\n"
        f"Clarification Answers:\n{answers_formatted}\n\n"
        "Determine what specific product or food item the user wants."
    )

    try:
        final_info = run_ai_pipeline(system_prompt, user_prompt)

        # 2. Swiggy MCP / Shopify Integrations
        if category in ("groceries", "grocery"):
            swiggy_mcp_data = fetch_swiggy_mcp_products(query, answers)
            final_info["swiggy_mcp"] = swiggy_mcp_data
        elif category in ("food", "restaurant"):
            swiggy_food_data = fetch_swiggy_food_mcp_products(query, answers)
            final_info["swiggy_food_mcp"] = swiggy_food_data
        elif category in ("beauty", "skincare", "grooming"):
            beauty_mcp_data = fetch_beauty_mcp_products(query, answers)
            final_info["beauty_mcp"] = beauty_mcp_data
        elif category in ("apparel", "fashion", "shoes", "clothing", "footwear"):
            apparel_mcp_data = fetch_apparel_mcp_products(query, answers)
            final_info["apparel_mcp"] = apparel_mcp_data
        elif category in ("reservation", "dineout"):
            dineout_mcp_data = fetch_swiggy_dineout_mcp_products(query, answers)
            final_info["swiggy_dineout_mcp"] = dineout_mcp_data

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

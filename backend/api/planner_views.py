import json
import logging
import time
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .views import (
    run_ai_pipeline,
    _skill_text,
    fetch_swiggy_mcp_products,
    fetch_swiggy_food_mcp_products,
    fetch_swiggy_dineout_mcp_products,
    fetch_beauty_mcp_products,
    fetch_apparel_mcp_products
)

logger = logging.getLogger(__name__)

@api_view(["POST"])
def plan_event_validate(request):
    """
    Takes an open-ended event query (e.g. 'plan a birthday party') 
    and generates 4 clarifying MCQ questions.
    """
    query = request.data.get("query", "").strip()

    if not query:
        return Response({"valid": False, "message": "Query cannot be empty."}, status=400)

    user_prompt = (
        f"User Query: {query}\n\n"
        "The user wants to plan an event, activity, or make a general shopping purchase. "
        "Generate exactly 4 MCQ questions to clarify their specific requirements. "
        "If it is an event, ask about budget, number of people, theme, etc. "
        "If it is a specific product (like a laptop, phone, or shoes), ask about specs, brand preference, budget, and use-case. "
        "Each question should have exactly 4 short options.\n"
        "Respond with ONLY a JSON object containing a 'questions' array in this exact format:\n"
        "{\n"
        '  "questions": [\n'
        "    {\n"
        '      "id": 1,\n'
        '      "question": "Question text here?",\n'
        '      "options": ["Option A", "Option B", "Option C", "Option D"]\n'
        "    }\n"
        "  ]\n"
        "}\n"
    )

    system_prompt = _skill_text + "\nYou are an expert event planner and shopping assistant for Indian consumers."

    try:
        result = run_ai_pipeline(system_prompt, user_prompt)
        # Ensure standard return format
        if "questions" in result:
            result["valid"] = True
            return Response(result)
        else:
            return Response({"valid": True, "questions": result})
    except Exception as exc:
        return Response(
            {"valid": False, "message": f"AI service error: {str(exc)}"},
            status=502,
        )

@api_view(["POST"])
def plan_event_finalize(request):
    """
    Takes the query and answers, breaks it down into a list of required products,
    and fetches them from the appropriate MCPs.
    """
    query = request.data.get("query", "").strip()
    answers = request.data.get("answers", [])

    if not query:
        return Response({"error": "Query is required."}, status=400)

    system_prompt = (
        "You are an expert AI event planner and personal shopper for Indian consumers. "
        "Based on the user's event query and their answers to clarification questions, "
        "generate a list of exactly 4 to 6 specific products/services needed for the event.\n"
        "Assign one of the following categories to each product:\n"
        "- 'groceries' (for raw food, decorations, party supplies, household items, cakes from bakeries)\n"
        "- 'food' (for prepared restaurant meals or catering)\n"
        "- 'beauty' (for makeup, grooming, skincare)\n"
        "- 'apparel' (for clothes, shoes, fashion)\n"
        "- 'reservation' (for booking a table at a restaurant)\n\n"
        "Respond with ONLY a JSON object containing a 'products' array:\n"
        "{\n"
        '  "summary": "Brief summary of the planned event",\n'
        '  "products": [\n'
        "    {\n"
        '      "name": "Specific product name (e.g. Chocolate Truffle Cake 1kg)",\n'
        '      "category": "groceries",\n'
        '      "reason": "Why this is needed for the event"\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    answers_formatted = json.dumps(answers, indent=2) if answers else "None"
    user_prompt = f"Event Query: {query}\nClarification Answers:\n{answers_formatted}"

    try:
        plan_data = run_ai_pipeline(system_prompt, user_prompt)
        products = plan_data.get("products", [])
        
        tracks = []
        
        # Sequentially fetch from MCPs for each planned product category
        for idx, item in enumerate(products):
            cat = item.get("category", "")
            item_name = item.get("name", "")
            reason = item.get("reason", "")
            
            # The AI context for MCP
            item_answers = [{"question": "Purpose", "answer": reason}]
            
            if cat in ("groceries", "grocery"):
                mcp_data = fetch_swiggy_mcp_products(item_name, item_answers)
            elif cat in ("food", "restaurant"):
                mcp_data = fetch_swiggy_food_mcp_products(item_name, item_answers)
            elif cat in ("beauty", "skincare", "grooming"):
                mcp_data = fetch_beauty_mcp_products(item_name, item_answers)
            elif cat in ("apparel", "fashion", "shoes", "clothing", "footwear"):
                mcp_data = fetch_apparel_mcp_products(item_name, item_answers)
            elif cat in ("reservation", "dineout"):
                mcp_data = fetch_swiggy_dineout_mcp_products(item_name, item_answers)
            else:
                mcp_data = fetch_swiggy_mcp_products(item_name, item_answers)
                
            if mcp_data and mcp_data.get("products"):
                # Take top 5 matches to allow swiping
                swiping_items = mcp_data["products"][:5]
                for si in swiping_items:
                    si["planned_reason"] = reason
                    # Ensure image URL is mapped correctly if the MCP returns it in a different field
                    if "image" not in si and "image_url" in si:
                        si["image"] = si["image_url"]

                tracks.append({
                    "id": f"track_{idx}",
                    "title": item_name,
                    "icon": "✨",
                    "desc": reason,
                    "items": swiping_items
                })
            
            # Anti-burst delay to prevent Groq API rate limits
            time.sleep(1.5)

        return Response({
            "summary": plan_data.get("summary", "Your event has been planned!"),
            "tracks": tracks
        })

    except Exception as exc:
        logger.error(f"Error in event planner: {exc}")
        return Response({"error": f"Failed to plan event: {str(exc)}"}, status=502)

import json
import logging
import os
from typing import List, Dict, Any, Optional

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from .models import UserPreference
from .views import (
    _skill_text,
    fetch_swiggy_mcp_products,
    fetch_swiggy_food_mcp_products,
    fetch_swiggy_dineout_mcp_products,
    fetch_beauty_mcp_products,
    fetch_apparel_mcp_products,
    fetch_jewelry_mcp_products,
    fetch_eyewear_mcp_products,
    fetch_travel_mcp_products
)

logger = logging.getLogger(__name__)

# --- Pydantic Models for Structured Output ---

class MCQOption(BaseModel):
    options: List[str] = Field(description="List of exactly 4 options for the question")

class MCQQuestion(BaseModel):
    id: int = Field(description="Question ID")
    item_context: str = Field(description="The specific item this question is about (e.g., 'Shoes', 'Pizza')")
    question: str = Field(description="The question text")
    options: List[str] = Field(description="Exactly 4 options")

class ClarificationQuestions(BaseModel):
    questions: List[MCQQuestion] = Field(description="List of clarification questions for all items in the query")

class PlannedProduct(BaseModel):
    name: str = Field(description="Specific product/service name")
    category: str = Field(description="Category: 'food', 'groceries', 'beauty', 'apparel', 'jewelry', 'eyewear', 'reservation', or 'travel'")
    reason: str = Field(description="Why this item was selected")

class EventPlan(BaseModel):
    summary: str = Field(description="Brief summary of the planned items")
    products: List[PlannedProduct] = Field(description="List of exact products to fetch")


class QuikSwipeAgent:
    def __init__(self):
        # We assume OPENAI_API_KEY is in the environment
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)

    def get_user_preferences(self, user_id: str) -> dict:
        try:
            pref, created = UserPreference.objects.get_or_create(user_id=user_id)
            return pref.preferences
        except Exception as e:
            logger.error(f"Error fetching preferences: {e}")
            return {}

    def generate_questions(self, query: str, user_id: str = "default_user") -> dict:
        """
        Parses a query containing potentially multiple items, checks user preferences,
        and generates clarifying questions for all items.
        """
        preferences = self.get_user_preferences(user_id)
        
        system_prompt = """
You are an expert AI event planner and shopping assistant for Indian consumers.
The user's query may contain multiple different items (e.g., "pizza and shoes and t-shirt").
Your job is to identify all distinct items requested.
For EACH item, generate 1 to 2 smart, logical MCQ questions to clarify preferences based on the rules.
If you know the user's past preferences for an item, do not ask a redundant question.
User Preferences: {preferences}
"""

        skill_text_escaped = _skill_text.replace("{", "{{").replace("}", "}}")

        prompt = ChatPromptTemplate.from_messages([
            ("system", skill_text_escaped),
            ("system", system_prompt),
            ("user", "User Query: {query}")
        ])

        structured_llm = self.llm.with_structured_output(ClarificationQuestions)
        chain = prompt | structured_llm

        try:
            result = chain.invoke({"query": query, "preferences": json.dumps(preferences)})
            
            questions_list = []
            for q in result.questions:
                questions_list.append({
                    "id": q.id,
                    "item_context": q.item_context,
                    "question": f"[{q.item_context}] {q.question}",
                    "options": q.options
                })

            return {
                "valid": True,
                "message": "We need a few details to get the best items for you.",
                "questions": questions_list
            }
        except Exception as e:
            logger.error(f"Error generating questions: {e}")
            return {"valid": False, "message": "Failed to generate questions. Please try again."}

    def finalize_plan_and_fetch(self, query: str, answers: List[dict], user_id: str = "default_user") -> dict:
        """
        Breaks down the query and answers into exact products, then fetches them from MCPs.
        """
        preferences = self.get_user_preferences(user_id)
        
        system_prompt = """
You are an expert AI event planner and personal shopper for Indian consumers.
Based on the user's query and their answers to clarification questions, 
generate a list of specific products/services needed.
The user may have requested multiple different items (e.g., pizza, shoes, etc.).
Assign one of the following exact categories to each product:
- 'groceries' (for raw food, decorations, party supplies, household items, cakes)
- 'food' (for prepared restaurant meals or catering, pizza, biryani)
- 'beauty' (for makeup, grooming, skincare)
- 'apparel' (for clothes, shoes, fashion, t-shirts)
- 'jewelry' (for rings, necklaces, earrings, bracelets, watches, and precious or fashion jewelry)
- 'eyewear' (for eyeglasses, sunglasses, spectacles, frames, and contact-lens accessories)
- 'reservation' (for booking a table at a restaurant)
- 'travel' (for booking flights, hotels, trips, or experiences)

User Preferences Database: {preferences}
"""
        
        answers_str = json.dumps(answers, indent=2) if answers else "None"
        user_prompt_content = f"Event Query: {query}\nClarification Answers:\n{answers_str}"

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", "{user_prompt_content}")
        ])

        structured_llm = self.llm.with_structured_output(EventPlan)
        chain = prompt | structured_llm

        try:
            plan_data = chain.invoke({
                "user_prompt_content": user_prompt_content,
                "preferences": json.dumps(preferences)
            })

            tracks = []
            for idx, item in enumerate(plan_data.products):
                cat = item.category
                item_name = item.name
                reason = item.reason
                
                # Context for MCP search
                item_answers = [{"question": "Purpose", "answer": reason}]
                
                # Dynamically choose MCP based on category
                if cat in ("groceries", "grocery"):
                    mcp_data = fetch_swiggy_mcp_products(item_name, item_answers)
                elif cat in ("food", "restaurant"):
                    mcp_data = fetch_swiggy_food_mcp_products(item_name, item_answers)
                elif cat in ("beauty", "skincare", "grooming"):
                    mcp_data = fetch_beauty_mcp_products(item_name, item_answers)
                elif cat in ("apparel", "fashion", "shoes", "clothing", "footwear"):
                    mcp_data = fetch_apparel_mcp_products(item_name, item_answers)
                elif cat in ("jewelry", "jewellery", "jewels"):
                    mcp_data = fetch_jewelry_mcp_products(item_name, item_answers)
                elif cat in ("eyewear", "eyeglasses", "glasses", "spectacles", "sunglasses"):
                    mcp_data = fetch_eyewear_mcp_products(item_name, item_answers)
                elif cat in ("reservation", "dineout"):
                    mcp_data = fetch_swiggy_dineout_mcp_products(item_name, item_answers)
                elif cat in ("travel", "flights", "hotels", "experience"):
                    mcp_data = fetch_travel_mcp_products(item_name, item_answers)
                else:
                    mcp_data = fetch_swiggy_mcp_products(item_name, item_answers)

                if mcp_data and mcp_data.get("products"):
                    # Format for UI cards
                    swiping_items = mcp_data["products"][:5]
                    for si in swiping_items:
                        si["planned_reason"] = reason
                        # Ensure image field is available
                        if "image" not in si and "image_url" in si:
                            si["image"] = si["image_url"]

                    tracks.append({
                        "id": f"track_{idx}",
                        "title": item_name,
                        "icon": "✨",
                        "desc": reason,
                        "mcp_server": mcp_data.get("mcp_server", cat),
                        "items": swiping_items
                    })

            return {
                "summary": plan_data.summary,
                "tracks": tracks
            }
        except Exception as e:
            logger.error(f"Error finalizing plan: {e}")
            return {"error": f"Failed to fetch products: {str(e)}"}

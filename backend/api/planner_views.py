import json
import logging
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .agent import QuikSwipeAgent

logger = logging.getLogger(__name__)

_agent = None


def _get_agent():
    global _agent
    if _agent is None:
        _agent = QuikSwipeAgent()
    return _agent

@api_view(["POST"])
def plan_event_validate(request):
    """
    Takes an open-ended event query (e.g. 'plan a birthday party' or 'pizza and shoes')
    and uses LangChain to generate clarifying MCQ questions for all items.
    """
    query = request.data.get("query", "").strip()
    user_id = request.data.get("user_id", "default_user")

    if not query:
        return Response({"valid": False, "message": "Query cannot be empty."}, status=400)

    result = _get_agent().generate_questions(query, user_id=user_id)
    if not result.get("valid"):
        return Response(result, status=502)
        
    return Response(result)

@api_view(["POST"])
def plan_event_finalize(request):
    """
    Takes the query and answers, breaks it down into a list of required products,
    and dynamically fetches them from the appropriate MCPs using LangChain.
    """
    query = request.data.get("query", "").strip()
    answers = request.data.get("answers", [])
    user_id = request.data.get("user_id", "default_user")

    if not query:
        return Response({"error": "Query is required."}, status=400)

    result = _get_agent().finalize_plan_and_fetch(query, answers, user_id=user_id)
    if "error" in result:
        return Response(result, status=502)

    return Response(result)

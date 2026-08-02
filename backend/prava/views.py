import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .exceptions import PravaAPIError, PravaError
from .services import create_session, create_sessions, fetch_payment_result, report_payment_status


def _read_json(request):
    if not request.body:
        return {}

    try:
        return json.loads(request.body.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError('Request body must be valid JSON.') from error


def _to_json_response(result):
    return JsonResponse(result, safe=True)


@csrf_exempt
def session(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST is allowed.'}, status=405)

    try:
        payload = _read_json(request)
        return _to_json_response(create_session(payload))
    except PravaAPIError as error:
        return JsonResponse(error.payload or {'error': str(error)}, status=error.status_code or 502)
    except (ValueError, PravaError) as error:
        return JsonResponse({'error': str(error)}, status=400)


@csrf_exempt
def payment_result(request, session_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Only GET is allowed.'}, status=405)

    try:
        return _to_json_response(fetch_payment_result(session_id))
    except PravaAPIError as error:
        return JsonResponse(error.payload or {'error': str(error)}, status=error.status_code or 502)
    except (ValueError, PravaError) as error:
        return JsonResponse({'error': str(error)}, status=500)


@csrf_exempt
def report_status(request, session_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST is allowed.'}, status=405)

    payload = _read_json(request)
    try:
        return _to_json_response(report_payment_status(session_id, payload))
    except PravaAPIError as error:
        return JsonResponse(error.payload or {'error': str(error)}, status=error.status_code or 502)
    except (ValueError, PravaError) as error:
        return JsonResponse({'error': str(error)}, status=500)


@csrf_exempt
def sessions(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST is allowed.'}, status=405)

    try:
        payload = _read_json(request)
        return _to_json_response(create_sessions(payload))
    except PravaAPIError as error:
        return JsonResponse(error.payload or {'error': str(error)}, status=error.status_code or 502)
    except (ValueError, PravaError) as error:
        return JsonResponse({'error': str(error)}, status=400)
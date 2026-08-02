import json
import os
import urllib.error
import urllib.request

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from openai import OpenAI


def _read_json(request):
    if not request.body:
        return {}

    try:
        return json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return {}


@csrf_exempt
def create_prava_session(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST is allowed.'}, status=405)

    payload = _read_json(request)
    backend_url = os.getenv('PRAVA_BACKEND_URL', '').rstrip('/')
    secret_key = os.getenv('MERCHANT_SECRET_KEY', '')

    if not backend_url or not secret_key:
        return JsonResponse(
            {
                'error': 'Set PRAVA_BACKEND_URL and MERCHANT_SECRET_KEY in backend/.env before testing the checkout flow.',
            },
            status=500,
        )

    request_payload = {
        'currency': payload.get('currency', 'USD'),
        'amount': payload.get('amount', 0),
        'items': payload.get('items', []),
        'return_url': payload.get('return_url'),
    }

    url = f'{backend_url}/v1/sessions'
    request_body = json.dumps(request_payload).encode('utf-8')
    request_headers = {
        'Authorization': f'Bearer {secret_key}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }

    try:
        req = urllib.request.Request(url, data=request_body, headers=request_headers, method='POST')
        with urllib.request.urlopen(req, timeout=30) as response:
            response_body = response.read().decode('utf-8')
            return JsonResponse(json.loads(response_body), status=response.status, safe=True)
    except urllib.error.HTTPError as error:
        error_body = error.read().decode('utf-8') if error.fp else ''
        try:
            error_json = json.loads(error_body) if error_body else {'error': error.reason}
        except json.JSONDecodeError:
            error_json = {'error': error_body or error.reason}
        return JsonResponse(error_json, status=error.code)
    except urllib.error.URLError as error:
        return JsonResponse({'error': f'Could not reach Prava backend: {error.reason}'}, status=502)


@csrf_exempt
def identify_product(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST is allowed.'}, status=405)

    payload = _read_json(request)
    base64_image = payload.get('base64Image')
    if not base64_image:
        return JsonResponse({'error': 'No image data provided.'}, status=400)

    # Parse mimeType and base64Data
    mime_type = 'image/jpeg'
    base64_data = base64_image
    if base64_image.startswith('data:'):
        parts = base64_image.split(';base64,')
        if len(parts) == 2:
            mime_type = parts[0].replace('data:', '')
            base64_data = parts[1]

    api_key = os.getenv('OPENAI_API_KEY', '').strip()
    if not api_key:
        return JsonResponse({'error': 'OPENAI_API_KEY is not configured in backend.'}, status=500)

    prompt = """Analyze this image of a product. Identify the product and return details about it.
You MUST respond with a JSON object following this exact schema:
{
  "itemName": string,
  "brand": string,
  "category": string,
  "confidence": string,
  "description": string
}

Adhere strictly to this JSON structure. Do not wrap it in markdown block code formatting (like `json) and do not include any conversational filler. Only return the parsed JSON object."""

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {
                    'role': 'user',
                    'content': [
                        {'type': 'text', 'text': prompt},
                        {
                            'type': 'image_url',
                            'image_url': {
                                'url': f'data:{mime_type};base64,{base64_data}',
                            },
                        },
                    ],
                }
            ],
            response_format={'type': 'json_object'},
            max_tokens=300,
            timeout=30,
        )
        result = json.loads(response.choices[0].message.content or '{}')
        return JsonResponse(result, status=200, safe=True)
    except Exception as error:
        return JsonResponse({'error': f'Could not identify product with OpenAI: {error}'}, status=502)
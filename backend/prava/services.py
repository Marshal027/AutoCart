from uuid import uuid4

from .client import PravaClient
from .config import PravaSettings


def _format_money(value):
    return f'{float(value):.2f}'


def _get_user_id(payload):
    return (
        payload.get('userId')
        or payload.get('user_id')
        or f'guest_{uuid4().hex[:12]}'
    )


def _get_user_email(payload):
    return (
        payload.get('userEmail')
        or payload.get('user_email')
        or 'guest@example.com'
    )


def _merchant_details(settings: PravaSettings, merchant_key, items):
    first_item = items[0] if items else {}
    merchant_name = first_item.get('merchant_name') or first_item.get('source') or str(merchant_key or settings.merchant_name)
    merchant_url = first_item.get('merchant_url') or first_item.get('url') or settings.merchant_url
    if not str(merchant_url).startswith('https://'):
        merchant_url = 'https://autocart.example.com'
    return {
        'name': merchant_name,
        'url': merchant_url,
        'country_code_iso2': first_item.get('country_code') or settings.country_code,
        'category_code': first_item.get('category_code') or settings.category_code,
        'category': first_item.get('category') or settings.category,
    }


def _build_purchase_context(settings: PravaSettings, items, merchant_key=None):
    return [
        {
            'merchant_details': _merchant_details(settings, merchant_key, items),
            'product_details': [
                {
                    'description': item.get('name') or item.get('description') or 'Item',
                    'unit_price': _format_money(item.get('price', 0)),
                    'quantity': item.get('quantity', 1),
                }
                for item in items
            ],
            'effective_until_minutes': 15,
        }
    ]


def create_session(payload):
    settings = PravaSettings.from_env()
    client = PravaClient(settings)
    items = payload.get('items', [])

    callback_url = payload.get('callback_url') or payload.get('return_url')
    request_payload = {
        'currency': payload.get('currency', settings.default_currency),
        'total_amount': _format_money(payload.get('total_amount', payload.get('amount', 0))),
        'user_id': _get_user_id(payload),
        'user_email': _get_user_email(payload),
        'description': payload.get('description', 'Sandbox order'),
        'purchase_context': _build_purchase_context(settings, items, payload.get('merchant_key')),
    }
    if callback_url and str(callback_url).startswith('https://'):
        request_payload['callback_url'] = callback_url

    return client.create_session(request_payload)


def create_sessions(payload):
    settings = PravaSettings.from_env()
    items = payload.get('items', [])
    groups = {}
    for item in items:
        merchant_key = item.get('mcp_server') or item.get('merchant_key') or item.get('source') or settings.merchant_name
        groups.setdefault(merchant_key, []).append(item)

    sessions = []
    for merchant_key, merchant_items in groups.items():
        subtotal = sum(float(item.get('price', 0)) * int(item.get('quantity', 1)) for item in merchant_items)
        session = create_session({
            **payload,
            'items': merchant_items,
            'amount': subtotal,
            'total_amount': subtotal,
            'merchant_key': merchant_key,
        })
        sessions.append({
            'merchant_key': merchant_key,
            'merchant_name': _merchant_details(settings, merchant_key, merchant_items)['name'],
            'amount': _format_money(subtotal),
            **session,
        })

    return {
        'session_count': len(sessions),
        'sessions': sessions,
    }


def fetch_payment_result(session_id: str):
    settings = PravaSettings.from_env()
    client = PravaClient(settings)
    return client.get_payment_result(session_id)


def report_payment_status(session_id: str, payload):
    settings = PravaSettings.from_env()
    client = PravaClient(settings)
    return client.report_payment_status(session_id, payload)
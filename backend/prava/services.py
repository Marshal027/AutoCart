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


def _build_purchase_context(settings: PravaSettings, items):
    return [
        {
            'merchant_details': {
                'name': settings.merchant_name,
                'url': settings.merchant_url,
                'country_code_iso2': settings.country_code,
                'category_code': settings.category_code,
                'category': settings.category,
            },
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

    request_payload = {
        'currency': payload.get('currency', settings.default_currency),
        'total_amount': _format_money(payload.get('total_amount', payload.get('amount', 0))),
        'user_id': _get_user_id(payload),
        'user_email': _get_user_email(payload),
        'return_url': payload.get('return_url'),
        'description': payload.get('description', 'Sandbox order'),
        'purchase_context': _build_purchase_context(settings, items),
    }

    return client.create_session(request_payload)


def fetch_payment_result(session_id: str):
    settings = PravaSettings.from_env()
    client = PravaClient(settings)
    return client.get_payment_result(session_id)
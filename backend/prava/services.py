from decimal import Decimal, InvalidOperation
from uuid import uuid4

from .client import PravaClient
from .config import PravaSettings


def _money(value, field_name):
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as error:
        raise ValueError(f'{field_name} must be a valid number.') from error

    if not amount.is_finite() or amount < 0:
        raise ValueError(f'{field_name} must be a non-negative number.')
    return amount.quantize(Decimal('0.01'))


def _format_money(value):
    return f'{_money(value, "amount"):.2f}'


def _validate_items(items):
    if not isinstance(items, list) or not items:
        raise ValueError('At least one cart item is required.')

    normalized_items = []
    for item in items:
        if not isinstance(item, dict):
            raise ValueError('Each cart item must be an object.')

        name = str(item.get('name') or item.get('description') or '').strip()
        if not name:
            raise ValueError('Each cart item must have a name.')

        price = _money(item.get('price'), 'item price')
        if price <= 0:
            raise ValueError('Item prices must be greater than zero.')

        try:
            quantity = int(item.get('quantity', 1))
        except (TypeError, ValueError) as error:
            raise ValueError('Item quantity must be a positive integer.') from error
        if quantity <= 0 or str(quantity) != str(item.get('quantity', 1)).strip():
            raise ValueError('Item quantity must be a positive integer.')

        normalized_item = dict(item)
        normalized_item['name'] = name
        normalized_item['price'] = price
        normalized_item['quantity'] = quantity
        normalized_items.append(normalized_item)

    return normalized_items


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
    items = _validate_items(payload.get('items', []))
    total_amount = _money(payload.get('total_amount', payload.get('amount')), 'amount')
    if total_amount <= 0:
        raise ValueError('amount must be greater than zero.')

    request_payload = {
        'currency': payload.get('currency', settings.default_currency),
        'total_amount': _format_money(total_amount),
        'user_id': _get_user_id(payload),
        'user_email': _get_user_email(payload),
        'description': payload.get('description', 'Sandbox order'),
        'purchase_context': _build_purchase_context(settings, items, payload.get('merchant_key')),
        'integration_type': 'full_checkout',
    }
    if settings.callback_url:
        request_payload['callback_url'] = settings.callback_url

    return client.create_session(request_payload)


def create_sessions(payload):
    settings = PravaSettings.from_env()
    items = _validate_items(payload.get('items', []))
    if payload.get('budget_limit') is None or not str(payload.get('budget_limit')).strip():
        raise ValueError('Set a maximum checkout budget in Prava settings before paying.')

    budget_limit = _money(payload.get('budget_limit'), 'budget_limit')
    if budget_limit <= 0:
        raise ValueError('budget_limit must be greater than zero.')

    requested_amount = _money(
        payload.get('amount', payload.get('total_amount')),
        'amount',
    )
    if requested_amount <= 0:
        raise ValueError('amount must be greater than zero.')

    cart_amount = sum(
        (item['price'] * item['quantity'] for item in items),
        Decimal('0.00'),
    ).quantize(Decimal('0.01'))
    if requested_amount < cart_amount:
        raise ValueError('amount cannot be lower than the cart total.')
    if requested_amount > budget_limit:
        raise ValueError(
            f'Payment amount {requested_amount:.2f} exceeds the Prava budget limit of {budget_limit:.2f}.'
        )

    groups = {}
    for item in items:
        merchant_key = str(
            item.get('mcp_server')
            or item.get('merchant_key')
            or item.get('source')
            or settings.merchant_name
        ).strip()
        groups.setdefault(merchant_key, []).append(item)

    sessions = []
    for merchant_key, merchant_items in groups.items():
        subtotal = sum(
            (item['price'] * item['quantity'] for item in merchant_items),
            Decimal('0.00'),
        ).quantize(Decimal('0.01'))
        session = create_session({
            **payload,
            'items': merchant_items,
            'amount': _format_money(subtotal),
            'total_amount': _format_money(subtotal),
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
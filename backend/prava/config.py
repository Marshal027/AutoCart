from dataclasses import dataclass
import os


@dataclass(frozen=True)
class PravaSettings:
    backend_url: str
    merchant_secret_key: str
    merchant_name: str = 'Sandbox Store'
    merchant_url: str = 'http://localhost:8000'
    country_code: str = 'US'
    category_code: str = '5734'
    category: str = 'Software Services'
    request_timeout_seconds: int = 30
    default_currency: str = 'USD'

    @classmethod
    def from_env(cls) -> 'PravaSettings':
        backend_url = os.getenv('PRAVA_BACKEND_URL', '').rstrip('/')
        merchant_secret_key = os.getenv('MERCHANT_SECRET_KEY', '')

        if not backend_url:
            raise ValueError('PRAVA_BACKEND_URL is missing.')

        if not merchant_secret_key:
            raise ValueError('MERCHANT_SECRET_KEY is missing.')

        return cls(
            backend_url=backend_url,
            merchant_secret_key=merchant_secret_key,
            merchant_name=os.getenv('PRAVA_MERCHANT_NAME', 'Sandbox Store'),
            merchant_url=os.getenv('PRAVA_MERCHANT_URL', 'http://localhost:8000'),
            country_code=os.getenv('PRAVA_COUNTRY_CODE', 'US'),
            category_code=os.getenv('PRAVA_CATEGORY_CODE', '5734'),
            category=os.getenv('PRAVA_CATEGORY', 'Software Services'),
            request_timeout_seconds=int(os.getenv('PRAVA_REQUEST_TIMEOUT_SECONDS', '30')),
            default_currency=os.getenv('PRAVA_DEFAULT_CURRENCY', 'USD'),
        )
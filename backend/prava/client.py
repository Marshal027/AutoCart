import json
import time
import urllib.error
import urllib.request

from .config import PravaSettings
from .exceptions import PravaAPIError


class PravaClient:
    def __init__(self, settings: PravaSettings):
        self.settings = settings

    def create_session(self, payload):
        return self._request_json('POST', '/v1/sessions', payload)

    def get_payment_result(self, session_id: str):
        path = f'/v1/sessions/{session_id}/payment-result?_t={int(time.time() * 1000)}'
        return self._request_json('GET', path)

    def _request_json(self, method: str, path: str, payload=None):
        url = f'{self.settings.backend_url}{path}'
        headers = {
            'Authorization': f'Bearer {self.settings.merchant_secret_key}',
            'Accept': 'application/json',
        }

        data = None
        if payload is not None:
            headers['Content-Type'] = 'application/json'
            data = json.dumps(payload).encode('utf-8')

        request = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(request, timeout=self.settings.request_timeout_seconds) as response:
                response_body = response.read().decode('utf-8')
                return json.loads(response_body)
        except urllib.error.HTTPError as error:
            error_body = error.read().decode('utf-8') if error.fp else ''
            try:
                payload = json.loads(error_body) if error_body else {'error': error.reason}
            except json.JSONDecodeError:
                payload = {'error': error_body or error.reason}

            message = payload.get('error', {}).get('message') if isinstance(payload.get('error'), dict) else payload.get('error')
            raise PravaAPIError(message or f'Prava API error (HTTP {error.code})', status_code=error.code, payload=payload) from error
        except urllib.error.URLError as error:
            raise PravaAPIError(f'Could not reach Prava backend: {error.reason}', status_code=502) from error
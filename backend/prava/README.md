# Prava Integration Module

This folder is a fully modular, reusable Django app that isolates the Prava backend integration. You can easily copy this folder into any future Django project and reuse the same structure with only environment values and URL wiring changed.

## What it includes

- `config.py` - reads Prava settings from environment variables
- `client.py` - wraps Prava HTTP requests
- `services.py` - builds session payloads and fetches payment results
- `views.py` - Django JSON endpoints
- `urls.py` - URL routes you can mount in another project

---

## 1. How to Integrate (Backend)

1. **Copy the Folder:** Copy the entire `prava/` folder into your new Django project directory.
2. **Register the App:** Add `'prava'` to the `INSTALLED_APPS` list in your project's `settings.py`.
3. **Mount the Routes:** Include the routes in your project's main `urls.py`. You can use any prefix:

```python
from django.urls import include, path

urlpatterns = [
   path('api/prava/', include('prava.urls')),
]
```

## 2. Connect & Configure APIs

You must provide the correct API keys and URLs to connect to the Prava platform.

### Where the API keys have to be added

1. **Backend Secrets:** Create or open the `.env` file at the root of your Django project and add:
   ```env
   PRAVA_BACKEND_URL=https://sandbox.api.prava.space
   MERCHANT_SECRET_KEY=your_secret_key_here
   ```
2. **Frontend Keys (if applicable):** The frontend will need the publishable key in its own `.env`:
   ```env
   VITE_PRAVA_PUBLISHABLE_KEY=your_publishable_key_here
   ```

*(Optional variables for branding like `PRAVA_MERCHANT_NAME`, `PRAVA_COUNTRY_CODE`, etc. can also be added to the backend `.env`)*

## 3. Where Output is Received and Obtained

### Frontend (Session Creation)
When the frontend posts the cart data to the backend endpoint, the Prava API returns a session object.
- **Where it is received:** The JSON response from `POST /api/prava/session/`.
- **Where it is obtained:** Your frontend fetch call will receive the response containing an `iframe_url` or `url` which is used to render the Prava checkout UI.

**Example Frontend Call:**
```javascript
const response = await fetch('/api/prava/session/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ items: [...], amount: 100, currency: 'USD' })
});
const data = await response.json();
console.log("Obtained Checkout URL:", data.iframe_url);
```

### Backend (Payment Result)
- **Where it is received:** You can obtain the final status of a payment by hitting `GET /api/prava/sessions/{session_id}/payment-result/`.
- **Server-Side Access:** You can also obtain the result directly in python code without HTTP overhead by importing:
  ```python
  from prava.api import fetch_payment_result
  result = fetch_payment_result("session_123")
  ```

---

## 4. Common Errors & How to Fix Them

1. **Error:** `500 Internal Server Error: Set PRAVA_BACKEND_URL and MERCHANT_SECRET_KEY...`
   - **Cause:** The backend environment variables are missing.
   - **Fix:** Ensure you have added the keys to your `backend/.env` file and that `python-dotenv` is actively loading them in `settings.py`.

2. **Error:** `401 Unauthorized` (from Prava API)
   - **Cause:** The `MERCHANT_SECRET_KEY` is invalid or expired.
   - **Fix:** Verify your secret key in the Prava Dashboard and update it in your `backend/.env` file. Ensure there are no hidden spaces.

3. **Error:** `502 Bad Gateway: Could not reach Prava backend`
   - **Cause:** Network issues, incorrect `PRAVA_BACKEND_URL`, or Prava's servers are temporarily down.
   - **Fix:** Verify the `PRAVA_BACKEND_URL` in your `.env` does not have typos. If correct, check Prava's status page.

4. **Error:** `404 Not Found` (When calling `/api/prava/session/`)
   - **Cause:** The `prava.urls` are not mounted correctly in your project's main `urls.py`, or a trailing slash is missing in the frontend request.
   - **Fix:** Double-check `urls.py` and ensure the frontend fetch call uses the exact path including the trailing slash (e.g. `/api/prava/session/`).

5. **Error:** `CORS error`
   - **Cause:** The frontend and backend are on different origins and CORS headers are missing.
   - **Fix:** Ensure `django-cors-headers` is installed and configured in your Django settings, or configure your frontend bundler to proxy `/api` requests to the Django backend.
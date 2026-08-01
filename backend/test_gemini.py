from google import genai

API_KEY = "YOUR_API_KEY"

client = genai.Client(api_key=API_KEY)

try:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Say hello."
    )
    print(response.text)
except Exception as e:
    print(repr(e))
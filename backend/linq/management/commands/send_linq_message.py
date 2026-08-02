import os
import json
import requests
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Send a message to a recipient via Linq API'

    def add_arguments(self, parser):
        parser.add_argument('--to', type=str, help='Recipient phone number')
        parser.add_argument('--message', type=str, default='Hello from Linq!', help='Message body')

    def handle(self, *args, **options):
        api_key = os.getenv('LINQ_API_KEY')
        from_num = os.getenv('LINQ_FROM_NUMBER')
        to_num = options['to'] or os.getenv('LINQ_TO_NUMBER')
        msg_text = options['message']

        if not api_key or not from_num or not to_num:
            self.stdout.write(self.style.ERROR("Missing LINQ_API_KEY, LINQ_FROM_NUMBER, or LINQ_TO_NUMBER in .env."))
            return

        self.stdout.write(f"Sending message to {to_num}...")
        url = "https://api.linqapp.com/api/partner/v3/chats"
        auth_header = api_key if api_key.startswith("Bearer ") else f"Bearer {api_key}"

        headers = {
            "Authorization": auth_header,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        payload = {
            "from": from_num,
            "to": [to_num],
            "message": {
                "parts": [
                    {
                        "type": "text",
                        "value": msg_text
                    }
                ]
            }
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            if response.status_code in (200, 201):
                self.stdout.write(self.style.SUCCESS(f"Message sent successfully! Response: {response.text}"))
            else:
                self.stdout.write(self.style.ERROR(f"Failed to send message: {response.status_code} - {response.text}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error occurred: {e}"))

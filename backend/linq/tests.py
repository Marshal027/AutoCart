from django.test import TestCase
from unittest.mock import Mock, patch
from rest_framework.test import APIClient

from .models import LinqMessage, PriceTrackerItem, WatchlistItem
from .views import apply_price_tracker_intent, call_openai_classifier, extract_incoming_message, process_message_async, send_linq_reply


class LinqEndpointTests(TestCase):
	def setUp(self):
		self.client = APIClient()

	def test_webhook_health_check(self):
		response = self.client.get('/api/linq/webhook/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['status'], 'active')

	def test_latest_message_returns_and_marks_message_processed(self):
		LinqMessage.objects.create(
			text='1. Milk',
			from_number='+10000000000',
			is_valid_list=True,
		)

		response = self.client.get('/api/linq/latest-message/')

		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.data['has_new'])
		self.assertEqual(response.data['text'], '1. Milk')
		self.assertTrue(LinqMessage.objects.get().is_processed)

	def test_latest_message_is_empty_when_no_pending_messages(self):
		response = self.client.get('/api/linq/latest-message/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data, {'has_new': False})

	def test_ai_message_is_generated_and_sent(self):
		with patch('linq.views.generate_ai_text', return_value='Your cart is ready!') as generate_ai_text:
			with patch('linq.views.send_linq_reply', return_value={'id': 'test-message'}) as send_linq_reply:
				response = self.client.post(
					'/api/linq/send-ai-message/',
					{
						'to_number': '+10000000000',
						'query': 'groceries',
						'cart_items': [{'name': 'Milk', 'quantity': 1}],
					},
					format='json',
				)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['status'], 'sent')
		self.assertEqual(response.data['message'], 'Your cart is ready!')
		generate_ai_text.assert_called_once()
		send_linq_reply.assert_called_once()

	def test_nested_webhook_message_extracts_sender_text_and_id(self):
		payload = {
			'event_type': 'message.received',
			'data': {
				'message': {
					'id': 'msg-123',
					'from': '+10000000000',
					'parts': [{'type': 'text', 'value': 'hello'}],
				}
			},
		}

		self.assertEqual(
			extract_incoming_message(payload),
			('hello', '+10000000000', 'msg-123'),
		)

	def test_versioned_webhook_message_supports_type_text_and_phone_fields(self):
		payload = {
			'type': 'message.received',
			'data': {
				'id': 'msg-456',
				'parts': [{'type': 'text', 'value': 'Can you help?'}],
				'sender_handle': {'handle': '+10000000000'},
				'service': 'RCS',
			},
		}

		self.assertEqual(
			extract_incoming_message(payload),
			('Can you help?', '+10000000000', 'msg-456'),
		)

	def test_outgoing_webhook_event_is_ignored(self):
		payload = {'event_type': 'message.sent', 'data': {'message': {'text': 'hello'}}}

		self.assertIsNone(extract_incoming_message(payload))

	@patch('linq.views.send_linq_reply', return_value={'id': 'reply-1'})
	@patch('linq.views.call_openai_classifier', return_value={
		'is_valid': False,
		'reply_text': 'Hi! How can I help?',
	})
	def test_every_incoming_reply_is_saved_and_answered(self, classifier, send_linq_reply):
		process_message_async('hello', '+10000000000', 'msg-456')

		message = LinqMessage.objects.get(provider_message_id='msg-456')
		self.assertEqual(message.reply_text, 'Hi! How can I help?')
		self.assertTrue(message.reply_sent)
		self.assertFalse(message.is_valid_list)
		classifier.assert_called_once_with('hello', {
			'pending_product': '',
			'stage': 'idle',
			'questions': [],
			'answers': [],
		})
		send_linq_reply.assert_called_once_with(
			'+10000000000',
			'Hi! How can I help?',
			chat_id=None,
			reply_to_message_id='msg-456',
			preferred_service=None,
		)

	def test_offer_then_confirmation_adds_product_to_tracker(self):
		with patch('linq.views.call_openai_classifier', side_effect=[
			{
				'intent': 'track_request',
				'category': 'apparel',
				'product': 'running shoes',
				'questions': ['Which brand?', 'Which size?', 'Running or casual?'],
			},
			{
				'intent': 'preference_answer',
				'answers': ['Campus', 'UK 9', 'Running'],
			},
			{'intent': 'confirm_product'},
		]), patch('linq.views.search_linq_mcps', return_value=[{
			'id': 'shoe-123',
			'name': 'Campus Running Shoes',
			'brand': 'Campus',
			'quantity': 'UK 9',
			'price': 1299,
			'merchant': 'Campus MCP',
			'in_stock': True,
			'source_mcp': 'campus-mcp',
		}]), patch('linq.views.send_linq_reply', return_value={'id': 'reply'}):
			process_message_async('I am looking for running shoes', '+10000000000', 'offer-1')
			process_message_async('Campus, UK 9, running shoes for daily training', '+10000000000', 'answer-1')
			process_message_async('yes', '+10000000000', 'confirm-1')

		self.assertTrue(
			PriceTrackerItem.objects.filter(
				owner_number='+10000000000', product_id='shoe-123', product_name='Campus Running Shoes'
			).exists()
		)

	def test_remove_and_list_tracker_items(self):
		WatchlistItem.objects.create(owner_number='+10000000000', product_id='milk-1', product_name='Milk', price=55)
		WatchlistItem.objects.create(owner_number='+10000000000', product_id='shoes-1', product_name='Shoes', price=1200)

		removed = apply_price_tracker_intent(
			'+10000000000',
			{'intent': 'remove_tracker', 'product': 'Milk', 'reply_text': ''},
			'',
		)
		listed = apply_price_tracker_intent(
			'+10000000000',
			{'intent': 'list_tracker', 'product': '', 'reply_text': ''},
			'',
		)

		self.assertIn('removed', removed.lower())
		self.assertNotIn('Milk', listed)
		self.assertIn('Shoes', listed)
		self.assertIn('₹1200', listed)

	def test_track_command_returns_watchlist_with_prices(self):
		WatchlistItem.objects.create(owner_number='+10000000000', product_id='milk-1', product_name='Milk', price=55)

		response = self.client.get('/api/linq/watchlist/?owner_number=%2B10000000000')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(str(response.data['items'][0]['price']), '55.00')

	@patch('linq.views.send_linq_reply', return_value={'id': 'reply-track'})
	def test_inbound_track_message_replies_with_watchlist_prices(self, send_linq_reply):
		WatchlistItem.objects.create(owner_number='+10000000000', product_id='milk-1', product_name='Milk', price=55)

		process_message_async('track', '+10000000000', 'track-1')

		reply = send_linq_reply.call_args.args[1]
		self.assertIn('Your Watch List:', reply)
		self.assertIn('Milk', reply)
		self.assertIn('₹55', reply)

	def test_watchlist_is_database_backed(self):
		create_response = self.client.post(
			'/api/linq/watchlist/',
			{
				'owner_number': '+10000000000',
				'product_id': 'mcp-1',
				'name': 'Amul Gold Milk',
				'brand': 'Amul',
				'price': 148,
				'merchant': 'Instamart',
			},
			format='json',
		)
		self.assertEqual(create_response.status_code, 201)

		list_response = self.client.get('/api/linq/watchlist/?owner_number=%2B10000000000')
		self.assertEqual(list_response.status_code, 200)
		self.assertEqual(list_response.data['items'][0]['product_id'], 'mcp-1')

		remove_response = self.client.delete('/api/linq/watchlist/mcp-1/?owner_number=%2B10000000000')
		self.assertEqual(remove_response.status_code, 200)
		self.assertTrue(remove_response.data['removed'])

	@patch('linq.views.OpenAI')
	def test_classifier_builds_price_tracker_prompt(self, openai_cls):
		openai_cls.return_value.chat.completions.create.return_value.choices = [
			type('Choice', (), {
				'message': type('Message', (), {
					'content': '{"intent":"offer_track","product":"sport shoes","reply_text":"Track sport shoes?"}',
				})(),
			})(),
		]

		result = call_openai_classifier('sport shoes', {
			'pending_product': 'sport shoes',
			'stage': 'collecting_preferences',
			'questions': ['Which brand?', 'Which size?'],
			'answers': [],
		})

		self.assertEqual(result['intent'], 'offer_track')
		prompt = openai_cls.return_value.chat.completions.create.call_args.kwargs['messages'][0]['content']
		self.assertIn('price-tracking concierge', prompt)
		self.assertIn('workflow stage is: collecting_preferences', prompt)

	@patch.dict('os.environ', {'LINQ_API_KEY': 'test-key'})
	@patch('linq.views.LINQ_SESSION.post')
	def test_reply_uses_existing_chat_messages_endpoint(self, post):
		response = Mock(status_code=201, text='{}')
		response.raise_for_status.return_value = None
		response.json.return_value = {'id': 'outbound-1'}
		post.return_value = response

		result = send_linq_reply(
			'+10000000000',
			'Would you like to track shoes?',
			chat_id='chat-123',
			reply_to_message_id='inbound-123',
			preferred_service='RCS',
		)

		self.assertEqual(result, {'id': 'outbound-1'})
		url = post.call_args.args[0]
		payload = post.call_args.kwargs['json']
		self.assertEqual(url, 'https://api.linqapp.com/api/partner/v3/chats/chat-123/messages')
		self.assertNotIn('from', payload)
		self.assertEqual(payload['message']['preferred_service'], 'RCS')
		self.assertEqual(payload['message']['reply_to']['message_id'], 'inbound-123')

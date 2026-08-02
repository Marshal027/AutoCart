from django.urls import path
from . import views

urlpatterns = [
    path('webhook/', views.linq_webhook, name='linq-webhook'),
    path('latest-message/', views.get_latest_message, name='linq-latest-message'),
    path('watchlist/', views.price_tracker_watchlist, name='linq-watchlist'),
    path('watchlist/<str:product_id>/', views.remove_watchlist_item, name='linq-watchlist-remove'),
    path('send-message/', views.send_manual_message, name='linq-send-message'),
    path('send-ai-message/', views.send_ai_message, name='linq-send-ai-message'),
]

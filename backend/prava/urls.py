from django.urls import path

from . import views

urlpatterns = [
    path('session/', views.session, name='prava-session'),
    path('sessions/<str:session_id>/payment-result/', views.payment_result, name='prava-payment-result'),
]
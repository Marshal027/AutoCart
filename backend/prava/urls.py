from django.urls import path

from . import views

urlpatterns = [
    path('session/', views.session, name='prava-session'),
    path('sessions/', views.sessions, name='prava-sessions'),
    path('sessions/<str:session_id>/payment-result/', views.payment_result, name='prava-payment-result'),
    path('sessions/<str:session_id>/report-status/', views.report_status, name='prava-report-status'),
]
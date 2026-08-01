from django.urls import path

from . import views

urlpatterns = [
    path('prava/session/', views.create_prava_session, name='create-prava-session'),
    path('vision/identify/', views.identify_product, name='identify-product'),
]
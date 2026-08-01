from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/prava/', include('prava.urls')),
    path('api/shop/', include('shop.urls')),
]
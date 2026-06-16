import os
from django.urls import path, include, re_path
from django.views.static import serve
from django.conf import settings

urlpatterns = [
    # Route static/media uploads and photos
    re_path(r'^uploads/(?P<path>.*)$', serve, {'document_root': os.getenv("UPLOAD_DIR", "uploads")}),
    re_path(r'^photos/(?P<path>.*)$', serve, {'document_root': os.getenv("PHOTO_DIR", "photos")}),
    
    # Route all API and authentication calls to api app
    path('', include('api.urls')),
]

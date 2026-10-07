from django.urls import path
from .views import get_categories, get_questions

urlpatterns = [
    path('categories/', get_categories),
    path('questions/', get_questions),
]

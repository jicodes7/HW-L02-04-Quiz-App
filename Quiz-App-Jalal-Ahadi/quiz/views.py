from django.http import JsonResponse
from django.shortcuts import render
from .models import Category, Question
import random


def home(request):
    """Render the single-page quiz front end."""
    return render(request, "quiz/index.html")


def get_categories(request):
    categories = Category.objects.all()
    data = {
        "trivia_categories": [{"id": cat.id, "name": cat.name} for cat in categories]
    }
    return JsonResponse(data)


def get_questions(request):
    # Query params example: ?amount=5&difficulty=easy&category=1
    try:
        amount = int(request.GET.get("amount", 5))
    except (TypeError, ValueError):
        amount = 5

    amount = max(1, min(amount, 50))
    category_id = request.GET.get("category")
    difficulty = request.GET.get("difficulty")

    queryset = Question.objects.all()
    if category_id:
        queryset = queryset.filter(category_id=category_id)
    if difficulty in {"easy", "medium", "hard"}:
        queryset = queryset.filter(difficulty=difficulty)

    questions = list(queryset)
    random.shuffle(questions)
    selected_questions = questions[:amount]

    if not selected_questions:
        return JsonResponse({"response_code": 1, "results": []})

    results = []
    for q in selected_questions:
        results.append(
            {
                "category": q.category.name,
                "type": "multiple",
                "difficulty": q.difficulty,
                "question": q.question,
                "correct_answer": q.correct_answer,
                "incorrect_answers": [
                    q.incorrect_answer_1,
                    q.incorrect_answer_2,
                    q.incorrect_answer_3,
                ],
            }
        )

    return JsonResponse({"response_code": 0, "results": results})

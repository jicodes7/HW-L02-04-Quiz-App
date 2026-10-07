import json
from django.core.management.base import BaseCommand
from quiz.models import Category, Question


class Command(BaseCommand):
    help = "Import questions from questions.json (no duplicates)"

    def handle(self, *args, **kwargs):
        with open("questions.json", "r", encoding="utf-8") as f:
            items = json.load(f)

        created = 0
        skipped = 0

        for item in items:
            category, _ = Category.objects.get_or_create(name=item["category"])

            # جلوگیری از ورود تکراری
            exists = Question.objects.filter(
                category=category,
                question=item["question"].strip(),
                correct_answer=item["correct_answer"].strip(),
                difficulty=item.get("difficulty", "easy"),
            ).exists()

            if exists:
                skipped += 1
                continue

            incorrect = item["incorrect_answers"]
            if len(incorrect) != 3:
                self.stdout.write(self.style.WARNING(
                    f"Skipping invalid item (needs 3 incorrect answers): {item.get('question')}"
                ))
                skipped += 1
                continue

            Question.objects.create(
                category=category,
                question=item["question"].strip(),
                correct_answer=item["correct_answer"].strip(),
                incorrect_answer_1=incorrect[0].strip(),
                incorrect_answer_2=incorrect[1].strip(),
                incorrect_answer_3=incorrect[2].strip(),
                difficulty=item.get("difficulty", "easy"),
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. Created: {created}, Skipped: {skipped}"
        ))

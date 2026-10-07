from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Question(models.Model):
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    question = models.TextField()
    correct_answer = models.CharField(max_length=255)
    incorrect_answer_1 = models.CharField(max_length=255)
    incorrect_answer_2 = models.CharField(max_length=255)
    incorrect_answer_3 = models.CharField(max_length=255)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)

    def __str__(self):
        return self.question

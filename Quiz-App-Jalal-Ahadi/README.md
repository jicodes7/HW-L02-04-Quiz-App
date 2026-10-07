# Quiz App - Jalal Ahadi

A single-page quiz application built with HTML, CSS, vanilla JavaScript, and the provided Django API.

## Features

- Start screen with question count, difficulty, and optional category
- Questions loaded from the provided Django API
- Four shuffled answers for every question
- Immediate correct/incorrect feedback before moving to the next question
- Question counter and live score
- Full quiz state saved in `localStorage` so the user can continue after refreshing or reopening the tab
- Result screen with final score and answer review
- 15-second timer for every question
- Loading skeleton while questions are fetched
- Start-again button
- Responsive layout for desktop and mobile

## Run locally

```bash
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

macOS / Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Prepare the database:

```bash
python manage.py makemigrations
python manage.py migrate
```

The supplied SQLite database already contains the quiz data. If you ever need to import the JSON data again, run:

```bash
python manage.py import_questions
```

Start the server:

```bash
python manage.py runserver
```

Then open:

```text
http://127.0.0.1:8000/
```

API examples:

```text
http://127.0.0.1:8000/api/questions/?amount=10&category=1
http://127.0.0.1:8000/api/questions/?amount=5&difficulty=easy
http://127.0.0.1:8000/api/categories/
```

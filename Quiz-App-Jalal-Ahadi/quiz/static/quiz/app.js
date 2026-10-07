(() => {
  "use strict";

  const STORAGE_KEY = "quizAppStateV1";
  const QUESTION_TIME = 15;

  const els = {
    startScreen: document.getElementById("startScreen"),
    loadingScreen: document.getElementById("loadingScreen"),
    quizScreen: document.getElementById("quizScreen"),
    resultScreen: document.getElementById("resultScreen"),
    settingsForm: document.getElementById("settingsForm"),
    amount: document.getElementById("amount"),
    difficulty: document.getElementById("difficulty"),
    category: document.getElementById("category"),
    startButton: document.getElementById("startButton"),
    startMessage: document.getElementById("startMessage"),
    questionCounter: document.getElementById("questionCounter"),
    categoryLabel: document.getElementById("categoryLabel"),
    scoreValue: document.getElementById("scoreValue"),
    timerValue: document.getElementById("timerValue"),
    progressBar: document.getElementById("progressBar"),
    questionText: document.getElementById("questionText"),
    answers: document.getElementById("answers"),
    feedback: document.getElementById("feedback"),
    nextButton: document.getElementById("nextButton"),
    finalPercent: document.getElementById("finalPercent"),
    finalScore: document.getElementById("finalScore"),
    resultRing: document.getElementById("resultRing"),
    reviewCount: document.getElementById("reviewCount"),
    reviewList: document.getElementById("reviewList"),
    restartButton: document.getElementById("restartButton"),
  };

  const defaultState = () => ({
    screen: "start",
    settings: { amount: "5", difficulty: "easy", category: "" },
    questions: [],
    currentIndex: 0,
    score: 0,
    answers: [],
    remainingTime: QUESTION_TIME,
  });

  let state = loadState();
  let timerId = null;
  let categoriesLoaded = false;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return {
        ...defaultState(),
        ...parsed,
        settings: { ...defaultState().settings, ...(parsed.settings || {}) },
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        answers: Array.isArray(parsed.answers) ? parsed.answers : [],
      };
    } catch (error) {
      console.warn("Could not restore quiz state:", error);
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function showScreen(name) {
    els.startScreen.classList.toggle("hidden", name !== "start");
    els.loadingScreen.classList.toggle("hidden", name !== "loading");
    els.quizScreen.classList.toggle("hidden", name !== "quiz");
    els.resultScreen.classList.toggle("hidden", name !== "result");
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function normalizeQuestions(results) {
    return results.map((q) => ({
      ...q,
      options: shuffle([q.correct_answer, ...q.incorrect_answers]),
    }));
  }

  async function loadCategories() {
    try {
      const response = await fetch("/api/categories/");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      for (const category of data.trivia_categories || []) {
        const option = document.createElement("option");
        option.value = String(category.id);
        option.textContent = category.name;
        els.category.appendChild(option);
      }
      categoriesLoaded = true;
      applySettingsToForm();
    } catch (error) {
      console.error("Category loading failed:", error);
      els.startMessage.textContent = "Categories could not be loaded. You can still try all categories.";
    }
  }

  function applySettingsToForm() {
    els.amount.value = state.settings.amount;
    els.difficulty.value = state.settings.difficulty;
    if (categoriesLoaded || !state.settings.category) {
      els.category.value = state.settings.category;
    }
  }

  function readSettingsFromForm() {
    state.settings = {
      amount: els.amount.value,
      difficulty: els.difficulty.value,
      category: els.category.value,
    };
    saveState();
  }

  async function startQuiz(event) {
    event.preventDefault();
    stopTimer();
    readSettingsFromForm();
    els.startMessage.textContent = "";
    setStartLoading(true);
    showScreen("loading");

    const params = new URLSearchParams({
      amount: state.settings.amount,
      difficulty: state.settings.difficulty,
    });
    if (state.settings.category) params.set("category", state.settings.category);

    try {
      const response = await fetch(`/api/questions/?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];

      if (!results.length) {
        state.screen = "start";
        state.questions = [];
        state.answers = [];
        state.currentIndex = 0;
        state.score = 0;
        saveState();
        showScreen("start");
        els.startMessage.textContent = "No questions found for these settings. Please try another combination.";
        return;
      }

      state = {
        ...state,
        screen: "quiz",
        questions: normalizeQuestions(results),
        currentIndex: 0,
        score: 0,
        answers: [],
        remainingTime: QUESTION_TIME,
      };
      saveState();
      renderQuiz();
    } catch (error) {
      console.error("Question loading failed:", error);
      state.screen = "start";
      saveState();
      showScreen("start");
      els.startMessage.textContent = "Could not load questions. Make sure the Django server is running, then try again.";
    } finally {
      setStartLoading(false);
    }
  }

  function setStartLoading(isLoading) {
    els.startButton.disabled = isLoading;
    els.startButton.classList.toggle("is-loading", isLoading);
  }

  function renderQuiz() {
    if (!state.questions.length) {
      state.screen = "start";
      saveState();
      renderCurrentScreen();
      return;
    }

    if (state.currentIndex >= state.questions.length) {
      finishQuiz();
      return;
    }

    state.screen = "quiz";
    showScreen("quiz");

    const q = state.questions[state.currentIndex];
    const answer = state.answers[state.currentIndex];
    const current = state.currentIndex + 1;
    const total = state.questions.length;

    els.questionCounter.textContent = `Question ${current} of ${total}`;
    els.categoryLabel.textContent = `${q.category} • ${capitalize(q.difficulty)}`;
    els.scoreValue.textContent = String(state.score);
    els.progressBar.style.width = `${(current / total) * 100}%`;
    els.questionText.textContent = q.question;
    els.answers.innerHTML = "";
    els.feedback.textContent = "";
    els.feedback.className = "feedback";

    q.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-button";
      button.dataset.answer = option;

      const prefix = document.createElement("span");
      prefix.className = "answer-prefix";
      prefix.textContent = String.fromCharCode(65 + index);

      const label = document.createElement("span");
      label.textContent = option;

      button.append(prefix, label);
      button.addEventListener("click", () => selectAnswer(option));
      els.answers.appendChild(button);
    });

    if (answer) {
      stopTimer();
      revealAnswer(answer);
    } else {
      if (!Number.isFinite(state.remainingTime) || state.remainingTime <= 0 || state.remainingTime > QUESTION_TIME) {
        state.remainingTime = QUESTION_TIME;
      }
      els.nextButton.disabled = true;
      updateTimerUI();
      startTimer();
    }
  }

  function selectAnswer(selected) {
    if (state.answers[state.currentIndex]) return;
    stopTimer();

    const q = state.questions[state.currentIndex];
    const isCorrect = selected === q.correct_answer;
    if (isCorrect) state.score += 1;

    state.answers[state.currentIndex] = {
      selected,
      correct: q.correct_answer,
      isCorrect,
      timedOut: false,
    };
    saveState();
    revealAnswer(state.answers[state.currentIndex]);
  }

  function revealAnswer(answer) {
    const q = state.questions[state.currentIndex];
    const buttons = [...els.answers.querySelectorAll(".answer-button")];

    for (const button of buttons) {
      const value = button.dataset.answer;
      button.disabled = true;
      if (value === q.correct_answer) button.classList.add("correct");
      if (answer.selected && value === answer.selected && value !== q.correct_answer) {
        button.classList.add("incorrect");
      }
    }

    els.scoreValue.textContent = String(state.score);
    els.nextButton.disabled = false;
    els.nextButton.textContent = state.currentIndex === state.questions.length - 1 ? "See result" : "Next question";

    if (answer.timedOut) {
      els.feedback.textContent = `Time is up. Correct answer: ${q.correct_answer}`;
      els.feedback.className = "feedback error";
    } else if (answer.isCorrect) {
      els.feedback.textContent = "Correct! Nice work.";
      els.feedback.className = "feedback success";
    } else {
      els.feedback.textContent = `Not quite. Correct answer: ${q.correct_answer}`;
      els.feedback.className = "feedback error";
    }
  }

  function startTimer() {
    stopTimer();
    timerId = window.setInterval(() => {
      state.remainingTime -= 1;
      updateTimerUI();
      saveState();
      if (state.remainingTime <= 0) {
        handleTimeout();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function updateTimerUI() {
    const value = Math.max(0, state.remainingTime);
    els.timerValue.textContent = String(value);
    const stat = els.timerValue.closest(".timer-stat");
    stat?.classList.toggle("warning", value <= 5);
  }

  function handleTimeout() {
    if (state.answers[state.currentIndex]) return;
    stopTimer();
    const q = state.questions[state.currentIndex];
    state.remainingTime = 0;
    state.answers[state.currentIndex] = {
      selected: null,
      correct: q.correct_answer,
      isCorrect: false,
      timedOut: true,
    };
    saveState();
    revealAnswer(state.answers[state.currentIndex]);
  }

  function goNext() {
    if (!state.answers[state.currentIndex]) return;
    state.currentIndex += 1;
    state.remainingTime = QUESTION_TIME;
    saveState();
    if (state.currentIndex >= state.questions.length) {
      finishQuiz();
    } else {
      renderQuiz();
    }
  }

  function finishQuiz() {
    stopTimer();
    state.screen = "result";
    saveState();
    renderResult();
  }

  function renderResult() {
    showScreen("result");
    const total = state.questions.length;
    const percent = total ? Math.round((state.score / total) * 100) : 0;

    els.finalPercent.textContent = `${percent}%`;
    els.resultRing.style.setProperty("--percent", percent);
    els.finalScore.textContent = `You answered ${state.score} of ${total} questions correctly.`;
    els.reviewCount.textContent = `${state.score}/${total} correct`;
    els.reviewList.innerHTML = "";

    state.questions.forEach((q, index) => {
      const answer = state.answers[index] || {
        selected: null,
        correct: q.correct_answer,
        isCorrect: false,
        timedOut: true,
      };

      const item = document.createElement("li");
      item.className = "review-item";

      const question = document.createElement("p");
      question.className = "review-question";
      question.textContent = `${index + 1}. ${q.question}`;

      const userAnswer = document.createElement("p");
      userAnswer.className = "review-answer";
      const userStrong = document.createElement("strong");
      userStrong.textContent = "Your answer: ";
      userAnswer.append(userStrong, document.createTextNode(answer.selected || "No answer"));

      const correctAnswer = document.createElement("p");
      correctAnswer.className = "review-answer";
      const correctStrong = document.createElement("strong");
      correctStrong.textContent = "Correct answer: ";
      correctAnswer.append(correctStrong, document.createTextNode(q.correct_answer));

      const status = document.createElement("span");
      status.className = `review-status ${answer.isCorrect ? "correct" : "incorrect"}`;
      status.textContent = answer.isCorrect ? "Correct" : "Incorrect";

      item.append(question, userAnswer, correctAnswer, status);
      els.reviewList.appendChild(item);
    });
  }

  function restartQuiz() {
    stopTimer();
    const settings = { ...state.settings };
    state = defaultState();
    state.settings = settings;
    saveState();
    applySettingsToForm();
    els.startMessage.textContent = "";
    showScreen("start");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderCurrentScreen() {
    applySettingsToForm();
    if (state.screen === "quiz" && state.questions.length) {
      renderQuiz();
    } else if (state.screen === "result" && state.questions.length) {
      renderResult();
    } else {
      state.screen = "start";
      saveState();
      showScreen("start");
    }
  }

  function capitalize(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  els.settingsForm.addEventListener("submit", startQuiz);
  els.amount.addEventListener("change", readSettingsFromForm);
  els.difficulty.addEventListener("change", readSettingsFromForm);
  els.category.addEventListener("change", readSettingsFromForm);
  els.nextButton.addEventListener("click", goNext);
  els.restartButton.addEventListener("click", restartQuiz);
  window.addEventListener("beforeunload", saveState);

  loadCategories().finally(renderCurrentScreen);
})();

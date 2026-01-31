'use client';

import "./page.css";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UcatQuestion = {
  id: number;
  prompt: string;
  options: string[];
  correctIndex: number | null;
};

export default function Home() {
  const [verbalSelected, setVerbalSelected] = useState(false);
  const [quantSelected, setQuantSelected] = useState(false);
  const [decisionSelected, setDecisionSelected] = useState(false);
  const [situationalSelected, setSituationalSelected] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState("");
  const [practiceMode, setPracticeMode] = useState<"timed" | "untimed" | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<number | null>(null);
  const [customQuestions, setCustomQuestions] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [answerResults, setAnswerResults] = useState<Record<number, boolean | null>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [questions, setQuestions] = useState<UcatQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionLoadError, setQuestionLoadError] = useState<string | null>(null);

  const hasSectionSelected = useMemo(
    () => verbalSelected || quantSelected || decisionSelected || situationalSelected,
    [verbalSelected, quantSelected, decisionSelected, situationalSelected]
  );

  const customMinutesValue = Number(customMinutes);
  const hasValidCustom = Number.isFinite(customMinutesValue) && customMinutesValue > 0;
  const hasTimerSelected = selectedTimer !== null || hasValidCustom;

  const customQuestionsValue = Number(customQuestions);
  const hasValidCustomQuestions =
    Number.isFinite(customQuestionsValue) && customQuestionsValue > 0;
  const hasQuestionsSelected = selectedQuestions !== null || hasValidCustomQuestions;

  const requiresTimer = practiceMode === "timed";
  const canStart =
    hasSectionSelected &&
    hasQuestionsSelected &&
    (!requiresTimer || hasTimerSelected);

  const totalQuestions =
    selectedQuestions ?? (hasValidCustomQuestions ? customQuestionsValue : 0);
  const timerMinutes = selectedTimer ?? (hasValidCustom ? customMinutesValue : 0);

  const loadQuestions = async (limit: number, types: string[]) => {
    if (!limit) return [];
    const supabase = createClient();

    let countQuery = supabase.from("Ucat").select("id", { count: "exact", head: true });
    if (types.length) {
      countQuery = countQuery.in("type", types);
    }
    const { count, error: countError } = await countQuery;

    if (countError) throw countError;
    if (!count) return [];

    const safeLimit = Math.min(limit, count);
    const maxOffset = Math.max(0, count - safeLimit);
    const offset = maxOffset ? Math.floor(Math.random() * (maxOffset + 1)) : 0;

    let dataQuery = supabase
      .from("Ucat")
      .select("id, question, answer1, answer2, answer3, answer4, answer5, correct_answer")
      .order("id", { ascending: true })
      .range(offset, offset + safeLimit - 1);

    if (types.length) {
      dataQuery = dataQuery.in("type", types);
    }

    const { data, error } = await dataQuery;

    if (error) throw error;

    return (data ?? []).map((row, index) => {
      const options = [
        row.answer1,
        row.answer2,
        row.answer3,
        row.answer4,
        row.answer5,
      ]
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean);

      let correctIndex: number | null = null;
      if (typeof row.correct_answer === "number") {
        const normalized = Math.trunc(row.correct_answer);
        if (normalized >= 1 && normalized <= options.length) {
          correctIndex = normalized - 1;
        }
      }

      return {
        id: row.id ?? index + 1,
        prompt: row.question ?? "Untitled question",
        options,
        correctIndex,
      };
    });
  };

  const handleStart = async () => {
    if (!canStart) return;
    const selectedTypes = [
      verbalSelected ? "VR" : null,
      decisionSelected ? "DM" : null,
      quantSelected ? "QR" : null,
      situationalSelected ? "SJT" : null,
    ].filter(Boolean) as string[];
    setIsLoadingQuestions(true);
    setQuestionLoadError(null);
    try {
      const loaded = await loadQuestions(totalQuestions, selectedTypes);
      if (!loaded.length) {
        setQuestionLoadError("No questions found for the selected types.");
        setIsLoadingQuestions(false);
        return;
      }
      setQuestions(loaded);
      setHasStarted(true);
      setShowSummary(false);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setAnswerResults({});
      if (practiceMode === "timed") {
        setTimeRemaining(Math.max(1, Math.round(timerMinutes * 60)));
      } else {
        setTimeRemaining(null);
      }
    } catch (error) {
      setQuestionLoadError(
        error instanceof Error ? error.message : "Failed to load UCAT questions."
      );
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const summary = useMemo(() => {
    if (!questions.length) {
      return {
        correctCount: 0,
        results: [] as { id: number; isCorrect: boolean | null }[],
      };
    }
    const results = questions.map((question, index) => ({
      id: question.id,
      isCorrect:
        answerResults[index] ??
        (question.correctIndex === null
          ? null
          : selectedAnswers[index] === question.correctIndex),
    }));
    const correctCount = results.filter((result) => result.isCorrect).length;
    return { correctCount, results };
  }, [questions, selectedAnswers, answerResults]);

  useEffect(() => {
    if (!hasStarted || practiceMode !== "timed" || timeRemaining === null) return;
    if (timeRemaining <= 0) return;
    const intervalId = window.setInterval(() => {
      setTimeRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [hasStarted, practiceMode, timeRemaining]);

  const formatSeconds = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {!hasStarted && !showSummary ? (
        <div className="ucat-page">
          <h1 className="ucat-page-title">Select UCAT Sections to Practice</h1>
          <div className="ucat-sections-select">
            <button
              className={`sectionsSelect ${verbalSelected ? "selected" : ""}`}
              onClick={() => {
                setVerbalSelected(!verbalSelected);
              }}
            >
              Verbal Reasoning
            </button>
            <button
              className={`sectionsSelect ${quantSelected ? "selected" : ""}`}
              onClick={() => {
                setQuantSelected(!quantSelected);
              }}
            >
              Quantitative Reasoning
            </button>
            <button
              className={`sectionsSelect ${decisionSelected ? "selected" : ""}`}
              onClick={() => {
                setDecisionSelected(!decisionSelected);
              }}
            >
              Decision Making
            </button>
            <button
              className={`sectionsSelect ${situationalSelected ? "selected" : ""}`}
              onClick={() => {
                setSituationalSelected(!situationalSelected);
              }}
            >
              Situational Judgement
            </button>
          </div>

          <h2 className="ucat-page-title">Select Practice Mode</h2>
          <div className="practice-modes">
            <button
              className={`practice-mode-button ${practiceMode === "timed" ? "selected" : ""}`}
              onClick={() => {
                setPracticeMode("timed");
                setTimerOpen(true);
              }}
            >
              Timed Practice
            </button>
            <button
              className={`practice-mode-button ${practiceMode === "untimed" ? "selected" : ""}`}
              onClick={() => {
                setPracticeMode("untimed");
                setTimerOpen(false);
                setSelectedTimer(null);
                setCustomMinutes("");
              }}
            >
              Untimed Practice
            </button>
          </div>

          {timerOpen && (
            <div className="timer-settings">
              <p className="timer-settings-title">Timer Settings</p>
              <div className="timer-options">
                {[5, 10, 15, 20].map((minutes) => (
                  <button
                    key={minutes}
                    className={`timer-option ${selectedTimer === minutes ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedTimer(minutes);
                      setCustomMinutes("");
                    }}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
              <label className="timer-custom">
                Custom minutes
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customMinutes}
                  onChange={(event) => {
                    setCustomMinutes(event.target.value);
                    setSelectedTimer(null);
                  }}
                  placeholder="e.g. 12"
                />
              </label>
            </div>
          )}

          <h2 className="ucat-page-title">Select Number of Questions</h2>
          <div className="question-options">
            {[5, 10, 20, 30].map((count) => (
              <button
                key={count}
                className={`question-option ${selectedQuestions === count ? "selected" : ""}`}
                onClick={() => {
                  setSelectedQuestions(count);
                  setCustomQuestions("");
                }}
              >
                {count} questions
              </button>
            ))}
          </div>
          <label className="question-custom">
            Custom questions
            <input
              type="number"
              min="1"
              max="200"
              value={customQuestions}
              onChange={(event) => {
                setCustomQuestions(event.target.value);
                setSelectedQuestions(null);
              }}
              placeholder="e.g. 12"
            />
          </label>
          {!hasStarted && (
            <div className="start-inline">
              <button
                className="timer-start"
                disabled={!canStart || isLoadingQuestions}
                onClick={handleStart}
              >
                {isLoadingQuestions ? "Loading..." : "Start"}
              </button>
            </div>
          )}
          {questionLoadError && <p className="timer-settings-title">{questionLoadError}</p>}
        </div>
      ) : showSummary ? (
        <div className="ucat-page">
          <div className="summary-card">
            <h2 className="summary-title">Session Summary</h2>
            <p className="summary-score">
              {summary.correctCount} / {questions.length} correct
            </p>
            <div className="summary-list">
              {summary.results.map((result) => (
                <div
                  key={result.id}
                  className={`summary-item ${
                    result.isCorrect === null
                      ? ""
                      : result.isCorrect
                      ? "correct"
                      : "incorrect"
                  }`}
                >
                  Question {result.id}:{" "}
                  {result.isCorrect === null
                    ? "Unscored"
                    : result.isCorrect
                    ? "Correct"
                    : "Incorrect"}
                </div>
              ))}
            </div>
            <button
              className="quiz-next"
              onClick={() => {
                setShowSummary(false);
                setHasStarted(false);
                setCurrentQuestionIndex(0);
                setSelectedAnswers({});
                setAnswerResults({});
                setTimeRemaining(null);
              }}
            >
              Back to setup
            </button>
          </div>
        </div>
      ) : (
        <div className="ucat-page">
          <div className="quiz-header">
            <div className="quiz-progress">
              Question {currentQuestionIndex + 1} / {questions.length}
            </div>
            {practiceMode === "timed" && timeRemaining !== null && (
              <div className="quiz-timer">{formatSeconds(timeRemaining)}</div>
            )}
          </div>
          <div className="quiz-card">
            <p className="quiz-question">{questions[currentQuestionIndex]?.prompt}</p>
            <div className="quiz-options">
              {questions[currentQuestionIndex]?.options.map((option, optionIndex) => (
                <button
                  key={option}
                  className={`quiz-option ${selectedAnswers[currentQuestionIndex] === optionIndex ? "selected" : ""}`}
                  onClick={() =>
                    setSelectedAnswers((prev) => ({
                      ...prev,
                      [currentQuestionIndex]: optionIndex,
                    }))
                  }
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              className="quiz-next"
              disabled={selectedAnswers[currentQuestionIndex] === undefined}
              onClick={() => {
                const current = questions[currentQuestionIndex];
                const isCorrect =
                  current?.correctIndex === null
                    ? null
                    : selectedAnswers[currentQuestionIndex] === current?.correctIndex;
                setAnswerResults((prev) => ({
                  ...prev,
                  [currentQuestionIndex]: isCorrect,
                }));
                if (currentQuestionIndex + 1 >= questions.length) {
                  setShowSummary(true);
                  setHasStarted(false);
                  return;
                }
                setCurrentQuestionIndex((prev) => prev + 1);
              }}
            >
              {currentQuestionIndex + 1 >= questions.length ? "Finish" : "Next question"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

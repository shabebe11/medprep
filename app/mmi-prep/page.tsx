'use client';
import "./page.css";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MmiQuestion = {
    id: number;
    question: string | null;
    answer: string | null;
};

export default function Home() {
    const [answerRevealed, setAnswerRevealed] = useState(false);
    const [isPracticeMode, setIsPracticeMode] = useState(false);
    const [timerEnabled, setTimerEnabled] = useState(false);
    const [timerPhase, setTimerPhase] = useState<"prep" | "response">("prep");
    const [prepSeconds, setPrepSeconds] = useState(120);
    const [respSeconds, setRespSeconds] = useState(180);
    const [prepDuration, setPrepDuration] = useState(120);
    const [respDuration, setRespDuration] = useState(180);
    const [isPrepRunning, setIsPrepRunning] = useState(false);
    const [isRespRunning, setIsRespRunning] = useState(false);
    const [dailyQuestion, setDailyQuestion] = useState<MmiQuestion | null>(null);
    const [practiceQuestion, setPracticeQuestion] = useState<MmiQuestion | null>(null);
    const [isDailyLoading, setIsDailyLoading] = useState(false);
    const [isPracticeLoading, setIsPracticeLoading] = useState(false);
    const [dailyError, setDailyError] = useState<string | null>(null);
    const [practiceError, setPracticeError] = useState<string | null>(null);

    const getLocalDateString = (date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const getDayOfYear = (date = new Date()) => {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff =
            date.getTime() -
            start.getTime() +
            (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const fetchMmiQuestionByIndex = useCallback(async (index: number) => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from("MMI")
            .select("id, question, answer")
            .order("id", { ascending: true })
            .range(index, index)
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data ?? null;
    }, []);

    const fetchRandomMmiQuestion = useCallback(async () => {
        const supabase = createClient();
        const { count, error: countError } = await supabase
            .from("MMI")
            .select("id", { count: "exact", head: true });

        if (countError) throw countError;
        if (!count) return null;

        const randomIndex = Math.floor(Math.random() * count);
        return fetchMmiQuestionByIndex(randomIndex);
    }, [fetchMmiQuestionByIndex]);

    const fetchDailyQuestion = useCallback(async () => {
        setIsDailyLoading(true);
        setDailyError(null);
        try {
            const supabase = createClient();
            const { count, error: countError } = await supabase
                .from("MMI")
                .select("id", { count: "exact", head: true });

            if (countError) throw countError;
            if (!count) {
                setDailyQuestion(null);
                return;
            }

            const dayIndex = Math.max(0, getDayOfYear() - 1) % count;
            let data = await fetchMmiQuestionByIndex(dayIndex);
            if (!data) {
                data = await fetchRandomMmiQuestion();
            }
            setDailyQuestion(data);
        } catch (error) {
            setDailyError(error instanceof Error ? error.message : "Failed to load daily MMI question.");
        } finally {
            setIsDailyLoading(false);
        }
    }, [fetchMmiQuestionByIndex, fetchRandomMmiQuestion]);

    const fetchPracticeQuestion = useCallback(async () => {
        setIsPracticeLoading(true);
        setPracticeError(null);
        try {
            const data = await fetchRandomMmiQuestion();
            setPracticeQuestion(data);
        } catch (error) {
            setPracticeError(error instanceof Error ? error.message : "Failed to load practice MMI question.");
        } finally {
            setIsPracticeLoading(false);
        }
    }, [fetchRandomMmiQuestion]);

    const recordDailyReveal = () => {
        if (typeof window === "undefined") return;

        const STORAGE_KEYS = {
            lastDate: "mmiDailyLastReveal",
            streak: "mmiDailyStreak",
            best: "mmiDailyBestStreak",
            total: "mmiDailyTotal",
            history: "mmiDailyHistory",
        };

        const today = getLocalDateString();
        const lastDate = window.localStorage.getItem(STORAGE_KEYS.lastDate);
        const currentStreak = Number(window.localStorage.getItem(STORAGE_KEYS.streak) || 0);
        const currentTotal = Number(window.localStorage.getItem(STORAGE_KEYS.total) || 0);
        const currentBest = Number(window.localStorage.getItem(STORAGE_KEYS.best) || 0);
        const historyRaw = window.localStorage.getItem(STORAGE_KEYS.history);

        const [year, month, day] = today.split("-").map(Number);
        const todayDate = new Date(year, month - 1, day);
        const yesterdayDate = new Date(todayDate);
        yesterdayDate.setDate(todayDate.getDate() - 1);
        const yesterday = getLocalDateString(yesterdayDate);

        let nextStreak = currentStreak;
        if (lastDate !== today) {
            nextStreak = lastDate === yesterday ? currentStreak + 1 : 1;
        }

        let history: string[] = [];
        if (historyRaw) {
            try {
                const parsed = JSON.parse(historyRaw);
                if (Array.isArray(parsed)) {
                    history = parsed.filter((value) => typeof value === "string");
                }
            } catch {
                history = [];
            }
        }

        if (!history.includes(today)) {
            history.push(today);
        }

        const trimmedHistory = history.slice(-30);

        const nextBest = Math.max(currentBest, nextStreak);

        window.localStorage.setItem(STORAGE_KEYS.lastDate, today);
        window.localStorage.setItem(STORAGE_KEYS.streak, String(nextStreak));
        window.localStorage.setItem(STORAGE_KEYS.best, String(nextBest));
        window.localStorage.setItem(STORAGE_KEYS.total, String(currentTotal + 1));
        window.localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(trimmedHistory));
    };

    useEffect(() => {
        if (!isPrepRunning) return;
        const intervalId = window.setInterval(() => {
            setPrepSeconds((prev) => {
                if (prev <= 1) {
                    setIsPrepRunning(false);
                    setTimerPhase("response");
                    setRespSeconds(respDuration);
                    setIsRespRunning(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(intervalId);
    }, [isPrepRunning, respDuration]);

    useEffect(() => {
        if (!isRespRunning) return;
        const intervalId = window.setInterval(() => {
            setRespSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => window.clearInterval(intervalId);
    }, [isRespRunning]);

    useEffect(() => {
        fetchDailyQuestion();
    }, [fetchDailyQuestion]);

    useEffect(() => {
        if (isPracticeMode && !practiceQuestion && !isPracticeLoading) {
            fetchPracticeQuestion();
        }
    }, [isPracticeMode, practiceQuestion, isPracticeLoading, fetchPracticeQuestion]);

    const formatSeconds = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    if (isPracticeMode) {
        // Practice mode view
        return (
            <div className="PracticeMMI">
                <h1 className="PracticeText">Practice MMI Question</h1>
                <p className="PracticeSubText">
                    {/* retrieve random question from db */}
                    {isPracticeLoading
                        ? "Loading practice question..."
                        : practiceError
                        ? practiceError
                        : practiceQuestion?.question ?? "No practice question available yet."}
                </p>
                <div className="action-row">
                    <button
                        className="timer-button"
                        onClick={() => {
                            setTimerEnabled((prev) => !prev);
                    setTimerPhase("prep");
                    setPrepSeconds(prepDuration);
                    setRespSeconds(respDuration);
                    setIsPrepRunning(false);
                    setIsRespRunning(false);
                }}
            >
                        {timerEnabled ? "Disable timer" : "Enable timer"}
                    </button>
                    <button className="reveal-button" onClick={() => setAnswerRevealed(!answerRevealed)}>
                        {answerRevealed ? 'Hide Answer' : 'Reveal Answer'}
                    </button>
                    <button
                        className="generate-button"
                        onClick={() => {
                            setAnswerRevealed(false);
                            fetchPracticeQuestion();
                        }}
                    >
                        Generate new question
                    </button>
                </div>
                {timerEnabled && (
                    <div className="timer-panel">
                        <div className="timer-select">
                            <label className="timer-select-item">
                                Prep time
                                <select
                                    value={prepDuration}
                                    onChange={(event) => {
                                        const value = Number(event.target.value);
                                        setPrepDuration(value);
                                        setPrepSeconds(value);
                                        setIsPrepRunning(false);
                                        setTimerPhase("prep");
                                    }}
                                >
                                    <option value={60}>1 min</option>
                                    <option value={120}>2 min</option>
                                    <option value={180}>3 min</option>
                                    <option value={240}>4 min</option>
                                </select>
                            </label>
                            <label className="timer-select-item">
                                Response time
                                <select
                                    value={respDuration}
                                    onChange={(event) => {
                                        const value = Number(event.target.value);
                                        setRespDuration(value);
                                        setRespSeconds(value);
                                        setIsRespRunning(false);
                                        setTimerPhase("response");
                                    }}
                                >
                                    <option value={120}>2 min</option>
                                    <option value={180}>3 min</option>
                                    <option value={240}>4 min</option>
                                    <option value={300}>5 min</option>
                                </select>
                            </label>
                        </div>
                        {timerPhase === "prep" ? (
                            <>
                                <p className="timer-label">Prep Timer</p>
                                <div className="timer-readout">{formatSeconds(prepSeconds)}</div>
                                <div className="timer-controls">
                                    <button
                                        className="timer-start"
                                        onClick={() => setIsPrepRunning(true)}
                                        disabled={isPrepRunning || prepSeconds === 0}
                                    >
                                        {isPrepRunning ? "Running..." : "Start"}
                                    </button>
                                    <button
                                        className="timer-finish"
                                        onClick={() => {
                                            setIsPrepRunning(false);
                                            setPrepSeconds(0);
                                            setTimerPhase("response");
                                            setRespSeconds(respDuration);
                                            setIsRespRunning(false);
                                        }}
                                        disabled={prepSeconds === 0}
                                    >
                                        Finish
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="timer-label">Response Timer</p>
                                <div className="timer-readout">{formatSeconds(respSeconds)}</div>
                                <div className="timer-controls">
                                    <button
                                        className="timer-start"
                                        onClick={() => setIsRespRunning(true)}
                                        disabled={isRespRunning || respSeconds === 0}
                                    >
                                        Start
                                    </button>
                                    <button
                                        className="timer-stop"
                                        onClick={() => setIsRespRunning(false)}
                                        disabled={!isRespRunning}
                                    >
                                        Stop
                                    </button>
                                    <button
                                        className="timer-finish"
                                        onClick={() => {
                                            setIsRespRunning(false);
                                            setRespSeconds(0);
                                        }}
                                        disabled={respSeconds === 0}
                                    >
                                        Finish
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
                {answerRevealed && (
                    <p className="AnswerText">
                      {/* Get answer from db */}
                        {practiceQuestion?.answer ?? "No answer available."}
                    </p>
                )}
                <button className="back-button" onClick={() => setIsPracticeMode(false)}>
                    Back to Daily Question
                </button>
            </div>
        );
    }

    // Daily question view
    return(
        <div className="DailyMMI">
            <h1 className="DailyText">Daily MMI Question</h1>
            <p className="DailySubText">
                {/* retrieve random day number question from db */}
                {isDailyLoading
                    ? "Loading daily MMI question..."
                    : dailyError
                    ? dailyError
                    : dailyQuestion?.question ?? "No daily question available yet."}
            </p>
            <div className="action-row">
                <button
                    className="reveal-button"
                    onClick={() => {
                        const next = !answerRevealed;
                        setAnswerRevealed(next);
                        if (next) {
                            recordDailyReveal();
                        }
                    }}
                >
                    {answerRevealed ? 'Hide Answer' : 'Reveal Answer'}
                </button>
                <button
                    className="generate-button"
                    onClick={() => {
                        setIsPracticeMode(true);
                        setAnswerRevealed(false);
                    }}
                >
                    Generate question
                </button>
            </div>
            {answerRevealed && (
                <p className="DailyAnswerText">
                    {/* retrieve answer from db */}
                    {dailyQuestion?.answer ?? "No answer available."}
                </p>
            )}
        </div>
    )
}

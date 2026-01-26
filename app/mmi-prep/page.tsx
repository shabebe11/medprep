'use client';
import "./page.css";
import { useEffect, useState } from "react";

export default function Home() {
    const [answerRevealed, setAnswerRevealed] = useState(false);
    const [isPracticeMode, setIsPracticeMode] = useState(false);
    const [timerEnabled, setTimerEnabled] = useState(false);
    const [timerPhase, setTimerPhase] = useState<"prep" | "response">("prep");
    const [prepSeconds, setPrepSeconds] = useState(120);
    const [respSeconds, setRespSeconds] = useState(180);
    const [isPrepRunning, setIsPrepRunning] = useState(false);
    const [isRespRunning, setIsRespRunning] = useState(false);

    useEffect(() => {
        if (!isPrepRunning) return;
        const intervalId = window.setInterval(() => {
            setPrepSeconds((prev) => {
                if (prev <= 1) {
                    setIsPrepRunning(false);
                    setTimerPhase("response");
                    setRespSeconds(180);
                    setIsRespRunning(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(intervalId);
    }, [isPrepRunning]);

    useEffect(() => {
        if (!isRespRunning) return;
        const intervalId = window.setInterval(() => {
            setRespSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => window.clearInterval(intervalId);
    }, [isRespRunning]);

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
                    Practice MMI question here
                </p>
                <div className="action-row">
                    <button
                        className="timer-button"
                        onClick={() => {
                            setTimerEnabled((prev) => !prev);
                            setTimerPhase("prep");
                            setPrepSeconds(120);
                            setRespSeconds(180);
                            setIsPrepRunning(false);
                            setIsRespRunning(false);
                        }}
                    >
                        {timerEnabled ? "Disable timer" : "Enable timer"}
                    </button>
                    <button className="reveal-button" onClick={() => setAnswerRevealed(!answerRevealed)}>
                        {answerRevealed ? 'Hide Answer' : 'Reveal Answer'}
                    </button>
                    <button className="generate-button" onClick={() => setIsPracticeMode(true)}>
                        Generate new question
                    </button>
                </div>
                {timerEnabled && (
                    <div className="timer-panel">
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
                                            setRespSeconds(180);
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
                        Practice MMI answer here
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
                MMI question here
            </p>
            <div className="action-row">
                <button className="reveal-button" onClick={() => setAnswerRevealed(!answerRevealed)}>
                    {answerRevealed ? 'Hide Answer' : 'Reveal Answer'}
                </button>
                <button className="generate-button" onClick={() => setIsPracticeMode(true)}>
                    Generate question
                </button>
            </div>
            {answerRevealed && (
                <p className="DailyAnswerText">
                    {/* retrieve answer from db */}
                    MMI answer here
                </p>
            )}
        </div>
    )
}

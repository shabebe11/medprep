'use client';

import "./page.css";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "mmi" | "ucat";

export default function SubmitQuestionsPage() {
  const [mode, setMode] = useState<Mode>("mmi");

  const [mmiQuestion, setMmiQuestion] = useState("");
  const [mmiAnswer, setMmiAnswer] = useState("");

  const [ucatQuestion, setUcatQuestion] = useState("");
  const [ucatAnswers, setUcatAnswers] = useState<string[]>(["", "", "", "", ""]);
  const [ucatCorrect, setUcatCorrect] = useState("");
  const [ucatType, setUcatType] = useState("");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetMessage = () => setMessage(null);

  const handleMmiSubmit = async () => {
    resetMessage();
    if (!mmiQuestion.trim() || !mmiAnswer.trim()) {
      setMessage({ type: "error", text: "Add both a question and model answer." });
      return;
    }

    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("MMI").insert({
      question: mmiQuestion.trim(),
      answer: mmiAnswer.trim(),
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "MMI question submitted." });
      setMmiQuestion("");
      setMmiAnswer("");
    }
    setIsSaving(false);
  };

  const handleUcatSubmit = async () => {
    resetMessage();
    if (!ucatQuestion.trim()) {
      setMessage({ type: "error", text: "Add the UCAT question." });
      return;
    }
    const cleaned = ucatAnswers.map((value) => value.trim()).filter(Boolean);
    if (cleaned.length < 2) {
      setMessage({ type: "error", text: "Add at least two answer options." });
      return;
    }
    const correctNumber = Number(ucatCorrect);
    if (!Number.isFinite(correctNumber) || correctNumber < 1 || correctNumber > cleaned.length) {
      setMessage({
        type: "error",
        text: "Correct answer must be a number within the options provided.",
      });
      return;
    }
    if (!ucatType.trim()) {
      setMessage({ type: "error", text: "Select the UCAT type." });
      return;
    }

    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("Ucat").insert({
      question: ucatQuestion.trim(),
      answer1: ucatAnswers[0]?.trim() || null,
      answer2: ucatAnswers[1]?.trim() || null,
      answer3: ucatAnswers[2]?.trim() || null,
      answer4: ucatAnswers[3]?.trim() || null,
      answer5: ucatAnswers[4]?.trim() || null,
      correct_answer: correctNumber,
      type: ucatType.trim(),
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "UCAT question submitted." });
      setUcatQuestion("");
      setUcatAnswers(["", "", "", "", ""]);
      setUcatCorrect("");
      setUcatType("");
    }
    setIsSaving(false);
  };

  return (
    <div className="submit-page">
      <div className="submit-shell">
        <header className="submit-header">
          <p className="submit-title">Submit a Question</p>
          <p className="submit-subtitle">
            Contribute new UCAT or MMI questions. Make sure the question text is
            clear and accurate.
          </p>
          <div className="submit-toggle">
            <button
              className={mode === "mmi" ? "active" : ""}
              onClick={() => setMode("mmi")}
            >
              MMI
            </button>
            <button
              className={mode === "ucat" ? "active" : ""}
              onClick={() => setMode("ucat")}
            >
              UCAT
            </button>
          </div>
        </header>

        {message && (
          <div className={`submit-message ${message.type}`}>{message.text}</div>
        )}

        {mode === "mmi" ? (
          <section className="submit-card">
            <h2>MMI Submission</h2>
            <div className="submit-form">
              <label>
                Question
                <textarea
                  value={mmiQuestion}
                  onChange={(event) => setMmiQuestion(event.target.value)}
                  placeholder="Describe a time you had to deliver difficult feedback..."
                />
              </label>
              <label>
                Model answer
                <textarea
                  value={mmiAnswer}
                  onChange={(event) => setMmiAnswer(event.target.value)}
                  placeholder="Start with context, then show your reasoning..."
                />
              </label>
              <div className="submit-actions">
                <button
                  className="submit-button"
                  onClick={handleMmiSubmit}
                  disabled={isSaving}
                >
                  {isSaving ? "Submitting..." : "Submit MMI"}
                </button>
                <button
                  className="submit-button secondary"
                  type="button"
                  onClick={() => {
                    setMmiQuestion("");
                    setMmiAnswer("");
                    resetMessage();
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="submit-card">
            <h2>UCAT Submission</h2>
            <div className="submit-form">
              <label>
                Question
                <textarea
                  value={ucatQuestion}
                  onChange={(event) => setUcatQuestion(event.target.value)}
                  placeholder="Which statement best supports the conclusion?"
                />
              </label>
              <label>
                Question type
                <select value={ucatType} onChange={(event) => setUcatType(event.target.value)}>
                  <option value="">Select type</option>
                  <option value="VR">Verbal Reasoning (VR)</option>
                  <option value="DM">Decision Making (DM)</option>
                  <option value="QR">Quantitative Reasoning (QR)</option>
                  <option value="SJT">Situational Judgement (SJT)</option>
                </select>
              </label>
              {ucatAnswers.map((value, index) => (
                <label key={`ucat-answer-${index}`}>
                  Answer {index + 1}
                  {index === 4 ? " (optional)" : ""}
                  <input
                    value={value}
                    onChange={(event) => {
                      const next = [...ucatAnswers];
                      next[index] = event.target.value;
                      setUcatAnswers(next);
                    }}
                    placeholder={`Option ${index + 1}`}
                  />
                </label>
              ))}
              <label>
                Correct answer index (1-5)
                <input
                  value={ucatCorrect}
                  onChange={(event) => setUcatCorrect(event.target.value)}
                  type="number"
                  min="1"
                  max="5"
                  placeholder="e.g. 2"
                />
              </label>
              <div className="submit-actions">
                <button
                  className="submit-button"
                  onClick={handleUcatSubmit}
                  disabled={isSaving}
                >
                  {isSaving ? "Submitting..." : "Submit UCAT"}
                </button>
                <button
                  className="submit-button secondary"
                  type="button"
                  onClick={() => {
                    setUcatQuestion("");
                    setUcatAnswers(["", "", "", "", ""]);
                    setUcatCorrect("");
                    setUcatType("");
                    resetMessage();
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

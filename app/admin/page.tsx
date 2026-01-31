'use client';

import "./page.css";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const REQUIRED_UCAT_HEADERS = [
  "question",
  "answer1",
  "answer2",
  "answer3",
  "answer4",
  "answer5",
  "correct_answer",
  "type",
];

const REQUIRED_MMI_HEADERS = ["question", "answer"];

type UploadType = "ucat" | "mmi";

type UploadRow = Record<string, string>;

// Normalize CSV headers for matching.
const normalizeHeader = (value: string) => value.trim().toLowerCase();

// Minimal CSV parser supporting quoted fields.
const parseCsv = (content: string) => {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  const pushCell = () => {
    row.push(current.trim());
    current = "";
  };

  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (char === '"') {
      const nextChar = content[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      pushCell();
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && content[i + 1] === "\n") {
        i += 1;
      }
      pushCell();
      pushRow();
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    pushCell();
    pushRow();
  }

  return rows.filter((cells) => cells.some((cell) => cell.length > 0));
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<UploadType>("mmi");

  const [mmiQuestion, setMmiQuestion] = useState("");
  const [mmiAnswer, setMmiAnswer] = useState("");
  const [ucatQuestion, setUcatQuestion] = useState("");
  const [ucatAnswers, setUcatAnswers] = useState<string[]>(["", "", "", "", ""]);
  const [ucatCorrect, setUcatCorrect] = useState("");
  const [ucatType, setUcatType] = useState("");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<UploadRow[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const resetMessages = () => {
    setMessage(null);
    setUploadError(null);
  };

  // Insert a single MMI question.
  const handleMmiSubmit = async () => {
    resetMessages();
    if (!mmiQuestion.trim() || !mmiAnswer.trim()) {
      setMessage({ type: "error", text: "Add both a question and answer." });
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
      setMessage({ type: "success", text: "MMI question added." });
      setMmiQuestion("");
      setMmiAnswer("");
    }
    setIsSaving(false);
  };

  // Insert a single UCAT question.
  const handleUcatSubmit = async () => {
    resetMessages();
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
      setMessage({ type: "error", text: "Select a question type." });
      return;
    }

    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("Ucat").insert({
      question: ucatQuestion.trim(),
      "answer 1": ucatAnswers[0]?.trim() || null,
      "answer 2": ucatAnswers[1]?.trim() || null,
      "answer 3": ucatAnswers[2]?.trim() || null,
      "answer 4": ucatAnswers[3]?.trim() || null,
      "answer 5": ucatAnswers[4]?.trim() || null,
      correct_answer: correctNumber,
      type: ucatType.trim(),
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "UCAT question added." });
      setUcatQuestion("");
      setUcatAnswers(["", "", "", "", ""]);
      setUcatCorrect("");
      setUcatType("");
    }
    setIsSaving(false);
  };

  // Parse CSV and bulk insert rows.
  const handleCsvUpload = async (file: File, type: UploadType) => {
    resetMessages();
    setUploadPreview([]);
    const text = await file.text();
    const rows = parseCsv(text);

    if (!rows.length) {
      setUploadError("CSV file is empty.");
      return;
    }

    const [headerRow, ...bodyRows] = rows;
    const headers = headerRow.map(normalizeHeader);
    const required = type === "mmi" ? REQUIRED_MMI_HEADERS : REQUIRED_UCAT_HEADERS;
    const missing = required.filter((header) => !headers.includes(header));

    if (missing.length) {
      setUploadError(`Missing headers: ${missing.join(", ")}`);
      return;
    }

    const mappedRows: UploadRow[] = bodyRows
      .map((cells) => {
        const row: UploadRow = {};
        headers.forEach((header, index) => {
          row[header] = cells[index] ?? "";
        });
        return row;
      })
      .filter((row) => Object.values(row).some((value) => value.trim().length));

    if (!mappedRows.length) {
      setUploadError("No data rows found.");
      return;
    }

    setUploadPreview(mappedRows.slice(0, 4));
    setIsSaving(true);

    try {
      const supabase = createClient();
      if (type === "mmi") {
        const payload = mappedRows.map((row) => ({
          question: row.question?.trim(),
          answer: row.answer?.trim(),
        }));
        const { error } = await supabase.from("MMI").insert(payload);
        if (error) throw error;
        setMessage({ type: "success", text: `Uploaded ${payload.length} MMI questions.` });
      } else {
        const payload = mappedRows.map((row) => ({
          question: row.question?.trim(),
          "answer 1": row.answer1?.trim() || null,
          "answer 2": row.answer2?.trim() || null,
          "answer 3": row.answer3?.trim() || null,
          "answer 4": row.answer4?.trim() || null,
          "answer 5": row.answer5?.trim() || null,
          correct_answer: Number(row.correct_answer) || null,
          type: row.type?.trim() || null,
        }));
        const { error } = await supabase.from("Ucat").insert(payload);
        if (error) throw error;
        setMessage({ type: "success", text: `Uploaded ${payload.length} UCAT questions.` });
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <p className="admin-title">Question Upload Studio</p>
          <p className="admin-subtitle">
            Add individual MMI or UCAT questions, or upload a CSV to bulk insert.
          </p>
        </header>

        {message && (
          <div className={`admin-message ${message.type}`}>{message.text}</div>
        )}
        {uploadError && <div className="admin-message error">{uploadError}</div>}

        <div className="admin-grid">
          <div className="admin-card">
            <h2>Single MMI Question</h2>
            <p>Insert one MMI prompt and model answer.</p>
            <div className="admin-form">
              <label>
                Question
                <textarea
                  value={mmiQuestion}
                  onChange={(event) => setMmiQuestion(event.target.value)}
                  placeholder="Describe a time you had to manage conflict..."
                />
              </label>
              <label>
                Answer
                <textarea
                  value={mmiAnswer}
                  onChange={(event) => setMmiAnswer(event.target.value)}
                  placeholder="Structure your response with..."
                />
              </label>
              <div className="admin-actions">
                <button
                  className="admin-button"
                  onClick={handleMmiSubmit}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save MMI"}
                </button>
                <button
                  className="admin-button secondary"
                  type="button"
                  onClick={() => {
                    setMmiQuestion("");
                    setMmiAnswer("");
                    resetMessages();
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h2>Single UCAT Question</h2>
            <p>Insert a UCAT question with five options.</p>
            <div className="admin-form">
              <label>
                Question
                <textarea
                  value={ucatQuestion}
                  onChange={(event) => setUcatQuestion(event.target.value)}
                  placeholder="Which data set best supports the conclusion..."
                />
              </label>
              {ucatAnswers.map((value, index) => (
                <label key={`ucat-answer-${index}`}>
                  Answer {index + 1}
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
                  placeholder="e.g. 3"
                />
              </label>
              <label>
                Question type
                <select value={ucatType} onChange={(event) => setUcatType(event.target.value)}>
                  <option value="">Select type</option>
                  <option value="VR">VR</option>
                  <option value="DM">DM</option>
                  <option value="QR">QR</option>
                  <option value="SJT">SJT</option>
                </select>
              </label>
              <div className="admin-actions">
                <button
                  className="admin-button"
                  onClick={handleUcatSubmit}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save UCAT"}
                </button>
                <button
                  className="admin-button secondary"
                  type="button"
                  onClick={() => {
                    setUcatQuestion("");
                    setUcatAnswers(["", "", "", "", ""]);
                    setUcatCorrect("");
                    setUcatType("");
                    resetMessages();
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h2>Bulk CSV Upload</h2>
            <p>Upload MMI or UCAT CSV files to insert multiple questions.</p>
            <div className="admin-upload">
              <label>
                Upload type
                <select
                  value={activeTab}
                  onChange={(event) => setActiveTab(event.target.value as UploadType)}
                >
                  <option value="mmi">MMI</option>
                  <option value="ucat">UCAT</option>
                </select>
              </label>
              <label>
                CSV file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      handleCsvUpload(file, activeTab);
                      event.target.value = "";
                    }
                  }}
                />
              </label>
              <p className="admin-help">
                Required headers for {activeTab.toUpperCase()}: {" "}
                {activeTab === "mmi"
                  ? REQUIRED_MMI_HEADERS.join(", ")
                  : REQUIRED_UCAT_HEADERS.join(", ")}
              </p>
              {uploadPreview.length > 0 && (
                <div>
                  <p className="admin-help">Preview (first rows):</p>
                  <pre>{JSON.stringify(uploadPreview, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

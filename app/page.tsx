"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import "./home.css";

const STORAGE_KEYS = {
  lastDate: "mmiDailyLastReveal",
  streak: "mmiDailyStreak",
  best: "mmiDailyBestStreak",
  total: "mmiDailyTotal",
  history: "mmiDailyHistory",
};

type DailyStats = {
  lastDate: string | null;
  streak: number;
  best: number;
  total: number;
  history: string[];
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const readStats = (): DailyStats => {
  if (typeof window === "undefined") {
    return { lastDate: null, streak: 0, best: 0, total: 0, history: [] };
  }

  const lastDate = window.localStorage.getItem(STORAGE_KEYS.lastDate);
  const streak = Number(window.localStorage.getItem(STORAGE_KEYS.streak) || 0);
  const best = Number(window.localStorage.getItem(STORAGE_KEYS.best) || 0);
  const total = Number(window.localStorage.getItem(STORAGE_KEYS.total) || 0);

  let history: string[] = [];
  const historyRaw = window.localStorage.getItem(STORAGE_KEYS.history);
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

  return { lastDate, streak, best, total, history };
};

const buildLastDays = (totalDays: number, today: string) => {
  const [year, month, day] = today.split("-").map(Number);
  const todayDate = new Date(year, month - 1, day);
  const days = [] as { date: string; label: string }[];

  for (let index = totalDays - 1; index >= 0; index -= 1) {
    const date = new Date(todayDate);
    date.setDate(todayDate.getDate() - index);
    const dateString = getLocalDateString(date);
    const label = date.toLocaleDateString("en-US", { weekday: "short" });
    days.push({ date: dateString, label });
  }

  return days;
};

export default function Home() {
  const [stats, setStats] = useState<DailyStats>({
    lastDate: null,
    streak: 0,
    best: 0,
    total: 0,
    history: [],
  });

  useEffect(() => {
    const refresh = () => setStats(readStats());
    refresh();

    window.addEventListener("focus", refresh);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const todayString = useMemo(() => getLocalDateString(), []);
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [],
  );
  const lastSeven = useMemo(() => buildLastDays(7, todayString), [todayString]);

  const streakProgress = Math.min((stats.streak / 30) * 100, 100);
  const historySet = useMemo(() => new Set(stats.history), [stats.history]);
  const isUpToDate = stats.lastDate === todayString;
  const isBestStreak = stats.streak > 0 && stats.streak === stats.best;

  const motivationalLine = isUpToDate
    ? "You already checked in today. Keep the momentum rolling."
    : "Reveal today’s question to keep your streak alive.";

  return (
    <div className="home-page">
      <main className="home-shell">
        <section className="home-hero">
          <div className="hero-copy">
            <span className="hero-chip">Daily MMI Studio</span>
            <h1 className="hero-title">Train every day. Track every reveal.</h1>
            <p className="hero-subtitle">
              Build a consistent prep rhythm with daily questions, quick practice
              sessions, and focused timers. Your streak lives here.
            </p>
            <div className="hero-actions">
              <Link className="cta-button primary" href="/mmi-prep">
                Go to daily question
              </Link>
              <Link className="cta-button ghost" href="/ucat-prep">
                Jump to UCAT prep
              </Link>
            </div>
            <div className="hero-meta">
              <div>
                <p className="meta-label">Today</p>
                <p className="meta-value">{todayLabel}</p>
              </div>
              <div>
                <p className="meta-label">Status</p>
                <p className={`meta-value ${isUpToDate ? "good" : "warn"}`}>
                  {isUpToDate ? "Checked in" : "Not revealed yet"}
                </p>
              </div>
            </div>
          </div>
          <div className="hero-panel">
            <div className="streak-card">
              <div
                className="streak-ring"
                style={{
                  "--streak-progress": `${streakProgress}%`,
                } as CSSProperties}
              >
                {isBestStreak && <span className="streak-badge">Peak</span>}
                <span className="streak-count">{stats.streak}</span>
                <span className="streak-label">day streak</span>
              </div>
              <div className="streak-details">
                <p className="streak-title">Daily reveal tracker</p>
                <p className="streak-subtitle">{motivationalLine}</p>
                <div className="streak-stats">
                  <div>
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">total reveals</span>
                  </div>
                  <div>
                    <span className="stat-value">{stats.best}</span>
                    <span className="stat-label">best streak</span>
                  </div>
                  <div>
                    <span className="stat-value">{stats.lastDate ?? "—"}</span>
                    <span className="stat-label">last reveal</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mini-calendar">
              {lastSeven.map((day) => (
                <div
                  key={day.date}
                  className={`mini-day ${historySet.has(day.date) ? "done" : ""}`}
                >
                  <span className="mini-label">{day.label}</span>
                  <span className="mini-dot" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="home-grid">
          <div className="card focus-card">
            <h2>Focus for today</h2>
            <p>
              Try a 4 minute prep + 6 minute response. Aim for structure: opening
              stance, two key points, and a balanced close.
            </p>
            <Link className="cta-button subtle" href="/mmi-prep">
              Start a timed session
            </Link>
          </div>

          <div className="card quick-actions">
            <h2>Quick actions</h2>
            <div className="action-list">
              <Link className="action-link" href="/mmi-prep">
                Reveal today’s MMI question
              </Link>
              <Link className="action-link" href="/mmi-prep">
                Generate a practice prompt
              </Link>
              <Link className="action-link" href="/ucat-prep">
                Run a UCAT quiz set
              </Link>
            </div>
          </div>

          <div className="card ritual-card">
            <h2>Weekly rhythm</h2>
            <ul>
              <li>Mon/Wed/Fri: ethical dilemma questions</li>
              <li>Tue/Thu: teamwork + leadership prompts</li>
              <li>Weekend: full timing drills and reflection</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────
type Screen = "upload" | "plan" | "question" | "feedback" | "complete";

type Step = {
  id: string;
  phase?: "memorize" | "confirm" | "apply" | "master";
  title: string;
  goal: string;
  input_example: string;
  tasks: string[];
};

type StudyPlan = {
  title: string;
  steps: Step[];
};

type Question = {
  id: string;
  japanese: string;
  hint: string;
  context: string;
  difficulty: "easy" | "medium" | "hard";
};

type Feedback = {
  score: "correct" | "partial" | "incorrect";
  retry: boolean;
  good_points: string[];
  corrections: string[];
  improved_example: string;
  brief_explanation: string;
};

type GameState = {
  streak: number;
  xp: number;
  level: number;
  dailyCount: number;
  lastDate: string;
};

// ─── Constants ───────────────────────────────────────────
const PRIMARY = "#4F46E5";
const PRIMARY_LIGHT = "#EEF2FF";
const SUCCESS = "#16A34A";
const WARNING = "#D97706";
const DANGER = "#DC2626";
const XP_PER_LEVEL = 100;
const DAILY_GOAL = 3;
const QUESTIONS_PER_STEP = 3;

// ─── Gamification helpers ────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadGame(): GameState {
  try {
    const raw = localStorage.getItem("el_game");
    if (raw) {
      const g = JSON.parse(raw) as GameState;
      // reset daily count if new day
      if (g.lastDate !== todayStr()) {
        g.dailyCount = 0;
        g.lastDate = todayStr();
      }
      return g;
    }
  } catch {}
  return { streak: 0, xp: 0, level: 1, dailyCount: 0, lastDate: todayStr() };
}

function saveGame(g: GameState) {
  try {
    localStorage.setItem("el_game", JSON.stringify(g));
  } catch {}
}

// ── Study progress helpers ────────────────────────────────
type StudyProgress = { plan: StudyPlan; stepIndex: number };

function loadStudy(): StudyProgress | null {
  try {
    const raw = localStorage.getItem("el_study");
    if (raw) return JSON.parse(raw) as StudyProgress;
  } catch {}
  return null;
}

function saveStudy(plan: StudyPlan, stepIndex: number) {
  try {
    localStorage.setItem("el_study", JSON.stringify({ plan, stepIndex }));
  } catch {}
}

function clearStudy() {
  try { localStorage.removeItem("el_study"); } catch {}
}

function calcLevel(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function xpForScore(score: "correct" | "partial" | "incorrect") {
  return score === "correct" ? 10 : score === "partial" ? 5 : 1;
}

function updateStreakAndDaily(g: GameState): GameState {
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let streak = g.streak;
  if (g.lastDate === today) {
    // already studied today, no change to streak
  } else if (g.lastDate === yesterday) {
    streak += 1;
  } else if (g.lastDate !== today) {
    streak = 1;
  }
  const dailyCount = g.lastDate === today ? g.dailyCount + 1 : 1;
  return { ...g, streak, dailyCount, lastDate: today };
}

// ─── Speech Recognition types ────────────────────────────
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
  }
}

// ─── Icon helpers ─────────────────────────────────────────
function MicIcon({ recording }: { recording: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={recording ? DANGER : "white"}>
      <path d="M12 14c1.66 0 3-1.34 3-3V5a3 3 0 00-6 0v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11a5 5 0 01-10 0H5a7 7 0 0012 6.08V20h2v-2.92A7 7 0 0019 11h-2z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
      <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
      <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>;
}

function PhaseBadge({ phase }: { phase?: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    memorize: { bg: "#EEF2FF", text: PRIMARY,  label: "覚える" },
    confirm:  { bg: "#F0F9FF", text: "#0369A1", label: "確認する" },
    apply:    { bg: "#FEF3C7", text: WARNING,   label: "使う" },
    master:   { bg: "#FEE2E2", text: DANGER,    label: "定着する" },
  };
  const s = map[phase ?? "memorize"];
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

function DifficultyBadge({ d }: { d: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    easy:   { bg: "#dcfce7", text: SUCCESS,  label: "Easy" },
    medium: { bg: "#fef3c7", text: WARNING,  label: "Medium" },
    hard:   { bg: "#fee2e2", text: DANGER,   label: "Hard" },
  };
  const s = map[d] ?? map.easy;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────
export default function EnglishApp() {
  const [screen, setScreen] = useState<Screen>("upload");
  const [wordText, setWordText] = useState("");
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [game, setGame] = useState<GameState>({ streak: 0, xp: 0, level: 1, dailyCount: 0, lastDate: todayStr() });
  const [isRecording, setIsRecording] = useState(false);
  const [xpAnim, setXpAnim] = useState(0);
  const [showXpPop, setShowXpPop] = useState(false);
  const [hasSpeech, setHasSpeech] = useState(false);
  const [activePhase, setActivePhase] = useState<string | undefined>(undefined);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load game + study progress from localStorage on mount
  useEffect(() => {
    setGame(loadGame());
    setHasSpeech(typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window));
    const saved = loadStudy();
    if (saved) {
      setStudyPlan(saved.plan);
      setCurrentStepIndex(saved.stepIndex);
      setScreen("plan");
    }
  }, []);

  // ── API helpers ───────────────────────────────────────
  async function callApi(body: Record<string, unknown>) {
    const res = await fetch("/api/english", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as { error?: string }).error ?? "API error");
    return data;
  }

  // ── File upload handler ───────────────────────────────
  async function handleFile(file: File) {
    const isDocx = file.name.endsWith(".docx");
    const isPdf  = file.name.endsWith(".pdf");
    if (!isDocx && !isPdf) {
      setError(".docx または .pdf ファイルのみ対応しています");
      return;
    }
    setError("");
    setIsLoading(true);
    setLoadingMsg("ファイルを読み込み中...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/english", { method: "POST", body: formData });
      const data = await res.json() as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      const text = data.text ?? "";
      if (!text.trim()) throw new Error("テキストを抽出できませんでした");
      setWordText(text);
      setLoadingMsg("学習プランを生成中...");
      const plan = await callApi({ action: "generate_plan", text }) as StudyPlan;
      setStudyPlan(plan);
      saveStudy(plan, 0);
      setScreen("plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
      setLoadingMsg("");
    }
  }

  // ── Generate question ─────────────────────────────────
  const generateQuestion = useCallback(async (stepIdx: number, qIdx: number, phaseOverride?: string) => {
    if (!studyPlan) return;
    setIsLoading(true);
    setLoadingMsg("問題を生成中...");
    setError("");
    try {
      const step = studyPlan.steps[stepIdx];
      const stepToUse = phaseOverride ? { ...step, phase: phaseOverride } : step;
      const usedPhase = phaseOverride ?? step.phase;
      const q = await callApi({
        action: "generate_question",
        step: stepToUse,
        questionIndex: qIdx,
        documentText: wordText,
      }) as Question;
      setCurrentQuestion(q);
      setActivePhase(usedPhase);
      setUserAnswer("");
      setFeedback(null);
      setScreen("question");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
      setLoadingMsg("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyPlan, wordText]);

  // ── Submit answer ─────────────────────────────────────
  async function handleSubmit() {
    if (!currentQuestion || !studyPlan || !userAnswer.trim()) return;
    setIsLoading(true);
    setLoadingMsg("採点中...");
    setError("");
    try {
      const step = studyPlan.steps[currentStepIndex];
      const fb = await callApi({
        action: "grade_answer",
        question: currentQuestion,
        answer: userAnswer,
        step,
      }) as Feedback;

      // Update game state
      const earned = xpForScore(fb.score);
      setGame((prev) => {
        const updated = updateStreakAndDaily(prev);
        const newXp = updated.xp + earned;
        const newLevel = calcLevel(newXp);
        const next = { ...updated, xp: newXp, level: newLevel };
        saveGame(next);
        return next;
      });
      setXpAnim(earned);
      setShowXpPop(true);
      setTimeout(() => setShowXpPop(false), 2000);

      setFeedback(fb);
      setScreen("feedback");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
      setLoadingMsg("");
    }
  }

  // ── Navigation after feedback ─────────────────────────
  function handleRetry() {
    setFeedback(null);
    setUserAnswer("");
    setScreen("question");
  }

  function handleNextQuestion() {
    if (!studyPlan) return;
    const nextQIdx = questionIndex + 1;
    if (nextQIdx >= QUESTIONS_PER_STEP) {
      // Step complete — move to next step
      const nextStepIdx = currentStepIndex + 1;
      if (nextStepIdx >= studyPlan.steps.length) {
        clearStudy();
        setScreen("complete");
      } else {
        setCurrentStepIndex(nextStepIdx);
        saveStudy(studyPlan, nextStepIdx);
        setQuestionIndex(0);
        setActivePhase(undefined);
        generateQuestion(nextStepIdx, 0);
      }
    } else {
      setQuestionIndex(nextQIdx);
      setActivePhase(undefined);
      generateQuestion(currentStepIndex, nextQIdx);
    }
  }

  function handleStartStep(stepIdx: number) {
    setCurrentStepIndex(stepIdx);
    setQuestionIndex(0);
    setActivePhase(undefined);
    generateQuestion(stepIdx, 0);
  }

  const PHASE_ORDER = ["memorize", "confirm", "apply", "master"] as const;

  function handleEasierQuestion() {
    const phaseIdx = PHASE_ORDER.indexOf((activePhase ?? "apply") as typeof PHASE_ORDER[number]);
    const easierPhase = phaseIdx > 0 ? PHASE_ORDER[phaseIdx - 1] : PHASE_ORDER[0];
    generateQuestion(currentStepIndex, questionIndex, easierPhase);
  }

  // ── Voice input ───────────────────────────────────────
  function toggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SR = window.webkitSpeechRecognition ?? window.SpeechRecognition;
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any;
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e: { results: { [k: number]: { [k: number]: { transcript: string }; isFinal: boolean }; length: number } }) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setUserAnswer(transcript);
    };
    rec.onend = () => setIsRecording(false);
    rec.onerror = () => setIsRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  }

  // ─── Render ───────────────────────────────────────────
  const currentStep = studyPlan?.steps[currentStepIndex];
  const xpInLevel = game.xp % XP_PER_LEVEL;
  const xpPct = (xpInLevel / XP_PER_LEVEL) * 100;
  const dailyDone = Math.min(game.dailyCount, DAILY_GOAL);
  const bonusEarned = game.dailyCount >= DAILY_GOAL;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4FF", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 sticky top-0 z-10" style={{ backgroundColor: PRIMARY }}>
        <div className="flex items-center gap-2">
          {screen !== "upload" && screen !== "plan" && (
            <button onClick={() => setScreen("plan")} className="mr-1 text-white/80 hover:text-white" aria-label="back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
            </button>
          )}
          <span className="text-white font-bold text-lg">🇬🇧 EnglishLens</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Streak */}
          <div className="flex items-center gap-1 text-white text-sm font-bold">
            🔥<span>{game.streak}</span>
          </div>
          {/* XP */}
          <div className="flex items-center gap-1 text-white text-sm font-bold">
            ⭐<span>{game.xp}</span>
          </div>
          {/* Level */}
          <div className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: "rgba(255,255,255,0.25)", color: "white" }}>
            Lv.{game.level}
          </div>
        </div>
      </header>

      {/* XP Pop-up animation */}
      {showXpPop && (
        <div
          className="fixed top-16 right-4 z-50 text-white font-bold text-lg px-3 py-1 rounded-full shadow-lg"
          style={{
            backgroundColor: PRIMARY,
            animation: "xpPop 2s ease-out forwards",
          }}
        >
          +{xpAnim} XP!
        </div>
      )}

      {/* Level progress bar */}
      {screen !== "upload" && (
        <div className="px-4 pt-2 pb-1" style={{ backgroundColor: PRIMARY }}>
          <div className="flex justify-between text-white/70 text-xs mb-1">
            <span>Level {game.level}</span>
            <span>{xpInLevel}/{XP_PER_LEVEL} XP</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/20">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${xpPct}%`, backgroundColor: "#A5B4FC" }}
            />
          </div>
        </div>
      )}

      {/* Daily Mission */}
      {screen !== "upload" && (
        <div className="mx-4 mt-3 rounded-2xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <div className="text-2xl">{bonusEarned ? "🎉" : "🎯"}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-600">
                {bonusEarned ? "デイリーミッション達成！+20 ボーナスXP" : `今日のミッション：${DAILY_GOAL}問解こう`}
              </span>
              <span className="text-xs font-bold" style={{ color: PRIMARY }}>{dailyDone}/{DAILY_GOAL}</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: DAILY_GOAL }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-2 rounded-full transition-all duration-300"
                  style={{ backgroundColor: i < dailyDone ? SUCCESS : "#E5E7EB" }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 px-4 py-4">

        {/* ── Upload Screen ─────────────────────────────── */}
        {screen === "upload" && (
          <div className="flex flex-col items-center gap-6 pt-6">
            <div className="text-center">
              <div className="text-6xl mb-4">📖</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">EnglishLens</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                あなたの英語教材（Word / PDF）をアップロードして<br />
                AIが専用学習プランを作ります
              </p>
            </div>

            {/* Drag & Drop zone */}
            <div
              className="w-full rounded-3xl border-2 border-dashed p-8 flex flex-col items-center gap-4 transition-colors"
              style={{ borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT, cursor: "pointer" }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
            >
              <div className="text-4xl">📄</div>
              <div className="text-center">
                <p className="font-bold text-gray-700">タップしてファイルを選択</p>
                <p className="text-xs text-gray-400 mt-1">または、ファイルをここにドロップ</p>
                <p className="text-xs text-gray-400 mt-1">.docx / .pdf 形式に対応</p>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 mt-2">
                  <SpinnerIcon />
                  <span className="text-sm font-medium" style={{ color: PRIMARY }}>{loadingMsg}</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />

            {error && (
              <div className="w-full rounded-2xl px-4 py-3 flex items-center gap-2" style={{ backgroundColor: "#FEE2E2" }}>
                <span className="text-sm" style={{ color: DANGER }}>⚠ {error}</span>
              </div>
            )}

            {/* Features list */}
            <div className="w-full grid grid-cols-2 gap-3">
              {[
                { icon: "🤖", label: "AI問題生成", desc: "教材から自動作成" },
                { icon: "✅", label: "AIフィードバック", desc: "意味・文法・自然さ" },
                { icon: "🎤", label: "音声入力", desc: "話して英作文" },
                { icon: "🔥", label: "継続デザイン", desc: "ストリーク & XP" },
              ].map((f) => (
                <div key={f.label} className="rounded-2xl p-3 bg-white text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <p className="text-xs font-bold text-gray-700">{f.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Plan Screen ───────────────────────────────── */}
        {screen === "plan" && studyPlan && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{studyPlan.title}</h2>
                <p className="text-sm text-gray-500 mt-1">学習ステップを選んで始めましょう</p>
              </div>
              <button
                onClick={() => { clearStudy(); setStudyPlan(null); setCurrentStepIndex(0); setQuestionIndex(0); setScreen("upload"); }}
                className="text-xs text-gray-400 underline flex-shrink-0 mt-1"
              >
                最初からやり直す
              </button>
            </div>

            {/* Step progress */}
            <div className="rounded-2xl bg-white p-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-gray-700">進行状況</span>
                <span className="text-xs text-gray-400">{currentStepIndex}/{studyPlan.steps.length} ステップ</span>
              </div>
              <div className="flex gap-1">
                {studyPlan.steps.map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-2 rounded-full transition-all duration-300"
                    style={{ backgroundColor: i < currentStepIndex ? PRIMARY : i === currentStepIndex ? "#A5B4FC" : "#E5E7EB" }}
                  />
                ))}
              </div>
            </div>

            {/* Step cards */}
            {studyPlan.steps.map((step, i) => {
              const done = i < currentStepIndex;
              const current = i === currentStepIndex;
              const locked = i > currentStepIndex;
              return (
                <div
                  key={step.id}
                  className="rounded-3xl p-5"
                  style={{
                    backgroundColor: done ? "#F0FDF4" : current ? "white" : "#F9FAFB",
                    boxShadow: current ? "0 4px 16px rgba(79,70,229,0.12)" : "0 1px 4px rgba(0,0,0,0.06)",
                    border: current ? `2px solid ${PRIMARY}` : "2px solid transparent",
                    opacity: locked ? 0.6 : 1,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                        style={{ backgroundColor: done ? SUCCESS : current ? PRIMARY : "#9CA3AF" }}
                      >
                        {done ? "✓" : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <PhaseBadge phase={step.phase} />
                        </div>
                        <p className="font-bold text-gray-800 text-sm">{step.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.goal}</p>
                      </div>
                    </div>
                  </div>

                  {/* Context */}
                  {current && (
                    <div className="mt-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: PRIMARY_LIGHT }}>
                      <p className="text-xs text-gray-500 mb-1">シナリオ</p>
                      <p className="text-sm text-gray-700">{step.input_example}</p>
                    </div>
                  )}

                  {/* Tasks */}
                  {(current || done) && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {step.tasks.map((task, ti) => (
                        <div key={ti} className="flex items-start gap-2">
                          <div className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ backgroundColor: done ? "#DCFCE7" : PRIMARY_LIGHT }}>
                            {done ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill={SUCCESS}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                            ) : (
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIMARY }} />
                            )}
                          </div>
                          <span className="text-xs text-gray-600 leading-relaxed">{task}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Start button */}
                  {current && !locked && (
                    <button
                      onClick={() => handleStartStep(i)}
                      disabled={isLoading}
                      className="mt-4 w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {isLoading ? <><SpinnerIcon />{loadingMsg}</> : <>🚀 このステップを始める</>}
                    </button>
                  )}

                  {done && (
                    <div className="mt-3 flex items-center gap-2">
                      <CheckIcon />
                      <span className="text-sm font-medium" style={{ color: SUCCESS }}>完了！</span>
                    </div>
                  )}
                </div>
              );
            })}

            {error && (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ backgroundColor: "#FEE2E2" }}>
                <span className="text-sm" style={{ color: DANGER }}>⚠ {error}</span>
                <button onClick={() => { setError(""); handleStartStep(currentStepIndex); }} className="ml-auto text-xs font-bold underline" style={{ color: DANGER }}>
                  再試行
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Question Screen ───────────────────────────── */}
        {screen === "question" && currentQuestion && currentStep && (
          <div className="flex flex-col gap-4">
            {/* Step + question counter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: PRIMARY }}>
                  Step {currentStepIndex + 1}
                </span>
                <span className="text-xs text-gray-500">{currentStep.title}</span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: QUESTIONS_PER_STEP }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: i < questionIndex ? PRIMARY : i === questionIndex ? "#A5B4FC" : "#E5E7EB" }}
                  />
                ))}
              </div>
            </div>

            {/* Question card */}
            <div className="rounded-3xl p-5 bg-white" style={{ boxShadow: "0 4px 16px rgba(79,70,229,0.12)" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gray-500">問題 {questionIndex + 1}/{QUESTIONS_PER_STEP}</span>
                <DifficultyBadge d={currentQuestion.difficulty} />
              </div>

              {/* Context */}
              <div className="rounded-xl px-3 py-2 mb-4" style={{ backgroundColor: "#F8FAFF" }}>
                <p className="text-xs text-gray-400 mb-0.5">シチュエーション</p>
                <p className="text-sm text-gray-700">{currentQuestion.context}</p>
              </div>

              {/* Main question */}
              <p className="text-lg font-bold text-gray-800 leading-relaxed mb-2">{currentQuestion.japanese}</p>

              {/* Hint */}
              {currentQuestion.hint && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">💡 ヒント:</span>
                  <span className="text-xs italic text-gray-500">{currentQuestion.hint}</span>
                </div>
              )}
            </div>

            {/* Answer area */}
            <div className="rounded-3xl p-4 bg-white" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
              <label className="text-xs font-bold text-gray-500 block mb-2">英語で答えてください</label>
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your English answer here..."
                rows={4}
                className="w-full rounded-xl p-3 text-gray-800 text-base resize-none border transition-colors outline-none"
                style={{
                  borderColor: userAnswer ? PRIMARY : "#E5E7EB",
                  backgroundColor: "#FAFBFF",
                  fontSize: 16,
                }}
              />

              {/* Voice input button */}
              {hasSpeech && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={toggleRecording}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                    style={{
                      backgroundColor: isRecording ? "#FEE2E2" : "#EEF2FF",
                      color: isRecording ? DANGER : PRIMARY,
                      animation: isRecording ? "pulse 1.5s infinite" : "none",
                    }}
                  >
                    <MicIcon recording={isRecording} />
                    <span>{isRecording ? "録音中... タップで停止" : "音声で入力"}</span>
                    {isRecording && <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: DANGER }} />}
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ backgroundColor: "#FEE2E2" }}>
                <span className="text-sm" style={{ color: DANGER }}>⚠ {error}</span>
              </div>
            )}

            {/* Easier question button */}
            {activePhase !== "memorize" && (
              <button
                onClick={handleEasierQuestion}
                disabled={isLoading}
                className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#F0F9FF", color: "#0369A1" }}
              >
                {isLoading ? <SpinnerIcon /> : "🌱 もっと優しい問題にする"}
              </button>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !userAnswer.trim()}
              className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all"
              style={{
                backgroundColor: userAnswer.trim() ? PRIMARY : "#D1D5DB",
                boxShadow: userAnswer.trim() ? "0 4px 12px rgba(79,70,229,0.3)" : "none",
              }}
            >
              {isLoading ? <><SpinnerIcon />{loadingMsg}</> : <>✏️ 答えを送信する</>}
            </button>
          </div>
        )}

        {/* ── Feedback Screen ───────────────────────────── */}
        {screen === "feedback" && feedback && currentQuestion && currentStep && (
          <div className="flex flex-col gap-4">
            {/* Score banner */}
            <div
              className="rounded-3xl p-5 text-center"
              style={{
                backgroundColor:
                  feedback.score === "correct" ? "#F0FDF4" :
                  feedback.score === "partial" ? "#FFFBEB" : "#FEF2F2",
                border: `2px solid ${feedback.score === "correct" ? SUCCESS : feedback.score === "partial" ? WARNING : DANGER}`,
              }}
            >
              <div className="text-5xl mb-2">
                {feedback.score === "correct" ? "🎉" : feedback.score === "partial" ? "👍" : "💪"}
              </div>
              <p className="text-xl font-bold" style={{ color: feedback.score === "correct" ? SUCCESS : feedback.score === "partial" ? WARNING : DANGER }}>
                {feedback.score === "correct" ? "正解！" : feedback.score === "partial" ? "惜しい！" : "もう一度！"}
              </p>
              <p className="text-sm text-gray-500 mt-1">{feedback.brief_explanation}</p>
              <div className="mt-2 inline-block px-3 py-1 rounded-full text-sm font-bold text-white" style={{ backgroundColor: feedback.score === "correct" ? SUCCESS : feedback.score === "partial" ? WARNING : DANGER }}>
                +{xpForScore(feedback.score)} XP
              </div>
            </div>

            {/* Your answer */}
            <div className="rounded-2xl p-4 bg-white" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p className="text-xs font-bold text-gray-400 mb-1">あなたの答え</p>
              <p className="text-gray-800">{userAnswer}</p>
            </div>

            {/* Good points */}
            {feedback.good_points.length > 0 && (
              <div className="rounded-2xl p-4 bg-white" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: SUCCESS }}>👍 良い点</p>
                {feedback.good_points.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: SUCCESS }} />
                    <p className="text-sm text-gray-700">{p}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Corrections */}
            {feedback.corrections.length > 0 && (
              <div className="rounded-2xl p-4 bg-white" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: WARNING }}>⚠ 修正点</p>
                {feedback.corrections.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: WARNING }} />
                    <p className="text-sm text-gray-700">{c}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Improved example */}
            <div className="rounded-2xl p-4 bg-white" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: PRIMARY }}>✍ 改善例</p>
              <p className="text-gray-800 font-medium italic">&ldquo;{feedback.improved_example}&rdquo;</p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 mt-2">
              {feedback.retry ? (
                <button
                  onClick={handleRetry}
                  className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2"
                  style={{ backgroundColor: DANGER, boxShadow: "0 4px 12px rgba(220,38,38,0.25)" }}
                >
                  🔄 もう一度挑戦する
                </button>
              ) : (
                <>
                  <button
                    onClick={handleNextQuestion}
                    disabled={isLoading}
                    className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2"
                    style={{ backgroundColor: PRIMARY, boxShadow: "0 4px 12px rgba(79,70,229,0.3)" }}
                  >
                    {isLoading ? <><SpinnerIcon />{loadingMsg}</> : <>➡️ 次の問題へ</>}
                  </button>
                  {feedback.score === "partial" && (
                    <button
                      onClick={handleRetry}
                      className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
                      style={{ backgroundColor: "#FEF3C7", color: WARNING }}
                    >
                      🔄 もう一度やり直す
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Complete Screen ───────────────────────────── */}
        {screen === "complete" && (
          <div className="flex flex-col items-center gap-6 pt-8 text-center">
            <div className="text-7xl">🏆</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">全ステップ完了！</h2>
              <p className="text-gray-500 mt-2">素晴らしい！学習プランを最後まで終えました。</p>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full">
              <div className="rounded-2xl p-4 bg-white text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p className="text-2xl font-bold" style={{ color: PRIMARY }}>{game.xp}</p>
                <p className="text-xs text-gray-500 mt-1">Total XP</p>
              </div>
              <div className="rounded-2xl p-4 bg-white text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p className="text-2xl font-bold" style={{ color: WARNING }}>🔥{game.streak}</p>
                <p className="text-xs text-gray-500 mt-1">Streak</p>
              </div>
              <div className="rounded-2xl p-4 bg-white text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p className="text-2xl font-bold" style={{ color: SUCCESS }}>Lv.{game.level}</p>
                <p className="text-xs text-gray-500 mt-1">Level</p>
              </div>
            </div>
            <button
              onClick={() => { setScreen("plan"); setCurrentStepIndex(0); setQuestionIndex(0); }}
              className="w-full py-4 rounded-2xl text-white font-bold text-base"
              style={{ backgroundColor: PRIMARY, boxShadow: "0 4px 12px rgba(79,70,229,0.3)" }}
            >
              📚 もう一度学習する
            </button>
            <button
              onClick={() => { clearStudy(); setScreen("upload"); setStudyPlan(null); setWordText(""); }}
              className="w-full py-3 rounded-2xl font-semibold text-sm"
              style={{ backgroundColor: PRIMARY_LIGHT, color: PRIMARY }}
            >
              📄 新しいファイルで始める
            </button>
          </div>
        )}

      </main>

      {/* CSS animations */}
      <style>{`
        @keyframes xpPop {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          50%  { opacity: 1; transform: translateY(-20px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-40px) scale(0.8); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

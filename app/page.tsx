"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import ChatInput from "./components/ChatInput";

type Message = { role: "user" | "assistant"; content: string };
type Tab = "home" | "data" | "weakness" | "routine" | "trend" | "school";

type DriveFile = { id: string; name: string; mimeType: string; size?: string };

type WeaknessEntry = {
  field: string;
  unit: string;
  count: string;
  avgCorrectRate: string;
  tendency: string;
  evaluation: string;
  priority: string;
  strategy: string;
};

type TestScore = {
  name: string;
  date: string;
  kokugo: number;
  sansu: number;
  rika: number;
  shakai: number;
  total: number;
  rank: string;
};

type ScoreSet = { kokugo: number; sansu: number; rika: number; shakai: number; total: number };

type SchoolJudgment = {
  name: string;
  tag: string;
  currentJudgment: string;
  pointsToA: string;
  strongSubjects: string;
  weakSubjects: string;
  strategy: string;
  decisionTiming: string;
  diffs: { kokugo: number; sansu: number; rika: number; shakai: number };
};

type RoutineItem = { time: string; subject: string; importance: string; menu: string; detail: string };
type RoutinePhase = { period: string; reading: string; vocabulary: string };

type BackcastMonth = { month: string; kokugo: string; sansu: string; rika: string; shakai: string; routine: string };
type BackcastPhase = { phase: string; months: BackcastMonth[] };

type AnalysisResult = {
  deviationScores: {
    tests: TestScore[];
    averages: ScoreSet;
    best: ScoreSet;
    recent3avg: ScoreSet;
  };
  weaknesses: {
    kokugo: WeaknessEntry[];
    sansu: WeaknessEntry[];
    rika: WeaknessEntry[];
    shakai: WeaknessEntry[];
  };
  schoolJudgments: SchoolJudgment[];
  routine?: {
    summary: string;
    items: RoutineItem[];
    phases: RoutinePhase[];
  };
  backcast?: {
    topPriorities: string;
    phases: BackcastPhase[];
  };
  _parseError?: boolean;
};

const QUICK_QUESTIONS_BEFORE = [
  "何から始めればいいですか？",
  "このアプリの使い方を教えて",
  "中学受験の勉強法を教えて",
  "志望校選びのポイントは？",
  "毎日の勉強時間はどのくらい？",
];

const QUICK_QUESTIONS_AFTER = [
  "最も優先すべき弱点は？",
  "今週の学習計画を立てて",
  "志望校合格に向けた戦略を教えて",
  "算数の比・割合の勉強法は？",
  "国語の読解力を上げるには？",
];

const NAVY = "#0C447C";
const BG = "#f5f5f3";

// ─── Icons ────────────────────────────────────────────────
function BarChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}
function HomeIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? NAVY : "#9ca3af"}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>;
}
function DataIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? NAVY : "#9ca3af"}><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3a1 1 0 110 2 1 1 0 010-2zm0 4a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4z" /></svg>;
}
function WeaknessIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? NAVY : "#9ca3af"}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>;
}
function RoutineIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? NAVY : "#9ca3af"}><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-1V1h-2zm3 18H5V8h14v11z" /></svg>;
}
function TrendIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? NAVY : "#9ca3af"}><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" /></svg>;
}
function SchoolIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? NAVY : "#9ca3af"}><path d="M12 3L1 9l4 2.18V17h2v-4.82l1 .55V17c0 2.21 1.79 4 4 4s4-1.79 4-4v-4.27l3 1.64v-1.18L21 12V9L12 3zm6.18 6L12 12.72 5.82 9 12 5.28 18.18 9zM16 17c0 1.1-.9 2-2 2H10c-1.1 0-2-.9-2-2v-3.45l4 2.19 4-2.19V17z" /></svg>;
}
function SendIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>;
}
function DriveIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H10.55C10.55 57.65 9.8 60 9.8 62.5c0 1.5.3 3.05.8 4.35z" fill="#0066da" />
      <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L6.5 37.55c-.8 1.4-1.2 2.95-1.2 4.5H27.4z" fill="#00ac47" />
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L80.8 66c.5-1.3.8-2.75.8-4.25 0-1.5-.3-2.95-.8-4.35H59.9l4.35 8.5z" fill="#ea4335" />
      <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="M59.9 53H27.4L13.65 76.8c1.35.8 2.9 1.2 4.5 1.2h50c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="M73.4 37.55L57.3 9.8c-.8-1.4-1.95-2.5-3.3-3.3L40.25 29.75 59.9 53h20.95c0-1.5-.4-3.05-1.2-4.5z" fill="#ffba00" />
    </svg>
  );
}
function SpinnerIcon({ color = "white" }: { color?: string }) {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
      <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
      <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" />
    </svg>
  );
}

function fileMimeLabel(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "application/vnd.google-apps.document") return "DOC";
  if (mimeType === "application/vnd.google-apps.spreadsheet") return "XLS";
  if (mimeType.startsWith("image/")) return "IMG";
  if (mimeType.startsWith("text/")) return "TXT";
  return "FILE";
}
function extractFolderId(url: string) {
  const m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function priorityBadge(priority: string) {
  const map: Record<string, { bg: string; text: string }> = {
    最高: { bg: "#fee2e2", text: "#dc2626" },
    高:   { bg: "#ffedd5", text: "#c2410c" },
    中:   { bg: "#dbeafe", text: "#1d4ed8" },
    低:   { bg: "#dcfce7", text: "#15803d" },
    なし: { bg: "#f3f4f6", text: "#6b7280" },
  };
  const style = map[priority] ?? map["なし"];
  return (
    <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: style.bg, color: style.text }}>
      {priority}
    </span>
  );
}

function evalBadge(evaluation: string) {
  const map: Record<string, { bg: string; text: string }> = {
    "◎": { bg: "#dcfce7", text: "#15803d" },
    "○": { bg: "#dbeafe", text: "#1d4ed8" },
    "△": { bg: "#fef9c3", text: "#92400e" },
    "×": { bg: "#fee2e2", text: "#dc2626" },
  };
  const style = map[evaluation] ?? { bg: "#f3f4f6", text: "#6b7280" };
  return (
    <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: style.bg, color: style.text }}>
      {evaluation}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────
export default function Home() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("home");

  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Drive
  const [driveUrl, setDriveUrl] = useState("");
  const [fileListStatus, setFileListStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fileListError, setFileListError] = useState("");
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);

  // Analysis
  const [analyzeStatus, setAnalyzeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [analyzeError, setAnalyzeError] = useState("");
  const [analyzeMessage, setAnalyzeMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  async function handleChatSend(text: string) {
    if (!text || chatLoading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "エラーが発生しました。もう一度お試しください。" }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleFetchFiles() {
    const folderId = extractFolderId(driveUrl);
    if (!folderId) {
      setFileListStatus("error");
      setFileListError("有効なGoogle DriveフォルダのURLを入力してください");
      return;
    }
    setFileListStatus("loading");
    setDriveFiles([]);
    setFileListError("");
    setAnalyzeStatus("idle");
    setAnalysisResult(null);
    try {
      const res = await fetch(`/api/drive?folderId=${folderId}`);
      if (res.status === 401) {
        setFileListStatus("error");
        setFileListError("Google Driveへのアクセス権限がありません。再ログインしてください。");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "ファイル一覧の取得に失敗しました");
      }
      const data = await res.json();
      setDriveFiles(data.files ?? []);
      setFileListStatus("success");
    } catch (e) {
      setFileListStatus("error");
      setFileListError(e instanceof Error ? e.message : "エラーが発生しました");
    }
  }

  async function handleAnalyze() {
    if (driveFiles.length === 0) return;
    setAnalyzeStatus("loading");
    setAnalyzeError("");

    try {
      // ── Step 1: 偏差値・弱点分析 ──────────────────────
      setAnalyzeMessage("偏差値・弱点を分析中...（1/2）");
      const res1 = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: driveFiles }),
      });
      const data1 = await res1.json();
      if (!res1.ok) {
        throw new Error(
          (data1 as { detail?: string; error?: string }).detail ??
          (data1 as { error?: string }).error ??
          "分析に失敗しました"
        );
      }
      // Step1の結果を即座に表示
      setAnalysisResult(data1 as AnalysisResult);

      // ── Step 2: 志望校・ルーティン・バックキャスト ──
      setAnalyzeMessage("学習プランを作成中...（2/2）");
      const res2 = await fetch("/api/analyze-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: driveFiles, firstResult: data1 }),
      });
      const data2 = await res2.json();
      if (res2.ok) {
        setAnalysisResult((prev) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          prev ? { ...prev, ...(data2 as any) } : (data2 as AnalysisResult)
        );
      } else {
        console.warn("[handleAnalyze] step2 failed, using step1 result only");
      }

      setAnalyzeMessage("");
      setAnalyzeStatus("success");
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "分析に失敗しました");
      setAnalyzeMessage("");
      setAnalyzeStatus("error");
    }
  }

  // Loading
  if (status === "loading") {
    return (
      <div style={{ background: BG }} className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: NAVY }}><BarChartIcon /></div>
          <p className="text-gray-500 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Sign-in
  if (!session) {
    return (
      <div style={{ background: BG }} className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-6" style={{ maxWidth: 480 }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: NAVY }}><BarChartIcon /></div>
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>StudyLens</h1>
            <p className="text-gray-500 text-sm mt-2">AIがあなたの学習をサポートします。<br />Googleアカウントでログインしてください。</p>
          </div>
          <button onClick={() => signIn("google")} className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-3 px-5 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Googleでログイン
          </button>
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            ログインすることで
            <a href="/terms" className="underline mx-0.5 hover:opacity-70 transition-opacity" style={{ color: NAVY }}>利用規約</a>
            および
            <a href="/privacy" className="underline mx-0.5 hover:opacity-70 transition-opacity" style={{ color: NAVY }}>プライバシーポリシー</a>
            に同意したものとみなします
          </p>
        </div>
      </div>
    );
  }

  const userName = session.user?.name ?? "ユーザー";
  const avatarChar = userName.slice(-1);

  const tabs: { id: Tab; label: string; Icon: React.FC<{ active: boolean }> }[] = [
    { id: "home",     label: "ホーム",    Icon: HomeIcon },
    { id: "data",     label: "追加読込",  Icon: DataIcon },
    { id: "weakness", label: "弱点",      Icon: WeaknessIcon },
    { id: "routine",  label: "ルーティン", Icon: RoutineIcon },
    { id: "trend",    label: "推移",      Icon: TrendIcon },
    { id: "school",   label: "志望校",    Icon: SchoolIcon },
  ];

  // ─── Home Tab ──────────────────────────────────────────
  const HomeTab = () => {
    const avg = analysisResult?.deviationScores?.averages;
    const topSchool = analysisResult?.schoolJudgments?.[0];
    const topWeak = analysisResult?.weaknesses?.sansu?.[0] ?? analysisResult?.weaknesses?.kokugo?.[0];

    function resetDrive() {
      setFileListStatus("idle");
      setDriveFiles([]);
      setFileListError("");
      setAnalyzeStatus("idle");
      setAnalyzeError("");
      setAnalysisResult(null);
    }

    // ── AI分析中 ────────────────────────────────────
    if (analyzeStatus === "loading") {
      const isStep2 = analyzeMessage.includes("2/2");
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-md" style={{ backgroundColor: NAVY }}>
            <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
              <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800 mb-2">AI分析中...</p>
            <p className="text-sm font-medium mb-1" style={{ color: NAVY }}>
              {analyzeMessage || "分析を準備中..."}
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              通常1〜2分かかります。そのままお待ちください。
            </p>
          </div>
          {/* 2段階プログレスバー */}
          <div className="w-full max-w-[260px] flex flex-col gap-2">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>偏差値・弱点分析</span>
              <span>学習プラン作成</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: isStep2 ? "100%" : "50%",
                  backgroundColor: NAVY,
                }}
              />
            </div>
            <div className="flex justify-between">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: NAVY, fontSize: 8 }}>✓</div>
                <span className="text-[10px] font-medium" style={{ color: NAVY }}>Step 1</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ backgroundColor: isStep2 ? NAVY : "#e5e7eb" }}>
                  {isStep2 && <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="9" strokeOpacity="0.3" /><path d="M21 12a9 9 0 00-9-9" /></svg>}
                </div>
                <span className="text-[10px] font-medium" style={{ color: isStep2 ? NAVY : "#9ca3af" }}>Step 2</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── 分析完了 ────────────────────────────────────
    if (analyzeStatus === "success") {
      return (
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 px-4 pt-4 pb-2 flex-shrink-0">
            <StatCard label="4科偏差値"    value={avg ? String(avg.total) : "—"} sub={avg ? `算${avg.sansu}・国${avg.kokugo}` : "データなし"} color="#e8f0fe" textColor={NAVY} />
            <StatCard label="第一志望判定"  value={topSchool?.currentJudgment ?? "—"} sub={topSchool?.name ?? "データなし"} color="#e6f4ea" textColor="#137333" />
            <StatCard label="取込ファイル数" value={driveFiles.length > 0 ? String(driveFiles.length) : "—"} sub={driveFiles.length > 0 ? "取込済み" : "データなし"} color="#fef7e0" textColor="#b45309" />
            <StatCard label="最優先弱点"    value={topWeak?.unit ?? "—"} sub={topWeak ? `正答率 ${topWeak.avgCorrectRate}` : "データなし"} color="#fce8e6" textColor="#c5221f" />
          </div>

          {/* Quick nav + re-import */}
          <div className="flex items-center gap-2 px-4 pb-2 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {([
              { tab: "weakness" as Tab, label: "弱点分析",  bg: "#fee2e2", color: "#dc2626" },
              { tab: "trend"    as Tab, label: "偏差値推移", bg: "#e8f0fe", color: NAVY },
              { tab: "routine"  as Tab, label: "ルーティン", bg: "#e6f4ea", color: "#15803d" },
              { tab: "school"   as Tab, label: "志望校",     bg: "#fef7e0", color: "#b45309" },
            ]).map(({ tab, label, bg, color }) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                style={{ backgroundColor: bg, color }}>
                {label} →
              </button>
            ))}
            <button onClick={resetDrive}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors ml-1">
              再取込み
            </button>
          </div>

          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0 bg-white border-b border-gray-100">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: NAVY }}><BarChartIcon /></div>
            <div>
              <p className="text-sm font-semibold text-gray-800">StudyLens AI</p>
              <p className="text-xs" style={{ color: "#22c55e" }}>● オンライン</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-2 bg-white">
            {messages.length === 0 && (
              <div className="flex justify-start">
                <div className="max-w-[80%] px-4 py-2.5 text-sm leading-relaxed text-gray-800" style={{ backgroundColor: "#f0f0f0", borderRadius: "18px 18px 18px 0px" }}>
                  分析が完了しました🎉<br />各タブで詳しい結果を確認するか、勉強の疑問を何でも聞いてください！成績に合わせた個別アドバイスができます。
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 self-end" style={{ backgroundColor: NAVY }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="3" y="12" width="3" height="9" rx="0.5" /><rect x="9" y="7" width="3" height="14" rx="0.5" /><rect x="15" y="3" width="3" height="18" rx="0.5" /></svg>
                  </div>
                )}
                <div className="max-w-[75%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={msg.role === "user"
                    ? { backgroundColor: NAVY, color: "white", borderRadius: "18px 18px 0px 18px" }
                    : { backgroundColor: "#f0f0f0", color: "#1f2937", borderRadius: "18px 18px 18px 0px" }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: NAVY }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="3" y="12" width="3" height="9" rx="0.5" /><rect x="9" y="7" width="3" height="14" rx="0.5" /><rect x="15" y="3" width="3" height="18" rx="0.5" /></svg>
                </div>
                <div className="px-4 py-3 flex items-center gap-1" style={{ backgroundColor: "#f0f0f0", borderRadius: "18px 18px 18px 0px" }}>
                  <TypingDot delay={0} /><TypingDot delay={0.2} /><TypingDot delay={0.4} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Chat Input（分析済み） */}
          <ChatInput onSend={handleChatSend} loading={chatLoading} suggestions={QUICK_QUESTIONS_AFTER} />
        </div>
      );
    }

    // ── セットアップ（Step 1 / Step 2）──────────────
    const step = fileListStatus === "success" && driveFiles.length > 0 ? 2 : 1;

    return (
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">

        {/* Step indicator */}
        <div className="flex items-center px-2 gap-0">
          {/* Step 1 */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: step > 1 ? NAVY : step === 1 ? NAVY : "#e5e7eb", color: step >= 1 ? "white" : "#9ca3af" }}>
              {step > 1 ? <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg> : "1"}
            </div>
            <span className="text-[10px] font-medium" style={{ color: step === 1 ? NAVY : "#9ca3af" }}>接続</span>
          </div>
          <div className="flex-1 h-0.5 mb-3 mx-1 rounded-full" style={{ backgroundColor: step > 1 ? NAVY : "#e5e7eb" }} />
          {/* Step 2 */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: step === 2 ? NAVY : "#e5e7eb", color: step === 2 ? "white" : "#9ca3af" }}>
              2
            </div>
            <span className="text-[10px] font-medium" style={{ color: step === 2 ? NAVY : "#9ca3af" }}>分析</span>
          </div>
          <div className="flex-1 h-0.5 mb-3 mx-1 rounded-full" style={{ backgroundColor: "#e5e7eb" }} />
          {/* Step 3 */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "#e5e7eb", color: "#9ca3af" }}>
              3
            </div>
            <span className="text-[10px] font-medium" style={{ color: "#9ca3af" }}>完了</span>
          </div>
        </div>

        {/* ── Step 2: ファイル確認 ── */}
        {step === 2 ? (
          <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#f0fdf4" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{driveFiles.length}件のファイルを取得しました</p>
                  <p className="text-xs text-gray-400">AIが分析できる状態です</p>
                </div>
              </div>
              <button onClick={resetDrive} className="text-xs text-blue-500 hover:text-blue-700 transition-colors">
                変更
              </button>
            </div>

            {/* File list */}
            <div className="rounded-xl border border-gray-100 overflow-hidden" style={{ maxHeight: 200, overflowY: "auto" }}>
              {driveFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-blue-600">{fileMimeLabel(file.mimeType)}</span>
                  </div>
                  <span className="text-xs text-gray-700 flex-1 truncate">{file.name}</span>
                </div>
              ))}
            </div>

            {analyzeError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "#fef2f2" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#dc2626"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                <span className="text-xs" style={{ color: "#dc2626" }}>{analyzeError}</span>
              </div>
            )}

            <button onClick={handleAnalyze}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: "#16a34a" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3a1 1 0 110 2 1 1 0 010-2zm0 4a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
              AIで分析する
            </button>
          </div>
        ) : (
          /* ── Step 1: Drive接続 ── */
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#f8f9ff" }}>
                <DriveIcon />
              </div>
              <div>
                <p className="text-base font-bold text-gray-800">Google Driveを接続</p>
                <p className="text-xs text-gray-500">模試・テスト結果が入ったフォルダのURLを入力</p>
              </div>
            </div>

            <input
              type="url"
              value={driveUrl}
              onChange={(e) => { setDriveUrl(e.target.value); if (fileListStatus === "error") setFileListStatus("idle"); }}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-300 disabled:bg-gray-50"
              disabled={fileListStatus === "loading"}
            />

            {fileListStatus === "error" && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "#fef2f2" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#dc2626"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                <span className="text-xs" style={{ color: "#dc2626" }}>{fileListError}</span>
              </div>
            )}

            <button
              onClick={handleFetchFiles}
              disabled={fileListStatus === "loading" || !driveUrl.trim()}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: NAVY }}>
              {fileListStatus === "loading" ? (
                <><SpinnerIcon />取得中...</>
              ) : (
                <>ファイルを取得する<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" /></svg></>
              )}
            </button>
          </div>
        )}

        {/* Features showcase（Step 1のみ） */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm font-bold text-gray-700 mb-4">StudyLensでできること</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { bg: "#e8f0fe", color: NAVY,      icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",  title: "弱点分析",    desc: "科目・単元ごとの弱点を特定" },
                { bg: "#e6f4ea", color: "#15803d", icon: "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z",                                    title: "偏差値推移",  desc: "模試の成績を可視化" },
                { bg: "#fef7e0", color: "#b45309", icon: "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-1V1h-2zm3 18H5V8h14v11z", title: "ルーティン",   desc: "最適な学習スケジュール" },
                { bg: "#fce8e6", color: "#c5221f", icon: "M12 3L1 9l4 2.18V17h2v-4.82l1 .55V17c0 2.21 1.79 4 4 4s4-1.79 4-4v-4.27l3 1.64v-1.18L21 12V9L12 3z",  title: "志望校分析",  desc: "合格可能性と対策を提案" },
              ].map(({ bg, color, icon, title, desc }) => (
                <div key={title} className="rounded-xl p-3.5" style={{ backgroundColor: bg }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={color} className="mb-2"><path d={icon} /></svg>
                  <p className="text-xs font-bold mb-0.5" style={{ color }}>{title}</p>
                  <p className="text-[11px] text-gray-500 leading-tight">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* チャット（未分析状態でも使える） */}
        <div className="bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden" style={{ minHeight: 280 }}>
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: NAVY }}><BarChartIcon /></div>
            <div>
              <p className="text-sm font-semibold text-gray-800">StudyLens AI</p>
              <p className="text-xs" style={{ color: "#22c55e" }}>● オンライン</p>
            </div>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2" style={{ maxHeight: 260 }}>
            {messages.length === 0 && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-4 py-2.5 text-sm leading-relaxed text-gray-800" style={{ backgroundColor: "#f0f0f0", borderRadius: "18px 18px 18px 0px" }}>
                  こんにちは！StudyLens AIです。<br />
                  中学受験の勉強について何でも聞いてください。<br />
                  データを読み込むと、お子様の成績に合わせた個別アドバイスができるようになります。
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 self-end" style={{ backgroundColor: NAVY }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="3" y="12" width="3" height="9" rx="0.5" /><rect x="9" y="7" width="3" height="14" rx="0.5" /><rect x="15" y="3" width="3" height="18" rx="0.5" /></svg>
                  </div>
                )}
                <div className="max-w-[75%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={msg.role === "user"
                    ? { backgroundColor: NAVY, color: "white", borderRadius: "18px 18px 0px 18px" }
                    : { backgroundColor: "#f0f0f0", color: "#1f2937", borderRadius: "18px 18px 18px 0px" }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: NAVY }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="3" y="12" width="3" height="9" rx="0.5" /><rect x="9" y="7" width="3" height="14" rx="0.5" /><rect x="15" y="3" width="3" height="18" rx="0.5" /></svg>
                </div>
                <div className="px-4 py-3 flex items-center gap-1" style={{ backgroundColor: "#f0f0f0", borderRadius: "18px 18px 18px 0px" }}>
                  <TypingDot delay={0} /><TypingDot delay={0.2} /><TypingDot delay={0.4} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {/* Chat Input（未分析） */}
          <ChatInput onSend={handleChatSend} loading={chatLoading} suggestions={QUICK_QUESTIONS_BEFORE} />
        </div>
      </div>
    );
  };

  // ─── Data Tab ──────────────────────────────────────────
  const DataTab = () => (
    <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
      <div>
        <h2 className="text-base font-bold text-gray-800">追加データの読み込み</h2>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          すでに読み込んだデータに追加してさらに詳しく分析できます。<br />
          新しいテスト結果や模試のデータをGoogle Driveから追加してください。
        </p>
      </div>

      {analyzeStatus === "success" ? (
        /* 分析済み：現在の取込済みファイルと追加読み込みボタン */
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-1 border-b border-gray-50">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#f0fdf4" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">現在の取込済み：{driveFiles.length}件</p>
              <p className="text-xs text-gray-400">AI分析が完了しています</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 overflow-hidden" style={{ maxHeight: 200, overflowY: "auto" }}>
            {driveFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-blue-600">{fileMimeLabel(file.mimeType)}</span>
                </div>
                <span className="text-xs text-gray-700 flex-1 truncate">{file.name}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setActiveTab("home")}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            style={{ backgroundColor: NAVY }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            ホームで追加データを読み込む
          </button>
        </div>
      ) : (
        /* 未分析：ホームへ誘導 */
        <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center gap-5 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#f8f9ff" }}>
            <DriveIcon />
          </div>
          <div>
            <p className="text-base font-bold text-gray-800 mb-2">データをまだ取り込んでいません</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              まずホームからGoogle DriveのURLを入力して<br />最初のAI分析を開始しましょう。
            </p>
          </div>
          <button onClick={() => setActiveTab("home")}
            className="px-6 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: NAVY }}>
            ホームへ
          </button>
        </div>
      )}
    </div>
  );

  // ─── Weakness Tab ─────────────────────────────────────
  const WeaknessTab = () => {
    const w = analysisResult?.weaknesses;
    const SUBJECTS: { key: keyof NonNullable<typeof w>; label: string }[] = [
      { key: "kokugo", label: "国語" },
      { key: "sansu",  label: "算数" },
      { key: "rika",   label: "理科" },
      { key: "shakai", label: "社会" },
    ];
    return (
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        <h2 className="text-base font-bold text-gray-800">弱点分析</h2>
        {!w ? (
          <EmptyState icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>} onGoToData={() => setActiveTab("home")} />
        ) : (
          SUBJECTS.map(({ key, label }) => {
            const rows = Array.isArray(w[key]) ? w[key] : [];
            return (
              <div key={key} className="bg-white rounded-2xl shadow-sm p-4">
                <p className="text-sm font-bold text-gray-800 mb-3">{label}</p>
                {rows.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">データなし</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-gray-700 min-w-[560px]">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {["分野", "単元", "回数", "正答率", "傾向", "評価", "優先度", "対策"].map((h) => (
                            <th key={h} className="text-left pb-2 font-medium text-gray-500 pr-2">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 pr-2 font-medium whitespace-nowrap">{row.field}</td>
                            <td className="py-2 pr-2 whitespace-nowrap">{row.unit}</td>
                            <td className="py-2 pr-2 text-center">{row.count}</td>
                            <td className="py-2 pr-2 text-center">{row.avgCorrectRate}</td>
                            <td className="py-2 pr-2 text-gray-500 max-w-[120px]">{row.tendency}</td>
                            <td className="py-2 pr-2">{evalBadge(row.evaluation)}</td>
                            <td className="py-2 pr-2">{priorityBadge(row.priority)}</td>
                            <td className="py-2 text-gray-600">{row.strategy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  // ─── Routine Tab ───────────────────────────────────────
  const RoutineTab = () => {
    const routine = analysisResult?.routine;
    const backcast = analysisResult?.backcast;
    return (
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        <h2 className="text-base font-bold text-gray-800">ルーティーン設計</h2>
        {analyzeStatus === "loading" && !routine ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center gap-3">
            <SpinnerIcon color={NAVY} />
            <p className="text-sm text-gray-500">学習プランを生成中...</p>
          </div>
        ) : !routine ? (
          <EmptyState icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></svg>} onGoToData={() => setActiveTab("home")} />
        ) : (
          <>
            {routine.summary && (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">サマリー</p>
                <p className="text-sm text-gray-700 leading-relaxed">{routine.summary}</p>
              </div>
            )}
            {/* 毎日ルーティン */}
            {routine.items?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-800 mb-4">毎日のルーティン</p>
                {routine.items.map((item, i) => (
                  <div key={i} className="flex gap-3 mb-3 last:mb-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: NAVY }} />
                    <div className="flex-1 rounded-xl px-3 py-2.5" style={{ backgroundColor: "#f8faff" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">{item.time}</span>
                        <span className="text-xs font-bold text-gray-700">{item.subject}</span>
                        {item.importance && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "#e8f0fe", color: NAVY }}>
                            {item.importance}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800">{item.menu}</p>
                      {item.detail && <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* 時期別変化 */}
            {routine.phases?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-800 mb-3">時期別の学習変化</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-gray-700 min-w-[300px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left pb-2 font-medium text-gray-500">時期</th>
                        <th className="text-left pb-2 font-medium text-gray-500">読解</th>
                        <th className="text-left pb-2 font-medium text-gray-500">語彙</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routine.phases.map((p, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 font-medium whitespace-nowrap">{p.period}</td>
                          <td className="py-2.5 pr-3">{p.reading}</td>
                          <td className="py-2.5">{p.vocabulary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* バックキャスト */}
            {backcast && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-800 mb-2">バックキャスト計画</p>
                {backcast.topPriorities && (
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">{backcast.topPriorities}</p>
                )}
                {backcast.phases?.map((phase, pi) => (
                  <div key={pi} className="mb-4 last:mb-0">
                    <div className="inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-2 text-white" style={{ backgroundColor: NAVY }}>
                      {phase.phase}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-gray-700 min-w-[400px]">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {["月", "国語", "算数", "理科", "社会", "ルーティン"].map((h) => (
                              <th key={h} className="text-left pb-1.5 font-medium text-gray-400 pr-2">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {phase.months?.map((m, mi) => (
                            <tr key={mi} className="border-b border-gray-50 last:border-0">
                              <td className="py-2 pr-2 font-medium whitespace-nowrap">{m.month}</td>
                              <td className="py-2 pr-2">{m.kokugo}</td>
                              <td className="py-2 pr-2">{m.sansu}</td>
                              <td className="py-2 pr-2">{m.rika}</td>
                              <td className="py-2 pr-2">{m.shakai}</td>
                              <td className="py-2">{m.routine}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ─── Trend Tab ────────────────────────────────────────
  const TrendTab = () => {
    const ds = analysisResult?.deviationScores;
    if (!ds) {
      return (
        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
          <h2 className="text-base font-bold text-gray-800">偏差値推移</h2>
          <EmptyState icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>} onGoToData={() => setActiveTab("home")} />
        </div>
      );
    }
    // testsが空でもaveragesがあればカード表示
    const hasAvg = ds.averages && ds.averages.total > 0;

    const tests = Array.isArray(ds.tests) ? ds.tests : [];
    const avg = ds.averages;
    const best = ds.best;
    const r3 = ds.recent3avg;

    if (!hasAvg && tests.length === 0) {
      return (
        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
          <h2 className="text-base font-bold text-gray-800">偏差値推移</h2>
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-sm text-gray-400 py-4">テストデータが含まれていませんでした。<br />模試や成績表のファイルを追加して再分析してください。</p>
          </div>
        </div>
      );
    }

    // SVG折れ線グラフ（5科目）
    const LINES: { key: keyof Omit<ScoreSet, "total">; color: string; label: string }[] = [
      { key: "kokugo", color: "#3b82f6", label: "国語" },
      { key: "sansu",  color: "#f59e0b", label: "算数" },
      { key: "rika",   color: "#10b981", label: "理科" },
      { key: "shakai", color: "#8b5cf6", label: "社会" },
    ];
    const totalColor = NAVY;

    const allVals = tests.flatMap((t) => [t.kokugo, t.sansu, t.rika, t.shakai, t.total].filter(Boolean));
    const minV = allVals.length ? Math.min(...allVals) - 3 : 40;
    const maxV = allVals.length ? Math.max(...allVals) + 3 : 70;
    const range = maxV - minV || 1;
    const W = 320; const H = 140; const padX = 24; const padY = 12;
    const iW = W - padX * 2; const iH = H - padY * 2;

    function pts(vals: number[]) {
      return vals.map((v, i) => {
        const x = padX + (i / Math.max(vals.length - 1, 1)) * iW;
        const y = padY + iH - ((v - minV) / range) * iH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
    }

    return (
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        <h2 className="text-base font-bold text-gray-800">偏差値推移</h2>

        {/* 統計カード */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="4科平均" value={avg ? String(avg.total) : "—"} sub="全テスト平均" color="#e8f0fe" textColor={NAVY} />
          <StatCard label="4科最高" value={best ? String(best.total) : "—"} sub="過去最高" color="#e6f4ea" textColor="#137333" />
          <StatCard label="直近3回平均" value={r3 ? String(r3.total) : "—"} sub="4科計" color="#fef7e0" textColor="#b45309" />
          <StatCard label="算数平均" value={avg ? String(avg.sansu) : "—"} sub="偏差値" color="#fce8e6" textColor="#c5221f" />
        </div>

        {/* グラフ */}
        {tests.length >= 2 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">5科目偏差値推移</p>
            {/* 凡例 */}
            <div className="flex flex-wrap gap-3 mb-3">
              {LINES.map((l) => (
                <div key={l.key} className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full inline-block" style={{ backgroundColor: l.color }} />
                  <span className="text-xs text-gray-600">{l.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full inline-block" style={{ backgroundColor: totalColor }} />
                <span className="text-xs text-gray-600">4科計</span>
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
              {[Math.round(minV + range * 0.25), Math.round(minV + range * 0.5), Math.round(minV + range * 0.75)].map((v) => {
                const y = padY + iH - ((v - minV) / range) * iH;
                return (
                  <g key={v}>
                    <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#f0f0f0" strokeWidth="1" />
                    <text x={padX - 3} y={y + 3} fontSize="7" fill="#aaa" textAnchor="end">{v}</text>
                  </g>
                );
              })}
              {LINES.map((l) => (
                <polyline key={l.key} points={pts(tests.map((t) => t[l.key]))} fill="none" stroke={l.color} strokeWidth="1.8" strokeLinejoin="round" strokeOpacity="0.8" />
              ))}
              <polyline points={pts(tests.map((t) => t.total))} fill="none" stroke={totalColor} strokeWidth="2.5" strokeLinejoin="round" />
              {tests.map((t, i) => {
                const x = padX + (i / Math.max(tests.length - 1, 1)) * iW;
                const y = padY + iH - ((t.total - minV) / range) * iH;
                return <circle key={i} cx={x} cy={y} r="3.5" fill="white" stroke={totalColor} strokeWidth="2" />;
              })}
            </svg>
            {/* X軸ラベル */}
            <div className="flex overflow-x-auto mt-1" style={{ scrollbarWidth: "none" }}>
              {tests.map((t, i) => (
                <span key={i} className="flex-shrink-0 text-xs text-gray-400 text-center truncate" style={{ width: `${100 / tests.length}%` }}>
                  {t.name || t.date}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* テスト一覧表 */}
        {tests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">テスト一覧</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-gray-700 min-w-[380px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["テスト名", "国語", "算数", "理科", "社会", "4科計", "判定"].map((h) => (
                      <th key={h} className="text-center pb-2 font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 font-medium">{t.name}</td>
                      <td className="py-2 text-center">{t.kokugo}</td>
                      <td className="py-2 text-center">{t.sansu}</td>
                      <td className="py-2 text-center">{t.rika}</td>
                      <td className="py-2 text-center">{t.shakai}</td>
                      <td className="py-2 text-center font-bold" style={{ color: NAVY }}>{t.total}</td>
                      <td className="py-2 text-center">
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: t.rank === "A" ? "#dcfce7" : t.rank === "B" ? "#fef9c3" : "#fee2e2",
                            color: t.rank === "A" ? "#15803d" : t.rank === "B" ? "#92400e" : "#dc2626",
                          }}>
                          {t.rank}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── School Tab ───────────────────────────────────────
  const SchoolTab = () => {
    const schools = analysisResult?.schoolJudgments ?? [];
    return (
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        <h2 className="text-base font-bold text-gray-800">志望校分析</h2>
        {!analysisResult ? (
          <EmptyState icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L1 9l4 2.18V17h2v-4.82l1 .55V17c0 2.21 1.79 4 4 4s4-1.79 4-4v-4.27l3 1.64v-1.18L21 12V9L12 3z" /></svg>} onGoToData={() => setActiveTab("home")} />
        ) : schools.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#fef7e0" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#b45309"><path d="M12 3L1 9l4 2.18V17h2v-4.82l1 .55V17c0 2.21 1.79 4 4 4s4-1.79 4-4v-4.27l3 1.64v-1.18L21 12V9L12 3z" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">志望校データが見つかりませんでした</p>
              <p className="text-xs text-gray-400 leading-relaxed">ファイルに志望校情報が含まれていない場合は、<br />AIチャットで志望校を直接伝えてください。</p>
            </div>
            <button
              onClick={() => { setActiveTab("home"); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: NAVY }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
              AIに志望校を伝える
            </button>
          </div>
        ) : (
          schools.map((school, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-800">{school.name}</p>
                  <p className="text-xs text-gray-500">{school.tag}</p>
                </div>
                <span className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: school.currentJudgment === "A判定" ? "#dcfce7" : school.currentJudgment === "B判定" ? "#fef9c3" : "#fee2e2",
                    color: school.currentJudgment === "A判定" ? "#15803d" : school.currentJudgment === "B判定" ? "#92400e" : "#dc2626",
                  }}>
                  {school.currentJudgment}
                </span>
              </div>

              {/* 科目別差分 */}
              {school.diffs && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {(["kokugo", "sansu", "rika", "shakai"] as const).map((k) => {
                    const v = school.diffs[k];
                    const label = k === "kokugo" ? "国語" : k === "sansu" ? "算数" : k === "rika" ? "理科" : "社会";
                    return (
                      <div key={k} className="text-center rounded-lg py-1.5" style={{ backgroundColor: "#f8faff" }}>
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="text-xs font-bold" style={{ color: v > 0 ? "#dc2626" : "#15803d" }}>
                          {v > 0 ? `+${v}` : v}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 text-xs mb-3">
                {school.strongSubjects && (
                  <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>強: {school.strongSubjects}</span>
                )}
                {school.weakSubjects && (
                  <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>弱: {school.weakSubjects}</span>
                )}
              </div>

              <div className="rounded-xl p-3 mb-2" style={{ backgroundColor: "#f8faff" }}>
                <p className="text-xs text-gray-500 mb-1">対策方針</p>
                <p className="text-sm text-gray-700 leading-relaxed">{school.strategy}</p>
              </div>

              {school.decisionTiming && (
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#6b7280"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" /></svg>
                  <span className="text-xs text-gray-500">判断時期: {school.decisionTiming}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  const tabContent: Record<Tab, React.ReactNode> = {
    home: <HomeTab />, data: <DataTab />, weakness: <WeaknessTab />,
    routine: <RoutineTab />, trend: <TrendTab />, school: <SchoolTab />,
  };

  // ─── Layout ───────────────────────────────────────────
  return (
    <div style={{ background: BG, minHeight: "100dvh" }}>
      {/* PC */}
      <div className="hidden sm:flex mx-auto overflow-hidden" style={{ maxWidth: 1024, height: "100dvh" }}>
        <aside className="w-56 flex-shrink-0 flex flex-col bg-white border-r border-gray-200 overflow-y-auto" style={{ height: "100dvh" }}>
          <div className="flex items-center gap-2 px-5 py-4 flex-shrink-0" style={{ backgroundColor: NAVY }}>
            <BarChartIcon />
            <span className="text-white font-bold text-lg tracking-tight">StudyLens</span>
          </div>
          <nav className="flex-1 py-2">
            {tabs.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button key={id} onClick={() => setActiveTab(id)}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors hover:bg-gray-50"
                  style={{ color: active ? NAVY : "#6b7280", backgroundColor: active ? "#e8f0fe" : "transparent", borderRight: active ? `3px solid ${NAVY}` : "3px solid transparent" }}>
                  <Icon active={active} />{label}
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: NAVY }}>{avatarChar}</div>
            <span className="text-sm text-gray-700 flex-1 truncate">{userName}</span>
            <button onClick={() => signOut()} className="text-gray-400 text-xs hover:text-gray-600 transition-colors flex-shrink-0">ログアウト</button>
          </div>
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">{tabContent[activeTab]}</div>
      </div>

      {/* Mobile */}
      <div className="flex flex-col sm:hidden mx-auto" style={{ maxWidth: 480, minHeight: "100dvh" }}>
        <header className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center gap-2"><BarChartIcon /><span className="text-white font-bold text-lg tracking-tight">StudyLens</span></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 text-white text-sm font-bold">{avatarChar}</div>
            <button onClick={() => signOut()} className="text-white/80 text-xs border border-white/30 rounded-full px-2.5 py-1 hover:bg-white/10 transition-colors ml-1">ログアウト</button>
          </div>
        </header>
        <div className="flex-1 flex flex-col overflow-hidden">{tabContent[activeTab]}</div>
        <nav className="flex border-t border-gray-200 flex-shrink-0 bg-white" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {tabs.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)} className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors">
                <Icon active={active} />
                <span className="text-[10px] font-medium" style={{ color: active ? NAVY : "#9ca3af" }}>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

// ─── Sub Components ────────────────────────────────────────
function EmptyState({ icon, onGoToData }: { icon: React.ReactNode; onGoToData: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl shadow-sm">
      <div className="mb-4 opacity-60">{icon}</div>
      <p className="text-base font-semibold text-gray-700 mb-2">まだデータがありません</p>
      <p className="text-xs text-gray-400 leading-relaxed mb-6">ホームからGoogle DriveのURLを入力して<br />AI分析を開始すると自動で表示されます</p>
      <button onClick={onGoToData} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "#0C447C" }}>
        ホームで分析する
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" /></svg>
      </button>
    </div>
  );
}

function StatCard({ label, value, sub, color, textColor }: { label: string; value: string; sub: string; color: string; textColor: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: color }}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color: textColor }}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

function TypingDot({ delay }: { delay: number }) {
  return (
    <span className="w-2 h-2 rounded-full inline-block"
      style={{ backgroundColor: "#9ca3af", animation: "typingBounce 1.2s ease-in-out infinite", animationDelay: `${delay}s` }} />
  );
}

"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Tab = "home" | "data" | "weakness" | "routine" | "trend" | "school";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
};

type WeaknessItem = {
  subject: string;
  topic: string;
  count: number;
  accuracy: number;
  priority: "高" | "中" | "低";
  measure: string;
};

type AnalysisResult = {
  deviationScores: {
    japanese: number;
    math: number;
    science: number;
    social: number;
    total: number;
  };
  weaknesses: WeaknessItem[];
  schoolJudgments: Array<{
    name: string;
    rank: string;
    judgment: string;
    diff: string;
    strategy: string;
  }>;
  trendData?: number[];
};

const QUICK_QUESTIONS = [
  "国語の読解力を上げるには？",
  "算数の比・割合の解き方を教えて",
  "毎日の勉強ルーティーンを作りたい",
  "志望校の合格戦略を立てて",
  "過去問の使い方を教えて",
  "模試の復習方法は？",
];

const NAVY = "#0C447C";
const BG = "#f5f5f3";

// ── アイコン SVG ──────────────────────────────────────────
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
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? NAVY : "#9ca3af"}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function DataIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? NAVY : "#9ca3af"}>
      <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3a1 1 0 110 2 1 1 0 010-2zm0 4a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  );
}

function WeaknessIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? NAVY : "#9ca3af"}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

function RoutineIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? NAVY : "#9ca3af"}>
      <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-1V1h-2zm3 18H5V8h14v11z" />
    </svg>
  );
}

function TrendIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? NAVY : "#9ca3af"}>
      <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
    </svg>
  );
}

function SchoolIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? NAVY : "#9ca3af"}>
      <path d="M12 3L1 9l4 2.18V17h2v-4.82l1 .55V17c0 2.21 1.79 4 4 4s4-1.79 4-4v-4.27l3 1.64v-1.18L21 12V9L12 3zm6.18 6L12 12.72 5.82 9 12 5.28 18.18 9zM16 17c0 1.1-.9 2-2 2H10c-1.1 0-2-.9-2-2v-3.45l4 2.19 4-2.19V17z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
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
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
    >
      <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
      <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" />
    </svg>
  );
}

function fileMimeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "application/vnd.google-apps.document") return "DOC";
  if (mimeType === "application/vnd.google-apps.spreadsheet") return "XLS";
  if (mimeType.startsWith("image/")) return "IMG";
  if (mimeType.startsWith("text/")) return "TXT";
  return "FILE";
}

function extractFolderId(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// ── メインコンポーネント ──────────────────────────────────
export default function Home() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("home");

  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Drive
  const [driveUrl, setDriveUrl] = useState("");
  const [fileListStatus, setFileListStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fileListError, setFileListError] = useState("");
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);

  // Analysis
  const [analyzeStatus, setAnalyzeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  async function sendMessage(text: string) {
    if (!text.trim() || chatLoading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error("APIエラー");
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "エラーが発生しました。もう一度お試しください。" },
      ]);
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
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: driveFiles }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "分析に失敗しました");
      }
      const data: AnalysisResult = await res.json();
      setAnalysisResult(data);
      setAnalyzeStatus("success");
    } catch {
      setAnalyzeStatus("error");
    }
  }

  // ── ローディング画面 ─────────────────────────────────────
  if (status === "loading") {
    return (
      <div style={{ background: BG }} className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: NAVY }}>
            <BarChartIcon />
          </div>
          <p className="text-gray-500 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  // ── ログイン画面 ─────────────────────────────────────────
  if (!session) {
    return (
      <div style={{ background: BG }} className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-6" style={{ maxWidth: 480 }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: NAVY }}>
            <BarChartIcon />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>StudyLens</h1>
            <p className="text-gray-500 text-sm mt-2">
              AIがあなたの学習をサポートします。<br />
              Googleアカウントでログインしてください。
            </p>
          </div>
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-3 px-5 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  const userName = session.user?.name ?? "ユーザー";
  const avatarChar = userName.slice(-1);

  // ── タブ定義 ─────────────────────────────────────────────
  const tabs: { id: Tab; label: string; Icon: React.FC<{ active: boolean }> }[] = [
    { id: "home", label: "ホーム", Icon: HomeIcon },
    { id: "data", label: "データ", Icon: DataIcon },
    { id: "weakness", label: "弱点", Icon: WeaknessIcon },
    { id: "routine", label: "ルーティン", Icon: RoutineIcon },
    { id: "trend", label: "推移", Icon: TrendIcon },
    { id: "school", label: "志望校", Icon: SchoolIcon },
  ];

  // ── タブコンテンツ ─────────────────────────────────────

  // ホームタブ
  const HomeTab = () => {
    const topWeakness = analysisResult?.weaknesses?.[0];
    const topSchool = analysisResult?.schoolJudgments?.[0];
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        {/* 統計カード 2×2 */}
        <div className="grid grid-cols-2 gap-3 px-4 pt-4 pb-2 flex-shrink-0">
          <StatCard
            label="4科偏差値"
            value={analysisResult ? String(analysisResult.deviationScores.total) : "—"}
            sub={analysisResult ? `算${analysisResult.deviationScores.math}・国${analysisResult.deviationScores.japanese}` : "データなし"}
            color="#e8f0fe"
            textColor={NAVY}
          />
          <StatCard
            label="第一志望判定"
            value={topSchool?.judgment ?? "—"}
            sub={topSchool?.name ?? "データなし"}
            color="#e6f4ea"
            textColor="#137333"
          />
          <StatCard
            label="取込ファイル数"
            value={driveFiles.length > 0 ? String(driveFiles.length) : "—"}
            sub={driveFiles.length > 0 ? "取込済み" : "データなし"}
            color="#fef7e0"
            textColor="#b45309"
          />
          <StatCard
            label="最優先弱点"
            value={topWeakness?.topic ?? "—"}
            sub={topWeakness ? `正答率 ${topWeakness.accuracy}%` : "データなし"}
            color="#fce8e6"
            textColor="#c5221f"
          />
        </div>

        {/* AIチャットヘッダー */}
        <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0 bg-white border-b border-gray-100">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: NAVY }}>
            <BarChartIcon />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">StudyLens AI</p>
            <p className="text-xs" style={{ color: "#22c55e" }}>● オンライン</p>
          </div>
        </div>

        {/* メッセージ一覧 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-2 bg-white">
          {messages.length === 0 && (
            <div className="flex justify-start">
              <div
                className="max-w-[80%] px-4 py-2.5 text-sm leading-relaxed text-gray-800"
                style={{ backgroundColor: "#f0f0f0", borderRadius: "18px 18px 18px 0px" }}
              >
                こんにちは、{userName}さん！😊<br />
                中学受験の勉強について、何でも聞いてください。一緒に頑張りましょう！
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 self-end"
                  style={{ backgroundColor: NAVY }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <rect x="3" y="12" width="3" height="9" rx="0.5" />
                    <rect x="9" y="7" width="3" height="14" rx="0.5" />
                    <rect x="15" y="3" width="3" height="18" rx="0.5" />
                  </svg>
                </div>
              )}
              <div
                className="max-w-[75%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                style={
                  msg.role === "user"
                    ? { backgroundColor: NAVY, color: "white", borderRadius: "18px 18px 0px 18px" }
                    : { backgroundColor: "#f0f0f0", color: "#1f2937", borderRadius: "18px 18px 18px 0px" }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start items-end gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: NAVY }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <rect x="3" y="12" width="3" height="9" rx="0.5" />
                  <rect x="9" y="7" width="3" height="14" rx="0.5" />
                  <rect x="15" y="3" width="3" height="18" rx="0.5" />
                </svg>
              </div>
              <div
                className="px-4 py-3 flex items-center gap-1"
                style={{ backgroundColor: "#f0f0f0", borderRadius: "18px 18px 18px 0px" }}
              >
                <TypingDot delay={0} />
                <TypingDot delay={0.2} />
                <TypingDot delay={0.4} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* クイック質問 */}
        <div
          className="flex gap-2 px-3 py-2 overflow-x-auto flex-shrink-0 bg-white border-t border-gray-100"
          style={{ scrollbarWidth: "none" }}
        >
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={chatLoading}
              className="flex-shrink-0 text-xs rounded-full px-3 py-1.5 border transition-colors hover:bg-blue-50 disabled:opacity-50"
              style={{ borderColor: NAVY, color: NAVY }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* 入力欄 */}
        <div className="px-3 pb-3 pt-2 flex gap-2 flex-shrink-0 bg-white">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="メッセージを入力..."
            disabled={chatLoading}
            className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-300 bg-gray-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={chatLoading || !input.trim()}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: NAVY }}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    );
  };

  // データタブ
  const DataTab = () => (
    <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
      <h2 className="text-base font-bold text-gray-800">データ取り込み</h2>

      {/* Step 1: URL入力 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <DriveIcon />
          <div>
            <p className="text-sm font-semibold text-gray-800">Google Drive</p>
            <p className="text-xs text-gray-500">フォルダのURLを入力してください</p>
          </div>
        </div>
        <input
          type="url"
          value={driveUrl}
          onChange={(e) => {
            setDriveUrl(e.target.value);
            if (fileListStatus === "error") setFileListStatus("idle");
          }}
          placeholder="https://drive.google.com/drive/folders/..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-300 disabled:bg-gray-50"
          disabled={fileListStatus === "loading"}
        />

        {fileListStatus === "loading" && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <SpinnerIcon color="#6b7280" />
            <span>ファイル一覧を取得中...</span>
          </div>
        )}

        {fileListStatus === "error" && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "#fef2f2" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc2626">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <span className="text-sm" style={{ color: "#dc2626" }}>{fileListError}</span>
          </div>
        )}

        <button
          onClick={handleFetchFiles}
          disabled={fileListStatus === "loading" || !driveUrl.trim()}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: NAVY }}
        >
          {fileListStatus === "loading" ? (
            <span className="flex items-center justify-center gap-2">
              <SpinnerIcon />取得中...
            </span>
          ) : "ファイル一覧を取得"}
        </button>
      </div>

      {/* Step 2: ファイル一覧 + 分析 */}
      {fileListStatus === "success" && (
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold text-gray-800">
            取得したファイル（{driveFiles.length}件）
          </p>

          {driveFiles.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">
              フォルダ内にファイルが見つかりませんでした
            </p>
          ) : (
            <div>
              {driveFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0"
                >
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-600">
                      {fileMimeLabel(file.mimeType)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                </div>
              ))}
            </div>
          )}

          {driveFiles.length > 0 && analyzeStatus !== "success" && (
            <button
              onClick={handleAnalyze}
              disabled={analyzeStatus === "loading"}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#16a34a" }}
            >
              {analyzeStatus === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <SpinnerIcon />AI分析中...（しばらくお待ちください）
                </span>
              ) : "AIで分析する"}
            </button>
          )}

          {analyzeStatus === "error" && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "#fef2f2" }}>
              <span className="text-sm" style={{ color: "#dc2626" }}>
                分析に失敗しました。もう一度お試しください。
              </span>
            </div>
          )}

          {analyzeStatus === "success" && (
            <div className="flex flex-col gap-2 px-3 py-3 rounded-xl" style={{ backgroundColor: "#f0fdf4" }}>
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#16a34a">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span className="text-sm font-medium" style={{ color: "#15803d" }}>
                  AI分析が完了しました
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setActiveTab("weakness")}
                  className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ backgroundColor: "#dcfce7", color: "#15803d" }}
                >
                  弱点分析を見る →
                </button>
                <button
                  onClick={() => setActiveTab("trend")}
                  className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ backgroundColor: "#dcfce7", color: "#15803d" }}
                >
                  偏差値推移を見る →
                </button>
                <button
                  onClick={() => setActiveTab("school")}
                  className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ backgroundColor: "#dcfce7", color: "#15803d" }}
                >
                  志望校分析を見る →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // 弱点タブ
  const WeaknessTab = () => {
    const weaknesses = analysisResult?.weaknesses ?? [];
    const subjects = [...new Set(weaknesses.map((w) => w.subject))];

    return (
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        <h2 className="text-base font-bold text-gray-800">弱点分析</h2>
        {!analysisResult ? (
          <EmptyState
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            }
            onGoToData={() => setActiveTab("data")}
          />
        ) : weaknesses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-sm text-gray-400 py-4">弱点データがありませんでした</p>
          </div>
        ) : (
          subjects.map((subject) => (
            <div key={subject} className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-sm font-bold text-gray-800 mb-3">{subject}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-gray-700 min-w-[340px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left pb-2 font-medium text-gray-500">項目</th>
                      <th className="text-center pb-2 font-medium text-gray-500">回数</th>
                      <th className="text-center pb-2 font-medium text-gray-500">正答率</th>
                      <th className="text-center pb-2 font-medium text-gray-500">優先度</th>
                      <th className="text-left pb-2 font-medium text-gray-500">対策</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weaknesses
                      .filter((w) => w.subject === subject)
                      .map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 font-medium">{row.topic}</td>
                          <td className="py-2.5 text-center">{row.count}</td>
                          <td className="py-2.5 text-center">{row.accuracy}%</td>
                          <td className="py-2.5 text-center">
                            <span
                              className="px-1.5 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor:
                                  row.priority === "高" ? "#fee2e2" : row.priority === "中" ? "#fef9c3" : "#f0fdf4",
                                color:
                                  row.priority === "高" ? "#dc2626" : row.priority === "中" ? "#92400e" : "#15803d",
                              }}
                            >
                              {row.priority}
                            </span>
                          </td>
                          <td className="py-2.5 text-gray-600">{row.measure}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // ルーティンタブ
  const RoutineTab = () => (
    <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
      <h2 className="text-base font-bold text-gray-800">ルーティーン設計</h2>
      <EmptyState
        icon={
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
          </svg>
        }
        onGoToData={() => setActiveTab("data")}
      />
    </div>
  );

  // 推移タブ
  const TrendTab = () => {
    const scores = analysisResult?.deviationScores;
    const raw = analysisResult?.trendData ?? [];
    const trendData = raw.length >= 2 ? raw : null;

    if (!analysisResult) {
      return (
        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
          <h2 className="text-base font-bold text-gray-800">偏差値推移</h2>
          <EmptyState
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
            onGoToData={() => setActiveTab("data")}
          />
        </div>
      );
    }

    const weakestScore = Math.min(scores!.japanese, scores!.math, scores!.science, scores!.social);
    const weakestLabel =
      weakestScore === scores!.japanese ? "国語" :
      weakestScore === scores!.math ? "算数" :
      weakestScore === scores!.science ? "理科" : "社会";

    return (
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        <h2 className="text-base font-bold text-gray-800">偏差値推移</h2>

        {/* 科目別偏差値 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">科目別偏差値</p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="国語" value={String(scores!.japanese)} sub="偏差値" color="#e0f2fe" textColor="#0369a1" />
            <StatCard label="算数" value={String(scores!.math)} sub="偏差値" color="#fef3c7" textColor="#92400e" />
            <StatCard label="理科" value={String(scores!.science)} sub="偏差値" color="#f0fdf4" textColor="#166534" />
            <StatCard label="社会" value={String(scores!.social)} sub="偏差値" color="#faf5ff" textColor="#6b21a8" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="4科総合" value={String(scores!.total)} sub="偏差値" color="#e8f0fe" textColor={NAVY} />
          <StatCard label="要強化科目" value={weakestLabel} sub={`偏差値 ${weakestScore}`} color="#fce8e6" textColor="#c5221f" />
        </div>

        {/* 推移グラフ（trendDataがある場合） */}
        {trendData && (() => {
          const data = trendData;
          const minV = Math.min(...data) - 3;
          const maxV = Math.max(...data) + 3;
          const range = maxV - minV;
          const W = 300;
          const H = 120;
          const padX = 20;
          const padY = 10;
          const innerW = W - padX * 2;
          const innerH = H - padY * 2;
          const points = data.map((v, i) => {
            const x = padX + (i / (data.length - 1)) * innerW;
            const y = padY + innerH - ((v - minV) / range) * innerH;
            return `${x},${y}`;
          });
          return (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-800 mb-4">4科偏差値の推移</p>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                {[Math.round(minV + range * 0.25), Math.round(minV + range * 0.5), Math.round(minV + range * 0.75)].map((v) => {
                  const y = padY + innerH - ((v - minV) / range) * innerH;
                  return (
                    <g key={v}>
                      <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#f0f0f0" strokeWidth="1" />
                      <text x={padX - 2} y={y + 3} fontSize="8" fill="#aaa" textAnchor="end">{v}</text>
                    </g>
                  );
                })}
                <polyline points={points.join(" ")} fill="none" stroke={NAVY} strokeWidth="2.5" strokeLinejoin="round" />
                {data.map((v, i) => {
                  const x = padX + (i / (data.length - 1)) * innerW;
                  const y = padY + innerH - ((v - minV) / range) * innerH;
                  return <circle key={i} cx={x} cy={y} r="4" fill="white" stroke={NAVY} strokeWidth="2" />;
                })}
              </svg>
            </div>
          );
        })()}
      </div>
    );
  };

  // 志望校タブ
  const SchoolTab = () => {
    const schools = analysisResult?.schoolJudgments ?? [];
    return (
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        <h2 className="text-base font-bold text-gray-800">志望校分析</h2>
        {!analysisResult ? (
          <EmptyState
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3L1 9l4 2.18V17h2v-4.82l1 .55V17c0 2.21 1.79 4 4 4s4-1.79 4-4v-4.27l3 1.64v-1.18L21 12V9L12 3z" />
              </svg>
            }
            onGoToData={() => setActiveTab("data")}
          />
        ) : schools.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-sm text-gray-400 py-4">志望校データがありませんでした</p>
          </div>
        ) : (
          schools.map((school, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-800">{school.name}</p>
                  <p className="text-xs text-gray-500">{school.rank}</p>
                </div>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{
                    backgroundColor:
                      school.judgment === "A判定" ? "#dcfce7" :
                      school.judgment === "B判定" ? "#fef9c3" : "#fee2e2",
                    color:
                      school.judgment === "A判定" ? "#15803d" :
                      school.judgment === "B判定" ? "#92400e" : "#dc2626",
                  }}
                >
                  {school.judgment}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-500">合格偏差値まで</span>
                <span className="text-sm font-bold" style={{ color: NAVY }}>偏差値 {school.diff}</span>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: "#f8faff" }}>
                <p className="text-xs text-gray-500 mb-1">対策方針</p>
                <p className="text-sm text-gray-700 leading-relaxed">{school.strategy}</p>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const tabContent: Record<Tab, React.ReactNode> = {
    home: <HomeTab />,
    data: <DataTab />,
    weakness: <WeaknessTab />,
    routine: <RoutineTab />,
    trend: <TrendTab />,
    school: <SchoolTab />,
  };

  // ── レイアウト ───────────────────────────────────────────
  return (
    <div style={{ background: BG, minHeight: "100dvh" }}>

      {/* ══ PC レイアウト（641px〜）══════════════════════════ */}
      <div
        className="hidden sm:flex mx-auto overflow-hidden"
        style={{ maxWidth: 1024, height: "100dvh" }}
      >
        {/* サイドナビ */}
        <aside
          className="w-56 flex-shrink-0 flex flex-col bg-white border-r border-gray-200 overflow-y-auto"
          style={{ height: "100dvh" }}
        >
          <div
            className="flex items-center gap-2 px-5 py-4 flex-shrink-0"
            style={{ backgroundColor: NAVY }}
          >
            <BarChartIcon />
            <span className="text-white font-bold text-lg tracking-tight">StudyLens</span>
          </div>

          <nav className="flex-1 py-2">
            {tabs.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors hover:bg-gray-50"
                  style={{
                    color: active ? NAVY : "#6b7280",
                    backgroundColor: active ? "#e8f0fe" : "transparent",
                    borderRight: active ? `3px solid ${NAVY}` : "3px solid transparent",
                  }}
                >
                  <Icon active={active} />
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: NAVY }}
            >
              {avatarChar}
            </div>
            <span className="text-sm text-gray-700 flex-1 truncate">{userName}</span>
            <button
              onClick={() => signOut()}
              className="text-gray-400 text-xs hover:text-gray-600 transition-colors flex-shrink-0"
            >
              ログアウト
            </button>
          </div>
        </aside>

        {/* コンテンツエリア */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {tabContent[activeTab]}
        </div>
      </div>

      {/* ══ モバイルレイアウト（〜640px）══════════════════════ */}
      <div
        className="flex flex-col sm:hidden mx-auto"
        style={{ maxWidth: 480, minHeight: "100dvh" }}
      >
        <header
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ backgroundColor: NAVY }}
        >
          <div className="flex items-center gap-2">
            <BarChartIcon />
            <span className="text-white font-bold text-lg tracking-tight">StudyLens</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 text-white text-sm font-bold">
              {avatarChar}
            </div>
            <button
              onClick={() => signOut()}
              className="text-white/80 text-xs border border-white/30 rounded-full px-2.5 py-1 hover:bg-white/10 transition-colors ml-1"
            >
              ログアウト
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          {tabContent[activeTab]}
        </div>

        <nav
          className="flex border-t border-gray-200 flex-shrink-0 bg-white"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {tabs.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors"
              >
                <Icon active={active} />
                <span className="text-[10px] font-medium" style={{ color: active ? NAVY : "#9ca3af" }}>
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

// ── サブコンポーネント ─────────────────────────────────────

function EmptyState({
  icon,
  onGoToData,
}: {
  icon: React.ReactNode;
  onGoToData: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl shadow-sm">
      <div className="mb-4 opacity-60">{icon}</div>
      <p className="text-base font-semibold text-gray-700 mb-2">まだデータがありません</p>
      <p className="text-xs text-gray-400 leading-relaxed mb-6">
        データタブからGoogle Driveのフォルダを<br />取り込むと自動で表示されます
      </p>
      <button
        onClick={onGoToData}
        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#0C447C" }}
      >
        データを取り込む
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
        </svg>
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  textColor,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  textColor: string;
}) {
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
    <span
      className="w-2 h-2 rounded-full inline-block"
      style={{
        backgroundColor: "#9ca3af",
        animation: `typingBounce 1.2s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

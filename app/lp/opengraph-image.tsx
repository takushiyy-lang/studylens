import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "StudyLens - AIで中学受験の最短合格ルートを";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0C447C 0%, #1a5c9e 55%, #0e6db5 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 背景装飾 */}
        <div style={{ position: "absolute", top: -120, right: -120, width: 500, height: 500, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -100, left: -80, width: 350, height: 350, borderRadius: "50%", background: "rgba(255,255,255,0.04)", display: "flex" }} />

        {/* メインコンテンツ */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", padding: "60px 80px", gap: 60 }}>
          {/* 左: テキスト */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {/* ロゴ行 */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
              {/* バーチャートアイコン */}
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: "rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="32" height="32" viewBox="0 0 32 32">
                  <rect x="4" y="20" width="5" height="10" rx="1.5" fill="white" />
                  <rect x="12" y="13" width="5" height="17" rx="1.5" fill="white" />
                  <rect x="20" y="7" width="5" height="23" rx="1.5" fill="white" />
                  <circle cx="27" cy="7" r="4" fill="none" stroke="#63c5f5" strokeWidth="2.2" />
                  <line x1="30" y1="10" x2="32" y2="12" stroke="#63c5f5" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ fontSize: 36, fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>
                StudyLens
              </span>
            </div>

            {/* バッジ */}
            <div style={{
              display: "flex", alignItems: "center",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 24, padding: "8px 20px",
              width: "fit-content", marginBottom: 28,
            }}>
              <span style={{ fontSize: 20, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                🎯 中学受験専用 AI学習サポート
              </span>
            </div>

            {/* キャッチコピー */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 28 }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: "white", lineHeight: 1.2 }}>
                子どもの成績データから
              </span>
              <span style={{ fontSize: 52, fontWeight: 900, color: "#7dd3fc", lineHeight: 1.2 }}>
                最短合格ルート
              </span>
              <span style={{ fontSize: 52, fontWeight: 900, color: "white", lineHeight: 1.2 }}>
                をAIが導き出す
              </span>
            </div>

            {/* 説明 */}
            <span style={{ fontSize: 22, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
              模試・テストのデータをGoogle Driveに入れるだけ。無料で今すぐ始められます。
            </span>
          </div>

          {/* 右: モックカード */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 14,
            width: 300, flexShrink: 0,
          }}>
            {[
              { label: "4科偏差値", value: "48.2", sub: "算51・国43", bg: "#e8f0fe", color: "#0C447C" },
              { label: "最優先弱点", value: "比・割合", sub: "正答率 20〜40%", bg: "#fce8e6", color: "#c5221f" },
              { label: "直近3回平均", value: "+1.2", sub: "前回比", bg: "#e6f4ea", color: "#15803d" },
            ].map((card) => (
              <div key={card.label} style={{
                background: "white",
                borderRadius: 16, padding: "16px 20px",
                display: "flex", flexDirection: "column", gap: 4,
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              }}>
                <span style={{ fontSize: 14, color: "#6b7280" }}>{card.label}</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</span>
                <span style={{ fontSize: 14, color: "#9ca3af" }}>{card.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 下部バー */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.2)", padding: "16px 80px",
        }}>
          <span style={{ fontSize: 18, color: "rgba(255,255,255,0.7)" }}>
            ✓ 完全無料 &nbsp;&nbsp; ✓ クレジットカード不要 &nbsp;&nbsp; ✓ 1分で開始
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}

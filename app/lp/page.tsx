import Link from "next/link";

const NAVY = "#0C447C";
const LIGHT_NAVY = "#1a5c9e";

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Hiragino Sans', 'Noto Sans JP', sans-serif", color: "#1a1a2e", overflowX: "hidden" }}>

      {/* ── ナビゲーション ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "white", borderBottom: "1px solid #e5e7eb", padding: "0 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="7" fill={NAVY} />
              <rect x="4" y="20" width="5" height="8" rx="1.5" fill="white" />
              <rect x="11" y="14" width="5" height="14" rx="1.5" fill="white" />
              <rect x="18" y="9" width="5" height="19" rx="1.5" fill="white" />
              <circle cx="25.5" cy="9.5" r="4" fill="none" stroke="#63c5f5" strokeWidth="2" />
              <line x1="28.3" y1="12.3" x2="30.5" y2="14.5" stroke="#63c5f5" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span style={{ fontWeight: 800, fontSize: 20, color: NAVY }}>StudyLens</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="#features" style={{ fontSize: 14, color: "#4b5563", textDecoration: "none" }}>機能</Link>
            <Link href="#howto" style={{ fontSize: 14, color: "#4b5563", textDecoration: "none" }}>使い方</Link>
            <Link href="/" style={{ fontSize: 14, fontWeight: 700, color: "white", background: NAVY, padding: "8px 20px", borderRadius: 24, textDecoration: "none" }}>
              無料で始める
            </Link>
          </div>
        </div>
      </nav>

      {/* ── ヒーロー ── */}
      <section style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a5c9e 50%, #0e6db5 100%)`, padding: "80px 24px 100px", position: "relative", overflow: "hidden" }}>
        {/* 背景装飾 */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 600, marginBottom: 20 }}>
              🎯 中学受験専用 AI学習サポート
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 900, color: "white", lineHeight: 1.25, marginBottom: 20 }}>
              子どもの成績データから<br />
              <span style={{ color: "#7dd3fc" }}>最短合格ルート</span>を<br />
              AIが導き出す
            </h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", lineHeight: 1.8, marginBottom: 36 }}>
              模試・テストのデータをGoogle Driveに入れるだけ。<br />
              AIが弱点を自動分析し、今日から何をすべきか<br />
              具体的なアドバイスをお届けします。
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "white", color: NAVY, fontWeight: 800, fontSize: 16, padding: "14px 32px", borderRadius: 32, textDecoration: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" fill="#4285F4"/></svg>
                Googleで無料ログイン
              </Link>
              <Link href="#features" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "white", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 32, textDecoration: "none", border: "2px solid rgba(255,255,255,0.4)" }}>
                機能を見る →
              </Link>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 16 }}>
              ✓ 無料 &nbsp; ✓ クレジットカード不要 &nbsp; ✓ 1分で開始
            </p>
          </div>

          {/* アプリスクリーンショット */}
          <div style={{ position: "relative" }}>
            <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.35)", transform: "perspective(1000px) rotateY(-5deg) rotateX(2deg)" }}>
              {/* モック画面 */}
              <div style={{ background: NAVY, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="white" fillOpacity="0.2"/><rect x="4" y="20" width="5" height="8" rx="1.5" fill="white"/><rect x="11" y="14" width="5" height="14" rx="1.5" fill="white"/><rect x="18" y="9" width="5" height="19" rx="1.5" fill="white"/></svg>
                <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>StudyLens</span>
              </div>
              {/* スクリーンショット配置エリア */}
              {/* screenshots/hero.png を追加してください */}
              <div style={{ background: "#f5f5f3", padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  {[
                    { label: "4科偏差値", value: "48.2", sub: "算51.5・国43.3", bg: "#e8f0fe", color: NAVY },
                    { label: "最優先弱点", value: "比・割合", sub: "正答率 20〜40%", bg: "#fce8e6", color: "#c5221f" },
                    { label: "取込ファイル数", value: "16", sub: "取込済み", bg: "#fef7e0", color: "#b45309" },
                    { label: "直近3回平均", value: "47.8", sub: "前回比 +1.2", bg: "#e6f4ea", color: "#15803d" },
                  ].map((card) => (
                    <div key={card.label} style={{ background: card.bg, borderRadius: 12, padding: "10px 12px" }}>
                      <p style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{card.label}</p>
                      <p style={{ fontSize: 18, fontWeight: 800, color: card.color }}>{card.value}</p>
                      <p style={{ fontSize: 10, color: "#9ca3af" }}>{card.sub}</p>
                    </div>
                  ))}
                </div>
                {/* AIチャット */}
                <div style={{ background: "white", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="3" y="12" width="3" height="9" rx="0.5"/><rect x="9" y="7" width="3" height="14" rx="0.5"/><rect x="15" y="3" width="3" height="18" rx="0.5"/></svg>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#1f2937" }}>StudyLens AI</p>
                      <p style={{ fontSize: 10, color: "#22c55e" }}>● オンライン</p>
                    </div>
                  </div>
                  <div style={{ background: "#f0f0f0", borderRadius: "12px 12px 12px 0", padding: "8px 12px", fontSize: 11, color: "#374151", lineHeight: 1.6, maxWidth: "80%" }}>
                    比・割合が最優先弱点です。4〜6月に集中して基本型の反復練習をしましょう！
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 共感セクション ── */}
      <section style={{ background: "#fff8f0", padding: "72px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>
            こんなお悩み、ありませんか？
          </h2>
          <p style={{ color: "#6b7280", fontSize: 15, marginBottom: 48 }}>中学受験を控えたお子さまを持つ保護者の声</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { emoji: "😟", text: "模試の結果を見ても、何から手をつければいいか分からない" },
              { emoji: "📊", text: "偏差値が上がったり下がったり、成績の波の原因が分からない" },
              { emoji: "⏰", text: "毎日の勉強、何をどの順番でやればいいか迷ってしまう" },
              { emoji: "📚", text: "塾の先生に相談したくても、忙しくてなかなか聞けない" },
              { emoji: "💸", text: "個別指導を増やしたいが、費用面でなかなか踏み切れない" },
              { emoji: "😰", text: "受験まで残り少ない時間、本当にこの勉強法で大丈夫か不安" },
            ].map((item, i) => (
              <div key={i} style={{ background: "white", borderRadius: 16, padding: "24px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "left" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{item.emoji}</div>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>「{item.text}」</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 48, background: NAVY, borderRadius: 20, padding: "32px 40px", color: "white" }}>
            <p style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
              StudyLens はそのすべてを解決します
            </p>
            <p style={{ fontSize: 15, opacity: 0.85 }}>AIがデータを分析して、今日から何をすべきか具体的に教えてくれます</p>
          </div>
        </div>
      </section>

      {/* ── 機能紹介 ── */}
      <section id="features" style={{ padding: "80px 24px", background: "white" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ display: "inline-block", background: "#e8f0fe", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: NAVY, fontWeight: 600, marginBottom: 16 }}>
              主な機能
            </div>
            <h2 style={{ fontSize: 34, fontWeight: 900, color: "#1a1a2e" }}>
              成績向上に必要なすべてが<br />ひとつのアプリに
            </h2>
          </div>

          {/* 機能1：弱点分析 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", marginBottom: 80 }}>
            <div>
              <div style={{ display: "inline-block", background: "#fee2e2", borderRadius: 8, padding: "4px 12px", fontSize: 12, color: "#dc2626", fontWeight: 700, marginBottom: 16 }}>弱点分析</div>
              <h3 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", marginBottom: 16, lineHeight: 1.4 }}>
                科目・単元ごとの弱点を<br />AIが自動で特定
              </h3>
              <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.8, marginBottom: 24 }}>
                国語・算数・理科・社会の全単元を分析。
                正答率・出題回数・傾向を一覧表示し、
                どの単元を優先して学習すべきか優先度付きで示します。
              </p>
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {["優先度「最高〜低」で今日やるべき単元が一目でわかる", "各単元に対策方法を具体的に提示", "4科目すべてを横断的に分析"].map((t) => (
                  <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#374151" }}>
                    <span style={{ color: "#16a34a", fontWeight: 700, flexShrink: 0 }}>✓</span>{t}
                  </li>
                ))}
              </ul>
            </div>
            {/* スクリーンショット */}
            <div style={{ background: "#f8faff", borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(12,68,124,0.12)" }}>
              {/* screenshots/weakness.png を配置してください */}
              <div style={{ padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>弱点分析 — 国語</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr 1fr", gap: 4, fontSize: 11, color: "#9ca3af", padding: "4px 0", borderBottom: "1px solid #e5e7eb", marginBottom: 8 }}>
                  <span>分野</span><span>単元</span><span>回数</span><span>正答率</span><span>傾向</span><span>評価</span><span>優先</span>
                </div>
                {[
                  { field: "読解", unit: "接続語・副詞の空欄補充", count: "13回", rate: "20〜40%", priority: "最高", bg: "#fee2e2", color: "#dc2626" },
                  { field: "読解", unit: "説明文の理由・根拠説明", count: "10回", rate: "25〜45%", priority: "最高", bg: "#fee2e2", color: "#dc2626" },
                  { field: "語彙", unit: "慣用句・ことわざ", count: "6回", rate: "0〜20%", priority: "最高", bg: "#fee2e2", color: "#dc2626" },
                  { field: "読解", unit: "心情理解・場面把握", count: "7回", rate: "40〜60%", priority: "高", bg: "#ffedd5", color: "#c2410c" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr 1fr", gap: 4, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: 11 }}>
                    <span style={{ color: "#6b7280" }}>{row.field}</span>
                    <span style={{ color: "#1f2937", fontWeight: 500 }}>{row.unit}</span>
                    <span style={{ color: "#6b7280" }}>{row.count}</span>
                    <span style={{ color: "#6b7280" }}>{row.rate}</span>
                    <span style={{ color: "#9ca3af", fontSize: 10 }}>—</span>
                    <span style={{ color: "#dc2626", fontWeight: 700 }}>×</span>
                    <span style={{ background: row.bg, color: row.color, padding: "2px 6px", borderRadius: 4, fontWeight: 700, fontSize: 10, textAlign: "center" }}>{row.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 機能2：偏差値推移 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", marginBottom: 80, direction: "rtl" }}>
            <div style={{ direction: "ltr" }}>
              <div style={{ display: "inline-block", background: "#e8f0fe", borderRadius: 8, padding: "4px 12px", fontSize: 12, color: NAVY, fontWeight: 700, marginBottom: 16 }}>偏差値推移</div>
              <h3 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", marginBottom: 16, lineHeight: 1.4 }}>
                模試の成績推移を<br />グラフで見える化
              </h3>
              <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.8, marginBottom: 24 }}>
                複数回の模試データを時系列で管理。
                4科目の偏差値推移グラフで成長を実感でき、
                成績の波の原因も把握できます。
              </p>
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {["平均・最高・直近3回平均を自動計算", "科目別の強み・弱みが一目でわかる", "前回比較で成長を実感"].map((t) => (
                  <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#374151" }}>
                    <span style={{ color: "#16a34a", fontWeight: 700, flexShrink: 0 }}>✓</span>{t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ direction: "ltr", background: "#f8faff", borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(12,68,124,0.12)", padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 16 }}>偏差値推移</p>
              {/* 簡易グラフ */}
              <div style={{ position: "relative", height: 120, marginBottom: 12 }}>
                <svg width="100%" height="120" viewBox="0 0 300 120">
                  <polyline points="20,90 70,75 120,85 170,65 220,55 270,58" fill="none" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="20,95 70,85 120,90 170,78 220,72 270,68" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,2" />
                  {[{x:20,y:90},{x:70,y:75},{x:120,y:85},{x:170,y:65},{x:220,y:55},{x:270,y:58}].map((p,i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill={NAVY} />
                  ))}
                  {/* グリッド線 */}
                  {[40,60,80,100].map(y => (
                    <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#e5e7eb" strokeWidth="1" />
                  ))}
                </svg>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {[{ label: "平均", value: "48.2", color: NAVY }, { label: "最高", value: "52.1", color: "#16a34a" }, { label: "直近3回", value: "47.8", color: "#b45309" }].map(s => (
                  <div key={s.label} style={{ flex: 1, background: "white", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: "#9ca3af" }}>{s.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 機能3：ルーティン */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", marginBottom: 80 }}>
            <div>
              <div style={{ display: "inline-block", background: "#e6f4ea", borderRadius: 8, padding: "4px 12px", fontSize: 12, color: "#15803d", fontWeight: 700, marginBottom: 16 }}>学習ルーティン</div>
              <h3 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", marginBottom: 16, lineHeight: 1.4 }}>
                AIが最適な<br />毎日の学習スケジュールを作成
              </h3>
              <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.8, marginBottom: 24 }}>
                弱点分析の結果をもとに、今週・今月やるべき
                学習内容を自動でスケジュール化。
                時間配分から教材まで具体的に提案します。
              </p>
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {["時間帯別の学習メニューを自動生成", "重要度に合わせた時間配分を最適化", "受験までのバックキャスト計画も提示"].map((t) => (
                  <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#374151" }}>
                    <span style={{ color: "#16a34a", fontWeight: 700, flexShrink: 0 }}>✓</span>{t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: "#f0fdf4", borderRadius: 20, padding: 20, boxShadow: "0 8px 32px rgba(22,163,74,0.12)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>今週の学習ルーティン</p>
              {[
                { time: "06:30〜07:00", subject: "算数", menu: "計算練習・比・割合の基本問題", imp: "最高" },
                { time: "16:00〜17:30", subject: "国語", menu: "読解問題2題＋接続語の分類", imp: "最高" },
                { time: "17:30〜18:00", subject: "理科", menu: "化学計算（溶解度）", imp: "高" },
                { time: "20:00〜20:30", subject: "社会", menu: "地理の地図確認・復習", imp: "中" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 3 ? "1px solid #dcfce7" : "none" }}>
                  <span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0, width: 90 }}>{item.time}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, width: 36, flexShrink: 0 }}>{item.subject}</span>
                  <span style={{ fontSize: 11, color: "#374151", flex: 1 }}>{item.menu}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: item.imp === "最高" ? "#fee2e2" : item.imp === "高" ? "#ffedd5" : "#dbeafe", color: item.imp === "最高" ? "#dc2626" : item.imp === "高" ? "#c2410c" : "#1d4ed8" }}>{item.imp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 機能4：AIチャット */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", direction: "rtl" }}>
            <div style={{ direction: "ltr" }}>
              <div style={{ display: "inline-block", background: "#f0f9ff", borderRadius: 8, padding: "4px 12px", fontSize: 12, color: "#0369a1", fontWeight: 700, marginBottom: 16 }}>AIチャット</div>
              <h3 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", marginBottom: 16, lineHeight: 1.4 }}>
                中学受験のことなら<br />何でも聞けるAIが24時間待機
              </h3>
              <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.8, marginBottom: 24 }}>
                成績データを把握したAIが、
                お子さまの状況に合わせた個別アドバイスを即座に回答。
                深夜の疑問も、塾の先生がいない日も頼れます。
              </p>
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {["データを元にした個別最適アドバイス", "勉強法・スケジュール・メンタルケアまで対応", "24時間365日いつでも相談可能"].map((t) => (
                  <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#374151" }}>
                    <span style={{ color: "#16a34a", fontWeight: 700, flexShrink: 0 }}>✓</span>{t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ direction: "ltr", background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(12,68,124,0.12)" }}>
              <div style={{ background: NAVY, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="3" y="12" width="3" height="9" rx="0.5"/><rect x="9" y="7" width="3" height="14" rx="0.5"/><rect x="15" y="3" width="3" height="18" rx="0.5"/></svg>
                </div>
                <div>
                  <p style={{ color: "white", fontSize: 13, fontWeight: 700 }}>StudyLens AI</p>
                  <p style={{ color: "#86efac", fontSize: 11 }}>● オンライン</p>
                </div>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ background: NAVY, color: "white", borderRadius: "18px 18px 0 18px", padding: "10px 14px", fontSize: 13, maxWidth: "75%" }}>
                    算数の比・割合が苦手なのですが、どう勉強すればいいですか？
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "flex-end" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><rect x="3" y="12" width="3" height="9" rx="0.5"/><rect x="9" y="7" width="3" height="14" rx="0.5"/><rect x="15" y="3" width="3" height="18" rx="0.5"/></svg>
                  </div>
                  <div style={{ background: "#f0f0f0", borderRadius: "18px 18px 18px 0", padding: "10px 14px", fontSize: 13, color: "#1f2937", lineHeight: 1.7, maxWidth: "75%" }}>
                    データを見ると13回中正答率20〜40%と一貫して弱点です。まず「比の基本型（A:B = C:D）」の計算を毎朝5問×2週間で定着させましょう！
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 4 }}>
                  {["今週の学習計画は？", "最優先の弱点は？"].map(q => (
                    <span key={q} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 16, border: `1px solid ${NAVY}`, color: NAVY }}>{q}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 使い方 ── */}
      <section id="howto" style={{ background: "#f8faff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "#e8f0fe", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: NAVY, fontWeight: 600, marginBottom: 16 }}>
            使い方
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 900, color: "#1a1a2e", marginBottom: 56 }}>
            たった3ステップで<br />AI分析がスタート
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              {
                step: "01",
                icon: "🔗",
                title: "Googleでログイン",
                desc: "お使いのGoogleアカウントでワンクリックログイン。登録不要ですぐに使えます。",
                color: "#e8f0fe",
              },
              {
                step: "02",
                icon: "📁",
                title: "Google DriveのURLを入力",
                desc: "模試・テスト結果が入ったフォルダのURLを貼り付けるだけ。AIが自動でファイルを読み込みます。",
                color: "#e6f4ea",
              },
              {
                step: "03",
                icon: "🤖",
                title: "AIが分析・アドバイス",
                desc: "弱点・偏差値・ルーティンを自動で生成。すぐに今日やるべきことが分かります。",
                color: "#fef7e0",
              },
            ].map((item) => (
              <div key={item.step} style={{ background: "white", borderRadius: 20, padding: "32px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", position: "relative" }}>
                <div style={{ position: "absolute", top: -16, left: 24, background: NAVY, color: "white", fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 20 }}>
                  STEP {item.step}
                </div>
                <div style={{ fontSize: 40, marginBottom: 16, marginTop: 8 }}>{item.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", marginBottom: 12 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 48 }}>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>最短1分で分析結果が表示されます</p>
            <Link href="/" style={{ display: "inline-block", background: NAVY, color: "white", fontWeight: 800, fontSize: 17, padding: "16px 48px", borderRadius: 32, textDecoration: "none", boxShadow: "0 8px 24px rgba(12,68,124,0.3)" }}>
              無料で始める →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 料金 ── */}
      <section style={{ padding: "80px 24px", background: "white" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "#1a1a2e", marginBottom: 12 }}>シンプルな料金体系</h2>
          <p style={{ color: "#6b7280", marginBottom: 48 }}>今なら完全無料でお使いいただけます</p>
          <div style={{ background: `linear-gradient(135deg, ${NAVY}, #1a5c9e)`, borderRadius: 24, padding: "48px 40px", color: "white", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
            <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 20px", fontSize: 14, fontWeight: 700, marginBottom: 20 }}>
              完全無料
            </div>
            <div style={{ fontSize: 56, fontWeight: 900, marginBottom: 8 }}>¥0</div>
            <p style={{ fontSize: 16, opacity: 0.85, marginBottom: 32 }}>すべての機能をご利用いただけます</p>
            <ul style={{ listStyle: "none", padding: 0, textAlign: "left", marginBottom: 36, display: "flex", flexDirection: "column", gap: 12 }}>
              {["AI弱点分析（4科目）", "偏差値推移グラフ", "学習ルーティン生成", "AIチャット（無制限）", "Google Drive連携"].map(f => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15 }}>
                  <span style={{ color: "#86efac", fontWeight: 700 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <Link href="/" style={{ display: "inline-block", background: "white", color: NAVY, fontWeight: 800, fontSize: 16, padding: "14px 40px", borderRadius: 32, textDecoration: "none" }}>
              今すぐ無料で始める
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: `linear-gradient(135deg, ${NAVY}, #0e6db5)`, padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: "white", marginBottom: 16, lineHeight: 1.3 }}>
            今すぐAI分析を始めて<br />合格への最短ルートを見つけよう
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", marginBottom: 40 }}>
            GoogleアカウントとGoogle Driveがあればすぐにスタートできます
          </p>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "white", color: NAVY, fontWeight: 800, fontSize: 17, padding: "16px 40px", borderRadius: 32, textDecoration: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24"><path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" fill="#4285F4"/></svg>
            Googleで無料ログイン
          </Link>
        </div>
      </section>

      {/* ── フッター ── */}
      <footer style={{ background: "#0a1628", padding: "40px 24px 24px", color: "rgba(255,255,255,0.5)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 24 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <svg width="24" height="24" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill={NAVY}/><rect x="4" y="20" width="5" height="8" rx="1.5" fill="white"/><rect x="11" y="14" width="5" height="14" rx="1.5" fill="white"/><rect x="18" y="9" width="5" height="19" rx="1.5" fill="white"/></svg>
                <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>StudyLens</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>AIで中学受験をサポート</p>
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              <div>
                <p style={{ color: "white", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>リンク</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Link href="/privacy" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>プライバシーポリシー</Link>
                  <Link href="/terms" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>利用規約</Link>
                </div>
              </div>
              <div>
                <p style={{ color: "white", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>お問い合わせ</p>
                <a href="mailto:studylens@actasia.biz" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>studylens@actasia.biz</a>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 20, textAlign: "center", fontSize: 12 }}>
            © 2026 株式会社ACTASIA
          </div>
        </div>
      </footer>

    </div>
  );
}

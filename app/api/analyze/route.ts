export const maxDuration = 60;

import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "../auth/[...nextauth]/route";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type DriveFile = { id: string; name: string; mimeType: string };

async function fetchFileContent(
  file: DriveFile,
  accessToken: string
): Promise<{ content: string; fetchStatus: string }> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
    if (file.mimeType === "application/vnd.google-apps.document") {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`,
        { headers }
      );
      if (!res.ok) {
        const err = await res.text();
        console.log(`[analyze] Doc export failed ${file.name}: ${res.status} ${err.slice(0, 100)}`);
        return { content: "", fetchStatus: `Doc export failed: ${res.status}` };
      }
      return { content: (await res.text()).slice(0, 2000), fetchStatus: "ok" };
    }

    if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv`,
        { headers }
      );
      if (!res.ok) {
        console.log(`[analyze] Sheets export failed ${file.name}: ${res.status}`);
        return { content: "", fetchStatus: `Sheets export failed: ${res.status}` };
      }
      return { content: (await res.text()).slice(0, 2000), fetchStatus: "ok" };
    }

    if (
      file.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimeType === "application/vnd.ms-excel"
    ) {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv`,
        { headers }
      );
      if (res.ok) {
        return { content: (await res.text()).slice(0, 2000), fetchStatus: "ok (xlsx→csv)" };
      }
      console.log(`[analyze] xlsx export unavailable for ${file.name}`);
      return { content: "", fetchStatus: "xlsx: export unavailable" };
    }

    if (file.mimeType.startsWith("text/") || file.mimeType === "application/json") {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers }
      );
      if (!res.ok) {
        console.log(`[analyze] text fetch failed ${file.name}: ${res.status}`);
        return { content: "", fetchStatus: `text fetch failed: ${res.status}` };
      }
      return { content: (await res.text()).slice(0, 2000), fetchStatus: "ok" };
    }

    return { content: "", fetchStatus: `unsupported: ${file.mimeType}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[analyze] exception for ${file.name}: ${msg}`);
    return { content: "", fetchStatus: `exception: ${msg}` };
  }
}

/** ClaudeレスポンスからJSONオブジェクトを確実に抽出してパース（強化版） */
function extractJson(text: string): unknown | null {
  // Step1: コードブロックを除去してから { } ブロックをregexで抽出
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

  // 最初の { から最後の } までを抽出
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(stripped.slice(start, end + 1));
    } catch (e1) {
      console.error("[analyze] Step1 JSON parse error:", e1 instanceof Error ? e1.message : e1);
    }
  }

  // Step2: テキスト全体をそのままパース
  try {
    return JSON.parse(text.trim());
  } catch (e2) {
    console.error("[analyze] Step2 JSON parse error:", e2 instanceof Error ? e2.message : e2);
    console.error("[analyze] Raw text preview:", text.slice(0, 300));
    return null;
  }
}

/** デフォルト弱点データ（パース失敗・データ不足時のフォールバック） */
function defaultWeaknesses() {
  return {
    kokugo: [
      { field: "読解", unit: "説明文読解", count: "—", avgCorrectRate: "—", tendency: "論旨の把握が弱い傾向", evaluation: "△", priority: "高", strategy: "段落ごとの要点まとめを練習する" },
      { field: "語彙", unit: "語彙・慣用句", count: "—", avgCorrectRate: "—", tendency: "語彙の定着が不十分", evaluation: "△", priority: "中", strategy: "毎日5語の語彙学習を習慣化する" },
      { field: "記述", unit: "記述表現", count: "—", avgCorrectRate: "—", tendency: "答えの根拠を文章にまとめにくい", evaluation: "△", priority: "高", strategy: "短い記述練習を週3回以上行う" },
    ],
    sansu: [
      { field: "数量", unit: "比・割合・速さ", count: "—", avgCorrectRate: "—", tendency: "比の計算でミスが多い", evaluation: "△", priority: "最高", strategy: "比の基本問題を毎日10問解く" },
      { field: "図形", unit: "図形（面積・体積）", count: "—", avgCorrectRate: "—", tendency: "補助線の引き方が不安定", evaluation: "△", priority: "高", strategy: "典型問題の解法パターンを整理する" },
      { field: "場合の数", unit: "場合の数・確率", count: "—", avgCorrectRate: "—", tendency: "数え漏れが発生しやすい", evaluation: "△", priority: "中", strategy: "樹形図や表を使って整理する習慣をつける" },
    ],
    rika: [
      { field: "化学", unit: "化学計算（水溶液）", count: "—", avgCorrectRate: "—", tendency: "濃度計算の手順が曖昧", evaluation: "△", priority: "高", strategy: "濃度・溶解度の公式を整理して演習する" },
      { field: "物理", unit: "電気・物理（てこ・浮力）", count: "—", avgCorrectRate: "—", tendency: "つり合いの条件を混同しやすい", evaluation: "△", priority: "高", strategy: "図を描きながら条件を整理する" },
      { field: "生物", unit: "植物・動物のつくり", count: "—", avgCorrectRate: "—", tendency: "暗記項目の定着が不十分", evaluation: "○", priority: "中", strategy: "図鑑や図解でビジュアル的に覚える" },
    ],
    shakai: [
      { field: "歴史", unit: "歴史（近現代）", count: "—", avgCorrectRate: "—", tendency: "明治以降の出来事の前後関係が曖昧", evaluation: "△", priority: "高", strategy: "年表を作成して流れを整理する" },
      { field: "地理", unit: "地理（産業・貿易）", count: "—", avgCorrectRate: "—", tendency: "産業と地域の組み合わせが曖昧", evaluation: "△", priority: "中", strategy: "白地図に産業・特産物を書き込む" },
      { field: "公民", unit: "公民（政治のしくみ）", count: "—", avgCorrectRate: "—", tendency: "三権分立・選挙の仕組みが混乱しやすい", evaluation: "△", priority: "中", strategy: "図解で三権の関係を整理する" },
    ],
  };
}

/** パース失敗時に返す最低限のデフォルト構造 */
function defaultResult() {
  return {
    deviationScores: {
      tests: [],
      averages: { kokugo: 0, sansu: 0, rika: 0, shakai: 0, total: 0 },
      best:     { kokugo: 0, sansu: 0, rika: 0, shakai: 0, total: 0 },
      recent3avg: { kokugo: 0, sansu: 0, rika: 0, shakai: 0, total: 0 },
    },
    weaknesses: defaultWeaknesses(),
    schoolJudgments: [],
    _parseError: true,
  };
}

/** パース結果のweaknessesが空・不正な場合にデフォルトで補完する */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ensureWeaknesses(parsed: any): any {
  const dw = defaultWeaknesses();
  const w = parsed?.weaknesses ?? {};
  const subjects = ["kokugo", "sansu", "rika", "shakai"] as const;
  let filled = false;
  for (const s of subjects) {
    if (!Array.isArray(w[s]) || w[s].length === 0) {
      w[s] = dw[s];
      filled = true;
    }
  }
  if (filled) {
    console.log("[analyze] weaknesses補完: 空だった科目をデフォルトで埋めました");
  }
  parsed.weaknesses = w;
  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (session as any)?.accessToken as string | undefined;

    if (!session || !accessToken) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const files: DriveFile[] = body?.files;
    if (!Array.isArray(files) || files.length === 0) {
      return Response.json({ error: "files is required" }, { status: 400 });
    }

    console.log(`[analyze] starting for ${files.length} files`);

    const targets = files.slice(0, 15);
    const fileContents = await Promise.all(
      targets.map(async (file) => {
        const { content, fetchStatus } = await fetchFileContent(file, accessToken);
        console.log(`[analyze] ${file.name}: status=${fetchStatus}, len=${content.length}`);
        return { name: file.name, mimeType: file.mimeType, content, fetchStatus };
      })
    );

    const filesDescription = fileContents
      .map((f) => {
        const body = f.content
          ? `内容:\n${f.content}`
          : `内容: (取得不可[${f.fetchStatus}] — ファイル名から推定してください)`;
        return `ファイル名: ${f.name}\nタイプ: ${f.mimeType}\n${body}`;
      })
      .join("\n\n---\n\n");

    console.log(`[analyze] description length: ${filesDescription.length}`);

    const response = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system:
        "あなたは中学受験の成績分析の専門家です。提供されたデータから偏差値・弱点・志望校・ルーティン・バックキャストを深く分析し、必ずJSON形式のみで返答してください。コードブロック（```）は使わず、JSONオブジェクトだけを返してください。",
      messages: [
        {
          role: "user",
          content: `あなたは中学受験の成績分析の専門家です。
提供されたデータを以下の分析レベルで深く分析してください。

【分析対象ファイル】
${filesDescription}

【分析レベルの基準】

①偏差値推移：
- 全テスト回の国語・算数・理科・社会・4科計の偏差値
- 各回の判定ランク（A〜E）
- 平均・最高値・直近3回平均
- テストデータが見当たらない場合はtests:[]、averages等は0

②詳細弱点分析（最重要）：
各科目について以下を必ず分析（国語8件以上・算数8件以上・理科6件以上・社会6件以上）：
- 分野名（例：語彙・知識、説明文読解、文学読解、計算、文章題、図形）
- 単元名（具体的に：例「慣用句・ことわざ」「濃度・割合・比」）
- 出現回数（何回のテストで出題されたか）
- 平均正答率（範囲で記載：例「40〜80%」）
- 正答傾向（どんなミスパターンか：例「高正答率なのに×が頻発」）
- 評価（◎/○/△/×）
- 優先度（最高/高/中/低/なし）
- 対策コメント（具体的な練習方法）
※データが少ない場合もファイル名・内容から推測して中学受験の典型パターンで埋めること。空配列は絶対禁止。

③志望校分析：
- ファイルに志望校情報があれば科目別偏差値差分・判定・強み弱み・対策・判断時期を返す
- 情報がなければschoolJudgments:[]

④ルーティン設計：
- 毎日45分の時間配分（科目・メニュー・教材・重要度）
- 時期別ルーティン変化表（6時期）

⑤バックキャスト計画：
- 入試日から逆算した月別タスク
- フェーズ別（守り期・始動期・天王山・過去問期・仕上げ・直前）
- 科目ごとの月別具体的タスク

必ず以下のJSON形式で返してください（省略なし、コードブロック不要）:
{
  "deviationScores": {
    "tests": [{"name": "テスト名", "date": "日付", "kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0, "rank": "A"}],
    "averages": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0},
    "best": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0},
    "recent3avg": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0}
  },
  "weaknesses": {
    "kokugo": [
      {"field": "語彙・知識", "unit": "慣用句・ことわざ", "count": "6回", "avgCorrectRate": "40〜60%", "tendency": "頻出表現の意味を混同しやすい", "evaluation": "△", "priority": "最高", "strategy": "週3回の慣用句練習が必須。頻出100選を繰り返す"},
      {"field": "読解", "unit": "説明文読解", "count": "8回", "avgCorrectRate": "45〜65%", "tendency": "筆者の主張と具体例の区別が曖昧", "evaluation": "△", "priority": "高", "strategy": "段落ごとに「主張か例か」を判断する練習を週3回"},
      {"field": "読解", "unit": "物語文の心情把握", "count": "6回", "avgCorrectRate": "50〜70%", "tendency": "登場人物の気持ちの変化を見落とす", "evaluation": "△", "priority": "高", "strategy": "気持ちの変化を矢印で図にする練習"},
      {"field": "文法", "unit": "品詞・文法", "count": "4回", "avgCorrectRate": "55〜75%", "tendency": "活用形の判定ミスが多い", "evaluation": "○", "priority": "中", "strategy": "品詞分類表を作って毎週確認"},
      {"field": "語彙", "unit": "漢字の読み書き", "count": "8回", "avgCorrectRate": "60〜80%", "tendency": "書き取りより読みの方が正答率が低い", "evaluation": "○", "priority": "中", "strategy": "毎日10字の漢字練習を継続"},
      {"field": "読解", "unit": "詩・短歌・俳句", "count": "3回", "avgCorrectRate": "35〜55%", "tendency": "情景描写の読み取りが弱い", "evaluation": "×", "priority": "高", "strategy": "表現技法（比喩・体言止め等）を整理して演習"},
      {"field": "記述", "unit": "記述表現・要約", "count": "5回", "avgCorrectRate": "30〜50%", "tendency": "字数制限内に収めながら要点を書けない", "evaluation": "×", "priority": "最高", "strategy": "50字・100字の要約練習を週3回行う"},
      {"field": "知識", "unit": "文学作品・作者知識", "count": "3回", "avgCorrectRate": "45〜65%", "tendency": "作品名と作者の一致が弱い", "evaluation": "△", "priority": "低", "strategy": "頻出作品リストで確認学習"}
    ],
    "sansu": [
      {"field": "数量", "unit": "比・割合・百分率", "count": "8回", "avgCorrectRate": "40〜60%", "tendency": "割合の基準量と比較量を混同する", "evaluation": "×", "priority": "最高", "strategy": "「もとにする量×割合＝比べる量」の図を毎回書く習慣"},
      {"field": "数量", "unit": "速さ・距離・時間", "count": "6回", "avgCorrectRate": "45〜65%", "tendency": "単位換算のミスが頻発", "evaluation": "△", "priority": "最高", "strategy": "単位を必ず明記する。ダイヤグラムを活用"},
      {"field": "数量", "unit": "濃度・食塩水", "count": "5回", "avgCorrectRate": "40〜55%", "tendency": "混合・蒸発・追加の場合分けが曖昧", "evaluation": "△", "priority": "高", "strategy": "面積図を使って整理する練習を週2回"},
      {"field": "図形", "unit": "平面図形（面積）", "count": "7回", "avgCorrectRate": "50〜70%", "tendency": "補助線の引き方が分からず止まる", "evaluation": "△", "priority": "高", "strategy": "典型的な補助線パターン10種を暗記"},
      {"field": "図形", "unit": "立体図形（体積・表面積）", "count": "4回", "avgCorrectRate": "45〜65%", "tendency": "展開図と立体の対応が弱い", "evaluation": "△", "priority": "高", "strategy": "実際に展開図を書く演習を繰り返す"},
      {"field": "場合の数", "unit": "場合の数・順列組み合わせ", "count": "4回", "avgCorrectRate": "40〜60%", "tendency": "数え漏れ・重複が多い", "evaluation": "△", "priority": "中", "strategy": "樹形図か表で整理する習慣を徹底"},
      {"field": "数列", "unit": "規則性・数列", "count": "4回", "avgCorrectRate": "50〜70%", "tendency": "規則を見つけるのに時間がかかる", "evaluation": "○", "priority": "中", "strategy": "差の差に注目する視点を養う"},
      {"field": "計算", "unit": "計算の工夫・四則混合", "count": "8回", "avgCorrectRate": "65〜80%", "tendency": "計算ミスより手順ミスが目立つ", "evaluation": "○", "priority": "中", "strategy": "途中式を省略しない習慣をつける"}
    ],
    "rika": [
      {"field": "化学", "unit": "水溶液・濃度計算", "count": "5回", "avgCorrectRate": "40〜60%", "tendency": "溶質・溶媒・溶液の区別が曖昧", "evaluation": "△", "priority": "高", "strategy": "公式を図で整理。混合問題を週2回演習"},
      {"field": "化学", "unit": "気体の性質と発生", "count": "4回", "avgCorrectRate": "50〜70%", "tendency": "気体の集め方・確認方法の混同", "evaluation": "△", "priority": "高", "strategy": "表にまとめて比較学習"},
      {"field": "物理", "unit": "てこ・輪軸・滑車", "count": "5回", "avgCorrectRate": "40〜55%", "tendency": "複合問題でつり合い条件を見失う", "evaluation": "×", "priority": "最高", "strategy": "支点・力点・作用点を毎回図示する"},
      {"field": "物理", "unit": "電気（回路・電力）", "count": "4回", "avgCorrectRate": "45〜65%", "tendency": "直列・並列の電流・電圧の違いが曖昧", "evaluation": "△", "priority": "高", "strategy": "回路図を書いてから計算する習慣"},
      {"field": "生物", "unit": "植物のつくりとはたらき", "count": "4回", "avgCorrectRate": "55〜75%", "tendency": "光合成と呼吸の条件の混同", "evaluation": "○", "priority": "中", "strategy": "比較表を作って違いを整理"},
      {"field": "地学", "unit": "天体・季節・気象", "count": "3回", "avgCorrectRate": "45〜65%", "tendency": "星座の動きと地球の自転の対応が弱い", "evaluation": "△", "priority": "中", "strategy": "天球図を使った演習を繰り返す"}
    ],
    "shakai": [
      {"field": "地理", "unit": "日本の産業（農業・工業）", "count": "5回", "avgCorrectRate": "50〜70%", "tendency": "産地と特産物の組み合わせが混乱", "evaluation": "△", "priority": "高", "strategy": "白地図に産業・特産物を書き込む作業を繰り返す"},
      {"field": "地理", "unit": "地形・気候", "count": "4回", "avgCorrectRate": "55〜75%", "tendency": "気候区分と雨温図の対応が弱い", "evaluation": "○", "priority": "中", "strategy": "6つの気候区分の特徴を比較表で整理"},
      {"field": "歴史", "unit": "近現代史（明治〜昭和）", "count": "6回", "avgCorrectRate": "40〜60%", "tendency": "出来事の前後関係・因果関係が曖昧", "evaluation": "△", "priority": "最高", "strategy": "時代の流れ年表を自分で作成する"},
      {"field": "歴史", "unit": "政治史・外交史", "count": "5回", "avgCorrectRate": "45〜65%", "tendency": "条約名・人物名の混同が多い", "evaluation": "△", "priority": "高", "strategy": "重要条約・人物カードを作って反復確認"},
      {"field": "公民", "unit": "政治のしくみ（三権分立）", "count": "3回", "avgCorrectRate": "50〜70%", "tendency": "各機関の役割・権限の混同", "evaluation": "△", "priority": "高", "strategy": "三権の関係図を書いて整理する"},
      {"field": "公民", "unit": "経済・財政・社会保障", "count": "2回", "avgCorrectRate": "40〜60%", "tendency": "用語の定義が曖昧", "evaluation": "△", "priority": "中", "strategy": "重要用語を一問一答形式で確認"}
    ]
  },
  "schoolJudgments": [
    {"name": "志望校名", "tag": "第一志望", "currentJudgment": "C判定", "pointsToA": "あと15点", "strongSubjects": "国語・理科", "weakSubjects": "算数・社会", "strategy": "算数の比・割合を集中強化。社会の近現代史を整理する", "decisionTiming": "2025年10月の模試で判断", "diffs": {"kokugo": -2, "sansu": 8, "rika": -3, "shakai": 5}}
  ],
  "routine": {
    "summary": "毎日45分の学習ルーティン。算数・国語を中心に、理科・社会は週次でまとめて学習する",
    "items": [
      {"time": "15分", "subject": "算数", "importance": "最高", "menu": "計算練習・弱点単元", "detail": "比・割合・速さを中心に。天王山期は図形に移行"},
      {"time": "15分", "subject": "国語", "importance": "高", "menu": "漢字・語彙・読解", "detail": "漢字10字＋読解1題。記述は週3回"},
      {"time": "10分", "subject": "理科", "importance": "中", "menu": "弱点単元の確認", "detail": "てこ・電気・化学計算を交互に"},
      {"time": "5分", "subject": "社会", "importance": "継続", "menu": "一問一答・時事", "detail": "歴史年表・地理白地図の確認"}
    ],
    "phases": [
      {"period": "3〜5月（守り期）", "reading": "説明文読解の基礎固め", "vocabulary": "慣用句・ことわざ100選"},
      {"period": "6〜7月（始動期）", "reading": "物語文・詩の読解強化", "vocabulary": "漢字の読み書き徹底"},
      {"period": "8月（天王山）", "reading": "志望校形式の読解演習", "vocabulary": "記述表現の集中練習"},
      {"period": "9〜10月（過去問期）", "reading": "過去問の読解分析", "vocabulary": "頻出語彙の最終確認"},
      {"period": "11〜12月（仕上げ）", "reading": "弱点単元の総復習", "vocabulary": "語彙・慣用句の総まとめ"},
      {"period": "1月（直前）", "reading": "本番形式の演習のみ", "vocabulary": "暗記カードで最終チェック"}
    ]
  },
  "backcast": {
    "topPriorities": "算数の比・割合・速さと国語の記述表現が最優先。社会の近現代史も早急に整理が必要",
    "phases": [
      {
        "phase": "守り期（3〜5月）",
        "months": [
          {"month": "3月", "kokugo": "説明文読解基礎・慣用句100選スタート", "sansu": "比・割合の基本問題を毎日10問", "rika": "化学計算の公式整理", "shakai": "地理の白地図書き込みスタート", "routine": "毎日45分基本ルーティン"},
          {"month": "4月", "kokugo": "物語文読解・漢字50字確認", "sansu": "速さの文章題・単位換算", "rika": "てこ・滑車の基本パターン10種", "shakai": "産業地図の完成", "routine": "算数を20分に増加"},
          {"month": "5月", "kokugo": "詩・短歌の表現技法整理", "sansu": "平面図形・補助線パターン暗記", "rika": "電気回路の基礎", "shakai": "歴史年表（古代〜江戸）作成", "routine": "模試対策を週1回追加"}
        ]
      },
      {
        "phase": "始動期（6〜7月）",
        "months": [
          {"month": "6月", "kokugo": "記述表現50字練習スタート", "sansu": "立体図形・展開図演習", "rika": "気体の性質・発生まとめ", "shakai": "歴史年表（明治〜昭和）作成", "routine": "理科を15分に増加"},
          {"month": "7月", "kokugo": "要約100字練習・模試復習", "sansu": "場合の数・規則性", "rika": "植物・動物のつくり整理", "shakai": "公民（三権分立）図解作成", "routine": "夏期講習併用"}
        ]
      },
      {
        "phase": "天王山（8月）",
        "months": [
          {"month": "8月", "kokugo": "志望校形式の読解・記述集中演習", "sansu": "全弱点単元の総演習（比・割合・図形）", "rika": "化学・物理の複合問題演習", "shakai": "近現代史の流れを完成", "routine": "1日2時間以上。弱点に集中"}
        ]
      },
      {
        "phase": "過去問期（9〜10月）",
        "months": [
          {"month": "9月", "kokugo": "志望校過去問の読解傾向分析", "sansu": "過去問算数の頻出パターン把握", "rika": "過去問理科の頻出分野確認", "shakai": "過去問社会の傾向分析", "routine": "週1回過去問演習"},
          {"month": "10月", "kokugo": "記述の採点基準を意識した練習", "sansu": "過去問で時間配分を確認", "rika": "弱点分野の過去問演習", "shakai": "歴史・公民の最終整理", "routine": "週2回過去問演習に増加"}
        ]
      },
      {
        "phase": "仕上げ（11〜12月）",
        "months": [
          {"month": "11月", "kokugo": "弱点単元の総復習・頻出語彙確認", "sansu": "計算ミス撲滅・時間管理", "rika": "全分野の一問一答確認", "shakai": "頻出事項の最終暗記", "routine": "過去問＋弱点復習のバランス"},
          {"month": "12月", "kokugo": "本番形式の演習のみ", "sansu": "本番形式で時間を測って演習", "rika": "化学計算・物理の最終確認", "shakai": "時事問題の最終確認", "routine": "本番のスケジュールに合わせる"}
        ]
      },
      {
        "phase": "直前（1月）",
        "months": [
          {"month": "1月", "kokugo": "漢字・語彙カードで最終チェックのみ", "sansu": "得意分野で自信をつける演習", "rika": "暗記カードで最終確認", "shakai": "年表・地図の最終確認", "routine": "体調管理最優先。過度な詰め込みNG"}
        ]
      }
    ]
  }
}

上記はサンプルです。実際のファイルデータを最大限活用し、データがある部分は実際の数値・内容で上書きしてください。データがない項目はサンプルを参考に中学受験の典型パターンで具体的に埋めてください。`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    console.log(`[analyze] Claude response len=${text.length}, preview=${text.slice(0, 200)}`);

    const parsed = extractJson(text);
    if (!parsed) {
      console.error("[analyze] Could not extract JSON. Returning default structure with fallback weaknesses.");
      return Response.json(
        {
          ...defaultResult(),
          error: "分析結果の解析に失敗しました",
          detail: "JSONを抽出できませんでした",
          rawResponse: text.slice(0, 500),
        },
        { status: 200 }
      );
    }

    // weaknessesが空・不正な科目をデフォルトで補完
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = ensureWeaknesses(parsed as any);

    console.log("[analyze] success");
    console.log("[analyze] parsed weaknesses kokugo:", result?.weaknesses?.kokugo?.length ?? "N/A");
    console.log("[analyze] parsed weaknesses sansu:", result?.weaknesses?.sansu?.length ?? "N/A");
    console.log("[analyze] parsed weaknesses rika:", result?.weaknesses?.rika?.length ?? "N/A");
    console.log("[analyze] parsed weaknesses shakai:", result?.weaknesses?.shakai?.length ?? "N/A");
    console.log("[analyze] parsed deviationScores tests count:", result?.deviationScores?.tests?.length ?? "N/A");
    console.log("[analyze] parsed schoolJudgments count:", result?.schoolJudgments?.length ?? "N/A");
    return Response.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[analyze] Unexpected error:", msg, stack);
    return Response.json(
      { error: "分析中に予期しないエラーが発生しました", detail: msg },
      { status: 500 }
    );
  }
}

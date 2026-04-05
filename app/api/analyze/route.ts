export const maxDuration = 120;

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
      return { content: (await res.text()).slice(0, 3000), fetchStatus: "ok" };
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
      return { content: (await res.text()).slice(0, 3000), fetchStatus: "ok" };
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
        return { content: (await res.text()).slice(0, 3000), fetchStatus: "ok (xlsx→csv)" };
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
      return { content: (await res.text()).slice(0, 3000), fetchStatus: "ok" };
    }

    return { content: "", fetchStatus: `unsupported: ${file.mimeType}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[analyze] exception for ${file.name}: ${msg}`);
    return { content: "", fetchStatus: `exception: ${msg}` };
  }
}

/** ClaudeレスポンスからJSONオブジェクトを抽出 */
export function extractJson(text: string): unknown | null {
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(stripped.slice(start, end + 1));
    } catch (e1) {
      console.error("[analyze] Step1 JSON parse error:", e1 instanceof Error ? e1.message : e1);
    }
  }
  try {
    return JSON.parse(text.trim());
  } catch (e2) {
    console.error("[analyze] Step2 JSON parse error:", e2 instanceof Error ? e2.message : e2);
    console.error("[analyze] Raw text preview:", text.slice(0, 300));
    return null;
  }
}

/** デフォルト弱点データ（パース失敗時フォールバック） */
export function defaultWeaknesses() {
  return {
    kokugo: [
      { field: "語彙・知識", unit: "慣用句・ことわざ", count: "—", avgCorrectRate: "40〜60%", tendency: "頻出表現の意味を混同しやすい", evaluation: "△", priority: "最高", strategy: "週3回の慣用句練習。頻出100選を繰り返す" },
      { field: "読解", unit: "説明文読解", count: "—", avgCorrectRate: "45〜65%", tendency: "筆者の主張と具体例の区別が曖昧", evaluation: "△", priority: "高", strategy: "段落ごとに「主張か例か」を判断する練習を週3回" },
      { field: "読解", unit: "物語文の心情把握", count: "—", avgCorrectRate: "50〜70%", tendency: "登場人物の気持ちの変化を見落とす", evaluation: "△", priority: "高", strategy: "気持ちの変化を矢印で図にする練習" },
      { field: "記述", unit: "記述表現・要約", count: "—", avgCorrectRate: "30〜50%", tendency: "字数制限内に要点を書けない", evaluation: "×", priority: "最高", strategy: "50字・100字の要約練習を週3回行う" },
      { field: "語彙", unit: "漢字の読み書き", count: "—", avgCorrectRate: "60〜80%", tendency: "書き取りより読みの正答率が低い", evaluation: "○", priority: "中", strategy: "毎日10字の漢字練習を継続" },
    ],
    sansu: [
      { field: "数量", unit: "比・割合・百分率", count: "—", avgCorrectRate: "40〜60%", tendency: "割合の基準量と比較量を混同する", evaluation: "×", priority: "最高", strategy: "「もとにする量×割合＝比べる量」の図を毎回書く習慣" },
      { field: "数量", unit: "速さ・距離・時間", count: "—", avgCorrectRate: "45〜65%", tendency: "単位換算のミスが頻発", evaluation: "△", priority: "最高", strategy: "単位を必ず明記。ダイヤグラムを活用" },
      { field: "数量", unit: "濃度・食塩水", count: "—", avgCorrectRate: "40〜55%", tendency: "混合・蒸発の場合分けが曖昧", evaluation: "△", priority: "高", strategy: "面積図を使って整理する練習を週2回" },
      { field: "図形", unit: "平面図形（面積）", count: "—", avgCorrectRate: "50〜70%", tendency: "補助線の引き方が分からず止まる", evaluation: "△", priority: "高", strategy: "典型的な補助線パターン10種を暗記" },
      { field: "場合の数", unit: "場合の数・順列組み合わせ", count: "—", avgCorrectRate: "40〜60%", tendency: "数え漏れ・重複が多い", evaluation: "△", priority: "中", strategy: "樹形図か表で整理する習慣を徹底" },
    ],
    rika: [
      { field: "化学", unit: "水溶液・濃度計算", count: "—", avgCorrectRate: "40〜60%", tendency: "溶質・溶媒・溶液の区別が曖昧", evaluation: "△", priority: "高", strategy: "公式を図で整理。混合問題を週2回演習" },
      { field: "物理", unit: "てこ・輪軸・滑車", count: "—", avgCorrectRate: "40〜55%", tendency: "複合問題でつり合い条件を見失う", evaluation: "×", priority: "最高", strategy: "支点・力点・作用点を毎回図示する" },
      { field: "物理", unit: "電気（回路・電力）", count: "—", avgCorrectRate: "45〜65%", tendency: "直列・並列の電流・電圧の違いが曖昧", evaluation: "△", priority: "高", strategy: "回路図を書いてから計算する習慣" },
      { field: "生物", unit: "植物のつくりとはたらき", count: "—", avgCorrectRate: "55〜75%", tendency: "光合成と呼吸の条件の混同", evaluation: "○", priority: "中", strategy: "比較表を作って違いを整理" },
    ],
    shakai: [
      { field: "歴史", unit: "近現代史（明治〜昭和）", count: "—", avgCorrectRate: "40〜60%", tendency: "出来事の前後関係・因果関係が曖昧", evaluation: "△", priority: "最高", strategy: "時代の流れ年表を自分で作成する" },
      { field: "地理", unit: "日本の産業（農業・工業）", count: "—", avgCorrectRate: "50〜70%", tendency: "産地と特産物の組み合わせが混乱", evaluation: "△", priority: "高", strategy: "白地図に産業・特産物を書き込む作業を繰り返す" },
      { field: "公民", unit: "政治のしくみ（三権分立）", count: "—", avgCorrectRate: "50〜70%", tendency: "各機関の役割・権限の混同", evaluation: "△", priority: "高", strategy: "三権の関係図を書いて整理する" },
      { field: "歴史", unit: "政治史・外交史", count: "—", avgCorrectRate: "45〜65%", tendency: "条約名・人物名の混同が多い", evaluation: "△", priority: "高", strategy: "重要条約・人物カードを作って反復確認" },
    ],
  };
}

/** パース結果のweaknessesが空・不正な場合にデフォルトで補完 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ensureWeaknesses(parsed: any): any {
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
  if (filled) console.log("[analyze] weaknesses補完: 空だった科目をデフォルトで埋めました");
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

    console.log(`[analyze] starting step1 for ${files.length} files`);

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
        "あなたは中学受験の成績分析の専門家です。提供されたテストデータから偏差値と弱点を分析し、必ずJSON形式のみで返答してください。コードブロック（```）は使わず、JSONオブジェクトだけを返してください。",
      messages: [
        {
          role: "user",
          content: `提供されたファイルデータから中学受験の成績を分析してください。
以下のJSONのみを返してください。説明文・コードブロックは不要です。

【分析ファイル】
${filesDescription}

【要件】
- deviationScores: 全テストの偏差値データ（テストデータがなければtests:[]、averages等は0）
- weaknesses: 各科目の弱点分析
  - kokugo: 8件以上
  - sansu: 8件以上
  - rika: 6件以上
  - shakai: 6件以上
- データが不足している場合もファイル名と中学受験の一般知識から推測して必ず全項目を埋めること
- 空配列は絶対に返さないこと

{
  "deviationScores": {
    "tests": [{"name":"テスト名","date":"日付","kokugo":0,"sansu":0,"rika":0,"shakai":0,"total":0,"rank":""}],
    "averages": {"kokugo":0,"sansu":0,"rika":0,"shakai":0,"total":0},
    "best": {"kokugo":0,"sansu":0,"rika":0,"shakai":0,"total":0},
    "recent3avg": {"kokugo":0,"sansu":0,"rika":0,"shakai":0,"total":0}
  },
  "weaknesses": {
    "kokugo": [
      {"field":"語彙・知識","unit":"慣用句・ことわざ","count":"6回","avgCorrectRate":"40〜60%","tendency":"頻出表現の意味を混同しやすい","evaluation":"△","priority":"最高","strategy":"週3回の慣用句練習が必須"},
      {"field":"読解","unit":"説明文読解","count":"8回","avgCorrectRate":"45〜65%","tendency":"筆者の主張と具体例の区別が曖昧","evaluation":"△","priority":"高","strategy":"段落ごとに主張か例かを判断する練習"},
      {"field":"読解","unit":"物語文の心情把握","count":"6回","avgCorrectRate":"50〜70%","tendency":"気持ちの変化を見落とす","evaluation":"△","priority":"高","strategy":"気持ちの変化を矢印で図にする"},
      {"field":"記述","unit":"記述表現・要約","count":"5回","avgCorrectRate":"30〜50%","tendency":"字数制限内に要点を書けない","evaluation":"×","priority":"最高","strategy":"50字・100字の要約練習を週3回"},
      {"field":"語彙","unit":"漢字の読み書き","count":"8回","avgCorrectRate":"60〜80%","tendency":"書き取りより読みの正答率が低い","evaluation":"○","priority":"中","strategy":"毎日10字の漢字練習を継続"},
      {"field":"文法","unit":"品詞・文法","count":"4回","avgCorrectRate":"55〜75%","tendency":"活用形の判定ミスが多い","evaluation":"○","priority":"中","strategy":"品詞分類表を作って毎週確認"},
      {"field":"読解","unit":"詩・短歌・俳句","count":"3回","avgCorrectRate":"35〜55%","tendency":"情景描写の読み取りが弱い","evaluation":"×","priority":"高","strategy":"表現技法を整理して演習"},
      {"field":"知識","unit":"文学作品・作者知識","count":"3回","avgCorrectRate":"45〜65%","tendency":"作品名と作者の一致が弱い","evaluation":"△","priority":"低","strategy":"頻出作品リストで確認学習"}
    ],
    "sansu": [
      {"field":"数量","unit":"比・割合・百分率","count":"8回","avgCorrectRate":"40〜60%","tendency":"割合の基準量と比較量を混同する","evaluation":"×","priority":"最高","strategy":"もとにする量×割合の図を毎回書く"},
      {"field":"数量","unit":"速さ・距離・時間","count":"6回","avgCorrectRate":"45〜65%","tendency":"単位換算のミスが頻発","evaluation":"△","priority":"最高","strategy":"単位を必ず明記。ダイヤグラムを活用"},
      {"field":"数量","unit":"濃度・食塩水","count":"5回","avgCorrectRate":"40〜55%","tendency":"混合・蒸発の場合分けが曖昧","evaluation":"△","priority":"高","strategy":"面積図を使って整理する練習を週2回"},
      {"field":"図形","unit":"平面図形（面積）","count":"7回","avgCorrectRate":"50〜70%","tendency":"補助線の引き方が分からず止まる","evaluation":"△","priority":"高","strategy":"典型的な補助線パターン10種を暗記"},
      {"field":"図形","unit":"立体図形（体積・表面積）","count":"4回","avgCorrectRate":"45〜65%","tendency":"展開図と立体の対応が弱い","evaluation":"△","priority":"高","strategy":"実際に展開図を書く演習"},
      {"field":"場合の数","unit":"場合の数・順列組み合わせ","count":"4回","avgCorrectRate":"40〜60%","tendency":"数え漏れ・重複が多い","evaluation":"△","priority":"中","strategy":"樹形図か表で整理する習慣を徹底"},
      {"field":"数列","unit":"規則性・数列","count":"4回","avgCorrectRate":"50〜70%","tendency":"規則を見つけるのに時間がかかる","evaluation":"○","priority":"中","strategy":"差の差に注目する視点を養う"},
      {"field":"計算","unit":"計算の工夫・四則混合","count":"8回","avgCorrectRate":"65〜80%","tendency":"手順ミスが目立つ","evaluation":"○","priority":"中","strategy":"途中式を省略しない習慣"}
    ],
    "rika": [
      {"field":"化学","unit":"水溶液・濃度計算","count":"5回","avgCorrectRate":"40〜60%","tendency":"溶質・溶媒・溶液の区別が曖昧","evaluation":"△","priority":"高","strategy":"公式を図で整理。週2回演習"},
      {"field":"化学","unit":"気体の性質と発生","count":"4回","avgCorrectRate":"50〜70%","tendency":"気体の集め方・確認方法の混同","evaluation":"△","priority":"高","strategy":"表にまとめて比較学習"},
      {"field":"物理","unit":"てこ・輪軸・滑車","count":"5回","avgCorrectRate":"40〜55%","tendency":"複合問題でつり合い条件を見失う","evaluation":"×","priority":"最高","strategy":"支点・力点・作用点を毎回図示する"},
      {"field":"物理","unit":"電気（回路・電力）","count":"4回","avgCorrectRate":"45〜65%","tendency":"直列・並列の電流・電圧の違いが曖昧","evaluation":"△","priority":"高","strategy":"回路図を書いてから計算する習慣"},
      {"field":"生物","unit":"植物のつくりとはたらき","count":"4回","avgCorrectRate":"55〜75%","tendency":"光合成と呼吸の条件の混同","evaluation":"○","priority":"中","strategy":"比較表を作って違いを整理"},
      {"field":"地学","unit":"天体・季節・気象","count":"3回","avgCorrectRate":"45〜65%","tendency":"星座の動きと地球の自転の対応が弱い","evaluation":"△","priority":"中","strategy":"天球図を使った演習を繰り返す"}
    ],
    "shakai": [
      {"field":"歴史","unit":"近現代史（明治〜昭和）","count":"6回","avgCorrectRate":"40〜60%","tendency":"出来事の前後関係・因果関係が曖昧","evaluation":"△","priority":"最高","strategy":"時代の流れ年表を自分で作成する"},
      {"field":"歴史","unit":"政治史・外交史","count":"5回","avgCorrectRate":"45〜65%","tendency":"条約名・人物名の混同が多い","evaluation":"△","priority":"高","strategy":"重要条約・人物カードを作って反復確認"},
      {"field":"地理","unit":"日本の産業（農業・工業）","count":"5回","avgCorrectRate":"50〜70%","tendency":"産地と特産物の組み合わせが混乱","evaluation":"△","priority":"高","strategy":"白地図に産業・特産物を書き込む"},
      {"field":"地理","unit":"地形・気候","count":"4回","avgCorrectRate":"55〜75%","tendency":"気候区分と雨温図の対応が弱い","evaluation":"○","priority":"中","strategy":"6つの気候区分の特徴を比較表で整理"},
      {"field":"公民","unit":"政治のしくみ（三権分立）","count":"3回","avgCorrectRate":"50〜70%","tendency":"各機関の役割・権限の混同","evaluation":"△","priority":"高","strategy":"三権の関係図を書いて整理する"},
      {"field":"公民","unit":"経済・財政・社会保障","count":"2回","avgCorrectRate":"40〜60%","tendency":"用語の定義が曖昧","evaluation":"△","priority":"中","strategy":"重要用語を一問一答形式で確認"}
    ]
  }
}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    console.log(`[analyze] step1 response len=${text.length}, preview=${text.slice(0, 200)}`);

    const parsed = extractJson(text);
    if (!parsed) {
      console.error("[analyze] Could not extract JSON. Returning fallback.");
      return Response.json({
        deviationScores: {
          tests: [],
          averages: { kokugo: 0, sansu: 0, rika: 0, shakai: 0, total: 0 },
          best:     { kokugo: 0, sansu: 0, rika: 0, shakai: 0, total: 0 },
          recent3avg: { kokugo: 0, sansu: 0, rika: 0, shakai: 0, total: 0 },
        },
        weaknesses: defaultWeaknesses(),
        _parseError: true,
      }, { status: 200 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = ensureWeaknesses(parsed as any);
    console.log("[analyze] step1 kokugo:", result?.weaknesses?.kokugo?.length, "sansu:", result?.weaknesses?.sansu?.length, "rika:", result?.weaknesses?.rika?.length, "shakai:", result?.weaknesses?.shakai?.length);
    return Response.json(result);

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[analyze] Unexpected error:", msg);
    return Response.json(
      { error: "分析中に予期しないエラーが発生しました", detail: msg },
      { status: 500 }
    );
  }
}

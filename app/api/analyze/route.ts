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
      max_tokens: 3000,
      system:
        "あなたは中学受験の成績分析の専門家です。提供されたテストデータから偏差値・弱点・志望校を分析し、必ずJSON形式のみで返答してください。コードブロック（```）は使わず、JSONオブジェクトだけを返してください。",
      messages: [
        {
          role: "user",
          content: `以下のファイルデータを分析して、必ず各科目3件以上の弱点を返してください。
データが少なくてもファイル名や内容から推測して具体的な弱点を生成してください。
中学受験の一般的な弱点パターンを参考に、具体的な単元名・対策を含めてください。
取得できないファイルはファイル名から内容を推定して分析してください。

${filesDescription}

【分析項目1: 偏差値データ】
各テストの国語・算数・理科・社会・4科計の偏差値、平均・最高・直近3回平均、判定ランク（A〜E）。
テストデータが見当たらない場合はtestsを空配列にし、averages等は0にしてください。

【分析項目2: 単元別弱点分析】
各科目（kokugo/sansu/rika/shakai）について分野・単元・出現回数・平均正答率・傾向・評価(◎○△×)・優先度(最高/高/中/低/なし)・対策を返してください。
・必ず全科目（kokugo/sansu/rika/shakai）それぞれ3件以上の弱点を返すこと
・ファイルからデータが取れない場合も、ファイル名と中学受験の一般的な弱点パターンから推測して必ず返すこと
・空配列は絶対に返さないこと

【分析項目3: 志望校分析】
ファイルに志望校情報があれば現在の偏差値との差分・判定・強み弱み科目・対策・判断時期を返してください。
志望校情報がない場合はschoolJudgmentsを空配列にしてください。

JSONのみ返してください（コードブロック不要）:
{
  "deviationScores": {
    "tests": [{"name": "", "date": "", "kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0, "rank": ""}],
    "averages": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0},
    "best": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0},
    "recent3avg": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0}
  },
  "weaknesses": {
    "kokugo": [
      {"field": "読解", "unit": "説明文読解", "count": "3", "avgCorrectRate": "45%", "tendency": "論旨の把握が弱い", "evaluation": "△", "priority": "高", "strategy": "段落ごとに要点をまとめる練習"},
      {"field": "語彙", "unit": "語彙・慣用句", "count": "2", "avgCorrectRate": "52%", "tendency": "語彙の定着が不十分", "evaluation": "△", "priority": "中", "strategy": "毎日5語の語彙学習"},
      {"field": "記述", "unit": "記述表現", "count": "4", "avgCorrectRate": "40%", "tendency": "記述が短くなりがち", "evaluation": "×", "priority": "最高", "strategy": "短い記述練習を週3回行う"}
    ],
    "sansu": [
      {"field": "数量", "unit": "比・割合・速さ", "count": "5", "avgCorrectRate": "48%", "tendency": "比の計算でミスが多い", "evaluation": "△", "priority": "最高", "strategy": "比の基本問題を毎日10問"},
      {"field": "図形", "unit": "平面図形", "count": "3", "avgCorrectRate": "55%", "tendency": "補助線が引けない", "evaluation": "△", "priority": "高", "strategy": "典型問題の解法を整理"},
      {"field": "場合の数", "unit": "場合の数・確率", "count": "2", "avgCorrectRate": "50%", "tendency": "数え漏れが多い", "evaluation": "△", "priority": "中", "strategy": "樹形図で整理する習慣"}
    ],
    "rika": [
      {"field": "化学", "unit": "水溶液・化学計算", "count": "3", "avgCorrectRate": "50%", "tendency": "濃度計算が曖昧", "evaluation": "△", "priority": "高", "strategy": "公式を整理して演習"},
      {"field": "物理", "unit": "電気・てこ・浮力", "count": "2", "avgCorrectRate": "55%", "tendency": "つり合い条件を混同", "evaluation": "△", "priority": "高", "strategy": "図を描いて整理する"},
      {"field": "生物", "unit": "植物・動物のつくり", "count": "2", "avgCorrectRate": "60%", "tendency": "暗記が不十分", "evaluation": "○", "priority": "中", "strategy": "図鑑でビジュアル的に覚える"}
    ],
    "shakai": [
      {"field": "歴史", "unit": "近現代史", "count": "4", "avgCorrectRate": "45%", "tendency": "出来事の前後関係が曖昧", "evaluation": "△", "priority": "高", "strategy": "年表を作成して流れを整理"},
      {"field": "地理", "unit": "産業・貿易", "count": "2", "avgCorrectRate": "52%", "tendency": "産業と地域の組み合わせが曖昧", "evaluation": "△", "priority": "中", "strategy": "白地図に書き込む"},
      {"field": "公民", "unit": "政治のしくみ", "count": "2", "avgCorrectRate": "50%", "tendency": "三権分立が混乱しやすい", "evaluation": "△", "priority": "中", "strategy": "図解で三権の関係を整理"}
    ]
  },
  "schoolJudgments": [{"name": "", "tag": "", "currentJudgment": "", "pointsToA": "", "strongSubjects": "", "weakSubjects": "", "strategy": "", "decisionTiming": "", "diffs": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0}}]
}`,
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

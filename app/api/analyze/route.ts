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

/** ClaudeレスポンスからJSONオブジェクトを確実に抽出してパース */
function extractJson(text: string): unknown | null {
  // ```json ... ``` コードブロックを除去
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

  // 最初の { から最後の } までを抽出
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  const jsonStr = stripped.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("[analyze] JSON parse error:", e instanceof Error ? e.message : e);
    console.error("[analyze] JSON preview:", jsonStr.slice(0, 300));
    return null;
  }
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
    weaknesses: { kokugo: [], sansu: [], rika: [], shakai: [] },
    schoolJudgments: [],
    _parseError: true,
  };
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
      max_tokens: 2048,
      system:
        "あなたは中学受験の成績分析の専門家です。提供されたテストデータから偏差値・弱点・志望校を分析し、必ずJSON形式のみで返答してください。コードブロック（```）は使わず、JSONオブジェクトだけを返してください。",
      messages: [
        {
          role: "user",
          content: `以下の学習ファイルを分析してください。取得できないファイルはファイル名から推定してください。

${filesDescription}

【分析項目1: 偏差値データ】
各テストの国語・算数・理科・社会・4科計の偏差値、平均・最高・直近3回平均、判定ランク（A〜E）

【分析項目2: 単元別弱点分析】
各科目（kokugo/sansu/rika/shakai）について：分野・単元・出現回数・平均正答率・傾向・評価(◎○△×)・優先度(最高/高/中/低/なし)・対策
必ずweaknessesフィールドにkokugo・sansu・rika・shokaiの配列を含めてください。データが不明な場合も空配列[]ではなく、ファイル名から推測した内容を入れてください。各科目最低3件以上の弱点項目を返してください。

【分析項目3: 志望校分析】
現在の偏差値と目標偏差値の差分・判定・強み弱み科目・対策・判断時期

JSONのみ返してください（他の文章・コードブロック不要）:
{
  "deviationScores": {
    "tests": [{"name": "", "date": "", "kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0, "rank": ""}],
    "averages": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0},
    "best": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0},
    "recent3avg": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0}
  },
  "weaknesses": {
    "kokugo": [{"field": "読解", "unit": "物語文の心情把握", "count": "3", "avgCorrectRate": "45%", "tendency": "登場人物の気持ちの読み取りが弱い", "evaluation": "△", "priority": "高", "strategy": "毎日1題の読解練習"}],
    "sansu": [{"field": "計算", "unit": "分数の計算", "count": "4", "avgCorrectRate": "50%", "tendency": "通分ミスが多い", "evaluation": "△", "priority": "最高", "strategy": "計算ドリルで反復練習"}],
    "rika": [{"field": "生物", "unit": "植物のつくり", "count": "2", "avgCorrectRate": "55%", "tendency": "光合成の仕組みが曖昧", "evaluation": "○", "priority": "中", "strategy": "図を使って整理"}],
    "shakai": [{"field": "歴史", "unit": "江戸時代", "count": "3", "avgCorrectRate": "48%", "tendency": "年号・人物の混同が多い", "evaluation": "△", "priority": "高", "strategy": "年表を作成して整理"}]
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
      console.error("[analyze] Could not extract JSON. Returning default structure.");
      return Response.json(
        {
          ...defaultResult(),
          error: "分析結果の解析に失敗しました",
          detail: "JSONを抽出できませんでした",
          rawResponse: text.slice(0, 500),
        },
        { status: 200 } // 200で返してフロントでエラー表示
      );
    }

    console.log("[analyze] success");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = parsed as any;
    console.log("[analyze] parsed weaknesses kokugo:", JSON.stringify(p?.weaknesses?.kokugo?.length ?? "N/A"));
    console.log("[analyze] parsed weaknesses sansu:", JSON.stringify(p?.weaknesses?.sansu?.length ?? "N/A"));
    console.log("[analyze] parsed weaknesses rika:", JSON.stringify(p?.weaknesses?.rika?.length ?? "N/A"));
    console.log("[analyze] parsed weaknesses shakai:", JSON.stringify(p?.weaknesses?.shakai?.length ?? "N/A"));
    console.log("[analyze] parsed deviationScores tests count:", p?.deviationScores?.tests?.length ?? "N/A");
    console.log("[analyze] parsed schoolJudgments count:", p?.schoolJudgments?.length ?? "N/A");
    return Response.json(parsed);
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

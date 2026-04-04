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
    // Google Docs → plain text export
    if (file.mimeType === "application/vnd.google-apps.document") {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`,
        { headers }
      );
      if (!res.ok) {
        const err = await res.text();
        console.log(`[analyze] fetch failed (Doc) ${file.name}: ${res.status} ${err.slice(0, 200)}`);
        return { content: "", fetchStatus: `Doc export failed: ${res.status}` };
      }
      const text = await res.text();
      return { content: text.slice(0, 3000), fetchStatus: "ok" };
    }

    // Google Sheets → CSV export
    if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv`,
        { headers }
      );
      if (!res.ok) {
        const err = await res.text();
        console.log(`[analyze] fetch failed (Sheets) ${file.name}: ${res.status} ${err.slice(0, 200)}`);
        return { content: "", fetchStatus: `Sheets export failed: ${res.status}` };
      }
      const text = await res.text();
      return { content: text.slice(0, 3000), fetchStatus: "ok" };
    }

    // Excel (.xlsx) → Google Sheets形式にエクスポートしてCSV取得
    if (
      file.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimeType === "application/vnd.ms-excel"
    ) {
      // まずファイルをDriveにコピーしてSheetsに変換する代わりに、
      // xlsxは直接バイナリなのでCSV変換できないため、
      // Driveのfiles.export（Sheets変換）を試みる
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv`,
        { headers }
      );
      if (exportRes.ok) {
        const text = await exportRes.text();
        return { content: text.slice(0, 3000), fetchStatus: "ok (xlsx→csv)" };
      }
      // exportが使えないネイティブxlsxの場合はファイル名のみ
      console.log(`[analyze] xlsx export not available for ${file.name}, using filename only`);
      return { content: "", fetchStatus: "xlsx: export unavailable, filename only" };
    }

    // Plain text / JSON
    if (file.mimeType.startsWith("text/") || file.mimeType === "application/json") {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers }
      );
      if (!res.ok) {
        const err = await res.text();
        console.log(`[analyze] fetch failed (text) ${file.name}: ${res.status} ${err.slice(0, 200)}`);
        return { content: "", fetchStatus: `text fetch failed: ${res.status}` };
      }
      const text = await res.text();
      return { content: text.slice(0, 3000), fetchStatus: "ok" };
    }

    // PDF・画像など: ファイル名のみで推定
    return { content: "", fetchStatus: `unsupported mimeType: ${file.mimeType}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[analyze] fetchFileContent exception for ${file.name}: ${msg}`);
    return { content: "", fetchStatus: `exception: ${msg}` };
  }
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

    console.log(`[analyze] starting analysis for ${files.length} files`);

    // ファイル内容を並列取得（最大15件）
    const targets = files.slice(0, 15);
    const fileContents = await Promise.all(
      targets.map(async (file) => {
        const { content, fetchStatus } = await fetchFileContent(file, accessToken);
        console.log(`[analyze] ${file.name} (${file.mimeType}): fetchStatus=${fetchStatus}, contentLen=${content.length}`);
        return { name: file.name, mimeType: file.mimeType, content, fetchStatus };
      })
    );

    // ファイル内容が1件も取れなかった場合もファイル名だけで分析を続行
    const filesDescription = fileContents
      .map((f) => {
        const contentPart = f.content
          ? `内容:\n${f.content}`
          : `内容: (テキスト抽出不可[${f.fetchStatus}] — ファイル名・タイプから科目・成績を推定してください)`;
        return `ファイル名: ${f.name}\nタイプ: ${f.mimeType}\n${contentPart}`;
      })
      .join("\n\n---\n\n");

    console.log(`[analyze] sending to Claude. Total description length: ${filesDescription.length}`);

    const response = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system:
        "あなたは中学受験の成績分析の専門家です。提供されたテストデータを深く分析し、必ずJSON形式のみで返答してください。JSONの前後に余計な文章を含めないでください。ファイル内容が取得できない場合でも、ファイル名・タイプから科目・成績・単元を推定して分析してください。",
      messages: [
        {
          role: "user",
          content: `以下の学習ファイルを分析してください。テキストが取得できないファイルはファイル名から科目・内容を推定してください。

${filesDescription}

あなたは中学受験の成績分析の専門家です。提供されたテストデータを以下の形式で深く分析してください。

【分析項目1: 偏差値データ】
- 各テストの国語・算数・理科・社会・4科計の偏差値
- 平均偏差値・最高値・直近3回平均
- 判定ランク（A〜E）

【分析項目2: 単元別弱点分析】
各科目について以下を分析してください：
- 分野名
- 単元名
- 出現回数（何回のテストに出たか）
- 平均正答率（全体の正答率）
- 正答傾向（どのような間違いパターンがあるか）
- 評価（◎/○/△/×）
- 優先度（最高/高/中/低/なし）
- 具体的な対策コメント（どんな練習をすべきか詳しく）

【分析項目3: 志望校分析】
- 現在の偏差値と目標偏差値の差分
- 合格判定
- 強み科目・弱み科目
- 具体的な対策方針
- 合否判断時期

【分析項目4: 学習ルーティン提案】
- 毎日の学習時間配分（45分想定）
- 時期別の学習内容の変化
- 各項目のデータ根拠

【分析項目5: バックキャスト計画】
- 入試日から逆算した月別学習計画
- フェーズ分け（守り期・始動期・天王山・過去問期・仕上げ・直前）
- 科目別の月別タスク

以下のJSON形式のみで返してください（他の文章は不要）:
{
  "deviationScores": {
    "tests": [{"name": "", "date": "", "kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0, "rank": ""}],
    "averages": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0},
    "best": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0},
    "recent3avg": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0, "total": 0}
  },
  "weaknesses": {
    "kokugo": [{"field": "", "unit": "", "count": "", "avgCorrectRate": "", "tendency": "", "evaluation": "", "priority": "", "strategy": ""}],
    "sansu": [],
    "rika": [],
    "shakai": []
  },
  "schoolJudgments": [{"name": "", "tag": "", "currentJudgment": "", "pointsToA": "", "strongSubjects": "", "weakSubjects": "", "strategy": "", "decisionTiming": "", "diffs": {"kokugo": 0, "sansu": 0, "rika": 0, "shakai": 0}}],
  "routine": {
    "summary": "",
    "items": [{"time": "", "subject": "", "importance": "", "menu": "", "detail": ""}],
    "phases": [{"period": "", "reading": "", "vocabulary": ""}]
  },
  "backcast": {
    "topPriorities": "",
    "phases": [{"phase": "", "months": [{"month": "", "kokugo": "", "sansu": "", "rika": "", "shakai": "", "routine": ""}]}]
  }
}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    console.log(`[analyze] Claude response length: ${text.length}`);
    console.log(`[analyze] Claude response preview: ${text.slice(0, 300)}`);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[analyze] Claude response did not contain JSON. Full response:", text);
      return Response.json(
        {
          error: "分析結果の解析に失敗しました",
          detail: "ClaudeがJSON形式で返答しませんでした",
          rawResponse: text.slice(0, 500),
        },
        { status: 500 }
      );
    }

    try {
      const result = JSON.parse(jsonMatch[0]);
      console.log("[analyze] analysis complete successfully");
      return Response.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[analyze] JSON parse error:", msg);
      console.error("[analyze] Matched JSON string:", jsonMatch[0].slice(0, 500));
      return Response.json(
        {
          error: "分析結果の解析に失敗しました",
          detail: `JSONパースエラー: ${msg}`,
          rawResponse: jsonMatch[0].slice(0, 500),
        },
        { status: 500 }
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[analyze] Unexpected error:", msg, stack);
    return Response.json(
      {
        error: "分析中に予期しないエラーが発生しました",
        detail: msg,
      },
      { status: 500 }
    );
  }
}

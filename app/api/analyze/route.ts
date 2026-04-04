import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "../auth/[...nextauth]/route";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
};

async function fetchFileContent(
  file: DriveFile,
  accessToken: string
): Promise<string> {
  try {
    let url: string;
    if (file.mimeType === "application/vnd.google-apps.document") {
      url = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`;
    } else if (
      file.mimeType.startsWith("text/") ||
      file.mimeType === "application/json"
    ) {
      url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
    } else {
      return "";
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return "";

    const text = await res.text();
    return text.slice(0, 2000);
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
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

  const targets = files.slice(0, 10);
  const fileContents = await Promise.all(
    targets.map(async (file) => {
      const content = await fetchFileContent(file, accessToken);
      return { name: file.name, mimeType: file.mimeType, content };
    })
  );

  const filesDescription = fileContents
    .map(
      (f) =>
        `ファイル名: ${f.name}\nタイプ: ${f.mimeType}\n内容: ${
          f.content || "(テキスト抽出不可 — ファイル名から科目・内容を推定してください)"
        }`
    )
    .join("\n\n---\n\n");

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system:
      "あなたは中学受験の成績分析の専門家です。提供されたテストデータを深く分析し、必ずJSON形式のみで返答してください。JSONの前後に余計な文章を含めないでください。",
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

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Claude response did not contain JSON:", text);
    return Response.json(
      { error: "分析結果の解析に失敗しました" },
      { status: 500 }
    );
  }

  try {
    const result = JSON.parse(jsonMatch[0]);
    return Response.json(result);
  } catch (e) {
    console.error("JSON parse error:", e, jsonMatch[0]);
    return Response.json(
      { error: "分析結果の解析に失敗しました" },
      { status: 500 }
    );
  }
}

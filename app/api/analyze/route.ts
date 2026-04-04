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
      // PDFや画像など: テキスト取得不可のためファイル名のみ
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

  // 各ファイルのテキスト内容を並列取得（最大10件）
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
        `ファイル名: ${f.name}\nタイプ: ${f.mimeType}\n内容: ${f.content || "(テキスト抽出不可 — ファイル名から推定してください)"}`
    )
    .join("\n\n---\n\n");

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system:
      "あなたは中学受験の学習データを分析するAIです。提供されたファイル情報から学習状況を分析し、必ずJSON形式のみで返答してください。JSONの前後に余計な文章を含めないでください。",
    messages: [
      {
        role: "user",
        content: `以下の学習ファイルを分析してください。テキストが取得できないファイルはファイル名から科目・内容を推定してください。

${filesDescription}

以下のJSON形式のみで返してください:
{
  "deviationScores": {
    "japanese": <国語偏差値(整数)>,
    "math": <算数偏差値(整数)>,
    "science": <理科偏差値(整数)>,
    "social": <社会偏差値(整数)>,
    "total": <4科偏差値(整数)>
  },
  "weaknesses": [
    {
      "subject": "<科目名>",
      "topic": "<単元名>",
      "count": <出現回数(整数)>,
      "accuracy": <正答率%(整数)>,
      "priority": "<高|中|低>",
      "measure": "<具体的な対策>"
    }
  ],
  "schoolJudgments": [
    {
      "name": "<学校名>",
      "rank": "<第一志望|第二志望|第三志望>",
      "judgment": "<A判定|B判定|C判定>",
      "diff": "<偏差値差(例:+3.2)>",
      "strategy": "<対策方針(1〜2文)>"
    }
  ],
  "trendData": [<直近の偏差値推移、最大10個の整数配列>]
}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // JSONを抽出してパース
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

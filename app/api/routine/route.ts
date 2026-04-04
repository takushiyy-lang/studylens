export const maxDuration = 60;

import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "../auth/[...nextauth]/route";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJson(text: string): unknown | null {
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const fileNames: string[] = body?.fileNames ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analysisContext: string = body?.analysisContext ?? "";

    const response = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system:
        "あなたは中学受験の学習コーチです。提供された分析結果をもとにルーティンとバックキャスト計画を作成し、必ずJSONのみで返答してください。コードブロック（```）は使わないでください。",
      messages: [
        {
          role: "user",
          content: `以下の分析結果・ファイル情報をもとに学習ルーティンとバックキャスト計画を作成してください。

ファイル名: ${fileNames.join(", ") || "(なし)"}
分析コンテキスト: ${analysisContext || "(なし)"}

【分析項目4: 学習ルーティン提案】
毎日の学習時間配分（45分想定）、時期別の変化

【分析項目5: バックキャスト計画】
入試から逆算した月別計画、フェーズ分け（守り期・始動期・天王山・過去問期・仕上げ・直前）

JSONのみ返してください:
{
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
    const parsed = extractJson(text);
    if (!parsed) {
      return Response.json(
        { error: "ルーティン生成に失敗しました", rawResponse: text.slice(0, 300) },
        { status: 200 }
      );
    }
    return Response.json(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[routine] error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

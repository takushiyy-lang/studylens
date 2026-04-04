import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message || typeof message !== "string") {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system:
      "あなたは中学受験専門のAIアドバイザーです。小学生とその保護者に寄り添い、温かく励ます口調で回答してください。回答は200字以内にまとめ、具体的なアドバイスを心がけてください。",
    messages: [{ role: "user", content: message }],
  });

  const reply =
    response.content[0].type === "text" ? response.content[0].text : "";

  return Response.json({ reply });
}

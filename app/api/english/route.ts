export const maxDuration = 60;

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJson(text: string): unknown | null {
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(stripped.slice(start, end + 1));
    } catch {}
  }
  try {
    return JSON.parse(text.trim());
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    // Word / PDF file parsing
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return Response.json({ error: "No file" }, { status: 400 });
      const arrayBuffer = await file.arrayBuffer();
      const nodeBuffer = Buffer.from(arrayBuffer);

      let text = "";

      if (file.name.endsWith(".docx")) {
        // mammoth requires a Node.js Buffer, not ArrayBuffer
        const result = await mammoth.extractRawText({ buffer: nodeBuffer });
        text = result.value.slice(0, 8000);

      } else if (file.name.endsWith(".pdf")) {
        // Claude native PDF reading — no extra library needed
        const base64 = nodeBuffer.toString("base64");
        const res = await claude.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64 },
              },
              { type: "text", text: "このPDFから全テキストを抽出してください。説明なしでテキストのみ返してください。" },
            ],
          }],
        });
        const raw = res.content[0].type === "text" ? res.content[0].text : "";
        text = raw.slice(0, 8000);

      } else {
        return Response.json({ error: ".docx または .pdf のみ対応しています" }, { status: 400 });
      }

      if (!text.trim()) return Response.json({ error: "テキストを抽出できませんでした" }, { status: 422 });
      return Response.json({ text });
    }

    const body = await req.json();
    const { action } = body as { action: string };

    // Generate study plan from extracted text
    // Returns a COMPACT skeleton (no detailed content) to stay fast and within token limits.
    // Questions are generated lazily per-step using the document text.
    if (action === "generate_plan") {
      const { text } = body as { text: string };
      const res = await claude.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: `You are an expert English teacher. Identify every distinct learning item in the document and organize them into a progressive study plan. Return JSON ONLY, no explanation.`,
        messages: [
          {
            role: "user",
            content: `Analyze this document and create a COMPREHENSIVE study plan that covers EVERY distinct expression, phrase, grammar pattern, or usage it contains.

Document:
${text}

INSTRUCTIONS:
1. List EVERY distinct learning item in the document. Do NOT skip any.
2. Group related items into clusters of 2–4 items each.
3. For EACH cluster, output exactly 4 step entries in order: memorize → confirm → apply → master.
4. No limit on groups — create as many as needed.
5. Keep each step entry SHORT (title only, no detailed content). Questions will be generated later.

Return ONLY this compact JSON (repeat the 4-step pattern for every group):
{
  "title": "プランのタイトル（日本語OK）",
  "steps": [
    { "id": "s1_1", "groupId": "g1", "groupTheme": "グループのテーマ（例：haveの所有表現）", "phase": "memorize", "title": "覚えるステップ：[内容]" },
    { "id": "s1_2", "groupId": "g1", "groupTheme": "グループのテーマ", "phase": "confirm",  "title": "確認するステップ：[内容]" },
    { "id": "s1_3", "groupId": "g1", "groupTheme": "グループのテーマ", "phase": "apply",    "title": "使えるステップ：[内容]" },
    { "id": "s1_4", "groupId": "g1", "groupTheme": "グループのテーマ", "phase": "master",   "title": "定着するステップ：[内容]" },
    { "id": "s2_1", "groupId": "g2", "groupTheme": "次のグループ",     "phase": "memorize", "title": "覚えるステップ：[内容]" },
    ... (all groups)
  ]
}`,
          },
        ],
      });
      const raw = res.content[0].type === "text" ? res.content[0].text : "";
      const parsed = extractJson(raw);
      if (!parsed) return Response.json({ error: "プランの生成に失敗しました。もう一度試してください。" }, { status: 500 });
      return Response.json(parsed);
    }

    // Generate a composition question for a step
    if (action === "generate_question") {
      const { step, questionIndex, documentText } = body as {
        step: { id: string; phase?: string; groupTheme?: string; title: string; goal?: string; input_example?: string; tasks?: string[] };
        questionIndex: number;
        documentText?: string;
      };

      const phase = step.phase ?? "apply";
      const phaseInstructions: Record<string, string> = {
        memorize: `MEMORIZE phase: extremely easy — ask the user to type out one specific phrase exactly as it appears in the document. Put that exact phrase in the hint field. difficulty: "easy".`,
        confirm:  `CONFIRM phase: ask the user to recall a phrase from memory without showing it. Give a strong Japanese context clue. difficulty: "easy".`,
        apply:    `APPLY phase: ask the user to write a natural English sentence using expressions from the document in a realistic situation. difficulty: "medium".`,
        master:   `MASTER phase: ask the user to express an idea freely and naturally — no hints, no memorized phrases. difficulty: "hard".`,
      };

      const docSection = documentText
        ? `\n\nSource document — base ALL questions STRICTLY on expressions found here only:\n${documentText.slice(0, 4000)}`
        : "";

      const extraContext = [
        step.goal && `Goal: ${step.goal}`,
        step.input_example && `Key content: ${step.input_example}`,
        step.tasks?.length && `Tasks: ${step.tasks.join(", ")}`,
      ].filter(Boolean).join("\n");

      const res = await claude.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system: `You are an English teacher creating progressive writing exercises. ${phaseInstructions[phase] ?? phaseInstructions.apply} Return JSON ONLY.`,
        messages: [
          {
            role: "user",
            content: `Create English composition question #${questionIndex + 1} for this step.

Step: ${step.title}
Group theme: ${step.groupTheme ?? ""}
${extraContext}${docSection}

Return this exact JSON:
{
  "id": "q_${step.id}_${questionIndex}",
  "japanese": "日本語で状況や課題を説明（わかりやすく、50文字以内）",
  "hint": "${phase === "memorize" ? "Show the exact phrase from the document to type here" : phase === "confirm" ? "Optional very short hint or empty string" : ""}",
  "context": "Brief English context (1 sentence)",
  "difficulty": "${phase === "memorize" || phase === "confirm" ? "easy" : phase === "apply" ? "medium" : "hard"}"
}`,
          },
        ],
      });
      const raw = res.content[0].type === "text" ? res.content[0].text : "";
      const parsed = extractJson(raw);
      if (!parsed) return Response.json({ error: "Parse failed" }, { status: 500 });
      return Response.json(parsed);
    }

    // Grade user's English answer
    if (action === "grade_answer") {
      const { question, answer, step } = body as {
        question: { japanese: string; context: string; difficulty: string };
        answer: string;
        step: { title: string; groupTheme?: string; goal?: string };
      };
      const res = await claude.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `You are a friendly English teacher grading student composition. Evaluate on meaning, grammar, and naturalness — NOT exact wording. Be encouraging but constructive. Return JSON ONLY.`,
        messages: [
          {
            role: "user",
            content: `Grade this English answer.

Task (Japanese): ${question.japanese}
Context: ${question.context}
Difficulty: ${question.difficulty}
Learning goal: ${step.goal ?? step.groupTheme ?? step.title}

Student answer: "${answer}"

Return this exact JSON:
{
  "score": "correct OR partial OR incorrect",
  "retry": false,
  "good_points": ["What was good (1-2 points, can be empty array if nothing good)"],
  "corrections": ["Specific corrections needed (empty array if none)"],
  "improved_example": "A natural, improved version of the sentence",
  "brief_explanation": "One sentence explaining the main point"
}

Scoring rules:
- "correct": Meaning is clear, grammar is acceptable, sounds natural
- "partial": Meaning is understandable but has notable grammar issues or sounds unnatural
- "incorrect": Meaning is unclear, major grammar errors, or blank/gibberish
- Set retry to true ONLY for "incorrect" score
- For "partial", retry should be false (show feedback, let user decide to retry)`,
          },
        ],
      });
      const raw = res.content[0].type === "text" ? res.content[0].text : "";
      const parsed = extractJson(raw);
      if (!parsed) return Response.json({ error: "Parse failed" }, { status: 500 });
      return Response.json(parsed);
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[english]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

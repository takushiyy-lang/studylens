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
    if (action === "generate_plan") {
      const { text } = body as { text: string };
      const res = await claude.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: `You are an expert English teacher who uses progressive learning design. Always structure plans from the easiest to hardest. Return JSON ONLY, no explanation.`,
        messages: [
          {
            role: "user",
            content: `Based on this document, create a 4-step progressive English study plan that goes from very easy to natural mastery.

Document:
${text}

IMPORTANT: Always use exactly these 4 phases in order, adapted to the document's topic:

Phase 1 — 覚えるステップ (Memorize): Pick 3-5 KEY phrases/expressions from the document. The goal is just to recognize and remember them. Very easy.
Phase 2 — 確認するステップ (Confirm): Check if the user can recall those phrases from memory with simple prompts. Easy.
Phase 3 — 使えるステップ (Apply): Use the phrases in real situations related to the document. Medium difficulty.
Phase 4 — 定着するステップ (Master): Write naturally without relying on memorized phrases — express ideas freely. Harder.

Return this exact JSON structure:
{
  "title": "Study Plan title based on document topic (Japanese OK)",
  "steps": [
    {
      "id": "step_1",
      "phase": "memorize",
      "title": "覚えるステップ：[topic from document]",
      "goal": "What the user will memorize (very specific, e.g. '3 key greeting phrases')",
      "input_example": "The key phrases to learn, taken directly from the document",
      "tasks": ["Phrase 1 to memorize", "Phrase 2 to memorize", "Phrase 3 to memorize"]
    },
    {
      "id": "step_2",
      "phase": "confirm",
      "title": "確認するステップ：[topic]",
      "goal": "Recall the memorized phrases from memory",
      "input_example": "A simple recall situation",
      "tasks": ["Recall task 1", "Recall task 2"]
    },
    {
      "id": "step_3",
      "phase": "apply",
      "title": "使えるステップ：[topic]",
      "goal": "Use the phrases in real context from the document",
      "input_example": "A realistic situation where these phrases are needed",
      "tasks": ["Application task 1", "Application task 2", "Application task 3"]
    },
    {
      "id": "step_4",
      "phase": "master",
      "title": "定着するステップ：[topic]",
      "goal": "Express ideas naturally and freely on this topic",
      "input_example": "An open-ended situation requiring natural expression",
      "tasks": ["Free expression task 1", "Variation task 2", "Creative task 3"]
    }
  ]
}`,
          },
        ],
      });
      const raw = res.content[0].type === "text" ? res.content[0].text : "";
      const parsed = extractJson(raw);
      if (!parsed) return Response.json({ error: "Parse failed" }, { status: 500 });
      return Response.json(parsed);
    }

    // Generate a composition question for a step
    if (action === "generate_question") {
      const { step, questionIndex, documentText } = body as {
        step: { id: string; phase?: string; title: string; goal: string; input_example: string; tasks: string[] };
        questionIndex: number;
        documentText?: string;
      };

      const phase = step.phase ?? "apply";
      const phaseInstructions: Record<string, string> = {
        memorize: `This is the MEMORIZE phase. Questions must be extremely easy — just ask the user to type out one of the given phrases exactly as shown. Provide the phrase in the hint field. difficulty: "easy".`,
        confirm:  `This is the CONFIRM phase. Questions ask the user to recall a phrase from memory without showing it. Give a strong Japanese context clue. difficulty: "easy".`,
        apply:    `This is the APPLY phase. Questions ask the user to write a natural English sentence using the learned phrases in a realistic situation. difficulty: "medium".`,
        master:   `This is the MASTER phase. Questions ask the user to express an idea freely and naturally without relying on memorized phrases. No hints. difficulty: "hard".`,
      };

      const docSection = documentText
        ? `\n\nSource document (STRICTLY use only vocabulary, expressions, and grammar patterns found in this document — do NOT introduce unrelated expressions):\n${documentText.slice(0, 3000)}`
        : "";

      const res = await claude.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system: `You are an English teacher creating progressive writing exercises. ${phaseInstructions[phase] ?? phaseInstructions.apply} Return JSON ONLY.`,
        messages: [
          {
            role: "user",
            content: `Create English composition question #${questionIndex + 1} for this step.

Step: ${step.title}
Goal: ${step.goal}
Key content: ${step.input_example}
Tasks: ${step.tasks.join(", ")}${docSection}

Return this exact JSON:
{
  "id": "q_${step.id}_${questionIndex}",
  "japanese": "日本語で状況や課題を説明（わかりやすく、50文字以内）",
  "hint": "${phase === "memorize" ? "Show the exact phrase to type here" : phase === "confirm" ? "Optional very short hint or empty string" : ""}",
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
        step: { title: string; goal: string };
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
Learning goal: ${step.goal}

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

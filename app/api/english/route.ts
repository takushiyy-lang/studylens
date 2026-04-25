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
      const buffer = await file.arrayBuffer();

      let text = "";

      if (file.name.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        text = result.value.slice(0, 8000);

      } else if (file.name.endsWith(".pdf")) {
        // Claude native PDF reading — no extra library needed
        const base64 = Buffer.from(buffer).toString("base64");
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
        system: `You are an expert English teacher. Analyze text from a user's document and create a personalized English study plan focused on practical composition skills. Return JSON ONLY, no explanation.`,
        messages: [
          {
            role: "user",
            content: `Based on this document text, create a study plan with 4-5 steps to help the user write natural English about these topics.

Document:
${text}

Return this exact JSON structure:
{
  "title": "Study Plan title based on document content",
  "steps": [
    {
      "id": "step_1",
      "title": "Step title",
      "goal": "What the user will be able to do",
      "input_example": "A real situation from the document where this skill is needed",
      "tasks": ["Task 1", "Task 2", "Task 3"]
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
      const { step, questionIndex } = body as {
        step: { id: string; title: string; goal: string; input_example: string; tasks: string[] };
        questionIndex: number;
      };
      const res = await claude.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system: `You are an English teacher creating practical writing exercises. Generate varied questions based on the step. Question ${questionIndex + 1} should be ${questionIndex === 0 ? "basic" : questionIndex === 1 ? "intermediate" : "advanced"}. Return JSON ONLY.`,
        messages: [
          {
            role: "user",
            content: `Create English composition question #${questionIndex + 1} for this step.

Step: ${step.title}
Goal: ${step.goal}
Context: ${step.input_example}
Tasks: ${step.tasks.join(", ")}

Return this exact JSON:
{
  "id": "q_${step.id}_${questionIndex}",
  "japanese": "日本語で状況や課題を説明（50文字以内）",
  "hint": "Optional English hint phrase (or empty string)",
  "context": "Brief English context description",
  "difficulty": "${questionIndex === 0 ? "easy" : questionIndex === 1 ? "medium" : "hard"}"
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

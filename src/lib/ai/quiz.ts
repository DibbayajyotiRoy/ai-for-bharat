import { invokeModelWithFallback } from "./models";

export interface QuizQuestion {
  question: string;
  options: string[]; // exactly 4 options
  correctIndex: number; // 0-3
  explanation: string;
}

export interface QuizData {
  topic: string;
  questions: QuizQuestion[];
}

const QUIZ_SYSTEM_PROMPT = `You are a precise educational quiz generator. Your ONLY output is a valid JSON object.

OUTPUT FORMAT (raw JSON, no markdown fences, no extra text):
{
  "topic": "short descriptive topic name",
  "questions": [
    {
      "question": "A clear, concise question testing understanding",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this answer is correct."
    }
  ]
}

STRICT RULES:
- Generate EXACTLY 4 questions
- Each question must have EXACTLY 4 options
- correctIndex must be 0, 1, 2, or 3 (the index of the correct option)
- Test comprehension and application, not just memorization
- All wrong options must be plausible distractors
- Keep each question under 25 words
- Return ONLY the JSON object — no markdown, no preamble, no postamble`;

export async function generateQuiz(
  explanationContent: string,
  level: "Beginner" | "Intermediate" | "Advanced"
): Promise<QuizData> {
  // Trim to avoid token overuse; the structured explanation is enough context
  const contentSnippet = explanationContent.substring(0, 1200);

  const prompt = `Skill level: ${level}

Explanation to generate questions from:
${contentSnippet}

Generate 4 multiple-choice questions as a JSON object.`;

  const response = await invokeModelWithFallback(prompt, QUIZ_SYSTEM_PROMPT, 800);

  let cleaned = response.content.trim();

  // Strip any accidental markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();

  // If there's surrounding prose, extract just the JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]+\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  try {
    const quiz = JSON.parse(cleaned) as QuizData;

    if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      throw new Error("No questions in response");
    }

    // Cap at 5 questions as a safety guard
    quiz.questions = quiz.questions.slice(0, 5);

    return quiz;
  } catch {
    console.error("[Quiz] Failed to parse model response:", cleaned.substring(0, 300));
    throw new Error("Quiz generation failed. Please try again.");
  }
}

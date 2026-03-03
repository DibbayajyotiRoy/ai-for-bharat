import { invokeModelWithFallback } from "./models";

export interface FollowUpQuestion {
  question: string;
  category: "deeper" | "related" | "practical";
}

const FOLLOW_UP_PROMPT = `You are a learning assistant. Based on the user's question and explanation, generate exactly 3 follow-up questions.

Return ONLY a JSON array:
[
  {"question": "How does X compare to Y?", "category": "related"},
  {"question": "Can you show a real-world example of Z?", "category": "practical"},
  {"question": "What happens internally when W occurs?", "category": "deeper"}
]

Categories: "deeper" (same topic, more depth), "related" (adjacent concept), "practical" (hands-on application)
Rules: Exactly 3 questions, each 10-15 words max, relevant to skill level, ONLY valid JSON output`;

export async function generateFollowUpQuestions(
  query: string,
  explanation: string,
  level: string
): Promise<FollowUpQuestion[]> {
  try {
    const prompt = `User's question: ${query}\nSkill level: ${level}\nExplanation summary: ${explanation.substring(0, 300)}`;
    const response = await invokeModelWithFallback(prompt, FOLLOW_UP_PROMPT, 200);
    const parsed = JSON.parse(response.content.trim());
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 3).map((q: any) => ({
        question: q.question || "Tell me more",
        category: q.category || "related",
      }));
    }
  } catch (error: any) {
    console.warn("[FollowUp] Generation failed:", error.message);
  }
  return [
    { question: `What are common mistakes with ${query.substring(0, 30)}?`, category: "practical" },
    { question: `How does this compare to alternatives?`, category: "related" },
    { question: `What happens under the hood?`, category: "deeper" },
  ];
}

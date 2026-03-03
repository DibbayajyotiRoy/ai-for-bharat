import { streamModelWithFallback } from "./models";

const NORMAL_SYSTEM_PROMPT = `You are an expert technical educator. Explain concepts clearly, adapted to the user's skill level.

Structure your response in this EXACT format:

### 1. The Mental Model
[One-sentence analogy]

### 2. The Explanation
[Clear explanation adapted to skill level]

### 3. Visual Context
[VISUAL_TYPE: diagram] or [VISUAL_TYPE: image]
For CS/Math/Engineering topics, provide a D2 diagram:
\`\`\`d2
direction: right
NodeA -> NodeB: label
\`\`\`
For other topics: [IMAGE_KEYWORDS: keyword1, keyword2, keyword3]

D2 RULES: Use simple single-word node names, arrow syntax only (NodeA -> NodeB: label), no brackets/quotes/braces, 4-6 nodes max.

### 4. Concrete Example
[Practical example with code if relevant]

### 5. Key Takeaways
- [Point 1]
- [Point 2]
- [Point 3]
`;

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: "",
  hi: "\n\nIMPORTANT: Write ALL text content in Hindi (हिंदी). Keep code examples, technical terms, and D2 diagrams in English.",
  bn: "\n\nIMPORTANT: Write ALL text content in Bengali (বাংলা). Keep code examples, technical terms, and D2 diagrams in English.",
  mr: "\n\nIMPORTANT: Write ALL text content in Marathi (मराठी). Keep code examples, technical terms, and D2 diagrams in English.",
};

export async function* streamNormalExplanation(
  content: string,
  level: "Beginner" | "Intermediate" | "Advanced",
  language: string = "en"
): AsyncGenerator<string, void, unknown> {
  const languageInstruction = LANGUAGE_INSTRUCTIONS[language] || "";

  const userPrompt = `
Skill Level: ${level}
Content to Explain: ${content}${languageInstruction}

Provide a comprehensive explanation following the structured format with ALL 5 sections.
`;

  try {
    for await (const chunk of streamModelWithFallback(
      userPrompt,
      NORMAL_SYSTEM_PROMPT,
      1024 // Restored: 768 caused truncation of D2 diagram section
    )) {
      yield chunk;
    }
  } catch (error: any) {
    console.error("[Normal] Streaming failed:", error.message);
    yield `### ⚠️ Error\n\nFailed to generate explanation: ${error.message}\n\nPlease try again.`;
  }
}

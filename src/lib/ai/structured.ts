import { invokeModelWithFallback } from "./models";

export interface StructuredExplanation {
  mentalModel: string;
  explanation: string;
  example: string;
  diagram: string;
  takeaways: string;
}

const STRUCTURED_SYSTEM_PROMPT = `You are an expert technical educator. Your task is to explain concepts in a structured format.

You MUST respond with ONLY valid JSON in this exact format:
{
  "mentalModel": "A one-sentence analogy or mental model",
  "explanation": "Detailed explanation in markdown format",
  "example": "Concrete example with code if relevant (markdown format)",
  "diagram": "Valid D2 diagram syntax (without markdown code fences)",
  "takeaways": "Key takeaways as markdown bullet points"
}

CRITICAL RULES:
1. Response must be valid JSON only
2. No markdown code fences around the JSON
3. D2 diagram must be valid D2 syntax (no \`\`\`d2 wrapper)
4. Escape all quotes inside strings properly
5. Keep explanations concise but complete`;

export async function generateStructuredExplanation(
  content: string,
  level: "Beginner" | "Intermediate" | "Advanced"
): Promise<StructuredExplanation> {
  const userPrompt = `
Skill Level: ${level}
Content to Explain: ${content}

Generate a structured explanation following the JSON format specified in the system prompt.
`;

  let retries = 0;
  const maxRetries = 2;

  while (retries <= maxRetries) {
    try {
      const response = await invokeModelWithFallback(
        userPrompt,
        STRUCTURED_SYSTEM_PROMPT,
        2048
      );

      // Try to parse JSON
      const parsed = JSON.parse(response.content);

      // Validate structure
      if (
        !parsed.mentalModel ||
        !parsed.explanation ||
        !parsed.example ||
        !parsed.takeaways
      ) {
        throw new Error("Missing required fields in structured response");
      }

      console.log("[Structured] Successfully parsed structured output");

      return {
        mentalModel: parsed.mentalModel,
        explanation: parsed.explanation,
        example: parsed.example,
        diagram: parsed.diagram || "",
        takeaways: parsed.takeaways,
      };
    } catch (error: any) {
      console.error(`[Structured] Parse attempt ${retries + 1} failed:`, error.message);
      retries++;

      if (retries > maxRetries) {
        console.error("[Structured] All retries exhausted, using fallback");
        // Return fallback structure
        return {
          mentalModel: "Understanding the concept",
          explanation: `# ${content}\n\nI encountered an issue generating a structured response. Here's a basic explanation:\n\nThis concept requires further exploration.`,
          example: "Example generation failed. Please try again.",
          diagram: "",
          takeaways: "- Retry the request for better results\n- Check system logs for details",
        };
      }
    }
  }

  throw new Error("Failed to generate structured explanation");
}

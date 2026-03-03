import {
  TranslateClient,
  TranslateTextCommand,
} from "@aws-sdk/client-translate";
import { invokeModelWithFallback } from "./models";

const translateClient = new TranslateClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export type SupportedLanguage = "en" | "hi" | "bn" | "mr";

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "हिंदी",
  bn: "বাংলা",
  mr: "मराठी",
};

export const LANGUAGE_SHORT: Record<SupportedLanguage, string> = {
  en: "EN",
  hi: "हि",
  bn: "বা",
  mr: "म",
};

const FULL_LANGUAGE_NAME: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  mr: "Marathi",
};

// ── Primary: Amazon Translate ───────────────────────────────────────────────
async function translateViaAmazon(text: string, targetLanguage: SupportedLanguage): Promise<string> {
  const command = new TranslateTextCommand({
    Text: text,
    SourceLanguageCode: "en",
    TargetLanguageCode: targetLanguage,
  });
  const response = await translateClient.send(command);
  return response.TranslatedText || text;
}

// ── Fallback: Bedrock Nova ──────────────────────────────────────────────────
const TRANSLATE_SYSTEM_PROMPT = `You are a precise translator. Translate the English text provided by the user into the requested Indian language.

RULES:
- Return ONLY the translated text — no preamble, no quotes, no explanation.
- Preserve all markdown formatting (bullet points, bold, etc.).
- Keep technical terms, code snippets, and proper nouns in English.
- Use natural, fluent ${"{language}"} — not transliterated English.`;

async function translateViaBedrock(text: string, targetLanguage: SupportedLanguage): Promise<string> {
  const langName = FULL_LANGUAGE_NAME[targetLanguage];
  const systemPrompt = TRANSLATE_SYSTEM_PROMPT.replace("{language}", langName);
  const prompt = `Translate the following English text into ${langName}:\n\n${text}`;

  const response = await invokeModelWithFallback(prompt, systemPrompt, 1024);
  return response.content.trim();
}

// ── Public API ──────────────────────────────────────────────────────────────
export async function translateText(
  text: string,
  targetLanguage: SupportedLanguage
): Promise<string> {
  if (targetLanguage === "en" || !text.trim()) {
    return text;
  }

  // Cap input to avoid token / byte-limit issues
  const truncated = text.length > 4500 ? text.substring(0, 4500) + "..." : text;

  // Try Amazon Translate first; fall back to Bedrock if it's not available
  try {
    const result = await translateViaAmazon(truncated, targetLanguage);
    console.log(`[Translation] Amazon Translate → ${targetLanguage} OK`);
    return result;
  } catch (amazonError: any) {
    console.warn(`[Translation] Amazon Translate unavailable (${amazonError.message}), falling back to Bedrock`);
  }

  try {
    const result = await translateViaBedrock(truncated, targetLanguage);
    console.log(`[Translation] Bedrock fallback → ${targetLanguage} OK`);
    return result;
  } catch (bedrockError: any) {
    console.error("[Translation] Bedrock fallback also failed:", bedrockError.message);
    throw new Error(`Translation to ${LANGUAGE_NAMES[targetLanguage]} failed: ${bedrockError.message}`);
  }
}

// Translates the entire markdown explanation while preserving code blocks and technical terms
export async function translateFullExplanation(
  content: string,
  targetLanguage: SupportedLanguage
): Promise<string> {
  if (targetLanguage === "en" || !content.trim()) {
    return content;
  }

  // Split content into sections to translate separately (better quality)
  const sections = content.split(/(?=###)/);
  const translatedSections: string[] = [];

  for (const section of sections) {
    // Skip empty sections
    if (!section.trim()) continue;

    // Check if section contains code blocks or diagrams - preserve those
    if (section.includes('```')) {
      // Extract code blocks and translate around them
      const parts = section.split(/(```[\s\S]*?```)/);
      const translatedParts: string[] = [];
      
      for (const part of parts) {
        if (part.startsWith('```')) {
          // Keep code blocks as-is
          translatedParts.push(part);
        } else if (part.trim()) {
          // Translate text parts
          try {
            const translated = await translateText(part, targetLanguage);
            translatedParts.push(translated);
          } catch (err) {
            console.warn('[Translation] Section failed, keeping original');
            translatedParts.push(part);
          }
        }
      }
      translatedSections.push(translatedParts.join(''));
    } else {
      // Translate entire section
      try {
        const translated = await translateText(section, targetLanguage);
        translatedSections.push(translated);
      } catch (err) {
        console.warn('[Translation] Section failed, keeping original');
        translatedSections.push(section);
      }
    }
  }

  return translatedSections.join('\n');
}

// Extracts and translates the key narrative sections from a markdown explanation.
// Only the Mental Model and Key Takeaways are translated; technical code and
// diagrams are intentionally kept in English.
export async function translateMarkdownSections(
  content: string,
  targetLanguage: SupportedLanguage
): Promise<{ mentalModel: string; takeaways: string }> {
  if (targetLanguage === "en") {
    return { mentalModel: "", takeaways: "" };
  }

  // Extract Mental Model (first meaningful line after the section header)
  const mentalModelMatch = content.match(
    /###\s*\d*\.?\s*The Mental Model\s*\n+([\s\S]*?)(?=\n###|$)/i
  );
  const mentalModelRaw = mentalModelMatch
    ? mentalModelMatch[1].trim().split("\n")[0]
    : "";

  // Extract Key Takeaways section (bullet list)
  const takeawaysMatch = content.match(
    /###\s*\d*\.?\s*Key Takeaways\s*\n+([\s\S]*?)(?=\n---|\n###\s*📚|$)/i
  );
  const takeawaysRaw = takeawaysMatch ? takeawaysMatch[1].trim() : "";

  const [mentalModel, takeaways] = await Promise.all([
    mentalModelRaw ? translateText(mentalModelRaw, targetLanguage) : Promise.resolve(""),
    takeawaysRaw ? translateText(takeawaysRaw, targetLanguage) : Promise.resolve(""),
  ]);

  return { mentalModel, takeaways };
}

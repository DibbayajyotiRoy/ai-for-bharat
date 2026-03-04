import { PollyClient, SynthesizeSpeechCommand, type VoiceId, type LanguageCode } from "@aws-sdk/client-polly";
import { getAwsConfig } from "../aws-config";

const client = new PollyClient(getAwsConfig());

export async function synthesizeSpeech(
  text: string,
  languageCode: string = "en"
): Promise<Buffer> {
  // Voice mapping for supported languages
  // Note: AWS Polly doesn't have native Bengali or Marathi voices
  // Using Aditi (bilingual Hindi/English) as fallback for Indian languages
  const voiceMap: Record<string, { voiceId: VoiceId; langCode: LanguageCode; engine?: "standard" | "neural" }> = {
    en: { voiceId: "Joanna", langCode: "en-US", engine: "neural" },
    hi: { voiceId: "Kajal", langCode: "hi-IN", engine: "neural" }, // Native Hindi voice
    bn: { voiceId: "Aditi", langCode: "hi-IN", engine: "standard" }, // Fallback: Aditi can pronounce Bengali text reasonably
    mr: { voiceId: "Aditi", langCode: "hi-IN", engine: "standard" }, // Fallback: Aditi can pronounce Marathi text reasonably
  };

  const voice = voiceMap[languageCode] || voiceMap.en;

  console.log(`[TTS] Synthesizing speech for language: ${languageCode}, voice: ${voice.voiceId}`);

  // Try primary voice, then fallback to Aditi standard for Indian languages
  const attempts = [
    voice,
    // Fallback: Aditi standard (works for Hindi/Bengali/Marathi text)
    ...(languageCode !== 'en' && voice.voiceId !== 'Aditi'
      ? [{ voiceId: 'Aditi' as VoiceId, langCode: 'hi-IN' as LanguageCode, engine: 'standard' as const }]
      : []),
  ];

  for (const attempt of attempts) {
    try {
      const command = new SynthesizeSpeechCommand({
        Text: text.substring(0, 3000),
        OutputFormat: "mp3",
        VoiceId: attempt.voiceId,
        LanguageCode: attempt.langCode,
        Engine: attempt.engine || "neural",
      });

      const response = await client.send(command);

      if (!response.AudioStream) {
        throw new Error("No audio stream returned from Polly");
      }

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.AudioStream as any) {
        chunks.push(chunk);
      }

      console.log(`[TTS] Successfully synthesized with ${attempt.voiceId} (${attempt.engine})`);
      return Buffer.concat(chunks);
    } catch (error: any) {
      console.error(`[TTS] Voice ${attempt.voiceId} (${attempt.engine}) failed for lang=${languageCode}:`, error.message);
      // Continue to next attempt
    }
  }

  throw new Error(`TTS failed for language ${languageCode}: all voice attempts exhausted`);
}


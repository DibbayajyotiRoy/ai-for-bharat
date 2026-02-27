import { PollyClient, SynthesizeSpeechCommand, type VoiceId, type LanguageCode } from "@aws-sdk/client-polly";

const client = new PollyClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function synthesizeSpeech(
  text: string,
  languageCode: string = "en"
): Promise<Buffer> {
  const voiceMap: Record<string, { voiceId: VoiceId; langCode: LanguageCode }> = {
    en: { voiceId: "Joanna", langCode: "en-US" },
    hi: { voiceId: "Kajal", langCode: "hi-IN" },
  };

  const voice = voiceMap[languageCode] || voiceMap.en;

  const command = new SynthesizeSpeechCommand({
    Text: text.substring(0, 3000),
    OutputFormat: "mp3",
    VoiceId: voice.voiceId,
    LanguageCode: voice.langCode,
    Engine: "neural",
  });

  const response = await client.send(command);

  if (!response.AudioStream) {
    throw new Error("No audio stream returned from Polly");
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.AudioStream as any) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

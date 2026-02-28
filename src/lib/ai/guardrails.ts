export interface GuardrailConfig {
  guardrailIdentifier: string;
  guardrailVersion: string;
}

export function getGuardrailConfig(): GuardrailConfig | null {
  const id = process.env.BEDROCK_GUARDRAIL_ID;
  const version = process.env.BEDROCK_GUARDRAIL_VERSION;
  if (!id || !version) return null;
  return { guardrailIdentifier: id, guardrailVersion: version };
}

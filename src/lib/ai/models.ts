import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { getGuardrailConfig } from "./guardrails";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Prioritized model list with fallback
const MODELS = [
  {
    id: "amazon.nova-pro-v1:0",
    name: "Nova Pro",
    maxTokens: 4096,
  },
  {
    id: "amazon.nova-lite-v1:0",
    name: "Nova Lite",
    maxTokens: 4096,
  },
];

export interface ModelResponse {
  content: string;
  modelUsed: string;
  fallbackTriggered: boolean;
}

export async function invokeModelWithFallback(
  prompt: string,
  systemPrompt: string,
  maxTokens: number = 512
): Promise<ModelResponse> {
  let lastError: Error | null = null;
  let fallbackTriggered = false;

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    
    try {
      console.log(`[AI] Attempting model: ${model.name}`);
      
      const payload = {
        messages: [
          {
            role: "user",
            content: [{ text: `${systemPrompt}\n\n${prompt}` }],
          },
        ],
        inferenceConfig: {
          max_new_tokens: Math.min(maxTokens, model.maxTokens),
          temperature: 0.7,
          top_p: 0.9,
        },
      };

      const guardrailConfig = getGuardrailConfig();
      const command = new InvokeModelCommand({
        modelId: model.id,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
        ...(guardrailConfig && {
          guardrailIdentifier: guardrailConfig.guardrailIdentifier,
          guardrailVersion: guardrailConfig.guardrailVersion,
        }),
      });

      const response = await client.send(command);
      const decoded = JSON.parse(new TextDecoder().decode(response.body));
      const content = decoded.output?.message?.content?.[0]?.text;

      if (!content) {
        throw new Error("No content in response");
      }

      console.log(`[AI] Success with ${model.name}`);
      
      return {
        content,
        modelUsed: model.name,
        fallbackTriggered,
      };
    } catch (error: any) {
      console.warn(`[AI] Model ${model.name} failed:`, error.message);
      lastError = error;
      fallbackTriggered = true;

      // If this is the last model, throw
      if (i === MODELS.length - 1) {
        throw new Error(
          `All models failed. Last error: ${error.message}`
        );
      }

      // Otherwise, continue to next model
      console.log(`[AI] Falling back to next model...`);
    }
  }

  throw lastError || new Error("Unknown error in model invocation");
}

export async function* streamModelWithFallback(
  prompt: string,
  systemPrompt: string,
  maxTokens: number = 512
): AsyncGenerator<string, void, unknown> {
  let lastError: Error | null = null;

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    
    try {
      console.log(`[AI] Attempting streaming with model: ${model.name}`);
      
      const payload = {
        messages: [
          {
            role: "user",
            content: [{ text: `${systemPrompt}\n\n${prompt}` }],
          },
        ],
        inferenceConfig: {
          max_new_tokens: Math.min(maxTokens, model.maxTokens),
          temperature: 0.7,
          top_p: 0.9,
        },
      };

      const guardrailConfig = getGuardrailConfig();
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: model.id,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
        ...(guardrailConfig && {
          guardrailIdentifier: guardrailConfig.guardrailIdentifier,
          guardrailVersion: guardrailConfig.guardrailVersion,
        }),
      });

      const response = await client.send(command);

      if (!response.body) {
        throw new Error("No response body");
      }

      console.log(`[AI] Streaming started with ${model.name}`);

      for await (const event of response.body) {
        if (event.chunk) {
          const decoded = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
          const text = decoded.contentBlockDelta?.delta?.text;
          if (text) {
            yield text;
          }
        }
      }

      console.log(`[AI] Streaming completed with ${model.name}`);
      return;
    } catch (error: any) {
      console.warn(`[AI] Streaming failed with ${model.name}:`, error.message);
      lastError = error;

      // If this is the last model, throw
      if (i === MODELS.length - 1) {
        throw new Error(
          `All streaming models failed. Last error: ${error.message}`
        );
      }

      console.log(`[AI] Falling back to next model for streaming...`);
    }
  }

  throw lastError || new Error("Unknown error in streaming");
}

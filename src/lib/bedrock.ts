import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { getAwsConfig } from "./aws-config";

const client = new BedrockRuntimeClient(getAwsConfig());

export async function invokeNova(prompt: string) {
  const modelId = "amazon.nova-pro-v1:0";

  const payload = {
    messages: [
      {
        role: "user",
        content: [{ text: prompt }],
      },
    ],
    inferenceConfig: {
      max_new_tokens: 512,
      temperature: 0.7,
      top_p: 0.9,
    },
  };

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  const response = await client.send(command);

  const decoded = JSON.parse(
    new TextDecoder().decode(response.body)
  );

  return decoded.output?.message?.content?.[0]?.text;
}

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { getAwsConfig } from "../aws-config";

const client = new BedrockRuntimeClient(getAwsConfig());

const MODELS = [
  { id: "amazon.nova-pro-v1:0", name: "Nova Pro" },
  { id: "amazon.nova-lite-v1:0", name: "Nova Lite" },
];

const IMAGE_EXPLAIN_PROMPT = `You are a technical educator. A student has uploaded an image (screenshot of code, error message, documentation, or concept diagram). Explain what's in the image clearly.

REQUIRED FORMAT - YOU MUST INCLUDE ALL SECTIONS:

### 1. The Mental Model
[One-sentence summary of what this image shows]

### 2. The Explanation
[Detailed explanation of what's in the image, adapted to skill level]

### 3. Visual Diagram
\`\`\`d2
direction: right
[Create a D2 diagram that shows the concept/flow depicted in the image]
\`\`\`

### 4. Concrete Example
[If the image shows code: explain what it does and show a corrected/improved version]
[If the image shows an error: explain the fix]
[If the image shows a concept: show a practical code example]

### 5. Key Takeaways
- Point 1
- Point 2
- Point 3

D2 DIAGRAM RULES:
1. Start with: direction: right
2. Use ONLY simple single-word node names
3. Use ONLY arrow syntax: NodeA -> NodeB: label
4. NEVER use brackets, parentheses, quotes, or special characters in node names
5. Keep labels short (1-3 words)`;

export interface MultimodalExplainRequest {
  imageBase64: string;
  mimeType: string;
  query?: string;
  level: "Beginner" | "Intermediate" | "Advanced";
}

export async function explainImage(
  request: MultimodalExplainRequest
): Promise<string> {
  const { imageBase64, mimeType, query, level } = request;

  const userContent: any[] = [
    {
      image: {
        format: mimeType.replace("image/", ""),
        source: { bytes: imageBase64 },
      },
    },
  ];

  if (query) {
    userContent.push({
      text: `User's question about this image: ${query}\nSkill Level: ${level}`,
    });
  } else {
    userContent.push({
      text: `Explain what's in this image.\nSkill Level: ${level}`,
    });
  }

  for (const model of MODELS) {
    try {
      console.log(`[Multimodal] Attempting ${model.name}`);

      const payload = {
        messages: [
          {
            role: "user",
            content: userContent,
          },
        ],
        system: [{ text: IMAGE_EXPLAIN_PROMPT }],
        inferenceConfig: {
          max_new_tokens: 1024,
          temperature: 0.7,
          top_p: 0.9,
        },
      };

      const command = new InvokeModelCommand({
        modelId: model.id,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      const decoded = JSON.parse(new TextDecoder().decode(response.body));
      const content = decoded.output?.message?.content?.[0]?.text;

      if (!content) throw new Error("No content in response");

      console.log(`[Multimodal] Success with ${model.name}`);
      return content;
    } catch (error: any) {
      console.warn(`[Multimodal] ${model.name} failed:`, error.message);
      if (model === MODELS[MODELS.length - 1]) {
        throw error;
      }
    }
  }

  throw new Error("All models failed for image explanation");
}

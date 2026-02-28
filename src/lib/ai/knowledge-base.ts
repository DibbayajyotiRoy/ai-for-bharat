import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrieveCommandInput,
} from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const KNOWLEDGE_BASE_ID = process.env.BEDROCK_KNOWLEDGE_BASE_ID || "";

export interface RetrievedSource {
  title: string;
  url: string;
  content: string;
  score: number;
  credibility: "high" | "medium" | "low";
}

export async function retrieveFromKnowledgeBase(
  query: string,
  maxResults: number = 5
): Promise<RetrievedSource[]> {
  if (!KNOWLEDGE_BASE_ID) {
    console.log("[KnowledgeBase] No KB ID configured, skipping");
    return [];
  }

  try {
    console.log("[KnowledgeBase] Retrieving for:", query.substring(0, 80));

    const input: RetrieveCommandInput = {
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      retrievalQuery: { text: query },
      retrievalConfiguration: {
        vectorSearchConfiguration: { numberOfResults: maxResults },
      },
    };

    const command = new RetrieveCommand(input);
    const response = await client.send(command);

    if (!response.retrievalResults?.length) {
      console.log("[KnowledgeBase] No results found");
      return [];
    }

    const sources: RetrievedSource[] = response.retrievalResults
      .filter((r) => r.content?.text)
      .map((r) => {
        const score = r.score ?? 0;
        const uri = r.location?.s3Location?.uri || r.location?.webLocation?.url || "";
        return {
          title: extractTitleFromUri(uri) || "Knowledge Base Document",
          url: uri,
          content: r.content!.text!.substring(0, 500),
          score,
          credibility: score > 0.7 ? "high" : score > 0.4 ? "medium" : "low",
        };
      });

    console.log(`[KnowledgeBase] Retrieved ${sources.length} sources`);
    return sources;
  } catch (error: any) {
    console.warn("[KnowledgeBase] Retrieval failed:", error.message);
    return [];
  }
}

function extractTitleFromUri(uri: string): string {
  if (!uri) return "";
  const parts = uri.split("/");
  const filename = parts[parts.length - 1] || "";
  return filename.replace(/\.(pdf|md|txt|html|docx)$/i, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

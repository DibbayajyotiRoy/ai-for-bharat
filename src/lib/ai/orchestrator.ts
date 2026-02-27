import { streamNormalExplanation } from "./normal";
import { generateStructuredExplanation } from "./structured";
import { fetchRecentInteractions, saveInteraction, summarizeHistory } from "../db/dynamo";
import { logInteraction, createLogEntry, estimateTokens } from "../logger";

export type ExplanationMode = "normal" | "structured" | "agent";

export interface ChatRequest {
  content: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  mode?: ExplanationMode;
  userId?: string;
}

export async function* handleChat(
  request: ChatRequest
): AsyncGenerator<string, void, unknown> {
  const { content, level, mode = "normal", userId = "anonymous" } = request;
  const startTime = Date.now();

  console.log(`[Orchestrator] Mode: ${mode}, Level: ${level}, User: ${userId}`);

  if (!content || !content.trim()) {
    yield "### ⚠️ Error\n\nPlease provide content to explain.";
    return;
  }

  let modelUsed = "unknown";
  let fallbackTriggered = false;
  let fullResponse = "";

  try {
    // Fetch recent context (graceful degradation if DynamoDB fails)
    let contextSummary = "";
    try {
      const recentInteractions = await fetchRecentInteractions(userId, 5);
      contextSummary = summarizeHistory(recentInteractions);
    } catch (error: any) {
      console.warn("[Orchestrator] Failed to fetch history:", error.message);
    }

    const enrichedContent = contextSummary ? `${content}${contextSummary}` : content;

    if (mode === "agent") {
      // Agent mode: streaming research pipeline
      try {
        const { executeAgentPipelineStreaming } = await import("./agent");
        for await (const chunk of executeAgentPipelineStreaming(enrichedContent, level)) {
          fullResponse += chunk;
          yield chunk;
        }
        modelUsed = "Agent Pipeline (Streaming)";
      } catch (error: any) {
        console.error("[Orchestrator] Agent mode failed, falling back to normal");
        fallbackTriggered = true;
        for await (const chunk of streamNormalExplanation(enrichedContent, level)) {
          fullResponse += chunk;
          yield chunk;
        }
      }

      // Save interaction after streaming completes
      try {
        await saveInteraction({
          userId,
          timestamp: Date.now(),
          content,
          level,
          mode,
          response: fullResponse,
          modelUsed,
        });
      } catch (error: any) {
        console.warn("[Orchestrator] Failed to save:", error.message);
      }

    } else if (mode === "structured") {
      // Structured mode: return JSON
      const result = await generateStructuredExplanation(enrichedContent, level);
      fullResponse = JSON.stringify(result);
      modelUsed = "Structured";
      yield fullResponse;

      // Save interaction
      try {
        await saveInteraction({
          userId,
          timestamp: Date.now(),
          content,
          level,
          mode,
          response: fullResponse,
          modelUsed,
        });
      } catch (error: any) {
        console.warn("[Orchestrator] Failed to save interaction:", error.message);
      }

    } else {
      // Normal mode: stream markdown (NO SOURCES)
      for await (const chunk of streamNormalExplanation(enrichedContent, level)) {
        fullResponse += chunk;
        yield chunk;
      }
      modelUsed = "Normal";

      // Save interaction
      try {
        await saveInteraction({
          userId,
          timestamp: Date.now(),
          content,
          level,
          mode,
          response: fullResponse,
          modelUsed,
        });
      } catch (error: any) {
        console.warn("[Orchestrator] Failed to save interaction:", error.message);
      }
    }

    // Log to CloudWatch
    try {
      await logInteraction(
        createLogEntry(
          userId,
          mode as "normal" | "agent" | "structured",
          modelUsed,
          fallbackTriggered,
          startTime,
          content,
          fullResponse
        )
      );
    } catch (error: any) {
      console.warn("[Orchestrator] Failed to log:", error.message);
    }

  } catch (error: any) {
    console.error("[Orchestrator] Error:", error.message);
    
    // Log error
    try {
      await logInteraction(
        createLogEntry(
          userId,
          mode as "normal" | "agent" | "structured",
          modelUsed,
          fallbackTriggered,
          startTime,
          content,
          "",
          error.message
        )
      );
    } catch (logError: any) {
      console.warn("[Orchestrator] Failed to log error:", logError.message);
    }

    yield `### ⚠️ System Error\n\nAn error occurred: ${error.message}\n\nPlease try again or contact support.`;
  }
}

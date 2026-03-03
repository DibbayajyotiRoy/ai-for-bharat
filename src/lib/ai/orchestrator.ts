import { streamNormalExplanation } from "./normal";
import { generateStructuredExplanation } from "./structured";
import { fetchRecentInteractions, saveInteraction, summarizeHistory, type Interaction } from "../db/dynamo";
import { logInteraction, createLogEntry, estimateTokens } from "../logger";
import { getCachedResponse, cacheResponse } from "../cache";

export type ExplanationMode = "normal" | "structured" | "agent";

export interface ChatRequest {
  content: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  mode?: ExplanationMode;
  userId?: string;
  sessionId?: number; // Optional session ID for context isolation
  language?: string; // Target language for translation
}

export async function* handleChat(
  request: ChatRequest
): AsyncGenerator<string, void, unknown> {
  const { content, level, mode = "normal", userId = "anonymous", sessionId, language = "en" } = request;
  const startTime = Date.now();

  console.log(`[Orchestrator] Mode: ${mode}, Level: ${level}, User: ${userId}, Language: ${language}`);

  if (!content || !content.trim()) {
    yield "### ⚠️ Error\n\nPlease provide content to explain.";
    return;
  }

  let modelUsed = "unknown";
  let fallbackTriggered = false;
  let fullResponse = "";

  try {
    // Check cache first (skip for conversational queries with context)
    const shouldCache = !userId || userId === "anonymous" || content.length > 20;
    
    if (shouldCache && mode !== "agent") {
      const cacheKey = language === "en" ? content : `${content}_${language}`;
      const cached = await getCachedResponse(cacheKey, level, mode);
      if (cached) {
        console.log("[Orchestrator] Serving from cache");
        yield cached;
        
        // Log cache hit
        logInteraction(
          createLogEntry(
            userId,
            mode as "normal" | "agent" | "structured",
            "Cache Hit",
            false,
            startTime,
            content,
            cached
          )
        ).catch((error: any) => {
          console.warn("[Orchestrator] Failed to log:", error.message);
        });
        
        return;
      }
    }

    // Fetch recent context (graceful degradation if DynamoDB fails)
    // Only use context if:
    // 1. No sessionId provided (backward compatibility)
    // 2. Recent interactions exist and are relevant
    let contextSummary = "";
    
    if (!sessionId) {
      try {
        const recentInteractions = await fetchRecentInteractions(userId, 5);
        
        // Filter out interactions older than 30 minutes
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        const recentRelevant = recentInteractions.filter(
          i => i.timestamp > thirtyMinutesAgo
        );
        
        // Check if context is relevant to current query
        if (recentRelevant.length > 0 && isContextRelevant(content, recentRelevant)) {
          contextSummary = summarizeHistory(recentRelevant);
          console.log("[Orchestrator] Using relevant context from history");
        } else if (recentRelevant.length > 0) {
          console.log("[Orchestrator] Context not relevant, skipping");
        }
      } catch (error: any) {
        console.warn("[Orchestrator] Failed to fetch history:", error.message);
      }
    } else {
      console.log("[Orchestrator] New session, skipping context");
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

      // Save interaction after streaming completes (fire-and-forget)
      saveInteraction({
        userId,
        timestamp: Date.now(),
        content,
        level,
        mode,
        response: fullResponse,
        modelUsed,
      }).catch((error: any) => {
        console.warn("[Orchestrator] Failed to save:", error.message);
      });

    } else if (mode === "structured") {
      // Structured mode: return JSON
      const result = await generateStructuredExplanation(enrichedContent, level);
      fullResponse = JSON.stringify(result);
      modelUsed = "Structured";
      yield fullResponse;

      // Save interaction (fire-and-forget)
      saveInteraction({
        userId,
        timestamp: Date.now(),
        content,
        level,
        mode,
        response: fullResponse,
        modelUsed,
      }).catch((error: any) => {
        console.warn("[Orchestrator] Failed to save interaction:", error.message);
      });

    } else {
      // Normal mode: stream markdown (NO SOURCES)
      for await (const chunk of streamNormalExplanation(enrichedContent, level, language)) {
        fullResponse += chunk;
        yield chunk;
      }
      modelUsed = "Normal";

      // Save interaction (fire-and-forget)
      saveInteraction({
        userId,
        timestamp: Date.now(),
        content,
        level,
        mode,
        response: fullResponse,
        modelUsed,
      }).catch((error: any) => {
        console.warn("[Orchestrator] Failed to save interaction:", error.message);
      });
    }

    // Log to CloudWatch (fire-and-forget for better performance)
    logInteraction(
      createLogEntry(
        userId,
        mode as "normal" | "agent" | "structured",
        modelUsed,
        fallbackTriggered,
        startTime,
        content,
        fullResponse
      )
    ).catch((error: any) => {
      console.warn("[Orchestrator] Failed to log:", error.message);
    });

    // Cache the response (fire-and-forget)
    if (shouldCache && fullResponse && mode !== "agent") {
      const cacheKey = language === "en" ? content : `${content}_${language}`;
      cacheResponse(cacheKey, level, mode, fullResponse, modelUsed);
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

/**
 * Check if recent context is relevant to the new query
 */
function isContextRelevant(newQuery: string, recentInteractions: Interaction[]): boolean {
  if (recentInteractions.length === 0) return false;
  
  // Extract key terms from new query
  const newTerms = extractKeyTerms(newQuery);
  if (newTerms.length === 0) return false;
  
  // Check if any recent interaction (last 2) shares key terms
  const recentTerms = recentInteractions
    .slice(0, 2)
    .flatMap(i => extractKeyTerms(i.content));
  
  // Calculate overlap
  const overlap = newTerms.filter(term => recentTerms.includes(term)).length;
  const relevance = overlap / newTerms.length;
  
  // Require 30% overlap for context to be relevant
  return relevance >= 0.3;
}

/**
 * Extract meaningful terms from text for relevance checking
 */
function extractKeyTerms(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 
    'should', 'could', 'may', 'might', 'can', 'what', 'how', 'why', 
    'when', 'where', 'who', 'explain', 'tell', 'me', 'about'
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10); // Top 10 meaningful terms
}

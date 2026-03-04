import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { getAwsConfig } from "./aws-config";

const client = new DynamoDBClient(getAwsConfig());
const docClient = DynamoDBDocumentClient.from(client);

const CACHE_TABLE = "learning-copilot-cache";
const CACHE_TTL_HOURS = 24; // Cache responses for 24 hours

export interface CachedResponse {
  cacheKey: string;
  response: string;
  timestamp: number;
  expiresAt: number;
  metadata: {
    level: string;
    mode: string;
    modelUsed?: string;
  };
}

/**
 * Generate a cache key from content and parameters
 */
export function generateCacheKey(
  content: string,
  level: string,
  mode: string
): string {
  const normalized = `${content.trim().toLowerCase()}|${level}|${mode}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Get cached response if available and not expired
 */
export async function getCachedResponse(
  content: string,
  level: string,
  mode: string
): Promise<string | null> {
  try {
    const cacheKey = generateCacheKey(content, level, mode);

    const result = await docClient.send(
      new GetCommand({
        TableName: CACHE_TABLE,
        Key: { cacheKey },
      })
    );

    if (!result.Item) {
      console.log("[Cache] Miss:", cacheKey.substring(0, 16));
      return null;
    }

    const cached = result.Item as CachedResponse;

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      console.log("[Cache] Expired:", cacheKey.substring(0, 16));
      return null;
    }

    console.log("[Cache] Hit:", cacheKey.substring(0, 16));
    return cached.response;
  } catch (error: any) {
    console.warn("[Cache] Get failed:", error.message);
    return null; // Graceful degradation
  }
}

/**
 * Cache a response (fire-and-forget)
 */
export function cacheResponse(
  content: string,
  level: string,
  mode: string,
  response: string,
  modelUsed?: string
): void {
  const cacheKey = generateCacheKey(content, level, mode);
  const timestamp = Date.now();
  const expiresAt = timestamp + CACHE_TTL_HOURS * 60 * 60 * 1000;

  const item: CachedResponse = {
    cacheKey,
    response,
    timestamp,
    expiresAt,
    metadata: {
      level,
      mode,
      modelUsed,
    },
  };

  // Fire-and-forget - don't wait for cache write
  docClient
    .send(
      new PutCommand({
        TableName: CACHE_TABLE,
        Item: item,
      })
    )
    .then(() => {
      console.log("[Cache] Stored:", cacheKey.substring(0, 16));
    })
    .catch((error: any) => {
      console.warn("[Cache] Store failed:", error.message);
    });
}

/**
 * Check if cache table exists and create if needed
 */
export async function ensureCacheTableExists(): Promise<void> {
  // This would be called during setup
  // For now, we'll handle gracefully if table doesn't exist
  console.log("[Cache] Using table:", CACHE_TABLE);
}

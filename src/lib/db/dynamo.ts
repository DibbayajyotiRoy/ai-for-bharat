import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  CreateTableCommand,
  DescribeTableCommand,
  UpdateTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { getAwsConfig } from "../aws-config";

const client = new DynamoDBClient(getAwsConfig());

const TABLE_NAME = "learning-copilot-history";
const TTL_DAYS = 30; // Conversations expire after 30 days

export interface Interaction {
  userId: string;
  timestamp: number;
  content: string;
  level: string;
  mode: string;
  response: string;
  modelUsed?: string;
  expiresAt: number;
}

export async function ensureTableExists(): Promise<void> {
  try {
    await client.send(
      new DescribeTableCommand({ TableName: TABLE_NAME })
    );
    console.log("[DynamoDB] Table exists");
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      console.log("[DynamoDB] Creating table...");
      await createTable();
    } else {
      throw error;
    }
  }
}

async function createTable(): Promise<void> {
  const command = new CreateTableCommand({
    TableName: TABLE_NAME,
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "timestamp", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "timestamp", AttributeType: "N" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  });

  await client.send(command);
  console.log("[DynamoDB] Table created successfully");

  // Enable TTL separately
  try {
    const { UpdateTimeToLiveCommand } = await import("@aws-sdk/client-dynamodb");
    await client.send(
      new UpdateTimeToLiveCommand({
        TableName: TABLE_NAME,
        TimeToLiveSpecification: {
          Enabled: true,
          AttributeName: "expiresAt",
        },
      })
    );
    console.log("[DynamoDB] TTL enabled");
  } catch (error: any) {
    console.warn("[DynamoDB] TTL setup failed:", error.message);
  }
}

export async function saveInteraction(
  interaction: Omit<Interaction, "expiresAt">
): Promise<void> {
  try {
    const expiresAt = Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60;

    const item = marshall({
      ...interaction,
      expiresAt,
    });

    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    console.log("[DynamoDB] Interaction saved");
  } catch (error: any) {
    console.error("[DynamoDB] Save failed:", error.message);
    // Don't throw - graceful degradation
  }
}

export async function fetchRecentInteractions(
  userId: string,
  limit: number = 5
): Promise<Interaction[]> {
  try {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: marshall({
        ":userId": userId,
      }),
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    });

    const response = await client.send(command);

    if (!response.Items) {
      return [];
    }

    return response.Items.map((item) => unmarshall(item) as Interaction);
  } catch (error: any) {
    console.error("[DynamoDB] Fetch failed:", error.message);
    return []; // Graceful degradation
  }
}

// ── Spaced Repetition ─────────────────────────────────────────────────────
const REVIEW_TABLE = "learning-copilot-reviews";

export interface ReviewRecord {
  userId: string;
  topic: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: number;
  lastScore: number;
  expiresAt: number;
}

export async function saveReviewItem(item: Omit<ReviewRecord, "expiresAt">): Promise<void> {
  try {
    const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60; // 90-day TTL
    await client.send(
      new PutItemCommand({
        TableName: REVIEW_TABLE,
        Item: marshall({ ...item, expiresAt }),
      })
    );
    console.log("[DynamoDB] Review item saved");
  } catch (error: any) {
    console.warn("[DynamoDB] Review save failed:", error.message);
  }
}

export async function fetchDueReviews(userId: string): Promise<ReviewRecord[]> {
  try {
    const command = new QueryCommand({
      TableName: REVIEW_TABLE,
      KeyConditionExpression: "userId = :uid",
      FilterExpression: "nextReviewDate <= :now",
      ExpressionAttributeValues: marshall({ ":uid": userId, ":now": Date.now() }),
    });
    const response = await client.send(command);
    return (response.Items || []).map((item) => unmarshall(item) as ReviewRecord);
  } catch (error: any) {
    console.warn("[DynamoDB] Review fetch failed:", error.message);
    return [];
  }
}

export function summarizeHistory(interactions: Interaction[]): string {
  if (interactions.length === 0) {
    return "";
  }

  const summary = interactions
    .slice(0, 3) // Last 3 interactions
    .map((i) => `Q: ${i.content.substring(0, 100)}...\nA: ${i.response.substring(0, 200)}...`)
    .join("\n\n");

  return `\n\n--- Recent Context ---\n${summary}\n--- End Context ---\n`;
}

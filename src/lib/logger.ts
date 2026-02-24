import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const client = new CloudWatchLogsClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const LOG_GROUP = "/learning-copilot/api";
const LOG_STREAM = `stream-${Date.now()}`;

export interface LogEntry {
  userId: string;
  mode: "normal" | "agent" | "structured";
  modelUsed: string;
  fallbackTriggered: boolean;
  latency: number;
  tokenEstimate: number;
  error?: string;
  timestamp: number;
}

let logStreamInitialized = false;

async function ensureLogStream(): Promise<void> {
  if (logStreamInitialized) return;

  try {
    // Create log group if it doesn't exist
    try {
      await client.send(
        new CreateLogGroupCommand({ logGroupName: LOG_GROUP })
      );
    } catch (error: any) {
      if (error.name !== "ResourceAlreadyExistsException") {
        throw error;
      }
    }

    // Create log stream
    try {
      await client.send(
        new CreateLogStreamCommand({
          logGroupName: LOG_GROUP,
          logStreamName: LOG_STREAM,
        })
      );
    } catch (error: any) {
      if (error.name !== "ResourceAlreadyExistsException") {
        throw error;
      }
    }

    logStreamInitialized = true;
    console.log("[Logger] CloudWatch stream initialized");
  } catch (error: any) {
    console.error("[Logger] Failed to initialize:", error.message);
  }
}

export async function logInteraction(entry: LogEntry): Promise<void> {
  try {
    await ensureLogStream();

    const logEvent = {
      message: JSON.stringify(entry),
      timestamp: entry.timestamp,
    };

    await client.send(
      new PutLogEventsCommand({
        logGroupName: LOG_GROUP,
        logStreamName: LOG_STREAM,
        logEvents: [logEvent],
      })
    );

    console.log("[Logger] Logged to CloudWatch");
  } catch (error: any) {
    console.error("[Logger] Failed to log:", error.message);
    // Don't throw - logging failure shouldn't break the app
  }
}

export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

export function createLogEntry(
  userId: string,
  mode: "normal" | "agent" | "structured",
  modelUsed: string,
  fallbackTriggered: boolean,
  startTime: number,
  content: string,
  response: string,
  error?: string
): LogEntry {
  return {
    userId,
    mode,
    modelUsed,
    fallbackTriggered,
    latency: Date.now() - startTime,
    tokenEstimate: estimateTokens(content + response),
    error,
    timestamp: Date.now(),
  };
}

/**
 * Telegram Bot via Bot API Webhooks
 *
 * Receives updates from Telegram's webhook system,
 * processes them through the Learning Copilot AI pipeline,
 * and replies with formatted explanations.
 *
 * Setup:
 *   1. Create a bot via @BotFather on Telegram
 *   2. Set env var: TELEGRAM_BOT_TOKEN
 *   3. Register webhook:
 *      curl https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain.com/api/telegram
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    photo?: Array<{ file_id: string; width: number; height: number }>;
    caption?: string;
  };
}

/** Convert markdown to Telegram MarkdownV2 format */
export function markdownToTelegram(md: string): string {
  let text = md;

  // Remove images
  text = text.replace(/!\[.*?\]\(.*?\)/g, '');

  // Escape special Telegram MarkdownV2 characters (except those used for formatting)
  // Characters to escape: _ * [ ] ( ) ~ ` > # + - = | { } . !
  // But we want to keep *bold* and `code` formatting

  // First, extract code blocks and inline code to protect them
  const codeBlocks: string[] = [];
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODEBLOCK_${codeBlocks.length - 1}__`;
  });

  const inlineCodes: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    inlineCodes.push(code);
    return `__INLINE_${inlineCodes.length - 1}__`;
  });

  // Convert headers to bold
  text = text.replace(/^#{1,3}\s+(.+)$/gm, '*$1*');

  // Escape special characters
  text = text.replace(/([_\[\]()~>#+=|{}.!\\-])/g, '\\$1');

  // Restore code blocks
  text = text.replace(/__CODEBLOCK_(\d+)__/g, (_, i) => codeBlocks[parseInt(i)]);
  text = text.replace(/__INLINE_(\d+)__/g, (_, i) => `\`${inlineCodes[parseInt(i)]}\``);

  // Collapse excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/** Send a simple text message (fallback, no special formatting) */
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  parseMode: 'MarkdownV2' | 'HTML' | '' = ''
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram] Bot token not configured');
    return false;
  }

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: text.substring(0, 4096), // Telegram message limit
  };

  if (parseMode) {
    payload.parse_mode = parseMode;
  }

  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[Telegram] Send failed:', err);

    // If MarkdownV2 fails, retry without formatting
    if (parseMode) {
      return sendTelegramMessage(chatId, text, '');
    }
    return false;
  }

  return true;
}

/** Send "typing" indicator */
export async function sendTypingAction(chatId: number): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;

  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  }).catch(() => {});
}

/** Chunk message for Telegram's 4096 char limit */
export function chunkTelegramMessage(text: string, maxLen: number = 4000): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current) chunks.push(current.trim());

  return chunks;
}

/** Process incoming Telegram message and return AI explanation */
export async function handleTelegramMessage(
  userMessage: string,
  userId: number
): Promise<string> {
  const { handleChat } = await import('@/lib/ai/orchestrator');

  let fullResponse = '';
  for await (const chunk of handleChat({
    content: userMessage,
    level: 'Beginner',
    mode: 'normal',
    userId: `telegram:${userId}`,
  })) {
    fullResponse += chunk;
  }

  return fullResponse;
}

/** Register webhook with Telegram */
export async function registerWebhook(webhookUrl: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram] Bot token not configured');
    return false;
  }

  const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  });

  const data = await response.json();
  console.log('[Telegram] Webhook registration:', data);
  return data.ok === true;
}

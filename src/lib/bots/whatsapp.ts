/**
 * WhatsApp Bot via Twilio WhatsApp Business API
 *
 * Receives incoming messages from Twilio's webhook,
 * processes them through the Learning Copilot AI pipeline,
 * and replies with structured explanations.
 *
 * Setup:
 *   1. Create a Twilio account and enable WhatsApp Sandbox
 *   2. Set webhook URL to: https://your-domain.com/api/whatsapp
 *   3. Set env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || '';

/** Parse Twilio's URL-encoded webhook body */
export function parseTwilioBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of body.split('&')) {
    const [key, value] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value?.replace(/\+/g, ' ') || '');
  }
  return params;
}

/** Strip markdown for WhatsApp plain-text delivery */
export function markdownToWhatsApp(md: string): string {
  let text = md;

  // Convert headers to bold
  text = text.replace(/^#{1,3}\s+(.+)$/gm, '*$1*');

  // Convert bold **text** to WhatsApp bold *text*
  text = text.replace(/\*\*(.+?)\*\*/g, '*$1*');

  // Convert inline code to monospace
  text = text.replace(/`([^`]+)`/g, '```$1```');

  // Convert bullet points
  text = text.replace(/^[-*]\s+/gm, '• ');

  // Convert numbered lists
  text = text.replace(/^\d+\.\s+/gm, (match) => match);

  // Remove images
  text = text.replace(/!\[.*?\]\(.*?\)/g, '');

  // Convert links [text](url) → text (url)
  text = text.replace(/\[(.+?)\]\((.+?)\)/g, '$1 ($2)');

  // Remove citation badges [1], [2] etc
  text = text.replace(/\[(\d+)\]/g, '[$1]');

  // Collapse excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/** Chunk message for WhatsApp's 1600 char limit */
export function chunkMessage(text: string, maxLen: number = 1500): string[] {
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

/** Send a WhatsApp reply via Twilio REST API */
export async function sendWhatsAppReply(to: string, body: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('[WhatsApp] Twilio credentials not configured');
    return false;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const params = new URLSearchParams({
    From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
    To: to,
    Body: body,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[WhatsApp] Send failed:', err);
    return false;
  }

  return true;
}

/** Process incoming WhatsApp message and return AI explanation */
export async function handleWhatsAppMessage(
  userMessage: string,
  from: string
): Promise<string> {
  const { handleChat } = await import('@/lib/ai/orchestrator');

  // Collect streamed response into a single string
  let fullResponse = '';
  for await (const chunk of handleChat({
    content: userMessage,
    level: 'Beginner',
    mode: 'normal',
    userId: `whatsapp:${from}`,
  })) {
    fullResponse += chunk;
  }

  return markdownToWhatsApp(fullResponse);
}

import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { handleChat } from '@/lib/ai/orchestrator';
import { ensureTableExists } from '@/lib/db/dynamo';

export const runtime = 'nodejs';

const app = new Hono().basePath('/api')

// Initialize DynamoDB table on startup (graceful degradation if fails)
ensureTableExists().catch((error) => {
    console.warn('[API] DynamoDB initialization failed:', error.message);
});

// ── Core explanation endpoint (streaming) ─────────────────────────────────────
app.post('/explain', async (c) => {
    try {
        const body = await c.req.json();
        const { content, level = 'Beginner', mode = 'normal', userId = 'anonymous' } = body;

        if (!content) {
            return c.json({ error: 'Content is required' }, 400);
        }

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of handleChat({ content, level, mode, userId })) {
                        controller.enqueue(new TextEncoder().encode(chunk));
                    }
                    controller.close();
                } catch (error: any) {
                    console.error('[API] Stream error:', error);
                    const errorMsg = `### ⚠️ Error\n\n${error.message}`;
                    controller.enqueue(new TextEncoder().encode(errorMsg));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        console.error('[API] Request error:', error);
        return c.json({ error: error.message }, 500);
    }
})

// ── Translation endpoint ───────────────────────────────────────────────────────
// Translates the Mental Model and Key Takeaways sections of a markdown explanation
// into a target Indian language using Amazon Translate.
app.post('/translate', async (c) => {
    try {
        const body = await c.req.json();
        const { content, targetLanguage } = body;

        if (!content || !targetLanguage) {
            return c.json({ error: 'content and targetLanguage are required' }, 400);
        }

        const { translateMarkdownSections } = await import('@/lib/ai/translation');
        const translated = await translateMarkdownSections(content, targetLanguage);

        return c.json({ translated });

    } catch (error: any) {
        console.error('[API] Translation error:', error);
        return c.json({ error: error.message }, 500);
    }
})

// ── Quiz generation endpoint ───────────────────────────────────────────────────
// Generates 4 multiple-choice questions from an explanation using Amazon Bedrock.
app.post('/quiz', async (c) => {
    try {
        const body = await c.req.json();
        const { content, level = 'Beginner' } = body;

        if (!content) {
            return c.json({ error: 'content is required' }, 400);
        }

        const { generateQuiz } = await import('@/lib/ai/quiz');
        const quiz = await generateQuiz(content, level);

        return c.json({ quiz });

    } catch (error: any) {
        console.error('[API] Quiz error:', error);
        return c.json({ error: error.message }, 500);
    }
})

// ── Image explain endpoint (multimodal) ──────────────────────────────────────
app.post('/explain-image', async (c) => {
    try {
        const body = await c.req.json();
        const { imageBase64, mimeType, query, level = 'Beginner' } = body;

        if (!imageBase64 || !mimeType) {
            return c.json({ error: 'imageBase64 and mimeType are required' }, 400);
        }

        const { explainImage } = await import('@/lib/ai/multimodal');
        const explanation = await explainImage({ imageBase64, mimeType, query, level });

        return c.json({ explanation });
    } catch (error: any) {
        console.error('[API] Image explain error:', error);
        return c.json({ error: error.message }, 500);
    }
})

// ── Image search endpoint ──────────────────────────────────────────────────────
app.post('/images', async (c) => {
    try {
        const body = await c.req.json();
        const { keywords } = body;

        if (!keywords || !Array.isArray(keywords)) {
            return c.json({ error: 'keywords array is required' }, 400);
        }

        const { searchImages } = await import('@/lib/image-search');
        const images = await searchImages(keywords);

        return c.json({ images });

    } catch (error: any) {
        console.error('[API] Image search error:', error);
        return c.json({ error: error.message }, 500);
    }
})

// ── Follow-up questions endpoint ─────────────────────────────────────────────
app.post('/follow-up', async (c) => {
    try {
        const body = await c.req.json();
        const { query, explanation, level = 'Beginner' } = body;

        if (!query || !explanation) {
            return c.json({ error: 'query and explanation are required' }, 400);
        }

        const { generateFollowUpQuestions } = await import('@/lib/ai/follow-up');
        const questions = await generateFollowUpQuestions(query, explanation, level);

        return c.json({ questions });
    } catch (error: any) {
        console.error('[API] Follow-up error:', error);
        return c.json({ error: error.message }, 500);
    }
})

// ── Learning path endpoint ──────────────────────────────────────────────────
app.post('/learning-path', async (c) => {
    try {
        const body = await c.req.json();
        const { topic, level = 'Beginner' } = body;

        if (!topic) {
            return c.json({ error: 'topic is required' }, 400);
        }

        const { generateLearningPath } = await import('@/lib/ai/learning-path');
        const path = await generateLearningPath(topic, level);

        return c.json({ path });
    } catch (error: any) {
        console.error('[API] Learning path error:', error);
        return c.json({ error: error.message }, 500);
    }
})

// ── Text-to-speech endpoint (Amazon Polly) ──────────────────────────────────
app.post('/tts', async (c) => {
    try {
        const body = await c.req.json();
        const { text, language = 'en' } = body;

        if (!text) {
            return c.json({ error: 'text is required' }, 400);
        }

        const { synthesizeSpeech } = await import('@/lib/ai/text-to-speech');
        const audioBuffer = await synthesizeSpeech(text, language);

        return new Response(new Uint8Array(audioBuffer), {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length.toString(),
            },
        });
    } catch (error: any) {
        console.error('[API] TTS error:', error);
        return c.json({ error: error.message }, 500);
    }
})

// ── Spaced repetition review endpoint ────────────────────────────────────
app.post('/review', async (c) => {
    try {
        const body = await c.req.json();
        const { userId, topic, scorePercent } = body;

        if (!topic || scorePercent === undefined) {
            return c.json({ error: 'topic and scorePercent are required' }, 400);
        }

        const { quizScoreToQuality, calculateNextReview, createNewReviewItem } = await import('@/lib/ai/spaced-repetition');
        const { saveReviewItem } = await import('@/lib/db/dynamo');

        const quality = quizScoreToQuality(scorePercent);
        const reviewItem = createNewReviewItem(userId || 'anonymous', topic);
        const updated = calculateNextReview(reviewItem, quality);

        await saveReviewItem(updated);

        return c.json({
            nextReviewDate: updated.nextReviewDate,
            intervalDays: updated.interval,
            quality,
        });
    } catch (error: any) {
        console.error('[API] Review error:', error);
        return c.json({ error: error.message }, 500);
    }
})

// ── WhatsApp Bot webhook (Twilio) ─────────────────────────────────────────
app.post('/whatsapp', async (c) => {
    try {
        const rawBody = await c.req.text();
        const { parseTwilioBody, handleWhatsAppMessage, sendWhatsAppReply, chunkMessage } =
            await import('@/lib/bots/whatsapp');

        const params = parseTwilioBody(rawBody);
        const userMessage = params.Body;
        const from = params.From; // e.g. "whatsapp:+919876543210"

        if (!userMessage || !from) {
            return new Response('<Response></Response>', {
                headers: { 'Content-Type': 'text/xml' },
            });
        }

        console.log(`[WhatsApp] Message from ${from}: ${userMessage.substring(0, 50)}`);

        if (userMessage.toLowerCase() === '/help') {
            await sendWhatsAppReply(from,
                '*Learning Copilot* — WhatsApp Bot\n\n' +
                'Send any concept, code snippet, or question and get an AI-powered explanation.\n\n' +
                'Examples:\n• React hooks\n• Binary search algorithm\n• What is a REST API?'
            );
            return new Response('<Response></Response>', {
                headers: { 'Content-Type': 'text/xml' },
            });
        }

        const reply = await handleWhatsAppMessage(userMessage, from);
        const chunks = chunkMessage(reply);

        for (const chunk of chunks) {
            await sendWhatsAppReply(from, chunk);
        }

        return new Response('<Response></Response>', {
            headers: { 'Content-Type': 'text/xml' },
        });
    } catch (error: any) {
        console.error('[WhatsApp] Webhook error:', error);
        return new Response('<Response></Response>', {
            headers: { 'Content-Type': 'text/xml' },
        });
    }
})

// ── Telegram Bot webhook ──────────────────────────────────────────────────
app.post('/telegram', async (c) => {
    try {
        const update = await c.req.json();
        const {
            handleTelegramMessage,
            sendTelegramMessage,
            sendTypingAction,
            chunkTelegramMessage,
        } = await import('@/lib/bots/telegram');

        const message = update.message;
        if (!message?.text || !message.chat) {
            return c.json({ ok: true });
        }

        const chatId = message.chat.id;
        const userMessage = message.text;
        const userId = message.from?.id || 0;

        console.log(`[Telegram] Message from ${userId}: ${userMessage.substring(0, 50)}`);

        if (userMessage === '/start') {
            await sendTelegramMessage(chatId,
                'Welcome to Learning Copilot!\n\n' +
                'Send me any concept, code snippet, or question and I\'ll explain it.\n\n' +
                'Try: React hooks, Binary search, REST API\n\n' +
                '/help - Show commands'
            );
            return c.json({ ok: true });
        }

        if (userMessage === '/help') {
            await sendTelegramMessage(chatId,
                'Learning Copilot Commands:\n/start - Welcome\n/help - Commands\n\nJust send any text or code!'
            );
            return c.json({ ok: true });
        }

        await sendTypingAction(chatId);

        const reply = await handleTelegramMessage(userMessage, userId);
        const chunks = chunkTelegramMessage(reply);

        for (const chunk of chunks) {
            await sendTelegramMessage(chatId, chunk);
        }

        return c.json({ ok: true });
    } catch (error: any) {
        console.error('[Telegram] Webhook error:', error);
        return c.json({ ok: true });
    }
})

export const GET = handle(app)
export const POST = handle(app)

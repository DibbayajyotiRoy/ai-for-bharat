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

export const GET = handle(app)
export const POST = handle(app)

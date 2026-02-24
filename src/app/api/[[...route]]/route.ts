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

app.post('/explain', async (c) => {
    try {
        const body = await c.req.json();
        const { content, level = 'Beginner', mode = 'normal', userId = 'anonymous' } = body;

        if (!content) {
            return c.json({ error: 'Content is required' }, 400);
        }

        // Create streaming response
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

export const GET = handle(app)
export const POST = handle(app)

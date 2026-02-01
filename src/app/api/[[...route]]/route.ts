import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT } from '@/lib/system-prompt';

export const runtime = 'edge';

const app = new Hono().basePath('/api')

// Prioritized list of models to try
const MODELS = [
    "gemini-2.0-flash",         // Primary: Newest & Fastest
    "gemini-2.0-flash-lite",    // Fallback 1: Lightweight 2.0
    "gemini-flash-latest",      // Fallback 2: Stable 1.5 Flash
    "gemini-pro-latest"         // Fallback 3: Higher capacity/quota
];

app.post('/explain', async (c) => {
    let lastError: any = null;

    try {
        const body = await c.req.json();
        const { content, level = 'Beginner' } = body;

        if (!content) {
            return c.json({ error: 'Content is required' }, 400);
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            // Mock response if intentionally missing (dev mode)
            return c.text(`### ⚠️ Missing API Key\nPlease set GEMINI_API_KEY in .env`);
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        const userPrompt = `
    Context: User requested a ${level} level explanation.
    Input Content:
    """
    ${content}
    """
    `;

        // Try models in sequence
        for (const modelName of MODELS) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });

                // Attempt generation (this will throw if 429/503)
                const result = await model.generateContentStream([SYSTEM_PROMPT, userPrompt]);

                // If successful, create and return stream immediately
                const stream = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const chunk of result.stream) {
                                const chunkText = chunk.text();
                                controller.enqueue(new TextEncoder().encode(chunkText));
                            }
                            controller.close();
                        } catch (streamError) {
                            console.error(`Stream error on ${modelName}:`, streamError);
                            controller.error(streamError);
                        }
                    },
                });

                return new Response(stream, {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Transfer-Encoding': 'chunked',
                        'X-Model-Used': modelName // Helpful for debugging
                    },
                });

            } catch (error: any) {
                console.warn(`Model ${modelName} failed:`, error.message);
                lastError = error;

                // If it's NOT a capacity/rate-limit error, usually we shouldn't retry.
                // But Google's 404s can also mean "not found in this region", so worth trying others.
                // 429 = Quota, 503 = Overloaded, 404 = Not Found.
                // We continue to the next model.
                continue;
            }
        }

        // If loop completes without success, throw the last error to be caught by outer block
        throw lastError;

    } catch (error: any) {
        console.error('All models failed in /api/explain:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Graceful error stream
        const errorStream = new ReadableStream({
            start(controller) {
                const errorMarkdown = `### ⚠️ AI Provider Unavailable
I tried multiple AI models but all are currently unavailable or rate-limited.

**Last Error Details:**
> ${errorMessage}

**Possible Fixes:**
1. Wait a moment and try again (Quota reset).
2. Check your API key permissions.`;
                controller.enqueue(new TextEncoder().encode(errorMarkdown));
                controller.close();
            }
        });

        return new Response(errorStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });
    }
})

export const GET = handle(app)
export const POST = handle(app)

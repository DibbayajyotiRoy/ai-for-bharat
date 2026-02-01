
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("No API KEY");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        // There isn't a direct listModels method on the client instance in some versions, 
        // but we can try to use the model to generate content to see if a simple one works,
        // or use the rest API directly if needed. 
        // Actually, usually we guess. But let's try to just hit a known model.
        // The error message suggests `Call ListModels`. 
        // The Node SDK doesn't always expose ListModels easily in the main class.
        // Let's try 'gemini-pro' first.
        console.log("Trying gemini-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("gemini-pro success: ", result.response.text());
    } catch (e: any) {
        console.error("gemini-pro failed: ", e.message);
    }

    try {
        console.log("Trying gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-flash success: ", result.response.text());
    } catch (e: any) {
        console.error("gemini-1.5-flash failed: ", e.message);
    }
}

listModels();

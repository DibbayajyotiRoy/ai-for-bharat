import { invokeModelWithFallback } from "./models";

export interface LearningStep {
  step: number;
  title: string;
  description: string;
  type: "prerequisite" | "core" | "practice" | "advanced" | "project";
  estimatedTime: string;
  resources: string[];
}

export interface LearningPath {
  topic: string;
  level: string;
  steps: LearningStep[];
}

const LEARNING_PATH_PROMPT = `You are a curriculum designer. Generate a 5-step learning path.

Return ONLY a JSON object:
{"topic":"the topic","steps":[{"step":1,"title":"Short title","description":"What to learn (1-2 sentences)","type":"prerequisite","estimatedTime":"30 min","resources":["Resource 1","Resource 2"]}]}

Step progression: 1=prerequisite, 2=core, 3=practice, 4=advanced, 5=project
Rules: Adapt to skill level, concise descriptions, 2 resources per step, ONLY valid JSON`;

export async function generateLearningPath(topic: string, level: string): Promise<LearningPath> {
  try {
    const prompt = `Topic: ${topic}\nSkill Level: ${level}`;
    const response = await invokeModelWithFallback(prompt, LEARNING_PATH_PROMPT, 1024);
    const parsed = JSON.parse(response.content.trim());
    return { topic: parsed.topic || topic, level, steps: parsed.steps || [] };
  } catch (error: any) {
    console.warn("[LearningPath] Generation failed:", error.message);
    return {
      topic, level,
      steps: [
        { step: 1, title: "Prerequisites", description: `Review the basics of ${topic}`, type: "prerequisite", estimatedTime: "30 min", resources: ["MDN Web Docs", "freeCodeCamp"] },
        { step: 2, title: "Core Concepts", description: `Understand the fundamentals of ${topic}`, type: "core", estimatedTime: "1 hour", resources: ["Official Documentation", "YouTube tutorials"] },
        { step: 3, title: "Practice", description: `Write code using ${topic}`, type: "practice", estimatedTime: "2 hours", resources: ["LeetCode", "HackerRank"] },
        { step: 4, title: "Advanced Topics", description: `Explore edge cases and optimizations`, type: "advanced", estimatedTime: "1 hour", resources: ["Tech blogs", "Conference talks"] },
        { step: 5, title: "Build Project", description: `Create a project that uses ${topic}`, type: "project", estimatedTime: "3 hours", resources: ["GitHub", "Dev.to"] },
      ],
    };
  }
}

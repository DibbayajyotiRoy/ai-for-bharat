# Learning Copilot — Hackathon Winning Upgrade Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Learning Copilot from a single-call AI wrapper into a production-grade, agentic RAG system with Perplexity-style citations, multimodal image understanding, spaced repetition, live code playground, and 9+ AWS services to dominate among 550 teams — all within a $100 AWS budget.

**Architecture:** Replace the fake agent pipeline (`agent.ts`) with a real streaming research pipeline that uses Bedrock Knowledge Bases (RAG) → Tavily fallback → curated sources, with inline `[1][2][3]` citations. Add Bedrock Guardrails for safety. Add multimodal image upload for "screenshot → explain." Add spaced repetition for retention. Add Polly for text-to-speech. Add a live code playground. Add learning path generation. Add follow-up questions.

**Tech Stack:** Amazon Bedrock (Models, Knowledge Bases, Guardrails), Amazon S3, Amazon DynamoDB, Amazon CloudWatch, Amazon Translate, Amazon Polly, Amazon Cognito, Next.js 16, React 19, TypeScript, Hono, Tailwind CSS 4, Sandpack

---

## Budget Strategy ($100 AWS Credits)

### Cost Breakdown
| Service | Est. Cost | Notes |
|---------|-----------|-------|
| Bedrock Nova Pro | ~$40 | ~5,000 requests @ $0.008/req |
| Bedrock Nova Lite (fallback) | ~$5 | Cheaper fallback model |
| Bedrock Knowledge Bases | ~$15 | OpenSearch Serverless ($0.24/hr) — **create 2 days before demo only** |
| DynamoDB | $0 | Free tier (25 GB, 25 WCU/RCU) |
| CloudWatch | ~$2 | Free tier covers most; custom metrics extra |
| S3 | $0 | Free tier (5 GB) |
| Translate | ~$3 | ~200K chars @ $15/million |
| Polly | ~$2 | ~500K chars @ $4/million |
| Cognito | $0 | Free tier (50K MAU) |
| Guardrails | ~$3 | $0.75/1K text units |
| **Total** | **~$70** | **$30 buffer for testing** |

### Budget Rules
1. **Use Nova Lite during development** — switch to Nova Pro only for demo/testing
2. **Create Knowledge Base only 2 days before demo** — OpenSearch Serverless idles at $0.24/hr ($5.76/day)
3. **Use Tavily (free tier: 1000 searches/month) as primary search during development**
4. **Delete idle resources immediately after demo**
5. **Monitor CloudWatch daily** — set billing alarm at $80

---

## Critical Context for the Implementer

### Problem Statement (Hackathon)
> Build an AI-powered solution that helps people learn faster, work smarter, or become more productive while building or understanding technology.

### Evaluation Criteria (What Judges Care About)
1. **Why AI is required** — must be clear and compelling
2. **How AWS services are used** — deep integration, not superficial
3. **What value the AI layer adds** — tangible UX improvement
4. AWS-native patterns (serverless, managed, scalable)
5. Using Bedrock, Kiro, and other AI/ML services

### Current State (What Works)
- Next.js 16 frontend with streaming, D2 diagrams, quizzes, multi-language
- Bedrock Nova Pro/Lite with model fallback
- DynamoDB conversation memory (30-day TTL)
- CloudWatch logging/metrics
- Amazon Translate for Hindi/Bengali/Marathi
- Fake "agent mode" = single Bedrock call with Tavily/curated sources

### What's MISSING (Why We Lose)
1. **No real RAG** — sources are hardcoded or from Tavily (non-AWS)
2. **No real agents** — single API call, no planning/tool-use/iteration
3. **No inline citations** — sources listed at bottom, not inline like Perplexity
4. **No Knowledge Base** — not using Bedrock Knowledge Bases at all
5. **No Guardrails** — no content safety filtering
6. **No multimodal** — can't upload images/screenshots for explanation
7. **No spaced repetition** — quizzes are one-shot, no retention tracking
8. **No code playground** — examples are read-only, not interactive
9. **No TTS** — accessibility gap, no audio learning
10. **Only 4 AWS services** — judges want to see 6-9+ deeply integrated
11. **No learning paths** — missed opportunity for personalized curriculum

---

## Task 1: Add Multimodal Image Upload — "Screenshot → Explain"

**WHY:** This is the single biggest differentiator. Students take screenshots of confusing code, error messages, or documentation. They upload the image. Your app explains it. Nova Pro already supports multimodal input (images). Almost no other team will have this. **$0 extra AWS cost** — uses the same Bedrock model call, just with image payload.

**Files:**
- Create: `src/lib/ai/multimodal.ts`
- Modify: `src/app/api/[[...route]]/route.ts` (add image explain endpoint)
- Modify: `src/app/page.tsx` (add upload button + drag-and-drop)

**Step 1: Create the multimodal explainer module**

```typescript
// src/lib/ai/multimodal.ts
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const IMAGE_EXPLAIN_PROMPT = `You are a technical educator. The user has uploaded an image (screenshot of code, error message, documentation, diagram, or technical content).

Analyze the image and create a structured explanation.

REQUIRED FORMAT - YOU MUST INCLUDE ALL SECTIONS:

### 1. The Mental Model
[One-sentence summary of what this image shows]

### 2. The Explanation
[Detailed explanation of what's in the image, adapted to skill level]

### 3. Visual Diagram
\`\`\`d2
direction: right
[Create a D2 diagram that shows the concept/flow depicted in the image]
\`\`\`

### 4. Concrete Example
[If the image shows code: explain what it does and show a corrected/improved version]
[If the image shows an error: explain the fix]
[If the image shows a concept: show a practical code example]

### 5. Key Takeaways
- Point 1
- Point 2
- Point 3

D2 DIAGRAM RULES:
1. Start with: direction: right
2. Use ONLY simple single-word node names
3. Use ONLY arrow syntax: NodeA -> NodeB: label
4. NEVER use brackets, parentheses, quotes, or special characters in node names
5. Keep labels short (1-3 words)`;

export interface MultimodalExplainRequest {
  imageBase64: string;
  mimeType: string;
  query?: string;
  level: "Beginner" | "Intermediate" | "Advanced";
}

export async function explainImage(
  request: MultimodalExplainRequest
): Promise<string> {
  const { imageBase64, mimeType, query, level } = request;

  const userContent: any[] = [
    {
      image: {
        format: mimeType.replace("image/", ""),
        source: { bytes: imageBase64 },
      },
    },
  ];

  if (query) {
    userContent.push({
      text: `User's question about this image: ${query}\nSkill Level: ${level}`,
    });
  } else {
    userContent.push({
      text: `Explain what's in this image.\nSkill Level: ${level}`,
    });
  }

  const payload = {
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
    system: [{ text: IMAGE_EXPLAIN_PROMPT }],
    inferenceConfig: {
      max_new_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
    },
  };

  // Try Nova Pro first (supports multimodal)
  const models = ["amazon.nova-pro-v1:0", "amazon.nova-lite-v1:0"];

  for (const modelId of models) {
    try {
      console.log(`[Multimodal] Trying ${modelId}`);
      const command = new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      const decoded = JSON.parse(new TextDecoder().decode(response.body));
      const content = decoded.output?.message?.content?.[0]?.text;

      if (content) {
        console.log(`[Multimodal] Success with ${modelId}`);
        return content;
      }
    } catch (error: any) {
      console.warn(`[Multimodal] ${modelId} failed:`, error.message);
    }
  }

  throw new Error("All models failed for image explanation");
}
```

**Step 2: Add the API endpoint**

In `src/app/api/[[...route]]/route.ts`, add:

```typescript
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
});
```

**Step 3: Add image upload UI to page.tsx**

Add a file input and drag-and-drop zone to the input area:

```typescript
// Add state
const [uploadedImage, setUploadedImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);

// Handler for file upload
const handleImageUpload = (file: File) => {
  if (!file.type.startsWith('image/')) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('Image must be under 5MB');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = (reader.result as string).split(',')[1];
    setUploadedImage({
      base64,
      mimeType: file.type,
      preview: reader.result as string,
    });
  };
  reader.readAsDataURL(file);
};

// Modified handleExplain to support image mode
// If uploadedImage is set, call /api/explain-image instead of /api/explain
```

Add UI: a camera/image icon button next to the paste button, and a thumbnail preview when an image is uploaded. Add drag-and-drop on the textarea.

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/lib/ai/multimodal.ts src/app/api/[[...route]]/route.ts src/app/page.tsx
git commit -m "feat: add multimodal image upload — screenshot to explanation"
```

---

## Task 2: Implement Perplexity-Style Inline Citations

**WHY:** Perplexity's killer feature is inline numbered citations `[1][2][3]` that let users verify claims while reading. Your current sources are dumped at the bottom and easy to ignore. Inline citations make the AI output trustworthy and verifiable — exactly what judges want to see.

**Files:**
- Modify: `src/lib/ai/agent.ts` (update synthesis prompt)
- Modify: `src/components/copilot/ResultDisplay.tsx` (render inline citations)

**Step 1: Update the synthesis prompt to generate inline citations**

In `src/lib/ai/agent.ts`, replace the entire `FAST_SYNTHESIZER_PROMPT` with:

```typescript
const FAST_SYNTHESIZER_PROMPT = `You are a technical educator creating explanations with INLINE CITATIONS.

CITATION RULES:
- Reference sources using [1], [2], [3] etc. inline in your text
- Place citations immediately after the claim they support
- Each source number corresponds to its position in the provided sources list
- Use multiple citations when a claim is supported by multiple sources: [1][3]
- Every factual claim should have at least one citation

REQUIRED FORMAT - YOU MUST INCLUDE ALL SECTIONS:

### 1. The Mental Model
[One-sentence analogy - no citations needed here]

### 2. The Explanation
[Detailed explanation with inline citations like: "React uses a virtual DOM [1] to efficiently update the UI [2]."]

### 3. Visual Diagram
\`\`\`d2
[REQUIRED D2 diagram - see strict rules below]
\`\`\`

### 4. Concrete Example
[Practical example with code if relevant, cite sources where applicable [1]]

### 5. Key Takeaways
- Point 1 [1]
- Point 2 [2]
- Point 3 [3]

D2 DIAGRAM RULES (MANDATORY):
1. ALWAYS include a D2 diagram
2. Start with: direction: right
3. Use ONLY simple single-word node names: User, System, Database, API, Client, Server
4. Use ONLY arrow syntax: NodeA -> NodeB
5. Add simple labels AFTER colon: NodeA -> NodeB: action
6. NEVER use brackets [], parentheses (), quotes "", or special characters in node names
7. Keep labels short (1-3 words maximum)
8. Create 4-6 nodes showing the flow/architecture
9. Each line must be: Node -> Node: label
`;
```

**Step 2: Update ResultDisplay to render inline citation badges**

In `src/components/copilot/ResultDisplay.tsx`, add these functions before the main component:

```typescript
function renderCitations(text: string, sources: Source[]): React.ReactNode[] {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const idx = parseInt(match[1]) - 1;
      const source = sources[idx];
      if (source) {
        return (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-5 h-5 ml-0.5 mr-0.5 text-[10px] font-bold bg-primary/15 text-primary rounded-full hover:bg-primary/25 transition-colors cursor-pointer no-underline align-super"
            title={`${source.title}: ${source.summary}`}
          >
            {match[1]}
          </a>
        );
      }
    }
    return <span key={i}>{part}</span>;
  });
}
```

Then update the explanation tab's `ReactMarkdown` to use citation-aware rendering when sources exist. Add custom `p` and `li` components that call `renderCitations`.

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/lib/ai/agent.ts src/components/copilot/ResultDisplay.tsx
git commit -m "feat: add Perplexity-style inline citations [1][2][3]"
```

---

## Task 3: Add Streaming to Research Mode

**WHY:** Currently, Research mode waits for the entire response before displaying anything. This creates a jarring delay compared to Normal mode's real-time streaming. Making Research mode stream too gives both modes the same premium UX. This MUST come before the KB task since it changes how the agent pipeline works.

**Files:**
- Modify: `src/lib/ai/agent.ts` (add streaming variant)
- Modify: `src/lib/ai/orchestrator.ts` (stream agent mode)

**Step 1: Add streaming to the agent pipeline**

Add `executeAgentPipelineStreaming` to `agent.ts`:

```typescript
export async function* executeAgentPipelineStreaming(
  query: string,
  level: "Beginner" | "Intermediate" | "Advanced"
): AsyncGenerator<string, void, unknown> {
  console.log("[Agent] Starting streaming research pipeline");

  // 1. Fetch sources (fast, non-streaming)
  const sources = await fetchRealSources(query);

  // 2. Build source block for appending after synthesis
  const sourceBlock = `\n\n---\n\n### 📚 Sources\n\n${sources
    .map((s) => `- [${s.title}](${s.url}) (${s.credibility} credibility)\n  ${s.summary}`)
    .join("\n\n")}`;

  // 3. Stream the synthesis with inline citation instructions
  const synthesisPrompt = `Query: ${query}
Skill Level: ${level}

Use these credible sources for your explanation:
${sources.map((s, i) => `[${i + 1}] ${s.title} - ${s.url}\n   ${s.summary}`).join("\n\n")}

Create a comprehensive explanation with ALL required sections including a D2 diagram.
Use inline citations [1], [2], etc. referencing the source numbers above.`;

  const { streamModelWithFallback } = await import("./models");

  for await (const chunk of streamModelWithFallback(
    synthesisPrompt,
    FAST_SYNTHESIZER_PROMPT,
    1024
  )) {
    yield chunk;
  }

  // Append sources at the end
  yield sourceBlock;
}
```

**Step 2: Update orchestrator to use streaming agent**

In `orchestrator.ts`, replace the entire `if (mode === "agent")` block with:

```typescript
if (mode === "agent") {
  try {
    const { executeAgentPipelineStreaming } = await import("./agent");
    for await (const chunk of executeAgentPipelineStreaming(enrichedContent, level)) {
      fullResponse += chunk;
      yield chunk;
    }
    modelUsed = "Agent Pipeline (Streaming)";
  } catch (error: any) {
    console.error("[Orchestrator] Agent mode failed, falling back to normal");
    fallbackTriggered = true;
    for await (const chunk of streamNormalExplanation(enrichedContent, level)) {
      fullResponse += chunk;
      yield chunk;
    }
  }

  // Save interaction after streaming completes
  try {
    await saveInteraction({
      userId, timestamp: Date.now(), content, level, mode,
      response: fullResponse, modelUsed,
    });
  } catch (error: any) {
    console.warn("[Orchestrator] Failed to save:", error.message);
  }
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/lib/ai/agent.ts src/lib/ai/orchestrator.ts
git commit -m "feat: add streaming to Research mode for real-time UX"
```

---

## Task 4: Build the Real RAG Pipeline with Bedrock Knowledge Bases

**WHY:** Replace the fake curated sources with actual vector-search RAG. Bedrock Knowledge Bases provides managed RAG — it chunks documents, creates embeddings, stores in OpenSearch Serverless, and retrieves relevant passages. This is what Perplexity does, but on AWS.

**BUDGET NOTE:** OpenSearch Serverless costs ~$0.24/hr ($5.76/day) when idle. **Create the Knowledge Base only 2 days before the demo. Use Tavily during development.** The code is written to gracefully fall back when KB is not configured.

**Files:**
- Create: `scripts/setup-knowledge-base.sh`
- Create: `src/lib/ai/knowledge-base.ts`
- Modify: `src/lib/ai/agent.ts` (replace `fetchRealSources`)

**Step 1: Create the S3 + Knowledge Base setup script**

```bash
#!/bin/bash
# scripts/setup-knowledge-base.sh
# Creates S3 bucket for Bedrock Knowledge Base documents
# BUDGET: Only run 1-2 days before demo! OpenSearch Serverless idles at $0.24/hr

set -euo pipefail

BUCKET_NAME="learning-copilot-kb-$(aws sts get-caller-identity --query Account --output text)"
REGION="${AWS_REGION:-us-east-1}"

echo "⚠️  WARNING: This creates OpenSearch Serverless which costs ~$5.76/day when idle"
echo "Only run this 1-2 days before your hackathon demo!"
echo ""

echo "Creating S3 bucket: $BUCKET_NAME"
aws s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$REGION" \
  $([ "$REGION" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=$REGION")

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "✅ Bucket created: $BUCKET_NAME"
echo ""
echo "Next steps:"
echo "1. Upload curated .md/.pdf docs to: s3://$BUCKET_NAME/documents/"
echo "2. Create Knowledge Base in Bedrock console pointing to this bucket"
echo "3. Add BEDROCK_KNOWLEDGE_BASE_ID=<id> to .env"
echo ""
echo "To delete after demo: aws s3 rb s3://$BUCKET_NAME --force"
```

**Step 2: Create the Knowledge Base client**

```typescript
// src/lib/ai/knowledge-base.ts
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrieveCommandInput,
} from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const KNOWLEDGE_BASE_ID = process.env.BEDROCK_KNOWLEDGE_BASE_ID || "";

export interface RetrievedSource {
  title: string;
  url: string;
  content: string;
  score: number;
  credibility: "high" | "medium" | "low";
}

export async function retrieveFromKnowledgeBase(
  query: string,
  maxResults: number = 5
): Promise<RetrievedSource[]> {
  if (!KNOWLEDGE_BASE_ID) {
    console.log("[KnowledgeBase] No KB ID configured, skipping");
    return [];
  }

  try {
    console.log("[KnowledgeBase] Retrieving for:", query.substring(0, 80));

    const input: RetrieveCommandInput = {
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      retrievalQuery: { text: query },
      retrievalConfiguration: {
        vectorSearchConfiguration: { numberOfResults: maxResults },
      },
    };

    const command = new RetrieveCommand(input);
    const response = await client.send(command);

    if (!response.retrievalResults?.length) {
      console.log("[KnowledgeBase] No results found");
      return [];
    }

    const sources: RetrievedSource[] = response.retrievalResults
      .filter((r) => r.content?.text)
      .map((r) => {
        const score = r.score ?? 0;
        const uri = r.location?.s3Location?.uri || r.location?.webLocation?.url || "";
        return {
          title: extractTitleFromUri(uri) || "Knowledge Base Document",
          url: uri,
          content: r.content!.text!.substring(0, 500),
          score,
          credibility: score > 0.7 ? "high" : score > 0.4 ? "medium" : "low",
        };
      });

    console.log(`[KnowledgeBase] Retrieved ${sources.length} sources`);
    return sources;
  } catch (error: any) {
    console.warn("[KnowledgeBase] Retrieval failed:", error.message);
    return [];
  }
}

function extractTitleFromUri(uri: string): string {
  if (!uri) return "";
  const parts = uri.split("/");
  const filename = parts[parts.length - 1] || "";
  return filename.replace(/\.(pdf|md|txt|html|docx)$/i, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
```

**Step 3: Install the required AWS SDK package**

Run: `npm install @aws-sdk/client-bedrock-agent-runtime`
Expected: Package installed successfully

**Step 4: Update agent.ts to use Knowledge Base → Tavily → Curated fallback chain**

Replace `fetchRealSources` in `src/lib/ai/agent.ts`:

```typescript
// At top of agent.ts, add:
import { retrieveFromKnowledgeBase } from "./knowledge-base";

// Replace fetchRealSources:
async function fetchRealSources(query: string): Promise<Source[]> {
  // 1. Try Bedrock Knowledge Base first (AWS-native RAG)
  const kbSources = await retrieveFromKnowledgeBase(query, 4);
  if (kbSources.length > 0) {
    console.log(`[Agent] Using ${kbSources.length} Knowledge Base sources`);
    return kbSources.map((s) => ({
      title: s.title,
      url: s.url,
      summary: s.content.substring(0, 220),
      credibility: s.credibility,
    }));
  }

  // 2. Fall back to Tavily web search
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    try {
      console.log("[Agent] KB empty, trying Tavily...");
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query,
          search_depth: "basic",
          max_results: 4,
          include_answer: false,
        }),
      });
      if (!response.ok) throw new Error(`Tavily HTTP ${response.status}`);
      const data = await response.json();
      if (data.results?.length > 0) {
        return data.results.map((r: any) => ({
          title: r.title || "Untitled",
          url: r.url,
          summary: r.content ? r.content.substring(0, 220) : r.url,
          credibility: "high" as const,
        }));
      }
    } catch (error: any) {
      console.warn("[Agent] Tavily failed:", error.message);
    }
  }

  // 3. Final fallback: curated sources
  return getCuratedSources(query);
}
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 6: Commit**

```bash
git add scripts/setup-knowledge-base.sh src/lib/ai/knowledge-base.ts src/lib/ai/agent.ts package.json package-lock.json
git commit -m "feat: add Bedrock Knowledge Base RAG with Tavily + curated fallback"
```

---

## Task 5: Add Bedrock Guardrails for Content Safety

**WHY:** Amazon Bedrock Guardrails filters harmful content, detects PII, and enforces topic boundaries. Adding this shows judges you understand responsible AI. Most hackathon projects ignore safety entirely. **Cost: ~$3 for the hackathon.**

**Files:**
- Create: `src/lib/ai/guardrails.ts`
- Modify: `src/lib/ai/models.ts` (apply guardrail to all invocations)
- Create: `scripts/setup-guardrails.sh`

**Step 1: Create the guardrails setup script**

```bash
#!/bin/bash
# scripts/setup-guardrails.sh
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"

echo "Creating Bedrock Guardrail..."

GUARDRAIL_ID=$(aws bedrock create-guardrail \
  --region "$REGION" \
  --name "learning-copilot-guardrail" \
  --description "Content safety guardrail for Learning Copilot" \
  --blocked-input-messaging "I cannot help with that request. Please ask about a technical or educational topic." \
  --blocked-outputs-messaging "The generated content was filtered for safety. Please try rephrasing your question." \
  --content-policy-config '{
    "filtersConfig": [
      {"type": "SEXUAL", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "VIOLENCE", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "HATE", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "INSULTS", "inputStrength": "HIGH", "outputStrength": "MEDIUM"},
      {"type": "MISCONDUCT", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "PROMPT_ATTACK", "inputStrength": "HIGH", "outputStrength": "NONE"}
    ]
  }' \
  --topic-policy-config '{
    "topicsConfig": [
      {
        "name": "OffTopic",
        "definition": "Questions unrelated to learning, technology, programming, or education",
        "examples": ["How to make weapons", "Give me medical advice"],
        "type": "DENY"
      }
    ]
  }' \
  --query 'guardrailId' --output text)

echo "Guardrail created: $GUARDRAIL_ID"

VERSION=$(aws bedrock create-guardrail-version \
  --region "$REGION" \
  --guardrail-identifier "$GUARDRAIL_ID" \
  --query 'version' --output text)

echo "Version: $VERSION"
echo ""
echo "Add to .env:"
echo "BEDROCK_GUARDRAIL_ID=$GUARDRAIL_ID"
echo "BEDROCK_GUARDRAIL_VERSION=$VERSION"
```

**Step 2: Create guardrails integration module**

```typescript
// src/lib/ai/guardrails.ts
export interface GuardrailConfig {
  guardrailIdentifier: string;
  guardrailVersion: string;
}

export function getGuardrailConfig(): GuardrailConfig | null {
  const id = process.env.BEDROCK_GUARDRAIL_ID;
  const version = process.env.BEDROCK_GUARDRAIL_VERSION;
  if (!id || !version) return null;
  return { guardrailIdentifier: id, guardrailVersion: version };
}
```

**Step 3: Apply guardrails to model invocations in models.ts**

In `src/lib/ai/models.ts`, add import and spread guardrail config into both `InvokeModelCommand` and `InvokeModelWithResponseStreamCommand`:

```typescript
import { getGuardrailConfig } from "./guardrails";

// Inside both invokeModelWithFallback and streamModelWithFallback:
const guardrailConfig = getGuardrailConfig();

const command = new InvokeModelCommand({
  modelId: model.id,
  contentType: "application/json",
  accept: "application/json",
  body: JSON.stringify(payload),
  ...(guardrailConfig && {
    guardrailIdentifier: guardrailConfig.guardrailIdentifier,
    guardrailVersion: guardrailConfig.guardrailVersion,
  }),
});
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/lib/ai/guardrails.ts src/lib/ai/models.ts scripts/setup-guardrails.sh
git commit -m "feat: add Bedrock Guardrails for content safety"
```

---

## Task 6: Add Follow-Up Questions (Perplexity Feature)

**WHY:** Perplexity shows "Related questions" after every answer. This keeps users engaged and demonstrates the AI understands the topic deeply. Huge UX differentiator.

**Files:**
- Create: `src/lib/ai/follow-up.ts`
- Modify: `src/app/api/[[...route]]/route.ts` (add endpoint)
- Modify: `src/app/page.tsx` (add follow-up UI)

**Step 1: Create the follow-up questions generator**

```typescript
// src/lib/ai/follow-up.ts
import { invokeModelWithFallback } from "./models";

export interface FollowUpQuestion {
  question: string;
  category: "deeper" | "related" | "practical";
}

const FOLLOW_UP_PROMPT = `You are a learning assistant. Based on the user's question and explanation, generate exactly 3 follow-up questions.

Return ONLY a JSON array:
[
  {"question": "How does X compare to Y?", "category": "related"},
  {"question": "Can you show a real-world example of Z?", "category": "practical"},
  {"question": "What happens internally when W occurs?", "category": "deeper"}
]

Categories: "deeper" (same topic, more depth), "related" (adjacent concept), "practical" (hands-on application)
Rules: Exactly 3 questions, each 10-15 words max, relevant to skill level, ONLY valid JSON output`;

export async function generateFollowUpQuestions(
  query: string,
  explanation: string,
  level: string
): Promise<FollowUpQuestion[]> {
  try {
    const prompt = `User's question: ${query}\nSkill level: ${level}\nExplanation summary: ${explanation.substring(0, 500)}`;
    const response = await invokeModelWithFallback(prompt, FOLLOW_UP_PROMPT, 256);
    const parsed = JSON.parse(response.content.trim());
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 3).map((q: any) => ({
        question: q.question || "Tell me more",
        category: q.category || "related",
      }));
    }
  } catch (error: any) {
    console.warn("[FollowUp] Generation failed:", error.message);
  }
  return [
    { question: `What are common mistakes with ${query.substring(0, 30)}?`, category: "practical" },
    { question: `How does this compare to alternatives?`, category: "related" },
    { question: `What happens under the hood?`, category: "deeper" },
  ];
}
```

**Step 2: Add API endpoint**

In `src/app/api/[[...route]]/route.ts`:

```typescript
app.post('/follow-up', async (c) => {
  try {
    const body = await c.req.json();
    const { query, explanation, level = 'Beginner' } = body;
    if (!query || !explanation) return c.json({ error: 'query and explanation required' }, 400);
    const { generateFollowUpQuestions } = await import('@/lib/ai/follow-up');
    const questions = await generateFollowUpQuestions(query, explanation, level);
    return c.json({ questions });
  } catch (error: any) {
    console.error('[API] Follow-up error:', error);
    return c.json({ error: error.message }, 500);
  }
});
```

**Step 3: Add follow-up UI to page.tsx**

Add state and fetch after explanation loads, display as pill buttons below result:

```typescript
const [followUpQuestions, setFollowUpQuestions] = useState<Array<{question: string; category: string}>>([]);

// In handleExplain, after streaming completes:
fetch('/api/follow-up', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: input, explanation: fullResult.substring(0, 500), level }),
}).then(r => r.json()).then(d => setFollowUpQuestions(d.questions || [])).catch(() => {});
```

```tsx
{followUpQuestions.length > 0 && (
  <div className="flex flex-wrap gap-2 justify-center py-2">
    {followUpQuestions.map((fq, i) => (
      <button key={i} onClick={() => setInput(fq.question)}
        className="px-4 py-2 text-sm bg-card border border-border rounded-full hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground/80 hover:text-foreground">
        {fq.question}
      </button>
    ))}
  </div>
)}
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/lib/ai/follow-up.ts src/app/api/[[...route]]/route.ts src/app/page.tsx
git commit -m "feat: add Perplexity-style follow-up questions"
```

---

## Task 7: Add Learning Path Generator

**WHY:** This separates "AI tutor" from "AI search engine." Generate a personalized 5-step learning path: prerequisites → core → practice → advanced → project. Demonstrates deep pedagogical value.

**Files:**
- Create: `src/lib/ai/learning-path.ts`
- Modify: `src/app/api/[[...route]]/route.ts` (add endpoint)
- Modify: `src/app/page.tsx` (add learning path button + display)

**Step 1: Create the learning path generator**

```typescript
// src/lib/ai/learning-path.ts
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
```

**Step 2: Add API endpoint**

```typescript
app.post('/learning-path', async (c) => {
  try {
    const body = await c.req.json();
    const { topic, level = 'Beginner' } = body;
    if (!topic) return c.json({ error: 'topic is required' }, 400);
    const { generateLearningPath } = await import('@/lib/ai/learning-path');
    const path = await generateLearningPath(topic, level);
    return c.json({ path });
  } catch (error: any) {
    console.error('[API] Learning path error:', error);
    return c.json({ error: error.message }, 500);
  }
});
```

**Step 3: Add UI with vertical timeline**

Add "Learning Path" button next to quiz button. Render steps as a vertical timeline with step numbers, icons by type (prerequisite=book, core=star, practice=code, advanced=rocket, project=hammer), estimated time, and resource links.

**Step 4: Verify build and commit**

```bash
git add src/lib/ai/learning-path.ts src/app/api/[[...route]]/route.ts src/app/page.tsx
git commit -m "feat: add AI-powered learning path generator"
```

---

## Task 8: Add Spaced Repetition Engine

**WHY:** This transforms one-shot quizzes into a retention system. After each quiz, track what the user got wrong in DynamoDB. Calculate next review date using SM-2 algorithm. Show "Review Due" badges. This is pedagogically proven (Anki-style) and uses **zero additional AWS cost** since it reuses DynamoDB.

**Files:**
- Create: `src/lib/ai/spaced-repetition.ts`
- Modify: `src/lib/db/dynamo.ts` (add review schedule operations)
- Modify: `src/components/copilot/QuizDisplay.tsx` (save results + show review schedule)
- Modify: `src/app/page.tsx` (show "Reviews Due" badge)

**Step 1: Create the spaced repetition engine**

```typescript
// src/lib/ai/spaced-repetition.ts

export interface ReviewItem {
  userId: string;
  topic: string;
  easeFactor: number;    // SM-2 ease factor (starts at 2.5)
  interval: number;      // Days until next review
  repetitions: number;   // Consecutive correct answers
  nextReviewDate: number; // Unix timestamp
  lastScore: number;     // 0-5 quality rating
}

/**
 * SM-2 Algorithm — the same algorithm used by Anki.
 * quality: 0-5 (0=complete failure, 5=perfect response)
 */
export function calculateNextReview(
  item: ReviewItem,
  quality: number // 0-5 based on quiz score
): ReviewItem {
  let { easeFactor, interval, repetitions } = item;

  if (quality >= 3) {
    // Correct answer
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect — reset
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;

  return {
    ...item,
    easeFactor,
    interval,
    repetitions,
    nextReviewDate,
    lastScore: quality,
  };
}

/**
 * Convert quiz score (0-100%) to SM-2 quality (0-5)
 */
export function quizScoreToQuality(scorePercent: number): number {
  if (scorePercent >= 90) return 5;
  if (scorePercent >= 75) return 4;
  if (scorePercent >= 60) return 3;
  if (scorePercent >= 40) return 2;
  if (scorePercent >= 20) return 1;
  return 0;
}

export function createNewReviewItem(userId: string, topic: string): ReviewItem {
  return {
    userId,
    topic,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: Date.now(),
    lastScore: 0,
  };
}
```

**Step 2: Add DynamoDB operations for review schedule**

In `src/lib/db/dynamo.ts`, add functions to save/fetch review items using a `reviews-` prefix on the sort key to distinguish from conversation history.

**Step 3: Update QuizDisplay to save results**

After quiz completion, calculate the SM-2 quality score and save the review item to DynamoDB.

**Step 4: Add "Reviews Due" badge to page.tsx**

Fetch due reviews on page load, show a badge like "3 Reviews Due" that links to the quiz for those topics.

**Step 5: Verify build and commit**

```bash
git add src/lib/ai/spaced-repetition.ts src/lib/db/dynamo.ts src/components/copilot/QuizDisplay.tsx src/app/page.tsx
git commit -m "feat: add spaced repetition engine (SM-2 algorithm) for retention"
```

---

## Task 9: Add Amazon Polly Text-to-Speech

**WHY:** Read the Mental Model and Key Takeaways aloud. Adds accessibility, adds another AWS service (9th), and enables "learn while multitasking." **Cost: ~$2 total for the hackathon** ($4 per million characters).

**Files:**
- Create: `src/lib/ai/text-to-speech.ts`
- Modify: `src/app/api/[[...route]]/route.ts` (add TTS endpoint)
- Modify: `src/components/copilot/ResultDisplay.tsx` (add speaker icon)

**Step 1: Install Polly SDK**

Run: `npm install @aws-sdk/client-polly`
Expected: Package installed

**Step 2: Create the TTS module**

```typescript
// src/lib/ai/text-to-speech.ts
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

const client = new PollyClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function synthesizeSpeech(
  text: string,
  languageCode: string = "en-US"
): Promise<Buffer> {
  // Map our language codes to Polly voice IDs
  const voiceMap: Record<string, { voiceId: string; langCode: string }> = {
    en: { voiceId: "Joanna", langCode: "en-US" },
    hi: { voiceId: "Kajal", langCode: "hi-IN" },
  };

  const voice = voiceMap[languageCode] || voiceMap.en;

  const command = new SynthesizeSpeechCommand({
    Text: text.substring(0, 3000), // Polly limit
    OutputFormat: "mp3",
    VoiceId: voice.voiceId,
    LanguageCode: voice.langCode,
    Engine: "neural", // Higher quality
  });

  const response = await client.send(command);

  if (!response.AudioStream) {
    throw new Error("No audio stream returned from Polly");
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.AudioStream as any) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
```

**Step 3: Add API endpoint**

```typescript
app.post('/tts', async (c) => {
  try {
    const body = await c.req.json();
    const { text, language = 'en' } = body;
    if (!text) return c.json({ error: 'text is required' }, 400);

    const { synthesizeSpeech } = await import('@/lib/ai/text-to-speech');
    const audioBuffer = await synthesizeSpeech(text, language);

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('[API] TTS error:', error);
    return c.json({ error: error.message }, 500);
  }
});
```

**Step 4: Add speaker icon to ResultDisplay**

Add a small speaker icon next to Mental Model and Key Takeaways sections. On click, fetch `/api/tts` with the text, create an `Audio` object, and play it.

**Step 5: Verify build and commit**

```bash
git add src/lib/ai/text-to-speech.ts src/app/api/[[...route]]/route.ts src/components/copilot/ResultDisplay.tsx package.json package-lock.json
git commit -m "feat: add Amazon Polly text-to-speech for accessibility"
```

---

## Task 10: Add Live Code Playground

**WHY:** When your app shows a code example, let users edit and run it right in the browser. Uses Sandpack (free, client-side, by CodeSandbox). No server needed. No AWS cost. Turns passive reading into **active learning**. Almost no team will have this.

**Files:**
- Create: `src/components/copilot/CodePlayground.tsx`
- Modify: `src/components/copilot/ResultDisplay.tsx` (replace static code blocks with playground)

**Step 1: Install Sandpack**

Run: `npm install @codesandbox/sandpack-react`
Expected: Package installed

**Step 2: Create the CodePlayground component**

```typescript
// src/components/copilot/CodePlayground.tsx
"use client";

import { Sandpack } from "@codesandbox/sandpack-react";

interface CodePlaygroundProps {
  code: string;
  language: string;
  theme: "light" | "dark";
}

const LANGUAGE_TO_TEMPLATE: Record<string, string> = {
  javascript: "vanilla",
  typescript: "vanilla-ts",
  react: "react",
  python: "vanilla", // Falls back to display-only for non-JS
};

export function CodePlayground({ code, language, theme }: CodePlaygroundProps) {
  const template = LANGUAGE_TO_TEMPLATE[language.toLowerCase()] || "vanilla";

  // Only JS/TS/React can be run in browser
  const isRunnable = ["javascript", "typescript", "jsx", "tsx", "react"].includes(language.toLowerCase());

  if (!isRunnable) {
    return null; // Let the parent render static syntax highlighting
  }

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-border/50">
      <Sandpack
        template={template as any}
        files={{
          "/index.js": { code, active: true },
        }}
        theme={theme === "dark" ? "dark" : "light"}
        options={{
          showConsole: true,
          showConsoleButton: true,
          editorHeight: 300,
          showTabs: false,
        }}
      />
    </div>
  );
}
```

**Step 3: Add "Run Code" toggle to ResultDisplay**

In the Example tab, detect JavaScript/TypeScript code blocks. Add a toggle: "Static" | "Interactive". When "Interactive" is selected, render `<CodePlayground>` instead of `<SyntaxHighlighter>`.

**Step 4: Verify build and commit**

```bash
git add src/components/copilot/CodePlayground.tsx src/components/copilot/ResultDisplay.tsx package.json package-lock.json
git commit -m "feat: add live code playground with Sandpack"
```

---

## Task 11: Add Amazon Cognito Authentication

**WHY:** Replace localStorage profiles with real AWS Cognito. Adds another AWS service, provides proper user management, demonstrates enterprise auth. **Cost: $0** (free tier: 50K MAU).

**Files:**
- Create: `scripts/setup-cognito.sh`
- Create: `src/lib/auth-cognito.ts`

**Step 1: Create Cognito setup script**

```bash
#!/bin/bash
# scripts/setup-cognito.sh
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"

echo "Creating Cognito User Pool..."

POOL_ID=$(aws cognito-idp create-user-pool \
  --pool-name "learning-copilot-users" \
  --region "$REGION" \
  --auto-verified-attributes email \
  --username-attributes email \
  --password-policy '{"MinimumLength":8,"RequireUppercase":false,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":false}' \
  --schema '[{"Name":"name","Required":true,"Mutable":true}]' \
  --query 'UserPool.Id' --output text)

echo "User Pool: $POOL_ID"

CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-name "learning-copilot-web" \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --query 'UserPoolClient.ClientId' --output text)

echo "Client: $CLIENT_ID"
echo ""
echo "Add to .env:"
echo "NEXT_PUBLIC_COGNITO_USER_POOL_ID=$POOL_ID"
echo "NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID"
```

**Step 2: Create Cognito config helper**

```typescript
// src/lib/auth-cognito.ts
export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
}

export function getCognitoConfig(): CognitoConfig | null {
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) return null;
  return { userPoolId, clientId, region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1" };
}

// Prototype keeps localStorage auth as fallback.
// Cognito is the upgrade path shown to judges.
export const COGNITO_ENABLED = !!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
```

**Step 3: Commit**

```bash
git add scripts/setup-cognito.sh src/lib/auth-cognito.ts
git commit -m "feat: add Amazon Cognito user pool setup and auth config"
```

---

## Task 12: Update Documentation and Setup Scripts

**WHY:** Judges review architecture docs. Update everything to reflect 9 AWS services and all new features.

**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `README.md`
- Modify: `package.json` (add setup scripts)

**Step 1: Update ARCHITECTURE.md**

Add new services to the architecture diagram:

```
AWS Services Layer (9 Services)
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Bedrock  │ │ DynamoDB │ │CloudWatch│
│ • Models │ │ • History│ │ • Logs   │
│ • KB RAG │ │ • Reviews│ │ • Metrics│
│ • Guards │ │ • TTL 30d│ │ • Alarms │
└──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Translate│ │  Polly   │ │    S3    │
│ • 4 langs│ │ • TTS    │ │ • KB docs│
│ • Fallbk │ │ • Neural │ │ • Assets │
└──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Cognito  │ │  Lambda  │ │ Amplify  │
│ • Auth   │ │ • API    │ │ • Deploy │
│ • Pools  │ │ • Stream │ │ • CI/CD  │
└──────────┘ └──────────┘ └──────────┘
```

**Step 2: Add setup scripts to package.json**

```json
"setup:kb": "bash scripts/setup-knowledge-base.sh",
"setup:guardrails": "bash scripts/setup-guardrails.sh",
"setup:cognito": "bash scripts/setup-cognito.sh",
"setup:all": "npm run setup:aws && npm run setup:guardrails && npm run setup:cognito && npm run setup:dashboard"
```

Note: `setup:kb` is intentionally NOT in `setup:all` — it should only be run 2 days before demo to save costs.

**Step 3: Update README.md feature list**

Add all new features with a "NEW" badge.

**Step 4: Commit**

```bash
git add ARCHITECTURE.md README.md package.json
git commit -m "docs: update architecture for 9 AWS services and new features"
```

---

## Task 13: Final Integration Test and Polish

**WHY:** Everything must work together end-to-end before submission.

**Step 1: Run the full build**

Run: `npm run build`
Expected: 0 TypeScript errors, build succeeds

**Step 2: Start dev server and test all flows**

Run: `npm run dev`

Test matrix:
1. **Normal mode**: type "React hooks" → streams explanation + diagram
2. **Research mode**: type "React hooks" → streams with inline `[1][2][3]` citations + sources
3. **Image upload**: upload screenshot → explanation generated
4. **Follow-up questions**: appear as pills after explanation
5. **Quiz**: "Test My Knowledge" → 4 questions generated
6. **Spaced repetition**: after quiz → review schedule saved, badge shows
7. **Learning Path**: "Learning Path" → 5-step timeline rendered
8. **Code Playground**: JS code example → editable + runnable in browser
9. **TTS**: click speaker icon → Mental Model read aloud
10. **Translation**: switch to Hindi → sections translated
11. **Theme**: toggle dark mode → everything readable
12. **Guardrails**: type harmful input → blocked message shown

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete hackathon prototype — 9 AWS services, multimodal, RAG, citations, spaced repetition"
```

---

## AWS Services Scorecard (After Implementation)

| # | AWS Service | Purpose | Depth | Cost |
|---|-------------|---------|-------|------|
| 1 | **Amazon Bedrock (Models)** | Nova Pro/Lite with multi-model fallback | Deep | ~$45 |
| 2 | **Amazon Bedrock (Knowledge Bases)** | RAG with vector search over S3 docs | Deep | ~$15 |
| 3 | **Amazon Bedrock (Guardrails)** | Content safety, topic filtering, PII | Medium | ~$3 |
| 4 | **Amazon DynamoDB** | Conversation memory + spaced repetition | Deep | $0 |
| 5 | **Amazon CloudWatch** | Logging, metrics, dashboard, alarms | Deep | ~$2 |
| 6 | **Amazon Translate** | Hindi, Bengali, Marathi translation | Medium | ~$3 |
| 7 | **Amazon Polly** | Neural text-to-speech for accessibility | Medium | ~$2 |
| 8 | **Amazon S3** | Knowledge base document storage | Medium | $0 |
| 9 | **Amazon Cognito** | User authentication and management | Light | $0 |

**Total estimated cost: ~$70 / $100 budget**

**Kiro:** Used for spec-driven development (`.kiro/specs/` directory already exists)

---

## Competitive Edge Summary

| Feature | Your Project | Typical Hackathon Project |
|---------|-------------|--------------------------|
| **Multimodal** | Screenshot upload → explain | Text only |
| **RAG** | Bedrock KB + Tavily + curated fallback | None or basic API |
| **Citations** | Inline [1][2][3] Perplexity-style | Sources dumped at bottom |
| **Streaming** | Both Normal AND Research modes | Maybe one mode |
| **Code Playground** | Live editable/runnable in browser | Static code blocks |
| **Spaced Repetition** | SM-2 algorithm, review scheduling | One-shot quizzes |
| **Learning Path** | AI-generated 5-step curriculum | None |
| **Follow-ups** | Contextual related questions | None |
| **TTS** | Amazon Polly neural voices | None |
| **Safety** | Bedrock Guardrails | Nothing |
| **Auth** | Cognito-ready + localStorage fallback | None |
| **AWS Services** | 9 deeply integrated | 1-2 superficially |
| **Observability** | CloudWatch dashboard + metrics | console.log |
| **Reliability** | Multi-model fallback + graceful degradation | Single model, crashes |
| **i18n** | 4 Indian languages via Translate | English only |
| **Diagrams** | Interactive D2 with zoom/pan | Maybe a static image |
| **Budget** | $70 of $100 with detailed cost tracking | No cost awareness |

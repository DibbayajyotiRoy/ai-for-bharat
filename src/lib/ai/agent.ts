import { invokeModelWithFallback } from "./models";

export interface AgentResponse {
  answer: string;
  sources: Source[];
  steps: AgentStep[];
}

export interface Source {
  title: string;
  url: string;
  summary: string;
  credibility: "high" | "medium" | "low";
}

export interface AgentStep {
  name: string;
  output: string;
  timestamp: number;
}

// OPTIMIZED: Single-shot synthesis without multiple API calls
const FAST_SYNTHESIZER_PROMPT = `You are a technical educator. Create a comprehensive explanation with visual diagram.

REQUIRED FORMAT - YOU MUST INCLUDE ALL SECTIONS:

### 1. The Mental Model
[One-sentence analogy]

### 2. The Explanation
[Detailed explanation adapted to skill level]

### 3. Visual Diagram
\`\`\`d2
[REQUIRED D2 diagram - see strict rules below]
\`\`\`

### 4. Concrete Example
[Practical example with code if relevant]

### 5. Key Takeaways
- Point 1
- Point 2
- Point 3

D2 DIAGRAM RULES (MANDATORY - FAILURE TO FOLLOW WILL BREAK THE SYSTEM):
1. ALWAYS include a D2 diagram - this is NOT optional
2. Start with: direction: right (for horizontal layout)
3. Use ONLY simple single-word node names: User, System, Database, API, Client, Server
4. Use ONLY arrow syntax: NodeA -> NodeB
5. Add simple labels AFTER colon: NodeA -> NodeB: action
6. NEVER use brackets [], parentheses (), quotes "", or special characters
7. Keep labels short (1-3 words maximum)
8. Create 4-6 nodes showing the flow/architecture
9. Each line must be: Node -> Node: label

VALID D2 Examples (COPY THIS STYLE):

For Beginner:
\`\`\`d2
direction: right

User -> Browser: Opens
Browser -> Server: Request
Server -> Database: Query
Database -> Server: Data
Server -> Browser: Response
Browser -> User: Display
\`\`\`

For Intermediate:
\`\`\`d2
direction: right

Client -> API: Request
API -> Auth: Validate
Auth -> API: Token
API -> Service: Process
Service -> Database: Query
Database -> Service: Result
Service -> API: Response
API -> Client: Data
\`\`\`

For Advanced:
\`\`\`d2
direction: right

Gateway -> LoadBalancer: Route
LoadBalancer -> Service: Forward
Service -> Cache: Check
Cache -> Service: Miss
Service -> Database: Query
Database -> Service: Result
Service -> Cache: Store
Service -> Gateway: Response
\`\`\`

INVALID (NEVER DO THIS):
- Node["text"] ❌
- Node(data) ❌
- "Node Name" ❌
- Node with spaces ❌
- Complex labels with special chars ❌
- Missing "direction: right" ❌

REMEMBER: The diagram MUST be included for ALL skill levels (Beginner, Intermediate, Advanced).
`;

export async function executeAgentPipeline(
  query: string,
  level: "Beginner" | "Intermediate" | "Advanced"
): Promise<AgentResponse> {
  const steps: AgentStep[] = [];

  console.log("[Agent] Starting research pipeline");

  try {
    // Fetch real sources via Tavily (or curated fallback)
    const sources = await fetchRealSources(query);

    steps.push({
      name: "Search",
      output: `Found ${sources.length} sources`,
      timestamp: Date.now(),
    });

    const synthesisPrompt = `Query: ${query}
Skill Level: ${level}

Use these credible sources for your explanation:
${sources.map((s, i) => `${i + 1}. ${s.title} - ${s.url}\n   ${s.summary}`).join("\n\n")}

Create a comprehensive explanation with ALL required sections including a D2 diagram.`;

    const synthesisResponse = await invokeModelWithFallback(
      synthesisPrompt,
      FAST_SYNTHESIZER_PROMPT,
      1024
    );

    steps.push({
      name: "Synthesis",
      output: "Complete",
      timestamp: Date.now(),
    });

    return {
      answer: synthesisResponse.content,
      sources,
      steps,
    };
  } catch (error: any) {
    console.error("[Agent] Pipeline failed:", error.message);
    throw new Error(`Agent pipeline failed: ${error.message}`);
  }
}

// Fetch real-time sources via Tavily Search API, with curated fallback.
async function fetchRealSources(query: string): Promise<Source[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;

  if (tavilyKey) {
    try {
      console.log("[Agent] Calling Tavily Search API...");
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

      if (!response.ok) {
        throw new Error(`Tavily returned HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        const sources: Source[] = data.results.map((r: any) => ({
          title: r.title || "Untitled",
          url: r.url,
          summary: r.content ? r.content.substring(0, 220) : r.url,
          // Tavily quality-filters results; all are high credibility
          credibility: "high" as const,
        }));
        console.log(`[Agent] Tavily returned ${sources.length} real sources`);
        return sources;
      }

      throw new Error("Tavily returned empty results");
    } catch (error: any) {
      console.warn("[Agent] Tavily search failed, falling back to curated sources:", error.message);
    }
  } else {
    console.log("[Agent] TAVILY_API_KEY not set — using curated sources");
  }

  return getCuratedSources(query);
}

// High-quality curated sources indexed by topic keyword.
// Used when Tavily API key is absent or the API call fails.
function getCuratedSources(query: string): Source[] {
  const q = query.toLowerCase();

  if (q.includes("javascript") || q.includes(" js ") || q.endsWith(" js")) {
    return [
      {
        title: "MDN JavaScript Guide",
        url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
        summary: "Complete guide to JavaScript: syntax, closures, async patterns, and the Web APIs.",
        credibility: "high",
      },
      {
        title: "JavaScript.info",
        url: "https://javascript.info",
        summary: "Modern JavaScript tutorial with interactive examples and in-depth explanations.",
        credibility: "high",
      },
      {
        title: "ECMAScript Specification",
        url: "https://tc39.es/ecma262/",
        summary: "Official language specification — the authoritative source for JavaScript semantics.",
        credibility: "high",
      },
    ];
  }

  if (q.includes("python")) {
    return [
      {
        title: "Python Official Documentation",
        url: "https://docs.python.org/3/",
        summary: "Official Python 3 docs covering the standard library, language reference, and tutorials.",
        credibility: "high",
      },
      {
        title: "Real Python",
        url: "https://realpython.com",
        summary: "In-depth Python tutorials, tips, and best practices from experienced engineers.",
        credibility: "high",
      },
      {
        title: "PEP Index",
        url: "https://peps.python.org",
        summary: "Python Enhancement Proposals — track language design decisions and idioms.",
        credibility: "high",
      },
    ];
  }

  if (q.includes("react")) {
    return [
      {
        title: "React Official Docs",
        url: "https://react.dev",
        summary: "Official React documentation with guides on hooks, components, and the new concurrent features.",
        credibility: "high",
      },
      {
        title: "React Patterns",
        url: "https://reactpatterns.com",
        summary: "A catalogue of reusable React component patterns and best practices.",
        credibility: "high",
      },
      {
        title: "React TypeScript Cheatsheet",
        url: "https://react-typescript-cheatsheet.netlify.app",
        summary: "Comprehensive TypeScript patterns specifically for React development.",
        credibility: "high",
      },
    ];
  }

  if (q.includes("data structure") || q.includes("algorithm") || q.includes("leetcode")) {
    return [
      {
        title: "GeeksforGeeks",
        url: "https://www.geeksforgeeks.org",
        summary: "Comprehensive coverage of data structures, algorithms, and competitive programming.",
        credibility: "high",
      },
      {
        title: "Visualgo",
        url: "https://visualgo.net",
        summary: "Interactive algorithm and data structure visualizations for intuitive learning.",
        credibility: "high",
      },
      {
        title: "Big-O Cheat Sheet",
        url: "https://www.bigocheatsheet.com",
        summary: "Time and space complexity reference for common data structures and sorting algorithms.",
        credibility: "high",
      },
    ];
  }

  if (q.includes("rust")) {
    return [
      {
        title: "The Rust Book",
        url: "https://doc.rust-lang.org/book/",
        summary: "The official introductory book for the Rust programming language.",
        credibility: "high",
      },
      {
        title: "Rust by Example",
        url: "https://doc.rust-lang.org/rust-by-example/",
        summary: "A collection of runnable Rust examples illustrating core concepts.",
        credibility: "high",
      },
    ];
  }

  // Default: general programming resources
  return [
    {
      title: "MDN Web Docs",
      url: "https://developer.mozilla.org",
      summary: "Comprehensive reference for web technologies: HTML, CSS, JavaScript, and Web APIs.",
      credibility: "high",
    },
    {
      title: "Stack Overflow",
      url: "https://stackoverflow.com",
      summary: "Community-driven Q&A platform for programming questions with millions of answers.",
      credibility: "high",
    },
    {
      title: "CS50 OpenCourseWare",
      url: "https://cs50.harvard.edu",
      summary: "Harvard's introduction to computer science — free, high-quality learning materials.",
      credibility: "high",
    },
  ];
}

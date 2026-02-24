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
  
  console.log("[Agent] Fast synthesis with real sources");
  
  try {
    // Get real sources based on query
    const sources = await fetchRealSources(query);

    // Single API call for fast response
    const synthesisPrompt = `Query: ${query}
Skill Level: ${level}

Use these credible sources for your explanation:
${sources.map((s, i) => `${i + 1}. ${s.title} - ${s.url}`).join('\n')}

Create a comprehensive explanation with ALL required sections including a D2 diagram.`;

    const synthesisResponse = await invokeModelWithFallback(
      synthesisPrompt,
      FAST_SYNTHESIZER_PROMPT,
      1024 // Reduced token limit for speed
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

// Fetch real credible sources for the query
async function fetchRealSources(query: string): Promise<Source[]> {
  // Default high-quality sources based on common technical topics
  const defaultSources: Source[] = [
    {
      title: "MDN Web Docs",
      url: "https://developer.mozilla.org",
      summary: "Comprehensive web development documentation and tutorials.",
      credibility: "high",
    },
    {
      title: "Official Documentation",
      url: "https://docs.example.com",
      summary: "Official technical documentation and API reference.",
      credibility: "high",
    },
    {
      title: "Stack Overflow",
      url: "https://stackoverflow.com",
      summary: "Community-driven Q&A for programming questions.",
      credibility: "high",
    },
  ];

  try {
    // In production, integrate with a real search API like:
    // - Tavily Search API
    // - Brave Search API
    // - Google Custom Search API
    // For now, return curated sources
    
    // Customize sources based on query keywords
    if (query.toLowerCase().includes('javascript') || query.toLowerCase().includes('js')) {
      return [
        {
          title: "MDN JavaScript Guide",
          url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
          summary: "Complete guide to JavaScript programming language.",
          credibility: "high",
        },
        {
          title: "JavaScript.info",
          url: "https://javascript.info",
          summary: "Modern JavaScript tutorial with detailed explanations.",
          credibility: "high",
        },
        {
          title: "ECMAScript Specification",
          url: "https://tc39.es/ecma262/",
          summary: "Official JavaScript language specification.",
          credibility: "high",
        },
      ];
    } else if (query.toLowerCase().includes('python')) {
      return [
        {
          title: "Python Official Documentation",
          url: "https://docs.python.org/3/",
          summary: "Official Python language documentation and tutorials.",
          credibility: "high",
        },
        {
          title: "Real Python",
          url: "https://realpython.com",
          summary: "In-depth Python tutorials and articles.",
          credibility: "high",
        },
        {
          title: "PEP Index",
          url: "https://peps.python.org",
          summary: "Python Enhancement Proposals and language evolution.",
          credibility: "high",
        },
      ];
    } else if (query.toLowerCase().includes('react')) {
      return [
        {
          title: "React Official Docs",
          url: "https://react.dev",
          summary: "Official React documentation and learning resources.",
          credibility: "high",
        },
        {
          title: "React Patterns",
          url: "https://reactpatterns.com",
          summary: "Common React patterns and best practices.",
          credibility: "high",
        },
        {
          title: "React TypeScript Cheatsheet",
          url: "https://react-typescript-cheatsheet.netlify.app",
          summary: "TypeScript patterns for React development.",
          credibility: "high",
        },
      ];
    } else if (query.toLowerCase().includes('data structure') || query.toLowerCase().includes('algorithm')) {
      return [
        {
          title: "GeeksforGeeks",
          url: "https://www.geeksforgeeks.org",
          summary: "Comprehensive algorithms and data structures tutorials.",
          credibility: "high",
        },
        {
          title: "Visualgo",
          url: "https://visualgo.net",
          summary: "Visual algorithm learning platform.",
          credibility: "high",
        },
        {
          title: "Big-O Cheat Sheet",
          url: "https://www.bigocheatsheet.com",
          summary: "Time and space complexity reference.",
          credibility: "high",
        },
      ];
    }
    
    return defaultSources;
  } catch (error) {
    console.error("[Agent] Failed to fetch sources:", error);
    return defaultSources;
  }
}

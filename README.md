# Learning Copilot

> AI-powered concept explainer that transforms complex technical topics into structured, visual explanations — built on AWS Bedrock.

Built for the **AWS AI Hackathon** · [Live Demo](#) · [Architecture](./ARCHITECTURE.md)

---

## What It Does

Paste a concept, code snippet, or documentation excerpt. Learning Copilot returns a structured explanation adapted to your skill level:

- **Mental Model** — a one-line intuition anchor
- **Explanation** — multi-paragraph breakdown with examples
- **Interactive Diagram** — auto-generated D2 flowchart with zoom/pan
- **Key Takeaways** — bullet-point summary

Works for algorithms, system design, language features, frameworks — anything technical.

## Modes

| Mode | What Happens | Sources |
|------|-------------|---------|
| **Normal** | Streams a markdown explanation in real time | None |
| **Research** | Single-call synthesis with curated reference links | Hardcoded per topic (MDN, Python Docs, etc.) |

> **Note:** Research mode currently uses curated, hardcoded sources mapped by topic — not live web search. Real search API integration (Tavily, Brave, Google) is on the [roadmap](#roadmap).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| API | Hono (edge-optimized) |
| AI | AWS Bedrock — Nova Pro with Nova Lite fallback |
| Storage | DynamoDB (conversation memory, 30-day TTL) |
| Observability | CloudWatch (logs, metrics, dashboards) |
| Diagrams | D2 with ELK layout, react-zoom-pan-pinch |

## Architecture

```
Frontend (Next.js) → API (Hono) → Orchestrator → [Normal | Research] → AWS Bedrock
                                       ↓
                                  DynamoDB (Memory)
                                       ↓
                                  CloudWatch (Logs)
```

**Key design decisions:**
- Multi-model fallback (Nova Pro → Nova Lite) for resilience
- Single-call agent pipeline — no chained LLM calls, no latency spiral
- Token-budgeted responses (1024 max) for cost control
- D2 syntax validation with automatic fallback diagrams
- Conversation context injection (last 5 interactions, summarized)

Full details: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Quick Start

### Prerequisites
- Node.js 20+
- AWS CLI configured with Bedrock access (Nova Pro, Nova Lite)

### Setup

```bash
git clone git@github.com:DibbayajyotiRoy/ai-for-bharat.git
cd ai-for-bharat
npm install

# Create DynamoDB table + CloudWatch log group
chmod +x scripts/setup-aws.sh
./scripts/setup-aws.sh

# Configure
echo "AWS_REGION=us-east-1" > .env

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/[[...route]]/route.ts   # Hono API with orchestration
│   ├── page.tsx                     # Main UI
│   └── globals.css
├── components/copilot/
│   ├── ResultDisplay.tsx            # Three-pane result layout
│   └── D2Diagram.tsx                # Interactive diagram renderer
└── lib/
    ├── ai/
    │   ├── orchestrator.ts          # Mode routing + context injection
    │   ├── models.ts                # Bedrock invocation + fallback
    │   ├── normal.ts                # Streaming mode
    │   ├── structured.ts            # JSON structured output
    │   └── agent.ts                 # Research mode with sources
    ├── db/dynamo.ts                 # DynamoDB operations
    ├── d2-validator.ts              # D2 syntax cleaning
    ├── logger.ts                    # CloudWatch logging
    └── bedrock.ts                   # Bedrock client
scripts/
├── setup-aws.sh                     # One-command AWS resource setup
├── create-cloudwatch-dashboard.sh   # Monitoring dashboard
└── fix-iam-permissions.sh           # IAM troubleshooting
```

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import in Vercel
3. Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
4. Deploy

### AWS Amplify
See [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)

## Roadmap

### Done
- [x] AWS Bedrock integration with multi-model fallback
- [x] DynamoDB conversation memory with TTL
- [x] CloudWatch logging, metrics, dashboards
- [x] Research mode with curated topic-specific sources
- [x] Interactive D2 diagrams with ELK layout + zoom/pan
- [x] D2 syntax validation and auto-fallback
- [x] Adaptive skill levels (Beginner / Intermediate / Advanced)
- [x] Light/dark theme with system preference detection
- [x] Code syntax highlighting with copy

### In Progress
- [ ] Live web search API integration (Tavily, Serper, Brave)

### Planned
- [ ] User authentication (AWS Cognito)
- [ ] Explanation history UI
- [ ] Export to PDF / Markdown
- [ ] Multi-language support (i18n)
- [ ] Caching layer (ElastiCache)
- [ ] Voice input

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `AccessDenied` | Check IAM permissions for Bedrock. Run `./scripts/fix-iam-permissions.sh` |
| `ResourceNotFoundException` | Run `./scripts/setup-aws.sh` to create DynamoDB table |
| Credentials not found | Run `aws configure` or set keys in `.env` |
| Streaming broken | Ensure runtime is `nodejs` (not `edge`) |
| Diagram missing | Check `@terrastruct/d2` is installed. See console `[D2]` logs |

## License

[MIT](./LICENSE)

---

**Status:** Live and operational — search API integration in progress  
**Version:** 1.0.0
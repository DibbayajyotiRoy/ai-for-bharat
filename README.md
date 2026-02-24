# Learning Copilot
AI-Powered Concept Explainer Built on AWS

An intelligent learning assistant that transforms complex technical concepts, code snippets, and documentation into structured, visual explanations tailored to your skill level.

## 🎯 What It Does

Learning Copilot helps students and developers understand:
- Complex technical concepts
- Dense documentation
- Code snippets across multiple languages
- System architectures and data structures

It provides:
- **Adaptive explanations** (Beginner/Intermediate/Advanced)
- **Structured learning framework** (Mental Model → Explanation → Example → Takeaways)
- **Automated horizontal D2 system diagrams** with zoom/pan controls
- **Real-time streaming responses**
- **Multi-model fallback** for reliability (Nova Pro → Nova Lite)
- **Conversation memory** with DynamoDB (30-day TTL)
- **Research mode** with curated sources (ready for real search API integration)
- **Clean, modern UI** with light/dark themes

## 🏗️ Architecture

### AWS-Native Design
```
Frontend (Next.js) → API (Hono) → Orchestrator → [Normal|Agent] → Models → AWS Bedrock
                                        ↓
                                   DynamoDB (Memory)
                                        ↓
                                   CloudWatch (Logs)
```

**Key Features:**
- ✅ Multi-model fallback (Nova Pro → Nova Lite)
- ✅ DynamoDB conversation memory (30-day TTL)
- ✅ CloudWatch logging and metrics
- ✅ Optimized agent pipeline (single API call)
- ✅ Graceful degradation
- ✅ Cost-aware token limits
- ✅ Horizontal D2 diagrams with ELK layout
- ✅ D2 syntax validation and cleaning
- ✅ Perplexity-style source display (agent mode)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or later
- AWS CLI configured with credentials
- AWS Bedrock access (Nova Pro, Nova Lite models)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repo>
cd ai-for-bharat
npm install
```

2. **Set up AWS resources:**
```bash
chmod +x scripts/setup-aws.sh
./scripts/setup-aws.sh
```

This creates:
- DynamoDB table: `learning-copilot-history`
- CloudWatch log group: `/learning-copilot/api`
- TTL configuration (30 days)
- IAM permissions check

3. **Configure environment:**
```bash
# .env file (AWS credentials via CLI or set here)
AWS_REGION=us-east-1
```

4. **Start development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Create CloudWatch Dashboard

```bash
chmod +x scripts/create-cloudwatch-dashboard.sh
./scripts/create-cloudwatch-dashboard.sh
```

View at: AWS Console → CloudWatch → Dashboards → LearningCopilot

## 📊 Features

### Core Functionality
- **Adaptive Explanation Engine**: Select skill level for tailored explanations
- **Structured Output**: Mental Model, Explanation, Example, Diagram, Takeaways
- **Real-Time Streaming**: Content appears as it's generated
- **Language Detection**: Automatically detects programming languages
- **Horizontal D2 Diagrams**: Interactive left-to-right flowcharts with zoom/pan/reset controls
- **D2 Syntax Validation**: Automatic cleaning and fallback for invalid diagrams

### Modes

#### 📝 Normal Mode
- Streams markdown explanations
- Real-time content delivery
- Token limit: 1024 (optimized for quality)
- No sources displayed (honest about capabilities)
- Best for: Quick, focused explanations

#### 🔍 Research Mode (Agent)
- Optimized single-call synthesis
- Curated high-quality sources based on query:
  - JavaScript → MDN, JavaScript.info, ECMAScript Spec
  - Python → Python Docs, Real Python, PEP Index
  - React → React Docs, React Patterns, TypeScript Cheatsheet
  - Algorithms → GeeksforGeeks, Visualgo, Big-O Cheatsheet
- Perplexity-style source display with credibility badges
- Ready for real search API integration (Tavily, Brave, Google)
- Best for: In-depth learning with references

### User Experience
- **Three-Pane Layout**: Mental model header, tabbed content, interactive diagram
- **Theme Support**: Light and dark modes with system preference detection
- **Keyboard Shortcuts**: Cmd/Ctrl+V to paste, Cmd/Ctrl+Enter to explain
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Smooth Animations**: 60fps transitions using Framer Motion
- **Code Syntax Highlighting**: Multi-language support with copy functionality

### Reliability & Performance
- **Multi-Model Fallback**: Nova Pro → Nova Lite (automatic)
- **Graceful Error Handling**: Informative messages with recovery suggestions
- **Conversation Memory**: Last 5 interactions stored in DynamoDB
- **CloudWatch Monitoring**: Real-time metrics and logs
- **Cost Control**: Token limits and smart model routing
- **D2 Validation**: Automatic syntax cleaning and fallback diagrams

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** (App Router)
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **Framer Motion** for animations
- **React Markdown** for content rendering
- **D2 Diagrams** (@terrastruct/d2) with ELK layout for horizontal flow
- **React Syntax Highlighter** for code blocks
- **React Zoom Pan Pinch** for diagram interactions

### Backend & AI
- **Hono** (Edge-optimized API framework)
- **AWS Bedrock** (Nova Pro, Nova Lite)
- **Node.js Runtime** for AWS SDK support

### AWS Services
- **Amazon Bedrock**: Foundation model access (Nova Pro, Nova Lite)
- **Amazon DynamoDB**: Conversation history with TTL
- **Amazon CloudWatch**: Logs, metrics, and dashboards
- **AWS SDK**: Bedrock Runtime, DynamoDB, CloudWatch Logs

## 📁 Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── [[...route]]/route.ts    # Main API with orchestration
│   │   │   └── test/route.ts             # Bedrock test endpoint
│   │   ├── page.tsx                      # Main UI with mode toggle
│   │   ├── layout.tsx                    # Root layout
│   │   └── globals.css                   # Global styles
│   ├── components/
│   │   └── copilot/
│   │       ├── ResultDisplay.tsx         # Three-pane result layout
│   │       └── D2Diagram.tsx             # Interactive diagram renderer
│   └── lib/
│       ├── ai/
│       │   ├── orchestrator.ts           # Main orchestration logic
│       │   ├── models.ts                 # Model invocation with fallback
│       │   ├── normal.ts                 # Streaming markdown mode
│       │   ├── structured.ts             # Structured JSON mode
│       │   └── agent.ts                  # Research agent with sources
│       ├── db/
│       │   └── dynamo.ts                 # DynamoDB operations
│       ├── d2-validator.ts               # D2 syntax validation
│       ├── logger.ts                     # CloudWatch logging
│       ├── bedrock.ts                    # Bedrock client
│       └── utils.ts                      # Utility functions
├── scripts/
│   ├── setup-aws.sh                      # AWS resource setup
│   ├── create-cloudwatch-dashboard.sh    # Dashboard creation
│   └── fix-iam-permissions.sh            # IAM permission fixes
├── .env                                  # Environment variables
├── .gitignore                            # Git ignore rules
├── package.json                          # Dependencies
├── ARCHITECTURE.md                       # Detailed architecture docs
├── DEPLOYMENT_GUIDE.md                   # Deployment instructions
├── QUICK_START.md                        # Quick start guide
└── README.md                             # This file
```

## 🧪 Testing

### Test the API
```bash
curl -X POST http://localhost:3000/api/explain \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Explain linked list",
    "level": "Intermediate",
    "mode": "normal",
    "userId": "test-user"
  }'
```

### Test Bedrock Integration
```bash
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Explain serverless architecture simply."}'
```

### View Logs
```bash
aws logs tail /learning-copilot/api --follow
```

### Check DynamoDB
```bash
aws dynamodb scan --table-name learning-copilot-history --limit 5
```

## 📈 Monitoring

### CloudWatch Dashboard
Access at: AWS Console → CloudWatch → Dashboards → LearningCopilot

**Metrics:**
- Bedrock invocations (count)
- Average latency (ms)
- Recent interactions (log insights)
- Fallback count by model

### Console Logs
Development logs show:
```
[AI] Attempting model: Nova Pro
[AI] Success with Nova Pro
[DynamoDB] Interaction saved
[Logger] Logged to CloudWatch
[Parser] Mental model: Understanding the concept...
[D2] Cleaned diagram syntax
```

On fallback:
```
[AI] Model Nova Pro failed: Rate limit exceeded
[AI] Falling back to next model...
[AI] Attempting model: Nova Lite
[AI] Success with Nova Lite
```

## 💰 Cost Control

### Token Discipline
- Normal mode: 1024 tokens max (optimized)
- Agent mode: 1024 tokens (single-call synthesis)

### Memory Limits
- Last 5 interactions only
- Summarized before injection
- TTL: 30 days (auto-cleanup)

### Model Strategy
- Start with Nova Pro (balanced)
- Fallback to Nova Lite (cheaper, faster)
- Avoid unnecessary retries

## 🔒 Security

- AWS credentials via CLI or environment variables
- No hardcoded API keys
- IAM least-privilege roles
- Input validation
- No PII in logs
- TTL on conversation data
- HTTPS enforced

## 🚢 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
4. Deploy

### AWS Amplify
1. Connect repository
2. Configure build settings
3. Add environment variables
4. Deploy with CI/CD

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## 📊 Performance Targets

- Initial page load: <3 seconds
- Explanation generation: <10 seconds
- Animation performance: 60fps
- Diagram rendering: <2 seconds
- Stream start: <1 second

## 🎯 Reliability Targets

- System uptime: >99.5%
- Fallback success rate: >95%
- Error recovery rate: >90%
- Stream completion rate: >98%
- Diagram generation: >90% success

## 🗺️ Roadmap

### Completed ✅
- [x] AWS Bedrock integration (Nova Pro, Nova Lite)
- [x] Multi-model fallback
- [x] DynamoDB conversation memory
- [x] CloudWatch logging and metrics
- [x] Research mode (agent pipeline)
- [x] Cost control (token limits)
- [x] Horizontal D2 diagrams with ELK layout
- [x] D2 syntax validation and cleaning
- [x] Perplexity-style source display
- [x] Mental model parsing improvements
- [x] Theme support (light/dark)
- [x] Code syntax highlighting

### Planned 🚀
- [ ] Real web search API integration (Tavily, Serper, Brave)
- [ ] User authentication (AWS Cognito)
- [ ] Explanation history UI
- [ ] Export to PDF/Markdown
- [ ] Multi-language support (i18n)
- [ ] Advanced caching layer (ElastiCache)
- [ ] A/B testing framework
- [ ] Cost analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Voice input support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

## 🆘 Troubleshooting

### "AccessDenied" Error
- Check IAM permissions for Bedrock
- Ensure model access is enabled in AWS Console
- Run `./scripts/fix-iam-permissions.sh`

### "ResourceNotFoundException" (DynamoDB)
- Run `./scripts/setup-aws.sh` to create table
- Check table name matches `learning-copilot-history`

### "Unable to locate credentials"
- Run `aws configure` to set up credentials
- Or set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env`

### Streaming Not Working
- Check runtime is set to `nodejs` (not `edge`)
- Verify AWS SDK is installed
- Check console for error logs

### Diagram Not Showing
- Check browser console for D2 errors
- Verify `@terrastruct/d2` is installed
- Check `[D2]` logs in console for syntax issues

### Mental Model Text Missing
- Check browser console for `[Parser]` logs
- Verify response includes "### 1. The Mental Model" section
- Check for parsing errors in console

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed system architecture
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment instructions
- [QUICK_START.md](./QUICK_START.md) - Quick start guide
- [MENTAL_MODEL_AND_SOURCES_FIX.md](./MENTAL_MODEL_AND_SOURCES_FIX.md) - Recent UI fixes

## 🎓 Educational Value

This project demonstrates:
- Production-grade AWS architecture
- Multi-model AI orchestration
- Graceful degradation patterns
- Cost-aware AI system design
- Real-time streaming implementations
- Observability best practices
- Clean code architecture
- D2 diagram generation and validation
- Responsive UI/UX design
- Accessibility compliance

Built for AWS AI Hackathon - showcasing enterprise-level engineering.

---

**Status**: ✅ Production Ready  
**Last Updated**: February 2026  
**Version**: 2.0.0
# Learning Copilot - System Architecture

## Overview

Learning Copilot is a production-grade, AWS-native AI learning assistant with multi-model fallback, conversation memory, and intelligent agent orchestration.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Normal Mode  │  │ Research Mode│  │ Theme Toggle │         │
│  │ (Streaming)  │  │ (Agent)      │  │ (Light/Dark) │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (Hono + Edge)                       │
│                                                                  │
│  POST /api/explain                                               │
│  - Validates input                                               │
│  - Initializes DynamoDB                                          │
│  - Streams response                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Orchestrator Layer                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Fetch conversation history (DynamoDB)                 │   │
│  │ 2. Summarize context (last 5 interactions)              │   │
│  │ 3. Route to appropriate mode                             │   │
│  │ 4. Save interaction                                      │   │
│  │ 5. Log to CloudWatch                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────┬──────────────────────┬──────────────────┬──────────────┘
         │                      │                  │
         ▼                      ▼                  ▼
┌────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Normal Mode   │   │  Research Mode   │   │ Structured Mode  │
│  (normal.ts)   │   │  (agent.ts)      │   │ (structured.ts)  │
│                │   │                  │   │                  │
│  - Streams MD  │   │  - Planning      │   │  - Returns JSON  │
│  - Real-time   │   │  - Web Search    │   │  - Validated     │
│  - 512 tokens  │   │  - Credibility   │   │  - Retry logic   │
│                │   │  - Synthesis     │   │                  │
└────────┬───────┘   └────────┬─────────┘   └────────┬─────────┘
         │                    │                       │
         └────────────────────┼───────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Model Layer (models.ts)                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Priority List:                                           │  │
│  │                                                           │  │
│  │  1. Amazon Nova Pro (primary)                            │  │
│  │     ↓ (on failure)                                       │  │
│  │  2. Amazon Nova Lite (fallback)                          │  │
│  │     ↓ (on failure)                                       │  │
│  │  3. Error: All models failed                             │  │
│  │                                                           │  │
│  │  Features:                                               │  │
│  │  - Automatic retry with exponential backoff              │  │
│  │  - Console logging for debugging                         │  │
│  │  - Streaming and non-streaming support                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Services Layer                            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Bedrock    │  │   DynamoDB   │  │  CloudWatch  │         │
│  │              │  │              │  │              │         │
│  │ - Nova Pro   │  │ - History    │  │ - Logs       │         │
│  │ - Nova Lite  │  │ - TTL 30d    │  │ - Metrics    │         │
│  │ - Streaming  │  │ - Query      │  │ - Dashboard  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Frontend Layer
**Technology:** Next.js 16, React 19, TypeScript

**Components:**
- `page.tsx` - Main UI with mode toggle
- `ResultDisplay.tsx` - Three-pane result layout
- `D2Diagram.tsx` - Interactive diagram renderer

**Features:**
- Real-time streaming display
- Mode switching (Normal/Research)
- Skill level selection
- Theme management
- Keyboard shortcuts

### 2. API Layer
**Technology:** Hono (Edge-optimized)

**Endpoints:**
- `POST /api/explain` - Main explanation endpoint
- `POST /api/test` - Bedrock test endpoint

**Responsibilities:**
- Request validation
- DynamoDB initialization
- Stream management
- Error handling

### 3. Orchestrator Layer
**File:** `src/lib/ai/orchestrator.ts`

**Flow:**
1. Fetch recent conversation history
2. Summarize context (last 5 interactions)
3. Route to appropriate mode
4. Execute mode logic
5. Save interaction to DynamoDB
6. Log metrics to CloudWatch

**Graceful Degradation:**
- If DynamoDB fails → continue without memory
- If CloudWatch fails → continue without logging
- If agent mode fails → fallback to normal mode

### 4. Mode Implementations

#### Normal Mode (`normal.ts`)
- Streams markdown in structured format
- Token limit: 512 (cost control)
- Real-time content delivery
- Sections: Mental Model, Explanation, Diagram, Example, Takeaways

#### Research Mode (`agent.ts`)
- Multi-step pipeline:
  1. **Planning** - Generate search queries
  2. **Web Search** - Fetch sources (simulated)
  3. **Credibility Filter** - Rate sources (high/medium/low)
  4. **Synthesis** - Create comprehensive answer
- Returns answer + sources with transparency
- Fallback to normal mode on failure

#### Structured Mode (`structured.ts`)
- Returns strict JSON format
- Validation with retry logic
- Fallback structure on parse failure
- Used for programmatic access

### 5. Model Layer
**File:** `src/lib/ai/models.ts`

**Models:**
1. Amazon Nova Pro (primary)
2. Amazon Nova Lite (fallback)

**Features:**
- Automatic fallback on failure
- Streaming and non-streaming support
- Console logging for debugging
- Error tracking

### 6. Data Layer

#### DynamoDB (`src/lib/db/dynamo.ts`)
**Table:** `learning-copilot-history`

**Schema:**
- Partition Key: `userId` (string)
- Sort Key: `timestamp` (number)
- TTL: `expiresAt` (30 days)

**Operations:**
- `saveInteraction()` - Store conversation
- `fetchRecentInteractions()` - Get last 5
- `summarizeHistory()` - Create context summary

#### CloudWatch Logs (`src/lib/logger.ts`)
**Log Group:** `/learning-copilot/api`

**Logged Data:**
- userId
- mode (normal/agent/structured)
- modelUsed
- fallbackTriggered
- latency (ms)
- tokenEstimate
- error (if any)
- timestamp

## Cost Control Strategies

### 1. Token Discipline
- Normal mode: 512 tokens max
- Structured mode: 2048 tokens max
- Agent mode: 256 (planning) + 2048 (synthesis)

### 2. Memory Limits
- Last 5 interactions only
- Summarized before injection
- TTL: 30 days (auto-cleanup)

### 3. Search Limits
- Max 3 search queries
- Max 3 sources per query
- Filter by credibility

### 4. Model Fallback
- Start with Nova Pro (balanced)
- Fallback to Nova Lite (cheaper)
- Avoid unnecessary retries

## Reliability Features

### 1. Graceful Degradation
- DynamoDB failure → continue without memory
- CloudWatch failure → continue without logging
- Agent mode failure → fallback to normal
- Model failure → try next model

### 2. Error Handling
- Try-catch at every layer
- User-friendly error messages
- Detailed console logging
- CloudWatch error tracking

### 3. Monitoring
- CloudWatch dashboard
- Real-time metrics
- Fallback tracking
- Latency monitoring

## Security

### 1. Credentials
- AWS credentials via CLI or environment
- No hardcoded keys
- IAM least-privilege roles

### 2. Input Validation
- Content required check
- Type validation
- Sanitization (future)

### 3. Privacy
- No PII in logs
- TTL on conversation data
- User ID anonymization option

## Deployment

### Local Development
```bash
npm install
npm run setup:aws
npm run dev
```

### Production (Vercel)
```bash
vercel deploy
```

### Production (AWS Lambda)
```bash
# Build
npm run build

# Deploy with Serverless Framework or SAM
serverless deploy
```

## Monitoring

### CloudWatch Dashboard
```bash
npm run setup:dashboard
```

**Metrics:**
- Bedrock invocations
- Average latency
- Recent interactions
- Fallback count by model

### Logs
```bash
aws logs tail /learning-copilot/api --follow
```

## Performance Targets

- Initial page load: <3s
- Explanation generation: <10s
- Animation performance: 60fps
- Lambda cold start: <1s
- CloudWatch cache hit: >80%

## Scalability

- Lambda auto-scales to 1000 concurrent
- DynamoDB on-demand pricing
- CloudWatch automatic scaling
- Bedrock quota management

## Future Enhancements

1. Real web search API integration
2. User authentication
3. Explanation history UI
4. Export to PDF/Markdown
5. Multi-language support
6. Advanced caching layer
7. A/B testing framework
8. Cost analytics dashboard

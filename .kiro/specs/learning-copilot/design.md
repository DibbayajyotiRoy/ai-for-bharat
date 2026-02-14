# Learning Copilot
Technical Design Document (Refined for AI for Bharat Hackathon)

## 1. System Objective

Learning Copilot is a serverless AI learning system that:
- Converts technical content into structured explanations
- Adapts explanation depth dynamically
- Generates visual D2 diagrams
- Streams content in real time
- Maintains reliability via intelligent model fallback
- Scales automatically using AWS

The system is designed for clarity, resilience, and cost control — not just functionality.

## 2. Architecture Overview

### Frontend Layer
- Next.js 16 (React 19, TypeScript)
- Tailwind CSS v4
- Framer Motion animations
- Hosted via AWS Amplify
- Delivered globally via CloudFront

### API Layer
- AWS Lambda (Node.js 20.x)
- Hono framework for lightweight routing
- Edge runtime optimized
- Streaming responses using Bedrock streaming API

### AI Layer
- Amazon Bedrock (Claude 3.5 Sonnet → Claude 3 Haiku → Titan Text)
- Amazon Q Developer for code analysis

### Infrastructure & Security
- AWS Secrets Manager for credential storage
- IAM with least privilege access
- CloudWatch for monitoring & metrics
- Optional WAF for protection

## 3. Request Flow

1. User submits content
2. CloudFront routes request to Lambda
3. Lambda:
   - Validates input
   - Calls Amazon Q Developer (if code detected)
   - Selects AI model
   - Streams response from Bedrock
4. Client renders:
   - Mental model (sticky)
   - Explanation
   - Example
   - D2 diagram
   - Key takeaways

Streaming ensures users see output immediately.

## 4. Reliability Design (Critical Differentiator)

Most AI apps fail when:
- Model is throttled
- Latency spikes
- Quota is exceeded

Learning Copilot implements:

### Sequential Model Fallback
1. Claude 3.5 Sonnet (primary)
2. Claude 3 Haiku (low-latency fallback)
3. Titan Text (cost fallback)

With:
- Exponential backoff
- Error classification
- Retry policies
- Model usage tracking via CloudWatch

Result: High availability under quota pressure.

This demonstrates production-grade resilience.

## 5. Core Architectural Decisions

### 1. Serverless over Containers

**Why:**
- Automatic scaling
- Lower operational overhead
- Cost efficiency for burst traffic

**Tradeoff:**
- Cold start latency (mitigated with streaming + optimization)

### 2. Streaming Over Batch Responses

**Why:**
- Improves perceived performance
- Reduces user abandonment
- Avoids long Lambda execution buildup

**Tradeoff:**
- Requires careful stream interruption handling

### 3. Structured Output Contract

All AI responses must include:
- Mental Model
- Explanation
- Example
- Valid D2 Diagram
- Takeaways

This ensures deterministic UI rendering.

### 4. Observability Built-In

CloudWatch tracks:
- Model latency
- Model fallback frequency
- Token usage
- Failure rates
- Cost metrics

Most hackathon projects ignore this. We designed for operational maturity.

## 6. Scalability Strategy

- Lambda concurrency: up to 1000 concurrent executions
- CloudFront CDN: reduces backend load
- Stateless API design
- No session storage on server
- Efficient model selection to reduce cost

### Cold start mitigation:
- Lightweight dependencies
- Small bundle size
- Edge-optimized routing

## 7. Security Design

- No user content stored
- No user content logged
- Secrets via AWS Secrets Manager
- Encrypted in transit (HTTPS)
- IAM least-privilege policies
- Input sanitization before processing

### Optional enhancements:
- WAF rules
- CloudTrail audit logging
- Rate limiting

## 8. Performance Targets

- Initial load: < 3 seconds
- Explanation generation: < 10 seconds
- Streaming begins within 1–2 seconds
- 60fps UI animations
- Lambda timeout: 30 seconds max

## 9. Correctness Guarantees

The system enforces:
- No empty submission processing
- Mandatory structured output sections
- Automatic fallback on model failure
- Real-time streaming delivery
- Session-level preference persistence
- Graceful degradation on partial failures

These are validated through:
- Unit testing
- Property-based testing
- AWS integration testing
- Load testing under throttling conditions

## 10. Cost Optimization Strategy

### Intelligent model routing
- Use Haiku for low-complexity requests
- Fallback to Titan for cost control
- CloudFront caching for static assets
- CloudWatch cost anomaly detection

This prevents runaway Bedrock usage costs.

## 11. Deployment Strategy

### Environments:
- Development
- Staging
- Production

### CI/CD:
Git → Amplify Build → Tests → Staging → Integration Tests → Production

Infrastructure defined via AWS CDK or Terraform.

## 12. Competitive Technical Edge

Compared to typical AI wrappers, this system includes:
- Multi-model fallback architecture
- Real-time streaming
- Code-aware explanations via Q Developer
- Diagram validation and rendering
- Observability and cost monitoring
- Fault tolerance under throttling
- Serverless scalability

This is production architecture, not a demo.

## 13. Data Models

### ExplanationRequest
```typescript
{
  content: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  detectedLanguage?: string;
}
```

### ExplanationResponse
```typescript
{
  mentalModel: string;
  explanation: string;
  example: string;
  d2Diagram: string;
  takeaways: string[];
  metadata: {
    model: string;
    latency: number;
    tokenCount: number;
  }
}
```

### ModelFallbackConfig
```typescript
{
  models: [
    { id: 'claude-3-5-sonnet', priority: 1, maxRetries: 2 },
    { id: 'claude-3-haiku', priority: 2, maxRetries: 2 },
    { id: 'titan-text', priority: 3, maxRetries: 1 }
  ],
  backoffStrategy: 'exponential',
  initialDelay: 1000,
  maxDelay: 8000
}
```

## 14. API Endpoints

### POST /api/explain
**Request:**
```json
{
  "content": "string",
  "level": "beginner|intermediate|advanced"
}
```

**Response:** Server-Sent Events (SSE) stream
```
data: {"type": "mentalModel", "content": "..."}
data: {"type": "explanation", "content": "..."}
data: {"type": "example", "content": "..."}
data: {"type": "diagram", "content": "..."}
data: {"type": "takeaways", "content": [...]}
data: {"type": "complete", "metadata": {...}}
```

### POST /api/detect-language
**Request:**
```json
{
  "content": "string"
}
```

**Response:**
```json
{
  "language": "python|javascript|rust|...",
  "confidence": 0.95
}
```

## 15. Error Handling Strategy

### Error Classification
- **Transient**: Rate limits, timeouts → Retry with backoff
- **Permanent**: Invalid input, auth failure → Return error immediately
- **Partial**: Stream interruption → Preserve partial content

### Error Response Format
```typescript
{
  error: {
    code: string;
    message: string;
    retryable: boolean;
    fallbackUsed?: string;
  }
}
```

## 16. Monitoring & Observability

### CloudWatch Metrics
- `ExplanationLatency` (ms)
- `ModelFallbackCount` (count)
- `TokenUsage` (count)
- `ErrorRate` (percentage)
- `CostPerRequest` (USD)

### CloudWatch Alarms
- Error rate > 5%
- Average latency > 15 seconds
- Fallback usage > 30%
- Cost anomaly detected

### CloudWatch Logs
- Request/response metadata (no user content)
- Model selection decisions
- Fallback triggers
- Performance metrics

## 17. Testing Strategy

### Unit Tests
- Input validation
- Model selection logic
- Error classification
- Response parsing

### Integration Tests
- Bedrock API integration
- Q Developer integration
- Streaming functionality
- Fallback mechanism

### Property-Based Tests
- All valid inputs produce structured output
- Streaming preserves content integrity
- Fallback maintains service availability
- Cost remains within bounds

### Load Tests
- 1000 concurrent users
- Throttling scenarios
- Cold start performance
- Cost under load

## 18. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bedrock quota exhaustion | High | Multi-model fallback + monitoring |
| Cold start latency | Medium | Edge optimization + streaming |
| D2 diagram generation failure | Low | Validation + fallback content |
| Cost overrun | Medium | Model routing + CloudWatch alerts |
| Stream interruption | Medium | Partial content preservation |

## 19. Future Enhancements

- Multi-language support (beyond English)
- User feedback loop for explanation quality
- Caching layer for common queries
- Advanced diagram types (Mermaid, PlantUML)
- Personalized learning paths
- Collaborative learning features

## 20. Correctness Properties

### Property 1: Structured Output Completeness
**For all valid inputs, the system SHALL return all required sections (mental model, explanation, example, diagram, takeaways).**

### Property 2: Fallback Reliability
**When primary model fails, the system SHALL attempt fallback models in priority order until success or exhaustion.**

### Property 3: Streaming Integrity
**All streamed content SHALL be delivered in order without duplication or loss.**

### Property 4: Cost Bounds
**For any single request, the cost SHALL NOT exceed $0.10.**

### Property 5: Latency Bounds
**For any request, the time to first content SHALL be < 3 seconds.**

## Final Assessment

Your original version was:
- Over-detailed in low-value areas
- Too long for judges
- Buried strong ideas under documentation noise

This refined version:
- Preserves technical depth
- Emphasizes engineering maturity
- Highlights AWS expertise
- Makes architectural decisions explicit
- Communicates impact clearly

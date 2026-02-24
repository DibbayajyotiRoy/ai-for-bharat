# 🚀 Learning Copilot - Quick Start

## 30-Second Setup

```bash
# 1. Install
npm install

# 2. Setup AWS
npm run setup:aws

# 3. Run
npm run dev
```

Open http://localhost:3000

## Test It

```bash
curl -X POST http://localhost:3000/api/explain \
  -H "Content-Type: application/json" \
  -d '{"content":"Explain race conditions","level":"Beginner","mode":"normal"}'
```

## What You Get

✅ AWS Bedrock (Nova Pro + Nova Lite)
✅ Multi-model fallback
✅ DynamoDB conversation memory
✅ CloudWatch logging
✅ Research mode with sources
✅ Real-time streaming
✅ Cost control

## Modes

- **📝 Normal**: Fast streaming explanations
- **🔍 Research**: Multi-step agent with sources

## Architecture

```
Frontend → API → Orchestrator → [Normal|Agent] → Models → Bedrock
                      ↓
                 DynamoDB (Memory)
                      ↓
                 CloudWatch (Logs)
```

## Key Files

- `src/lib/ai/orchestrator.ts` - Main logic
- `src/lib/ai/models.ts` - Model fallback
- `src/lib/ai/agent.ts` - Research pipeline
- `src/lib/db/dynamo.ts` - Memory
- `src/lib/logger.ts` - Logging

## Monitoring

```bash
# View logs
aws logs tail /learning-copilot/api --follow

# Check memory
aws dynamodb scan --table-name learning-copilot-history --limit 5

# Create dashboard
npm run setup:dashboard
```

## Deploy

### Vercel
```bash
git push origin main
# Import in Vercel dashboard
# Add AWS credentials
# Deploy
```

### AWS Lambda
```bash
npm run build
serverless deploy
```

## Docs

- [README.md](./README.md) - Full documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deploy instructions
- [ALL_PHASES_COMPLETE.md](./ALL_PHASES_COMPLETE.md) - Implementation details

## Troubleshooting

**Build fails?**
```bash
rm -rf .next node_modules
npm install
npm run build
```

**AWS errors?**
```bash
aws configure
npm run setup:aws
```

**Need help?** Check console logs and CloudWatch

---

**Built for AWS AI Hackathon** 🏆

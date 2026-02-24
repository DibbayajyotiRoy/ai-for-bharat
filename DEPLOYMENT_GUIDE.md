# Learning Copilot - Deployment Guide

## 🚀 Quick Deployment

### Prerequisites
- AWS CLI configured
- Node.js 20.x+
- AWS Bedrock access (Nova models)

### 1. Local Development

```bash
# Install dependencies
npm install

# Set up AWS resources
npm run setup:aws

# Create CloudWatch dashboard
npm run setup:dashboard

# Start dev server
npm run dev
```

### 2. Verify Setup

```bash
# Test normal mode
curl -X POST http://localhost:3000/api/explain \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Explain race conditions",
    "level": "Beginner",
    "mode": "normal",
    "userId": "test-user"
  }'

# Test agent mode
curl -X POST http://localhost:3000/api/explain \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Research serverless architecture",
    "level": "Intermediate",
    "mode": "agent",
    "userId": "test-user"
  }'

# View logs
aws logs tail /learning-copilot/api --follow

# Check DynamoDB
aws dynamodb scan --table-name learning-copilot-history --limit 5
```

## 🌐 Production Deployment

### Option 1: Vercel (Recommended)

1. **Push to GitHub**
```bash
git add .
git commit -m "Complete AWS-native architecture"
git push origin main
```

2. **Import to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "New Project"
- Import your repository

3. **Configure Environment Variables**
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

4. **Deploy**
- Click "Deploy"
- Wait for build to complete
- Access your live URL

### Option 2: AWS Lambda + API Gateway

1. **Install Serverless Framework**
```bash
npm install -g serverless
```

2. **Create serverless.yml**
```yaml
service: learning-copilot

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  environment:
    AWS_REGION: us-east-1
  iamRoleStatements:
    - Effect: Allow
      Action:
        - bedrock:InvokeModel
        - bedrock:InvokeModelWithResponseStream
      Resource: "*"
    - Effect: Allow
      Action:
        - dynamodb:PutItem
        - dynamodb:Query
      Resource: "arn:aws:dynamodb:*:*:table/learning-copilot-history"
    - Effect: Allow
      Action:
        - logs:CreateLogGroup
        - logs:CreateLogStream
        - logs:PutLogEvents
      Resource: "*"

functions:
  api:
    handler: .next/standalone/server.js
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
```

3. **Deploy**
```bash
npm run build
serverless deploy
```

### Option 3: AWS Amplify

1. **Connect Repository**
- Go to AWS Amplify Console
- Click "New app" → "Host web app"
- Connect your GitHub repository

2. **Configure Build Settings**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

3. **Add Environment Variables**
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
```

4. **Deploy**
- Click "Save and deploy"
- Wait for build to complete

## 🔧 Post-Deployment

### 1. Verify AWS Resources

```bash
# Check DynamoDB table
aws dynamodb describe-table --table-name learning-copilot-history

# Check CloudWatch log group
aws logs describe-log-groups --log-group-name-prefix /learning-copilot

# Check Bedrock access
aws bedrock list-foundation-models --region us-east-1
```

### 2. Test Production Endpoint

```bash
# Replace with your production URL
PROD_URL="https://your-app.vercel.app"

curl -X POST $PROD_URL/api/explain \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Explain microservices",
    "level": "Intermediate",
    "mode": "normal",
    "userId": "prod-test"
  }'
```

### 3. Monitor Performance

```bash
# View CloudWatch dashboard
aws cloudwatch get-dashboard \
  --dashboard-name LearningCopilot \
  --region us-east-1

# Tail logs
aws logs tail /learning-copilot/api --follow --region us-east-1
```

## 📊 Monitoring Setup

### CloudWatch Dashboard

```bash
npm run setup:dashboard
```

Access at: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=LearningCopilot

### Metrics to Monitor

1. **Bedrock Invocations**
   - Track usage patterns
   - Identify peak times

2. **Average Latency**
   - Monitor response times
   - Detect performance issues

3. **Fallback Count**
   - Track model failures
   - Optimize fallback strategy

4. **Error Rate**
   - Monitor system health
   - Alert on anomalies

### Alarms (Optional)

```bash
# Create alarm for high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name learning-copilot-high-errors \
  --alarm-description "Alert when error rate is high" \
  --metric-name Errors \
  --namespace AWS/Bedrock \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## 🔒 Security Checklist

- [ ] AWS credentials not hardcoded
- [ ] IAM roles follow least privilege
- [ ] DynamoDB has TTL enabled
- [ ] CloudWatch logs have retention policy
- [ ] API endpoints use HTTPS
- [ ] Input validation in place
- [ ] No PII in logs
- [ ] Environment variables secured

## 💰 Cost Optimization

### Monitor Costs

```bash
# Check Bedrock usage
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://bedrock-filter.json
```

### Cost Reduction Tips

1. **Token Limits**
   - Normal mode: 512 tokens
   - Structured mode: 2048 tokens
   - Agent mode: 256 + 2048 tokens

2. **Memory Limits**
   - Last 5 interactions only
   - TTL: 30 days

3. **Model Strategy**
   - Start with Nova Pro
   - Fallback to Nova Lite (cheaper)

4. **Caching**
   - Cache common queries
   - Use CloudFront for static assets

## 🐛 Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### DynamoDB Errors

```bash
# Recreate table
aws dynamodb delete-table --table-name learning-copilot-history
npm run setup:aws
```

### Bedrock Access Denied

1. Check IAM permissions
2. Verify model access in AWS Console
3. Ensure region is correct (us-east-1)

### CloudWatch Logs Not Appearing

```bash
# Check log group exists
aws logs describe-log-groups --log-group-name-prefix /learning-copilot

# Recreate if needed
aws logs create-log-group --log-group-name /learning-copilot/api
```

## 📈 Scaling

### Auto-Scaling (Lambda)

```yaml
# serverless.yml
functions:
  api:
    handler: .next/standalone/server.js
    reservedConcurrency: 100
    provisionedConcurrency: 10
```

### DynamoDB Scaling

```bash
# Enable auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/learning-copilot-history \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --min-capacity 5 \
  --max-capacity 100
```

### CloudFront CDN

```bash
# Create distribution
aws cloudfront create-distribution \
  --origin-domain-name your-app.vercel.app \
  --default-root-object index.html
```

## 🎯 Performance Targets

- Initial page load: <3s
- Explanation generation: <10s
- Animation performance: 60fps
- Lambda cold start: <1s
- CloudWatch cache hit: >80%

## ✅ Deployment Checklist

- [ ] Dependencies installed
- [ ] AWS resources created
- [ ] CloudWatch dashboard created
- [ ] Build successful
- [ ] Tests passing
- [ ] Environment variables set
- [ ] Production deployment complete
- [ ] Monitoring configured
- [ ] Alarms set up (optional)
- [ ] Documentation updated

## 🆘 Support

For issues:
1. Check console logs
2. View CloudWatch logs
3. Check AWS service health
4. Review error messages
5. Consult ARCHITECTURE.md

## 📚 Additional Resources

- [README.md](./README.md) - Main documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [ALL_PHASES_COMPLETE.md](./ALL_PHASES_COMPLETE.md) - Implementation details
- [AWS Bedrock Docs](https://docs.aws.amazon.com/bedrock/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

#!/bin/bash

# Learning Copilot - AWS Setup Script
# This script sets up all required AWS resources

set -e

echo "🚀 Setting up AWS resources for Learning Copilot..."

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

# Check credentials
echo "✓ Checking AWS credentials..."
aws sts get-caller-identity > /dev/null || {
    echo "❌ AWS credentials not configured. Run 'aws configure' first."
    exit 1
}

REGION=${AWS_REGION:-us-east-1}
echo "✓ Using region: $REGION"

# Create DynamoDB table
echo "📦 Creating DynamoDB table..."
aws dynamodb create-table \
    --table-name learning-copilot-history \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=timestamp,AttributeType=N \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    2>/dev/null || echo "  Table already exists"

# Enable TTL
echo "⏰ Enabling TTL on DynamoDB table..."
aws dynamodb update-time-to-live \
    --table-name learning-copilot-history \
    --time-to-live-specification "Enabled=true, AttributeName=expiresAt" \
    --region $REGION \
    2>/dev/null || echo "  TTL already enabled"

# Create CloudWatch Log Group
echo "📊 Creating CloudWatch log group..."
aws logs create-log-group \
    --log-group-name /learning-copilot/api \
    --region $REGION \
    2>/dev/null || echo "  Log group already exists"

# Set log retention
echo "🗄️  Setting log retention to 7 days..."
aws logs put-retention-policy \
    --log-group-name /learning-copilot/api \
    --retention-in-days 7 \
    --region $REGION \
    2>/dev/null || echo "  Retention already set"

# Check Bedrock model access
echo "🤖 Checking Bedrock model access..."
aws bedrock list-foundation-models \
    --region $REGION \
    --query 'modelSummaries[?contains(modelId, `nova`)].modelId' \
    --output text || {
    echo "⚠️  Warning: Could not list Bedrock models. Ensure you have access."
}

echo ""
echo "✅ AWS setup complete!"
echo ""
echo "Resources created:"
echo "  - DynamoDB table: learning-copilot-history"
echo "  - CloudWatch log group: /learning-copilot/api"
echo ""
echo "Next steps:"
echo "  1. Ensure Bedrock model access is enabled in AWS Console"
echo "  2. Run 'npm run dev' to start the application"
echo "  3. Test with: curl -X POST http://localhost:3000/api/explain -H 'Content-Type: application/json' -d '{\"content\":\"test\"}'"

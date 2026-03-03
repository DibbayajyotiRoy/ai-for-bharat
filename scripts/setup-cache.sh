#!/bin/bash

# Setup script for Learning Copilot cache table
# This creates a DynamoDB table for caching responses

set -e

REGION="${AWS_REGION:-us-east-1}"
TABLE_NAME="learning-copilot-cache"

echo "🚀 Setting up Learning Copilot cache table..."
echo "Region: $REGION"
echo "Table: $TABLE_NAME"
echo ""

# Check if table exists
if aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" &>/dev/null; then
    echo "✅ Table '$TABLE_NAME' already exists"
else
    echo "📦 Creating table '$TABLE_NAME'..."
    
    aws dynamodb create-table \
        --table-name "$TABLE_NAME" \
        --attribute-definitions \
            AttributeName=cacheKey,AttributeType=S \
        --key-schema \
            AttributeName=cacheKey,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$REGION"
    
    echo "⏳ Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name "$TABLE_NAME" --region "$REGION"
    
    echo "✅ Table created successfully"
fi

# Enable TTL
echo "⏰ Enabling TTL on 'expiresAt' attribute..."
aws dynamodb update-time-to-live \
    --table-name "$TABLE_NAME" \
    --time-to-live-specification "Enabled=true, AttributeName=expiresAt" \
    --region "$REGION" 2>/dev/null || echo "⚠️  TTL already enabled or update in progress"

echo ""
echo "✅ Cache table setup complete!"
echo ""
echo "Table details:"
aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" --query 'Table.[TableName,TableStatus,ItemCount]' --output table

echo ""
echo "💡 The cache will store responses for 24 hours by default"
echo "💡 This will significantly speed up repeated queries"

#!/bin/bash
# scripts/setup-knowledge-base.sh
# Creates S3 bucket for Bedrock Knowledge Base documents
# BUDGET: Only run 1-2 days before demo! OpenSearch Serverless idles at $0.24/hr

set -euo pipefail

BUCKET_NAME="learning-copilot-kb-$(aws sts get-caller-identity --query Account --output text)"
REGION="${AWS_REGION:-us-east-1}"

echo "WARNING: This creates OpenSearch Serverless which costs ~\$5.76/day when idle"
echo "Only run this 1-2 days before your hackathon demo!"
echo ""

echo "Creating S3 bucket: $BUCKET_NAME"
aws s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$REGION" \
  $([ "$REGION" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=$REGION")

aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled

aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "Bucket created: $BUCKET_NAME"
echo ""
echo "Next steps:"
echo "1. Upload curated .md/.pdf docs to: s3://$BUCKET_NAME/documents/"
echo "2. Create Knowledge Base in Bedrock console pointing to this bucket"
echo "3. Add BEDROCK_KNOWLEDGE_BASE_ID=<id> to .env"
echo ""
echo "To delete after demo: aws s3 rb s3://$BUCKET_NAME --force"

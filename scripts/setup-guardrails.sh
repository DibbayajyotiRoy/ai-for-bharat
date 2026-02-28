#!/bin/bash
# scripts/setup-guardrails.sh
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"

echo "Creating Bedrock Guardrail..."

GUARDRAIL_ID=$(aws bedrock create-guardrail \
  --region "$REGION" \
  --name "learning-copilot-guardrail" \
  --description "Content safety guardrail for Learning Copilot" \
  --blocked-input-messaging "I cannot help with that request. Please ask about a technical or educational topic." \
  --blocked-outputs-messaging "The generated content was filtered for safety. Please try rephrasing your question." \
  --content-policy-config '{
    "filtersConfig": [
      {"type": "SEXUAL", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "VIOLENCE", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "HATE", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "INSULTS", "inputStrength": "HIGH", "outputStrength": "MEDIUM"},
      {"type": "MISCONDUCT", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "PROMPT_ATTACK", "inputStrength": "HIGH", "outputStrength": "NONE"}
    ]
  }' \
  --topic-policy-config '{
    "topicsConfig": [
      {
        "name": "OffTopic",
        "definition": "Questions unrelated to learning, technology, programming, or education",
        "examples": ["How to make weapons", "Give me medical advice"],
        "type": "DENY"
      }
    ]
  }' \
  --query 'guardrailId' --output text)

echo "Guardrail created: $GUARDRAIL_ID"

VERSION=$(aws bedrock create-guardrail-version \
  --region "$REGION" \
  --guardrail-identifier "$GUARDRAIL_ID" \
  --query 'version' --output text)

echo "Version: $VERSION"
echo ""
echo "Add to .env:"
echo "BEDROCK_GUARDRAIL_ID=$GUARDRAIL_ID"
echo "BEDROCK_GUARDRAIL_VERSION=$VERSION"

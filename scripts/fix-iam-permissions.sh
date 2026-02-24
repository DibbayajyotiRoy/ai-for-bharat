#!/bin/bash

# Fix IAM permissions for Learning Copilot

set -e

echo "🔧 Fixing IAM permissions for Learning Copilot..."

# Get current user ARN
USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
echo "Current user: $USER_ARN"

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_REGION:-us-east-1}

echo "Creating IAM policy for Learning Copilot..."

# Create policy document
cat > /tmp/learning-copilot-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:DescribeTable",
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:CreateTable",
        "dynamodb:UpdateTimeToLive"
      ],
      "Resource": [
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/learning-copilot-history"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": [
        "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/learning-copilot/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:ListFoundationModels"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create or update policy
POLICY_NAME="LearningCopilotPolicy"
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

# Try to create policy
aws iam create-policy \
    --policy-name $POLICY_NAME \
    --policy-document file:///tmp/learning-copilot-policy.json \
    --description "Policy for Learning Copilot application" \
    2>/dev/null || {
    echo "Policy already exists, updating..."
    # Get default version
    DEFAULT_VERSION=$(aws iam get-policy --policy-arn $POLICY_ARN --query 'Policy.DefaultVersionId' --output text)
    
    # Delete old version if we're at the limit
    VERSIONS=$(aws iam list-policy-versions --policy-arn $POLICY_ARN --query 'Versions[?IsDefaultVersion==`false`].VersionId' --output text)
    for VERSION in $VERSIONS; do
        aws iam delete-policy-version --policy-arn $POLICY_ARN --version-id $VERSION 2>/dev/null || true
    done
    
    # Create new version
    aws iam create-policy-version \
        --policy-arn $POLICY_ARN \
        --policy-document file:///tmp/learning-copilot-policy.json \
        --set-as-default
}

# Attach policy to current user
USER_NAME=$(echo $USER_ARN | awk -F'/' '{print $NF}')
echo "Attaching policy to user: $USER_NAME"

aws iam attach-user-policy \
    --user-name $USER_NAME \
    --policy-arn $POLICY_ARN \
    2>/dev/null || echo "Policy already attached"

# Clean up
rm /tmp/learning-copilot-policy.json

echo ""
echo "✅ IAM permissions configured!"
echo ""
echo "Policy ARN: $POLICY_ARN"
echo "Attached to: $USER_NAME"
echo ""
echo "Permissions granted:"
echo "  ✓ DynamoDB (learning-copilot-history table)"
echo "  ✓ CloudWatch Logs (/learning-copilot/* log groups)"
echo "  ✓ Bedrock (InvokeModel, InvokeModelWithResponseStream)"
echo ""
echo "Please wait 10-30 seconds for IAM changes to propagate, then restart your app."

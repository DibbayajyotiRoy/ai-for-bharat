#!/bin/bash
# scripts/setup-cognito.sh
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"

echo "Creating Cognito User Pool..."

POOL_ID=$(aws cognito-idp create-user-pool \
  --pool-name "learning-copilot-users" \
  --region "$REGION" \
  --auto-verified-attributes email \
  --username-attributes email \
  --password-policy '{"MinimumLength":8,"RequireUppercase":false,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":false}' \
  --schema '[{"Name":"name","Required":true,"Mutable":true}]' \
  --query 'UserPool.Id' --output text)

echo "User Pool: $POOL_ID"

CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-name "learning-copilot-web" \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --query 'UserPoolClient.ClientId' --output text)

echo "Client: $CLIENT_ID"
echo ""
echo "Add to .env:"
echo "NEXT_PUBLIC_COGNITO_USER_POOL_ID=$POOL_ID"
echo "NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID"

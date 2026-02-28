export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
}

export function getCognitoConfig(): CognitoConfig | null {
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) return null;
  return { userPoolId, clientId, region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1" };
}

export const COGNITO_ENABLED = !!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;

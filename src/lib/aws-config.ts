/**
 * Shared AWS configuration.
 *
 * Next.js 16 blocks environment variables that start with the reserved "AWS"
 * prefix, so we store credentials under APP_AWS_* and map them here for every
 * SDK client in the project.
 */

export function getAwsConfig() {
    return {
        region: process.env.APP_AWS_REGION || "us-east-1",
        credentials: {
            accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY || "",
        },
    };
}

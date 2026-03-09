/**
 * Shared AWS configuration.
 *
 * Next.js 16 blocks environment variables that start with the reserved "AWS"
 * prefix, so we store credentials under APP_AWS_* and map them here for every
 * SDK client in the project.
 */

export function getAwsConfig() {
    const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
    const sessionToken = process.env.APP_AWS_SESSION_TOKEN;
    const region = process.env.APP_AWS_REGION || "us-east-1";

    const config: any = { region };

    if (accessKeyId && secretAccessKey) {
        config.credentials = {
            accessKeyId,
            secretAccessKey,
            sessionToken: sessionToken || undefined,
        };
    }

    return config;
}

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Initialize client (will use Application Default Credentials)
const client = new SecretManagerServiceClient();

async function getSecret(secretName) {
    // 1. Try process.env first (Local Dev speed)
    // Maps ROUTEMASTER_INGEST_API_KEY -> INGEST_API_KEY
    // But we might just use the secret name directly in env for clarity?
    // Let's stick to the plan: Hybrid.

    // Actually, for local dev, we usually use the short name (INGEST_API_KEY).
    // For GSM, we use the long name (ROUTEMASTER_INGEST_API_KEY).

    // Mapping approach:
    const envMap = {
        'ROUTEMASTER_INGEST_API_KEY': 'INGEST_API_KEY'
    };

    const envVar = envMap[secretName] || secretName;
    if (process.env[envVar]) {
        console.log(`🔑 Using local env var for ${secretName}`);
        return process.env[envVar];
    }

    // 2. Try Secret Manager
    if (!process.env.GOOGLE_CLOUD_PROJECT) {
        console.warn(`⚠️ GOOGLE_CLOUD_PROJECT not set. Cannot fetch ${secretName} from GSM.`);
        return null;
    }

    const name = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/${secretName}/versions/latest`;

    try {
        const [version] = await client.accessSecretVersion({ name });
        const payload = version.payload.data.toString();
        console.log(`Vg fetched ${secretName} from Secret Manager`);
        return payload;
    } catch (err) {
        console.error(`❌ Failed to fetch ${secretName} from GSM:`, err.message);
        return null;
    }
}

module.exports = { getSecret };

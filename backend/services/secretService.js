let client;

// Only load Secret Manager client if we really need it (prod)
async function getSecret(name) {
    // 1. Try process.env first (local dev override)
    if (process.env[name]) {
        console.log(`🔑 Using local env var for ${name}`);
        return process.env[name];
    }

    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
        // local dev fallback: no GSM and no env var found -> return null or error
        console.warn(`⚠️  No GOOGLE_CLOUD_PROJECT and no env var for ${name}. Returning null.`);
        return null;
    }

    // 2. Try Secret Manager
    // Lazy import to avoid hard dependency locally if not needed
    if (!client) {
        try {
            const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
            client = new SecretManagerServiceClient();
        } catch (e) {
            console.error("❌ Failed to load @google-cloud/secret-manager. Ensure it is installed if running in production.");
            throw e;
        }
    }

    const secretName = `projects/${projectId}/secrets/${name}/versions/latest`;

    try {
        const [version] = await client.accessSecretVersion({ name: secretName });
        const payload = version.payload.data.toString("utf8");
        return payload;
    } catch (err) {
        console.error(`❌ Failed to fetch ${name} from GSM:`, err.message);
        return null;
    }
}

module.exports = { getSecret };

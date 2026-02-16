const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
// In Cloud Functions, this automatically uses the service account.
// Locally, it expects GOOGLE_APPLICATION_CREDENTIALS or gcloud auth.
const firestore = new Firestore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'bqsqltesting',
    databaseId: 'routemaster'
});
const COLLECTION = 'idempotency_keys';
const TTL_HOURS = 24;

/**
 * Checks if an idempotency key has arguably been seen before.
 * @param {string} endpoint - The endpoint being accessed (e.g. /ingest)
 * @param {string} idempotencyKey - The unique client-provided key
 * @returns {Promise<object|null>} - The cached response if found, or null.
 */
async function getIdempotencyRecord(endpoint, idempotencyKey) {
    if (!idempotencyKey) return null;

    const docId = `${endpoint.replace(/\//g, '_')}_${idempotencyKey}`;
    const docRef = firestore.collection(COLLECTION).doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const data = doc.data();
    // Check TTL (optional if Firestore TTL policy is set, but good for logic)
    const now = new Date();
    const expiresAt = data.expiresAt ? data.expiresAt.toDate() : null;

    if (expiresAt && now > expiresAt) {
        return null; // Expired
    }

    return data;
}

/**
 * Saves a response for an idempotency key.
 * @param {string} endpoint 
 * @param {string} idempotencyKey 
 * @param {number} status 
 * @param {object} body 
 */
async function saveIdempotencyRecord(endpoint, idempotencyKey, status, body) {
    if (!idempotencyKey) return;

    const docId = `${endpoint.replace(/\//g, '_')}_${idempotencyKey}`;
    const docRef = firestore.collection(COLLECTION).doc(docId);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL_HOURS * 60 * 60 * 1000);

    await docRef.set({
        endpoint,
        idempotencyKey,
        status,
        body,
        createdAt: now,
        expiresAt
    });
}

module.exports = {
    getIdempotencyRecord,
    saveIdempotencyRecord
};

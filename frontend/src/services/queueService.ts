import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'routemaster-db';
const STORE_NAME = 'telemetry_queue';
const MAX_QUEUE_SIZE = 500;
const MAX_PAYLOAD_SIZE_BYTES = 200 * 1024; // 200KB

interface QueueItem {
    id: string; // Idempotency Key
    requestId: string;
    url: string;
    method: string;
    body: any;
    createdAt: number;
    attempts: number;
    nextAttemptAt: number;
    lastError?: string;
}

interface RoutemasterDB extends DBSchema {
    telemetry_queue: {
        key: string;
        value: QueueItem;
    };
}

let dbPromise: Promise<IDBPDatabase<RoutemasterDB>>;
// Mutex to prevent concurrent flushes
let isFlushing = false;

const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<RoutemasterDB>(DB_NAME, 1, {
            upgrade(db) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            },
        });
    }
    return dbPromise;
};

export const enqueueRequest = async (
    url: string,
    body: any,
    idempotencyKey: string,
    requestId: string
): Promise<boolean> => {
    try {
        const db = await initDB();

        // Check Payload Size
        const bodyString = JSON.stringify(body);
        const size = new Blob([bodyString]).size;

        if (size > MAX_PAYLOAD_SIZE_BYTES) {
            console.error(`❌ Payload too large to queue (${size} bytes). Dropping.`);
            return false;
        }

        // Check Queue Size & Implement "Drop Oldest"
        const count = await db.count(STORE_NAME);
        if (count >= MAX_QUEUE_SIZE) {
            console.warn("⚠️ Queue full. Dropping oldest request to make room.");

            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            // Determine oldest item by creating a cursor or getting keys
            // Since we don't have an index on createdAt, we'll fetch all keys values.
            // For 500 items, getAll is acceptable performance.
            const allItems = await store.getAll();
            if (allItems.length > 0) {
                const oldest = allItems.reduce((prev, curr) => (prev.createdAt < curr.createdAt ? prev : curr));
                await store.delete(oldest.id);
                console.warn(`🗑️ Dropped oldest item: ${oldest.id}`);
            }
            await tx.done;
        }

        const item: QueueItem = {
            id: idempotencyKey,
            requestId: requestId,
            url,
            method: "POST",
            body,
            createdAt: Date.now(),
            attempts: 0,
            nextAttemptAt: Date.now()
        };

        await db.put(STORE_NAME, item);
        console.log(`📥 Queued request: ${item.id}`);
        return true;
    } catch (error) {
        console.error("❌ Failed to enqueue request:", error);
        return false;
    }
};

export const getQueueStatus = async () => {
    const db = await initDB();
    const count = await db.count(STORE_NAME);
    return { queued: count, isFlushing };
};

export const flushQueue = async (): Promise<void> => {
    if (isFlushing) {
        console.log("⏳ Flush already in progress. Skipping.");
        return;
    }

    if (!navigator.onLine) {
        console.log("✈️ Offline. Skipping flush.");
        return;
    }

    isFlushing = true;

    try {
        const db = await initDB();
        const allItems = await db.getAll(STORE_NAME);

        // Sort by createdAt ASC guarantees FIFO
        const pending = allItems
            .filter(item => Date.now() >= item.nextAttemptAt)
            .sort((a, b) => a.createdAt - b.createdAt);

        if (pending.length === 0) {
            isFlushing = false;
            return;
        }

        console.log("🔄 Starting queue flush...");

        // Process sequentially to respect order
        for (const item of pending) {
            if (!navigator.onLine) break;

            try {
                console.log(`📤 Syncing ${item.id}...`);

                const response = await fetch(item.url, {
                    method: item.method,
                    headers: {
                        "Content-Type": "application/json",
                        "Idempotency-Key": item.id,
                        "X-Request-Id": item.requestId
                    },
                    body: JSON.stringify(item.body)
                });

                // Success (2xx) or Client Error (4xx - don't retry endlessy)
                if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
                    await db.delete(STORE_NAME, item.id);
                    console.log(`✅ Synced ${item.id}`);
                } else {
                    // Server Error / Rate Limit -> Retry with Backoff
                    throw new Error(`Server Error: ${response.status}`);
                }

            } catch (error: any) {
                console.warn(`⚠️ Sync failed for ${item.id}:`, error.message);

                // Exponential Backoff: 2s, 4s, 8s... capped at 5 minutes
                // attempts starts at 0, first fail makes it 1.
                // 2000 * 2^(1-1) = 2000 * 1 = 2000 (2s)
                // 2000 * 2^(2-1) = 2000 * 2 = 4000 (4s)
                const attempts = item.attempts + 1;
                const delay = Math.min(2000 * Math.pow(2, attempts - 1), 5 * 60 * 1000);

                item.attempts = attempts;
                item.nextAttemptAt = Date.now() + delay;
                item.lastError = error.message;

                // Update record
                await db.put(STORE_NAME, item);
            }
        }

    } catch (err) {
        console.error("❌ Critical flush error:", err);
    } finally {
        isFlushing = false;
        console.log("🏁 Flush complete.");
    }
};

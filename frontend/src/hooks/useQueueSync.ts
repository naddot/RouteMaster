import { useEffect, useRef, useState } from "react";
import { flushQueue, getQueueStatus } from "../services/queueService";

type QueueSyncStatus = {
    queued: number;
    isFlushing: boolean;
    online: boolean;
    lastFlushAt?: number;
    lastError?: string;
};

type UseQueueSyncOptions = {
    /** How often to attempt a flush when online (ms). Default 30s. */
    intervalMs?: number;
    /** How often to refresh queue counts (ms). Default 2s. */
    pollMs?: number;
    /** Flush immediately on mount. Default true. */
    flushOnMount?: boolean;
};

export function useQueueSync(options: UseQueueSyncOptions = {}) {
    const {
        intervalMs = 30_000,
        pollMs = 2_000,
        flushOnMount = true,
    } = options;

    const [status, setStatus] = useState<QueueSyncStatus>({
        queued: 0,
        isFlushing: false,
        online: navigator.onLine,
    });

    // Prevent overlapping flush triggers in the hook (queueService also guards, belt + braces)
    const flushInFlight = useRef<Promise<void> | null>(null);

    const refreshStatus = async () => {
        try {
            const { queued, isFlushing } = await getQueueStatus();
            setStatus((prev) => ({
                ...prev,
                queued,
                isFlushing,
                online: navigator.onLine,
            }));
        } catch (e: any) {
            setStatus((prev) => ({
                ...prev,
                lastError: e?.message ?? String(e),
                online: navigator.onLine,
            }));
        }
    };

    const safeFlush = async () => {
        if (!navigator.onLine) {
            setStatus((prev) => ({ ...prev, online: false }));
            return;
        }
        if (flushInFlight.current) return;

        flushInFlight.current = (async () => {
            try {
                await flushQueue();
                setStatus((prev) => ({ ...prev, lastFlushAt: Date.now(), lastError: undefined }));
            } catch (e: any) {
                setStatus((prev) => ({
                    ...prev,
                    lastError: e?.message ?? String(e),
                    lastFlushAt: Date.now(),
                }));
            } finally {
                flushInFlight.current = null;
                // refresh counts after a flush attempt
                await refreshStatus();
            }
        })();

        return flushInFlight.current;
    };

    // Keep a ref to queued count so the interval can see the latest value without restarting
    const queuedRef = useRef(status.queued);
    useEffect(() => { queuedRef.current = status.queued; }, [status.queued]);

    useEffect(() => {
        let pollTimer: number | undefined;
        let flushTimer: number | undefined;

        const handleOnline = () => {
            setStatus((prev) => ({ ...prev, online: true }));
            if (queuedRef.current > 0) void safeFlush();
        };

        const handleOffline = () => {
            setStatus((prev) => ({ ...prev, online: false }));
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Poll queue count + flushing flag so UI can show status
        pollTimer = window.setInterval(() => {
            void refreshStatus();
        }, pollMs);

        // Attempt periodic flush when online ONLY if there are items
        flushTimer = window.setInterval(() => {
            if (navigator.onLine && queuedRef.current > 0) void safeFlush();
        }, intervalMs);

        // Initial load
        void refreshStatus();
        if (flushOnMount) void safeFlush();

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            if (pollTimer) window.clearInterval(pollTimer);
            if (flushTimer) window.clearInterval(flushTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intervalMs, pollMs, flushOnMount]);

    return {
        ...status,
        flushNow: safeFlush,
        refresh: refreshStatus,
    };
}

import { JobTelemetry, GpsLogTelemetry, ShiftTelemetry, IntendedRouteTelemetry } from '../types';

/**
 * TELEMETRY SERVICE
 * Calls the BFF ingress endpoint which proxies to the backend.
 */

import { v4 as uuidv4 } from 'uuid';
import { enqueueRequest } from './queueService';

const sendToIngestor = async (payload: {
  intended_route?: IntendedRouteTelemetry[];
  jobs?: JobTelemetry[];
  shifts?: ShiftTelemetry[];
  gps_logs?: GpsLogTelemetry[];
}): Promise<boolean> => {
  const url = '/api/ingest';
  const requestId = uuidv4();
  const idempotencyKey = uuidv4();

  // 1. Offline Check
  if (!navigator.onLine) {
    console.log("✈️ Offline. Queuing request.");
    const queued = await enqueueRequest(url, payload, idempotencyKey, requestId);
    return queued;
  }

  try {
    // 2. Online Attempt
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // 3. Fail-Closed or Retry?
      // If 5xx or Network Error, we queue.
      // If 4xx (Client Error), we log and drop (except 429).
      if (response.status >= 500 || response.status === 429) {
        console.warn(`⚠️ Server Error (${response.status}). Queuing.`);
        await enqueueRequest(url, payload, idempotencyKey, requestId);
        return true; // Accepted via queue
      }

      console.error(`❌ Ingestion Error: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("⚠️ Network Error. Queuing request.", error);
    await enqueueRequest(url, payload, idempotencyKey, requestId);
    return true; // Accepted via queue
  }
};

export const sendJobUpdate = async (data: JobTelemetry): Promise<boolean> => {
  const payload = { ...data, eventId: data.eventId || crypto.randomUUID() };
  return sendToIngestor({ jobs: [payload] });
};

export const sendGpsLog = async (data: GpsLogTelemetry): Promise<boolean> => {
  const payload = { ...data, eventId: data.eventId || crypto.randomUUID() };
  return sendToIngestor({ gps_logs: [payload] });
};

export const sendShiftTelemetry = async (data: ShiftTelemetry): Promise<boolean> => {
  const payload = { ...data, eventId: data.eventId || crypto.randomUUID() };
  return sendToIngestor({ shifts: [payload] });
};

export const sendIntendedRoute = async (data: IntendedRouteTelemetry[]): Promise<boolean> => {
  const mapped = data.map(d => ({ ...d, eventId: d.eventId || crypto.randomUUID() }));
  return sendToIngestor({ intended_route: mapped });
};

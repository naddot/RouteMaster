import { useState, useRef, useCallback } from 'react';
import { DeliveryStop, RouteStatus, RouteStats, JobTelemetry } from '../types';
import { sendJobUpdate } from '../services/telemetryService';

export const useRouteManager = (initialDriverId: string) => {
    const [stops, setStops] = useState<DeliveryStop[]>([]);
    const [routeStatus, setRouteStatus] = useState<RouteStatus>(RouteStatus.IDLE);
    const [routeStats, setRouteStats] = useState<RouteStats | null>(null);

    // We keep shift ID here as it relates to the lifecycle of the route/stops
    const shiftIdRef = useRef(`SHIFT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`);

    const handleRouteUpdate = useCallback((updatedMetadata: DeliveryStop[]) => {
        setStops(prevStops => {
            const lockedStops = prevStops.filter(s => s.status !== 'pending');
            const lockedIds = new Set(lockedStops.map(s => s.id));
            const optimizedPending = updatedMetadata.filter(s => !lockedIds.has(s.id));
            const optimizedIds = new Set(optimizedPending.map(s => s.id));
            const missedPending = prevStops.filter(s => s.status === 'pending' && !lockedIds.has(s.id) && !optimizedIds.has(s.id));
            return [...lockedStops, ...optimizedPending, ...missedPending];
        });
    }, []);

    const updateStopStatus = (id: string, newStatus: 'pending' | 'completed' | 'failed' | 'arrived') => {
        setStops(prev => prev.map(s => {
            if (s.id === id) {
                const updated = { ...s, status: newStatus };
                if (newStatus === 'arrived') updated.actualArrivalEta = new Date().toISOString();
                const jobUpdate: JobTelemetry = {
                    job_id: s.id,
                    shift_id: shiftIdRef.current,
                    address: s.address,
                    planned_eta: s.estimatedArrivalIso,
                    actual_arrival_eta: updated.actualArrivalEta || null,
                    completion_time: (newStatus === 'completed' || newStatus === 'failed') ? new Date().toISOString() : '',
                    status: newStatus,
                    tyre_count: (s.tyreCount || 2).toString(),
                    stop_type: s.stopType || 'delivery',
                    eventId: crypto.randomUUID()
                };
                sendJobUpdate(jobUpdate);
                return updated;
            }
            return s;
        }));
    };

    return {
        stops,
        setStops,
        routeStatus,
        setRouteStatus,
        routeStats,
        setRouteStats,
        handleRouteUpdate,
        updateStopStatus,
        shiftId: shiftIdRef.current
    };
};

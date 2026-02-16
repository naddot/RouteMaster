import { useRef, useEffect } from 'react';
import { UserLocation, RouteStats } from '../types';
import { sendGpsLog, sendShiftTelemetry } from '../services/telemetryService';

interface UseJourneyProps {
    driverId: string;
    shiftId: string;
    userLocation: UserLocation | null;
    routeStats: RouteStats | null;
    isNavigating: boolean;
    setIsNavigating: (val: boolean) => void;
}

export const useJourney = ({
    driverId,
    shiftId,
    userLocation,
    routeStats,
    isNavigating,
    setIsNavigating
}: UseJourneyProps) => {
    const gpsLogIntervalRef = useRef<number | null>(null);
    const lastTotalDistance = useRef<number | null>(null);
    const userLocationRef = useRef<UserLocation | null>(null);

    // Keep ref in sync for interval closure
    useEffect(() => {
        userLocationRef.current = userLocation;
    }, [userLocation]);

    // Update total distance ref when stats change
    useEffect(() => {
        if (routeStats?.totalDistance) {
            // Parse "12.5 miles" -> 12.5
            const dist = parseFloat(routeStats.totalDistance.replace(/[^0-9.]/g, ''));
            if (!isNaN(dist)) lastTotalDistance.current = dist;
        }
    }, [routeStats]);

    const toggleJourney = () => {
        if (isNavigating) {
            // STOP NAVIGATION
            setIsNavigating(false);

            if (gpsLogIntervalRef.current !== null) {
                window.clearInterval(gpsLogIntervalRef.current);
                gpsLogIntervalRef.current = null;
            }

            sendShiftTelemetry({
                Shift_id: shiftId,
                driver_id: driverId,
                Start_time: new Date().toISOString(), // In a real app this might be stored state
                End_time: new Date().toISOString(),
                total_distance_miles: lastTotalDistance.current,
                total_drive_time: routeStats?.totalDuration || null,
                Total_fitting_time: routeStats?.serviceDurationStr || null,
                eventId: crypto.randomUUID()
            });

        } else {
            // START NAVIGATION
            setIsNavigating(true);

            // Clear any existing interval just in case
            if (gpsLogIntervalRef.current !== null) {
                window.clearInterval(gpsLogIntervalRef.current);
            }

            gpsLogIntervalRef.current = window.setInterval(() => {
                if (userLocationRef.current) {
                    sendGpsLog({
                        driver_id: driverId,
                        timestamp: new Date().toISOString(),
                        latitude: userLocationRef.current.lat,
                        longitude: userLocationRef.current.lng,
                        heading: (userLocationRef.current.heading || 0).toString(),
                        speed: Math.round(userLocationRef.current.speed || 0),
                        job_id: null,
                        eventId: crypto.randomUUID()
                    });
                }
            }, 10000);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (gpsLogIntervalRef.current !== null) {
                window.clearInterval(gpsLogIntervalRef.current);
            }
        };
    }, []);

    return { toggleJourney };
};

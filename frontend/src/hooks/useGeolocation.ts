import { useState, useEffect, useRef } from 'react';
import { UserLocation } from '../types';

export const useGeolocation = (isNavigating: boolean, startFromUserLocation: boolean) => {
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [geolocationError, setGeolocationError] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const wakeLockRef = useRef<any>(null);

    // Initial Location Fetch
    useEffect(() => {
        if (startFromUserLocation && !userLocation && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setGeolocationError(null);
                    setUserLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        heading: pos.coords.heading,
                        speed: pos.coords.speed
                    });
                },
                (err) => {
                    const msg = err.code === 1 ? "Permission denied" :
                        err.code === 3 ? "Initial lock timed out - using last/manual" :
                            err.message;
                    setGeolocationError(msg);
                    console.warn("Initial location fetch failed:", err.message);
                },
                { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
            );
        }
    }, [startFromUserLocation, userLocation]);

    // Wake Lock Management
    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator && (navigator as any).wakeLock) {
                try {
                    wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                } catch (err: any) {
                    console.warn(`Wake Lock request failed: ${err.name}, ${err.message}`);
                }
            }
        };
        const releaseWakeLock = async () => {
            if (wakeLockRef.current) {
                try {
                    await wakeLockRef.current.release();
                    wakeLockRef.current = null;
                } catch (err) {
                    console.error('Failed to release wake lock:', err);
                }
            }
        };
        if (isNavigating) requestWakeLock();
        else releaseWakeLock();
        return () => { releaseWakeLock(); };
    }, [isNavigating]);

    // Continuous Tracking when navigating
    useEffect(() => {
        if (isNavigating) {
            if ("geolocation" in navigator) {
                watchIdRef.current = navigator.geolocation.watchPosition(
                    (pos) => {
                        const loc = {
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            heading: pos.coords.heading,
                            speed: pos.coords.speed
                        };
                        setUserLocation(loc);
                    },
                    (err) => {
                        console.error("WatchPosition error:", err);
                        // We don't set geolocationError here to avoid spamming the UI 
                        // once we already have a lock or have shown the initial error.
                    },
                    { enableHighAccuracy: true }
                );
            }
        } else {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [isNavigating]);

    return { userLocation, setUserLocation, geolocationError };
};

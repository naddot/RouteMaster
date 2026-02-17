export type GoogleMapsMode = "places" | "dumb" | "error" | "loading";

interface LoaderState {
    mode: GoogleMapsMode;
    google: typeof google | null;
    error: Error | null;
}

let loaderPromise: Promise<typeof google> | null = null;
let currentGoogle: typeof google | null = null;
let currentError: Error | null = null;
let placesVerified = false; // New flag to track permission success

const PLACES_ENABLED = import.meta.env.VITE_GOOGLE_PLACES_ENABLED === "true";
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Internal verification function
const verifyPlacesAccess = async (google: typeof window.google) => {
    if (placesVerified) return; // Already verified
    try {
        const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
        // Canary Check: Lightweight call to check permissions
        await Place.searchByText({ textQuery: "check", fields: ["id"] });
        placesVerified = true;
    } catch (e) {
        console.warn("Google Places API permission check failed:", e);
        placesVerified = false;
        // We do NOT reject the loader promise here, because the Map is still usable.
        // We just verify false.
    }
};

export const loadGoogleMaps = (): Promise<typeof google> => {
    // 1. Feature Flag Check
    if (!PLACES_ENABLED) {
        return Promise.reject(new Error("Google Places disabled by feature flag"));
    }

    // 2. Return existing promise if already loading/loaded
    if (loaderPromise) {
        return loaderPromise;
    }

    // 3. Create new loader promise
    loaderPromise = new Promise((resolve, reject) => {
        const finalize = async (g: typeof google) => {
            currentGoogle = g;
            await verifyPlacesAccess(g); // Verify before resolving logic
            resolve(g);
        };

        // If window.google.maps exists but isn't fully ready (e.g. valid stub but no methods), we might need to wait.
        if (window.google?.maps && typeof window.google.maps.importLibrary === 'function') {
            finalize(window.google);
            return;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&loading=async&libraries=places,marker&v=weekly&region=GB`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            // Polling to ensure google.maps is fully ready
            let attempts = 0;
            const check = () => {
                attempts++;
                if (window.google?.maps && typeof window.google.maps.importLibrary === 'function') {
                    finalize(window.google);
                } else if (attempts < 50) {
                    setTimeout(check, 50);
                } else {
                    reject(new Error("Google Maps script loaded but window.google.maps.importLibrary is undefined"));
                }
            };
            check();
        };

        script.onerror = (e) => {
            const error = new Error("Failed to load Google Maps script");
            currentError = error;
            reject(error);
        };

        document.head.appendChild(script);
    });

    return loaderPromise;
};

export const getLoaderState = (): LoaderState => {
    if (!PLACES_ENABLED) return { mode: "dumb", google: null, error: null };
    if (currentError) return { mode: "error", google: null, error: currentError };

    // Only return "places" if script loaded AND validated
    if (currentGoogle) {
        if (placesVerified) {
            return { mode: "places", google: currentGoogle, error: null };
        } else {
            // Script loaded but places verification failed (or hasn't finished yet if reused)
            // However, since loadGoogleMaps now waits for verification, if we are here and verif failed, it means dumb mode.
            // But if verification is PENDING (rare edge case in sync usage), we might want 'loading'.
            // For simplicity: if currentGoogle is set but placesVerified is false, it's essentially DUMB mode (Map works, Places doesn't).
            return { mode: "dumb", google: currentGoogle, error: null };
        }
    }

    return { mode: "loading", google: null, error: null };
};

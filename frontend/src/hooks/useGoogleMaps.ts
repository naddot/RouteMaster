import { useEffect, useState } from 'react';
import { loadGoogleMaps, getLoaderState, GoogleMapsMode } from '../utils/googleMapsLoader';

export const useGoogleMaps = () => {
    const [state, setState] = useState<{
        mode: GoogleMapsMode;
        google: typeof google | null;
        error: Error | null;
    }>(getLoaderState());

    useEffect(() => {
        const PLACES_ENABLED = import.meta.env.VITE_GOOGLE_PLACES_ENABLED === "true";
        if (!PLACES_ENABLED) return;

        let mounted = true;

        loadGoogleMaps()
            .then((google) => {
                // The loader now handles verification internally!
                // We just rely on getLoaderState() logic which determines places vs dumb based on verif.
                if (mounted) {
                    const state = getLoaderState();
                    setState(state);
                }
            })
            .catch((error) => {
                // Determine if it's a feature flag disable or real error
                if (mounted) setState({ mode: "error", google: null, error });
            });

        return () => {
            mounted = false;
        };
    }, []);

    return state;
};

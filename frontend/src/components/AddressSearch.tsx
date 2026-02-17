import React, { useEffect, useRef } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

export type PlaceSelection = {
    rawAddress: string;
    placeId?: string;
    lat?: number;
    lng?: number;
    formattedAddress?: string;
};

interface AddressSearchProps {
    placeholder?: string;
    disabled?: boolean;
    initialValue?: string;
    onSelect: (p: PlaceSelection) => void;
    className?: string;
}

export const AddressSearch: React.FC<AddressSearchProps> = ({
    placeholder,
    disabled,
    initialValue,
    onSelect,
    className = "block w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
}) => {
    const { mode, google } = useGoogleMaps();
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const elementRef = useRef<HTMLElement | null>(null);

    // Debug active mode
    useEffect(() => {
        console.log(`[AddressSearch] Current Mode: ${mode}, Google Loaded: ${!!google}`);
    }, [mode, google]);

    // Stable callback ref to avoid effect re-runs
    const onSelectRef = useRef(onSelect);
    useEffect(() => {
        onSelectRef.current = onSelect;
    }, [onSelect]);

    const isPlacesMode = mode === 'places' && !!google;

    // Places Widget Effect
    const [widgetError, setWidgetError] = React.useState(false);

    useEffect(() => {
        // Guard against disabled state within effect to prevent running
        if (!isPlacesMode || !containerRef.current || disabled) return;

        let active = true;
        const listenerRef = { current: null as any }; // Local ref for cleanup scope

        const initWidget = async () => {
            try {
                // Double check importLibrary availability to prevent runtime crashes
                if (!google?.maps?.importLibrary) {
                    throw new Error("google.maps.importLibrary is missing");
                }

                console.log("[AddressSearch] Initializing PlaceAutocompleteElement...");

                // Cast to any because local types might be outdated for "PlacesLibrary" return
                const lib = await google.maps.importLibrary("places") as any;
                const PlaceAutocompleteElement = lib.PlaceAutocompleteElement;


                if (!active) return;

                // Reuse existing element if possible, or create new
                if (!elementRef.current) {
                    const element = new PlaceAutocompleteElement();
                    elementRef.current = element;
                    containerRef.current?.appendChild(element);

                    element.style.width = '100%';
                    // Force white background and dark text via CSS variables
                    element.style.setProperty('--gmp-place-autocomplete-background', '#ffffff');
                    element.style.setProperty('--gmp-place-autocomplete-color', '#0f172a');
                }

                const element = elementRef.current as any;

                // Propagate initialValue
                if (initialValue !== undefined) {
                    element.value = initialValue;
                }

                // Propagate placeholder
                if (placeholder) {
                    element.setAttribute('placeholder', placeholder);
                } else {
                    element.removeAttribute('placeholder');
                }

                // --- ROBUST UK RESTRICTION LOGIC ---
                // 1. Try strict component restrictions (Standard)
                try {
                    element.componentRestrictions = { country: ['gb'] };
                } catch (e) { console.warn("componentRestrictions failed", e); }

                // 2. Try requestOptions (Newer API versions)
                try {
                    element.requestOptions = { includedRegionCodes: ['GB'] };
                } catch (e) {
                    // specific log only if needed
                }

                // 3. Fallback: Bias to UK Bounding Box
                try {
                    element.locationBias = {
                        west: -8.65, south: 49.8, east: 1.8, north: 60.9
                    };
                } catch (e) { console.warn("locationBias failed", e); }
                // -----------------------------------

            } catch (err) {
                console.error("Failed to init PlaceAutocompleteElement", err);
                if (active) setWidgetError(true); // Trigger fallback
            }
        };

        // Reset error state on mount/remount attempt
        setWidgetError(false);
        initWidget();

        return () => {
            active = false;
            if (elementRef.current && listenerRef.current) {
                (elementRef.current as any).removeEventListener('gmp-places-select', listenerRef.current);
            }
            if (elementRef.current && containerRef.current) {
                if (containerRef.current.contains(elementRef.current)) {
                    containerRef.current.removeChild(elementRef.current);
                }
                elementRef.current = null;
            }
        };
    }, [isPlacesMode, google, disabled, initialValue, placeholder]);

    // Render Logic:
    // ...

    if (disabled || !isPlacesMode || widgetError) {
        return (
            <input
                ref={inputRef}
                type="text"
                defaultValue={initialValue}
                placeholder={placeholder}
                disabled={disabled}
                className={className}
                onChange={(e) => onSelectRef.current({ rawAddress: e.target.value })}
            />
        );
    }

    // Merge custom class or use defaults
    // Note: passing 'p-0.5' to match widget tightness
    // Added min-h-[38px] to prevent collapse if widget fails to render content
    // Added bg-white to ensure it's not transparent/black in dark contexts
    // REMOVED 'overflow-hidden' and added 'relative' to allow dropdown to show
    const containerClasses = className
        ? className.replace("px-3 py-2", "p-0.5 min-h-[38px] bg-white relative")
        : "block w-full p-0.5 border border-slate-300 rounded-lg bg-white min-h-[38px] relative";

    return (
        <div ref={containerRef} className={containerClasses}>
            {/* The web component injects here */}
        </div>
    );
};

export default AddressSearch;

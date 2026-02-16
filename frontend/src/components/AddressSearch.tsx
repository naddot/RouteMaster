import React, { useEffect, useRef } from 'react';

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
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    useEffect(() => {
        if (disabled) return;
        if (!inputRef.current) return;

        // Safety check for places library
        const PLACES_ENABLED = import.meta.env.VITE_GOOGLE_PLACES_ENABLED === "true";
        if (!window.google?.maps?.places?.Autocomplete) {
            if (PLACES_ENABLED) {
                console.warn("Google Places Autocomplete is enabled but not loaded. Check API status.");
            }
            return;
        }

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            fields: ["place_id", "formatted_address", "geometry"],
            types: ["address"],
        });

        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const rawAddress = inputRef.current?.value || "";

            const lat = place.geometry?.location?.lat();
            const lng = place.geometry?.location?.lng();

            onSelect({
                rawAddress,
                placeId: place.place_id,
                formattedAddress: place.formatted_address,
                lat: lat !== undefined ? lat : undefined,
                lng: lng !== undefined ? lng : undefined,
            });
        });

        autocompleteRef.current = autocomplete;

        return () => {
            // Autocomplete doesn't have a formal destroy, but we clear the listeners
            google.maps.event.trigger(autocomplete, 'remove');
            autocompleteRef.current = null;
        };
    }, [disabled, onSelect]);

    return (
        <input
            ref={inputRef}
            type="text"
            defaultValue={initialValue}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
        />
    );
};

export default AddressSearch;

import { useCallback } from "react";
import { MapComponent } from "@features/map/components/MapComponent";
import { LocationSearch } from "@features/map/components/LocationSearch";
import type { MapMarkerLocation } from "@features/map/components/MapComponent";

export interface LngLat {
    lng: number;
    lat: number;
}

interface MarkerMapPickerProps {
    value: LngLat | null;
    onChange: (lngLat: LngLat) => void;
    /**
     * Preferred center for the map when no pin has been placed yet.
     * Falls back to the MapComponent default (Bangalore) when undefined.
     */
    defaultCenter?: LngLat;
}

/**
 * Presentational map picker.
 * - Click anywhere on the map → places a single pin and calls onChange.
 * - Search selects a location → centers the map + places a pin.
 * - When no value is set, centers on `defaultCenter` if provided.
 */
export function MarkerMapPicker({ value, onChange, defaultCenter }: MarkerMapPickerProps) {
    const handleMapClick = useCallback(
        (loc: MapMarkerLocation) => {
            onChange({ lng: loc.longitude, lat: loc.latitude });
        },
        [onChange]
    );

    const handleSearchSelect = useCallback(
        (loc: { longitude: number; latitude: number }) => {
            onChange({ lng: loc.longitude, lat: loc.latitude });
        },
        [onChange]
    );

    const markers: MapMarkerLocation[] = value
        ? [{ longitude: value.lng, latitude: value.lat }]
        : [];

    // Pin position drives the center when set; otherwise use caller-supplied
    // defaultCenter (creator's region) or let MapComponent fall back to Bangalore.
    const center = value ?? defaultCenter;

    return (
        <div className="space-y-2">
            <LocationSearch
                onSelect={handleSearchSelect}
                placeholder="Search for a location to center the map…"
                proximity={value ?? undefined}
            />
            <MapComponent
                center={center}
                zoom={15}
                markers={markers}
                onMapClick={handleMapClick}
                interactive={true}
                height="280px"
                preview={false}
            />
            {value ? (
                <p className="text-xs text-neutral-500">
                    Pin at {value.lat.toFixed(5)}, {value.lng.toFixed(5)} — click the map to move it.
                </p>
            ) : (
                <p className="text-xs text-amber-600">
                    Click the map or search above to place a pin.
                </p>
            )}
        </div>
    );
}

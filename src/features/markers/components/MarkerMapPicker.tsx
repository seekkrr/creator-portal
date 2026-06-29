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
}

/**
 * Presentational map picker.
 * - Click anywhere on the map → places a single pin and calls onChange.
 * - Search selects a location → centers the map + places a pin.
 */
export function MarkerMapPicker({ value, onChange }: MarkerMapPickerProps) {
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

    const center = value
        ? { lng: value.lng, lat: value.lat }
        : undefined;

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
                <p className="text-xs text-slate-500">
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

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { config } from "@config/env";
import type { QuestLocation } from "@/types";

// Set Mapbox token
mapboxgl.accessToken = config.mapbox.accessToken;

interface MapComponentProps {
    center?: { lng: number; lat: number };
    zoom?: number;
    markers?: QuestLocation[];
    onMapClick?: (location: QuestLocation) => void;
    onMarkerClick?: (location: QuestLocation, index: number) => void;
    interactive?: boolean;
    height?: string;
    className?: string;
}

export function MapComponent({
    center = config.mapbox.defaultCenter,
    zoom = config.mapbox.defaultZoom,
    markers = [],
    onMapClick,
    onMarkerClick,
    interactive = true,
    height = "400px",
    className = "",
}: MapComponentProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);

    // Cleanup markers
    const clearMarkers = useCallback(() => {
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
    }, []);

    // Add markers to map
    const addMarkers = useCallback(() => {
        if (!mapRef.current) return;

        clearMarkers();

        markers.forEach((location, index) => {
            const el = document.createElement("div");
            el.className = "custom-marker";
            el.innerHTML = `
        <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium shadow-lg border-2 border-white cursor-pointer transform hover:scale-110 transition-transform">
          ${index + 1}
        </div>
      `;

            const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([location.longitude, location.latitude])
                .addTo(mapRef.current!);

            if (onMarkerClick) {
                el.addEventListener("click", (e) => {
                    e.stopPropagation();
                    onMarkerClick(location, index);
                });
            }

            markersRef.current.push(marker);
        });

        // Fit bounds if multiple markers
        if (markers.length > 1 && mapRef.current) {
            const bounds = new mapboxgl.LngLatBounds();
            markers.forEach((loc) => {
                bounds.extend([loc.longitude, loc.latitude]);
            });
            mapRef.current.fitBounds(bounds, { padding: 50 });
        }
    }, [markers, onMarkerClick, clearMarkers]);

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: config.mapbox.style,
            center: [center.lng, center.lat],
            zoom: zoom,
            interactive: interactive,
        });

        // Add navigation controls
        if (interactive) {
            map.addControl(new mapboxgl.NavigationControl(), "top-right");
        }

        // Handle map click
        if (onMapClick) {
            map.on("click", async (e) => {
                const { lng, lat } = e.lngLat;

                // Reverse geocode to get place name
                try {
                    const response = await fetch(
                        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${config.mapbox.accessToken}`
                    );
                    const data = await response.json();
                    const place = data.features?.[0];

                    onMapClick({
                        longitude: lng,
                        latitude: lat,
                        place_name: place?.place_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                        address: place?.properties?.address,
                        city: place?.context?.find((c: { id: string }) => c.id.startsWith("place"))?.text,
                        region: place?.context?.find((c: { id: string }) => c.id.startsWith("region"))?.text,
                        country: place?.context?.find((c: { id: string }) => c.id.startsWith("country"))?.text,
                    });
                } catch {
                    onMapClick({
                        longitude: lng,
                        latitude: lat,
                        place_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                    });
                }
            });
        }

        mapRef.current = map;

        return () => {
            clearMarkers();
            map.remove();
            mapRef.current = null;
        };
    }, [center, zoom, interactive, onMapClick, clearMarkers]);

    // Update markers when they change
    useEffect(() => {
        if (mapRef.current) {
            addMarkers();
        }
    }, [addMarkers]);

    return (
        <div
            ref={mapContainerRef}
            className={`rounded-xl overflow-hidden ${className}`}
            style={{ height }}
            aria-label="Map"
        />
    );
}

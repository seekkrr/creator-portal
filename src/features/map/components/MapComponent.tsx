import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { config } from "@config/env";
import { escapeHtml } from "@/utils/security";
import type { QuestLocation } from "@/types";

// Set Mapbox token
mapboxgl.accessToken = config.mapbox.accessToken;

// Light presets for Mapbox Standard
type LightPreset = 'dawn' | 'day' | 'dusk' | 'night';

// Fog configurations for each preset
const FOG_CONFIGS: Record<LightPreset, mapboxgl.FogSpecification> = {
    dawn: {
        color: 'rgb(255, 200, 150)',
        'high-color': 'rgb(255, 160, 100)',
        'horizon-blend': 0.08,
        'space-color': 'rgb(40, 30, 50)',
        'star-intensity': 0.2,
    },
    day: {
        color: 'rgb(220, 235, 255)',
        'high-color': 'rgb(135, 206, 235)',
        'horizon-blend': 0.05,
    },
    dusk: {
        color: 'rgb(255, 150, 120)',
        'high-color': 'rgb(180, 100, 150)',
        'horizon-blend': 0.1,
        'space-color': 'rgb(30, 20, 50)',
        'star-intensity': 0.4,
    },
    night: {
        color: 'rgb(10, 20, 40)',
        'high-color': 'rgb(5, 10, 30)',
        'horizon-blend': 0.12,
        'space-color': 'rgb(0, 5, 15)',
        'star-intensity': 1.0,
    },
};

// Get time-based light preset
function getTimeBasedPreset(): LightPreset {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 7) return 'dawn';
    if (hour >= 7 && hour < 18) return 'day';
    if (hour >= 18 && hour < 20) return 'dusk';
    return 'night';
}

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
    zoom = 17,
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

    // Store latest onMapClick to avoid stale closures in event listener
    const onMapClickRef = useRef(onMapClick);
    useEffect(() => {
        onMapClickRef.current = onMapClick;
    }, [onMapClick]);

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
                <div class="relative group">
                    <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-xl border-3 border-white cursor-pointer transform hover:scale-110 transition-all duration-200 hover:shadow-2xl">
                        ${index + 1}
                    </div>
                    <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-purple-600"></div>
                </div>
            `;

            const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([location.longitude, location.latitude])
                .addTo(mapRef.current!);

            // Add popup with location info - escape HTML to prevent XSS
            const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
                .setHTML(`
                    <div class="p-2">
                        <p class="font-semibold text-sm">${escapeHtml(location.place_name) || 'Location ' + (index + 1)}</p>
                        ${location.address ? `<p class="text-xs text-gray-500">${escapeHtml(location.address)}</p>` : ''}
                    </div>
                `);
            marker.setPopup(popup);

            if (onMarkerClick) {
                el.addEventListener("click", (e) => {
                    e.stopPropagation();
                    onMarkerClick(location, index);
                });
            }

            markersRef.current.push(marker);
        });

        // Fit bounds if multiple markers with animation
        if (markers.length > 1 && mapRef.current) {
            const bounds = new mapboxgl.LngLatBounds();
            markers.forEach((loc) => {
                bounds.extend([loc.longitude, loc.latitude]);
            });
            mapRef.current.fitBounds(bounds, {
                padding: 80,
                duration: 1500,
                pitch: 60,
            });
        }
    }, [markers, onMarkerClick, clearMarkers]);

    // Initialize map - RUNS ONCE ON MOUNT
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        // Determine light preset based on current time
        const lightPreset = getTimeBasedPreset();

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: config.mapbox.style,
            center: [center.lng, center.lat],
            zoom: zoom,
            pitch: 65,
            bearing: -17.6,
            interactive: interactive,
            antialias: true,
            maxPitch: 85,
            config: {
                basemap: {
                    lightPreset: lightPreset,
                    showPointOfInterestLabels: true,
                    showPlaceLabels: true,
                    showRoadLabels: true,
                    showTransitLabels: true,
                }
            }
        });

        map.on('style.load', () => {
            // Add terrain source
            if (!map.getSource('mapbox-dem')) {
                map.addSource('mapbox-dem', {
                    type: 'raster-dem',
                    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    tileSize: 512,
                    maxzoom: 14,
                });
            }

            // Enable 3D terrain
            map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.8 });

            // Set fog based on time of day
            map.setFog(FOG_CONFIGS[lightPreset]);
        });

        // Add navigation controls
        if (interactive) {
            map.addControl(new mapboxgl.NavigationControl({
                visualizePitch: true,
                showCompass: true,
                showZoom: true,
            }), "top-right");

            map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

            map.addControl(new mapboxgl.GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true,
                showUserHeading: true,
                showAccuracyCircle: true,
            }), 'top-right');

            map.addControl(new mapboxgl.ScaleControl({
                maxWidth: 100,
                unit: 'metric',
            }), 'bottom-left');
        }

        // Handle map click
        map.on("click", async (e) => {
            const { lng, lat } = e.lngLat;

            // Create click ripple effect
            const rippleEl = document.createElement("div");
            rippleEl.innerHTML = `<div class="w-8 h-8 rounded-full bg-indigo-500/50 animate-ping"></div>`;
            const rippleMarker = new mapboxgl.Marker({ element: rippleEl })
                .setLngLat([lng, lat])
                .addTo(map);
            setTimeout(() => rippleMarker.remove(), 600);

            // Only reverse geocode if there's a listener
            if (onMapClickRef.current) {
                try {
                    const response = await fetch(
                        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${config.mapbox.accessToken}`
                    );
                    const data = await response.json();
                    const place = data.features?.[0];

                    onMapClickRef.current({
                        longitude: lng,
                        latitude: lat,
                        place_name: place?.place_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                        address: place?.properties?.address,
                        city: place?.context?.find((c: { id: string }) => c.id.startsWith("place"))?.text,
                        region: place?.context?.find((c: { id: string }) => c.id.startsWith("region"))?.text,
                        country: place?.context?.find((c: { id: string }) => c.id.startsWith("country"))?.text,
                    });
                } catch {
                    onMapClickRef.current({
                        longitude: lng,
                        latitude: lat,
                        place_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                    });
                }
            }
        });

        // Double-click zoom with rotation
        map.on('dblclick', (e) => {
            e.preventDefault();
            map.flyTo({
                center: e.lngLat,
                zoom: map.getZoom() + 1.5,
                bearing: map.getBearing() + 15,
                duration: 800,
            });
        });

        mapRef.current = map;

        return () => {
            clearMarkers();
            map.remove();
            mapRef.current = null;
        };
        // Removed dynamic props from dependency array to prevent re-initialization
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle updates to center and zoom efficiently
    useEffect(() => {
        if (!mapRef.current) return;

        // Use flyTo for smooth transitions when props change
        mapRef.current.flyTo({
            center: [center.lng, center.lat],
            zoom: zoom,
            speed: 1.2,
            curve: 1.42,
            essential: true
        });
    }, [center.lng, center.lat, zoom]);

    // Update markers when they change
    useEffect(() => {
        if (mapRef.current) {
            addMarkers();
        }
    }, [addMarkers]);

    return (
        <div className="relative group">
            <div
                ref={mapContainerRef}
                className={`rounded-xl overflow-hidden shadow-2xl ${className}`}
                style={{ height }}
                aria-label="Interactive 3D Map"
            />

            {/* Keyboard hints on hover */}
            {interactive && (
                <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur text-white text-xs px-3 py-2 rounded-lg">
                    <div className="flex flex-col gap-1">
                        <span>🖱️ Scroll to zoom</span>
                        <span>🔄 Right-drag to rotate</span>
                        <span>⬆️ Ctrl+drag to tilt</span>
                    </div>
                </div>
            )}
        </div>
    );
}

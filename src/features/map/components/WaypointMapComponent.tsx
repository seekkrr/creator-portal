import { useEffect, useRef, useCallback, memo } from "react";
import mapboxgl from "mapbox-gl";
import { config } from "@config/env";
import { escapeHtml } from "@/utils/security";
import type { QuestLocation } from "@/types";

// Set Mapbox token
mapboxgl.accessToken = config.mapbox.accessToken;

// Light presets for Mapbox Standard
type LightPreset = 'dawn' | 'day' | 'dusk' | 'night';

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

function getTimeBasedPreset(): LightPreset {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 7) return 'dawn';
    if (hour >= 7 && hour < 18) return 'day';
    if (hour >= 18 && hour < 20) return 'dusk';
    return 'night';
}

interface WaypointMapComponentProps {
    center: { lng: number; lat: number };
    waypoints: QuestLocation[];
    onWaypointAdd: (location: QuestLocation) => void;
    onWaypointUpdate: (index: number, location: QuestLocation) => void;
    onWaypointRemove: (index: number) => void;
    height?: string;
    className?: string;
}

// Create marker element for 60 FPS performance
function createMarkerElement(index: number): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "custom-marker";
    el.innerHTML = `
        <div class="relative group">
            <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-xl border-3 border-white cursor-grab transform hover:scale-110 transition-all duration-200 hover:shadow-2xl">
                ${index + 1}
            </div>
            <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-purple-600"></div>
        </div>
    `;
    return el;
}

// Calculate center of waypoints
function getWaypointsCenter(waypoints: QuestLocation[]): { lng: number; lat: number } {
    if (waypoints.length === 0) return { lng: 0, lat: 0 };
    const sum = waypoints.reduce(
        (acc, wp) => ({ lng: acc.lng + wp.longitude, lat: acc.lat + wp.latitude }),
        { lng: 0, lat: 0 }
    );
    return { lng: sum.lng / waypoints.length, lat: sum.lat / waypoints.length };
}

// Memoized component for 60 FPS performance
export const WaypointMapComponent = memo(function WaypointMapComponent({
    center,
    waypoints,
    onWaypointAdd,
    onWaypointUpdate,
    onWaypointRemove,
    height = "500px",
    className = "",
}: WaypointMapComponentProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const popupsRef = useRef<mapboxgl.Popup[]>([]);
    const isInitializedRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const prevWaypointCountRef = useRef(0);

    // Store callbacks in refs to avoid stale closures
    const onWaypointAddRef = useRef(onWaypointAdd);
    const onWaypointUpdateRef = useRef(onWaypointUpdate);
    const onWaypointRemoveRef = useRef(onWaypointRemove);
    const waypointsRef = useRef(waypoints);

    useEffect(() => {
        onWaypointAddRef.current = onWaypointAdd;
        onWaypointUpdateRef.current = onWaypointUpdate;
        onWaypointRemoveRef.current = onWaypointRemove;
        waypointsRef.current = waypoints;
    }, [onWaypointAdd, onWaypointUpdate, onWaypointRemove, waypoints]);

    // Cleanup markers and popups
    const clearMarkers = useCallback(() => {
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        popupsRef.current.forEach(popup => popup.remove());
        popupsRef.current = [];
    }, []);

    // Fly to show all waypoints while preserving pitch (3D)
    const flyToWaypoints = useCallback(() => {
        const map = mapRef.current;
        const wps = waypointsRef.current;
        if (!map || wps.length === 0) return;

        if (wps.length === 1) {
            const wp = wps[0];
            if (wp) {
                map.flyTo({
                    center: [wp.longitude, wp.latitude],
                    zoom: 17,
                    pitch: 65,
                    bearing: -17.6,
                    duration: 1000,
                    essential: true,
                });
            }
        } else {
            const waypointCenter = getWaypointsCenter(wps);
            const bounds = new mapboxgl.LngLatBounds();
            wps.forEach(wp => bounds.extend([wp.longitude, wp.latitude]));

            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            const latDiff = Math.abs(ne.lat - sw.lat);
            const lngDiff = Math.abs(ne.lng - sw.lng);
            const maxDiff = Math.max(latDiff, lngDiff);

            let zoom = 17;
            if (maxDiff > 0.01) zoom = 16;
            if (maxDiff > 0.02) zoom = 15;

            map.flyTo({
                center: [waypointCenter.lng, waypointCenter.lat],
                zoom: zoom,
                pitch: 65,
                bearing: -17.6,
                duration: 1200,
                essential: true,
            });
        }
    }, []);

    // Fetch walking directions from Mapbox Directions API
    const fetchWalkingRoute = useCallback(async (coordinates: [number, number][]) => {
        if (coordinates.length < 2) return null;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const coordString = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/walking/${coordString}?geometries=geojson&overview=full&access_token=${config.mapbox.accessToken}`,
                { signal: abortControllerRef.current.signal }
            );
            if (!response.ok) return null;
            const data = await response.json();
            return data.routes?.[0]?.geometry?.coordinates ?? null;
        } catch {
            return null;
        }
    }, []);

    // Update route line with walking directions
    const updateRouteLine = useCallback(async () => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        const wps = waypointsRef.current;
        const coordinates = wps.map(wp => [wp.longitude, wp.latitude] as [number, number]);
        const source = map.getSource('route') as mapboxgl.GeoJSONSource;

        if (!source) return;

        if (coordinates.length < 2) {
            source.setData({
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: [] },
            });
            return;
        }

        const routeCoordinates = await fetchWalkingRoute(coordinates);
        source.setData({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: routeCoordinates ?? coordinates,
            },
        });
    }, [fetchWalkingRoute]);

    // Add markers to map with HOVER popups
    const addMarkers = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;

        clearMarkers();
        const wps = waypointsRef.current;

        wps.forEach((wp, index) => {
            const el = createMarkerElement(index);

            const marker = new mapboxgl.Marker({
                element: el,
                anchor: 'bottom',
                draggable: true,
            })
                .setLngLat([wp.longitude, wp.latitude])
                .addTo(map);

            // Create popup for hover (not attached to marker for manual control)
            const popup = new mapboxgl.Popup({
                offset: 25,
                closeButton: false,
                closeOnClick: false,
            }).setHTML(`
                <div class="p-2">
                    <p class="font-semibold text-sm">${escapeHtml(wp.place_name) || 'Waypoint ' + (index + 1)}</p>
                    <p class="text-xs text-gray-500">${wp.latitude.toFixed(5)}, ${wp.longitude.toFixed(5)}</p>
                    <p class="text-xs text-indigo-600 mt-1">Drag to move • Right-click to remove</p>
                </div>
            `);

            // Show popup on hover (manual control)
            el.addEventListener('mouseenter', () => {
                popup.setLngLat([wp.longitude, wp.latitude]).addTo(map);
            });
            el.addEventListener('mouseleave', () => {
                popup.remove();
            });

            // Drag events
            marker.on('dragstart', () => {
                el.style.cursor = 'grabbing';
                popup.remove();
            });

            marker.on('dragend', async () => {
                el.style.cursor = 'grab';
                const lngLat = marker.getLngLat();

                try {
                    const response = await fetch(
                        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${config.mapbox.accessToken}`
                    );
                    const data = await response.json();
                    const place = data.features?.[0];

                    onWaypointUpdateRef.current(index, {
                        longitude: lngLat.lng,
                        latitude: lngLat.lat,
                        place_name: place?.place_name ?? `${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)}`,
                        city: place?.context?.find((c: { id: string }) => c.id.startsWith("place"))?.text,
                    });
                } catch {
                    onWaypointUpdateRef.current(index, {
                        ...wp,
                        longitude: lngLat.lng,
                        latitude: lngLat.lat,
                    });
                }
            });

            // Right-click to remove
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                onWaypointRemoveRef.current(index);
            });

            markersRef.current.push(marker);
            popupsRef.current.push(popup);
        });
    }, [clearMarkers]);

    // Initialize map - RUNS ONCE
    useEffect(() => {
        if (!mapContainerRef.current || isInitializedRef.current) return;
        isInitializedRef.current = true;

        const lightPreset = getTimeBasedPreset();

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: config.mapbox.style,
            center: [center.lng, center.lat],
            zoom: 17,
            pitch: 65,
            bearing: -17.6,
            antialias: true,
            maxPitch: 85,
            trackResize: true,
            fadeDuration: 0,
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

        // Add controls
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

        map.on('style.load', () => {
            if (!map.getSource('mapbox-dem')) {
                map.addSource('mapbox-dem', {
                    type: 'raster-dem',
                    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    tileSize: 512,
                    maxzoom: 14,
                });
            }
            map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.8 });
            map.setFog(FOG_CONFIGS[lightPreset]);

            map.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'LineString', coordinates: [] },
                },
            });

            // Route line glow effect
            map.addLayer({
                id: 'route-glow',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#818cf8',
                    'line-width': 14,
                    'line-blur': 10,
                    'line-opacity': 0.4,
                },
            });

            // Main route line
            map.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#6366f1',
                    'line-width': 5,
                    'line-opacity': 1,
                },
            });

            // Dashed line on top
            map.addLayer({
                id: 'route-dashed',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#ffffff',
                    'line-width': 2,
                    'line-dasharray': [2, 3],
                    'line-opacity': 0.9,
                },
            });

            // Render initial markers and route after style loads
            addMarkers();
            updateRouteLine();

            // If there are existing waypoints, fly to them
            if (waypointsRef.current.length > 0) {
                setTimeout(() => flyToWaypoints(), 500);
            }
        });

        // Click to add waypoint
        map.on('click', async (e) => {
            const { lng, lat } = e.lngLat;

            // Ripple effect
            const rippleEl = document.createElement("div");
            rippleEl.innerHTML = `<div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(99, 102, 241, 0.4); animation: ping 0.6s ease-out forwards;"></div>`;
            new mapboxgl.Marker({ element: rippleEl }).setLngLat([lng, lat]).addTo(map);
            setTimeout(() => rippleEl.remove(), 600);

            try {
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${config.mapbox.accessToken}`
                );
                const data = await response.json();
                const place = data.features?.[0];

                onWaypointAddRef.current({
                    longitude: lng,
                    latitude: lat,
                    place_name: place?.place_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                    city: place?.context?.find((c: { id: string }) => c.id.startsWith("place"))?.text,
                });
            } catch {
                onWaypointAddRef.current({
                    longitude: lng,
                    latitude: lat,
                    place_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                });
            }
        });

        // Double-click zoom
        map.on('dblclick', (e) => {
            e.preventDefault();
            map.flyTo({
                center: e.lngLat,
                zoom: map.getZoom() + 1.5,
                bearing: map.getBearing() + 15,
                pitch: 65,
                duration: 800,
            });
        });

        mapRef.current = map;

        return () => {
            abortControllerRef.current?.abort();
            clearMarkers();
            map.remove();
            mapRef.current = null;
            isInitializedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update markers and route when waypoints change
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        // Immediately update markers and route
        clearMarkers();

        const wps = waypointsRef.current;
        wps.forEach((wp, index) => {
            const el = createMarkerElement(index);

            const marker = new mapboxgl.Marker({
                element: el,
                anchor: 'bottom',
                draggable: true,
            })
                .setLngLat([wp.longitude, wp.latitude])
                .addTo(map);

            // Create popup for hover
            const popup = new mapboxgl.Popup({
                offset: 25,
                closeButton: false,
                closeOnClick: false,
            }).setHTML(`
                <div class="p-2">
                    <p class="font-semibold text-sm">${escapeHtml(wp.place_name) || 'Waypoint ' + (index + 1)}</p>
                    <p class="text-xs text-gray-500">${wp.latitude.toFixed(5)}, ${wp.longitude.toFixed(5)}</p>
                    <p class="text-xs text-indigo-600 mt-1">Drag to move • Right-click to remove</p>
                </div>
            `);

            el.addEventListener('mouseenter', () => {
                popup.setLngLat([wp.longitude, wp.latitude]).addTo(map);
            });
            el.addEventListener('mouseleave', () => {
                popup.remove();
            });

            marker.on('dragend', () => {
                const lngLat = marker.getLngLat();
                onWaypointUpdateRef.current?.(index, {
                    latitude: lngLat.lat,
                    longitude: lngLat.lng,
                    place_name: wp.place_name,
                });
            });

            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                onWaypointRemoveRef.current?.(index);
            });

            markersRef.current.push(marker);
            popupsRef.current.push(popup);
        });

        // Update route immediately after markers
        updateRouteLine();
    }, [waypoints]); // Depend on full array for immediate updates

    // Animate to show all waypoints when waypoints added OR removed
    useEffect(() => {
        const waypointAdded = waypoints.length > prevWaypointCountRef.current;
        const waypointRemoved = waypoints.length < prevWaypointCountRef.current;
        prevWaypointCountRef.current = waypoints.length;

        if ((waypointAdded || waypointRemoved) && waypoints.length > 0) {
            setTimeout(() => flyToWaypoints(), 150);
        }
    }, [waypoints.length, flyToWaypoints]);

    return (
        <div className="relative">
            <div
                ref={mapContainerRef}
                className={`rounded-xl overflow-hidden shadow-2xl ${className}`}
                style={{ height }}
                aria-label="Interactive waypoint map"
            />

            {/* Click hint only - shown when no waypoints */}
            {waypoints.length === 0 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-black/70 backdrop-blur text-white text-xs px-4 py-2 rounded-full pointer-events-none">
                    🖱️ Click on map to add waypoints
                </div>
            )}

            <style>{`
                @keyframes ping {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(2); opacity: 0; }
                }
                
                .mapboxgl-popup-content {
                    border-radius: 10px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                    padding: 0;
                }
                
                .mapboxgl-ctrl-group {
                    border-radius: 12px !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
                }
            `}</style>
        </div>
    );
});


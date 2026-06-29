import { useEffect, useRef, useCallback, memo } from "react";
import type { FeatureCollection, Feature, GeoJSON, Polygon } from "geojson";
import mapboxgl from "mapbox-gl";
import { config } from "@config/env";
import { escapeHtml } from "@/utils/security";
import { getCachedMultiRoute } from "@services/directionsCache";
import type { GeoPolygon, Marker } from "@/types";

// Set Mapbox token
mapboxgl.accessToken = config.mapbox.accessToken;

/** One ordered, numbered pin on the route (a chosen playlist marker). */
export interface PlaylistPoint {
    lng: number;
    lat: number;
    title?: string;
}

// Light presets for Mapbox Standard (day/dawn/dusk/night).
type LightPreset = "dawn" | "day" | "dusk" | "night";

const FOG_CONFIGS: Record<LightPreset, mapboxgl.FogSpecification> = {
    dawn: { color: "rgb(255, 200, 150)", "high-color": "rgb(255, 160, 100)", "horizon-blend": 0.08, "space-color": "rgb(40, 30, 50)", "star-intensity": 0.2 },
    day: { color: "rgb(220, 235, 255)", "high-color": "rgb(135, 206, 235)", "horizon-blend": 0.05 },
    dusk: { color: "rgb(255, 150, 120)", "high-color": "rgb(180, 100, 150)", "horizon-blend": 0.1, "space-color": "rgb(30, 20, 50)", "star-intensity": 0.4 },
    night: { color: "rgb(10, 20, 40)", "high-color": "rgb(5, 10, 30)", "horizon-blend": 0.12, "space-color": "rgb(0, 5, 15)", "star-intensity": 1.0 },
};

function getTimeBasedPreset(): LightPreset {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 7) return "dawn";
    if (hour >= 7 && hour < 18) return "day";
    if (hour >= 18 && hour < 20) return "dusk";
    return "night";
}

const EXISTING_SRC = "existing-markers";
const EXISTING_LAYER = "existing-markers-pin";
const REGION_SRC = "region-bbox";
const ROUTE_SRC = "route-line";
const PIN_IMAGE = "seekkrr-marker-pin";

/**
 * SeekKrr marker icon: a compact teal disc with a white star, styled to sit next
 * to Mapbox's own POI pins (small, round, flat) rather than a big teardrop.
 */
const PIN_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
    '<circle cx="20" cy="20" r="16" fill="#0d9488" stroke="#ffffff" stroke-width="2.5"/>' +
    '<path transform="translate(8 8.5)" d="M12 2 14.6 8.8 21.8 9.3 16.2 13.9 18 20.9 12 17 6 20.9 7.8 13.9 2.2 9.3 9.4 8.8Z" fill="#ffffff"/>' +
    '</svg>';

interface WaypointMapComponentProps {
    center: { lng: number; lat: number };
    /** Chosen playlist markers, drawn as ordered numbered pins + a connecting route. */
    playlistPoints: PlaylistPoint[];
    /** Approved SeekKrr markers in the region, drawn as clickable pins with labels. */
    existingMarkers?: Marker[];
    /** Ids already in the playlist — hidden from the existing-markers layer. */
    selectedMarkerIds?: string[];
    /** Click an existing marker → add it to the playlist (reuse). */
    onExistingMarkerClick?: (marker: Marker) => void;
    /** Click empty map → propose a NEW marker at [lng, lat] (title from geocode). */
    onMapDropNew?: (lng: number, lat: number, title?: string, address?: string) => void;
    /** Remove the playlist pin at this index (right-click). */
    onPlaylistPointRemove?: (index: number) => void;
    /** Region boundary, drawn dashed (slot-based for Mapbox Standard). */
    regionBbox?: GeoPolygon | null;
    height?: string;
    className?: string;
    focusedLocation?: { lng: number; lat: number } | null;
}

function createMarkerElement(index: number): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "custom-marker";
    el.innerHTML = `
        <div class="relative group">
            <div class="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold shadow-xl border-2 border-white cursor-pointer transform hover:scale-110 transition-all duration-200 hover:shadow-2xl">
                ${index + 1}
            </div>
            <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-primary-700"></div>
        </div>
    `;
    return el;
}

function getPointsCenter(points: PlaylistPoint[]): { lng: number; lat: number } {
    if (points.length === 0) return { lng: 0, lat: 0 };
    const sum = points.reduce((acc, p) => ({ lng: acc.lng + p.lng, lat: acc.lat + p.lat }), { lng: 0, lat: 0 });
    return { lng: sum.lng / points.length, lat: sum.lat / points.length };
}

function emptyFeatureCollection(): FeatureCollection {
    return { type: "FeatureCollection", features: [] };
}

/** Load the pin image once, then run cb (also runs cb if it fails → text-only fallback). */
function ensurePinImage(map: mapboxgl.Map, cb: () => void) {
    if (map.hasImage(PIN_IMAGE)) {
        cb();
        return;
    }
    const img = new Image(40, 40);
    img.onload = () => {
        if (!map.hasImage(PIN_IMAGE)) map.addImage(PIN_IMAGE, img, { pixelRatio: 2 });
        cb();
    };
    img.onerror = () => cb();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(PIN_SVG);
}

export const WaypointMapComponent = memo(function WaypointMapComponent({
    center,
    playlistPoints,
    existingMarkers = [],
    selectedMarkerIds = [],
    onExistingMarkerClick,
    onMapDropNew,
    onPlaylistPointRemove,
    regionBbox = null,
    height = "500px",
    className = "",
    focusedLocation,
}: WaypointMapComponentProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const popupsRef = useRef<mapboxgl.Popup[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);
    const prevPointCountRef = useRef(0);
    const prevRegionBboxRef = useRef<GeoPolygon | null>(null);

    const onExistingMarkerClickRef = useRef(onExistingMarkerClick);
    const onMapDropNewRef = useRef(onMapDropNew);
    const onPlaylistPointRemoveRef = useRef(onPlaylistPointRemove);
    const playlistPointsRef = useRef(playlistPoints);
    const existingMarkersRef = useRef(existingMarkers);
    const selectedMarkerIdsRef = useRef(selectedMarkerIds);
    const regionBboxRef = useRef(regionBbox);

    useEffect(() => {
        onExistingMarkerClickRef.current = onExistingMarkerClick;
        onMapDropNewRef.current = onMapDropNew;
        onPlaylistPointRemoveRef.current = onPlaylistPointRemove;
        playlistPointsRef.current = playlistPoints;
        existingMarkersRef.current = existingMarkers;
        selectedMarkerIdsRef.current = selectedMarkerIds;
        regionBboxRef.current = regionBbox;
    });

    const clearMarkers = useCallback(() => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        popupsRef.current.forEach((p) => p.remove());
        popupsRef.current = [];
    }, []);

    const flyToPoints = useCallback(() => {
        const map = mapRef.current;
        const pts = playlistPointsRef.current;
        if (!map || pts.length === 0) return;
        if (pts.length === 1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const p = pts[0]!;
            map.flyTo({ center: [p.lng, p.lat], zoom: 16, pitch: 55, bearing: -17.6, duration: 1000, essential: true });
            return;
        }
        const c = getPointsCenter(pts);
        const bounds = new mapboxgl.LngLatBounds();
        pts.forEach((p) => bounds.extend([p.lng, p.lat]));
        const ne = bounds.getNorthEast(), sw = bounds.getSouthWest();
        const maxDiff = Math.max(Math.abs(ne.lat - sw.lat), Math.abs(ne.lng - sw.lng));
        let zoom = 16;
        if (maxDiff > 0.01) zoom = 15;
        if (maxDiff > 0.05) zoom = 13;
        map.flyTo({ center: [c.lng, c.lat], zoom, pitch: 55, bearing: -17.6, duration: 1200, essential: true });
    }, []);

    // Fit the camera to a region's bbox (used when the region CHANGES, e.g.
    // expand-to-city) so its full new boundary is visible, framing markers too.
    const fitRegionBounds = useCallback((polygon: GeoPolygon) => {
        const map = mapRef.current;
        const ring = polygon?.coordinates?.[0];
        if (!map || !ring || ring.length === 0) return;
        const bounds = new mapboxgl.LngLatBounds();
        ring.forEach((c) => bounds.extend(c as [number, number]));
        playlistPointsRef.current.forEach((p) => bounds.extend([p.lng, p.lat]));
        map.fitBounds(bounds, { padding: 64, pitch: 45, duration: 1000, essential: true });
    }, []);

    // ─── Existing markers (pin + label) ──────────────────────────────────────
    const buildExistingFeatures = useCallback((): FeatureCollection => {
        const selected = new Set(selectedMarkerIdsRef.current);
        const features: Feature[] = existingMarkersRef.current
            .filter((m) => m.location?.coordinates && !selected.has(m.id))
            .map((m) => ({
                type: "Feature",
                geometry: { type: "Point", coordinates: m.location.coordinates },
                properties: { id: m.id, title: m.title ?? "Marker" },
            }));
        return { type: "FeatureCollection", features };
    }, []);

    const refreshExistingMarkers = useCallback(() => {
        const src = mapRef.current?.getSource(EXISTING_SRC) as mapboxgl.GeoJSONSource | undefined;
        if (src) src.setData(buildExistingFeatures());
    }, [buildExistingFeatures]);

    // ─── Region bbox (dashed, slot-based) ────────────────────────────────────
    const drawRegionBbox = useCallback((polygon: GeoPolygon | null) => {
        const map = mapRef.current;
        if (!map) return;
        const data: GeoJSON = polygon
            ? ({ type: "Feature", geometry: polygon as Polygon, properties: {} } as Feature)
            : emptyFeatureCollection();
        const src = map.getSource(REGION_SRC) as mapboxgl.GeoJSONSource | undefined;
        if (src) {
            src.setData(data);
        } else {
            map.addSource(REGION_SRC, { type: "geojson", data });
            map.addLayer({ id: "region-bbox-fill", type: "fill", slot: "middle", source: REGION_SRC, paint: { "fill-color": "#1f6f6a", "fill-opacity": 0.05 } });
            map.addLayer({ id: "region-bbox-line", type: "line", slot: "top", source: REGION_SRC, paint: { "line-color": "#0d524e", "line-width": 2, "line-opacity": 0.7, "line-dasharray": [2, 1.5] } });
        }
    }, []);

    // ─── Route line connecting the ordered playlist points (cached, road-following) ──
    const updateRouteLine = useCallback(async () => {
        const map = mapRef.current;
        const src = map?.getSource(ROUTE_SRC) as mapboxgl.GeoJSONSource | undefined;
        if (!map || !src) return;
        const pts = playlistPointsRef.current;
        if (pts.length < 2) {
            src.setData(emptyFeatureCollection());
            return;
        }
        const coords: [number, number][] = pts.map((p) => [p.lng, p.lat]);
        abortControllerRef.current?.abort();
        const ctrl = new AbortController();
        abortControllerRef.current = ctrl;
        let line: [number, number][] = coords; // straight fallback (instant)
        try {
            const routed = await getCachedMultiRoute(coords, ctrl.signal);
            if (routed && routed.length > 1) line = routed;
        } catch {
            /* keep straight fallback */
        }
        // Guard against a stale async result after the points changed again.
        if (abortControllerRef.current !== ctrl) return;
        const stillThere = map.getSource(ROUTE_SRC) as mapboxgl.GeoJSONSource | undefined;
        stillThere?.setData({ type: "Feature", geometry: { type: "LineString", coordinates: line }, properties: {} } as Feature);
    }, []);

    const renderPlaylistPins = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        clearMarkers();
        playlistPointsRef.current.forEach((p, index) => {
            const el = createMarkerElement(index);
            const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map);
            const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: false }).setHTML(`
                <div class="p-2">
                    <p class="font-semibold text-sm">${escapeHtml(p.title ?? "") || "Marker " + (index + 1)}</p>
                    <p class="text-xs text-primary-600 mt-1">Right-click to remove</p>
                </div>`);
            el.addEventListener("mouseenter", () => popup.setLngLat([p.lng, p.lat]).addTo(map));
            el.addEventListener("mouseleave", () => popup.remove());
            el.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                onPlaylistPointRemoveRef.current?.(index);
            });
            markersRef.current.push(marker);
            popupsRef.current.push(popup);
        });
    }, [clearMarkers]);

    // ─── Init (lazy: only when scrolled into view) ───────────────────────────
    useEffect(() => {
        const container = mapContainerRef.current;
        if (!container || mapRef.current) return;

        const initMap = () => {
            if (mapRef.current) return;
            const lightPreset = getTimeBasedPreset();

            const map = new mapboxgl.Map({
                container,
                style: config.mapbox.style,
                center: [center.lng, center.lat],
                zoom: 13,
                pitch: 55,
                bearing: -17.6,
                antialias: true,
                maxPitch: 85,
                fadeDuration: 0,
                config: {
                    basemap: {
                        lightPreset,
                        // Mapbox Standard's native POI icons + labels (Google-Maps-
                        // like): every POI is named, icon-based and collision-managed,
                        // so nothing overlaps or shows a blank tooltip. We rely on
                        // these alone — no custom dot overlay, which only duplicated
                        // these labels and rendered unnamed dots.
                        showPointOfInterestLabels: true,
                        showTransitLabels: true,
                        showPlaceLabels: true,
                        showRoadLabels: true,
                    },
                },
            });

            map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true, showCompass: true, showZoom: true }), "top-right");
            map.addControl(new mapboxgl.FullscreenControl(), "top-right");
            map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true }), "top-right");
            map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-left");

            map.on("style.load", () => {
                // Light-preset sky/atmosphere (no heavy terrain DEM — flat city zoom).
                map.setFog(FOG_CONFIGS[lightPreset]);

                // Quest route: a DOTTED line + direction arrows so it reads as a
                // walking path (not a road) and its direction (stop 1 → 2 → …) is
                // obvious. A faint solid underlay keeps it visible over busy areas.
                map.addSource(ROUTE_SRC, { type: "geojson", data: emptyFeatureCollection() });
                map.addLayer({
                    id: "route-line-underlay",
                    type: "line",
                    slot: "middle",
                    source: ROUTE_SRC,
                    layout: { "line-cap": "round", "line-join": "round" },
                    paint: { "line-color": "#a3cecb", "line-width": 6, "line-opacity": 0.4 },
                });
                map.addLayer({
                    id: "route-line-core",
                    type: "line",
                    slot: "middle",
                    source: ROUTE_SRC,
                    layout: { "line-cap": "round", "line-join": "round" },
                    paint: { "line-color": "#084340", "line-width": 4, "line-dasharray": [0, 2] },
                });
                map.addLayer({
                    id: "route-arrows",
                    type: "symbol",
                    slot: "top",
                    source: ROUTE_SRC,
                    layout: {
                        "symbol-placement": "line",
                        "symbol-spacing": 60,
                        "text-field": "▶",
                        "text-size": 13,
                        "text-keep-upright": false,
                        "text-rotation-alignment": "map",
                        "text-allow-overlap": true,
                        "text-ignore-placement": true,
                    },
                    paint: { "text-color": "#084340", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
                });

                // Existing SeekKrr markers as proper pins + labels.
                map.addSource(EXISTING_SRC, { type: "geojson", data: buildExistingFeatures() });
                ensurePinImage(map, () => {
                    if (map.getLayer(EXISTING_LAYER)) return;
                    map.addLayer({
                        id: EXISTING_LAYER,
                        type: "symbol",
                        slot: "top",
                        source: EXISTING_SRC,
                        layout: {
                            "icon-image": PIN_IMAGE,
                            // Round disc sits centered on the point (like Mapbox POIs),
                            // with the label tucked just beneath it.
                            "icon-anchor": "center",
                            "icon-size": 0.5,
                            "icon-allow-overlap": true,
                            "text-field": ["get", "title"],
                            "text-size": 11,
                            "text-offset": [0, 1.2],
                            "text-anchor": "top",
                            // Always show the SeekKrr marker name with its pin (these
                            // are the important ones — they sit above basemap labels).
                            "text-allow-overlap": true,
                            "text-ignore-placement": true,
                            "symbol-z-order": "source",
                        },
                        paint: {
                            // Bright teal reads cleanly on the (often dark) basemap, so
                            // the label needs only a faint dark shadow — like Mapbox's
                            // own POI labels — instead of a white halo box.
                            "text-color": "#5eead4",
                            "text-halo-color": "rgba(15, 23, 42, 0.65)",
                            "text-halo-width": 1,
                            "text-halo-blur": 0.5,
                        },
                    });
                    map.on("click", EXISTING_LAYER, (e) => {
                        const id = e.features?.[0]?.properties?.id as string | undefined;
                        if (!id) return;
                        const marker = existingMarkersRef.current.find((m) => m.id === id);
                        if (marker) {
                            e.preventDefault();
                            onExistingMarkerClickRef.current?.(marker);
                        }
                    });
                    map.on("mouseenter", EXISTING_LAYER, () => { map.getCanvas().style.cursor = "pointer"; });
                    map.on("mouseleave", EXISTING_LAYER, () => { map.getCanvas().style.cursor = ""; });
                });

                drawRegionBbox(regionBboxRef.current);
                renderPlaylistPins();
                updateRouteLine();
                if (playlistPointsRef.current.length > 0) setTimeout(() => flyToPoints(), 400);
            });

            // Click empty map → propose a NEW marker (reverse-geocode a title).
            map.on("click", async (e) => {
                if (e.defaultPrevented) return;
                const hits = map.getLayer(EXISTING_LAYER)
                    ? map.queryRenderedFeatures(e.point, { layers: [EXISTING_LAYER] })
                    : [];
                if (hits.length > 0) return;
                const { lng, lat } = e.lngLat;
                const ripple = document.createElement("div");
                ripple.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:rgba(31,111,106,0.4);animation:ping 0.6s ease-out forwards"></div>`;
                new mapboxgl.Marker({ element: ripple }).setLngLat([lng, lat]).addTo(map);
                setTimeout(() => ripple.remove(), 600);
                try {
                    const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${config.mapbox.accessToken}`);
                    const data = await r.json();
                    const place = data.features?.[0];
                    onMapDropNewRef.current?.(lng, lat, place?.text ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`, place?.place_name);
                } catch {
                    onMapDropNewRef.current?.(lng, lat, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                }
            });

            map.on("dblclick", (e) => {
                e.preventDefault();
                map.flyTo({ center: e.lngLat, zoom: map.getZoom() + 1.5, bearing: map.getBearing() + 15, pitch: 55, duration: 800 });
            });

            mapRef.current = map;
        };

        let observer: IntersectionObserver | null = null;
        if (typeof IntersectionObserver !== "undefined") {
            observer = new IntersectionObserver(
                (entries) => {
                    if (entries.some((en) => en.isIntersecting)) {
                        observer?.disconnect();
                        initMap();
                    }
                },
                { rootMargin: "200px" }
            );
            observer.observe(container);
        } else {
            initMap();
        }

        return () => {
            observer?.disconnect();
            abortControllerRef.current?.abort();
            clearMarkers();
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Rebuild numbered pins + route when the playlist changes.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;
        renderPlaylistPins();
        updateRouteLine();
    }, [playlistPoints, renderPlaylistPins, updateRouteLine]);

    // Refresh existing-markers when data / selection changes.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;
        refreshExistingMarkers();
    }, [existingMarkers, selectedMarkerIds, refreshExistingMarkers]);

    // Redraw the region boundary when it changes, and on a REAL change (e.g.
    // expand-to-city) fit the camera to the new bounds so the boundary is visible
    // — otherwise the bigger boundary stays off-screen past the framed markers.
    useEffect(() => {
        const prev = prevRegionBboxRef.current;
        prevRegionBboxRef.current = regionBbox;
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;
        drawRegionBbox(regionBbox);
        // Skip the initial set (load already frames the markers); reframe only
        // when the region actually switched to a different bbox.
        if (prev !== null && prev !== regionBbox && regionBbox) {
            fitRegionBounds(regionBbox);
        }
    }, [regionBbox, drawRegionBbox, fitRegionBounds]);

    // Frame the playlist when points are added/removed.
    useEffect(() => {
        const added = playlistPoints.length > prevPointCountRef.current;
        const removed = playlistPoints.length < prevPointCountRef.current;
        prevPointCountRef.current = playlistPoints.length;
        if ((added || removed) && playlistPoints.length > 0 && !focusedLocation) {
            setTimeout(() => flyToPoints(), 150);
        }
    }, [playlistPoints, flyToPoints, focusedLocation]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !focusedLocation) return;
        map.flyTo({ center: [focusedLocation.lng, focusedLocation.lat], zoom: 16, pitch: 55, bearing: -17.6, duration: 1000, essential: true });
    }, [focusedLocation]);

    return (
        <div className="relative">
            <div
                ref={mapContainerRef}
                className={`rounded-xl overflow-hidden shadow-2xl ${className}`}
                style={{ height }}
                aria-label="Interactive marker map"
            />
            {playlistPoints.length === 0 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-black/70 backdrop-blur text-white text-xs px-4 py-2 rounded-full pointer-events-none">
                    🖱️ Click a teal pin to reuse it, or click the map to add a new one
                </div>
            )}
            <style>{`
                @keyframes ping { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
                .mapboxgl-popup-content { border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); padding: 0; }
                .mapboxgl-ctrl-group { border-radius: 12px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
            `}</style>
        </div>
    );
});

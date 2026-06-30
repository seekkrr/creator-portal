import mapboxgl from "mapbox-gl";
import type { ExpressionSpecification, FilterSpecification, Map } from "mapbox-gl";

/**
 * Shared POI overlay for the Mapbox Standard 3D style.
 *
 * The Standard basemap only surfaces a small, curated set of POI labels. To make
 * the quest-builder map as feature-rich as it used to be, we render the full
 * `poi_label` layer from the `mapbox-streets-v8` vector tileset — but as compact
 * colored PINS (dots) rather than a sea of overlapping text. Each pin reveals its
 * name on hover, which keeps the map readable while still showing every POI.
 */

// Color each pin by its POI class so categories are scannable at a glance.
const POI_CLASS_CIRCLE_COLOR: ExpressionSpecification = [
    'match', ['get', 'class'],
    ['restaurant', 'cafe', 'food_and_drink'], '#f97316',
    ['fuel'], '#eab308',
    ['place_of_worship'], '#a855f7',
    ['hospital', 'pharmacy'], '#ef4444',
    ['hotel', 'lodging'], '#3b82f6',
    ['shop', 'grocery'], '#10b981',
    ['bank'], '#0ea5e9',
    ['school', 'college'], '#1f6f6a',
    ['park'], '#22c55e',
    ['monument', 'museum', 'attraction', 'landmark'], '#ec4899',
    '#64748b',
];

const POI_DOTS_LAYER = 'poi-overlay-dots';

// The Standard basemap already labels prominent POIs (filterrank 0–1) with their
// own icons. We only add dots for the LONG TAIL it skips (filterrank >= 2), so
// the two layers complement each other — nothing excluded, nothing doubled.
const POI_DEDUP_FILTER: FilterSpecification = ['>=', ['get', 'filterrank'], 2];

/**
 * Add the POI overlay source + pin layer to a Mapbox map, plus a hover popup
 * that shows each POI's name. Must be called inside a `style.load` handler.
 *
 * @param map The Mapbox GL JS map instance
 */
export function addPoiOverlayLayers(map: Map): void {
    if (!map.getSource('poi-streets')) {
        map.addSource('poi-streets', {
            type: 'vector',
            url: 'mapbox://mapbox.mapbox-streets-v8',
        });
    }

    if (!map.getLayer(POI_DOTS_LAYER)) {
        // Dots for every long-tail POI (Standard shows the prominent ones itself).
        // Circles don't collide, so the full set stays visible once zoomed in.
        map.addLayer({
            id: POI_DOTS_LAYER,
            type: 'circle',
            source: 'poi-streets',
            'source-layer': 'poi_label',
            slot: 'top',
            minzoom: 13,
            filter: POI_DEDUP_FILTER,
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 3, 16, 5, 18, 7],
                'circle-color': POI_CLASS_CIRCLE_COLOR,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 1.5,
                'circle-opacity': 0.95,
                'circle-stroke-opacity': 0.95,
            },
        });
    }

    // Name-on-hover popup keeps the map a field of readable pins, not text spam.
    const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: 'poi-hover-popup',
    });

    map.on('mouseenter', POI_DOTS_LAYER, (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const rawName = feature.properties?.name;
        if (!rawName) return;
        const name = String(rawName).replace(/[<>&]/g, '');
        popup
            .setLngLat(feature.geometry.coordinates as [number, number])
            .setHTML(`<div class="px-2 py-1 text-xs font-medium text-neutral-800">${name}</div>`)
            .addTo(map);
    });

    map.on('mouseleave', POI_DOTS_LAYER, () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
    });
}

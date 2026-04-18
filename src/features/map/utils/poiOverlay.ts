import type { FilterSpecification, ExpressionSpecification, Map } from "mapbox-gl";

/**
 * Shared POI overlay layer configuration for Mapbox Standard 3D style.
 * Uses mapbox-streets-v8 vector tileset to render additional POI annotations
 * on top of the Standard style's native POIs.
 *
 * filterrank >= 2 ensures we only render POIs that Standard skips (deduplication).
 */

const POI_CATEGORY_FILTER: FilterSpecification = [
    'all',
    ['>=', ['get', 'filterrank'], 2],
    ['match', ['get', 'class'],
        [
            'restaurant', 'cafe', 'food_and_drink',
            'fuel',
            'place_of_worship',
            'hospital', 'pharmacy',
            'hotel', 'lodging',
            'shop', 'grocery',
            'bank',
            'school', 'college',
            'park', 'monument', 'museum',
        ],
        true,
        false,
    ],
];

const POI_CLASS_CIRCLE_COLOR: ExpressionSpecification = [
    'match', ['get', 'class'],
    ['restaurant', 'cafe', 'food_and_drink'], '#f97316',
    ['fuel'], '#eab308',
    ['place_of_worship'], '#a855f7',
    ['hospital', 'pharmacy'], '#ef4444',
    ['hotel', 'lodging'], '#3b82f6',
    ['shop', 'grocery'], '#10b981',
    ['bank'], '#0ea5e9',
    ['school', 'college'], '#6366f1',
    ['park'], '#22c55e',
    ['monument', 'museum'], '#ec4899',
    '#94a3b8',
];

const POI_CLASS_TEXT_COLOR: ExpressionSpecification = [
    'match', ['get', 'class'],
    ['restaurant', 'cafe', 'food_and_drink'], '#fb923c',
    ['fuel'], '#facc15',
    ['place_of_worship'], '#c084fc',
    ['hospital', 'pharmacy'], '#f87171',
    ['hotel', 'lodging'], '#60a5fa',
    ['shop', 'grocery'], '#34d399',
    ['bank'], '#38bdf8',
    ['school', 'college'], '#818cf8',
    ['park'], '#4ade80',
    ['monument', 'museum'], '#f472b6',
    '#cbd5e1',
];

/**
 * Add the POI overlay source and layers to a Mapbox map.
 * Must be called inside a `style.load` handler.
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

    map.addLayer({
        id: 'poi-overlay-dots',
        type: 'circle',
        source: 'poi-streets',
        'source-layer': 'poi_label',
        slot: 'top',
        minzoom: 14,
        filter: POI_CATEGORY_FILTER,
        paint: {
            'circle-radius': 4,
            'circle-color': POI_CLASS_CIRCLE_COLOR,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.5,
            'circle-opacity': 0.9,
        },
    });

    map.addLayer({
        id: 'poi-overlay',
        type: 'symbol',
        source: 'poi-streets',
        'source-layer': 'poi_label',
        slot: 'top',
        minzoom: 14,
        filter: POI_CATEGORY_FILTER,
        layout: {
            'text-field': ['get', 'name'],
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-size': 11,
            'text-offset': [0, 1.0],
            'text-anchor': 'top',
            'text-optional': true,
            'text-allow-overlap': false,
        },
        paint: {
            'text-color': POI_CLASS_TEXT_COLOR,
            'text-halo-color': 'rgba(0, 0, 0, 0.75)',
            'text-halo-width': 1.5,
            'text-halo-blur': 0.5,
        },
    });
}

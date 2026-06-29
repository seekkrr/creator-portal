/**
 * Small geo helpers shared by the quest builder.
 *
 * Coordinate order discipline: every helper here takes/returns [lng, lat] to
 * match V2 GeoPoint / Marker.location / Mapbox conventions.
 */

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two [lng, lat] points, in metres.
 * Accurate enough for the ~20m near-duplicate check (mirrors the backend dedupe).
 */
export function haversineMeters(a: [number, number], b: [number, number]): number {
    const [lng1, lat1] = a;
    const [lng2, lat2] = b;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const lat1r = toRad(lat1);
    const lat2r = toRad(lat2);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1r) * Math.cos(lat2r) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * True when point [lng, lat] lies inside the (axis-aligned) bounding box of a
 * GeoJSON polygon ring. The V2 region bbox is a rectangle, so a min/max test on
 * the outer ring is exact; for any non-rectangular ring this is the bbox
 * approximation (intentionally lenient — it only drives a soft "expand region"
 * banner, never a hard block).
 */
export function pointInBboxRing(
    point: [number, number],
    ring: number[][] | undefined | null
): boolean {
    if (!ring || ring.length === 0) return false;
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const c of ring) {
        const lng = c[0];
        const lat = c[1];
        if (lng == null || lat == null) continue;
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
    }
    const [lng, lat] = point;
    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

/** Min/max lon/lat of a GeoJSON polygon's outer ring, for a marker bbox query. */
export function bboxBounds(ring: number[][] | undefined | null): {
    min_lon: number;
    min_lat: number;
    max_lon: number;
    max_lat: number;
} | null {
    if (!ring || ring.length === 0) return null;
    let min_lon = Infinity;
    let min_lat = Infinity;
    let max_lon = -Infinity;
    let max_lat = -Infinity;
    for (const c of ring) {
        const lng = c[0];
        const lat = c[1];
        if (lng == null || lat == null) continue;
        if (lng < min_lon) min_lon = lng;
        if (lat < min_lat) min_lat = lat;
        if (lng > max_lon) max_lon = lng;
        if (lat > max_lat) max_lat = lat;
    }
    if (!isFinite(min_lon) || !isFinite(min_lat)) return null;
    return { min_lon, min_lat, max_lon, max_lat };
}

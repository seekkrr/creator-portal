import { config } from "@config/env";

/**
 * Cached route data from Mapbox Directions API.
 */
export interface CachedRoute {
  coordinates: [number, number][];
  distance: number;  // meters
  duration: number;  // seconds
  fetchedAt: number; // timestamp ms
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const STORAGE_PREFIX = "seekkrr_dir:";

// In-memory cache for instant access (no serialization cost)
const memoryCache = new Map<string, CachedRoute>();

/**
 * Generate a deterministic cache key from two coordinate pairs.
 * Rounds to 5 decimal places (~1.1m precision) for deduplication.
 */
function makeCacheKey(from: [number, number], to: [number, number]): string {
  const f = `${from[0].toFixed(5)},${from[1].toFixed(5)}`;
  const t = `${to[0].toFixed(5)},${to[1].toFixed(5)}`;
  return `${STORAGE_PREFIX}${f};${t}`;
}

/**
 * Check if a cached route is still valid.
 */
function isValid(entry: CachedRoute): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

/**
 * Try to read from sessionStorage.
 */
function readFromStorage(key: string): CachedRoute | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRoute;
    if (isValid(parsed)) return parsed;
    // Expired — clean up
    sessionStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

/**
 * Write to both cache layers.
 */
function writeToCache(key: string, entry: CachedRoute): void {
  memoryCache.set(key, entry);
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage full — memory cache still works
  }
}

/**
 * Fetch walking directions between two coordinates, with dual-layer caching.
 *
 * @param from [longitude, latitude] of the origin
 * @param to   [longitude, latitude] of the destination
 * @param signal Optional AbortSignal for cancellation
 * @returns CachedRoute or null if the API call fails
 */
export async function getCachedDirections(
  from: [number, number],
  to: [number, number],
  signal?: AbortSignal
): Promise<CachedRoute | null> {
  const key = makeCacheKey(from, to);

  // Layer 1: In-memory
  const memEntry = memoryCache.get(key);
  if (memEntry && isValid(memEntry)) return memEntry;

  // Layer 2: sessionStorage
  const storageEntry = readFromStorage(key);
  if (storageEntry) {
    memoryCache.set(key, storageEntry); // Promote to memory
    return storageEntry;
  }

  // Layer 3: Mapbox Directions API
  try {
    const coordString = `${from[0]},${from[1]};${to[0]},${to[1]}`;
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/walking/${coordString}?geometries=geojson&overview=full&access_token=${config.mapbox.accessToken}`,
      { signal }
    );
    if (!response.ok) return null;

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route?.geometry?.coordinates) return null;

    const entry: CachedRoute = {
      coordinates: route.geometry.coordinates,
      distance: route.distance ?? 0,
      duration: route.duration ?? 0,
      fetchedAt: Date.now(),
    };

    writeToCache(key, entry);
    return entry;
  } catch {
    return null;
  }
}

/**
 * Fetch a full multi-waypoint route by fetching each segment independently.
 * Each segment is cached individually for reuse.
 *
 * @param waypoints Array of [longitude, latitude] coordinates (minimum 2)
 * @param signal Optional AbortSignal
 * @returns Concatenated route coordinates, or null on failure
 */
export async function getCachedMultiRoute(
  waypoints: [number, number][],
  signal?: AbortSignal
): Promise<[number, number][] | null> {
  if (waypoints.length < 2) return null;

  const segmentPromises: Promise<CachedRoute | null>[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    segmentPromises.push(getCachedDirections(waypoints[i]!, waypoints[i + 1]!, signal));
  }

  const segments = await Promise.all(segmentPromises);

  // Concatenate all segment coordinates, removing duplicate junction points
  const allCoords: [number, number][] = [];
  for (const segment of segments) {
    if (!segment) return null; // If any segment fails, return null
    if (allCoords.length > 0) {
      // Skip the first point of subsequent segments (it's the same as the last point of the previous)
      allCoords.push(...segment.coordinates.slice(1));
    } else {
      allCoords.push(...segment.coordinates);
    }
  }

  return allCoords;
}

import { useState, useRef, useEffect, useCallback, type ChangeEvent } from "react";
import { Search, X, MapPin, Navigation } from "lucide-react";
import { config } from "@config/env";
import type { QuestLocation } from "@/types";

// ─── Search Box API Types ───────────────────────────────────────────────────

interface SearchBoxSuggestion {
    name: string;
    name_preferred?: string;
    mapbox_id: string;
    feature_type: string;
    address?: string;
    full_address?: string;
    place_formatted?: string;
    context?: {
        country?: { name?: string; country_code?: string };
        region?: { name?: string };
        place?: { name?: string };
        district?: { name?: string };
        locality?: { name?: string };
        neighborhood?: { name?: string };
    };
    maki?: string;
    poi_category?: string[];
    distance?: number; // meters from proximity point
}

interface SearchBoxSuggestResponse {
    suggestions: SearchBoxSuggestion[];
    attribution: string;
}

interface SearchBoxRetrieveResponse {
    type: "FeatureCollection";
    features: Array<{
        type: "Feature";
        geometry: {
            type: "Point";
            coordinates: [number, number]; // [lng, lat]
        };
        properties: {
            name: string;
            name_preferred?: string;
            mapbox_id: string;
            feature_type: string;
            full_address?: string;
            place_formatted?: string;
            context?: {
                country?: { name?: string };
                region?: { name?: string };
                place?: { name?: string };
            };
        };
    }>;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface LocationSearchProps {
    onSelect: (location: QuestLocation) => void;
    placeholder?: string;
    defaultValue?: string;
    /** Bias results toward this coordinate (lng, lat). Strongly recommended. */
    proximity?: { lng: number; lat: number };
    /** ISO 3166 country codes to restrict results. Defaults to ["in"]. */
    country?: string[];
}

/**
 * Generate a UUIDv4 session token for Search Box API billing sessions.
 * A session groups /suggest + /retrieve calls into a single billable event.
 */
function generateSessionToken(): string {
    return crypto.randomUUID();
}

export function LocationSearch({
    onSelect,
    placeholder = "Search for a location...",
    defaultValue = "",
    proximity,
    country = ["in"],
}: LocationSearchProps) {
    const [query, setQuery] = useState(defaultValue);
    const [suggestions, setSuggestions] = useState<SearchBoxSuggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRetrieving, setIsRetrieving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const sessionTokenRef = useRef(generateSessionToken());

    // ─── Suggest ────────────────────────────────────────────────────────

    const fetchSuggestions = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                q: searchQuery,
                access_token: config.mapbox.accessToken,
                session_token: sessionTokenRef.current,
                language: "en",
                limit: "7",
                types: "place,locality,neighborhood,address,poi,street",
            });

            if (proximity) {
                params.set("proximity", `${proximity.lng},${proximity.lat}`);
            }
            if (country.length > 0) {
                params.set("country", country.join(","));
            }

            const response = await fetch(
                `https://api.mapbox.com/search/searchbox/v1/suggest?${params.toString()}`
            );
            const data: SearchBoxSuggestResponse = await response.json();
            setSuggestions(data.suggestions ?? []);
            setIsOpen(true);
        } catch {
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, [proximity, country]);

    // ─── Retrieve ───────────────────────────────────────────────────────

    const retrieveFeature = useCallback(async (suggestion: SearchBoxSuggestion) => {
        setIsRetrieving(true);
        try {
            const params = new URLSearchParams({
                access_token: config.mapbox.accessToken,
                session_token: sessionTokenRef.current,
            });

            const response = await fetch(
                `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?${params.toString()}`
            );
            const data: SearchBoxRetrieveResponse = await response.json();
            const feature = data.features?.[0];

            if (feature) {
                const [lng, lat] = feature.geometry.coordinates;
                const props = feature.properties;

                const location: QuestLocation = {
                    longitude: lng,
                    latitude: lat,
                    place_name: props.full_address || props.name || suggestion.name,
                    address: suggestion.address,
                    city: props.context?.place?.name || suggestion.context?.place?.name,
                    region: props.context?.region?.name || suggestion.context?.region?.name,
                    country: props.context?.country?.name || suggestion.context?.country?.name,
                };

                setQuery(suggestion.name);
                setIsOpen(false);
                onSelect(location);

                // Start a new session for the next search
                sessionTokenRef.current = generateSessionToken();
            }
        } catch {
            // Fallback: use suggestion data directly (no coordinates, but better than nothing)
            console.error("Failed to retrieve feature details");
        } finally {
            setIsRetrieving(false);
        }
    }, [onSelect]);

    // ─── Handlers ───────────────────────────────────────────────────────

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            fetchSuggestions(value);
        }, 300);
    };

    const handleSelect = (suggestion: SearchBoxSuggestion) => {
        retrieveFeature(suggestion);
    };

    const clearSearch = () => {
        setQuery("");
        setSuggestions([]);
        setIsOpen(false);
        inputRef.current?.focus();
        // Reset session on clear
        sessionTokenRef.current = generateSessionToken();
    };

    // Format distance for display
    const formatDistance = (meters?: number) => {
        if (!meters) return null;
        if (meters < 1000) return `${Math.round(meters)}m`;
        return `${(meters / 1000).toFixed(1)}km`;
    };

    // Get display icon class based on maki icon name
    const getMakiIcon = (maki?: string) => {
        if (!maki) return null;
        // Return a simple category label instead of actual maki icons
        const categoryMap: Record<string, string> = {
            restaurant: "🍽️",
            cafe: "☕",
            fuel: "⛽",
            "religious-christian": "⛪",
            "religious-muslim": "🕌",
            "religious-jewish": "🕍",
            hospital: "🏥",
            park: "🌳",
            hotel: "🏨",
            school: "🏫",
            bank: "🏦",
            shop: "🛍️",
            museum: "🏛️",
            monument: "🗿",
            "swimming-pool": "🏊",
            cinema: "🎬",
            library: "📚",
            pharmacy: "💊",
            marker: "📍",
        };
        return categoryMap[maki] || "📍";
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !inputRef.current?.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Cleanup debounce timer
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return (
        <div className="relative w-full">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => suggestions.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    disabled={isRetrieving}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-colors disabled:opacity-60"
                    aria-label="Search location"
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                />
                {query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600"
                        aria-label="Clear search"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Retrieving indicator */}
            {isRetrieving && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-indigo-600">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Loading location details...</span>
                    </div>
                </div>
            )}

            {/* Results dropdown */}
            {isOpen && !isRetrieving && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
                    role="listbox"
                >
                    {isLoading ? (
                        <div className="p-4 text-center text-neutral-500">
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                                <span>Searching...</span>
                            </div>
                        </div>
                    ) : suggestions.length > 0 ? (
                        suggestions.map((suggestion) => (
                            <button
                                key={suggestion.mapbox_id}
                                onClick={() => handleSelect(suggestion)}
                                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none transition-colors border-b border-neutral-50 last:border-b-0"
                                role="option"
                            >
                                {/* Icon */}
                                <div className="flex-shrink-0 mt-0.5">
                                    {suggestion.feature_type === "poi" && suggestion.maki ? (
                                        <span className="text-lg" role="img" aria-label={suggestion.maki}>
                                            {getMakiIcon(suggestion.maki)}
                                        </span>
                                    ) : (
                                        <MapPin className="w-5 h-5 text-indigo-600" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-neutral-900 block truncate">
                                        {suggestion.name_preferred || suggestion.name}
                                    </span>
                                    {suggestion.place_formatted && (
                                        <span className="text-xs text-neutral-500 block truncate mt-0.5">
                                            {suggestion.place_formatted}
                                        </span>
                                    )}
                                    {/* POI category badges */}
                                    {suggestion.poi_category && suggestion.poi_category.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {suggestion.poi_category.slice(0, 3).map((cat) => (
                                                <span
                                                    key={cat}
                                                    className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-medium rounded-full capitalize"
                                                >
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Distance badge */}
                                {suggestion.distance != null && (
                                    <div className="flex items-center gap-1 text-xs text-neutral-400 flex-shrink-0 mt-0.5">
                                        <Navigation className="w-3 h-3" />
                                        <span>{formatDistance(suggestion.distance)}</span>
                                    </div>
                                )}
                            </button>
                        ))
                    ) : query.length >= 2 ? (
                        <div className="p-4 text-center text-neutral-500">No results found</div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

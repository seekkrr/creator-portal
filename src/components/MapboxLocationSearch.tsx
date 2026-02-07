import { useState, useCallback, useRef, useEffect } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import { config } from "@config/env";

export interface MapboxFeature {
    id: string;
    place_name: string;
    center: [number, number];
    context?: Array<{
        id: string;
        text: string;
    }>;
    properties?: {
        address?: string;
    };
}

interface MapboxGeocodingResponse {
    type: string;
    features: MapboxFeature[];
}

export interface SelectedLocation {
    latitude: number;
    longitude: number;
    place_name: string;
    address?: string;
    city?: string;
    region?: string;
    country?: string;
}

interface MapboxLocationSearchProps {
    label?: string;
    placeholder?: string;
    value?: SelectedLocation | null;
    onChange: (location: SelectedLocation | null) => void;
    error?: string;
    highlightOnFocus?: boolean;
}

export function MapboxLocationSearch({
    label = "Location, City, Pincode etc.",
    placeholder = "Search for a location...",
    value,
    onChange,
    error,
    highlightOnFocus = true,
}: MapboxLocationSearchProps) {
    const [query, setQuery] = useState(value?.place_name ?? "");
    const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasValue = query.length > 0;
    const isActive = isFocused || hasValue;

    const searchLocations = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                searchQuery
            )}.json?access_token=${config.mapbox.accessToken}&limit=5&types=postcode,place,locality,neighborhood,address,poi`;

            const response = await fetch(url);
            if (!response.ok) throw new Error("Geocoding failed");

            const data: MapboxGeocodingResponse = await response.json();
            setSuggestions(data.features);
            setShowDropdown(data.features.length > 0);
        } catch (err) {
            console.error("Mapbox geocoding error:", err);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value;
        setQuery(newQuery);
        if (value) onChange(null);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchLocations(newQuery), 300);
    };

    const handleSelect = (feature: MapboxFeature) => {
        const [longitude, latitude] = feature.center;
        let city = "";
        let region = "";
        let country = "";

        feature.context?.forEach((ctx) => {
            if (ctx.id.startsWith("place")) city = ctx.text;
            if (ctx.id.startsWith("region")) region = ctx.text;
            if (ctx.id.startsWith("country")) country = ctx.text;
        });

        const location: SelectedLocation = {
            latitude,
            longitude,
            place_name: feature.place_name,
            address: feature.properties?.address,
            city: city || feature.place_name.split(",")[0],
            region,
            country,
        };

        setQuery(feature.place_name);
        setSuggestions([]);
        setShowDropdown(false);
        onChange(location);
    };

    const handleClear = () => {
        setQuery("");
        setSuggestions([]);
        onChange(null);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
                setIsFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative w-full">
            <div
                className={`
                    relative rounded-xl border transition-all duration-200 bg-white
                    ${highlightOnFocus && isFocused
                        ? "border-slate-900 shadow-sm"
                        : error
                            ? "border-red-400"
                            : "border-slate-300 hover:border-slate-400"
                    }
                `}
            >
                {/* Floating Label - positioned after the icon */}
                <label
                    className={`
                        absolute left-11 transition-all duration-200 pointer-events-none z-10 px-1 bg-white
                        ${isActive
                            ? "-top-2.5 text-xs font-medium"
                            : "top-1/2 -translate-y-1/2 text-sm"
                        }
                        ${isFocused
                            ? "text-slate-900"
                            : error
                                ? "text-red-500"
                                : "text-slate-500"
                        }
                    `}
                >
                    {label}
                </label>

                <div className="relative flex items-center">
                    {/* Icon - positioned at left */}
                    <div className={`absolute left-3.5 flex items-center pointer-events-none transition-colors ${isFocused ? "text-slate-800" : "text-slate-400"}`}>
                        <MapPin className="w-5 h-5" />
                    </div>

                    <input
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        onFocus={() => {
                            setIsFocused(true);
                            if (suggestions.length > 0) setShowDropdown(true);
                        }}
                        placeholder={isActive ? placeholder : ""}
                        className="w-full pl-11 pr-11 py-3 bg-transparent text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none rounded-xl"
                    />

                    <div className="absolute right-3.5 flex items-center gap-2">
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
                        {query && !isLoading && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-0.5 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Dropdown */}
            {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                    {suggestions.map((feature) => (
                        <button
                            key={feature.id}
                            type="button"
                            onClick={() => handleSelect(feature)}
                            className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-start gap-3 border-b border-slate-100 last:border-0"
                        >
                            <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-slate-900 text-sm truncate">
                                    {feature.place_name.split(",")[0]}
                                </p>
                                <p className="text-slate-500 text-xs truncate">
                                    {feature.place_name.split(",").slice(1).join(",").trim()}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <p className="mt-1.5 text-xs text-red-600" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

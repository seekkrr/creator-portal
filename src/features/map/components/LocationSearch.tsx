import { useState, useRef, useEffect, useCallback, type ChangeEvent } from "react";
import { Search, X, MapPin } from "lucide-react";
import { config } from "@config/env";
import type { QuestLocation } from "@/types";

interface MapboxSearchResult {
    id: string;
    place_name: string;
    center: [number, number];
    context?: Array<{ id: string; text: string }>;
    properties?: { address?: string };
}

interface LocationSearchProps {
    onSelect: (location: QuestLocation) => void;
    placeholder?: string;
    defaultValue?: string;
}

export function LocationSearch({
    onSelect,
    placeholder = "Search for a location...",
    defaultValue = "",
}: LocationSearchProps) {
    const [query, setQuery] = useState(defaultValue);
    const [results, setResults] = useState<MapboxSearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

    const searchLocations = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                    searchQuery
                )}.json?access_token=${config.mapbox.accessToken}&types=place,locality,neighborhood,address,poi`
            );
            const data = await response.json();
            setResults(data.features ?? []);
            setIsOpen(true);
        } catch {
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        // Debounce search
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            searchLocations(value);
        }, 300);
    };

    const handleSelect = (result: MapboxSearchResult) => {
        const [lng, lat] = result.center;

        const location: QuestLocation = {
            longitude: lng,
            latitude: lat,
            place_name: result.place_name,
            address: result.properties?.address,
            city: result.context?.find((c) => c.id.startsWith("place"))?.text,
            region: result.context?.find((c) => c.id.startsWith("region"))?.text,
            country: result.context?.find((c) => c.id.startsWith("country"))?.text,
        };

        setQuery(result.place_name);
        setIsOpen(false);
        onSelect(location);
    };

    const clearSearch = () => {
        setQuery("");
        setResults([]);
        setIsOpen(false);
        inputRef.current?.focus();
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
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-colors"
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

            {/* Results dropdown */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
                    role="listbox"
                >
                    {isLoading ? (
                        <div className="p-4 text-center text-neutral-500">Searching...</div>
                    ) : results.length > 0 ? (
                        results.map((result) => (
                            <button
                                key={result.id}
                                onClick={() => handleSelect(result)}
                                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none transition-colors"
                                role="option"
                            >
                                <MapPin className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-neutral-700 line-clamp-2">
                                    {result.place_name}
                                </span>
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

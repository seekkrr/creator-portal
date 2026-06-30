import { useState, useCallback, useRef, useEffect, type ChangeEvent } from "react";
import { MapPin, X, Loader2, CheckCircle2, Building2, Tent } from "lucide-react";
import { regionService } from "@services/region.service";
import type { MapboxRegionCandidate, ResolvedRegion } from "@/types";

interface RegionSearchSelectProps {
    value: ResolvedRegion | null;
    onChange: (region: ResolvedRegion | null) => void;
    /** "lng,lat" to bias Mapbox results toward a point (e.g. current location). */
    proximity?: string;
    /** External query to seed the input (e.g. reverse-geocoded current location). */
    prefillQuery?: string;
    /** Bump to re-apply the same prefillQuery (e.g. tapping "use my location" twice). */
    prefillNonce?: number;
    /** ISO 3166-1 alpha-2 to restrict Mapbox results. Defaults to "in"; pass undefined to go global. */
    country?: string;
    error?: string;
    highlightOnFocus?: boolean;
    label?: string;
}

/** Right-aligned status chip describing how a candidate maps onto SeekKrr regions. */
function CandidateChip({ candidate }: { candidate: MapboxRegionCandidate }) {
    if (candidate.existing_region) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 text-xs font-medium whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3" /> On SeekKrr
            </span>
        );
    }
    if (candidate.overlaps.length > 0) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-xs font-medium whitespace-nowrap">
                Part of {candidate.overlaps[0]?.name ?? "existing region"}
            </span>
        );
    }
    const isHotspot = candidate.suggested_type === "hotspot";
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 text-xs font-medium whitespace-nowrap">
            {isHotspot ? <Tent className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
            New {isHotspot ? "hotspot" : "city"}
            {isHotspot && candidate.parent_city?.name ? ` · ${candidate.parent_city.name}` : ""}
        </span>
    );
}

export function RegionSearchSelect({
    value,
    onChange,
    proximity,
    prefillQuery,
    prefillNonce,
    country = "in",
    error,
    highlightOnFocus = true,
    label = "Search city, area, or landmark",
}: RegionSearchSelectProps) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<MapboxRegionCandidate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [resolveError, setResolveError] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const runSearch = useCallback(
        async (q: string) => {
            if (!q || q.trim().length < 2) {
                setSuggestions([]);
                setShowDropdown(false);
                return;
            }
            setIsLoading(true);
            try {
                const results = await regionService.mapboxSearch(q.trim(), {
                    limit: 6,
                    ...(country ? { country } : {}),
                    ...(proximity ? { proximity } : {}),
                });
                setSuggestions(results);
                setShowDropdown(true);
            } catch (err) {
                console.error("Region search error:", err);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        },
        [proximity, country]
    );

    // Seed the input from an external query (e.g. "Use my current location").
    // prefillNonce lets the same query re-apply (tapping the button twice).
    useEffect(() => {
        if (prefillQuery && prefillQuery.trim().length >= 2) {
            setQuery(prefillQuery);
            runSearch(prefillQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefillQuery, prefillNonce]);

    // Clear any pending debounce on unmount.
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        setQuery(next);
        setResolveError(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => runSearch(next), 300);
    };

    const handleSelect = (candidate: MapboxRegionCandidate) => {
        setShowDropdown(false);
        setSuggestions([]);
        setQuery(candidate.name);
        setResolveError(null);
        // IMPORTANT: selecting a candidate must NOT write to the backend. Creating
        // a region here would spawn orphan regions every time a creator clicks
        // through the dropdown. Existing regions are referenced directly; new ones
        // carry a pending payload that the Location step resolves on "Next".
        if (candidate.existing_region) {
            onChange({
                region_id: candidate.existing_region.id,
                name: candidate.name,
                type: candidate.existing_region.type,
                center: candidate.center,
            });
        } else {
            onChange({
                region_id: "",
                name: candidate.name,
                type: candidate.suggested_type,
                center: candidate.center,
                pending_payload: candidate.resolve_payload,
            });
        }
    };

    const handleClear = () => {
        setQuery("");
        setSuggestions([]);
        setShowDropdown(false);
        setResolveError(null);
        onChange(null);
    };

    useEffect(() => {
        const onClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
                setIsFocused(false);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const shownError = error ?? resolveError ?? undefined;

    // ── Resolved state: compact confirmation card with a "Change" affordance ──
    if (value) {
        const isHotspot = value.type === "hotspot";
        return (
            <div className="w-full">
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50/60 px-4 py-3">
                    <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{value.name}</p>
                        <p className="text-xs text-neutral-500 flex items-center gap-1">
                            {isHotspot ? <Tent className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                            {isHotspot ? "Hotspot" : "City"} · region set
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="flex-shrink-0 text-xs font-medium text-neutral-500 hover:text-neutral-800 underline-offset-2 hover:underline"
                    >
                        Change
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative w-full">
            <div
                className={`
                    relative rounded-xl border transition-all duration-200 bg-white
                    ${
                        highlightOnFocus && isFocused
                            ? "border-neutral-900 shadow-sm"
                            : shownError
                              ? "border-red-400"
                              : "border-neutral-300 hover:border-neutral-400"
                    }
                `}
            >
                <div className="relative flex items-center">
                    <div
                        className={`absolute left-3.5 flex items-center pointer-events-none transition-colors ${isFocused ? "text-neutral-800" : "text-neutral-400"}`}
                    >
                        <MapPin className="w-5 h-5" />
                    </div>

                    <input
                        id="region-search"
                        name="region-search"
                        type="text"
                        autoComplete="off"
                        value={query}
                        onChange={handleInputChange}
                        onFocus={() => {
                            setIsFocused(true);
                            if (suggestions.length > 0) setShowDropdown(true);
                        }}
                        aria-label={label}
                        placeholder={label}
                        className="w-full pl-11 pr-11 py-3 bg-transparent text-neutral-900 text-sm placeholder:text-neutral-400 focus:outline-none rounded-xl disabled:opacity-60"
                    />

                    <div className="absolute right-3.5 flex items-center gap-2">
                        {isLoading && (
                            <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                        )}
                        {query && !isLoading && (
                            <button
                                type="button"
                                onClick={handleClear}
                                aria-label="Clear"
                                className="p-0.5 hover:bg-neutral-100 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-neutral-400" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1.5 bg-white rounded-xl border border-neutral-200 shadow-lg overflow-hidden max-h-80 overflow-y-auto">
                    {suggestions.map((candidate) => (
                        <button
                            key={candidate.mapbox_id}
                            type="button"
                            onClick={() => handleSelect(candidate)}
                            className="w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors flex items-start gap-3 border-b border-neutral-100 last:border-0"
                        >
                            <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                            {/* Name + address get the full row width; the status chip
                                drops to its own line below so nothing gets squeezed. */}
                            <div className="flex-1 min-w-0">
                                <p className="text-neutral-900 text-sm font-medium truncate">
                                    {candidate.name}
                                </p>
                                {(candidate.place_formatted ?? candidate.full_address) && (
                                    <p className="text-neutral-500 text-xs truncate">
                                        {candidate.place_formatted ?? candidate.full_address}
                                    </p>
                                )}
                                <div className="mt-1.5">
                                    <CandidateChip candidate={candidate} />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showDropdown && !isLoading && suggestions.length === 0 && query.trim().length >= 2 && (
                <div className="absolute z-50 w-full mt-1.5 bg-white rounded-xl border border-neutral-200 shadow-lg px-4 py-3 text-sm text-neutral-500">
                    No places found for “{query.trim()}”.
                </div>
            )}

            {shownError && (
                <p className="mt-1.5 text-xs text-red-600" role="alert">
                    {shownError}
                </p>
            )}
        </div>
    );
}

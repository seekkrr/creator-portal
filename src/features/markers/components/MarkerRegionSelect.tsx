import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, MapPinned, X } from "lucide-react";
import { regionService } from "@services/region.service";

interface MarkerRegionSelectProps {
    /** Selected region id ("" = no region). */
    value: string;
    onChange: (regionId: string) => void;
}

/**
 * Searchable region picker backed by the SeekKrr region search endpoint
 * (GET /api/v2/regions/search). Lets a creator attach a marker to an existing
 * region. Includes a "No region" option to clear the selection.
 */
export function MarkerRegionSelect({ value, onChange }: MarkerRegionSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    // The search endpoint requires a non-empty query (returns 422 for q=""),
    // so only fetch once the user has typed something.
    const trimmed = search.trim();
    const { data, isLoading } = useQuery({
        queryKey: ["marker-region-search", trimmed],
        queryFn: () => regionService.searchRegions(trimmed, { page_size: 20 }),
        enabled: isOpen && trimmed.length > 0,
        staleTime: 30_000,
    });

    const regions = data?.items ?? [];
    const selectedInList = regions.find((r) => r.id === value);

    // The selected region may not be in the current search page (esp. on edit
    // prefill) — fetch it by id for the display label.
    const { data: selectedRegion } = useQuery({
        queryKey: ["region", value],
        queryFn: () => regionService.getRegion(value),
        enabled: !!value && !selectedInList,
        staleTime: 60_000,
    });

    const displayName = selectedInList?.name ?? selectedRegion?.name;

    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const handleSelect = (regionId: string) => {
        onChange(regionId);
        setIsOpen(false);
        setSearch("");
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
            >
                <span className={`flex items-center gap-2 text-sm ${value ? "text-slate-900" : "text-slate-400"}`}>
                    {value ? (
                        <>
                            <MapPinned className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="truncate">{displayName ?? "Loading region…"}</span>
                        </>
                    ) : (
                        "Search & select a region…"
                    )}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                                placeholder="Search SeekKrr regions…"
                                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                            />
                        </div>
                    </div>
                    <ul className="max-h-52 overflow-y-auto py-1">
                        <li>
                            <button
                                type="button"
                                onClick={() => handleSelect("")}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors ${value === "" ? "text-indigo-700 font-medium" : "text-slate-500"}`}
                            >
                                <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                No region
                            </button>
                        </li>
                        {isLoading ? (
                            <li className="px-4 py-3 text-sm text-slate-500 text-center">Loading…</li>
                        ) : regions.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-slate-500 text-center">
                                {search ? "No regions found" : "Type to search regions"}
                            </li>
                        ) : (
                            regions.map((region) => (
                                <li key={region.id}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(region.id)}
                                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-indigo-50 transition-colors ${region.id === value ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700"}`}
                                    >
                                        <MapPinned className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                        <span className="truncate">{region.name}</span>
                                        <span className="ml-auto text-xs text-slate-400 shrink-0 capitalize">{region.type}</span>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

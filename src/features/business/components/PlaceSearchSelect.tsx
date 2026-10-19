import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { markerService } from "@services/marker.service";
import type { Marker } from "@/types";

interface PlaceSearchSelectProps {
    value: Marker | null;
    onChange: (marker: Marker | null) => void;
    id?: string;
}

/** Find an existing SeekKrr place (`GET /api/v2/markers?search=`) to claim. */
export function PlaceSearchSelect({ value, onChange, id = "place-search" }: PlaceSearchSelectProps) {
    const [term, setTerm] = useState("");
    const [debounced, setDebounced] = useState("");
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = window.setTimeout(() => setDebounced(term.trim()), 300);
        return () => window.clearTimeout(t);
    }, [term]);

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    const results = useQuery({
        queryKey: ["place-search", debounced],
        queryFn: () => markerService.listMarkers({ search: debounced, page_size: 8 }),
        enabled: debounced.length >= 2,
        staleTime: 60_000,
    });

    if (value) {
        return (
            <div className="flex items-start gap-3 p-3 rounded-xl border border-primary-200 bg-primary-50">
                <MapPin className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-900">{value.title}</p>
                    {value.address && <p className="text-xs text-neutral-600">{value.address}</p>}
                </div>
                <button
                    type="button"
                    aria-label="Choose a different place"
                    onClick={() => onChange(null)}
                    className="p-1 rounded-lg text-neutral-500 hover:bg-white hover:text-neutral-800"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    const items = results.data?.items ?? [];

    return (
        <div ref={box} className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
            <input
                id={id}
                value={term}
                onChange={(e) => {
                    setTerm(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder="Search your place on SeekKrr, e.g. “Garden Café Bir”"
                autoComplete="off"
                className="w-full pl-9 pr-9 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
            />
            {results.isFetching && <Loader2 className="absolute right-3 top-3 w-4 h-4 text-neutral-400 animate-spin" />}
            {open && debounced.length >= 2 && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-xl max-h-64 overflow-y-auto py-1">
                    {results.isError ? (
                        <li className="px-4 py-3 text-sm text-red-600">Search failed. Try again.</li>
                    ) : !results.isLoading && items.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-neutral-500">No places found — paste a Google Maps link instead.</li>
                    ) : (
                        items.map((m) => (
                            <li key={m.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(m);
                                        setOpen(false);
                                        setTerm("");
                                    }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-primary-50 flex items-start gap-2"
                                >
                                    <MapPin className="w-4 h-4 text-primary-400 mt-0.5 shrink-0" />
                                    <span className="min-w-0">
                                        <span className="block text-sm text-neutral-900 truncate">{m.title}</span>
                                        {m.address && <span className="block text-xs text-neutral-500 truncate">{m.address}</span>}
                                    </span>
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}

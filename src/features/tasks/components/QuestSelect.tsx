import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, Map } from "lucide-react";
import { questService } from "@services/quest.service";
import type { QuestListItem } from "@/types";

interface QuestSelectProps {
    value: string;
    onChange: (questId: string) => void;
    disabled?: boolean;
    error?: string;
}

export function QuestSelect({ value, onChange, disabled = false, error }: QuestSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["my-quests-for-select"],
        queryFn: () => questService.getMyQuests({ page_size: 100 }),
        staleTime: 30_000,
    });

    const allQuests = data?.items ?? [];

    // Client-side filter by title
    const quests = search.trim()
        ? allQuests.filter((q) =>
              (q.title ?? "").toLowerCase().includes(search.trim().toLowerCase())
          )
        : allQuests;

    // Find selected quest in the fetched list
    const selectedQuest = allQuests.find((q) => q.id === value);

    // If value is set but not in the fetched list, fetch it separately for the label
    const { data: detailData } = useQuery({
        queryKey: ["quest-detail-label", value],
        queryFn: () => questService.getQuestById(value),
        enabled: !!value && !selectedQuest,
        staleTime: 60_000,
    });

    const displayTitle: string | null | undefined =
        selectedQuest?.title ?? detailData?.title;

    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const handleSelect = (questId: string) => {
        onChange(questId);
        setIsOpen(false);
        setSearch("");
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setIsOpen(false);
        setSearch("");
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Quest (optional)
            </label>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen((o) => !o)}
                className={`
                    w-full flex items-center justify-between px-4 py-2.5
                    bg-white border rounded-lg text-left
                    transition-colors duration-150
                    focus:outline-none focus:ring-2 focus:ring-offset-0
                    disabled:bg-neutral-100 disabled:cursor-not-allowed
                    ${error
                        ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                        : "border-neutral-300 focus:border-indigo-500 focus:ring-indigo-200"
                    }
                `}
            >
                <span className={`flex items-center gap-2 text-sm ${displayTitle ? "text-neutral-900" : "text-neutral-400"}`}>
                    {displayTitle ? (
                        <>
                            <Map className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="truncate">{displayTitle}</span>
                        </>
                    ) : value ? (
                        <span className="text-neutral-500">Loading quest...</span>
                    ) : (
                        "None / no quest"
                    )}
                </span>
                <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {error && (
                <p className="mt-1.5 text-sm text-red-600" role="alert">{error}</p>
            )}

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-neutral-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                                placeholder="Search quests..."
                                className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                            />
                        </div>
                    </div>
                    <ul className="max-h-52 overflow-y-auto py-1">
                        {/* "None" option */}
                        <li>
                            <button
                                type="button"
                                onClick={handleClear}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-indigo-50 transition-colors
                                    ${!value ? "bg-indigo-50 text-indigo-700 font-medium" : "text-neutral-500 italic"}
                                `}
                            >
                                None / no quest
                            </button>
                        </li>
                        {isLoading ? (
                            <li className="px-4 py-3 text-sm text-neutral-500 text-center">Loading...</li>
                        ) : quests.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-neutral-500 text-center">No quests found</li>
                        ) : (
                            quests.map((quest: QuestListItem) => (
                                <li key={quest.id}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(quest.id)}
                                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-indigo-50 transition-colors
                                            ${quest.id === value ? "bg-indigo-50 text-indigo-700 font-medium" : "text-neutral-700"}
                                        `}
                                    >
                                        <Map className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                        <span className="truncate">{quest.title ?? "(untitled)"}</span>
                                        {quest.status && (
                                            <span className="ml-auto text-xs text-neutral-400 shrink-0">{quest.status}</span>
                                        )}
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

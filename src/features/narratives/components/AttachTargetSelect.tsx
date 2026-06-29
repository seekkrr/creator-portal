import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { narrativeService } from "@services/narrative.service";
import { markerService } from "@services/marker.service";
import { questService } from "@services/quest.service";
import type { NarrativeAttachType } from "@/types";

export interface AttachSelection {
    attach_type: NarrativeAttachType;
    attach_id: string;
    label: string;
}

interface AttachTargetSelectProps {
    value: AttachSelection | null;
    onChange: (sel: AttachSelection) => void;
    disabled?: boolean;
    error?: string;
}

export function AttachTargetSelect({
    value,
    onChange,
    disabled = false,
    error,
}: AttachTargetSelectProps) {
    const [tab, setTab] = useState<"marker" | "quest">(
        value?.attach_type === "quest" ? "quest" : "marker"
    );
    const [search, setSearch] = useState("");
    const [summaryNotice, setSummaryNotice] = useState<string | null>(null);

    const { data: markersData, isLoading: loadingMarkers } = useQuery({
        queryKey: ["creator-markers-picker", search],
        queryFn: () => markerService.listMarkers({ mine: true, search: search || undefined }),
        enabled: tab === "marker",
    });

    const { data: questsData, isLoading: loadingQuests } = useQuery({
        queryKey: ["creator-quests-picker"],
        queryFn: () => questService.getMyQuests({}),
        enabled: tab === "quest",
    });

    const handleSelect = async (attachType: NarrativeAttachType, attachId: string, label: string) => {
        onChange({ attach_type: attachType, attach_id: attachId, label });
        setSummaryNotice(null);
        try {
            const summary = await narrativeService.getAttachSummary(attachType, attachId);
            const count = typeof summary["total"] === "number" ? summary["total"] : 0;
            if (count > 0) {
                setSummaryNotice(
                    `This target already has ${count} narrative(s); the new one will be added with the next sequence order.`
                );
            }
        } catch {
            // non-critical — ignore summary fetch failures
        }
    };

    const markers = markersData?.items ?? [];
    const quests = questsData?.items ?? [];

    return (
        <div className="w-full space-y-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Attach To
            </label>

            {/* Segmented toggle */}
            <div className="flex rounded-lg border border-neutral-200 p-0.5 bg-neutral-50 w-fit">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => { setTab("marker"); setSearch(""); setSummaryNotice(null); }}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        tab === "marker"
                            ? "bg-white text-primary-700 shadow-sm border border-neutral-200"
                            : "text-neutral-600 hover:text-neutral-900"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    Marker
                </button>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => { setTab("quest"); setSearch(""); setSummaryNotice(null); }}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        tab === "quest"
                            ? "bg-white text-primary-700 shadow-sm border border-neutral-200"
                            : "text-neutral-600 hover:text-neutral-900"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    Quest
                </button>
            </div>

            {/* Search (markers only) */}
            {tab === "marker" && !disabled && (
                <input
                    type="text"
                    placeholder="Search markers..."
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                />
            )}

            {/* Dropdown list */}
            {!disabled && (
                <div className="border border-neutral-200 rounded-lg bg-white max-h-48 overflow-y-auto divide-y divide-neutral-100">
                    {tab === "marker" && (
                        loadingMarkers ? (
                            <div className="px-4 py-3 text-sm text-neutral-400">Loading markers…</div>
                        ) : markers.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-neutral-400">No markers found</div>
                        ) : (
                            markers.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleSelect("marker", m.id, m.title)}
                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 transition-colors ${
                                        value?.attach_id === m.id && value.attach_type === "marker"
                                            ? "bg-primary-50 text-primary-700 font-medium"
                                            : "text-neutral-800"
                                    }`}
                                >
                                    {m.title}
                                    {m.category && (
                                        <span className="ml-2 text-xs text-neutral-400">{m.category}</span>
                                    )}
                                </button>
                            ))
                        )
                    )}
                    {tab === "quest" && (
                        loadingQuests ? (
                            <div className="px-4 py-3 text-sm text-neutral-400">Loading quests…</div>
                        ) : quests.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-neutral-400">No quests found</div>
                        ) : (
                            quests.map((q) => (
                                <button
                                    key={q.id}
                                    type="button"
                                    onClick={() => handleSelect("quest", q.id, q.title ?? q.id)}
                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 transition-colors ${
                                        value?.attach_id === q.id && value.attach_type === "quest"
                                            ? "bg-primary-50 text-primary-700 font-medium"
                                            : "text-neutral-800"
                                    }`}
                                >
                                    {q.title ?? "Untitled Quest"}
                                    <span className={`ml-2 text-xs ${q.status === "Draft" ? "text-neutral-400" : "text-amber-500"}`}>
                                        {q.status}
                                    </span>
                                </button>
                            ))
                        )
                    )}
                </div>
            )}

            {/* Current selection display (edit mode / after selection) */}
            {disabled && value && (
                <div className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-700">
                    <span className="font-medium capitalize">{value.attach_type}:</span>{" "}
                    {value.label}
                    <span className="ml-2 text-xs text-neutral-400">(immutable)</span>
                </div>
            )}

            {/* Existing narratives notice */}
            {summaryNotice && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <span className="mt-0.5 shrink-0">ℹ</span>
                    <span>{summaryNotice}</span>
                </div>
            )}

            {error && (
                <p className="text-sm text-red-600" role="alert">{error}</p>
            )}
        </div>
    );
}

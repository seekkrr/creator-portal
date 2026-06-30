import React, { useState } from "react";
import { ChevronRight, Link2, MoreVertical, Volume2 } from "lucide-react";
import { Badge } from "@components/ui";
import type { BadgeStatus } from "@components/ui";
import type { Narrative, NarrativeStatus } from "@/types";

// ─── Prop Types ──────────────────────────────────────────────────────────────

export interface ChainGroupRowsProps {
    chainId: string;
    label: string;
    members: Narrative[];
    // forwarded from the parent page so member rows are interactive
    openDropdownId: string | null;
    dropdownPosition: "bottom" | "top";
    onDropdownToggle: (id: string, e: React.MouseEvent<HTMLButtonElement>) => void;
    /** id→name map covering markers, quests, and regions. */
    markerTitleMap: Map<string, string>;
    onView: (id: string) => void;
    onEdit: (narrative: Narrative) => void;
    onDelete: (id: string) => void;
    onSubmit: (id: string) => void;
}

// ─── Helpers (duplicated locally to keep the component self-contained) ────────

function getNarrativeStatusBadge(status: NarrativeStatus): BadgeStatus {
    switch (status) {
        case "draft":        return "draft";
        case "under_review": return "under_review";
        case "approved":     return "approved";
        case "rejected":     return "rejected";
        case "archived":     return "archived";
        default:             return "draft";
    }
}

function getAudioChipColor(audioStatus: string | null | undefined): string {
    switch (audioStatus) {
        case "ready":          return "bg-emerald-100 text-emerald-700";
        case "generating":
        case "pending":        return "bg-amber-100 text-amber-700";
        case "failed":
        case "quota_exceeded": return "bg-red-100 text-red-700";
        default:               return "bg-neutral-100 text-neutral-500";
    }
}

function getAudioChipLabel(audioStatus: string | null | undefined): string {
    switch (audioStatus) {
        case "ready":          return "Audio Ready";
        case "generating":     return "Generating…";
        case "pending":        return "Pending";
        case "failed":         return "Failed";
        case "quota_exceeded": return "Quota Exceeded";
        default:               return "No Audio";
    }
}

const CREATOR_EDITABLE: NarrativeStatus[]   = ["draft", "rejected"];
const CREATOR_DELETABLE: NarrativeStatus[]  = ["draft", "rejected"];

// ─── Component ───────────────────────────────────────────────────────────────

export function ChainGroupRows({
    chainId,
    label,
    members,
    openDropdownId,
    dropdownPosition,
    onDropdownToggle,
    markerTitleMap,
    onView,
    onEdit,
    onDelete,
    onSubmit,
}: ChainGroupRowsProps) {
    const [expanded, setExpanded] = useState(true);

    // members are pre-sorted by sequence_order from groupByChain
    return (
        <>
            {/* Chain header row */}
            <tr
                key={`chain-header-${chainId}`}
                className="bg-neutral-50/60 border-y border-neutral-100"
            >
                <td colSpan={6} className="px-6 py-2.5">
                    <button
                        type="button"
                        onClick={() => setExpanded((e) => !e)}
                        className="inline-flex items-center gap-2.5 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
                    >
                        <ChevronRight
                            className={`h-4 w-4 text-neutral-400 transition-transform duration-150 ${
                                expanded ? "rotate-90" : ""
                            }`}
                        />
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-xs font-semibold text-neutral-600 shadow-sm">
                            <Link2 className="h-3.5 w-3.5 text-neutral-400" />
                            Chain of {members.length}
                        </div>
                        <span className="font-normal text-neutral-500">— {label}</span>
                    </button>
                </td>
            </tr>

            {/* Member rows (collapsed/expanded) */}
            {expanded &&
                members.map((narrative) => {
                    const isEditable    = CREATOR_EDITABLE.includes(narrative.status);
                    const isDeletable   = CREATOR_DELETABLE.includes(narrative.status);
                    const isSubmittable = narrative.status === "draft";

                    return (
                        <tr
                            key={narrative.id}
                            className="hover:bg-neutral-50/50 transition-colors group bg-white"
                        >
                            {/* Title — indented to signal membership */}
                            <td
                                className="py-4 pl-12 pr-6 font-medium text-neutral-900 truncate max-w-[280px]"
                                title={narrative.title}
                            >
                                <div className="flex items-center gap-2">
                                    {narrative.sequence_order !== null && narrative.sequence_order !== undefined && (
                                        <Badge variant="primary" className="text-[10px] shrink-0">
                                            #{narrative.sequence_order}
                                        </Badge>
                                    )}
                                    <span className="truncate">{narrative.title}</span>
                                </div>
                                {narrative.subtitle && (
                                    <div className="text-xs text-neutral-400 truncate font-normal mt-0.5 pl-0">
                                        {narrative.subtitle}
                                    </div>
                                )}
                            </td>

                            {/* Attach */}
                            <td className="py-4 px-6">
                                <div className="flex flex-col gap-0.5">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary-50 text-primary-600 border border-primary-100 w-fit">
                                        {narrative.attach_type}
                                    </span>
                                    <span className="text-xs text-neutral-600 truncate max-w-[140px]" title={markerTitleMap.get(narrative.attach_id) ?? narrative.attach_id}>
                                        {markerTitleMap.get(narrative.attach_id) ?? narrative.attach_id}
                                    </span>
                                </div>
                            </td>

                            {/* Status */}
                            <td className="py-4 px-6 text-center">
                                <Badge
                                    status={getNarrativeStatusBadge(narrative.status)}
                                    className="text-[11px] uppercase tracking-wider"
                                >
                                    {narrative.status.replace("_", " ")}
                                </Badge>
                            </td>

                            {/* Audio */}
                            <td className="py-4 px-6 text-center">
                                <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${getAudioChipColor(
                                        narrative.audio_status
                                    )}`}
                                >
                                    <Volume2 className="w-3 h-3 shrink-0" />
                                    {getAudioChipLabel(narrative.audio_status)}
                                </span>
                            </td>

                            {/* Created */}
                            <td className="py-4 px-6 text-sm text-neutral-500 whitespace-nowrap text-center">
                                {narrative.created_at
                                    ? new Date(narrative.created_at).toLocaleDateString()
                                    : "—"}
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-6 text-right relative">
                                <div className="flex items-center justify-end">
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={(e) => onDropdownToggle(narrative.id, e)}
                                            className={`p-2 h-9 w-9 border border-transparent rounded-lg flex items-center justify-center transition-colors
                                                ${
                                                    openDropdownId === narrative.id
                                                        ? "bg-neutral-100 text-neutral-900"
                                                        : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
                                                }`}
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {openDropdownId === narrative.id && (
                                            <div
                                                className={`absolute right-0 w-52 bg-white border border-neutral-200 rounded-xl shadow-xl z-[100] py-1.5 animate-fade-in ${
                                                    dropdownPosition === "top"
                                                        ? "bottom-full mb-1.5"
                                                        : "top-full mt-1.5"
                                                }`}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    onClick={() => onView(narrative.id)}
                                                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 font-medium"
                                                >
                                                    View Details
                                                </button>
                                                {isSubmittable && (
                                                    <button
                                                        onClick={() => onSubmit(narrative.id)}
                                                        className="w-full text-left px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2 font-medium"
                                                    >
                                                        Submit for Review
                                                    </button>
                                                )}
                                                {isEditable && (
                                                    <button
                                                        onClick={() => onEdit(narrative)}
                                                        className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                {isDeletable && (
                                                    <button
                                                        onClick={() => onDelete(narrative.id)}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                                    >
                                                        Delete Narrative
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    );
                })}
        </>
    );
}

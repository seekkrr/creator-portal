import { CalendarDays, CheckSquare, Clock, MapPin, Users } from "lucide-react";
import type { CollabAvailability, CollabBrief, CollabMode } from "@services/business.types";
import { availabilitySummary, briefChips, formatShortDate, plural, usageRightsLabel } from "../utils";

export interface CollabPreviewData {
    want: string;
    offer: string;
    description: string;
    mode: CollabMode;
    allow_advance_requests: boolean;
    slots_left: number;
    valid_until: string | null;
    brief: Partial<CollabBrief>;
    availability: Partial<CollabAvailability>;
}

/**
 * What a creator sees in the app after checking in (Figma "Available
 * Collaborations"): dark-teal heading with the yellow highlight, Want / For /
 * Description, brief chips, disclosure checklist, and the Redeem / Avail pill.
 */
export function CollabPreviewCard({
    data,
    businessName,
    placeTitle,
    logoUrl,
}: {
    data: CollabPreviewData;
    businessName: string;
    placeTitle?: string | null;
    logoUrl?: string | null;
}) {
    const chips = briefChips(data.brief);
    const avail = availabilitySummary(data.availability);
    const disclosure = data.brief.disclosure_label;

    return (
        <div className="rounded-[1.75rem] bg-app p-4 border border-neutral-200">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500 mb-2 px-1">
                Creator view in the SeekKrr app
            </p>
            <div className="rounded-2xl bg-white border-2 border-primary-900 shadow-[4px_4px_0_0_#003634] overflow-hidden">
                <div className="flex items-center gap-3 px-4 pt-4">
                    {logoUrl ? (
                        <img src={logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-neutral-200" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary-900 text-highlight font-display font-bold flex items-center justify-center">
                            {businessName.slice(0, 1).toUpperCase() || "S"}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-primary-900 leading-tight truncate">{businessName}</p>
                        {placeTitle && (
                            <p className="text-xs text-neutral-500 flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {placeTitle}
                            </p>
                        )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-accent-500 text-white text-[11px] font-bold uppercase tracking-wide">
                        New
                    </span>
                </div>

                <div className="px-4 pt-3 pb-4 space-y-3">
                    <h3 className="font-display text-xl font-extrabold text-primary-900 leading-snug">
                        <span className="bg-highlight px-1 rounded-sm box-decoration-clone">
                            {data.offer || "What creators get"}
                        </span>
                    </h3>

                    <dl className="grid grid-cols-[3.5rem_1fr] gap-x-2 gap-y-1.5 text-sm">
                        <dt className="font-semibold text-primary-800">Want</dt>
                        <dd className="text-neutral-800 break-words">{data.want || "What you'd like in return"}</dd>
                        <dt className="font-semibold text-primary-800">For</dt>
                        <dd className="text-neutral-800 break-words">{data.offer || "—"}</dd>
                    </dl>

                    {data.description && (
                        <p className="text-sm text-neutral-600 whitespace-pre-line break-words">{data.description}</p>
                    )}

                    {chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {chips.map((c) => (
                                <span
                                    key={c}
                                    className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-800 border border-primary-100 text-xs font-medium"
                                >
                                    {c}
                                </span>
                            ))}
                        </div>
                    )}

                    {disclosure && (
                        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 space-y-1.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                                Brief checklist
                            </p>
                            <p className="text-xs text-neutral-700 flex items-center gap-1.5">
                                <CheckSquare className="w-3.5 h-3.5 text-primary-600" />
                                Add <span className="font-semibold">{disclosure}</span> to every post
                            </p>
                            {data.brief.post_within_days ? (
                                <p className="text-xs text-neutral-700 flex items-center gap-1.5">
                                    <CheckSquare className="w-3.5 h-3.5 text-primary-600" />
                                    Post within {plural(data.brief.post_within_days, "day")} of redeeming
                                </p>
                            ) : null}
                            <p className="text-xs text-neutral-700 flex items-center gap-1.5">
                                <CheckSquare className="w-3.5 h-3.5 text-primary-600" />
                                Usage: {usageRightsLabel(data.brief.usage_rights)}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                        <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {plural(Math.max(0, data.slots_left), "slot")} left
                        </span>
                        {data.valid_until && (
                            <span className="inline-flex items-center gap-1">
                                <CalendarDays className="w-3.5 h-3.5" />
                                Until {formatShortDate(data.valid_until)}
                            </span>
                        )}
                        {avail.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {avail.join(" · ")}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                        <span className="px-5 py-2 rounded-full bg-[#8e6c8a] text-white text-sm font-semibold">
                            {data.mode === "open" ? "Redeem" : "Avail"}
                        </span>
                        {data.mode === "approval" && data.allow_advance_requests && (
                            <span className="px-5 py-2 rounded-full border-2 border-[#8e6c8a] text-[#8e6c8a] text-sm font-semibold">
                                Request visit
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-neutral-400">
                        {data.mode === "open"
                            ? "Creators who check in can redeem right away — your staff enters the redeem code on their phone."
                            : "Creators share their profile; you approve each one before they redeem."}
                    </p>
                </div>
            </div>
        </div>
    );
}

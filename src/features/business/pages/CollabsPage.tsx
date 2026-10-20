import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
    Archive,
    CalendarDays,
    Clock,
    Handshake,
    MapPin,
    Pause,
    Pencil,
    Play,
    Plus,
    ShieldAlert,
    Sparkles,
} from "lucide-react";
import { Button, EmptyState, ErrorState, Skeleton, StatusFilterPills } from "@components/ui";
import { businessService } from "@services/business.service";
import type { BusinessCollab, CollabStatus } from "@services/business.types";
import { useBusiness } from "../context";
import { useCollabs, useHub, useInvalidateBusiness, useRegionName, useUpgradePrompt } from "../queries";
import { availabilitySummary, briefChips, formatShortDate } from "../utils";
import { PageHeader, Pill } from "../components/bits";
import { CollabEditorDrawer } from "../components/CollabEditorDrawer";
import { ConfirmDialog } from "../components/Overlay";
import { UpgradeDialog } from "../components/UpgradeDialog";

type Filter = "active" | "paused" | "archived" | "all";

const FILTERS: { label: string; value: Filter }[] = [
    { label: "Active", value: "active" },
    { label: "Paused", value: "paused" },
    { label: "Archived", value: "archived" },
    { label: "All", value: "all" },
];

const STATUS_STYLE: Record<CollabStatus, string> = {
    active: "bg-green-50 text-green-700 border-green-200",
    paused: "bg-amber-50 text-amber-700 border-amber-200",
    archived: "bg-neutral-100 text-neutral-500 border-neutral-200",
};

function CollabCard({
    collab,
    placeTitle,
    canManage,
    onEdit,
    onStatus,
    onArchive,
    busy,
}: {
    collab: BusinessCollab;
    placeTitle: string | null;
    canManage: boolean;
    onEdit: () => void;
    onStatus: (s: CollabStatus) => void;
    onArchive: () => void;
    busy: boolean;
}) {
    const used = collab.slots_used ?? 0;
    const total = collab.slots_total || 1;
    const pct = Math.min(100, Math.round((used / total) * 100));
    const chips = briefChips(collab.brief);
    const avail = availabilitySummary(collab.availability);
    const moderation = collab.moderation?.status ?? "approved";
    const live = collab.status === "active" && moderation === "approved";

    return (
        <article className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
                <Pill className={STATUS_STYLE[collab.status]}>
                    {collab.status === "active" ? "Active" : collab.status === "paused" ? "Paused" : "Archived"}
                </Pill>
                {moderation === "pending" && (
                    <Pill className="bg-blue-50 text-blue-700 border-blue-200">
                        <Clock className="w-3 h-3" /> Under review
                    </Pill>
                )}
                {moderation === "rejected" && (
                    <Pill className="bg-red-50 text-red-700 border-red-200">
                        <ShieldAlert className="w-3 h-3" /> Not approved
                    </Pill>
                )}
                <Pill className="bg-primary-50 text-primary-700 border-primary-200">
                    {collab.mode === "open" ? "Open" : "Approval"}
                </Pill>
                {collab.allow_advance_requests && (
                    <Pill className="bg-violet-50 text-violet-700 border-violet-200">Advance requests</Pill>
                )}
                {collab.min_creator_tier === "verified" && (
                    <Pill className="bg-neutral-50 text-neutral-600 border-neutral-200">Verified only</Pill>
                )}
            </div>

            <div className="min-w-0">
                <h3 className="text-lg font-display font-bold text-primary-900 leading-snug">
                    <span className="bg-highlight/70 px-1 rounded-sm box-decoration-clone">{collab.offer}</span>
                </h3>
                <p className="text-sm text-neutral-700 mt-1.5">
                    <span className="font-semibold text-primary-800">Want:</span> {collab.want}
                </p>
                {placeTitle && (
                    <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {placeTitle}
                    </p>
                )}
            </div>

            {moderation === "pending" && (
                <p className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-xl p-2.5">
                    Our team is reviewing this UGC brief. It goes live for creators as soon as it's approved.
                </p>
            )}
            {moderation === "rejected" && (
                <p className="text-xs text-red-800 bg-red-50 border border-red-100 rounded-xl p-2.5">
                    {collab.moderation?.reason || "This UGC brief didn't pass review."} Edit the text to send it for review
                    again.
                </p>
            )}

            {chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {chips.map((c) => (
                        <span key={c} className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-xs">
                            {c}
                        </span>
                    ))}
                </div>
            )}

            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Slots used</span>
                    <span className="tabular-nums font-medium text-neutral-800">
                        {used} / {collab.slots_total}
                    </span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : "bg-primary-500"}`} style={{ width: `${pct}%` }} />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
                {[
                    { label: "Requests", value: collab.counters?.requests ?? 0 },
                    { label: "Redeemed", value: collab.counters?.redemptions ?? 0 },
                    { label: "Completed", value: collab.counters?.completed ?? 0 },
                ].map((c) => (
                    <div key={c.label} className="rounded-xl bg-neutral-50 py-2">
                        <p className="text-base font-bold text-neutral-900">{c.value}</p>
                        <p className="text-[11px] uppercase tracking-wider text-neutral-500">{c.label}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                <span className="inline-flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {collab.valid_from || collab.valid_until
                        ? `${formatShortDate(collab.valid_from, "Now")} – ${formatShortDate(collab.valid_until, "no end date")}`
                        : "No end date"}
                </span>
                {avail.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {avail.join(" · ")}
                    </span>
                )}
            </div>

            {canManage && (
                <div className="flex flex-wrap gap-2 pt-1 mt-auto border-t border-neutral-100 pt-4">
                    <Button size="sm" variant="secondary" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={onEdit}>
                        Edit
                    </Button>
                    {collab.status === "active" && (
                        <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Pause className="w-3.5 h-3.5" />}
                            onClick={() => onStatus("paused")}
                            disabled={busy}
                        >
                            Pause
                        </Button>
                    )}
                    {collab.status !== "active" && (
                        <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Play className="w-3.5 h-3.5" />}
                            onClick={() => onStatus("active")}
                            disabled={busy}
                        >
                            {collab.status === "archived" ? "Restore" : "Resume"}
                        </Button>
                    )}
                    {collab.status !== "archived" && (
                        <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Archive className="w-3.5 h-3.5" />}
                            onClick={onArchive}
                            disabled={busy}
                        >
                            Archive
                        </Button>
                    )}
                    {live && (
                        <Link
                            to={`/business/discover?collab=${collab.id}`}
                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md font-medium text-primary-700 hover:bg-primary-50"
                        >
                            <Sparkles className="w-3.5 h-3.5" /> Find creators
                        </Link>
                    )}
                </div>
            )}
        </article>
    );
}

export function CollabsPage() {
    const { businessId, canManage } = useBusiness();
    const regionName = useRegionName();
    const [filter, setFilter] = useState<Filter>("active");
    const includeArchived = filter === "archived" || filter === "all";
    const collabs = useCollabs(includeArchived);
    const hub = useHub();
    const invalidate = useInvalidateBusiness();
    const { notifyError, showUpgrade, upgrade } = useUpgradePrompt();
    const [searchParams, setSearchParams] = useSearchParams();
    const [editor, setEditor] = useState<{ open: boolean; collab?: BusinessCollab }>({ open: false });
    const [archiveTarget, setArchiveTarget] = useState<BusinessCollab | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const wantsNew = searchParams.get("new") === "1";
    useEffect(() => {
        if (!wantsNew) return;
        if (canManage) setEditor({ open: true });
        const next = new URLSearchParams(searchParams);
        next.delete("new");
        setSearchParams(next, { replace: true });
    }, [wantsNew, canManage, searchParams, setSearchParams]);

    const places = useMemo(() => hub.data?.places ?? [], [hub.data]);
    const placeTitle = (markerId: string) => places.find((p) => p.marker_id === markerId)?.title ?? null;
    const approvalAllowed = !!hub.data?.usage?.entitlements?.approval_mode;

    const items = (collabs.data ?? []).filter((c) => filter === "all" || c.status === filter);

    const changeStatus = async (collab: BusinessCollab, status: CollabStatus) => {
        setBusyId(collab.id);
        try {
            await businessService.setCollabStatus(businessId, collab.id, status);
            toast.success(
                status === "active" ? "UGC brief is live again." : status === "paused" ? "UGC brief paused." : "UGC brief archived."
            );
            await invalidate();
        } catch (e) {
            notifyError(e, "Couldn't change the UGC brief status");
            throw e;
        } finally {
            setBusyId(null);
        }
    };

    const usage = hub.data?.usage?.usage.active_collabs;

    return (
        <div className="space-y-6">
            <PageHeader
                title="UGC Content"
                description={
                    usage
                        ? `${usage.used} active of ${usage.limit ?? "unlimited"} on your plan. Creators see active, approved UGC briefs on the map.`
                        : "Creators see your active, approved UGC briefs on the map."
                }
                actions={
                    canManage ? (
                        <Button
                            variant="accent"
                            leftIcon={<Plus className="w-4 h-4" />}
                            onClick={() => setEditor({ open: true })}
                            className="w-full sm:w-auto"
                        >
                            Post a UGC brief
                        </Button>
                    ) : undefined
                }
            />

            <StatusFilterPills filters={FILTERS} active={filter} onChange={setFilter} />

            {collabs.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map((i) => (
                        <Skeleton key={i} height={280} />
                    ))}
                </div>
            ) : collabs.isError ? (
                <ErrorState message="We couldn't load your UGC briefs." onRetry={() => void collabs.refetch()} />
            ) : items.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200">
                    {filter === "active" && (collabs.data ?? []).length === 0 ? (
                        <EmptyState
                            icon={<Handshake className="w-7 h-7" />}
                            title={`Post your first UGC brief — creators ${regionName ? `in ${regionName}` : "nearby"} will see it on the map`}
                            description="Open UGC briefs can be redeemed on the spot with your staff code. Approval UGC briefs let you pick each creator first."
                            action={
                                canManage ? (
                                    <Button variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setEditor({ open: true })}>
                                        Post a UGC brief
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <EmptyState
                            icon={<Handshake className="w-7 h-7" />}
                            title={`No ${filter === "all" ? "" : `${filter} `}UGC briefs`}
                            description={
                                filter === "paused"
                                    ? "Paused UGC briefs are hidden from creators until you resume them."
                                    : filter === "archived"
                                      ? "Archived UGC briefs are kept for your records."
                                      : "Nothing here yet."
                            }
                        />
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((c) => (
                        <CollabCard
                            key={c.id}
                            collab={c}
                            placeTitle={placeTitle(c.marker_id)}
                            canManage={canManage}
                            busy={busyId === c.id}
                            onEdit={() => setEditor({ open: true, collab: c })}
                            onStatus={(s) => void changeStatus(c, s).catch(() => undefined)}
                            onArchive={() => setArchiveTarget(c)}
                        />
                    ))}
                </div>
            )}

            {editor.open && (
                <CollabEditorDrawer
                    key={editor.collab?.id ?? "new"}
                    open={editor.open}
                    collab={editor.collab}
                    places={places}
                    approvalAllowed={approvalAllowed}
                    onClose={() => setEditor({ open: false })}
                    onError={(e) => notifyError(e, "Couldn't save the UGC brief")}
                    onUpgrade={showUpgrade}
                    onSaved={(saved, created) => {
                        setEditor({ open: false });
                        void invalidate();
                        if (saved.moderation?.status === "pending") {
                            toast.info("UGC brief saved — it's under review and goes live once approved.");
                        } else {
                            toast.success(created ? "UGC brief posted! Creators nearby can see it now." : "UGC brief updated.");
                        }
                        if (created) setFilter("active");
                    }}
                />
            )}

            <ConfirmDialog
                open={!!archiveTarget}
                onClose={() => setArchiveTarget(null)}
                title="Archive this UGC brief?"
                body="Creators won't see it any more, and pending requests and invites are cancelled. You can restore it later."
                confirmLabel="Archive"
                variant="danger"
                onConfirm={() => (archiveTarget ? changeStatus(archiveTarget, "archived") : undefined)}
            />

            <UpgradeDialog {...upgrade} />
        </div>
    );
}

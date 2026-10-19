import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, ChevronRight, Inbox, Link2, Sparkles } from "lucide-react";
import { Button, EmptyState, ErrorState, SkeletonTableRows, StatusFilterPills } from "@components/ui";
import { businessService } from "@services/business.service";
import type { BusinessApplicationItem, ListApplicationsParams } from "@services/business.types";
import { useBusiness } from "../context";
import { useApplications, useHub, useInvalidateBusiness, useUpgradePrompt } from "../queries";
import { SOURCE_LABELS, relativeTime, visitWindowLabel } from "../utils";
import { ApplicationStatusPill, CreatorAvatar, PageHeader, VerifiedTick } from "../components/bits";
import { ConfirmDialog } from "../components/Overlay";
import { CreatorProfileDrawer } from "../components/CreatorProfileDrawer";
import { UpgradeDialog } from "../components/UpgradeDialog";

type Tab = "requested" | "approved" | "active" | "completed" | "closed" | "invites";

const TABS: {
    value: Tab;
    label: string;
    params: ListApplicationsParams;
    emptyTitle: string;
    emptyBody: string;
}[] = [
    {
        value: "requested",
        label: "Requested",
        params: { status: "requested" },
        emptyTitle: "No requests waiting",
        emptyBody:
            "When a creator taps Avail on an approval collab — or asks for visit dates in advance — they land here with their profile for you to approve.",
    },
    {
        value: "approved",
        label: "Upcoming",
        params: { status: "approved" },
        emptyTitle: "No upcoming visits",
        emptyBody: "Approved creators wait here until they visit and your staff enters the redeem code.",
    },
    {
        value: "active",
        label: "Active",
        params: { group: "active" },
        emptyTitle: "Nothing in progress",
        emptyBody:
            "After redeeming, creators post and submit their links here. Open delivered posts, verify them, and rate the creator.",
    },
    {
        value: "completed",
        label: "Completed",
        params: { group: "completed" },
        emptyTitle: "No completed collabs yet",
        emptyBody: "Verified collabs end up here, with the content in your library.",
    },
    {
        value: "closed",
        label: "Closed",
        params: { group: "closed" },
        emptyTitle: "Nothing closed",
        emptyBody: "Declined, expired, cancelled and no-show collabs are kept here for your records.",
    },
    {
        value: "invites",
        label: "Invites sent",
        params: { group: "invites" },
        emptyTitle: "No open invites",
        emptyBody: "Invite matched creators from Discover — they appear here until they accept.",
    },
];

export function RequestsPage() {
    const { businessId } = useBusiness();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get("tab") as Tab | null;
    const tab: Tab = TABS.some((t) => t.value === tabParam) ? (tabParam as Tab) : "requested";
    const current = TABS.find((t) => t.value === tab) ?? TABS[0];
    const apps = useApplications(current?.params ?? { status: "requested" });
    const hub = useHub();
    const invalidate = useInvalidateBusiness();
    const { notifyError, upgrade } = useUpgradePrompt();
    const [selected, setSelected] = useState<BusinessApplicationItem | null>(null);
    const [declineTarget, setDeclineTarget] = useState<BusinessApplicationItem | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const setTab = (t: Tab) => {
        const next = new URLSearchParams(searchParams);
        next.set("tab", t);
        setSearchParams(next, { replace: true });
    };

    const pending = hub.data?.pending_requests ?? 0;
    const filters = TABS.map((t) => ({
        value: t.value,
        label: t.value === "requested" && pending ? `${t.label} (${pending})` : t.label,
    }));

    const approve = async (a: BusinessApplicationItem) => {
        setBusyId(a.id);
        try {
            await businessService.approve(businessId, a.id);
            toast.success(`Approved — ${a.creator.display_name} can now redeem with your code.`);
            await invalidate();
        } catch (e) {
            notifyError(e, "Couldn't approve the request");
        } finally {
            setBusyId(null);
        }
    };

    const rows = apps.data ?? [];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Requests & visits"
                description="Approve creators, track who's coming, and verify the content they post."
            />

            <StatusFilterPills filters={filters} active={tab} onChange={setTab} />

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[760px]">
                        <thead className="bg-neutral-50 border-b border-neutral-200">
                            <tr>
                                <th className="py-3 px-5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Creator</th>
                                <th className="py-3 px-5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Collab</th>
                                <th className="py-3 px-5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">When</th>
                                <th className="py-3 px-5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                                <th className="py-3 px-5 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {apps.isLoading ? (
                                <SkeletonTableRows columns={5} rows={4} />
                            ) : apps.isError ? (
                                <tr>
                                    <td colSpan={5} className="p-0">
                                        <ErrorState message="We couldn't load these requests." onRetry={() => void apps.refetch()} />
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-0">
                                        <EmptyState
                                            icon={<Inbox className="w-7 h-7" />}
                                            title={current?.emptyTitle ?? "Nothing here"}
                                            description={current?.emptyBody ?? ""}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                rows.map((a) => {
                                    const verified = a.creator.socials.filter((s) => s.verified).length;
                                    return (
                                        <tr
                                            key={a.id}
                                            className="hover:bg-neutral-50/70 cursor-pointer"
                                            onClick={() => setSelected(a)}
                                        >
                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center gap-3">
                                                    <CreatorAvatar name={a.creator.display_name} url={a.creator.avatar_url} size={38} />
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-neutral-900 truncate flex items-center gap-1">
                                                            {a.creator.display_name}
                                                            {a.creator.tier === "verified" && <VerifiedTick />}
                                                        </p>
                                                        <p className="text-xs text-neutral-500 truncate">
                                                            {verified ? `${verified} verified handle${verified > 1 ? "s" : ""}` : "No verified handles"}
                                                            {a.creator.travel_styles.length > 0 && ` · ${a.creator.travel_styles.slice(0, 2).join(", ")}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-5 max-w-[16rem]">
                                                <p className="text-sm text-neutral-900 truncate">{a.collab?.offer ?? "—"}</p>
                                                <p className="text-xs text-neutral-500 flex items-center gap-1.5">
                                                    {SOURCE_LABELS[a.source] ?? a.source}
                                                    {a.match && (
                                                        <span className="inline-flex items-center gap-0.5 text-primary-700">
                                                            <Sparkles className="w-3 h-3" /> {a.match.score}% match
                                                        </span>
                                                    )}
                                                </p>
                                            </td>
                                            <td className="py-3.5 px-5 text-sm text-neutral-600">
                                                {a.visit_window ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <CalendarDays className="w-3.5 h-3.5 text-neutral-400" />
                                                        {visitWindowLabel(a.visit_window)}
                                                    </span>
                                                ) : (
                                                    relativeTime(a.updated_at ?? a.created_at)
                                                )}
                                                {a.deliverables.length > 0 && (
                                                    <p className="text-xs text-neutral-500 inline-flex items-center gap-1 mt-0.5">
                                                        <Link2 className="w-3 h-3" /> {a.deliverables.length} link
                                                        {a.deliverables.length > 1 ? "s" : ""}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-5">
                                                <ApplicationStatusPill status={a.status} />
                                            </td>
                                            <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end items-center gap-1.5">
                                                    {a.status === "requested" ? (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setDeclineTarget(a)}
                                                                disabled={busyId === a.id}
                                                            >
                                                                Decline
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="accent"
                                                                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                                                isLoading={busyId === a.id}
                                                                disabled={busyId === a.id}
                                                                onClick={() => void approve(a)}
                                                            >
                                                                Approve
                                                            </Button>
                                                        </>
                                                    ) : a.status === "delivered" ? (
                                                        <Button size="sm" variant="primary" onClick={() => setSelected(a)}>
                                                            Review content
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            rightIcon={<ChevronRight className="w-4 h-4" />}
                                                            onClick={() => setSelected(a)}
                                                        >
                                                            View
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selected && (
                <CreatorProfileDrawer
                    key={selected.id}
                    open
                    onClose={() => setSelected(null)}
                    creator={selected.creator}
                    application={selected}
                    onChanged={() => void invalidate()}
                    onError={(e) => notifyError(e)}
                />
            )}

            <ConfirmDialog
                open={!!declineTarget}
                onClose={() => setDeclineTarget(null)}
                title={`Decline ${declineTarget?.creator.display_name ?? "this request"}?`}
                body="They'll be told the request wasn't accepted this time."
                reasonLabel="Reason (optional, shared with the creator)"
                reasonPlaceholder="e.g. We're fully booked those dates"
                confirmLabel="Decline request"
                variant="danger"
                onConfirm={async (reason) => {
                    if (!declineTarget) return;
                    try {
                        await businessService.decline(businessId, declineTarget.id, reason);
                        toast.success("Request declined.");
                        await invalidate();
                    } catch (e) {
                        notifyError(e, "Couldn't decline the request");
                        throw e;
                    }
                }}
            />

            <UpgradeDialog {...upgrade} />
        </div>
    );
}

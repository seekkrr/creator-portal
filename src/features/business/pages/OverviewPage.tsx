import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    AlertTriangle,
    BadgeCheck,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    CreditCard,
    Handshake,
    Inbox,
    KeyRound,
    MapPin,
    Plus,
    Star,
} from "lucide-react";
import { Button, ErrorState, Skeleton } from "@components/ui";
import { businessService } from "@services/business.service";
import type { BusinessHub, CollabFunnel } from "@services/business.types";
import { useBusiness } from "../context";
import { bkeys, useCollabs, useHub, useRegionName } from "../queries";
import {
    planStatusMeta,
    daysUntil,
    formatDate,
    plural,
    usageRatio,
    visitWindowLabel,
} from "../utils";
import {
    Banner,
    CreatorAvatar,
    KpiCard,
    PageHeader,
    Pill,
    SectionCard,
    SegmentedControl,
    UsageMeter,
} from "../components/bits";

interface Alert {
    key: string;
    tone: "info" | "warning" | "danger";
    title: string;
    body: ReactNode;
    action?: { to: string; label: string };
}

const USAGE_LABELS: Record<keyof BusinessHub["usage"]["usage"], string> = {
    redemptions: "redemptions",
    match_reveals: "profile reveals",
    invites: "invites",
    active_collabs: "active UGC briefs",
};

function buildAlerts(hub: BusinessHub): Alert[] {
    const alerts: Alert[] = [];
    if (hub.places.length === 0) {
        alerts.push({
            key: "no-place",
            tone: "info",
            title: "Add your place to start",
            body: "UGC briefs are attached to a place on the SeekKrr map. Link yours in a minute, or drop a pin if it's new.",
            action: { to: "/business/locations?add=1", label: "Add your place" },
        });
    }
    for (const p of hub.places.filter((x) => !x.code_set)) {
        alerts.push({
            key: `code-${p.marker_id}`,
            tone: "warning",
            title: `Set a redeem code for ${p.title ?? "your place"}`,
            body: "Creators can't redeem UGC briefs or check-in offers here until your staff has a 4-digit code.",
            action: { to: "/business/locations", label: "Set code" },
        });
    }
    const usage = hub.usage;
    if (usage) {
        if (usage.status === "halted" || usage.status === "payment_failed") {
            alerts.push({
                key: "payment",
                tone: "danger",
                title: "Your last payment failed",
                body: "Update your payment in Razorpay to keep your plan. We'll move you to Free after the grace period.",
                action: { to: "/business/billing", label: "Billing" },
            });
        } else if (usage.status === "pending") {
            alerts.push({
                key: "pending",
                tone: "warning",
                title: "Payment pending",
                body: "Razorpay is still confirming your payment — this usually takes a few minutes.",
            });
        }
        if (usage.status === "trialing" && usage.trial_ends_at) {
            const d = daysUntil(usage.trial_ends_at);
            if (d !== null && d <= 5) {
                alerts.push({
                    key: "trial",
                    tone: "warning",
                    title: d <= 0 ? "Your free trial ends today" : `Your free trial ends in ${plural(d, "day")}`,
                    body: `Pick a plan before ${formatDate(usage.trial_ends_at)} to keep approval mode, discovery and higher limits.`,
                    action: { to: "/business/billing", label: "Choose a plan" },
                });
            }
        }
        if (usage.status === "trial_ended") {
            alerts.push({
                key: "trial-ended",
                tone: "info",
                title: "Your free trial has ended",
                body: "You're on the Free plan now. Upgrade any time to get your limits back.",
                action: { to: "/business/billing", label: "See plans" },
            });
        }
        for (const [key, counter] of Object.entries(usage.usage ?? {}) as [
            keyof BusinessHub["usage"]["usage"],
            BusinessHub["usage"]["usage"][keyof BusinessHub["usage"]["usage"]],
        ][]) {
            // A 0 limit means the feature isn't in the plan — not a "limit reached" moment.
            if (counter?.limit === 0) continue;
            const ratio = usageRatio(counter);
            if (ratio === null || ratio < 0.8) continue;
            const label = USAGE_LABELS[key] ?? key;
            alerts.push({
                key: `usage-${key}`,
                tone: ratio >= 1 ? "danger" : "warning",
                title:
                    ratio >= 1
                        ? `You've reached your ${label} limit`
                        : `You've used ${counter.used} of ${counter.limit} ${label}`,
                body:
                    key === "active_collabs"
                        ? "Pause a UGC brief or upgrade to run more at once."
                        : "Limits reset at the start of each month — or upgrade for more.",
                action: { to: "/business/billing", label: "Upgrade" },
            });
        }
    }
    return alerts;
}

function Funnel({ funnel, checkins }: { funnel: CollabFunnel; checkins: number }) {
    const stages: { key: keyof CollabFunnel; label: string }[] = [
        { key: "requested", label: "Requested" },
        { key: "approved", label: "Approved" },
        { key: "redeemed", label: "Redeemed" },
        { key: "delivered", label: "Content delivered" },
        { key: "completed", label: "Completed" },
    ];
    const max = Math.max(1, ...stages.map((s) => funnel[s.key] ?? 0));
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-neutral-600">
                <MapPin className="w-4 h-4 text-primary-600" />
                <span>
                    <span className="font-semibold text-neutral-900">{checkins}</span> check-ins at your places
                </span>
            </div>
            <div className="space-y-2.5">
                {stages.map((s, i) => {
                    const v = funnel[s.key] ?? 0;
                    const prev = i > 0 ? (funnel[stages[i - 1]?.key ?? "requested"] ?? 0) : null;
                    const conv = prev ? Math.round((v / prev) * 100) : null;
                    return (
                        <div key={s.key} className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3 text-sm">
                            <span className="text-neutral-600 truncate">{s.label}</span>
                            <div className="h-6 rounded-lg bg-neutral-100 overflow-hidden">
                                <div
                                    className="h-full rounded-lg bg-primary-600"
                                    style={{ width: `${Math.max((v / max) * 100, v > 0 ? 3 : 0)}%`, opacity: 1 - i * 0.12 }}
                                />
                            </div>
                            <span className="text-right tabular-nums">
                                <span className="font-semibold text-neutral-900">{v}</span>
                                {conv !== null && <span className="text-xs text-neutral-400"> · {conv}%</span>}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
                <Pill className="bg-violet-50 text-violet-700 border-violet-200">{funnel.invited ?? 0} invited</Pill>
                <Pill className="bg-neutral-100 text-neutral-600 border-neutral-200">{funnel.declined ?? 0} declined</Pill>
                <Pill className="bg-neutral-100 text-neutral-600 border-neutral-200">{funnel.expired ?? 0} expired</Pill>
                <Pill className="bg-red-50 text-red-700 border-red-200">{funnel.no_show ?? 0} no-shows</Pill>
            </div>
        </div>
    );
}

export function OverviewPage() {
    const { business, businessId, canManage } = useBusiness();
    const [days, setDays] = useState<"7" | "30" | "90">("30");
    const hub = useHub();
    const collabs = useCollabs(false);
    const analytics = useQuery({
        queryKey: bkeys.analytics(businessId, Number(days)),
        queryFn: () => businessService.analytics(businessId, Number(days)),
        staleTime: 60_000,
    });
    const regionName = useRegionName();

    if (hub.isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton height={40} className="w-72" />
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => (
                        <Skeleton key={i} height={96} />
                    ))}
                </div>
                <Skeleton height={260} />
            </div>
        );
    }

    if (hub.isError || !hub.data) {
        return <ErrorState message="We couldn't load your business overview." onRetry={() => void hub.refetch()} />;
    }

    const data = hub.data;
    const alerts = buildAlerts(data);
    const usage = data.usage;
    const statusMeta = planStatusMeta(usage?.status);
    const noCollabs = collabs.isSuccess && collabs.data.length === 0;

    return (
        <div className="space-y-6">
            <PageHeader
                title={
                    <span className="inline-flex items-center gap-2">
                        {business.name}
                        {business.verified && <BadgeCheck className="w-6 h-6 text-primary-600" aria-label="Verified" />}
                    </span>
                }
                description="What needs your attention today, and how your UGC briefs are doing."
                actions={
                    canManage ? (
                        <Link to="/business/collabs?new=1" className="w-full sm:w-auto">
                            <Button variant="accent" leftIcon={<Plus className="w-4 h-4" />} fullWidth>
                                Post a UGC brief
                            </Button>
                        </Link>
                    ) : undefined
                }
            />

            {alerts.length > 0 && (
                <div className="space-y-3">
                    {alerts.map((a) => (
                        <Banner
                            key={a.key}
                            tone={a.tone}
                            icon={<AlertTriangle className="w-5 h-5" />}
                            title={a.title}
                            action={
                                a.action ? (
                                    <Link
                                        to={a.action.to}
                                        className="inline-block px-4 py-2 rounded-full bg-white border border-current/20 text-sm font-semibold hover:bg-white/70 whitespace-nowrap"
                                    >
                                        {a.action.label}
                                    </Link>
                                ) : undefined
                            }
                        >
                            {a.body}
                        </Banner>
                    ))}
                </div>
            )}

            {noCollabs && (
                <div className="rounded-3xl border-2 border-primary-900 bg-white shadow-[6px_6px_0_0_#fecd36] p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary-900 text-highlight flex items-center justify-center shrink-0">
                        <Handshake className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl sm:text-2xl font-display font-bold text-primary-900">
                            Post your first UGC brief — creators {regionName ? `in ${regionName}` : "nearby"} will see it on the
                            map.
                        </h2>
                        <p className="text-neutral-600 mt-2">
                            Say what you <span className="font-semibold">want</span> (a reel, a review) and what it's{" "}
                            <span className="font-semibold">for</span> (a meal, a stay). Creators check in, your staff enters
                            your redeem code, and the content lands in your library.
                        </p>
                    </div>
                    {canManage && (
                        <Link to="/business/collabs?new=1" className="shrink-0">
                            <Button variant="accent" size="lg" className="rounded-full" leftIcon={<Plus className="w-5 h-5" />}>
                                Post a UGC brief
                            </Button>
                        </Link>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard
                    label="Pending requests"
                    value={data.pending_requests}
                    icon={<Inbox className="w-5 h-5" />}
                    tone="amber"
                    hint={data.pending_requests ? "Reply within 48h or they expire" : "You're all caught up"}
                    to="/business/requests"
                />
                <KpiCard
                    label="Upcoming visits"
                    value={data.upcoming_visits.length}
                    icon={<CalendarDays className="w-5 h-5" />}
                    tone="blue"
                    hint={`${data.upcoming_visits.filter((v) => v.today).length} today`}
                    to="/business/requests?tab=approved"
                />
                <KpiCard
                    label="Redeemed today"
                    value={data.redeemed_today}
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    tone="green"
                    to="/business/content?tab=redemptions"
                />
                <KpiCard
                    label="Content to review"
                    value={data.content_to_review}
                    icon={<ClipboardCheck className="w-5 h-5" />}
                    tone="violet"
                    hint={data.content_to_review ? "Verify to complete the request" : undefined}
                    to="/business/requests?tab=active"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <SectionCard
                    className="xl:col-span-2"
                    title="UGC brief funnel"
                    description={`Applications created in the last ${days} days`}
                    actions={
                        <SegmentedControl
                            size="sm"
                            ariaLabel="Period"
                            value={days}
                            onChange={setDays}
                            options={[
                                { value: "7", label: "7d" },
                                { value: "30", label: "30d" },
                                { value: "90", label: "90d" },
                            ]}
                        />
                    }
                >
                    {analytics.isLoading ? (
                        <Skeleton height={200} />
                    ) : analytics.isError || !analytics.data ? (
                        <ErrorState message="Analytics are unavailable right now." onRetry={() => void analytics.refetch()} />
                    ) : (
                        <>
                            <Funnel funnel={analytics.data.funnel} checkins={analytics.data.checkins} />
                            {analytics.data.rating.count > 0 && (
                                <p className="mt-4 text-sm text-neutral-600 inline-flex items-center gap-1.5">
                                    <Star className="w-4 h-4 fill-highlight text-amber-500" />
                                    Creators rate you{" "}
                                    <span className="font-semibold text-neutral-900">
                                        {analytics.data.rating.avg?.toFixed(1) ?? "—"}
                                    </span>{" "}
                                    ({plural(analytics.data.rating.count, "rating")})
                                </p>
                            )}
                        </>
                    )}
                </SectionCard>

                <SectionCard
                    title="This month's usage"
                    actions={<Pill className={statusMeta.className}>{statusMeta.label}</Pill>}
                >
                    {usage ? (
                        <div className="space-y-4">
                            <UsageMeter label="Redemptions" counter={usage.usage.redemptions} />
                            <UsageMeter label="Active UGC briefs" counter={usage.usage.active_collabs} />
                            <UsageMeter label="Profile reveals" counter={usage.usage.match_reveals} />
                            <UsageMeter label="Invites" counter={usage.usage.invites} />
                            <Link
                                to="/business/billing"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
                            >
                                <CreditCard className="w-4 h-4" /> Plan & billing
                            </Link>
                        </div>
                    ) : (
                        <p className="text-sm text-neutral-500">Usage isn't available yet.</p>
                    )}
                </SectionCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <SectionCard
                    className="xl:col-span-2"
                    title="Upcoming visits"
                    description="Approved creators who are coming to redeem"
                    actions={
                        <Link to="/business/requests?tab=approved" className="text-sm font-medium text-primary-700 hover:underline">
                            View all
                        </Link>
                    }
                >
                    {data.upcoming_visits.length === 0 ? (
                        <p className="text-sm text-neutral-500">
                            No approved visits yet. When you approve a request, the creator shows up here with their dates.
                        </p>
                    ) : (
                        <ul className="divide-y divide-neutral-100">
                            {data.upcoming_visits.slice(0, 6).map((v) => (
                                <li key={v.id} className="flex items-center gap-3 py-2.5">
                                    <CreatorAvatar name={v.creator.display_name} url={v.creator.avatar_url} size={36} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-neutral-900 truncate">{v.creator.display_name}</p>
                                        <p className="text-xs text-neutral-500">
                                            {visitWindowLabel(v.visit_window) ?? "Walk-in — any day the UGC brief is open"}
                                        </p>
                                    </div>
                                    {v.today && <Pill className="bg-green-50 text-green-700 border-green-200">Today</Pill>}
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                <SectionCard
                    title="Your places"
                    actions={
                        <Link to="/business/locations" className="text-sm font-medium text-primary-700 hover:underline">
                            Manage
                        </Link>
                    }
                >
                    {data.places.length === 0 ? (
                        <p className="text-sm text-neutral-500">No place linked yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {data.places.map((p) => (
                                <li key={p.marker_id} className="flex items-center gap-2 text-sm">
                                    <KeyRound className={`w-4 h-4 ${p.code_set ? "text-green-600" : "text-amber-500"}`} />
                                    <span className="flex-1 truncate">{p.title ?? p.marker_id}</span>
                                    <span className={`text-xs ${p.code_set ? "text-green-700" : "text-amber-700"}`}>
                                        {p.code_set ? "Code set" : "No code"}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>
            </div>
        </div>
    );
}

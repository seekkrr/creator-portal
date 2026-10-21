import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Film, Images, QrCode, KeyRound, ShieldQuestion, XCircle } from "lucide-react";
import { EmptyState, ErrorState, Skeleton, SkeletonTableRows, StatusFilterPills } from "@components/ui";
import { businessService } from "@services/business.service";
import type { BusinessApplicationItem, ContentItem } from "@services/business.types";
import { useBusiness } from "../context";
import { bkeys, useApplications, useInvalidateBusiness, useUpgradePrompt } from "../queries";
import { PLATFORM_LABELS, daysUntil, formatDate, formatDateTime, socialUrl, usageRightsLabel } from "../utils";
import { ApplicationStatusPill, CreatorAvatar, PageHeader, Pill, UpgradeCallout } from "../components/bits";
import { CreatorProfileDrawer } from "../components/CreatorProfileDrawer";
import { UpgradeDialog } from "../components/UpgradeDialog";

type Tab = "content" | "redemptions";

function AutoCheckBadge({ item }: { item: ContentItem }) {
    const ok = item.auto_check?.ok;
    if (ok === true) {
        return (
            <Pill className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="w-3 h-3" /> Link checked
            </Pill>
        );
    }
    if (ok === false) {
        return (
            <span title={item.auto_check?.reason ?? undefined}>
                <Pill className="bg-amber-50 text-amber-700 border-amber-200">
                    <XCircle className="w-3 h-3" /> Couldn't verify
                </Pill>
            </span>
        );
    }
    return (
        <Pill className="bg-neutral-100 text-neutral-600 border-neutral-200">
            <ShieldQuestion className="w-3 h-3" /> Unverified
        </Pill>
    );
}

function RightsCell({ item }: { item: ContentItem }) {
    const left = daysUntil(item.usage_expires_at);
    return (
        <div>
            <p className="text-sm text-neutral-800">{usageRightsLabel(item.usage_rights)}</p>
            {item.usage_expires_at && (
                <p className={`text-xs ${left !== null && left <= 3 ? "text-amber-700" : "text-neutral-500"}`}>
                    {left !== null && left < 0 ? "Expired" : "Until"} {formatDate(item.usage_expires_at)}
                </p>
            )}
        </div>
    );
}

function ContentLibrary() {
    const { businessId } = useBusiness();
    const content = useQuery({
        queryKey: bkeys.content(businessId),
        queryFn: () => businessService.content(businessId),
        staleTime: 60_000,
    });
    const [type, setType] = useState("all");

    if (content.isLoading) return <Skeleton height={320} />;
    if (content.isError || !content.data) {
        return <ErrorState message="We couldn't load your content library." onRetry={() => void content.refetch()} />;
    }

    const { items, total, full_access } = content.data;

    if (!full_access) {
        return (
            <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                        <Film className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-neutral-900">{total}</p>
                        <p className="text-sm text-neutral-500">pieces of creator content delivered to you so far</p>
                    </div>
                </div>
                <UpgradeCallout
                    title="Unlock your content library"
                    plainTitle="Your content library"
                    description="See every reel, post and review creators made for you — with link checks, reuse rights and expiry dates — on Growth and above."
                />
            </div>
        );
    }

    const types = Array.from(new Set(items.map((i) => i.type))).sort();
    const shown = type === "all" ? items : items.filter((i) => i.type === type);

    if (items.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-neutral-200">
                <EmptyState
                    icon={<Images className="w-7 h-7" />}
                    title="Your content library is empty"
                    description="When creators redeem a UGC brief, they post within its deadline and submit their links. Everything lands here with its reuse rights."
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {types.length > 1 && (
                <StatusFilterPills
                    filters={[{ label: "All", value: "all" }, ...types.map((t) => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))]}
                    active={type}
                    onChange={setType}
                />
            )}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[820px]">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            {["Creator", "Content", "Check", "Usage rights", "UGC brief"].map((h) => (
                                <th key={h} className="py-3 px-5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {shown.map((item, i) => {
                            const handle = item.creator.socials.find((s) => s.handle);
                            const profileUrl = handle ? socialUrl(handle.platform, handle.handle) : null;
                            return (
                                <tr key={`${item.application_id}-${i}`} className="align-top">
                                    <td className="py-3.5 px-5">
                                        <p className="font-medium text-neutral-900">{item.creator.display_name}</p>
                                        {handle && (
                                            <a
                                                href={profileUrl ?? undefined}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary-700 hover:underline"
                                            >
                                                {PLATFORM_LABELS[handle.platform] ?? handle.platform} @{handle.handle?.replace(/^@/, "")}
                                            </a>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-5 max-w-[18rem]">
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline break-all"
                                        >
                                            Open {item.type} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                        </a>
                                        <p className="text-xs text-neutral-500 mt-0.5">{formatDateTime(item.submitted_at)}</p>
                                        {item.auto_check?.thumbnail && (
                                            <img
                                                src={item.auto_check.thumbnail}
                                                alt=""
                                                className="mt-2 w-28 h-16 object-cover rounded-lg border border-neutral-200"
                                                loading="lazy"
                                            />
                                        )}
                                    </td>
                                    <td className="py-3.5 px-5">
                                        <AutoCheckBadge item={item} />
                                        {item.auto_check?.author && (
                                            <p className="text-xs text-neutral-500 mt-1">by {item.auto_check.author}</p>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-5">
                                        <RightsCell item={item} />
                                    </td>
                                    <td className="py-3.5 px-5 text-sm text-neutral-700 max-w-[14rem]">
                                        <p className="truncate">{item.collab_offer ?? "—"}</p>
                                        <div className="mt-1">
                                            <ApplicationStatusPill status={item.status} />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Redemptions() {
    const invalidate = useInvalidateBusiness();
    const { notifyError, upgrade } = useUpgradePrompt();
    const active = useApplications({ group: "active" });
    const completed = useApplications({ group: "completed" });
    const [selected, setSelected] = useState<BusinessApplicationItem | null>(null);

    const rows = useMemo(
        () =>
            [...(active.data ?? []), ...(completed.data ?? [])]
                .filter((a) => a.redemption)
                .sort((a, b) => (b.redemption?.at ?? "").localeCompare(a.redemption?.at ?? "")),
        [active.data, completed.data]
    );
    const loading = active.isLoading || completed.isLoading;
    const error = active.isError || completed.isError;

    return (
        <>
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            {["Creator", "UGC brief", "Redeemed", "Content", "Status"].map((h) => (
                                <th key={h} className="py-3 px-5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <SkeletonTableRows columns={5} rows={4} />
                        ) : error ? (
                            <tr>
                                <td colSpan={5} className="p-0">
                                    <ErrorState
                                        message="We couldn't load redemptions."
                                        onRetry={() => {
                                            void active.refetch();
                                            void completed.refetch();
                                        }}
                                    />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-0">
                                    <EmptyState
                                        icon={<KeyRound className="w-7 h-7" />}
                                        title="No redemptions yet"
                                        description="A creator redeems when your staff types your 4-digit code on their phone (or scans their QR in the SeekKrr app). Each redemption shows up here."
                                    />
                                </td>
                            </tr>
                        ) : (
                            rows.map((a) => {
                                const due = daysUntil(a.due_at);
                                return (
                                    <tr key={a.id} className="hover:bg-neutral-50/70 cursor-pointer" onClick={() => setSelected(a)}>
                                        <td className="py-3.5 px-5">
                                            <div className="flex items-center gap-3">
                                                <CreatorAvatar name={a.creator.display_name} url={a.creator.avatar_url} size={34} />
                                                <span className="font-medium text-neutral-900">{a.creator.display_name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-5 text-sm text-neutral-700 max-w-[14rem] truncate">{a.collab?.offer ?? "—"}</td>
                                        <td className="py-3.5 px-5 text-sm text-neutral-700">
                                            {formatDateTime(a.redemption?.at)}
                                            <p className="text-xs text-neutral-500 inline-flex items-center gap-1">
                                                {a.redemption?.method === "staff_qr" ? (
                                                    <>
                                                        <QrCode className="w-3 h-3" /> Staff scanned QR
                                                    </>
                                                ) : (
                                                    <>
                                                        <KeyRound className="w-3 h-3" /> Redeem code
                                                    </>
                                                )}
                                            </p>
                                        </td>
                                        <td className="py-3.5 px-5 text-sm">
                                            {a.deliverables.length > 0 ? (
                                                <span className="text-neutral-800">
                                                    {a.deliverables.length} link{a.deliverables.length > 1 ? "s" : ""}
                                                </span>
                                            ) : a.due_at ? (
                                                <span className={due !== null && due < 0 ? "text-red-600" : "text-neutral-500"}>
                                                    Due {formatDate(a.due_at)}
                                                </span>
                                            ) : (
                                                <span className="text-neutral-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-5">
                                            <ApplicationStatusPill status={a.status} />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
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
            <UpgradeDialog {...upgrade} />
        </>
    );
}

export function ContentPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab: Tab = searchParams.get("tab") === "redemptions" ? "redemptions" : "content";
    return (
        <div className="space-y-6">
            <PageHeader
                title="Redemptions & content"
                description="Every redemption at your places, and the posts creators made for you."
            />
            <StatusFilterPills
                filters={[
                    { label: "Content library", value: "content" },
                    { label: "Redemptions", value: "redemptions" },
                ]}
                active={tab}
                onChange={(t) => {
                    const next = new URLSearchParams(searchParams);
                    next.set("tab", t);
                    setSearchParams(next, { replace: true });
                }}
            />
            {tab === "content" ? <ContentLibrary /> : <Redemptions />}
        </div>
    );
}

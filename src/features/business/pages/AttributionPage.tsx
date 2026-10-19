import { useQuery } from "@tanstack/react-query";
import { MapPin, MousePointerClick, Smartphone, LineChart } from "lucide-react";
import { EmptyState, ErrorState, Skeleton } from "@components/ui";
import { businessService } from "@services/business.service";
import { useBusiness } from "../context";
import { bkeys, useCollabs } from "../queries";
import { KpiCard, PageHeader, SectionCard, UpgradeCallout } from "../components/bits";

function pct(n: number, d: number): string {
    return d > 0 ? `${Math.round((n / d) * 100)}%` : "—";
}

export function AttributionPage() {
    const { businessId } = useBusiness();
    const attribution = useQuery({
        queryKey: bkeys.attribution(businessId),
        queryFn: () => businessService.attribution(businessId),
        staleTime: 60_000,
    });
    const collabs = useCollabs(true);
    const collabName = (id: string) => collabs.data?.find((c) => c.id === id)?.offer ?? "Collab";

    if (attribution.isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton height={40} className="w-64" />
                <Skeleton height={120} />
                <Skeleton height={240} />
            </div>
        );
    }
    if (attribution.isError || !attribution.data) {
        return <ErrorState message="We couldn't load attribution." onRetry={() => void attribution.refetch()} />;
    }

    const { totals, by_creator, full_breakdown } = attribution.data;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Attribution"
                description="Each creator shares a tracking link with their post. We count the clicks, app opens and check-ins it brings to your place."
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard label="Link clicks" value={totals.click} icon={<MousePointerClick className="w-5 h-5" />} tone="blue" />
                <KpiCard
                    label="App opens"
                    value={totals.app_open}
                    icon={<Smartphone className="w-5 h-5" />}
                    tone="violet"
                    hint={`${pct(totals.app_open, totals.click)} of clicks`}
                />
                <KpiCard
                    label="Check-ins"
                    value={totals.checkin}
                    icon={<MapPin className="w-5 h-5" />}
                    tone="green"
                    hint={`${pct(totals.checkin, totals.app_open || totals.click)} of ${totals.app_open ? "app opens" : "clicks"}`}
                />
            </div>

            {!full_breakdown ? (
                <UpgradeCallout
                    title="See which creators bring people in"
                    description="Growth and Pro break attribution down per creator and per collab, so you know who to invite again."
                />
            ) : by_creator.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200">
                    <EmptyState
                        icon={<LineChart className="w-7 h-7" />}
                        title="No tracked visits yet"
                        description="After redeeming, creators get a personal link to share. When their followers tap it, open the app and check in at your place, it shows up here."
                    />
                </div>
            ) : (
                <SectionCard title="By creator" description="Sorted by check-ins">
                    <div className="overflow-x-auto -mx-5">
                        <table className="w-full text-left border-collapse min-w-[640px]">
                            <thead>
                                <tr className="border-b border-neutral-200">
                                    {["Creator", "Clicks", "App opens", "Check-ins", "Collabs"].map((h, i) => (
                                        <th
                                            key={h}
                                            className={`py-2.5 px-5 text-xs font-semibold text-neutral-500 uppercase tracking-wider ${i > 0 && i < 4 ? "text-right" : ""}`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {by_creator.map((row) => (
                                    <tr key={row.creator_user_id}>
                                        <td className="py-3 px-5 font-medium text-neutral-900">{row.creator_name}</td>
                                        <td className="py-3 px-5 text-right tabular-nums">{row.click}</td>
                                        <td className="py-3 px-5 text-right tabular-nums">{row.app_open}</td>
                                        <td className="py-3 px-5 text-right tabular-nums font-semibold text-primary-800">{row.checkin}</td>
                                        <td className="py-3 px-5 text-sm text-neutral-600">
                                            {row.collab_ids.map((id) => collabName(id)).join(", ")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}
        </div>
    );
}

import { useQuery } from "@tanstack/react-query";
import { MapPin, Percent, Ticket, TicketCheck } from "lucide-react";
import { Skeleton } from "@components/ui";
import { offerService } from "@services/offer.service";
import { bkeys } from "../queries";
import { KpiCard } from "../components/bits";

/** Check-in offer ROI for one place (`GET /api/v2/offers/business/{marker}/analytics`). */
export function OfferAnalyticsCards({ markerId }: { markerId: string }) {
    const { data: stats, isLoading, isError } = useQuery({
        queryKey: bkeys.offerAnalytics(markerId),
        queryFn: () => offerService.getBusinessAnalytics(markerId),
        staleTime: 60_000,
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} height={88} />
                ))}
            </div>
        );
    }
    if (isError || !stats) return null;

    return (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Check-ins" value={stats.total_checkins} icon={<MapPin className="w-5 h-5" />} tone="blue" />
            <KpiCard label="Coupons issued" value={stats.coupons_generated} icon={<Ticket className="w-5 h-5" />} tone="violet" />
            <KpiCard label="Coupons redeemed" value={stats.coupons_redeemed} icon={<TicketCheck className="w-5 h-5" />} tone="green" />
            <KpiCard label="Conversion" value={`${stats.conversion_rate}%`} icon={<Percent className="w-5 h-5" />} tone="amber" />
        </div>
    );
}

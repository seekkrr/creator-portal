import React, { useEffect, useState } from "react";
import { offerService, type BusinessAnalytics } from "@/services/offer.service";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface Props {
    markerId: string;
}

export const BusinessAnalyticsCards: React.FC<Props> = ({ markerId }) => {
    const [stats, setStats] = useState<BusinessAnalytics | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await offerService.getBusinessAnalytics(markerId);
                setStats(data);
            } catch (err) {
                console.error("Failed to load analytics", err);
            }
        };
        fetchStats();
    }, [markerId]);

    if (!stats) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        );
    }

    const cards = [
        { label: "Total Check-ins", value: stats.total_checkins, color: "text-blue-600" },
        { label: "Coupons Generated", value: stats.coupons_generated, color: "text-indigo-600" },
        { label: "Coupons Redeemed", value: stats.coupons_redeemed, color: "text-emerald-600" },
        { label: "Conversion Rate", value: `${stats.conversion_rate}%`, color: "text-orange-600" },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {cards.map((card, i) => (
                <Card key={i} className="p-6 flex flex-col justify-center items-center text-center">
                    <p className="text-sm font-medium text-slate-500 mb-1">{card.label}</p>
                    <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                </Card>
            ))}
        </div>
    );
};

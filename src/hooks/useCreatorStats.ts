import { useEffect, useState } from "react";
import { creatorService } from "@services/creator.service";
import { useAuthStore } from "@store/auth.store";
import type { CreatorAnalyticsSummary } from "@/types";

export interface CreatorStats {
    total_quests: number;
    travelers_served: number;
    total_earnings: number;
    pending_payouts: number;
    rating: number | null;
    review_count: number;
    /** true until the live analytics call resolves (or fails). */
    loading: boolean;
    /** true once the live /analytics/summary call succeeded. */
    fromLive: boolean;
}

/**
 * Headline creator stats for the dashboard / profile.
 *
 * Reads live from `GET /creators/me/analytics/summary` on mount and falls back
 * to the creator object cached in the auth store (persisted at login) for each
 * field if the live call hasn't resolved or fails. This keeps the numbers fresh
 * without blocking first paint or breaking when analytics is unavailable.
 */
export function useCreatorStats(): CreatorStats {
    const creator = useAuthStore((s) => s.creator);
    const [summary, setSummary] = useState<CreatorAnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        creatorService
            .getAnalyticsSummary()
            .then((s) => {
                if (!cancelled) setSummary(s);
            })
            .catch(() => {
                /* fall back to cached creator below */
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return {
        total_quests: summary?.total_quests ?? creator?.total_quests ?? 0,
        travelers_served: summary?.travelers_served ?? creator?.travelers_served ?? 0,
        total_earnings: summary?.total_earnings ?? creator?.total_earnings ?? 0,
        pending_payouts: summary?.pending_payouts ?? creator?.pending_payouts ?? 0,
        rating: summary?.rating ?? creator?.rating ?? null,
        review_count: summary?.review_count ?? creator?.review_count ?? 0,
        loading,
        fromLive: summary !== null,
    };
}

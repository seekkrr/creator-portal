import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";
import type {
    Creator,
    CreatorOnboarding,
    UpdateCreatorProfilePayload,
    CreatorAnalyticsSummary,
    CreatorQuestBreakdownRow,
    CreatorEarningsPoint,
    EarningsInterval,
} from "@/types";

export interface AnalyticsDateRange {
    /** ISO date string. Backend reads it as the `from` query param. */
    from?: string;
    to?: string;
}

export const creatorService = {
    /**
     * Current creator's own profile (enriched: creator fields + user identity).
     * GET /api/v2/creators/me → { success, creator }
     */
    async getMe(): Promise<Creator> {
        const res = await api.get<{ creator: Creator }>(API_ENDPOINTS.CREATORS.ME);
        return res.data.creator;
    },

    /**
     * Update own creator profile (tagline, bio, badge).
     * PUT /api/v2/creators/me → { success, creator }
     */
    async updateProfile(payload: UpdateCreatorProfilePayload): Promise<Creator> {
        const res = await api.put<{ creator: Creator }>(API_ENDPOINTS.CREATORS.ME, payload);
        return res.data.creator;
    },

    /**
     * Onboarding checklist.
     * GET /api/v2/creators/me/onboarding-status → { success, onboarding }
     */
    async getOnboarding(): Promise<CreatorOnboarding> {
        const res = await api.get<{ onboarding: CreatorOnboarding }>(
            API_ENDPOINTS.CREATORS.ME_ONBOARDING
        );
        return res.data.onboarding;
    },

    /**
     * Headline analytics counters.
     * GET /api/v2/creators/me/analytics/summary → { success, data }
     */
    async getAnalyticsSummary(): Promise<CreatorAnalyticsSummary> {
        const res = await api.get<{ data: CreatorAnalyticsSummary }>(
            API_ENDPOINTS.CREATORS.ME_ANALYTICS_SUMMARY
        );
        return res.data.data;
    },

    /**
     * Per-quest performance breakdown (earnings, completions, rating).
     * GET /api/v2/creators/me/analytics/quests → { success, data: [...] }
     */
    async getAnalyticsQuests(range: AnalyticsDateRange = {}): Promise<CreatorQuestBreakdownRow[]> {
        const res = await api.get<{ data: CreatorQuestBreakdownRow[] }>(
            API_ENDPOINTS.CREATORS.ME_ANALYTICS_QUESTS,
            { params: range }
        );
        return res.data.data;
    },

    /**
     * Earnings timeline bucketed by interval (default monthly).
     * GET /api/v2/creators/me/analytics/earnings → { success, data: [...] }
     */
    async getAnalyticsEarnings(
        range: AnalyticsDateRange & { interval?: EarningsInterval } = {}
    ): Promise<CreatorEarningsPoint[]> {
        const res = await api.get<{ data: CreatorEarningsPoint[] }>(
            API_ENDPOINTS.CREATORS.ME_ANALYTICS_EARNINGS,
            { params: range }
        );
        return res.data.data;
    },
};

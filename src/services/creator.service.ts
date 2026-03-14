import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";

export interface CreatorStats {
    total_quests: number;
    total_earnings: number;
    impressions: number;
    last_updated: string;
}

export interface CreatorDetails {
    creator_profile: {
        _id: string;
        user_id: string;
        status: string;
        is_verified: boolean;
        stats_id: string;
    };
    stats: CreatorStats;
}

export const creatorService = {
    /**
     * Get creator details including stats
     */
    async getStats(userId: string): Promise<CreatorDetails> {
        const response = await api.get<CreatorDetails>(
            API_ENDPOINTS.CREATORS.BY_USER_ID(userId),
            { params: { include_stats: true } }
        );
        return response.data;
    },
};

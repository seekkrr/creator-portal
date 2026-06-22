import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";
import type { Creator, CreatorOnboarding, UpdateCreatorProfilePayload } from "@/types";

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
};

import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";
import { normalizeId, toPaginated } from "./_helpers";
import type {
    StepReward,
    RewardContextType,
    CreateStepRewardPayload,
    UpdateStepRewardPayload,
    Paginated,
} from "@/types";

export interface ListRewardsParams {
    context_type?: RewardContextType;
    context_id?: string;
    page?: number;
    page_size?: number;
}

/** Result of evaluating a reward's bonus conditions against a runtime context. */
export interface RewardEvaluation {
    reward_id: string;
    base_points: number;
    bonus_points: number;
    total_points: number;
}

export const rewardService = {
    /** GET /api/v2/rewards → { rewards, total, page, page_size, total_pages } */
    async listRewards(params: ListRewardsParams = {}): Promise<Paginated<StepReward>> {
        const res = await api.get<Record<string, unknown>>(API_ENDPOINTS.REWARDS.BASE, { params });
        const page = toPaginated<Record<string, unknown>>(res.data, "rewards");
        return { ...page, items: page.items.map((r) => normalizeId<StepReward>(r)) };
    },

    /** The reward configured for a given context, or null. */
    async getRewardForContext(
        contextType: RewardContextType,
        contextId: string
    ): Promise<StepReward | null> {
        const res = await api.get<{ reward: Record<string, unknown> | null }>(
            API_ENDPOINTS.REWARDS.FOR_CONTEXT,
            { params: { context_type: contextType, context_id: contextId } }
        );
        return res.data.reward ? normalizeId<StepReward>(res.data.reward) : null;
    },

    async createReward(payload: CreateStepRewardPayload): Promise<StepReward> {
        const res = await api.post<{ reward: Record<string, unknown> }>(
            API_ENDPOINTS.REWARDS.CREATE,
            payload
        );
        return normalizeId<StepReward>(res.data.reward);
    },

    async getReward(rewardId: string): Promise<StepReward> {
        const res = await api.get<{ reward: Record<string, unknown> }>(
            API_ENDPOINTS.REWARDS.BY_ID(rewardId)
        );
        return normalizeId<StepReward>(res.data.reward);
    },

    async updateReward(rewardId: string, payload: UpdateStepRewardPayload): Promise<StepReward> {
        const res = await api.put<{ reward: Record<string, unknown> }>(
            API_ENDPOINTS.REWARDS.BY_ID(rewardId),
            payload
        );
        return normalizeId<StepReward>(res.data.reward);
    },

    /** Soft delete by default; `hard` requires super_admin on the backend. */
    async deleteReward(rewardId: string, hard = false): Promise<void> {
        await api.delete(API_ENDPOINTS.REWARDS.BY_ID(rewardId), { params: { hard } });
    },

    /** Evaluate bonus conditions against a runtime context. */
    async evaluateReward(
        rewardId: string,
        context: Record<string, unknown>
    ): Promise<RewardEvaluation> {
        const res = await api.post<RewardEvaluation>(API_ENDPOINTS.REWARDS.EVALUATE(rewardId), {
            context,
        });
        return res.data;
    },
};

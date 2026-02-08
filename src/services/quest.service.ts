import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";
import type {
    Quest,
    QuestWithDetails,
    CreateQuestPayload,
    PaginatedResponse,
} from "@/types";

export interface CreateQuestResponse {
    quest: Quest;
    steps: Array<{ _id: string; order: number }>;
}

export interface ListQuestsParams {
    page?: number;
    per_page?: number;
    status?: string;
    created_by?: string;
}

export const questService = {
    /**
     * Create a new quest
     */
    async createQuest(payload: CreateQuestPayload): Promise<CreateQuestResponse> {
        const response = await api.post<CreateQuestResponse>(
            API_ENDPOINTS.QUESTS.CREATE,
            payload
        );
        return response.data;
    },

    /**
     * Get quest by ID with all details
     */
    async getQuestById(questId: string): Promise<QuestWithDetails> {
        const response = await api.get<{
            quest: Quest;
            metadata: QuestWithDetails["metadata"];
            location: QuestWithDetails["location"];
            media: QuestWithDetails["media"];
            steps: QuestWithDetails["steps"];
        }>(API_ENDPOINTS.QUESTS.BY_ID(questId));

        return {
            ...response.data.quest,
            metadata: response.data.metadata,
            location: response.data.location,
            media: response.data.media,
            steps: response.data.steps,
        };
    },

    /**
     * List quests with pagination
     */
    async listQuests(
        params: ListQuestsParams = {}
    ): Promise<PaginatedResponse<Quest>> {
        const response = await api.get<{ quests: Quest[]; pagination: PaginatedResponse<Quest>["pagination"] }>(
            API_ENDPOINTS.QUESTS.BASE,
            { params }
        );
        return {
            items: response.data.quests,
            pagination: response.data.pagination,
        };
    },

    /**
     * Update quest
     */
    async updateQuest(
        questId: string,
        payload: Partial<CreateQuestPayload>
    ): Promise<QuestWithDetails> {
        const response = await api.put<QuestWithDetails>(
            API_ENDPOINTS.QUESTS.BY_ID(questId),
            payload
        );
        return response.data;
    },

    /**
     * Delete quest
     */
    async deleteQuest(questId: string, hardDelete = false): Promise<void> {
        await api.delete(API_ENDPOINTS.QUESTS.BY_ID(questId), {
            params: { hard_delete: hardDelete },
        });
    },
};

import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";
import { toPaginated } from "./_helpers";
import type {
    Quest,
    QuestDetail,
    QuestListItem,
    CreateQuestPayload,
    UpdateQuestPayload,
    Paginated,
} from "@/types";

export interface ListQuestsParams {
    page?: number;
    page_size?: number;
    /** Single status filter (Title-Case, e.g. "Published"). */
    status?: string;
    /** Comma-separated statuses (staff only on the backend). */
    statuses?: string;
    region_id?: string;
    theme?: string;
    difficulty?: string;
    search?: string;
    sort_by?: string;
    sort_order?: number;
}

export interface MyQuestsParams {
    page?: number;
    page_size?: number;
    status?: string;
}

export const questService = {
    /**
     * Create a quest. Returns the public (owner) shape with marker_playlist.
     * Pass `submit: true` in the payload to create directly in "Under Review".
     */
    async createQuest(payload: CreateQuestPayload): Promise<Quest> {
        const res = await api.post<{ quest: Quest }>(API_ENDPOINTS.QUESTS.CREATE, payload);
        return res.data.quest;
    },

    /**
     * Public/discovery list. Non-staff callers only ever see "Published".
     * GET /api/v2/quests → { quests, total, page, page_size, total_pages }
     */
    async listQuests(params: ListQuestsParams = {}): Promise<Paginated<QuestListItem>> {
        const res = await api.get<Record<string, unknown>>(API_ENDPOINTS.QUESTS.BASE, { params });
        return toPaginated<QuestListItem>(res.data, "quests");
    },

    /**
     * The current creator's own quests (any status).
     * GET /api/v2/quests/me → { quests, total, page, page_size, total_pages }
     */
    async getMyQuests(params: MyQuestsParams = {}): Promise<Paginated<QuestListItem>> {
        const res = await api.get<Record<string, unknown>>(API_ENDPOINTS.QUESTS.ME, { params });
        return toPaginated<QuestListItem>(res.data, "quests");
    },

    /**
     * Enriched detail (creator/region summaries, marker_summaries, start_point).
     * Note: this shape does NOT carry the raw marker_playlist — to prefill the
     * edit wizard, use the Quest returned by create/update instead.
     */
    async getQuestById(questId: string): Promise<QuestDetail> {
        const res = await api.get<{ quest: QuestDetail }>(API_ENDPOINTS.QUESTS.BY_ID(questId));
        return res.data.quest;
    },

    /** Update a quest (only Draft / Changes Requested are creator-editable). */
    async updateQuest(questId: string, payload: UpdateQuestPayload): Promise<Quest> {
        const res = await api.put<{ quest: Quest }>(API_ENDPOINTS.QUESTS.BY_ID(questId), payload);
        return res.data.quest;
    },

    /** Soft delete by default; `hard` requires super_admin on the backend. */
    async deleteQuest(questId: string, hard = false): Promise<void> {
        await api.delete(API_ENDPOINTS.QUESTS.BY_ID(questId), { params: { hard } });
    },

    /** Draft | Changes Requested → Under Review. */
    async submitQuest(questId: string): Promise<Quest> {
        const res = await api.post<{ quest: Quest }>(API_ENDPOINTS.QUESTS.SUBMIT(questId));
        return res.data.quest;
    },

    /** Under Review → Draft (creator pull-back). */
    async retractQuest(questId: string): Promise<Quest> {
        const res = await api.post<{ quest: Quest }>(API_ENDPOINTS.QUESTS.RETRACT(questId));
        return res.data.quest;
    },
};

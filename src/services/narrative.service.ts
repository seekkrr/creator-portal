import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";
import { normalizeId, toPaginated } from "./_helpers";
import type {
    Narrative,
    NarrativeAttachType,
    NarrativeAttachSummary,
    NarrativeAudioStatusResponse,
    CreateNarrativePayload,
    UpdateNarrativePayload,
    Paginated,
} from "@/types";

export interface ListNarrativesParams {
    attach_type?: NarrativeAttachType;
    attach_id?: string;
    status?: string;
    chain_id?: string;
    /** Only the caller's own narratives (all statuses). */
    mine?: boolean;
    search?: string;
    sort_by?: string;
    sort_order?: number;
    page?: number;
    page_size?: number;
}

function mapList(body: Record<string, unknown>): Paginated<Narrative> {
    const page = toPaginated<Record<string, unknown>>(body, "narratives");
    return { ...page, items: page.items.map((n) => normalizeId<Narrative>(n)) };
}

export const narrativeService = {
    /**
     * Create a narrative attached to a marker / quest / region. Creators may set
     * status draft|under_review; chain via chain_id + sequence_order, or pass
     * chain_with to chain onto an existing narrative.
     * POST /api/v2/narratives → { success, narrative }
     */
    async createNarrative(payload: CreateNarrativePayload): Promise<Narrative> {
        const res = await api.post<{ narrative: Record<string, unknown> }>(
            API_ENDPOINTS.NARRATIVES.CREATE,
            payload
        );
        return normalizeId<Narrative>(res.data.narrative);
    },

    /** Filtered list. GET /api/v2/narratives → { narratives, total, page, ... } */
    async listNarratives(params: ListNarrativesParams = {}): Promise<Paginated<Narrative>> {
        const res = await api.get<Record<string, unknown>>(API_ENDPOINTS.NARRATIVES.BASE, {
            params,
        });
        return mapList(res.data);
    },

    /** Narratives attached to a specific target, ordered by sequence_order. */
    async getByAttachment(
        attachType: NarrativeAttachType,
        attachId: string,
        params: Omit<ListNarrativesParams, "attach_type" | "attach_id"> = {}
    ): Promise<Paginated<Narrative>> {
        const res = await api.get<Record<string, unknown>>(
            API_ENDPOINTS.NARRATIVES.BY_ATTACH(attachType, attachId),
            { params }
        );
        return mapList(res.data);
    },

    /** All narratives in a chain, ordered by sequence_order. */
    async getByChain(
        chainId: string,
        params: Omit<ListNarrativesParams, "chain_id"> = {}
    ): Promise<Paginated<Narrative>> {
        const res = await api.get<Record<string, unknown>>(
            API_ENDPOINTS.NARRATIVES.BY_CHAIN(chainId),
            { params }
        );
        return mapList(res.data);
    },

    /** Summarise active narratives on an attach target (chain selector / conflict pre-check). */
    async getAttachSummary(
        attachType: NarrativeAttachType,
        attachId: string
    ): Promise<NarrativeAttachSummary> {
        const res = await api.get<NarrativeAttachSummary>(
            API_ENDPOINTS.NARRATIVES.ATTACH_SUMMARY,
            { params: { attach_type: attachType, attach_id: attachId } }
        );
        return res.data;
    },

    async getNarrativeById(narrativeId: string): Promise<Narrative> {
        const res = await api.get<{ narrative: Record<string, unknown> }>(
            API_ENDPOINTS.NARRATIVES.BY_ID(narrativeId)
        );
        return normalizeId<Narrative>(res.data.narrative);
    },

    async updateNarrative(
        narrativeId: string,
        payload: UpdateNarrativePayload
    ): Promise<Narrative> {
        const res = await api.put<{ narrative: Record<string, unknown> }>(
            API_ENDPOINTS.NARRATIVES.BY_ID(narrativeId),
            payload
        );
        return normalizeId<Narrative>(res.data.narrative);
    },

    /** Soft delete by default; `hard` requires elevated permission on the backend. */
    async deleteNarrative(narrativeId: string, hard = false): Promise<void> {
        await api.delete(API_ENDPOINTS.NARRATIVES.BY_ID(narrativeId), { params: { hard } });
    },

    /** Submit a draft narrative for review. */
    async submitNarrative(narrativeId: string): Promise<Narrative> {
        const res = await api.post<{ narrative: Record<string, unknown> }>(
            API_ENDPOINTS.NARRATIVES.SUBMIT(narrativeId)
        );
        return normalizeId<Narrative>(res.data.narrative);
    },

    /** Trigger ElevenLabs audio generation (requires voice_persona + content). */
    async generateAudio(narrativeId: string): Promise<{ audio_status: string }> {
        const res = await api.post<{ audio_status: string }>(
            API_ENDPOINTS.NARRATIVES.AUDIO_GENERATE(narrativeId)
        );
        return res.data;
    },

    /** Clear any generated audio on a narrative. */
    async clearAudio(narrativeId: string): Promise<void> {
        await api.delete(API_ENDPOINTS.NARRATIVES.AUDIO(narrativeId));
    },

    /** Poll audio generation status. */
    async getAudioStatus(narrativeId: string): Promise<NarrativeAudioStatusResponse> {
        const res = await api.get<NarrativeAudioStatusResponse>(
            API_ENDPOINTS.NARRATIVES.AUDIO_STATUS(narrativeId)
        );
        return res.data;
    },
};

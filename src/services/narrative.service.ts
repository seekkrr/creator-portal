import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";
import type { NarrativeResponse, CloudinaryAsset } from "@/types";

export interface CreateNarrativePayload {
  quest_id: string;
  from_step_id: string;
  to_step_id: string;
  content: string;
  title?: string;
  trigger_location?: { type: "Point"; coordinates: [number, number] };
  trigger_radius_m?: number;
  is_mandatory?: boolean;
  media?: CloudinaryAsset[];
}

export interface UpdateNarrativePayload {
  content?: string;
  title?: string;
  trigger_location?: { type: "Point"; coordinates: [number, number] };
  trigger_radius_m?: number;
  is_mandatory?: boolean;
  media?: CloudinaryAsset[];
}

export interface QuestNarrativesResponse {
  quest_id: string;
  narratives: NarrativeResponse[];
  count: number;
}

export const narrativeService = {
  /**
   * Create a narrative segment between two quest steps
   */
  async createNarrative(
    payload: CreateNarrativePayload
  ): Promise<{ message: string; narrative: NarrativeResponse }> {
    const response = await api.post<{ message: string; narrative: NarrativeResponse }>(
      API_ENDPOINTS.NARRATIVES.CREATE,
      payload
    );
    return response.data;
  },

  /**
   * Get all narratives for a quest
   */
  async getNarrativesByQuest(questId: string): Promise<QuestNarrativesResponse> {
    const response = await api.get<QuestNarrativesResponse>(
      API_ENDPOINTS.NARRATIVES.BY_QUEST(questId)
    );
    return response.data;
  },

  /**
   * Update an existing narrative
   */
  async updateNarrative(
    narrativeId: string,
    payload: UpdateNarrativePayload
  ): Promise<{ message: string; narrative: NarrativeResponse }> {
    const response = await api.put<{ message: string; narrative: NarrativeResponse }>(
      API_ENDPOINTS.NARRATIVES.BY_ID(narrativeId),
      payload
    );
    return response.data;
  },

  /**
   * Delete a narrative (soft delete)
   */
  async deleteNarrative(narrativeId: string): Promise<void> {
    await api.delete(API_ENDPOINTS.NARRATIVES.BY_ID(narrativeId));
  },
};

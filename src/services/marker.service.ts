import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";
import { toPaginated } from "./_helpers";
import type { Marker, CreateMarkerPayload, UpdateMarkerPayload, Paginated } from "@/types";

export interface ListMarkersParams {
    /** Defaults to "approved" on the backend. */
    status?: string;
    /** Only the caller's own markers (all statuses). */
    mine?: boolean;
    category?: string;
    /** Comma-separated tag list. */
    tags?: string;
    /** Bounding-box filter (all four required together). */
    min_lon?: number;
    min_lat?: number;
    max_lon?: number;
    max_lat?: number;
    search?: string;
    page?: number;
    page_size?: number;
}

export const markerService = {
    /** GET /api/v2/markers → { markers, total, page, page_size, total_pages } */
    async listMarkers(params: ListMarkersParams = {}): Promise<Paginated<Marker>> {
        const res = await api.get<Record<string, unknown>>(API_ENDPOINTS.MARKERS.BASE, { params });
        return toPaginated<Marker>(res.data, "markers");
    },

    /** Create a marker (creator_created, status approved). */
    async createMarker(payload: CreateMarkerPayload): Promise<Marker> {
        const res = await api.post<{ marker: Marker }>(API_ENDPOINTS.MARKERS.CREATE, payload);
        return res.data.marker;
    },

    /**
     * Get a marker by id. For a marker that belongs to a quest the caller hasn't
     * booked, the backend returns a locked teaser (no coordinates, is_locked).
     */
    async getMarker(markerId: string): Promise<Marker> {
        const res = await api.get<{ marker: Marker }>(API_ENDPOINTS.MARKERS.BY_ID(markerId));
        return res.data.marker;
    },

    async updateMarker(markerId: string, payload: UpdateMarkerPayload): Promise<Marker> {
        const res = await api.put<{ marker: Marker }>(
            API_ENDPOINTS.MARKERS.BY_ID(markerId),
            payload
        );
        return res.data.marker;
    },

    /** Soft delete by default; `hard` requires super_admin on the backend. */
    async deleteMarker(markerId: string, hard = false): Promise<void> {
        await api.delete(API_ENDPOINTS.MARKERS.BY_ID(markerId), { params: { hard } });
    },
};

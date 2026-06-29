import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";
import { toPaginated } from "./_helpers";
import type {
    Region,
    RegionListItem,
    RegionType,
    ResolveOrCreateRegionPayload,
    Paginated,
} from "@/types";

export interface ListRegionsParams {
    type?: RegionType;
    parent_id?: string;
    page?: number;
    page_size?: number;
}

export const regionService = {
    /** GET /api/v2/regions → { regions, total, page, page_size, total_pages } */
    async listRegions(params: ListRegionsParams = {}): Promise<Paginated<RegionListItem>> {
        const res = await api.get<Record<string, unknown>>(API_ENDPOINTS.REGIONS.BASE, { params });
        return toPaginated<RegionListItem>(res.data, "regions");
    },

    /** Name search. GET /api/v2/regions/search?q= → { regions, total, ... } */
    async searchRegions(
        q: string,
        params: { page?: number; page_size?: number } = {}
    ): Promise<Paginated<RegionListItem>> {
        const res = await api.get<Record<string, unknown>>(API_ENDPOINTS.REGIONS.SEARCH, {
            params: { q, ...params },
        });
        return toPaginated<RegionListItem>(res.data, "regions");
    },

    /** Full region detail. GET /api/v2/regions/{id} → { region } */
    async getRegion(regionId: string): Promise<Region> {
        const res = await api.get<{ region: Region }>(API_ENDPOINTS.REGIONS.BY_ID(regionId));
        return res.data.region;
    },

    /** Look up an existing region by its Mapbox place id. */
    async resolveRegion(mapboxPlaceId: string): Promise<Region> {
        const res = await api.get<{ region: Region }>(API_ENDPOINTS.REGIONS.RESOLVE, {
            params: { mapbox_place_id: mapboxPlaceId },
        });
        return res.data.region;
    },

    /**
     * Resolve a Mapbox feature into a region, creating it if necessary. This is
     * the only region-mutating call creators make — used during quest building
     * to obtain a region_id to attach a quest to.
     * POST /api/v2/regions/resolve-or-create → { region }
     */
    async resolveOrCreateRegion(payload: ResolveOrCreateRegionPayload): Promise<Region> {
        const res = await api.post<{ region: Region }>(
            API_ENDPOINTS.REGIONS.RESOLVE_OR_CREATE,
            payload
        );
        return res.data.region;
    },
};

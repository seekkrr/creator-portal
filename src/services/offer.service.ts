import { api } from "./api";

export interface BusinessOffer {
    _id?: string;
    marker_id: string;
    rule_type: "quantitative" | "qualitative";
    trigger_n: number;
    reward_type: "flat" | "product";
    product_details?: {
        title: string;
        description?: string;
        image_url?: string;
        discount_value?: number;
    } | null;
    flat_discount_value?: number | null;
    is_active: boolean;
    is_deleted?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface BusinessAnalytics {
    total_checkins: number;
    active_offers: number;
    coupons_generated: number;
    coupons_redeemed: number;
    conversion_rate: number;
}

export const offerService = {
    /**
     * Fetch all offers for a given marker.
     */
    getBusinessOffers: async (markerId: string): Promise<BusinessOffer[]> => {
        const response = await api.get<{ offers: BusinessOffer[] }>(`/offers/business/${markerId}`);
        return response.data.offers;
    },

    /**
     * Create a new business offer.
     */
    createBusinessOffer: async (markerId: string, payload: Partial<BusinessOffer>): Promise<BusinessOffer> => {
        const response = await api.post<{ status: string; offer: BusinessOffer }>(
            `/offers/business/${markerId}`,
            payload
        );
        return response.data.offer;
    },

    /**
     * Update an existing business offer (e.g. toggle is_active).
     */
    updateBusinessOffer: async (offerId: string, payload: Partial<BusinessOffer>): Promise<void> => {
        await api.put(`/offers/business/offer/${offerId}`, payload);
    },
    
    /**
     * Soft delete an offer.
     */
    deleteBusinessOffer: async (offerId: string): Promise<void> => {
        await api.put(`/offers/business/offer/${offerId}`, { is_deleted: true });
    },

    /**
     * Get analytics for the dashboard.
     */
    getBusinessAnalytics: async (markerId: string): Promise<BusinessAnalytics> => {
        const response = await api.get<BusinessAnalytics>(`/offers/business/${markerId}/analytics`);
        return response.data;
    },

    /**
     * Redeem a virtual code manually.
     */
    redeemVirtualCode: async (code: string, secretCode: string): Promise<void> => {
        await api.post(`/offers/redeem`, { 
            code, 
            business_secret_code: secretCode 
        });
    }
};

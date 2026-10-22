import { api } from "./api";
import type {
    BookingsPage,
    BulkSlotsPayload,
    BulkSlotsResult,
    Experience,
    ExperienceBooking,
    ExperiencePayload,
    ExperienceSlot,
    ExperienceStatus,
    ListBookingsParams,
    UpdateSlotPayload,
} from "./experience.types";

const BASE = "/api/v2/businesses";
const biz = (id: string) => `${BASE}/${encodeURIComponent(id)}`;
const exp = (businessId: string, experienceId: string) =>
    `${biz(businessId)}/experiences/${encodeURIComponent(experienceId)}`;

/** Fill list/array defaults so pages never trip over a missing field. */
function normalizeExperience(raw: Experience): Experience {
    return {
        ...raw,
        tags: raw.tags ?? [],
        media: raw.media ?? [],
        highlights: raw.highlights ?? [],
        experience_media: raw.experience_media ?? [],
        itinerary: raw.itinerary ?? [],
        included: raw.included ?? [],
        cancellation_policy: raw.cancellation_policy ?? [],
        faqs: raw.faqs ?? [],
        gallery: raw.gallery ?? [],
        options: raw.options ?? [],
        currency: raw.currency ?? "INR",
        hidden_by_admin: !!raw.hidden_by_admin,
        stats: raw.stats ?? null,
    };
}

/**
 * Experiences API for the Partner Portal (`features.experiences` businesses).
 * Owners and managers edit; staff can list and check in. Errors surface as
 * `ApiRequestError` — 403 when the feature is off, 400/422 with the backend's
 * publish rules (title, description, a photo and an upcoming slot).
 */
export const experienceService = {
    // ── Experiences ──────────────────────────────────────────────────────────

    async list(businessId: string): Promise<Experience[]> {
        const res = await api.get<{ experiences?: Experience[] }>(`${biz(businessId)}/experiences`);
        return (res.data.experiences ?? []).map(normalizeExperience);
    },

    async get(businessId: string, experienceId: string): Promise<Experience> {
        const res = await api.get<{ experience: Experience }>(exp(businessId, experienceId));
        return normalizeExperience(res.data.experience);
    },

    async create(businessId: string, payload: ExperiencePayload): Promise<Experience> {
        const res = await api.post<{ experience: Experience }>(`${biz(businessId)}/experiences`, payload);
        return normalizeExperience(res.data.experience);
    },

    async update(businessId: string, experienceId: string, payload: ExperiencePayload): Promise<Experience> {
        const res = await api.patch<{ experience: Experience }>(exp(businessId, experienceId), payload);
        return normalizeExperience(res.data.experience);
    },

    async setStatus(businessId: string, experienceId: string, status: ExperienceStatus): Promise<Experience> {
        const res = await api.post<{ experience: Experience }>(`${exp(businessId, experienceId)}/status`, { status });
        return normalizeExperience(res.data.experience);
    },

    // ── Slots ────────────────────────────────────────────────────────────────

    async listSlots(
        businessId: string,
        experienceId: string,
        range: { from?: string; to?: string } = {}
    ): Promise<ExperienceSlot[]> {
        const res = await api.get<{ slots?: ExperienceSlot[] }>(`${exp(businessId, experienceId)}/slots`, {
            params: { from: range.from || undefined, to: range.to || undefined },
        });
        return res.data.slots ?? [];
    },

    async createSlots(businessId: string, experienceId: string, payload: BulkSlotsPayload): Promise<BulkSlotsResult> {
        const res = await api.post<BulkSlotsResult>(`${exp(businessId, experienceId)}/slots`, payload);
        return {
            created: res.data.created ?? res.data.slots?.length ?? 0,
            slots: res.data.slots ?? [],
            skipped: typeof res.data.skipped === "number" ? res.data.skipped : undefined,
        };
    },

    async updateSlot(businessId: string, slotId: string, payload: UpdateSlotPayload): Promise<ExperienceSlot | null> {
        const res = await api.patch<{ slot?: ExperienceSlot }>(
            `${biz(businessId)}/experience-slots/${encodeURIComponent(slotId)}`,
            payload
        );
        return res.data.slot ?? null;
    },

    /** Cancels the slot and its bookings' items; the customers are notified. */
    async cancelSlot(businessId: string, slotId: string): Promise<void> {
        await api.delete(`${biz(businessId)}/experience-slots/${encodeURIComponent(slotId)}`);
    },

    // ── Bookings ─────────────────────────────────────────────────────────────

    async listBookings(businessId: string, params: ListBookingsParams = {}): Promise<BookingsPage> {
        const res = await api.get<Partial<BookingsPage>>(`${biz(businessId)}/experience-bookings`, {
            params: {
                experience_id: params.experience_id || undefined,
                date: params.date || undefined,
                status: params.status || undefined,
                page: params.page && params.page > 1 ? params.page : undefined,
            },
        });
        const bookings = res.data.bookings ?? [];
        return {
            bookings,
            total: res.data.total ?? bookings.length,
            page: res.data.page ?? params.page ?? 1,
            page_size: res.data.page_size ?? 0,
        };
    },

    async checkIn(businessId: string, bookingId: string): Promise<ExperienceBooking | null> {
        const res = await api.post<{ booking?: ExperienceBooking }>(
            `${biz(businessId)}/experience-bookings/${encodeURIComponent(bookingId)}/check-in`
        );
        return res.data.booking ?? null;
    },

    /** Check in from the customer's booking QR (`seekkrr://experience-booking/{id}?t=…`). */
    async scan(businessId: string, qr: string): Promise<ExperienceBooking | null> {
        const res = await api.post<{ booking?: ExperienceBooking }>(`${biz(businessId)}/experience-bookings/scan`, {
            qr,
        });
        return res.data.booking ?? null;
    },

    async cancelBooking(businessId: string, bookingId: string, reason: string): Promise<ExperienceBooking | null> {
        const res = await api.post<{ booking?: ExperienceBooking }>(
            `${biz(businessId)}/experience-bookings/${encodeURIComponent(bookingId)}/cancel`,
            { reason }
        );
        return res.data.booking ?? null;
    },
};

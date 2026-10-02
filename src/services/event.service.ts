import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";
import { toPaginated, normalizeId } from "./_helpers";
import type {
    EventDetail,
    EventListItem,
    EventAttendee,
    CreateEventPayload,
    UpdateEventPayload,
    EventStatus,
    Paginated,
} from "@/types";

export interface ListEventsParams {
    status?: string;
    category?: string;
    date_filter?: "today" | "weekend" | "month";
    region_id?: string;
    page?: number;
    page_size?: number;
}

/**
 * Events API for the creator portal. The backend serializes `_id`; we normalize
 * to `id` at this boundary so the rest of the portal only ever sees `id`.
 */
export const eventService = {
    /** GET /api/v2/events/mine → the creator's own events, all statuses. */
    async getMyEvents(params: ListEventsParams = {}): Promise<Paginated<EventListItem>> {
        const res = await api.get<Record<string, unknown>>(API_ENDPOINTS.EVENTS.MINE, { params });
        const page = toPaginated<Record<string, unknown>>(res.data, "events");
        return { ...page, items: page.items.map((e) => normalizeId<EventListItem>(e)) };
    },

    /** GET /api/v2/events/{id} → full detail. */
    async getEvent(id: string): Promise<EventDetail> {
        const res = await api.get<{ event: Record<string, unknown> }>(API_ENDPOINTS.EVENTS.BY_ID(id));
        return normalizeId<EventDetail>(res.data.event);
    },

    /** POST /api/v2/events → create. */
    async createEvent(payload: CreateEventPayload): Promise<EventDetail> {
        const res = await api.post<{ event: Record<string, unknown> }>(
            API_ENDPOINTS.EVENTS.CREATE,
            payload
        );
        return normalizeId<EventDetail>(res.data.event);
    },

    /** PATCH /api/v2/events/{id} → update (backend uses PATCH, not PUT). */
    async updateEvent(id: string, payload: UpdateEventPayload): Promise<EventDetail> {
        const res = await api.patch<{ event: Record<string, unknown> }>(
            API_ENDPOINTS.EVENTS.BY_ID(id),
            payload
        );
        return normalizeId<EventDetail>(res.data.event);
    },

    /** POST /api/v2/events/{id}/status → transition draft|published|live|ended|cancelled. */
    async setStatus(id: string, status: EventStatus): Promise<EventDetail> {
        const res = await api.post<{ event: Record<string, unknown> }>(
            API_ENDPOINTS.EVENTS.STATUS(id),
            { status }
        );
        return normalizeId<EventDetail>(res.data.event);
    },

    /** DELETE /api/v2/events/{id} → soft delete. */
    async deleteEvent(id: string): Promise<void> {
        await api.delete(API_ENDPOINTS.EVENTS.BY_ID(id));
    },

    /** POST /api/v2/events/{id}/announce → push to everyone who RSVP'd.
     * image / long_body are optional rich fields (banner + expandable text). */
    async announce(
        id: string,
        title: string,
        body: string,
        opts?: { image?: string; long_body?: string; send_at?: string }
    ): Promise<{ recipients: number; sent: number; scheduled?: boolean }> {
        const res = await api.post<{ recipients: number; sent: number; scheduled?: boolean }>(
            API_ENDPOINTS.EVENTS.ANNOUNCE(id),
            {
                title,
                body,
                ...(opts?.image ? { image: opts.image } : {}),
                ...(opts?.long_body ? { long_body: opts.long_body } : {}),
                ...(opts?.send_at ? { send_at: opts.send_at } : {}),
            }
        );
        return { recipients: res.data.recipients ?? 0, sent: res.data.sent ?? 0, scheduled: res.data.scheduled };
    },

    /** GET /api/v2/events/{id}/attendees → RSVP list. */
    async listAttendees(
        id: string,
        params: { status?: string; page?: number; page_size?: number } = {}
    ): Promise<Paginated<EventAttendee>> {
        const res = await api.get<Record<string, unknown>>(API_ENDPOINTS.EVENTS.ATTENDEES(id), { params });
        return toPaginated<EventAttendee>(res.data, "attendees");
    },
};

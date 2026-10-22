/**
 * Types for SeekKrr Experiences in the Partner Portal (business side).
 *
 * Mirrors the V2 backend contract under `/api/v2/businesses/{bid}/experiences`,
 * `/experience-slots` and `/experience-bookings`. Every response is wrapped as
 * `{ success: true, ...payload }`; the service unwraps the payload. All of these
 * return 403 unless the business has `features.experiences`.
 *
 * Times are local IST ("HH:MM", Asia/Kolkata); dates are "YYYY-MM-DD".
 * Prices are informational — bookings are free and confirmed immediately.
 */

export type ExperienceStatus = "draft" | "published" | "paused" | "archived";

export interface ExperienceCurator {
    name: string;
    title: string;
    years: number | null;
    photo_url: string | null;
    note: string;
}

export interface ExperienceLocation {
    address: string;
    lat: number | null;
    lng: number | null;
    map_url: string | null;
}

/** A titled paragraph: highlights, what's included, cancellation policy sections. */
export interface TitledText {
    title: string;
    description: string;
}

export interface ItineraryItem {
    time_label: string;
    title: string;
    description: string;
    image_url: string | null;
}

export interface ExperienceFaq {
    question: string;
    answer: string;
}

/** A session type / game, e.g. "Hatha" and "Vinyasa" for a yoga experience. */
export interface ExperienceOption {
    id: string;
    name: string;
    description: string;
    duration_minutes: number | null;
    price: number | null;
}

export interface ExperienceStats {
    bookings: number;
    people: number;
}

export interface Experience {
    id: string;
    business_id: string;
    /** The place / meeting point; location and region come from it when set. */
    marker_id: string | null;
    title: string;
    tagline: string | null;
    description: string | null;
    tags: string[];
    region_id: string | null;
    region_name: string | null;
    /** https urls, cover first. */
    media: string[];
    curator: ExperienceCurator | null;
    duration_text: string | null;
    location: ExperienceLocation | null;
    highlights: TitledText[];
    experience_media: string[];
    itinerary: ItineraryItem[];
    included: TitledText[];
    cancellation_policy: TitledText[];
    faqs: ExperienceFaq[];
    gallery: string[];
    options: ExperienceOption[];
    /** Min price of upcoming open slots, else min option price. */
    price_from: number | null;
    currency: string;
    status: ExperienceStatus;
    hidden_by_admin: boolean;
    stats: ExperienceStats | null;
    created_at: string | null;
    updated_at: string | null;
    // Summary fields the business list may add.
    cover_url?: string | null;
    next_date?: string | null;
    dates_text?: string | null;
    upcoming_slots?: number | null;
}

/** Body for `POST /businesses/{bid}/experiences` and `PATCH .../experiences/{eid}`. */
export interface ExperiencePayload {
    title: string;
    tagline: string;
    description: string;
    tags: string[];
    marker_id: string | null;
    /** Only when no place is linked (the marker's location wins otherwise). */
    location?: ExperienceLocation | null;
    duration_text: string;
    media: string[];
    experience_media: string[];
    gallery: string[];
    curator: ExperienceCurator | null;
    highlights: TitledText[];
    itinerary: ItineraryItem[];
    included: TitledText[];
    cancellation_policy: TitledText[];
    faqs: ExperienceFaq[];
    options: ExperienceOption[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Slots
// ─────────────────────────────────────────────────────────────────────────────

export type SlotStatus = "open" | "cancelled";

export interface ExperienceSlot {
    id: string;
    experience_id: string;
    business_id?: string;
    option_id: string | null;
    option_name?: string | null;
    date: string;
    start_time: string;
    end_time: string;
    starts_at?: string | null;
    ends_at?: string | null;
    capacity: number;
    booked: number;
    remaining?: number;
    /** Per person, informational. */
    price: number;
    status: SlotStatus;
    created_at?: string | null;
}

export interface SlotTimeWindow {
    start: string;
    end: string;
}

/**
 * Bulk body for `POST .../experiences/{eid}/slots`: either `dates`, or a
 * `from`–`to` range filtered by `weekdays` (0 = Mon … 6 = Sun). Every date
 * gets every time window. Max 500 per call; exact duplicates are skipped.
 */
export interface BulkSlotsPayload {
    option_id?: string | null;
    dates?: string[];
    from?: string;
    to?: string;
    weekdays?: number[];
    times: SlotTimeWindow[];
    capacity: number;
    price: number;
}

export interface BulkSlotsResult {
    created: number;
    slots: ExperienceSlot[];
    /** Not in the contract; used when the backend reports it. */
    skipped?: number;
}

/** Body for `PATCH /businesses/{bid}/experience-slots/{sid}` (capacity ≥ booked). */
export interface UpdateSlotPayload {
    capacity?: number;
    price?: number;
    start_time?: string;
    end_time?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bookings
// ─────────────────────────────────────────────────────────────────────────────

export type ExperienceBookingStatus = "confirmed" | "cancelled" | "checked_in" | "no_show";

export interface ExperienceBookingItem {
    slot_id: string;
    option_id: string | null;
    option_name: string | null;
    date: string;
    start_time: string;
    end_time: string;
    people: number;
    price: number;
}

export interface ExperienceBooking {
    id: string;
    /** "SK-" + 6 characters. */
    code: string;
    experience_id: string;
    business_id: string;
    user_id: string;
    items: ExperienceBookingItem[];
    total_people: number;
    total_amount: number | null;
    currency: string;
    status: ExperienceBookingStatus;
    cancelled_by: "user" | "business" | "admin" | null;
    cancel_reason: string | null;
    payment: { status: string } | null;
    contact: { name: string | null; phone: string | null } | null;
    note: string | null;
    created_at: string | null;
    cancelled_at: string | null;
    checked_in_at: string | null;
    experience?: { id: string; title: string; cover_url?: string | null } | null;
}

export interface ListBookingsParams {
    experience_id?: string;
    date?: string;
    status?: ExperienceBookingStatus;
    page?: number;
}

export interface BookingsPage {
    bookings: ExperienceBooking[];
    total: number;
    page: number;
    page_size: number;
}

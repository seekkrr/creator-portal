/**
 * Types for SeekKrr Experiences in the Partner Portal (business side).
 *
 * Mirrors the V2 backend contract under `/api/v2/businesses/{bid}/experiences`,
 * `/experience-slots` and `/experience-bookings`. Every response is wrapped as
 * `{ success: true, ...payload }`; the service unwraps the payload. All of these
 * return 403 unless the business has `features.experiences`.
 *
 * Times are local IST ("HH:MM", Asia/Kolkata); dates are "YYYY-MM-DD".
 * Prices (and GST) are set by SeekKrr admins; businesses see them read-only.
 * Customers pay SeekKrr in the app when they book; SeekKrr pays the business
 * out, minus its commission (on the price before GST).
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
    /** Per person, set by SeekKrr (read-only here). Null = the experience's price per person. */
    price: number | null;
}

/** GST on an experience, set by SeekKrr. `inclusive` = the price already includes GST. */
export interface ExperienceGst {
    enabled: boolean;
    rate_pct: number;
    inclusive: boolean;
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
    /** Per person, set by SeekKrr (null = not set yet). */
    price_per_person?: number | null;
    gst?: ExperienceGst | null;
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
    /**
     * `price` is never edited here: it's echoed back unchanged for options that
     * already have one (a changed price is refused with 403 "Prices are set by SeekKrr.").
     */
    options: (Omit<ExperienceOption, "price"> & { price?: number | null })[];
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
    /** Per person, computed by SeekKrr: option price ?? experience price ?? 0 (read-only). */
    price: number;
    gst?: ExperienceGst | null;
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
}

export interface BulkSlotsResult {
    created: number;
    slots: ExperienceSlot[];
    /** Not in the contract; used when the backend reports it. */
    skipped?: number;
}

/** Body for `PATCH /businesses/{bid}/experience-slots/{sid}` (capacity ≥ booked). Prices are set by SeekKrr. */
export interface UpdateSlotPayload {
    capacity?: number;
    start_time?: string;
    end_time?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bookings
// ─────────────────────────────────────────────────────────────────────────────

export type ExperienceBookingStatus = "pending_payment" | "confirmed" | "cancelled" | "checked_in" | "no_show" | "expired";

export type ExperiencePaymentStatus = "not_required" | "pending" | "paid" | "refund_pending" | "refunded" | "failed";

/** The customer's payment to SeekKrr for a booking (amount in rupees). */
export interface ExperienceBookingPayment {
    status: ExperiencePaymentStatus | string;
    amount?: number | null;
    currency?: string | null;
    paid_at?: string | null;
    refunded_at?: string | null;
}

/** Price breakdown stored on the booking when it was made. */
export interface ExperienceBookingPricing {
    unit_price?: number | null;
    people?: number | null;
    /** Taxable value. */
    subtotal?: number | null;
    gst_enabled?: boolean;
    gst_rate_pct?: number | null;
    gst_inclusive?: boolean;
    gst_amount?: number | null;
    total?: number | null;
}

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
    payment: ExperienceBookingPayment | null;
    pricing?: ExperienceBookingPricing | null;
    /** "offline" = added by the business, not booked in the app. */
    source?: "app" | "offline" | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// Earnings (owner / manager)
// ─────────────────────────────────────────────────────────────────────────────

/** Rupees. Commission is on the price before GST; `net` includes the GST, which the business pays to the government. */
export interface EarningsSummary {
    /** Paid by customers. */
    gross: number;
    refunds: number | null;
    commission: number;
    gst_collected: number | null;
    /** What the business earned: price before GST − commission, after refunds. */
    net: number;
    paid_out: number;
    /** net − paid_out: still to be paid to the business. */
    balance: number;
}

export interface EarningsBooking {
    id: string;
    code: string | null;
    experience_title: string | null;
    customer_name: string | null;
    people: number | null;
    date: string | null;
    subtotal: number | null;
    gst_amount: number | null;
    gst_rate_pct: number | null;
    total: number | null;
    commission: number | null;
    commission_pct: number | null;
    net: number | null;
    payment_status: string | null;
    paid_at: string | null;
    source: string | null;
}

export interface EarningsPayout {
    id: string;
    amount: number;
    reference: string | null;
    paid_on: string | null;
    note: string | null;
}

export interface Earnings {
    summary: EarningsSummary;
    /** SeekKrr's commission rate for this business, when the server sends it. */
    commission_pct: number | null;
    bookings: EarningsBooking[];
    payouts: EarningsPayout[];
}

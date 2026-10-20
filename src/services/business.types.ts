/**
 * Types for the Partner Portal (business side of SeekKrr Collabs).
 *
 * Mirrors the V2 backend contract under `/api/v2/businesses/...`,
 * `/api/v2/business-applications` and `/api/v2/reports`. Every response is
 * wrapped as `{ success: true, ...payload }`; the service unwraps the payload.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Business profile & team
// ─────────────────────────────────────────────────────────────────────────────

export type MemberRole = "owner" | "manager" | "staff";
export type BusinessStatus = "pending_claim" | "active" | "suspended";

export interface BusinessSocial {
    platform?: string | null;
    url: string;
}

export interface BusinessMemberEntry {
    user_id: string;
    role: MemberRole;
    added_at: string | null;
}

export interface BusinessBilling {
    legal_name?: string | null;
    gstin?: string | null;
    state_code?: string | null;
    address?: string | null;
}

/** Member view of a business (`GET /businesses/mine`, `GET /businesses/{id}`). */
export interface Business {
    id: string;
    slug: string | null;
    name: string;
    tagline: string | null;
    description: string | null;
    categories: string[];
    sub_categories?: string[];
    region_id: string | null;
    socials: BusinessSocial[];
    photos: string[];
    logo_url: string | null;
    verified: boolean;
    marker_ids: string[];
    status: BusinessStatus;
    plan_code: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    show_on_website: boolean;
    website_featured: boolean;
    my_role: MemberRole | null;
    members: BusinessMemberEntry[];
    claimed_at: string | null;
    created_at: string | null;
    /** Owner only. */
    billing?: BusinessBilling;
}

/** Body for `PATCH /businesses/{id}` (manager+; name/show_on_website/billing are owner only). */
export interface UpdateBusinessPayload {
    name?: string;
    tagline?: string;
    description?: string;
    categories?: string[];
    sub_categories?: string[];
    socials?: BusinessSocial[];
    photos?: string[];
    logo_url?: string;
    contact_phone?: string;
    contact_email?: string;
    show_on_website?: boolean;
    billing?: BusinessBilling;
}

export interface RedeemCode {
    marker_id: string;
    code: string | null;
    is_set: boolean;
    set_at: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plans, usage & billing
// ─────────────────────────────────────────────────────────────────────────────

/** `null` limits mean unlimited. */
export interface PlanEntitlements {
    active_collabs?: number | null;
    redemptions_per_month?: number | null;
    approval_mode?: boolean;
    team_members?: number | null;
    match_reveals_per_month?: number | null;
    invites_per_month?: number | null;
    match_breakdown?: boolean;
    attribution?: boolean;
    content_library?: boolean;
    featured?: boolean;
    locations?: number | null;
}

export type PlanCode = "free" | "growth" | "pro" | "multi_location";

export interface Plan {
    code: PlanCode | string;
    name: string | null;
    custom: boolean;
    price_monthly_inr: number | null;
    price_annual_inr: number | null;
    price_monthly_inr_incl_gst: number | null;
    price_annual_inr_incl_gst: number | null;
    gst_rate: number;
    trial_days: number;
    entitlements: PlanEntitlements;
}

export interface UsageCounter {
    used: number;
    limit: number | null;
}

/** Effective plan status as computed by the entitlement service. */
export type EffectivePlanStatus =
    | "free"
    | "trialing"
    | "active"
    | "pending"
    | "halted"
    | "trial_ended"
    | "payment_failed";

export interface BusinessUsage {
    plan_code: string;
    status: EffectivePlanStatus | string;
    entitlements: PlanEntitlements;
    override_until: string | null;
    trial_ends_at: string | null;
    period: string;
    usage: {
        redemptions: UsageCounter;
        match_reveals: UsageCounter;
        invites: UsageCounter;
        active_collabs: UsageCounter;
    };
}

export type SubscriptionStatus = "free" | "trialing" | "active" | "pending" | "halted" | "cancelled";
export type BillingPeriod = "monthly" | "annual";

export interface ReferralCredit {
    days: number | null;
    applied: boolean | null;
    granted_at: string | null;
}

export interface Subscription {
    plan_code: string | null;
    status: SubscriptionStatus | string | null;
    period: BillingPeriod | null;
    trial_ends_at: string | null;
    trial_used: boolean;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    coupon_code: string | null;
    referral_credits: ReferralCredit[];
}

export interface BillingOverview {
    subscription: Subscription | null;
    usage: BusinessUsage;
    plans: Plan[];
    referral_code: string | null;
    can_manage_billing: boolean;
}

export interface CheckoutPayload {
    plan_code: "growth" | "pro";
    period: BillingPeriod;
    coupon_code?: string;
    referral_code?: string;
}

/** A new Razorpay subscription to complete in Checkout. */
export interface CheckoutStarted {
    razorpay_key_id: string;
    subscription_id: string;
    short_url: string | null;
    plan: Plan;
    period: BillingPeriod;
}

/** An existing subscription was switched to another plan. */
export interface CheckoutChanged {
    changed: true;
    effective: "now" | "end_of_cycle";
}

export type CheckoutResult = CheckoutStarted | CheckoutChanged;

export function isCheckoutChanged(r: CheckoutResult): r is CheckoutChanged {
    return (r as CheckoutChanged).changed === true;
}

export interface InvoiceAmounts {
    taxable?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    total?: number;
}

export interface Invoice {
    id: string;
    invoice_no: string | null;
    plan_name: string | null;
    period_start: string | null;
    period_end: string | null;
    issued_at: string | null;
    amounts_inr: InvoiceAmounts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Collabs
// ─────────────────────────────────────────────────────────────────────────────

export type CollabMode = "open" | "approval";
export type CollabStatus = "active" | "paused" | "archived";
export type ModerationStatus = "approved" | "pending" | "rejected";
export type DeliverableType = "reel" | "post" | "story" | "video" | "review";
export type UsageRights = "none" | "repost_30d" | "repost_unlimited" | "ads";
export type DisclosureLabel = "#ad" | "#collab" | "#gifted";
export type CreatorTier = "community" | "verified";

export interface DeliverableSpec {
    type: DeliverableType;
    count: number;
}

export interface CollabBrief {
    deliverables: DeliverableSpec[];
    tag_handles: string[];
    hashtags: string[];
    location_tag: boolean;
    post_within_days: number;
    usage_rights: UsageRights;
    disclosure_label: DisclosureLabel;
}

export interface TimeWindow {
    start: string; // "HH:MM"
    end: string; // "HH:MM"
}

export interface CollabAvailability {
    /** 0 = Monday … 6 = Sunday; empty = every day. */
    days_of_week: number[];
    /** Empty = any time. */
    time_windows: TimeWindow[];
    daily_cap: number | null;
    /** "YYYY-MM-DD" */
    blackout_dates: string[];
    timezone?: string;
}

export interface CollabModeration {
    status: ModerationStatus;
    flags: string[];
    reason?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
}

export interface CollabCounters {
    requests?: number;
    redemptions?: number;
    completed?: number;
}

/** Business view of a collab (`Collab.to_business_dict`). */
export interface BusinessCollab {
    id: string;
    business_id: string;
    marker_id: string;
    offer: string;
    mode: CollabMode;
    allow_advance_requests: boolean;
    slots_left: number;
    valid_until: string | null;
    created_at: string | null;
    want: string;
    description: string;
    brief: Partial<CollabBrief>;
    availability: Partial<CollabAvailability>;
    min_creator_tier: CreatorTier;
    per_creator_limit: number;
    valid_from: string | null;
    status: CollabStatus;
    moderation: CollabModeration;
    slots_total: number;
    slots_used: number;
    counters: CollabCounters;
    updated_at: string | null;
}

/** Body for `POST /businesses/{id}/collabs` and `PATCH …/collabs/{cid}`. */
export interface CollabPayload {
    marker_id?: string;
    want?: string;
    offer?: string;
    description?: string;
    mode?: CollabMode;
    allow_advance_requests?: boolean;
    slots_total?: number;
    per_creator_limit?: number;
    valid_from?: string | null;
    valid_until?: string | null;
    min_creator_tier?: CreatorTier;
    brief?: Partial<CollabBrief>;
    availability?: Partial<Omit<CollabAvailability, "timezone">>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Creators & applications
// ─────────────────────────────────────────────────────────────────────────────

export type ApplicationStatus =
    | "invited"
    | "requested"
    | "approved"
    | "redeemed"
    | "delivered"
    | "completed"
    | "declined"
    | "expired"
    | "cancelled"
    | "overdue"
    | "no_show";

export type ApplicationSource = "walk_in" | "advance" | "invite";
export type ApplicationGroup = "invites" | "upcoming" | "active" | "completed" | "closed";

export interface VisitWindow {
    from: string;
    to: string;
}

export interface CreatorSocial {
    platform: string;
    /** Hidden on blurred (unrevealed) match cards. */
    handle?: string | null;
    verified: boolean;
}

export interface CreatorStats {
    redeemed?: number;
    completed?: number;
    completion_rate?: number | null;
    avg_rating?: number | null;
    rating_count?: number;
}

export interface CreatorSummary {
    user_id: string;
    display_name: string;
    avatar_url?: string | null;
    socials: CreatorSocial[];
    travel_styles: string[];
    bio?: string | null;
    tier: CreatorTier | string;
    is_quest_creator?: boolean;
    public_slug?: string | null;
    stats: CreatorStats;
}

export interface AutoCheck {
    ok?: boolean | null;
    platform?: string | null;
    author?: string | null;
    thumbnail?: string | null;
    reason?: string | null;
}

export interface Deliverable {
    url: string;
    type: DeliverableType | string;
    submitted_at: string | null;
    auto_check?: AutoCheck | null;
}

export interface Rating {
    score: number;
    comment: string | null;
    at: string | null;
}

export interface CollabSummary {
    id: string;
    want: string | null;
    offer: string | null;
    mode: CollabMode | null;
    brief: Partial<CollabBrief>;
    marker_id: string | null;
}

export interface MatchSummary {
    score: number;
    reasons: string[];
}

/** `CollabApplication.to_dict_for("business")`. */
export interface CollabApplication {
    id: string;
    collab_id: string;
    business_id: string;
    marker_id: string;
    creator_user_id: string;
    source: ApplicationSource;
    status: ApplicationStatus;
    visit_window: VisitWindow | null;
    note: string | null;
    decline_reason: string | null;
    redemption: { method: "code" | "staff_qr" | string; at: string | null } | null;
    deliverables: Deliverable[];
    due_at: string | null;
    ratings: {
        business_to_creator: Rating | null;
        creator_to_business: Rating | null;
    };
    timeline: { status: string; at: string | null }[];
    created_at: string | null;
    updated_at: string | null;
}

/** Item of `GET /businesses/{id}/applications`. */
export interface BusinessApplicationItem extends CollabApplication {
    creator: CreatorSummary;
    collab: CollabSummary;
    match: MatchSummary | null;
}

export interface ListApplicationsParams {
    status?: ApplicationStatus;
    group?: ApplicationGroup;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hub, analytics, content, attribution
// ─────────────────────────────────────────────────────────────────────────────

export interface HubPlace {
    marker_id: string;
    title: string | null;
    code_set: boolean;
}

export interface UpcomingVisit {
    id: string;
    visit_window: VisitWindow | null;
    today: boolean;
    creator: CreatorSummary;
}

export interface BusinessHub {
    business: Business;
    pending_requests: number;
    upcoming_visits: UpcomingVisit[];
    redeemed_today: number;
    content_to_review: number;
    places: HubPlace[];
    usage: BusinessUsage;
}

export interface CollabFunnel {
    requested: number;
    approved: number;
    redeemed: number;
    delivered: number;
    completed: number;
    invited: number;
    declined: number;
    expired: number;
    no_show: number;
}

export interface BusinessAnalytics {
    days: number;
    checkins: number;
    views?: number;
    funnel: CollabFunnel;
    rating: { avg: number | null; count: number };
}

export interface ContentItem {
    application_id: string;
    status: ApplicationStatus;
    url: string;
    type: DeliverableType | string;
    submitted_at: string | null;
    auto_check: AutoCheck;
    usage_rights: UsageRights;
    usage_expires_at: string | null;
    collab_offer: string | null;
    creator: {
        user_id: string;
        display_name: string;
        socials: CreatorSocial[];
    };
}

export interface ContentLibrary {
    items: ContentItem[];
    total: number;
    full_access: boolean;
}

export interface AttributionTotals {
    click: number;
    app_open: number;
    checkin: number;
}

export interface AttributionRow extends AttributionTotals {
    creator_user_id: string;
    creator_name: string;
    collab_ids: string[];
}

export interface Attribution {
    totals: AttributionTotals;
    by_creator: AttributionRow[];
    full_breakdown: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SeekKrr Match
// ─────────────────────────────────────────────────────────────────────────────

export type MatchBreakdownKey = "theme" | "local" | "content" | "quality" | "reliability" | "activity" | "peer";

export interface CreatorMatch {
    creator: CreatorSummary;
    /** 0-100 */
    score: number;
    reasons: string[];
    /** Per-signal 0-1 scores; null when the plan doesn't include the breakdown. */
    breakdown: Partial<Record<MatchBreakdownKey | string, number>> | null;
    is_new: boolean;
    revealed: boolean;
}

export interface MatchesResponse {
    collab_id: string;
    matches: CreatorMatch[];
    usage: BusinessUsage["usage"];
}

export interface InvitePayload {
    collab_id: string;
    creator_user_id: string;
    note?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Safety
// ─────────────────────────────────────────────────────────────────────────────

export interface BlockEntry {
    blocked_type: "creator" | "business" | string;
    blocked_id: string;
    created_at: string | null;
}

export type ReportReason =
    | "unsafe"
    | "harassment"
    | "not_honoured"
    | "no_show"
    | "spam"
    | "inappropriate"
    | "fraud"
    | "other";

export interface ReportPayload {
    target_type: "business" | "creator" | "collab" | "application";
    target_id: string;
    reason: ReportReason;
    details?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding: applications
// ─────────────────────────────────────────────────────────────────────────────

export interface SubmitBusinessApplicationPayload {
    business_name: string;
    contact_name: string;
    email: string;
    phone: string;
    claimed_marker_id?: string | null;
    maps_url?: string | null;
    region_id?: string | null;
    categories?: string[];
    sub_categories?: string[];
    social_links?: string[];
    requested_plan?: PlanCode | null;
    gstin?: string | null;
    message?: string | null;
    source: "website" | "app" | "portal";
}

/** A predefined place category a business can be listed under. */
export interface BusinessCategory {
    name: string;
    sub_categories: string[];
}

export interface SubmittedBusinessApplication {
    id: string;
    business_name: string;
    status: string;
    applied_at: string | null;
}

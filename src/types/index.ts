// User & Auth Types

/**
 * Staff roles that may access the creator portal regardless of is_creator.
 * Backend has no "creator" role value — creator access is the `is_creator`
 * boolean (set at provisioning); these roles are the staff override.
 */
export const ALLOWED_CREATOR_ROLES = ["admin", "super_admin"] as const;

export interface User {
    _id: string;
    first_name: string;
    last_name: string;
    contact_id?: string;
    security_id?: string;
    profile_id?: string;
    role: Array<"user" | "admin" | "super_admin" | "creator" | "moderator" | "finance">;
    status: "active" | "suspended" | "deleted";
    is_creator: boolean;
    email?: string; // returned by /auth/verify (to_self_dict)
    profile_image?: { url?: string; public_id?: string } | null;
    points_earned?: number; // returned by /auth/verify (to_self_dict)
    created_at: string;
    updated_at: string;
}

/**
 * Backend role shape is inconsistent: V2 `/auth/verify` may return `role` as a
 * single string (e.g. "admin") OR an array. The portal assumes an array
 * (`user.role.some(...)`). Coerce here at the boundary so every consumer is safe.
 */
export function normalizeUser<T extends { role?: unknown } | null | undefined>(user: T): T {
    if (!user || typeof user !== "object") return user;
    const raw = (user as { role?: unknown }).role;
    const role = Array.isArray(raw) ? raw : raw === null || raw === undefined ? [] : [raw];
    return { ...(user as object), role } as T;
}

export type CreatorAccessDenialReason = "not_creator" | "no_profile" | "suspended" | "rejected";

export interface CreatorAccessResult {
    allowed: boolean;
    reason?: CreatorAccessDenialReason;
}

/**
 * Decide whether a user may enter the creator portal.
 *
 * Per V2 backend contract:
 *  - Staff (admin/super_admin) always pass.
 *  - A creator must have `is_creator === true` AND a provisioned `creators`
 *    record (GET /creators/me 200) with `status === "active"`.
 *  - `is_verified` is a trust BADGE only — it never gates login (unverified
 *    active creators are allowed in to build drafts).
 *  - suspended/rejected creators, and is_creator-without-record, are blocked.
 */
export function evaluateCreatorAccess(
    user: { role?: unknown; is_creator?: boolean } | null | undefined,
    creator: { status?: string } | null | undefined
): CreatorAccessResult {
    if (!user) return { allowed: false, reason: "not_creator" };

    const roles = Array.isArray(user.role) ? user.role : user.role ? [user.role] : [];
    const isStaff = roles.some((r) => (ALLOWED_CREATOR_ROLES as readonly unknown[]).includes(r));
    if (isStaff) return { allowed: true };

    if (!user.is_creator) return { allowed: false, reason: "not_creator" };
    if (!creator) return { allowed: false, reason: "no_profile" };
    if (creator.status === "suspended") return { allowed: false, reason: "suspended" };
    if (creator.status === "rejected") return { allowed: false, reason: "rejected" };
    return { allowed: true };
}

/** Boolean convenience wrapper around {@link evaluateCreatorAccess}. */
export function canAccessCreatorPortal(
    user: { role?: unknown; is_creator?: boolean } | null | undefined,
    creator: { status?: string } | null | undefined
): boolean {
    return evaluateCreatorAccess(user, creator).allowed;
}

export interface UserProfile {
    _id: string;
    bio?: string;
    profile_image?: CloudinaryAsset;
    points_earned: number;
    referral_code?: string;
}

/** Self-chosen display badge on a creator profile (free-form dict in V2). */
export interface CreatorBadge {
    label?: string;
    color?: string;
    icon?: string;
    [key: string]: unknown;
}

/**
 * V2 creator profile. `GET /creators/me` returns the *enriched* dict (creator
 * fields + merged user identity); `PUT /creators/me` returns the public dict.
 * Most fields are optional so both shapes type-check.
 *
 * Note: `status` is the operational lifecycle (active|suspended|rejected) — NOT
 * "approved"/"pending" (that lives on creator_applications). `is_verified` is the
 * trust BADGE and is what gates "can submit quests" in the UI.
 */
export interface Creator {
    id: string;
    _id?: string;
    user_id: string;
    status: "active" | "suspended" | "rejected";
    is_verified: boolean;
    tagline?: string | null;
    creator_bio?: string | null;
    creator_badge?: CreatorBadge | null;
    total_quests?: number;
    total_earnings?: number;
    pending_payouts?: number;
    travelers_served?: number;
    rating?: number;
    review_count?: number;
    quest_ids?: string[];
    payout_account_id?: string | null;
    source_application_id?: string | null;
    verification_documents?: string[];
    // Identity fields merged in by the enriched dict (to_enriched_dict)
    name?: string | null;
    avatar_url?: string | null;
    hobbies?: string[];
    first_name?: string;
    last_name?: string;
    email?: string;
    profile_image?: CloudinaryAsset | { url?: string } | null;
    created_at?: string;
    updated_at?: string;
}

/** Onboarding checklist from `GET /creators/me/onboarding-status`. */
export interface CreatorOnboarding {
    profile_complete: boolean;
    payout_account_set: boolean;
    first_quest_created: boolean;
    is_verified: boolean;
}

/** Payload for `PUT /creators/me`. */
export interface UpdateCreatorProfilePayload {
    tagline?: string;
    creator_bio?: string;
    creator_badge?: CreatorBadge | null;
}

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
    token_type: "bearer";
    user_id: string;
    expires_in?: number;
}

// Cloudinary Types
export interface CloudinaryAsset {
    public_id: string;
    secure_url: string;
    version?: number;
    format?: string;
    resource_type?: string;
    width?: number;
    height?: number;
    alt_text?: string;
    is_thumbnail?: boolean;
}

export interface CloudinaryUploadResponse {
    public_id: string;
    secure_url: string;
    url: string;
    format: string;
    resource_type: string;
    width: number;
    height: number;
    bytes: number;
    created_at: string;
}

// Quest Types
export type QuestDifficulty = "Easy" | "Medium" | "Hard" | "Expert";
export type QuestStatus = "Draft" | "Under Review" | "Changes Requested" | "Approved" | "Published" | "Rejected" | "Paused" | "Archived";
export type QuestTheme = "Adventure" | "Romance" | "Culture" | "Food" | "History" | "Nature" | "Custom";

export interface QuestLocation {
    _id?: string;
    country?: string;
    region?: string;
    city?: string;
    latitude: number;
    longitude: number;
    address?: string;
    place_name?: string;
}

export interface QuestMetadata {
    _id?: string;
    title: string;
    description: string;
    difficulty: QuestDifficulty;
    duration_minutes?: number;
    theme?: string;
    tags?: string[];
}

export interface QuestMedia {
    _id?: string;
    cloudinary_assets: CloudinaryAsset[];
    video_url?: string;
    source_url?: string;
}

export interface QuestStep {
    _id?: string;
    quest_id?: string;
    order: number;
    title: string;
    description?: string;
    location: QuestLocation;
    points_reward?: number;
}

export interface Quest {
    _id: string;
    metadata_id: string;
    location_id: string;
    media_id: string;
    created_by: string;
    status: QuestStatus;
    price?: number;
    currency?: string;
    booking_enabled: boolean;
    review_history?: Array<{ admin_id: string; comment: string; timestamp: string }>;
    quest_title?: string;
    quest_region?: string;
    quest_image?: string;
    view_count?: number;
    created_at: string;
    updated_at: string;
}

export interface QuestDetailsMetadata {
    title: string;
    description: string[] | string;
    keywords?: string[];
    theme: QuestTheme;
    difficulty: QuestDifficulty;
    price?: number;
    max_points?: number;
    duration_minutes?: number;
    hints_allowed?: number;
}

export interface QuestDetailsLocation {
    region: string;
    start_location: {
        type: "Point";
        coordinates: number[];
        mapbox_feature_id?: string;
    };
    end_location: {
        type: "Point";
        coordinates: number[];
        mapbox_feature_id?: string;
    };
    route_waypoints?: Array<{
        order: number;
        location: {
            type: "Point";
            coordinates: number[];
            mapbox_waypoint_id?: string;
        };
        estimated_time_minutes?: number;
        distance_from_previous_km?: number | null;
    }>;
    route_geometry?: {
        type: "LineString";
        coordinates: number[][];
    };
    map_data?: {
        zoom_level: number;
        map_style: string;
    };
}

export interface QuestDetailsMedia {
    cloudinary_assets?: CloudinaryAsset[];
    reel_url?: string;
}

export interface QuestDetailsStep {
    _id?: string;
    order: number;
    title: string;
    description: string;
    how_to_reach?: string;
    waypoint_order?: number;
    cloudinary_assets?: CloudinaryAsset[];
}

export interface QuestWithDetails extends Quest {
    metadata?: QuestDetailsMetadata;
    location?: QuestDetailsLocation;
    media?: QuestDetailsMedia;
    steps?: QuestDetailsStep[];
}

// Form Types for Quest Creation
export interface CreateQuestFormData {
    // Step 1: Location/URL
    locationType: "city" | "url";
    city?: string;
    sourceUrl?: string;
    latitude?: number;
    longitude?: number;

    // Step 2: Details
    title: string;
    description: string;
    theme: QuestTheme;
    difficulty: QuestDifficulty;
    duration?: number;
    // coverImage removed as per user request

    // Step 3: Waypoints
    waypoints: QuestLocation[];

    // Step 4: Waypoint Details
    waypointDetails: Array<{
        howToReach: string;
        description: string;
        images?: CloudinaryAsset[];
    }>;
    galleryImages: CloudinaryAsset[];

    // Step 5: Narratives (optional)
    narratives?: NarrativeFormItem[];
}

// Narrative form item for quest creation flow
export interface NarrativeFormItem {
    fromStepIndex: number;
    toStepIndex: number;
    title: string;
    content: string;
    triggerRadiusM: number;
    isMandatory: boolean;
}

// Backend narrative response
export interface NarrativeResponse {
    _id: string;
    quest_id: string;
    from_step_id: string;
    to_step_id: string;
    from_step_order: number;
    to_step_order: number;
    title?: string;
    content: string;
    trigger_location?: { type: "Point"; coordinates: [number, number] };
    trigger_radius_m: number;
    media?: any[];
    is_mandatory: boolean;
    view_count: number;
    created_by: string;
    created_at: string;
    updated_at: string;
}

// Backend expects this specific structure
export interface CreateQuestPayload {
    metadata: {
        title: string;
        description: string[];
        keywords?: string[]; // Added based on sample
        theme: QuestTheme;
        difficulty: QuestDifficulty;
        price?: number; // Added based on sample
        max_points?: number; // Added based on sample
        duration_minutes?: number;
        hints_allowed?: number; // Added based on sample
    };
    location: {
        region: string;
        start_location: {
            type: "Point";
            coordinates: number[];
            mapbox_feature_id?: string;
        };
        end_location: {
            type: "Point";
            coordinates: number[];
            mapbox_feature_id?: string;
        };
        route_waypoints?: Array<{
            order: number;
            location: {
                type: "Point";
                coordinates: number[];
                mapbox_waypoint_id?: string;
            };
            estimated_time_minutes?: number;
            distance_from_previous_km?: number | null;
        }>;
        route_geometry?: {
            type: "LineString";
            coordinates: number[][];
        };
        map_data: {
            zoom_level: number;
            map_style: string;
            custom_markers?: Array<{
                location: {
                    type: "Point";
                    coordinates: number[];
                };
                icon_public_id: string;
                label: string;
            }>;
            bounding_box?: {
                northeast: { type: "Point"; coordinates: number[] };
                southwest: { type: "Point"; coordinates: number[] };
            };
        };
        tileset_id?: string; // Added based on sample
    };
    media: {
        cloudinary_assets?: CloudinaryAsset[];
        mapbox_reference?: {
            style_id?: string;
            route_id?: string;
            tile_url?: string;
            static_map_url?: string;
        };
        reel_url?: string;
    };
    steps: Array<{
        order: number;
        title: string;
        description: string;
        how_to_reach?: string;
        waypoint_order?: number;
        cloudinary_assets?: CloudinaryAsset[];
    }>;
    status?: QuestStatus;
    price?: number;
    currency?: string;
    booking_enabled?: boolean;
}

// API Response Types
export interface ApiResponse<T> {
    data: T;
    status: number;
    message?: string;
}

export interface ApiError {
    error: string;
    details?: string;
    status?: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}

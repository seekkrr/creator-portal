// User & Auth Types
export interface User {
    _id: string;
    first_name: string;
    last_name: string;
    contact_id: string;
    security_id: string;
    profile_id: string;
    role: "user" | "admin" | "super_admin" | "creator";
    status: "active" | "suspended" | "deleted";
    is_creator: boolean;
    created_at: string;
    updated_at: string;
}

export interface UserProfile {
    _id: string;
    bio?: string;
    profile_image?: CloudinaryAsset;
    points_earned: number;
    referral_code?: string;
}

export interface Creator {
    _id: string;
    user_id: string;
    status: "pending" | "approved" | "rejected" | "suspended";
    is_verified: boolean;
    verification_documents?: string[];
    stats_id?: string;
    payout_account_id?: string;
    created_at: string;
    updated_at: string;
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
export type QuestStatus = "Draft" | "Published" | "Archived";
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
    created_at: string;
    updated_at: string;
}

export interface QuestWithDetails extends Quest {
    metadata?: QuestMetadata;
    location?: QuestLocation;
    media?: QuestMedia;
    steps?: QuestStep[];
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
}

// Backend expects this specific structure
export interface CreateQuestPayload {
    metadata: {
        title: string;
        description: string[];
        theme: QuestTheme;
        difficulty: QuestDifficulty;
        duration_minutes?: number;
        keywords?: string[];
    };
    location: {
        region: string;
        start_location: {
            type: "Point";
            coordinates: number[];
        };
        end_location: {
            type: "Point";
            coordinates: number[];
        };
        route_waypoints?: Array<{
            order: number;
            location: {
                type: "Point";
                coordinates: number[];
            };
        }>;
        map_data: {
            zoom_level: number;
            map_style: string;
        };
    };
    media: {
        cloudinary_assets?: CloudinaryAsset[];
        source_url?: string;
    };
    steps: Array<{
        title: string;
        description: string;
    }>;
    status?: QuestStatus;
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

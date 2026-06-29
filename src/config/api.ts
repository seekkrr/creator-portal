export const API_ENDPOINTS = {
    AUTH: {
        OAUTH_LOGIN: "/api/v2/auth/oauth/login",
        LOGOUT: "/api/v2/auth/logout",
        REFRESH: "/api/v2/auth/refresh",
        VERIFY: "/api/v2/auth/verify",
    },
    // V2 quests. Static paths (/me) resolve before /{id} on the backend.
    QUESTS: {
        BASE: "/api/v2/quests",
        CREATE: "/api/v2/quests",
        ME: "/api/v2/quests/me",
        BY_ID: (id: string) => `/api/v2/quests/${id}`,
        SUBMIT: (id: string) => `/api/v2/quests/${id}/submit`,
        RETRACT: (id: string) => `/api/v2/quests/${id}/retract`,
        REVIEW: (id: string) => `/api/v2/quests/${id}/review`,
    },
    CREATORS: {
        // V2: current authenticated creator's own profile + analytics
        ME: "/api/v2/creators/me",
        ME_ONBOARDING: "/api/v2/creators/me/onboarding-status",
        ME_ANALYTICS_SUMMARY: "/api/v2/creators/me/analytics/summary",
        ME_ANALYTICS_QUESTS: "/api/v2/creators/me/analytics/quests",
        ME_ANALYTICS_EARNINGS: "/api/v2/creators/me/analytics/earnings",
    },
    // Current user's own account (V2). Name + avatar are common identity fields
    // editable from the creator portal; the rest of the user profile is app-managed.
    USERS: {
        ME: "/api/v2/users/me",
    },
    // V2 markers. Creators create/manage their own markers; list is gated to
    // approved markers by default on the backend.
    MARKERS: {
        BASE: "/api/v2/markers",
        CREATE: "/api/v2/markers",
        BY_ID: (id: string) => `/api/v2/markers/${id}`,
    },
    // V2 task configs (per marker/quest). Static sub-collection paths first.
    TASKS: {
        BASE: "/api/v2/tasks",
        CREATE: "/api/v2/tasks",
        BY_ID: (id: string) => `/api/v2/tasks/${id}`,
        BY_MARKER: (markerId: string) => `/api/v2/tasks/by-marker/${markerId}`,
        BY_QUEST: (questId: string) => `/api/v2/tasks/by-quest/${questId}`,
        TOGGLE_ACTIVE: (id: string) => `/api/v2/tasks/${id}/toggle-active`,
    },
    // V2 step rewards (per context: quest/marker/task/streak).
    REWARDS: {
        BASE: "/api/v2/rewards",
        CREATE: "/api/v2/rewards",
        BY_ID: (id: string) => `/api/v2/rewards/${id}`,
        FOR_CONTEXT: "/api/v2/rewards/for-context",
        EVALUATE: (id: string) => `/api/v2/rewards/${id}/evaluate`,
    },
    // V2 regions. Creators resolve-or-create during quest building only
    // (no direct region edit/delete from the portal).
    REGIONS: {
        BASE: "/api/v2/regions",
        BY_ID: (id: string) => `/api/v2/regions/${id}`,
        SEARCH: "/api/v2/regions/search",
        // Creator region picker: Mapbox v6 candidates annotated against backend regions.
        MAPBOX_SEARCH: "/api/v2/regions/mapbox-search",
        RESOLVE: "/api/v2/regions/resolve",
        RESOLVE_OR_CREATE: "/api/v2/regions/resolve-or-create",
    },
    // V2 payout accounts. Creators manage their own; earnings come from analytics.
    PAYOUT_ACCOUNTS: {
        ME: "/api/v2/payout-accounts/me",
        CREATE: "/api/v2/payout-accounts",
        BY_ID: (id: string) => `/api/v2/payout-accounts/${id}`,
        SET_PRIMARY: (id: string) => `/api/v2/payout-accounts/${id}/set-primary`,
    },
    CORE: {
        USERS: "/api/core/users",
        USER_BY_ID: (id: string) => `/api/core/users/${id}`,
    },
    QUERIES: {
        SUBMIT: "/api/queries",
    },
    // V2 narratives use the attach model (attach_type/attach_id/chain_id).
    NARRATIVES: {
        BASE: "/api/v2/narratives",
        CREATE: "/api/v2/narratives",
        BY_ID: (id: string) => `/api/v2/narratives/${id}`,
        BY_ATTACH: (attachType: string, attachId: string) =>
            `/api/v2/narratives/by-attach/${attachType}/${attachId}`,
        BY_CHAIN: (chainId: string) => `/api/v2/narratives/chain/${chainId}`,
        ATTACH_SUMMARY: "/api/v2/narratives/attach-summary",
        SUBMIT: (id: string) => `/api/v2/narratives/${id}/submit`,
        AUDIO_GENERATE: (id: string) => `/api/v2/narratives/${id}/audio/generate`,
        AUDIO: (id: string) => `/api/v2/narratives/${id}/audio`,
        AUDIO_STATUS: (id: string) => `/api/v2/narratives/${id}/audio-status`,
    },
} as const;

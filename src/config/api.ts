export const API_ENDPOINTS = {
    AUTH: {
        OAUTH_LOGIN: "/api/v2/auth/oauth/login",
        LOGOUT: "/api/v2/auth/logout",
        REFRESH: "/api/v2/auth/refresh",
        VERIFY: "/api/v2/auth/verify",
    },
    QUESTS: {
        BASE: "/api/quests",
        CREATE: "/api/quests",
        BY_ID: (id: string) => `/api/quests/${id}`,
        STEPS: (questId: string) => `/api/quests/${questId}/steps`,
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
    CORE: {
        USERS: "/api/core/users",
        USER_BY_ID: (id: string) => `/api/core/users/${id}`,
    },
    QUERIES: {
        SUBMIT: "/api/queries",
    },
    NARRATIVES: {
        CREATE: "/api/locations/narrative",
        BY_ID: (id: string) => `/api/locations/narrative/${id}`,
        BY_QUEST: (questId: string) => `/api/locations/quest/${questId}/narratives`,
    },
} as const;

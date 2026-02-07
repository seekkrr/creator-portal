import { api, authStorage } from "./api";
import { API_ENDPOINTS } from "@config/api";
import { config } from "@config/env";
import type { AuthTokens, User, Creator } from "@/types";

export interface AuthMeResponse {
    user: User;
    creator?: Creator;
}

export const authService = {
    /**
     * Initiate Google OAuth login for creators
     */
    /**
     * Initiate Google OAuth login for creators
     */
    initiateGoogleLogin(): void {
        const redirectUri = `${window.location.origin}/creator/auth/callback`;
        // Use full backend URL for OAuth to avoid CSRF issues
        const authUrl = `${config.api.baseUrl}${API_ENDPOINTS.AUTH.GOOGLE}?is_creator=true&platform=web&redirect_uri=${encodeURIComponent(redirectUri)}`;
        window.location.href = authUrl;
    },

    /**
     * Exchange auth code for tokens
     */
    async exchangeAuthCode(code: string): Promise<AuthTokens> {
        const response = await api.post<AuthTokens>("/api/auth/mobile/exchange", { code });
        return response.data;
    },

    /**
     * Get current authenticated user
     */
    async getCurrentUser(): Promise<AuthMeResponse> {
        // Get user_id from token or storage
        const tokens = authStorage.getToken();
        if (!tokens) throw new Error("No token found");

        // Parse JWT to get user_id (simplistic parsing)
        const parts = tokens.split('.');
        if (parts.length < 2) throw new Error("Invalid token format");
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        const userId = payload.sub || payload.user_id; // Adjust based on your JWT payload

        const response = await api.get<any>(`/api/core/users/${userId}`);

        // Transform response to match AuthMeResponse structure if needed, 
        // or just return the user object if the UI expects that.
        // The backend returns { user: {...}, contact: {...}, profile: {...} }
        return {
            user: response.data.user,
            creator: undefined // You might want to fetch creator details separately or if included
        };
    },

    /**
     * Refresh access token
     */
    async refreshToken(): Promise<AuthTokens> {
        const refreshToken = authStorage.getRefreshToken();
        if (!refreshToken) {
            throw new Error("No refresh token available");
        }

        const response = await api.post<AuthTokens>(API_ENDPOINTS.AUTH.REFRESH, {
            refresh_token: refreshToken,
        });

        const tokens = response.data;
        authStorage.setTokens(tokens.access_token, tokens.refresh_token);
        return tokens;
    },

    /**
     * Logout user
     */
    async logout(): Promise<void> {
        const refreshToken = authStorage.getRefreshToken();
        try {
            if (refreshToken) {
                await api.post(API_ENDPOINTS.AUTH.LOGOUT, {
                    refresh_token: refreshToken,
                });
            }
        } finally {
            authStorage.clearTokens();
        }
    },

    /**
     * Store tokens after OAuth callback
     */
    storeTokens(tokens: AuthTokens): void {
        authStorage.setTokens(tokens.access_token, tokens.refresh_token);
    },

    /**
     * Check if user has valid token stored
     */
    hasStoredToken(): boolean {
        return !!authStorage.getToken();
    },
};

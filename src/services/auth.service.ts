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
    initiateGoogleLogin(): void {
        // Use full backend URL for OAuth to avoid CSRF issues
        const authUrl = `${config.api.baseUrl}${API_ENDPOINTS.AUTH.GOOGLE}?is_creator=true&platform=web`;
        window.location.href = authUrl;
    },

    /**
     * Get current authenticated user
     */
    async getCurrentUser(): Promise<AuthMeResponse> {
        const response = await api.get<AuthMeResponse>(API_ENDPOINTS.AUTH.ME);
        return response.data;
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

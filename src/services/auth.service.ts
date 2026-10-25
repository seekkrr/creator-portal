import { api, authStorage } from "./api";
import { ACTING_TAB, endActingSession } from "./actingSession";
import { API_ENDPOINTS } from "@config/api";
import { normalizeUser, type AuthTokens, type User, type Creator } from "@/types";
import { businessService } from "./business.service";
import type { Business } from "./business.types";

export interface AuthMeResponse {
    user: User;
    creator?: Creator;
    /** Businesses the user is a member of (only fetched for the `business` role). */
    businesses: Business[];
}

export const authService = {
    /**
     * Login with Google Credential from the GIS SDK (in-page, no redirect).
     * Mirrors admin-portal: POST /api/v2/auth/oauth/login { provider, token }.
     */
    async loginWithGoogleCredential(credential: string): Promise<AuthTokens> {
        const response = await api.post<AuthTokens>(API_ENDPOINTS.AUTH.OAUTH_LOGIN, {
            provider: "google",
            token: credential,
        });
        return response.data;
    },

    /**
     * Get current authenticated user (+ creator profile when applicable).
     *
     * The /auth/verify endpoint uses to_self_dict() which includes `role` and
     * other private fields stripped from the public/login (to_public_dict) shape.
     * The creator profile is fetched best-effort via /creators/me (only meaningful
     * when is_creator === true; non-creators get 403 which we swallow).
     */
    async getCurrentUser(): Promise<AuthMeResponse> {
        const token = authStorage.getToken();
        if (!token) throw new Error("No token found");

        const response = await api.get<{ user: User }>(API_ENDPOINTS.AUTH.VERIFY);
        const user = normalizeUser(response.data.user);

        let creator: Creator | undefined = undefined;
        if (user.is_creator) {
            try {
                // V2 GET /api/v2/creators/me → { success, creator: <enriched profile> }.
                // 403/404 here means the is_creator flag is set but the creator record
                // isn't provisioned yet — leave creator undefined so the gate can react.
                const creatorResponse = await api.get<{ creator?: Creator }>(
                    API_ENDPOINTS.CREATORS.ME
                );
                creator = creatorResponse.data.creator ?? undefined;
            } catch (error) {
                console.error("Failed to fetch creator profile:", error);
            }
        }

        const businesses = await authService.getMyBusinesses(user);
        return { user, creator, businesses };
    },

    /**
     * Partner Portal memberships. Only users holding the `business` role can be
     * members, so skip the call otherwise. Best-effort: a failure here must not
     * lock a creator out of the portal.
     */
    async getMyBusinesses(user: User): Promise<Business[]> {
        if (!user.role?.includes("business")) return [];
        try {
            return await businessService.listMine();
        } catch (error) {
            console.error("Failed to fetch businesses:", error);
            return [];
        }
    },

    /**
     * Refresh access token (DB-backed rotating refresh token).
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
     * Logout user — revoke refresh token server-side, then clear storage.
     */
    async logout(): Promise<void> {
        const refreshToken = authStorage.getRefreshToken();
        try {
            if (ACTING_TAB) {
                // Acting as a creator: end that session, never the admin's own.
                await endActingSession();
                return;
            }
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
     * Store tokens after a successful login.
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

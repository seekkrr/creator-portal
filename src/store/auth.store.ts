import { create } from "zustand";
import { persist } from "zustand/middleware";
import { evaluateCreatorAccess, normalizeUser, type CreatorAccessDenialReason, type User, type Creator, type AuthTokens } from "@/types";

const ACCESS_DENIAL_MESSAGE: Record<CreatorAccessDenialReason, string> = {
    not_creator: "Access Denied: This account is not a creator.",
    no_profile: "Access Denied: Your creator account is still being set up. Please sign in again shortly.",
    suspended: "Access Denied: Your creator account is suspended.",
    rejected: "Access Denied: Your creator application was rejected.",
};
import { authService } from "@services/auth.service";
import { authStorage } from "@services/api";

interface AuthState {
    user: User | null;
    creator: Creator | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

interface AuthActions {
    setUser: (user: User, creator?: Creator) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    login: (tokens: AuthTokens) => void;
    logout: () => Promise<void>;
    checkAuth: () => Promise<boolean>;
    clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, _get) => ({
            // State
            user: null,
            creator: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            // Actions
            setUser: (user, creator) => {
                set({
                    user,
                    creator: creator ?? null,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                });
            },

            setLoading: (loading) => {
                set({ isLoading: loading });
            },

            setError: (error) => {
                set({ error, isLoading: false });
            },

            clearError: () => {
                set({ error: null });
            },

            login: (tokens) => {
                authService.storeTokens(tokens);
                set({ isAuthenticated: true, isLoading: true });
                // Note: Caller is responsible for calling checkAuth() after login
            },

            logout: async () => {
                set({ isLoading: true });
                try {
                    await authService.logout();
                } finally {
                    set({
                        user: null,
                        creator: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: null,
                    });
                }
            },

            checkAuth: async () => {
                if (!authService.hasStoredToken()) {
                    set({ isAuthenticated: false, isLoading: false });
                    return false;
                }

                set({ isLoading: true });
                try {
                    const { user, creator } = await authService.getCurrentUser();

                    // RBAC: only ACTIVE creators (is_creator + creators.status==='active')
                    // or staff may enter the portal. is_verified is a badge, not a gate.
                    const access = evaluateCreatorAccess(user, creator);
                    if (!access.allowed) {
                        set({
                            user, // keep so the UI knows who was rejected
                            creator: creator ?? null,
                            isAuthenticated: true, // they ARE authenticated, just not authorized
                            isLoading: false,
                            error: access.reason ? ACCESS_DENIAL_MESSAGE[access.reason] : "Access Denied",
                        });
                        return false;
                    }

                    set({
                        user,
                        creator: creator ?? null,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                    return true;
                } catch (error) {
                    authStorage.clearTokens();
                    set({
                        user: null,
                        creator: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: error instanceof Error ? error.message : "Authentication failed",
                    });
                    return false;
                }
            },
        }),
        {
            name: "seekkrr-creator-auth",
            partialize: (state) => ({
                user: state.user,
                creator: state.creator,
                isAuthenticated: state.isAuthenticated,
            }),
            // A user persisted by an older build may have `role` as a string;
            // normalize on rehydration so consumers' `role.some(...)` never throws
            // before checkAuth() re-fetches.
            merge: (persisted, current) => {
                const p = (persisted ?? {}) as Partial<AuthState>;
                return { ...current, ...p, user: p.user ? normalizeUser(p.user) : current.user };
            },
        }
    )
);

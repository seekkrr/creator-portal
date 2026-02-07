import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Creator, AuthTokens } from "@/types";
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
        (set, get) => ({
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
                // After storing tokens, fetch user data
                get().checkAuth();
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
            name: "seekkrr-auth",
            partialize: (state) => ({
                user: state.user,
                creator: state.creator,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

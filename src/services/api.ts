import axios, {
    type AxiosError,
    type AxiosInstance,
    type InternalAxiosRequestConfig,
} from "axios";
import { config } from "@config/env";
import { API_ENDPOINTS } from "@config/api";
import type { ApiError } from "@/types";

/**
 * Error thrown by the API client that preserves the backend's structured
 * response. The old interceptor flattened every failure to `new Error(message)`,
 * discarding `status` and the `details` payload — so callers could never react
 * to a specific conflict (e.g. the nearby-marker 409 carries the existing
 * marker's id/name/distance). Extends Error, so existing `err.message` handling
 * keeps working unchanged.
 */
export class ApiRequestError extends Error {
    readonly status?: number;
    /** Machine-readable backend code, e.g. "NEARBY_MARKER". */
    readonly code?: string;
    /** The backend `details` object (structured payload), if any. */
    readonly details?: Record<string, unknown>;

    constructor(
        message: string,
        opts: { status?: number; code?: string; details?: Record<string, unknown> } = {}
    ) {
        super(message);
        this.name = "ApiRequestError";
        this.status = opts.status;
        this.code = opts.code;
        this.details = opts.details;
    }
}

const AUTH_TOKEN_KEY = "seekkrr_creator_access_token"; // Distinct key for creator portal
const REFRESH_TOKEN_KEY = "seekkrr_creator_refresh_token";

function getStoredToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setStoredTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearStoredTokens(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Bare client (no interceptors) used only to mint a new access token, so a 401
// on the refresh call itself can't recurse back into the refresh flow.
const refreshClient = axios.create({
    baseURL: config.api.baseUrl,
    timeout: config.api.timeout,
    headers: { "Content-Type": "application/json" },
});

// Single-flight: many requests can 401 at once (e.g. a dashboard firing several
// calls); they must share ONE refresh, not stampede the endpoint.
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
    if (!refreshPromise) {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        refreshPromise = (async () => {
            if (!refreshToken) throw new Error("No refresh token");
            const { data } = await refreshClient.post<{ access_token: string; refresh_token: string }>(
                API_ENDPOINTS.AUTH.REFRESH,
                { refresh_token: refreshToken }
            );
            setStoredTokens(data.access_token, data.refresh_token);
            return data.access_token;
        })().finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
}

function redirectToLogin(): void {
    if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/access-denied")
    ) {
        window.location.href = "/creator/login";
    }
}

/** Auth endpoints where a 401 means "bad credentials", not "token expired" —
 *  never try to refresh for these (would loop or mask a real login failure). */
function isAuthEndpoint(url?: string): boolean {
    if (!url) return false;
    return (
        url.includes(API_ENDPOINTS.AUTH.REFRESH) ||
        url.includes(API_ENDPOINTS.AUTH.OAUTH_LOGIN) ||
        url.includes(API_ENDPOINTS.AUTH.LOGOUT)
    );
}

function createApiClient(): AxiosInstance {
    const client = axios.create({
        baseURL: config.api.baseUrl,
        timeout: config.api.timeout,
        headers: {
            "Content-Type": "application/json",
        },
    });

    // Request interceptor - add auth token
    client.interceptors.request.use(
        (requestConfig: InternalAxiosRequestConfig) => {
            const token = getStoredToken();
            if (token && requestConfig.headers) {
                requestConfig.headers.Authorization = `Bearer ${token}`;
            }
            return requestConfig;
        },
        (error: AxiosError) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor - handle errors
    client.interceptors.response.use(
        (response) => response,
        async (error: AxiosError<ApiError>) => {
            const status = error.response?.status;
            const originalRequest = error.config as
                | (InternalAxiosRequestConfig & { _retry?: boolean })
                | undefined;
            console.warn("[API] Response error:", status, error.response?.data);

            // Handle 401 - try a silent refresh once, then retry the request.
            // Only fall back to logout if there's no refresh token or the refresh
            // itself fails — so an expired access token no longer ends the session.
            if (
                status === 401 &&
                originalRequest &&
                !originalRequest._retry &&
                !isAuthEndpoint(originalRequest.url) &&
                localStorage.getItem(REFRESH_TOKEN_KEY)
            ) {
                originalRequest._retry = true;
                try {
                    await refreshAccessToken();
                    // The request interceptor re-attaches the fresh token on retry.
                    return client(originalRequest);
                } catch {
                    console.warn("[API] Token refresh failed - clearing session");
                    clearStoredTokens();
                    redirectToLogin();
                }
            } else if (status === 401) {
                // No refresh token, an auth-endpoint 401, or an already-retried
                // request: the session is genuinely over.
                console.warn("[API] 401 Unauthorized - Clearing tokens");
                clearStoredTokens();
                redirectToLogin();
            }

            // Extract error message — check all known backend shapes:
            // V2 FastAPI: { detail: "..." } or { message: "..." }
            // V1 Flask: { error: "..." } or { details: "..." }
            const responseData = error.response?.data as Record<string, unknown> | undefined;
            const errorMessage =
                (typeof responseData?.message === "string" && responseData.message) ||
                (typeof responseData?.detail === "string" && responseData.detail) ||
                (typeof responseData?.error === "string" && responseData.error) ||
                (typeof responseData?.details === "string" && responseData.details) ||
                error.message ||
                "An unexpected error occurred";

            // `details` is only a structured payload when it's an object (V2
            // AppError). The string case above is a V1 message, not a payload.
            const details =
                responseData?.details && typeof responseData.details === "object"
                    ? (responseData.details as Record<string, unknown>)
                    : undefined;
            const code = typeof responseData?.error === "string" ? responseData.error : undefined;

            return Promise.reject(
                new ApiRequestError(errorMessage, { status, code, details })
            );
        }
    );

    return client;
}

export const api = createApiClient();

export const authStorage = {
    getToken: getStoredToken,
    setTokens: setStoredTokens,
    clearTokens: clearStoredTokens,
    getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
};

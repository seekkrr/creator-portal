import axios from "axios";
import { config } from "@config/env";

/**
 * "Act as creator": a platform admin working in a creator's portal as that
 * creator. The session lives in this tab only (sessionStorage), so the admin's
 * own sign-in in other tabs is untouched. It has no refresh token and ends after
 * at most 30 minutes, or when the admin clicks Exit.
 */
export interface ActingSession {
    token: string;
    /** When it ends, on this device's clock (from the server's `expires_in`). */
    endsAt: number;
    sessionId: string;
    user: { id: string; name: string };
    admin: { id: string; name: string };
}

const KEY = "seekkrr_acting_session";
export const ACTING_ENDED_PATH = "/creator/acting-ended";

export function getActingSession(): ActingSession | null {
    try {
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return null;
        const session = JSON.parse(raw) as ActingSession;
        if (!session.token || session.endsAt <= Date.now()) {
            sessionStorage.removeItem(KEY);
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

export function clearActingSession(): void {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        /* storage unavailable */
    }
}

/**
 * True when this tab was opened to act as a creator (read once at startup). It
 * never falls back to the admin's own sign-in, even after the session ends.
 */
export const ACTING_TAB = getActingSession() !== null;

// Bare client: the exchange and end calls must not run the main client's
// refresh-and-retry handling (that belongs to the admin's own session).
const bare = axios.create({ baseURL: config.api.baseUrl, timeout: config.api.timeout, headers: { "Content-Type": "application/json" } });

interface ExchangeResponse {
    access_token: string;
    expires_in: number;
    acting: { session_id: string; user: { id: string; name: string }; admin: { id: string; name: string } };
}

/** Swap the admin portal's one-time code for the creator's session and keep it in this tab. */
export async function startActingSession(code: string): Promise<ActingSession> {
    const { data } = await bare.post<ExchangeResponse>("/api/v2/impersonation/exchange", { code });
    const session: ActingSession = {
        token: data.access_token,
        endsAt: Date.now() + data.expires_in * 1000,
        sessionId: data.acting.session_id,
        user: data.acting.user,
        admin: data.acting.admin,
    };
    sessionStorage.setItem(KEY, JSON.stringify(session));
    return session;
}

/** End the session on the server (best effort) and forget it here. */
export async function endActingSession(): Promise<void> {
    const session = getActingSession();
    clearActingSession();
    if (!session) return;
    try {
        await bare.post("/api/v2/impersonation/end", {}, { headers: { Authorization: `Bearer ${session.token}` } });
    } catch {
        /* it ends on its own at the time limit */
    }
}

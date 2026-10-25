import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

/** A minimal Web Storage for the node test environment. */
function memoryStorage(): Storage {
    const data = new Map<string, string>();
    return {
        get length() {
            return data.size;
        },
        clear: () => data.clear(),
        getItem: (k) => data.get(k) ?? null,
        key: (i) => [...data.keys()][i] ?? null,
        removeItem: (k) => void data.delete(k),
        setItem: (k, v) => void data.set(k, String(v)),
    };
}

const ACTING = {
    token: "acting-token",
    endsAt: Date.now() + 10 * 60_000,
    sessionId: "s1",
    user: { id: "u1", name: "Kabir K" },
    admin: { id: "a1", name: "Asha K" },
};

beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("sessionStorage", memoryStorage());
    localStorage.setItem("seekkrr_creator_access_token", "admin-token");
    localStorage.setItem("seekkrr_creator_refresh_token", "admin-refresh");
});

afterEach(() => vi.unstubAllGlobals());

describe("a tab acting as a creator", () => {
    test("uses only the creator's session and never touches the admin's tokens", async () => {
        sessionStorage.setItem("seekkrr_acting_session", JSON.stringify(ACTING));
        const { authStorage } = await import("./api");
        expect(authStorage.getToken()).toBe("acting-token");
        expect(authStorage.getRefreshToken()).toBeNull();

        authStorage.setTokens("other", "other-refresh");
        authStorage.clearTokens();
        expect(sessionStorage.getItem("seekkrr_acting_session")).toBeNull();
        expect(localStorage.getItem("seekkrr_creator_access_token")).toBe("admin-token");
        expect(localStorage.getItem("seekkrr_creator_refresh_token")).toBe("admin-refresh");
        // Once the session is gone it doesn't fall back to the admin's sign-in.
        expect(authStorage.getToken()).toBeNull();
    });

    test("an ended session is forgotten", async () => {
        sessionStorage.setItem("seekkrr_acting_session", JSON.stringify({ ...ACTING, endsAt: Date.now() - 1 }));
        const { getActingSession, ACTING_TAB } = await import("./actingSession");
        expect(ACTING_TAB).toBe(false);
        expect(getActingSession()).toBeNull();
        expect(sessionStorage.getItem("seekkrr_acting_session")).toBeNull();
    });
});

describe("a normal tab", () => {
    test("keeps using the signed-in user's own tokens", async () => {
        const { authStorage } = await import("./api");
        expect(authStorage.getToken()).toBe("admin-token");
        expect(authStorage.getRefreshToken()).toBe("admin-refresh");
    });
});

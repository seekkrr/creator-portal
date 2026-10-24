import { create } from "zustand";

/**
 * Workspace preferences for dual-role accounts (creator ↔ business, and which
 * business when the user belongs to several). Stored per user in localStorage;
 * every access is wrapped in try/catch because storage can be unavailable
 * (private mode, blocked site data) — the portal must work without it.
 */

export type WorkspaceMode = "creator" | "business";

export interface WorkspacePrefs {
    mode?: WorkspaceMode;
    businessId?: string;
}

const STORAGE_KEY = "seekkrr_portal_workspace";

function readAll(): Record<string, WorkspacePrefs> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? (parsed as Record<string, WorkspacePrefs>) : {};
    } catch {
        return {};
    }
}

function writeAll(all: Record<string, WorkspacePrefs>): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
        /* storage unavailable — keep the in-memory value only */
    }
}

interface WorkspaceStore {
    prefs: Record<string, WorkspacePrefs>;
    setMode: (userId: string, mode: WorkspaceMode) => void;
    setBusiness: (userId: string, businessId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()((set, get) => ({
    prefs: readAll(),
    setMode: (userId, mode) => {
        if (get().prefs[userId]?.mode === mode) return;
        const prefs = { ...get().prefs, [userId]: { ...get().prefs[userId], mode } };
        set({ prefs });
        writeAll(prefs);
    },
    setBusiness: (userId, businessId) => {
        if (get().prefs[userId]?.businessId === businessId) return;
        const prefs = { ...get().prefs, [userId]: { ...get().prefs[userId], businessId } };
        set({ prefs });
        writeAll(prefs);
    },
}));

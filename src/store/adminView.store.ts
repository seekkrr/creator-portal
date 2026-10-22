import { create } from "zustand";
import { isPlatformAdmin } from "@/types";

/**
 * Admin view of the Partner Portal. A platform admin (admin / super_admin /
 * moderator) opens any business with `?business=<id>` on a `/business/...` URL;
 * the admin portal deep-links here that way. The id is remembered for this tab
 * (sessionStorage), so moving between Partner Portal pages keeps the admin view
 * until "Exit". Non-admins are ignored (see `useAdminViewId`).
 *
 * Storage can be unavailable (private mode, blocked site data); every access is
 * wrapped so the portal works without it.
 */

export const ADMIN_VIEW_PARAM = "business";
const STORAGE_KEY = "seekkrr_portal_admin_view";
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

/** The business id asked for by a Partner Portal URL (`/business/...?business=<id>`), if any. */
export function adminViewIdFromUrl(pathname: string, search: string): string | null {
    if (!pathname.startsWith("/business")) return null;
    const id = (new URLSearchParams(search).get(ADMIN_VIEW_PARAM) ?? "").trim();
    return OBJECT_ID_RE.test(id) ? id : null;
}

function save(id: string | null): void {
    try {
        if (id) sessionStorage.setItem(STORAGE_KEY, id);
        else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        /* storage unavailable — keep the in-memory value only */
    }
}

/** On load: the URL wins (a fresh deep link), else what this tab had. Read before sign-in redirects drop the URL. */
function initialId(): string | null {
    if (typeof window === "undefined") return null;
    const fromUrl = adminViewIdFromUrl(window.location.pathname, window.location.search);
    if (fromUrl) {
        save(fromUrl);
        return fromUrl;
    }
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        return stored && OBJECT_ID_RE.test(stored) ? stored : null;
    } catch {
        return null;
    }
}

interface AdminViewStore {
    businessId: string | null;
    /**
     * "Exit" was pressed: the admin view stays until the navigation away lands
     * (see useSyncAdminView), so route guards don't bounce the page meanwhile.
     */
    exiting: boolean;
    open: (businessId: string) => void;
    beginExit: () => void;
    exit: () => void;
}

export const useAdminViewStore = create<AdminViewStore>()((set, get) => ({
    businessId: initialId(),
    exiting: false,
    open: (businessId) => {
        if (get().businessId === businessId && !get().exiting) return;
        save(businessId);
        set({ businessId, exiting: false });
    },
    beginExit: () => set({ exiting: true }),
    exit: () => {
        save(null);
        set({ businessId: null, exiting: false });
    },
}));

/** Non-hook read (auth checks, right after sign-in): the admin view business for this user, if they're an admin. */
export function adminViewIdFor(user: { role?: unknown } | null | undefined): string | null {
    return isPlatformAdmin(user) ? useAdminViewStore.getState().businessId : null;
}

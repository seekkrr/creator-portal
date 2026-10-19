import { useLocation } from "react-router-dom";
import { useAuthStore } from "@store/auth.store";
import { useWorkspaceStore, type WorkspaceMode, type WorkspacePrefs } from "@store/workspace.store";
import { evaluatePortalAccess, type PortalAccess } from "@/types";
import type { Business } from "@services/business.types";

export const CREATOR_HOME = "/creator/dashboard";
export const BUSINESS_HOME = "/business";
export const BUSINESS_APPLY = "/business/apply";
export const ACCESS_DENIED = "/creator/access-denied";

/** Where a signed-in user lands, given their access and saved preference. */
export function resolveHomePath(access: PortalAccess, prefs?: WorkspacePrefs): string {
    if (access.creator && access.business) {
        return prefs?.mode === "business" ? BUSINESS_HOME : CREATOR_HOME;
    }
    if (access.business) return BUSINESS_HOME;
    if (access.creator) return CREATOR_HOME;
    return ACCESS_DENIED;
}

/** Non-hook variant for event handlers (e.g. right after login). */
export function getHomePath(): string {
    const { user, creator, businesses } = useAuthStore.getState();
    const access = evaluatePortalAccess(user, creator, businesses);
    const prefs = user ? useWorkspaceStore.getState().prefs[user._id] : undefined;
    return resolveHomePath(access, prefs);
}

export function pickActiveBusiness(businesses: Business[], prefs?: WorkspacePrefs): Business | null {
    return businesses.find((b) => b.id === prefs?.businessId) ?? businesses[0] ?? null;
}

export interface Workspace {
    access: PortalAccess;
    /** Dual-role account: show the Creator ↔ Business switcher. */
    isDualRole: boolean;
    /** Workspace of the current route. */
    mode: WorkspaceMode;
    businesses: Business[];
    activeBusiness: Business | null;
    homePath: string;
    setActiveBusiness: (businessId: string) => void;
    rememberMode: (mode: WorkspaceMode) => void;
}

export function useWorkspace(): Workspace {
    const location = useLocation();
    const user = useAuthStore((s) => s.user);
    const creator = useAuthStore((s) => s.creator);
    const businesses = useAuthStore((s) => s.businesses);
    const prefs = useWorkspaceStore((s) => (user ? s.prefs[user._id] : undefined));
    const setBusiness = useWorkspaceStore((s) => s.setBusiness);
    const setMode = useWorkspaceStore((s) => s.setMode);

    const access = evaluatePortalAccess(user, creator, businesses);
    const mode: WorkspaceMode = location.pathname.startsWith("/business") ? "business" : "creator";

    return {
        access,
        isDualRole: access.creator && access.business,
        mode,
        businesses: access.business ? businesses : [],
        activeBusiness: access.business ? pickActiveBusiness(businesses, prefs) : null,
        homePath: resolveHomePath(access, prefs),
        setActiveBusiness: (businessId) => {
            if (user) setBusiness(user._id, businessId);
        },
        rememberMode: (m) => {
            if (user) setMode(user._id, m);
        },
    };
}

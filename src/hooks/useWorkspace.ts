import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@store/auth.store";
import { useWorkspaceStore, type WorkspaceMode, type WorkspacePrefs } from "@store/workspace.store";
import { adminViewIdFor, useAdminViewStore } from "@store/adminView.store";
import { evaluatePortalAccess, hasBusinessAccess, type PortalAccess } from "@/types";
import type { Business } from "@services/business.types";
import { useAdminViewBusiness } from "./useAdminView";

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
    const access = evaluatePortalAccess(user, creator, businesses, adminViewIdFor(user));
    const prefs = user ? useWorkspaceStore.getState().prefs[user._id] : undefined;
    return resolveHomePath(access, prefs);
}

export function pickActiveBusiness(businesses: Business[], prefs?: WorkspacePrefs): Business | null {
    return businesses.find((b) => b.id === prefs?.businessId) ?? businesses[0] ?? null;
}

/** A platform admin working on a business they may not belong to (`?business=<id>`). */
export interface AdminViewState {
    active: boolean;
    businessId: string | null;
    /** Loaded business (`my_role: "owner"`, `admin_view: true`); null while loading or on error. */
    business: Business | null;
    isLoading: boolean;
    error: unknown;
    /** Leave the admin view and go back to the user's own workspace. */
    exit: () => void;
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
    adminView: AdminViewState;
}

export function useWorkspace(): Workspace {
    const location = useLocation();
    const user = useAuthStore((s) => s.user);
    const creator = useAuthStore((s) => s.creator);
    const businesses = useAuthStore((s) => s.businesses);
    const prefs = useWorkspaceStore((s) => (user ? s.prefs[user._id] : undefined));
    const setBusiness = useWorkspaceStore((s) => s.setBusiness);
    const setMode = useWorkspaceStore((s) => s.setMode);
    const beginExitAdminView = useAdminViewStore((s) => s.beginExit);
    const navigate = useNavigate();
    const admin = useAdminViewBusiness();

    const access = evaluatePortalAccess(user, creator, businesses, admin.businessId);
    const mode: WorkspaceMode = location.pathname.startsWith("/business") ? "business" : "creator";
    const own = hasBusinessAccess(user, businesses) ? businesses : [];
    // Admin view: the viewed business leads the list and is the active one.
    const list = admin.business ? [admin.business, ...own.filter((b) => b.id !== admin.business?.id)] : own;
    const activeBusiness = access.adminView ? admin.business : pickActiveBusiness(own, prefs);

    // The admin view ends once this navigation lands (useSyncAdminView), so guards don't redirect first.
    const exitAdminView = (to?: string) => {
        const ownAccess = evaluatePortalAccess(user, creator, businesses);
        beginExitAdminView();
        navigate(to ?? (ownAccess.business ? BUSINESS_HOME : resolveHomePath(ownAccess, prefs)));
    };

    return {
        access,
        isDualRole: access.creator && access.business,
        mode,
        businesses: list,
        activeBusiness,
        homePath: resolveHomePath(access, prefs),
        setActiveBusiness: (businessId) => {
            if (user) setBusiness(user._id, businessId);
            if (access.adminView && businessId !== admin.businessId) exitAdminView(BUSINESS_HOME);
        },
        rememberMode: (m) => {
            if (user) setMode(user._id, m);
        },
        adminView: {
            active: access.adminView,
            businessId: admin.businessId,
            business: admin.business,
            isLoading: admin.isLoading,
            error: admin.error,
            exit: () => exitAdminView(),
        },
    };
}

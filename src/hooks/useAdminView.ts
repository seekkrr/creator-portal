import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@store/auth.store";
import { adminViewIdFromUrl, useAdminViewStore } from "@store/adminView.store";
import { businessService } from "@services/business.service";
import { bkeys } from "@features/business/queries";
import { isPlatformAdmin } from "@/types";
import type { Business } from "@services/business.types";

/**
 * The business a signed-in platform admin is viewing: the URL's `?business=`
 * (on a /business route) first, else the one kept for this tab. Always null
 * for everyone else, so the param is ignored for normal users.
 */
export function useAdminViewId(): string | null {
    const location = useLocation();
    const user = useAuthStore((s) => s.user);
    const stored = useAdminViewStore((s) => s.businessId);
    if (!isPlatformAdmin(user)) return null;
    return adminViewIdFromUrl(location.pathname, location.search) ?? stored;
}

/**
 * Keeps the tab's admin view in step with the URL (mount once, above every
 * route): a new `?business=` opens it; a non-admin never keeps one; "Exit"
 * finishes once its navigation has landed. Only a *new* id in the URL opens it,
 * so "Exit" isn't undone while the address bar catches up.
 */
export function useSyncAdminView(): void {
    const location = useLocation();
    const user = useAuthStore((s) => s.user);
    const stored = useAdminViewStore((s) => s.businessId);
    const open = useAdminViewStore((s) => s.open);
    const exit = useAdminViewStore((s) => s.exit);
    const urlId = adminViewIdFromUrl(location.pathname, location.search);
    const admin = isPlatformAdmin(user);
    const lastUrlId = useRef<string | null>(null);

    // Every navigation: an "Exit" in progress has arrived, so drop the admin view now.
    useEffect(() => {
        if (useAdminViewStore.getState().exiting) exit();
    }, [location.key, exit]);

    useEffect(() => {
        if (!user) return;
        if (!admin) {
            if (stored) exit();
            return;
        }
        if (urlId && urlId !== lastUrlId.current) open(urlId);
        lastUrlId.current = urlId;
    }, [user, admin, urlId, stored, open, exit]);
}

/** Renders nothing; keeps the admin view in step with navigation (see useSyncAdminView). */
export function AdminViewSync(): null {
    useSyncAdminView();
    return null;
}

export interface AdminViewBusiness {
    businessId: string | null;
    /** The business as the admin works on it: `my_role: "owner"`, `admin_view: true`. */
    business: Business | null;
    isLoading: boolean;
    error: unknown;
}

/** Loads the admin view business (`GET /businesses/{id}` — staff may read any business). */
export function useAdminViewBusiness(): AdminViewBusiness {
    const businessId = useAdminViewId();
    const query = useQuery({
        // Same key as the layout's business detail, so both share one request.
        queryKey: bkeys.detail(businessId ?? ""),
        queryFn: () => businessService.get(businessId as string),
        enabled: !!businessId,
        staleTime: 30_000,
        retry: false,
    });
    const data = query.data;
    const business = useMemo<Business | null>(
        () => (businessId && data && data.id === businessId ? { ...data, my_role: "owner", admin_view: true } : null),
        [businessId, data]
    );
    return { businessId, business, isLoading: !!businessId && query.isLoading, error: businessId ? query.error : null };
}

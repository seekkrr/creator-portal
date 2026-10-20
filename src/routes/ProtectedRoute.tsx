import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@store/auth.store";
import { useWorkspaceStore } from "@store/workspace.store";
import { LoadingFallback } from "@components/LoadingFallback";
import { evaluatePortalAccess } from "@/types";
import { ACCESS_DENIED, BUSINESS_APPLY, BUSINESS_HOME, resolveHomePath } from "@hooks/useWorkspace";
import type { ReactNode } from "react";

/**
 * Which workspace a route group belongs to:
 *  - "creator":  quest tooling — creators (and staff) only; business-only users go to the Partner Portal.
 *  - "business": Partner Portal — business members only; everyone else is offered the application.
 *  - "any":      any signed-in user (e.g. the business application form).
 */
export type RouteWorkspace = "creator" | "business" | "any";

interface ProtectedRouteProps {
    children: ReactNode;
    workspace?: RouteWorkspace;
}

export function ProtectedRoute({ children, workspace = "creator" }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user, creator, businesses } = useAuthStore();
    const location = useLocation();

    if (isLoading) {
        return <LoadingFallback message="Checking authentication..." />;
    }

    if (!isAuthenticated) {
        // Redirect to login with return URL
        return <Navigate to="/creator/login" state={{ from: location }} replace />;
    }

    if (!user || workspace === "any") return <>{children}</>;

    const access = evaluatePortalAccess(user, creator, businesses);

    if (workspace === "business") {
        // Signed in but not a member of any business → apply first.
        return access.business ? <>{children}</> : <Navigate to={BUSINESS_APPLY} replace />;
    }

    // Creator workspace. Business-only accounts never see quest tooling.
    if (access.creator) return <>{children}</>;
    if (access.business) return <Navigate to={BUSINESS_HOME} replace />;
    return <Navigate to={ACCESS_DENIED} replace />;
}

/** `/` → the signed-in user's workspace home, or the login page. */
export function HomeRedirect() {
    const { isAuthenticated, isLoading, user, creator, businesses } = useAuthStore();
    const prefs = useWorkspaceStore((s) => (user ? s.prefs[user._id] : undefined));

    if (isLoading) return <LoadingFallback message="Checking authentication..." />;
    if (!isAuthenticated || !user) return <Navigate to="/creator/login" replace />;
    const access = evaluatePortalAccess(user, creator, businesses);
    return <Navigate to={resolveHomePath(access, prefs)} replace />;
}

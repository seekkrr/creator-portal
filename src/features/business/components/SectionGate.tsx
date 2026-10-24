import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@components/ui";
import type { PartnerSection } from "@services/business.types";
import { usePartnerPortal } from "../partnerPortal";

/**
 * Route guard for a Partner Portal page the admin can hide. Waits for the
 * settings on first load (so a hidden page never renders), then shows the
 * page or sends the business back to the Overview.
 */
export function SectionGate({ section, children }: { section: PartnerSection; children: ReactNode }) {
    const { show, isLoading } = usePartnerPortal();
    if (isLoading) {
        return (
            <div className="space-y-6" aria-busy="true">
                <Skeleton height={40} className="w-72" />
                <Skeleton height={260} />
            </div>
        );
    }
    if (!show(section)) return <Navigate to="/business" replace />;
    return <>{children}</>;
}

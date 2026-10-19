import { createContext, useContext } from "react";
import type { Business, MemberRole } from "@services/business.types";

export interface BusinessContextValue {
    business: Business;
    businessId: string;
    role: MemberRole;
    /** Billing, team and owner-only profile fields. */
    isOwner: boolean;
    /** Manager or owner: edit collabs, codes, profile; discover & invite creators. */
    canManage: boolean;
}

export const BusinessContext = createContext<BusinessContextValue | null>(null);

/** The active business of the Partner Portal (provided by BusinessLayout). */
export function useBusiness(): BusinessContextValue {
    const value = useContext(BusinessContext);
    if (!value) throw new Error("useBusiness must be used inside the Partner Portal layout");
    return value;
}

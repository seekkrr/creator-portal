import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { businessService } from "@services/business.service";
import type { PartnerSection } from "@services/business.types";

/**
 * Fail closed: until the admin settings load (or if they can't be loaded),
 * plans, matchmaking and team stay hidden and everything else is shown.
 */
export const PARTNER_SECTION_DEFAULTS: Record<PartnerSection, boolean> = {
    plans: false,
    matchmaking: false,
    attribution: true,
    content_library: true,
    offers: true,
    team: false,
    messages: true,
    blocked_creators: true,
};

export const partnerPortalKey = ["partner-portal-settings"] as const;

export interface PartnerPortalValue {
    sections: Record<PartnerSection, boolean>;
    /** Whether a section is switched on by the admin. */
    show: (section: PartnerSection) => boolean;
    /** Plan names, usage limits, billing and upgrade prompts. */
    plansVisible: boolean;
    /** Discover creators, match scores, profile reveals and invites. */
    matchmakingVisible: boolean;
    /** True once the admin's settings arrived (false while loading or on error). */
    isLoaded: boolean;
    isLoading: boolean;
}

/** What the admin lets businesses see in the Partner Portal (`GET /config/partner-portal`). */
export function usePartnerPortal(): PartnerPortalValue {
    const query = useQuery({
        queryKey: partnerPortalKey,
        queryFn: () => businessService.partnerPortalSettings(),
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        retry: 1,
    });

    const sections = useMemo<Record<PartnerSection, boolean>>(() => {
        if (!query.data) return PARTNER_SECTION_DEFAULTS;
        const out = { ...PARTNER_SECTION_DEFAULTS };
        for (const key of Object.keys(out) as PartnerSection[]) {
            const v = query.data.sections?.[key];
            if (typeof v === "boolean") out[key] = v;
        }
        return out;
    }, [query.data]);

    const show = useCallback((section: PartnerSection) => sections[section], [sections]);

    return {
        sections,
        show,
        plansVisible: sections.plans,
        matchmakingVisible: sections.matchmaking,
        isLoaded: !!query.data,
        isLoading: query.isLoading,
    };
}

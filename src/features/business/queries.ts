import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { businessService } from "@services/business.service";
import { regionService } from "@services/region.service";
import type { ListApplicationsParams } from "@services/business.types";
import { useBusiness } from "./context";
import { errorMessage, isQuotaError } from "./utils";

/** React Query keys — everything for one business lives under ["business", id]. */
export const bkeys = {
    all: (id: string) => ["business", id] as const,
    hub: (id: string) => ["business", id, "hub"] as const,
    detail: (id: string) => ["business", id, "detail"] as const,
    collabs: (id: string, includeArchived: boolean) => ["business", id, "collabs", { includeArchived }] as const,
    applications: (id: string, params: ListApplicationsParams) => ["business", id, "applications", params] as const,
    analytics: (id: string, days: number) => ["business", id, "analytics", days] as const,
    content: (id: string) => ["business", id, "content"] as const,
    attribution: (id: string) => ["business", id, "attribution"] as const,
    matches: (id: string, collabId: string) => ["business", id, "matches", collabId] as const,
    billing: (id: string) => ["business", id, "billing"] as const,
    invoices: (id: string) => ["business", id, "invoices"] as const,
    blocks: (id: string) => ["business", id, "blocks"] as const,
    redeemCode: (id: string, markerId: string) => ["business", id, "redeem-code", markerId] as const,
    offers: (markerId: string) => ["offers", markerId] as const,
    offerAnalytics: (markerId: string) => ["offers", markerId, "analytics"] as const,
};

export function useHub() {
    const { businessId } = useBusiness();
    return useQuery({
        queryKey: bkeys.hub(businessId),
        queryFn: () => businessService.hub(businessId),
        staleTime: 30_000,
    });
}

export function useBusinessDetail() {
    const { businessId } = useBusiness();
    return useQuery({
        queryKey: bkeys.detail(businessId),
        queryFn: () => businessService.get(businessId),
        staleTime: 30_000,
    });
}

export function useCollabs(includeArchived = false) {
    const { businessId } = useBusiness();
    return useQuery({
        queryKey: bkeys.collabs(businessId, includeArchived),
        queryFn: () => businessService.listCollabs(businessId, includeArchived),
        staleTime: 30_000,
    });
}

export function useApplications(params: ListApplicationsParams, enabled = true) {
    const { businessId } = useBusiness();
    return useQuery({
        queryKey: bkeys.applications(businessId, params),
        queryFn: () => businessService.listApplications(businessId, params),
        staleTime: 15_000,
        enabled,
    });
}

/** Name of the business's region (e.g. "Bir") for copy like "creators in Bir". */
export function useRegionName(): string | null {
    const { business } = useBusiness();
    const region = useQuery({
        queryKey: ["region", business.region_id],
        queryFn: () => regionService.getRegion(business.region_id ?? ""),
        enabled: !!business.region_id,
        staleTime: 60 * 60_000,
        retry: false,
    });
    return region.data?.name ?? null;
}

/** Refetch everything cached for the active business (after any mutation). */
export function useInvalidateBusiness() {
    const queryClient = useQueryClient();
    const { businessId } = useBusiness();
    return useCallback(
        () => queryClient.invalidateQueries({ queryKey: bkeys.all(businessId) }),
        [queryClient, businessId]
    );
}

/**
 * 402 QUOTA_EXCEEDED → an upgrade prompt linking to Billing; anything else → a
 * toast with the backend's message. Render `<UpgradeDialog {...upgrade} />`.
 */
export function useUpgradePrompt() {
    const [message, setMessage] = useState<string | null>(null);

    const notifyError = useCallback((e: unknown, fallback?: string) => {
        if (isQuotaError(e)) {
            setMessage(e.message || "You've reached your plan's limit.");
            return;
        }
        toast.error(errorMessage(e, fallback));
    }, []);

    const showUpgrade = useCallback((msg: string) => setMessage(msg), []);

    return {
        notifyError,
        showUpgrade,
        upgrade: { open: message !== null, message: message ?? "", onClose: () => setMessage(null) },
    };
}

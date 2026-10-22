import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { experienceService } from "@services/experience.service";
import type { ListBookingsParams } from "@services/experience.types";
import { useBusiness } from "../context";
import { isForbidden, isNotFound } from "../utils";

/** Keys live under ["business", id] so `useInvalidateBusiness` refreshes them too. */
export const xkeys = {
    all: (id: string) => ["business", id, "experiences"] as const,
    list: (id: string) => ["business", id, "experiences", "list"] as const,
    detail: (id: string, experienceId: string) => ["business", id, "experiences", "detail", experienceId] as const,
    slots: (id: string, experienceId: string, range: { from?: string; to?: string }) =>
        ["business", id, "experiences", "slots", experienceId, range] as const,
    bookings: (id: string, params: ListBookingsParams) => ["business", id, "experiences", "bookings", params] as const,
};

/** Don't retry answers that won't change (feature off, not found). */
const retryUnlessFinal = (count: number, e: unknown) => !isForbidden(e) && !isNotFound(e) && count < 1;

export function useExperiences(enabled = true) {
    const { businessId } = useBusiness();
    return useQuery({
        queryKey: xkeys.list(businessId),
        queryFn: () => experienceService.list(businessId),
        staleTime: 30_000,
        retry: retryUnlessFinal,
        enabled,
    });
}

export function useExperience(experienceId: string | undefined) {
    const { businessId } = useBusiness();
    return useQuery({
        queryKey: xkeys.detail(businessId, experienceId ?? ""),
        queryFn: () => experienceService.get(businessId, experienceId ?? ""),
        enabled: !!experienceId,
        staleTime: 30_000,
        retry: retryUnlessFinal,
    });
}

export function useExperienceSlots(experienceId: string | undefined, range: { from?: string; to?: string }) {
    const { businessId } = useBusiness();
    return useQuery({
        queryKey: xkeys.slots(businessId, experienceId ?? "", range),
        queryFn: () => experienceService.listSlots(businessId, experienceId ?? "", range),
        enabled: !!experienceId,
        staleTime: 15_000,
        retry: retryUnlessFinal,
    });
}

export function useExperienceBookings(params: ListBookingsParams, enabled = true) {
    const { businessId } = useBusiness();
    return useQuery({
        queryKey: xkeys.bookings(businessId, params),
        queryFn: () => experienceService.listBookings(businessId, params),
        staleTime: 15_000,
        retry: retryUnlessFinal,
        placeholderData: (prev) => prev,
        enabled,
    });
}

/** Refetch every experiences query of the active business (after a mutation). */
export function useInvalidateExperiences() {
    const queryClient = useQueryClient();
    const { businessId } = useBusiness();
    return useCallback(
        () => queryClient.invalidateQueries({ queryKey: xkeys.all(businessId) }),
        [queryClient, businessId]
    );
}

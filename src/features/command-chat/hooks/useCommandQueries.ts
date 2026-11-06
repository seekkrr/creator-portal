import { useQuery } from "@tanstack/react-query";
import { commandsService, isCommandsApiError } from "@services/commands.service";
import type { CommandScope } from "@services/commands.types";

export const commandQueryKeys = {
    all: ["commands"] as const,
    catalog: (scope: CommandScope) => ["commands", "catalog", scope.surface, scope.businessId ?? "creator"] as const,
    history: () => ["commands", "history"] as const,
};

/** Don't hammer a server that doesn't have the endpoints (or refuses us). */
function retryUnlessFinal(failureCount: number, error: unknown): boolean {
    if (isCommandsApiError(error) && !error.retryable) return false;
    return failureCount < 2;
}

/**
 * What the caller may run here. The chat doesn't list it (no suggestions);
 * the call tells whether this server has the chat and whether it's on.
 */
export function useCommandCatalog(scope: CommandScope) {
    return useQuery({
        queryKey: commandQueryKeys.catalog(scope),
        queryFn: () => commandsService.catalog(scope),
        staleTime: 10 * 60_000,
        retry: retryUnlessFinal,
    });
}

/** The caller's own recent runs. */
export function useCommandHistory(limit = 30) {
    return useQuery({
        queryKey: commandQueryKeys.history(),
        queryFn: () => commandsService.history(limit),
        staleTime: 60_000,
        retry: retryUnlessFinal,
        refetchOnWindowFocus: false,
    });
}

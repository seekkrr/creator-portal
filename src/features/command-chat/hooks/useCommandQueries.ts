import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { commandsService, isCommandsApiError } from "@services/commands.service";
import type { CommandScope } from "@services/commands.types";

export const commandQueryKeys = {
    all: ["commands"] as const,
    catalog: (scope: CommandScope) => ["commands", "catalog", scope.surface, scope.businessId ?? "creator"] as const,
    history: () => ["commands", "history"] as const,
    suggest: (scope: CommandScope, q: string) => ["commands", "suggest", scope.surface, scope.businessId ?? "creator", q] as const,
};

/** Don't hammer a server that doesn't have the endpoints (or refuses us). */
function retryUnlessFinal(failureCount: number, error: unknown): boolean {
    if (isCommandsApiError(error) && !error.retryable) return false;
    return failureCount < 2;
}

/** What the caller may run here, for the "What you can do" list. */
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

function useDebounced<T>(value: T, ms: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = window.setTimeout(() => setDebounced(value), ms);
        return () => window.clearTimeout(t);
    }, [value, ms]);
    return debounced;
}

/** Completions for what's typed so far (debounced 200 ms, at most 8). */
export function useCommandSuggestions(text: string, enabled: boolean, scope: CommandScope) {
    const q = useDebounced(text.replace(/\s+/g, " ").trimStart(), 200);
    const query = useQuery({
        queryKey: commandQueryKeys.suggest(scope, q),
        queryFn: ({ signal }) => commandsService.suggest(q, scope, signal),
        enabled: enabled && q.trim().length > 0,
        staleTime: 30_000,
        retry: false,
        placeholderData: keepPreviousData,
    });
    const typed = text.trim().toLowerCase();
    const suggestions =
        enabled && q.trim() ? (query.data ?? []).filter((s) => s.text.trim().toLowerCase() !== typed).slice(0, 8) : [];
    return { suggestions, isFetching: query.isFetching };
}

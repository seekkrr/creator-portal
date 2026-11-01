import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { commandsService } from "@services/commands.service";
import type { ChatAudience } from "@services/commands.types";

/** Fail closed: until the admin settings load (or if they can't be loaded), the chat stays hidden. */
export const CHAT_AUDIENCE_DEFAULTS: Record<ChatAudience, boolean> = {
    users: false,
    creators: false,
    businesses: false,
    admin: false,
};

export const chatSettingsKey = ["chat-settings"] as const;

export interface ChatSettingsValue {
    audiences: Record<ChatAudience, boolean>;
    /** Whether the admin turned the chat on for a group. */
    isOn: (audience: ChatAudience) => boolean;
    /** True once the admin's settings arrived (false while loading or on error). */
    isLoaded: boolean;
    isLoading: boolean;
}

/** Which groups the admin turned the command chat on for (`GET /config/chat`). */
export function useChatSettings(): ChatSettingsValue {
    const query = useQuery({
        queryKey: chatSettingsKey,
        queryFn: () => commandsService.chatSettings(),
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        retry: 1,
    });

    const audiences = query.data?.audiences ?? CHAT_AUDIENCE_DEFAULTS;
    const isOn = useCallback((audience: ChatAudience) => audiences[audience], [audiences]);

    return { audiences, isOn, isLoaded: !!query.data, isLoading: query.isLoading };
}

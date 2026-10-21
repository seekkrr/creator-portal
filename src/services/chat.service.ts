import { api } from "@services/api";

export interface ChatThread {
    id: string;
    application_id: string;
    title: string;
    want?: string | null;
    offer?: string | null;
    status?: string | null;
    visit_window?: { from?: string; to?: string } | null;
    last_preview?: string | null;
    last_message_at?: string | null;
    unread: number;
    read_only?: string | null;
}

export interface ChatMessage {
    id: string;
    side: "creator" | "business" | "system";
    type: string;
    body: string;
    media_url?: string | null;
    event?: string | null;
    masked?: boolean;
    sender_name?: string | null;
    created_at?: string | null;
}

/** Collab chats, read-only in the portal (replies happen in the SeekKrr app). */
export const chatService = {
    listThreads: async (businessId: string): Promise<ChatThread[]> => {
        const { data } = await api.get<{ threads: ChatThread[] }>("/api/v2/inbox", {
            params: { workspace: `business:${businessId}` },
        });
        return data.threads ?? [];
    },
    messages: async (threadId: string): Promise<ChatMessage[]> => {
        const { data } = await api.get<{ messages: ChatMessage[] }>(`/api/v2/threads/${threadId}/messages`, {
            params: { limit: 100 },
        });
        return data.messages ?? [];
    },
};

import { useCallback, useState } from "react";

const DRAFT_KEY = "seekkrr_partner_command_chat_draft";

function readDraft(scope: string): string {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        if (!raw) return "";
        const parsed = JSON.parse(raw) as { scope?: unknown; text?: unknown };
        return parsed.scope === scope && typeof parsed.text === "string" ? parsed.text : "";
    } catch {
        return "";
    }
}

/** The composer's unsent text, kept for this browser tab session (dropped when the workspace changes). */
export function useSessionDraft(scope: string) {
    const [draft, setDraftState] = useState<string>(() => readDraft(scope));

    const setDraft = useCallback(
        (value: string) => {
            setDraftState(value);
            try {
                if (value) sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ scope, text: value }));
                else sessionStorage.removeItem(DRAFT_KEY);
            } catch {
                /* storage blocked */
            }
        },
        [scope]
    );

    return [draft, setDraft] as const;
}

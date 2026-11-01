import type { ReactNode } from "react";
import { MessageSquareText } from "lucide-react";
import { Skeleton } from "@components/ui";
import { CHAT_DISABLED_MESSAGE } from "@services/commands.service";
import type { ChatAudience } from "@services/commands.types";
import { useChatSettings } from "../chatSettings";

/** Friendly panel for a chat the admin hasn't turned on for this group. */
export function ChatOff() {
    return (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm" role="status">
            <div className="flex flex-col items-center justify-center text-center py-14 px-6">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 text-primary-600 mb-4">
                    <MessageSquareText className="w-7 h-7" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-display font-semibold text-neutral-900">{CHAT_DISABLED_MESSAGE}</h2>
                <p className="text-sm text-neutral-500 mt-1 max-w-md">Everything else in the portal works as usual.</p>
            </div>
        </div>
    );
}

/**
 * Route guard for a command chat the admin turns on per group. Waits for the
 * settings on first load (so a chat that's off never renders), then shows the
 * chat or a short note.
 */
export function ChatGate({ audience, children }: { audience: ChatAudience; children: ReactNode }) {
    const { isOn, isLoading } = useChatSettings();
    if (isLoading) {
        return (
            <div className="space-y-6" aria-busy="true">
                <Skeleton height={40} className="w-72" />
                <Skeleton height={260} />
            </div>
        );
    }
    if (!isOn(audience)) return <ChatOff />;
    return <>{children}</>;
}

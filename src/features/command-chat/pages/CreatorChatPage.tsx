import { Compass } from "lucide-react";
import type { CommandScope } from "@services/commands.types";
import { scopeKey } from "../chatModel";
import { ActingAs } from "../components/ActingAs";
import { CommandChat } from "../components/CommandChat";

/** No business id: the creator area runs creator commands. */
const CREATOR_SCOPE: CommandScope = { surface: "partner", businessId: null };

/** /creator/chat — the command chat acting as the signed-in creator. */
export function CreatorChatPage() {
    return (
        <CommandChat
            key={scopeKey(CREATOR_SCOPE)}
            scope={CREATOR_SCOPE}
            railFrom="lg"
            actingAs={
                <ActingAs
                    mark={
                        <span className="w-6 h-6 rounded-md bg-primary-900 text-highlight flex items-center justify-center" aria-hidden="true">
                            <Compass className="w-3.5 h-3.5" />
                        </span>
                    }
                    name="Creator"
                />
            }
        />
    );
}

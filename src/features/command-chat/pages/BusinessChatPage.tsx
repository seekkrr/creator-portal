import { useMemo } from "react";
import { Store } from "lucide-react";
import { useBusiness } from "@features/business/context";
import { useBusinessFeatures } from "@features/business/features";
import type { CommandScope } from "@services/commands.types";
import { scopeKey } from "../chatModel";
import { ActingAs } from "../components/ActingAs";
import { CommandChat } from "../components/CommandChat";

/**
 * /business/chat — the command chat acting as the active business (the
 * workspace's business, or the one a platform admin opened with
 * `?business=`). Every role sees it; the server decides what each may run.
 * Switching business starts a fresh conversation.
 */
export function BusinessChatPage() {
    const { business, businessId, role } = useBusiness();
    const { features } = useBusinessFeatures();
    const scope = useMemo<CommandScope>(() => ({ surface: "partner", businessId }), [businessId]);

    const mark = business.logo_url ? (
        <img src={business.logo_url} alt="" className="w-6 h-6 rounded-md object-cover border border-neutral-200" />
    ) : (
        <span className="w-6 h-6 rounded-md bg-primary-900 text-highlight flex items-center justify-center" aria-hidden="true">
            <Store className="w-3.5 h-3.5" />
        </span>
    );

    return (
        <CommandChat
            key={scopeKey(scope)}
            scope={scope}
            railFrom="xl"
            actingAs={
                <ActingAs
                    mark={mark}
                    name={business.name}
                    detail={business.admin_view ? "Admin view" : role}
                    chips={[
                        { label: "Collabs", on: features.collabs },
                        { label: "Experiences", on: features.experiences },
                    ]}
                />
            }
        />
    );
}

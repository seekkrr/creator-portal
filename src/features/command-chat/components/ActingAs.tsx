import type { ReactNode } from "react";
import { Check, Minus } from "lucide-react";

export interface ActingAsChip {
    label: string;
    on: boolean;
}

/**
 * "Acting as …" — who the chat works for: the active business (with its
 * Collabs / Experiences switches) or the creator. The server decides what
 * each may run; this line just makes it visible.
 */
export function ActingAs({
    mark,
    name,
    detail,
    chips = [],
}: {
    /** Logo / icon tile. */
    mark: ReactNode;
    name: string;
    /** e.g. the team role, or "Admin view". */
    detail?: string | null;
    chips?: ActingAsChip[];
}) {
    return (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm" role="group" aria-label={`Acting as ${name}`}>
            <span className="text-neutral-500">Acting as</span>
            <span className="inline-flex items-center gap-2 min-w-0">
                {mark}
                <span className="font-semibold text-neutral-900 truncate max-w-[16rem]">{name}</span>
                {detail && <span className="text-xs text-neutral-500 capitalize">{detail}</span>}
            </span>
            {chips.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Switched on for this business">
                    {chips.map((c) => (
                        <li
                            key={c.label}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                                c.on
                                    ? "bg-primary-50 text-primary-700 border-primary-100"
                                    : "bg-neutral-100 text-neutral-500 border-neutral-200"
                            }`}
                        >
                            {c.on ? <Check className="w-3 h-3" aria-hidden="true" /> : <Minus className="w-3 h-3" aria-hidden="true" />}
                            {c.label}
                            <span className={c.on ? "sr-only" : ""}>{c.on ? " on" : " off"}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

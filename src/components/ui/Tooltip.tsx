import { type ReactNode } from "react";
import { HelpCircle } from "lucide-react";

type TooltipSide = "top" | "bottom" | "left" | "right";

const sideClasses: Record<TooltipSide, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

interface TooltipProps {
    content: ReactNode;
    children: ReactNode;
    side?: TooltipSide;
    /** Tailwind width cap for the bubble. */
    widthClass?: string;
    className?: string;
}

/**
 * Lightweight hover/focus tooltip. Shows on pointer hover and keyboard focus
 * (focus-within) so it's accessible. Purely CSS-driven — no portal/listeners.
 */
export function Tooltip({
    content,
    children,
    side = "top",
    widthClass = "w-56",
    className = "",
}: TooltipProps) {
    return (
        <span className={`relative inline-flex group/tooltip ${className}`}>
            {children}
            <span
                role="tooltip"
                className={`
                    pointer-events-none absolute z-[60] ${sideClasses[side]} ${widthClass}
                    rounded-lg bg-neutral-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg
                    opacity-0 scale-95 transition-all duration-150
                    group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100
                    group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:scale-100
                `}
            >
                {content}
            </span>
        </span>
    );
}

interface InfoHintProps {
    text: ReactNode;
    side?: TooltipSide;
    /** Accessible label for the trigger; defaults to "More info". */
    label?: string;
    widthClass?: string;
    className?: string;
}

/**
 * A small "?" help affordance with a tooltip — for per-field hints. Distinct
 * from the section-level "Watch walkthrough" video button.
 */
export function InfoHint({
    text,
    side = "top",
    label = "More info",
    widthClass,
    className = "",
}: InfoHintProps) {
    return (
        <Tooltip content={text} side={side} widthClass={widthClass}>
            <button
                type="button"
                aria-label={label}
                className={`inline-flex items-center justify-center text-neutral-400 hover:text-neutral-600 focus:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 rounded-full transition-colors ${className}`}
            >
                <HelpCircle className="w-4 h-4" />
            </button>
        </Tooltip>
    );
}

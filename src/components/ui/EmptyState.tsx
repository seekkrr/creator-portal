import type { ReactNode } from "react";

interface EmptyStateProps {
    /** Icon node, rendered inside a brand `bg-primary-50` circle. */
    icon: ReactNode;
    /** Short headline, rendered in the display font. */
    title: string;
    /** One line of neutral supporting copy. */
    description: string;
    /** Optional CTA — typically a brand `Button variant="accent"` or `primary`. */
    action?: ReactNode;
    className?: string;
}

/**
 * Consistent empty-state block used across every list page.
 * Centered: icon in a primary-tinted circle, display-font title,
 * one line of neutral subtext, and an optional prominent CTA.
 */
export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 text-primary-600 mb-4">
                {icon}
            </div>
            <h3 className="text-lg font-display font-semibold text-neutral-900">{title}</h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-sm">{description}</p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}

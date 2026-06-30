import type { ReactNode } from "react";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info";

/**
 * Quest/content lifecycle statuses. Use the `status` prop instead of `variant`
 * when displaying server-driven workflow state. Consumed by Tasks 4, 6, and 11.
 *
 * Mapping:
 *   approved           → emerald  (bg-emerald-100  text-emerald-700  border-emerald-200)
 *   under_review       → amber    (bg-amber-100    text-amber-700    border-amber-200)
 *   changes_requested  → orange   (bg-orange-100   text-orange-700   border-orange-200)
 *   rejected           → red      (bg-red-100      text-red-700      border-red-200)
 *   draft              → neutral  (bg-neutral-100  text-neutral-700  border-neutral-200)
 *   archived           → muted neutral (bg-neutral-100 text-neutral-500 border-neutral-200)
 */
export type BadgeStatus =
    | "approved"
    | "under_review"
    | "changes_requested"
    | "rejected"
    | "draft"
    | "archived";

interface BadgeProps {
    children: ReactNode;
    /** Visual-semantic variant (brand colours). */
    variant?: BadgeVariant;
    /** Workflow-status variant — takes precedence over `variant` when set. */
    status?: BadgeStatus;
    className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: "bg-neutral-100 text-neutral-700",
    primary: "bg-primary-100 text-primary-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
};

const statusStyles: Record<BadgeStatus, string> = {
    approved:          "bg-emerald-100 text-emerald-700 border border-emerald-200",
    under_review:      "bg-amber-100   text-amber-700   border border-amber-200",
    changes_requested: "bg-orange-100  text-orange-700  border border-orange-200",
    rejected:          "bg-red-100     text-red-700     border border-red-200",
    draft:             "bg-neutral-100 text-neutral-700 border border-neutral-200",
    archived:          "bg-neutral-100 text-neutral-500 border border-neutral-200",
};

export function Badge({ children, variant = "default", status, className = "" }: BadgeProps) {
    const resolvedStyles = status ? statusStyles[status] : variantStyles[variant];

    return (
        <span
            className={`
        inline-flex items-center px-2.5 py-0.5
        text-xs font-medium rounded-full
        ${resolvedStyles}
        ${className}
      `}
        >
            {children}
        </span>
    );
}

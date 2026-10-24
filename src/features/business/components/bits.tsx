import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Lock, Sparkles } from "lucide-react";
import { Button } from "@components/ui";
import type { ApplicationStatus, UsageCounter } from "@services/business.types";
import { APPLICATION_STATUS_META, limitLabel, usageRatio } from "../utils";
import { usePartnerPortal } from "../partnerPortal";

export function PageHeader({
    title,
    description,
    actions,
}: {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary-900 tracking-tight">{title}</h1>
                {description && <p className="text-neutral-500 mt-1">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2 w-full sm:w-auto">{actions}</div>}
        </div>
    );
}

export function SectionCard({
    title,
    description,
    actions,
    children,
    className = "",
}: {
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={`bg-white rounded-2xl border border-neutral-200 shadow-sm ${className}`}>
            {(title || actions) && (
                <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
                    <div className="min-w-0">
                        {title && <h2 className="text-lg font-display font-semibold text-neutral-900">{title}</h2>}
                        {description && <p className="text-sm text-neutral-500 mt-0.5">{description}</p>}
                    </div>
                    {actions}
                </div>
            )}
            <div className="p-5">{children}</div>
        </section>
    );
}

export function KpiCard({
    label,
    value,
    icon,
    hint,
    tone = "primary",
    to,
}: {
    label: string;
    value: ReactNode;
    icon?: ReactNode;
    hint?: ReactNode;
    tone?: "primary" | "amber" | "green" | "blue" | "violet";
    to?: string;
}) {
    const tones = {
        primary: "bg-primary-50 text-primary-600",
        amber: "bg-amber-50 text-amber-600",
        green: "bg-green-50 text-green-600",
        blue: "bg-blue-50 text-blue-600",
        violet: "bg-violet-50 text-violet-600",
    } as const;
    const body = (
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-all h-full">
            <div className="flex items-center gap-4">
                {icon && (
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold text-neutral-900">{value}</p>
                    {hint && <p className="text-xs text-neutral-500 mt-0.5 truncate">{hint}</p>}
                </div>
            </div>
        </div>
    );
    return to ? (
        <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-2xl">
            {body}
        </Link>
    ) : (
        body
    );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${className}`}
        >
            {children}
        </span>
    );
}

export function ApplicationStatusPill({ status }: { status: ApplicationStatus }) {
    const meta = APPLICATION_STATUS_META[status] ?? { label: status, className: "bg-neutral-100 text-neutral-600" };
    return <Pill className={meta.className}>{meta.label}</Pill>;
}

export function Toggle({
    checked,
    onChange,
    label,
    description,
    disabled,
    id,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: ReactNode;
    description?: ReactNode;
    disabled?: boolean;
    id: string;
}) {
    return (
        <div className={`flex items-start gap-3 ${disabled ? "opacity-60" : ""}`}>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
                    checked ? "bg-primary-600" : "bg-neutral-300"
                }`}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        checked ? "translate-x-5" : "translate-x-0.5"
                    }`}
                />
            </button>
            <label htmlFor={id} className="min-w-0 cursor-pointer select-none">
                <span className="block text-sm font-medium text-neutral-800">{label}</span>
                {description && <span className="block text-xs text-neutral-500 mt-0.5">{description}</span>}
            </label>
        </div>
    );
}

export function SegmentedControl<T extends string>({
    value,
    onChange,
    options,
    size = "md",
    ariaLabel,
}: {
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: ReactNode; disabled?: boolean }[];
    size?: "sm" | "md";
    ariaLabel?: string;
}) {
    return (
        <div role="radiogroup" aria-label={ariaLabel} className="inline-flex p-1 rounded-full bg-neutral-100 border border-neutral-200">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    disabled={o.disabled}
                    onClick={() => onChange(o.value)}
                    className={`${size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"} rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        value === o.value ? "bg-white text-primary-800 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export function UsageMeter({ label, counter }: { label: string; counter: UsageCounter | null | undefined }) {
    const ratio = usageRatio(counter);
    const used = counter?.used ?? 0;
    const bar =
        ratio === null ? "bg-primary-300" : ratio >= 1 ? "bg-red-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-primary-500";
    return (
        <div>
            <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-neutral-600">{label}</span>
                <span className="font-semibold text-neutral-900 tabular-nums">
                    {used}
                    <span className="text-neutral-400 font-normal"> / {limitLabel(counter?.limit)}</span>
                </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${bar}`}
                    style={{ width: `${ratio === null ? Math.min(100, used > 0 ? 12 : 0) : Math.max(ratio * 100, used > 0 ? 4 : 0)}%` }}
                />
            </div>
        </div>
    );
}

export function CreatorAvatar({
    name,
    url,
    size = 40,
    blurred = false,
}: {
    name: string;
    url?: string | null;
    size?: number;
    blurred?: boolean;
}) {
    const initials =
        name
            .replace(/•/g, "")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join("") || "?";
    const style = { width: size, height: size };
    if (url && !blurred) {
        return <img src={url} alt="" style={style} className="rounded-full object-cover shrink-0 bg-neutral-100" />;
    }
    return (
        <div
            style={style}
            className={`rounded-full shrink-0 flex items-center justify-center font-semibold text-primary-700 bg-gradient-to-br from-primary-100 to-highlight/60 ${
                blurred ? "blur-[3px]" : ""
            }`}
            aria-hidden="true"
        >
            <span style={{ fontSize: Math.max(11, size * 0.38) }}>{initials}</span>
        </div>
    );
}

export function VerifiedTick({ className = "" }: { className?: string }) {
    return <BadgeCheck className={`w-4 h-4 text-primary-600 ${className}`} aria-label="Verified" />;
}

export function Banner({
    tone = "info",
    icon,
    title,
    children,
    action,
}: {
    tone?: "info" | "warning" | "danger" | "success";
    icon?: ReactNode;
    title: ReactNode;
    children?: ReactNode;
    action?: ReactNode;
}) {
    const tones = {
        info: "bg-primary-50 text-primary-800 border-primary-100",
        warning: "bg-amber-50 text-amber-800 border-amber-100",
        danger: "bg-red-50 text-red-700 border-red-100",
        success: "bg-green-50 text-green-800 border-green-100",
    } as const;
    return (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-3 ${tones[tone]}`}>
            <div className="flex items-start gap-3 flex-1 min-w-0">
                {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
                <div className="min-w-0">
                    <p className="font-semibold">{title}</p>
                    {children && <div className="text-sm opacity-90 mt-0.5">{children}</div>}
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

/**
 * Inline upgrade call-to-action for plan-gated features. With plans hidden it
 * shows `plainTitle`/`plainDescription` (no plan names) and no "See plans" button.
 */
export function UpgradeCallout({
    title,
    plainTitle,
    description,
    plainDescription = "This isn't available for your business right now.",
    compact = false,
}: {
    title: string;
    plainTitle?: string;
    description: ReactNode;
    plainDescription?: ReactNode;
    compact?: boolean;
}) {
    const { plansVisible } = usePartnerPortal();
    return (
        <div
            className={`rounded-2xl border border-dashed border-primary-200 bg-gradient-to-br from-primary-50 to-white ${
                compact ? "p-4" : "p-6 sm:p-8"
            } flex flex-col sm:flex-row sm:items-center gap-4`}
        >
            <div className="w-11 h-11 rounded-xl bg-highlight/40 text-primary-800 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-primary-900">
                    {plansVisible ? title : (plainTitle ?? title)}
                </p>
                <p className="text-sm text-neutral-600 mt-0.5">{plansVisible ? description : plainDescription}</p>
            </div>
            {plansVisible && (
                <Link to="/business/billing" className="shrink-0">
                    <Button variant="accent" size="sm" leftIcon={<Sparkles className="w-4 h-4" />}>
                        See plans
                    </Button>
                </Link>
            )}
        </div>
    );
}

export function FieldLabel({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
    return (
        <div className="mb-1.5">
            <label htmlFor={htmlFor} className="block text-sm font-medium text-neutral-700">
                {children}
            </label>
            {hint && <p className="text-xs text-neutral-500 mt-0.5">{hint}</p>}
        </div>
    );
}

export const selectClass =
    "w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 disabled:bg-neutral-100 disabled:cursor-not-allowed";

export const inputClass =
    "w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 disabled:bg-neutral-100 disabled:cursor-not-allowed";

import { ApiRequestError } from "@services/api";
import type {
    ApplicationSource,
    ApplicationStatus,
    CollabAvailability,
    CollabBrief,
    DeliverableType,
    DisclosureLabel,
    MemberRole,
    Plan,
    UsageCounter,
    UsageRights,
} from "@services/business.types";

// ── Errors ──────────────────────────────────────────────────────────────────

export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
    if (e instanceof Error && e.message) return e.message;
    return fallback;
}

/** 402 QUOTA_EXCEEDED — plan limit reached or feature not included. */
export function isQuotaError(e: unknown): e is ApiRequestError {
    return e instanceof ApiRequestError && (e.status === 402 || e.code === "QUOTA_EXCEEDED");
}

export { NEUTRAL_LIMIT_MESSAGE, neutralPlanMessage } from "./planWording";

export function isNotFound(e: unknown): boolean {
    return e instanceof ApiRequestError && e.status === 404;
}

/** 403 — e.g. a product SeekKrr hasn't switched on for this business. */
export function isForbidden(e: unknown): boolean {
    return e instanceof ApiRequestError && e.status === 403;
}

// ── Formatting ──────────────────────────────────────────────────────────────

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

export function formatINR(value: number | null | undefined, withPaise = false): string {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    return (withPaise ? inrPaise : inr).format(value);
}

function toDate(v: string | null | undefined): Date | null {
    if (!v) return null;
    // Bare dates ("YYYY-MM-DD") are calendar days — parse as local, not UTC.
    const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(v: string | null | undefined, fallback = "—"): string {
    const d = toDate(v);
    return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : fallback;
}

export function formatShortDate(v: string | null | undefined, fallback = "—"): string {
    const d = toDate(v);
    return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : fallback;
}

export function formatDateTime(v: string | null | undefined, fallback = "—"): string {
    const d = toDate(v);
    return d
        ? d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
        : fallback;
}

export function relativeTime(v: string | null | undefined): string {
    const d = toDate(v);
    if (!d) return "—";
    const diff = Date.now() - d.getTime();
    const abs = Math.abs(diff);
    const future = diff < 0;
    const mins = Math.round(abs / 60_000);
    const fmt = (n: number, unit: string) => (future ? `in ${n}${unit}` : `${n}${unit} ago`);
    if (mins < 1) return "just now";
    if (mins < 60) return fmt(mins, "m");
    const hours = Math.round(mins / 60);
    if (hours < 24) return fmt(hours, "h");
    const days = Math.round(hours / 24);
    if (days < 30) return fmt(days, "d");
    return formatDate(v);
}

/** Days from now until `v` (negative when in the past). */
export function daysUntil(v: string | null | undefined): number | null {
    const d = toDate(v);
    if (!d) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export function visitWindowLabel(w: { from: string; to: string } | null | undefined): string | null {
    if (!w) return null;
    return w.from === w.to ? formatShortDate(w.from) : `${formatShortDate(w.from)} – ${formatShortDate(w.to)}`;
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
    return `${n} ${n === 1 ? word : pluralWord}`;
}

/** `<input type="date">` value → ISO datetime at local start / end of day. */
export function dateInputToIso(value: string, endOfDay = false): string | null {
    if (!value) return null;
    const d = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO datetime → `<input type="date">` value in local time. */
export function isoToDateInput(value: string | null | undefined): string {
    const d = toDate(value ?? null);
    if (!d) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── Collab vocabulary ───────────────────────────────────────────────────────

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const DELIVERABLE_TYPES: DeliverableType[] = ["reel", "post", "story", "video", "review"];

// "video" is always a YouTube Short: businesses can't ask creators for long
// videos. The stored type stays "video" so existing briefs keep working.
export const DELIVERABLE_LABELS: Record<DeliverableType, { one: string; many: string }> = {
    reel: { one: "reel", many: "reels" },
    post: { one: "post", many: "posts" },
    story: { one: "story", many: "stories" },
    video: { one: "YouTube Short", many: "YouTube Shorts" },
    review: { one: "review", many: "reviews" },
};

export function deliverableLabel(type: string, count: number): string {
    const meta = DELIVERABLE_LABELS[type as DeliverableType];
    if (!meta) return `${count} × ${type}`;
    return `${count} ${count === 1 ? meta.one : meta.many}`;
}

export const USAGE_RIGHTS_OPTIONS: { value: UsageRights; label: string; hint: string }[] = [
    { value: "none", label: "No reuse", hint: "The content stays on the creator's profile." },
    { value: "repost_30d", label: "Repost for 30 days", hint: "You may reshare it on your channels for 30 days." },
    { value: "repost_unlimited", label: "Repost anytime", hint: "You may reshare it on your channels with credit." },
    { value: "ads", label: "Use in ads", hint: "You may use it in paid promotions." },
];

export function usageRightsLabel(v: string | null | undefined): string {
    return USAGE_RIGHTS_OPTIONS.find((o) => o.value === v)?.label ?? "No reuse";
}

export const DISCLOSURE_OPTIONS: { value: DisclosureLabel; hint: string }[] = [
    { value: "#collab", hint: "A barter collaboration" },
    { value: "#gifted", hint: "A free product or stay" },
    { value: "#ad", hint: "A paid or sponsored post" },
];

/** Short chips that summarise a brief, e.g. ["2 reels", "tag @appas", "#ad"]. */
export function briefChips(brief: Partial<CollabBrief> | null | undefined): string[] {
    if (!brief) return [];
    const chips: string[] = [];
    for (const d of brief.deliverables ?? []) chips.push(deliverableLabel(d.type, d.count));
    const handles = (brief.tag_handles ?? []).filter(Boolean);
    if (handles.length) chips.push(`tag ${handles.map((h) => `@${h.replace(/^@/, "")}`).join(" ")}`);
    if (brief.location_tag) chips.push("location tag");
    for (const h of (brief.hashtags ?? []).slice(0, 3)) chips.push(h.startsWith("#") ? h : `#${h}`);
    if (brief.disclosure_label) chips.push(brief.disclosure_label);
    return chips;
}

/** Short availability description, e.g. ["Mon–Fri", "10:00–13:00", "3/day"]. */
export function availabilitySummary(av: Partial<CollabAvailability> | null | undefined): string[] {
    if (!av) return [];
    const out: string[] = [];
    const days = [...(av.days_of_week ?? [])].sort((a, b) => a - b);
    if (days.length && days.length < 7) {
        const contiguous = days.every((d, i) => i === 0 || d === (days[i - 1] ?? -2) + 1);
        out.push(
            contiguous && days.length > 2
                ? `${DAY_LABELS[days[0] ?? 0]}–${DAY_LABELS[days[days.length - 1] ?? 6]}`
                : days.map((d) => DAY_LABELS[d]).join(", ")
        );
    }
    for (const w of av.time_windows ?? []) out.push(`${w.start}–${w.end}`);
    if (av.daily_cap) out.push(`${av.daily_cap}/day`);
    if (av.blackout_dates?.length) out.push(`${av.blackout_dates.length} blackout date${av.blackout_dates.length === 1 ? "" : "s"}`);
    return out;
}

// ── Applications ────────────────────────────────────────────────────────────

export const APPLICATION_STATUS_META: Record<ApplicationStatus, { label: string; className: string }> = {
    invited: { label: "Invited", className: "bg-violet-50 text-violet-700 border-violet-200" },
    requested: { label: "Requested", className: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "Approved", className: "bg-blue-50 text-blue-700 border-blue-200" },
    redeemed: { label: "Redeemed", className: "bg-primary-50 text-primary-700 border-primary-200" },
    delivered: { label: "Content delivered", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    overdue: { label: "Overdue", className: "bg-orange-50 text-orange-700 border-orange-200" },
    completed: { label: "Completed", className: "bg-green-50 text-green-700 border-green-200" },
    declined: { label: "Declined", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
    expired: { label: "Expired", className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
    cancelled: { label: "Cancelled", className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
    no_show: { label: "No-show", className: "bg-red-50 text-red-700 border-red-200" },
};

export const SOURCE_LABELS: Record<ApplicationSource, string> = {
    walk_in: "Walk-in",
    advance: "Advance request",
    invite: "Your invite",
};

const SOCIAL_BASE: Record<string, (h: string) => string> = {
    instagram: (h) => `https://instagram.com/${h}`,
    youtube: (h) => `https://youtube.com/@${h}`,
    x: (h) => `https://x.com/${h}`,
    facebook: (h) => `https://facebook.com/${h}`,
    linkedin: (h) => `https://linkedin.com/in/${h}`,
};

export function socialUrl(platform: string, handle: string | null | undefined): string | null {
    if (!handle) return null;
    const clean = handle.replace(/^@/, "").trim();
    if (!clean) return null;
    if (/^https?:\/\//i.test(clean)) return clean;
    const build = SOCIAL_BASE[platform.toLowerCase()];
    return build ? build(clean) : null;
}

export const PLATFORM_LABELS: Record<string, string> = {
    instagram: "Instagram",
    youtube: "YouTube",
    x: "X",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    website: "Website",
};

// ── Plans & usage ───────────────────────────────────────────────────────────

export function limitLabel(limit: number | null | undefined): string {
    return limit === null || limit === undefined ? "Unlimited" : String(limit);
}

/** 0..1 share of the limit used; null when unlimited. */
export function usageRatio(c: UsageCounter | null | undefined): number | null {
    if (!c || c.limit === null || c.limit === undefined) return null;
    if (c.limit <= 0) return 1;
    return Math.min(1, c.used / c.limit);
}

export const PLAN_ORDER = ["free", "growth", "pro", "multi_location"];

export function planName(plans: Plan[] | undefined, code: string | null | undefined): string {
    if (!code) return "—";
    const p = plans?.find((x) => x.code === code);
    if (p?.name) return p.name;
    return code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const PLAN_STATUS_META: Record<string, { label: string; className: string }> = {
    free: { label: "Free", className: "bg-neutral-100 text-neutral-700 border-neutral-200" },
    trialing: { label: "Free trial", className: "bg-violet-50 text-violet-700 border-violet-200" },
    active: { label: "Active", className: "bg-green-50 text-green-700 border-green-200" },
    pending: { label: "Payment pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
    halted: { label: "Payment failed", className: "bg-red-50 text-red-700 border-red-200" },
    cancelled: { label: "Cancelled", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
    trial_ended: { label: "Trial ended", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
    payment_failed: { label: "Payment failed", className: "bg-red-50 text-red-700 border-red-200" },
};

const FREE_STATUS_META = { label: "Free", className: "bg-neutral-100 text-neutral-700 border-neutral-200" };
const INCLUDED_STATUS_META = { label: "Included", className: "bg-green-50 text-green-700 border-green-200" };

/**
 * Pill for the effective plan status. A business with no paid subscription
 * reports status "free" even when the platform default plan (e.g. Growth)
 * applies — that's "Included", not "Free".
 */
export function planStatusMeta(
    status: string | null | undefined,
    planCode?: string | null
): { label: string; className: string } {
    const s = status ?? "free";
    if (s === "free" && planCode && planCode !== "free") return INCLUDED_STATUS_META;
    return PLAN_STATUS_META[s] ?? FREE_STATUS_META;
}

// ── Team ────────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<MemberRole, string> = {
    owner: "Owner",
    manager: "Manager",
    staff: "Staff",
};

export const ROLE_HINTS: Record<MemberRole, string> = {
    owner: "Everything, including billing and the team.",
    manager: "Edits UGC briefs, redeem codes and the profile; discovers and invites creators.",
    staff: "Sees the redeem code and approves requests at the counter.",
};

/** Role hints without the parts the admin has hidden (billing, creator discovery). */
export function roleHints(opts: { plans: boolean; matchmaking: boolean }): Record<MemberRole, string> {
    return {
        owner: opts.plans ? ROLE_HINTS.owner : "Everything, including the team.",
        manager: opts.matchmaking ? ROLE_HINTS.manager : "Edits UGC briefs, redeem codes and the profile.",
        staff: ROLE_HINTS.staff,
    };
}

const ROLE_RANK: Record<MemberRole, number> = { staff: 0, manager: 1, owner: 2 };

export function roleAtLeast(role: MemberRole | null | undefined, min: MemberRole): boolean {
    if (!role) return false;
    return ROLE_RANK[role] >= ROLE_RANK[min];
}

// ── Misc ────────────────────────────────────────────────────────────────────

export const INDIAN_STATES: { code: string; name: string }[] = [
    { code: "01", name: "Jammu & Kashmir" },
    { code: "02", name: "Himachal Pradesh" },
    { code: "03", name: "Punjab" },
    { code: "04", name: "Chandigarh" },
    { code: "05", name: "Uttarakhand" },
    { code: "06", name: "Haryana" },
    { code: "07", name: "Delhi" },
    { code: "08", name: "Rajasthan" },
    { code: "09", name: "Uttar Pradesh" },
    { code: "10", name: "Bihar" },
    { code: "11", name: "Sikkim" },
    { code: "12", name: "Arunachal Pradesh" },
    { code: "13", name: "Nagaland" },
    { code: "14", name: "Manipur" },
    { code: "15", name: "Mizoram" },
    { code: "16", name: "Tripura" },
    { code: "17", name: "Meghalaya" },
    { code: "18", name: "Assam" },
    { code: "19", name: "West Bengal" },
    { code: "20", name: "Jharkhand" },
    { code: "21", name: "Odisha" },
    { code: "22", name: "Chhattisgarh" },
    { code: "23", name: "Madhya Pradesh" },
    { code: "24", name: "Gujarat" },
    { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
    { code: "27", name: "Maharashtra" },
    { code: "29", name: "Karnataka" },
    { code: "30", name: "Goa" },
    { code: "31", name: "Lakshadweep" },
    { code: "32", name: "Kerala" },
    { code: "33", name: "Tamil Nadu" },
    { code: "34", name: "Puducherry" },
    { code: "35", name: "Andaman & Nicobar Islands" },
    { code: "36", name: "Telangana" },
    { code: "37", name: "Andhra Pradesh" },
    { code: "38", name: "Ladakh" },
];

export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

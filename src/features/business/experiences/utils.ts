import type {
    Experience,
    ExperienceBookingStatus,
    ExperienceSlot,
    ExperienceStatus,
    TitledText,
} from "@services/experience.types";

// ── Copy ────────────────────────────────────────────────────────────────────

export const PAYMENTS_NOTE =
    "Customers pay in the SeekKrr app when they book. SeekKrr collects the payment and pays you out, minus its commission.";

export const PRICE_SET_BY_SEEKKRR = "Price set by SeekKrr";
export const PRICE_NOT_SET = "SeekKrr will set the price";

export const OPTIONS_HINT =
    "Use options when you offer different sessions or games, e.g. Hatha and Vinyasa yoga. Each slot belongs to one option.";

/** The three sections from the design, offered as a one-click prefill. */
export const STANDARD_CANCELLATION_POLICY: TitledText[] = [
    {
        title: "100% Weather Guarantee",
        description:
            "If bad weather makes the experience unsafe, we'll move you to another slot or give you a full refund.",
    },
    {
        title: "Standard Cancellations",
        description: "Cancel up to 48 hours before the start time for a full refund.",
    },
    {
        title: "Late Cancellations",
        description: "Cancellations within 48 hours of the start time are non-refundable.",
    },
];

// ── Status ──────────────────────────────────────────────────────────────────

export const EXPERIENCE_STATUS_META: Record<ExperienceStatus, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-neutral-100 text-neutral-700 border-neutral-200" },
    published: { label: "Published", className: "bg-green-50 text-green-700 border-green-200" },
    paused: { label: "Paused", className: "bg-amber-50 text-amber-700 border-amber-200" },
    archived: { label: "Archived", className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

export const BOOKING_STATUS_META: Record<ExperienceBookingStatus, { label: string; className: string }> = {
    pending_payment: { label: "Awaiting payment", className: "bg-amber-50 text-amber-700 border-amber-200" },
    confirmed: { label: "Confirmed", className: "bg-blue-50 text-blue-700 border-blue-200" },
    checked_in: { label: "Checked in", className: "bg-green-50 text-green-700 border-green-200" },
    cancelled: { label: "Cancelled", className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
    no_show: { label: "No-show", className: "bg-red-50 text-red-700 border-red-200" },
    expired: { label: "Not paid", className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

// ── Dates & times (local IST calendar days) ─────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

export function toIsoDay(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayIso(): string {
    return toIsoDay(new Date());
}

export function addDays(iso: string, days: number): string {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + days);
    return toIsoDay(d);
}

/** Mon = 0 … Sun = 6, matching the backend's `weekdays`. */
export function weekdayOf(iso: string): number {
    const d = new Date(`${iso}T00:00:00`);
    return (d.getDay() + 6) % 7;
}

/** Calendar days from `from` to `to` (inclusive); empty when the range is reversed. */
export function daysInRange(from: string, to: string, limit = 800): string[] {
    if (!from || !to || to < from) return [];
    const out: string[] = [];
    let cur = from;
    while (cur <= to && out.length < limit) {
        out.push(cur);
        cur = addDays(cur, 1);
    }
    return out;
}

/** "07:30" → "7:30am", "18:00" → "6pm". */
export function formatTime(t: string | null | undefined): string {
    if (!t) return "—";
    const [h = NaN, m = 0] = t.split(":").map(Number);
    if (Number.isNaN(h)) return t;
    const suffix = h >= 12 ? "pm" : "am";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return m ? `${hour}:${pad(m)}${suffix}` : `${hour}${suffix}`;
}

export function formatTimeRange(start: string, end: string): string {
    return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "Sat, 15 Nov" — with "Today" / "Tomorrow" for the next two days. */
export function formatDayLabel(iso: string): string {
    const today = todayIso();
    if (iso === today) return "Today";
    if (iso === addDays(today, 1)) return "Tomorrow";
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function isValidTime(t: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

// ── Experiences ─────────────────────────────────────────────────────────────

export function coverOf(e: Pick<Experience, "media"> & { cover_url?: string | null }): string | null {
    return e.cover_url || e.media[0] || null;
}

/** Short random id for a new option (slots reference it, so it must stay stable). */
export function newOptionId(): string {
    return Math.random().toString(36).slice(2, 8);
}

/** Slots grouped by date, each day sorted by start time. */
export function groupSlotsByDate(slots: ExperienceSlot[]): { date: string; slots: ExperienceSlot[] }[] {
    const map = new Map<string, ExperienceSlot[]>();
    for (const s of slots) {
        const list = map.get(s.date) ?? [];
        list.push(s);
        map.set(s.date, list);
    }
    return [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, list]) => ({ date, slots: list.sort((a, b) => a.start_time.localeCompare(b.start_time)) }));
}

/** Open slot that hasn't started yet (slot times are local IST wall-clock times). */
export function isUpcomingSlot(s: ExperienceSlot, now = new Date()): boolean {
    if (s.status !== "open") return false;
    const today = toIsoDay(now);
    if (s.date !== today) return s.date > today;
    return s.start_time > `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

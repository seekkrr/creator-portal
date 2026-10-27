import type { Experience, ExperienceSlot } from "@services/experience.types";
import { isUpcomingSlot } from "./utils";

/**
 * The Schedule screen's pure logic: what state a slot is in, how full a day is,
 * and where each slot sits on the day timeline (one lane per option; slots of
 * the same option that overlap get extra rows).
 */

export type SlotState = "open" | "booked" | "full" | "taken" | "blocked" | "no_price" | "past" | "cancelled";

export const SLOT_STATE_META: Record<SlotState, { label: string; block: string; dot: string }> = {
    open: { label: "Open", block: "bg-white border-green-300 text-green-800 hover:border-green-500", dot: "bg-green-400" },
    booked: { label: "Booked", block: "bg-primary-50 border-primary-300 text-primary-900 hover:border-primary-500", dot: "bg-primary-400" },
    full: { label: "Full", block: "bg-primary-600 border-primary-700 text-white hover:bg-primary-700", dot: "bg-primary-600" },
    taken: { label: "Taken", block: "bg-neutral-100 border-neutral-200 text-neutral-500 hover:border-neutral-400", dot: "bg-neutral-300" },
    blocked: { label: "Blocked", block: "bg-amber-50 border-amber-300 text-amber-900 hover:border-amber-500", dot: "bg-amber-400" },
    no_price: { label: "No price", block: "bg-white border-dashed border-amber-300 text-amber-800 hover:border-amber-500", dot: "border border-dashed border-amber-400" },
    past: { label: "Past", block: "bg-neutral-50 border-neutral-200 text-neutral-400", dot: "bg-neutral-200" },
    cancelled: { label: "Cancelled", block: "bg-white border-neutral-200 text-neutral-400 line-through", dot: "bg-white border border-neutral-300" },
};

/** The legend, in the order a business reads the timeline. */
export const LEGEND: SlotState[] = ["open", "booked", "full", "taken", "blocked", "no_price"];

export function slotState(s: ExperienceSlot, now = new Date()): SlotState {
    if (s.status === "cancelled") return "cancelled";
    if (!isUpcomingSlot(s, now)) return "past";
    if (s.blocked) return "blocked";
    const booked = s.booked ?? 0;
    if (booked >= s.capacity) return "full";
    // A private slot with a group in it is closed to everyone else.
    if (booked > 0) return s.unavailable_reason === "private_booked" ? "full" : "booked";
    if (s.taken_by || s.unavailable_reason === "time_taken") return "taken";
    if (s.unavailable_reason === "price_not_set") return "no_price";
    return "open";
}

/** A slot the team can still act on (block, resize, cancel). */
export function isActionable(s: ExperienceSlot, now = new Date()): boolean {
    return s.status === "open" && isUpcomingSlot(s, now);
}

export interface DayStats {
    slots: number;
    booked: number;
    capacity: number;
    /** 0–100, or null with no open slots. */
    pct: number | null;
}

export function dayStats(slots: ExperienceSlot[]): DayStats {
    const open = slots.filter((s) => s.status === "open");
    const booked = open.reduce((n, s) => n + (s.booked ?? 0), 0);
    const capacity = open.reduce((n, s) => n + s.capacity, 0);
    return { slots: open.length, booked, capacity, pct: capacity ? Math.round((booked / capacity) * 100) : null };
}

export function minutesOf(t: string): number {
    const [h = 0, m = 0] = t.split(":").map(Number);
    return h * 60 + m;
}

export function hhmm(minutes: number): string {
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export interface PlacedSlot {
    slot: ExperienceSlot;
    /** Minutes from the axis start. */
    left: number;
    width: number;
}

export interface Lane {
    key: string;
    label: string;
    /** Rows of slots that don't overlap each other. */
    rows: PlacedSlot[][];
}

export interface DayLayout {
    /** Axis start and end, in minutes since midnight (whole hours). */
    start: number;
    end: number;
    lanes: Lane[];
}

/**
 * Lanes for one day: the experience's options in their order (slots without an
 * option, or of a removed one, last), each split into rows so overlapping slots
 * of the same option don't sit on top of each other.
 */
export function layoutDay(slots: ExperienceSlot[], experience: Pick<Experience, "options">): DayLayout {
    if (!slots.length) return { start: 9 * 60, end: 18 * 60, lanes: [] };
    const start = Math.floor(Math.min(...slots.map((s) => minutesOf(s.start_time))) / 60) * 60;
    const end = Math.ceil(Math.max(...slots.map((s) => minutesOf(s.end_time))) / 60) * 60;
    const order = experience.options.map((o) => o.id);
    const names = new Map(experience.options.map((o) => [o.id, o.name]));
    const groups = new Map<string, ExperienceSlot[]>();
    for (const s of slots) {
        const key = s.option_id && names.has(s.option_id) ? s.option_id : `other:${s.option_name ?? ""}`;
        groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    const keys = [...groups.keys()].sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib) || a.localeCompare(b);
    });
    const lanes = keys.map((key) => {
        const list = [...(groups.get(key) ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time));
        const rows: PlacedSlot[][] = [];
        const rowEnds: number[] = [];
        for (const slot of list) {
            const s0 = minutesOf(slot.start_time);
            const s1 = Math.max(minutesOf(slot.end_time), s0 + 1);
            let row = rowEnds.findIndex((e) => e <= s0);
            if (row === -1) {
                row = rows.length;
                rows.push([]);
                rowEnds.push(0);
            }
            rows[row]?.push({ slot, left: s0 - start, width: s1 - s0 });
            rowEnds[row] = s1;
        }
        const first = list[0];
        const label = names.get(key) ?? first?.option_name ?? (experience.options.length ? "Other" : "Slots");
        return { key, label, rows };
    });
    return { start, end, lanes };
}

/**
 * A day's open slots as "Add slots" calls: one per option and capacity, with
 * every time of that group — used to copy a day's schedule to other dates.
 */
export function copyGroups(slots: ExperienceSlot[]): { option_id: string | null; capacity: number; times: { start: string; end: string }[] }[] {
    const map = new Map<string, { option_id: string | null; capacity: number; times: { start: string; end: string }[] }>();
    for (const s of slots) {
        if (s.status !== "open") continue;
        const key = `${s.option_id ?? ""}|${s.capacity}`;
        const group = map.get(key) ?? { option_id: s.option_id, capacity: s.capacity, times: [] };
        if (!group.times.some((t) => t.start === s.start_time && t.end === s.end_time)) {
            group.times.push({ start: s.start_time, end: s.end_time });
        }
        map.set(key, group);
    }
    return [...map.values()].map((g) => ({ ...g, times: g.times.sort((a, b) => a.start.localeCompare(b.start)) }));
}

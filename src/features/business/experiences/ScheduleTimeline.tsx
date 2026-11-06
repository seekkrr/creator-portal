import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { Experience, ExperienceSlot } from "@services/experience.types";
import { addDays, formatTimeRange, todayIso } from "./utils";
import { LEGEND, SLOT_STATE_META, dayStats, hhmm, layoutDay, slotState } from "./schedule";

const PX_PER_MIN = 2.4;
const ROW_H = 52;
/** The option-name column (w-24). */
const LABEL_W = 96;

const weekdayShort = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
const dayNum = (iso: string) => new Date(`${iso}T00:00:00`).getDate();
const monthShort = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { month: "short" });

/** Two weeks of days, each with how full it is; arrows move a week, the date field jumps. */
export function DayStrip({
    start,
    days,
    selected,
    slotsByDay,
    onSelect,
    onMove,
    onJump,
}: {
    start: string;
    days: number;
    selected: string;
    slotsByDay: Map<string, ExperienceSlot[]>;
    onSelect: (day: string) => void;
    onMove: (deltaDays: number) => void;
    onJump: (day: string) => void;
}) {
    const today = todayIso();
    const list = Array.from({ length: days }, (_, i) => addDays(start, i));
    return (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-2 sm:p-3">
            <div className="flex flex-wrap items-center gap-2 mb-2">
                <button
                    type="button"
                    onClick={() => onMove(-7)}
                    disabled={start <= today}
                    aria-label="Previous week"
                    className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <p className="text-sm font-semibold text-neutral-800">
                    {monthShort(list[0] ?? start)}
                    {monthShort(list[list.length - 1] ?? start) !== monthShort(list[0] ?? start)
                        ? ` – ${monthShort(list[list.length - 1] ?? start)}`
                        : ""}
                </p>
                <button
                    type="button"
                    onClick={() => onMove(7)}
                    aria-label="Next week"
                    className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
                <label className="ml-auto inline-flex items-center gap-2 text-xs text-neutral-500">
                    Go to
                    <input
                        type="date"
                        min={today}
                        value={selected}
                        onChange={(e) => e.target.value && onJump(e.target.value)}
                        className="px-2 py-1 border border-neutral-300 rounded-lg text-sm text-neutral-800"
                    />
                </label>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="listbox" aria-label="Days">
                {list.map((day) => {
                    const stats = dayStats(slotsByDay.get(day) ?? []);
                    const on = day === selected;
                    const busy = stats.pct ?? 0;
                    return (
                        <button
                            key={day}
                            type="button"
                            role="option"
                            aria-selected={on}
                            onClick={() => onSelect(day)}
                            className={`min-w-0 rounded-xl border px-1 py-1.5 text-center transition-colors ${
                                on ? "border-primary-600 bg-primary-50 ring-1 ring-primary-600" : "border-neutral-200 hover:border-primary-300"
                            } ${day < today ? "opacity-50" : ""}`}
                        >
                            <span className="block truncate text-[11px] text-neutral-500">
                                {day === today ? "Today" : weekdayShort(day)}
                            </span>
                            <span className="block text-base font-semibold text-neutral-900 leading-tight">{dayNum(day)}</span>
                            {stats.slots ? (
                                <>
                                    <span className="mt-1 block h-1 rounded-full bg-neutral-100 overflow-hidden mx-1">
                                        <span
                                            className={`block h-full rounded-full ${busy >= 100 ? "bg-red-500" : "bg-primary-500"}`}
                                            style={{ width: `${Math.max(busy, busy ? 6 : 0)}%` }}
                                        />
                                    </span>
                                    <span className="block truncate text-[11px] text-neutral-600 mt-0.5 tabular-nums">
                                        {stats.booked}/{stats.capacity}
                                    </span>
                                </>
                            ) : (
                                <span className="block truncate text-[11px] text-neutral-400 mt-1.5">
                                    <span className="hidden sm:inline">No slots</span>
                                    <span className="sm:hidden" aria-label="No slots">–</span>
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** The legend under the timeline. */
export function SlotLegend() {
    return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
            {LEGEND.map((state) => (
                <span key={state} className="inline-flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded ${SLOT_STATE_META[state].dot}`} aria-hidden />
                    {SLOT_STATE_META[state].label}
                </span>
            ))}
        </div>
    );
}

/**
 * One day as a timeline: a lane per option, each slot a block at its time,
 * coloured by state. Click a block to open it — or, in select mode, to tick it.
 */
export function DayTimeline({
    slots,
    experience,
    activeId,
    selecting,
    picked,
    onOpen,
    onToggle,
}: {
    slots: ExperienceSlot[];
    experience: Pick<Experience, "options">;
    activeId: string | null;
    selecting: boolean;
    picked: Set<string>;
    onOpen: (slot: ExperienceSlot) => void;
    onToggle: (slot: ExperienceSlot) => void;
}) {
    const layout = layoutDay(slots, experience);
    const width = (layout.end - layout.start) * PX_PER_MIN;
    const hours = Array.from({ length: (layout.end - layout.start) / 60 + 1 }, (_, i) => layout.start + i * 60);
    const now = new Date();
    return (
        <div className="overflow-x-auto" data-lenis-prevent>
            <div style={{ width: width + LABEL_W }} className="min-w-full">
                <div className="flex sticky top-0">
                    <div className="w-24 shrink-0 sticky left-0 bg-white z-10" />
                    <div className="relative h-6" style={{ width }}>
                        {hours.map((m, i) => (
                            <span
                                key={m}
                                className={`absolute top-0 text-[11px] text-neutral-400 tabular-nums ${
                                    i === 0 ? "" : i === hours.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
                                }`}
                                style={{ left: (m - layout.start) * PX_PER_MIN }}
                            >
                                {hhmm(m)}
                            </span>
                        ))}
                    </div>
                </div>
                {layout.lanes.map((lane) => (
                    <div key={lane.key} className="flex border-t border-neutral-100">
                        <div className="w-24 shrink-0 sticky left-0 bg-white z-10 pr-2 py-2">
                            <p className="text-xs font-semibold text-neutral-700 leading-snug line-clamp-2" title={lane.label}>
                                {lane.label}
                            </p>
                        </div>
                        <div className="relative" style={{ width, height: lane.rows.length * ROW_H + 8 }}>
                            {hours.map((m) => (
                                <span
                                    key={m}
                                    aria-hidden
                                    className="absolute top-0 bottom-0 border-l border-dashed border-neutral-100"
                                    style={{ left: (m - layout.start) * PX_PER_MIN }}
                                />
                            ))}
                            {lane.rows.map((row, r) =>
                                row.map(({ slot, left, width: w }) => {
                                    const state = slotState(slot, now);
                                    const meta = SLOT_STATE_META[state];
                                    const isPicked = picked.has(slot.id);
                                    const booked = slot.booked ?? 0;
                                    const label = `${lane.label}, ${formatTimeRange(slot.start_time, slot.end_time)}, ${meta.label}, ${booked} of ${slot.capacity} booked`;
                                    return (
                                        <button
                                            key={slot.id}
                                            type="button"
                                            aria-label={label}
                                            aria-pressed={selecting ? isPicked : undefined}
                                            title={label}
                                            onClick={() => (selecting ? onToggle(slot) : onOpen(slot))}
                                            className={`absolute rounded-lg border text-left px-1.5 py-1 overflow-hidden transition-colors ${meta.block} ${
                                                activeId === slot.id && !selecting ? "ring-2 ring-primary-500 ring-offset-1" : ""
                                            } ${isPicked ? "ring-2 ring-primary-600 ring-offset-1" : ""}`}
                                            style={{
                                                left: left * PX_PER_MIN + 1,
                                                width: Math.max(w * PX_PER_MIN - 3, 28),
                                                top: r * ROW_H + 4,
                                                height: ROW_H - 6,
                                            }}
                                        >
                                            {selecting && (
                                                <span
                                                    className={`absolute top-1 right-1 w-4 h-4 rounded border flex items-center justify-center ${
                                                        isPicked ? "bg-primary-600 border-primary-600 text-white" : "bg-white border-neutral-300"
                                                    }`}
                                                    aria-hidden
                                                >
                                                    {isPicked && <Check className="w-3 h-3" />}
                                                </span>
                                            )}
                                            <span className="block text-[11px] font-semibold leading-tight truncate tabular-nums">
                                                {slot.start_time}
                                            </span>
                                            <span className="block text-[11px] leading-tight truncate tabular-nums">
                                                {state === "taken" || state === "blocked" || state === "no_price"
                                                    ? meta.label
                                                    : `${booked}/${slot.capacity}`}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

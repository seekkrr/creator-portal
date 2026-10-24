import { useState, type ReactNode } from "react";
import { CalendarOff, Clock, Minus, Plus, Sun, Users, X } from "lucide-react";
import { DAY_LABELS } from "../utils";

export interface TimeWindow {
    start: string;
    end: string;
}

export interface AvailabilityValue {
    days_of_week: number[];
    time_windows: TimeWindow[];
    daily_cap: string;
    blackout_dates: string[];
}

type DayPreset = "any" | "weekdays" | "weekends" | "custom";

const WEEKDAYS = [0, 1, 2, 3, 4];
const WEEKENDS = [5, 6];
const SLOTS: { label: string; window: TimeWindow }[] = [
    { label: "Morning", window: { start: "08:00", end: "12:00" } },
    { label: "Afternoon", window: { start: "12:00", end: "17:00" } },
    { label: "Evening", window: { start: "17:00", end: "21:00" } },
];

const same = (a: number[], b: number[]) => a.length === b.length && b.every((x) => a.includes(x));
const presetOf = (days: number[]): DayPreset =>
    days.length === 0 || days.length === 7 ? "any" : same(days, WEEKDAYS) ? "weekdays" : same(days, WEEKENDS) ? "weekends" : "custom";

function fmtTime(t: string): string {
    const [h = NaN, m = 0] = t.split(":").map(Number);
    if (Number.isNaN(h)) return t;
    const suffix = h >= 12 ? "pm" : "am";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

function fmtDay(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** One-line plain-English summary, shown at the top of the section. */
function availabilitySummary(v: AvailabilityValue): string {
    const preset = presetOf(v.days_of_week);
    const days =
        preset === "any" ? "Any day" : preset === "weekdays" ? "Weekdays" : preset === "weekends" ? "Weekends"
            : [...v.days_of_week].sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(", ");
    const hours = v.time_windows.length === 0 ? "any time" : v.time_windows.map((w) => `${fmtTime(w.start)}–${fmtTime(w.end)}`).join(", ");
    const cap = v.daily_cap ? ` · up to ${v.daily_cap} a day` : "";
    const off = v.blackout_dates.length ? ` · ${v.blackout_dates.length} day${v.blackout_dates.length > 1 ? "s" : ""} off` : "";
    return `${days}, ${hours}${cap}${off}`;
}

function Pill({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: ReactNode; label?: string }) {
    return (
        <button
            type="button"
            aria-pressed={on}
            aria-label={label}
            onClick={onClick}
            className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-colors ${
                on ? "bg-primary-600 text-white border-primary-600 shadow-sm" : "bg-white text-neutral-700 border-neutral-300 hover:border-primary-400"
            }`}
        >
            {children}
        </button>
    );
}

function Row({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <div className="flex gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">{icon}</span>
            <div className="flex-1 min-w-0 space-y-2.5">
                <p className="text-sm font-semibold text-neutral-900 pt-1.5">{title}</p>
                {children}
            </div>
        </div>
    );
}

/**
 * When creators can come in: day presets, time slots, a per-day limit and
 * days off — with a live plain-English summary.
 */
export function AvailabilityEditor({
    value,
    onChange,
    errors,
}: {
    value: AvailabilityValue;
    onChange: (patch: Partial<AvailabilityValue>) => void;
    errors?: { time_windows?: string; daily_cap?: string };
}) {
    const [preset, setPreset] = useState<DayPreset>(() => presetOf(value.days_of_week));
    const [dayOff, setDayOff] = useState("");
    const cap = value.daily_cap ? Number(value.daily_cap) : 0;

    const pickPreset = (p: DayPreset) => {
        setPreset(p);
        if (p === "any") onChange({ days_of_week: [] });
        if (p === "weekdays") onChange({ days_of_week: WEEKDAYS });
        if (p === "weekends") onChange({ days_of_week: WEEKENDS });
        if (p === "custom" && value.days_of_week.length === 0) onChange({ days_of_week: WEEKDAYS });
    };

    const toggleDay = (d: number) =>
        onChange({ days_of_week: value.days_of_week.includes(d) ? value.days_of_week.filter((x) => x !== d) : [...value.days_of_week, d] });

    const hasSlot = (w: TimeWindow) => value.time_windows.some((x) => x.start === w.start && x.end === w.end);
    const toggleSlot = (w: TimeWindow) =>
        onChange({
            time_windows: hasSlot(w)
                ? value.time_windows.filter((x) => !(x.start === w.start && x.end === w.end))
                : [...value.time_windows, w].sort((a, b) => a.start.localeCompare(b.start)),
        });
    const customWindows = value.time_windows
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => !SLOTS.some((s) => s.window.start === w.start && s.window.end === w.end));
    const updateWindow = (i: number, patch: Partial<TimeWindow>) =>
        onChange({ time_windows: value.time_windows.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) });

    const setCap = (n: number) => onChange({ daily_cap: n <= 0 ? "" : String(Math.min(100, n)) });

    return (
        <div className="space-y-5">
            <p className="rounded-xl bg-primary-50 border border-primary-100 px-3.5 py-2.5 text-sm text-primary-900">
                <span className="font-semibold">Creators can come:</span> {availabilitySummary(value)}
            </p>

            <Row icon={<Sun className="w-4 h-4" />} title="Which days?">
                <div className="flex flex-wrap gap-2">
                    {(
                        [
                            ["any", "Any day"],
                            ["weekdays", "Weekdays"],
                            ["weekends", "Weekends"],
                            ["custom", "Pick days"],
                        ] as const
                    ).map(([p, label]) => (
                        <Pill key={p} on={preset === p} onClick={() => pickPreset(p)}>
                            {label}
                        </Pill>
                    ))}
                </div>
                {preset === "custom" && (
                    <div className="grid grid-cols-7 gap-1.5 max-w-md" role="group" aria-label="Days of the week">
                        {DAY_LABELS.map((label, idx) => {
                            const on = value.days_of_week.includes(idx);
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => toggleDay(idx)}
                                    className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                                        on ? "bg-primary-600 text-white border-primary-600" : "bg-white text-neutral-600 border-neutral-300 hover:border-primary-400"
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </Row>

            <Row icon={<Clock className="w-4 h-4" />} title="What time?">
                <div className="flex flex-wrap gap-2">
                    <Pill on={value.time_windows.length === 0} onClick={() => onChange({ time_windows: [] })}>
                        Any time
                    </Pill>
                    {SLOTS.map((s) => (
                        <Pill key={s.label} on={hasSlot(s.window)} onClick={() => toggleSlot(s.window)} label={`${s.label}, ${fmtTime(s.window.start)} to ${fmtTime(s.window.end)}`}>
                            {s.label} <span className="opacity-70 font-normal">{fmtTime(s.window.start)}–{fmtTime(s.window.end)}</span>
                        </Pill>
                    ))}
                </div>
                {customWindows.map(({ w, i }) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2 max-w-md">
                        <input
                            type="time"
                            aria-label="From"
                            value={w.start}
                            onChange={(e) => updateWindow(i, { start: e.target.value })}
                            className="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-sm"
                        />
                        <span className="text-sm text-neutral-400">to</span>
                        <input
                            type="time"
                            aria-label="Until"
                            value={w.end}
                            onChange={(e) => updateWindow(i, { end: e.target.value })}
                            className="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-sm"
                        />
                        <button
                            type="button"
                            aria-label="Remove these hours"
                            onClick={() => onChange({ time_windows: value.time_windows.filter((_, idx) => idx !== i) })}
                            className="ml-auto p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {value.time_windows.length < 4 && (
                    <button
                        type="button"
                        onClick={() => onChange({ time_windows: [...value.time_windows, { start: "10:00", end: "14:00" }] })}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline"
                    >
                        <Plus className="w-4 h-4" /> Custom hours
                    </button>
                )}
                {errors?.time_windows && <p className="text-xs text-red-600">{errors.time_windows}</p>}
            </Row>

            <Row icon={<Users className="w-4 h-4" />} title="How many creators a day?">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center rounded-full border border-neutral-300 bg-white">
                        <button
                            type="button"
                            aria-label="Fewer"
                            onClick={() => setCap(cap - 1)}
                            disabled={cap === 0}
                            className="w-9 h-9 flex items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className="min-w-[84px] text-center text-sm font-semibold text-neutral-900" aria-live="polite">
                            {cap === 0 ? "No limit" : `${cap} a day`}
                        </span>
                        <button
                            type="button"
                            aria-label="More"
                            onClick={() => setCap(cap + 1)}
                            disabled={cap >= 100}
                            className="w-9 h-9 flex items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    {cap > 0 && (
                        <button type="button" onClick={() => setCap(0)} className="text-sm text-neutral-500 hover:text-neutral-800">
                            Remove limit
                        </button>
                    )}
                </div>
                {errors?.daily_cap && <p className="text-xs text-red-600">{errors.daily_cap}</p>}
            </Row>

            <Row icon={<CalendarOff className="w-4 h-4" />} title="Days off">
                <p className="text-xs text-neutral-500 -mt-1">Festivals, full house, or days you're closed.</p>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="date"
                        aria-label="Add a day off"
                        value={dayOff}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setDayOff(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-sm"
                    />
                    <button
                        type="button"
                        disabled={!dayOff || value.blackout_dates.length >= 60}
                        onClick={() => {
                            if (dayOff && !value.blackout_dates.includes(dayOff)) onChange({ blackout_dates: [...value.blackout_dates, dayOff].sort() });
                            setDayOff("");
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-neutral-300 text-sm font-medium text-neutral-700 hover:border-primary-400 disabled:opacity-40"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                </div>
                {value.blackout_dates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {value.blackout_dates.map((d) => (
                            <span key={d} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium border border-neutral-200">
                                {fmtDay(d)}
                                <button
                                    type="button"
                                    aria-label={`Remove ${fmtDay(d)}`}
                                    onClick={() => onChange({ blackout_dates: value.blackout_dates.filter((x) => x !== d) })}
                                    className="p-0.5 rounded-full hover:bg-neutral-200"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </Row>
        </div>
    );
}

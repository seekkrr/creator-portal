import { useMemo, useState } from "react";
import { CalendarPlus, Plus, X } from "lucide-react";
import { Button } from "@components/ui";
import { experienceService } from "@services/experience.service";
import type { BulkSlotsPayload, BulkSlotsResult, Experience, SlotTimeWindow } from "@services/experience.types";
import { useBusiness } from "../context";
import { DAY_LABELS, errorMessage, isForbidden } from "../utils";
import { FieldLabel, SegmentedControl, inputClass, selectClass } from "../components/bits";
import { Modal } from "../components/Overlay";
import { PaymentsNote } from "./ui";
import { addDays, daysInRange, formatDayLabel, isValidTime, todayIso, weekdayOf } from "./utils";

const MAX_SLOTS = 500;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

type Mode = "dates" | "range";

const chip = (on: boolean) =>
    `py-2 rounded-xl text-xs font-semibold border transition-colors ${
        on ? "bg-primary-600 text-white border-primary-600" : "bg-white text-neutral-600 border-neutral-300 hover:border-primary-400"
    }`;

/**
 * Bulk-create slots: one option, specific dates or a date range filtered by
 * weekdays, and one or more time windows — every date gets every window.
 */
export function AddSlotsModal({
    experience,
    onClose,
    onCreated,
}: {
    experience: Experience;
    onClose: () => void;
    /** `requested` is how many slots the form asked for (to report skipped duplicates). */
    onCreated: (result: BulkSlotsResult, requested: number) => void;
}) {
    const { businessId } = useBusiness();
    const options = experience.options;
    const firstOption = options[0];
    const [optionId, setOptionId] = useState(firstOption?.id ?? "");
    const [mode, setMode] = useState<Mode>("range");
    const [dates, setDates] = useState<string[]>([]);
    const [dateDraft, setDateDraft] = useState("");
    const [from, setFrom] = useState(todayIso());
    const [to, setTo] = useState(addDays(todayIso(), 29));
    const [weekdays, setWeekdays] = useState<number[]>(ALL_DAYS);
    const [times, setTimes] = useState<SlotTimeWindow[]>([{ start: "10:00", end: "11:00" }]);
    const [capacity, setCapacity] = useState("10");
    const [price, setPrice] = useState(firstOption?.price !== null && firstOption?.price !== undefined ? String(firstOption.price) : "");
    const [priceTouched, setPriceTouched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const today = todayIso();

    const chosenDays = useMemo(() => {
        if (mode === "dates") return [...new Set(dates)].filter((d) => d >= today).sort();
        return daysInRange(from < today ? today : from, to).filter((d) => weekdays.includes(weekdayOf(d)));
    }, [mode, dates, from, to, weekdays, today]);

    const validTimes = times.filter((t) => isValidTime(t.start) && isValidTime(t.end) && t.end > t.start);
    const uniqueTimes = new Set(validTimes.map((t) => `${t.start}-${t.end}`)).size;
    const requested = chosenDays.length * uniqueTimes;

    const pickOption = (id: string) => {
        setOptionId(id);
        if (!priceTouched) {
            const o = options.find((x) => x.id === id);
            setPrice(o?.price !== null && o?.price !== undefined ? String(o.price) : "");
        }
    };

    const addDate = () => {
        if (!dateDraft || dateDraft < today) return;
        setDates((d) => (d.includes(dateDraft) ? d : [...d, dateDraft].sort()));
        setDateDraft("");
    };

    const updateTime = (i: number, patch: Partial<SlotTimeWindow>) =>
        setTimes((list) => list.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

    const addTime = () =>
        setTimes((list) => {
            const last = list[list.length - 1];
            // Next window starts where the last one ended, same length.
            if (last && isValidTime(last.start) && isValidTime(last.end) && last.end > last.start) {
                const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
                const len = toMin(last.end) - toMin(last.start);
                const start = toMin(last.end);
                const end = start + len;
                if (end < 24 * 60) {
                    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
                    return [...list, { start: fmt(start), end: fmt(end) }];
                }
            }
            return [...list, { start: "10:00", end: "11:00" }];
        });

    const cap = Number(capacity);
    const p = price.trim() === "" ? 0 : Number(price);

    /** First problem with the form, or null when it can be sent. */
    const problem = (): string | null => {
        if (options.length && !optionId) return "Pick which option these slots are for.";
        if (mode === "dates" && chosenDays.length === 0) return "Add at least one date (today or later).";
        if (mode === "range") {
            if (!from || !to || to < from) return "The end date must be on or after the start date.";
            if (weekdays.length === 0) return "Pick at least one day of the week.";
            if (chosenDays.length === 0) return "No upcoming dates match those days.";
        }
        if (times.length === 0) return "Add at least one time window.";
        if (validTimes.length !== times.length) return "Each time window needs a start and an end after it.";
        if (uniqueTimes !== times.length) return "Two time windows are the same.";
        if (!Number.isInteger(cap) || cap < 1 || cap > 10000) return "Capacity must be a whole number, 1 or more.";
        if (Number.isNaN(p) || p < 0) return "Price can't be negative.";
        if (requested > MAX_SLOTS) {
            return `That's ${requested} slots — add up to ${MAX_SLOTS} at a time (shorten the range or use fewer times).`;
        }
        return null;
    };

    const submit = async () => {
        const issue = problem();
        setError(issue);
        if (issue) return;

        const payload: BulkSlotsPayload = {
            times: [...validTimes].sort((a, b) => a.start.localeCompare(b.start)),
            capacity: cap,
            price: p,
        };
        if (options.length) payload.option_id = optionId;
        if (mode === "dates") payload.dates = chosenDays;
        else {
            payload.from = from < today ? today : from;
            payload.to = to;
            payload.weekdays = [...weekdays].sort((a, b) => a - b);
        }

        setSaving(true);
        try {
            const result = await experienceService.createSlots(businessId, experience.id, payload);
            onCreated(result, requested);
        } catch (e) {
            setError(
                isForbidden(e) ? "Experiences aren't turned on for this business." : errorMessage(e, "Couldn't add the slots")
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={saving ? () => undefined : onClose}
            size="lg"
            icon={
                <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center">
                    <CalendarPlus className="w-5 h-5" />
                </div>
            }
            title="Add slots"
            description="Every date you pick gets every time window. Existing identical slots are skipped."
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="accent" onClick={() => void submit()} isLoading={saving} disabled={saving || requested === 0}>
                        {requested > 0 ? `Add ${requested} slot${requested === 1 ? "" : "s"}` : "Add slots"}
                    </Button>
                </>
            }
        >
            <div className="space-y-5 pb-2">
                {options.length > 0 && (
                    <div>
                        <FieldLabel htmlFor="slots-option">Option</FieldLabel>
                        <select
                            id="slots-option"
                            className={selectClass}
                            value={optionId}
                            onChange={(e) => pickOption(e.target.value)}
                        >
                            {options.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.name || "Unnamed option"}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="space-y-3">
                    <SegmentedControl
                        size="sm"
                        ariaLabel="How to pick dates"
                        value={mode}
                        onChange={setMode}
                        options={[
                            { value: "range", label: "Date range" },
                            { value: "dates", label: "Specific dates" },
                        ]}
                    />
                    {mode === "range" ? (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <FieldLabel htmlFor="slots-from">From</FieldLabel>
                                    <input
                                        id="slots-from"
                                        type="date"
                                        className={inputClass}
                                        min={today}
                                        value={from}
                                        onChange={(e) => setFrom(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="slots-to">To</FieldLabel>
                                    <input
                                        id="slots-to"
                                        type="date"
                                        className={inputClass}
                                        min={from || today}
                                        value={to}
                                        onChange={(e) => setTo(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-medium text-neutral-700">On these days</span>
                                    <button
                                        type="button"
                                        className="text-xs font-semibold text-primary-700 hover:underline"
                                        onClick={() => setWeekdays(weekdays.length === 7 ? [] : ALL_DAYS)}
                                    >
                                        {weekdays.length === 7 ? "Clear" : "Every day"}
                                    </button>
                                </div>
                                <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Days of the week">
                                    {DAY_LABELS.map((label, idx) => {
                                        const on = weekdays.includes(idx);
                                        return (
                                            <button
                                                key={label}
                                                type="button"
                                                aria-pressed={on}
                                                onClick={() =>
                                                    setWeekdays((w) => (on ? w.filter((x) => x !== idx) : [...w, idx]))
                                                }
                                                className={chip(on)}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    type="date"
                                    aria-label="Add a date"
                                    className={`${inputClass} w-auto`}
                                    min={today}
                                    value={dateDraft}
                                    onChange={(e) => setDateDraft(e.target.value)}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                                    disabled={!dateDraft || dateDraft < today || dates.length >= 120}
                                    onClick={addDate}
                                >
                                    Add date
                                </Button>
                            </div>
                            {dates.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {dates.map((d) => (
                                        <span
                                            key={d}
                                            className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-primary-50 text-primary-800 text-xs font-medium border border-primary-100"
                                        >
                                            {formatDayLabel(d)}
                                            <button
                                                type="button"
                                                aria-label={`Remove ${formatDayLabel(d)}`}
                                                onClick={() => setDates((list) => list.filter((x) => x !== d))}
                                                className="p-0.5 rounded-full hover:bg-primary-100"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-neutral-500">Pick a date and press Add date. Add as many as you need.</p>
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <span className="block text-sm font-medium text-neutral-700 mb-1.5">Time windows</span>
                    <div className="space-y-2">
                        {times.map((t, i) => (
                            <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
                                <input
                                    type="time"
                                    aria-label={`Window ${i + 1} start`}
                                    value={t.start}
                                    onChange={(e) => updateTime(i, { start: e.target.value })}
                                    className="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-sm"
                                />
                                <span className="text-sm text-neutral-400">to</span>
                                <input
                                    type="time"
                                    aria-label={`Window ${i + 1} end`}
                                    value={t.end}
                                    onChange={(e) => updateTime(i, { end: e.target.value })}
                                    className="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-sm"
                                />
                                {times.length > 1 && (
                                    <button
                                        type="button"
                                        aria-label={`Remove window ${i + 1}`}
                                        onClick={() => setTimes((list) => list.filter((_, idx) => idx !== i))}
                                        className="ml-auto p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {times.length < 24 && (
                        <button
                            type="button"
                            onClick={addTime}
                            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline"
                        >
                            <Plus className="w-4 h-4" /> Add another time
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <FieldLabel htmlFor="slots-capacity" hint="People per slot.">
                            Capacity
                        </FieldLabel>
                        <input
                            id="slots-capacity"
                            className={inputClass}
                            inputMode="numeric"
                            maxLength={5}
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))}
                        />
                    </div>
                    <div>
                        <FieldLabel htmlFor="slots-price" hint="Per person. Leave empty for free.">
                            Price (₹)
                        </FieldLabel>
                        <input
                            id="slots-price"
                            className={inputClass}
                            inputMode="decimal"
                            maxLength={8}
                            value={price}
                            onChange={(e) => {
                                setPriceTouched(true);
                                setPrice(e.target.value.replace(/[^\d.]/g, ""));
                            }}
                            placeholder="0"
                        />
                    </div>
                </div>

                <PaymentsNote />

                <p className="text-sm text-neutral-700 rounded-xl bg-primary-50 border border-primary-100 px-3.5 py-2.5">
                    {requested > 0 ? (
                        <>
                            <span className="font-semibold">{requested}</span> slot{requested === 1 ? "" : "s"} on{" "}
                            {chosenDays.length} day{chosenDays.length === 1 ? "" : "s"}
                            {uniqueTimes > 1 ? ` × ${uniqueTimes} times` : ""}.
                            {requested > MAX_SLOTS && <span className="text-red-700"> Up to {MAX_SLOTS} at a time.</span>}
                        </>
                    ) : (
                        "Pick dates and times to see how many slots you'll add."
                    )}
                </p>

                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
        </Modal>
    );
}

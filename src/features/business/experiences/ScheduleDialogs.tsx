import { useMemo, useState } from "react";
import { Copy, Users } from "lucide-react";
import { Button } from "@components/ui";
import { experienceService } from "@services/experience.service";
import type { ExperienceSlot } from "@services/experience.types";
import { useBusiness } from "../context";
import { DAY_LABELS, errorMessage, plural } from "../utils";
import { FieldLabel, inputClass } from "../components/bits";
import { Modal } from "../components/Overlay";
import { copyGroups } from "./schedule";
import { addDays, daysInRange, formatDayLabel, todayIso, weekdayOf } from "./utils";

const MAX_PER_CALL = 500;

const chip = (on: boolean) =>
    `py-2 rounded-xl text-xs font-semibold border transition-colors ${
        on ? "bg-primary-600 text-white border-primary-600" : "bg-white text-neutral-600 border-neutral-300 hover:border-primary-400"
    }`;

/** New spots for every picked slot (never below what a slot already has booked). */
export function BulkCapacityModal({
    count,
    onClose,
    onConfirm,
}: {
    count: number;
    onClose: () => void;
    onConfirm: (capacity: number) => Promise<void>;
}) {
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const save = async () => {
        const cap = Number(value);
        if (!Number.isInteger(cap) || cap < 1 || cap > 10000) {
            setError("Enter a whole number from 1 to 10,000.");
            return;
        }
        setSaving(true);
        try {
            await onConfirm(cap);
        } catch (e) {
            setError(errorMessage(e, "Couldn't change the spots"));
            setSaving(false);
        }
    };
    return (
        <Modal
            open
            onClose={saving ? () => undefined : onClose}
            size="sm"
            icon={
                <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                </div>
            }
            title={`Change spots for ${plural(count, "slot")}`}
            description="Slots that already have more people booked keep their spots."
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="accent" onClick={() => void save()} isLoading={saving} disabled={saving}>
                        Change spots
                    </Button>
                </>
            }
        >
            <div className="pb-2">
                <FieldLabel htmlFor="bulk-capacity">Spots per slot</FieldLabel>
                <input
                    id="bulk-capacity"
                    className={inputClass}
                    inputMode="numeric"
                    maxLength={5}
                    value={value}
                    autoFocus
                    onChange={(e) => {
                        setValue(e.target.value.replace(/\D/g, ""));
                        setError(null);
                    }}
                    placeholder="8"
                />
                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
        </Modal>
    );
}

/** Copy one day's open slots (every option, time and spots) to other dates; slots already there are skipped. */
export function CopyDayModal({
    experienceId,
    day,
    slots,
    onClose,
    onCopied,
}: {
    experienceId: string;
    day: string;
    slots: ExperienceSlot[];
    onClose: () => void;
    onCopied: (created: number, skipped: number) => void;
}) {
    const { businessId } = useBusiness();
    const today = todayIso();
    const [from, setFrom] = useState(addDays(day, 1) < today ? today : addDays(day, 1));
    const [to, setTo] = useState(addDays(day, 28));
    const [weekdays, setWeekdays] = useState<number[]>([weekdayOf(day)]);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const groups = useMemo(() => copyGroups(slots), [slots]);
    const perDay = groups.reduce((n, g) => n + g.times.length, 0);
    const dates = useMemo(
        () => daysInRange(from < today ? today : from, to).filter((d) => d !== day && weekdays.includes(weekdayOf(d))),
        [from, to, weekdays, day, today]
    );
    const total = dates.length * perDay;
    const tooMany = groups.some((g) => g.times.length * dates.length > MAX_PER_CALL);

    const save = async () => {
        if (!dates.length) {
            setError("No dates match. Pick a range and at least one day of the week.");
            return;
        }
        if (tooMany) {
            setError(`That's too many slots in one go. Copy up to ${MAX_PER_CALL} per option at a time (shorten the range).`);
            return;
        }
        setSaving(true);
        setError(null);
        let created = 0;
        try {
            for (const g of groups) {
                const res = await experienceService.createSlots(businessId, experienceId, {
                    option_id: g.option_id,
                    dates,
                    times: g.times,
                    capacity: g.capacity,
                });
                created += res.created;
            }
            onCopied(created, Math.max(0, total - created));
        } catch (e) {
            setError(errorMessage(e, "Couldn't copy the day"));
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={saving ? () => undefined : onClose}
            size="md"
            icon={
                <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center">
                    <Copy className="w-5 h-5" />
                </div>
            }
            title={`Copy ${formatDayLabel(day)} to other dates`}
            description={`${plural(perDay, "slot")} a day, with the same options, times and spots. Times already there are skipped.`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="accent" onClick={() => void save()} isLoading={saving} disabled={saving || perDay === 0}>
                        {total ? `Copy ${plural(total, "slot")}` : "Copy"}
                    </Button>
                </>
            }
        >
            <div className="space-y-4 pb-2">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <FieldLabel htmlFor="copy-from">From</FieldLabel>
                        <input id="copy-from" type="date" min={today} className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div>
                        <FieldLabel htmlFor="copy-to">To</FieldLabel>
                        <input id="copy-to" type="date" min={from} className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                </div>
                <div>
                    <span className="block text-sm font-medium text-neutral-700 mb-1.5">On these days</span>
                    <div className="grid grid-cols-7 gap-1.5">
                        {DAY_LABELS.map((label, i) => (
                            <button
                                key={label}
                                type="button"
                                aria-pressed={weekdays.includes(i)}
                                className={chip(weekdays.includes(i))}
                                onClick={() => setWeekdays((w) => (w.includes(i) ? w.filter((x) => x !== i) : [...w, i].sort()))}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <p className="text-sm text-neutral-600" aria-live="polite">
                    {dates.length ? `${plural(dates.length, "date")} · ${plural(total, "slot")} to add` : "No dates picked yet."}
                </p>
                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
        </Modal>
    );
}

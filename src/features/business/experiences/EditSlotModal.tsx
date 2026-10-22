import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@components/ui";
import { experienceService } from "@services/experience.service";
import type { ExperienceSlot, UpdateSlotPayload } from "@services/experience.types";
import { useBusiness } from "../context";
import { errorMessage } from "../utils";
import { FieldLabel, inputClass } from "../components/bits";
import { Modal } from "../components/Overlay";
import { formatDayLabel, isValidTime } from "./utils";

/** Change one slot's times, capacity (never below what's booked) or price. */
export function EditSlotModal({
    slot,
    optionName,
    onClose,
    onSaved,
}: {
    slot: ExperienceSlot;
    optionName: string | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { businessId } = useBusiness();
    const [start, setStart] = useState(slot.start_time);
    const [end, setEnd] = useState(slot.end_time);
    const [capacity, setCapacity] = useState(String(slot.capacity));
    const [price, setPrice] = useState(String(slot.price ?? 0));
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const booked = slot.booked ?? 0;

    const problem = (): string | null => {
        if (!isValidTime(start) || !isValidTime(end) || end <= start) return "The slot must end after it starts.";
        const cap = Number(capacity);
        if (!Number.isInteger(cap) || cap < 1) return "Capacity must be a whole number, 1 or more.";
        if (cap < booked) return `${booked} people have already booked — capacity can't go below that.`;
        const p = price.trim() === "" ? 0 : Number(price);
        if (Number.isNaN(p) || p < 0) return "Price can't be negative.";
        return null;
    };

    const save = async () => {
        const issue = problem();
        setError(issue);
        if (issue) return;
        const payload: UpdateSlotPayload = {};
        if (start !== slot.start_time) payload.start_time = start;
        if (end !== slot.end_time) payload.end_time = end;
        if (Number(capacity) !== slot.capacity) payload.capacity = Number(capacity);
        const p = price.trim() === "" ? 0 : Number(price);
        if (p !== slot.price) payload.price = p;
        if (!Object.keys(payload).length) {
            onClose();
            return;
        }
        setSaving(true);
        try {
            await experienceService.updateSlot(businessId, slot.id, payload);
            onSaved();
        } catch (e) {
            setError(errorMessage(e, "Couldn't save the slot"));
        } finally {
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
                    <Clock className="w-5 h-5" />
                </div>
            }
            title="Edit slot"
            description={`${formatDayLabel(slot.date)}${optionName ? ` · ${optionName}` : ""}${
                booked ? ` · ${booked} booked` : ""
            }`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="accent" onClick={() => void save()} isLoading={saving} disabled={saving}>
                        Save slot
                    </Button>
                </>
            }
        >
            <div className="space-y-4 pb-2">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <FieldLabel htmlFor="slot-start">Starts</FieldLabel>
                        <input id="slot-start" type="time" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
                    </div>
                    <div>
                        <FieldLabel htmlFor="slot-end">Ends</FieldLabel>
                        <input id="slot-end" type="time" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <FieldLabel htmlFor="slot-capacity" hint={booked ? `At least ${booked}.` : undefined}>
                            Capacity
                        </FieldLabel>
                        <input
                            id="slot-capacity"
                            className={inputClass}
                            inputMode="numeric"
                            maxLength={5}
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))}
                        />
                    </div>
                    <div>
                        <FieldLabel htmlFor="slot-price" hint="Per person.">
                            Price (₹)
                        </FieldLabel>
                        <input
                            id="slot-price"
                            className={inputClass}
                            inputMode="decimal"
                            maxLength={8}
                            value={price}
                            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
                        />
                    </div>
                </div>
                {booked > 0 && (start !== slot.start_time || end !== slot.end_time) && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-2.5">
                        People have booked this slot — let them know about the new time.
                    </p>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
        </Modal>
    );
}

import { useState } from "react";
import { toast } from "sonner";
import { CalendarX2, CheckCircle2, Lock, LockOpen, Minus, Pencil, Plus, UserPlus } from "lucide-react";
import { Button, Skeleton } from "@components/ui";
import { experienceService } from "@services/experience.service";
import type { Experience, ExperienceBooking, ExperienceSlot } from "@services/experience.types";
import { useBusiness } from "../context";
import { errorMessage, formatDate, plural } from "../utils";
import { FieldLabel, Pill, inputClass } from "../components/bits";
import { ConfirmDialog, Drawer } from "../components/Overlay";
import { useExperienceBookings, useInvalidateExperiences } from "./queries";
import { EditSlotModal } from "./EditSlotModal";
import { BookingStatusPill, PaymentPill, SeekKrrPrice } from "./ui";
import { SLOT_STATE_META, isActionable, slotState } from "./schedule";
import { BUSINESS_CANCEL_CUTOFF_HOURS, formatDayLabel, formatTimeRange, slotCancelClosed, todayIso } from "./utils";

/** Everything about one slot: who's booked, walk-ins, block, edit, cancel. */
export function SlotPanel({
    slot,
    experience,
    onClose,
}: {
    slot: ExperienceSlot;
    experience: Experience;
    onClose: () => void;
}) {
    const { businessId, canManage } = useBusiness();
    const invalidate = useInvalidateExperiences();
    const [editing, setEditing] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [walkIn, setWalkIn] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    const optionName = experience.options.find((o) => o.id === slot.option_id)?.name || slot.option_name || null;
    const state = slotState(slot);
    const meta = SLOT_STATE_META[state];
    const booked = slot.booked ?? 0;
    const left = Math.max(0, slot.capacity - booked);
    const actionable = isActionable(slot);
    const ended = slot.ends_at ? Date.parse(slot.ends_at) <= Date.now() : slot.date < todayIso();

    const bookings = useExperienceBookings({ experience_id: experience.id, date: slot.date, page_size: 100 });
    const here = (bookings.data?.bookings ?? []).filter((b) => b.items.some((i) => i.slot_id === slot.id));
    const peopleHere = (b: ExperienceBooking) => b.items.filter((i) => i.slot_id === slot.id).reduce((n, i) => n + i.people, 0);

    const run = async (key: string, work: () => Promise<unknown>, done: string) => {
        setBusy(key);
        try {
            await work();
            toast.success(done);
            await invalidate();
        } catch (e) {
            toast.error(errorMessage(e, "That didn't work"));
        } finally {
            setBusy(null);
        }
    };

    return (
        <>
            <Drawer
                open
                onClose={onClose}
                title={`${optionName ? `${optionName} · ` : ""}${formatTimeRange(slot.start_time, slot.end_time)}`}
                subtitle={
                    <span className="inline-flex flex-wrap items-center gap-2">
                        {formatDayLabel(slot.date)} · {formatDate(slot.date)}
                        <Pill className="bg-white text-neutral-700 border-neutral-300">
                            <span className={`w-2 h-2 rounded-full ${meta.dot}`} aria-hidden /> {meta.label}
                        </Pill>
                    </span>
                }
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-neutral-200 p-3">
                            <p className="text-xs text-neutral-500">Booked</p>
                            <p className="text-xl font-semibold text-neutral-900 tabular-nums">
                                {booked} <span className="text-sm font-normal text-neutral-500">of {slot.capacity}</span>
                            </p>
                            <p className="text-xs text-neutral-500">{plural(left, "spot")} left</p>
                        </div>
                        <div className="rounded-xl border border-neutral-200 p-3">
                            <p className="text-xs text-neutral-500 mb-1">Price per person</p>
                            <SeekKrrPrice compact price={slot.price ?? null} gst={slot.gst} />
                        </div>
                    </div>

                    {slot.taken_by && state === "taken" && (
                        <p className="text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl p-3">
                            {slot.taken_by.option_name ?? "Another session"} holds the space from{" "}
                            {formatTimeRange(slot.taken_by.start_time, slot.taken_by.end_time)}, so customers can't book this
                            time.
                        </p>
                    )}
                    {slot.blocked && (
                        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-xl p-3">
                            Blocked: customers see it as booked. Bookings already in it stay, and you can still add walk-ins.
                        </p>
                    )}
                    {state === "no_price" && (
                        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-xl p-3">
                            SeekKrr hasn't set this option's price yet, so customers can't book it.
                        </p>
                    )}

                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-neutral-900">Who's coming</h3>
                            {!ended && slot.status === "open" && (
                                <Button size="sm" variant="outline" leftIcon={<UserPlus className="w-3.5 h-3.5" />} onClick={() => setWalkIn((v) => !v)}>
                                    Add walk-in
                                </Button>
                            )}
                        </div>
                        {walkIn && (
                            <WalkInForm
                                slot={slot}
                                maxPeople={Math.max(1, left)}
                                onDone={() => setWalkIn(false)}
                                onSaved={async () => {
                                    setWalkIn(false);
                                    await invalidate();
                                }}
                            />
                        )}
                        {bookings.isLoading ? (
                            <Skeleton height={64} />
                        ) : bookings.isError ? (
                            <p className="text-sm text-red-600">Couldn't load the bookings.</p>
                        ) : here.length === 0 ? (
                            <p className="text-sm text-neutral-500">No bookings yet.</p>
                        ) : (
                            <ul className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl">
                                {here.map((b) => (
                                    <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-neutral-900 truncate">
                                                {b.contact?.name || (b.source === "offline" ? "Walk-in" : "Customer")}
                                                <span className="font-normal text-neutral-500"> · {plural(peopleHere(b), "person", "people")}</span>
                                            </p>
                                            <p className="text-xs text-neutral-500">
                                                {b.code}
                                                {b.contact?.phone ? ` · ${b.contact.phone}` : ""}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {b.source === "offline" ? (
                                                <Pill className="bg-violet-50 text-violet-700 border-violet-200">Walk-in</Pill>
                                            ) : (
                                                <PaymentPill booking={b} />
                                            )}
                                            <BookingStatusPill status={b.status} />
                                            {b.status === "confirmed" && slot.date === todayIso() && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                                    isLoading={busy === b.id}
                                                    disabled={!!busy}
                                                    onClick={() =>
                                                        void run(b.id, () => experienceService.checkIn(businessId, b.id), `${b.contact?.name || "Customer"} checked in.`)
                                                    }
                                                >
                                                    Check in
                                                </Button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {canManage && actionable && (
                        <section>
                            <h3 className="font-semibold text-neutral-900 mb-2">Manage this slot</h3>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <Button
                                    variant="outline"
                                    leftIcon={slot.blocked ? <LockOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                    isLoading={busy === "block"}
                                    disabled={!!busy}
                                    onClick={() =>
                                        void run(
                                            "block",
                                            () => experienceService.updateSlot(businessId, slot.id, { blocked: !slot.blocked }),
                                            slot.blocked ? "Slot open to customers again." : "Slot blocked."
                                        )
                                    }
                                >
                                    {slot.blocked ? "Unblock" : "Block (sold offline)"}
                                </Button>
                                <Button variant="outline" leftIcon={<Pencil className="w-4 h-4" />} disabled={!!busy} onClick={() => setEditing(true)}>
                                    Change spots or time
                                </Button>
                                {slotCancelClosed(slot) ? (
                                    <p className="text-xs text-neutral-500 sm:col-span-2">
                                        A slot with bookings can't be cancelled within {BUSINESS_CANCEL_CUTOFF_HOURS} hours of the start.
                                        Contact SeekKrr if you need help.
                                    </p>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        className="text-red-700 hover:bg-red-50 sm:col-span-2"
                                        leftIcon={<CalendarX2 className="w-4 h-4" />}
                                        disabled={!!busy}
                                        onClick={() => setCancelling(true)}
                                    >
                                        Cancel slot
                                    </Button>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </Drawer>

            {editing && (
                <EditSlotModal
                    slot={slot}
                    optionName={optionName}
                    onClose={() => setEditing(false)}
                    onSaved={() => {
                        setEditing(false);
                        void invalidate();
                        toast.success("Slot updated.");
                    }}
                />
            )}

            <ConfirmDialog
                open={cancelling}
                onClose={() => setCancelling(false)}
                title={`Cancel the ${formatTimeRange(slot.start_time, slot.end_time)} slot on ${formatDayLabel(slot.date)}?`}
                body={
                    booked
                        ? `${plural(booked, "person is", "people are")} booked. Their bookings are cancelled, paid ones are refunded in full, and they're told why.`
                        : "No one has booked it. It disappears from the app."
                }
                reasonLabel={booked ? "Reason for customers (optional)" : undefined}
                reasonPlaceholder="The track is closed for repairs"
                confirmLabel="Cancel slot"
                variant="danger"
                onConfirm={async (reason) => {
                    try {
                        await experienceService.cancelSlot(businessId, slot.id, reason);
                        toast.success(booked ? "Slot cancelled. Customers have been told." : "Slot cancelled.");
                        await invalidate();
                        onClose();
                    } catch (e) {
                        toast.error(errorMessage(e, "Couldn't cancel the slot"));
                        throw e;
                    }
                }}
            />
        </>
    );
}

/** Record a walk-in or phone booking: confirmed at once, nobody is notified. */
function WalkInForm({
    slot,
    maxPeople,
    onDone,
    onSaved,
}: {
    slot: ExperienceSlot;
    maxPeople: number;
    onDone: () => void;
    onSaved: () => void | Promise<void>;
}) {
    const { businessId } = useBusiness();
    const [people, setPeople] = useState(1);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (phone && !/^\+?[0-9][0-9 -]{5,18}$/.test(phone.trim())) {
            setError("Enter a phone number with digits only, like +91 98765 43210.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await experienceService.addOfflineBooking(businessId, slot.id, {
                people,
                name: name.trim() || undefined,
                phone: phone.trim() || undefined,
            });
            toast.success(`Walk-in added: ${plural(people, "person", "people")}.`);
            await onSaved();
        } catch (e) {
            setError(errorMessage(e, "Couldn't add the walk-in"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mb-3 rounded-xl border border-primary-200 bg-primary-50/50 p-3 space-y-3">
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-neutral-700">People</span>
                <div className="inline-flex items-center rounded-lg border border-neutral-300 bg-white">
                    <button type="button" aria-label="Fewer people" className="p-2 disabled:opacity-30" disabled={people <= 1} onClick={() => setPeople((n) => n - 1)}>
                        <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                        {people}
                    </span>
                    <button
                        type="button"
                        aria-label="More people"
                        className="p-2 disabled:opacity-30"
                        disabled={people >= maxPeople}
                        onClick={() => setPeople((n) => n + 1)}
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
                <span className="text-xs text-neutral-500">{plural(maxPeople, "spot")} left</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <FieldLabel htmlFor="walkin-name">Name (optional)</FieldLabel>
                    <input id="walkin-name" className={inputClass} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Riya Sharma" />
                </div>
                <div>
                    <FieldLabel htmlFor="walkin-phone">Phone (optional)</FieldLabel>
                    <input
                        id="walkin-phone"
                        className={inputClass}
                        inputMode="tel"
                        maxLength={20}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                    />
                </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={onDone} disabled={saving}>
                    Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={() => void save()} isLoading={saving} disabled={saving}>
                    Add walk-in
                </Button>
            </div>
        </div>
    );
}

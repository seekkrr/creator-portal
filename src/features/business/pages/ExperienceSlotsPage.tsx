import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, CalendarPlus, CalendarX2, Pencil, Users, XCircle } from "lucide-react";
import { Button, EmptyState, ErrorState, Skeleton } from "@components/ui";
import { experienceService } from "@services/experience.service";
import type { Experience, ExperienceSlot } from "@services/experience.types";
import { useBusiness } from "../context";
import { errorMessage, formatDate, formatINR, isForbidden, isNotFound, plural } from "../utils";
import { FieldLabel, PageHeader, Pill, inputClass } from "../components/bits";
import { ConfirmDialog } from "../components/Overlay";
import { FeatureOff } from "../components/FeatureGate";
import {
    useExperience,
    useExperienceBookings,
    useExperienceSlots,
    useInvalidateExperiences,
} from "../experiences/queries";
import { AddSlotsModal } from "../experiences/AddSlotsModal";
import { EditSlotModal } from "../experiences/EditSlotModal";
import { ExperienceStatusPill } from "../experiences/ui";
import {
    BUSINESS_CANCEL_CUTOFF_HOURS,
    addDays,
    formatDayLabel,
    formatTimeRange,
    groupSlotsByDate,
    isUpcomingSlot,
    slotCancelClosed,
    todayIso,
} from "../experiences/utils";

function SlotRow({
    slot,
    optionName,
    canManage,
    onEdit,
    onCancel,
}: {
    slot: ExperienceSlot;
    optionName: string | null;
    canManage: boolean;
    onEdit: () => void;
    onCancel: () => void;
}) {
    const cancelled = slot.status === "cancelled";
    const upcoming = isUpcomingSlot(slot);
    const booked = slot.booked ?? 0;
    const pct = slot.capacity ? Math.min(100, Math.round((booked / slot.capacity) * 100)) : 0;
    const full = !cancelled && booked >= slot.capacity;

    return (
        <li className={`flex flex-wrap items-center gap-x-4 gap-y-2 py-3 ${cancelled ? "opacity-60" : ""}`}>
            <div className="w-36 shrink-0">
                <p className={`text-sm font-semibold text-neutral-900 ${cancelled ? "line-through" : ""}`}>
                    {formatTimeRange(slot.start_time, slot.end_time)}
                </p>
                {optionName && <p className="text-xs text-neutral-500 truncate">{optionName}</p>}
            </div>
            <div className="flex-1 min-w-[10rem]">
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" /> Booked
                    </span>
                    <span className="tabular-nums font-medium text-neutral-800">
                        {booked} / {slot.capacity}
                    </span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div className={`h-full rounded-full ${full ? "bg-red-500" : "bg-primary-500"}`} style={{ width: `${pct}%` }} />
                </div>
            </div>
            <div className="w-20 text-sm text-neutral-700 tabular-nums">{slot.price ? formatINR(slot.price) : "Free"}</div>
            <div className="w-24">
                {cancelled ? (
                    <Pill className="bg-neutral-100 text-neutral-500 border-neutral-200">Cancelled</Pill>
                ) : !upcoming ? (
                    <Pill className="bg-neutral-50 text-neutral-500 border-neutral-200">Past</Pill>
                ) : full ? (
                    <Pill className="bg-red-50 text-red-700 border-red-200">Full</Pill>
                ) : (
                    <Pill className="bg-green-50 text-green-700 border-green-200">Open</Pill>
                )}
            </div>
            {canManage && !cancelled && upcoming && (
                <div className="flex items-center gap-1.5 ml-auto">
                    <Button size="sm" variant="ghost" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={onEdit}>
                        Edit
                    </Button>
                    {slotCancelClosed(slot) ? (
                        <span
                            className="text-xs text-neutral-400"
                            title={`A slot with bookings can't be cancelled within ${BUSINESS_CANCEL_CUTOFF_HOURS} hours of the start. Contact SeekKrr if you need help.`}
                        >
                            Can't cancel within {BUSINESS_CANCEL_CUTOFF_HOURS} h
                        </span>
                    ) : (
                        <Button size="sm" variant="ghost" leftIcon={<XCircle className="w-3.5 h-3.5" />} onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                </div>
            )}
        </li>
    );
}

/** How many confirmed bookings a slot cancellation will touch. */
function useAffectedBookings(experience: Experience | undefined, slot: ExperienceSlot | null) {
    const bookings = useExperienceBookings(
        { experience_id: experience?.id, date: slot?.date, status: "confirmed" },
        !!experience && !!slot && (slot.booked ?? 0) > 0
    );
    const count = slot
        ? (bookings.data?.bookings ?? []).filter((b) => b.items.some((i) => i.slot_id === slot.id)).length
        : 0;
    return { count, isLoading: bookings.isFetching, isError: bookings.isError };
}

export function ExperienceSlotsPage() {
    const { experienceId } = useParams<{ experienceId: string }>();
    const { businessId, canManage } = useBusiness();
    const invalidate = useInvalidateExperiences();
    const experience = useExperience(experienceId);
    const [from, setFrom] = useState(todayIso());
    const [to, setTo] = useState(addDays(todayIso(), 60));
    const [showCancelled, setShowCancelled] = useState(false);
    const range = useMemo(() => ({ from, to }), [from, to]);
    const slots = useExperienceSlots(experienceId, range);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<ExperienceSlot | null>(null);
    const [cancelTarget, setCancelTarget] = useState<ExperienceSlot | null>(null);
    const affected = useAffectedBookings(experience.data, cancelTarget);

    const exp = experience.data;
    const optionName = (slot: ExperienceSlot) =>
        exp?.options.find((o) => o.id === slot.option_id)?.name || slot.option_name || null;

    const visible = (slots.data ?? []).filter((s) => showCancelled || s.status !== "cancelled");
    const groups = groupSlotsByDate(visible);
    const openSlots = visible.filter((s) => s.status === "open");
    const totalBooked = openSlots.reduce((n, s) => n + (s.booked ?? 0), 0);
    const totalCapacity = openSlots.reduce((n, s) => n + s.capacity, 0);

    if (experience.isError && isForbidden(experience.error)) return <FeatureOff feature="experiences" />;
    if (experience.isError && isNotFound(experience.error)) {
        return (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center space-y-4">
                <p className="text-neutral-700">This experience doesn't exist any more.</p>
                <Link to="/business/experiences" className="text-primary-700 font-semibold hover:underline">
                    Back to Experiences
                </Link>
            </div>
        );
    }

    const cancelBody = !cancelTarget
        ? null
        : (cancelTarget.booked ?? 0) === 0
          ? "No one has booked this slot yet. It disappears from the app."
          : affected.isLoading
            ? "Checking bookings…"
            : affected.count > 0
              ? `This cancels ${plural(affected.count, "booking")} and notifies the customers.`
              : `This cancels the bookings for ${plural(cancelTarget.booked ?? 0, "person", "people")} and notifies the customers.`;

    return (
        <div className="space-y-6">
            <Link
                to={experienceId ? `/business/experiences/${experienceId}` : "/business/experiences"}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
                <ArrowLeft className="w-4 h-4" /> {exp?.title || "Experience"}
            </Link>

            <PageHeader
                title={
                    <span className="inline-flex items-center gap-3 flex-wrap">
                        Slots
                        {exp && <ExperienceStatusPill status={exp.status} />}
                    </span>
                }
                description={
                    exp ? `When customers can book ${exp.title || "this experience"}. Times are in IST.` : "Loading…"
                }
                actions={
                    <>
                        <Link to={`/business/bookings?experience=${experienceId ?? ""}`}>
                            <Button variant="outline" leftIcon={<CalendarDays className="w-4 h-4" />}>
                                Bookings
                            </Button>
                        </Link>
                        {canManage && (
                            <Button
                                variant="accent"
                                leftIcon={<CalendarPlus className="w-4 h-4" />}
                                disabled={!exp}
                                onClick={() => setAdding(true)}
                            >
                                Add slots
                            </Button>
                        )}
                    </>
                }
            />

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 flex flex-wrap items-end gap-4">
                <div>
                    <FieldLabel htmlFor="slots-filter-from">From</FieldLabel>
                    <input
                        id="slots-filter-from"
                        type="date"
                        className={`${inputClass} w-auto`}
                        value={from}
                        onChange={(e) => e.target.value && setFrom(e.target.value)}
                    />
                </div>
                <div>
                    <FieldLabel htmlFor="slots-filter-to">To</FieldLabel>
                    <input
                        id="slots-filter-to"
                        type="date"
                        className={`${inputClass} w-auto`}
                        min={from}
                        value={to}
                        onChange={(e) => e.target.value && setTo(e.target.value)}
                    />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-neutral-700 pb-2.5 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={showCancelled}
                        onChange={(e) => setShowCancelled(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 accent-primary-600"
                    />
                    Show cancelled
                </label>
                {slots.data && (
                    <p className="ml-auto text-sm text-neutral-500 pb-2.5">
                        {plural(openSlots.length, "open slot")} · {totalBooked} / {totalCapacity} places booked
                    </p>
                )}
            </div>

            {slots.isLoading || experience.isLoading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} height={120} />
                    ))}
                </div>
            ) : slots.isError ? (
                isForbidden(slots.error) ? (
                    <FeatureOff feature="experiences" />
                ) : (
                    <ErrorState message="We couldn't load the slots." onRetry={() => void slots.refetch()} />
                )
            ) : groups.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200">
                    <EmptyState
                        icon={<CalendarX2 className="w-7 h-7" />}
                        title="No slots in these dates"
                        description="Add the dates and times customers can book. You can add a whole month of slots in one go."
                        action={
                            canManage && exp ? (
                                <Button variant="accent" leftIcon={<CalendarPlus className="w-4 h-4" />} onClick={() => setAdding(true)}>
                                    Add slots
                                </Button>
                            ) : undefined
                        }
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    {groups.map((g) => (
                        <section key={g.date} className="bg-white rounded-2xl border border-neutral-200 shadow-sm px-5 py-3">
                            <h2 className="flex items-baseline gap-2 pt-1">
                                <span className="font-display font-semibold text-neutral-900">{formatDayLabel(g.date)}</span>
                                <span className="text-xs text-neutral-400">{formatDate(g.date)}</span>
                            </h2>
                            <ul className="divide-y divide-neutral-100">
                                {g.slots.map((s) => (
                                    <SlotRow
                                        key={s.id}
                                        slot={s}
                                        optionName={optionName(s)}
                                        canManage={canManage}
                                        onEdit={() => setEditing(s)}
                                        onCancel={() => setCancelTarget(s)}
                                    />
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            )}

            {adding && exp && (
                <AddSlotsModal
                    experience={exp}
                    onClose={() => setAdding(false)}
                    onCreated={(result, requested) => {
                        setAdding(false);
                        void invalidate();
                        const skipped = result.skipped ?? Math.max(0, requested - result.created);
                        toast.success(
                            `Created ${plural(result.created, "slot")}${skipped ? ` (skipped ${plural(skipped, "duplicate")})` : ""}.`
                        );
                    }}
                />
            )}

            {editing && (
                <EditSlotModal
                    key={editing.id}
                    slot={editing}
                    optionName={optionName(editing)}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        void invalidate();
                        toast.success("Slot updated.");
                    }}
                />
            )}

            <ConfirmDialog
                open={!!cancelTarget}
                onClose={() => setCancelTarget(null)}
                title={
                    cancelTarget
                        ? `Cancel the ${formatTimeRange(cancelTarget.start_time, cancelTarget.end_time)} slot on ${formatDayLabel(cancelTarget.date)}?`
                        : "Cancel this slot?"
                }
                body={cancelBody}
                confirmLabel="Cancel slot"
                variant="danger"
                onConfirm={async () => {
                    if (!cancelTarget) return;
                    try {
                        await experienceService.cancelSlot(businessId, cancelTarget.id);
                        toast.success("Slot cancelled. Customers with bookings have been told.");
                        await invalidate();
                    } catch (e) {
                        toast.error(errorMessage(e, "Couldn't cancel the slot"));
                        throw e;
                    }
                }}
            />
        </div>
    );
}

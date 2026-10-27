import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
    ArrowLeft,
    CalendarDays,
    CalendarPlus,
    CalendarX2,
    CheckSquare,
    Copy,
    Lock,
    LockOpen,
    Settings2,
    Users,
    X,
} from "lucide-react";
import { Button, EmptyState, ErrorState, Skeleton } from "@components/ui";
import { experienceService } from "@services/experience.service";
import type { BulkSlotChange, ExperienceSlot } from "@services/experience.types";
import { useBusiness } from "../context";
import { errorMessage, formatDate, isForbidden, isNotFound, plural } from "../utils";
import { PageHeader, Pill } from "../components/bits";
import { ConfirmDialog } from "../components/Overlay";
import { FeatureOff } from "../components/FeatureGate";
import { useExperience, useExperienceSlots, useInvalidateExperiences } from "../experiences/queries";
import { AddSlotsModal } from "../experiences/AddSlotsModal";
import { ExperienceStatusPill } from "../experiences/ui";
import { DayStrip, DayTimeline, SlotLegend } from "../experiences/ScheduleTimeline";
import { SlotPanel } from "../experiences/SlotPanel";
import { BulkCapacityModal, CopyDayModal } from "../experiences/ScheduleDialogs";
import { dayStats, isActionable } from "../experiences/schedule";
import { addDays, formatDayLabel, todayIso } from "../experiences/utils";

const WINDOW_DAYS = 14;

/**
 * An experience's Schedule: pick a day, see every option's slots on one
 * timeline, open a slot to see who's coming and manage it, or select several
 * to block, resize or cancel them together.
 */
export function ExperienceSlotsPage() {
    const { experienceId } = useParams<{ experienceId: string }>();
    const { businessId, canManage } = useBusiness();
    const invalidate = useInvalidateExperiences();
    const experience = useExperience(experienceId);
    const today = todayIso();
    const [windowStart, setWindowStart] = useState(today);
    const [day, setDay] = useState(today);
    const [option, setOption] = useState<string>("all");
    const range = useMemo(() => ({ from: windowStart, to: addDays(windowStart, WINDOW_DAYS - 1) }), [windowStart]);
    const slots = useExperienceSlots(experienceId, range);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const [copying, setCopying] = useState(false);
    const [selecting, setSelecting] = useState(false);
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [resizing, setResizing] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [bulkBusy, setBulkBusy] = useState<BulkSlotChange["action"] | null>(null);

    const exp = experience.data;
    const all = useMemo(() => slots.data ?? [], [slots.data]);
    const byDay = useMemo(() => {
        const map = new Map<string, ExperienceSlot[]>();
        for (const s of all) {
            if (option !== "all" && s.option_id !== option) continue;
            map.set(s.date, [...(map.get(s.date) ?? []), s]);
        }
        return map;
    }, [all, option]);
    const daySlots = byDay.get(day) ?? [];
    const stats = dayStats(daySlots);
    const active = all.find((s) => s.id === activeId) ?? null;
    const selectable = daySlots.filter((s) => isActionable(s));
    const pickedSlots = daySlots.filter((s) => picked.has(s.id));
    const pickedBooked = pickedSlots.reduce((n, s) => n + (s.booked ?? 0), 0);
    const scheduling = exp?.scheduling;

    const pickDay = (next: string) => {
        setDay(next);
        setPicked(new Set());
        if (next < windowStart || next > addDays(windowStart, WINDOW_DAYS - 1)) setWindowStart(next);
    };
    const moveWindow = (delta: number) => {
        const start = addDays(windowStart, delta) < today ? today : addDays(windowStart, delta);
        setWindowStart(start);
        setDay(start);
        setPicked(new Set());
    };
    const stopSelecting = () => {
        setSelecting(false);
        setPicked(new Set());
    };

    const bulk = async (change: Omit<BulkSlotChange, "slot_ids">, verb: string) => {
        if (!experienceId || !pickedSlots.length) return;
        setBulkBusy(change.action);
        try {
            const res = await experienceService.bulkUpdateSlots(businessId, experienceId, {
                ...change,
                slot_ids: pickedSlots.map((s) => s.id),
            });
            const reasons = [...new Set(res.skipped.map((s) => s.reason))].join("; ");
            if (res.changed) toast.success(`${verb} ${plural(res.changed, "slot")}.${res.cancelled_bookings ? ` ${plural(res.cancelled_bookings, "booking")} cancelled and told.` : ""}`);
            if (res.skipped.length) toast.warning(`${plural(res.skipped.length, "slot")} skipped: ${reasons}`);
            stopSelecting();
            await invalidate();
        } catch (e) {
            toast.error(errorMessage(e, "Couldn't change those slots"));
            throw e;
        } finally {
            setBulkBusy(null);
        }
    };

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

    return (
        <div className="space-y-5">
            <Link
                to={experienceId ? `/business/experiences/${experienceId}` : "/business/experiences"}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
                <ArrowLeft className="w-4 h-4" /> {exp?.title || "Experience"}
            </Link>

            <PageHeader
                title={
                    <span className="inline-flex items-center gap-3 flex-wrap">
                        Schedule
                        {exp && <ExperienceStatusPill status={exp.status} />}
                    </span>
                }
                description={exp ? `Slots and bookings for ${exp.title || "this experience"}. Times are in IST.` : "Loading…"}
                actions={
                    <>
                        <Link to={`/business/bookings?experience=${experienceId ?? ""}`}>
                            <Button variant="outline" leftIcon={<CalendarDays className="w-4 h-4" />}>
                                All bookings
                            </Button>
                        </Link>
                        {canManage && (
                            <Button variant="accent" leftIcon={<CalendarPlus className="w-4 h-4" />} disabled={!exp} onClick={() => setAdding(true)}>
                                Add slots
                            </Button>
                        )}
                    </>
                }
            />

            {exp && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-neutral-500">How bookings work:</span>
                    {scheduling?.shared_space && (
                        <Pill className="bg-primary-50 text-primary-800 border-primary-200">One shared space</Pill>
                    )}
                    {scheduling?.private_slots && (
                        <Pill className="bg-primary-50 text-primary-800 border-primary-200">One group per slot</Pill>
                    )}
                    {!scheduling?.shared_space && !scheduling?.private_slots && (
                        <Pill className="bg-neutral-50 text-neutral-700 border-neutral-200">Each slot has its own spots</Pill>
                    )}
                    {canManage && (
                        <Link
                            to={`/business/experiences/${exp.id}#exp-scheduling`}
                            className="inline-flex items-center gap-1 text-primary-700 font-medium hover:underline"
                        >
                            <Settings2 className="w-3.5 h-3.5" /> Change
                        </Link>
                    )}
                </div>
            )}

            <DayStrip
                start={windowStart}
                days={WINDOW_DAYS}
                selected={day}
                slotsByDay={byDay}
                onSelect={pickDay}
                onMove={moveWindow}
                onJump={pickDay}
            />

            {exp && exp.options.length > 1 && (
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Option">
                    {[{ id: "all", name: "All options" }, ...exp.options].map((o) => (
                        <button
                            key={o.id}
                            type="button"
                            role="radio"
                            aria-checked={option === o.id}
                            onClick={() => {
                                setOption(o.id);
                                setPicked(new Set());
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                option === o.id
                                    ? "bg-primary-600 text-white border-primary-600"
                                    : "bg-white text-neutral-700 border-neutral-300 hover:border-primary-400"
                            }`}
                        >
                            {o.name || "Unnamed option"}
                        </button>
                    ))}
                </div>
            )}

            <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 pt-4 pb-3 border-b border-neutral-100">
                    <div className="min-w-0">
                        <h2 className="font-display font-semibold text-neutral-900">
                            {formatDayLabel(day)} <span className="text-sm font-normal text-neutral-400">{formatDate(day)}</span>
                        </h2>
                        <p className="text-sm text-neutral-500">
                            {stats.slots
                                ? `${plural(stats.slots, "slot")} · ${stats.booked} of ${stats.capacity} places booked`
                                : "No slots"}
                        </p>
                    </div>
                    {canManage && daySlots.length > 0 && !selecting && (
                        <div className="flex flex-wrap gap-2 ml-auto">
                            <Button size="sm" variant="ghost" leftIcon={<CalendarPlus className="w-3.5 h-3.5" />} onClick={() => setAdding(true)}>
                                Add to this day
                            </Button>
                            <Button size="sm" variant="ghost" leftIcon={<Copy className="w-3.5 h-3.5" />} onClick={() => setCopying(true)}>
                                Copy day to…
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<CheckSquare className="w-3.5 h-3.5" />}
                                disabled={!selectable.length}
                                onClick={() => {
                                    setSelecting(true);
                                    setActiveId(null);
                                }}
                            >
                                Select slots
                            </Button>
                        </div>
                    )}
                </div>

                {selecting && (
                    <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-primary-50 border-b border-primary-100" aria-live="polite">
                        <span className="text-sm font-semibold text-primary-900">{plural(picked.size, "slot")} selected</span>
                        <button
                            type="button"
                            className="text-sm text-primary-700 font-medium hover:underline"
                            onClick={() => setPicked(picked.size === selectable.length ? new Set() : new Set(selectable.map((s) => s.id)))}
                        >
                            {picked.size === selectable.length ? "Clear" : "Select whole day"}
                        </button>
                        <div className="flex flex-wrap gap-2 ml-auto">
                            <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<Lock className="w-3.5 h-3.5" />}
                                disabled={!picked.size || !!bulkBusy}
                                isLoading={bulkBusy === "block"}
                                onClick={() => void bulk({ action: "block" }, "Blocked").catch(() => undefined)}
                            >
                                Block
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<LockOpen className="w-3.5 h-3.5" />}
                                disabled={!picked.size || !!bulkBusy}
                                isLoading={bulkBusy === "unblock"}
                                onClick={() => void bulk({ action: "unblock" }, "Unblocked").catch(() => undefined)}
                            >
                                Unblock
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<Users className="w-3.5 h-3.5" />}
                                disabled={!picked.size || !!bulkBusy}
                                onClick={() => setResizing(true)}
                            >
                                Change spots
                            </Button>
                            <Button
                                size="sm"
                                variant="danger"
                                leftIcon={<CalendarX2 className="w-3.5 h-3.5" />}
                                disabled={!picked.size || !!bulkBusy}
                                onClick={() => setCancelling(true)}
                            >
                                Cancel
                            </Button>
                            <Button size="sm" variant="ghost" leftIcon={<X className="w-3.5 h-3.5" />} onClick={stopSelecting}>
                                Done
                            </Button>
                        </div>
                    </div>
                )}

                <div className="px-3 sm:px-5 py-4">
                    {slots.isLoading || experience.isLoading ? (
                        <Skeleton height={180} />
                    ) : slots.isError ? (
                        isForbidden(slots.error) ? (
                            <FeatureOff feature="experiences" />
                        ) : (
                            <ErrorState message="We couldn't load the slots." onRetry={() => void slots.refetch()} />
                        )
                    ) : !exp || daySlots.length === 0 ? (
                        <EmptyState
                            icon={<CalendarX2 className="w-7 h-7" />}
                            title={day < today ? "This day has passed" : "No slots on this day"}
                            description={
                                day < today
                                    ? "Pick today or a later day to see its slots."
                                    : "Add times customers can book, or copy a day you've already set up."
                            }
                            action={
                                canManage && exp && day >= today ? (
                                    <Button variant="accent" leftIcon={<CalendarPlus className="w-4 h-4" />} onClick={() => setAdding(true)}>
                                        Add slots
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <div className="space-y-3">
                            <DayTimeline
                                slots={daySlots}
                                experience={exp}
                                activeId={activeId}
                                selecting={selecting}
                                picked={picked}
                                onOpen={(s) => setActiveId(s.id)}
                                onToggle={(s) => {
                                    if (!isActionable(s)) return;
                                    setPicked((p) => {
                                        const next = new Set(p);
                                        if (next.has(s.id)) next.delete(s.id);
                                        else next.add(s.id);
                                        return next;
                                    });
                                }}
                            />
                            <SlotLegend />
                        </div>
                    )}
                </div>
            </section>

            {active && exp && <SlotPanel key={active.id} slot={active} experience={exp} onClose={() => setActiveId(null)} />}

            {adding && exp && (
                <AddSlotsModal
                    experience={exp}
                    initialDate={day >= today ? day : undefined}
                    onClose={() => setAdding(false)}
                    onCreated={(result, requested) => {
                        setAdding(false);
                        void invalidate();
                        const skipped = result.skipped ?? Math.max(0, requested - result.created);
                        toast.success(`Created ${plural(result.created, "slot")}${skipped ? ` (skipped ${plural(skipped, "duplicate")})` : ""}.`);
                    }}
                />
            )}

            {copying && exp && (
                <CopyDayModal
                    experienceId={exp.id}
                    day={day}
                    slots={byDay.get(day) ?? []}
                    onClose={() => setCopying(false)}
                    onCopied={(created, skipped) => {
                        setCopying(false);
                        void invalidate();
                        toast.success(`Copied ${plural(created, "slot")}${skipped ? ` (skipped ${plural(skipped, "one")} already there)` : ""}.`);
                    }}
                />
            )}

            {resizing && (
                <BulkCapacityModal
                    count={picked.size}
                    onClose={() => setResizing(false)}
                    onConfirm={async (capacity) => {
                        await bulk({ action: "capacity", capacity }, "Changed spots on");
                        setResizing(false);
                    }}
                />
            )}

            <ConfirmDialog
                open={cancelling}
                onClose={() => setCancelling(false)}
                title={`Cancel ${plural(picked.size, "slot")}?`}
                body={
                    pickedBooked
                        ? `${plural(pickedBooked, "person is", "people are")} booked in them. Their bookings are cancelled, paid ones are refunded in full, and they're told why. Slots starting within 3 hours that have bookings are skipped.`
                        : "No one has booked them. They disappear from the app."
                }
                reasonLabel={pickedBooked ? "Reason for customers (optional)" : undefined}
                reasonPlaceholder="Closed for rain"
                confirmLabel="Cancel slots"
                variant="danger"
                onConfirm={(reason) => bulk({ action: "cancel", reason: reason || undefined }, "Cancelled")}
            />
        </div>
    );
}

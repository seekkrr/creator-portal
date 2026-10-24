import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Phone, XCircle } from "lucide-react";
import { Button, EmptyState, ErrorState, SkeletonTableRows, StatusFilterPills } from "@components/ui";
import { experienceService } from "@services/experience.service";
import type { ExperienceBooking, ExperienceBookingStatus, ListBookingsParams } from "@services/experience.types";
import { useBusiness } from "../context";
import { errorMessage, isForbidden, plural, relativeTime } from "../utils";
import { PageHeader, Pill, SegmentedControl, inputClass, selectClass } from "../components/bits";
import { ConfirmDialog } from "../components/Overlay";
import { FeatureOff } from "../components/FeatureGate";
import { useExperienceBookings, useExperiences, useInvalidateExperiences } from "../experiences/queries";
import { BookingStatusPill, PaymentPill, PaymentsNote } from "../experiences/ui";
import { bookingAmount, formatMoney } from "../experiences/money";
import { BUSINESS_CANCEL_CUTOFF_HOURS, addDays, businessCanCancel, formatDayLabel, formatTimeRange, todayIso } from "../experiences/utils";

type StatusFilter = "all" | ExperienceBookingStatus;
type DayPreset = "today" | "tomorrow" | "any" | "custom";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Awaiting payment", value: "pending_payment" },
    { label: "Checked in", value: "checked_in" },
    { label: "Cancelled", value: "cancelled" },
    { label: "No-show", value: "no_show" },
];

const th = "py-3 px-5 text-xs font-semibold text-neutral-500 uppercase tracking-wider";

export function ExperienceBookingsPage() {
    const { businessId, canManage } = useBusiness();
    const [searchParams, setSearchParams] = useSearchParams();
    const experiences = useExperiences();
    const invalidate = useInvalidateExperiences();
    const experienceId = searchParams.get("experience") ?? "";
    // Today's view by default; coming from one experience, show all its bookings.
    const [preset, setPreset] = useState<DayPreset>(() => (experienceId ? "any" : "today"));
    const [customDate, setCustomDate] = useState(todayIso());
    const [status, setStatus] = useState<StatusFilter>("all");
    const [page, setPage] = useState(1);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [cancelTarget, setCancelTarget] = useState<ExperienceBooking | null>(null);

    const date =
        preset === "today" ? todayIso() : preset === "tomorrow" ? addDays(todayIso(), 1) : preset === "custom" ? customDate : "";

    useEffect(() => setPage(1), [experienceId, date, status]);

    const params = useMemo<ListBookingsParams>(
        () => ({
            experience_id: experienceId || undefined,
            date: date || undefined,
            status: status === "all" ? undefined : status,
            page,
        }),
        [experienceId, date, status, page]
    );
    const bookings = useExperienceBookings(params);

    const setExperience = (id: string) => {
        const next = new URLSearchParams(searchParams);
        if (id) next.set("experience", id);
        else next.delete("experience");
        setSearchParams(next, { replace: true });
    };

    const titleOf = (b: ExperienceBooking) =>
        b.experience?.title || experiences.data?.find((e) => e.id === b.experience_id)?.title || "Experience";

    const checkIn = async (b: ExperienceBooking) => {
        setBusyId(b.id);
        try {
            await experienceService.checkIn(businessId, b.id);
            toast.success(`${b.contact?.name || "Customer"} checked in.`);
            await invalidate();
        } catch (e) {
            toast.error(errorMessage(e, "Couldn't check in this booking"));
        } finally {
            setBusyId(null);
        }
    };

    if (bookings.isError && isForbidden(bookings.error)) return <FeatureOff feature="experiences" />;

    const rows = bookings.data?.bookings ?? [];
    const total = bookings.data?.total ?? 0;
    const pageSize = bookings.data?.page_size || rows.length || 1;
    const hasNext = page * pageSize < total;
    const people = rows.filter((b) => b.status !== "cancelled").reduce((n, b) => n + (b.total_people ?? 0), 0);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bookings"
                description={
                    preset === "today"
                        ? "Who's coming today. Check guests in when they arrive."
                        : "Every booking for your experiences."
                }
            />

            <PaymentsNote />

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
                <select
                    aria-label="Experience"
                    className={`${selectClass} w-full sm:w-64`}
                    value={experienceId}
                    onChange={(e) => setExperience(e.target.value)}
                >
                    <option value="">All experiences</option>
                    {(experiences.data ?? []).map((e) => (
                        <option key={e.id} value={e.id}>
                            {e.title || "Untitled experience"}
                        </option>
                    ))}
                </select>
                <SegmentedControl
                    size="sm"
                    ariaLabel="Date"
                    value={preset}
                    onChange={setPreset}
                    options={[
                        { value: "today", label: "Today" },
                        { value: "tomorrow", label: "Tomorrow" },
                        { value: "any", label: "Any date" },
                        { value: "custom", label: "Pick a date" },
                    ]}
                />
                {preset === "custom" && (
                    <input
                        type="date"
                        aria-label="Booking date"
                        className={`${inputClass} w-auto`}
                        value={customDate}
                        onChange={(e) => e.target.value && setCustomDate(e.target.value)}
                    />
                )}
                {bookings.data && (
                    <p className="sm:ml-auto text-sm text-neutral-500">
                        {plural(total, "booking")}
                        {people > 0 && ` · ${plural(people, "guest")} on this page`}
                    </p>
                )}
            </div>

            <StatusFilterPills filters={STATUS_FILTERS} active={status} onChange={setStatus} />

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[980px]">
                        <thead className="bg-neutral-50 border-b border-neutral-200">
                            <tr>
                                <th className={th}>Code</th>
                                <th className={th}>Customer</th>
                                <th className={th}>Booked</th>
                                <th className={`${th} text-right`}>People</th>
                                <th className={th}>Payment</th>
                                <th className={th}>Status</th>
                                <th className={`${th} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {bookings.isLoading ? (
                                <SkeletonTableRows columns={7} rows={4} />
                            ) : bookings.isError ? (
                                <tr>
                                    <td colSpan={7} className="p-0">
                                        <ErrorState message="We couldn't load the bookings." onRetry={() => void bookings.refetch()} />
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-0">
                                        <EmptyState
                                            icon={<CalendarCheck className="w-7 h-7" />}
                                            title={preset === "today" ? "No bookings for today" : "No bookings here"}
                                            description="Bookings appear the moment a customer books a slot in the SeekKrr app."
                                        />
                                    </td>
                                </tr>
                            ) : (
                                rows.map((b) => (
                                    <tr key={b.id} className="align-top hover:bg-neutral-50/70">
                                        <td className="py-3.5 px-5">
                                            <p className="font-mono text-sm font-semibold text-neutral-900">{b.code}</p>
                                            <p className="text-xs text-neutral-400">{relativeTime(b.created_at)}</p>
                                            {b.source === "offline" && (
                                                <Pill className="mt-1 bg-violet-50 text-violet-700 border-violet-200">Offline</Pill>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-5">
                                            <p className="text-sm font-medium text-neutral-900">{b.contact?.name || "Customer"}</p>
                                            {b.contact?.phone && (
                                                <a
                                                    href={`tel:${b.contact.phone}`}
                                                    className="text-xs text-primary-700 inline-flex items-center gap-1 hover:underline"
                                                >
                                                    <Phone className="w-3 h-3" /> {b.contact.phone}
                                                </a>
                                            )}
                                            {b.note && <p className="text-xs text-neutral-500 mt-1 max-w-[14rem]">“{b.note}”</p>}
                                        </td>
                                        <td className="py-3.5 px-5 max-w-[22rem]">
                                            {!experienceId && (
                                                <p className="text-sm font-medium text-neutral-900 truncate">{titleOf(b)}</p>
                                            )}
                                            <ul className="space-y-0.5">
                                                {b.items.map((i, idx) => (
                                                    <li key={`${i.slot_id}-${idx}`} className="text-xs text-neutral-600">
                                                        {[
                                                            i.option_name,
                                                            formatDayLabel(i.date),
                                                            formatTimeRange(i.start_time, i.end_time),
                                                            plural(i.people, "person", "people"),
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" · ")}
                                                    </li>
                                                ))}
                                            </ul>
                                            {b.status === "cancelled" && b.cancel_reason && (
                                                <p className="text-xs text-neutral-400 mt-1">
                                                    Cancelled{b.cancelled_by ? ` by ${b.cancelled_by === "user" ? "the customer" : b.cancelled_by}` : ""}:{" "}
                                                    {b.cancel_reason}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-5 text-right text-sm font-semibold text-neutral-900 tabular-nums">
                                            {b.total_people}
                                        </td>
                                        <td className="py-3.5 px-5">
                                            <PaymentPill booking={b} />
                                            {!!bookingAmount(b) && (
                                                <p className="text-xs text-neutral-500 mt-1 tabular-nums">
                                                    {formatMoney(bookingAmount(b))}
                                                    {!!b.pricing?.gst_amount && ` incl. ${formatMoney(b.pricing.gst_amount)} GST`}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-5">
                                            <BookingStatusPill status={b.status} />
                                        </td>
                                        <td className="py-3.5 px-5 text-right">
                                            {b.status === "confirmed" ? (
                                                <div className="flex justify-end items-center gap-1.5">
                                                    {canManage && businessCanCancel(b) && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                                                            disabled={busyId === b.id}
                                                            onClick={() => setCancelTarget(b)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                    {canManage && !businessCanCancel(b) && (
                                                        <span
                                                            className="text-xs text-neutral-400 mr-1"
                                                            title={`Bookings can't be cancelled within ${BUSINESS_CANCEL_CUTOFF_HOURS} hours of the start. Contact SeekKrr if you need help.`}
                                                        >
                                                            Can't cancel within {BUSINESS_CANCEL_CUTOFF_HOURS} h
                                                        </span>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="accent"
                                                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                                        isLoading={busyId === b.id}
                                                        disabled={busyId === b.id}
                                                        onClick={() => void checkIn(b)}
                                                    >
                                                        Check in
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-neutral-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {(page > 1 || hasNext) && (
                    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-neutral-100 text-sm">
                        <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<ChevronLeft className="w-4 h-4" />}
                            disabled={page <= 1 || bookings.isFetching}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            Previous
                        </Button>
                        <span className="text-neutral-500">Page {page}</span>
                        <Button
                            size="sm"
                            variant="ghost"
                            rightIcon={<ChevronRight className="w-4 h-4" />}
                            disabled={!hasNext || bookings.isFetching}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={!!cancelTarget}
                onClose={() => setCancelTarget(null)}
                title={`Cancel booking ${cancelTarget?.code ?? ""}?`}
                body={`${cancelTarget?.contact?.name || "The customer"} gets a notification with your reason, and the places go back on sale.${
                    cancelTarget?.payment?.status === "paid"
                        ? ` SeekKrr refunds the full ${formatMoney(bookingAmount(cancelTarget))} to the customer.`
                        : ""
                }`}
                reasonLabel="Reason (shared with the customer)"
                reasonPlaceholder="e.g. Heavy rain is forecast — we're not flying that morning"
                confirmLabel="Cancel booking"
                variant="danger"
                onConfirm={async (reason) => {
                    if (!cancelTarget) return;
                    if (!reason) {
                        toast.error("Add a short reason for the customer.");
                        throw new Error("reason required");
                    }
                    try {
                        await experienceService.cancelBooking(businessId, cancelTarget.id, reason);
                        toast.success(
                            cancelTarget.payment?.status === "paid"
                                ? "Booking cancelled. The customer has been told and gets a full refund."
                                : "Booking cancelled. The customer has been told."
                        );
                        await invalidate();
                    } catch (e) {
                        toast.error(errorMessage(e, "Couldn't cancel the booking"));
                        throw e;
                    }
                }}
            />
        </div>
    );
}

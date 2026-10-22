import { Link } from "react-router-dom";
import { CalendarCheck, CheckCircle2, Ticket, Users } from "lucide-react";
import { Skeleton } from "@components/ui";
import { plural } from "../utils";
import { KpiCard, SectionCard } from "../components/bits";
import { useExperienceBookings, useExperiences } from "./queries";
import { BookingStatusPill } from "./ui";
import { formatTimeRange, todayIso } from "./utils";

/** Overview block for businesses with Experiences: listings and today's bookings. */
export function ExperiencesSummary() {
    const experiences = useExperiences();
    const today = useExperienceBookings({ date: todayIso() });

    const live = (experiences.data ?? []).filter((e) => e.status === "published").length;
    const drafts = (experiences.data ?? []).filter((e) => e.status === "draft").length;
    const bookings = (today.data?.bookings ?? []).filter((b) => b.status !== "cancelled");
    const guests = bookings.reduce((n, b) => n + (b.total_people ?? 0), 0);
    const checkedIn = bookings.filter((b) => b.status === "checked_in").length;

    if (experiences.isError || today.isError) return null;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                    label="Live experiences"
                    value={experiences.isLoading ? "…" : live}
                    icon={<Ticket className="w-5 h-5" />}
                    tone="primary"
                    hint={drafts ? `${plural(drafts, "draft")} waiting` : undefined}
                    to="/business/experiences"
                />
                <KpiCard
                    label="Bookings today"
                    value={today.isLoading ? "…" : bookings.length}
                    icon={<CalendarCheck className="w-5 h-5" />}
                    tone="blue"
                    hint={guests ? plural(guests, "guest") : "No one booked yet"}
                    to="/business/bookings"
                />
                <KpiCard
                    label="Checked in today"
                    value={today.isLoading ? "…" : checkedIn}
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    tone="green"
                    to="/business/bookings"
                />
            </div>

            <SectionCard
                title="Today's bookings"
                actions={
                    <Link to="/business/bookings" className="text-sm font-medium text-primary-700 hover:underline">
                        View all
                    </Link>
                }
            >
                {today.isLoading ? (
                    <Skeleton height={80} />
                ) : bookings.length === 0 ? (
                    <p className="text-sm text-neutral-500">
                        No bookings for today. Customers book open slots of your published experiences in the app.
                    </p>
                ) : (
                    <ul className="divide-y divide-neutral-100">
                        {bookings.slice(0, 6).map((b) => {
                            const first = b.items[0];
                            return (
                                <li key={b.id} className="flex items-center gap-3 py-2.5">
                                    <span className="w-9 h-9 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                                        <Users className="w-4 h-4" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-neutral-900 truncate">
                                            {b.contact?.name || "Customer"} · {plural(b.total_people, "person", "people")}
                                        </p>
                                        <p className="text-xs text-neutral-500 truncate">
                                            {[
                                                b.experience?.title,
                                                first?.option_name,
                                                first ? formatTimeRange(first.start_time, first.end_time) : null,
                                            ]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </p>
                                    </div>
                                    <BookingStatusPill status={b.status} />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </SectionCard>
        </div>
    );
}

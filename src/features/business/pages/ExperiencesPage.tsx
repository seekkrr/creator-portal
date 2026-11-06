import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, CalendarRange, EyeOff, ImageOff, Pencil, Plus, Ticket, Users } from "lucide-react";
import { Button, EmptyState, ErrorState, Skeleton, StatusFilterPills } from "@components/ui";
import type { Experience, ExperienceStatus } from "@services/experience.types";
import { useBusiness } from "../context";
import { formatINR, isForbidden, plural } from "../utils";
import { PageHeader, Pill } from "../components/bits";
import { FeatureOff } from "../components/FeatureGate";
import { useExperiences } from "../experiences/queries";
import { ExperienceStatusPill } from "../experiences/ui";
import { coverOf, formatDayLabel } from "../experiences/utils";
import { gstLabel } from "../experiences/money";

type Filter = "current" | ExperienceStatus;

const FILTERS: { label: string; value: Filter }[] = [
    { label: "All", value: "current" },
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
    { label: "Paused", value: "paused" },
    { label: "Archived", value: "archived" },
];

function ExperienceCard({ experience, canManage }: { experience: Experience; canManage: boolean }) {
    const navigate = useNavigate();
    const cover = coverOf(experience);
    const editUrl = `/business/experiences/${experience.id}`;
    const slots = experience.upcoming_slots;
    const bookings = experience.stats?.bookings ?? 0;

    return (
        <article className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
            <button
                type="button"
                onClick={() => navigate(editUrl)}
                className="relative block w-full aspect-[16/9] bg-neutral-100 text-left"
                aria-label={`Open ${experience.title || "experience"}`}
            >
                {cover ? (
                    <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                    <span className="w-full h-full flex flex-col items-center justify-center gap-1 text-neutral-400">
                        <ImageOff className="w-7 h-7" />
                        <span className="text-xs font-medium">No photo yet</span>
                    </span>
                )}
                <span className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <ExperienceStatusPill status={experience.status} />
                    {experience.hidden_by_admin && (
                        <Pill className="bg-red-50 text-red-700 border-red-200">
                            <EyeOff className="w-3 h-3" /> Hidden by SeekKrr
                        </Pill>
                    )}
                </span>
            </button>

            <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="min-w-0">
                    <h3 className="text-lg font-display font-bold text-primary-900 leading-snug truncate">
                        {experience.title || "Untitled experience"}
                    </h3>
                    {experience.tagline && <p className="text-sm text-neutral-600 mt-0.5 line-clamp-2">{experience.tagline}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-neutral-50 py-2 px-1">
                        <p className="text-sm font-bold text-neutral-900 truncate">
                            {experience.next_date ? formatDayLabel(experience.next_date) : "—"}
                        </p>
                        <p className="text-[11px] uppercase tracking-wider text-neutral-500">Next date</p>
                    </div>
                    <div className="rounded-xl bg-neutral-50 py-2 px-1">
                        <p className="text-sm font-bold text-neutral-900">{typeof slots === "number" ? slots : "—"}</p>
                        <p className="text-[11px] uppercase tracking-wider text-neutral-500">Upcoming slots</p>
                    </div>
                    <div className="rounded-xl bg-neutral-50 py-2 px-1">
                        <p className="text-sm font-bold text-neutral-900">{bookings}</p>
                        <p className="text-[11px] uppercase tracking-wider text-neutral-500">Bookings</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                    {experience.price_from !== null && experience.price_from !== undefined && (
                        <span title="Price set by SeekKrr">
                            From {formatINR(experience.price_from)}
                            {experience.gst?.enabled && experience.price_from > 0 ? ` ${gstLabel(experience.gst)}` : ""}
                        </span>
                    )}
                    {experience.duration_text && <span>{experience.duration_text}</span>}
                    {experience.options.length > 0 && <span>{plural(experience.options.length, "option")}</span>}
                    {(experience.stats?.people ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> {plural(experience.stats?.people ?? 0, "guest")}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 pt-4 mt-auto border-t border-neutral-100">
                    <Link to={editUrl}>
                        <Button size="sm" variant="secondary" leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                            {canManage ? "Edit" : "View"}
                        </Button>
                    </Link>
                    <Link to={`${editUrl}/slots`}>
                        <Button size="sm" variant="ghost" leftIcon={<CalendarRange className="w-3.5 h-3.5" />}>
                            Schedule
                        </Button>
                    </Link>
                    <Link to={`/business/bookings?experience=${experience.id}`} className="ml-auto">
                        <Button size="sm" variant="ghost" leftIcon={<CalendarDays className="w-3.5 h-3.5" />}>
                            Bookings
                        </Button>
                    </Link>
                </div>
            </div>
        </article>
    );
}

export function ExperiencesPage() {
    const { canManage } = useBusiness();
    const experiences = useExperiences();
    const [filter, setFilter] = useState<Filter>("current");

    if (experiences.isError && isForbidden(experiences.error)) return <FeatureOff feature="experiences" />;

    const all = experiences.data ?? [];
    const items = all.filter((e) => (filter === "current" ? e.status !== "archived" : e.status === filter));

    const newButton = canManage ? (
        <Link to="/business/experiences/new" className="w-full sm:w-auto">
            <Button variant="accent" leftIcon={<Plus className="w-4 h-4" />} fullWidth>
                New experience
            </Button>
        </Link>
    ) : undefined;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Experiences"
                description="Tours, classes and sessions customers can book in the SeekKrr app."
                actions={newButton}
            />

            <StatusFilterPills filters={FILTERS} active={filter} onChange={setFilter} />

            {experiences.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} height={340} />
                    ))}
                </div>
            ) : experiences.isError ? (
                <ErrorState message="We couldn't load your experiences." onRetry={() => void experiences.refetch()} />
            ) : items.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200">
                    {all.length === 0 ? (
                        <EmptyState
                            icon={<Ticket className="w-7 h-7" />}
                            title="List your first experience"
                            description="Add photos, what guests will do and your time slots. Customers book in the app and you see every booking here."
                            action={
                                canManage ? (
                                    <Link to="/business/experiences/new">
                                        <Button variant="accent" leftIcon={<Plus className="w-4 h-4" />}>
                                            New experience
                                        </Button>
                                    </Link>
                                ) : undefined
                            }
                        />
                    ) : (
                        <EmptyState
                            icon={<Ticket className="w-7 h-7" />}
                            title={`No ${filter === "current" ? "" : `${filter} `}experiences`}
                            description={
                                filter === "paused"
                                    ? "Paused experiences are hidden from customers until you publish them again."
                                    : filter === "archived"
                                      ? "Archived experiences are kept for your records."
                                      : filter === "draft"
                                        ? "Drafts are only visible to your team."
                                        : "Nothing here yet."
                            }
                        />
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {items.map((e) => (
                        <ExperienceCard key={e.id} experience={e} canManage={canManage} />
                    ))}
                </div>
            )}
        </div>
    );
}

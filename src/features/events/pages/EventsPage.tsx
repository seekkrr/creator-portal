import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, AlertTriangle, Plus, CalendarDays, Users } from "lucide-react";
import { Card, Button, Input, EmptyState, ErrorState, SkeletonTableRows, StatusFilterPills } from "@components/ui";
import { eventService } from "@services/event.service";
import { useAuthStore } from "@store/auth.store";
import { toast } from "sonner";
import type { EventListItem, EventStatus, EventDetail } from "@/types";
import { EventFormModal } from "../components/EventFormModal";
import { EventAttendeesModal } from "../components/EventAttendeesModal";

type StatusFilter = EventStatus | "all";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
    { label: "Live", value: "live" },
    { label: "Ended", value: "ended" },
    { label: "Cancelled", value: "cancelled" },
];

const STATUS_STYLES: Record<EventStatus, string> = {
    draft: "bg-neutral-100 text-neutral-600 border-neutral-200",
    published: "bg-green-50 text-green-700 border-green-200",
    live: "bg-red-50 text-red-700 border-red-200",
    ended: "bg-neutral-100 text-neutral-500 border-neutral-200",
    cancelled: "bg-amber-50 text-amber-700 border-amber-200",
};

/** Sensible next status transitions for an event, given its current status. */
function transitionsFor(status: EventStatus): { label: string; to: EventStatus }[] {
    switch (status) {
        case "draft":
            return [{ label: "Publish", to: "published" }];
        case "published":
            return [
                { label: "Mark Live", to: "live" },
                { label: "Move to Draft", to: "draft" },
                { label: "Cancel", to: "cancelled" },
            ];
        case "live":
            return [
                { label: "Mark Ended", to: "ended" },
                { label: "Cancel", to: "cancelled" },
            ];
        case "cancelled":
            return [{ label: "Move to Draft", to: "draft" }];
        case "ended":
        default:
            return [];
    }
}

function fmtDate(v?: string | null): string {
    if (!v) return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function EventsPage() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState<EventDetail | undefined>(undefined);
    const [attendeesFor, setAttendeesFor] = useState<EventListItem | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // Delete modal
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [confirmText, setConfirmText] = useState("");

    React.useEffect(() => {
        const close = () => setOpenDropdownId(null);
        document.addEventListener("click", close);
        return () => document.removeEventListener("click", close);
    }, []);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["creator-events", { status: statusFilter }],
        queryFn: () => eventService.getMyEvents({ status: statusFilter !== "all" ? statusFilter : undefined }),
        enabled: !!user,
    });

    const events = data?.items ?? [];

    const openCreate = () => { setEditing(undefined); setIsFormOpen(true); };

    const openEdit = async (id: string) => {
        try {
            const detail = await eventService.getEvent(id);
            setEditing(detail);
            setIsFormOpen(true);
        } catch {
            toast.error("Could not load event for editing");
        }
    };

    const handleSaved = () => {
        queryClient.invalidateQueries({ queryKey: ["creator-events"] });
        setIsFormOpen(false);
    };

    const changeStatus = async (id: string, to: EventStatus) => {
        const promise = eventService.setStatus(id, to);
        toast.promise(promise, { loading: "Updating status…", success: `Status → ${to}`, error: "Failed to update status" });
        try { await promise; await queryClient.invalidateQueries({ queryKey: ["creator-events"] }); } catch { /* toast */ }
    };

    const confirmDelete = async () => {
        if (!deleteTarget || confirmText !== "CONFIRM") return;
        const promise = eventService.deleteEvent(deleteTarget);
        toast.promise(promise, { loading: "Deleting event…", success: "Event deleted", error: "Failed to delete event" });
        try { await promise; await queryClient.invalidateQueries({ queryKey: ["creator-events"] }); }
        catch { /* toast */ }
        finally { setDeleteTarget(null); setConfirmText(""); }
    };

    return (
        <div className="animate-fade-in space-y-4 w-full max-w-6xl mx-auto pb-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary-900 tracking-tight">My Events</h1>
                    <p className="text-neutral-500 mt-1">Create and manage your festivals & events</p>
                </div>
                <Button variant="accent" onClick={openCreate} className="w-full sm:w-auto" leftIcon={<Plus className="w-4 h-4" />}>
                    Create New Event
                </Button>
            </div>

            {deleteTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
                    <Card className="w-full max-w-md shadow-2xl border-red-100 overflow-hidden animate-scale-up">
                        <div className="p-6">
                            <div className="flex items-center gap-3 text-red-600 mb-4">
                                <div className="p-2 bg-red-50 rounded-full"><AlertTriangle className="w-6 h-6" /></div>
                                <h3 className="text-xl font-bold">Delete Event?</h3>
                            </div>
                            <p className="text-neutral-600 mb-6">This cannot be undone. Type <span className="font-bold text-neutral-900">CONFIRM</span> to delete.</p>
                            <Input placeholder="Type CONFIRM" value={confirmText}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)}
                                className="border-red-100 focus:border-red-500 focus:ring-red-200" autoFocus />
                            <div className="flex gap-3 pt-4">
                                <Button variant="ghost" fullWidth onClick={() => { setDeleteTarget(null); setConfirmText(""); }}>Cancel</Button>
                                <Button variant="danger" fullWidth disabled={confirmText !== "CONFIRM"} onClick={confirmDelete}>Delete Forever</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            <EventFormModal
                open={isFormOpen}
                mode={editing ? "edit" : "create"}
                initial={editing}
                onClose={() => setIsFormOpen(false)}
                onSaved={handleSaved}
            />

            {attendeesFor && (
                <EventAttendeesModal eventId={attendeesFor.id} eventTitle={attendeesFor.title} onClose={() => setAttendeesFor(null)} />
            )}

            <StatusFilterPills filters={STATUS_FILTERS} active={statusFilter} onChange={setStatusFilter} />

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
                <div className="w-full overflow-y-auto overflow-x-auto max-h-[60vh] min-h-[300px]">
                    <table className="w-full text-left border-collapse min-w-[700px] table-fixed">
                        <thead className="sticky top-0 z-20 bg-neutral-50 shadow-sm outline outline-1 outline-neutral-200">
                            <tr className="border-b border-neutral-200">
                                <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[34%]">Title</th>
                                <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[26%]">Dates</th>
                                <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[16%] text-center">Status</th>
                                <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[24%] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {isLoading ? (
                                <SkeletonTableRows columns={4} />
                            ) : isError ? (
                                <tr><td colSpan={4} className="p-0"><ErrorState message="We couldn't load your events." onRetry={() => refetch()} /></td></tr>
                            ) : events.length === 0 ? (
                                <tr><td colSpan={4} className="p-0">
                                    <EmptyState icon={<CalendarDays className="w-7 h-7" />} title="No events yet"
                                        description="Create your first festival or event to start collecting RSVPs."
                                        action={<Button variant="accent" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>Create New Event</Button>} />
                                </td></tr>
                            ) : (
                                events.map((ev) => (
                                    <tr key={ev.id} className="hover:bg-neutral-50/50 transition-colors">
                                        <td className="py-4 px-6 font-medium text-neutral-900 truncate" title={ev.title}>
                                            {ev.title}
                                            {ev.is_featured && <span className="ml-2 text-[11px] font-semibold text-amber-600">★ Featured</span>}
                                        </td>
                                        <td className="py-4 px-6 text-sm text-neutral-500">{fmtDate(ev.start_date)} – {fmtDate(ev.end_date)}</td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[ev.status]}`}>
                                                {ev.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right relative">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" title="Attendees"
                                                    onClick={(e) => { e.stopPropagation(); setAttendeesFor(ev); }}
                                                    className="p-2 h-9 w-9 rounded-lg flex items-center justify-center text-neutral-400 hover:text-primary-600 hover:bg-primary-50">
                                                    <Users className="w-4 h-4" />
                                                </Button>
                                                <div className="relative">
                                                    <Button variant="ghost"
                                                        onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === ev.id ? null : ev.id); }}
                                                        className={`p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${openDropdownId === ev.id ? "bg-neutral-100 text-neutral-900" : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"}`}>
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                    {openDropdownId === ev.id && (
                                                        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl z-[100] py-1.5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                                            <button onClick={() => { void openEdit(ev.id); setOpenDropdownId(null); }}
                                                                className="w-full text-left px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 font-medium">Edit Event</button>
                                                            <button onClick={() => { setAttendeesFor(ev); setOpenDropdownId(null); }}
                                                                className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 font-medium">View Attendees</button>
                                                            {transitionsFor(ev.status).map((t) => (
                                                                <button key={t.to} onClick={() => { void changeStatus(ev.id, t.to); setOpenDropdownId(null); }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 font-medium">{t.label}</button>
                                                            ))}
                                                            <button onClick={() => { setDeleteTarget(ev.id); setOpenDropdownId(null); }}
                                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">Delete Event</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

import { useQuery } from "@tanstack/react-query";
import { X, Users } from "lucide-react";
import { Card, Badge, EmptyState, ErrorState, SkeletonTableRows } from "@components/ui";
import { eventService } from "@services/event.service";

interface EventAttendeesModalProps {
    eventId: string;
    eventTitle: string;
    onClose: () => void;
}

/** Read-only list of who RSVP'd (going / interested) to an event. */
export function EventAttendeesModal({ eventId, eventTitle, onClose }: EventAttendeesModalProps) {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["event-attendees", eventId],
        queryFn: () => eventService.listAttendees(eventId, { page_size: 100 }),
    });

    const attendees = data?.items ?? [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-lg shadow-2xl border-neutral-200 overflow-hidden animate-scale-up max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-white shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-neutral-900">Attendees</h2>
                        <p className="text-xs text-neutral-500">{eventTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-neutral-50">
                            <tr className="border-b border-neutral-200">
                                <th className="py-3 px-5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Name</th>
                                <th className="py-3 px-5 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {isLoading ? (
                                <SkeletonTableRows columns={2} />
                            ) : isError ? (
                                <tr><td colSpan={2} className="p-0"><ErrorState message="Couldn't load attendees." onRetry={() => refetch()} /></td></tr>
                            ) : attendees.length === 0 ? (
                                <tr><td colSpan={2} className="p-0">
                                    <EmptyState icon={<Users className="w-7 h-7" />} title="No RSVPs yet" description="When people RSVP to this event, they'll show up here." />
                                </td></tr>
                            ) : (
                                attendees.map((a) => (
                                    <tr key={a.user_id} className="hover:bg-neutral-50/50">
                                        <td className="py-3 px-5 text-sm font-medium text-neutral-900">{a.name}</td>
                                        <td className="py-3 px-5 text-center">
                                            <Badge status={a.status === "going" ? "approved" : "under_review"}>{a.status}</Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

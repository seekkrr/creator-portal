import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowLeft, Calendar, Clock, MapPin,
    Star, Tag, Layers, Navigation, Eye,
    AlertCircle, MessageSquare, Send, Trash2
} from "lucide-react";
import { questService } from "@services/quest.service";
import { Card, Button, Badge, Input } from "@components/ui";
import { WaypointMapComponent } from "@features/map/components/WaypointMapComponent";
import { useState, ChangeEvent } from "react";
import { toast } from "sonner";
import type { QuestStatus } from "@/types";


export function QuestDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    const { data: quest, isLoading, error, refetch } = useQuery({
        queryKey: ["quest", id],
        queryFn: () => questService.getQuestById(id!),
        enabled: !!id,
    });

    const handleUpdateStatus = async (status: QuestStatus) => {
        if (!quest) return;
        const promise = questService.updateQuest(quest._id, { status });

        toast.promise(promise, {
            loading: 'Updating status...',
            success: `Quest submitted for review!`,
            error: 'Failed to update status',
        });

        try {
            await promise;
            refetch();
        } catch (err) {
            console.error("Error updating status:", err);
        }
    };

    const handleQuestDelete = async () => {
        if (!quest || confirmText !== "CONFIRM") return;

        const promise = questService.deleteQuest(quest._id);

        toast.promise(promise, {
            loading: 'Deleting quest...',
            success: 'Quest archived successfully',
            error: 'Failed to delete quest',
        });

        try {
            await promise;
            navigate("/creator/quests");
        } catch (err) {
            console.error("Error deleting quest:", err);
        }
    };

    const toggleStep = (index: number) => {
        setExpandedSteps(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch (e) {
            return dateString;
        }
    };

    const formatDateTime = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString("en-IN", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                hour12: true
            });
        } catch (e) {
            return dateString;
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-slate-500 font-medium">Loading quest details...</p>
            </div>
        );
    }

    if (error || !quest) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="p-4 bg-red-50 rounded-full">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Quest Not Found</h3>
                    <p className="text-slate-500 max-w-xs">The quest you're looking for might have been deleted or moved.</p>
                </div>
                <Button variant="outline" onClick={() => navigate("/creator/quests")}>
                    Back to My Quests
                </Button>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Draft": return "bg-slate-100 text-slate-700 border-slate-200";
            case "Under Review": return "bg-blue-50 text-blue-700 border-blue-200";
            case "Changes Requested": return "bg-amber-50 text-amber-700 border-amber-200";
            case "Approved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
            case "Published": return "bg-indigo-50 text-indigo-700 border-indigo-200";
            case "Rejected": return "bg-red-50 text-red-700 border-red-200";
            default: return "bg-slate-50 text-slate-600 border-slate-100";
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate("/creator/quests")}
                        className="rounded-full w-10 h-10 p-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                            {quest.metadata?.title || "Untitled Quest"}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge className={`${getStatusColor(quest.status)} border px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider`}>
                                {quest.status}
                            </Badge>
                            <span className="text-sm text-slate-400 font-medium">ID: {quest._id.slice(-8)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {["Draft", "Changes Requested"].includes(quest.status) && (
                        <Button
                            variant="primary"
                            onClick={() => handleUpdateStatus('Under Review')}
                            leftIcon={<Send className="w-4 h-4" />}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Submit Review
                        </Button>
                    )}

                    {["Draft", "Changes Requested", "Approved", "Published"].includes(quest.status) && (
                        <Button
                            variant="secondary"
                            onClick={() => navigate(`/creator/quest/edit/${quest._id}`)}
                        >
                            Edit Quest
                        </Button>
                    )}

                    <Button
                        variant="danger"
                        onClick={() => setIsDeleteModalOpen(true)}
                        leftIcon={<Trash2 className="w-4 h-4" />}
                    >
                        Delete
                    </Button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <Card className="w-full max-w-md shadow-2xl border-red-100 overflow-hidden animate-scale-up">
                        <div className="p-6">
                            <div className="flex items-center gap-3 text-red-600 mb-4">
                                <div className="p-2 bg-red-50 rounded-full">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold">Delete Quest?</h3>
                            </div>

                            <p className="text-slate-600 mb-6">
                                This action will archive your quest. To confirm, please type <span className="font-bold text-slate-900 select-none">CONFIRM</span> below.
                            </p>

                            <div className="space-y-4">
                                <Input
                                    placeholder="Type CONFIRM to delete"
                                    value={confirmText}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)}
                                    className="border-red-100 focus:border-red-500 focus:ring-red-200"
                                    autoFocus
                                />

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="ghost"
                                        fullWidth
                                        onClick={() => {
                                            setIsDeleteModalOpen(false);
                                            setConfirmText("");
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="danger"
                                        fullWidth
                                        disabled={confirmText !== "CONFIRM"}
                                        onClick={handleQuestDelete}
                                    >
                                        Delete Forever
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Star className="w-5 h-5 text-amber-500" />} label="Difficulty" value={quest.metadata?.difficulty || "Medium"} />
                <StatCard icon={<Clock className="w-5 h-5 text-blue-500" />} label="Duration" value={`${quest.metadata?.duration_minutes || 60} mins`} />
                <StatCard icon={<Tag className="w-5 h-5 text-indigo-500" />} label="Theme" value={quest.metadata?.theme || "Culture"} />
                <StatCard icon={<Calendar className="w-5 h-5 text-emerald-500" />} label="Created" value={formatDate(quest.created_at)} />
            </div>

            {/* Admin Comments / Review History */}
            {quest.review_history && quest.review_history.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/30">
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="w-5 h-5 text-amber-600" />
                            <h2 className="text-lg font-bold text-amber-900">Admin Feedback</h2>
                        </div>
                        <div className="space-y-4">
                            {quest.review_history.map((review, i) => (
                                <div key={i} className="bg-white/80 p-4 rounded-xl border border-amber-100 shadow-sm">
                                    <p className="text-slate-800 text-sm whitespace-pre-wrap mb-2 italic">"{review.comment}"</p>
                                    <div className="flex items-center justify-between text-[11px] text-amber-700 font-medium">
                                        <span>Feedback provided by Admin</span>
                                        <span>{formatDateTime(review.timestamp)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Description & Media */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Layers className="w-5 h-5 text-indigo-500" />
                                Description
                            </h3>
                            <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                                {Array.isArray(quest.metadata?.description)
                                    ? quest.metadata.description.map((p, i) => <p key={i}>{p}</p>)
                                    : <p>{quest.metadata?.description || "No description provided."}</p>
                                }
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-red-500" />
                                Route & Steps
                            </h3>

                            {/* Map Preview */}
                            <div className="h-[300px] rounded-xl overflow-hidden border border-slate-200 mb-6 bg-slate-50 relative group">
                                <WaypointMapComponent
                                    waypoints={quest.location?.route_waypoints?.map(rw => ({
                                        latitude: rw.location.coordinates[1] || 0,
                                        longitude: rw.location.coordinates[0] || 0,
                                        place_name: `Step ${rw.order + 1}`,
                                    })) || []}
                                    center={quest.location ? { lng: quest.location.start_location.coordinates[0] || 0, lat: quest.location.start_location.coordinates[1] || 0 } : { lng: 0, lat: 0 }}
                                    onWaypointAdd={() => { }}
                                    onWaypointUpdate={() => { }}
                                    onWaypointRemove={() => { }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 pointer-events-none transition-colors" />
                            </div>

                            {/* Steps List */}
                            <div className="space-y-3">
                                {quest.steps?.map((step, i) => (
                                    <div key={i} className="border border-slate-100 rounded-xl overflow-hidden bg-white hover:border-indigo-200 transition-colors">
                                        <button
                                            onClick={() => toggleStep(i)}
                                            className="w-full text-left p-4 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                                    {i + 1}
                                                </div>
                                                <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{step.title}</h4>
                                            </div>
                                            <div className={`transition-transform duration-200 ${expandedSteps.has(i) ? "rotate-180" : ""}`}>
                                                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </button>

                                        {expandedSteps.has(i) && (
                                            <div className="px-4 pb-4 pt-0 pl-16 animate-slide-down">
                                                <p className="text-sm text-slate-600 mb-4">{step.description}</p>
                                                {step.how_to_reach && (
                                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                            <Navigation className="w-3 h-3" /> How to Reach
                                                        </h5>
                                                        <p className="text-sm text-slate-700">{step.how_to_reach}</p>
                                                    </div>
                                                )}

                                                {step.cloudinary_assets && step.cloudinary_assets.length > 0 && (
                                                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-none">
                                                        {step.cloudinary_assets.map((asset, idx) => (
                                                            <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                                                                <img src={asset.secure_url} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Media Gallery & Additional Info */}
                <div className="space-y-6">
                    <Card>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Eye className="w-5 h-5 text-indigo-500" />
                                Media Gallery
                            </h3>
                            {quest.media?.cloudinary_assets && quest.media.cloudinary_assets.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {quest.media.cloudinary_assets.map((asset, i) => (
                                        <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-100 group cursor-pointer relative">
                                            <img src={asset.secure_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-sm text-slate-400">No media uploaded</p>
                                </div>
                            )}

                            {quest.media?.reel_url && (
                                <div className="mt-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Social / Source Reel</h4>
                                    <a
                                        href={quest.media.reel_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 text-sm hover:underline flex items-center gap-1 font-medium truncate"
                                    >
                                        View Source URL
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Quest Info</h3>
                            <div className="space-y-4">
                                <DetailItem label="Region" value={quest.location?.region || "Unknown"} />
                                <DetailItem label="City" value={quest.location?.region || "Unknown"} />
                                <DetailItem label="Currency" value={quest.currency || "INR"} />
                                <DetailItem label="Price" value={(quest.price ?? 0) > 0 ? `₹${quest.price}` : "Free"} />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 flex flex-col items-center text-center">
                <div className="p-2.5 bg-slate-50 rounded-2xl mb-2">
                    {icon}
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
                <span className="text-sm font-bold text-slate-800 mt-0.5">{value}</span>
            </div>
        </Card>
    );
}

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
            <span className="text-sm text-slate-500 font-medium">{label}</span>
            <span className="text-sm text-slate-800 font-bold">{value}</span>
        </div>
    );
}

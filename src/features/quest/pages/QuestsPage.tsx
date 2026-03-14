import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Edit2, MoreVertical, AlertTriangle } from "lucide-react";
import { Card, Button } from "@components/ui";
import { questService } from "@services/quest.service";
import { useAuthStore } from "@store/auth.store";
import type { QuestStatus } from "@/types";
import { toast } from "sonner";

type Tab = QuestStatus;
const TABS: Tab[] = ["Draft", "Under Review", "Changes Requested", "Published", "Rejected"];

export function QuestsPage() {
    const { user, creator } = useAuthStore();
    const navigate = useNavigate();

    // Filter tabs based on creator status
    const isApproved = creator?.status === "approved";
    const availableTabs = isApproved
        ? TABS
        : TABS.filter(tab => tab === "Draft");

    const [activeTab, setActiveTab] = useState<Tab>("Draft");

    // Reset to Draft if current tab is no longer available
    React.useEffect(() => {
        if (!availableTabs.includes(activeTab)) {
            setActiveTab("Draft");
        }
    }, [availableTabs, activeTab]);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["creator-quests", activeTab],
        queryFn: () => questService.listQuests({
            status: activeTab,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            created_by: (user as any)?._id || (user as any)?.id
        }),
        enabled: !!user,
    });

    const handleUpdateStatus = async (questId: string, status: QuestStatus) => {
        const promise = questService.updateQuest(questId, { status });

        toast.promise(promise, {
            loading: 'Updating status...',
            success: `Quest submitted for review!`,
            error: 'Failed to update status',
        });

        try {
            await promise;
            refetch();
        } catch (error) {
            console.error("Error updating quest status:", error);
        }
    };

    const handleQuestDelete = async (questId: string) => {
        if (confirm("Are you sure you want to delete this quest?")) {
            const promise = questService.deleteQuest(questId);

            toast.promise(promise, {
                loading: 'Deleting quest...',
                success: 'Quest archived successfully',
                error: 'Failed to delete quest',
            });

            try {
                await promise;
                refetch();
            } catch (error) {
                console.error("Error deleting quest:", error);
            }
        }
    };

    const quests = data?.items || [];

    const getStatusColor = (status: QuestStatus) => {
        switch (status) {
            case "Published": return "bg-emerald-100 text-emerald-700 border border-emerald-200";
            case "Approved": return "bg-blue-100 text-blue-700 border border-blue-200";
            case "Under Review": return "bg-amber-100 text-amber-700 border border-amber-200";
            case "Changes Requested": return "bg-orange-100 text-orange-700 border border-orange-200";
            case "Rejected": return "bg-red-100 text-red-700 border border-red-200";
            case "Draft": return "bg-slate-100 text-slate-700 border border-slate-200";
            case "Archived": return "bg-neutral-100 text-neutral-500 border border-neutral-200";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Quests</h1>
                    <p className="text-slate-500 mt-1">Manage your quest creations and drafts</p>
                </div>
                <Button
                    onClick={() => navigate("/creator/quest/create")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    Create New Quest
                </Button>
            </div>

            <Card className="overflow-hidden border border-slate-200 shadow-sm">
                <div className="flex items-center overflow-x-auto border-b border-slate-200">
                    {availableTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors relative
                                ${activeTab === tab
                                    ? "text-indigo-600 bg-slate-50"
                                    : "text-slate-600 hover:text-slate-900"
                                }
                            `}
                        >
                            {tab}
                            {activeTab === tab && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Views</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-500">
                                            Loading quests...
                                        </td>
                                    </tr>
                                ) : quests.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center">
                                            <div className="text-slate-400 mb-2">No quests found in this category</div>
                                            {activeTab === "Draft" && (
                                                <Button
                                                    variant="outline"
                                                    className="mt-4 border-dashed border-2"
                                                    onClick={() => navigate("/creator/quest/create")}
                                                >
                                                    Start a New Quest
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    quests.map((quest) => {
                                        const latestComment = quest.review_history && quest.review_history.length > 0
                                            ? quest.review_history[quest.review_history.length - 1]?.comment
                                            : null;

                                        return (
                                            <React.Fragment key={quest._id}>
                                                {/* Desktop View */}
                                                <tr className="hidden md:table-row hover:bg-slate-50/50 transition-colors group">
                                                    <td className="py-4 px-6 font-medium text-slate-900 truncate max-w-[200px]" title={quest.quest_title || quest.metadata_id}>
                                                        {quest.quest_title || quest.metadata_id}
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${getStatusColor(quest.status as QuestStatus)}`}>
                                                            {quest.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-slate-500 whitespace-nowrap">
                                                        {new Date(quest.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-slate-500">
                                                        {quest.view_count || 0}
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {['Draft', 'Changes Requested', 'Approved', 'Published'].includes(quest.status as string) && (
                                                                <Button
                                                                    variant="primary"
                                                                    size="sm"
                                                                    onClick={() => navigate(`/creator/quest/edit/${quest._id}`)}
                                                                    className="text-xs py-1 h-8 px-3 shadow-none bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-600 hover:text-white"
                                                                >
                                                                    <Edit2 className="w-3 h-3 mr-1.5" /> Edit
                                                                </Button>
                                                            )}
                                                            <div className="relative group/actions">
                                                                <Button variant="ghost" className="p-2 h-8 w-8 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 border border-transparent">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-neutral-200 rounded-lg shadow-xl opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-50 py-1">
                                                                    <button
                                                                        onClick={() => navigate(`/creator/quest/view/${quest._id}`)}
                                                                        className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                                                                    >
                                                                        View Details
                                                                    </button>
                                                                    {isApproved && ['Draft', 'Changes Requested'].includes(quest.status as string) && (
                                                                        <button
                                                                            onClick={() => handleUpdateStatus(quest._id, 'Under Review')}
                                                                            className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"
                                                                        >
                                                                            Submit for Review
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleQuestDelete(quest._id)}
                                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                    >
                                                                        Delete Quest
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Mobile View */}
                                                <div className="md:hidden p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="font-semibold text-slate-900 line-clamp-1 pr-8">
                                                            {quest.quest_title || quest.metadata_id}
                                                        </div>
                                                        <div className="relative group/actions">
                                                            <MoreVertical className="w-5 h-5 text-neutral-400 p-1" />
                                                            <div className="absolute right-0 top-0 w-32 bg-white border border-neutral-200 rounded-lg shadow-lg opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-10 py-1">
                                                                <button onClick={() => navigate(`/creator/quest/view/${quest._id}`)} className="w-full text-left px-3 py-1.5 text-xs text-neutral-700">View Details</button>
                                                                {isApproved && ['Draft', 'Changes Requested'].includes(quest.status as string) && (
                                                                    <button onClick={() => handleUpdateStatus(quest._id, 'Under Review')} className="w-full text-left px-3 py-1.5 text-xs text-indigo-600">Submit Review</button>
                                                                )}
                                                                <button onClick={() => navigate(`/creator/quest/edit/${quest._id}`)} className="w-full text-left px-3 py-1.5 text-xs text-neutral-700">Edit</button>
                                                                <button onClick={() => handleQuestDelete(quest._id)} className="w-full text-left px-3 py-1.5 text-xs text-red-600">Delete</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getStatusColor(quest.status as QuestStatus)}`}>
                                                            {quest.status}
                                                        </span>
                                                        <span className="text-xs text-slate-400">{new Date(quest.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    {['Draft', 'Changes Requested', 'Approved', 'Published'].includes(quest.status as string) && (
                                                        <Button
                                                            variant="primary"
                                                            fullWidth
                                                            size="sm"
                                                            onClick={() => navigate(`/creator/quest/edit/${quest._id}`)}
                                                            className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-600 hover:text-white mb-2"
                                                        >
                                                            Edit Quest
                                                        </Button>
                                                    )}
                                                </div>

                                                {((quest.status as string) === 'Changes Requested') && latestComment && (
                                                    <tr className="bg-orange-50/50">
                                                        <td colSpan={5} className="py-3 px-6 border-l-4 border-orange-500">
                                                            <div className="flex items-start gap-2 text-sm text-orange-800">
                                                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-600" />
                                                                <div>
                                                                    <span className="font-semibold text-orange-900">Admin Feedback: </span>
                                                                    {latestComment}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
}

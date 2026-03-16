import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Edit2, MoreVertical, AlertTriangle } from "lucide-react";
import { Card, Button, Input } from "@components/ui";
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
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [questToDelete, setQuestToDelete] = useState<string | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
    const queryClient = useQueryClient();

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

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
            created_by: user?._id
        }),
        enabled: !!user,
    });

    const handleUpdateStatus = async (questId: string, status: QuestStatus) => {
        const promise = questService.updateQuest(questId, { status });

        toast.promise(promise, {
            loading: 'Updating status...',
            success: `Quest status updated seamlessly!`,
            error: 'Failed to update status',
        });

        try {
            await promise;
            // Instantly invalidate queries to ensure seamless data swap
            await queryClient.invalidateQueries({ queryKey: ["creator-quests"] });
            refetch();
        } catch (error) {
            console.error("Error updating quest status:", error);
        }
    };

    const handleQuestDelete = (questId: string) => {
        setQuestToDelete(questId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!questToDelete || confirmText !== "CONFIRM") return;

        const promise = questService.deleteQuest(questToDelete);

        toast.promise(promise, {
            loading: 'Deleting quest...',
            success: 'Quest deleted successfully',
            error: 'Failed to delete quest',
        });

        try {
            await promise;
            await queryClient.invalidateQueries({ queryKey: ["creator-quests"] });
            refetch();
        } catch (error) {
            console.error("Error deleting quest:", error);
        } finally {
            setIsDeleteModalOpen(false);
            setQuestToDelete(null);
            setConfirmText("");
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
        <div className="animate-fade-in space-y-4 w-full max-w-6xl mx-auto pb-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Quests</h1>
                    <p className="text-slate-500 mt-1">Manage your quest creations and drafts</p>
                </div>
                <Button
                    onClick={() => navigate("/creator/quest/create")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                >
                    Create New Quest
                </Button>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <Card className="w-full max-w-md shadow-2xl border-red-100 overflow-hidden animate-scale-up">
                        <div className="p-6">
                            <div className="flex items-center gap-3 text-red-600 mb-4">
                                <div className="p-2 bg-red-50 rounded-full">
                                    <AlertTriangle className="w-6 h-6" />
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
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)}
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
                                            setQuestToDelete(null);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="danger"
                                        fullWidth
                                        disabled={confirmText !== "CONFIRM"}
                                        onClick={confirmDelete}
                                    >
                                        Delete Forever
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
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

                <div className="p-0 relative">
                    <div className="w-full overflow-y-auto overflow-x-auto max-h-[60vh] min-h-[300px]">
                        <table className="w-full text-left border-collapse min-w-[900px] table-fixed">
                            <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                                <tr className="border-b border-slate-200">
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[35%]">Title</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%] text-center">Status</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%] text-center">Created</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[10%] text-center">Views</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%] text-right">Actions</th>
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
                                                    <td className="py-4 px-6 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${getStatusColor(quest.status as QuestStatus)}`}>
                                                            {quest.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-slate-500 whitespace-nowrap text-center">
                                                        {new Date(quest.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-slate-500 whitespace-nowrap text-center">
                                                        {quest.view_count || 0}
                                                    </td>
                                                    <td className="py-4 px-6 text-right relative">
                                                        <div className="flex items-center justify-end whitespace-nowrap">
                                                            {['Draft', 'Changes Requested', 'Approved'].includes(quest.status as string) && (
                                                                <Button
                                                                    variant="primary"
                                                                    size="sm"
                                                                    onClick={() => navigate(`/creator/quest/edit/${quest._id}`)}
                                                                    className="h-9 px-4 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-600 hover:text-white rounded-lg font-medium shadow-none transition-colors mr-3 flex items-center whitespace-nowrap flex-shrink-0"
                                                                >
                                                                    <div className="flex items-center gap-1.5 px-0.5 min-w-max">
                                                                        <Edit2 className="w-4 h-4 shrink-0" /> Edit
                                                                    </div>
                                                                </Button>
                                                            )}
                                                            <div className="relative">
                                                                <Button
                                                                    variant="ghost"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        const spaceBelow = window.innerHeight - rect.bottom;
                                                                        if (spaceBelow < 200) {
                                                                            setDropdownPosition('top');
                                                                        } else {
                                                                            setDropdownPosition('bottom');
                                                                        }
                                                                        setOpenDropdownId(openDropdownId === quest._id ? null : quest._id);
                                                                    }}
                                                                    className={`p-2 h-9 w-9 border border-transparent rounded-lg flex items-center justify-center transition-colors
                                                                        ${openDropdownId === quest._id ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100'}`}
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>

                                                                {openDropdownId === quest._id && (
                                                                    <div
                                                                        className={`absolute right-0 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl z-[100] py-1.5 animate-fade-in ${dropdownPosition === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                                                            }`}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <button
                                                                            onClick={() => { navigate(`/creator/quest/view/${quest._id}`); setOpenDropdownId(null); }}
                                                                            className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                                                        >
                                                                            View Details
                                                                        </button>
                                                                        {isApproved && ['Draft', 'Changes Requested'].includes(quest.status as string) && (
                                                                            <button
                                                                                onClick={() => { handleUpdateStatus(quest._id, 'Under Review'); setOpenDropdownId(null); }}
                                                                                className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-medium"
                                                                            >
                                                                                Submit for Review
                                                                            </button>
                                                                        )}
                                                                        {quest.status !== 'Published' && (
                                                                            <button
                                                                                onClick={() => { handleQuestDelete(quest._id); setOpenDropdownId(null); }}
                                                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                                                            >
                                                                                Delete Quest
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Mobile View */}
                                                <div className="md:hidden p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="font-semibold text-slate-900 pr-8 text-base">
                                                            {quest.quest_title || quest.metadata_id}
                                                        </div>
                                                        <div className="relative">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenDropdownId(openDropdownId === quest._id ? null : quest._id);
                                                                }}
                                                                className={`p-2 rounded-lg transition-colors ${openDropdownId === quest._id ? 'bg-neutral-100' : 'hover:bg-neutral-100'}`}
                                                            >
                                                                <MoreVertical className="w-5 h-5 text-neutral-500" />
                                                            </button>

                                                            {openDropdownId === quest._id && (
                                                                <div
                                                                    className="absolute right-0 top-full mt-1 w-44 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-1.5 animate-fade-in"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <button onClick={() => { navigate(`/creator/quest/view/${quest._id}`); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-slate-50">View Details</button>
                                                                    {isApproved && ['Draft', 'Changes Requested'].includes(quest.status as string) && (
                                                                        <button onClick={() => { handleUpdateStatus(quest._id, 'Under Review'); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50">Submit Review</button>
                                                                    )}
                                                                    {quest.status !== 'Published' && (
                                                                        <button onClick={() => { navigate(`/creator/quest/edit/${quest._id}`); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-slate-50">Edit Quest</button>
                                                                    )}
                                                                    {quest.status !== 'Published' && (
                                                                        <button onClick={() => { handleQuestDelete(quest._id); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">Delete</button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(quest.status as QuestStatus)}`}>
                                                            {quest.status}
                                                        </span>
                                                        <span className="text-xs font-medium text-slate-500">{new Date(quest.created_at).toLocaleDateString()}</span>
                                                        <span className="text-xs font-medium text-slate-500 text-right ms-auto">{quest.view_count || 0} views</span>
                                                    </div>
                                                    {['Draft', 'Changes Requested', 'Approved'].includes(quest.status as string) && (
                                                        <Button
                                                            variant="primary"
                                                            fullWidth
                                                            size="sm"
                                                            onClick={() => navigate(`/creator/quest/edit/${quest._id}`)}
                                                            className="text-sm h-10 font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-600 hover:text-white mb-2 shadow-none rounded-xl"
                                                        >
                                                            Edit Quest
                                                        </Button>
                                                    )}
                                                </div>

                                                {((quest.status as string) === 'Changes Requested') && latestComment && (
                                                    <tr className="bg-orange-50/40 hidden md:table-row">
                                                        <td colSpan={5} className="py-4 pl-5 pr-6 border-l-4 border-orange-500 align-top">
                                                            <div className="flex items-start gap-3">
                                                                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-orange-600" />
                                                                <div className="max-w-[800px]">
                                                                    <span className="font-semibold text-orange-900 mb-1 block">Admin Feedback</span>
                                                                    <p className="text-orange-800 text-sm leading-relaxed whitespace-pre-wrap">{latestComment}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                {/* Mobile admin feedback */}
                                                {((quest.status as string) === 'Changes Requested') && latestComment && (
                                                    <div className="md:hidden bg-orange-50/40 p-4 border-l-4 border-orange-500 mb-2 rounded-r-lg">
                                                        <div className="flex items-start gap-3">
                                                            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-orange-600" />
                                                            <div>
                                                                <span className="font-semibold text-orange-900 block mb-1">Admin Feedback</span>
                                                                <p className="text-orange-800 text-sm leading-relaxed whitespace-pre-wrap">{latestComment}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Edit2, MoreVertical, AlertTriangle, BadgeCheck } from "lucide-react";
import { Card, Button, Input, Badge } from "@components/ui";
import type { BadgeStatus } from "@components/ui";
import { questService } from "@services/quest.service";
import { useAuthStore } from "@store/auth.store";
import type { QuestStatus } from "@/types";
import { toast } from "sonner";

type Tab = QuestStatus;
const TABS: Tab[] = ["Draft", "Under Review", "Changes Requested", "Published", "Rejected"];

export function QuestsPage() {
    const { user, creator } = useAuthStore();
    const navigate = useNavigate();

    // Active creators may manage every quest state and submit for review — the portal
    // login gate already guarantees active status. is_verified is a badge, not a gate.
    const isVerified = !!creator?.is_verified;
    const availableTabs = TABS;

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
        queryFn: () => questService.getMyQuests({ status: activeTab }),
        enabled: !!user,
    });

    const handleSubmitForReview = async (questId: string) => {
        const promise = questService.submitQuest(questId);

        toast.promise(promise, {
            loading: 'Submitting for review...',
            success: `Quest submitted for review!`,
            error: 'Failed to submit quest',
        });

        try {
            await promise;
            // Instantly invalidate queries to ensure seamless data swap
            await queryClient.invalidateQueries({ queryKey: ["creator-quests"] });
            refetch();
        } catch (error) {
            console.error("Error submitting quest:", error);
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

    /** Map server-side Title-Case QuestStatus → Badge status prop. */
    const questStatusToBadgeStatus = (status: QuestStatus): BadgeStatus => {
        switch (status) {
            case "Published":          return "approved";
            case "Under Review":       return "under_review";
            case "Changes Requested":  return "changes_requested";
            case "Rejected":           return "rejected";
            case "Archived":           return "archived";
            case "Draft":
            default:                   return "draft";
        }
    };

    return (
        <div className="animate-fade-in space-y-4 w-full max-w-6xl mx-auto pb-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-display font-bold text-primary-900 tracking-tight">My Quests</h1>
                        {isVerified && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 text-xs font-semibold">
                                <BadgeCheck className="w-3.5 h-3.5" /> Verified
                            </span>
                        )}
                    </div>
                    <p className="text-neutral-500 mt-1">Manage your quest creations and drafts</p>
                </div>
                <Button
                    variant="accent"
                    onClick={() => navigate("/creator/quest/create")}
                    className="w-full sm:w-auto"
                >
                    Create New Quest
                </Button>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
                    <Card className="w-full max-w-md shadow-2xl border-red-100 overflow-hidden animate-scale-up">
                        <div className="p-6">
                            <div className="flex items-center gap-3 text-red-600 mb-4">
                                <div className="p-2 bg-red-50 rounded-full">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold">Delete Quest?</h3>
                            </div>

                            <p className="text-neutral-600 mb-6">
                                This action will archive your quest. To confirm, please type <span className="font-bold text-neutral-900 select-none">CONFIRM</span> below.
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

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm flex flex-col">
                <div className="flex items-center overflow-x-auto border-b border-neutral-200">
                    {availableTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors relative
                                ${activeTab === tab
                                    ? "text-primary-600 bg-neutral-50"
                                    : "text-neutral-600 hover:text-neutral-900"
                                }
                            `}
                        >
                            {tab}
                            {activeTab === tab && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-0 relative">
                    <div className="w-full overflow-y-auto overflow-x-auto max-h-[60vh] min-h-[300px]">
                        <table className="w-full text-left border-collapse min-w-[900px] table-fixed">
                            <thead className="sticky top-0 z-20 bg-neutral-50 shadow-sm outline outline-1 outline-neutral-200">
                                <tr className="border-b border-neutral-200">
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[35%]">Title</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[20%] text-center">Status</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[15%] text-center">Created</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[10%] text-center">Views</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[20%] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-neutral-500">
                                            Loading quests...
                                        </td>
                                    </tr>
                                ) : quests.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center">
                                            <div className="text-neutral-400 mb-2">No quests found in this category</div>
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
                                        const title = quest.title || "Untitled Quest";

                                        return (
                                            <React.Fragment key={quest.id}>
                                                {/* Desktop View */}
                                                <tr className="hidden md:table-row hover:bg-neutral-50/50 transition-colors group">
                                                    <td className="py-4 px-6 font-medium text-neutral-900 truncate max-w-[200px]" title={title}>
                                                        {title}
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <Badge status={questStatusToBadgeStatus(quest.status as QuestStatus)} className="text-[11px] uppercase tracking-wider">
                                                            {quest.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-neutral-500 whitespace-nowrap text-center">
                                                        {quest.created_at ? new Date(quest.created_at).toLocaleDateString() : "—"}
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-neutral-500 whitespace-nowrap text-center">
                                                        {quest.view_count || 0}
                                                    </td>
                                                    <td className="py-4 px-6 text-right relative">
                                                        <div className="flex items-center justify-end whitespace-nowrap">
                                                            {['Draft', 'Changes Requested'].includes(quest.status as string) && (
                                                                <Button
                                                                    variant="primary"
                                                                    size="sm"
                                                                    onClick={() => navigate(`/creator/quest/edit/${quest.id}`)}
                                                                    className="h-9 px-4 bg-primary-50 text-primary-700 border border-primary-100 hover:bg-primary-600 hover:text-white rounded-lg font-medium shadow-none transition-colors mr-3 flex items-center whitespace-nowrap flex-shrink-0"
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
                                                                        setOpenDropdownId(openDropdownId === quest.id ? null : quest.id);
                                                                    }}
                                                                    className={`p-2 h-9 w-9 border border-transparent rounded-lg flex items-center justify-center transition-colors
                                                                        ${openDropdownId === quest.id ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100'}`}
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>

                                                                {openDropdownId === quest.id && (
                                                                    <div
                                                                        className={`absolute right-0 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl z-[100] py-1.5 animate-fade-in ${dropdownPosition === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                                                            }`}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <button
                                                                            onClick={() => { navigate(`/creator/quest/view/${quest.id}`); setOpenDropdownId(null); }}
                                                                            className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 font-medium"
                                                                        >
                                                                            View Details
                                                                        </button>
                                                                        {['Draft', 'Changes Requested'].includes(quest.status as string) && (
                                                                            <button
                                                                                onClick={() => { handleSubmitForReview(quest.id); setOpenDropdownId(null); }}
                                                                                className="w-full text-left px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2 font-medium"
                                                                            >
                                                                                Submit for Review
                                                                            </button>
                                                                        )}
                                                                        {quest.status !== 'Published' && (
                                                                            <button
                                                                                onClick={() => { handleQuestDelete(quest.id); setOpenDropdownId(null); }}
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
                                                <div className="md:hidden p-5 border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="font-semibold text-neutral-900 pr-8 text-base">
                                                            {title}
                                                        </div>
                                                        <div className="relative">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenDropdownId(openDropdownId === quest.id ? null : quest.id);
                                                                }}
                                                                className={`p-2 rounded-lg transition-colors ${openDropdownId === quest.id ? 'bg-neutral-100' : 'hover:bg-neutral-100'}`}
                                                            >
                                                                <MoreVertical className="w-5 h-5 text-neutral-500" />
                                                            </button>

                                                            {openDropdownId === quest.id && (
                                                                <div
                                                                    className="absolute right-0 top-full mt-1 w-44 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-1.5 animate-fade-in"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <button onClick={() => { navigate(`/creator/quest/view/${quest.id}`); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">View Details</button>
                                                                    {['Draft', 'Changes Requested'].includes(quest.status as string) && (
                                                                        <button onClick={() => { handleSubmitForReview(quest.id); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50">Submit Review</button>
                                                                    )}
{quest.status !== 'Published' && (
    <>
        <button onClick={() => { navigate(`/creator/quest/edit/${quest.id}`); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Edit Quest</button>
        <button onClick={() => { handleQuestDelete(quest.id); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">Delete</button>
    </>
)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <Badge status={questStatusToBadgeStatus(quest.status as QuestStatus)} className="text-[10px] uppercase">
                                                            {quest.status}
                                                        </Badge>
                                                        <span className="text-xs font-medium text-neutral-500">{quest.created_at ? new Date(quest.created_at).toLocaleDateString() : "—"}</span>
                                                        <span className="text-xs font-medium text-neutral-500 text-right ms-auto">{quest.view_count || 0} views</span>
                                                    </div>
                                                    {['Draft', 'Changes Requested'].includes(quest.status as string) && (
                                                        <Button
                                                            variant="primary"
                                                            fullWidth
                                                            size="sm"
                                                            onClick={() => navigate(`/creator/quest/edit/${quest.id}`)}
                                                            className="text-sm h-10 font-semibold bg-primary-50 text-primary-700 border border-primary-100 hover:bg-primary-600 hover:text-white mb-2 shadow-none rounded-xl"
                                                        >
                                                            Edit Quest
                                                        </Button>
                                                    )}
                                                </div>
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

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MoreVertical, AlertTriangle, Volume2 } from "lucide-react";
import { Card, Button, Input, Badge } from "@components/ui";
import type { BadgeStatus } from "@components/ui";
import { narrativeService } from "@services/narrative.service";
import { useAuthStore } from "@store/auth.store";
import { NarrativeFormModal } from "../components/NarrativeFormModal";
import type { Narrative, NarrativeStatus } from "@/types";
import { toast } from "sonner";

type StatusFilter = NarrativeStatus | "all";

const STATUS_TABS: StatusFilter[] = ["all", "draft", "under_review", "approved", "rejected", "archived"];

const STATUS_TAB_LABELS: Record<StatusFilter, string> = {
    all: "All",
    draft: "Draft",
    under_review: "Under Review",
    approved: "Approved",
    rejected: "Rejected",
    archived: "Archived",
};

function getNarrativeStatusBadge(status: NarrativeStatus): BadgeStatus {
    switch (status) {
        case "draft": return "draft";
        case "under_review": return "under_review";
        case "approved": return "approved";
        case "rejected": return "rejected";
        case "archived": return "archived";
        default: return "draft";
    }
}

function getAudioChipColor(audioStatus: string | null | undefined): string {
    switch (audioStatus) {
        case "ready": return "bg-emerald-100 text-emerald-700";
        case "generating":
        case "pending": return "bg-amber-100 text-amber-700";
        case "failed":
        case "quota_exceeded": return "bg-red-100 text-red-700";
        default: return "bg-neutral-100 text-neutral-500";
    }
}

function getAudioChipLabel(audioStatus: string | null | undefined): string {
    switch (audioStatus) {
        case "ready": return "Audio Ready";
        case "generating": return "Generating…";
        case "pending": return "Pending";
        case "failed": return "Failed";
        case "quota_exceeded": return "Quota Exceeded";
        default: return "No Audio";
    }
}

const CREATOR_EDITABLE: NarrativeStatus[] = ["draft", "rejected"];
const CREATOR_DELETABLE: NarrativeStatus[] = ["draft", "rejected"];

export function NarrativesPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<StatusFilter>("all");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Narrative | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [narrativeToDelete, setNarrativeToDelete] = useState<string | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Close dropdown on outside click
    React.useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ["creator-narratives", { status: activeTab, search: debouncedSearch }],
        queryFn: () =>
            narrativeService.listNarratives({
                mine: true,
                status: activeTab === "all" ? undefined : activeTab,
                search: debouncedSearch || undefined,
            }),
        enabled: !!user,
    });

    const narratives = data?.items ?? [];

    const handleSubmitForReview = (narrativeId: string) => {
        const promise = narrativeService.submitNarrative(narrativeId);
        toast.promise(promise, {
            loading: "Submitting for review…",
            success: "Narrative submitted for review!",
            error: "Failed to submit narrative",
        });
        promise
            .then(async () => {
                await queryClient.invalidateQueries({ queryKey: ["creator-narratives"] });
            })
            .catch(() => {
                // handled by toast
            });
    };

    const handleDeleteClick = (narrativeId: string) => {
        setNarrativeToDelete(narrativeId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!narrativeToDelete || confirmText !== "CONFIRM") return;

        const promise = narrativeService.deleteNarrative(narrativeToDelete);
        toast.promise(promise, {
            loading: "Deleting narrative…",
            success: "Narrative deleted",
            error: "Failed to delete narrative",
        });

        promise
            .then(async () => {
                await queryClient.invalidateQueries({ queryKey: ["creator-narratives"] });
            })
            .catch(() => {
                // handled by toast
            })
            .finally(() => {
                setIsDeleteModalOpen(false);
                setNarrativeToDelete(null);
                setConfirmText("");
            });
    };

    const handleEditClick = (narrative: Narrative) => {
        setEditTarget(narrative);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditTarget(null);
    };

    const handleSaved = () => {
        handleModalClose();
    };

    return (
        <div className="animate-fade-in space-y-4 w-full max-w-6xl mx-auto pb-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary-900 tracking-tight">My Narratives</h1>
                    <p className="text-neutral-500 mt-1">Manage your narrative content and audio</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Input
                        placeholder="Search narratives…"
                        value={search}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                        className="w-full sm:w-64"
                    />
                    <Button
                        variant="accent"
                        onClick={() => { setEditTarget(null); setIsModalOpen(true); }}
                        className="whitespace-nowrap"
                    >
                        Create New Narrative
                    </Button>
                </div>
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
                                <h3 className="text-xl font-bold">Delete Narrative?</h3>
                            </div>
                            <p className="text-neutral-600 mb-6">
                                This action is permanent. To confirm, type{" "}
                                <span className="font-bold text-neutral-900 select-none">CONFIRM</span> below.
                            </p>
                            <div className="space-y-4">
                                <Input
                                    placeholder="Type CONFIRM to delete"
                                    value={confirmText}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setConfirmText(e.target.value)
                                    }
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
                                            setNarrativeToDelete(null);
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

            {/* Create/Edit Modal */}
            <NarrativeFormModal
                open={isModalOpen}
                mode={editTarget ? "edit" : "create"}
                initial={editTarget ?? undefined}
                onClose={handleModalClose}
                onSaved={handleSaved}
            />

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm flex flex-col">
                {/* Status Tabs */}
                <div className="flex items-center overflow-x-auto border-b border-neutral-200">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors relative
                                ${activeTab === tab
                                    ? "text-primary-600 bg-neutral-50"
                                    : "text-neutral-600 hover:text-neutral-900"
                                }`}
                        >
                            {STATUS_TAB_LABELS[tab]}
                            {activeTab === tab && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="p-0 relative">
                    <div className="w-full overflow-y-auto overflow-x-auto max-h-[60vh] min-h-[300px]">
                        <table className="w-full text-left border-collapse min-w-[900px] table-fixed">
                            <thead className="sticky top-0 z-20 bg-neutral-50 shadow-sm outline outline-1 outline-neutral-200">
                                <tr className="border-b border-neutral-200">
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[28%]">Title</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[18%]">Attach</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[14%] text-center">Status</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[14%] text-center">Audio</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[12%] text-center">Created</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[14%] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-neutral-500">
                                            Loading narratives…
                                        </td>
                                    </tr>
                                ) : narratives.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center">
                                            <div className="text-neutral-400 mb-2">No narratives found</div>
                                            {activeTab === "all" && (
                                                <Button
                                                    variant="outline"
                                                    className="mt-4 border-dashed border-2"
                                                    onClick={() => setIsModalOpen(true)}
                                                >
                                                    Create Your First Narrative
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    narratives.map((narrative) => {
                                        const isEditable = CREATOR_EDITABLE.includes(narrative.status);
                                        const isDeletable = CREATOR_DELETABLE.includes(narrative.status);
                                        const isSubmittable = narrative.status === "draft";

                                        return (
                                            <tr
                                                key={narrative.id}
                                                className="hover:bg-neutral-50/50 transition-colors group"
                                            >
                                                <td className="py-4 px-6 font-medium text-neutral-900 truncate max-w-[200px]" title={narrative.title}>
                                                    {narrative.title}
                                                    {narrative.subtitle && (
                                                        <div className="text-xs text-neutral-400 truncate font-normal mt-0.5">
                                                            {narrative.subtitle}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary-50 text-primary-600 border border-primary-100 w-fit">
                                                            {narrative.attach_type}
                                                        </span>
                                                        <span className="text-xs text-neutral-400 truncate max-w-[120px]">
                                                            {narrative.attach_id}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <Badge status={getNarrativeStatusBadge(narrative.status)} className="text-[11px] uppercase tracking-wider">
                                                        {narrative.status.replace("_", " ")}
                                                    </Badge>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${getAudioChipColor(narrative.audio_status)}`}>
                                                        <Volume2 className="w-3 h-3 shrink-0" />
                                                        {getAudioChipLabel(narrative.audio_status)}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-sm text-neutral-500 whitespace-nowrap text-center">
                                                    {narrative.created_at
                                                        ? new Date(narrative.created_at).toLocaleDateString()
                                                        : "—"}
                                                </td>
                                                <td className="py-4 px-6 text-right relative">
                                                    <div className="flex items-center justify-end">
                                                        <div className="relative">
                                                            <Button
                                                                variant="ghost"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    const spaceBelow = window.innerHeight - rect.bottom;
                                                                    setDropdownPosition(spaceBelow < 200 ? "top" : "bottom");
                                                                    setOpenDropdownId(
                                                                        openDropdownId === narrative.id ? null : narrative.id
                                                                    );
                                                                }}
                                                                className={`p-2 h-9 w-9 border border-transparent rounded-lg flex items-center justify-center transition-colors
                                                                    ${openDropdownId === narrative.id
                                                                        ? "bg-neutral-100 text-neutral-900"
                                                                        : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
                                                                    }`}
                                                            >
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>

                                                            {openDropdownId === narrative.id && (
                                                                <div
                                                                    className={`absolute right-0 w-52 bg-white border border-neutral-200 rounded-xl shadow-xl z-[100] py-1.5 animate-fade-in ${
                                                                        dropdownPosition === "top"
                                                                            ? "bottom-full mb-1.5"
                                                                            : "top-full mt-1.5"
                                                                    }`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <button
                                                                        onClick={() => {
                                                                            navigate(`/creator/narratives/view/${narrative.id}`);
                                                                            setOpenDropdownId(null);
                                                                        }}
                                                                        className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 font-medium"
                                                                    >
                                                                        View Details
                                                                    </button>
                                                                    {isSubmittable && (
                                                                        <button
                                                                            onClick={() => {
                                                                                handleSubmitForReview(narrative.id);
                                                                                setOpenDropdownId(null);
                                                                            }}
                                                                            className="w-full text-left px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2 font-medium"
                                                                        >
                                                                            Submit for Review
                                                                        </button>
                                                                    )}
                                                                    {isEditable && (
                                                                        <button
                                                                            onClick={() => {
                                                                                handleEditClick(narrative);
                                                                                setOpenDropdownId(null);
                                                                            }}
                                                                            className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 font-medium"
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                    )}
                                                                    {isDeletable && (
                                                                        <button
                                                                            onClick={() => {
                                                                                handleDeleteClick(narrative.id);
                                                                                setOpenDropdownId(null);
                                                                            }}
                                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                                                        >
                                                                            Delete Narrative
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
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

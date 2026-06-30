import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MoreVertical, AlertTriangle, Volume2, Link2, BookOpen } from "lucide-react";
import { Card, Button, Input, Badge, EmptyState, ErrorState, SkeletonTableRows, StatusFilterPills, SearchBar } from "@components/ui";
import type { BadgeStatus } from "@components/ui";
import { narrativeService } from "@services/narrative.service";
import { markerService } from "@services/marker.service";
import { useAuthStore } from "@store/auth.store";
import { NarrativeFormModal } from "../components/NarrativeFormModal";
import { ChainGroupRows } from "../components/ChainGroupRows";
import type { Narrative, NarrativeStatus } from "@/types";
import { toast } from "sonner";

type StatusFilter = NarrativeStatus | "all";

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Under Review", value: "under_review" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "Archived", value: "archived" },
];

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

// ─── Chain grouping ───────────────────────────────────────────────────────────

interface ChainGroup {
    chain_id: string;
    /** Label derived from the first member's title (sorted by sequence_order). */
    label: string;
    members: Narrative[];
}

/**
 * Splits a flat narrative list into multi-member chains and loose rows.
 * Chains with only one visible member on the current page are demoted to loose
 * so they don't create a misleading "Chain of 1" header.
 */
function groupByChain(narratives: Narrative[]): {
    chains: ChainGroup[];
    loose: Narrative[];
} {
    const byChain = new Map<string, Narrative[]>();
    const loose: Narrative[] = [];

    for (const n of narratives) {
        if (n.chain_id) {
            const arr = byChain.get(n.chain_id) ?? [];
            arr.push(n);
            byChain.set(n.chain_id, arr);
        } else {
            loose.push(n);
        }
    }

    const chains: ChainGroup[] = [];
    for (const [chain_id, members] of byChain.entries()) {
        if (members.length > 1) {
            members.sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
            chains.push({
                chain_id,
                label: members[0]?.title ?? "Untitled Chain",
                members,
            });
        } else {
            // Lone chain member on this filtered page → render as a loose row
            loose.push(...members);
        }
    }

    return { chains, loose };
}

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

    // Debounce search (fires automatically while typing)
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Explicit submit bypasses debounce and fires immediately
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setDebouncedSearch(search);
    };

    // Close dropdown on outside click
    React.useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    const { data, isLoading, isError, refetch } = useQuery({
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

    const { data: allMarkersData } = useQuery({
        queryKey: ["creator-markers-all"],
        queryFn: () => markerService.listMarkers({ mine: true, page_size: 200 }),
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });
    const markerTitleMap = React.useMemo(() => {
        const map = new Map<string, string>();
        for (const m of (allMarkersData?.items ?? [])) {
            map.set(m.id, m.title);
        }
        return map;
    }, [allMarkersData]);

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
                <Button
                    variant="accent"
                    onClick={() => { setEditTarget(null); setIsModalOpen(true); }}
                    className="w-full sm:w-auto"
                >
                    Create New Narrative
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

            {/* Filters + Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <StatusFilterPills
                    filters={STATUS_TABS}
                    active={activeTab}
                    onChange={setActiveTab}
                />
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    onSubmit={handleSearch}
                    placeholder="Search narratives…"
                />
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm flex flex-col">
                {/* Table */}
                <div className="p-0 relative">
                    <div className="w-full overflow-y-auto overflow-x-auto max-h-[60vh] min-h-[300px]">
                        <table className="w-full text-left border-collapse min-w-[900px] table-fixed">
                            <thead className="sticky top-0 z-20 bg-neutral-50 shadow-sm outline outline-1 outline-neutral-200">
                                <tr className="border-b border-neutral-200">
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[36%]">Title</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[16%]">Attach</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[12%] text-center">Status</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[12%] text-center">Audio</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[10%] text-center">Created</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[14%] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {isLoading ? (
                                    <SkeletonTableRows columns={6} />
                                ) : isError ? (
                                    <tr>
                                        <td colSpan={6} className="p-0">
                                            <ErrorState
                                                message="We couldn't load your narratives."
                                                onRetry={() => refetch()}
                                            />
                                        </td>
                                    </tr>
                                ) : narratives.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-0">
                                            <EmptyState
                                                icon={<BookOpen className="w-7 h-7" />}
                                                title="No narratives found"
                                                description={
                                                    activeTab === "all" && !debouncedSearch
                                                        ? "Write your first narrative to add story and audio to your markers and quests."
                                                        : "No narratives match your current filter or search."
                                                }
                                                action={
                                                    activeTab === "all" && !debouncedSearch ? (
                                                        <Button
                                                            variant="accent"
                                                            onClick={() => { setEditTarget(null); setIsModalOpen(true); }}
                                                        >
                                                            Create New Narrative
                                                        </Button>
                                                    ) : undefined
                                                }
                                            />
                                        </td>
                                    </tr>
                                ) : (() => {
                                    const { chains, loose } = groupByChain(narratives);

                                    // Shared dropdown toggle handler (used by both loose rows and ChainGroupRows)
                                    const handleDropdownToggle = (
                                        id: string,
                                        e: React.MouseEvent<HTMLButtonElement>
                                    ) => {
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const spaceBelow = window.innerHeight - rect.bottom;
                                        setDropdownPosition(spaceBelow < 200 ? "top" : "bottom");
                                        setOpenDropdownId(openDropdownId === id ? null : id);
                                    };

                                    return (
                                        <>
                                            {/* Chain groups first */}
                                            {chains.map((group) => (
                                                <ChainGroupRows
                                                    key={`chain-${group.chain_id}`}
                                                    chainId={group.chain_id}
                                                    label={group.label}
                                                    members={group.members}
                                                    openDropdownId={openDropdownId}
                                                    dropdownPosition={dropdownPosition}
                                                    onDropdownToggle={handleDropdownToggle}
                                                    markerTitleMap={markerTitleMap}
                                                    onView={(id) => {
                                                        navigate(`/creator/narratives/view/${id}`);
                                                        setOpenDropdownId(null);
                                                    }}
                                                    onEdit={(n) => {
                                                        handleEditClick(n);
                                                        setOpenDropdownId(null);
                                                    }}
                                                    onDelete={(id) => {
                                                        handleDeleteClick(id);
                                                        setOpenDropdownId(null);
                                                    }}
                                                    onSubmit={(id) => {
                                                        handleSubmitForReview(id);
                                                        setOpenDropdownId(null);
                                                    }}
                                                />
                                            ))}

                                            {/* Loose rows (unchained, or lone chain members) */}
                                            {loose.map((narrative) => {
                                                const isEditable    = CREATOR_EDITABLE.includes(narrative.status);
                                                const isDeletable   = CREATOR_DELETABLE.includes(narrative.status);
                                                const isSubmittable = narrative.status === "draft";

                                                return (
                                                    <tr
                                                        key={narrative.id}
                                                        className="hover:bg-neutral-50/50 transition-colors group"
                                                    >
                                                        {/* Title — chain-link icon for lone chain members */}
                                                        <td className="py-4 px-6 font-medium text-neutral-900 truncate max-w-[280px]" title={narrative.title}>
                                                            <div className="flex items-center gap-1.5">
                                                                {narrative.chain_id && (
                                                                    <span
                                                                        title="Part of a chain (only member visible on this page)"
                                                                        className="shrink-0"
                                                                    >
                                                                        <Link2 className="h-3.5 w-3.5 text-neutral-400" />
                                                                    </span>
                                                                )}
                                                                <span className="truncate">{narrative.title}</span>
                                                            </div>
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
                                                                <span className="text-xs text-neutral-600 truncate max-w-[140px]" title={markerTitleMap.get(narrative.attach_id) ?? narrative.attach_id}>
                                                                    {markerTitleMap.get(narrative.attach_id) ?? narrative.attach_id}
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
                                                                        onClick={(e) => handleDropdownToggle(narrative.id, e)}
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
                                            })}
                                        </>
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

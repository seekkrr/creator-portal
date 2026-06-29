import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MoreVertical, AlertTriangle, Search, Plus } from "lucide-react";
import { Card, Button, Input } from "@components/ui";
import { markerService } from "@services/marker.service";
import { useAuthStore } from "@store/auth.store";
import type { MarkerStatus } from "@/types";
import type { Marker } from "@/types";
import { toast } from "sonner";
import { MarkerFormModal } from "../components/MarkerFormModal";

type StatusFilter = MarkerStatus | "all";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Approved", value: "approved" },
    { label: "Pending", value: "pending" },
    { label: "Rejected", value: "rejected" },
    { label: "Hidden", value: "hidden" },
];

const getStatusColor = (status: MarkerStatus): string => {
    switch (status) {
        case "approved": return "bg-emerald-100 text-emerald-700 border border-emerald-200";
        case "pending": return "bg-amber-100 text-amber-700 border border-amber-200";
        case "rejected": return "bg-red-100 text-red-700 border border-red-200";
        case "hidden": return "bg-neutral-100 text-neutral-500 border border-neutral-200";
        default: return "bg-slate-100 text-slate-700 border border-slate-200";
    }
};

export function MarkersPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");

    // Create / edit modal
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingMarker, setEditingMarker] = useState<Marker | undefined>(undefined);

    // Delete modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [markerToDelete, setMarkerToDelete] = useState<string | null>(null);

    // Row dropdown
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");

    // Close dropdown on outside click
    React.useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ["creator-markers", { status: statusFilter, search }],
        queryFn: () =>
            markerService.listMarkers({
                mine: true,
                status: statusFilter !== "all" ? statusFilter : undefined,
                search: search || undefined,
            }),
        enabled: !!user,
    });

    const markers = data?.items ?? [];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
    };

    const openCreateModal = () => {
        setEditingMarker(undefined);
        setIsFormModalOpen(true);
    };

    const openEditModal = (marker: Marker) => {
        setEditingMarker(marker);
        setIsFormModalOpen(true);
    };

    const handleSaved = () => {
        queryClient.invalidateQueries({ queryKey: ["creator-markers"] });
        setIsFormModalOpen(false);
    };

    const handleDeleteRequest = (markerId: string) => {
        setMarkerToDelete(markerId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!markerToDelete || confirmText !== "CONFIRM") return;

        const promise = markerService.deleteMarker(markerToDelete);
        toast.promise(promise, {
            loading: "Deleting marker…",
            success: "Marker deleted",
            error: "Failed to delete marker",
        });

        try {
            await promise;
            await queryClient.invalidateQueries({ queryKey: ["creator-markers"] });
        } catch {
            // error handled by toast
        } finally {
            setIsDeleteModalOpen(false);
            setMarkerToDelete(null);
            setConfirmText("");
        }
    };

    return (
        <div className="animate-fade-in space-y-4 w-full max-w-6xl mx-auto pb-6 px-4 sm:px-6 lg:px-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Markers</h1>
                    <p className="text-slate-500 mt-1">Manage your place markers</p>
                </div>
                <Button
                    onClick={openCreateModal}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                    leftIcon={<Plus className="w-4 h-4" />}
                >
                    Create New Marker
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
                                <h3 className="text-xl font-bold">Delete Marker?</h3>
                            </div>
                            <p className="text-slate-600 mb-6">
                                This action cannot be undone. To confirm, type{" "}
                                <span className="font-bold text-slate-900 select-none">CONFIRM</span> below.
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
                                            setMarkerToDelete(null);
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

            {/* Form Modal */}
            <MarkerFormModal
                open={isFormModalOpen}
                mode={editingMarker ? "edit" : "create"}
                initial={editingMarker}
                onClose={() => setIsFormModalOpen(false)}
                onSaved={handleSaved}
            />

            {/* Filters + Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-1 flex-wrap">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                                ${statusFilter === f.value
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <form onSubmit={handleSearch} className="flex gap-2 sm:ml-auto w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none sm:w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search markers…"
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                        />
                    </div>
                    <Button type="submit" variant="outline" size="sm">
                        Search
                    </Button>
                </form>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-full overflow-y-auto overflow-x-auto max-h-[60vh] min-h-[300px]">
                    <table className="w-full text-left border-collapse min-w-[700px] table-fixed">
                        <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                            <tr className="border-b border-slate-200">
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[35%]">
                                    Title
                                </th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%]">
                                    Category
                                </th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%] text-center">
                                    Status
                                </th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%] text-center">
                                    Created
                                </th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%] text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-500">
                                        Loading markers…
                                    </td>
                                </tr>
                            ) : markers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <div className="text-slate-400 mb-2">No markers found</div>
                                        <Button
                                            variant="outline"
                                            className="mt-4 border-dashed border-2"
                                            onClick={openCreateModal}
                                        >
                                            Create Your First Marker
                                        </Button>
                                    </td>
                                </tr>
                            ) : (
                                markers.map((marker) => {
                                    const title = marker.title || "Untitled Marker";
                                    return (
                                        <tr
                                            key={marker.id}
                                            className="hover:bg-slate-50/50 transition-colors"
                                        >
                                            <td
                                                className="py-4 px-6 font-medium text-slate-900 truncate max-w-[200px]"
                                                title={title}
                                            >
                                                {title}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-slate-500 truncate">
                                                {marker.category ?? "—"}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${getStatusColor(marker.status)}`}
                                                >
                                                    {marker.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-slate-500 whitespace-nowrap text-center">
                                                {marker.created_at
                                                    ? new Date(marker.created_at).toLocaleDateString()
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
                                                                    openDropdownId === marker.id ? null : marker.id
                                                                );
                                                            }}
                                                            className={`p-2 h-9 w-9 border border-transparent rounded-lg flex items-center justify-center transition-colors
                                                                ${openDropdownId === marker.id
                                                                    ? "bg-neutral-100 text-neutral-900"
                                                                    : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
                                                                }`}
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>

                                                        {openDropdownId === marker.id && (
                                                            <div
                                                                className={`absolute right-0 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl z-[100] py-1.5 animate-fade-in ${dropdownPosition === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <button
                                                                    onClick={() => {
                                                                        navigate(`/creator/markers/view/${marker.id}`);
                                                                        setOpenDropdownId(null);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                                                >
                                                                    View Details
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        openEditModal(marker);
                                                                        setOpenDropdownId(null);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-medium"
                                                                >
                                                                    Edit Marker
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        handleDeleteRequest(marker.id);
                                                                        setOpenDropdownId(null);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                                                >
                                                                    Delete Marker
                                                                </button>
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
    );
}

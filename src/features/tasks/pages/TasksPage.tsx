import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, MoreVertical, Plus, Eye, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, Button, Input } from "@components/ui";
import { taskService } from "@services/task.service";
import type { TaskType } from "@/types";
import { toast } from "sonner";
import { TaskFormModal } from "../components/TaskFormModal";
import type { TaskConfig } from "@/types";
import { TASK_TYPES, TASK_TYPE_LABELS } from "../schemas/task.schema";

const TYPE_BADGE_COLORS: Record<TaskType, string> = {
    photo_challenge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    qr_scan: "bg-amber-100 text-amber-700 border border-amber-200",
    quiz: "bg-primary-100 text-primary-700 border border-primary-200",
    collection: "bg-primary-100 text-primary-700 border border-primary-200",
    social: "bg-pink-100 text-pink-700 border border-pink-200",
    checkin: "bg-neutral-100 text-neutral-700 border border-neutral-200",
};

export function TasksPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [typeFilter, setTypeFilter] = useState<TaskType | "">("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editTask, setEditTask] = useState<TaskConfig | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");

    React.useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ["creator-tasks", { task_type: typeFilter }],
        queryFn: () =>
            taskService.listTaskConfigs({ mine: true, task_type: typeFilter || undefined }),
    });

    const toggleActiveMutation = useMutation({
        mutationFn: (taskId: string) => taskService.toggleActive(taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["creator-tasks"] });
        },
    });

    const handleToggleActive = (taskId: string) => {
        const promise = toggleActiveMutation.mutateAsync(taskId);
        toast.promise(promise, {
            loading: "Updating status...",
            success: "Task status updated",
            error: "Failed to update status",
        });
    };

    const handleDelete = (taskId: string) => {
        setTaskToDelete(taskId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!taskToDelete || confirmText !== "CONFIRM") return;
        const promise = taskService.deleteTaskConfig(taskToDelete);
        toast.promise(promise, {
            loading: "Deleting task...",
            success: "Task deleted",
            error: "Failed to delete task",
        });
        try {
            await promise;
            await queryClient.invalidateQueries({ queryKey: ["creator-tasks"] });
        } catch {
            // toast.promise handles error display
        } finally {
            setIsDeleteModalOpen(false);
            setTaskToDelete(null);
            setConfirmText("");
        }
    };

    const tasks = data?.items ?? [];

    return (
        <div className="animate-fade-in space-y-4 w-full max-w-6xl mx-auto pb-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary-900 tracking-tight">My Tasks</h1>
                    <p className="text-neutral-500 mt-1">Manage your task configurations</p>
                </div>
                <Button
                    variant="accent"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full sm:w-auto"
                    leftIcon={<Plus className="w-4 h-4" />}
                >
                    Create New Task
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
                                <h3 className="text-xl font-bold">Delete Task?</h3>
                            </div>
                            <p className="text-neutral-600 mb-6">
                                This action will delete your task. To confirm, please type{" "}
                                <span className="font-bold text-neutral-900 select-none">CONFIRM</span> below.
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
                                            setTaskToDelete(null);
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

            {/* Create / Edit Modal */}
            <TaskFormModal
                open={isCreateModalOpen}
                mode="create"
                onClose={() => setIsCreateModalOpen(false)}
                onSaved={() => setIsCreateModalOpen(false)}
            />
            {editTask !== undefined && editTask !== null && (
                <TaskFormModal
                    open
                    mode="edit"
                    initial={editTask}
                    onClose={() => setEditTask(null)}
                    onSaved={() => setEditTask(null)}
                />
            )}

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm flex flex-col">
                {/* Type Filter */}
                <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 border-b border-neutral-200">
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider shrink-0">Type:</span>
                    <button
                        onClick={() => setTypeFilter("")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap
                            ${typeFilter === "" ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
                    >
                        All
                    </button>
                    {TASK_TYPES.map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap
                                ${typeFilter === t ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
                        >
                            {TASK_TYPE_LABELS[t]}
                        </button>
                    ))}
                </div>

                <div className="p-0 relative">
                    <div className="w-full overflow-y-auto overflow-x-auto max-h-[60vh] min-h-[300px]">
                        <table className="w-full text-left border-collapse min-w-[900px] table-fixed">
                            <thead className="sticky top-0 z-20 bg-neutral-50 shadow-sm outline outline-1 outline-neutral-200">
                                <tr className="border-b border-neutral-200">
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[28%]">Title</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[14%] text-center">Type</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[18%]">Marker</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[10%] text-center">Points</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[10%] text-center">Active</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[10%] text-center">Created</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[10%] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-neutral-500">
                                            Loading tasks...
                                        </td>
                                    </tr>
                                ) : tasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center">
                                            <div className="text-neutral-400 mb-2">No tasks found</div>
                                            <Button
                                                variant="outline"
                                                className="mt-4 border-dashed border-2"
                                                onClick={() => setIsCreateModalOpen(true)}
                                            >
                                                Create Your First Task
                                            </Button>
                                        </td>
                                    </tr>
                                ) : (
                                    tasks.map((task) => (
                                        <tr key={task.id} className="hover:bg-neutral-50/50 transition-colors group">
                                            <td className="py-4 px-6 font-medium text-neutral-900 truncate max-w-[200px]" title={task.title}>
                                                {task.title}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${TYPE_BADGE_COLORS[task.task_type]}`}>
                                                    {TASK_TYPE_LABELS[task.task_type]}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-neutral-500 truncate max-w-[140px]" title={task.marker_id}>
                                                {task.marker_id.slice(-8)}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-neutral-700 font-semibold text-center">
                                                {task.base_points}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button
                                                    onClick={() => handleToggleActive(task.id)}
                                                    className={`inline-flex items-center transition-colors ${task.is_active ? "text-emerald-600 hover:text-emerald-700" : "text-neutral-400 hover:text-neutral-600"}`}
                                                    title={task.is_active ? "Click to deactivate" : "Click to activate"}
                                                >
                                                    {task.is_active
                                                        ? <ToggleRight className="w-5 h-5" />
                                                        : <ToggleLeft className="w-5 h-5" />
                                                    }
                                                </button>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-neutral-500 whitespace-nowrap text-center">
                                                {task.created_at ? new Date(task.created_at).toLocaleDateString() : "—"}
                                            </td>
                                            <td className="py-4 px-6 text-right relative">
                                                <div className="flex items-center justify-end">
                                                    <div className="relative">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                const spaceBelow = window.innerHeight - rect.bottom;
                                                                setDropdownPosition(spaceBelow < 200 ? "top" : "bottom");
                                                                setOpenDropdownId(openDropdownId === task.id ? null : task.id);
                                                            }}
                                                            className={`p-2 h-9 w-9 border border-transparent rounded-lg flex items-center justify-center transition-colors
                                                                ${openDropdownId === task.id ? "bg-neutral-100 text-neutral-900" : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"}`}
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                        {openDropdownId === task.id && (
                                                            <div
                                                                className={`absolute right-0 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl z-[100] py-1.5 animate-fade-in ${dropdownPosition === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <button
                                                                    onClick={() => { navigate(`/creator/tasks/view/${task.id}`); setOpenDropdownId(null); }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 font-medium"
                                                                >
                                                                    <Eye className="w-4 h-4" /> View Details
                                                                </button>
                                                                <button
                                                                    onClick={() => { setEditTask(task); setOpenDropdownId(null); }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 font-medium"
                                                                >
                                                                    <Edit2 className="w-4 h-4" /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => { handleDelete(task.id); setOpenDropdownId(null); }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                                                >
                                                                    <Trash2 className="w-4 h-4" /> Delete
                                                                </button>
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
        </div>
    );
}

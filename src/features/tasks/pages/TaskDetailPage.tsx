import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle, Edit2, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, Button, Badge } from "@components/ui";
import { taskService } from "@services/task.service";
import { toast } from "sonner";
import { TaskFormModal } from "../components/TaskFormModal";
import type { TaskType } from "@/types";
import { TASK_TYPE_LABELS } from "../schemas/task.schema";

const TYPE_BADGE_VARIANT: Record<TaskType, "primary" | "success" | "warning" | "info" | "default" | "danger"> = {
    photo_challenge: "success",
    qr_scan: "warning",
    quiz: "primary",
    collection: "info",
    social: "danger",
    checkin: "default",
};

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-start py-3 border-b border-slate-100 last:border-0 gap-4">
            <span className="text-sm text-slate-500 font-medium shrink-0">{label}</span>
            <span className="text-sm text-slate-800 font-semibold text-right break-all">{value}</span>
        </div>
    );
}

export function TaskDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isEditOpen, setIsEditOpen] = useState(false);

    const {
        data: task,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["task", id],
        queryFn: () => {
            if (!id) throw new Error("No task id");
            return taskService.getTaskConfig(id);
        },
        enabled: !!id,
    });

    const toggleActiveMutation = useMutation({
        mutationFn: () => {
            if (!id) throw new Error("No task id");
            return taskService.toggleActive(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["task", id] });
            queryClient.invalidateQueries({ queryKey: ["creator-tasks"] });
        },
    });

    const handleToggleActive = () => {
        const promise = toggleActiveMutation.mutateAsync();
        toast.promise(promise, {
            loading: "Updating status...",
            success: "Task status updated",
            error: "Failed to update status",
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                <p className="text-slate-500 font-medium">Loading task details...</p>
            </div>
        );
    }

    if (error || !task) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="p-4 bg-red-50 rounded-full">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Task Not Found</h3>
                    <p className="text-slate-500 max-w-xs">
                        The task you're looking for might have been deleted or moved.
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate("/creator/tasks")}>
                    Back to My Tasks
                </Button>
            </div>
        );
    }

    // Type-specific config rendering
    const renderTypeConfig = () => {
        switch (task.task_type) {
            case "quiz": {
                if (!task.quiz_data) return null;
                const qd = task.quiz_data as Record<string, unknown>;
                const question = typeof qd["question"] === "string" ? qd["question"] : "—";
                const options = Array.isArray(qd["options"]) ? (qd["options"] as string[]) : [];
                const correctAnswer = typeof qd["correct_answer"] === "string" ? qd["correct_answer"] : "";
                return (
                    <Card className="rounded-2xl border-slate-200 shadow-sm" padding="md">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Quiz Details</h3>
                        <div className="space-y-3">
                            <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question</span>
                                <p className="text-slate-800 font-medium mt-1">{question}</p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Options</span>
                                <ul className="mt-2 space-y-1.5">
                                    {options.map((opt, i) => (
                                        <li key={i} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg
                                            ${opt === correctAnswer
                                                ? "bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200"
                                                : "bg-slate-50 text-slate-700 border border-slate-100"
                                            }`}
                                        >
                                            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                                                ${opt === correctAnswer ? "border-emerald-600 bg-emerald-600" : "border-slate-300"}`}
                                            >
                                                {opt === correctAnswer && <span className="w-2 h-2 rounded-full bg-white block" />}
                                            </span>
                                            {opt}
                                            {opt === correctAnswer && (
                                                <span className="ml-auto text-xs font-bold text-emerald-600">Correct</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Card>
                );
            }
            case "qr_scan": {
                if (!task.qr_data) return null;
                const qr = task.qr_data as Record<string, unknown>;
                const expected = typeof qr["expected_value"] === "string" ? qr["expected_value"] : "—";
                return (
                    <Card className="rounded-2xl border-slate-200 shadow-sm" padding="md">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">QR Scan Details</h3>
                        <DetailRow label="Expected Value" value={expected} />
                    </Card>
                );
            }
            case "photo_challenge": {
                if (!task.photo_requirements) return null;
                const pr = task.photo_requirements as Record<string, unknown>;
                const prompt = typeof pr["prompt"] === "string" ? pr["prompt"] : "—";
                return (
                    <Card className="rounded-2xl border-slate-200 shadow-sm" padding="md">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Photo Challenge Details</h3>
                        <DetailRow label="Prompt" value={prompt} />
                    </Card>
                );
            }
            case "collection": {
                if (!task.collection_items || task.collection_items.length === 0) return null;
                return (
                    <Card className="rounded-2xl border-slate-200 shadow-sm" padding="md">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Collection Items</h3>
                        <ul className="space-y-1.5">
                            {task.collection_items.map((item, i) => (
                                <li key={i} className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                    {String(item)}
                                </li>
                            ))}
                        </ul>
                    </Card>
                );
            }
            case "social": {
                if (!task.social_task) return null;
                const st = task.social_task as Record<string, unknown>;
                const platform = typeof st["platform"] === "string" ? st["platform"] : "—";
                const action = typeof st["action"] === "string" ? st["action"] : "—";
                return (
                    <Card className="rounded-2xl border-slate-200 shadow-sm" padding="md">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Social Task Details</h3>
                        <div className="space-y-0">
                            <DetailRow label="Platform" value={platform} />
                            <DetailRow label="Action" value={action} />
                        </div>
                    </Card>
                );
            }
            default:
                return null;
        }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-[900px] mx-auto space-y-6 animate-fade-in pb-12">
            {/* Edit modal */}
            {isEditOpen && (
                <TaskFormModal
                    open
                    mode="edit"
                    initial={task}
                    onClose={() => setIsEditOpen(false)}
                    onSaved={() => {
                        setIsEditOpen(false);
                        queryClient.invalidateQueries({ queryKey: ["task", id] });
                    }}
                />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate("/creator/tasks")}
                        className="rounded-full w-10 h-10 p-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                            {task.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant={TYPE_BADGE_VARIANT[task.task_type]}>
                                {TASK_TYPE_LABELS[task.task_type]}
                            </Badge>
                            <span className="text-sm text-slate-400 font-medium">ID: {task.id.slice(-8)}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 pt-4 md:pt-0 border-t border-slate-100 md:border-0 mt-2 md:mt-0">
                    <button
                        onClick={handleToggleActive}
                        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors
                            ${task.is_active
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                                : "text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100"
                            }`}
                        title={task.is_active ? "Click to deactivate" : "Click to activate"}
                    >
                        {task.is_active
                            ? <ToggleRight className="w-4 h-4" />
                            : <ToggleLeft className="w-4 h-4" />
                        }
                        {task.is_active ? "Active" : "Inactive"}
                    </button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsEditOpen(true)}
                        leftIcon={<Edit2 className="w-4 h-4" />}
                    >
                        Edit
                    </Button>
                </div>
            </div>

            {/* Core Details */}
            <Card className="rounded-2xl border-slate-200 shadow-sm" padding="md">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Task Details</h3>
                <div className="space-y-0">
                    <DetailRow label="Type" value={TASK_TYPE_LABELS[task.task_type]} />
                    <DetailRow label="Marker ID" value={task.marker_id} />
                    {task.quest_id && <DetailRow label="Quest ID" value={task.quest_id} />}
                    <DetailRow label="Base Points" value={String(task.base_points)} />
                    <DetailRow label="Status" value={task.is_active ? "Active" : "Inactive"} />
                    {task.created_at && (
                        <DetailRow
                            label="Created"
                            value={new Date(task.created_at).toLocaleDateString("en-IN", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            })}
                        />
                    )}
                    {task.updated_at && (
                        <DetailRow
                            label="Updated"
                            value={new Date(task.updated_at).toLocaleDateString("en-IN", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            })}
                        />
                    )}
                </div>
            </Card>

            {/* Description */}
            {task.description && (
                <Card className="rounded-2xl border-slate-200 shadow-sm" padding="md">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Description</h3>
                    <p className="text-slate-700 text-sm leading-relaxed">{task.description}</p>
                </Card>
            )}

            {/* Type-specific config */}
            {renderTypeConfig()}
        </div>
    );
}

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Card, Button, Input, Textarea } from "@components/ui";
import { taskService } from "@services/task.service";
import { taskFormSchema, toCreatePayload, toUpdatePayload, TASK_TYPES, TASK_TYPE_LABELS } from "../schemas/task.schema";
import type { TaskFormData } from "../schemas/task.schema";
import type { TaskConfig } from "@/types";
import { MarkerSelect } from "./MarkerSelect";
import { QuizFields } from "./task-type-fields/QuizFields";
import { QrFields } from "./task-type-fields/QrFields";
import { PhotoFields } from "./task-type-fields/PhotoFields";
import { CollectionFields } from "./task-type-fields/CollectionFields";
import { SocialFields } from "./task-type-fields/SocialFields";

interface TaskFormModalProps {
    open: boolean;
    mode: "create" | "edit";
    initial?: TaskConfig;
    onClose: () => void;
    onSaved: () => void;
}

function buildDefaultValues(initial?: TaskConfig): Partial<TaskFormData> {
    if (!initial) {
        return {
            task_type: "checkin",
            title: "",
            description: "",
            marker_id: "",
            quest_id: "",
            base_points: 0,
            is_active: true,
        };
    }

    const base: Partial<TaskFormData> = {
        task_type: initial.task_type,
        title: initial.title,
        description: initial.description ?? "",
        marker_id: initial.marker_id,
        quest_id: initial.quest_id ?? "",
        base_points: initial.base_points,
        is_active: initial.is_active,
    };

    if (initial.task_type === "quiz" && initial.quiz_data) {
        const qd = initial.quiz_data as Record<string, unknown>;
        base.quiz_data = {
            question: typeof qd["question"] === "string" ? qd["question"] : "",
            options: Array.isArray(qd["options"]) ? (qd["options"] as string[]) : [],
            correct_answer: typeof qd["correct_answer"] === "string" ? qd["correct_answer"] : "",
        };
    }
    if (initial.task_type === "qr_scan" && initial.qr_data) {
        const qr = initial.qr_data as Record<string, unknown>;
        base.qr_data = {
            expected_value: typeof qr["expected_value"] === "string" ? qr["expected_value"] : "",
        };
    }
    if (initial.task_type === "photo_challenge" && initial.photo_requirements) {
        base.photo_requirements = initial.photo_requirements;
    }
    if (initial.task_type === "collection" && initial.collection_items) {
        base.collection_items = initial.collection_items;
    }
    if (initial.task_type === "social" && initial.social_task) {
        base.social_task = initial.social_task;
    }

    return base;
}

export function TaskFormModal({ open, mode, initial, onClose, onSaved }: TaskFormModalProps) {
    const queryClient = useQueryClient();
    const isEdit = mode === "edit";

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<TaskFormData>({
        resolver: zodResolver(taskFormSchema),
        defaultValues: buildDefaultValues(initial) as TaskFormData,
    });

    const taskType = watch("task_type");

    React.useEffect(() => {
        if (open) {
            reset(buildDefaultValues(initial) as TaskFormData);
        }
    }, [open, initial, reset]);

    const createMutation = useMutation({
        mutationFn: (data: TaskFormData) => taskService.createTaskConfig(toCreatePayload(data)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["creator-tasks"] });
            onSaved();
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: TaskFormData) => {
            if (!initial) throw new Error("No task to update");
            return taskService.updateTaskConfig(initial.id, toUpdatePayload(data));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["creator-tasks"] });
            if (initial) {
                queryClient.invalidateQueries({ queryKey: ["task", initial.id] });
            }
            onSaved();
        },
    });

    const onSubmit = (data: TaskFormData) => {
        const mutation = isEdit ? updateMutation : createMutation;
        const promise = mutation.mutateAsync(data);
        toast.promise(promise, {
            loading: isEdit ? "Updating task..." : "Creating task...",
            success: isEdit ? "Task updated!" : "Task created!",
            error: (err: unknown) => {
                if (err instanceof Error) return err.message;
                return isEdit ? "Failed to update task" : "Failed to create task";
            },
        });
    };

    if (!open) return null;

    const markerIdError = errors.marker_id?.message;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-xl shadow-2xl border-slate-200 overflow-hidden animate-scale-up max-h-[90vh] flex flex-col" padding="none">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900">
                        {isEdit ? "Edit Task" : "Create New Task"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
                    <div className="px-6 py-5 space-y-4">
                        {/* Task Type */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                Task Type
                            </label>
                            <select
                                {...register("task_type")}
                                disabled={isEdit}
                                className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                            >
                                {TASK_TYPES.map((t) => (
                                    <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>
                                ))}
                            </select>
                            {errors.task_type && (
                                <p className="mt-1.5 text-sm text-red-600">{errors.task_type.message}</p>
                            )}
                        </div>

                        {/* Marker Select */}
                        <MarkerSelect
                            value={watch("marker_id")}
                            onChange={(id) => setValue("marker_id", id, { shouldValidate: true })}
                            disabled={isEdit}
                            error={markerIdError}
                        />

                        {/* Quest ID (optional) */}
                        <Input
                            label="Quest ID (optional)"
                            placeholder="Link to a quest..."
                            error={errors.quest_id?.message}
                            disabled={isEdit}
                            {...register("quest_id")}
                        />

                        {/* Title */}
                        <Input
                            label="Title"
                            placeholder="Enter task title..."
                            error={errors.title?.message}
                            {...register("title")}
                        />

                        {/* Description */}
                        <Textarea
                            label="Description (optional)"
                            placeholder="Describe the task..."
                            error={errors.description?.message}
                            className="min-h-[80px]"
                            {...register("description")}
                        />

                        {/* Base Points */}
                        <Input
                            label="Base Points"
                            type="number"
                            min={0}
                            placeholder="0"
                            error={errors.base_points?.message}
                            {...register("base_points", { valueAsNumber: true })}
                        />

                        {/* Is Active */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="is_active"
                                className="w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                                {...register("is_active")}
                            />
                            <label htmlFor="is_active" className="text-sm font-medium text-neutral-700">
                                Active
                            </label>
                        </div>

                        {/* Type-specific fields */}
                        {taskType === "quiz" && (
                            <QuizFields
                                register={register}
                                watch={watch}
                                setValue={setValue}
                                errors={errors}
                            />
                        )}
                        {taskType === "qr_scan" && (
                            <QrFields register={register} errors={errors} />
                        )}
                        {taskType === "photo_challenge" && (
                            <PhotoFields watch={watch} setValue={setValue} />
                        )}
                        {taskType === "collection" && (
                            <CollectionFields watch={watch} setValue={setValue} />
                        )}
                        {taskType === "social" && (
                            <SocialFields watch={watch} setValue={setValue} />
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            fullWidth
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            isLoading={isSubmitting || createMutation.isPending || updateMutation.isPending}
                        >
                            {isEdit ? "Save Changes" : "Create Task"}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

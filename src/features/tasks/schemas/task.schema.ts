import { z } from "zod";
import type { CreateTaskConfigPayload, UpdateTaskConfigPayload, TaskType } from "@/types";

export const TASK_TYPES = ["photo_challenge", "qr_scan", "quiz", "collection", "social", "checkin"] as const;

const quizData = z.object({
    question: z.string().min(1, "Question is required"),
    options: z.array(z.string().min(1)).min(2, "At least two options"),
    correct_answer: z.string().min(1, "Mark the correct answer"),
});

export const taskFormSchema = z.object({
    task_type: z.enum(TASK_TYPES),
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(2000).optional().or(z.literal("")),
    marker_id: z.string().min(1, "Select a marker"),
    quest_id: z.string().optional().or(z.literal("")),
    base_points: z.number().int().min(0).default(0),
    is_active: z.boolean().default(true),
    // type-specific (validated conditionally in superRefine)
    quiz_data: quizData.optional(),
    qr_data: z.object({ expected_value: z.string().min(1) }).optional(),
    photo_requirements: z.record(z.unknown()).optional(),
    collection_items: z.array(z.unknown()).optional(),
    social_task: z.record(z.unknown()).optional(),
}).superRefine((d, ctx) => {
    if (d.task_type === "quiz" && !d.quiz_data) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quiz_data"], message: "Quiz details are required" });
    }
    if (d.task_type === "qr_scan" && !d.qr_data) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["qr_data"], message: "QR expected value is required" });
    }
});

export type TaskFormData = z.infer<typeof taskFormSchema>;

const typeField: Record<TaskType, keyof TaskFormData | null> = {
    quiz: "quiz_data", qr_scan: "qr_data", photo_challenge: "photo_requirements",
    collection: "collection_items", social: "social_task", checkin: null,
};

export function toCreatePayload(d: TaskFormData): CreateTaskConfigPayload {
    const p: CreateTaskConfigPayload = {
        task_type: d.task_type, title: d.title, marker_id: d.marker_id,
        base_points: d.base_points, is_active: d.is_active,
    };
    if (d.description) p.description = d.description;
    if (d.quest_id) p.quest_id = d.quest_id;
    const f = typeField[d.task_type];
    if (f && d[f] !== undefined && d[f] !== null) (p as unknown as Record<string, unknown>)[f] = d[f];
    return p;
}

export function toUpdatePayload(d: TaskFormData): UpdateTaskConfigPayload {
    // task_type/marker_id/quest_id immutable on PUT.
    const p: UpdateTaskConfigPayload = {
        title: d.title, base_points: d.base_points, is_active: d.is_active,
    };
    if (d.description) p.description = d.description;
    const f = typeField[d.task_type];
    if (f && d[f] !== undefined && d[f] !== null) (p as unknown as Record<string, unknown>)[f] = d[f];
    return p;
}

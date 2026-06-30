import { z } from "zod";
import type { CreateNarrativePayload, UpdateNarrativePayload } from "@/types";

export const VOICE_PERSONAS = [
    "historian_warm",
    "mystery_whisper",
    "energetic_guide",
    "elder_storyteller",
    "custom",
] as const;

export const CUSTOM_VOICE_ID_RE = /^[A-Za-z0-9]{20}$/;

export const narrativeFormSchema = z
    .object({
        title: z.string().min(1, "Title is required").max(200),
        attach_type: z.enum(["marker", "quest"]),
        attach_id: z.string().min(1, "Choose what to attach this narrative to"),
        content: z.string().max(20000).optional().or(z.literal("")),
        subtitle: z.string().max(500).optional().or(z.literal("")),
        voice_persona: z.enum(VOICE_PERSONAS).optional(),
        custom_voice_id: z.string().optional().or(z.literal("")),
        media: z.array(z.string()).default([]),
        is_mandatory: z.boolean().default(false),
        is_unlocked: z.boolean().default(false),
        sequence_order: z.number().int().min(0).optional(),
    })
    .superRefine((d, ctx) => {
        if (d.voice_persona === "custom" && !CUSTOM_VOICE_ID_RE.test(d.custom_voice_id ?? "")) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["custom_voice_id"],
                message: "Enter a valid 20-character ElevenLabs voice ID",
            });
        }
    });

export type NarrativeFormData = z.infer<typeof narrativeFormSchema>;

export function toCreatePayload(
    d: NarrativeFormData,
    status: "draft" | "under_review" = "draft"
): CreateNarrativePayload {
    return {
        title: d.title,
        attach_type: d.attach_type,
        attach_id: d.attach_id,
        ...(d.content ? { content: d.content } : {}),
        ...(d.subtitle ? { subtitle: d.subtitle } : {}),
        ...(d.voice_persona ? { voice_persona: d.voice_persona } : {}),
        ...(d.voice_persona === "custom" && d.custom_voice_id
            ? { custom_voice_id: d.custom_voice_id }
            : {}),
        media: d.media,
        is_mandatory: d.is_mandatory,
        is_unlocked: d.is_unlocked,
        ...(d.sequence_order !== undefined && d.sequence_order !== null ? { sequence_order: d.sequence_order } : {}),
        status,
    };
}

export function toUpdatePayload(d: NarrativeFormData): UpdateNarrativePayload {
    // attach_type/attach_id/status are immutable on PUT.
    return {
        title: d.title,
        ...(d.content ? { content: d.content } : {}),
        ...(d.subtitle ? { subtitle: d.subtitle } : {}),
        ...(d.voice_persona ? { voice_persona: d.voice_persona } : {}),
        ...(d.voice_persona === "custom" && d.custom_voice_id
            ? { custom_voice_id: d.custom_voice_id }
            : {}),
        media: d.media,
        is_mandatory: d.is_mandatory,
        is_unlocked: d.is_unlocked,
        ...(d.sequence_order !== undefined && d.sequence_order !== null ? { sequence_order: d.sequence_order } : {}),
    };
}

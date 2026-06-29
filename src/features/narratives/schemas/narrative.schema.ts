import { z } from "zod";
import type { CreateNarrativePayload, UpdateNarrativePayload } from "@/types";

export const VOICE_PERSONAS = [
    "historian_warm",
    "mystery_whisper",
    "energetic_guide",
    "elder_storyteller",
] as const;

export const narrativeFormSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    attach_type: z.enum(["marker", "quest"]),
    attach_id: z.string().min(1, "Choose what to attach this narrative to"),
    content: z.string().max(20000).optional().or(z.literal("")),
    subtitle: z.string().max(500).optional().or(z.literal("")),
    voice_persona: z.enum(VOICE_PERSONAS).optional(),
    media: z.array(z.string()).default([]),
    is_mandatory: z.boolean().default(false),
    is_unlocked: z.boolean().default(false),
    sequence_order: z.number().int().min(0).optional(),
});

export type NarrativeFormData = z.infer<typeof narrativeFormSchema>;

export function toCreatePayload(d: NarrativeFormData): CreateNarrativePayload {
    return {
        title: d.title,
        attach_type: d.attach_type,
        attach_id: d.attach_id,
        ...(d.content ? { content: d.content } : {}),
        ...(d.subtitle ? { subtitle: d.subtitle } : {}),
        ...(d.voice_persona ? { voice_persona: d.voice_persona } : {}),
        media: d.media,
        is_mandatory: d.is_mandatory,
        is_unlocked: d.is_unlocked,
        ...(d.sequence_order !== undefined && d.sequence_order !== null ? { sequence_order: d.sequence_order } : {}),
        status: "draft",
    };
}

export function toUpdatePayload(d: NarrativeFormData): UpdateNarrativePayload {
    // attach_type/attach_id/status are immutable on PUT.
    return {
        title: d.title,
        ...(d.content ? { content: d.content } : {}),
        ...(d.subtitle ? { subtitle: d.subtitle } : {}),
        ...(d.voice_persona ? { voice_persona: d.voice_persona } : {}),
        media: d.media,
        is_mandatory: d.is_mandatory,
        is_unlocked: d.is_unlocked,
        ...(d.sequence_order !== undefined && d.sequence_order !== null ? { sequence_order: d.sequence_order } : {}),
    };
}

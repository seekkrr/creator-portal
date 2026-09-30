import { z } from "zod";
import type { CreateEventPayload, UpdateEventPayload } from "@/types";

/** Optional non-negative number; blank/NaN → undefined (see marker schema). */
const optionalCount = z.preprocess(
    (v) => (v === "" || v === null || (typeof v === "number" && Number.isNaN(v)) ? undefined : v),
    z.number().int().min(0).optional()
);

export const eventFormSchema = z
    .object({
        title: z.string().min(1, "Title is required").max(300),
        subtitle: z.string().max(300).optional().or(z.literal("")),
        description: z.string().max(10000).optional().or(z.literal("")),
        categories: z.array(z.string()).default([]),
        cover_image_url: z.string().url("Must be a valid URL").max(500).optional().or(z.literal("")),
        // datetime-local strings, e.g. "2026-12-01T09:00"
        start_date: z.string().optional().or(z.literal("")),
        end_date: z.string().optional().or(z.literal("")),
        timezone: z.string().max(64).optional().or(z.literal("")),
        region_id: z.string().optional().or(z.literal("")),
        capacity: optionalCount,
        is_featured: z.boolean().default(false),
    })
    .refine(
        (d) => !(d.start_date && d.end_date) || d.end_date >= d.start_date,
        { message: "End must be on or after start", path: ["end_date"] }
    );

export type EventFormData = z.infer<typeof eventFormSchema>;

const clean = <T extends Record<string, unknown>>(o: T): Partial<T> =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined)) as Partial<T>;

// `media` is assembled in the modal (cover + gallery + videos) and merged into
// these payloads there, so it is intentionally omitted here.
export function toCreatePayload(d: EventFormData): CreateEventPayload {
    return {
        ...clean({
            subtitle: d.subtitle,
            description: d.description,
            start_date: d.start_date,
            end_date: d.end_date,
            timezone: d.timezone,
            region_id: d.region_id,
            capacity: d.capacity,
        }),
        title: d.title,
        categories: d.categories,
        is_featured: d.is_featured,
    } as CreateEventPayload;
}

export function toUpdatePayload(d: EventFormData): UpdateEventPayload {
    return {
        ...clean({
            subtitle: d.subtitle,
            description: d.description,
            start_date: d.start_date,
            end_date: d.end_date,
            timezone: d.timezone,
            capacity: d.capacity,
        }),
        title: d.title,
        categories: d.categories,
        is_featured: d.is_featured,
        // region_id is always sent (empty clears it), matching the marker pattern.
        region_id: d.region_id ?? "",
    } as UpdateEventPayload;
}

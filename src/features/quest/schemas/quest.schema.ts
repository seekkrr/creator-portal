import { z } from "zod";
import type { QuestDifficulty } from "@/types";

// Base location step schema (without refinement for spreading).
// region* fields hold the V2 region resolved via the region search dropdown.
const locationStepBaseSchema = z.object({
    locationType: z.enum(["city", "url"]),
    city: z.string().optional(),
    sourceUrl: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    regionId: z.string().optional(),
    regionName: z.string().optional(),
    regionType: z.enum(["city", "hotspot"]).optional(),
});

// Step 1: Location or URL (with validation)
export const locationStepSchema = locationStepBaseSchema.refine(
    (data) => {
        if (data.locationType === "city") {
            // Require a resolved region (region_id) + its center coordinates.
            return (
                !!data.regionId &&
                typeof data.latitude === "number" &&
                typeof data.longitude === "number" &&
                !isNaN(data.latitude) &&
                !isNaN(data.longitude)
            );
        }
        if (data.locationType === "url") {
            return !!data.sourceUrl && data.sourceUrl.trim().length > 0;
        }
        return false;
    },
    {
        message: "Pick a region from the search, or share a source URL.",
        path: ["locationType"],
    }
);

export type LocationStepData = z.infer<typeof locationStepSchema>;

// Step 2: Quest Details — values map to the V2 quest model (lowercase enums).
// Full V2 QuestTheme set (must mirror backend QuestTheme enum, v2/api/routes/quests.py).
const DETAILS_THEMES = [
    "adventure", "romance", "culture", "food", "history", "nature",
    "spiritual", "photography", "archaeological", "offbeat", "finding_yourself", "other",
] as const;

export const detailsStepSchema = z.object({
    title: z
        .string()
        .min(3, "Title must be at least 3 characters")
        .max(100, "Title must be less than 100 characters"),
    description: z
        .string()
        .min(10, "Description must be at least 10 characters")
        .max(1000, "Description must be less than 1000 characters"),
    // V2 quests carry a LIST of themes, so this is multi-select (min 1).
    theme: z.array(z.enum(DETAILS_THEMES)).min(1, "Select at least one theme"),
    difficulty: z.enum(["easy", "moderate", "hard", "expert"] as const) satisfies z.ZodType<QuestDifficulty>,
    duration: z.number().min(30).max(1440).optional(),
});

export type DetailsStepData = z.infer<typeof detailsStepSchema>;
export type QuestTheme = (typeof DETAILS_THEMES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Markers (the marker playlist)
//
// Each item is EITHER a reference to an existing approved SeekKrr marker
// (`marker_id`) OR an inline new marker to be created on submit (`new_marker`).
// `_display` carries enough to render the ordered list + map pins for both kinds
// without an extra lookup (mirrors the backend playlist resolution shape).
// Coordinate order on `new_marker` is split into longitude/latitude for the form;
// it is reassembled into a GeoPoint ([lng, lat]) when building the payload.
// ─────────────────────────────────────────────────────────────────────────────
export const inlineNewMarkerSchema = z.object({
    title: z.string().min(1, "Marker title is required"),
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    category: z.string().optional(),
    description: z.string().optional(),
    address: z.string().optional(),
});

export type InlineNewMarkerData = z.infer<typeof inlineNewMarkerSchema>;

export const markerPlaylistItemSchema = z
    .object({
        marker_id: z.string().optional(),
        new_marker: inlineNewMarkerSchema.optional(),
        is_required: z.boolean().default(true),
        custom_description: z.string().optional(),
        // View-model for rendering the list / map pins (always populated on add).
        _display: z
            .object({
                title: z.string(),
                lng: z.number(),
                lat: z.number(),
            })
            .optional(),
    })
    .refine((item) => !!item.marker_id || !!item.new_marker, {
        message: "Each playlist item must reference a marker or define a new one.",
    });

export type MarkerPlaylistItemData = z.infer<typeof markerPlaylistItemSchema>;

export const markerPlaylistStepSchema = z.object({
    markerPlaylist: z
        .array(markerPlaylistItemSchema)
        .min(2, "Add at least two markers"),
});

export type MarkerPlaylistStepData = z.infer<typeof markerPlaylistStepSchema>;

// Combined form data schema using merge (Location + Details + Markers).
export const createQuestSchema = locationStepBaseSchema
    .merge(detailsStepSchema)
    .merge(markerPlaylistStepSchema);

export type CreateQuestFormData = z.infer<typeof createQuestSchema>;

// Default values
export const defaultFormValues: Partial<CreateQuestFormData> = {
    locationType: "city",
    city: "",
    sourceUrl: "",
    title: "",
    description: "",
    theme: ["adventure"],
    difficulty: "moderate",
    duration: 60,
    markerPlaylist: [],
};

import { z } from "zod";
import type { QuestDifficulty } from "@/types";

// Base location step schema (without refinement for spreading)
const locationStepBaseSchema = z.object({
    locationType: z.enum(["city", "url"]),
    city: z.string().optional(),
    sourceUrl: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
});

// Step 1: Location or URL (with validation)
export const locationStepSchema = locationStepBaseSchema.refine(
    (data) => {
        if (data.locationType === "city") {
            // Require city name AND valid coordinates
            return (
                !!data.city &&
                data.city.trim().length >= 2 &&
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
        message: "A valid city with coordinates or a source URL is required.",
        path: ["locationType"],
    }
);

export type LocationStepData = z.infer<typeof locationStepSchema>;

// Step 2: Quest Details
export const detailsStepSchema = z.object({
    title: z
        .string()
        .min(3, "Title must be at least 3 characters")
        .max(100, "Title must be less than 100 characters"),
    description: z
        .string()
        .min(10, "Description must be at least 10 characters")
        .max(1000, "Description must be less than 1000 characters"),
    theme: z.enum(["Adventure", "Romance", "Culture", "Food", "History", "Nature", "Custom"] as const),
    difficulty: z.enum(["Easy", "Medium", "Hard", "Expert"] as const) satisfies z.ZodType<QuestDifficulty>,
    duration: z.number().min(30).max(1440).optional(),
});

export type DetailsStepData = z.infer<typeof detailsStepSchema>;
export type QuestTheme = "Adventure" | "Romance" | "Culture" | "Food" | "History" | "Nature" | "Custom";

// Step 3: Waypoints
export const waypointSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    place_name: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
});

export const waypointsStepSchema = z.object({
    waypoints: z
        .array(waypointSchema)
        .min(2, "Add at least two waypoints (Start and End)"),
});

export type WaypointsStepData = z.infer<typeof waypointsStepSchema>;

// Step 4: Waypoint Details
export const waypointDetailSchema = z.object({
    howToReach: z.string().min(1, "Navigation instructions are required"),
    description: z.string().min(1, "Activity description is required"),
    images: z.array(z.any()).optional(), // Array of CloudinaryAsset
});

export const waypointDetailsStepSchema = z.object({
    waypointDetails: z.array(waypointDetailSchema),
    galleryImages: z.array(z.any()).optional(), // Array of CloudinaryAsset
});

export type WaypointDetailsStepData = z.infer<typeof waypointDetailsStepSchema>;

// Step 5: Narratives (optional)
export const narrativeItemSchema = z.object({
    fromStepIndex: z.number().min(0),
    toStepIndex: z.number().min(1),
    title: z.string().max(100).optional().default(""),
    content: z.string().min(5, "Narrative content must be at least 5 characters"),
    triggerRadiusM: z.number().min(1).max(500).optional().default(50),
    isMandatory: z.boolean().optional().default(false),
});

export const narrativeStepSchema = z.object({
    narratives: z.array(narrativeItemSchema).optional().default([]),
});

export type NarrativeStepData = z.infer<typeof narrativeStepSchema>;

// Combined form data schema using intersection
export const createQuestSchema = locationStepBaseSchema
    .merge(detailsStepSchema)
    .merge(waypointsStepSchema)
    .merge(waypointDetailsStepSchema)
    .merge(narrativeStepSchema);

export type CreateQuestFormData = z.infer<typeof createQuestSchema>;

// Default values
export const defaultFormValues: Partial<CreateQuestFormData> = {
    locationType: "city",
    city: "",
    sourceUrl: "",
    title: "",
    description: "",
    theme: "Adventure",
    difficulty: "Medium",
    duration: 60,
    waypoints: [],
    waypointDetails: [],
    galleryImages: [],
    narratives: [],
};

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
            return data.city && data.city.trim().length >= 2;
        }
        if (data.locationType === "url") {
            return data.sourceUrl && data.sourceUrl.trim().length > 0;
        }
        return false;
    },
    {
        message: "Please provide a city name or a valid URL",
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
        .min(1, "Add at least one waypoint"),
});

export type WaypointsStepData = z.infer<typeof waypointsStepSchema>;

// Combined form data schema using intersection
export const createQuestSchema = locationStepBaseSchema
    .merge(detailsStepSchema)
    .merge(waypointsStepSchema);

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
};

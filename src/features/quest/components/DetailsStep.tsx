import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Input, Textarea, Badge } from "@components/ui";
import { MapComponent } from "@features/map";
import { detailsStepSchema, type DetailsStepData, type QuestTheme } from "../schemas/quest.schema";
import type { QuestDifficulty } from "@/types";

interface DetailsStepProps {
    defaultValues: Partial<DetailsStepData> & {
        latitude?: number;
        longitude?: number;
        city?: string;
    };
    onNext: (data: DetailsStepData) => void;
    onBack: () => void;
}

const themeOptions: QuestTheme[] = ["Adventure", "Romance", "Culture", "Food", "History", "Nature", "Custom"];

const themeIcons: Record<QuestTheme, string> = {
    Adventure: "🏔️",
    Romance: "💕",
    Culture: "🎭",
    Food: "🍜",
    History: "🏛️",
    Nature: "🌿",
    Custom: "✨",
};

const difficultyOptions: QuestDifficulty[] = ["Easy", "Medium", "Hard", "Expert"];

const difficultyColors: Record<QuestDifficulty, "success" | "info" | "warning" | "danger"> = {
    Easy: "success",
    Medium: "info",
    Hard: "warning",
    Expert: "danger",
};

export function DetailsStep({ defaultValues, onNext, onBack }: DetailsStepProps) {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<DetailsStepData>({
        resolver: zodResolver(detailsStepSchema),
        defaultValues: {
            title: defaultValues.title ?? "",
            description: defaultValues.description ?? "",
            theme: defaultValues.theme ?? "Adventure",
            difficulty: defaultValues.difficulty ?? "Medium",
            duration: defaultValues.duration ?? 60,
        },
    });

    const theme = watch("theme");
    const difficulty = watch("difficulty");

    const onSubmit = (data: DetailsStepData) => {
        onNext(data);
    };

    // Get map center from location data passed from step 1
    const mapCenter = defaultValues.latitude && defaultValues.longitude
        ? { lat: defaultValues.latitude, lng: defaultValues.longitude }
        : undefined;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                    Add Quest Details
                </h2>
                <p className="text-neutral-600">
                    Tell explorers about your adventure
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Left Column - Form */}
                <div className="space-y-5">
                    <Input
                        {...register("title")}
                        label="Quest Name"
                        placeholder="e.g., Hidden Gems of Mumbai"
                        error={errors.title?.message}
                    />

                    <Textarea
                        {...register("description")}
                        label="Description"
                        placeholder="Describe your quest adventure..."
                        error={errors.description?.message}
                    />

                    {/* Theme */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Quest Theme
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {themeOptions.map((themeOption) => (
                                <button
                                    key={themeOption}
                                    type="button"
                                    onClick={() => setValue("theme", themeOption)}
                                    className={`px-3 py-2 rounded-lg border-2 transition-all text-sm ${theme === themeOption
                                        ? "border-indigo-500 bg-indigo-50"
                                        : "border-neutral-200 hover:border-neutral-300"
                                        }`}
                                >
                                    <span className="mr-1.5">{themeIcons[themeOption]}</span>
                                    {themeOption}
                                </button>
                            ))}
                        </div>
                        {errors.theme && (
                            <p className="mt-1.5 text-sm text-red-600">{errors.theme.message}</p>
                        )}
                    </div>

                    {/* Difficulty */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Difficulty Level
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {difficultyOptions.map((level) => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setValue("difficulty", level)}
                                    className={`px-4 py-2 rounded-lg border-2 transition-all ${difficulty === level
                                        ? "border-indigo-500 bg-indigo-50"
                                        : "border-neutral-200 hover:border-neutral-300"
                                        }`}
                                >
                                    <Badge variant={difficultyColors[level]}>{level}</Badge>
                                </button>
                            ))}
                        </div>
                        {errors.difficulty && (
                            <p className="mt-1.5 text-sm text-red-600">{errors.difficulty.message}</p>
                        )}
                    </div>

                    {/* Duration */}
                    <Input
                        {...register("duration", { valueAsNumber: true })}
                        type="number"
                        label="Estimated Duration (minutes)"
                        placeholder="60"
                        error={errors.duration?.message}
                    />
                </div>

                {/* Right Column - Map Preview */}
                <div className="self-start">
                    <MapComponent
                        height="500px"
                        interactive={true}
                        center={mapCenter}
                        className="border border-neutral-200 rounded-xl"
                    />
                    <p className="mt-2 text-sm text-neutral-500">
                        {mapCenter
                            ? `📍 ${defaultValues.city ?? 'Selected location'}`
                            : "Markers will appear after adding waypoints"
                        }
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onBack}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                    Back
                </Button>
                <Button type="submit" rightIcon={<ChevronRight className="w-4 h-4" />}>
                    Next
                </Button>
            </div>
        </form>
    );
}

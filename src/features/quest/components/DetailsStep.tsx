import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Input, Textarea, Badge } from "@components/ui";
import { MapComponent } from "@features/map";
import { ImageUpload } from "./ImageUpload";
import { detailsStepSchema, type DetailsStepData } from "../schemas/quest.schema";
import type { QuestDifficulty } from "@/types";

interface DetailsStepProps {
    defaultValues: Partial<DetailsStepData>;
    onNext: (data: DetailsStepData) => void;
    onBack: () => void;
}

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
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<DetailsStepData>({
        resolver: zodResolver(detailsStepSchema),
        defaultValues: {
            title: defaultValues.title ?? "",
            description: defaultValues.description ?? "",
            difficulty: defaultValues.difficulty ?? "Medium",
            duration: defaultValues.duration ?? 60,
            coverImage: defaultValues.coverImage,
        },
    });

    const difficulty = watch("difficulty");

    const onSubmit = (data: DetailsStepData) => {
        onNext(data);
    };

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                    {/* Cover Image */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Cover Image
                        </label>
                        <Controller
                            name="coverImage"
                            control={control}
                            render={({ field }) => (
                                <ImageUpload
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                    </div>
                </div>

                {/* Right Column - Map Preview */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Map Preview
                    </label>
                    <MapComponent
                        height="400px"
                        interactive={false}
                        className="border border-neutral-200"
                    />
                    <p className="mt-2 text-sm text-neutral-500">
                        Markers will appear after adding waypoints
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

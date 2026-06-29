import { useState, useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Building2, Tent, Check } from "lucide-react";
import { Button, Input, Textarea, Badge, InfoHint } from "@components/ui";
import { MapComponent } from "@features/map";
import { regionService } from "@services/region.service";
import { detailsStepSchema, type DetailsStepData, type QuestTheme } from "../schemas/quest.schema";
import type { QuestDifficulty, RegionType } from "@/types";
import { VideoWalkthroughModal, VideoHelpButton } from "@components/VideoWalkthroughModal";
import { WALKTHROUGH_VIDEOS } from "@config/walkthroughVideos";

interface DetailsStepProps {
    defaultValues: Partial<DetailsStepData> & {
        latitude?: number;
        longitude?: number;
        city?: string;
        regionId?: string;
        regionName?: string;
        regionType?: RegionType;
    };
    onNext: (data: DetailsStepData) => void;
    onBack: () => void;
}

// Full V2 QuestTheme set — keep in sync with backend QuestTheme (v2/api/routes/quests.py).
const themeOptions: { value: QuestTheme; label: string; icon: string }[] = [
    { value: "adventure", label: "Adventure", icon: "🏔️" },
    { value: "romance", label: "Romance", icon: "💕" },
    { value: "culture", label: "Culture", icon: "🎭" },
    { value: "food", label: "Food", icon: "🍜" },
    { value: "history", label: "History", icon: "🏛️" },
    { value: "nature", label: "Nature", icon: "🌿" },
    { value: "spiritual", label: "Spiritual", icon: "🕉️" },
    { value: "photography", label: "Photography", icon: "📸" },
    { value: "archaeological", label: "Archaeological", icon: "🏺" },
    { value: "offbeat", label: "Offbeat", icon: "🧭" },
    { value: "finding_yourself", label: "Finding Yourself", icon: "🧘" },
    { value: "other", label: "Other", icon: "✨" },
];

const difficultyOptions: {
    value: QuestDifficulty;
    label: string;
    color: "success" | "info" | "warning" | "danger";
}[] = [
    { value: "easy", label: "Easy", color: "success" },
    { value: "moderate", label: "Moderate", color: "info" },
    { value: "hard", label: "Hard", color: "warning" },
    { value: "expert", label: "Expert", color: "danger" },
];

/**
 * Field label with an inline "?" help hint, matching the location step.
 * Renders a real <label> when it points at a single control (`htmlFor`), or a
 * <span> (with an id, for aria-labelledby) when it heads a button group — a bare
 * <label> with no associated control is an a11y violation.
 */
function FieldLabel({
    htmlFor,
    id,
    children,
    hint,
}: {
    htmlFor?: string;
    id?: string;
    children: ReactNode;
    hint: ReactNode;
}) {
    const cls = "block text-sm font-medium text-neutral-700";
    return (
        <div className="flex items-center gap-1.5 mb-1.5">
            {htmlFor ? (
                <label htmlFor={htmlFor} className={cls}>
                    {children}
                </label>
            ) : (
                <span id={id} className={cls}>
                    {children}
                </span>
            )}
            <InfoHint text={hint} side="top" />
        </div>
    );
}

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
            theme: defaultValues.theme ?? ["adventure"],
            difficulty: defaultValues.difficulty ?? "moderate",
            duration: defaultValues.duration ?? 60,
        },
    });

    const theme = watch("theme") ?? [];
    const difficulty = watch("difficulty");

    const toggleTheme = (value: QuestTheme) => {
        const next = theme.includes(value)
            ? theme.filter((t) => t !== value)
            : [...theme, value];
        setValue("theme", next, { shouldValidate: true });
    };

    const onSubmit = (data: DetailsStepData) => {
        onNext(data);
    };

    // Pull the resolved region to draw its boundary (bbox) + center the preview.
    const regionId = defaultValues.regionId;
    const { data: region } = useQuery({
        queryKey: ["region", regionId],
        queryFn: () => regionService.getRegion(regionId!),
        enabled: !!regionId,
        staleTime: 5 * 60 * 1000,
    });

    const regionBbox = region?.bbox ?? null;
    const regionCenter = region?.center_point?.coordinates;
    const mapCenter = regionCenter
        ? { lng: regionCenter[0], lat: regionCenter[1] }
        : defaultValues.latitude != null && defaultValues.longitude != null
          ? { lng: defaultValues.longitude, lat: defaultValues.latitude }
          : undefined;

    const regionLabel = region?.name ?? defaultValues.regionName ?? defaultValues.city;
    const regionKind: RegionType | undefined = region?.type ?? defaultValues.regionType;

    // Track whether the boundary actually rendered, so the caption is truthful.
    const [boundaryDrawn, setBoundaryDrawn] = useState(false);
    useEffect(() => {
        setBoundaryDrawn(false);
    }, [regionId]);

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-neutral-900 mb-1">Add Quest Details</h2>
                        <p className="text-neutral-600">Tell explorers about your adventure</p>
                    </div>
                    <VideoHelpButton onClick={() => setIsModalOpen(true)} label="Watch walkthrough" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Left Column - Form */}
                    <div className="space-y-5">
                        <div>
                            <FieldLabel
                                htmlFor="quest-name"
                                hint="The public title explorers see. Make it specific and enticing — e.g. 'Old Delhi Street-Food Trail'. 3–100 characters."
                            >
                                Quest Name
                            </FieldLabel>
                            <Input
                                id="quest-name"
                                {...register("title")}
                                placeholder="e.g., Hidden Gems of Mumbai"
                                error={errors.title?.message}
                            />
                        </div>

                        <div>
                            <FieldLabel
                                htmlFor="quest-description"
                                hint="Set the scene: what makes this quest special, what explorers will see and do. 10–1000 characters."
                            >
                                Description
                            </FieldLabel>
                            <Textarea
                                id="quest-description"
                                {...register("description")}
                                placeholder="Describe your quest adventure..."
                                error={errors.description?.message}
                            />
                        </div>

                        {/* Theme (multi-select) */}
                        <div>
                            <FieldLabel
                                id="theme-label"
                                hint="The vibe(s) of your quest — pick all that fit. Themes help explorers discover and filter quests. You can choose more than one."
                            >
                                Quest Theme
                                <span className="ml-1 font-normal text-neutral-400">· choose one or more</span>
                            </FieldLabel>
                            <div role="group" aria-labelledby="theme-label" className="flex flex-wrap gap-2">
                                {themeOptions.map((opt) => {
                                    const active = theme.includes(opt.value);
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => toggleTheme(opt.value)}
                                            className={`px-3 py-2 rounded-lg border-2 transition-all text-sm inline-flex items-center gap-1.5 ${
                                                active
                                                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                                                    : "border-neutral-200 hover:border-neutral-300"
                                            }`}
                                        >
                                            <span>{opt.icon}</span>
                                            {opt.label}
                                            {/* fixed-width check slot so chips don't reflow on toggle */}
                                            <span className="w-3.5 inline-flex justify-center">
                                                {active && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.theme && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.theme.message as string}
                                </p>
                            )}
                        </div>

                        {/* Difficulty */}
                        <div>
                            <FieldLabel
                                id="difficulty-label"
                                hint="How demanding the quest is — distance, terrain, puzzle difficulty. Helps explorers pick quests that match their energy."
                            >
                                Difficulty Level
                            </FieldLabel>
                            <div role="group" aria-labelledby="difficulty-label" className="flex flex-wrap gap-2">
                                {difficultyOptions.map((level) => (
                                    <button
                                        key={level.value}
                                        type="button"
                                        onClick={() => setValue("difficulty", level.value)}
                                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                            difficulty === level.value
                                                ? "border-indigo-500 bg-indigo-50"
                                                : "border-neutral-200 hover:border-neutral-300"
                                        }`}
                                    >
                                        <Badge variant={level.color}>{level.label}</Badge>
                                    </button>
                                ))}
                            </div>
                            {errors.difficulty && (
                                <p className="mt-1.5 text-sm text-red-600">{errors.difficulty.message}</p>
                            )}
                        </div>

                        {/* Duration */}
                        <div>
                            <FieldLabel
                                htmlFor="quest-duration"
                                hint="Roughly how long the full quest takes, in minutes (30–1440). A realistic estimate sets the right expectations."
                            >
                                Estimated Duration (minutes)
                            </FieldLabel>
                            <Input
                                id="quest-duration"
                                {...register("duration", { valueAsNumber: true })}
                                type="number"
                                placeholder="60"
                                error={errors.duration?.message}
                            />
                        </div>
                    </div>

                    {/* Right Column - Region preview (lightweight) with boundary */}
                    <div className="self-start">
                        <MapComponent
                            height="420px"
                            preview
                            interactive
                            center={mapCenter}
                            regionBbox={regionBbox}
                            onRegionBboxDrawn={() => setBoundaryDrawn(true)}
                            className="border border-neutral-200 rounded-xl"
                        />
                        <p className="mt-2 text-sm text-neutral-500 flex items-center gap-1.5">
                            {regionKind === "hotspot" ? (
                                <Tent className="w-4 h-4 text-indigo-500" />
                            ) : (
                                <Building2 className="w-4 h-4 text-indigo-500" />
                            )}
                            {regionLabel ? (
                                <>
                                    <span className="font-medium text-neutral-700">{regionLabel}</span>
                                    {regionKind && (
                                        <span className="text-neutral-400">
                                            · {regionKind === "hotspot" ? "Hotspot" : "City"}
                                        </span>
                                    )}
                                    {regionBbox && (
                                        <span className="text-neutral-400">
                                            · {boundaryDrawn ? "boundary shown" : "drawing boundary…"}
                                        </span>
                                    )}
                                </>
                            ) : (
                                "Selected region"
                            )}
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onBack()}
                        leftIcon={<ChevronLeft className="w-4 h-4" />}
                    >
                        Back
                    </Button>
                    <Button type="submit" rightIcon={<ChevronRight className="w-4 h-4" />}>
                        Next
                    </Button>
                </div>
            </form>

            <VideoWalkthroughModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                videoUrl={WALKTHROUGH_VIDEOS.DETAILS}
                title="Location & Details Walkthrough"
            />
        </>
    );
}

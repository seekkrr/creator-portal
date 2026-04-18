import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    BookOpen, Plus, Trash2, SkipForward, Radius, ShieldCheck,
} from "lucide-react";
import {
    type NarrativeStepData,
    narrativeStepSchema,
    type CreateQuestFormData,
} from "../schemas/quest.schema";
import { Button, Textarea } from "@/components/ui";
import { WaypointMapComponent } from "@features/map";
import type { QuestLocation } from "@/types";

interface NarrativeStepProps {
    defaultValues: Partial<CreateQuestFormData>;
    onNext: (data: NarrativeStepData) => void;
    onBack?: (data: NarrativeStepData) => void;
    isReadOnly?: boolean;
}

export function NarrativeStep({ defaultValues, onNext, onBack }: NarrativeStepProps) {
    const waypoints = defaultValues.waypoints || [];

    // Build available segments (Step 0→1, 1→2, etc.)
    const segments = waypoints.length > 1
        ? waypoints.slice(0, -1).map((_, i) => ({
            fromIndex: i,
            toIndex: i + 1,
            label: `${waypoints[i]?.place_name || `Step ${i + 1}`} → ${waypoints[i + 1]?.place_name || `Step ${i + 2}`}`,
        }))
        : [];

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<NarrativeStepData>({
        resolver: zodResolver(narrativeStepSchema),
        defaultValues: {
            narratives: defaultValues.narratives || [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "narratives",
    });

    const watchedNarratives = watch("narratives");
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [focusedSegment, setFocusedSegment] = useState<{ from: QuestLocation; to: QuestLocation } | null>(null);

    const toggleAccordion = (index: number) => {
        const newIndex = openIndex === index ? null : index;
        setOpenIndex(newIndex);
        if (newIndex !== null && watchedNarratives?.[newIndex]) {
            const n = watchedNarratives[newIndex];
            const from = waypoints[n.fromStepIndex];
            const to = waypoints[n.toStepIndex];
            if (from && to) setFocusedSegment({ from, to });
        } else {
            setFocusedSegment(null);
        }
    };

    const handleAddNarrative = (segmentIndex: number) => {
        const seg = segments[segmentIndex];
        if (!seg) return;
        // Prevent duplicate: only one narrative per segment
        const alreadyExists = watchedNarratives?.some(
            (n) => n.fromStepIndex === seg.fromIndex && n.toStepIndex === seg.toIndex
        );
        if (alreadyExists) return;
        append({
            fromStepIndex: seg.fromIndex,
            toStepIndex: seg.toIndex,
            title: "",
            content: "",
            triggerRadiusM: 50,
            isMandatory: false,
        });
        setOpenIndex(fields.length); // Open the newly added item
    };

    const onSubmit = (data: NarrativeStepData) => {
        onNext(data);
    };

    const handleSkip = () => {
        onNext({ narratives: [] });
    };

    const handleBack = () => {
        if (onBack) {
            onBack({ narratives: watchedNarratives || [] });
        }
    };

    // Map center
    const firstWaypoint = waypoints.length > 0 ? waypoints[0] : undefined;
    const mapCenter = focusedSegment
        ? {
            lng: (focusedSegment.from.longitude + focusedSegment.to.longitude) / 2,
            lat: (focusedSegment.from.latitude + focusedSegment.to.latitude) / 2,
        }
        : firstWaypoint
            ? { lng: firstWaypoint.longitude, lat: firstWaypoint.latitude }
            : { lng: 77.5946, lat: 12.9716 };

    // Get segment label for a narrative by indices
    const getSegmentLabel = (fromIdx: number, toIdx: number) => {
        const fromName = waypoints[fromIdx]?.place_name || `Step ${fromIdx + 1}`;
        const toName = waypoints[toIdx]?.place_name || `Step ${toIdx + 1}`;
        return `${fromName} → ${toName}`;
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Quest Narrative</h2>
                    <p className="text-neutral-500">
                        Add contextual stories between waypoints to enrich the quest experience.
                        <span className="text-indigo-500 ml-1 font-medium">This step is optional.</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
                {/* Left Column: Narrative List + Add */}
                <div className="space-y-4 order-2 lg:order-1">

                    {/* Existing narratives */}
                    {fields.length === 0 ? (
                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm mb-1">No narratives added yet</p>
                            <p className="text-slate-400 text-xs">
                                Narratives appear between waypoints as contextual stories for your users.
                            </p>
                        </div>
                    ) : (
                        fields.map((field, index) => {
                            const narrative = watchedNarratives?.[index];
                            const hasError = errors.narratives?.[index];
                            const isOpen = openIndex === index;

                            return (
                                <div
                                    key={field.id}
                                    className={`
                                        border rounded-2xl transition-all duration-200 shadow-sm overflow-hidden
                                        ${hasError ? "border-red-300 bg-red-50/10" : "border-slate-200 bg-white"}
                                        ${isOpen ? "ring-1 ring-slate-900 border-slate-900 shadow-md" : "hover:border-slate-400"}
                                    `}
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleAccordion(index)}
                                        className="flex w-full items-center justify-between p-4 bg-white transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`
                                                flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-sm transition-colors shrink-0
                                                ${isOpen
                                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                                    : "bg-white border-slate-300 text-slate-500"
                                                }
                                            `}>
                                                <BookOpen className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <span className={`font-semibold text-base block ${isOpen ? "text-slate-900" : "text-slate-600"}`}>
                                                    {narrative?.title?.trim() || getSegmentLabel(narrative?.fromStepIndex ?? 0, narrative?.toStepIndex ?? 1)}
                                                </span>
                                                <span className="text-xs text-slate-400 block mt-0.5">
                                                    {getSegmentLabel(narrative?.fromStepIndex ?? 0, narrative?.toStepIndex ?? 1)}
                                                </span>
                                                {hasError && (
                                                    <span className="text-xs text-red-500 font-medium mt-0.5 block">
                                                        Missing required fields
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    remove(index);
                                                    if (openIndex === index) setOpenIndex(null);
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                title="Remove narrative"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            {isOpen ? (
                                                <ChevronUp className="w-5 h-5 text-slate-900" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-slate-400" />
                                            )}
                                        </div>
                                    </button>

                                    <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                        <div className="overflow-hidden">
                                            <div className="px-5 py-5 border-t border-slate-100 bg-slate-50/50 space-y-6">

                                                {/* Segment Selector */}
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4 text-indigo-500" />
                                                        Route Segment
                                                    </label>
                                                    <select
                                                        value={`${narrative?.fromStepIndex ?? 0}-${narrative?.toStepIndex ?? 1}`}
                                                        onChange={(e) => {
                                                            const parts = e.target.value.split("-").map(Number);
                                                            const from = parts[0] ?? 0;
                                                            const to = parts[1] ?? 1;
                                                            setValue(`narratives.${index}.fromStepIndex`, from, { shouldValidate: true });
                                                            setValue(`narratives.${index}.toStepIndex`, to, { shouldValidate: true });
                                                        }}
                                                        className="w-full bg-white text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                                    >
                                                        {segments.map((seg) => {
                                                            // Only show this segment if it's the current narrative's segment or not used by another
                                                            const isCurrent = narrative?.fromStepIndex === seg.fromIndex && narrative?.toStepIndex === seg.toIndex;
                                                            const usedByOther = watchedNarratives?.some(
                                                                (n, ni) => ni !== index && n.fromStepIndex === seg.fromIndex && n.toStepIndex === seg.toIndex
                                                            );
                                                            if (usedByOther && !isCurrent) return null;
                                                            return (
                                                                <option key={`${seg.fromIndex}-${seg.toIndex}`} value={`${seg.fromIndex}-${seg.toIndex}`}>
                                                                    {seg.label}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>

                                                {/* Title (Optional) */}
                                                <div className="space-y-2">
                                                    <label
                                                        htmlFor={`narratives.${index}.title`}
                                                        className="text-sm font-semibold text-slate-900 flex items-center gap-2"
                                                    >
                                                        <BookOpen className="w-4 h-4 text-indigo-500" />
                                                        Title <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                                                    </label>
                                                    <input
                                                        id={`narratives.${index}.title`}
                                                        type="text"
                                                        placeholder="e.g. The River Crossing"
                                                        {...register(`narratives.${index}.title`)}
                                                        className="w-full bg-white text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                                    />
                                                    {errors.narratives?.[index]?.title && (
                                                        <p className="text-xs text-red-500">{errors.narratives[index].title?.message}</p>
                                                    )}
                                                </div>

                                                {/* Content (Required) */}
                                                <div className="space-y-2">
                                                    <label
                                                        htmlFor={`narratives.${index}.content`}
                                                        className="text-sm font-semibold text-slate-900 flex items-center gap-2"
                                                    >
                                                        <BookOpen className="w-4 h-4 text-indigo-500" />
                                                        Story Content <span className="text-red-500">*</span>
                                                    </label>
                                                    <p className="text-xs text-slate-500 ml-6">
                                                        What story or context should players experience between these waypoints?
                                                    </p>
                                                    <Textarea
                                                        id={`narratives.${index}.content`}
                                                        placeholder="e.g. As you walk along the ancient pathway, look to your left for the ruins of..."
                                                        {...register(`narratives.${index}.content`)}
                                                        error={errors.narratives?.[index]?.content?.message}
                                                        className="bg-white text-sm border-slate-200 focus:border-slate-900 focus:ring-slate-900 min-h-[120px]"
                                                    />
                                                </div>

                                                {/* Settings Row */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Trigger Radius */}
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                            <Radius className="w-4 h-4 text-indigo-500" />
                                                            Trigger Radius
                                                        </label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={500}
                                                                {...register(`narratives.${index}.triggerRadiusM`, { valueAsNumber: true })}
                                                                className="w-full bg-white text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                                            />
                                                            <span className="text-xs text-slate-400 whitespace-nowrap">meters</span>
                                                        </div>
                                                        {errors.narratives?.[index]?.triggerRadiusM && (
                                                            <p className="text-xs text-red-500">{errors.narratives[index].triggerRadiusM?.message}</p>
                                                        )}
                                                    </div>

                                                    {/* Is Mandatory */}
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                            <ShieldCheck className="w-4 h-4 text-indigo-500" />
                                                            Mandatory
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                {...register(`narratives.${index}.isMandatory`)}
                                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <span className="text-sm text-slate-600">Required to view</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Trigger Location Info */}
                                                {/* 
                                                 * TODO: Future enhancement — Allow creators to manually set trigger location 
                                                 * via map pin or lat/lng inputs. Currently auto-calculated as the midpoint 
                                                 * between from_step and to_step waypoints during quest submission.
                                                 * See: implementation_plan.md, "Trigger location in creator flow"
                                                 */}
                                                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-3">
                                                    <p className="text-xs text-indigo-600">
                                                        <strong>Trigger location:</strong> Automatically set to the midpoint between the two waypoints.
                                                        Players will see this narrative when they're within {narrative?.triggerRadiusM || 50}m of it.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Add Narrative Button */}
                    {segments.length > 0 && (() => {
                        // Only show segments that don't already have a narrative
                        const availableSegments = segments.filter((seg) =>
                            !watchedNarratives?.some(
                                (n) => n.fromStepIndex === seg.fromIndex && n.toStepIndex === seg.toIndex
                            )
                        );
                        if (availableSegments.length === 0) return null;
                        return (
                            <div className="space-y-2">
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                                    Add narrative to segment
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {availableSegments.map((seg) => (
                                        <button
                                            key={`${seg.fromIndex}-${seg.toIndex}`}
                                            type="button"
                                            onClick={() => handleAddNarrative(segments.indexOf(seg))}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-sm text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            {seg.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Right Column: Sticky Map */}
                <div className="order-1 lg:order-2 lg:sticky lg:top-6">
                    <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
                        <WaypointMapComponent
                            center={mapCenter}
                            waypoints={waypoints}
                            focusedLocation={focusedSegment ? {
                                lng: (focusedSegment.from.longitude + focusedSegment.to.longitude) / 2,
                                lat: (focusedSegment.from.latitude + focusedSegment.to.latitude) / 2,
                            } : null}
                            activeSegment={
                                openIndex !== null && watchedNarratives?.[openIndex]
                                    ? { fromIndex: watchedNarratives[openIndex].fromStepIndex, toIndex: watchedNarratives[openIndex].toStepIndex }
                                    : null
                            }
                            onWaypointAdd={() => { }}
                            onWaypointUpdate={() => { }}
                            onWaypointRemove={() => { }}
                            height="400px"
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-slate-200">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                    Back
                </Button>
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleSkip}
                        leftIcon={<SkipForward className="w-4 h-4" />}
                    >
                        Skip
                    </Button>
                    <Button
                        type="submit"
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                        {fields.length > 0 ? "Next" : "Next (No Narratives)"}
                    </Button>
                </div>
            </div>
        </form>
    );
}

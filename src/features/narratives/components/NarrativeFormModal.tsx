import React, { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Upload, Trash2, AlertTriangle, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button, Input, Textarea, Card } from "@components/ui";
import { narrativeService } from "@services/narrative.service";
import { cloudinaryService } from "@services/cloudinary.service";
import { markerService } from "@services/marker.service";
import { questService } from "@services/quest.service";
import { AttachTargetSelect } from "./AttachTargetSelect";
import type { AttachSelection } from "./AttachTargetSelect";
import {
    narrativeFormSchema,
    toCreatePayload,
    toUpdatePayload,
    VOICE_PERSONAS,
} from "../schemas/narrative.schema";
import type { NarrativeFormData } from "../schemas/narrative.schema";
import { chainFieldsFromSummary } from "../utils/chainFields";
import { estimateSeconds, exceedsSegment, MAX_SEGMENT_SECONDS } from "../utils/duration";
import type { Narrative, CreateNarrativePayload } from "@/types";

interface NarrativeFormModalProps {
    open: boolean;
    mode: "create" | "edit";
    initial?: Narrative;
    onClose: () => void;
    onSaved: (narrative: Narrative) => void;
}

const VOICE_PERSONA_LABELS: Record<string, string> = {
    historian_warm: "Historian (Warm)",
    mystery_whisper: "Mystery Whisper",
    energetic_guide: "Energetic Guide",
    elder_storyteller: "Elder Storyteller",
};

export function NarrativeFormModal({
    open,
    mode,
    initial,
    onClose,
    onSaved,
}: NarrativeFormModalProps) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    // Tracks which submit action the user clicked so onSubmit knows the intent.
    const [pendingStatus, setPendingStatus] = useState<"draft" | "under_review">("under_review");

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<NarrativeFormData>({
        resolver: zodResolver(narrativeFormSchema),
        defaultValues: {
            title: "",
            attach_type: "marker",
            attach_id: "",
            content: "",
            subtitle: "",
            voice_persona: undefined,
            media: [],
            is_mandatory: false,
            is_unlocked: false,
            sequence_order: undefined,
        },
    });

    // Pre-fill on edit
    useEffect(() => {
        if (mode === "edit" && initial) {
            reset({
                title: initial.title,
                attach_type: initial.attach_type === "region" ? "marker" : initial.attach_type,
                attach_id: initial.attach_id,
                content: initial.content ?? "",
                subtitle: initial.subtitle ?? "",
                voice_persona: initial.voice_persona ?? undefined,
                media: initial.media ?? [],
                is_mandatory: initial.is_mandatory,
                is_unlocked: initial.is_unlocked,
                sequence_order: initial.sequence_order ?? undefined,
            });
        } else if (mode === "create") {
            reset({
                title: "",
                attach_type: "marker",
                attach_id: "",
                content: "",
                subtitle: "",
                voice_persona: undefined,
                media: [],
                is_mandatory: false,
                is_unlocked: false,
                sequence_order: undefined,
            });
        }
    }, [mode, initial, reset, open]);

    const mediaUrls = watch("media");
    const attachId = watch("attach_id");
    const attachType = watch("attach_type");
    const content = watch("content") ?? "";

    // In edit mode, resolve the human-readable name of the attached target so
    // AttachTargetSelect can display "Marker: Colosseum" instead of "marker: 64f3a2b…".
    // IMPORTANT: gate lookups on initial.attach_type (the persisted value), NOT the
    // coerced form field value. This prevents calling markerService.getMarker with a
    // region id when initial.attach_type === "region". For region (or any unknown type),
    // skip the network lookup entirely and fall back to showing the raw attach_id.
    const editAttachId = mode === "edit" && initial !== undefined ? initial.attach_id : null;

    const { data: resolvedMarker } = useQuery({
        queryKey: ["attach-label-marker", editAttachId],
        queryFn: () => markerService.getMarker(editAttachId as string),
        enabled:
            initial?.attach_type === "marker" &&
            editAttachId !== null &&
            editAttachId !== undefined,
        staleTime: 5 * 60 * 1000,
    });

    const { data: resolvedQuest } = useQuery({
        queryKey: ["attach-label-quest", editAttachId],
        queryFn: () => questService.getQuestById(editAttachId as string),
        enabled:
            initial?.attach_type === "quest" &&
            editAttachId !== null &&
            editAttachId !== undefined,
        staleTime: 5 * 60 * 1000,
    });

    // Fetch attach summary for create mode (conflict pre-check + chain fields).
    const {
        data: attachSummary,
        refetch: refetchSummary,
    } = useQuery({
        queryKey: ["attach-summary", attachType, attachId],
        queryFn: () =>
            narrativeService.getAttachSummary(
                attachType as "marker" | "quest",
                attachId
            ),
        enabled: mode === "create" && !!attachId && !!attachType,
        staleTime: 30_000,
    });

    // When over the segment limit and there's a chain, fetch the chain narratives for context.
    const chainId = attachSummary?.chains?.[0]?.chain_id;
    const isOverLimit = exceedsSegment(content);

    const { data: chainNarratives } = useQuery({
        queryKey: ["chain-narratives", chainId],
        queryFn: () => narrativeService.getByChain(chainId ?? ""),
        enabled: mode === "create" && !!chainId && isOverLimit,
        staleTime: 60_000,
    });

    // Accept CreateNarrativePayload directly so we can merge chain fields in onSubmit.
    const createMutation = useMutation({
        mutationFn: (payload: CreateNarrativePayload) =>
            narrativeService.createNarrative(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["creator-narratives"] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: NarrativeFormData) => {
            if (!initial) throw new Error("No narrative to update");
            return narrativeService.updateNarrative(initial.id, toUpdatePayload(data));
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["creator-narratives"] });
            await queryClient.invalidateQueries({
                queryKey: ["creator-narrative", initial?.id],
            });
        },
    });

    const onSubmit = async (data: NarrativeFormData) => {
        if (mode === "create") {
            const chainFields = attachSummary ? chainFieldsFromSummary(attachSummary) : {};
            const payload: CreateNarrativePayload = {
                ...toCreatePayload(data, pendingStatus),
                ...chainFields,
            };
            const promise = createMutation.mutateAsync(payload);

            toast.promise(promise, {
                loading: "Creating narrative…",
                success: "Narrative created!",
                error: (err: unknown) => {
                    const message = err instanceof Error ? err.message : "Something went wrong";
                    return `Failed: ${message}`;
                },
            });

            try {
                const narrative = await promise;
                onSaved(narrative);
                onClose();
            } catch (err: unknown) {
                // On 409, re-fetch the summary so the conflict notice updates.
                if (err && typeof err === "object" && "response" in err) {
                    const axiosErr = err as { response?: { status?: number } };
                    if (axiosErr.response?.status === 409) {
                        void refetchSummary();
                    }
                }
                // error handled by toast; keep modal open
            }
        } else {
            const promise = updateMutation.mutateAsync(data);

            toast.promise(promise, {
                loading: "Saving changes…",
                success: "Narrative updated!",
                error: (err: unknown) => {
                    const message = err instanceof Error ? err.message : "Something went wrong";
                    return `Failed: ${message}`;
                },
            });

            try {
                const narrative = await promise;
                onSaved(narrative);
                onClose();
            } catch {
                // error handled by toast; keep modal open
            }
        }
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingMedia(true);
        setUploadError(null);
        try {
            const result = await cloudinaryService.uploadImage(file, { folder: "narratives" });
            setValue("media", [...mediaUrls, result.secure_url]);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Upload failed";
            setUploadError(message);
        } finally {
            setUploadingMedia(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const removeMedia = (idx: number) => {
        setValue(
            "media",
            mediaUrls.filter((_, i) => i !== idx)
        );
    };

    if (!open) return null;

    // Resolve the label for the attach target display.
    // In edit mode: prefer the fetched title; fall back to the raw id while loading/on error.
    // For region attach_type (or any type without a lookup), show the raw attach_id.
    // In create mode: use the currently-selected item's id (label is set by the picker).
    let editLabel: string = editAttachId ?? "";
    if (initial?.attach_type === "marker" && resolvedMarker) {
        editLabel = resolvedMarker.title;
    } else if (initial?.attach_type === "quest" && resolvedQuest) {
        editLabel = resolvedQuest.title ?? (editAttachId ?? "");
    }

    const attachValue: AttachSelection | null = attachId
        ? {
              attach_type: attachType,
              attach_id: attachId,
              label: mode === "edit" ? editLabel : attachId,
          }
        : null;

    // Duration meter state
    const secs = estimateSeconds(content);
    const roundedSecs = Math.round(secs);
    const isAmber = secs >= 11 && secs <= MAX_SEGMENT_SECONDS;
    const meterColor = isOverLimit
        ? "text-orange-600"
        : isAmber
        ? "text-amber-600"
        : "text-neutral-500";

    // Safe first-element accessors for noUncheckedIndexedAccess compliance.
    const firstChain = attachSummary?.chains[0];
    const firstStandalone = attachSummary?.standalone[0];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-2xl shadow-2xl border-neutral-200 overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 shrink-0">
                    <h2 className="text-xl font-display font-semibold text-primary-900 tracking-tight">
                        {mode === "create" ? "Create Narrative" : "Edit Narrative"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable body */}
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="overflow-y-auto flex-1 px-6 py-5 space-y-5"
                    noValidate
                >
                    {/* Title */}
                    <Input
                        label="Title *"
                        placeholder="Enter narrative title"
                        error={errors.title?.message}
                        {...register("title")}
                    />

                    {/* Attach Target (disabled in edit — attachment immutable) */}
                    <Controller
                        control={control}
                        name="attach_id"
                        render={() => (
                            <AttachTargetSelect
                                value={attachValue}
                                disabled={mode === "edit"}
                                error={errors.attach_id?.message}
                                onChange={(sel) => {
                                    setValue("attach_type", sel.attach_type as "marker" | "quest");
                                    setValue("attach_id", sel.attach_id);
                                }}
                            />
                        )}
                    />

                    {/* Conflict notice (create mode only) — shows when there are existing narratives */}
                    {mode === "create" && attachSummary?.has_conflict && (
                        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                            <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                            <div className="flex-1 min-w-0">
                                {firstChain !== undefined ? (
                                    <p>
                                        Will be added as part #{firstChain.next_sequence_order} of &lsquo;
                                        {firstChain.label}&rsquo;.
                                    </p>
                                ) : firstStandalone !== undefined ? (
                                    <p>
                                        Will be chained after &lsquo;{firstStandalone.title}&rsquo;.
                                    </p>
                                ) : null}
                                <Link
                                    to={`/creator/narratives/view/${
                                        firstChain !== undefined
                                            ? firstChain.first_narrative_id
                                            : (firstStandalone?.id ?? "")
                                    }`}
                                    className="text-amber-700 underline text-xs mt-0.5 inline-block hover:text-amber-900"
                                    onClick={onClose}
                                >
                                    Edit existing instead
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Subtitle */}
                    <Input
                        label="Subtitle"
                        placeholder="Optional short subtitle"
                        error={errors.subtitle?.message}
                        {...register("subtitle")}
                    />

                    {/* Content */}
                    <div className="w-full">
                        <Textarea
                            label="Content"
                            placeholder="Write the narrative content (Markdown supported)…"
                            rows={6}
                            error={errors.content?.message}
                            {...register("content")}
                        />

                        {/* Duration meter — always shown when content is non-empty */}
                        {content.trim().length > 0 && (
                            <div className="mt-1 space-y-1">
                                <p className={`text-xs font-medium ${meterColor}`}>
                                    ~{roundedSecs}s / {MAX_SEGMENT_SECONDS}s
                                </p>
                                {isOverLimit && (
                                    <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
                                        This segment exceeds {MAX_SEGMENT_SECONDS} seconds. Consider splitting into a
                                        chain — each segment is linked via{" "}
                                        <span className="font-semibold">chain_id</span> and plays in sequence.
                                        {firstChain !== undefined && (
                                            <span className="block mt-1 text-orange-600">
                                                This will be added as part #{firstChain.next_sequence_order} of &lsquo;
                                                {firstChain.label}&rsquo;.
                                            </span>
                                        )}
                                        {/* Show existing chain segments when over limit */}
                                        {chainNarratives && chainNarratives.items.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                <p className="font-medium text-orange-700">
                                                    Existing segments in this chain:
                                                </p>
                                                <ol className="list-decimal list-inside space-y-0.5 text-orange-600">
                                                    {chainNarratives.items.map((n, idx) => (
                                                        <li key={n.id}>
                                                            <span className="font-medium">#{idx + 1}</span>{" "}
                                                            {n.title}
                                                            {n.audio_duration_s !== null && n.audio_duration_s !== undefined && (
                                                                <span className="ml-1 opacity-75">
                                                                    ({Math.round(n.audio_duration_s)}s)
                                                                </span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Voice Persona */}
                    <div className="w-full">
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                            Voice Persona
                        </label>
                        <Controller
                            control={control}
                            name="voice_persona"
                            render={({ field }) => (
                                <select
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === "" ? undefined : e.target.value)
                                    }
                                    className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 transition-colors disabled:bg-neutral-100"
                                >
                                    <option value="">No voice persona</option>
                                    {VOICE_PERSONAS.map((p) => (
                                        <option key={p} value={p}>
                                            {VOICE_PERSONA_LABELS[p] ?? p}
                                        </option>
                                    ))}
                                </select>
                            )}
                        />
                        {errors.voice_persona && (
                            <p className="mt-1.5 text-sm text-red-600">{errors.voice_persona.message}</p>
                        )}
                    </div>

                    {/* Media upload */}
                    <div className="w-full space-y-2">
                        <label className="block text-sm font-medium text-neutral-700">Media</label>
                        <div className="flex flex-wrap gap-2">
                            {mediaUrls.map((url, idx) => (
                                <div key={idx} className="relative group">
                                    <img
                                        src={url}
                                        alt={`media-${idx}`}
                                        className="w-20 h-20 object-cover rounded-lg border border-neutral-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeMedia(idx)}
                                        className="absolute top-1 right-1 p-0.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingMedia}
                                className="w-20 h-20 border-2 border-dashed border-neutral-300 rounded-lg flex flex-col items-center justify-center gap-1 text-neutral-400 hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50"
                            >
                                <Upload className="w-5 h-5" />
                                <span className="text-xs">
                                    {uploadingMedia ? "Uploading…" : "Add"}
                                </span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleMediaUpload}
                            />
                        </div>
                        {uploadError && (
                            <div className="flex items-center gap-2 text-sm text-red-600">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                {uploadError}
                            </div>
                        )}
                    </div>

                    {/* Toggles row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Is Mandatory */}
                        <Controller
                            control={control}
                            name="is_mandatory"
                            render={({ field }) => (
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={field.value}
                                        onClick={() => field.onChange(!field.value)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                                            field.value ? "bg-primary-600" : "bg-neutral-200"
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform mt-0.5 ${
                                                field.value ? "translate-x-5" : "translate-x-0.5"
                                            }`}
                                        />
                                    </button>
                                    <span className="text-sm text-neutral-700 font-medium">Mandatory</span>
                                </label>
                            )}
                        />

                        {/* Is Unlocked */}
                        <Controller
                            control={control}
                            name="is_unlocked"
                            render={({ field }) => (
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={field.value}
                                        onClick={() => field.onChange(!field.value)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                                            field.value ? "bg-primary-600" : "bg-neutral-200"
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform mt-0.5 ${
                                                field.value ? "translate-x-5" : "translate-x-0.5"
                                            }`}
                                        />
                                    </button>
                                    <span className="text-sm text-neutral-700 font-medium">Unlocked</span>
                                </label>
                            )}
                        />
                    </div>

                    {/* Sequence Order */}
                    <div className="w-full">
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                            Sequence Order
                        </label>
                        <Controller
                            control={control}
                            name="sequence_order"
                            render={({ field }) => (
                                <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    placeholder="e.g. 1"
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        field.onChange(val === "" ? undefined : parseInt(val, 10));
                                    }}
                                    className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 transition-colors"
                                />
                            )}
                        />
                        {errors.sequence_order && (
                            <p className="mt-1.5 text-sm text-red-600">{errors.sequence_order.message}</p>
                        )}
                    </div>

                    {/* Footer actions */}
                    <div className="flex gap-3 pt-2 pb-1">
                        <Button
                            type="button"
                            variant="ghost"
                            fullWidth
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        {mode === "create" ? (
                            <>
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    fullWidth
                                    isLoading={isSubmitting && pendingStatus === "draft"}
                                    disabled={isSubmitting}
                                    onClick={() => setPendingStatus("draft")}
                                >
                                    Save as Draft
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    fullWidth
                                    isLoading={isSubmitting && pendingStatus === "under_review"}
                                    disabled={isSubmitting}
                                    onClick={() => setPendingStatus("under_review")}
                                >
                                    Submit for Review
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                isLoading={isSubmitting}
                            >
                                Save Changes
                            </Button>
                        )}
                    </div>
                </form>
            </Card>
        </div>
    );
}

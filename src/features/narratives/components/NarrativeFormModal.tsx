import React, { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Upload, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea, Card } from "@components/ui";
import { narrativeService } from "@services/narrative.service";
import { cloudinaryService } from "@services/cloudinary.service";
import { AttachTargetSelect } from "./AttachTargetSelect";
import type { AttachSelection } from "./AttachTargetSelect";
import {
    narrativeFormSchema,
    toCreatePayload,
    toUpdatePayload,
    VOICE_PERSONAS,
} from "../schemas/narrative.schema";
import type { NarrativeFormData } from "../schemas/narrative.schema";
import type { Narrative } from "@/types";

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

    const createMutation = useMutation({
        mutationFn: (data: NarrativeFormData) =>
            narrativeService.createNarrative(toCreatePayload(data)),
        onSuccess: async (narrative) => {
            await queryClient.invalidateQueries({ queryKey: ["creator-narratives"] });
            onSaved(narrative);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: NarrativeFormData) => {
            if (!initial) throw new Error("No narrative to update");
            return narrativeService.updateNarrative(initial.id, toUpdatePayload(data));
        },
        onSuccess: async (narrative) => {
            await queryClient.invalidateQueries({ queryKey: ["creator-narratives"] });
            await queryClient.invalidateQueries({
                queryKey: ["creator-narrative", initial?.id],
            });
            onSaved(narrative);
        },
    });

    const onSubmit = (data: NarrativeFormData) => {
        const mutation = mode === "create" ? createMutation : updateMutation;
        const promise = mutation.mutateAsync(data);

        toast.promise(promise, {
            loading: mode === "create" ? "Creating narrative…" : "Saving changes…",
            success: mode === "create" ? "Narrative created!" : "Narrative updated!",
            error: (err: unknown) => {
                const message = err instanceof Error ? err.message : "Something went wrong";
                return `Failed: ${message}`;
            },
        });
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

    const attachValue: AttachSelection | null =
        watch("attach_id")
            ? {
                  attach_type: watch("attach_type"),
                  attach_id: watch("attach_id"),
                  label: initial
                      ? `${initial.attach_type}: ${initial.attach_id}`
                      : watch("attach_id"),
              }
            : null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-2xl shadow-2xl border-slate-200 overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <h2 className="text-xl font-bold text-slate-900">
                        {mode === "create" ? "Create Narrative" : "Edit Narrative"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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

                    {/* Subtitle */}
                    <Input
                        label="Subtitle"
                        placeholder="Optional short subtitle"
                        error={errors.subtitle?.message}
                        {...register("subtitle")}
                    />

                    {/* Content */}
                    <Textarea
                        label="Content"
                        placeholder="Write the narrative content (Markdown supported)…"
                        rows={6}
                        error={errors.content?.message}
                        {...register("content")}
                    />

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
                                    className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-colors disabled:bg-neutral-100"
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
                                className="w-20 h-20 border-2 border-dashed border-neutral-300 rounded-lg flex flex-col items-center justify-center gap-1 text-neutral-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors disabled:opacity-50"
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
                                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                            field.value ? "bg-indigo-600" : "bg-neutral-200"
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
                                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                            field.value ? "bg-indigo-600" : "bg-neutral-200"
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
                                    className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-colors"
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
                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            isLoading={isSubmitting}
                        >
                            {mode === "create" ? "Create Narrative" : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

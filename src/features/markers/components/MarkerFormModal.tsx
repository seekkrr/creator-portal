import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Upload, Loader2, AlertTriangle } from "lucide-react";
import { Card, Button, Input, Textarea } from "@components/ui";
import { markerService } from "@services/marker.service";
import { cloudinaryService } from "@services/cloudinary.service";
import { MarkerMapPicker } from "./MarkerMapPicker";
import { markerFormSchema, toCreatePayload, toUpdatePayload } from "../schemas/marker.schema";
import type { MarkerFormData } from "../schemas/marker.schema";
import type { Marker } from "@/types";

interface MarkerFormModalProps {
    open: boolean;
    mode: "create" | "edit";
    initial?: Marker;
    onClose: () => void;
    onSaved: (marker: Marker) => void;
}

/** Map a persisted Marker to the flat form shape for prefill. */
function markerToFormData(m: Marker): Partial<MarkerFormData> {
    return {
        title: m.title,
        category: m.category ?? "",
        description: m.description ?? "",
        address: m.address ?? "",
        contact: m.contact ?? "",
        website_url: m.website_url ?? "",
        map_url: m.map_url ?? "",
        things_to_do_text: m.things_to_do_text ?? "",
        things_to_do_image_url: m.things_to_do_image_url ?? "",
        tags: m.tags ?? [],
        media: m.media ?? [],
        min_expense: m.min_expense ?? undefined,
        max_expense: m.max_expense ?? undefined,
        opens_at: m.opens_at ?? "",
        closes_at: m.closes_at ?? "",
        region_id: m.region_id ?? "",
        longitude: m.location?.coordinates?.[0],
        latitude: m.location?.coordinates?.[1],
    };
}

const DEFAULT_VALUES: Partial<MarkerFormData> = {
    title: "",
    category: "",
    description: "",
    address: "",
    contact: "",
    website_url: "",
    map_url: "",
    things_to_do_text: "",
    things_to_do_image_url: "",
    tags: [],
    media: [],
    opens_at: "",
    closes_at: "",
    region_id: "",
};

export function MarkerFormModal({ open, mode, initial, onClose, onSaved }: MarkerFormModalProps) {
    const [tagInput, setTagInput] = useState("");
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<MarkerFormData>({
        resolver: zodResolver(markerFormSchema),
        defaultValues: DEFAULT_VALUES,
    });

    // Prefill when editing or reset when creating
    useEffect(() => {
        if (!open) return;
        if (mode === "edit" && initial) {
            reset({ ...DEFAULT_VALUES, ...markerToFormData(initial) });
        } else {
            reset(DEFAULT_VALUES);
        }
        setTagInput("");
    }, [open, mode, initial, reset]);

    const longitude = watch("longitude");
    const latitude = watch("latitude");
    const tags = watch("tags");
    const media = watch("media");

    const createMutation = useMutation({
        mutationFn: (payload: ReturnType<typeof toCreatePayload>) =>
            markerService.createMarker(payload),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof toUpdatePayload> }) =>
            markerService.updateMarker(id, payload),
    });

    const onSubmit = (data: MarkerFormData) => {
        if (mode === "create") {
            const promise = createMutation.mutateAsync(toCreatePayload(data));
            toast.promise(promise, {
                loading: "Creating marker…",
                success: "Marker created!",
                error: "Failed to create marker",
            });
            promise.then((marker) => {
                onSaved(marker);
                onClose();
            }).catch(() => {
                // error handled by toast
            });
        } else {
            if (!initial?.id) return;
            const promise = updateMutation.mutateAsync({
                id: initial.id,
                payload: toUpdatePayload(data),
            });
            toast.promise(promise, {
                loading: "Saving marker…",
                success: "Marker updated!",
                error: "Failed to update marker",
            });
            promise.then((marker) => {
                onSaved(marker);
                onClose();
            }).catch(() => {
                // error handled by toast
            });
        }
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploadingMedia(true);
        try {
            const uploads = Array.from(files).map((file) =>
                cloudinaryService.uploadImage(file, { folder: "markers" })
            );
            const results = await Promise.all(uploads);
            const newUrls = results.map((r) => r.secure_url);
            setValue("media", [...(media ?? []), ...newUrls]);
        } catch {
            toast.error("Failed to upload image");
        } finally {
            setUploadingMedia(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removeMedia = (url: string) => {
        setValue("media", (media ?? []).filter((u) => u !== url));
    };

    const addTag = () => {
        const raw = tagInput.trim();
        if (!raw) return;
        const newTags = raw
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0 && !(tags ?? []).includes(t));
        if (newTags.length > 0) {
            setValue("tags", [...(tags ?? []), ...newTags]);
        }
        setTagInput("");
    };

    const removeTag = (tag: string) => {
        setValue("tags", (tags ?? []).filter((t) => t !== tag));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
        }
    };

    if (!open) return null;

    const isBusy = isSubmitting || createMutation.isPending || updateMutation.isPending;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <Card className="w-full max-w-3xl my-8 shadow-2xl border-slate-200 overflow-hidden animate-scale-up">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-slate-900">
                        {mode === "create" ? "Create New Marker" : "Edit Marker"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="p-6 space-y-6">

                        {/* ── Section: Basic Info ── */}
                        <section>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                Basic Info
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Title <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        {...register("title")}
                                        placeholder="e.g. Gateway of India"
                                        className={errors.title ? "border-red-400" : ""}
                                    />
                                    {errors.title && (
                                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> {errors.title.message}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Category
                                    </label>
                                    <Input
                                        {...register("category")}
                                        placeholder="e.g. Landmark, Cafe, Museum"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Description
                                    </label>
                                    <Textarea
                                        {...register("description")}
                                        placeholder="Brief description of this marker…"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* ── Section: Location ── */}
                        <section>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                Location {mode === "create" && <span className="text-red-500">*</span>}
                            </h3>
                            {mode === "edit" && (
                                <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Location cannot be changed after creation.
                                </p>
                            )}
                            <MarkerMapPicker
                                value={
                                    longitude !== undefined && latitude !== undefined
                                        ? { lng: longitude, lat: latitude }
                                        : null
                                }
                                onChange={({ lng, lat }) => {
                                    setValue("longitude", lng, { shouldValidate: true });
                                    setValue("latitude", lat, { shouldValidate: true });
                                }}
                            />
                            {errors.longitude && (
                                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {errors.longitude.message}
                                </p>
                            )}
                            {errors.latitude && !errors.longitude && (
                                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {errors.latitude.message}
                                </p>
                            )}
                        </section>

                        {/* ── Section: Contact & URLs ── */}
                        <section>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                Contact &amp; Links
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Address
                                    </label>
                                    <Input {...register("address")} placeholder="Street address…" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Contact
                                    </label>
                                    <Input {...register("contact")} placeholder="Phone / email…" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Website URL
                                    </label>
                                    <Input
                                        {...register("website_url")}
                                        placeholder="https://example.com"
                                        className={errors.website_url ? "border-red-400" : ""}
                                    />
                                    {errors.website_url && (
                                        <p className="mt-1 text-xs text-red-600">{errors.website_url.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Map URL
                                    </label>
                                    <Input
                                        {...register("map_url")}
                                        placeholder="https://maps.google.com/…"
                                        className={errors.map_url ? "border-red-400" : ""}
                                    />
                                    {errors.map_url && (
                                        <p className="mt-1 text-xs text-red-600">{errors.map_url.message}</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* ── Section: Things To Do ── */}
                        <section>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                Things To Do
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Description
                                    </label>
                                    <Textarea
                                        {...register("things_to_do_text")}
                                        placeholder="What can visitors do here?"
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Image URL
                                    </label>
                                    <Input
                                        {...register("things_to_do_image_url")}
                                        placeholder="https://…"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* ── Section: Expenses & Hours ── */}
                        <section>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                Expenses &amp; Hours
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Min Expense (₹)
                                    </label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        {...register("min_expense", { valueAsNumber: true })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Max Expense (₹)
                                    </label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        {...register("max_expense", { valueAsNumber: true })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Opens At
                                    </label>
                                    <Input
                                        {...register("opens_at")}
                                        placeholder="09:00"
                                        className={errors.opens_at ? "border-red-400" : ""}
                                    />
                                    {errors.opens_at && (
                                        <p className="mt-1 text-xs text-red-600">{errors.opens_at.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Closes At
                                    </label>
                                    <Input
                                        {...register("closes_at")}
                                        placeholder="21:00"
                                        className={errors.closes_at ? "border-red-400" : ""}
                                    />
                                    {errors.closes_at && (
                                        <p className="mt-1 text-xs text-red-600">{errors.closes_at.message}</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* ── Section: Tags ── */}
                        <section>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                Tags
                            </h3>
                            <div className="flex gap-2">
                                <Input
                                    value={tagInput}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setTagInput(e.target.value)
                                    }
                                    onKeyDown={handleTagKeyDown}
                                    placeholder="Type tag and press Enter or comma"
                                    className="flex-1"
                                />
                                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                                    Add
                                </Button>
                            </div>
                            {tags && tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="text-indigo-400 hover:text-indigo-700"
                                                aria-label={`Remove tag ${tag}`}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* ── Section: Media ── */}
                        <section>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                Media
                            </h3>
                            <div className="space-y-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleMediaUpload}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    isLoading={uploadingMedia}
                                    leftIcon={<Upload className="w-4 h-4" />}
                                    disabled={uploadingMedia}
                                >
                                    {uploadingMedia ? "Uploading…" : "Upload Images"}
                                </Button>

                                {media && media.length > 0 && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {media.map((url) => (
                                            <div key={url} className="relative group rounded-lg overflow-hidden aspect-square bg-slate-100">
                                                <img
                                                    src={url}
                                                    alt="Marker media"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeMedia(url)}
                                                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    aria-label="Remove image"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                        <Button
                            type="button"
                            variant="ghost"
                            fullWidth
                            onClick={onClose}
                            disabled={isBusy}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            isLoading={isBusy}
                            disabled={isBusy}
                        >
                            {mode === "create" ? "Create Marker" : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Spinning overlay while uploading media */}
            {uploadingMedia && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/30">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
            )}
        </div>
    );
}

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Card, Button, Input, Textarea } from "@components/ui";
import { eventService } from "@services/event.service";
import { eventFormSchema, toCreatePayload, toUpdatePayload } from "../schemas/event.schema";
import type { EventFormData } from "../schemas/event.schema";
import type { EventDetail, EventVenue, EventScheduleDay, EventSession } from "@/types";

interface EventFormModalProps {
    open: boolean;
    mode: "create" | "edit";
    initial?: EventDetail;
    onClose: () => void;
    onSaved: (event: EventDetail) => void;
}

/** ISO datetime → "YYYY-MM-DDTHH:MM" for a datetime-local input. */
function isoToLocalInput(v: string | null | undefined): string {
    if (!v) return "";
    return v.length >= 16 ? v.slice(0, 16) : v;
}

const DEFAULT_VALUES: Partial<EventFormData> = {
    title: "",
    subtitle: "",
    description: "",
    categories: [],
    cover_image_url: "",
    start_date: "",
    end_date: "",
    region_id: "",
    is_featured: false,
};

function eventToFormData(e: EventDetail): Partial<EventFormData> {
    return {
        title: e.title,
        subtitle: e.subtitle ?? "",
        description: e.description ?? "",
        categories: e.categories ?? [],
        cover_image_url: e.media?.cover_image_url ?? "",
        start_date: isoToLocalInput(e.start_date),
        end_date: isoToLocalInput(e.end_date),
        region_id: e.region_id ?? "",
        capacity: e.capacity ?? undefined,
        is_featured: e.is_featured ?? false,
    };
}

export function EventFormModal({ open, mode, initial, onClose, onSaved }: EventFormModalProps) {
    const [categoryInput, setCategoryInput] = useState("");
    // Venues & schedule are nested/dynamic — managed as local state (not RHF)
    // and merged into the payload on submit.
    const [venues, setVenues] = useState<EventVenue[]>([]);
    const [schedule, setSchedule] = useState<EventScheduleDay[]>([]);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<EventFormData>({
        resolver: zodResolver(eventFormSchema),
        defaultValues: DEFAULT_VALUES,
    });

    useEffect(() => {
        if (!open) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = original; };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (mode === "edit" && initial) {
            reset({ ...DEFAULT_VALUES, ...eventToFormData(initial) });
            setVenues(initial.venues ?? []);
            setSchedule(initial.schedule ?? []);
        } else {
            reset(DEFAULT_VALUES);
            setVenues([]);
            setSchedule([]);
        }
        setCategoryInput("");
    }, [open, mode, initial, reset]);

    // ── Venue editor helpers ──
    const addVenue = () => setVenues((v) => [...v, { marker_id: "", name: "", category: "" }]);
    const updateVenue = (i: number, patch: Partial<EventVenue>) =>
        setVenues((v) => v.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    const removeVenue = (i: number) => setVenues((v) => v.filter((_, idx) => idx !== i));

    // ── Schedule editor helpers ──
    const addDay = () => setSchedule((s) => [...s, { label: `Day ${s.length + 1}`, sessions: [] }]);
    const updateDay = (i: number, patch: Partial<EventScheduleDay>) =>
        setSchedule((s) => s.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
    const removeDay = (i: number) => setSchedule((s) => s.filter((_, idx) => idx !== i));
    const addSession = (dayIdx: number) =>
        setSchedule((s) => s.map((d, idx) => (idx === dayIdx ? { ...d, sessions: [...d.sessions, { title: "" }] } : d)));
    const updateSession = (dayIdx: number, sIdx: number, patch: Partial<EventSession>) =>
        setSchedule((s) => s.map((d, idx) =>
            idx === dayIdx ? { ...d, sessions: d.sessions.map((ss, j) => (j === sIdx ? { ...ss, ...patch } : ss)) } : d
        ));
    const removeSession = (dayIdx: number, sIdx: number) =>
        setSchedule((s) => s.map((d, idx) =>
            idx === dayIdx ? { ...d, sessions: d.sessions.filter((_, j) => j !== sIdx) } : d
        ));

    /** Drop empty rows so we never persist blank venues/sessions. */
    const cleanVenues = (): EventVenue[] =>
        venues.filter((v) => (v.name && v.name.trim()) || (v.marker_id && v.marker_id.trim()));
    const cleanSchedule = (): EventScheduleDay[] =>
        schedule
            .map((d) => ({ ...d, sessions: d.sessions.filter((ss) => ss.title && ss.title.trim()) }))
            .filter((d) => d.sessions.length > 0 || (d.label && d.label.trim()));

    const categories = watch("categories");

    const addCategory = () => {
        const raw = categoryInput.trim();
        if (!raw) return;
        const next = raw.split(",").map((c) => c.trim()).filter((c) => c && !(categories ?? []).includes(c));
        if (next.length) setValue("categories", [...(categories ?? []), ...next]);
        setCategoryInput("");
    };

    const removeCategory = (c: string) =>
        setValue("categories", (categories ?? []).filter((x) => x !== c));

    const createMutation = useMutation({
        mutationFn: (payload: ReturnType<typeof toCreatePayload>) => eventService.createEvent(payload),
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof toUpdatePayload> }) =>
            eventService.updateEvent(id, payload),
    });

    const onSubmit = async (data: EventFormData) => {
        const venuesPayload = cleanVenues();
        const schedulePayload = cleanSchedule();
        try {
            if (mode === "create") {
                const promise = createMutation.mutateAsync({
                    ...toCreatePayload(data),
                    ...(venuesPayload.length ? { venues: venuesPayload } : {}),
                    ...(schedulePayload.length ? { schedule: schedulePayload } : {}),
                });
                toast.promise(promise, { loading: "Creating event…", success: "Event created!", error: "Failed to create event" });
                onSaved(await promise);
                onClose();
            } else {
                if (!initial?.id) return;
                const promise = updateMutation.mutateAsync({
                    id: initial.id,
                    payload: {
                        ...toUpdatePayload(data),
                        venues: venuesPayload,
                        schedule: schedulePayload,
                    },
                });
                toast.promise(promise, { loading: "Saving event…", success: "Event updated!", error: "Failed to update event" });
                onSaved(await promise);
                onClose();
            }
        } catch {
            // toast already surfaced the error; keep the modal open.
        }
    };

    if (!open) return null;

    const isBusy = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-2xl shadow-2xl border-neutral-200 overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-white shrink-0">
                    <h2 className="text-xl font-bold text-neutral-900">
                        {mode === "create" ? "Create New Event" : "Edit Event"}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100" aria-label="Close modal">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex-1 flex flex-col min-h-0">
                    <div className="p-6 space-y-5 bg-neutral-50 overflow-y-auto flex-1">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <Input {...register("title")} placeholder="e.g. Hornbill Festival" className={errors.title ? "border-red-400" : ""} />
                            {errors.title && (
                                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {errors.title.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Subtitle</label>
                            <Input {...register("subtitle")} placeholder="e.g. Music, Culture, Heritage" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                            <Textarea {...register("description")} rows={4} placeholder="What is this festival about?" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Start</label>
                                <Input type="datetime-local" {...register("start_date")} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">End</label>
                                <Input type="datetime-local" {...register("end_date")} className={errors.end_date ? "border-red-400" : ""} />
                                {errors.end_date && <p className="mt-1 text-xs text-red-600">{errors.end_date.message}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Categories</label>
                            <div className="flex gap-2">
                                <Input
                                    value={categoryInput}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategoryInput(e.target.value)}
                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                        if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addCategory(); }
                                    }}
                                    placeholder="Type and press Enter"
                                    className="flex-1"
                                />
                                <Button type="button" variant="outline" size="sm" onClick={addCategory}>Add</Button>
                            </div>
                            {categories && categories.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {categories.map((c) => (
                                        <span key={c} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary-50 text-primary-700 border border-primary-200 rounded-full text-xs font-medium">
                                            {c}
                                            <button type="button" onClick={() => removeCategory(c)} className="text-primary-400 hover:text-primary-700" aria-label={`Remove ${c}`}>
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Cover Image URL</label>
                            <Input {...register("cover_image_url")} placeholder="https://…" className={errors.cover_image_url ? "border-red-400" : ""} />
                            {errors.cover_image_url && <p className="mt-1 text-xs text-red-600">{errors.cover_image_url.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Region ID</label>
                                <Input {...register("region_id")} placeholder="Optional region id" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Capacity</label>
                                <Input type="number" min={0} placeholder="Unlimited" {...register("capacity", { valueAsNumber: true })} />
                            </div>
                        </div>

                        {/* ── Venues ── */}
                        <div className="rounded-xl border border-neutral-200 bg-white p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Venues / Stages</h3>
                                <Button type="button" variant="outline" size="sm" onClick={addVenue} leftIcon={<Plus className="w-3.5 h-3.5" />}>Add</Button>
                            </div>
                            {venues.length === 0 ? (
                                <p className="text-xs text-neutral-400">No venues yet. Add stages, food courts, gates…</p>
                            ) : (
                                <div className="space-y-2">
                                    {venues.map((v, i) => (
                                        <div key={i} className="flex gap-2 items-start">
                                            <Input value={v.name ?? ""} placeholder="Name (e.g. Main Stage)"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVenue(i, { name: e.target.value })}
                                                className="flex-1" />
                                            <Input value={v.category ?? ""} placeholder="Category"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVenue(i, { category: e.target.value })}
                                                className="w-32" />
                                            <Input value={v.marker_id ?? ""} placeholder="Marker ID (optional)"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVenue(i, { marker_id: e.target.value })}
                                                className="w-40" />
                                            <button type="button" onClick={() => removeVenue(i)} className="p-2 text-neutral-400 hover:text-red-600" aria-label="Remove venue">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Schedule ── */}
                        <div className="rounded-xl border border-neutral-200 bg-white p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Schedule</h3>
                                <Button type="button" variant="outline" size="sm" onClick={addDay} leftIcon={<Plus className="w-3.5 h-3.5" />}>Add Day</Button>
                            </div>
                            {schedule.length === 0 ? (
                                <p className="text-xs text-neutral-400">No schedule yet. Add days, then sessions within each day.</p>
                            ) : (
                                <div className="space-y-4">
                                    {schedule.map((d, di) => (
                                        <div key={di} className="rounded-lg border border-neutral-200 p-3">
                                            <div className="flex gap-2 items-center mb-2">
                                                <Input value={d.label ?? ""} placeholder="Day label (e.g. Day 1)"
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDay(di, { label: e.target.value })}
                                                    className="flex-1" />
                                                <button type="button" onClick={() => removeDay(di)} className="p-2 text-neutral-400 hover:text-red-600" aria-label="Remove day">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="space-y-2 pl-2">
                                                {d.sessions.map((ss, si) => (
                                                    <div key={si} className="flex gap-2 items-start">
                                                        <Input value={ss.title} placeholder="Session / act title"
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(di, si, { title: e.target.value })}
                                                            className="flex-1" />
                                                        <Input value={ss.stage ?? ""} placeholder="Stage"
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(di, si, { stage: e.target.value })}
                                                            className="w-28" />
                                                        <Input type="datetime-local" value={ss.start_time ? ss.start_time.slice(0, 16) : ""}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(di, si, { start_time: e.target.value })}
                                                            className="w-48" />
                                                        <button type="button" onClick={() => removeSession(di, si)} className="p-2 text-neutral-400 hover:text-red-600" aria-label="Remove session">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <Button type="button" variant="ghost" size="sm" onClick={() => addSession(di)} leftIcon={<Plus className="w-3.5 h-3.5" />}>Add session</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <label className="flex items-center gap-2 text-sm text-neutral-700">
                            <input type="checkbox" {...register("is_featured")} className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                            Featured event
                        </label>
                    </div>

                    <div className="flex gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50 shrink-0">
                        <Button type="button" variant="ghost" fullWidth onClick={onClose} disabled={isBusy}>Cancel</Button>
                        <Button type="submit" variant="primary" fullWidth isLoading={isBusy} disabled={isBusy}>
                            {mode === "create" ? "Create Event" : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

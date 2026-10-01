import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, AlertTriangle, Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { Card, Button, Input, Textarea } from "@components/ui";
import { eventService } from "@services/event.service";
import { cloudinaryService } from "@services/cloudinary.service";
import { markerService } from "@services/marker.service";
import { eventFormSchema, toCreatePayload, toUpdatePayload } from "../schemas/event.schema";
import type { EventFormData } from "../schemas/event.schema";
import type { EventDetail, EventVenue, EventScheduleDay, EventSession, EventMapFilter, TravelInfo, EventStatus } from "@/types";

interface EventFormModalProps {
    open: boolean;
    mode: "create" | "edit";
    initial?: EventDetail;
    onClose: () => void;
    onSaved: (event: EventDetail) => void;
}

type TabKey = "details" | "media" | "map" | "travel" | "schedule";

/** ISO datetime → "YYYY-MM-DDTHH:MM" for a datetime-local input. */
function isoToLocalInput(v: string | null | undefined): string {
    if (!v) return "";
    return v.length >= 16 ? v.slice(0, 16) : v;
}

const numStr = (n: unknown): string =>
    typeof n === "number" && Number.isFinite(n) ? String(n) : "";

const DEFAULT_VALUES: Partial<EventFormData> = {
    title: "",
    subtitle: "",
    description: "",
    categories: [],
    cover_image_url: "",
    start_date: "",
    end_date: "",
    timezone: "Asia/Kolkata",
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
        timezone: e.timezone ?? "Asia/Kolkata",
        region_id: e.region_id ?? "",
        capacity: e.capacity ?? undefined,
        is_featured: e.is_featured ?? false,
    };
}

export function EventFormModal({ open, mode, initial, onClose, onSaved }: EventFormModalProps) {
    const [tab, setTab] = useState<TabKey>("details");
    const [categoryInput, setCategoryInput] = useState("");
    // Nested/dynamic data — managed as local state (not RHF) and merged on submit.
    const [venues, setVenues] = useState<EventVenue[]>([]);
    const [schedule, setSchedule] = useState<EventScheduleDay[]>([]);
    const [mapFilters, setMapFilters] = useState<EventMapFilter[]>([]);
    const [travel, setTravel] = useState<TravelInfo>({});
    const [gallery, setGallery] = useState<string[]>([]);
    const [coverUploading, setCoverUploading] = useState(false);
    const [galleryUploading, setGalleryUploading] = useState(false);

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

    // The creator's own markers — venues are linked by picking from these rather
    // than typing a raw marker id.
    const { data: myMarkersData } = useQuery({
        queryKey: ["creator-markers-for-events"],
        queryFn: () => markerService.listMarkers({ mine: true, page: 1, page_size: 200 }),
        enabled: open,
        staleTime: 60_000,
    });
    const myMarkers = myMarkersData?.items ?? [];

    useEffect(() => {
        if (!open) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = original; };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        setTab("details");
        if (mode === "edit" && initial) {
            reset({ ...DEFAULT_VALUES, ...eventToFormData(initial) });
            setVenues(initial.venues ?? []);
            setSchedule(initial.schedule ?? []);
            setMapFilters(initial.map_filters ?? []);
            setTravel((initial.travel_info as TravelInfo) ?? {});
            setGallery(initial.media?.image_urls ?? []);
        } else {
            reset(DEFAULT_VALUES);
            setVenues([]);
            setSchedule([]);
            setMapFilters([]);
            setTravel({});
            setGallery([]);
        }
        setCategoryInput("");
    }, [open, mode, initial, reset]);

    // ── Map filter helpers ──
    const addFilter = () => setMapFilters((f) => [...f, { key: "", label: "", icon: "", color: "#FECD36" }]);
    const updateFilter = (i: number, patch: Partial<EventMapFilter>) =>
        setMapFilters((f) => f.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    const removeFilter = (i: number) => setMapFilters((f) => f.filter((_, idx) => idx !== i));
    const uploadFilterIcon = (i: number, file: File) => {
        const p = cloudinaryService
            .uploadImage(file, { folder: "creator-portal/event-pins" })
            .then((res) => { updateFilter(i, { icon: res.secure_url }); return res; });
        toast.promise(p, { loading: "Uploading icon…", success: "Icon uploaded", error: "Icon upload failed" });
    };
    const isIconUrl = (s?: string | null) => !!s && /^https?:\/\//.test(s);

    // ── Travel helpers ──
    const cabs = travel.cabs ?? [];
    const setTravelField = (k: keyof TravelInfo, v: string) => setTravel((t) => ({ ...t, [k]: v }));
    const addCab = () => setTravel((t) => ({ ...t, cabs: [...(t.cabs ?? []), { name: "" }] }));
    const updateCab = (i: number, patch: Partial<{ name: string; contact: string; fare: string }>) =>
        setTravel((t) => ({ ...t, cabs: (t.cabs ?? []).map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }));
    const removeCab = (i: number) =>
        setTravel((t) => ({ ...t, cabs: (t.cabs ?? []).filter((_, idx) => idx !== i) }));

    // ── Media helpers (upload to S3 → CDN via the media presign broker) ──
    const removeGallery = (i: number) => setGallery((g) => g.filter((_, idx) => idx !== i));
    const uploadCover = async (file: File) => {
        setCoverUploading(true);
        try {
            const res = await cloudinaryService.uploadImage(file, { folder: "events" });
            setValue("cover_image_url", res.secure_url, { shouldValidate: true });
        } catch {
            toast.error("Cover upload failed");
        } finally {
            setCoverUploading(false);
        }
    };
    const uploadGalleryFiles = async (files: FileList) => {
        setGalleryUploading(true);
        try {
            const results = await Promise.all(
                Array.from(files).map((f) => cloudinaryService.uploadImage(f, { folder: "events/gallery" }))
            );
            setGallery((g) => [...g, ...results.map((r) => r.secure_url)]);
        } catch {
            toast.error("Image upload failed");
        } finally {
            setGalleryUploading(false);
        }
    };

    // ── Venue helpers ──
    const addVenue = () => setVenues((v) => [...v, { marker_id: "", name: "", category: "" }]);
    const updateVenue = (i: number, patch: Partial<EventVenue>) =>
        setVenues((v) => v.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    const removeVenue = (i: number) => setVenues((v) => v.filter((_, idx) => idx !== i));
    const setVenueCoord = (i: number, axis: "lng" | "lat", raw: string) =>
        setVenues((vs) => vs.map((x, idx) => {
            if (idx !== i) return x;
            const curLng = x.coordinates?.[0];
            const curLat = x.coordinates?.[1];
            const lng = axis === "lng" ? raw : numStr(curLng);
            const lat = axis === "lat" ? raw : numStr(curLat);
            if (lng === "" && lat === "") return { ...x, coordinates: null };
            return { ...x, coordinates: [lng === "" ? NaN : Number(lng), lat === "" ? NaN : Number(lat)] };
        }));

    // ── Schedule helpers ──
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

    // ── Payload cleaners ──
    const cleanMapFilters = (): EventMapFilter[] =>
        mapFilters
            .filter((f) => (f.label && f.label.trim()) || (f.key && f.key.trim()))
            .map((f) => ({ ...f, key: (f.key || f.label || "").trim().toLowerCase().replace(/\s+/g, "-") }));

    const cleanTravel = (): Record<string, unknown> => {
        const t: TravelInfo = {};
        if (travel.by_air?.trim()) t.by_air = travel.by_air.trim();
        if (travel.by_rail?.trim()) t.by_rail = travel.by_rail.trim();
        if (travel.by_road?.trim()) t.by_road = travel.by_road.trim();
        const c = (travel.cabs ?? []).filter((x) => x.name && x.name.trim());
        if (c.length) t.cabs = c;
        return t as Record<string, unknown>;
    };

    const cleanVenues = (): EventVenue[] =>
        venues
            .filter((v) => (v.name && v.name.trim()) || (v.marker_id && v.marker_id.trim()))
            .map((v) => {
                const coords = v.coordinates && v.coordinates.length === 2 && v.coordinates.every((n) => Number.isFinite(n))
                    ? v.coordinates
                    : undefined;
                const out: EventVenue = { ...v, coordinates: coords ?? null };
                return out;
            });

    const cleanSchedule = (): EventScheduleDay[] =>
        schedule
            .map((d) => ({ ...d, sessions: d.sessions.filter((ss) => ss.title && ss.title.trim()) }))
            .filter((d) => d.sessions.length > 0 || (d.label && d.label.trim()));

    const buildMedia = (cover: string | undefined): Partial<{ cover_image_url: string; image_urls: string[] }> => {
        const m: { cover_image_url?: string; image_urls?: string[] } = {};
        if (cover && cover.trim()) m.cover_image_url = cover.trim();
        const imgs = gallery.map((s) => s.trim()).filter(Boolean);
        if (imgs.length) m.image_urls = imgs;
        return m;
    };

    /** Derive a bounding box from venue coordinates so the app can frame + lock the map. */
    const buildBoundingBox = (vs: EventVenue[]): Record<string, unknown> | undefined => {
        const pts = vs.map((v) => v.coordinates).filter((c): c is number[] => !!c && c.length === 2);
        if (!pts.length) return undefined;
        const lngs = pts.map((p) => p[0]).filter((n): n is number => Number.isFinite(n));
        const lats = pts.map((p) => p[1]).filter((n): n is number => Number.isFinite(n));
        if (!lngs.length || !lats.length) return undefined;
        const pad = 0.01;
        return {
            min: [Math.min(...lngs) - pad, Math.min(...lats) - pad],
            max: [Math.max(...lngs) + pad, Math.max(...lats) + pad],
        };
    };

    const categories = watch("categories");
    const coverUrl = watch("cover_image_url");

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

    // Save the form, then set the event's status: "draft" (keep working) or
    // "pending" (submit for admin review). Admins approve pending → published.
    const submit = (intent: "draft" | "review") => async (data: EventFormData) => {
        const venuesPayload = cleanVenues();
        const schedulePayload = cleanSchedule();
        const filtersPayload = cleanMapFilters();
        const travelPayload = cleanTravel();
        const mediaPayload = buildMedia(data.cover_image_url);
        const bbox = buildBoundingBox(venuesPayload);
        const extras = {
            ...(venuesPayload.length ? { venues: venuesPayload } : {}),
            ...(schedulePayload.length ? { schedule: schedulePayload } : {}),
            ...(filtersPayload.length ? { map_filters: filtersPayload } : {}),
            ...(Object.keys(travelPayload).length ? { travel_info: travelPayload } : {}),
            ...(Object.keys(mediaPayload).length ? { media: mediaPayload } : {}),
            ...(bbox ? { bounding_box: bbox } : {}),
        };
        const targetStatus: EventStatus = intent === "review" ? "pending" : "draft";
        try {
            let saved: EventDetail;
            if (mode === "create") {
                saved = await createMutation.mutateAsync({ ...toCreatePayload(data), ...extras });
            } else {
                if (!initial?.id) return;
                saved = await updateMutation.mutateAsync({
                    id: initial.id,
                    payload: {
                        ...toUpdatePayload(data),
                        // Always send these on edit so clearing them persists.
                        venues: venuesPayload,
                        schedule: schedulePayload,
                        map_filters: filtersPayload,
                        travel_info: travelPayload,
                        media: mediaPayload,
                        ...(bbox ? { bounding_box: bbox } : {}),
                    },
                });
            }
            // Apply the chosen status unless the event is already live/published
            // (don't silently demote a published event when the owner edits it).
            const keep = saved.status === "published" || saved.status === "live" || saved.status === "ended";
            if (!keep && saved.status !== targetStatus) {
                try { saved = await eventService.setStatus(saved.id, targetStatus); } catch { /* keep saved */ }
            }
            toast.success(intent === "review" ? "Submitted for review" : "Saved as draft");
            onSaved(saved);
            onClose();
        } catch {
            toast.error(mode === "create" ? "Failed to create event" : "Failed to save event");
        }
    };

    const onInvalid = () => {
        // Only the Details/Media tabs hold validated fields.
        if (errors.cover_image_url && !errors.title && !errors.end_date) setTab("media");
        else setTab("details");
    };

    if (!open) return null;

    const isBusy = createMutation.isPending || updateMutation.isPending;
    const namedVenues = venues.filter((v) => v.name && v.name.trim());

    const TabButton = ({ id, label, count }: { id: TabKey; label: string; count?: number }) => (
        <button
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                tab === id
                    ? "border-primary-600 text-primary-700"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
        >
            {label}
            {count != null && count > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-100 text-primary-700 text-[11px] font-bold align-middle">
                    {count}
                </span>
            )}
        </button>
    );

    const sessionCount = schedule.reduce((n, d) => n + d.sessions.length, 0);
    const label = (t: string) => <label className="block text-sm font-medium text-neutral-700 mb-1">{t}</label>;
    const sectionNote = (t: string) => <p className="text-xs text-neutral-400 mb-3">{t}</p>;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-3xl shadow-2xl border-neutral-200 overflow-hidden animate-scale-up max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-white shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900">
                            {mode === "create" ? "Create New Event" : "Edit Event"}
                        </h2>
                        <p className="text-xs text-neutral-400 mt-0.5">
                            {mode === "create" ? "Fill in the tabs below — only the title is required." : "Update any tab and save."}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100" aria-label="Close modal">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-4 border-b border-neutral-200 bg-white shrink-0 overflow-x-auto">
                    <TabButton id="details" label="Details" />
                    <TabButton id="media" label="Media" count={gallery.length} />
                    <TabButton id="map" label="Map & Venues" count={venues.length} />
                    <TabButton id="travel" label="Travel" />
                    <TabButton id="schedule" label="Schedule" count={sessionCount} />
                </div>

                <form onSubmit={handleSubmit(submit("review"), onInvalid)} noValidate className="flex-1 flex flex-col min-h-0">
                    <div className="p-6 bg-neutral-50 overflow-y-auto flex-1">

                        {/* ── DETAILS ── */}
                        {tab === "details" && (
                            <div className="space-y-5">
                                <div>
                                    {label("Title *")}
                                    <Input {...register("title")} placeholder="e.g. Cliffesto 2026" className={errors.title ? "border-red-400" : ""} />
                                    {errors.title && (
                                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> {errors.title.message}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    {label("Subtitle")}
                                    <Input {...register("subtitle")} placeholder="e.g. Annual Techno-Cultural Fest" />
                                </div>
                                <div>
                                    {label("Description")}
                                    <Textarea {...register("description")} rows={5} placeholder="What is this festival about?" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        {label("Start")}
                                        <Input type="datetime-local" {...register("start_date")} />
                                    </div>
                                    <div>
                                        {label("End")}
                                        <Input type="datetime-local" {...register("end_date")} className={errors.end_date ? "border-red-400" : ""} />
                                        {errors.end_date && <p className="mt-1 text-xs text-red-600">{errors.end_date.message}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        {label("Timezone")}
                                        <Input {...register("timezone")} placeholder="Asia/Kolkata" />
                                    </div>
                                    <div>
                                        {label("Capacity")}
                                        <Input type="number" min={0} placeholder="Unlimited" {...register("capacity", { valueAsNumber: true })} />
                                    </div>
                                </div>
                                <div>
                                    {label("Categories")}
                                    <div className="flex gap-2">
                                        <Input
                                            value={categoryInput}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategoryInput(e.target.value)}
                                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                                if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addCategory(); }
                                            }}
                                            placeholder="e.g. Technical, Cultural — press Enter"
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
                                <label className="flex items-center gap-2 text-sm text-neutral-700 pt-1">
                                    <input type="checkbox" {...register("is_featured")} className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                                    Featured event
                                </label>
                            </div>
                        )}

                        {/* ── MEDIA ── */}
                        {tab === "media" && (
                            <div className="space-y-5">
                                <div>
                                    {label("Cover Image")}
                                    {sectionNote("Shown as the event's hero. Uploaded to S3 and served from the CDN.")}
                                    {coverUrl ? (
                                        <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-neutral-200">
                                            <img src={coverUrl} alt="" className="w-full aspect-video object-cover" />
                                            <button type="button" onClick={() => setValue("cover_image_url", "", { shouldValidate: true })}
                                                className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-neutral-600 hover:text-red-600 shadow" aria-label="Remove cover">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full max-w-sm aspect-video rounded-xl border-2 border-dashed border-neutral-300 bg-white hover:bg-neutral-50 cursor-pointer text-neutral-500">
                                            {coverUploading ? <Loader2 className="w-7 h-7 animate-spin text-neutral-700" /> : <><Upload className="w-7 h-7 mb-1.5 text-neutral-400" /><span className="text-xs font-medium">Click or drop to upload</span></>}
                                            <input type="file" accept="image/*" className="hidden" disabled={coverUploading}
                                                onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCover(f); e.target.value = ""; }} />
                                        </label>
                                    )}
                                    {errors.cover_image_url && <p className="mt-1 text-xs text-red-600">{errors.cover_image_url.message}</p>}
                                </div>
                                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                                    <h3 className="text-sm font-semibold text-neutral-600 mb-1">Gallery images</h3>
                                    {sectionNote("Extra photos shown in the event's image gallery.")}
                                    <div className="flex flex-wrap gap-2">
                                        {gallery.map((url, i) => (
                                            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-neutral-200">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => removeGallery(i)}
                                                    className="absolute top-0.5 right-0.5 p-1 bg-white/90 rounded-full text-neutral-600 hover:text-red-600 shadow" aria-label="Remove image">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="w-20 h-20 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 hover:bg-white cursor-pointer flex flex-col items-center justify-center text-neutral-400">
                                            {galleryUploading ? <Loader2 className="w-5 h-5 animate-spin text-neutral-600" /> : <><Plus className="w-5 h-5" /><span className="text-[10px] font-semibold">Add</span></>}
                                            <input type="file" accept="image/*" multiple className="hidden" disabled={galleryUploading}
                                                onChange={(e) => { if (e.target.files && e.target.files.length) void uploadGalleryFiles(e.target.files); e.target.value = ""; }} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── MAP & VENUES ── */}
                        {tab === "map" && (
                            <div className="space-y-5">
                                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-sm font-semibold text-neutral-600">Map filters &amp; pins</h3>
                                        <Button type="button" variant="outline" size="sm" onClick={addFilter} leftIcon={<Plus className="w-3.5 h-3.5" />}>Add filter</Button>
                                    </div>
                                    {sectionNote("Filter chips on the Explore-Around map. Upload an icon and pick a background colour — venues assigned to a filter render as that pin (icon on the coloured background, like the Explore page).")}
                                    {mapFilters.length === 0 ? (
                                        <p className="text-xs text-neutral-400">No filters yet (e.g. Stages, Food, Parking).</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {mapFilters.map((f, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                    <Input value={f.label} placeholder="Label (e.g. Stages)" onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter(i, { label: e.target.value })} className="flex-1" />
                                                    <label
                                                        className="relative w-10 h-9 rounded border border-dashed border-neutral-300 bg-white flex items-center justify-center cursor-pointer overflow-hidden shrink-0"
                                                        style={f.color ? { backgroundColor: f.color } : undefined}
                                                        title="Upload pin icon"
                                                    >
                                                        {isIconUrl(f.icon)
                                                            ? <img src={f.icon ?? ""} alt="" className="w-full h-full object-contain p-0.5" />
                                                            : <Upload className="w-4 h-4 text-neutral-400" />}
                                                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                                                            onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFilterIcon(i, file); e.target.value = ""; }} />
                                                    </label>
                                                    <input type="color" value={f.color || "#FECD36"} onChange={(e) => updateFilter(i, { color: e.target.value })} className="w-10 h-9 rounded border border-neutral-300 bg-white shrink-0" title="Pin background color" />
                                                    <button type="button" onClick={() => removeFilter(i)} className="p-2 text-neutral-400 hover:text-red-600" aria-label="Remove filter"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-sm font-semibold text-neutral-600">Venues / stages</h3>
                                        <Button type="button" variant="outline" size="sm" onClick={addVenue} leftIcon={<Plus className="w-3.5 h-3.5" />}>Add venue</Button>
                                    </div>
                                    {sectionNote("Add latitude & longitude so each venue shows as a pin on the map. The bounding box is computed from these automatically.")}
                                    {venues.length === 0 ? (
                                        <p className="text-xs text-neutral-400">No venues yet. Add stages, food courts, gates…</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {venues.map((v, i) => (
                                                <div key={i} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                                                    <div className="flex gap-2 items-center">
                                                        <Input value={v.name ?? ""} placeholder="Name (e.g. Main Stage)" onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVenue(i, { name: e.target.value })} className="flex-1" />
                                                        <button type="button" onClick={() => removeVenue(i)} className="p-2 text-neutral-400 hover:text-red-600 shrink-0" aria-label="Remove venue"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Input value={v.category ?? ""} placeholder="Category (e.g. stage)" onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVenue(i, { category: e.target.value })} />
                                                        <select
                                                            value={v.filter_key ?? ""}
                                                            onChange={(e) => updateVenue(i, { filter_key: e.target.value || null })}
                                                            className="h-9 rounded-lg border border-neutral-300 bg-white text-sm px-2"
                                                            title="Map filter"
                                                        >
                                                            <option value="">— map filter —</option>
                                                            {mapFilters.filter((f) => (f.key || f.label)).map((f, fi) => {
                                                                const k = (f.key || f.label || "").trim().toLowerCase().replace(/\s+/g, "-");
                                                                return <option key={fi} value={k}>{f.label || k}</option>;
                                                            })}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[11px] text-neutral-400 mb-0.5">Link one of your markers (fills the location automatically)</span>
                                                        <select
                                                            value={v.marker_id ?? ""}
                                                            onChange={(e) => {
                                                                const m = myMarkers.find((x) => x.id === e.target.value);
                                                                if (!m) { updateVenue(i, { marker_id: "" }); return; }
                                                                const coords = m.location?.coordinates;
                                                                updateVenue(i, {
                                                                    marker_id: m.id,
                                                                    name: (v.name && v.name.trim()) ? v.name : m.title,
                                                                    category: (v.category && v.category.trim()) ? v.category : (m.categories?.[0] ?? ""),
                                                                    coordinates: coords && coords.length === 2 ? [coords[0], coords[1]] : v.coordinates,
                                                                });
                                                            }}
                                                            className="w-full h-9 rounded-lg border border-neutral-300 bg-white text-sm px-2"
                                                            title="Link a marker"
                                                        >
                                                            <option value="">— link a marker —</option>
                                                            {myMarkers.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Input type="number" step="any" value={numStr(v.coordinates?.[1])} placeholder="Latitude" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVenueCoord(i, "lat", e.target.value)} />
                                                        <Input type="number" step="any" value={numStr(v.coordinates?.[0])} placeholder="Longitude" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVenueCoord(i, "lng", e.target.value)} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── TRAVEL ── */}
                        {tab === "travel" && (
                            <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
                                <h3 className="text-sm font-semibold text-neutral-600">How to Travel</h3>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-600 mb-1">By Air</label>
                                    <Textarea rows={2} value={travel.by_air ?? ""} placeholder="Nearest airport, distance, fares…" onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTravelField("by_air", e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-600 mb-1">By Rail</label>
                                    <Textarea rows={2} value={travel.by_rail ?? ""} placeholder="Nearest station, connections…" onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTravelField("by_rail", e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-600 mb-1">By Road</label>
                                    <Textarea rows={2} value={travel.by_road ?? ""} placeholder="Highways, buses, parking…" onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTravelField("by_road", e.target.value)} />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-medium text-neutral-600">Cabs / Contacts</label>
                                        <Button type="button" variant="outline" size="sm" onClick={addCab} leftIcon={<Plus className="w-3.5 h-3.5" />}>Add</Button>
                                    </div>
                                    {cabs.length === 0 ? (
                                        <p className="text-xs text-neutral-400">No cab contacts yet.</p>
                                    ) : cabs.map((c, i) => (
                                        <div key={i} className="flex gap-2 items-center mb-2">
                                            <Input value={c.name} placeholder="Name / service" onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCab(i, { name: e.target.value })} className="flex-1" />
                                            <Input value={c.contact ?? ""} placeholder="Phone" onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCab(i, { contact: e.target.value })} className="w-32" />
                                            <Input value={c.fare ?? ""} placeholder="Fare" onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCab(i, { fare: e.target.value })} className="w-24" />
                                            <button type="button" onClick={() => removeCab(i)} className="p-2 text-neutral-400 hover:text-red-600" aria-label="Remove cab"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── SCHEDULE ── */}
                        {tab === "schedule" && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-neutral-400">Add days, then sessions within each day. Link a session to a venue and set its category & times.</p>
                                    <Button type="button" variant="outline" size="sm" onClick={addDay} leftIcon={<Plus className="w-3.5 h-3.5" />}>Add Day</Button>
                                </div>
                                {schedule.length === 0 ? (
                                    <p className="text-xs text-neutral-400">No schedule yet.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {schedule.map((d, di) => (
                                            <div key={di} className="rounded-xl border border-neutral-200 bg-white p-4">
                                                <div className="flex gap-2 items-center mb-3">
                                                    <Input value={d.label ?? ""} placeholder="Day label (e.g. Day 1)" onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDay(di, { label: e.target.value })} className="flex-1 font-semibold" />
                                                    <Input type="date" value={d.date ? d.date.slice(0, 10) : ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDay(di, { date: e.target.value })} className="w-40" title="Day date" />
                                                    <button type="button" onClick={() => removeDay(di)} className="p-2 text-neutral-400 hover:text-red-600" aria-label="Remove day"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                                <div className="space-y-3">
                                                    {d.sessions.map((ss, si) => (
                                                        <div key={si} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                                                            <div className="flex gap-2 items-center">
                                                                <Input value={ss.title} placeholder="Session / act title" onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(di, si, { title: e.target.value })} className="flex-1 font-medium" />
                                                                <button type="button" onClick={() => removeSession(di, si)} className="p-2 text-neutral-400 hover:text-red-600 shrink-0" aria-label="Remove session"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <Input value={ss.performer ?? ""} placeholder="Performer / host" onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(di, si, { performer: e.target.value })} />
                                                                <Input value={ss.category ?? ""} placeholder="Category (Cultural…)" onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(di, si, { category: e.target.value })} />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {namedVenues.length > 0 ? (
                                                                    <select
                                                                        value={ss.stage ?? ""}
                                                                        onChange={(e) => {
                                                                            const name = e.target.value;
                                                                            const v = venues.find((x) => (x.name ?? "") === name);
                                                                            updateSession(di, si, { stage: name || null, marker_id: v?.marker_id || null });
                                                                        }}
                                                                        className="h-9 rounded-lg border border-neutral-300 bg-white text-sm px-2"
                                                                        title="Venue / stage"
                                                                    >
                                                                        <option value="">— venue / stage —</option>
                                                                        {namedVenues.map((v, vi) => <option key={vi} value={v.name ?? ""}>{v.name}</option>)}
                                                                    </select>
                                                                ) : (
                                                                    <Input value={ss.stage ?? ""} placeholder="Stage" onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(di, si, { stage: e.target.value })} />
                                                                )}
                                                                <label className="flex items-center gap-2 text-xs text-neutral-600 px-1">
                                                                    <input type="checkbox" checked={ss.status_override === "delayed"} onChange={(e) => updateSession(di, si, {
                                                                        status_override: e.target.checked ? "delayed" : undefined,
                                                                        delayed_to: e.target.checked ? (ss.delayed_to ?? ss.start_time ?? undefined) : undefined,
                                                                        delayed_end: e.target.checked ? (ss.delayed_end ?? ss.end_time ?? undefined) : undefined,
                                                                    })} />
                                                                    Mark delayed
                                                                </label>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <span className="block text-[11px] text-neutral-400 mb-0.5">Start</span>
                                                                    <Input type="datetime-local" value={ss.start_time ? ss.start_time.slice(0, 16) : ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(di, si, { start_time: e.target.value })} />
                                                                </div>
                                                                <div>
                                                                    <span className="block text-[11px] text-neutral-400 mb-0.5">End</span>
                                                                    <Input type="datetime-local" value={ss.end_time ? ss.end_time.slice(0, 16) : ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(di, si, { end_time: e.target.value })} />
                                                                </div>
                                                            </div>
                                                            {ss.status_override === "delayed" && (
                                                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 space-y-2">
                                                                    <p className="text-[11px] font-medium text-amber-700">Reschedule this delayed session — set both a new start and end so it doesn't overlap the next session.</p>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div>
                                                                            <span className="block text-[11px] text-amber-700 mb-0.5">New start</span>
                                                                            <Input type="datetime-local" value={ss.delayed_to ? ss.delayed_to.slice(0, 16) : ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(di, si, { delayed_to: e.target.value })} />
                                                                        </div>
                                                                        <div>
                                                                            <span className="block text-[11px] text-amber-700 mb-0.5">New end</span>
                                                                            <Input type="datetime-local" value={ss.delayed_end ? ss.delayed_end.slice(0, 16) : ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(di, si, { delayed_end: e.target.value })} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => addSession(di)} leftIcon={<Plus className="w-3.5 h-3.5" />}>Add session</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50 shrink-0">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isBusy}>Cancel</Button>
                        <div className="flex-1" />
                        <Button type="button" variant="outline" onClick={handleSubmit(submit("draft"), onInvalid)} disabled={isBusy}>
                            Save as Draft
                        </Button>
                        <Button type="submit" variant="primary" isLoading={isBusy} disabled={isBusy}>
                            Submit for Review
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

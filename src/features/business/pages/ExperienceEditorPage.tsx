import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Archive,
    ArrowLeft,
    CalendarRange,
    CheckCircle2,
    Circle,
    EyeOff,
    MapPin,
    Pause,
    RotateCcw,
    Send,
    ShieldAlert,
} from "lucide-react";
import { Button, ErrorState, Skeleton } from "@components/ui";
import { MapboxLocationSearch } from "@components/MapboxLocationSearch";
import { experienceService } from "@services/experience.service";
import type {
    Experience,
    ExperienceFaq,
    ExperiencePayload,
    ExperienceStatus,
    ItineraryItem,
    TitledText,
} from "@services/experience.types";
import { useBusiness } from "../context";
import { useHub } from "../queries";
import { errorMessage, isForbidden, isNotFound } from "../utils";
import { Banner, FieldLabel, PageHeader, SectionCard, inputClass } from "../components/bits";
import { ChipInput } from "../components/ChipInput";
import { CopyEmailText } from "../components/CopyEmail";
import { ConfirmDialog } from "../components/Overlay";
import { FeatureOff } from "../components/FeatureGate";
import { useExperience, useExperienceSlots, useInvalidateExperiences, xkeys } from "../experiences/queries";
import { ExperienceStatusPill, ImagePicker, PaymentsNote, PhotoListEditor, RepeatableList } from "../experiences/ui";
import { ExperiencePreview } from "../experiences/ExperiencePreview";
import {
    OPTIONS_HINT,
    STANDARD_CANCELLATION_POLICY,
    addDays,
    isUpcomingSlot,
    newOptionId,
    todayIso,
} from "../experiences/utils";

// ── Form model ──────────────────────────────────────────────────────────────

interface OptionForm {
    id: string;
    name: string;
    description: string;
    duration_minutes: string;
    price: string;
}

interface ExperienceForm {
    title: string;
    tagline: string;
    description: string;
    tags: string[];
    placeMode: "place" | "custom";
    marker_id: string;
    address: string;
    map_url: string;
    lat: number | null;
    lng: number | null;
    duration_text: string;
    media: string[];
    experience_media: string[];
    gallery: string[];
    curator: { name: string; title: string; years: string; photo_url: string; note: string };
    highlights: TitledText[];
    itinerary: ItineraryItem[];
    included: TitledText[];
    cancellation_policy: TitledText[];
    faqs: ExperienceFaq[];
    options: OptionForm[];
}

const numStr = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

function formFrom(e: Experience | null): ExperienceForm {
    const loc = e?.location;
    return {
        title: e?.title ?? "",
        tagline: e?.tagline ?? "",
        description: e?.description ?? "",
        tags: e?.tags ?? [],
        placeMode: e && !e.marker_id && loc ? "custom" : "place",
        marker_id: e?.marker_id ?? "",
        address: loc?.address ?? "",
        map_url: loc?.map_url ?? "",
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        duration_text: e?.duration_text ?? "",
        media: e?.media ?? [],
        experience_media: e?.experience_media ?? [],
        gallery: e?.gallery ?? [],
        curator: {
            name: e?.curator?.name ?? "",
            title: e?.curator?.title ?? "",
            years: numStr(e?.curator?.years),
            photo_url: e?.curator?.photo_url ?? "",
            note: e?.curator?.note ?? "",
        },
        highlights: e?.highlights ?? [],
        // Stored without a photo, an item's image_url is null; the form edits strings.
        itinerary: (e?.itinerary ?? []).map((x) => ({ ...x, image_url: x.image_url ?? "" })),
        included: e?.included ?? [],
        cancellation_policy: e?.cancellation_policy ?? [],
        faqs: e?.faqs ?? [],
        options: (e?.options ?? []).map((o) => ({
            id: o.id,
            name: o.name ?? "",
            description: o.description ?? "",
            duration_minutes: numStr(o.duration_minutes),
            price: numStr(o.price),
        })),
    };
}

const filled = (...values: string[]) => values.some((v) => v.trim());
const trimTitled = (list: TitledText[]) =>
    list
        .map((x) => ({ title: x.title.trim(), description: x.description.trim() }))
        .filter((x) => filled(x.title, x.description));

function toPayload(f: ExperienceForm): ExperiencePayload {
    const curatorFilled = filled(f.curator.name, f.curator.title, f.curator.years, f.curator.photo_url, f.curator.note);
    const years = f.curator.years.trim() === "" ? null : Number.parseInt(f.curator.years, 10);
    const custom = f.placeMode === "custom";
    return {
        title: f.title.trim(),
        tagline: f.tagline.trim(),
        description: f.description.trim(),
        tags: f.tags,
        marker_id: custom ? null : f.marker_id || null,
        location: custom
            ? { address: f.address.trim(), lat: f.lat, lng: f.lng, map_url: f.map_url.trim() || null }
            : undefined,
        duration_text: f.duration_text.trim(),
        media: f.media,
        experience_media: f.experience_media,
        gallery: f.gallery,
        curator: curatorFilled
            ? {
                  name: f.curator.name.trim(),
                  title: f.curator.title.trim(),
                  years: years !== null && Number.isFinite(years) ? years : null,
                  // An empty link is no link (the API only takes full https links).
                  photo_url: (f.curator.photo_url ?? "").trim() || null,
                  note: f.curator.note.trim(),
              }
            : null,
        highlights: trimTitled(f.highlights),
        itinerary: f.itinerary
            .map((x) => ({
                time_label: x.time_label.trim(),
                title: x.title.trim(),
                description: x.description.trim(),
                image_url: (x.image_url ?? "").trim() || null,
            }))
            .filter((x) => filled(x.time_label, x.title, x.description, x.image_url ?? "")),
        included: trimTitled(f.included),
        cancellation_policy: trimTitled(f.cancellation_policy),
        faqs: f.faqs
            .map((x) => ({ question: x.question.trim(), answer: x.answer.trim() }))
            .filter((x) => filled(x.question, x.answer)),
        options: f.options
            .filter((o) => filled(o.name, o.description, o.duration_minutes, o.price))
            .map((o) => ({
                id: o.id,
                name: o.name.trim(),
                description: o.description.trim(),
                duration_minutes: o.duration_minutes.trim() === "" ? null : Number.parseInt(o.duration_minutes, 10),
                price: o.price.trim() === "" ? null : Number(o.price),
            })),
    };
}

function validate(f: ExperienceForm): Record<string, string> {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = "Give your experience a title.";
    else if (f.title.trim().length > 120) e.title = "Keep the title under 120 characters.";
    if (f.tagline.length > 160) e.tagline = "Keep the tagline under 160 characters.";
    if (f.description.length > 5000) e.description = "Keep it under 5000 characters.";
    if (f.placeMode === "custom" && f.map_url.trim() && !/^https:\/\//i.test(f.map_url.trim())) {
        e.map_url = "The map link must start with https://";
    }
    const years = f.curator.years.trim();
    if (years && (!/^\d+$/.test(years) || Number(years) > 80)) e.curator_years = "Years must be a whole number.";
    // A filled row needs its title (or question); say which section, since rows have no field slot.
    const untitled = (rows: TitledText[]) => rows.some((r) => !r.title.trim() && r.description.trim());
    const missing = [
        untitled(f.highlights) && "Highlights",
        f.itinerary.some((r) => !r.title.trim() && filled(r.time_label, r.description, r.image_url ?? "")) &&
            "What You'll Do",
        untitled(f.included) && "What's Included",
        untitled(f.cancellation_policy) && "Cancellation policy",
        f.faqs.some((q) => !q.question.trim() && q.answer.trim()) && "FAQs",
    ].filter(Boolean);
    if (missing.length) e.rows = `Add a title to every filled row in: ${missing.join(", ")}.`;
    f.options.forEach((o, i) => {
        if (!filled(o.name, o.description, o.duration_minutes, o.price)) return;
        if (!o.name.trim()) e[`option_${i}`] = "Give this option a name.";
        else if (o.duration_minutes.trim() && !/^\d+$/.test(o.duration_minutes.trim())) {
            e[`option_${i}`] = "Duration is in whole minutes.";
        } else if (o.price.trim() && (Number.isNaN(Number(o.price)) || Number(o.price) < 0)) {
            e[`option_${i}`] = "Price can't be negative.";
        }
    });
    return e;
}

const SECTIONS = [
    { id: "exp-basics", label: "Basics" },
    { id: "exp-photos", label: "Photos" },
    { id: "exp-curator", label: "Curator" },
    { id: "exp-highlights", label: "Highlights" },
    { id: "exp-itinerary", label: "What You'll Do" },
    { id: "exp-included", label: "What's Included" },
    { id: "exp-cancellation", label: "Cancellation" },
    { id: "exp-faqs", label: "FAQs" },
    { id: "exp-options", label: "Options" },
] as const;

function Anchor({ id, children }: { id: string; children: ReactNode }) {
    return (
        <div id={id} className="scroll-mt-24">
            {children}
        </div>
    );
}

function FieldError({ message }: { message?: string }) {
    return message ? <p className="text-xs text-red-600 mt-1">{message}</p> : null;
}

const textareaClass = `${inputClass} resize-y min-h-[88px]`;

// ── Page ────────────────────────────────────────────────────────────────────

export function ExperienceEditorPage() {
    const { experienceId } = useParams<{ experienceId: string }>();
    return <ExperienceEditor key={experienceId ?? "new"} experienceId={experienceId} />;
}

function ExperienceEditor({ experienceId }: { experienceId: string | undefined }) {
    const isNew = !experienceId;
    const query = useExperience(experienceId);

    if (!isNew && query.isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton height={40} className="w-72" />
                <Skeleton height={420} />
            </div>
        );
    }
    if (!isNew && query.isError) {
        if (isForbidden(query.error)) return <FeatureOff feature="experiences" />;
        if (isNotFound(query.error)) {
            return (
                <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center space-y-4">
                    <p className="text-neutral-700">This experience doesn't exist any more.</p>
                    <Link to="/business/experiences" className="text-primary-700 font-semibold hover:underline">
                        Back to Experiences
                    </Link>
                </div>
            );
        }
        return <ErrorState message="We couldn't load this experience." onRetry={() => void query.refetch()} />;
    }
    return <EditorForm experience={query.data ?? null} />;
}

function EditorForm({ experience }: { experience: Experience | null }) {
    const { business, businessId, canManage } = useBusiness();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const invalidate = useInvalidateExperiences();
    const hub = useHub();
    const [form, setForm] = useState<ExperienceForm>(() => formFrom(experience));
    const [baseline, setBaseline] = useState(() => JSON.stringify(toPayload(formFrom(experience))));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState<null | "save" | ExperienceStatus>(null);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [archiveOpen, setArchiveOpen] = useState(false);

    const readOnly = !canManage;
    const status: ExperienceStatus = experience?.status ?? "draft";
    const payload = useMemo(() => toPayload(form), [form]);
    const dirty = JSON.stringify(payload) !== baseline;

    // Upcoming slots, for the publish checklist.
    const range = useMemo(() => ({ from: todayIso(), to: addDays(todayIso(), 365) }), []);
    const slots = useExperienceSlots(experience?.id, range);
    const upcomingSlots = (slots.data ?? []).filter((s) => isUpcomingSlot(s)).length;

    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const places = useMemo(() => {
        const fromHub = hub.data?.places ?? [];
        if (fromHub.length) return fromHub.map((p) => ({ id: p.marker_id, title: p.title ?? "Your place" }));
        return (business.marker_ids ?? []).map((id, i) => ({ id, title: `Place ${i + 1}` }));
    }, [hub.data, business.marker_ids]);

    const set = <K extends keyof ExperienceForm>(key: K, value: ExperienceForm[K]) =>
        setForm((f) => ({ ...f, [key]: value }));
    const setCurator = (patch: Partial<ExperienceForm["curator"]>) =>
        setForm((f) => ({ ...f, curator: { ...f.curator, ...patch } }));

    /** Saves the form; returns the saved experience, or null when it couldn't. */
    const save = async (opts: { quiet?: boolean } = {}): Promise<Experience | null> => {
        const errs = validate(form);
        setErrors(errs);
        if (Object.keys(errs).length) {
            toast.error(errs.rows ?? "Please fix the highlighted fields.");
            return null;
        }
        setBusy("save");
        try {
            const saved = experience
                ? await experienceService.update(businessId, experience.id, payload)
                : await experienceService.create(businessId, payload);
            queryClient.setQueryData(xkeys.detail(businessId, saved.id), saved);
            void invalidate();
            setBaseline(JSON.stringify(payload));
            if (!experience) {
                toast.success("Draft saved. Add your time slots next.");
                navigate(`/business/experiences/${saved.id}`, { replace: true });
            } else if (!opts.quiet) {
                toast.success(status === "draft" ? "Draft saved." : "Changes saved.");
            }
            return saved;
        } catch (e) {
            if (isForbidden(e)) toast.error("Experiences aren't turned on for this business.");
            else toast.error(errorMessage(e, "Couldn't save the experience"));
            return null;
        } finally {
            setBusy(null);
        }
    };

    const changeStatus = async (next: ExperienceStatus) => {
        setPublishError(null);
        let target = experience;
        if (!target || dirty) {
            target = await save({ quiet: true });
            if (!target) return;
        }
        setBusy(next);
        try {
            const updated = await experienceService.setStatus(businessId, target.id, next);
            queryClient.setQueryData(xkeys.detail(businessId, updated.id), updated);
            void invalidate();
            toast.success(
                next === "published"
                    ? "Published — customers can book it in the SeekKrr app now."
                    : next === "paused"
                      ? "Paused — customers can't book it until you publish it again."
                      : next === "archived"
                        ? "Experience archived."
                        : "Moved back to drafts."
            );
        } catch (e) {
            const msg = errorMessage(e, "Couldn't change the status");
            if (next === "published") setPublishError(msg);
            toast.error(msg);
            throw e;
        } finally {
            setBusy(null);
        }
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        void save();
    };

    const goToSlots = async () => {
        if (!experience) {
            const saved = await save({ quiet: true });
            if (saved) navigate(`/business/experiences/${saved.id}/slots`);
            return;
        }
        if (dirty) {
            const saved = await save({ quiet: true });
            if (!saved) return;
        }
        navigate(`/business/experiences/${experience.id}/slots`);
    };

    const checklist = [
        { label: "A title", done: !!form.title.trim() },
        { label: "A description (At a Glance)", done: !!form.description.trim() },
        { label: "At least one photo", done: form.media.length > 0 },
        {
            label: "At least one upcoming slot",
            done: upcomingSlots > 0,
            hint: experience ? undefined : "Save first, then add slots.",
        },
    ];

    const optionPrices = payload.options.map((o) => o.price).filter((p): p is number => p !== null && !Number.isNaN(p));
    const placeTitle = places.find((p) => p.id === form.marker_id)?.title ?? "";

    const actionButtons = canManage ? (
        <>
            <Button type="submit" variant="secondary" isLoading={busy === "save"} disabled={!!busy || (!dirty && !!experience)}>
                {status === "draft" ? "Save draft" : "Save changes"}
            </Button>
            {experience && (status === "draft" || status === "paused") && (
                <Button
                    type="button"
                    variant="accent"
                    leftIcon={<Send className="w-4 h-4" />}
                    isLoading={busy === "published"}
                    disabled={!!busy}
                    onClick={() => void changeStatus("published").catch(() => undefined)}
                >
                    Publish
                </Button>
            )}
            {status === "published" && (
                <Button
                    type="button"
                    variant="outline"
                    leftIcon={<Pause className="w-4 h-4" />}
                    isLoading={busy === "paused"}
                    disabled={!!busy}
                    onClick={() => void changeStatus("paused").catch(() => undefined)}
                >
                    Pause
                </Button>
            )}
            {experience && status !== "archived" && (
                <Button
                    type="button"
                    variant="ghost"
                    leftIcon={<Archive className="w-4 h-4" />}
                    disabled={!!busy}
                    onClick={() => setArchiveOpen(true)}
                >
                    Archive
                </Button>
            )}
            {status === "archived" && (
                <Button
                    type="button"
                    variant="outline"
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                    isLoading={busy === "draft"}
                    disabled={!!busy}
                    onClick={() => void changeStatus("draft").catch(() => undefined)}
                >
                    Restore as draft
                </Button>
            )}
        </>
    ) : undefined;

    return (
        <form onSubmit={submit} className="space-y-6">
            <Link
                to="/business/experiences"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
                <ArrowLeft className="w-4 h-4" /> Experiences
            </Link>

            <PageHeader
                title={
                    <span className="inline-flex items-center gap-3 flex-wrap">
                        {experience ? experience.title || "Untitled experience" : "New experience"}
                        {experience && <ExperienceStatusPill status={status} />}
                    </span>
                }
                description="Fill in each section the way it appears in the app — customers see exactly this."
                actions={actionButtons}
            />

            {readOnly && (
                <p className="text-sm text-neutral-600 bg-white border border-neutral-200 rounded-2xl p-4">
                    You're viewing this experience. Managers and owners can edit it.
                </p>
            )}

            {experience?.hidden_by_admin && (
                <Banner tone="danger" icon={<EyeOff className="w-5 h-5" />} title="Hidden by SeekKrr">
                    Customers can't see or book this experience right now. Write to <CopyEmailText /> to find out more.
                </Banner>
            )}

            {publishError && (
                <Banner tone="warning" icon={<ShieldAlert className="w-5 h-5" />} title="Not published yet">
                    {publishError}
                    {checklist.some((c) => !c.done) && (
                        <span className="block mt-1">
                            Still missing: {checklist.filter((c) => !c.done).map((c) => c.label.toLowerCase()).join(", ")}.
                        </span>
                    )}
                </Banner>
            )}

            <nav aria-label="Editor sections" className="-mx-1 overflow-x-auto">
                <ul className="flex gap-1.5 w-max px-1 pb-1">
                    {SECTIONS.map((s) => (
                        <li key={s.id}>
                            <button
                                type="button"
                                onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                                className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap border bg-white text-neutral-600 border-neutral-200 hover:border-primary-400 hover:text-primary-800"
                            >
                                {s.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
                <fieldset disabled={readOnly || !!busy} className="min-w-0 space-y-6">
                    <Anchor id="exp-basics">
                        <SectionCard title="Basics" description="Title, the At a Glance text and where it happens.">
                            <div className="space-y-4">
                                <div>
                                    <FieldLabel htmlFor="exp-title">Title</FieldLabel>
                                    <input
                                        id="exp-title"
                                        className={inputClass}
                                        maxLength={120}
                                        value={form.title}
                                        onChange={(e) => set("title", e.target.value)}
                                        placeholder="Sunrise paragliding over Bir"
                                    />
                                    <FieldError message={errors.title} />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="exp-tagline" hint="One line under the title on cards.">
                                        Tagline
                                    </FieldLabel>
                                    <input
                                        id="exp-tagline"
                                        className={inputClass}
                                        maxLength={160}
                                        value={form.tagline}
                                        onChange={(e) => set("tagline", e.target.value)}
                                        placeholder="Fly with certified pilots at golden hour"
                                    />
                                    <FieldError message={errors.tagline} />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="exp-desc" hint='Shown as "At a Glance" on the Overview tab.'>
                                        Description
                                    </FieldLabel>
                                    <textarea
                                        id="exp-desc"
                                        className={`${textareaClass} min-h-[140px]`}
                                        maxLength={5000}
                                        value={form.description}
                                        onChange={(e) => set("description", e.target.value)}
                                        placeholder="What makes this experience special, who it's for, and what to expect."
                                    />
                                    <FieldError message={errors.description} />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="exp-tags" hint="Shown as chips, e.g. Adventure, Sunrise, Beginners.">
                                        Tags
                                    </FieldLabel>
                                    <ChipInput
                                        id="exp-tags"
                                        values={form.tags}
                                        onChange={(v) => set("tags", v)}
                                        max={8}
                                        placeholder="Type a tag and press Enter"
                                        disabled={readOnly}
                                    />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="exp-duration" hint='Free text, e.g. "3–4 hours" or "Half day".'>
                                        Duration
                                    </FieldLabel>
                                    <input
                                        id="exp-duration"
                                        className={inputClass}
                                        maxLength={60}
                                        value={form.duration_text}
                                        onChange={(e) => set("duration_text", e.target.value)}
                                        placeholder="3–4 hours"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <FieldLabel hint="Where guests meet. Location and region come from your place.">Place</FieldLabel>
                                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Place">
                                        {(
                                            [
                                                ["place", "One of your places"],
                                                ["custom", "Custom address"],
                                            ] as const
                                        ).map(([mode, label]) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                role="radio"
                                                aria-checked={form.placeMode === mode}
                                                onClick={() => set("placeMode", mode)}
                                                className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-colors ${
                                                    form.placeMode === mode
                                                        ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                                                        : "bg-white text-neutral-700 border-neutral-300 hover:border-primary-400"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {form.placeMode === "place" ? (
                                        places.length === 0 ? (
                                            <p className="text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-xl p-3">
                                                No place linked to your business yet.{" "}
                                                <Link to="/business/locations?add=1" className="font-semibold text-primary-700 underline">
                                                    Add your place
                                                </Link>{" "}
                                                or use a custom address.
                                            </p>
                                        ) : (
                                            <select
                                                id="exp-place"
                                                aria-label="Your place"
                                                className={inputClass}
                                                value={form.marker_id}
                                                onChange={(e) => set("marker_id", e.target.value)}
                                            >
                                                <option value="">Choose a place…</option>
                                                {places.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.title}
                                                    </option>
                                                ))}
                                            </select>
                                        )
                                    ) : (
                                        <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 sm:p-4">
                                            {!readOnly && (
                                                <MapboxLocationSearch
                                                    label="Find on the map (optional)"
                                                    placeholder="Search a landmark or address…"
                                                    value={
                                                        form.lat !== null && form.lng !== null
                                                            ? { latitude: form.lat, longitude: form.lng, place_name: form.address }
                                                            : null
                                                    }
                                                    onChange={(loc) =>
                                                        setForm((f) => ({
                                                            ...f,
                                                            lat: loc?.latitude ?? null,
                                                            lng: loc?.longitude ?? null,
                                                            address: loc ? loc.place_name : f.address,
                                                        }))
                                                    }
                                                />
                                            )}
                                            <div>
                                                <FieldLabel htmlFor="exp-address">Address</FieldLabel>
                                                <input
                                                    id="exp-address"
                                                    className={inputClass}
                                                    maxLength={300}
                                                    value={form.address}
                                                    onChange={(e) => set("address", e.target.value)}
                                                    placeholder="Landing site, Chowgan, Bir"
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel htmlFor="exp-map" hint='Used for "Open in Maps".'>
                                                    Map link
                                                </FieldLabel>
                                                <input
                                                    id="exp-map"
                                                    className={inputClass}
                                                    maxLength={500}
                                                    value={form.map_url}
                                                    onChange={(e) => set("map_url", e.target.value)}
                                                    placeholder="https://maps.app.goo.gl/…"
                                                />
                                                <FieldError message={errors.map_url} />
                                            </div>
                                            {form.lat !== null && form.lng !== null && (
                                                <p className="text-xs text-neutral-500 inline-flex items-center gap-1">
                                                    <MapPin className="w-3.5 h-3.5" /> Pinned at {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </SectionCard>
                    </Anchor>

                    <Anchor id="exp-photos">
                        <SectionCard title="Photos" description="The first photo is the cover customers see on cards and at the top of the page.">
                            <div className="space-y-6">
                                <PhotoListEditor
                                    id="exp-media"
                                    values={form.media}
                                    onChange={(v) => set("media", v)}
                                    businessId={businessId}
                                    max={12}
                                    coverFirst
                                    disabled={readOnly}
                                />
                                <div>
                                    <FieldLabel
                                        htmlFor="exp-xmedia"
                                        hint={"The photo strip above your highlights in “What You'll Experience”."}
                                    >
                                        What You'll Experience photos
                                    </FieldLabel>
                                    <PhotoListEditor
                                        id="exp-xmedia"
                                        values={form.experience_media}
                                        onChange={(v) => set("experience_media", v)}
                                        businessId={businessId}
                                        max={10}
                                        disabled={readOnly}
                                    />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="exp-gallery" hint="Opened from Quick Links → Gallery.">
                                        Gallery
                                    </FieldLabel>
                                    <PhotoListEditor
                                        id="exp-gallery"
                                        values={form.gallery}
                                        onChange={(v) => set("gallery", v)}
                                        businessId={businessId}
                                        max={30}
                                        disabled={readOnly}
                                    />
                                </div>
                            </div>
                        </SectionCard>
                    </Anchor>

                    <Anchor id="exp-curator">
                        <SectionCard title="Curator" description='"Meet the Curator" on the Overview tab, and "Notes from the Curator" on Details.'>
                            <div className="flex flex-col sm:flex-row gap-5">
                                <ImagePicker
                                    id="exp-curator-photo"
                                    value={form.curator.photo_url}
                                    onChange={(url) => setCurator({ photo_url: url })}
                                    businessId={businessId}
                                    round
                                    label="Photo"
                                    disabled={readOnly}
                                />
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <FieldLabel htmlFor="exp-curator-name">Name</FieldLabel>
                                        <input
                                            id="exp-curator-name"
                                            className={inputClass}
                                            maxLength={80}
                                            value={form.curator.name}
                                            onChange={(e) => setCurator({ name: e.target.value })}
                                            placeholder="Tenzin Dorje"
                                        />
                                    </div>
                                    <div>
                                        <FieldLabel htmlFor="exp-curator-title">Title</FieldLabel>
                                        <input
                                            id="exp-curator-title"
                                            className={inputClass}
                                            maxLength={80}
                                            value={form.curator.title}
                                            onChange={(e) => setCurator({ title: e.target.value })}
                                            placeholder="Lead pilot"
                                        />
                                    </div>
                                    <div>
                                        <FieldLabel htmlFor="exp-curator-years">Years of experience</FieldLabel>
                                        <input
                                            id="exp-curator-years"
                                            className={inputClass}
                                            inputMode="numeric"
                                            maxLength={2}
                                            value={form.curator.years}
                                            onChange={(e) => setCurator({ years: e.target.value.replace(/\D/g, "") })}
                                            placeholder="12"
                                        />
                                        <FieldError message={errors.curator_years} />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <FieldLabel htmlFor="exp-curator-note">Note from the curator</FieldLabel>
                                        <textarea
                                            id="exp-curator-note"
                                            className={textareaClass}
                                            maxLength={2000}
                                            value={form.curator.note}
                                            onChange={(e) => setCurator({ note: e.target.value })}
                                            placeholder="Wear closed shoes and carry a light jacket — it's chilly at take-off."
                                        />
                                    </div>
                                </div>
                            </div>
                        </SectionCard>
                    </Anchor>

                    <Anchor id="exp-highlights">
                        <SectionCard title="Highlights" description={"Numbered under “What You'll Experience”."}>
                            <RepeatableList
                                items={form.highlights}
                                onChange={(v) => set("highlights", v)}
                                newItem={() => ({ title: "", description: "" })}
                                addLabel="Add highlight"
                                itemLabel="highlight"
                                numbered
                                max={12}
                                disabled={readOnly}
                                renderItem={(item, update, i) => (
                                    <div className="space-y-2">
                                        <input
                                            aria-label={`Highlight ${i + 1} title`}
                                            className={inputClass}
                                            maxLength={100}
                                            value={item.title}
                                            onChange={(e) => update({ title: e.target.value })}
                                            placeholder="Take off from 2,400 m"
                                        />
                                        <textarea
                                            aria-label={`Highlight ${i + 1} description`}
                                            className={textareaClass}
                                            maxLength={600}
                                            value={item.description}
                                            onChange={(e) => update({ description: e.target.value })}
                                            placeholder="A short line about this moment."
                                        />
                                    </div>
                                )}
                            />
                        </SectionCard>
                    </Anchor>

                    <Anchor id="exp-itinerary">
                        <SectionCard title="What You'll Do" description="The itinerary on the Details tab, in order.">
                            <RepeatableList
                                items={form.itinerary}
                                onChange={(v) => set("itinerary", v)}
                                newItem={() => ({ time_label: "", title: "", description: "", image_url: "" })}
                                addLabel="Add step"
                                itemLabel="step"
                                max={20}
                                disabled={readOnly}
                                renderItem={(item, update, i) => (
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <ImagePicker
                                            id={`exp-itinerary-img-${i}`}
                                            value={item.image_url ?? ""}
                                            onChange={(url) => update({ image_url: url })}
                                            businessId={businessId}
                                            label="Image"
                                            disabled={readOnly}
                                        />
                                        <div className="flex-1 space-y-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-2">
                                                <input
                                                    aria-label={`Step ${i + 1} time`}
                                                    className={inputClass}
                                                    maxLength={40}
                                                    value={item.time_label}
                                                    onChange={(e) => update({ time_label: e.target.value })}
                                                    placeholder="6:00 am"
                                                />
                                                <input
                                                    aria-label={`Step ${i + 1} title`}
                                                    className={inputClass}
                                                    maxLength={100}
                                                    value={item.title}
                                                    onChange={(e) => update({ title: e.target.value })}
                                                    placeholder="Pick-up from the landing site"
                                                />
                                            </div>
                                            <textarea
                                                aria-label={`Step ${i + 1} description`}
                                                className={textareaClass}
                                                maxLength={800}
                                                value={item.description}
                                                onChange={(e) => update({ description: e.target.value })}
                                                placeholder="What happens at this step."
                                            />
                                        </div>
                                    </div>
                                )}
                            />
                        </SectionCard>
                    </Anchor>

                    <Anchor id="exp-included">
                        <SectionCard title="What's Included" description="Equipment, transport, snacks, photos…">
                            <RepeatableList
                                items={form.included}
                                onChange={(v) => set("included", v)}
                                newItem={() => ({ title: "", description: "" })}
                                addLabel="Add item"
                                itemLabel="item"
                                max={20}
                                disabled={readOnly}
                                renderItem={(item, update, i) => (
                                    <div className="space-y-2">
                                        <input
                                            aria-label={`Included item ${i + 1} title`}
                                            className={inputClass}
                                            maxLength={100}
                                            value={item.title}
                                            onChange={(e) => update({ title: e.target.value })}
                                            placeholder="Return transport"
                                        />
                                        <textarea
                                            aria-label={`Included item ${i + 1} description`}
                                            className={textareaClass}
                                            maxLength={600}
                                            value={item.description}
                                            onChange={(e) => update({ description: e.target.value })}
                                            placeholder="Jeep from the landing site to take-off and back."
                                        />
                                    </div>
                                )}
                            />
                        </SectionCard>
                    </Anchor>

                    <Anchor id="exp-cancellation">
                        <SectionCard
                            title="Cancellation policy"
                            description="Shown on the Details tab."
                            actions={
                                !readOnly ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            if (
                                                form.cancellation_policy.some((p) => filled(p.title, p.description)) &&
                                                !window.confirm("Replace your policy with the standard one?")
                                            ) {
                                                return;
                                            }
                                            set("cancellation_policy", STANDARD_CANCELLATION_POLICY.map((p) => ({ ...p })));
                                        }}
                                    >
                                        Use standard policy
                                    </Button>
                                ) : undefined
                            }
                        >
                            <RepeatableList
                                items={form.cancellation_policy}
                                onChange={(v) => set("cancellation_policy", v)}
                                newItem={() => ({ title: "", description: "" })}
                                addLabel="Add section"
                                itemLabel="section"
                                max={10}
                                disabled={readOnly}
                                emptyText="Add your own sections, or start from the standard policy."
                                renderItem={(item, update, i) => (
                                    <div className="space-y-2">
                                        <input
                                            aria-label={`Policy section ${i + 1} title`}
                                            className={inputClass}
                                            maxLength={100}
                                            value={item.title}
                                            onChange={(e) => update({ title: e.target.value })}
                                            placeholder="Standard Cancellations"
                                        />
                                        <textarea
                                            aria-label={`Policy section ${i + 1} description`}
                                            className={textareaClass}
                                            maxLength={800}
                                            value={item.description}
                                            onChange={(e) => update({ description: e.target.value })}
                                        />
                                    </div>
                                )}
                            />
                        </SectionCard>
                    </Anchor>

                    <Anchor id="exp-faqs">
                        <SectionCard title="FAQs" description="Opened from Quick Links → FAQs.">
                            <RepeatableList
                                items={form.faqs}
                                onChange={(v) => set("faqs", v)}
                                newItem={() => ({ question: "", answer: "" })}
                                addLabel="Add question"
                                itemLabel="question"
                                max={30}
                                disabled={readOnly}
                                renderItem={(item, update, i) => (
                                    <div className="space-y-2">
                                        <input
                                            aria-label={`Question ${i + 1}`}
                                            className={inputClass}
                                            maxLength={200}
                                            value={item.question}
                                            onChange={(e) => update({ question: e.target.value })}
                                            placeholder="Is there a weight limit?"
                                        />
                                        <textarea
                                            aria-label={`Answer ${i + 1}`}
                                            className={textareaClass}
                                            maxLength={1500}
                                            value={item.answer}
                                            onChange={(e) => update({ answer: e.target.value })}
                                            placeholder="Yes — 30 to 110 kg for tandem flights."
                                        />
                                    </div>
                                )}
                            />
                        </SectionCard>
                    </Anchor>

                    <Anchor id="exp-options">
                        <SectionCard title="Options (session types)" description={OPTIONS_HINT}>
                            <div className="space-y-4">
                                <PaymentsNote />
                                <RepeatableList
                                    items={form.options}
                                    onChange={(v) => set("options", v)}
                                    newItem={() => ({ id: newOptionId(), name: "", description: "", duration_minutes: "", price: "" })}
                                    addLabel="Add option"
                                    itemLabel="option"
                                    max={20}
                                    disabled={readOnly}
                                    emptyText="No options — every slot is the same experience."
                                    renderItem={(item, update, i) => (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem_9rem] gap-2">
                                                <input
                                                    aria-label={`Option ${i + 1} name`}
                                                    className={inputClass}
                                                    maxLength={80}
                                                    value={item.name}
                                                    onChange={(e) => update({ name: e.target.value })}
                                                    placeholder="Hatha yoga"
                                                />
                                                <div className="relative">
                                                    <input
                                                        aria-label={`Option ${i + 1} duration in minutes`}
                                                        className={`${inputClass} pr-12`}
                                                        inputMode="numeric"
                                                        maxLength={4}
                                                        value={item.duration_minutes}
                                                        onChange={(e) => update({ duration_minutes: e.target.value.replace(/\D/g, "") })}
                                                        placeholder="60"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">min</span>
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
                                                    <input
                                                        aria-label={`Option ${i + 1} price per person`}
                                                        className={`${inputClass} pl-7`}
                                                        inputMode="decimal"
                                                        maxLength={8}
                                                        value={item.price}
                                                        onChange={(e) => update({ price: e.target.value.replace(/[^\d.]/g, "") })}
                                                        placeholder="800"
                                                    />
                                                </div>
                                            </div>
                                            <textarea
                                                aria-label={`Option ${i + 1} description`}
                                                className={textareaClass}
                                                maxLength={600}
                                                value={item.description}
                                                onChange={(e) => update({ description: e.target.value })}
                                                placeholder="Slow, alignment-focused flow for all levels."
                                            />
                                            <FieldError message={errors[`option_${i}`]} />
                                        </div>
                                    )}
                                />
                                <p className="text-xs text-neutral-500">
                                    Prices are per person. Each slot can have its own price — set it when you add slots.
                                </p>
                            </div>
                        </SectionCard>
                    </Anchor>
                </fieldset>

                <aside className="space-y-4 2xl:sticky 2xl:top-24">
                    <SectionCard title="Time slots">
                        <div className="space-y-3">
                            <p className="text-sm text-neutral-600">
                                {experience
                                    ? slots.isLoading
                                        ? "Checking your slots…"
                                        : upcomingSlots > 0
                                          ? `${upcomingSlots} upcoming slot${upcomingSlots === 1 ? "" : "s"} customers can book.`
                                          : "No upcoming slots yet — customers can't book until you add some."
                                    : "Save the experience, then add the dates and times customers can book."}
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                fullWidth
                                leftIcon={<CalendarRange className="w-4 h-4" />}
                                disabled={!!busy || (!experience && readOnly)}
                                onClick={() => void goToSlots()}
                            >
                                {dirty && canManage ? "Save & manage slots" : "Manage slots"}
                            </Button>
                        </div>
                    </SectionCard>

                    {status !== "published" && status !== "archived" && (
                        <SectionCard title="Ready to publish?">
                            <ul className="space-y-2">
                                {checklist.map((c) => (
                                    <li key={c.label} className="flex items-start gap-2 text-sm">
                                        {c.done ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                                        ) : (
                                            <Circle className="w-4 h-4 text-neutral-300 mt-0.5 shrink-0" />
                                        )}
                                        <span className={c.done ? "text-neutral-800" : "text-neutral-500"}>
                                            {c.label}
                                            {!c.done && c.hint && <span className="block text-xs text-neutral-400">{c.hint}</span>}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </SectionCard>
                    )}

                    <div className="hidden 2xl:block">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-2 px-1">Preview</p>
                        <ExperiencePreview
                            data={{
                                title: form.title,
                                tagline: form.tagline,
                                description: form.description,
                                tags: form.tags,
                                regionName: experience?.region_name ?? null,
                                media: form.media,
                                curatorName: form.curator.name,
                                curatorTitle: form.curator.title,
                                curatorYears: form.curator.years,
                                curatorPhoto: form.curator.photo_url,
                                durationText: form.duration_text,
                                locationLabel: form.placeMode === "custom" ? form.address : placeTitle,
                                priceFrom: experience?.price_from ?? (optionPrices.length ? Math.min(...optionPrices) : null),
                                highlights: form.highlights,
                                experienceMedia: form.experience_media,
                            }}
                        />
                    </div>
                </aside>
            </div>

            <ConfirmDialog
                open={archiveOpen}
                onClose={() => setArchiveOpen(false)}
                title="Archive this experience?"
                body="Customers won't see it any more. Existing bookings stay as they are. You can restore it as a draft later."
                confirmLabel="Archive"
                variant="danger"
                onConfirm={() => changeStatus("archived")}
            />
        </form>
    );
}

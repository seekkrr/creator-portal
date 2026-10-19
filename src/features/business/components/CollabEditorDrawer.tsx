import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@components/ui";
import { businessService } from "@services/business.service";
import type {
    BusinessCollab,
    CollabMode,
    CollabPayload,
    CreatorTier,
    DeliverableSpec,
    DeliverableType,
    DisclosureLabel,
    HubPlace,
    TimeWindow,
    UsageRights,
} from "@services/business.types";
import { useBusiness } from "../context";
import {
    DAY_LABELS,
    DELIVERABLE_LABELS,
    DELIVERABLE_TYPES,
    DISCLOSURE_OPTIONS,
    USAGE_RIGHTS_OPTIONS,
    dateInputToIso,
    isoToDateInput,
} from "../utils";
import { Drawer } from "./Overlay";
import { ChipInput } from "./ChipInput";
import { CollabPreviewCard } from "./CollabPreviewCard";
import { FieldLabel, SegmentedControl, Toggle, inputClass, selectClass } from "./bits";

interface Draft {
    marker_id: string;
    want: string;
    offer: string;
    description: string;
    mode: CollabMode;
    allow_advance_requests: boolean;
    slots_total: string;
    per_creator_limit: string;
    valid_from: string;
    valid_until: string;
    min_creator_tier: CreatorTier;
    deliverables: DeliverableSpec[];
    tag_handles: string[];
    hashtags: string[];
    location_tag: boolean;
    post_within_days: string;
    usage_rights: UsageRights;
    disclosure_label: DisclosureLabel;
    days_of_week: number[];
    time_windows: TimeWindow[];
    daily_cap: string;
    blackout_dates: string[];
}

function draftFrom(collab: BusinessCollab | undefined, defaultMarker: string): Draft {
    const brief = collab?.brief ?? {};
    const av = collab?.availability ?? {};
    return {
        marker_id: collab?.marker_id ?? defaultMarker,
        want: collab?.want ?? "",
        offer: collab?.offer ?? "",
        description: collab?.description ?? "",
        mode: collab?.mode ?? "open",
        allow_advance_requests: collab?.allow_advance_requests ?? false,
        slots_total: String(collab?.slots_total ?? 10),
        per_creator_limit: String(collab?.per_creator_limit ?? 1),
        valid_from: isoToDateInput(collab?.valid_from),
        valid_until: isoToDateInput(collab?.valid_until),
        min_creator_tier: (collab?.min_creator_tier as CreatorTier | undefined) ?? "community",
        deliverables: brief.deliverables?.length ? brief.deliverables.map((d) => ({ ...d })) : [{ type: "reel", count: 1 }],
        tag_handles: brief.tag_handles ?? [],
        hashtags: brief.hashtags ?? [],
        location_tag: brief.location_tag ?? true,
        post_within_days: String(brief.post_within_days ?? 7),
        usage_rights: brief.usage_rights ?? "none",
        disclosure_label: brief.disclosure_label ?? "#collab",
        days_of_week: av.days_of_week ?? [],
        time_windows: av.time_windows?.map((w) => ({ ...w })) ?? [],
        daily_cap: av.daily_cap ? String(av.daily_cap) : "",
        blackout_dates: av.blackout_dates ?? [],
    };
}

function toPayload(d: Draft): CollabPayload {
    return {
        want: d.want.trim(),
        offer: d.offer.trim(),
        description: d.description.trim(),
        mode: d.mode,
        allow_advance_requests: d.mode === "approval" && d.allow_advance_requests,
        slots_total: Number(d.slots_total),
        per_creator_limit: Number(d.per_creator_limit),
        valid_from: dateInputToIso(d.valid_from),
        valid_until: dateInputToIso(d.valid_until, true),
        min_creator_tier: d.min_creator_tier,
        brief: {
            deliverables: d.deliverables.map((x) => ({ type: x.type, count: Number(x.count) })),
            tag_handles: d.tag_handles,
            hashtags: d.hashtags,
            location_tag: d.location_tag,
            post_within_days: Number(d.post_within_days),
            usage_rights: d.usage_rights,
            disclosure_label: d.disclosure_label,
        },
        availability: {
            days_of_week: [...d.days_of_week].sort((a, b) => a - b),
            time_windows: d.time_windows,
            daily_cap: d.daily_cap ? Number(d.daily_cap) : null,
            blackout_dates: [...d.blackout_dates].sort(),
        },
    };
}

function validate(d: Draft, isEdit: boolean, slotsUsed: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (!isEdit && !d.marker_id) e.marker_id = "Pick the place this collab is for.";
    if (!d.want.trim()) e.want = "Say what you'd like from creators.";
    if (d.want.length > 120) e.want = "Keep it under 120 characters.";
    if (!d.offer.trim()) e.offer = "Say what creators get.";
    if (d.offer.length > 120) e.offer = "Keep it under 120 characters.";
    if (d.description.length > 1000) e.description = "Keep it under 1000 characters.";
    const slots = Number(d.slots_total);
    if (!Number.isInteger(slots) || slots < 1 || slots > 1000) e.slots_total = "Between 1 and 1000.";
    else if (slots < slotsUsed) e.slots_total = `At least ${slotsUsed} (already redeemed).`;
    const per = Number(d.per_creator_limit);
    if (!Number.isInteger(per) || per < 1 || per > 10) e.per_creator_limit = "Between 1 and 10.";
    if (d.valid_from && d.valid_until && d.valid_until < d.valid_from) e.valid_until = "Must be after the start date.";
    if (!d.deliverables.length) e.deliverables = "Add at least one deliverable.";
    if (d.deliverables.some((x) => !Number.isInteger(Number(x.count)) || Number(x.count) < 1 || Number(x.count) > 20))
        e.deliverables = "Each count must be between 1 and 20.";
    const pw = Number(d.post_within_days);
    if (!Number.isInteger(pw) || pw < 1 || pw > 60) e.post_within_days = "Between 1 and 60 days.";
    if (!d.disclosure_label) e.disclosure_label = "A disclosure label is required.";
    if (d.time_windows.some((w) => !w.start || !w.end || w.end <= w.start))
        e.time_windows = "Each window needs a start time before its end time.";
    if (d.daily_cap) {
        const cap = Number(d.daily_cap);
        if (!Number.isInteger(cap) || cap < 1 || cap > 100) e.daily_cap = "Between 1 and 100, or leave empty.";
    }
    return e;
}

function Section({
    title,
    hint,
    children,
    collapsible = false,
    defaultOpen = true,
}: {
    title: string;
    hint?: ReactNode;
    children: ReactNode;
    collapsible?: boolean;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const isOpen = !collapsible || open;
    return (
        <section className="rounded-2xl border border-neutral-200 bg-white">
            <button
                type="button"
                onClick={() => collapsible && setOpen((o) => !o)}
                className={`w-full flex items-start justify-between gap-3 text-left px-4 py-3 ${collapsible ? "cursor-pointer" : "cursor-default"}`}
                aria-expanded={isOpen}
            >
                <div>
                    <h3 className="font-display font-semibold text-neutral-900">{title}</h3>
                    {hint && <p className="text-xs text-neutral-500 mt-0.5">{hint}</p>}
                </div>
                {collapsible && (
                    <ChevronDown className={`w-5 h-5 text-neutral-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                )}
            </button>
            {isOpen && <div className="px-4 pb-4 space-y-4">{children}</div>}
        </section>
    );
}

function FieldError({ msg }: { msg?: string }) {
    return msg ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
            {msg}
        </p>
    ) : null;
}

interface CollabEditorDrawerProps {
    open: boolean;
    onClose: () => void;
    collab?: BusinessCollab;
    places: HubPlace[];
    /** Plan includes approval-mode collabs. */
    approvalAllowed: boolean;
    onSaved: (collab: BusinessCollab, created: boolean) => void;
    /** Error sink (402 → upgrade prompt, else toast). */
    onError: (e: unknown) => void;
    onUpgrade: (message: string) => void;
}

export function CollabEditorDrawer({
    open,
    onClose,
    collab,
    places,
    approvalAllowed,
    onSaved,
    onError,
    onUpgrade,
}: CollabEditorDrawerProps) {
    const { business, businessId } = useBusiness();
    const isEdit = !!collab;
    const defaultMarker = places.length === 1 ? (places[0]?.marker_id ?? "") : "";
    // The parent mounts this drawer fresh (keyed by collab id) each time it opens,
    // so the draft is initialised once and never clobbered by a background refetch.
    const [draft, setDraft] = useState<Draft>(() => draftFrom(collab, defaultMarker));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [blackoutDraft, setBlackoutDraft] = useState("");

    const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

    const placeTitle = places.find((p) => p.marker_id === draft.marker_id)?.title ?? null;
    const approvalLocked = !approvalAllowed && collab?.mode !== "approval";

    const preview = useMemo(() => {
        const p = toPayload(draft);
        const total = Number(draft.slots_total) || 0;
        return {
            want: p.want ?? "",
            offer: p.offer ?? "",
            description: p.description ?? "",
            mode: draft.mode,
            allow_advance_requests: !!p.allow_advance_requests,
            slots_left: Math.max(0, total - (collab?.slots_used ?? 0)),
            valid_until: p.valid_until ?? null,
            brief: p.brief ?? {},
            availability: p.availability ?? {},
        };
    }, [draft, collab?.slots_used]);

    const save = async () => {
        const errs = validate(draft, isEdit, collab?.slots_used ?? 0);
        setErrors(errs);
        if (Object.keys(errs).length) {
            toast.error("Please fix the highlighted fields.");
            return;
        }
        setSaving(true);
        try {
            if (collab) {
                // Send only what changed: re-sending unchanged text would re-run moderation.
                const before = toPayload(draftFrom(collab, collab.marker_id)) as Record<string, unknown>;
                const after = toPayload(draft) as Record<string, unknown>;
                const changed: Record<string, unknown> = {};
                for (const key of Object.keys(after)) {
                    if (JSON.stringify(after[key]) !== JSON.stringify(before[key])) changed[key] = after[key];
                }
                if (!Object.keys(changed).length) {
                    toast.info("No changes to save.");
                    onClose();
                    return;
                }
                const updated = await businessService.updateCollab(businessId, collab.id, changed as CollabPayload);
                onSaved(updated, false);
            } else {
                const payload = toPayload(draft);
                const body: CollabPayload = { ...payload, marker_id: draft.marker_id };
                if (!body.valid_from) delete body.valid_from;
                if (!body.valid_until) delete body.valid_until;
                const created = await businessService.createCollab(businessId, body);
                onSaved(created, true);
            }
        } catch (e) {
            onError(e);
        } finally {
            setSaving(false);
        }
    };

    const updateDeliverable = (i: number, patch: Partial<DeliverableSpec>) =>
        set(
            "deliverables",
            draft.deliverables.map((d, idx) => (idx === i ? { ...d, ...patch } : d))
        );

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width="xl"
            title={isEdit ? "Edit collab" : "Post a collab"}
            subtitle={
                isEdit
                    ? "Edits to the text are re-checked before creators see them."
                    : "Creators near your place see it on the map; full details unlock when they check in."
            }
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="accent" onClick={() => void save()} isLoading={saving} disabled={saving}>
                        {isEdit ? "Save changes" : "Post collab"}
                    </Button>
                </>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
                <div className="space-y-4 min-w-0">
                    <Section title="The offer" hint="Mirrors the app: Want, For and a short description.">
                        {!isEdit && (
                            <div>
                                <FieldLabel htmlFor="collab-place">Place</FieldLabel>
                                {places.length === 0 ? (
                                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                                        No place is linked to this business yet. Contact partners@seekkrr.com to link your
                                        location.
                                    </p>
                                ) : (
                                    <select
                                        id="collab-place"
                                        className={selectClass}
                                        value={draft.marker_id}
                                        onChange={(e) => set("marker_id", e.target.value)}
                                    >
                                        <option value="">Select a place…</option>
                                        {places.map((p) => (
                                            <option key={p.marker_id} value={p.marker_id}>
                                                {p.title ?? p.marker_id}
                                                {p.code_set ? "" : " (redeem code not set)"}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <FieldError msg={errors.marker_id} />
                            </div>
                        )}
                        <div>
                            <FieldLabel htmlFor="collab-want" hint="What you'd like in return, e.g. “1 reel + 2 stories tagging us”.">
                                Want
                            </FieldLabel>
                            <input
                                id="collab-want"
                                className={inputClass}
                                maxLength={120}
                                value={draft.want}
                                onChange={(e) => set("want", e.target.value)}
                                placeholder="1 reel + 2 stories"
                            />
                            <FieldError msg={errors.want} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="collab-offer" hint="What creators get, e.g. “Free stay for 2 nights”.">
                                For
                            </FieldLabel>
                            <input
                                id="collab-offer"
                                className={inputClass}
                                maxLength={120}
                                value={draft.offer}
                                onChange={(e) => set("offer", e.target.value)}
                                placeholder="Free lunch for two"
                            />
                            <FieldError msg={errors.offer} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="collab-desc">Description</FieldLabel>
                            <textarea
                                id="collab-desc"
                                className={`${inputClass} min-h-[96px]`}
                                maxLength={1000}
                                value={draft.description}
                                onChange={(e) => set("description", e.target.value)}
                                placeholder="Anything creators should know — what's included, best time to come…"
                            />
                            <div className="flex justify-between">
                                <FieldError msg={errors.description} />
                                <span className="text-xs text-neutral-400 ml-auto">{draft.description.length}/1000</span>
                            </div>
                        </div>
                    </Section>

                    <Section title="How creators join">
                        <SegmentedControl<CollabMode>
                            ariaLabel="Collab mode"
                            value={draft.mode}
                            onChange={(m) => {
                                if (m === "approval" && approvalLocked) {
                                    onUpgrade(
                                        "Approval-mode collabs (you pick each creator) are on the Growth plan and above."
                                    );
                                    return;
                                }
                                set("mode", m);
                            }}
                            options={[
                                { value: "open", label: "Open" },
                                {
                                    value: "approval",
                                    label: (
                                        <span className="inline-flex items-center gap-1">
                                            {approvalLocked && <Lock className="w-3.5 h-3.5" />}Approval
                                        </span>
                                    ),
                                },
                            ]}
                        />
                        <p className="text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-xl p-3">
                            {draft.mode === "open" ? (
                                <>
                                    <span className="font-semibold">Open:</span> any creator who checks in at your place can
                                    redeem straight away. Your staff types your 4-digit redeem code on their phone.
                                </>
                            ) : (
                                <>
                                    <span className="font-semibold">Approval:</span> creators tap Avail and share their
                                    profile. You approve each one in Requests, then they redeem with your code.
                                </>
                            )}
                            {approvalLocked && (
                                <>
                                    {" "}
                                    <Link to="/business/billing" className="text-primary-700 font-medium underline">
                                        Approval mode is on Growth and above.
                                    </Link>
                                </>
                            )}
                        </p>
                        {draft.mode === "approval" && (
                            <Toggle
                                id="collab-advance"
                                checked={draft.allow_advance_requests}
                                onChange={(v) => set("allow_advance_requests", v)}
                                label="Allow advance requests"
                                description="Creators can request visit dates before they arrive — best for stays and experiences. They can only redeem within the dates you approve."
                            />
                        )}
                        <div>
                            <FieldLabel htmlFor="collab-tier">Who can join</FieldLabel>
                            <select
                                id="collab-tier"
                                className={selectClass}
                                value={draft.min_creator_tier}
                                onChange={(e) => set("min_creator_tier", e.target.value as CreatorTier)}
                            >
                                <option value="community">All creators</option>
                                <option value="verified">Verified creators only (ownership-verified handle)</option>
                            </select>
                        </div>
                    </Section>

                    <Section title="Slots & dates">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <FieldLabel htmlFor="collab-slots" hint="Total redemptions for this collab.">
                                    Slots
                                </FieldLabel>
                                <input
                                    id="collab-slots"
                                    type="number"
                                    min={Math.max(1, collab?.slots_used ?? 1)}
                                    max={1000}
                                    className={inputClass}
                                    value={draft.slots_total}
                                    onChange={(e) => set("slots_total", e.target.value)}
                                />
                                <FieldError msg={errors.slots_total} />
                            </div>
                            <div>
                                <FieldLabel htmlFor="collab-per" hint="How many times one creator may redeem.">
                                    Per-creator limit
                                </FieldLabel>
                                <input
                                    id="collab-per"
                                    type="number"
                                    min={1}
                                    max={10}
                                    className={inputClass}
                                    value={draft.per_creator_limit}
                                    onChange={(e) => set("per_creator_limit", e.target.value)}
                                />
                                <FieldError msg={errors.per_creator_limit} />
                            </div>
                            <div>
                                <FieldLabel htmlFor="collab-from" hint="Optional.">
                                    Valid from
                                </FieldLabel>
                                <input
                                    id="collab-from"
                                    type="date"
                                    className={inputClass}
                                    value={draft.valid_from}
                                    onChange={(e) => set("valid_from", e.target.value)}
                                />
                            </div>
                            <div>
                                <FieldLabel htmlFor="collab-until" hint="Optional.">
                                    Valid until
                                </FieldLabel>
                                <input
                                    id="collab-until"
                                    type="date"
                                    className={inputClass}
                                    value={draft.valid_until}
                                    min={draft.valid_from || undefined}
                                    onChange={(e) => set("valid_until", e.target.value)}
                                />
                                <FieldError msg={errors.valid_until} />
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Brief"
                        hint="What creators post. Shown to them as a checklist."
                        collapsible
                    >
                        <div>
                            <FieldLabel>Deliverables</FieldLabel>
                            <div className="space-y-2">
                                {draft.deliverables.map((d, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            max={20}
                                            aria-label="Count"
                                            className={`${inputClass} w-20`}
                                            value={d.count}
                                            onChange={(e) => updateDeliverable(i, { count: Number(e.target.value) })}
                                        />
                                        <select
                                            aria-label="Type"
                                            className={selectClass}
                                            value={d.type}
                                            onChange={(e) => updateDeliverable(i, { type: e.target.value as DeliverableType })}
                                        >
                                            {DELIVERABLE_TYPES.map((t) => (
                                                <option key={t} value={t}>
                                                    {DELIVERABLE_LABELS[t].many}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            aria-label="Remove deliverable"
                                            onClick={() =>
                                                set(
                                                    "deliverables",
                                                    draft.deliverables.filter((_, idx) => idx !== i)
                                                )
                                            }
                                            className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {draft.deliverables.length < 5 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2"
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    onClick={() =>
                                        set("deliverables", [...draft.deliverables, { type: "story", count: 1 }])
                                    }
                                >
                                    Add deliverable
                                </Button>
                            )}
                            <FieldError msg={errors.deliverables} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="collab-handles" hint="Accounts creators must tag. Press Enter after each.">
                                Tag handles
                            </FieldLabel>
                            <ChipInput
                                id="collab-handles"
                                values={draft.tag_handles}
                                onChange={(v) => set("tag_handles", v)}
                                max={10}
                                prefix="@"
                                placeholder="yourcafe"
                                normalize={(s) => s.trim().replace(/^@+/, "").replace(/\s+/g, "")}
                            />
                        </div>
                        <div>
                            <FieldLabel htmlFor="collab-hashtags">Hashtags</FieldLabel>
                            <ChipInput
                                id="collab-hashtags"
                                values={draft.hashtags}
                                onChange={(v) => set("hashtags", v)}
                                max={15}
                                placeholder="#bir"
                                normalize={(s) => {
                                    const t = s.trim().replace(/^#+/, "").replace(/\s+/g, "");
                                    return t ? `#${t}` : "";
                                }}
                            />
                        </div>
                        <Toggle
                            id="collab-location-tag"
                            checked={draft.location_tag}
                            onChange={(v) => set("location_tag", v)}
                            label="Tag the location"
                            description="Creators add your place as the post's location."
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <FieldLabel htmlFor="collab-post-within" hint="Counted from redemption.">
                                    Post within (days)
                                </FieldLabel>
                                <input
                                    id="collab-post-within"
                                    type="number"
                                    min={1}
                                    max={60}
                                    className={inputClass}
                                    value={draft.post_within_days}
                                    onChange={(e) => set("post_within_days", e.target.value)}
                                />
                                <FieldError msg={errors.post_within_days} />
                            </div>
                            <div>
                                <FieldLabel htmlFor="collab-rights">Usage rights</FieldLabel>
                                <select
                                    id="collab-rights"
                                    className={selectClass}
                                    value={draft.usage_rights}
                                    onChange={(e) => set("usage_rights", e.target.value as UsageRights)}
                                >
                                    {USAGE_RIGHTS_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-neutral-500 mt-1">
                                    {USAGE_RIGHTS_OPTIONS.find((o) => o.value === draft.usage_rights)?.hint}
                                </p>
                            </div>
                        </div>
                        <div>
                            <FieldLabel hint="Required on every post (ASCI influencer guidelines).">
                                Disclosure label <span className="text-red-600">*</span>
                            </FieldLabel>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {DISCLOSURE_OPTIONS.map((o) => (
                                    <label
                                        key={o.value}
                                        className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                                            draft.disclosure_label === o.value
                                                ? "border-primary-500 bg-primary-50"
                                                : "border-neutral-200 hover:bg-neutral-50"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="disclosure"
                                            className="mt-1 accent-primary-600"
                                            checked={draft.disclosure_label === o.value}
                                            onChange={() => set("disclosure_label", o.value)}
                                        />
                                        <span>
                                            <span className="block font-semibold text-sm text-neutral-900">{o.value}</span>
                                            <span className="block text-xs text-neutral-500">{o.hint}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <FieldError msg={errors.disclosure_label} />
                        </div>
                    </Section>

                    <Section
                        title="Availability"
                        hint="When creators can avail or redeem (India time). Leave empty for any day, any time."
                        collapsible
                    >
                        <div>
                            <FieldLabel>Days of the week</FieldLabel>
                            <div className="flex flex-wrap gap-1.5">
                                {DAY_LABELS.map((label, idx) => {
                                    const on = draft.days_of_week.includes(idx);
                                    return (
                                        <button
                                            key={label}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() =>
                                                set(
                                                    "days_of_week",
                                                    on
                                                        ? draft.days_of_week.filter((d) => d !== idx)
                                                        : [...draft.days_of_week, idx]
                                                )
                                            }
                                            className={`w-12 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                                on
                                                    ? "bg-primary-600 text-white border-primary-600"
                                                    : "bg-white text-neutral-600 border-neutral-300 hover:border-primary-400"
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                                {draft.days_of_week.length === 0 ? "Every day" : `${draft.days_of_week.length} day(s) selected`}
                            </p>
                        </div>
                        <div>
                            <FieldLabel>Time windows</FieldLabel>
                            <div className="space-y-2">
                                {draft.time_windows.map((w, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            aria-label="Start"
                                            className={`${inputClass} w-36`}
                                            value={w.start}
                                            onChange={(e) =>
                                                set(
                                                    "time_windows",
                                                    draft.time_windows.map((x, idx) =>
                                                        idx === i ? { ...x, start: e.target.value } : x
                                                    )
                                                )
                                            }
                                        />
                                        <span className="text-neutral-400">to</span>
                                        <input
                                            type="time"
                                            aria-label="End"
                                            className={`${inputClass} w-36`}
                                            value={w.end}
                                            onChange={(e) =>
                                                set(
                                                    "time_windows",
                                                    draft.time_windows.map((x, idx) =>
                                                        idx === i ? { ...x, end: e.target.value } : x
                                                    )
                                                )
                                            }
                                        />
                                        <button
                                            type="button"
                                            aria-label="Remove window"
                                            onClick={() =>
                                                set(
                                                    "time_windows",
                                                    draft.time_windows.filter((_, idx) => idx !== i)
                                                )
                                            }
                                            className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {draft.time_windows.length < 4 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2"
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    onClick={() =>
                                        set("time_windows", [...draft.time_windows, { start: "11:00", end: "17:00" }])
                                    }
                                >
                                    Add time window
                                </Button>
                            )}
                            {draft.time_windows.length === 0 && (
                                <p className="text-xs text-neutral-500 mt-1">Any time of day</p>
                            )}
                            <FieldError msg={errors.time_windows} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <FieldLabel htmlFor="collab-cap" hint="Max redemptions per day. Optional.">
                                    Daily cap
                                </FieldLabel>
                                <input
                                    id="collab-cap"
                                    type="number"
                                    min={1}
                                    max={100}
                                    className={inputClass}
                                    value={draft.daily_cap}
                                    onChange={(e) => set("daily_cap", e.target.value)}
                                    placeholder="No cap"
                                />
                                <FieldError msg={errors.daily_cap} />
                            </div>
                            <div>
                                <FieldLabel htmlFor="collab-blackout" hint="Days the collab is off (festivals, full house).">
                                    Blackout dates
                                </FieldLabel>
                                <div className="flex gap-2">
                                    <input
                                        id="collab-blackout"
                                        type="date"
                                        className={inputClass}
                                        value={blackoutDraft}
                                        onChange={(e) => setBlackoutDraft(e.target.value)}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={!blackoutDraft || draft.blackout_dates.length >= 60}
                                        onClick={() => {
                                            if (blackoutDraft && !draft.blackout_dates.includes(blackoutDraft)) {
                                                set("blackout_dates", [...draft.blackout_dates, blackoutDraft].sort());
                                            }
                                            setBlackoutDraft("");
                                        }}
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </div>
                        {draft.blackout_dates.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {draft.blackout_dates.map((d) => (
                                    <span
                                        key={d}
                                        className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-xs border border-neutral-200"
                                    >
                                        {d}
                                        <button
                                            type="button"
                                            aria-label={`Remove ${d}`}
                                            onClick={() =>
                                                set(
                                                    "blackout_dates",
                                                    draft.blackout_dates.filter((x) => x !== d)
                                                )
                                            }
                                            className="p-0.5 rounded-full hover:bg-neutral-200"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </Section>
                </div>

                <div className="lg:sticky lg:top-0 self-start">
                    <CollabPreviewCard
                        data={preview}
                        businessName={business.name}
                        placeTitle={placeTitle}
                        logoUrl={business.logo_url}
                    />
                    <p className="text-xs text-neutral-500 mt-3 px-1">
                        Before checking in, creators only see the “For” headline and whether it's Open or Approval. The
                        rest unlocks after a same-day check-in, an invite or an approved advance request.
                    </p>
                </div>
            </div>
        </Drawer>
    );
}

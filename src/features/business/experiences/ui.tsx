import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ImagePlus, Info, Loader2, Lock, Plus, Trash2, X } from "lucide-react";
import { cloudinaryService } from "@services/cloudinary.service";
import type { ExperienceBooking, ExperienceBookingStatus, ExperienceGst, ExperienceStatus } from "@services/experience.types";
import { Pill } from "../components/bits";
import { errorMessage } from "../utils";
import { BOOKING_STATUS_META, EXPERIENCE_STATUS_META, PAYMENTS_NOTE, PRICE_NOT_SET, PRICE_SET_BY_SEEKKRR } from "./utils";
import { formatPrice, gstLabel, paymentLabel } from "./money";

export function ExperienceStatusPill({ status }: { status: ExperienceStatus }) {
    const meta = EXPERIENCE_STATUS_META[status] ?? { label: status, className: "bg-neutral-100 text-neutral-600" };
    return <Pill className={meta.className}>{meta.label}</Pill>;
}

export function BookingStatusPill({ status }: { status: ExperienceBookingStatus }) {
    const meta = BOOKING_STATUS_META[status] ?? { label: status, className: "bg-neutral-100 text-neutral-600" };
    return <Pill className={meta.className}>{meta.label}</Pill>;
}

/** How customers pay (SeekKrr collects and pays the business out), shown wherever prices appear. */
export function PaymentsNote({ className = "" }: { className?: string }) {
    return (
        <p
            className={`flex items-start gap-2 rounded-xl bg-primary-50 border border-primary-100 px-3.5 py-2.5 text-sm text-primary-900 ${className}`}
        >
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{PAYMENTS_NOTE}</span>
        </p>
    );
}

/** Paid / Refund pending / Refunded / Free for one booking. */
export function PaymentPill({ booking }: { booking: Pick<ExperienceBooking, "payment" | "pricing" | "total_amount"> }) {
    const meta = paymentLabel(booking);
    return <Pill className={meta.className}>{meta.label}</Pill>;
}

/** A price businesses can see but not change: "₹800 /person · + 18% GST", or "SeekKrr will set the price". */
export function SeekKrrPrice({
    price,
    gst,
    label = PRICE_SET_BY_SEEKKRR,
    compact = false,
    className = "",
}: {
    price: number | null | undefined;
    gst?: ExperienceGst | null;
    label?: string;
    compact?: boolean;
    className?: string;
}) {
    const value =
        price === null || price === undefined ? (
            <span className="text-neutral-500">{PRICE_NOT_SET}</span>
        ) : (
            <>
                <span className="font-semibold text-neutral-900 tabular-nums">{formatPrice(price)}</span>
                {price > 0 && (
                    <>
                        <span className="text-neutral-500"> /person</span>
                        <span className="text-neutral-500"> · {gstLabel(gst)}</span>
                    </>
                )}
            </>
        );
    if (compact) {
        return (
            <div className={`rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm ${className}`} title={label}>
                <span className="sr-only">{label}: </span>
                {value}
            </div>
        );
    }
    return (
        <div className={`rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 ${className}`}>
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                <Lock className="w-3 h-3" /> {label}
            </p>
            <p className="text-sm mt-0.5">{value}</p>
        </div>
    );
}

const iconBtn =
    "p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent";

/**
 * A list of repeatable cards (highlights, itinerary, FAQs…): add, remove and
 * move up/down. `numbered` shows 1, 2, 3 like the app does.
 */
export function RepeatableList<T>({
    items,
    onChange,
    newItem,
    renderItem,
    addLabel,
    itemLabel,
    max = 30,
    numbered = false,
    emptyText,
    disabled = false,
}: {
    items: T[];
    onChange: (items: T[]) => void;
    newItem: () => T;
    renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
    addLabel: string;
    /** Used in button labels, e.g. "highlight". */
    itemLabel: string;
    max?: number;
    numbered?: boolean;
    emptyText?: string;
    disabled?: boolean;
}) {
    const update = (i: number, patch: Partial<T>) =>
        onChange(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    const move = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= items.length) return;
        const next = [...items];
        const a = next[i];
        const b = next[j];
        if (a === undefined || b === undefined) return;
        next[i] = b;
        next[j] = a;
        onChange(next);
    };

    return (
        <div className="space-y-3">
            {items.length === 0 && emptyText && <p className="text-sm text-neutral-500">{emptyText}</p>}
            {items.map((item, i) => (
                <div key={i} className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-3">
                        {numbered ? (
                            <span className="w-6 h-6 rounded-full bg-primary-900 text-white text-xs font-bold flex items-center justify-center">
                                {i + 1}
                            </span>
                        ) : (
                            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                {itemLabel} {i + 1}
                            </span>
                        )}
                        {!disabled && (
                            <div className="ml-auto flex items-center gap-0.5">
                                <button
                                    type="button"
                                    className={iconBtn}
                                    aria-label={`Move ${itemLabel} ${i + 1} up`}
                                    disabled={i === 0}
                                    onClick={() => move(i, -1)}
                                >
                                    <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    className={iconBtn}
                                    aria-label={`Move ${itemLabel} ${i + 1} down`}
                                    disabled={i === items.length - 1}
                                    onClick={() => move(i, 1)}
                                >
                                    <ArrowDown className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
                                    aria-label={`Remove ${itemLabel} ${i + 1}`}
                                    onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    {renderItem(item, (patch) => update(i, patch), i)}
                </div>
            ))}
            {!disabled && items.length < max && (
                <button
                    type="button"
                    onClick={() => onChange([...items, newItem()])}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-dashed border-neutral-300 text-sm font-semibold text-primary-700 hover:border-primary-400 hover:bg-primary-50/50"
                >
                    <Plus className="w-4 h-4" /> {addLabel}
                </button>
            )}
        </div>
    );
}

async function uploadAll(files: File[], businessId: string): Promise<string[]> {
    const results = await Promise.allSettled(
        files.map((f) => cloudinaryService.uploadImage(f, { category: "website", entity_id: businessId }))
    );
    const urls: string[] = [];
    let failed: unknown = null;
    for (const r of results) {
        if (r.status === "fulfilled") urls.push(r.value.secure_url);
        else failed = r.reason;
    }
    if (failed) toast.error(errorMessage(failed, "Some photos couldn't be uploaded"));
    return urls;
}

/**
 * Photos with upload, reorder (left/right) and remove. With `coverFirst` the
 * first photo is marked as the cover, like the app's carousel.
 */
export function PhotoListEditor({
    id,
    values,
    onChange,
    businessId,
    max = 12,
    coverFirst = false,
    disabled = false,
}: {
    id: string;
    values: string[];
    onChange: (values: string[]) => void;
    businessId: string;
    max?: number;
    coverFirst?: boolean;
    disabled?: boolean;
}) {
    const [uploading, setUploading] = useState(0);
    const latest = useRef(values);
    latest.current = values;

    const add = async (list: FileList | null) => {
        if (!list?.length) return;
        const room = max - latest.current.length;
        const files = Array.from(list).slice(0, Math.max(0, room));
        if (!files.length) return;
        setUploading(files.length);
        try {
            const urls = await uploadAll(files, businessId);
            if (urls.length) onChange([...latest.current, ...urls].slice(0, max));
        } finally {
            setUploading(0);
        }
    };

    const move = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= values.length) return;
        const next = [...values];
        const a = next[i];
        const b = next[j];
        if (a === undefined || b === undefined) return;
        next[i] = b;
        next[j] = a;
        onChange(next);
    };

    return (
        <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {values.map((url, i) => (
                    <div key={`${url}-${i}`} className="relative group rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
                        <img src={url} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy" />
                        {coverFirst && i === 0 && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary-900 text-white text-[11px] font-semibold">
                                Cover
                            </span>
                        )}
                        {!disabled && (
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        aria-label={`Move photo ${i + 1} earlier`}
                                        disabled={i === 0}
                                        onClick={() => move(i, -1)}
                                        className="p-1 rounded-full bg-white/90 text-neutral-700 disabled:opacity-40"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`Move photo ${i + 1} later`}
                                        disabled={i === values.length - 1}
                                        onClick={() => move(i, 1)}
                                        className="p-1 rounded-full bg-white/90 text-neutral-700 disabled:opacity-40"
                                    >
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    aria-label={`Remove photo ${i + 1}`}
                                    onClick={() => onChange(values.filter((_, idx) => idx !== i))}
                                    className="p-1 rounded-full bg-white/90 text-neutral-700 hover:text-red-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {!disabled && values.length < max && (
                    <label
                        htmlFor={id}
                        className={`flex flex-col items-center justify-center gap-1 aspect-[4/3] rounded-xl border-2 border-dashed border-neutral-300 text-neutral-500 hover:border-primary-400 hover:text-primary-700 cursor-pointer ${
                            uploading ? "pointer-events-none opacity-70" : ""
                        }`}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-xs font-medium">
                                    Uploading {uploading > 1 ? `${uploading} photos` : "photo"}…
                                </span>
                            </>
                        ) : (
                            <>
                                <ImagePlus className="w-6 h-6" />
                                <span className="text-xs font-semibold">Add photos</span>
                            </>
                        )}
                        <input
                            id={id}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={!!uploading}
                            onChange={(e) => {
                                void add(e.target.files);
                                e.target.value = "";
                            }}
                        />
                    </label>
                )}
            </div>
            <p className="text-xs text-neutral-400 mt-2">
                {values.length}/{max} · PNG, JPG or WebP
            </p>
        </div>
    );
}

/** One image (curator photo, itinerary thumbnail) with upload and remove. */
export function ImagePicker({
    id,
    value,
    onChange,
    businessId,
    label = "Add photo",
    round = false,
    disabled = false,
}: {
    id: string;
    value: string;
    onChange: (url: string) => void;
    businessId: string;
    label?: string;
    round?: boolean;
    disabled?: boolean;
}) {
    const [uploading, setUploading] = useState(false);
    const shape = round ? "rounded-full w-20 h-20" : "rounded-xl w-28 h-20";

    const upload = async (file: File | undefined) => {
        if (!file) return;
        setUploading(true);
        try {
            const [url] = await uploadAll([file], businessId);
            if (url) onChange(url);
        } finally {
            setUploading(false);
        }
    };

    if (value) {
        return (
            <div className="relative inline-block">
                <img src={value} alt="" className={`${shape} object-cover border border-neutral-200 bg-neutral-100`} />
                {!disabled && (
                    <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => onChange("")}
                        className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-white border border-neutral-200 shadow text-neutral-600 hover:text-red-600"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        );
    }

    return (
        <label
            htmlFor={id}
            className={`${shape} flex flex-col items-center justify-center gap-1 border-2 border-dashed border-neutral-300 text-neutral-500 ${
                disabled ? "opacity-60" : "hover:border-primary-400 hover:text-primary-700 cursor-pointer"
            } ${uploading ? "pointer-events-none opacity-70" : ""}`}
        >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            <span className="text-[11px] font-semibold text-center leading-tight px-1">{uploading ? "Uploading…" : label}</span>
            <input
                id={id}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled || uploading}
                onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                }}
            />
        </label>
    );
}

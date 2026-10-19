import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, ImagePlus, Loader2, Plus, Store, Trash2, Upload } from "lucide-react";
import { Button, ErrorState, Skeleton } from "@components/ui";
import { useAuthStore } from "@store/auth.store";
import { businessService } from "@services/business.service";
import { cloudinaryService } from "@services/cloudinary.service";
import type { Business, UpdateBusinessPayload } from "@services/business.types";
import { useBusiness } from "../context";
import { bkeys, useBusinessDetail } from "../queries";
import { errorMessage } from "../utils";
import { ChipInput } from "../components/ChipInput";
import { FieldLabel, PageHeader, SectionCard, Toggle, inputClass } from "../components/bits";

const CATEGORY_SUGGESTIONS = ["Café", "Restaurant", "Hostel", "Homestay", "Hotel", "Experience", "Adventure", "Wellness", "Shop", "Bar"];

interface ProfileForm {
    name: string;
    tagline: string;
    description: string;
    categories: string[];
    socials: string[];
    photos: string[];
    logo_url: string;
    contact_phone: string;
    contact_email: string;
    show_on_website: boolean;
}

function formFrom(b: Business): ProfileForm {
    return {
        name: b.name ?? "",
        tagline: b.tagline ?? "",
        description: b.description ?? "",
        categories: b.categories ?? [],
        socials: (b.socials ?? []).map((s) => s.url),
        photos: b.photos ?? [],
        logo_url: b.logo_url ?? "",
        contact_phone: b.contact_phone ?? "",
        contact_email: b.contact_email ?? "",
        show_on_website: b.show_on_website ?? true,
    };
}

export function BusinessProfilePage() {
    const { businessId, canManage, isOwner } = useBusiness();
    const detail = useBusinessDetail();
    const queryClient = useQueryClient();
    const refreshSession = useAuthStore((s) => s.refreshSession);
    const [form, setForm] = useState<ProfileForm | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<"logo" | "photo" | null>(null);
    const [photoUrl, setPhotoUrl] = useState("");
    const logoInput = useRef<HTMLInputElement>(null);
    const photoInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (detail.data) setForm(formFrom(detail.data));
    }, [detail.data]);

    if (detail.isLoading || (!form && !detail.isError)) {
        return (
            <div className="space-y-6">
                <Skeleton height={40} className="w-64" />
                <Skeleton height={320} />
            </div>
        );
    }
    if (detail.isError || !form || !detail.data) {
        return <ErrorState message="We couldn't load your business profile." onRetry={() => void detail.refetch()} />;
    }

    const readOnly = !canManage;
    const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
        setForm((f) => (f ? { ...f, [key]: value } : f));

    const upload = async (file: File, kind: "logo" | "photo") => {
        setUploading(kind);
        try {
            const res = await cloudinaryService.uploadImage(file, {
                category: kind === "logo" ? "logo" : "website",
                entity_id: businessId,
            });
            if (kind === "logo") set("logo_url", res.secure_url);
            else if (form.photos.length < 20) set("photos", [...form.photos, res.secure_url]);
            toast.success(kind === "logo" ? "Logo uploaded — save to apply." : "Photo added — save to apply.");
        } catch (e) {
            toast.error(errorMessage(e, "Upload failed"));
        } finally {
            setUploading(null);
        }
    };

    const validate = (): Record<string, string> => {
        const e: Record<string, string> = {};
        if (isOwner && !form.name.trim()) e.name = "Your business needs a name.";
        if (form.tagline.length > 150) e.tagline = "Keep it under 150 characters.";
        if (form.description.length > 3000) e.description = "Keep it under 3000 characters.";
        if (form.socials.some((s) => !s.startsWith("https://"))) e.socials = "Links must start with https://";
        if (form.logo_url && !form.logo_url.startsWith("https://")) e.logo_url = "The logo must be an https:// URL.";
        if (form.contact_email && !/^\S+@\S+\.\S+$/.test(form.contact_email)) e.contact_email = "Enter a valid email.";
        return e;
    };

    const save = async (e: FormEvent) => {
        e.preventDefault();
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setSaving(true);
        try {
            const payload: UpdateBusinessPayload = {
                tagline: form.tagline.trim(),
                description: form.description.trim(),
                categories: form.categories,
                socials: form.socials.map((url) => ({ url })),
                photos: form.photos,
                contact_phone: form.contact_phone.trim(),
                contact_email: form.contact_email.trim(),
            };
            if (form.logo_url) payload.logo_url = form.logo_url;
            if (isOwner) {
                payload.name = form.name.trim();
                payload.show_on_website = form.show_on_website;
            }
            const updated = await businessService.update(businessId, payload);
            queryClient.setQueryData(bkeys.detail(businessId), updated);
            await queryClient.invalidateQueries({ queryKey: bkeys.hub(businessId) });
            void refreshSession(); // name / logo in the header and picker
            toast.success("Profile saved.");
        } catch (err) {
            toast.error(errorMessage(err, "Couldn't save the profile"));
        } finally {
            setSaving(false);
        }
    };

    const publicUrl = detail.data.slug ? `https://seekkrr.com/places/${detail.data.slug}` : null;

    return (
        <form onSubmit={(e) => void save(e)} className="space-y-6">
            <PageHeader
                title="Business profile"
                description="Know Your Business — what creators see in the app and travellers see on seekkrr.com."
                actions={
                    canManage ? (
                        <Button type="submit" variant="accent" isLoading={saving} disabled={saving || !!uploading} className="w-full sm:w-auto">
                            Save changes
                        </Button>
                    ) : undefined
                }
            />

            {readOnly && (
                <p className="text-sm text-neutral-600 bg-white border border-neutral-200 rounded-2xl p-4">
                    You're viewing the profile. Managers and owners can edit it.
                </p>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <SectionCard title="About">
                        <div className="space-y-4">
                            <div>
                                <FieldLabel htmlFor="bp-name" hint={isOwner ? undefined : "Only the owner can rename the business."}>
                                    Business name
                                </FieldLabel>
                                <input
                                    id="bp-name"
                                    className={inputClass}
                                    maxLength={150}
                                    value={form.name}
                                    disabled={!isOwner}
                                    onChange={(e) => set("name", e.target.value)}
                                />
                                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <FieldLabel htmlFor="bp-tagline">Tagline</FieldLabel>
                                <input
                                    id="bp-tagline"
                                    className={inputClass}
                                    maxLength={150}
                                    value={form.tagline}
                                    disabled={readOnly}
                                    onChange={(e) => set("tagline", e.target.value)}
                                    placeholder="Rooftop café with a view of the landing site"
                                />
                                {errors.tagline && <p className="text-xs text-red-600 mt-1">{errors.tagline}</p>}
                            </div>
                            <div>
                                <FieldLabel htmlFor="bp-desc">Description</FieldLabel>
                                <textarea
                                    id="bp-desc"
                                    className={`${inputClass} min-h-[140px]`}
                                    maxLength={3000}
                                    value={form.description}
                                    disabled={readOnly}
                                    onChange={(e) => set("description", e.target.value)}
                                />
                                <p className="text-xs text-neutral-400 text-right">{form.description.length}/3000</p>
                            </div>
                            <div>
                                <FieldLabel htmlFor="bp-categories" hint="Helps SeekKrr Match find creators who fit.">
                                    Categories
                                </FieldLabel>
                                <ChipInput
                                    id="bp-categories"
                                    values={form.categories}
                                    onChange={(v) => set("categories", v)}
                                    max={10}
                                    suggestions={CATEGORY_SUGGESTIONS}
                                    disabled={readOnly}
                                    placeholder="Café"
                                />
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard title="Photos" description="Up to 20. The first one is your cover on the website.">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {form.photos.map((p, i) => (
                                <div key={p} className="relative group aspect-[4/3] rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
                                    <img src={p} alt="" className="w-full h-full object-cover" loading="lazy" />
                                    {i === 0 && (
                                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-primary-900 text-white text-[10px] font-semibold">
                                            Cover
                                        </span>
                                    )}
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            aria-label="Remove photo"
                                            onClick={() => set("photos", form.photos.filter((x) => x !== p))}
                                            className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/90 text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!readOnly && form.photos.length < 20 && (
                                <button
                                    type="button"
                                    onClick={() => photoInput.current?.click()}
                                    disabled={!!uploading}
                                    className="aspect-[4/3] rounded-xl border-2 border-dashed border-neutral-300 text-neutral-500 hover:border-primary-400 hover:text-primary-700 flex flex-col items-center justify-center gap-1 text-sm"
                                >
                                    {uploading === "photo" ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                                    Add photo
                                </button>
                            )}
                        </div>
                        {form.photos.length === 0 && readOnly && <p className="text-sm text-neutral-500">No photos yet.</p>}
                        {!readOnly && (
                            <div className="flex gap-2 mt-3 max-w-xl">
                                <input
                                    className={inputClass}
                                    value={photoUrl}
                                    onChange={(e) => setPhotoUrl(e.target.value)}
                                    placeholder="…or paste an https:// image link"
                                    aria-label="Photo URL"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    disabled={!photoUrl.startsWith("https://") || form.photos.length >= 20}
                                    onClick={() => {
                                        if (!form.photos.includes(photoUrl)) set("photos", [...form.photos, photoUrl.trim()]);
                                        setPhotoUrl("");
                                    }}
                                >
                                    Add
                                </Button>
                            </div>
                        )}
                        <input
                            ref={photoInput}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void upload(f, "photo");
                                e.target.value = "";
                            }}
                        />
                    </SectionCard>
                </div>

                <div className="space-y-6">
                    <SectionCard title="Logo">
                        <div className="flex items-center gap-4">
                            {form.logo_url ? (
                                <img src={form.logo_url} alt="Logo" className="w-20 h-20 rounded-2xl object-cover border border-neutral-200" />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-primary-900 text-highlight flex items-center justify-center">
                                    <Store className="w-8 h-8" />
                                </div>
                            )}
                            {!readOnly && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    leftIcon={uploading === "logo" ? undefined : <Upload className="w-4 h-4" />}
                                    isLoading={uploading === "logo"}
                                    disabled={!!uploading}
                                    onClick={() => logoInput.current?.click()}
                                >
                                    {form.logo_url ? "Replace" : "Upload"}
                                </Button>
                            )}
                        </div>
                        {errors.logo_url && <p className="text-xs text-red-600 mt-2">{errors.logo_url}</p>}
                        <input
                            ref={logoInput}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void upload(f, "logo");
                                e.target.value = "";
                            }}
                        />
                    </SectionCard>

                    <SectionCard title="Contact" description="Shared with creators only after you approve them.">
                        <div className="space-y-4">
                            <div>
                                <FieldLabel htmlFor="bp-phone">Phone</FieldLabel>
                                <input
                                    id="bp-phone"
                                    className={inputClass}
                                    maxLength={20}
                                    value={form.contact_phone}
                                    disabled={readOnly}
                                    onChange={(e) => set("contact_phone", e.target.value)}
                                    placeholder="+91 98xxxxxxxx"
                                />
                            </div>
                            <div>
                                <FieldLabel htmlFor="bp-email">Email</FieldLabel>
                                <input
                                    id="bp-email"
                                    type="email"
                                    className={inputClass}
                                    maxLength={255}
                                    value={form.contact_email}
                                    disabled={readOnly}
                                    onChange={(e) => set("contact_email", e.target.value)}
                                />
                                {errors.contact_email && <p className="text-xs text-red-600 mt-1">{errors.contact_email}</p>}
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard title="Social links">
                        <ChipInput
                            id="bp-socials"
                            values={form.socials}
                            onChange={(v) => set("socials", v)}
                            max={10}
                            disabled={readOnly}
                            placeholder="https://instagram.com/yourplace"
                            normalize={(s) => {
                                const t = s.trim();
                                if (!t) return "";
                                return /^https?:\/\//i.test(t) ? t.replace(/^http:\/\//i, "https://") : `https://${t}`;
                            }}
                        />
                        {errors.socials && <p className="text-xs text-red-600 mt-1">{errors.socials}</p>}
                    </SectionCard>

                    <SectionCard title="Website listing">
                        <Toggle
                            id="bp-website"
                            checked={form.show_on_website}
                            onChange={(v) => set("show_on_website", v)}
                            disabled={!isOwner}
                            label="Show on seekkrr.com/places"
                            description={
                                isOwner
                                    ? "Verified, active businesses are listed in the public directory. Turn off to opt out."
                                    : "Only the owner can change this."
                            }
                        />
                        {publicUrl && form.show_on_website && detail.data.verified && (
                            <a
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-1 text-sm text-primary-700 hover:underline"
                            >
                                View your page <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </SectionCard>
                </div>
            </div>
        </form>
    );
}

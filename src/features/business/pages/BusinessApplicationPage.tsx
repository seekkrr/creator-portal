import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, LogIn, Mail, Store } from "lucide-react";
import { Button } from "@components/ui";
import { useAuthStore } from "@store/auth.store";
import { useWorkspace } from "@hooks/useWorkspace";
import { businessService } from "@services/business.service";
import type { PlanCode, SubmittedBusinessApplication } from "@services/business.types";
import type { Marker } from "@/types";
import { GSTIN_PATTERN, errorMessage } from "../utils";
import { Banner, FieldLabel, SectionCard, SegmentedControl, inputClass, selectClass } from "../components/bits";
import { ChipInput } from "../components/ChipInput";
import { PlaceSearchSelect } from "../components/PlaceSearchSelect";

const CATEGORY_SUGGESTIONS = ["Café", "Restaurant", "Hostel", "Homestay", "Hotel", "Experience", "Adventure", "Wellness", "Shop"];

type LocationMode = "search" | "maps";

/** "List your business" — a real `POST /api/v2/business-applications` (source: portal). */
export function BusinessApplicationPage() {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const navigate = useNavigate();
    const { access, businesses } = useWorkspace();

    const [businessName, setBusinessName] = useState("");
    const [contactName, setContactName] = useState(user ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() : "");
    const [email, setEmail] = useState(user?.email ?? "");
    const [phone, setPhone] = useState("");
    const [locationMode, setLocationMode] = useState<LocationMode>("search");
    const [place, setPlace] = useState<Marker | null>(null);
    const [mapsUrl, setMapsUrl] = useState("");
    const [categories, setCategories] = useState<string[]>([]);
    const [socials, setSocials] = useState<string[]>([]);
    const [plan, setPlan] = useState<PlanCode | "">("");
    const [gstin, setGstin] = useState("");
    const [message, setMessage] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [done, setDone] = useState<SubmittedBusinessApplication | null>(null);

    const validate = (): Record<string, string> => {
        const e: Record<string, string> = {};
        if (!businessName.trim()) e.businessName = "What's your business called?";
        if (!contactName.trim()) e.contactName = "Your name, please.";
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email.";
        if (phone.replace(/\D/g, "").length < 7) e.phone = "Enter a phone number we can reach you on.";
        if (locationMode === "search" && !place) e.location = "Pick your place, or paste a Google Maps link instead.";
        if (locationMode === "maps" && !/^https:\/\/\S+$/.test(mapsUrl.trim()))
            e.location = "Paste the full https:// link from Google Maps (Share → Copy link).";
        if (socials.some((s) => !s.startsWith("https://"))) e.socials = "Links must start with https://";
        if (gstin && !GSTIN_PATTERN.test(gstin)) e.gstin = "A GSTIN is 15 characters, e.g. 02ABCDE1234F1Z5.";
        return e;
    };

    const submit = async (ev: FormEvent) => {
        ev.preventDefault();
        setSubmitError(null);
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setSubmitting(true);
        try {
            const app = await businessService.submitApplication({
                business_name: businessName.trim(),
                contact_name: contactName.trim(),
                email: email.trim(),
                phone: phone.trim(),
                claimed_marker_id: locationMode === "search" ? (place?.id ?? null) : null,
                maps_url: locationMode === "maps" ? mapsUrl.trim() : null,
                region_id: locationMode === "search" ? (place?.region_id ?? null) : null,
                categories,
                social_links: socials,
                requested_plan: plan || null,
                gstin: gstin || null,
                message: message.trim() || null,
                source: "portal",
            });
            setDone(app);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
            setSubmitError(errorMessage(e, "We couldn't send your application. Please try again."));
        } finally {
            setSubmitting(false);
        }
    };

    if (done) {
        const sameEmail = (user?.email ?? "").toLowerCase() === email.trim().toLowerCase();
        return (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <div className="rounded-3xl border-2 border-primary-900 bg-white shadow-[6px_6px_0_0_#fecd36] p-6 sm:p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary-900">Application received</h1>
                    <p className="text-neutral-600 mt-2">
                        Thanks — we've got <span className="font-semibold">{done.business_name}</span>. We'll email{" "}
                        <span className="font-semibold">{email.trim()}</span> as soon as it's reviewed.
                    </p>
                </div>
                <SectionCard title="What happens next">
                    <ol className="space-y-4">
                        {[
                            {
                                icon: <Clock className="w-4 h-4" />,
                                t: "We review your listing",
                                d: "Usually within 2 working days. We check the place and may call the number you gave.",
                            },
                            {
                                icon: <Mail className="w-4 h-4" />,
                                t: "You get an approval email",
                                d: "Your business profile is created on the Free plan, with a 14-day Growth trial available.",
                            },
                            {
                                icon: <LogIn className="w-4 h-4" />,
                                t: "Sign in again to open the Partner Portal",
                                d: sameEmail
                                    ? "Sign out and back in with this account — the Partner Portal appears automatically."
                                    : `Sign in with ${email.trim()} — the business is linked to the account that uses that email.`,
                            },
                            {
                                icon: <Store className="w-4 h-4" />,
                                t: "Set your redeem code and post a collab",
                                d: "Pick a 4-digit code for your staff, then post your first collab for creators nearby.",
                            },
                        ].map((s, i) => (
                            <li key={i} className="flex gap-3">
                                <span className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                                    {s.icon}
                                </span>
                                <div>
                                    <p className="font-semibold text-neutral-900">{s.t}</p>
                                    <p className="text-sm text-neutral-600">{s.d}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </SectionCard>
                <div className="flex flex-wrap gap-3 justify-center">
                    {access.creator && (
                        <Link to="/creator/dashboard">
                            <Button variant="outline">Back to Creator Portal</Button>
                        </Link>
                    )}
                    <Button
                        variant="ghost"
                        onClick={() => {
                            void logout().then(() => navigate("/creator/login", { replace: true }));
                        }}
                    >
                        Sign out
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={(e) => void submit(e)} className="max-w-3xl mx-auto space-y-6 animate-fade-in" noValidate>
            <div>
                <h1 className="text-3xl font-display font-bold text-primary-900 tracking-tight">List your business on SeekKrr</h1>
                <p className="text-neutral-500 mt-1">
                    Post collabs for travel creators, run check-in offers, and see the content and visits they bring you.
                    Free to start.
                </p>
            </div>

            {access.business && businesses.length > 0 && (
                <Banner
                    tone="info"
                    icon={<Store className="w-5 h-5" />}
                    title={`You already manage ${businesses[0]?.name ?? "a business"}`}
                    action={
                        <Link to="/business" className="text-sm font-semibold underline">
                            Open Partner Portal
                        </Link>
                    }
                >
                    Use this form only to list another business.
                </Banner>
            )}

            <Banner tone="info" title="Got a claim link from our team?">
                Open it instead — it takes you straight to your ready-made listing.
            </Banner>

            <SectionCard title="Your business">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <FieldLabel htmlFor="ba-name">Business name *</FieldLabel>
                        <input
                            id="ba-name"
                            className={inputClass}
                            maxLength={150}
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="e.g. Garden Café Bir"
                        />
                        {errors.businessName && <p className="text-xs text-red-600 mt-1">{errors.businessName}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <FieldLabel>Where is it? *</FieldLabel>
                        <div className="mb-3">
                            <SegmentedControl<LocationMode>
                                size="sm"
                                ariaLabel="How to find your place"
                                value={locationMode}
                                onChange={setLocationMode}
                                options={[
                                    { value: "search", label: "Find it on SeekKrr" },
                                    { value: "maps", label: "Paste a Google Maps link" },
                                ]}
                            />
                        </div>
                        {locationMode === "search" ? (
                            <PlaceSearchSelect id="ba-place" value={place} onChange={setPlace} />
                        ) : (
                            <input
                                id="ba-maps"
                                className={inputClass}
                                maxLength={500}
                                value={mapsUrl}
                                onChange={(e) => setMapsUrl(e.target.value)}
                                placeholder="https://maps.app.goo.gl/…"
                            />
                        )}
                        {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <FieldLabel htmlFor="ba-categories">What kind of place?</FieldLabel>
                        <ChipInput
                            id="ba-categories"
                            values={categories}
                            onChange={setCategories}
                            max={10}
                            suggestions={CATEGORY_SUGGESTIONS}
                            placeholder="Café"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <FieldLabel htmlFor="ba-socials" hint="Instagram, website… (https:// links)">
                            Social links
                        </FieldLabel>
                        <ChipInput
                            id="ba-socials"
                            values={socials}
                            onChange={setSocials}
                            max={10}
                            placeholder="https://instagram.com/yourplace"
                            normalize={(s) => {
                                const t = s.trim();
                                if (!t) return "";
                                return /^https?:\/\//i.test(t) ? t.replace(/^http:\/\//i, "https://") : `https://${t}`;
                            }}
                        />
                        {errors.socials && <p className="text-xs text-red-600 mt-1">{errors.socials}</p>}
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Contact">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <FieldLabel htmlFor="ba-contact">Your name *</FieldLabel>
                        <input
                            id="ba-contact"
                            className={inputClass}
                            maxLength={100}
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                        />
                        {errors.contactName && <p className="text-xs text-red-600 mt-1">{errors.contactName}</p>}
                    </div>
                    <div>
                        <FieldLabel htmlFor="ba-phone">Phone *</FieldLabel>
                        <input
                            id="ba-phone"
                            type="tel"
                            className={inputClass}
                            maxLength={20}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98xxxxxxxx"
                        />
                        {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <FieldLabel
                            htmlFor="ba-email"
                            hint="Use the email you sign in with — when we approve, the business is linked to that account."
                        >
                            Email *
                        </FieldLabel>
                        <input
                            id="ba-email"
                            type="email"
                            className={inputClass}
                            maxLength={255}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Plan & billing (optional)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <FieldLabel htmlFor="ba-plan" hint="You can change this any time.">
                            Plan you're interested in
                        </FieldLabel>
                        <select id="ba-plan" className={selectClass} value={plan} onChange={(e) => setPlan(e.target.value as PlanCode | "")}>
                            <option value="">Not sure yet</option>
                            <option value="free">Free</option>
                            <option value="growth">Growth</option>
                            <option value="pro">Pro</option>
                            <option value="multi_location">Multi-location</option>
                        </select>
                    </div>
                    <div>
                        <FieldLabel htmlFor="ba-gstin" hint="For GST invoices later.">
                            GSTIN
                        </FieldLabel>
                        <input
                            id="ba-gstin"
                            className={`${inputClass} uppercase`}
                            maxLength={15}
                            value={gstin}
                            onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/\s/g, ""))}
                            placeholder="Optional"
                        />
                        {errors.gstin && <p className="text-xs text-red-600 mt-1">{errors.gstin}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <FieldLabel htmlFor="ba-message">Anything else?</FieldLabel>
                        <textarea
                            id="ba-message"
                            className={`${inputClass} min-h-[90px]`}
                            maxLength={1000}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Best time to call, other locations, questions…"
                        />
                    </div>
                </div>
            </SectionCard>

            {submitError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3" role="alert">
                    {submitError}
                </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Button type="submit" variant="accent" size="lg" className="rounded-full" isLoading={submitting} disabled={submitting}>
                    Submit application
                </Button>
                <p className="text-xs text-neutral-500">
                    By applying you agree to the{" "}
                    <a href="https://seekkrr.com/business-terms" target="_blank" rel="noopener noreferrer" className="underline">
                        SeekKrr business terms
                    </a>
                    .
                </p>
            </div>
        </form>
    );
}

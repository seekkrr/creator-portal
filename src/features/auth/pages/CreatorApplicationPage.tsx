import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, LogIn, Mail } from "lucide-react";
import { Button } from "@components/ui";
import { useAuthStore } from "@store/auth.store";
import { useWorkspace } from "@hooks/useWorkspace";
import { ApiRequestError } from "@services/api";
import { creatorApplicationService } from "@services/creatorApplication.service";
import { ChipInput } from "@features/business/components/ChipInput";

const inputClass =
    "w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500";

const toHttps = (s: string) => {
    const t = s.trim();
    if (!t) return "";
    return /^https?:\/\//i.test(t) ? t.replace(/^http:\/\//i, "https://") : `https://${t}`;
};

type Outcome = "submitted" | "already_applied";

/**
 * "Become a creator": Google sign-in happens first (ProtectedRoute → login),
 * then this short form collects the phone number and social links.
 */
export function CreatorApplicationPage() {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const navigate = useNavigate();
    const { access } = useWorkspace();

    const [name, setName] = useState(user ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() : "");
    const [phone, setPhone] = useState("");
    const [socials, setSocials] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [outcome, setOutcome] = useState<Outcome | null>(null);

    if (access.creator) return <Navigate to="/creator/dashboard" replace />;

    const email = user?.email ?? "";

    const submit = async (ev: FormEvent) => {
        ev.preventDefault();
        setSubmitError(null);
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "Your name, please.";
        if (phone.replace(/\D/g, "").length < 7) e.phone = "Enter a phone number we can reach you on.";
        if (socials.length === 0) e.socials = "Add at least one link to your content (Instagram, YouTube…).";
        if (!email) e.email = "Your Google account has no email. Sign in with a different account.";
        setErrors(e);
        if (Object.keys(e).length) return;
        setSubmitting(true);
        try {
            await creatorApplicationService.submit({ name: name.trim(), email, phone: phone.trim(), social_links: socials });
            setOutcome("submitted");
        } catch (err) {
            if (err instanceof ApiRequestError && err.status === 409) setOutcome("already_applied");
            else setSubmitError(err instanceof Error && err.message ? err.message : "We couldn't send your application. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const switchAccount = () => {
        void logout().then(() =>
            navigate("/creator/login", { replace: true, state: { from: { pathname: "/creator/apply", search: "" } } }),
        );
    };

    if (outcome) {
        return (
            <div className="max-w-xl mx-auto space-y-5">
                <div className="rounded-3xl border-2 border-primary-900 bg-white shadow-[6px_6px_0_0_#fecd36] p-6 sm:p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary-900">
                        {outcome === "submitted" ? "Application received" : "You've already applied"}
                    </h1>
                    <p className="text-neutral-600 mt-2">
                        {outcome === "submitted"
                            ? "Thanks! Our team reviews every creator by hand."
                            : "Your application is with our team."}{" "}
                        We'll email <span className="font-semibold">{email}</span> once it's reviewed.
                    </p>
                </div>
                <div className="rounded-3xl bg-white border border-neutral-200 p-6">
                    <ol className="space-y-4">
                        {[
                            { icon: <Clock className="w-4 h-4" />, t: "We review your profile", d: "Usually within 2 working days." },
                            { icon: <Mail className="w-4 h-4" />, t: "You get an approval email", d: "Your creator account is switched on." },
                            { icon: <LogIn className="w-4 h-4" />, t: "Sign in again", d: "Use this Google account — the Creator Portal opens automatically." },
                        ].map((s) => (
                            <li key={s.t} className="flex gap-3">
                                <span className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">{s.icon}</span>
                                <div>
                                    <p className="font-semibold text-neutral-900">{s.t}</p>
                                    <p className="text-sm text-neutral-600">{s.d}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
                <div className="flex justify-center">
                    <Button variant="ghost" onClick={() => void logout().then(() => navigate("/creator/login", { replace: true }))}>
                        Sign out
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={(e) => void submit(e)} noValidate className="max-w-xl mx-auto rounded-3xl bg-white border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-5">
            <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary-900 tracking-tight">Become a SeekKrr creator</h1>
                <p className="text-neutral-500 mt-1">Two quick details and you're in the queue for review.</p>
            </div>

            {email && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                    <div className="min-w-0">
                        <p className="text-xs text-neutral-500">Signed in with Google</p>
                        <p className="font-semibold text-neutral-900 truncate">{email}</p>
                    </div>
                    <button type="button" onClick={switchAccount} className="text-sm font-semibold text-primary-700 hover:underline shrink-0">
                        Not you?
                    </button>
                </div>
            )}
            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}

            <div>
                <label htmlFor="ca-phone" className="block text-sm font-medium text-neutral-800 mb-1">
                    Phone number *
                </label>
                <input
                    id="ca-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    autoFocus
                    className={inputClass}
                    maxLength={20}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98xxxxxxxx"
                />
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
            </div>

            <div>
                <label htmlFor="ca-socials" className="block text-sm font-medium text-neutral-800 mb-1">
                    Where do you post? *
                </label>
                <p className="text-xs text-neutral-500 mb-2">Paste your Instagram, YouTube or blog link and press Enter.</p>
                <ChipInput id="ca-socials" values={socials} onChange={setSocials} max={10} placeholder="instagram.com/yourhandle" normalize={toHttps} />
                {errors.socials && <p className="text-xs text-red-600 mt-1">{errors.socials}</p>}
            </div>

            <div>
                <label htmlFor="ca-name" className="block text-sm font-medium text-neutral-800 mb-1">
                    Your name *
                </label>
                <input id="ca-name" className={inputClass} maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            {submitError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3" role="alert">
                    {submitError}
                </p>
            )}

            <div className="space-y-3">
                <Button type="submit" variant="accent" size="lg" className="w-full rounded-full" isLoading={submitting} disabled={submitting}>
                    Submit application
                </Button>
                <p className="text-xs text-neutral-500 text-center">
                    By applying you agree to the{" "}
                    <a href="https://seekkrr.com/creator-terms" target="_blank" rel="noopener noreferrer" className="underline">
                        creator terms
                    </a>
                    . Own a business instead?{" "}
                    <Link to="/business/apply" className="underline">
                        List it here
                    </Link>
                    .
                </p>
            </div>
        </form>
    );
}

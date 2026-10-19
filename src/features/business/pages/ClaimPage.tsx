import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Copy, Link2Off, MapPin, ShieldCheck, Smartphone, Store } from "lucide-react";
import { Button, Skeleton } from "@components/ui";
import { useAuthStore } from "@store/auth.store";
import { useWorkspaceStore } from "@store/workspace.store";
import { businessService } from "@services/business.service";
import { copyToClipboard, errorMessage, formatDate, isNotFound } from "../utils";

/**
 * Sales-assisted onboarding: an admin creates the listing and sends a claim
 * link. Phone-verified links are claimed in the mobile app (OTP to the
 * business phone); others can be claimed right here.
 */
export function ClaimPage() {
    const { token = "" } = useParams<{ token: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const user = useAuthStore((s) => s.user);
    const refreshSession = useAuthStore((s) => s.refreshSession);
    const setBusiness = useWorkspaceStore((s) => s.setBusiness);
    const setMode = useWorkspaceStore((s) => s.setMode);
    const [claiming, setClaiming] = useState(false);
    const [claimError, setClaimError] = useState<string | null>(null);

    const preview = useQuery({
        queryKey: ["claim-preview", token],
        queryFn: () => businessService.claimPreview(token),
        enabled: token.length >= 10,
        retry: false,
        staleTime: 60_000,
    });

    const claimUrl = `https://seekkrr.com/business/claim/${token}`;

    const claim = async () => {
        setClaiming(true);
        setClaimError(null);
        try {
            const business = await businessService.claim(token);
            await refreshSession();
            if (user) {
                setBusiness(user._id, business.id);
                setMode(user._id, "business");
            }
            toast.success(`${business.name} is yours! Set your redeem code to get started.`);
            navigate("/business/locations", { replace: true });
        } catch (e) {
            setClaimError(errorMessage(e, "We couldn't claim this listing."));
        } finally {
            setClaiming(false);
        }
    };

    const wrap = (content: ReactNode) => (
        <div className="max-w-xl mx-auto px-4 py-10 sm:py-16 animate-fade-in">{content}</div>
    );

    if (token.length < 10 || preview.isError) {
        const expired = token.length < 10 || isNotFound(preview.error);
        return wrap(
            <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto mb-4">
                    <Link2Off className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-display font-bold text-primary-900">
                    {expired ? "This claim link has expired" : "We couldn't open this link"}
                </h1>
                <p className="text-neutral-600 mt-2">
                    {expired
                        ? "Claim links work once and expire after a while. Ask your SeekKrr contact to send a fresh one, or write to partners@seekkrr.com."
                        : errorMessage(preview.error)}
                </p>
                <div className="mt-6 flex justify-center gap-3">
                    {!expired && (
                        <Button variant="outline" onClick={() => void preview.refetch()}>
                            Try again
                        </Button>
                    )}
                    <Link to="/business/apply">
                        <Button variant="ghost">List a business instead</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (preview.isLoading || !preview.data) {
        return wrap(
            <div className="space-y-4">
                <Skeleton height={200} />
                <Skeleton height={120} />
            </div>
        );
    }

    const { business, already_claimed, requires_phone_verification, phone_hint, expires_at } = preview.data;
    const cover = business.photos?.[0];

    return wrap(
        <div className="space-y-6">
            <div className="rounded-3xl border-2 border-primary-900 bg-white shadow-[6px_6px_0_0_#fecd36] overflow-hidden">
                {cover && <img src={cover} alt="" className="w-full h-44 object-cover" />}
                <div className="p-6 flex items-start gap-4">
                    {business.logo_url ? (
                        <img src={business.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover border border-neutral-200" />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-primary-900 text-highlight flex items-center justify-center shrink-0">
                            <Store className="w-7 h-7" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Your SeekKrr listing</p>
                        <h1 className="text-2xl font-display font-bold text-primary-900">{business.name}</h1>
                        {business.tagline && <p className="text-neutral-600 mt-0.5">{business.tagline}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {business.region_name && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-800 text-xs">
                                    <MapPin className="w-3 h-3" /> {business.region_name}
                                </span>
                            )}
                            {business.categories.map((c) => (
                                <span key={c} className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-xs">
                                    {c}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {already_claimed ? (
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h2 className="text-lg font-display font-semibold text-neutral-900">This listing has already been claimed</h2>
                    <p className="text-sm text-neutral-600 mt-1">
                        If that was you, sign in to open the Partner Portal. Otherwise contact partners@seekkrr.com.
                    </p>
                    <div className="mt-4">
                        <Link to={isAuthenticated ? "/business" : "/creator/login"}>
                            <Button variant="outline">{isAuthenticated ? "Open Partner Portal" : "Sign in"}</Button>
                        </Link>
                    </div>
                </div>
            ) : requires_phone_verification ? (
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-display font-semibold text-neutral-900 text-lg">Claim it in the SeekKrr app</h2>
                            <p className="text-sm text-neutral-600 mt-1">
                                To protect your listing, we verify the business phone
                                {phone_hint ? <span className="font-semibold"> {phone_hint}</span> : ""} with a one-time code.
                                That check happens in the SeekKrr mobile app.
                            </p>
                        </div>
                    </div>
                    <ol className="text-sm text-neutral-700 space-y-1.5 list-decimal pl-5">
                        <li>Install SeekKrr on the phone that uses this number and sign in.</li>
                        <li>Open this claim link on that phone — the app takes you to the claim screen.</li>
                        <li>Enter the code we text you. Then sign in here with the same account to manage your business.</li>
                    </ol>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 min-w-0 rounded-xl bg-neutral-50 border border-neutral-200 px-3 py-2 text-sm text-neutral-700 truncate">
                            {claimUrl}
                        </div>
                        <Button
                            variant="outline"
                            leftIcon={<Copy className="w-4 h-4" />}
                            onClick={() =>
                                void copyToClipboard(claimUrl).then((ok) =>
                                    ok ? toast.success("Link copied — open it on your phone.") : toast.error("Couldn't copy the link.")
                                )
                            }
                        >
                            Copy link
                        </Button>
                    </div>
                    {expires_at && <p className="text-xs text-neutral-500">This link expires on {formatDate(expires_at)}.</p>}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-display font-semibold text-neutral-900 text-lg">Claim {business.name}</h2>
                            <p className="text-sm text-neutral-600 mt-1">
                                You'll become the owner: set your staff redeem code, post collabs and add your team.
                            </p>
                        </div>
                    </div>
                    {claimError && (
                        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3" role="alert">
                            {claimError}
                        </p>
                    )}
                    {isAuthenticated ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <Button variant="accent" size="lg" className="rounded-full" isLoading={claiming} disabled={claiming} onClick={() => void claim()}>
                                Claim this business
                            </Button>
                            {user && (
                                <p className="text-xs text-neutral-500">
                                    Signed in as {user.email ?? `${user.first_name} ${user.last_name}`}
                                </p>
                            )}
                        </div>
                    ) : (
                        <Button
                            variant="accent"
                            size="lg"
                            className="rounded-full"
                            onClick={() => navigate("/creator/login", { state: { from: location } })}
                        >
                            Sign in to claim
                        </Button>
                    )}
                    {expires_at && <p className="text-xs text-neutral-500">This link expires on {formatDate(expires_at)}.</p>}
                </div>
            )}
        </div>
    );
}

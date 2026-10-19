import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Handshake, MapPin, Send, Sparkles, Star, Users } from "lucide-react";
import { Button, EmptyState, ErrorState, Skeleton } from "@components/ui";
import { businessService } from "@services/business.service";
import type { CreatorMatch, CreatorSummary } from "@services/business.types";
import { useBusiness } from "../context";
import { bkeys, useCollabs, useInvalidateBusiness, useUpgradePrompt } from "../queries";
import { PLATFORM_LABELS, limitLabel } from "../utils";
import {
    CreatorAvatar,
    FieldLabel,
    PageHeader,
    Pill,
    SectionCard,
    Toggle,
    UpgradeCallout,
    UsageMeter,
    VerifiedTick,
    selectClass,
} from "../components/bits";
import { ConfirmDialog, Modal } from "../components/Overlay";
import { CreatorProfileDrawer, MatchBreakdown } from "../components/CreatorProfileDrawer";
import { UpgradeDialog } from "../components/UpgradeDialog";

function isInTownNow(m: CreatorMatch): boolean {
    return m.reasons.some((r) => r.toLowerCase().includes("this week"));
}

function isVerifiedCreator(c: CreatorSummary): boolean {
    return c.tier === "verified" || c.socials.some((s) => s.verified);
}

function ScoreRing({ score }: { score: number }) {
    const deg = Math.max(0, Math.min(100, score)) * 3.6;
    return (
        <div
            className="w-14 h-14 rounded-full p-1 shrink-0"
            style={{ background: `conic-gradient(#0d524e ${deg}deg, #e7e3dd ${deg}deg)` }}
            aria-label={`${score}% match`}
        >
            <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center leading-none">
                <span className="text-sm font-bold text-primary-900">{score}%</span>
                <span className="text-[9px] uppercase tracking-wide text-neutral-500">match</span>
            </div>
        </div>
    );
}

function MatchCard({
    match,
    onReveal,
    onInvite,
    onView,
}: {
    match: CreatorMatch;
    onReveal: () => void;
    onInvite: () => void;
    onView: () => void;
}) {
    const c = match.creator;
    const blurred = !match.revealed;
    return (
        <article className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
                <CreatorAvatar name={c.display_name} url={c.avatar_url} size={48} blurred={blurred} />
                <div className="min-w-0 flex-1">
                    <p className={`font-display font-semibold text-neutral-900 truncate ${blurred ? "tracking-widest" : ""}`}>
                        {c.display_name}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {c.tier === "verified" && (
                            <Pill className="bg-primary-50 text-primary-700 border-primary-200">
                                <VerifiedTick className="w-3 h-3" /> Verified
                            </Pill>
                        )}
                        {match.is_new && <Pill className="bg-accent-500/10 text-accent-600 border-accent-500/30">New creator</Pill>}
                        {isInTownNow(match) && (
                            <Pill className="bg-green-50 text-green-700 border-green-200">
                                <MapPin className="w-3 h-3" /> In town now
                            </Pill>
                        )}
                    </div>
                </div>
                <ScoreRing score={match.score} />
            </div>

            {match.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {match.reasons.map((r) => (
                        <span key={r} className="px-2 py-0.5 rounded-full bg-primary-50 border border-primary-100 text-xs text-primary-800">
                            {r}
                        </span>
                    ))}
                </div>
            )}

            <div className="text-xs text-neutral-600 space-y-1.5">
                {c.travel_styles.length > 0 && <p>{c.travel_styles.join(" · ")}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {c.socials.map((s, i) => (
                        <span key={`${s.platform}-${i}`} className="inline-flex items-center gap-1">
                            {PLATFORM_LABELS[s.platform] ?? s.platform}
                            {!blurred && s.handle ? ` @${s.handle.replace(/^@/, "")}` : ""}
                            {s.verified && <VerifiedTick className="w-3 h-3" />}
                        </span>
                    ))}
                </div>
                <p className="flex items-center gap-3 text-neutral-500">
                    <span>{c.stats?.completed ?? 0} completed</span>
                    {c.stats?.avg_rating ? (
                        <span className="inline-flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-highlight text-amber-500" />
                            {c.stats.avg_rating.toFixed(1)}
                        </span>
                    ) : null}
                </p>
            </div>

            {match.breakdown ? (
                <MatchBreakdown breakdown={match.breakdown} />
            ) : (
                <p className="text-[11px] text-neutral-400">
                    <Link to="/business/billing" className="underline hover:text-primary-700">
                        Upgrade
                    </Link>{" "}
                    to see the full score breakdown.
                </p>
            )}

            {blurred && (
                <div className="rounded-xl bg-neutral-50 border border-dashed border-neutral-300 p-3 text-xs text-neutral-500 flex items-center gap-2">
                    <EyeOff className="w-4 h-4 shrink-0" />
                    Name, photo and handles stay hidden until you reveal the profile.
                </div>
            )}

            <div className="flex flex-wrap gap-2 mt-auto pt-1">
                {blurred ? (
                    <Button size="sm" variant="outline" leftIcon={<Eye className="w-4 h-4" />} onClick={onReveal}>
                        Reveal
                    </Button>
                ) : (
                    <Button size="sm" variant="outline" onClick={onView}>
                        View profile
                    </Button>
                )}
                <Button size="sm" variant="accent" leftIcon={<Send className="w-4 h-4" />} onClick={onInvite}>
                    Invite
                </Button>
            </div>
        </article>
    );
}

export function DiscoverPage() {
    const { businessId, canManage } = useBusiness();
    const queryClient = useQueryClient();
    const invalidate = useInvalidateBusiness();
    const { notifyError, upgrade } = useUpgradePrompt();
    const collabs = useCollabs(false);
    const [searchParams, setSearchParams] = useSearchParams();

    const eligible = useMemo(
        () => (collabs.data ?? []).filter((c) => c.status === "active" && (c.moderation?.status ?? "approved") === "approved"),
        [collabs.data]
    );
    const paramId = searchParams.get("collab");
    const collabId = eligible.some((c) => c.id === paramId) ? (paramId ?? "") : (eligible[0]?.id ?? "");
    const collab = eligible.find((c) => c.id === collabId);

    const matches = useQuery({
        queryKey: bkeys.matches(businessId, collabId),
        queryFn: () => businessService.matches(businessId, collabId, 30),
        enabled: canManage && !!collabId,
        staleTime: 60_000,
    });

    const [inTown, setInTown] = useState(false);
    const [verifiedOnly, setVerifiedOnly] = useState(false);
    const [platform, setPlatform] = useState("all");
    const [revealTarget, setRevealTarget] = useState<CreatorMatch | null>(null);
    const [inviteTarget, setInviteTarget] = useState<CreatorMatch | null>(null);
    const [inviteNote, setInviteNote] = useState("");
    const [inviting, setInviting] = useState(false);
    const [profile, setProfile] = useState<CreatorMatch | null>(null);

    const all = matches.data?.matches ?? [];
    const platforms = Array.from(new Set(all.flatMap((m) => m.creator.socials.map((s) => s.platform)))).sort();
    const filtered = all.filter(
        (m) =>
            (!inTown || isInTownNow(m)) &&
            (!verifiedOnly || isVerifiedCreator(m.creator)) &&
            (platform === "all" || m.creator.socials.some((s) => s.platform === platform))
    );
    const usage = matches.data?.usage;
    const revealsLeft =
        usage?.match_reveals.limit === null || usage?.match_reveals.limit === undefined
            ? null
            : Math.max(0, usage.match_reveals.limit - usage.match_reveals.used);

    if (!canManage) {
        return (
            <div className="space-y-6">
                <PageHeader title="Discover creators" />
                <EmptyState
                    icon={<Users className="w-7 h-7" />}
                    title="Managers and owners discover creators"
                    description="Ask the owner of this business to make you a manager if you need to browse and invite creators."
                />
            </div>
        );
    }

    const doReveal = async (m: CreatorMatch) => {
        try {
            const creator = await businessService.reveal(businessId, m.creator.user_id);
            queryClient.setQueryData(bkeys.matches(businessId, collabId), (old: typeof matches.data) =>
                old
                    ? {
                          ...old,
                          matches: old.matches.map((x) =>
                              x.creator.user_id === m.creator.user_id ? { ...x, creator, revealed: true } : x
                          ),
                      }
                    : old
            );
            toast.success(`Revealed ${creator.display_name}.`);
            setProfile({ ...m, creator, revealed: true });
            void invalidate();
        } catch (e) {
            notifyError(e, "Couldn't reveal this profile");
            throw e;
        }
    };

    const doInvite = async () => {
        if (!inviteTarget || !collabId) return;
        setInviting(true);
        try {
            await businessService.invite(businessId, {
                collab_id: collabId,
                creator_user_id: inviteTarget.creator.user_id,
                note: inviteNote.trim() || undefined,
            });
            toast.success("Invite sent — the creator gets a notification in the app.");
            setInviteTarget(null);
            setInviteNote("");
            void invalidate();
        } catch (e) {
            notifyError(e, "Couldn't send the invite");
        } finally {
            setInviting(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Discover creators"
                description="SeekKrr Match ranks creators who are open to collabs for each of your collabs — with the reasons why."
            />

            {collabs.isLoading ? (
                <Skeleton height={120} />
            ) : eligible.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200">
                    <EmptyState
                        icon={<Handshake className="w-7 h-7" />}
                        title="Post an active collab first"
                        description="Matches are ranked for a specific collab, so start by posting one. Collabs under review show up here once approved."
                        action={
                            <Link to="/business/collabs?new=1">
                                <Button variant="accent">Post a collab</Button>
                            </Link>
                        }
                    />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <SectionCard className="lg:col-span-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <FieldLabel htmlFor="discover-collab">Matches for</FieldLabel>
                                    <select
                                        id="discover-collab"
                                        className={selectClass}
                                        value={collabId}
                                        onChange={(e) => {
                                            const next = new URLSearchParams(searchParams);
                                            next.set("collab", e.target.value);
                                            setSearchParams(next, { replace: true });
                                        }}
                                    >
                                        {eligible.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.offer} — {c.want}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <Toggle id="f-town" checked={inTown} onChange={setInTown} label="In town now" description="Checked in nearby this week" />
                                <Toggle id="f-verified" checked={verifiedOnly} onChange={setVerifiedOnly} label="Verified only" description="Ownership-verified handles" />
                                <div>
                                    <FieldLabel htmlFor="f-platform">Platform</FieldLabel>
                                    <select id="f-platform" className={selectClass} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                                        <option value="all">All platforms</option>
                                        {platforms.map((p) => (
                                            <option key={p} value={p}>
                                                {PLATFORM_LABELS[p] ?? p}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </SectionCard>
                        <SectionCard title="This month">
                            <div className="space-y-4">
                                <UsageMeter label="Profile reveals" counter={usage?.match_reveals} />
                                <UsageMeter label="Invites" counter={usage?.invites} />
                                <p className="text-xs text-neutral-500">
                                    Revealing a profile uses one reveal (once per creator per month). Each invite uses one
                                    invite.
                                </p>
                            </div>
                        </SectionCard>
                    </div>

                    {revealsLeft === 0 && (
                        <UpgradeCallout
                            compact
                            title="You've used this month's profile reveals"
                            description="Upgrade for more reveals and invites, plus the full Match breakdown."
                        />
                    )}

                    {matches.isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[0, 1, 2].map((i) => (
                                <Skeleton key={i} height={300} />
                            ))}
                        </div>
                    ) : matches.isError ? (
                        <ErrorState message="We couldn't load matches." onRetry={() => void matches.refetch()} />
                    ) : all.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-neutral-200">
                            <EmptyState
                                icon={<Sparkles className="w-7 h-7" />}
                                title="No matches yet for this collab"
                                description="Matches refresh every few hours as creators open their profiles to collabs and check in nearby. Meanwhile, creators can still find you on the map."
                            />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-neutral-200">
                            <EmptyState
                                icon={<Users className="w-7 h-7" />}
                                title="No creators match these filters"
                                description="Try turning a filter off."
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map((m) => (
                                <MatchCard
                                    key={m.creator.user_id}
                                    match={m}
                                    onReveal={() => setRevealTarget(m)}
                                    onInvite={() => {
                                        setInviteNote("");
                                        setInviteTarget(m);
                                    }}
                                    onView={() => setProfile(m)}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            <ConfirmDialog
                open={!!revealTarget}
                onClose={() => setRevealTarget(null)}
                title="Reveal this creator's profile?"
                body={
                    <>
                        This uses 1 profile reveal
                        {usage ? ` (${usage.match_reveals.used} of ${limitLabel(usage.match_reveals.limit)} used this month)` : ""}.
                        Revealing the same creator again this month is free.
                    </>
                }
                confirmLabel="Reveal profile"
                onConfirm={() => (revealTarget ? doReveal(revealTarget) : undefined)}
            />

            <Modal
                open={!!inviteTarget}
                onClose={() => setInviteTarget(null)}
                size="md"
                title={`Invite ${inviteTarget?.creator.display_name ?? "creator"}`}
                description={
                    <>
                        To <span className="font-medium text-neutral-800">{collab?.offer}</span>. Uses 1 invite
                        {usage ? ` (${usage.invites.used} of ${limitLabel(usage.invites.limit)} used)` : ""}. If they accept,
                        they're approved straight away and can redeem with your code.
                    </>
                }
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setInviteTarget(null)} disabled={inviting}>
                            Cancel
                        </Button>
                        <Button variant="accent" onClick={() => void doInvite()} isLoading={inviting} disabled={inviting}>
                            Send invite
                        </Button>
                    </>
                }
            >
                <div className="pb-2">
                    <FieldLabel htmlFor="invite-note" hint="Optional — a personal line helps.">
                        Note to the creator
                    </FieldLabel>
                    <textarea
                        id="invite-note"
                        rows={3}
                        maxLength={500}
                        value={inviteNote}
                        onChange={(e) => setInviteNote(e.target.value)}
                        placeholder="Loved your Bir paragliding reel — come try our new rooftop menu!"
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                    />
                </div>
            </Modal>

            {profile && (
                <CreatorProfileDrawer
                    key={profile.creator.user_id}
                    open
                    onClose={() => setProfile(null)}
                    creator={profile.creator}
                    match={{ score: profile.score, reasons: profile.reasons, breakdown: profile.breakdown }}
                    onChanged={() => void invalidate()}
                    onError={(e) => notifyError(e)}
                />
            )}

            <UpgradeDialog {...upgrade} />
        </div>
    );
}

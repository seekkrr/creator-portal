import { useState } from "react";
import {
    Ban,
    CalendarDays,
    CheckCircle2,
    ExternalLink,
    Flag,
    Link2,
    MessageSquare,
    Sparkles,
    Star,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@components/ui";
import { businessService } from "@services/business.service";
import type {
    ApplicationStatus,
    BusinessApplicationItem,
    CollabApplication,
    CreatorMatch,
    CreatorSummary,
} from "@services/business.types";
import { useBusiness } from "../context";
import {
    PLATFORM_LABELS,
    SOURCE_LABELS,
    formatDate,
    formatDateTime,
    socialUrl,
    usageRightsLabel,
    visitWindowLabel,
} from "../utils";
import { ConfirmDialog, Drawer } from "./Overlay";
import { ReportDialog } from "./ReportDialog";
import { ApplicationStatusPill, CreatorAvatar, Pill, VerifiedTick } from "./bits";

const RATEABLE: ApplicationStatus[] = ["redeemed", "overdue", "delivered", "completed", "no_show"];

const BREAKDOWN_LABELS: Record<string, string> = {
    theme: "Theme fit",
    local: "Local presence",
    content: "Content fit",
    quality: "Quality",
    reliability: "Reliability",
    activity: "Activity",
    peer: "Loved by similar places",
};

export function MatchBreakdown({ breakdown }: { breakdown: CreatorMatch["breakdown"] }) {
    if (!breakdown) return null;
    const entries = Object.entries(breakdown).filter(([, v]) => typeof v === "number");
    if (!entries.length) return null;
    return (
        <div className="space-y-1.5">
            {entries.map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="w-36 text-neutral-600 truncate">{BREAKDOWN_LABELS[k] ?? k}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.round((v ?? 0) * 100)}%` }} />
                    </div>
                    <span className="w-8 text-right tabular-nums text-neutral-500">{Math.round((v ?? 0) * 100)}</span>
                </div>
            ))}
        </div>
    );
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={value === n}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    onClick={() => onChange(n)}
                    className="p-0.5"
                >
                    <Star className={`w-7 h-7 ${n <= value ? "fill-highlight text-amber-500" : "text-neutral-300"}`} />
                </button>
            ))}
        </div>
    );
}

interface CreatorProfileDrawerProps {
    open: boolean;
    onClose: () => void;
    creator: CreatorSummary;
    application?: BusinessApplicationItem;
    match?: Pick<CreatorMatch, "score" | "reasons"> & { breakdown?: CreatorMatch["breakdown"] };
    /** Called after any successful action so lists can refetch. */
    onChanged: () => void;
    onError: (e: unknown) => void;
}

/** Creator profile + request actions (approve / decline / cancel / verify / rate), block and report. */
export function CreatorProfileDrawer({
    open,
    onClose,
    creator,
    application,
    match,
    onChanged,
    onError,
}: CreatorProfileDrawerProps) {
    const { businessId, canManage } = useBusiness();
    const [busy, setBusy] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<null | "decline" | "cancel" | "block">(null);
    const [reportOpen, setReportOpen] = useState(false);
    const [score, setScore] = useState(0);
    const [comment, setComment] = useState("");

    // Local copy so a verify / rating result shows immediately, even after the
    // item moves to another tab of the list behind the drawer.
    const [app, setApp] = useState<BusinessApplicationItem | undefined>(application);
    const m = match ?? app?.match ?? null;
    const stats = creator.stats ?? {};

    const run = async (key: string, fn: () => Promise<unknown>, success: string, close = false) => {
        setBusy(key);
        try {
            const result = await fn();
            if (app && result && typeof result === "object" && "status" in result) {
                setApp({ ...app, ...(result as CollabApplication) });
            }
            toast.success(success);
            onChanged();
            if (close) onClose();
        } catch (e) {
            onError(e);
            throw e;
        } finally {
            setBusy(null);
        }
    };

    const canRate = !!app && RATEABLE.includes(app.status) && !app.ratings?.business_to_creator;

    const footer = app ? (
        <>
            {app.status === "requested" && (
                <>
                    <Button
                        variant="outline"
                        leftIcon={<XCircle className="w-4 h-4" />}
                        onClick={() => setConfirm("decline")}
                        disabled={!!busy}
                    >
                        Decline
                    </Button>
                    <Button
                        variant="accent"
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        isLoading={busy === "approve"}
                        disabled={!!busy}
                        onClick={() =>
                            void run(
                                "approve",
                                () => businessService.approve(businessId, app.id),
                                `Approved — ${creator.display_name} can now redeem with your code.`,
                                true
                            ).catch(() => undefined)
                        }
                    >
                        Approve
                    </Button>
                </>
            )}
            {(app.status === "approved" || app.status === "invited") && canManage && (
                <Button variant="outline" onClick={() => setConfirm("cancel")} disabled={!!busy}>
                    {app.status === "invited" ? "Withdraw invite" : "Cancel visit"}
                </Button>
            )}
            {app.status === "delivered" && (
                <Button
                    variant="accent"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    isLoading={busy === "verify"}
                    disabled={!!busy}
                    onClick={() =>
                        void run(
                            "verify",
                            () => businessService.verify(businessId, app.id),
                            "Marked as completed. Thanks for verifying!"
                        ).catch(() => undefined)
                    }
                >
                    Verify & complete
                </Button>
            )}
        </>
    ) : undefined;

    return (
        <>
            <Drawer
                open={open}
                onClose={onClose}
                width="md"
                title={creator.display_name}
                subtitle={
                    app ? (
                        <span className="inline-flex items-center gap-2 flex-wrap">
                            <ApplicationStatusPill status={app.status} />
                            <span>{SOURCE_LABELS[app.source] ?? app.source}</span>
                        </span>
                    ) : (
                        "Creator profile"
                    )
                }
                footer={footer}
            >
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <CreatorAvatar name={creator.display_name} url={creator.avatar_url} size={64} />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {creator.tier === "verified" && (
                                    <Pill className="bg-primary-50 text-primary-700 border-primary-200">
                                        <VerifiedTick className="w-3.5 h-3.5" /> Verified creator
                                    </Pill>
                                )}
                                {creator.is_quest_creator && (
                                    <Pill className="bg-amber-50 text-amber-700 border-amber-200">Quest creator</Pill>
                                )}
                            </div>
                            {creator.public_slug && (
                                <a
                                    href={`https://seekkrr.com/c/${creator.public_slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1.5 inline-flex items-center gap-1 text-sm text-primary-700 hover:underline"
                                >
                                    Portfolio <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>
                    </div>

                    {m && (
                        <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary-700" />
                                <span className="font-display font-semibold text-primary-900">SeekKrr Match {m.score}%</span>
                            </div>
                            {m.reasons.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {m.reasons.map((r) => (
                                        <span key={r} className="px-2 py-0.5 rounded-full bg-white border border-primary-100 text-xs text-primary-800">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {"breakdown" in m && m.breakdown ? <MatchBreakdown breakdown={m.breakdown} /> : null}
                        </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                            { label: "Redeemed", value: stats.redeemed ?? 0 },
                            { label: "Completed", value: stats.completed ?? 0 },
                            {
                                label: "Completion",
                                value:
                                    stats.completion_rate === null || stats.completion_rate === undefined
                                        ? "New"
                                        : `${Math.round(stats.completion_rate * 100)}%`,
                            },
                            {
                                label: "Rating",
                                value: stats.avg_rating ? `${stats.avg_rating.toFixed(1)}★` : "—",
                                hint: stats.rating_count ? `${stats.rating_count} ratings` : undefined,
                            },
                        ].map((s) => (
                            <div key={s.label} className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-center">
                                <p className="text-lg font-bold text-neutral-900">{s.value}</p>
                                <p className="text-[11px] uppercase tracking-wider text-neutral-500">{s.label}</p>
                                {"hint" in s && s.hint && <p className="text-[11px] text-neutral-400">{s.hint}</p>}
                            </div>
                        ))}
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-neutral-900 mb-2">Handles</h3>
                        {creator.socials.length === 0 ? (
                            <p className="text-sm text-neutral-500">No handles shared.</p>
                        ) : (
                            <ul className="space-y-1.5">
                                {creator.socials.map((s, i) => {
                                    const url = socialUrl(s.platform, s.handle);
                                    return (
                                        <li key={`${s.platform}-${i}`} className="flex items-center gap-2 text-sm">
                                            <span className="w-20 text-neutral-500">{PLATFORM_LABELS[s.platform] ?? s.platform}</span>
                                            {s.handle ? (
                                                url ? (
                                                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline truncate">
                                                        @{s.handle.replace(/^@/, "")}
                                                    </a>
                                                ) : (
                                                    <span className="truncate">{s.handle}</span>
                                                )
                                            ) : (
                                                <span className="text-neutral-400">hidden</span>
                                            )}
                                            {s.verified ? (
                                                <span className="inline-flex items-center gap-0.5 text-xs text-primary-700">
                                                    <VerifiedTick className="w-3.5 h-3.5" /> verified
                                                </span>
                                            ) : (
                                                <span className="text-xs text-neutral-400">not verified</span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {creator.travel_styles.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-neutral-900 mb-2">Travel styles</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {creator.travel_styles.map((t) => (
                                    <span key={t} className="px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-800 border border-primary-100 text-xs">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {creator.bio && (
                        <div>
                            <h3 className="text-sm font-semibold text-neutral-900 mb-1">Bio</h3>
                            <p className="text-sm text-neutral-700 whitespace-pre-line">{creator.bio}</p>
                        </div>
                    )}

                    {app && (
                        <div className="rounded-2xl border border-neutral-200 p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-neutral-900">This collab</h3>
                            <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                                <dt className="text-neutral-500">For</dt>
                                <dd className="text-neutral-900">{app.collab?.offer ?? "—"}</dd>
                                <dt className="text-neutral-500">Want</dt>
                                <dd className="text-neutral-900">{app.collab?.want ?? "—"}</dd>
                                {app.visit_window && (
                                    <>
                                        <dt className="text-neutral-500">Visit dates</dt>
                                        <dd className="text-neutral-900 inline-flex items-center gap-1">
                                            <CalendarDays className="w-4 h-4 text-neutral-400" />
                                            {visitWindowLabel(app.visit_window)}
                                        </dd>
                                    </>
                                )}
                                {app.redemption && (
                                    <>
                                        <dt className="text-neutral-500">Redeemed</dt>
                                        <dd className="text-neutral-900">
                                            {formatDateTime(app.redemption.at)} ·{" "}
                                            {app.redemption.method === "staff_qr" ? "staff scanned QR" : "redeem code"}
                                        </dd>
                                    </>
                                )}
                                {app.due_at && (
                                    <>
                                        <dt className="text-neutral-500">Content due</dt>
                                        <dd className="text-neutral-900">{formatDate(app.due_at)}</dd>
                                    </>
                                )}
                                {app.decline_reason && (
                                    <>
                                        <dt className="text-neutral-500">Reason</dt>
                                        <dd className="text-neutral-900">{app.decline_reason}</dd>
                                    </>
                                )}
                            </dl>
                            {app.note && (
                                <p className="text-sm text-neutral-700 bg-neutral-50 rounded-xl p-3 flex gap-2">
                                    <MessageSquare className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                                    <span className="whitespace-pre-line">{app.note}</span>
                                </p>
                            )}
                            {app.timeline.length > 0 && (
                                <ol className="border-l border-neutral-200 ml-1.5 pl-4 space-y-1">
                                    {app.timeline.map((t, i) => (
                                        <li key={i} className="text-xs text-neutral-500 relative">
                                            <span className="absolute -left-[1.2rem] top-1 w-2 h-2 rounded-full bg-primary-300" />
                                            <span className="capitalize text-neutral-700">{t.status.replace(/_/g, " ")}</span> ·{" "}
                                            {formatDateTime(t.at)}
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    )}

                    {app && app.deliverables.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-neutral-900">Delivered content</h3>
                            <p className="text-xs text-neutral-500">
                                Usage rights: {usageRightsLabel(app.collab?.brief?.usage_rights)}
                            </p>
                            <ul className="space-y-2">
                                {app.deliverables.map((d, i) => (
                                    <li key={i} className="rounded-xl border border-neutral-200 p-3 flex items-start gap-3">
                                        <Link2 className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-700 hover:underline break-all">
                                                {d.url}
                                            </a>
                                            <p className="text-xs text-neutral-500 mt-0.5 capitalize">
                                                {d.type} · {formatDateTime(d.submitted_at)}
                                            </p>
                                            <p className="text-xs mt-1">
                                                {d.auto_check?.ok === true ? (
                                                    <span className="text-green-700">
                                                        Link checked{d.auto_check.author ? ` · posted by ${d.auto_check.author}` : ""}
                                                    </span>
                                                ) : d.auto_check?.ok === false ? (
                                                    <span className="text-amber-700">
                                                        Couldn't verify{d.auto_check.reason ? `: ${d.auto_check.reason}` : ""}
                                                    </span>
                                                ) : (
                                                    <span className="text-neutral-500">Not auto-checked — open the link to review</span>
                                                )}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {app?.ratings?.business_to_creator && (
                        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-sm">
                            <p className="font-medium text-neutral-900">
                                Your rating: {"★".repeat(app.ratings.business_to_creator.score)}
                                <span className="text-neutral-300">{"★".repeat(5 - app.ratings.business_to_creator.score)}</span>
                            </p>
                            {app.ratings.business_to_creator.comment && (
                                <p className="text-neutral-600 mt-1">{app.ratings.business_to_creator.comment}</p>
                            )}
                        </div>
                    )}

                    {canRate && app && (
                        <div className="rounded-2xl border border-neutral-200 p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-neutral-900">Rate this creator</h3>
                            <p className="text-xs text-neutral-500">
                                Ratings feed SeekKrr Match and help other places pick reliable creators.
                            </p>
                            <StarInput value={score} onChange={setScore} />
                            <textarea
                                rows={2}
                                maxLength={500}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Optional comment"
                                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                            />
                            <Button
                                size="sm"
                                disabled={score < 1 || !!busy}
                                isLoading={busy === "rate"}
                                onClick={() =>
                                    void run(
                                        "rate",
                                        () => businessService.rate(businessId, app.id, score, comment.trim()),
                                        "Thanks — rating saved."
                                    ).catch(() => undefined)
                                }
                            >
                                Submit rating
                            </Button>
                        </div>
                    )}

                    <div className="pt-2 border-t border-neutral-100 flex flex-wrap gap-2">
                        {canManage && (
                            <Button variant="ghost" size="sm" leftIcon={<Ban className="w-4 h-4" />} onClick={() => setConfirm("block")}>
                                Block creator
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" leftIcon={<Flag className="w-4 h-4" />} onClick={() => setReportOpen(true)}>
                            Report
                        </Button>
                    </div>
                </div>
            </Drawer>

            <ConfirmDialog
                open={confirm === "decline"}
                onClose={() => setConfirm(null)}
                title={`Decline ${creator.display_name}?`}
                body="They'll be told the request wasn't accepted this time."
                reasonLabel="Reason (optional, shared with the creator)"
                reasonPlaceholder="e.g. We're fully booked those dates"
                confirmLabel="Decline request"
                variant="danger"
                onConfirm={(reason) =>
                    app
                        ? run("decline", () => businessService.decline(businessId, app.id, reason), "Request declined.", true)
                        : undefined
                }
            />
            <ConfirmDialog
                open={confirm === "cancel"}
                onClose={() => setConfirm(null)}
                title={app?.status === "invited" ? "Withdraw this invite?" : "Cancel this visit?"}
                body="The creator is notified and the slot is released."
                reasonLabel="Reason (optional)"
                confirmLabel={app?.status === "invited" ? "Withdraw invite" : "Cancel visit"}
                variant="danger"
                onConfirm={(reason) =>
                    app ? run("cancel", () => businessService.cancel(businessId, app.id, reason), "Cancelled.", true) : undefined
                }
            />
            <ConfirmDialog
                open={confirm === "block"}
                onClose={() => setConfirm(null)}
                title={`Block ${creator.display_name}?`}
                body="They won't see your collabs, can't send you requests and won't appear in Discover. You can unblock them later from Blocked creators."
                confirmLabel="Block"
                variant="danger"
                onConfirm={() =>
                    run("block", () => businessService.blockCreator(businessId, creator.user_id), "Creator blocked.", true)
                }
            />
            <ReportDialog
                open={reportOpen}
                onClose={() => setReportOpen(false)}
                targetType="creator"
                targetId={creator.user_id}
                targetName={creator.display_name}
            />
        </>
    );
}

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Trash2, UserPlus, Users } from "lucide-react";
import { Button, ErrorState, Skeleton } from "@components/ui";
import { useAuthStore } from "@store/auth.store";
import { businessService } from "@services/business.service";
import { ApiRequestError } from "@services/api";
import type { BusinessMemberEntry, MemberRole } from "@services/business.types";
import { useBusiness } from "../context";
import { useBusinessDetail, useHub, useInvalidateBusiness, useUpgradePrompt } from "../queries";
import { ROLE_LABELS, errorMessage, formatDate, isQuotaError, limitLabel, roleHints } from "../utils";
import { usePartnerPortal } from "../partnerPortal";
import { CreatorAvatar, FieldLabel, PageHeader, Pill, SectionCard, inputClass, selectClass } from "../components/bits";
import { ConfirmDialog } from "../components/Overlay";
import { UpgradeDialog } from "../components/UpgradeDialog";

type AssignableRole = Exclude<MemberRole, "owner">;

const ROLE_STYLE: Record<MemberRole, string> = {
    owner: "bg-primary-900 text-white border-primary-900",
    manager: "bg-primary-50 text-primary-700 border-primary-200",
    staff: "bg-neutral-100 text-neutral-700 border-neutral-200",
};

export function TeamPage() {
    const { businessId, isOwner, business } = useBusiness();
    const user = useAuthStore((s) => s.user);
    const refreshSession = useAuthStore((s) => s.refreshSession);
    const navigate = useNavigate();
    const detail = useBusinessDetail();
    const hub = useHub();
    const invalidate = useInvalidateBusiness();
    const { notifyError, upgrade, showUpgrade } = useUpgradePrompt();
    const { plansVisible, matchmakingVisible } = usePartnerPortal();
    const hints = roleHints({ plans: plansVisible, matchmaking: matchmakingVisible });

    const members: BusinessMemberEntry[] = detail.data?.members ?? business.members ?? [];
    const names = useQueries({
        queries: members.map((m) => ({
            queryKey: ["member-name", m.user_id],
            queryFn: () => businessService.getMemberName(m.user_id),
            staleTime: 60 * 60_000,
            retry: false,
        })),
    });

    const [email, setEmail] = useState("");
    const [role, setRole] = useState<AssignableRole>("staff");
    const [adding, setAdding] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [removeTarget, setRemoveTarget] = useState<BusinessMemberEntry | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const seatLimit = hub.data?.usage?.entitlements?.team_members;
    const seatsFull = seatLimit !== null && seatLimit !== undefined && members.length >= seatLimit;

    const nameFor = (m: BusinessMemberEntry, i: number) =>
        m.user_id === user?._id
            ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "You"
            : (names[i]?.data ?? "Team member");

    const add = async (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            setFormError("Enter a valid email address.");
            return;
        }
        setAdding(true);
        try {
            await businessService.addMember(businessId, email.trim(), role);
            toast.success(`Added as ${ROLE_LABELS[role].toLowerCase()}. They'll see this business next time they sign in.`);
            setEmail("");
            await invalidate();
            void refreshSession();
        } catch (err) {
            if (isQuotaError(err)) {
                showUpgrade(err.message);
            } else if (err instanceof ApiRequestError && (err.status === 400 || err.status === 409)) {
                setFormError(err.message);
            } else {
                setFormError(errorMessage(err, "Couldn't add this person"));
            }
        } finally {
            setAdding(false);
        }
    };

    const changeRole = async (m: BusinessMemberEntry, next: AssignableRole) => {
        setBusyId(m.user_id);
        try {
            await businessService.changeMemberRole(businessId, m.user_id, next);
            toast.success(`Role changed to ${ROLE_LABELS[next].toLowerCase()}.`);
            await invalidate();
        } catch (err) {
            notifyError(err, "Couldn't change the role");
        } finally {
            setBusyId(null);
        }
    };

    const selfMember = members.find((m) => m.user_id === user?._id);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Team"
                description={
                    seatLimit === undefined
                        ? "Who can manage this business on SeekKrr."
                        : `${members.length} of ${limitLabel(seatLimit)} seats used${plansVisible ? " on your plan" : ""}.`
                }
            />

            {isOwner ? (
                <SectionCard title="Add a team member" description="They need a SeekKrr account with this email (they can sign up in the app).">
                    <form onSubmit={(e) => void add(e)} className="grid grid-cols-1 md:grid-cols-[1fr_12rem_auto] gap-3 items-end">
                        <div>
                            <FieldLabel htmlFor="member-email">Email</FieldLabel>
                            <input
                                id="member-email"
                                type="email"
                                className={inputClass}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <FieldLabel htmlFor="member-role">Role</FieldLabel>
                            <select
                                id="member-role"
                                className={selectClass}
                                value={role}
                                onChange={(e) => setRole(e.target.value as AssignableRole)}
                            >
                                <option value="staff">Staff</option>
                                <option value="manager">Manager</option>
                            </select>
                        </div>
                        <Button
                            type="submit"
                            variant="accent"
                            leftIcon={<UserPlus className="w-4 h-4" />}
                            isLoading={adding}
                            disabled={adding}
                        >
                            Add
                        </Button>
                    </form>
                    {seatsFull && !formError && (
                        <p className="text-xs text-amber-700 mt-2">
                            {plansVisible
                                ? `All ${seatLimit} seat${seatLimit === 1 ? "" : "s"} on your plan are in use — upgrade to add more people.`
                                : `All ${seatLimit} seat${seatLimit === 1 ? " is" : "s are"} in use.`}
                        </p>
                    )}
                    {formError && (
                        <p className="text-sm text-red-600 mt-2" role="alert">
                            {formError}
                        </p>
                    )}
                    <p className="text-xs text-neutral-500 mt-3">
                        <span className="font-medium">Manager:</span> {hints.manager}{" "}
                        <span className="font-medium">Staff:</span> {hints.staff}
                    </p>
                </SectionCard>
            ) : (
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
                    Only the owner can add or remove people and change roles.
                </div>
            )}

            <SectionCard title="Members">
                {detail.isLoading ? (
                    <div className="space-y-3">
                        {[0, 1].map((i) => (
                            <Skeleton key={i} height={52} />
                        ))}
                    </div>
                ) : detail.isError ? (
                    <ErrorState message="We couldn't load the team." onRetry={() => void detail.refetch()} />
                ) : members.length === 0 ? (
                    <p className="text-sm text-neutral-500 flex items-center gap-2">
                        <Users className="w-4 h-4" /> No members yet.
                    </p>
                ) : (
                    <ul className="divide-y divide-neutral-100 -my-2">
                        {members.map((m, i) => {
                            const name = nameFor(m, i);
                            const isSelf = m.user_id === user?._id;
                            return (
                                <li key={m.user_id} className="py-3 flex flex-wrap items-center gap-3">
                                    <CreatorAvatar name={name} size={38} />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-neutral-900 truncate">
                                            {name}
                                            {isSelf && <span className="text-neutral-400 font-normal"> (you)</span>}
                                        </p>
                                        <p className="text-xs text-neutral-500">Added {formatDate(m.added_at)}</p>
                                    </div>
                                    {isOwner && m.role !== "owner" ? (
                                        <>
                                            <select
                                                aria-label={`Role for ${name}`}
                                                className={`${selectClass} w-36`}
                                                value={m.role}
                                                disabled={busyId === m.user_id}
                                                onChange={(e) => void changeRole(m, e.target.value as AssignableRole)}
                                            >
                                                <option value="manager">Manager</option>
                                                <option value="staff">Staff</option>
                                            </select>
                                            <button
                                                type="button"
                                                aria-label={`Remove ${name}`}
                                                onClick={() => setRemoveTarget(m)}
                                                className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <Pill className={ROLE_STYLE[m.role]}>{ROLE_LABELS[m.role]}</Pill>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </SectionCard>

            {selfMember && selfMember.role !== "owner" && (
                <Button
                    variant="ghost"
                    leftIcon={<LogOut className="w-4 h-4" />}
                    className="text-red-600"
                    onClick={() => setRemoveTarget(selfMember)}
                >
                    Leave this business
                </Button>
            )}

            <ConfirmDialog
                open={!!removeTarget}
                onClose={() => setRemoveTarget(null)}
                title={removeTarget?.user_id === user?._id ? "Leave this business?" : "Remove this team member?"}
                body={
                    removeTarget?.user_id === user?._id
                        ? "You'll lose access to this business in the Partner Portal and the app."
                        : "They lose access to this business straight away."
                }
                confirmLabel={removeTarget?.user_id === user?._id ? "Leave" : "Remove"}
                variant="danger"
                onConfirm={async () => {
                    if (!removeTarget) return;
                    const leaving = removeTarget.user_id === user?._id;
                    try {
                        await businessService.removeMember(businessId, removeTarget.user_id);
                        toast.success(leaving ? "You've left the business." : "Removed from the team.");
                        if (leaving) {
                            await refreshSession();
                            navigate("/", { replace: true });
                        } else {
                            await invalidate();
                        }
                    } catch (err) {
                        notifyError(err, "Couldn't remove this member");
                        throw err;
                    }
                }}
            />

            <UpgradeDialog {...upgrade} />
        </div>
    );
}

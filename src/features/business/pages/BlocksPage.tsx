import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, ShieldCheck } from "lucide-react";
import { Button, EmptyState, ErrorState, Skeleton } from "@components/ui";
import { businessService } from "@services/business.service";
import type { BlockEntry } from "@services/business.types";
import { useBusiness } from "../context";
import { bkeys, useApplications, useInvalidateBusiness } from "../queries";
import { usePartnerPortal } from "../partnerPortal";
import { errorMessage, formatDate } from "../utils";
import { CreatorAvatar, PageHeader } from "../components/bits";
import { ConfirmDialog } from "../components/Overlay";

/** Creators this business has blocked (from a creator's profile drawer). */
export function BlocksPage() {
    const { businessId, canManage } = useBusiness();
    const invalidate = useInvalidateBusiness();
    const blocks = useQuery({
        queryKey: bkeys.blocks(businessId),
        queryFn: () => businessService.listBlocks(businessId),
        enabled: canManage,
        staleTime: 30_000,
    });
    // Blocks only carry ids; name them from the creators who've applied to you.
    const history = useApplications({}, canManage);
    const names = useMemo(() => {
        const map = new Map<string, { name: string; avatar?: string | null }>();
        for (const a of history.data ?? []) {
            map.set(a.creator_user_id, { name: a.creator.display_name, avatar: a.creator.avatar_url });
        }
        return map;
    }, [history.data]);
    const [target, setTarget] = useState<BlockEntry | null>(null);
    const { matchmakingVisible } = usePartnerPortal();

    const creatorBlocks = (blocks.data ?? []).filter((b) => b.blocked_type === "creator");

    if (!canManage) {
        return (
            <div className="space-y-6">
                <PageHeader title="Blocked creators" />
                <EmptyState
                    icon={<Ban className="w-7 h-7" />}
                    title="Managers and owners manage blocks"
                    description="Ask a manager or the owner if a creator should be blocked or unblocked."
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Blocked creators"
                description={
                    matchmakingVisible
                        ? "Blocked creators can't see your UGC briefs, send you requests or appear in Discover — and you won't see them."
                        : "Blocked creators can't see your UGC briefs or send you requests — and you won't see them."
                }
            />

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
                {blocks.isLoading ? (
                    <div className="p-5 space-y-3">
                        <Skeleton height={48} />
                        <Skeleton height={48} />
                    </div>
                ) : blocks.isError ? (
                    <ErrorState message="We couldn't load blocked creators." onRetry={() => void blocks.refetch()} />
                ) : creatorBlocks.length === 0 ? (
                    <EmptyState
                        icon={<ShieldCheck className="w-7 h-7" />}
                        title="You haven't blocked anyone"
                        description="If a creator makes you uncomfortable, open their profile from Requests and choose Block — or Report so our team can step in."
                    />
                ) : (
                    <ul className="divide-y divide-neutral-100">
                        {creatorBlocks.map((b) => {
                            const known = names.get(b.blocked_id);
                            const name = known?.name ?? "Creator";
                            return (
                                <li key={b.blocked_id} className="flex items-center gap-3 px-5 py-3.5">
                                    <CreatorAvatar name={name} url={known?.avatar} size={38} />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-neutral-900 truncate">{name}</p>
                                        <p className="text-xs text-neutral-500">
                                            Blocked {formatDate(b.created_at)}
                                            {!known && <span className="font-mono"> · {b.blocked_id}</span>}
                                        </p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => setTarget(b)}>
                                        Unblock
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <ConfirmDialog
                open={!!target}
                onClose={() => setTarget(null)}
                title={`Unblock ${target ? (names.get(target.blocked_id)?.name ?? "this creator") : ""}?`}
                body="They'll be able to see your UGC briefs and send requests again."
                confirmLabel="Unblock"
                onConfirm={async () => {
                    if (!target) return;
                    try {
                        await businessService.unblockCreator(businessId, target.blocked_id);
                        toast.success("Creator unblocked.");
                        await invalidate();
                    } catch (e) {
                        toast.error(errorMessage(e, "Couldn't unblock"));
                        throw e;
                    }
                }}
            />
        </div>
    );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tag } from "lucide-react";
import { Badge, Button, EmptyState, ErrorState, Skeleton } from "@components/ui";
import { offerService, type BusinessOffer } from "@services/offer.service";
import { bkeys } from "../queries";
import { errorMessage } from "../utils";
import { ConfirmDialog } from "../components/Overlay";

function ruleLabel(offer: BusinessOffer): string {
    return offer.rule_type === "quantitative"
        ? `Every ${offer.trigger_n}th check-in (across all visitors)`
        : `Every ${offer.trigger_n}th visit by the same person`;
}

function rewardLabel(offer: BusinessOffer): string {
    if (offer.reward_type === "flat") return `Flat ₹${offer.flat_discount_value ?? 0} off`;
    const p = offer.product_details;
    if (!p) return "Product reward";
    return p.discount_value ? `${p.title} at ₹${p.discount_value}` : p.title;
}

interface OffersListProps {
    markerId: string;
    canManage: boolean;
    onCreate?: () => void;
}

/** Check-in discount offers for one place, with pause/activate/delete. */
export function OffersList({ markerId, canManage, onCreate }: OffersListProps) {
    const queryClient = useQueryClient();
    const { data: offers, isLoading, isError, refetch } = useQuery({
        queryKey: bkeys.offers(markerId),
        queryFn: () => offerService.getBusinessOffers(markerId),
        staleTime: 30_000,
    });
    const [busyId, setBusyId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<BusinessOffer | null>(null);

    const refresh = () => queryClient.invalidateQueries({ queryKey: ["offers", markerId] });

    const toggle = async (offer: BusinessOffer) => {
        if (!offer._id) return;
        setBusyId(offer._id);
        try {
            await offerService.updateBusinessOffer(offer._id, { is_active: !offer.is_active });
            toast.success(offer.is_active ? "Offer paused." : "Offer is live.");
            await refresh();
        } catch (e) {
            toast.error(errorMessage(e, "Couldn't update the offer"));
        } finally {
            setBusyId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                    <Skeleton key={i} height={72} />
                ))}
            </div>
        );
    }

    if (isError) return <ErrorState message="We couldn't load your offers." onRetry={() => void refetch()} />;

    if (!offers || offers.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-neutral-200">
                <EmptyState
                    icon={<Tag className="w-7 h-7" />}
                    title="No check-in offers yet"
                    description="Reward regulars and drive footfall — e.g. every 5th visit gets ₹100 off. Travellers unlock it automatically when they check in."
                    action={
                        canManage && onCreate ? (
                            <Button variant="accent" onClick={onCreate}>
                                Create an offer
                            </Button>
                        ) : undefined
                    }
                />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-3">
                {offers.map((offer) => (
                    <div
                        key={offer._id}
                        className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                    >
                        <Badge variant={offer.is_active ? "success" : "default"}>{offer.is_active ? "Active" : "Paused"}</Badge>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-neutral-900">{ruleLabel(offer)}</p>
                            <p className="text-sm text-neutral-500 mt-0.5">
                                <span className="font-medium text-neutral-700">Reward:</span> {rewardLabel(offer)}
                            </p>
                        </div>
                        {canManage && (
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => void toggle(offer)}
                                    isLoading={busyId === offer._id}
                                    disabled={busyId === offer._id}
                                >
                                    {offer.is_active ? "Pause" : "Activate"}
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteTarget(offer)}>
                                    Delete
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <ConfirmDialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Delete this offer?"
                body="Travellers who already unlocked a coupon can still use it."
                confirmLabel="Delete offer"
                variant="danger"
                onConfirm={async () => {
                    if (!deleteTarget?._id) return;
                    try {
                        await offerService.deleteBusinessOffer(deleteTarget._id);
                        toast.success("Offer deleted.");
                        await refresh();
                    } catch (e) {
                        toast.error(errorMessage(e, "Couldn't delete the offer"));
                        throw e;
                    }
                }}
            />
        </>
    );
}

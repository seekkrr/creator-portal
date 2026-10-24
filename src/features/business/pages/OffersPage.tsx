import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, EmptyState, ErrorState, Skeleton } from "@components/ui";
import { useBusiness } from "../context";
import { useHub } from "../queries";
import { FieldLabel, PageHeader, selectClass } from "../components/bits";
import { OfferAnalyticsCards } from "../offers/OfferAnalyticsCards";
import { OffersList } from "../offers/OffersList";
import { OfferForm } from "../offers/OfferForm";

/** Fixed check-in discounts (the pre-collab offers system), per place. */
export function OffersPage() {
    const { canManage } = useBusiness();
    const hub = useHub();
    const queryClient = useQueryClient();
    const places = hub.data?.places ?? [];
    const [picked, setPicked] = useState<string>("");
    const markerId = places.some((p) => p.marker_id === picked) ? picked : (places[0]?.marker_id ?? "");
    const place = places.find((p) => p.marker_id === markerId);
    const [formOpen, setFormOpen] = useState(false);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Check-in offers"
                description="Fixed discounts that travellers unlock by checking in — they redeem them with the same staff code as UGC briefs."
                actions={
                    canManage && markerId ? (
                        <Button
                            variant="accent"
                            leftIcon={<Plus className="w-4 h-4" />}
                            onClick={() => setFormOpen(true)}
                            className="w-full sm:w-auto"
                        >
                            New offer
                        </Button>
                    ) : undefined
                }
            />

            {hub.isLoading ? (
                <Skeleton height={200} />
            ) : hub.isError ? (
                <ErrorState message="We couldn't load your places." onRetry={() => void hub.refetch()} />
            ) : places.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200">
                    <EmptyState
                        icon={<MapPin className="w-7 h-7" />}
                        title="Add your place first"
                        description="Offers belong to a place on the SeekKrr map. Link yours, or drop a pin if it's new."
                        action={
                            <Link to="/business/locations?add=1">
                                <Button variant="accent" className="rounded-full">Add your place</Button>
                            </Link>
                        }
                    />
                </div>
            ) : (
                <>
                    {places.length > 1 && (
                        <div className="max-w-sm">
                            <FieldLabel htmlFor="offers-place">Place</FieldLabel>
                            <select
                                id="offers-place"
                                className={selectClass}
                                value={markerId}
                                onChange={(e) => setPicked(e.target.value)}
                            >
                                {places.map((p) => (
                                    <option key={p.marker_id} value={p.marker_id}>
                                        {p.title ?? p.marker_id}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <OfferAnalyticsCards markerId={markerId} />
                    <OffersList markerId={markerId} canManage={canManage} onCreate={() => setFormOpen(true)} />
                </>
            )}

            {formOpen && markerId && (
                <OfferForm
                    markerId={markerId}
                    placeTitle={place?.title}
                    onClose={() => setFormOpen(false)}
                    onSuccess={() => {
                        setFormOpen(false);
                        void queryClient.invalidateQueries({ queryKey: ["offers", markerId] });
                    }}
                />
            )}
        </div>
    );
}

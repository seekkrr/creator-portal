import React, { useEffect, useState } from "react";
import { offerService, type BusinessOffer } from "@/services/offer.service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

interface OffersListProps {
    markerId: string;
}

export const OffersList: React.FC<OffersListProps> = ({ markerId }) => {
    const [offers, setOffers] = useState<BusinessOffer[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOffers = async () => {
        try {
            const data = await offerService.getBusinessOffers(markerId);
            setOffers(data);
        } catch (err) {
            console.error("Failed to load offers", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOffers();
    }, [markerId]);

    const handleToggleActive = async (offer: BusinessOffer) => {
        if (!offer._id) return;
        try {
            await offerService.updateBusinessOffer(offer._id, { is_active: !offer.is_active });
            fetchOffers(); // Reload after update
        } catch (err) {
            console.error("Failed to toggle offer", err);
        }
    };
    
    const handleDelete = async (offerId?: string) => {
        if (!offerId) return;
        if (!confirm("Are you sure you want to delete this offer?")) return;
        try {
            await offerService.deleteBusinessOffer(offerId);
            fetchOffers();
        } catch (err) {
            console.error("Failed to delete offer", err);
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }

    if (offers.length === 0) {
        return (
            <Card className="p-12 text-center flex flex-col items-center">
                <h3 className="text-lg font-medium text-slate-800 mb-2">No active offers</h3>
                <p className="text-slate-500 max-w-sm">
                    Create your first check-in offer to start driving footfall and repeat visits to your business.
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {offers.map((offer) => (
                <Card key={offer._id} className="p-6 flex justify-between items-center hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-6">
                        {/* Status Indicator */}
                        <div className="flex flex-col items-center justify-center space-y-2">
                            <Badge variant={offer.is_active ? "success" : "default"}>
                                {offer.is_active ? "Active" : "Paused"}
                            </Badge>
                        </div>

                        {/* Offer Details */}
                        <div>
                            <h4 className="text-lg font-semibold text-slate-800">
                                {offer.rule_type === "quantitative" 
                                    ? `Every ${offer.trigger_n} check-ins (Global)` 
                                    : `Every ${offer.trigger_n}th visit by a unique user`}
                            </h4>
                            <div className="text-sm text-slate-500 mt-1 flex items-center space-x-2">
                                <span className="font-medium text-slate-700">Reward:</span>
                                <span>
                                    {offer.reward_type === "flat" 
                                        ? `Flat ₹${offer.flat_discount_value} Off` 
                                        : offer.product_details?.title}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleToggleActive(offer)}
                        >
                            {offer.is_active ? "Pause" : "Activate"}
                        </Button>
                        <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => handleDelete(offer._id)}
                        >
                            Delete
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
    );
};

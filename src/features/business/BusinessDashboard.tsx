import React, { useState, useEffect } from "react";
import { markerService } from "@/services/marker.service";
import type { Marker } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OffersList } from "./OffersList";
import { OfferForm } from "./OfferForm";
import { BusinessSettings } from "./BusinessSettings";
import { BusinessAnalyticsCards } from "./BusinessAnalyticsCards";
import { VirtualRedemptionTool } from "./VirtualRedemptionTool";
import { Skeleton } from "@/components/ui/Skeleton";

export const BusinessDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"offers" | "settings">("offers");
    const [marker, setMarker] = useState<Marker | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    // In MVP, we assume a business owner has exactly one marker
    useEffect(() => {
        const fetchMarker = async () => {
            try {
                const res = await markerService.listMarkers({ mine: true });
                if (res.items.length > 0) {
                    setMarker(res.items[0] ?? null);
                }
            } catch (err) {
                console.error("Failed to fetch business marker", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMarker();
    }, []);

    if (loading) {
        return (
            <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!marker) {
        return (
            <div className="p-8">
                <Card className="p-12 text-center flex flex-col items-center">
                    <h2 className="text-xl font-semibold mb-2">No Business Location Found</h2>
                    <p className="text-slate-500 mb-6">
                        You need to create a marker for your business before managing offers.
                    </p>
                    <Button onClick={() => window.location.href = "/creator/markers"}>
                        Create Marker
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold">{marker.title} - Dashboard</h1>
                    <p className="text-slate-500">Manage your business check-in offers and settings.</p>
                </div>
                {activeTab === "offers" && (
                    <Button onClick={() => setIsFormOpen(true)}>Create Offer</Button>
                )}
            </div>

            <BusinessAnalyticsCards markerId={marker.id} />
            
            {/* Show redemption tool if they have a secret code setup */}
            {(marker as any).business_secret_code && (
                <VirtualRedemptionTool markerId={marker.id} secretCode={(marker as any).business_secret_code} />
            )}

            <div className="flex border-b border-slate-200 mb-6 space-x-8">
                <button
                    className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "offers" 
                            ? "border-primary-600 text-primary-600" 
                            : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                    onClick={() => setActiveTab("offers")}
                >
                    Active Offers
                </button>
                <button
                    className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "settings" 
                            ? "border-primary-600 text-primary-600" 
                            : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                    onClick={() => setActiveTab("settings")}
                >
                    Business Settings
                </button>
            </div>

            {activeTab === "offers" ? (
                <OffersList markerId={marker.id} />
            ) : (
                <BusinessSettings marker={marker} />
            )}

            {isFormOpen && (
                <OfferForm 
                    markerId={marker.id} 
                    onClose={() => setIsFormOpen(false)} 
                    // When the form successfully submits, we just trigger a hard refresh or emit an event
                    // to reload the OffersList for simplicity in MVP.
                    onSuccess={() => {
                        setIsFormOpen(false);
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
};

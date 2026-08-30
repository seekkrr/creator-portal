import React, { useState } from "react";
import { markerService } from "@/services/marker.service";
import type { Marker } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface BusinessSettingsProps {
    marker: Marker;
}

export const BusinessSettings: React.FC<BusinessSettingsProps> = ({ marker }) => {
    // Note: The Marker type from types/index.ts might not have these new fields strongly typed yet,
    // so we cast or access them carefully. We'd update the types in a real scenario.
    const rawMarker = marker as any;
    
    const [submitting, setSubmitting] = useState(false);
    const [subscriptionFlag, setSubscriptionFlag] = useState<string>(rawMarker.subscription_flag || "NA");
    const [secretCode, setSecretCode] = useState<string>(rawMarker.business_secret_code || "");
    const [successMessage, setSuccessMessage] = useState("");

    const handleSave = async () => {
        setSubmitting(true);
        setSuccessMessage("");
        try {
            await markerService.updateMarker(marker.id, {
                // We cast as any to bypass strict type checking for the new fields for this MVP
                subscription_flag: subscriptionFlag,
                business_secret_code: secretCode,
            } as any);
            setSuccessMessage("Settings saved successfully.");
        } catch (error) {
            console.error("Failed to update business settings", error);
            alert("Failed to update settings.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="p-8 max-w-2xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Business Settings</h3>
            
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Check-in Subscription Type</label>
                    <select 
                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={subscriptionFlag}
                        onChange={(e) => setSubscriptionFlag(e.target.value)}
                    >
                        <option value="NA">Not Subscribed</option>
                        <option value="Virtual">Virtual Only (e.g. Cloud Kitchen)</option>
                        <option value="Physical">Physical Only (In-store)</option>
                        <option value="Both">Both (Virtual & Physical)</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                        Determines if users can check in from anywhere (Virtual) or if they must be within 30m of your location (Physical).
                    </p>
                </div>

                <hr className="border-slate-100" />

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Business Secret Code (PIN)</label>
                    <Input 
                        type="text" 
                        maxLength={4}
                        placeholder="e.g. 1234"
                        value={secretCode}
                        onChange={(e) => setSecretCode(e.target.value.replace(/\D/g, ''))} // numbers only
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        This 4-digit code is used by your staff to validate and redeem physical coupons on a customer's phone. 
                        Do not share this with customers.
                    </p>
                </div>

                <div className="pt-4 flex items-center justify-between">
                    {successMessage ? (
                        <span className="text-sm text-green-600 font-medium">{successMessage}</span>
                    ) : <span />}
                    <Button onClick={handleSave} isLoading={submitting}>
                        Save Settings
                    </Button>
                </div>
            </div>
        </Card>
    );
};

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export const BusinessApplicationPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [businessName, setBusinessName] = useState("");
    
    // In a real flow, this would call `POST /api/v2/users/me/apply-business`
    // which the backend would process and append "business" to `user.role`.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Simulated API call for MVP
            await new Promise((resolve) => setTimeout(resolve, 1000));
            
            // To properly mock this without backend support in this exact PR context, 
            // we will just show an alert. The backend implementation of this specific 
            // /apply endpoint is deferred as per the PRD focusing on Analytics.
            alert("Application successful! An admin will review and grant your business role shortly.");
            navigate("/creator/dashboard");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (user?.role?.includes("business")) {
        // Already a business
        navigate("/creator/business");
        return null;
    }

    return (
        <div className="max-w-xl mx-auto p-8 pt-12">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Partner with SeekKrr</h1>
            <p className="text-slate-600 mb-8">
                Become a verified business partner to run check-in offers, drive footfall, and increase customer loyalty.
            </p>
            
            <Card className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Business / Brand Name
                        </label>
                        <Input 
                            required
                            placeholder="e.g. Paras Bakery"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                        />
                    </div>
                    
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm">
                        By applying, you agree to the SeekKrr Merchant Terms of Service. 
                        Our team will verify your business details before granting access to the Business Dashboard.
                    </div>
                    
                    <Button type="submit" className="w-full" isLoading={loading}>
                        Submit Application
                    </Button>
                </form>
            </Card>
        </div>
    );
};

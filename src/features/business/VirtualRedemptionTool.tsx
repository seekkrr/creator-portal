import React, { useState } from "react";
import { offerService } from "@/services/offer.service";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Props {
    markerId: string;
    secretCode: string; // the business's own secret code to pass to the backend
}

export const VirtualRedemptionTool: React.FC<Props> = ({ markerId, secretCode }) => {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code || !secretCode) return;
        
        setLoading(true);
        setMessage(null);
        
        try {
            await offerService.redeemVirtualCode(code.trim().toUpperCase(), secretCode);
            setMessage({ text: "Coupon redeemed successfully!", type: "success" });
            setCode("");
        } catch (err: any) {
            setMessage({ 
                text: err.response?.data?.detail || err.message || "Failed to redeem code", 
                type: "error" 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="p-6 mb-8 bg-slate-50 border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Virtual Redemption</h3>
                    <p className="text-sm text-slate-500">
                        Manually consume a coupon code sent to you by a customer via WhatsApp.
                    </p>
                </div>
                
                <form onSubmit={handleRedeem} className="flex items-center gap-2">
                    <Input
                        placeholder="Enter 8-char code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-48 font-mono uppercase"
                        maxLength={8}
                    />
                    <Button type="submit" isLoading={loading} disabled={!code}>
                        Redeem
                    </Button>
                </form>
            </div>
            
            {message && (
                <div className={`mt-4 text-sm font-medium ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                    {message.text}
                </div>
            )}
        </Card>
    );
};

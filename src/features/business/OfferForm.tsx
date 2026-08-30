import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { offerService } from "@/services/offer.service";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

interface OfferFormProps {
    markerId: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface FormValues {
    rule_type: "quantitative" | "qualitative";
    trigger_n: number;
    reward_type: "flat" | "product";
    flat_discount_value: number;
    product_title: string;
    product_description: string;
    product_discount_value: number;
    // We could add image_url via Cloudinary widget, omitted for simple MVP form
}

export const OfferForm: React.FC<OfferFormProps> = ({ markerId, onClose, onSuccess }) => {
    const [submitting, setSubmitting] = useState(false);
    
    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            rule_type: "quantitative",
            trigger_n: 10,
            reward_type: "flat",
            flat_discount_value: 100,
        }
    });

    const ruleType = watch("rule_type");
    const rewardType = watch("reward_type");

    const onSubmit = async (data: FormValues) => {
        setSubmitting(true);
        try {
            const payload = {
                rule_type: data.rule_type,
                trigger_n: Number(data.trigger_n),
                reward_type: data.reward_type,
                is_active: true,
                ...(data.reward_type === "flat" ? {
                    flat_discount_value: Number(data.flat_discount_value)
                } : {
                    product_details: {
                        title: data.product_title,
                        description: data.product_description,
                        discount_value: Number(data.product_discount_value)
                    }
                })
            };
            
            await offerService.createBusinessOffer(markerId, payload);
            onSuccess();
        } catch (error) {
            console.error("Failed to create offer", error);
            alert("Failed to create offer. Please check console.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800">Create New Offer</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <span className="sr-only">Close</span>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
                    {/* Rule Section */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">1. Check-in Rule</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`border rounded-lg p-4 cursor-pointer transition-colors ${ruleType === "quantitative" ? "border-primary-500 bg-primary-50" : "border-slate-200 hover:bg-slate-50"}`}>
                                <input type="radio" value="quantitative" className="hidden" {...register("rule_type")} />
                                <div className="font-medium text-slate-900">Global Check-ins</div>
                                <div className="text-xs text-slate-500 mt-1">Reward triggered based on absolute global check-ins (e.g. Every 100th check-in overall)</div>
                            </label>
                            
                            <label className={`border rounded-lg p-4 cursor-pointer transition-colors ${ruleType === "qualitative" ? "border-primary-500 bg-primary-50" : "border-slate-200 hover:bg-slate-50"}`}>
                                <input type="radio" value="qualitative" className="hidden" {...register("rule_type")} />
                                <div className="font-medium text-slate-900">Unique Visits</div>
                                <div className="text-xs text-slate-500 mt-1">Reward triggered based on a specific user's return visits (e.g. Every 5th visit by User X)</div>
                            </label>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Trigger Number (N)</label>
                            <Input 
                                type="number" 
                                min={1} 
                                {...register("trigger_n", { required: true, min: 1 })} 
                            />
                            {errors.trigger_n && <span className="text-xs text-red-500">Required and must be &gt;= 1</span>}
                            <p className="text-xs text-slate-500 mt-1">The offer will unlock every N check-ins.</p>
                        </div>
                    </section>

                    <hr className="border-slate-100" />

                    {/* Reward Section */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">2. Reward Type</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`border rounded-lg p-4 cursor-pointer transition-colors ${rewardType === "flat" ? "border-primary-500 bg-primary-50" : "border-slate-200 hover:bg-slate-50"}`}>
                                <input type="radio" value="flat" className="hidden" {...register("reward_type")} />
                                <div className="font-medium text-slate-900">Flat Discount</div>
                            </label>
                            
                            <label className={`border rounded-lg p-4 cursor-pointer transition-colors ${rewardType === "product" ? "border-primary-500 bg-primary-50" : "border-slate-200 hover:bg-slate-50"}`}>
                                <input type="radio" value="product" className="hidden" {...register("reward_type")} />
                                <div className="font-medium text-slate-900">Product / Combo</div>
                            </label>
                        </div>

                        {rewardType === "flat" && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Discount Value (₹)</label>
                                <Input 
                                    type="number" 
                                    min={1} 
                                    {...register("flat_discount_value", { required: rewardType === "flat" })} 
                                />
                            </div>
                        )}

                        {rewardType === "product" && (
                            <div className="space-y-4 p-4 bg-slate-50 border border-slate-100 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Product/Combo Title</label>
                                    <Input 
                                        placeholder="e.g. Fish Fingers + Pizza Combo"
                                        {...register("product_title", { required: rewardType === "product" })} 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <Textarea 
                                        placeholder="Details about what's included..."
                                        {...register("product_description")} 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Special Discount Price (₹)</label>
                                    <Input 
                                        type="number" 
                                        min={0}
                                        {...register("product_discount_value")} 
                                    />
                                </div>
                                {/* Note: Cloudinary widget integration omitted for MVP simplicity */}
                            </div>
                        )}
                    </section>

                    <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={submitting}>Create Offer</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

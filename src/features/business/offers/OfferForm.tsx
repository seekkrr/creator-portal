import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { offerService } from "@services/offer.service";
import { Button } from "@components/ui";
import { Input } from "@components/ui/Input";
import { Textarea } from "@components/ui/Textarea";
import { errorMessage } from "../utils";
import { Modal } from "../components/Overlay";

interface OfferFormProps {
    markerId: string;
    placeTitle?: string | null;
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
}

/** Create a check-in discount offer for one place. */
export function OfferForm({ markerId, placeTitle, onClose, onSuccess }: OfferFormProps) {
    const [submitting, setSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: {
            rule_type: "qualitative",
            trigger_n: 5,
            reward_type: "flat",
            flat_discount_value: 100,
        },
    });

    const ruleType = watch("rule_type");
    const rewardType = watch("reward_type");

    const onSubmit = async (data: FormValues) => {
        setSubmitting(true);
        try {
            await offerService.createBusinessOffer(markerId, {
                rule_type: data.rule_type,
                trigger_n: Number(data.trigger_n),
                reward_type: data.reward_type,
                is_active: true,
                ...(data.reward_type === "flat"
                    ? { flat_discount_value: Number(data.flat_discount_value) }
                    : {
                          product_details: {
                              title: data.product_title,
                              description: data.product_description,
                              discount_value: Number(data.product_discount_value) || undefined,
                          },
                      }),
            });
            toast.success("Offer created — travellers unlock it when they check in.");
            onSuccess();
        } catch (error) {
            toast.error(errorMessage(error, "Couldn't create the offer"));
        } finally {
            setSubmitting(false);
        }
    };

    const choice = (active: boolean) =>
        `border rounded-xl p-4 cursor-pointer transition-colors ${
            active ? "border-primary-500 bg-primary-50" : "border-neutral-200 hover:bg-neutral-50"
        }`;

    return (
        <Modal
            open
            onClose={onClose}
            size="lg"
            title="Create a check-in offer"
            description={placeTitle ? `For ${placeTitle}` : undefined}
            footer={
                <>
                    <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" form="offer-form" variant="accent" isLoading={submitting} disabled={submitting}>
                        Create offer
                    </Button>
                </>
            }
        >
            <form id="offer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-2">
                <section className="space-y-3">
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">1. When it unlocks</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className={choice(ruleType === "qualitative")}>
                            <input type="radio" value="qualitative" className="sr-only" {...register("rule_type")} />
                            <div className="font-medium text-neutral-900">Repeat visits</div>
                            <div className="text-xs text-neutral-500 mt-1">
                                Rewards a person's return visits, e.g. their 5th check-in.
                            </div>
                        </label>
                        <label className={choice(ruleType === "quantitative")}>
                            <input type="radio" value="quantitative" className="sr-only" {...register("rule_type")} />
                            <div className="font-medium text-neutral-900">Milestone check-ins</div>
                            <div className="text-xs text-neutral-500 mt-1">
                                Rewards every Nth check-in across all visitors, e.g. every 100th.
                            </div>
                        </label>
                    </div>
                    <Input
                        id="offer-trigger"
                        label="Every Nth check-in (N)"
                        type="number"
                        min={1}
                        error={errors.trigger_n ? "Required, at least 1" : undefined}
                        {...register("trigger_n", { required: true, min: 1 })}
                    />
                </section>

                <section className="space-y-3">
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">2. Reward</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className={choice(rewardType === "flat")}>
                            <input type="radio" value="flat" className="sr-only" {...register("reward_type")} />
                            <div className="font-medium text-neutral-900">Flat discount</div>
                        </label>
                        <label className={choice(rewardType === "product")}>
                            <input type="radio" value="product" className="sr-only" {...register("reward_type")} />
                            <div className="font-medium text-neutral-900">Product / combo</div>
                        </label>
                    </div>

                    {rewardType === "flat" ? (
                        <Input
                            id="offer-flat"
                            label="Discount (₹)"
                            type="number"
                            min={1}
                            error={errors.flat_discount_value ? "Enter an amount" : undefined}
                            {...register("flat_discount_value", { required: rewardType === "flat", min: 1 })}
                        />
                    ) : (
                        <div className="space-y-3 p-4 bg-neutral-50 border border-neutral-100 rounded-xl">
                            <Input
                                id="offer-product-title"
                                label="Product / combo"
                                placeholder="e.g. Thukpa + ginger lemon tea"
                                error={errors.product_title ? "Required" : undefined}
                                {...register("product_title", { required: rewardType === "product" })}
                            />
                            <Textarea
                                id="offer-product-desc"
                                label="Description"
                                placeholder="What's included…"
                                className="min-h-[80px]"
                                {...register("product_description")}
                            />
                            <Input
                                id="offer-product-price"
                                label="Special price (₹, optional)"
                                type="number"
                                min={0}
                                {...register("product_discount_value")}
                            />
                        </div>
                    )}
                </section>
            </form>
        </Modal>
    );
}

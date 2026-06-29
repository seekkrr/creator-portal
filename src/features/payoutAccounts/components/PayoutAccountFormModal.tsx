import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Card, Button, Input } from "@components/ui";
import { payoutAccountService } from "@services/payoutAccount.service";
import type { PayoutAccount } from "@/types";
import {
    makePayoutAccountFormSchema,
    toCreatePayload,
    toUpdatePayload,
    PAYOUT_CURRENCIES,
    type PayoutAccountFormData,
} from "../schemas/payoutAccount.schema";

interface Props {
    open: boolean;
    mode: "create" | "edit";
    initial?: PayoutAccount;
    onClose: () => void;
    onSaved: (account: PayoutAccount) => void;
}

const DEFAULTS: PayoutAccountFormData = {
    method: "bank_transfer",
    currency: "INR",
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    bank_name: "",
    upi_id: "",
};

export function PayoutAccountFormModal({ open, mode, initial, onClose, onSaved }: Props) {
    const isEdit = mode === "edit";

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<PayoutAccountFormData>({
        resolver: zodResolver(makePayoutAccountFormSchema(isEdit)),
        mode: "onChange",
        defaultValues: DEFAULTS,
    });

    useEffect(() => {
        if (!open) return;
        if (isEdit && initial) {
            const currency = (PAYOUT_CURRENCIES as readonly string[]).includes(initial.currency)
                ? (initial.currency as PayoutAccountFormData["currency"])
                : "INR";
            reset({
                method: initial.method,
                currency,
                account_holder_name: initial.account_holder_name ?? "",
                account_number: "",
                ifsc_code: initial.bank_details?.ifsc_code ?? "",
                bank_name: initial.bank_details?.bank_name ?? "",
                upi_id: initial.upi_id ?? "",
            });
        } else {
            reset(DEFAULTS);
        }
    }, [open, isEdit, initial, reset]);

    const method = watch("method");

    const createMutation = useMutation({
        mutationFn: (d: PayoutAccountFormData) =>
            payoutAccountService.createAccount(toCreatePayload(d)),
    });
    const updateMutation = useMutation({
        mutationFn: (d: PayoutAccountFormData) => {
            if (!initial) throw new Error("initial is required for edit mode");
            return payoutAccountService.updateAccount(initial.id, toUpdatePayload(d));
        },
    });

    const onSubmit = async (d: PayoutAccountFormData) => {
        const promise = isEdit
            ? updateMutation.mutateAsync(d)
            : createMutation.mutateAsync(d);
        toast.promise(promise, {
            loading: isEdit ? "Saving account…" : "Adding account…",
            success: isEdit ? "Payout account updated" : "Payout account added",
            error: (e) => (e instanceof Error ? e.message : "Something went wrong"),
        });
        try {
            const account = await promise;
            onSaved(account);
            onClose();
        } catch {
            // error surfaced by toast.promise
        }
    };

    if (!open) return null;

    const accountNumberPlaceholder =
        isEdit && initial?.bank_details?.account_number_masked
            ? `${initial.bank_details.account_number_masked} (leave blank to keep)`
            : "Account number";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">
                        {isEdit ? "Edit payout account" : "Add payout account"}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Method
                        </label>
                        <select
                            {...register("method")}
                            disabled={isEdit}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 disabled:bg-slate-50 disabled:text-slate-500"
                        >
                            <option value="bank_transfer">Bank transfer</option>
                            <option value="upi">UPI</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Currency
                        </label>
                        <select
                            {...register("currency")}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                        >
                            {PAYOUT_CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>

                    {method === "bank_transfer" ? (
                        <div className="space-y-4">
                            <Input
                                label="Account holder name"
                                error={errors.account_holder_name?.message}
                                {...register("account_holder_name")}
                            />
                            <Input
                                label="Account number"
                                placeholder={accountNumberPlaceholder}
                                error={errors.account_number?.message}
                                {...register("account_number")}
                            />
                            <Input
                                label="IFSC code"
                                placeholder="SBIN0001234"
                                error={errors.ifsc_code?.message}
                                {...register("ifsc_code")}
                            />
                            <Input
                                label="Bank name"
                                error={errors.bank_name?.message}
                                {...register("bank_name")}
                            />
                        </div>
                    ) : (
                        <Input
                            label="UPI ID"
                            placeholder="name@bank"
                            error={errors.upi_id?.message}
                            {...register("upi_id")}
                        />
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="ghost" fullWidth onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            fullWidth
                            isLoading={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isEdit ? "Save changes" : "Add account"}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

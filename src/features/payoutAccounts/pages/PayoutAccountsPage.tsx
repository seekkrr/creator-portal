import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    MoreVertical,
    AlertTriangle,
    Plus,
    Landmark,
    Smartphone,
    Star,
} from "lucide-react";
import { toast } from "sonner";
import { Card, Button } from "@components/ui";
import { payoutAccountService } from "@services/payoutAccount.service";
import { useAuthStore } from "@store/auth.store";
import type { PayoutAccount } from "@/types";
import { PayoutAccountFormModal } from "../components/PayoutAccountFormModal";
import { getPayoutStatusColor, PAYOUT_STATUS_LABEL } from "../utils/status";

function accountTitle(a: PayoutAccount): string {
    if (a.method === "upi") return a.upi_id || "UPI account";
    const masked = a.bank_details?.account_number_masked;
    const bank = a.bank_details?.bank_name;
    if (bank && masked) return `${bank} ${masked}`;
    return bank || masked || "Bank account";
}

export function PayoutAccountsPage() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState<PayoutAccount | undefined>(undefined);

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [toDelete, setToDelete] = useState<string | null>(null);

    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    React.useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ["payout-accounts"],
        queryFn: payoutAccountService.listMine,
        enabled: !!user,
    });

    const openCreate = () => {
        setEditing(undefined);
        setIsFormOpen(true);
    };
    const openEdit = (a: PayoutAccount) => {
        setEditing(a);
        setIsFormOpen(true);
    };

    const handleSaved = () => {
        queryClient.invalidateQueries({ queryKey: ["payout-accounts"] });
        setIsFormOpen(false);
    };

    const handleSetPrimary = (id: string) => {
        const promise = payoutAccountService
            .setPrimary(id)
            .then(() => queryClient.invalidateQueries({ queryKey: ["payout-accounts"] }));
        toast.promise(promise, {
            loading: "Updating…",
            success: "Primary account updated",
            error: (e) => (e instanceof Error ? e.message : "Failed to set primary"),
        });
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        const promise = payoutAccountService.deleteAccount(toDelete);
        toast.promise(promise, {
            loading: "Removing account…",
            success: "Payout account removed",
            error: (e) => (e instanceof Error ? e.message : "Failed to remove account"),
        });
        try {
            await promise;
            await queryClient.invalidateQueries({ queryKey: ["payout-accounts"] });
        } catch {
            // error surfaced by toast
        } finally {
            setIsDeleteOpen(false);
            setToDelete(null);
        }
    };

    return (
        <div className="animate-fade-in space-y-4 w-full max-w-4xl mx-auto pb-6 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Payouts</h1>
                    <p className="text-slate-500 mt-1">
                        Manage the bank or UPI accounts where you receive payouts
                    </p>
                </div>
                <Button
                    onClick={openCreate}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                    leftIcon={<Plus className="w-4 h-4" />}
                >
                    Add payout account
                </Button>
            </div>

            {/* Delete confirmation modal */}
            {isDeleteOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <Card className="w-full max-w-md shadow-2xl border-red-100 overflow-hidden animate-scale-up">
                        <div className="p-6">
                            <div className="flex items-center gap-3 text-red-600 mb-4">
                                <div className="p-2 bg-red-50 rounded-full">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold">Remove payout account?</h3>
                            </div>
                            <p className="text-slate-600 mb-6">
                                This payout account will be removed. You can add it again later.
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    fullWidth
                                    onClick={() => {
                                        setIsDeleteOpen(false);
                                        setToDelete(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button variant="danger" fullWidth onClick={confirmDelete}>
                                    Remove
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Form modal */}
            <PayoutAccountFormModal
                open={isFormOpen}
                mode={editing ? "edit" : "create"}
                initial={editing}
                onClose={() => setIsFormOpen(false)}
                onSaved={handleSaved}
            />

            {/* List */}
            {isLoading ? (
                <div className="py-12 text-center text-slate-500">Loading payout accounts…</div>
            ) : accounts.length === 0 ? (
                <Card className="py-12 text-center">
                    <div className="text-slate-400 mb-4">No payout accounts yet</div>
                    <Button
                        variant="outline"
                        className="border-dashed border-2"
                        onClick={openCreate}
                        leftIcon={<Plus className="w-4 h-4" />}
                    >
                        Add your first payout account
                    </Button>
                </Card>
            ) : (
                <div className="space-y-3">
                    {accounts.map((a) => (
                        <Card key={a.id} className="p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600 flex-shrink-0">
                                        {a.method === "upi" ? (
                                            <Smartphone className="w-5 h-5" />
                                        ) : (
                                            <Landmark className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-slate-900 truncate">
                                                {accountTitle(a)}
                                            </span>
                                            {a.is_primary && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700">
                                                    <Star className="w-3 h-3" /> Primary
                                                </span>
                                            )}
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${getPayoutStatusColor(a.status)}`}
                                            >
                                                {PAYOUT_STATUS_LABEL[a.status]}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1">
                                            {a.method === "upi"
                                                ? `UPI · ${a.currency}`
                                                : `${a.bank_details?.ifsc_code ?? "—"} · ${a.currency}`}
                                        </div>
                                        {a.status === "rejected" && (
                                            <div className="text-sm text-red-600 mt-1">
                                                {a.rejection_reason ?? "No reason provided."}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions dropdown */}
                                <div className="relative flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownId(
                                                openDropdownId === a.id ? null : a.id
                                            );
                                        }}
                                        className="p-2 h-9 w-9 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                    {openDropdownId === a.id && (
                                        <div
                                            className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl z-[100] py-1.5 animate-fade-in"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {a.status === "pending_verification" && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        openEdit(a);
                                                        setOpenDropdownId(null);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            {!a.is_primary && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleSetPrimary(a.id);
                                                        setOpenDropdownId(null);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-slate-50 font-medium"
                                                >
                                                    Set as primary
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setToDelete(a.id);
                                                    setIsDeleteOpen(true);
                                                    setOpenDropdownId(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

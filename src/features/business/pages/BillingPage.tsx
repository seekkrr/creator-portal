import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, CreditCard, ExternalLink, FileText, Gift, Info, Minus, Receipt, Sparkles } from "lucide-react";
import { Button, ErrorState, Skeleton } from "@components/ui";
import { useAuthStore } from "@store/auth.store";
import { businessService } from "@services/business.service";
import { isCheckoutChanged, type BillingPeriod, type Invoice, type Plan } from "@services/business.types";
import { openRazorpayCheckout } from "@utils/razorpay";
import { useBusiness } from "../context";
import { bkeys, useBusinessDetail, useUpgradePrompt } from "../queries";
import {
    GSTIN_PATTERN,
    INDIAN_STATES,
    PLAN_ORDER,
    planStatusMeta,
    copyToClipboard,
    daysUntil,
    errorMessage,
    formatDate,
    formatINR,
    limitLabel,
    planName,
    plural,
} from "../utils";
import {
    Banner,
    FieldLabel,
    PageHeader,
    Pill,
    SectionCard,
    SegmentedControl,
    UsageMeter,
    inputClass,
    selectClass,
} from "../components/bits";
import { ConfirmDialog } from "../components/Overlay";
import { UpgradeDialog } from "../components/UpgradeDialog";

const PAID_STATUSES = ["active", "pending", "halted", "trialing"];

function PlanFeatures({ plan }: { plan: Plan }) {
    if (plan.custom) {
        return (
            <ul className="space-y-2 text-sm text-neutral-700">
                {["Everything in Pro", "Limits set per location", "Attribution export & API", "A dedicated SeekKrr contact"].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                        {f}
                    </li>
                ))}
            </ul>
        );
    }
    const e = plan.entitlements ?? {};
    const rows: { label: string; value: string | boolean }[] = [
        { label: "Active collabs", value: limitLabel(e.active_collabs) },
        { label: "Redemptions / month", value: limitLabel(e.redemptions_per_month) },
        { label: "Approval mode + advance requests", value: !!e.approval_mode },
        { label: "Team members", value: limitLabel(e.team_members) },
        {
            label: "Profile reveals / invites",
            value:
                e.match_reveals_per_month === 0 && e.invites_per_month === 0
                    ? false
                    : `${limitLabel(e.match_reveals_per_month)} / ${limitLabel(e.invites_per_month)}`,
        },
        { label: "Match score breakdown", value: !!e.match_breakdown },
        { label: "Content library", value: e.content_library ? true : "Counts only" },
        { label: "Attribution per creator", value: e.attribution ? true : "Totals only" },
        { label: "Featured map pin", value: !!e.featured },
        { label: "Locations", value: limitLabel(e.locations) },
    ];
    return (
        <ul className="space-y-2 text-sm">
            {rows.map((r) => (
                <li key={r.label} className="flex items-start gap-2">
                    {r.value === false ? (
                        <Minus className="w-4 h-4 text-neutral-300 mt-0.5 shrink-0" />
                    ) : (
                        <Check className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                    )}
                    <span className={r.value === false ? "text-neutral-400" : "text-neutral-700"}>
                        {r.label}
                        {typeof r.value === "string" && <span className="font-semibold text-neutral-900"> · {r.value}</span>}
                    </span>
                </li>
            ))}
        </ul>
    );
}

function PlanPrice({ plan, period }: { plan: Plan; period: BillingPeriod }) {
    if (plan.custom) return <p className="text-2xl font-bold text-neutral-900">Custom</p>;
    const base = period === "monthly" ? plan.price_monthly_inr : plan.price_annual_inr;
    const incl = period === "monthly" ? plan.price_monthly_inr_incl_gst : plan.price_annual_inr_incl_gst;
    if (!base) return <p className="text-2xl font-bold text-neutral-900">₹0</p>;
    return (
        <div>
            <p className="text-2xl font-bold text-neutral-900">
                {formatINR(base)}
                <span className="text-sm font-medium text-neutral-500"> + GST / {period === "monthly" ? "month" : "year"}</span>
            </p>
            <p className="text-xs text-neutral-500">
                {formatINR(incl)} incl. {Math.round((plan.gst_rate ?? 0.18) * 100)}% GST
                {period === "annual" && plan.price_monthly_inr ? " · 2 months free" : ""}
            </p>
        </div>
    );
}

function GstForm() {
    const { businessId } = useBusiness();
    const detail = useBusinessDetail();
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ legal_name: "", gstin: "", state_code: "", address: "" });
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const billing = detail.data?.billing;

    useEffect(() => {
        if (billing) {
            setForm({
                legal_name: billing.legal_name ?? "",
                gstin: billing.gstin ?? "",
                state_code: billing.state_code ?? "",
                address: billing.address ?? "",
            });
        }
    }, [billing]);

    const save = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        const gstin = form.gstin.trim().toUpperCase();
        if (gstin && !GSTIN_PATTERN.test(gstin)) {
            setError("That GSTIN doesn't look right — it's 15 characters, e.g. 02ABCDE1234F1Z5.");
            return;
        }
        if (gstin && form.state_code && gstin.slice(0, 2) !== form.state_code) {
            setError("The GSTIN's first two digits should match the state you picked.");
            return;
        }
        setSaving(true);
        try {
            await businessService.update(businessId, {
                billing: {
                    legal_name: form.legal_name.trim() || null,
                    gstin: gstin || null,
                    state_code: form.state_code || (gstin ? gstin.slice(0, 2) : null),
                    address: form.address.trim() || null,
                },
            });
            toast.success("Billing details saved. They'll appear on your next invoice.");
            await queryClient.invalidateQueries({ queryKey: bkeys.detail(businessId) });
        } catch (err) {
            setError(errorMessage(err, "Couldn't save billing details"));
        } finally {
            setSaving(false);
        }
    };

    if (detail.isLoading) return <Skeleton height={220} />;

    return (
        <form onSubmit={(e) => void save(e)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <FieldLabel htmlFor="gst-legal">Legal name</FieldLabel>
                    <input
                        id="gst-legal"
                        className={inputClass}
                        maxLength={200}
                        value={form.legal_name}
                        onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                        placeholder="As on your GST certificate"
                    />
                </div>
                <div>
                    <FieldLabel htmlFor="gst-gstin" hint="Optional — add it to claim input tax credit.">
                        GSTIN
                    </FieldLabel>
                    <input
                        id="gst-gstin"
                        className={`${inputClass} uppercase`}
                        maxLength={15}
                        value={form.gstin}
                        onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase().replace(/\s/g, "") })}
                        placeholder="02ABCDE1234F1Z5"
                    />
                </div>
                <div>
                    <FieldLabel htmlFor="gst-state" hint="Decides CGST+SGST or IGST.">
                        State
                    </FieldLabel>
                    <select
                        id="gst-state"
                        className={selectClass}
                        value={form.state_code}
                        onChange={(e) => setForm({ ...form, state_code: e.target.value })}
                    >
                        <option value="">Select state…</option>
                        {INDIAN_STATES.map((s) => (
                            <option key={s.code} value={s.code}>
                                {s.code} · {s.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <FieldLabel htmlFor="gst-address">Billing address</FieldLabel>
                    <textarea
                        id="gst-address"
                        className={`${inputClass} min-h-[44px]`}
                        rows={2}
                        maxLength={500}
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                </div>
            </div>
            {error && (
                <p className="text-sm text-red-600" role="alert">
                    {error}
                </p>
            )}
            <Button type="submit" isLoading={saving} disabled={saving}>
                Save billing details
            </Button>
        </form>
    );
}

function Invoices() {
    const { businessId } = useBusiness();
    const invoices = useQuery({
        queryKey: bkeys.invoices(businessId),
        queryFn: () => businessService.invoices(businessId),
        staleTime: 60_000,
    });
    const [opening, setOpening] = useState<string | null>(null);

    const view = async (inv: Invoice) => {
        // Open synchronously (inside the click) so popup blockers allow it.
        const win = window.open("", "_blank");
        if (win) win.document.write("<p style='font-family:sans-serif;padding:24px'>Loading invoice…</p>");
        setOpening(inv.id);
        try {
            const html = await businessService.invoiceHtml(businessId, inv.id);
            const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
            if (win) win.location.href = url;
            else window.open(url, "_blank");
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (e) {
            win?.close();
            toast.error(errorMessage(e, "Couldn't open the invoice"));
        } finally {
            setOpening(null);
        }
    };

    if (invoices.isLoading) return <Skeleton height={120} />;
    if (invoices.isError) return <ErrorState message="We couldn't load invoices." onRetry={() => void invoices.refetch()} />;
    const rows = invoices.data ?? [];
    if (!rows.length) {
        return (
            <p className="text-sm text-neutral-500 flex items-center gap-2">
                <Receipt className="w-4 h-4" /> No invoices yet. A GST invoice is issued for every payment.
            </p>
        );
    }
    return (
        <div className="overflow-x-auto -mx-5">
            <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                    <tr className="border-b border-neutral-200">
                        {["Invoice", "Plan", "Period", "Tax", "Total", ""].map((h) => (
                            <th key={h || "actions"} className="py-2.5 px-5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                    {rows.map((inv) => {
                        const a = inv.amounts_inr ?? {};
                        const tax = a.igst
                            ? `IGST ${formatINR(a.igst, true)}`
                            : `CGST ${formatINR(a.cgst ?? 0, true)} + SGST ${formatINR(a.sgst ?? 0, true)}`;
                        return (
                            <tr key={inv.id}>
                                <td className="py-3 px-5">
                                    <p className="font-medium text-neutral-900">{inv.invoice_no ?? "—"}</p>
                                    <p className="text-xs text-neutral-500">{formatDate(inv.issued_at)}</p>
                                </td>
                                <td className="py-3 px-5 text-sm text-neutral-700">{inv.plan_name ?? "—"}</td>
                                <td className="py-3 px-5 text-sm text-neutral-700">
                                    {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                                </td>
                                <td className="py-3 px-5 text-xs text-neutral-600">
                                    {formatINR(a.taxable ?? 0, true)} + {tax}
                                </td>
                                <td className="py-3 px-5 font-semibold text-neutral-900">{formatINR(a.total ?? 0, true)}</td>
                                <td className="py-3 px-5 text-right">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        leftIcon={<FileText className="w-4 h-4" />}
                                        isLoading={opening === inv.id}
                                        disabled={opening === inv.id}
                                        onClick={() => void view(inv)}
                                    >
                                        View / print
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export function BillingPage() {
    const { businessId, isOwner, business } = useBusiness();
    const user = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();
    const { notifyError, upgrade } = useUpgradePrompt();
    const billing = useQuery({
        queryKey: bkeys.billing(businessId),
        queryFn: () => businessService.billing(businessId),
        staleTime: 30_000,
    });
    const [period, setPeriod] = useState<BillingPeriod>("monthly");
    const [coupon, setCoupon] = useState("");
    const [referral, setReferral] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [paymentLink, setPaymentLink] = useState<string | null>(null);

    const subscriptionPeriod = billing.data?.subscription?.period;
    useEffect(() => {
        if (subscriptionPeriod) setPeriod(subscriptionPeriod);
    }, [subscriptionPeriod]);

    const refresh = async () => {
        await queryClient.invalidateQueries({ queryKey: bkeys.all(businessId) });
    };

    if (billing.isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton height={40} className="w-64" />
                <Skeleton height={160} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} height={420} />
                    ))}
                </div>
            </div>
        );
    }
    if (billing.isError || !billing.data) {
        return <ErrorState message="We couldn't load billing." onRetry={() => void billing.refetch()} />;
    }

    const { subscription, usage, plans, referral_code, can_manage_billing } = billing.data;
    const canManage = can_manage_billing && isOwner;
    const currentCode = usage?.plan_code ?? "free";
    const effectiveStatus = usage?.status ?? "free";
    const statusMeta = planStatusMeta(effectiveStatus);
    const sortedPlans = [...plans].sort((a, b) => {
        const ia = PLAN_ORDER.indexOf(String(a.code));
        const ib = PLAN_ORDER.indexOf(String(b.code));
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    const growth = plans.find((p) => p.code === "growth");
    const trialDays = growth?.trial_days ?? 14;
    const canTrial = canManage && !subscription?.trial_used && effectiveStatus === "free" && trialDays > 0;
    const hasPaidSub =
        !!subscription && PAID_STATUSES.includes(String(subscription.status)) && !subscription.cancel_at_period_end;
    const currentPrice = plans.find((p) => p.code === currentCode)?.price_monthly_inr ?? 0;
    const trialLeft = daysUntil(usage?.trial_ends_at);
    const referralLink = referral_code
        ? `https://seekkrr.com/business/apply?ref=${encodeURIComponent(referral_code)}`
        : null;

    const startTrial = async () => {
        setBusy("trial");
        try {
            await businessService.startTrial(businessId, "growth");
            toast.success(`Your ${trialDays}-day Growth trial has started. Enjoy!`);
            await refresh();
        } catch (e) {
            notifyError(e, "Couldn't start the trial");
        } finally {
            setBusy(null);
        }
    };

    const checkout = async (plan: Plan) => {
        if (plan.code !== "growth" && plan.code !== "pro") return;
        setBusy(String(plan.code));
        setPaymentLink(null);
        try {
            const result = await businessService.checkout(businessId, {
                plan_code: plan.code,
                period,
                coupon_code: coupon,
                referral_code: referral,
            });
            if (isCheckoutChanged(result)) {
                toast.success(
                    result.effective === "now"
                        ? `You're now on ${plan.name ?? plan.code}.`
                        : `You'll move to ${plan.name ?? plan.code} at the end of this billing cycle.`
                );
                await refresh();
                return;
            }
            setPaymentLink(result.short_url);
            await openRazorpayCheckout(
                {
                    key: result.razorpay_key_id,
                    subscription_id: result.subscription_id,
                    name: "SeekKrr",
                    description: `${result.plan?.name ?? plan.name ?? plan.code} · ${period === "monthly" ? "Monthly" : "Annual"}`,
                    prefill: {
                        name: user ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || undefined : undefined,
                        email: user?.email ?? business.contact_email ?? undefined,
                        contact: business.contact_phone ?? undefined,
                    },
                    notes: { business_id: businessId },
                    theme: { color: "#003634" },
                    handler: () => {
                        toast.success("Payment received — your plan will update in a moment.");
                        setPaymentLink(null);
                        void refresh();
                        // Razorpay's webhook activates the subscription; refetch again shortly.
                        window.setTimeout(() => void refresh(), 5000);
                    },
                    modal: {
                        ondismiss: () => toast.info("Checkout closed. You can pick up where you left off any time."),
                    },
                },
                (msg) => toast.error(msg)
            );
        } catch (e) {
            notifyError(e, "Couldn't start checkout");
        } finally {
            setBusy(null);
        }
    };

    const cta = (plan: Plan) => {
        const isCurrent = plan.code === currentCode;
        if (plan.custom) {
            return (
                <a href="mailto:partners@seekkrr.com?subject=SeekKrr%20Multi-location%20plan" className="block">
                    <Button variant="outline" fullWidth>
                        Contact us
                    </Button>
                </a>
            );
        }
        if (isCurrent) {
            return (
                <Button variant="secondary" fullWidth disabled>
                    {effectiveStatus === "trialing" ? "On free trial" : "Current plan"}
                </Button>
            );
        }
        if (!canManage) return null;
        if (plan.code === "free") {
            return hasPaidSub ? (
                <Button variant="ghost" fullWidth onClick={() => setConfirmCancel(true)}>
                    Downgrade to Free
                </Button>
            ) : null;
        }
        const label = (plan.price_monthly_inr ?? 0) >= currentPrice ? "Upgrade" : "Switch";
        return (
            <Button variant="accent" fullWidth isLoading={busy === plan.code} disabled={!!busy} onClick={() => void checkout(plan)}>
                {label} to {plan.name ?? plan.code}
            </Button>
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Plan & billing" description="Prices in INR, billed by Razorpay. A GST invoice for every payment." />

            {!canManage && (
                <Banner tone="info" icon={<Info className="w-5 h-5" />} title="Only the owner manages the plan">
                    You can see the plan and usage here. Ask the business owner to upgrade, change billing details or
                    download invoices.
                </Banner>
            )}

            {canTrial && (
                <div className="rounded-3xl border-2 border-primary-900 bg-white shadow-[6px_6px_0_0_#fecd36] p-6 flex flex-col md:flex-row md:items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-highlight text-primary-900 flex items-center justify-center shrink-0">
                        <Gift className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xl font-display font-bold text-primary-900">Try Growth free for {trialDays} days</p>
                        <p className="text-sm text-neutral-600 mt-1">
                            No card needed. Approval-mode collabs, advance requests, creator discovery, the content library
                            and attribution. You go back to Free automatically unless you subscribe.
                        </p>
                    </div>
                    <Button
                        variant="accent"
                        size="lg"
                        className="rounded-full shrink-0"
                        isLoading={busy === "trial"}
                        disabled={!!busy}
                        onClick={() => void startTrial()}
                    >
                        Start free trial
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <SectionCard
                    className="xl:col-span-2"
                    title="Current plan"
                    actions={<Pill className={statusMeta.className}>{statusMeta.label}</Pill>}
                >
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
                        <div>
                            <p className="text-3xl font-display font-bold text-primary-900">{planName(plans, currentCode)}</p>
                            <div className="text-sm text-neutral-600 mt-2 space-y-1">
                                {effectiveStatus === "trialing" && usage?.trial_ends_at && (
                                    <p>
                                        Trial ends {formatDate(usage.trial_ends_at)}
                                        {trialLeft !== null && trialLeft >= 0 ? ` (${plural(trialLeft, "day")} left)` : ""}
                                    </p>
                                )}
                                {subscription?.period && effectiveStatus !== "trialing" && effectiveStatus !== "free" && (
                                    <p>Billed {subscription.period === "annual" ? "yearly" : "monthly"}</p>
                                )}
                                {subscription?.current_period_end && (
                                    <p>
                                        {subscription.cancel_at_period_end ? "Ends" : "Renews"} on{" "}
                                        {formatDate(subscription.current_period_end)}
                                    </p>
                                )}
                                {subscription?.cancel_at_period_end && (
                                    <p className="text-amber-700">Cancelled — you'll move to Free when this period ends.</p>
                                )}
                                {subscription?.coupon_code && <p>Coupon applied: {subscription.coupon_code}</p>}
                                {usage?.override_until && <p>Special terms until {formatDate(usage.override_until)}</p>}
                            </div>
                        </div>
                        {canManage && hasPaidSub && (
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setConfirmCancel(true)}>
                                {effectiveStatus === "trialing" ? "End trial" : "Cancel at period end"}
                            </Button>
                        )}
                    </div>
                    {paymentLink && (
                        <p className="text-sm text-neutral-600 mt-4">
                            Checkout didn't open?{" "}
                            <a
                                href={paymentLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-700 font-medium hover:underline inline-flex items-center gap-1"
                            >
                                Open the Razorpay payment page <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </p>
                    )}
                </SectionCard>
                <SectionCard title={`Usage${usage?.period ? ` · ${usage.period}` : ""}`}>
                    {usage ? (
                        <div className="space-y-4">
                            <UsageMeter label="Redemptions" counter={usage.usage.redemptions} />
                            <UsageMeter label="Active collabs" counter={usage.usage.active_collabs} />
                            <UsageMeter label="Profile reveals" counter={usage.usage.match_reveals} />
                            <UsageMeter label="Invites" counter={usage.usage.invites} />
                        </div>
                    ) : (
                        <p className="text-sm text-neutral-500">No usage yet.</p>
                    )}
                </SectionCard>
            </div>

            <section className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                    <div>
                        <h2 className="text-xl font-display font-semibold text-neutral-900">Plans</h2>
                        <p className="text-sm text-neutral-500">Annual billing gives you 2 months free.</p>
                    </div>
                    <SegmentedControl<BillingPeriod>
                        ariaLabel="Billing period"
                        value={period}
                        onChange={setPeriod}
                        options={[
                            { value: "monthly", label: "Monthly" },
                            { value: "annual", label: "Annual · 2 months free" },
                        ]}
                    />
                </div>

                {canManage && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                        <div>
                            <FieldLabel htmlFor="coupon">Coupon code</FieldLabel>
                            <input
                                id="coupon"
                                className={`${inputClass} uppercase`}
                                maxLength={30}
                                value={coupon}
                                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <FieldLabel htmlFor="referral">Referred by another business?</FieldLabel>
                            <input
                                id="referral"
                                className={inputClass}
                                maxLength={80}
                                value={referral}
                                onChange={(e) => setReferral(e.target.value)}
                                placeholder="Their referral code"
                            />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {sortedPlans.map((plan) => {
                        const isCurrent = plan.code === currentCode;
                        const featured = plan.code === "growth";
                        return (
                            <div
                                key={plan.code}
                                className={`relative rounded-2xl bg-white p-5 flex flex-col gap-4 ${
                                    isCurrent
                                        ? "border-2 border-primary-600 shadow-md"
                                        : featured
                                          ? "border-2 border-primary-900 shadow-[4px_4px_0_0_#fecd36]"
                                          : "border border-neutral-200 shadow-sm"
                                }`}
                            >
                                {featured && plan.trial_days > 0 && !isCurrent && (
                                    <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-highlight text-primary-900 text-xs font-bold rotate-2">
                                        {plan.trial_days}-day free trial
                                    </span>
                                )}
                                <div>
                                    <p className="font-display font-bold text-lg text-primary-900 flex items-center gap-1.5">
                                        {plan.name ?? plan.code}
                                        {featured && <Sparkles className="w-4 h-4 text-accent-500" />}
                                    </p>
                                    <div className="mt-2">
                                        <PlanPrice plan={plan} period={period} />
                                    </div>
                                </div>
                                <PlanFeatures plan={plan} />
                                <div className="mt-auto">{cta(plan)}</div>
                            </div>
                        );
                    })}
                </div>
                <p className="text-xs text-neutral-500">
                    Prices exclude 18% GST. Upgrades take effect immediately; downgrades at the end of your billing cycle.
                </p>
            </section>

            {referral_code && (
                <SectionCard
                    title="Refer a business, get a month free"
                    description="When a business you refer enters your code at checkout and pays its first invoice, you get 1 free month."
                >
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 min-w-0">
                            <p className="text-xs text-neutral-500">Your referral code</p>
                            <p className="font-mono font-semibold text-primary-900 break-all">{referral_code}</p>
                        </div>
                        {referralLink && (
                            <div className="flex-[2] rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 min-w-0">
                                <p className="text-xs text-neutral-500">Share link</p>
                                <p className="text-sm text-neutral-800 truncate">{referralLink}</p>
                            </div>
                        )}
                        <Button
                            variant="outline"
                            leftIcon={<Copy className="w-4 h-4" />}
                            onClick={() =>
                                void copyToClipboard(referralLink ?? referral_code).then((ok) =>
                                    ok ? toast.success("Copied!") : toast.error("Couldn't copy — select and copy it manually.")
                                )
                            }
                        >
                            Copy
                        </Button>
                    </div>
                    {(subscription?.referral_credits ?? []).length > 0 && (
                        <ul className="mt-4 space-y-1 text-sm text-neutral-700">
                            {(subscription?.referral_credits ?? []).map((c, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <Gift className="w-4 h-4 text-primary-600" />
                                    {plural(c.days ?? 30, "free day")} earned {formatDate(c.granted_at)}
                                    {c.applied ? " · applied" : " · pending"}
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>
            )}

            {canManage && (
                <>
                    <SectionCard
                        title="GST billing details"
                        description="Shown on your invoices. Add your GSTIN to claim input tax credit."
                    >
                        <GstForm />
                    </SectionCard>
                    <SectionCard title="Invoices" actions={<CreditCard className="w-5 h-5 text-neutral-400" />}>
                        <Invoices />
                    </SectionCard>
                </>
            )}

            <ConfirmDialog
                open={confirmCancel}
                onClose={() => setConfirmCancel(false)}
                title={effectiveStatus === "trialing" ? "End your free trial?" : "Cancel at the end of this period?"}
                body={
                    effectiveStatus === "trialing"
                        ? "You'll move to the Free plan now. Collabs over the Free limit are paused."
                        : `You keep ${planName(plans, currentCode)} until ${formatDate(subscription?.current_period_end, "the end of this period")}, then move to Free. Collabs over the Free limit are paused.`
                }
                confirmLabel={effectiveStatus === "trialing" ? "End trial" : "Cancel plan"}
                variant="danger"
                onConfirm={async () => {
                    try {
                        await businessService.cancelSubscription(businessId);
                        toast.success(
                            effectiveStatus === "trialing" ? "Trial ended." : "Your plan will end at the close of this period."
                        );
                        await refresh();
                    } catch (e) {
                        notifyError(e, "Couldn't cancel");
                        throw e;
                    }
                }}
            />
            <UpgradeDialog {...upgrade} />
        </div>
    );
}

import { ApiRequestError } from "@services/api";
import { formatINR } from "../utils";
import type {
    Earnings,
    EarningsBooking,
    EarningsPayout,
    EarningsSummary,
    Experience,
    ExperienceBooking,
    ExperienceGst,
} from "@services/experience.types";

// ── Prices (set by SeekKrr; read-only here) ────────────────────────────────

/** "₹800" (or "₹847.46"); "Free" for 0. */
export function formatPrice(price: number): string {
    return price === 0 ? "Free" : formatINR(price, !Number.isInteger(price));
}

/** Money amount: "₹1,000" / "₹847.46" / "₹0" ("—" when unknown). */
export function formatMoney(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    const v = Math.round(value * 100) / 100;
    return formatINR(v, !Number.isInteger(v));
}

/** "+ 18% GST" / "incl. 18% GST" / "No GST". */
export function gstLabel(gst: ExperienceGst | null | undefined): string {
    if (!gst?.enabled || !gst.rate_pct) return "No GST";
    return gst.inclusive ? `incl. ${gst.rate_pct}% GST` : `+ ${gst.rate_pct}% GST`;
}

/** Per-person price of an option (or of the experience without options); null when SeekKrr hasn't set one. */
export function priceOf(experience: Pick<Experience, "options" | "price_per_person"> | null | undefined, optionId?: string | null): number | null {
    if (!experience) return null;
    const option = optionId ? experience.options.find((o) => o.id === optionId) : undefined;
    return option?.price ?? experience.price_per_person ?? null;
}

// ── Payment status ─────────────────────────────────────────────────────────

export type PaymentLabel = { label: string; className: string };

const FREE: PaymentLabel = { label: "Free", className: "bg-neutral-50 text-neutral-500 border-neutral-200" };

const PAYMENT_META: Record<string, PaymentLabel> = {
    paid: { label: "Paid", className: "bg-green-50 text-green-700 border-green-200" },
    refund_pending: { label: "Refund pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
    refunded: { label: "Refunded", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
    not_required: FREE,
    pending: { label: "Awaiting payment", className: "bg-amber-50 text-amber-700 border-amber-200" },
    failed: { label: "Payment failed", className: "bg-red-50 text-red-700 border-red-200" },
};

/** What the customer paid (or owes) for a booking, in rupees. */
export function bookingAmount(b: Pick<ExperienceBooking, "payment" | "pricing" | "total_amount">): number | null {
    return b.payment?.amount ?? b.pricing?.total ?? b.total_amount ?? null;
}

/** Paid / Refund pending / Refunded / Free (and Awaiting payment, Payment failed). */
export function paymentLabel(b: Pick<ExperienceBooking, "payment" | "pricing" | "total_amount">): PaymentLabel {
    const status = b.payment?.status;
    const meta = status ? PAYMENT_META[status] : undefined;
    if (meta) return meta;
    // Free bookings (and ones made before in-app payments) carry no payment.
    return FREE;
}

export function paymentStatusLabel(status: string | null | undefined): PaymentLabel | null {
    return status ? (PAYMENT_META[status] ?? { label: status.replace(/_/g, " "), className: "bg-neutral-50 text-neutral-600 border-neutral-200" }) : null;
}

// ── Earnings ───────────────────────────────────────────────────────────────

/** A route the server doesn't have yet (being built in parallel): 404 "Not Found" or 405. */
export function isRouteMissing(e: unknown): boolean {
    if (!(e instanceof ApiRequestError)) return false;
    if (e.status === 405) return true;
    return e.status === 404 && (!e.message || e.message === "Not Found");
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v)
        ? v
        : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))
          ? Number(v)
          : null;
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : null);
const first = (...values: unknown[]): unknown => values.find((v) => v !== null && v !== undefined) ?? null;

function summaryOf(raw: unknown): EarningsSummary {
    const r = obj(raw);
    return {
        gross: num(r.gross) ?? 0,
        refunds: num(r.refunds),
        commission: num(r.commission) ?? 0,
        gst_collected: num(first(r.gst_collected, r.gst)),
        net: num(first(r.net, r.net_owed)) ?? 0,
        paid_out: num(r.paid_out) ?? 0,
        balance: num(r.balance) ?? 0,
    };
}

function bookingOf(raw: unknown): EarningsBooking {
    const r = obj(raw);
    const pricing = obj(r.pricing);
    const payment = obj(r.payment);
    const customer = obj(first(r.customer, r.contact, r.user));
    const experience = obj(r.experience);
    const items = Array.isArray(r.items) ? r.items.map(obj) : [];
    return {
        id: str(first(r.id, r._id, r.booking_id)) ?? "",
        code: str(r.code),
        experience_title: str(first(r.experience_title, experience.title)),
        customer_name: str(first(customer.name, r.customer_name)),
        people: num(first(r.total_people, r.people, pricing.people)),
        date: str(first(r.date, items[0]?.date, r.starts_at)),
        subtotal: num(first(pricing.subtotal, r.subtotal)),
        gst_amount: num(first(pricing.gst_amount, r.gst_amount)),
        gst_rate_pct: num(first(pricing.gst_rate_pct, r.gst_rate_pct)),
        total: num(first(pricing.total, r.total, payment.amount, r.amount, r.total_amount)),
        commission: num(r.commission),
        commission_pct: num(r.commission_pct),
        net: num(r.net),
        payment_status: str(first(payment.status, r.payment_status)),
        paid_at: str(first(payment.paid_at, r.paid_at)),
        source: str(r.source),
    };
}

function payoutOf(raw: unknown): EarningsPayout {
    const r = obj(raw);
    return {
        id: str(first(r.id, r._id)) ?? "",
        amount: num(r.amount) ?? 0,
        reference: str(r.reference),
        paid_on: str(r.paid_on),
        note: str(r.note),
    };
}

/** GET /businesses/{bid}/earnings → tolerant of nested or flat booking shapes. */
export function earningsFrom(raw: unknown): Earnings {
    const r = obj(raw);
    const summary = obj(r.summary);
    return {
        summary: summaryOf(summary),
        commission_pct: num(first(r.commission_pct, summary.commission_pct)),
        bookings: Array.isArray(r.bookings) ? r.bookings.map(bookingOf) : [],
        payouts: Array.isArray(r.payouts) ? r.payouts.map(payoutOf) : [],
    };
}

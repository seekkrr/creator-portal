import { describe, expect, test } from "vitest";
import { ApiRequestError } from "@services/api";
import { earningsFrom, gstLabel, isRouteMissing, paymentLabel, priceOf } from "./money";

describe("gstLabel", () => {
    test("off → No GST", () => {
        expect(gstLabel(null)).toBe("No GST");
        expect(gstLabel({ enabled: false, rate_pct: 18, inclusive: false })).toBe("No GST");
    });

    test("added on top / included", () => {
        expect(gstLabel({ enabled: true, rate_pct: 18, inclusive: false })).toBe("+ 18% GST");
        expect(gstLabel({ enabled: true, rate_pct: 5, inclusive: true })).toBe("incl. 5% GST");
    });
});

describe("priceOf", () => {
    const experience = {
        price_per_person: 1000,
        options: [
            { id: "a", name: "Hatha", description: "", duration_minutes: 60, price: 800 },
            { id: "b", name: "Vinyasa", description: "", duration_minutes: 60, price: null },
        ],
    };

    test("option price, else the experience price", () => {
        expect(priceOf(experience, "a")).toBe(800);
        expect(priceOf(experience, "b")).toBe(1000);
        expect(priceOf(experience, null)).toBe(1000);
    });

    test("null when SeekKrr hasn't set one", () => {
        expect(priceOf({ ...experience, price_per_person: null }, "b")).toBeNull();
        expect(priceOf(null)).toBeNull();
    });
});

describe("paymentLabel", () => {
    test("maps payment statuses", () => {
        expect(paymentLabel({ payment: { status: "paid" }, total_amount: 1180 }).label).toBe("Paid");
        expect(paymentLabel({ payment: { status: "refund_pending" }, total_amount: 1180 }).label).toBe("Refund pending");
        expect(paymentLabel({ payment: { status: "refunded" }, total_amount: 1180 }).label).toBe("Refunded");
        expect(paymentLabel({ payment: { status: "not_required" }, total_amount: 0 }).label).toBe("Free");
    });

    test("no payment → Free", () => {
        expect(paymentLabel({ payment: null, total_amount: null }).label).toBe("Free");
    });
});

describe("isRouteMissing", () => {
    test("Starlette 404 and 405 are a missing route; a missing record isn't", () => {
        expect(isRouteMissing(new ApiRequestError("Not Found", { status: 404 }))).toBe(true);
        expect(isRouteMissing(new ApiRequestError("Method Not Allowed", { status: 405 }))).toBe(true);
        expect(isRouteMissing(new ApiRequestError("Business not found", { status: 404 }))).toBe(false);
        expect(isRouteMissing(new Error("Not Found"))).toBe(false);
    });
});

describe("earningsFrom", () => {
    test("reads summary, nested booking pricing and payouts; commission shows without GST too", () => {
        const e = earningsFrom({
            success: true,
            commission_pct: 15,
            summary: { gross: 2180, commission: 300, net: 1700, paid_out: 500, balance: 1200, gst_collected: 180 },
            bookings: [
                {
                    id: "b1",
                    code: "SK-ABC123",
                    experience: { id: "e1", title: "Sunrise yoga" },
                    pricing: { subtotal: 1000, gst_amount: 180, gst_rate_pct: 18, total: 1180 },
                    commission: 150,
                    net: 850,
                    payment: { status: "paid", paid_at: "2026-10-20T05:00:00Z" },
                },
                { id: "b2", total_amount: 1000, subtotal: 1000, commission: 150, net: 850, payment_status: "paid" },
            ],
            payouts: [{ id: "p1", amount: 500, reference: "UTR1", paid_on: "2026-10-21" }],
        });
        expect(e.commission_pct).toBe(15);
        expect(e.summary).toMatchObject({ gross: 2180, commission: 300, net: 1700, balance: 1200, gst_collected: 180, refunds: null });
        expect(e.bookings[0]).toMatchObject({ experience_title: "Sunrise yoga", subtotal: 1000, gst_amount: 180, total: 1180, payment_status: "paid" });
        expect(e.bookings[1]).toMatchObject({ total: 1000, gst_amount: null, commission: 150, net: 850, payment_status: "paid" });
        expect(e.payouts).toEqual([{ id: "p1", amount: 500, reference: "UTR1", paid_on: "2026-10-21", note: null }]);
    });

    test("empty body → zeros", () => {
        const e = earningsFrom({});
        expect(e.summary.balance).toBe(0);
        expect(e.bookings).toEqual([]);
        expect(e.commission_pct).toBeNull();
    });
});

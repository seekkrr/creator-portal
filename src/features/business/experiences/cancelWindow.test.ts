import { describe, expect, test } from "vitest";
import { businessCanCancel, slotCancelClosed } from "./utils";

const NOW = Date.parse("2026-11-15T00:00:00Z");
const hours = (h: number) => new Date(NOW + h * 3600_000).toISOString();

describe("businessCanCancel", () => {
    test("a traveller's booking: until 3 hours before the start", () => {
        expect(businessCanCancel({ status: "confirmed", source: "app", starts_at: hours(4) }, NOW)).toBe(true);
        expect(businessCanCancel({ status: "confirmed", source: "app", starts_at: hours(2) }, NOW)).toBe(false);
    });

    test("the server's deadline and can_cancel win", () => {
        expect(businessCanCancel({ status: "confirmed", starts_at: hours(10), business_cancellable_until: hours(-1) }, NOW)).toBe(false);
        expect(businessCanCancel({ status: "confirmed", starts_at: hours(10), can_cancel: false }, NOW)).toBe(false);
    });

    test("offline bookings stay cancellable while confirmed; others never", () => {
        expect(businessCanCancel({ status: "confirmed", source: "offline", starts_at: hours(1) }, NOW)).toBe(true);
        expect(businessCanCancel({ status: "cancelled", source: "offline", starts_at: hours(5) }, NOW)).toBe(false);
    });
});

describe("slotCancelClosed", () => {
    test("only a booked slot inside the last 3 hours", () => {
        expect(slotCancelClosed({ booked: 2, starts_at: hours(2) }, NOW)).toBe(true);
        expect(slotCancelClosed({ booked: 0, starts_at: hours(2) }, NOW)).toBe(false);
        expect(slotCancelClosed({ booked: 2, starts_at: hours(5) }, NOW)).toBe(false);
        expect(slotCancelClosed({ booked: 2, starts_at: hours(-1) }, NOW)).toBe(false);
    });
});

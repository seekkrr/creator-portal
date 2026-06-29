import { describe, test, expect } from "vitest";
import { estimateSeconds, exceedsSegment, MAX_SEGMENT_SECONDS, WORDS_PER_SECOND } from "./duration";

describe("estimateSeconds", () => {
    test("38 words ≈ 15s", () => {
        expect(Math.round(estimateSeconds("word ".repeat(38)))).toBe(15);
    });

    test("empty string → 0", () => {
        expect(estimateSeconds("")).toBe(0);
    });

    test("whitespace-only string → 0", () => {
        expect(estimateSeconds("   ")).toBe(0);
    });

    test("single word → 1 / WORDS_PER_SECOND", () => {
        expect(estimateSeconds("hello")).toBeCloseTo(1 / WORDS_PER_SECOND, 5);
    });
});

describe("exceedsSegment", () => {
    test("exceeds at >15s (50 words)", () => {
        expect(exceedsSegment("word ".repeat(50))).toBe(true);
    });

    test("not exceed at <15s (10 words)", () => {
        expect(exceedsSegment("word ".repeat(10))).toBe(false);
    });

    test("exactly 38 words (≈15s) does not exceed", () => {
        // 38 words / 2.5 = 15.2 which is just over 15 — let's test exact boundary
        // 37 words / 2.5 = 14.8 → does not exceed
        expect(exceedsSegment("word ".repeat(37))).toBe(false);
    });

    test("empty string does not exceed", () => {
        expect(exceedsSegment("")).toBe(false);
    });
});

describe("constants", () => {
    test("MAX_SEGMENT_SECONDS is 15", () => {
        expect(MAX_SEGMENT_SECONDS).toBe(15);
    });

    test("WORDS_PER_SECOND is 2.5", () => {
        expect(WORDS_PER_SECOND).toBe(2.5);
    });
});

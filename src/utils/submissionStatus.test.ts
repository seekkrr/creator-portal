import { describe, test, expect } from "vitest";
import { resolveNarrativeStatus } from "./submissionStatus";

describe("resolveNarrativeStatus", () => {
    test("submit action → under_review", () => {
        expect(resolveNarrativeStatus("submit")).toBe("under_review");
    });

    test("draft action → draft", () => {
        expect(resolveNarrativeStatus("draft")).toBe("draft");
    });
});

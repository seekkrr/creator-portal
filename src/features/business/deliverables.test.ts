import { describe, expect, it } from "vitest";
import { DELIVERABLE_LABELS, deliverableLabel } from "./utils";

describe("brief deliverables", () => {
    it("asks for YouTube Shorts, never videos", () => {
        expect(deliverableLabel("video", 1)).toBe("1 YouTube Short");
        expect(deliverableLabel("video", 2)).toBe("2 YouTube Shorts");
        expect(Object.values(DELIVERABLE_LABELS).some((l) => /video/i.test(l.one + l.many))).toBe(false);
    });
});

import { describe, test, expect } from "vitest";
import { chainFieldsFromSummary } from "./chainFields";
import type { NarrativeAttachSummary } from "@/types";

describe("chainFieldsFromSummary", () => {
    test("existing chain → chain_id + next sequence", () => {
        const summary = {
            chains: [
                {
                    chain_id: "c1",
                    next_sequence_order: 3,
                    label: "My Chain",
                    first_narrative_id: "n0",
                    count: 2,
                    max_sequence_order: 2,
                },
            ],
            standalone: [],
        } as Pick<NarrativeAttachSummary, "chains" | "standalone">;

        expect(chainFieldsFromSummary(summary)).toEqual({
            chain_id: "c1",
            sequence_order: 3,
        });
    });

    test("standalone only → chain_with", () => {
        const summary = {
            chains: [],
            standalone: [
                { id: "n1", title: "Standalone Narrative", status: "approved" as const, sequence_order: null },
            ],
        } as Pick<NarrativeAttachSummary, "chains" | "standalone">;

        expect(chainFieldsFromSummary(summary)).toEqual({ chain_with: "n1" });
    });

    test("empty → {}", () => {
        const summary = {
            chains: [],
            standalone: [],
        } as Pick<NarrativeAttachSummary, "chains" | "standalone">;

        expect(chainFieldsFromSummary(summary)).toEqual({});
    });

    test("prefers chain over standalone when both exist", () => {
        const summary = {
            chains: [
                {
                    chain_id: "c2",
                    next_sequence_order: 5,
                    label: "Chain 2",
                    first_narrative_id: "n0",
                    count: 4,
                    max_sequence_order: 4,
                },
            ],
            standalone: [
                { id: "n99", title: "Some standalone", status: "draft" as const, sequence_order: null },
            ],
        } as Pick<NarrativeAttachSummary, "chains" | "standalone">;

        expect(chainFieldsFromSummary(summary)).toEqual({
            chain_id: "c2",
            sequence_order: 5,
        });
    });
});

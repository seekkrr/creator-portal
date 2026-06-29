import type { NarrativeAttachSummary } from "@/types";

/**
 * Derive chain payload fields from an attach-summary response.
 *
 * Decision tree:
 *  - Existing chain  → append via { chain_id, sequence_order }
 *  - Standalone only → chain onto the first standalone via { chain_with }
 *  - Empty           → {} (first narrative on this target, no chaining needed)
 *
 * When both chains and standalone exist the chains array is preferred, because
 * the backend treats chain_id + sequence_order as a direct append onto an existing
 * chain whereas chain_with would create a new chain from a standalone — appending
 * to the chain is the more coherent user intent.
 */
export function chainFieldsFromSummary(
    summary: Pick<NarrativeAttachSummary, "chains" | "standalone">
): { chain_id?: string; sequence_order?: number; chain_with?: string } {
    const firstChain = summary.chains[0];
    if (firstChain !== undefined) {
        return { chain_id: firstChain.chain_id, sequence_order: firstChain.next_sequence_order };
    }
    const firstStandalone = summary.standalone[0];
    if (firstStandalone !== undefined) {
        return { chain_with: firstStandalone.id };
    }
    return {};
}

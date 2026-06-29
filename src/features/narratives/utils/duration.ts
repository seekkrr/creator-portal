/** Average spoken words per second used for segment duration estimation. */
export const WORDS_PER_SECOND = 2.5;

/**
 * Maximum recommended speaking duration (seconds) for a single narrative segment.
 * Segments longer than this are flagged for chain-splitting.
 */
export const MAX_SEGMENT_SECONDS = 15;

/**
 * Estimate speaking duration in seconds for the given text.
 *
 * Word count is derived by trimming the input and splitting on whitespace.
 * Returns 0 for empty or whitespace-only strings.
 */
export function estimateSeconds(text: string): number {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    const wordCount = trimmed.split(/\s+/).length;
    return wordCount / WORDS_PER_SECOND;
}

/**
 * Returns true when the estimated speaking duration for `text` exceeds
 * MAX_SEGMENT_SECONDS. Used to trigger the "consider splitting" UI notice.
 */
export function exceedsSegment(text: string): boolean {
    return estimateSeconds(text) > MAX_SEGMENT_SECONDS;
}

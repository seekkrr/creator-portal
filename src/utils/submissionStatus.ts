/**
 * Submission status helpers.
 *
 * Centralizes the rule: clicking "Submit for Review" always yields
 * `under_review`; "Save as Draft" always yields `draft`.
 * Verified vs unverified creators share the same rule — both can
 * explicitly submit (reaching `under_review`) or explicitly draft.
 */

export type NarrativeSubmitStatus = "draft" | "under_review";

/**
 * Return the narrative status that should be sent to the backend
 * based on which action the user clicked.
 *
 * @param action - "submit" for "Submit for Review", "draft" for "Save as Draft"
 */
export function resolveNarrativeStatus(
    action: "submit" | "draft"
): NarrativeSubmitStatus {
    return action === "submit" ? "under_review" : "draft";
}

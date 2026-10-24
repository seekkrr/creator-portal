// Plan wording helpers (pure, no imports — unit tested in planWording.test.ts).

export const NEUTRAL_LIMIT_MESSAGE = "You've reached a limit for your business.";

/**
 * Strip plan and upgrade wording from a quota message, for when plans are
 * hidden from businesses: "Your plan allows 1 team member. Upgrade to add
 * more." → "You can have 1 team member."
 */
export function neutralPlanMessage(message: string | null | undefined, fallback = NEUTRAL_LIMIT_MESSAGE): string {
    let s = (message ?? "").trim();
    if (!s) return fallback;
    s = s
        .replace(/\byour plan (allows|includes)\b/gi, "You can have")
        .replace(/\byour plan's monthly limit\b/gi, "This month's limit")
        .replace(/\s+(on|in) your plan\b/gi, "")
        .replace(/\s+or upgrade\b/gi, "");
    const sentences = s.match(/[^.!?]+[.!?]*/g) ?? [];
    const kept = sentences
        .map((x) => x.trim())
        .filter((x) => x && !/\b(upgrade|upgrading|plans?|growth|pro|trial|billing)\b/i.test(x));
    const out = kept.join(" ").trim();
    return out || fallback;
}

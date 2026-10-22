import { describe, test, expect } from "vitest";
import { NEUTRAL_LIMIT_MESSAGE, neutralPlanMessage } from "./planWording";

describe("neutralPlanMessage", () => {
    test("team seats: drops the upgrade sentence", () => {
        expect(neutralPlanMessage("Your plan allows 1 team member. Upgrade to add more.")).toBe(
            "You can have 1 team member."
        );
    });

    test("places: 'includes' reads as 'can have'", () => {
        expect(neutralPlanMessage("Your plan includes 3 places. Upgrade to add more.")).toBe("You can have 3 places.");
    });

    test("active briefs: removes 'or upgrade'", () => {
        expect(neutralPlanMessage("Your plan allows 3 active UGC briefs. Pause one or upgrade.")).toBe(
            "You can have 3 active UGC briefs. Pause one."
        );
    });

    test("monthly counters", () => {
        expect(neutralPlanMessage("You've used this month's invites. Upgrade for more.")).toBe(
            "You've used this month's invites."
        );
        expect(
            neutralPlanMessage("Your plan's monthly limit is used up. Upgrade in the Partner Portal for more.")
        ).toBe("This month's limit is used up.");
        expect(neutralPlanMessage("You've used all 30 redemptions on your plan this month.")).toBe(
            "You've used all 30 redemptions this month."
        );
    });

    test("plan names and trials fall back to the neutral message", () => {
        expect(
            neutralPlanMessage("Approval-mode UGC briefs (you pick each creator) are on the Growth plan and above.")
        ).toBe(NEUTRAL_LIMIT_MESSAGE);
        expect(neutralPlanMessage("You've reached your plan's limit.")).toBe(NEUTRAL_LIMIT_MESSAGE);
        expect(neutralPlanMessage("Start a free trial to keep going.")).toBe(NEUTRAL_LIMIT_MESSAGE);
    });

    test("leaves neutral messages alone; empty → fallback", () => {
        expect(neutralPlanMessage("All slots for this collab are taken.")).toBe("All slots for this collab are taken.");
        expect(neutralPlanMessage("You can have 2 profiles.")).toBe("You can have 2 profiles.");
        expect(neutralPlanMessage("")).toBe(NEUTRAL_LIMIT_MESSAGE);
        expect(neutralPlanMessage(null, "Custom")).toBe("Custom");
    });
});

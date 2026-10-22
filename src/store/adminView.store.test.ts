import { describe, test, expect } from "vitest";
import { adminViewIdFor, adminViewIdFromUrl, useAdminViewStore } from "./adminView.store";

const BIZ_ID = "64b7f0c2a1b2c3d4e5f60718";

describe("adminViewIdFromUrl", () => {
    test("reads ?business= on Partner Portal routes", () => {
        expect(adminViewIdFromUrl("/business/experiences/64b7f0c2a1b2c3d4e5f60700", `?business=${BIZ_ID}`)).toBe(BIZ_ID);
        expect(adminViewIdFromUrl("/business/experiences", `?business=${BIZ_ID.toUpperCase()}&tab=slots`)).toBe(
            BIZ_ID.toUpperCase()
        );
        expect(adminViewIdFromUrl("/business", `?business=%20${BIZ_ID}%20`)).toBe(BIZ_ID);
    });

    test("ignores other routes and anything that isn't an id", () => {
        expect(adminViewIdFromUrl("/creator/dashboard", `?business=${BIZ_ID}`)).toBeNull();
        expect(adminViewIdFromUrl("/business/experiences", "?business=lake-adventures")).toBeNull();
        expect(adminViewIdFromUrl("/business/experiences", "")).toBeNull();
    });
});

describe("useAdminViewStore", () => {
    test("open / exit, and only admins read it", () => {
        useAdminViewStore.getState().open(BIZ_ID);
        expect(useAdminViewStore.getState().businessId).toBe(BIZ_ID);
        expect(adminViewIdFor({ role: ["moderator"] })).toBe(BIZ_ID);
        expect(adminViewIdFor({ role: ["user", "business"] })).toBeNull();
        useAdminViewStore.getState().exit();
        expect(useAdminViewStore.getState().businessId).toBeNull();
        expect(adminViewIdFor({ role: ["admin"] })).toBeNull();
    });
});

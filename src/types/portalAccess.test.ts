import { describe, test, expect } from "vitest";
import { evaluatePortalAccess, isPlatformAdmin } from "./index";

const BIZ_ID = "64b7f0c2a1b2c3d4e5f60718";
const ownBusiness = [{ id: "64b7f0c2a1b2c3d4e5f60799" }];

describe("isPlatformAdmin", () => {
    test("admin, super_admin and moderator", () => {
        expect(isPlatformAdmin({ role: ["user", "admin"] })).toBe(true);
        expect(isPlatformAdmin({ role: ["super_admin"] })).toBe(true);
        expect(isPlatformAdmin({ role: "moderator" })).toBe(true);
    });

    test("everyone else", () => {
        expect(isPlatformAdmin({ role: ["user", "business"] })).toBe(false);
        expect(isPlatformAdmin({ role: ["finance"] })).toBe(false);
        expect(isPlatformAdmin(null)).toBe(false);
    });
});

describe("evaluatePortalAccess — admin view", () => {
    test("an admin with no business of their own gets the business workspace", () => {
        const access = evaluatePortalAccess({ role: ["admin"], is_creator: false }, null, [], BIZ_ID);
        expect(access).toMatchObject({ allowed: true, creator: true, business: true, adminView: true });
    });

    test("a moderator (no creator access) gets in only with an admin view", () => {
        const moderator = { role: ["moderator"], is_creator: false };
        expect(evaluatePortalAccess(moderator, null, [], BIZ_ID)).toMatchObject({
            allowed: true,
            creator: false,
            business: true,
            adminView: true,
        });
        expect(evaluatePortalAccess(moderator, null, [])).toMatchObject({ allowed: false, business: false, adminView: false });
    });

    test("ignored for normal users", () => {
        const owner = { role: ["user", "business"], is_creator: false };
        expect(evaluatePortalAccess(owner, null, ownBusiness, BIZ_ID)).toMatchObject({ business: true, adminView: false });
        const traveller = { role: ["user"], is_creator: false };
        expect(evaluatePortalAccess(traveller, null, [], BIZ_ID)).toMatchObject({
            allowed: false,
            business: false,
            adminView: false,
        });
    });

    test("unchanged without an admin view", () => {
        const owner = { role: ["user", "business"], is_creator: false };
        expect(evaluatePortalAccess(owner, null, ownBusiness)).toEqual({
            allowed: true,
            creator: false,
            business: true,
            adminView: false,
            reason: undefined,
        });
        expect(evaluatePortalAccess({ role: ["admin"] }, null, [])).toMatchObject({ creator: true, business: false, adminView: false });
    });
});

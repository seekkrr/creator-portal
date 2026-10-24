import { beforeEach, describe, expect, test, vi } from "vitest";

// The shared client reads the env config; the chat only needs `request`.
vi.mock("@/services/api", () => ({ api: { request: vi.fn() } }));

import { api } from "@/services/api";
import {
    COMMANDS_UNAVAILABLE_MESSAGE,
    CommandsApiError,
    commandsService,
    normalizeResult,
} from "./commands.service";
import type { CommandScope } from "./commands.types";

const request = vi.mocked(api.request);
const BIZ_ID = "64b7f0c2a1b2c3d4e5f60718";
const BUSINESS: CommandScope = { surface: "partner", businessId: BIZ_ID };
const CREATOR: CommandScope = { surface: "partner", businessId: null };

function reply(status: number, data: unknown) {
    request.mockResolvedValueOnce({ status, data, statusText: "", headers: {}, config: {} } as never);
}

/** The axios config of the n-th call. */
function sent(n = 0): { method?: string; url?: string; params?: Record<string, unknown>; data?: Record<string, unknown> } {
    return (request.mock.calls[n]?.[0] ?? {}) as never;
}

beforeEach(() => {
    request.mockReset();
    // Mock layer off (it's only for dev with the flag set).
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});

describe("business_id: business area only", () => {
    test("understand — business area sends surface partner + business_id", async () => {
        reply(200, { success: true, result: { kind: "denied", message: "Experiences aren't on for Ara cafe." } });
        await commandsService.understand({ text: "publish yoga", surface: "partner", business_id: BIZ_ID });
        expect(sent()).toMatchObject({ method: "POST", url: "/api/v2/commands/understand" });
        expect(sent().data).toEqual({ text: "publish yoga", surface: "partner", business_id: BIZ_ID });
    });

    test("understand — creator area sends no business_id", async () => {
        reply(200, { success: true, result: { kind: "unknown", message: "?", examples: [] } });
        await commandsService.understand({ text: "show my quests", surface: "partner" });
        expect(sent().data).toEqual({ text: "show my quests", surface: "partner" });
        expect(sent().data).not.toHaveProperty("business_id");
    });

    test("suggest and catalog put business_id in the query in the business area", async () => {
        reply(200, { suggestions: [{ text: "pause my collab", label: "pause my collab", hint: "Collabs" }] });
        reply(200, { commands: [{ id: "biz.pause_collab", label: "Pause a collab", examples: ["pause my collab"], area: "My business" }] });
        await commandsService.suggest("pau", BUSINESS);
        await commandsService.catalog(BUSINESS);
        expect(sent(0)).toMatchObject({ url: "/api/v2/commands/suggest", params: { q: "pau", surface: "partner", business_id: BIZ_ID } });
        expect(sent(1)).toMatchObject({ url: "/api/v2/commands/catalog", params: { surface: "partner", business_id: BIZ_ID } });
    });

    test("suggest and catalog leave business_id out in the creator area", async () => {
        reply(200, { suggestions: [] });
        reply(200, { commands: [] });
        await commandsService.suggest("sho", CREATOR);
        await commandsService.catalog(CREATOR);
        expect(sent(0).params).toEqual({ q: "sho", surface: "partner" });
        expect(sent(1).params).toEqual({ surface: "partner" });
    });
});

describe("errors", () => {
    test("route 404 → unavailable, with the plain message", async () => {
        reply(404, { detail: "Not Found" });
        const err = await commandsService.catalog(BUSINESS).catch((e: unknown) => e);
        expect(err).toBeInstanceOf(CommandsApiError);
        expect(err).toMatchObject({ kind: "unavailable", status: 404, message: COMMANDS_UNAVAILABLE_MESSAGE });
        expect(COMMANDS_UNAVAILABLE_MESSAGE).toBe("The chat isn't available on this server yet.");
        expect((err as CommandsApiError).retryable).toBe(false);
    });

    test("404 without a body, and 405, also mean unavailable", async () => {
        reply(404, "");
        reply(405, { detail: "Method Not Allowed" });
        await expect(commandsService.understand({ text: "x", surface: "partner" })).rejects.toMatchObject({ kind: "unavailable" });
        await expect(commandsService.run("tok")).rejects.toMatchObject({ kind: "unavailable" });
    });

    test("a domain 404 keeps its own message", async () => {
        reply(404, { success: false, message: "That experience was deleted." });
        await expect(commandsService.understand({ text: "publish yoga", surface: "partner", business_id: BIZ_ID })).rejects.toMatchObject({
            kind: "invalid",
            message: "That experience was deleted.",
        });
    });

    test("expired run token, forbidden, server and network", async () => {
        reply(400, { detail: "This preview expired. Send the command again." });
        reply(403, { detail: "Collabs aren't on for Ara cafe." });
        reply(503, { detail: "down" });
        request.mockRejectedValueOnce(new Error("timeout"));
        await expect(commandsService.run("tok")).rejects.toMatchObject({ kind: "expired" });
        await expect(commandsService.run("tok")).rejects.toMatchObject({ kind: "forbidden", message: "Collabs aren't on for Ara cafe." });
        await expect(commandsService.history()).rejects.toMatchObject({ kind: "server", retryable: true });
        await expect(commandsService.history()).rejects.toMatchObject({ kind: "network", retryable: true });
    });
});

describe("normalizeResult", () => {
    test("fills defaults for each kind and rejects unknown kinds", () => {
        expect(normalizeResult({ kind: "choose", slot: "place", options: [{ id: "p1" }] })).toEqual({
            kind: "choose",
            slot: "place",
            prompt: "Which one?",
            options: [{ id: "p1", label: "p1", sublabel: null, image_url: null }],
        });
        expect(normalizeResult({ kind: "need", slot: "when", prompt: "Which day?", input: "colour" })).toMatchObject({ input: "text" });
        expect(normalizeResult({ kind: "preview", title: "T", token: "t" })).toMatchObject({ confirm_label: "Confirm", danger: false, changes: [] });
        expect(normalizeResult({ kind: "answer", title: "A", items: [{ label: "x", url_path: "/business/bookings" }] })).toMatchObject({
            items: [{ label: "x", sublabel: null, url_path: "/business/bookings", image_url: null }],
        });
        expect(normalizeResult({ kind: "denied" })).toMatchObject({ kind: "denied" });
        expect(normalizeResult({ kind: "unknown", examples: ["a", 2] })).toMatchObject({ examples: ["a"] });
        expect(() => normalizeResult({ kind: "dance" })).toThrow(CommandsApiError);
        expect(() => normalizeResult(null)).toThrow(CommandsApiError);
    });
});

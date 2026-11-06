import { beforeEach, describe, expect, test, vi } from "vitest";

// The shared client reads the env config; the chat only needs `request` (and `get` for its settings).
vi.mock("@/services/api", () => ({ api: { request: vi.fn(), get: vi.fn() } }));

import { api } from "@/services/api";
import {
    CHAT_DISABLED_MESSAGE,
    COMMANDS_UNAVAILABLE_MESSAGE,
    CommandsApiError,
    commandsService,
    MAX_HISTORY_TURNS,
    normalizeResult,
} from "./commands.service";
import type { CommandScope, CommandTurn } from "./commands.types";

const request = vi.mocked(api.request);
const get = vi.mocked(api.get);
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
    get.mockReset();
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

    test("catalog puts business_id in the query in the business area", async () => {
        reply(200, { commands: [{ id: "biz.pause_collab", label: "Pause a collab", examples: ["pause my collab"], area: "My business" }] });
        await commandsService.catalog(BUSINESS);
        expect(sent(0)).toMatchObject({ url: "/api/v2/commands/catalog", params: { surface: "partner", business_id: BIZ_ID } });
    });

    test("catalog leaves business_id out in the creator area", async () => {
        reply(200, { commands: [] });
        await commandsService.catalog(CREATOR);
        expect(sent(0).params).toEqual({ surface: "partner" });
    });

    test("the chat has no suggestions call any more", () => {
        expect("suggest" in commandsService).toBe(false);
    });
});

describe("history: the chat so far goes with a message", () => {
    const HISTORY: CommandTurn[] = [
        { role: "user", text: "add a booking for Ravi" },
        { role: "assistant", text: "Sure! How many people are coming with Ravi?" },
    ];

    test("understand sends the turns as given, oldest first", async () => {
        reply(200, { success: true, result: { kind: "answer", title: "", text: "Done!" } });
        await commandsService.understand({ text: "3 people", surface: "partner", business_id: BIZ_ID, history: HISTORY });
        expect(sent().data).toEqual({ text: "3 people", surface: "partner", business_id: BIZ_ID, history: HISTORY });
    });

    test("no history: the field is left out (older servers never see it)", async () => {
        reply(200, { success: true, result: { kind: "answer", title: "", text: "Hi!" } });
        reply(200, { success: true, result: { kind: "answer", title: "", text: "Hi!" } });
        await commandsService.understand({ text: "hi", surface: "partner" });
        await commandsService.understand({ text: "hi", surface: "partner", history: [{ role: "user", text: "   " }] });
        expect(sent(0).data).not.toHaveProperty("history");
        expect(sent(1).data).not.toHaveProperty("history");
    });

    test("what the server accepts: the latest 20 turns, words only, at most 1000 characters each", async () => {
        reply(200, { success: true, result: { kind: "answer", title: "", text: "Ok" } });
        const many: CommandTurn[] = Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `turn ${i}` }));
        many.push({ role: "assistant", text: "" }, { role: "user", text: "x".repeat(1500) });
        await commandsService.understand({ text: "ok", surface: "partner", history: many });
        const history = sent().data?.history as CommandTurn[];
        expect(MAX_HISTORY_TURNS).toBe(20);
        expect(history).toHaveLength(20);
        expect(history[0]).toEqual({ role: "user", text: "turn 6" });
        expect(history[18]).toEqual({ role: "user", text: "turn 24" });
        expect(history[19]?.text).toHaveLength(1000);
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

    test("403 CHAT_DISABLED → disabled, with the plain message, on every gated call", async () => {
        const off = { success: false, error: "CHAT_DISABLED", message: "The chat isn't on for businesses yet.", details: { audience: "businesses" } };
        reply(403, off);
        reply(403, off);
        reply(403, off);
        const err = await commandsService.catalog(BUSINESS).catch((e: unknown) => e);
        expect(err).toBeInstanceOf(CommandsApiError);
        expect(err).toMatchObject({ kind: "disabled", status: 403, message: CHAT_DISABLED_MESSAGE });
        expect(CHAT_DISABLED_MESSAGE).toBe("The chat isn't on yet.");
        expect((err as CommandsApiError).retryable).toBe(false);
        await expect(commandsService.run("tok")).rejects.toMatchObject({ kind: "disabled" });
        await expect(commandsService.understand({ text: "show my quests", surface: "partner" })).rejects.toMatchObject({ kind: "disabled" });
    });

    test("any other 403 code stays forbidden", async () => {
        reply(403, { success: false, error: "FORBIDDEN", message: "Only owners can do that." });
        await expect(commandsService.catalog(BUSINESS)).rejects.toMatchObject({ kind: "forbidden", message: "Only owners can do that." });
    });
});

describe("chatSettings", () => {
    test("reads GET /config/chat; only a real true turns a group on", async () => {
        get.mockResolvedValueOnce({
            data: {
                success: true,
                audiences: { users: false, creators: "true", businesses: true },
                ai_ready: true,
                updated_at: "2026-10-30T10:00:00+00:00",
            },
        } as never);
        await expect(commandsService.chatSettings()).resolves.toEqual({
            audiences: { users: false, creators: false, businesses: true, admin: false },
            ai_ready: true,
            updated_at: "2026-10-30T10:00:00+00:00",
        });
        expect(get).toHaveBeenCalledWith("/api/v2/config/chat");
    });

    test("a reply without audiences keeps every group off", async () => {
        get.mockResolvedValueOnce({ data: { success: true } } as never);
        await expect(commandsService.chatSettings()).resolves.toEqual({
            audiences: { users: false, creators: false, businesses: false, admin: false },
            ai_ready: false,
            updated_at: null,
        });
    });

    test("demo data turns the chat on for everyone without asking the server", async () => {
        vi.stubGlobal("localStorage", { getItem: () => "1", setItem: () => {}, removeItem: () => {} });
        const settings = await commandsService.chatSettings();
        expect(settings.audiences).toEqual({ users: true, creators: true, businesses: true, admin: true });
        expect(get).not.toHaveBeenCalled();
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
        expect(normalizeResult({ kind: "preview", title: "T", token: "t" })).toMatchObject({
            confirm_label: "Confirm",
            danger: false,
            changes: [],
            lead: null,
        });
        expect(normalizeResult({ kind: "answer", title: "A", items: [{ label: "x", url_path: "/business/bookings" }] })).toMatchObject({
            items: [{ label: "x", sublabel: null, url_path: "/business/bookings", image_url: null }],
            link: null,
        });
        expect(normalizeResult({ kind: "denied" })).toMatchObject({ kind: "denied" });
        expect(normalizeResult({ kind: "unknown", examples: ["a", 2] })).toMatchObject({ examples: ["a"] });
        expect(() => normalizeResult({ kind: "dance" })).toThrow(CommandsApiError);
        expect(() => normalizeResult(null)).toThrow(CommandsApiError);
    });

    test("an answer's screen link, and a preview's lead", () => {
        expect(
            normalizeResult({
                kind: "answer",
                title: "",
                text: "You have 2 bookings today.",
                items: [],
                link: { url_path: "/business/bookings", label: "Open bookings" },
            })
        ).toEqual({
            kind: "answer",
            title: "",
            text: "You have 2 bookings today.",
            items: [],
            link: { url_path: "/business/bookings", label: "Open bookings" },
        });
        // A link without a path is dropped; one without a label still opens.
        expect(normalizeResult({ kind: "answer", title: "A", link: { label: "Open" } })).toMatchObject({ link: null });
        expect(normalizeResult({ kind: "answer", title: "A", link: "/business/bookings" })).toMatchObject({ link: null });
        expect(normalizeResult({ kind: "answer", title: "A", link: { url_path: "/business/collabs" } })).toMatchObject({
            link: { url_path: "/business/collabs", label: "Open" },
        });
        expect(normalizeResult({ kind: "preview", title: "Add a booking for Ravi", token: "t", lead: " Here it is, look right? " })).toMatchObject({
            lead: "Here it is, look right?",
        });
        expect(normalizeResult({ kind: "preview", title: "T", token: "t", lead: "  " })).toMatchObject({ lead: null });
    });
});

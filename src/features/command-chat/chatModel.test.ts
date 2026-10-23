import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CommandScope, UnderstandRequest, UnderstandResult } from "@services/commands.types";
import {
    buildRequest,
    chatReducer,
    entryForResult,
    freshChatState,
    isPortalPath,
    loadChatState,
    saveChatState,
    scopeKey,
    uploadCategoryFor,
    uploadEntityFor,
    type ChatState,
    type ResultEntry,
} from "./chatModel";

const BIZ_ID = "64b7f0c2a1b2c3d4e5f60718";
const BUSINESS: CommandScope = { surface: "partner", businessId: BIZ_ID };
const CREATOR: CommandScope = { surface: "partner", businessId: null };

const REQUEST: UnderstandRequest = { text: "publish yoga", surface: "partner", business_id: BIZ_ID };

const RESULTS: Record<UnderstandResult["kind"], UnderstandResult> = {
    choose: {
        kind: "choose",
        slot: "experience",
        prompt: "Which experience did you mean?",
        options: [
            { id: "a", label: "Sunrise Yoga", sublabel: null, image_url: null },
            { id: "b", label: "Sunset Yoga", sublabel: null, image_url: null },
        ],
    },
    need: { kind: "need", slot: "images", prompt: "Attach the photos.", input: "images", placeholder: null },
    preview: {
        kind: "preview",
        command: "biz.publish_experience",
        title: "Publish Sunrise Yoga",
        summary: "Travellers can book it.",
        changes: [{ label: "Status", before: "Draft", after: "Published" }],
        confirm_label: "Publish",
        danger: false,
        token: "tok",
    },
    answer: { kind: "answer", title: "Bookings · today", text: "2 bookings.", items: [] },
    denied: { kind: "denied", message: "Experiences aren't on for Ara cafe." },
    unknown: { kind: "unknown", message: "I don't know that one yet.", examples: ["show today's bookings"] },
};

function stateWith(...entries: ResultEntry[]): ChatState {
    return { entries, startedAt: "2026-10-23T00:00:00.000Z", scope: scopeKey(BUSINESS) };
}

describe("result-kind → conversation entry", () => {
    test.each(Object.keys(RESULTS) as UnderstandResult["kind"][])("%s becomes a result entry", (kind) => {
        const result = RESULTS[kind];
        const entry = entryForResult(REQUEST, result, "r1", "2026-10-23T10:00:00.000Z");
        expect(entry).toMatchObject({ id: "r1", type: "result", request: REQUEST, result });
        // Only a preview has a lifecycle (Confirm / Cancel); it starts open.
        expect(entry.status).toBe(kind === "preview" ? "open" : undefined);
        expect(entry.pickedId).toBeUndefined();
        expect(entry.answered).toBeUndefined();
    });

    test("add appends the entry and keeps the scope", () => {
        const entry = entryForResult(REQUEST, RESULTS.preview, "r1");
        const next = chatReducer(stateWith(), { type: "add", entry });
        expect(next.entries).toEqual([entry]);
        expect(next.scope).toBe(`business:${BIZ_ID}`);
    });

    test("a new message supersedes only open choose / need prompts", () => {
        const s = stateWith(
            entryForResult(REQUEST, RESULTS.choose, "choose-open"),
            { ...entryForResult(REQUEST, RESULTS.choose, "choose-picked"), pickedId: "a" },
            entryForResult(REQUEST, RESULTS.need, "need-open"),
            { ...entryForResult(REQUEST, RESULTS.need, "need-answered"), answered: true },
            entryForResult(REQUEST, RESULTS.preview, "preview"),
            entryForResult(REQUEST, RESULTS.answer, "answer"),
            entryForResult(REQUEST, RESULTS.denied, "denied"),
            entryForResult(REQUEST, RESULTS.unknown, "unknown")
        );
        const next = chatReducer(s, { type: "supersede" });
        const superseded = next.entries.filter((e) => e.type === "result" && e.superseded).map((e) => e.id);
        expect(superseded).toEqual(["choose-open", "need-open"]);
    });

    test("patch updates a preview's status; reset empties the conversation but keeps who it acts as", () => {
        const s = stateWith(entryForResult(REQUEST, RESULTS.preview, "p"));
        const running = chatReducer(s, { type: "patch", id: "p", patch: { status: "running" } });
        expect((running.entries[0] as ResultEntry).status).toBe("running");
        const reset = chatReducer(running, { type: "reset", startedAt: "2026-10-24T00:00:00.000Z" });
        expect(reset).toEqual({ entries: [], startedAt: "2026-10-24T00:00:00.000Z", scope: `business:${BIZ_ID}` });
    });
});

describe("requests carry the workspace", () => {
    test("business area: surface partner + business_id", () => {
        expect(buildRequest("  pause my collab ", BUSINESS)).toEqual({
            text: "pause my collab",
            surface: "partner",
            business_id: BIZ_ID,
        });
    });

    test("creator area: surface partner, no business_id", () => {
        const req = buildRequest("show my quests", CREATOR);
        expect(req).toEqual({ text: "show my quests", surface: "partner" });
        expect("business_id" in req).toBe(false);
    });

    test("attachments only when there are some", () => {
        const photo = { url: "https://img.seekkrr.com/x.webp", kind: "image" as const };
        expect(buildRequest("add photos to my place", BUSINESS, [photo]).attachments).toEqual([photo]);
        expect("attachments" in buildRequest("add photos to my place", BUSINESS, [])).toBe(false);
    });

    test("scope keys differ per business and for the creator", () => {
        expect(scopeKey(BUSINESS)).toBe(`business:${BIZ_ID}`);
        expect(scopeKey({ surface: "partner", businessId: "other" })).toBe("business:other");
        expect(scopeKey(CREATOR)).toBe("creator");
    });
});

describe("switching workspace starts a fresh conversation", () => {
    beforeEach(() => {
        const store = new Map<string, string>();
        vi.stubGlobal("sessionStorage", {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => void store.set(k, v),
            removeItem: (k: string) => void store.delete(k),
        });
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("same scope restores; another scope is fresh", () => {
        const saved: ChatState = {
            ...freshChatState(scopeKey(BUSINESS)),
            entries: [{ ...entryForResult(REQUEST, RESULTS.preview, "p"), status: "running" }],
        };
        saveChatState(saved);

        const same = loadChatState(scopeKey(BUSINESS));
        expect(same.entries).toHaveLength(1);
        // A reload mid-request leaves nothing in flight.
        expect((same.entries[0] as ResultEntry).status).toBe("open");

        expect(loadChatState(scopeKey(CREATOR)).entries).toEqual([]);
        expect(loadChatState("business:another").entries).toEqual([]);
    });
});

describe("photos and links", () => {
    test("upload category: experience, marker for places, else website", () => {
        expect(uploadCategoryFor("add photos to the Sunrise Yoga experience")).toBe("experience");
        expect(uploadCategoryFor("add photos", { experience: "ex1" })).toBe("experience");
        expect(uploadCategoryFor("add photos to my place")).toBe("marker");
        expect(uploadCategoryFor("add photos to Emaho", { place: "pl1" })).toBe("marker");
        expect(uploadCategoryFor("add photos to Emaho Cafe")).toBe("website");
        expect(uploadEntityFor({ place: "pl1" }, BIZ_ID)).toBe("pl1");
        expect(uploadEntityFor({}, BIZ_ID)).toBe(BIZ_ID);
        expect(uploadEntityFor({}, null)).toBeUndefined();
    });

    test("only Partner Portal routes may be opened", () => {
        expect(isPortalPath("/business/experiences/ex1")).toBe(true);
        expect(isPortalPath("/business")).toBe(true);
        expect(isPortalPath("/business?tab=slots")).toBe(true);
        expect(isPortalPath("/creator/quest/view/q1")).toBe(true);
        expect(isPortalPath("/businesses/1")).toBe(false);
        expect(isPortalPath("/markers/1")).toBe(false);
        expect(isPortalPath("https://seekkrr.com/business")).toBe(false);
        expect(isPortalPath("business/chat")).toBe(false);
        expect(isPortalPath(null)).toBe(false);
    });
});

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CommandScope, UnderstandRequest, UnderstandResult } from "@services/commands.types";
import {
    answerRequest,
    buildRequest,
    chatGreeting,
    chatHistory,
    chatReducer,
    composerPlaceholder,
    describeEntry,
    entryForResult,
    freshChatState,
    HISTORY_TURNS,
    isPortalPath,
    loadChatState,
    openQuestion,
    replyWords,
    saveChatState,
    scopeKey,
    uploadCategoryFor,
    uploadEntityFor,
    type ChatEntry,
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
        lead: "Here it is, look right?",
    },
    answer: {
        kind: "answer",
        title: "Bookings · today",
        text: "You have 2 bookings today.",
        items: [],
        link: { url_path: "/business/bookings", label: "Open bookings" },
    },
    denied: { kind: "denied", message: "Experiences aren't on for Ara cafe." },
    unknown: { kind: "unknown", message: "I don't know that one yet.", examples: ["show today's bookings"] },
};

function stateWith(...entries: ResultEntry[]): ChatState {
    return { entries, startedAt: "2026-10-23T00:00:00.000Z", scope: scopeKey(BUSINESS) };
}

const at = "2026-11-05T10:00:00.000Z";
const user = (id: string, text: string): ChatEntry => ({ id, at, type: "user", text, attachments: [] });

describe("result-kind → conversation entry", () => {
    test.each(Object.keys(RESULTS) as UnderstandResult["kind"][])("%s becomes a result entry", (kind) => {
        const result = RESULTS[kind];
        const entry = entryForResult(REQUEST, result, "r1", "2026-10-23T10:00:00.000Z");
        expect(entry).toMatchObject({ id: "r1", type: "result", request: REQUEST, result });
        // Only a preview has a lifecycle (Confirm / Not now); it starts open.
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

    test("history only when there is some", () => {
        const history = [
            { role: "user" as const, text: "add a booking for Ravi" },
            { role: "assistant" as const, text: "Sure! How many people are coming with Ravi?" },
        ];
        expect(buildRequest("3", BUSINESS, [], history)).toEqual({ text: "3", surface: "partner", business_id: BIZ_ID, history });
        expect("history" in buildRequest("3", BUSINESS, [], [])).toBe(false);
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

describe("the chat so far, as words (history)", () => {
    test("each kind of reply becomes its words", () => {
        expect(replyWords(RESULTS.answer)).toBe("You have 2 bookings today.");
        // No text: the title is what the chat said.
        expect(replyWords({ kind: "answer", title: "Bookings · today", text: null, items: [], link: null })).toBe("Bookings · today");
        expect(replyWords(RESULTS.preview)).toBe("Here it is, look right? Publish Sunrise Yoga");
        expect(replyWords({ ...(RESULTS.preview as Extract<UnderstandResult, { kind: "preview" }>), lead: null })).toBe(
            "Publish Sunrise Yoga"
        );
        expect(replyWords(RESULTS.need)).toBe("Attach the photos.");
        expect(replyWords(RESULTS.choose)).toBe("Which experience did you mean?");
        expect(replyWords(RESULTS.denied)).toBe("Experiences aren't on for Ara cafe.");
        expect(replyWords(RESULTS.unknown)).toBe("I don't know that one yet.");
        expect(replyWords({ kind: "done", message: "Sunrise Yoga is published.", url_path: null })).toBe("Sunrise Yoga is published.");
        expect(replyWords({ kind: "answer", title: " ", text: "  ", items: [], link: null })).toBeNull();
    });

    test("user messages and replies in order; errors, notes and empty text are left out", () => {
        const entries: ChatEntry[] = [
            user("u1", "publish yoga"),
            entryForResult(REQUEST, RESULTS.choose, "r1"),
            user("u2", "Sunrise Yoga"),
            entryForResult(REQUEST, RESULTS.preview, "r2"),
            { id: "d1", at, type: "done", result: { kind: "done", message: "Sunrise Yoga is published.", url_path: null } },
            user("u3", "   "),
            {
                id: "e1",
                at,
                type: "error",
                request: REQUEST,
                error: { kind: "network", message: "Couldn't reach the server.", action: "retry" },
            },
            { id: "n1", at, type: "note", text: "No problem, I've left it as it was." },
            user("u4", "show today's bookings"),
            entryForResult(REQUEST, RESULTS.answer, "r3"),
        ];
        expect(chatHistory(entries)).toEqual([
            { role: "user", text: "publish yoga" },
            { role: "assistant", text: "Which experience did you mean?" },
            { role: "user", text: "Sunrise Yoga" },
            { role: "assistant", text: "Here it is, look right? Publish Sunrise Yoga" },
            { role: "assistant", text: "Sunrise Yoga is published." },
            { role: "user", text: "show today's bookings" },
            { role: "assistant", text: "You have 2 bookings today." },
        ]);
    });

    test("only the last 8 turns, oldest first", () => {
        const entries = Array.from({ length: 12 }, (_, i) => user(`u${i}`, `message ${i}`));
        const turns = chatHistory(entries);
        expect(HISTORY_TURNS).toBe(8);
        expect(turns).toHaveLength(8);
        expect(turns[0]).toEqual({ role: "user", text: "message 4" });
        expect(turns[7]).toEqual({ role: "user", text: "message 11" });
        expect(chatHistory([])).toEqual([]);
    });
});

describe("a question the message box answers", () => {
    const CODE: UnderstandResult = {
        kind: "need",
        slot: "code",
        prompt: "Which booking should I check in?",
        input: "text",
        placeholder: "SK-AB12CD",
    };
    const CHECK_IN: UnderstandRequest = {
        text: "check in",
        surface: "partner",
        business_id: BIZ_ID,
        history: [{ role: "user", text: "hi" }],
    };

    test("the chat's last message, when it's an open text / number / date / time question", () => {
        const need = entryForResult(CHECK_IN, CODE, "need");
        expect(openQuestion([user("u1", "check in"), need])?.id).toBe("need");
        // Answered, skipped, followed by something else, or a photos question: the box sends a new message.
        expect(openQuestion([{ ...need, answered: true }])).toBeNull();
        expect(openQuestion([{ ...need, superseded: true }])).toBeNull();
        expect(openQuestion([need, user("u2", "never mind")])).toBeNull();
        expect(openQuestion([entryForResult(REQUEST, RESULTS.need, "photos")])).toBeNull();
        expect(openQuestion([entryForResult(REQUEST, RESULTS.choose, "choose")])).toBeNull();
        expect(openQuestion([])).toBeNull();
        for (const input of ["number", "date", "time"] as const) {
            expect(openQuestion([entryForResult(CHECK_IN, { ...CODE, input }, "n")])).not.toBeNull();
        }
    });

    test("the typed value is appended to the question's request (the rest of it stays)", () => {
        expect(answerRequest(CHECK_IN, "  SK-AB12CD ")).toEqual({ ...CHECK_IN, text: "check in SK-AB12CD" });
        expect(answerRequest(CHECK_IN, "  ")).toBe(CHECK_IN);
    });

    test("the message box hint: the question's placeholder while it's open", () => {
        expect(composerPlaceholder(openQuestion([entryForResult(CHECK_IN, CODE, "need")]))).toBe("SK-AB12CD");
        expect(composerPlaceholder(openQuestion([entryForResult(CHECK_IN, { ...CODE, placeholder: null }, "n")]))).toBe(
            "Type your answer"
        );
        expect(composerPlaceholder(null)).toBe("Message SeekKrr");
    });
});

describe("what the chat says", () => {
    test("the greeting names the business, or speaks to the creator", () => {
        expect(chatGreeting("Emaho Cafe")).toBe(
            "Hi! I can help with Emaho Cafe's bookings, collabs and experiences. Just tell me what you need, and I'll check with you before changing anything."
        );
        expect(chatGreeting(null)).toMatch(/^Hi! I can help with your quests/);
        expect(chatGreeting("  ")).toMatch(/^Hi! I can help with your business's bookings/);
    });

    test("screen readers hear the words shown: the answer's text, the preview's lead", () => {
        expect(describeEntry(entryForResult(REQUEST, RESULTS.answer))).toBe("You have 2 bookings today.");
        expect(describeEntry(entryForResult(REQUEST, RESULTS.preview))).toBe(
            "Here it is, look right? Publish Sunrise Yoga. Travellers can book it. Confirm, or Not now."
        );
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

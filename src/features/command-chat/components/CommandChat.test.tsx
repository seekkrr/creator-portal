import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Link, MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// The shared client reads the env config; nothing here reaches the network.
vi.mock("@/services/api", () => ({ api: { request: vi.fn(), get: vi.fn() } }));

import { commandsService } from "@services/commands.service";
import type {
    AnswerResult,
    CommandScope,
    CommandTurn,
    PreviewResult,
    UnderstandRequest,
    UnderstandResult,
} from "@services/commands.types";
import { entryForResult, saveChatState, scopeKey, type ChatEntry, type ChatState, type PreviewStatus } from "../chatModel";
import { useCommandChat, type CommandChat as ChatApi } from "../hooks/useCommandChat";
import { AnswerCard } from "./AnswerCard";
import { CommandChat } from "./CommandChat";
import { MessageItem, type MessageHandlers } from "./MessageItem";
import { PortalLink, TypingIndicator } from "./chatUi";

/**
 * No DOM here (vitest runs in node): components render to HTML with
 * react-dom/server, and the chat hook runs inside a server render with the
 * service spied, so its moves (send, pick, retry) show the requests they make.
 */

const BIZ_ID = "64b7f0c2a1b2c3d4e5f60718";
const BUSINESS: CommandScope = { surface: "partner", businessId: BIZ_ID };
const at = "2026-11-05T10:00:00.000Z";
const GREETING = "Hi! I can help with Emaho Cafe's bookings, collabs and experiences.";

const noop = () => {};
const HANDLERS: MessageHandlers = { choose: noop, provideImages: noop, confirm: noop, cancel: noop, retry: noop, insert: noop };

const request = (text: string, history?: CommandTurn[]): UnderstandRequest => ({
    text,
    surface: "partner",
    business_id: BIZ_ID,
    ...(history ? { history } : {}),
});
const user = (id: string, text: string): ChatEntry => ({ id, at, type: "user", text, attachments: [] });

const ANSWER: AnswerResult = {
    kind: "answer",
    title: "Bookings · today",
    text: "You have 2 bookings today, 5 guests in all.",
    items: [],
    link: { url_path: "/business/bookings", label: "Open bookings" },
};
const PREVIEW: PreviewResult = {
    kind: "preview",
    command: "biz.publish_experience",
    title: "Publish Sunrise Yoga",
    summary: "Travellers can book it.",
    changes: [{ label: "Status", before: "Draft", after: "Published" }],
    confirm_label: "Publish",
    danger: false,
    token: "tok",
    lead: "Here it is, look right?",
};
const CODE_NEED: UnderstandResult = {
    kind: "need",
    slot: "code",
    prompt: "Which booking should I check in? Send me its code.",
    input: "text",
    placeholder: "SK-AB12CD",
};
const UNKNOWN: UnderstandResult = {
    kind: "unknown",
    message: "Sorry, I can't help with that one yet.",
    examples: ["show today's bookings", "pause my collab"],
};

function inRouter(node: ReactNode): string {
    return readable(renderToStaticMarkup(<MemoryRouter initialEntries={["/business/chat"]}>{node}</MemoryRouter>));
}

/** Server HTML escapes apostrophes; the checks read the words as shown. */
function readable(html: string): string {
    return html.replace(/&#x27;/g, "'");
}

function message(entry: ChatEntry): string {
    return inRouter(<MessageItem entry={entry} busy={false} autoFocus={false} handlers={HANDLERS} />);
}

/** The whole chat page, as it opens with this conversation saved. */
function chatPage(entries: ChatEntry[] = []): string {
    saveChatState({ entries, startedAt: at, scope: scopeKey(BUSINESS) });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return inRouter(
        <QueryClientProvider client={client}>
            <CommandChat scope={BUSINESS} greeting={GREETING} actingAs={<p>Acting as Emaho Cafe</p>} />
        </QueryClientProvider>
    );
}

/** The chat hook over this saved conversation; its moves call the (spied) service. */
function chatHook(entries: ChatEntry[]): ChatApi {
    const saved: ChatState = { entries, startedAt: at, scope: scopeKey(BUSINESS) };
    saveChatState(saved);
    let api: ChatApi | null = null;
    function Capture() {
        api = useCommandChat({ scope: BUSINESS });
        return null;
    }
    renderToStaticMarkup(<Capture />);
    if (!api) throw new Error("hook did not render");
    return api;
}

/** Walk a rendered element tree (function components that use no hooks are expanded). */
function findElements(node: ReactNode, match: (el: ReactElement) => boolean, out: ReactElement[] = []): ReactElement[] {
    if (Array.isArray(node)) {
        node.forEach((n) => findElements(n as ReactNode, match, out));
        return out;
    }
    if (!isValidElement(node)) return out;
    if (match(node)) out.push(node);
    findElements((node.props as { children?: ReactNode }).children, match, out);
    return out;
}

let understand: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
    });
    // Demo data off.
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: noop, removeItem: noop });
    understand = vi.spyOn(commandsService, "understand").mockResolvedValue({ ...ANSWER });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("history goes with a newly typed message", () => {
    const CONVERSATION: ChatEntry[] = [
        user("u1", "show today's bookings"),
        entryForResult(request("show today's bookings"), ANSWER, "r1"),
        user("u2", "publish yoga"),
        { ...entryForResult(request("publish yoga"), PREVIEW, "r2"), status: "confirmed" },
        { id: "d1", at, type: "done", result: { kind: "done", message: "Sunrise Yoga is published.", url_path: null } },
        { id: "n1", at, type: "note", text: "No problem, I've left it as it was." },
    ];

    test("the chat so far, oldest first, as each message's words", () => {
        const chat = chatHook(CONVERSATION);
        expect(chat.send("thanks! now pause my collab")).toBe(true);
        expect(understand).toHaveBeenCalledTimes(1);
        expect(understand.mock.calls[0]?.[0]).toEqual({
            text: "thanks! now pause my collab",
            surface: "partner",
            business_id: BIZ_ID,
            history: [
                { role: "user", text: "show today's bookings" },
                { role: "assistant", text: "You have 2 bookings today, 5 guests in all." },
                { role: "user", text: "publish yoga" },
                { role: "assistant", text: "Here it is, look right? Publish Sunrise Yoga" },
                { role: "assistant", text: "Sunrise Yoga is published." },
            ],
        });
    });

    test("only the last 8 turns", () => {
        const long = Array.from({ length: 12 }, (_, i) => user(`u${i}`, `message ${i}`));
        chatHook(long).send("one more");
        const sent = understand.mock.calls[0]?.[0] as UnderstandRequest;
        expect(sent.history).toHaveLength(8);
        expect(sent.history?.[0]).toEqual({ role: "user", text: "message 4" });
    });

    test("the first message of a chat has none", () => {
        chatHook([]).send("hi");
        expect(understand.mock.calls[0]?.[0]).toEqual({ text: "hi", surface: "partner", business_id: BIZ_ID });
    });

    test("a tapped option re-sends its message as it was, with the pick (no new turns)", () => {
        const original = request("publish yoga", [{ role: "user", text: "hi" }]);
        const choose: UnderstandResult = {
            kind: "choose",
            slot: "experience",
            prompt: "Which one, Sunrise Yoga or Sunset Yoga?",
            options: [
                { id: "ex1", label: "Sunrise Yoga", sublabel: null, image_url: null },
                { id: "ex2", label: "Sunset Yoga", sublabel: null, image_url: null },
            ],
        };
        const chat = chatHook([user("u0", "hi"), user("u1", "publish yoga"), entryForResult(original, choose, "c1")]);
        chat.choose("c1", { id: "ex2", label: "Sunset Yoga", sublabel: null, image_url: null });
        expect(understand.mock.calls[0]?.[0]).toEqual({ ...original, picks: { experience: "ex2" } });
    });

    test("Retry repeats the same request", () => {
        const failed = request("show today's bookings");
        const chat = chatHook([
            user("u1", "show today's bookings"),
            { id: "e1", at, type: "error", request: failed, error: { kind: "network", message: "Couldn't reach the server.", action: "retry" } },
        ]);
        chat.retry("e1");
        expect(understand.mock.calls[0]?.[0]).toEqual(failed);
    });
});

describe("a question is answered from the message box", () => {
    const checkIn = request("check in", [{ role: "user", text: "hi" }]);
    const OPEN: ChatEntry[] = [user("u1", "check in"), entryForResult(checkIn, CODE_NEED, "need1")];

    test("typing the answer sends it through the question: appended to its request", () => {
        const chat = chatHook(OPEN);
        expect(chat.send("SK-AB12CD")).toBe(true);
        expect(understand).toHaveBeenCalledTimes(1);
        expect(understand.mock.calls[0]?.[0]).toEqual({ ...checkIn, text: "check in SK-AB12CD" });
    });

    test("with photos attached, or once answered, it's a new message instead", () => {
        const photo = { url: "https://img.seekkrr.com/x.webp", kind: "image" as const };
        chatHook(OPEN).send("add these to my place", [photo]);
        expect(understand.mock.calls[0]?.[0]).toMatchObject({ text: "add these to my place", attachments: [photo] });

        understand.mockClear();
        const answered = [user("u1", "check in"), { ...entryForResult(checkIn, CODE_NEED, "need1"), answered: true }];
        chatHook(answered).send("show today's bookings");
        expect(understand.mock.calls[0]?.[0]).toMatchObject({ text: "show today's bookings" });
        expect((understand.mock.calls[0]?.[0] as UnderstandRequest).history).toEqual([
            { role: "user", text: "check in" },
            { role: "assistant", text: "Which booking should I check in? Send me its code." },
        ]);
    });

    test("the question is a plain message; the message box shows its placeholder, with no input in the bubble", () => {
        const html = chatPage(OPEN);
        expect(html).toContain("Which booking should I check in? Send me its code.");
        expect(html).toMatch(/<textarea[^>]*placeholder="SK-AB12CD"/);
        // Only the message box takes text, and it has the only Send button.
        expect(html).not.toMatch(/<input[^>]*type="(text|number)"/);
        expect(html.match(/aria-label="Send"/g)).toHaveLength(1);
    });

    test("a day or time question keeps a small Pick button; photos keep their picker", () => {
        const date = message(entryForResult(checkIn, { ...CODE_NEED, input: "date", placeholder: null }, "n1"));
        expect(date).toContain("Pick a date");
        expect(date).not.toContain("Tomorrow");
        expect(message(entryForResult(checkIn, { ...CODE_NEED, input: "time" }, "n2"))).toContain("Pick a time");
        const photos = message(entryForResult(checkIn, { ...CODE_NEED, input: "images", prompt: "Which photos?" }, "n3"));
        expect(photos).toContain("Choose photos");
        // Answered: just the question.
        const answered = message({ ...entryForResult(checkIn, { ...CODE_NEED, input: "date" }, "n4"), answered: true });
        expect(answered).not.toContain("Pick a date");
    });
});

describe("an answer: the chat's words, a few cards, one link", () => {
    test("the link is one small router link to the portal screen", () => {
        const html = inRouter(<AnswerCard result={ANSWER} />);
        expect(html).toContain("You have 2 bookings today, 5 guests in all.");
        // The title only shows when there's no text.
        expect(html).not.toContain("Bookings · today");
        expect(html.match(/<a /g)).toHaveLength(1);
        expect(html).toMatch(/<a [^>]*href="\/business\/bookings"[^>]*>Open bookings/);
    });

    test("clicking it navigates inside the portal with react-router", () => {
        // AnswerCard → PortalLink → react-router's <Link to="/business/bookings"> (client-side, no reload).
        const [portalLink] = findElements(AnswerCard({ result: ANSWER }), (el) => el.type === PortalLink);
        expect(portalLink?.props).toMatchObject({ to: "/business/bookings" });
        const link = PortalLink(portalLink?.props as Parameters<typeof PortalLink>[0]);
        expect(link.type).toBe(Link);
        expect(link.props).toMatchObject({ to: "/business/bookings" });
    });

    test("no text: the title is the message; only portal links open; at most 3 cards", () => {
        const items = Array.from({ length: 5 }, (_, i) => ({ label: `Booking ${i + 1}`, sublabel: null, url_path: null, image_url: null }));
        const html = inRouter(
            <AnswerCard result={{ ...ANSWER, text: null, items, link: { url_path: "https://seekkrr.com/help", label: "Help" } }} />
        );
        expect(html).toContain("Bookings · today");
        expect(html).toContain("Booking 3");
        expect(html).not.toContain("Booking 4");
        expect(html).not.toContain("Help");
        expect(html).not.toContain("<a ");
    });
});

describe("a preview: the chat's lead, then the confirm card", () => {
    const preview = (status: PreviewStatus = "open") => message({ ...entryForResult(request("publish yoga"), PREVIEW, "p1"), status });

    test("the lead is a message right above the card", () => {
        const html = preview();
        expect(html).toContain("Here it is, look right?");
        expect(html.indexOf("Here it is, look right?")).toBeLessThan(html.indexOf("Publish Sunrise Yoga"));
        expect(html).toContain(">Publish<");
        expect(html).toContain("Not now");
        expect(html).not.toContain("Cancel");
        // No lead: just the card.
        expect(message(entryForResult(request("publish yoga"), { ...PREVIEW, lead: null }, "p2"))).not.toContain("look right");
    });

    test("Done when confirmed, Skipped when not; no spinner while it runs", () => {
        expect(preview("confirmed")).toContain("Done");
        expect(preview("cancelled")).toContain("Skipped");
        const running = preview("running");
        expect(running).not.toContain("Working");
        expect(running).not.toContain("animate-spin");
    });
});

describe("no suggestions; it reads like a conversation", () => {
    test("the empty chat opens with a hello, not a heading or starter chips", () => {
        const html = chatPage();
        expect(html).toContain(GREETING);
        expect(html).not.toContain("What do you want to do?");
        expect(html).not.toContain("What can I do?");
        expect(html).not.toContain("What you can do");
        expect(html).not.toContain('aria-label="Examples"');
        expect(html).not.toMatch(/role="(combobox|listbox|option)"/);
        expect(html).toMatch(/<textarea[^>]*placeholder="Message SeekKrr"/);
    });

    test("unknown and denied show just the message, with no example chips", () => {
        const unknown = message(entryForResult(request("dance"), UNKNOWN, "u1"));
        expect(unknown).toContain("Sorry, I can't help with that one yet.");
        expect(unknown).not.toContain("show today");
        expect(unknown).not.toContain("pause my collab");
        expect(unknown).not.toContain("<button");
        const page = chatPage([user("u0", "dance"), entryForResult(request("dance"), UNKNOWN, "u1")]);
        expect(page).not.toContain("pause my collab");
        expect(message(entryForResult(request("delete emaho"), { kind: "denied", message: "I can't delete things." }, "d1"))).not.toContain(
            "<button"
        );
    });

    test("messages have no status icons", () => {
        const bubbles = [
            message(entryForResult(request("dance"), UNKNOWN, "u1")),
            message(entryForResult(request("delete"), { kind: "denied", message: "I can't delete things." }, "d1")),
            message({ id: "d2", at, type: "done", result: { kind: "done", message: "Sunrise Yoga is published.", url_path: null } }),
            message({
                id: "e1",
                at,
                type: "error",
                request: request("x"),
                error: { kind: "network", message: "Couldn't reach the server.", action: "retry" },
            }),
        ];
        for (const html of bubbles) expect(html).not.toContain("<svg");
    });

    test("the chat typing is three dots, not a spinner with text", () => {
        const html = renderToStaticMarkup(<TypingIndicator />);
        expect(html.match(/animate-bounce/g)).toHaveLength(3);
        expect(html).not.toContain("animate-spin");
        expect(html).not.toContain("Working");
    });
});

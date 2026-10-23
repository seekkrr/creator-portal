/**
 * Local stand-in for /api/v2/commands/* (surface "partner") — follows the shared
 * contract so the chat can be built and demoed before the backend lands. Loaded
 * lazily by commands.service.ts only when the mock is switched on.
 *
 * Business area (business_id sent): "show today's bookings", "check in SK-AB12CD",
 * "publish yoga", "pause my collab", "add photos to my place", "set opening hours 9am–9pm",
 * "what needs me", "delete emaho". Creator area (no business_id): "add photos to Bir",
 * "show my quests", "submit quest Bir monastery trail". Both: "simulate expired",
 * "simulate network error".
 */
import { CommandsApiError } from "@services/commands.service";
import type {
    CatalogCommand,
    ChooseOption,
    CommandAttachment,
    CommandHistoryItem,
    CommandScope,
    CommandSuggestion,
    DoneResult,
    UnderstandRequest,
    UnderstandResult,
} from "@services/commands.types";

// ── Fake records ───────────────────────────────────────────

function thumb(initials: string, color: string): string {
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="20" fill="${color}"/>` +
        `<text x="48" y="58" font-family="Arial,sans-serif" font-size="32" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface Rec extends ChooseOption {
    url: string;
}

/** The business's own places (business area). */
const PLACES: Rec[] = [
    { id: "pl_emaho_bir", label: "Emaho Cafe", sublabel: "Cafe · Bir", image_url: thumb("EC", "#1f6f6a"), url: "/business/locations" },
    { id: "pl_emaho_dsl", label: "Emaho Bakery", sublabel: "Bakery · Dharamshala", image_url: thumb("EB", "#0d524e"), url: "/business/locations" },
];

const EXPERIENCES: Rec[] = [
    { id: "ex_sunrise_yoga", label: "Sunrise Yoga", sublabel: "Draft · 60 min", image_url: thumb("SY", "#f59e0b"), url: "/business/experiences/ex_sunrise_yoga" },
    { id: "ex_sunset_yoga", label: "Sunset Yoga", sublabel: "Published · 60 min", image_url: thumb("SS", "#ff5b25"), url: "/business/experiences/ex_sunset_yoga" },
    { id: "ex_momo", label: "Momo making class", sublabel: "Published · 90 min", image_url: thumb("MM", "#e64a17"), url: "/business/experiences/ex_momo" },
];

/** The creator's own markers and quests (creator area). */
const MARKERS: Rec[] = [
    { id: "mk_bir_landing", label: "Bir landing site", sublabel: "Marker · Bir", image_url: thumb("BL", "#1f6f6a"), url: "/creator/markers/view/mk_bir_landing" },
    { id: "mk_bir_monastery", label: "Bir monastery", sublabel: "Marker · Bir", image_url: thumb("BM", "#084340"), url: "/creator/markers/view/mk_bir_monastery" },
];

const QUESTS: Rec[] = [
    { id: "qu_bir_trail", label: "Bir monastery trail", sublabel: "Draft · 6 stops", image_url: thumb("BT", "#3f8b86"), url: "/creator/quest/view/qu_bir_trail" },
];

type SlotKind = "place" | "experience" | "marker" | "quest";
const POOLS: Record<SlotKind, Rec[]> = { place: PLACES, experience: EXPERIENCES, marker: MARKERS, quest: QUESTS };
const SLOT_WORD: Record<SlotKind, string> = { place: "place", experience: "experience", marker: "place", quest: "quest" };

// ── Helpers ────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const latency = () => delay(250 + Math.random() * 350);
const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function find(kind: SlotKind, raw: string): Rec[] {
    const q = norm(raw);
    const pool = POOLS[kind];
    const exact = pool.filter((r) => r.id === raw.trim() || norm(r.label) === q);
    if (exact.length) return exact;
    const prefix = pool.filter((r) => norm(r.label).startsWith(q));
    if (prefix.length) return prefix;
    return pool.filter((r) => norm(r.label).includes(q) || norm(r.sublabel ?? "").includes(q));
}

type Resolved = { rec: Rec } | { result: UnderstandResult };

/** Resolve a slot from picks or text: one match → record; several (or "my …") → choose; none → unknown. */
function resolve(kind: SlotKind, raw: string | undefined, req: UnderstandRequest): Resolved {
    const picked = req.picks?.[kind];
    if (picked) {
        const rec = POOLS[kind].find((r) => r.id === picked);
        if (rec) return { rec };
    }
    const q = (raw ?? "").trim().replace(/^(the|my|our) /, "").replace(/^(place|experience|quest)$/, "");
    const matches = q ? find(kind, q) : POOLS[kind];
    if (matches.length === 1 && matches[0]) return { rec: matches[0] };
    if (matches.length > 1) {
        return {
            result: {
                kind: "choose",
                slot: kind,
                prompt: `Which ${SLOT_WORD[kind]}${q ? " did you mean" : ""}?`,
                options: matches.map(({ id, label, sublabel, image_url }) => ({ id, label, sublabel, image_url })),
            },
        };
    }
    return {
        result: {
            kind: "unknown",
            message: `I couldn't find a ${SLOT_WORD[kind]} of yours called “${q}”.`,
            examples: POOLS[kind].slice(0, 2).map((r) => (kind === "experience" ? `publish ${r.label}` : `add photos to ${r.label}`)),
        },
    };
}

interface TokenBody {
    command: string;
    done: string;
    url: string | null;
    exp: number;
}

function sign(body: Omit<TokenBody, "exp">, ttlMs = 10 * 60_000): string {
    return `mock.${encodeURIComponent(JSON.stringify({ ...body, exp: Date.now() + ttlMs }))}`;
}

function preview(
    command: string,
    title: string,
    summary: string,
    changes: { label: string; before: string | null; after: string | null }[],
    confirm_label: string,
    done: { message: string; url: string | null },
    danger = false,
    ttlMs?: number
): UnderstandResult {
    return { kind: "preview", command, title, summary, changes, confirm_label, danger, token: sign({ command, done: done.message, url: done.url }, ttlMs) };
}

function photosPreview(rec: Rec, req: UnderstandRequest, command: string): UnderstandResult {
    if (!req.attachments?.length) {
        return { kind: "need", slot: "images", prompt: `Attach the photos to add to ${rec.label}.`, input: "images", placeholder: null };
    }
    const n = req.attachments.length;
    return preview(command, `Add ${plural(n, "photo")} to ${rec.label}`, "They'll show after its current photos.",
        [{ label: "Photos", before: "4", after: String(4 + n) }], "Add photos",
        { message: `Added ${plural(n, "photo")} to ${rec.label}.`, url: rec.url });
}

const BUSINESS_EXAMPLES = ["show today's bookings", "publish Sunrise Yoga", "pause my collab", "add photos to my place"];
const CREATOR_EXAMPLES = ["show my quests", "add photos to Bir monastery", "submit quest Bir monastery trail"];

// ── Endpoints ──────────────────────────────────────────────

export async function mockUnderstand(req: UnderstandRequest): Promise<UnderstandResult> {
    await latency();
    const text = norm(req.text);
    const business = Boolean(req.business_id);
    let m: RegExpMatchArray | null;

    if (text.includes("simulate network error")) throw new CommandsApiError("network", "Couldn't reach the server. Check your connection and try again.");
    if (text.includes("simulate server error")) throw new CommandsApiError("server", "Something went wrong on the server. Try again in a moment.", 500);
    if (text.includes("simulate expired")) {
        return preview("demo.expired", "Demo: an expired preview", "Confirming this shows what happens when a preview has expired.", [], "Confirm", { message: "", url: null }, false, -1);
    }
    if (/^(delete|remove) /.test(text)) {
        return { kind: "denied", message: "Deleting isn't something the chat can do. Open it in the portal and delete it there." };
    }

    if (!business) {
        // ── Creator area ──
        if (/^(show )?(me )?my quests$/.test(text)) {
            return {
                kind: "answer",
                title: "Your quests",
                text: null,
                items: QUESTS.map((q) => ({ label: q.label, sublabel: q.sublabel, url_path: q.url, image_url: q.image_url })),
            };
        }
        if ((m = text.match(/^(?:add|upload) (?:images|photos|pictures) (?:to|on|for) ?(.*)$/))) {
            const r = resolve("marker", m[1], req);
            return "result" in r ? r.result : photosPreview(r.rec, req, "me.add_photos");
        }
        if ((m = text.match(/^submit (?:quest )?(.*)$/))) {
            const r = resolve("quest", m[1], req);
            if ("result" in r) return r.result;
            return preview("me.submit_quest", `Submit ${r.rec.label} for review`, "SeekKrr reviews it before it goes live in the app.",
                [{ label: "Status", before: "Draft", after: "In review" }], "Submit for review",
                { message: `${r.rec.label} is in review.`, url: r.rec.url });
        }
        if (/\b(bookings?|collabs?|experiences?|check in)\b/.test(text)) {
            return { kind: "denied", message: "That's a business command. Switch to your business to run it." };
        }
        return { kind: "unknown", message: "I don't know that one yet. Try one of these:", examples: CREATOR_EXAMPLES };
    }

    // ── Business area ──
    if (text === "what needs me" || text === "what needs me?" || text === "today") {
        return {
            kind: "answer",
            title: "Waiting for you",
            text: "Here's what's pending right now.",
            items: [
                { label: "2 collab requests", sublabel: "Oldest from yesterday", url_path: "/business/requests", image_url: null },
                { label: "5 bookings today", sublabel: "First at 7:00 AM", url_path: "/business/bookings", image_url: null },
                { label: "Help centre", sublabel: "Opens outside the portal — no link here", url_path: "https://seekkrr.com/help", image_url: null },
            ],
        };
    }

    if ((m = text.match(/^(?:show )?(?:me )?(?:the |my |our )?(?:(today|tomorrow)'?s? )?bookings(?: (?:for|on) (today|tomorrow|\d{4}-\d{2}-\d{2}))?$/))) {
        const when = m[1] ?? m[2];
        if (!when) return { kind: "need", slot: "when", prompt: "Bookings for which day?", input: "date", placeholder: null };
        return {
            kind: "answer",
            title: `Bookings · ${when}`,
            text: "2 bookings, 5 guests.",
            items: [
                { label: "Riya Sharma · 2 guests", sublabel: "Sunrise Yoga · 7:00 AM · SK-QW0QQA", url_path: "/business/bookings", image_url: null },
                { label: "Rohan Mehta · 3 guests", sublabel: "Momo making class · 4:00 PM · SK-AB12CD", url_path: "/business/bookings", image_url: null },
            ],
        };
    }

    if ((m = text.match(/^check in (?:the )?(?:booking |guest |code )?(sk-[a-z0-9]+)?$/))) {
        const code = m[1]?.toUpperCase();
        if (!code) return { kind: "need", slot: "code", prompt: "Which booking code? (e.g. SK-AB12CD)", input: "text", placeholder: "SK-AB12CD" };
        return preview("biz.check_in", `Check in ${code}`, "Rohan Mehta · 3 guests · Momo making class, today 4:00 PM.",
            [{ label: "Checked in", before: "No", after: "Yes" }], "Check in", { message: `${code} is checked in.`, url: "/business/bookings" });
    }

    if ((m = text.match(/^(publish|pause) (?:the |my |our )?(?:experience )?(.*)$/)) && !/collab/.test(m[2] ?? "")) {
        const publish = m[1] === "publish";
        const r = resolve("experience", m[2], req);
        if ("result" in r) return r.result;
        return preview(`biz.${m[1]}_experience`, `${publish ? "Publish" : "Pause"} ${r.rec.label}`,
            publish ? "Travellers can find and book it in the app." : "It stops taking new bookings. Existing bookings stay.",
            [{ label: "Status", before: publish ? "Draft" : "Published", after: publish ? "Published" : "Paused" }], publish ? "Publish" : "Pause",
            { message: `${r.rec.label} is ${publish ? "published" : "paused"}.`, url: r.rec.url }, !publish);
    }

    if (/^(pause|resume|complete) (?:the |my |our )?collab/.test(text)) {
        const verb = text.split(" ")[0] ?? "pause";
        const after = { pause: "Paused", resume: "Active", complete: "Completed" }[verb as "pause" | "resume" | "complete"];
        return preview(`biz.${verb}_collab`, `${verb.replace(/^\w/, (c) => c.toUpperCase())} your collab “2 reels for a free stay”`,
            verb === "pause" ? "Creators can't redeem it until you resume it." : verb === "complete" ? "It closes for good. Content already sent stays." : "Creators can redeem it again.",
            [{ label: "Status", before: verb === "resume" ? "Paused" : "Active", after }], `${verb.replace(/^\w/, (c) => c.toUpperCase())} collab`,
            { message: `Your collab is ${after.toLowerCase()}.`, url: "/business/collabs" }, verb === "complete");
    }

    if ((m = text.match(/^(?:add|upload) (?:some |new )?(?:images|photos|pictures)(?: (?:to|on|for) (.*))?$/))) {
        const r = resolve("place", m[1], req);
        return "result" in r ? r.result : photosPreview(r.rec, req, "biz.add_photos");
    }

    if ((m = text.match(/^set (?:the |my |our )?(?:opening )?hours(?: to)? ?(.*)$/))) {
        const hours = m[1]?.trim();
        if (!hours) return { kind: "need", slot: "hours", prompt: "From when to when? (e.g. 9am–9pm)", input: "text", placeholder: "9am–9pm" };
        const r = resolve("place", undefined, req);
        if ("result" in r) return r.result;
        return preview("biz.set_hours", `Set opening hours of ${r.rec.label}`, r.rec.sublabel ?? "",
            [{ label: "Opening hours", before: "10am–8pm", after: hours }], "Save hours",
            { message: `${r.rec.label} is open ${hours}.`, url: r.rec.url });
    }

    return { kind: "unknown", message: "I don't know that one yet. Try one of these:", examples: BUSINESS_EXAMPLES };
}

export async function mockRun(token: string): Promise<DoneResult> {
    await latency();
    let body: TokenBody | null = null;
    try {
        body = JSON.parse(decodeURIComponent(token.replace(/^mock\./, ""))) as TokenBody;
    } catch {
        body = null;
    }
    if (!body || body.exp < Date.now()) {
        throw new CommandsApiError("expired", "This preview expired. Send the command again.", 400);
    }
    return { kind: "done", message: body.done, url_path: body.url };
}

const BUSINESS_TEMPLATES: { prefix: string; slot: SlotKind | null; hint: string }[] = [
    { prefix: "show today's bookings", slot: null, hint: "Experiences" },
    { prefix: "show bookings for tomorrow", slot: null, hint: "Experiences" },
    { prefix: "check in ", slot: null, hint: "Experiences" },
    { prefix: "publish ", slot: "experience", hint: "Experiences" },
    { prefix: "pause ", slot: "experience", hint: "Experiences" },
    { prefix: "pause my collab", slot: null, hint: "Collabs" },
    { prefix: "resume my collab", slot: null, hint: "Collabs" },
    { prefix: "add photos to ", slot: "place", hint: "My places" },
    { prefix: "set opening hours 9am–9pm", slot: null, hint: "My places" },
    { prefix: "what needs me", slot: null, hint: "Today" },
];

const CREATOR_TEMPLATES: { prefix: string; slot: SlotKind | null; hint: string }[] = [
    { prefix: "show my quests", slot: null, hint: "Quests" },
    { prefix: "submit quest ", slot: "quest", hint: "Quests" },
    { prefix: "add photos to ", slot: "marker", hint: "My places" },
];

export async function mockSuggest(q: string, scope: CommandScope): Promise<CommandSuggestion[]> {
    await delay(80);
    const query = q.toLowerCase().replace(/\s+/g, " ").trimStart();
    if (!query.trim()) return [];
    const out: CommandSuggestion[] = [];
    for (const t of scope.businessId ? BUSINESS_TEMPLATES : CREATOR_TEMPLATES) {
        if (t.slot && query.startsWith(t.prefix)) {
            const partial = norm(query.slice(t.prefix.length));
            for (const rec of POOLS[t.slot]) {
                const name = norm(rec.label);
                if (partial && !name.startsWith(partial) && !name.includes(partial)) continue;
                out.push({ text: `${t.prefix}${rec.label}`, label: `${t.prefix}${rec.label}`, hint: rec.sublabel });
            }
        } else if (t.prefix.startsWith(query) && t.prefix.trim() !== query.trim()) {
            out.push({ text: t.prefix, label: t.slot ? `${t.prefix.trim()} …` : t.prefix, hint: t.hint });
        }
    }
    return out.slice(0, 8);
}

export async function mockHistory(): Promise<CommandHistoryItem[]> {
    await latency();
    const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
    return [
        { at: ago(190), text: "publish Sunset Yoga", command: "biz.publish_experience", message: "Sunset Yoga is published.", status: "done" },
        { at: ago(125), text: "add photos to Emaho Cafe", command: "biz.add_photos", message: "Added 3 photos to Emaho Cafe.", status: "done" },
        { at: ago(40), text: "pause my collab", command: "biz.pause_collab", message: "This preview expired. Send the command again.", status: "failed" },
    ];
}

export async function mockCatalog(scope: CommandScope): Promise<CatalogCommand[]> {
    await latency();
    if (!scope.businessId) {
        return [
            { id: "me.quests", label: "See your quests", examples: ["show my quests"], area: "Quests" },
            { id: "me.submit_quest", label: "Submit a quest for review", examples: ["submit quest Bir monastery trail"], area: "Quests" },
            { id: "me.add_photos", label: "Add photos to your place", examples: ["add photos to Bir monastery"], area: "My places" },
        ];
    }
    return [
        { id: "biz.needs_me", label: "See what's waiting for you", examples: ["what needs me"], area: "Today" },
        { id: "biz.today_bookings", label: "Show bookings for a day", examples: ["show today's bookings", "show bookings for tomorrow"], area: "My business" },
        { id: "biz.check_in", label: "Check in a booking", examples: ["check in SK-AB12CD"], area: "My business" },
        { id: "biz.publish_experience", label: "Publish or pause an experience", examples: ["publish Sunrise Yoga", "pause Momo making class"], area: "My business" },
        { id: "biz.pause_collab", label: "Pause or resume your collab", examples: ["pause my collab", "resume my collab"], area: "My business" },
        { id: "biz.add_photos", label: "Add photos to your place", examples: ["add photos to my place"], area: "My places" },
        { id: "biz.set_hours", label: "Set opening hours", examples: ["set opening hours 9am–9pm"], area: "My places" },
    ];
}

/** Pretend upload: a local preview URL after a short wait. */
export async function mockUpload(file: File): Promise<CommandAttachment> {
    await delay(500 + Math.random() * 700);
    if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
    return { url: URL.createObjectURL(file), kind: "image" };
}

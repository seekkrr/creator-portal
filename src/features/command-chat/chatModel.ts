import type {
    CommandAttachment,
    CommandScope,
    CommandsErrorKind,
    CommandTurn,
    DoneResult,
    NeedResult,
    UnderstandRequest,
    UnderstandResult,
} from "@services/commands.types";

/**
 * Conversation model for the command chat. Pure data + a reducer so the hook
 * stays small and the whole thing can live in sessionStorage.
 */

/** What an error offers: repeat the same call, re-send the text fresh, put the text back in the composer, or nothing. */
export type ErrorAction = "retry" | "resend" | "edit" | null;

export interface EntryError {
    kind: CommandsErrorKind;
    message: string;
    action: ErrorAction;
}

export type PreviewStatus = "open" | "running" | "confirmed" | "cancelled" | "failed";

interface Base {
    id: string;
    at: string;
}

export interface UserEntry extends Base {
    type: "user";
    text: string;
    attachments: CommandAttachment[];
}

export interface ResultEntry extends Base {
    type: "result";
    /** The request that produced this result — follow-ups (picks, values, images) build on it. */
    request: UnderstandRequest;
    result: UnderstandResult;
    /** choose: the option the user picked. */
    pickedId?: string;
    /** need: answered already. */
    answered?: boolean;
    /** choose/need left unanswered when the user typed something else. */
    superseded?: boolean;
    /** preview lifecycle. */
    status?: PreviewStatus;
    /** preview: why Confirm failed. */
    error?: EntryError;
}

export interface DoneEntry extends Base {
    type: "done";
    result: DoneResult;
}

export interface ErrorEntry extends Base {
    type: "error";
    error: EntryError;
    request: UnderstandRequest;
    /** Retry / Send again already used. */
    resolved?: boolean;
}

export interface NoteEntry extends Base {
    type: "note";
    text: string;
}

export type ChatEntry = UserEntry | ResultEntry | DoneEntry | ErrorEntry | NoteEntry;

export interface ChatState {
    entries: ChatEntry[];
    /** When this conversation began — history before it is shown as "Earlier". */
    startedAt: string;
    /** Who the conversation acts as (see scopeKey) — another workspace starts a fresh one. */
    scope: string;
}

export type ChatAction =
    | { type: "add"; entry: ChatEntry }
    | { type: "patch"; id: string; patch: Partial<ResultEntry> & Partial<ErrorEntry> }
    /** A new message makes open choose/need prompts stale. */
    | { type: "supersede" }
    | { type: "reset"; startedAt: string };

const MAX_ENTRIES = 80;

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
    switch (action.type) {
        case "add": {
            const entries = [...state.entries, action.entry];
            return { ...state, entries: entries.length > MAX_ENTRIES ? entries.slice(-MAX_ENTRIES) : entries };
        }
        case "patch":
            return {
                ...state,
                entries: state.entries.map((e) => (e.id === action.id ? ({ ...e, ...action.patch } as ChatEntry) : e)),
            };
        case "supersede":
            return {
                ...state,
                entries: state.entries.map((e) =>
                    e.type === "result" &&
                    (e.result.kind === "choose" || e.result.kind === "need") &&
                    !e.pickedId &&
                    !e.answered &&
                    !e.superseded
                        ? { ...e, superseded: true }
                        : e
                ),
            };
        case "reset":
            return { entries: [], startedAt: action.startedAt, scope: state.scope };
    }
}

let seq = 0;
export function newId(prefix = "m"): string {
    seq += 1;
    return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`;
}

export const nowIso = () => new Date().toISOString();

// ── Scope / requests ───────────────────────────────────────

/** Stable key for who the chat acts as: "business:<id>" or "creator". */
export function scopeKey(scope: CommandScope): string {
    return scope.businessId ? `business:${scope.businessId}` : "creator";
}

/**
 * The understand request for a typed message: always the surface; business_id
 * only in the business area (the creator area runs creator commands); the chat
 * so far (see chatHistory) when there is any.
 */
export function buildRequest(
    text: string,
    scope: CommandScope,
    attachments: CommandAttachment[] = [],
    history: CommandTurn[] = []
): UnderstandRequest {
    const request: UnderstandRequest = { text: text.trim(), surface: scope.surface };
    if (scope.businessId) request.business_id = scope.businessId;
    if (attachments.length) request.attachments = attachments;
    if (history.length) request.history = history;
    return request;
}

// ── Conversation history ───────────────────────────────────

/** How many earlier messages go with each newly typed one, so the chat can follow along. */
export const HISTORY_TURNS = 8;

function spoken(result: UnderstandResult | DoneResult): string | null {
    switch (result.kind) {
        case "answer":
            return result.text?.trim() || result.title;
        case "preview":
            return [result.lead, result.title].filter((s): s is string => Boolean(s && s.trim())).map((s) => s.trim()).join(" ");
        case "need":
        case "choose":
            return result.prompt;
        case "denied":
        case "unknown":
        case "done":
            return result.message;
    }
}

/**
 * What the chat said in a reply, as plain words (null: nothing to remember).
 * answer: its text (the title when there's none); preview: lead + title;
 * need/choose: the question; denied/unknown/done: the message.
 */
export function replyWords(result: UnderstandResult | DoneResult): string | null {
    const said = spoken(result)?.trim();
    return said ? said : null;
}

/**
 * The chat so far as plain words, oldest first, the last `max` turns: every
 * user message's text and every reply's words. Errors and notes are left out.
 */
export function chatHistory(entries: ChatEntry[], max = HISTORY_TURNS): CommandTurn[] {
    const turns: CommandTurn[] = [];
    for (const e of entries) {
        if (e.type === "user") {
            if (e.text.trim()) turns.push({ role: "user", text: e.text.trim() });
        } else if (e.type === "result" || e.type === "done") {
            const said = replyWords(e.result);
            if (said) turns.push({ role: "assistant", text: said });
        }
    }
    return max > 0 ? turns.slice(-max) : [];
}

// ── Questions the message box answers ──────────────────────

export type OpenNeedEntry = ResultEntry & { result: NeedResult };

/**
 * The chat's last message when it's a question the message box answers (a
 * name, a number, a day, a time) and nobody answered it yet. Photos are picked
 * in the bubble instead.
 */
export function openQuestion(entries: ChatEntry[]): OpenNeedEntry | null {
    const last = entries[entries.length - 1];
    if (!last || last.type !== "result" || last.result.kind !== "need") return null;
    if (last.result.input === "images" || last.answered || last.superseded) return null;
    return last as OpenNeedEntry;
}

/** The need's request again with the typed value appended (the engine reads it as the rest of the command). */
export function answerRequest(request: UnderstandRequest, value: string): UnderstandRequest {
    const clean = value.trim();
    return clean ? { ...request, text: `${request.text.trim()} ${clean}` } : request;
}

export const MESSAGE_PLACEHOLDER = "Message SeekKrr";

/** The message box hint: the open question's placeholder, else the usual one. */
export function composerPlaceholder(question: OpenNeedEntry | null): string {
    if (!question) return MESSAGE_PLACEHOLDER;
    return question.result.placeholder?.trim() || "Type your answer";
}

/**
 * The conversation entry for a server result. Every kind becomes a "result"
 * entry; only a preview carries a lifecycle (it starts "open").
 */
export function entryForResult(request: UnderstandRequest, result: UnderstandResult, id = newId("r"), at = nowIso()): ResultEntry {
    const entry: ResultEntry = { id, at, type: "result", request, result };
    if (result.kind === "preview") entry.status = "open";
    return entry;
}

// ── Session persistence ────────────────────────────────────

const STORAGE_KEY = "seekkrr_partner_command_chat_v1";

export function freshChatState(scope: string): ChatState {
    return { entries: [], startedAt: nowIso(), scope };
}

/** The saved conversation for this scope; a different workspace (or nothing saved) starts fresh. */
export function loadChatState(scope: string): ChatState {
    const fresh = freshChatState(scope);
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return fresh;
        const parsed = JSON.parse(raw) as Partial<ChatState>;
        if (!Array.isArray(parsed.entries) || typeof parsed.startedAt !== "string" || parsed.scope !== scope) return fresh;
        // A reload mid-request leaves nothing in flight.
        const entries = parsed.entries.map((e) =>
            e.type === "result" && e.status === "running" ? { ...e, status: "open" as const } : e
        );
        return { entries, startedAt: parsed.startedAt, scope };
    } catch {
        return fresh;
    }
}

export function saveChatState(state: ChatState): void {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        /* storage full / blocked — the conversation just won't survive a reload */
    }
}

// ── Display helpers ────────────────────────────────────────

/**
 * The chat's first message: what it can help with, for the business it acts
 * as (business area) or the creator (null).
 */
export function chatGreeting(businessName: string | null): string {
    const promise = "Just tell me what you need, and I'll check with you before changing anything.";
    if (businessName === null) return `Hi! I can help with your quests, places and collabs. ${promise}`;
    const name = businessName.trim();
    return `Hi! I can help with ${name ? `${name}'s` : "your business's"} bookings, collabs and experiences. ${promise}`;
}

const sentence = (s: string) => (!s.trim() || /[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** One plain sentence for screen readers when a bot entry arrives. */
export function describeEntry(entry: ChatEntry): string {
    switch (entry.type) {
        case "user":
            return "";
        case "note":
            return entry.text;
        case "done":
            return entry.result.message;
        case "error":
            return entry.error.message;
        case "result": {
            const r = entry.result;
            if (entry.status === "failed" && entry.error) return entry.error.message;
            switch (r.kind) {
                case "choose":
                    return `${r.prompt} ${r.options.length} option${r.options.length === 1 ? "" : "s"}.`;
                case "need":
                    return r.prompt;
                case "preview":
                    return [r.lead, r.title, r.summary, "Confirm, or Not now."]
                        .filter((s): s is string => Boolean(s && s.trim()))
                        .map(sentence)
                        .join(" ");
                case "answer":
                    return sentence(r.text?.trim() || r.title || "");
                case "denied":
                case "unknown":
                    return r.message;
            }
        }
    }
}

/** Format a "need" value the way the user would say it (the raw value is what gets sent). */
export function formatNeedValue(input: string, value: string): string {
    if (input === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const d = new Date(`${value}T00:00:00`);
        if (!Number.isNaN(d.getTime())) return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    }
    if (input === "time" && /^\d{2}:\d{2}$/.test(value)) {
        const [h, m] = value.split(":").map(Number);
        const d = new Date();
        d.setHours(h ?? 0, m ?? 0, 0, 0);
        return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    return value;
}

/**
 * Media category for photos picked for a command: "experience" when it's about
 * an experience, "marker" for places, otherwise "website" (business photos).
 */
export function uploadCategoryFor(text: string, picks: Record<string, string> = {}): string {
    if (picks.experience || /\bexperiences?\b/i.test(text)) return "experience";
    if (picks.place || picks.marker || /\b(places?|markers?)\b/i.test(text)) return "marker";
    return "website";
}

/** Storage folder id for those photos: the picked record, else the business. */
export function uploadEntityFor(picks: Record<string, string> = {}, businessId: string | null = null): string | undefined {
    return picks.experience || picks.place || picks.marker || businessId || undefined;
}

/** "Open" targets the chat may follow: Partner Portal routes only (business or creator area). */
export function isPortalPath(path: string | null | undefined): path is string {
    return typeof path === "string" && /^\/(business|creator)(?=$|[/?#])/.test(path.trim());
}

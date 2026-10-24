import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, FlaskConical, MessageSquareText, RotateCcw, ServerOff } from "lucide-react";
import {
    COMMANDS_UNAVAILABLE_MESSAGE,
    isCommandsApiError,
    isCommandsMockEnabled,
    setCommandsMock,
} from "@services/commands.service";
import type { CommandAttachment, CommandScope } from "@services/commands.types";
import { describeEntry, scopeKey } from "../chatModel";
import { useCommandChat } from "../hooks/useCommandChat";
import { commandQueryKeys, useCommandCatalog, useCommandHistory } from "../hooks/useCommandQueries";
import { useSessionDraft } from "../hooks/useSessionDraft";
import { CatalogPanel, CatalogSheet } from "./CatalogPanel";
import { Composer } from "./Composer";
import { HistorySection } from "./HistorySection";
import { MessageItem, type MessageHandlers } from "./MessageItem";
import { BotAvatar, btnToolbar, exampleChip, focusRing } from "./chatUi";

function prefersReducedMotion(): boolean {
    return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function isTouch(): boolean {
    return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
}

/**
 * Command chat (no AI): type what you want to do ("pause Sunrise Yoga"),
 * answer any follow-up (which one? which photos?), check the preview, confirm.
 *
 * Renders in the portal's page flow (the window scrolls): messages flow with
 * the page and the composer sticks to the bottom of the visible area. Mount it
 * with `key={scopeKey(scope)}` so another workspace starts a fresh chat.
 */
export function CommandChat({
    scope,
    actingAs,
    railFrom = "lg",
}: {
    scope: CommandScope;
    /** The "Acting as …" line under the title. */
    actingAs: ReactNode;
    /** Breakpoint from which "What you can do" shows as a side rail (the business area has its own nav). */
    railFrom?: "lg" | "xl";
}) {
    const queryClient = useQueryClient();
    const [serverMissing, setServerMissing] = useState(false);
    const [mockOn, setMockOn] = useState(isCommandsMockEnabled);
    const catalog = useCommandCatalog(scope);
    const history = useCommandHistory();
    const chat = useCommandChat({ scope, onUnavailable: () => setServerMissing(true) });
    const [draft, setDraft] = useSessionDraft(scopeKey(scope));
    const [lastSent, setLastSent] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [announcement, setAnnouncement] = useState("");

    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const endRef = useRef<HTMLDivElement>(null);

    const unavailable = serverMissing || (isCommandsApiError(catalog.error) && catalog.error.kind === "unavailable");

    const { entries, busy, event, startedAt } = chat;
    // Confirming shows its own spinner on the preview's button — no typing dots then.
    const running = entries.some((e) => e.type === "result" && e.status === "running");

    // Earlier commands = history from before this conversation began (later runs are already on screen).
    const earlier = useMemo(() => {
        const start = Date.parse(startedAt);
        return (history.data ?? []).filter((i) => {
            const t = Date.parse(i.at);
            return Number.isNaN(t) || Number.isNaN(start) || t < start;
        });
    }, [history.data, startedAt]);

    const welcomeExamples = useMemo(() => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const c of catalog.data ?? []) {
            const ex = c.examples[0];
            if (ex && !seen.has(c.area)) {
                seen.add(c.area);
                out.push(ex);
            }
        }
        return out.slice(0, 4);
    }, [catalog.data]);

    const focusComposer = useCallback(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus({ preventScroll: true });
        el.setSelectionRange(el.value.length, el.value.length);
    }, []);

    /** Put text in the composer (examples, history, "edit and send again") and move there. */
    const insert = useCallback(
        (text: string) => {
            setDraft(text);
            setSheetOpen(false);
            // After the sheet closes (it hands focus back on close).
            requestAnimationFrame(() => requestAnimationFrame(focusComposer));
        },
        [setDraft, focusComposer]
    );

    const sendCommand = chat.send;
    const send = useCallback(
        (text: string, attachments: CommandAttachment[]) => {
            const ok = sendCommand(text, attachments);
            if (ok) {
                setLastSent(text.trim());
                setDraft("");
            }
            return ok;
        },
        [sendCommand, setDraft]
    );

    const { choose, provideValue, provideImages, confirm, cancel, retry } = chat;
    const handlers: MessageHandlers = useMemo(
        () => ({
            choose,
            provideValue,
            provideImages,
            confirm: (id: string) => void confirm(id),
            cancel,
            retry,
            insert,
        }),
        [choose, provideValue, provideImages, confirm, cancel, retry, insert]
    );

    // Keep the newest message in view (the end marker sits below the sticky composer).
    const firstScroll = useRef(true);
    useEffect(() => {
        // Opening the page shouldn't jump past the header when there's nothing to read yet.
        if (firstScroll.current && entries.length === 0) {
            firstScroll.current = false;
            return;
        }
        const behavior: "auto" | "smooth" = firstScroll.current || prefersReducedMotion() ? "auto" : "smooth";
        firstScroll.current = false;
        endRef.current?.scrollIntoView({ block: "end", behavior });
    }, [entries.length, busy]);

    // A bot message arrived: announce it, and if it doesn't take focus itself, return focus to the composer.
    useEffect(() => {
        if (!event) return;
        const entry = entries.find((e) => e.id === event.entryId);
        if (!entry) return;
        const alerts = entry.type === "error" || (entry.type === "result" && entry.status === "failed");
        if (!alerts) setAnnouncement(describeEntry(entry));
        const takesFocus =
            entry.type === "result" &&
            entry.status !== "failed" &&
            (entry.result.kind === "choose" || entry.result.kind === "need" || entry.result.kind === "preview");
        if (takesFocus || isTouch()) return;
        const active = document.activeElement;
        if (!active || active === document.body || rootRef.current?.contains(active)) focusComposer();
        // Only when a new event arrives — entries changing on their own must not steal focus.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event]);

    const startOver = () => {
        chat.reset();
        setAnnouncement("Started a new chat.");
        void queryClient.invalidateQueries({ queryKey: commandQueryKeys.history() });
        focusComposer();
    };

    const toggleMock = (on: boolean) => {
        setCommandsMock(on);
        setMockOn(on);
        setServerMissing(false);
        void queryClient.invalidateQueries({ queryKey: commandQueryKeys.all });
    };

    const closeSheet = useCallback(() => setSheetOpen(false), []);
    const catalogPanel = (
        <CatalogPanel
            commands={catalog.data}
            isLoading={catalog.isLoading}
            error={Boolean(catalog.error) && !unavailable}
            unavailable={unavailable}
            onRetry={() => void catalog.refetch()}
            onInsert={insert}
        />
    );

    const railShow = railFrom === "xl" ? "hidden xl:block" : "hidden lg:block";
    const sheetButtonHide = railFrom === "xl" ? "xl:hidden" : "lg:hidden";

    return (
        <div ref={rootRef} className="w-full flex gap-8 min-h-[calc(100dvh-12rem)] animate-fade-in">
            <div className="flex-1 min-w-0 w-full max-w-3xl mx-auto flex flex-col">
                <header className="pb-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary-900 tracking-tight flex items-center gap-2 flex-wrap">
                                Chat
                                {mockOn && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-sans font-semibold tracking-normal bg-highlight/40 text-primary-900">
                                        <FlaskConical className="w-3 h-3" aria-hidden="true" /> Demo data
                                    </span>
                                )}
                            </h1>
                            <p className="text-neutral-500 mt-1">Type what you want to do. Nothing changes until you confirm.</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setSheetOpen(true)}
                                className={`${btnToolbar} ${sheetButtonHide}`}
                                aria-haspopup="dialog"
                            >
                                <BookOpen className="w-4 h-4" aria-hidden="true" />
                                <span className="sr-only sm:not-sr-only">What can I do?</span>
                            </button>
                            {entries.length > 0 && (
                                <button type="button" onClick={startOver} disabled={busy} className={btnToolbar} title="Start a new chat">
                                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                                    <span className="sr-only sm:not-sr-only">New chat</span>
                                </button>
                            )}
                        </div>
                    </div>
                    {actingAs}
                </header>

                <div className="flex-1 flex flex-col">
                    {earlier.length > 0 && <HistorySection items={earlier} onUse={insert} />}

                    {unavailable && (
                        <div className="my-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm flex items-start gap-3" role="status">
                            <ServerOff className="w-5 h-5 mt-0.5 text-neutral-400 shrink-0" aria-hidden="true" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-neutral-900">{COMMANDS_UNAVAILABLE_MESSAGE}</p>
                                <p className="mt-0.5 text-sm text-neutral-500">Everything else in the portal works as usual.</p>
                                {import.meta.env.DEV && !mockOn && (
                                    <button type="button" onClick={() => toggleMock(true)} className={`${exampleChip} mt-3`}>
                                        <FlaskConical className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Try it with demo data
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {entries.length === 0 && !unavailable && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-2">
                            <span className="w-12 h-12 rounded-2xl bg-primary-900 flex items-center justify-center shadow-sm" aria-hidden="true">
                                <MessageSquareText className="w-6 h-6 text-highlight" />
                            </span>
                            <h2 className="mt-4 text-lg font-display font-semibold text-neutral-900">What do you want to do?</h2>
                            <p className="mt-1 max-w-sm text-sm text-neutral-500">
                                Say it the way you would to a colleague. You&apos;ll see exactly what changes before anything happens.
                            </p>
                            {welcomeExamples.length > 0 && (
                                <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-lg" role="group" aria-label="Examples">
                                    {welcomeExamples.map((ex) => (
                                        <button key={ex} type="button" onClick={() => insert(ex)} className={exampleChip}>
                                            {ex}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {entries.length > 0 && (
                        <ol className="space-y-4 pb-2" aria-label="Conversation">
                            {entries.map((entry) => (
                                <li key={entry.id}>
                                    <MessageItem entry={entry} busy={busy} autoFocus={event?.entryId === entry.id} handlers={handlers} />
                                </li>
                            ))}
                        </ol>
                    )}

                    {busy && !running && (
                        <div className="mt-4 flex items-start gap-2.5" role="status">
                            <BotAvatar />
                            <span className="inline-flex items-center gap-1 rounded-2xl rounded-tl-md border border-neutral-200 bg-white px-4 py-3.5 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.3s]" aria-hidden="true" />
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.15s]" aria-hidden="true" />
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" aria-hidden="true" />
                                <span className="sr-only">Working on it…</span>
                            </span>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 z-10 -mx-1 px-1 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-neutral-50 from-70% to-transparent">
                    <Composer
                        value={draft}
                        onChange={setDraft}
                        onSend={send}
                        busy={busy}
                        unavailable={unavailable}
                        inputRef={inputRef}
                        lastSent={lastSent}
                        scope={scope}
                    />
                </div>
                <div ref={endRef} aria-hidden="true" />

                <div aria-live="polite" aria-atomic="true" className="sr-only">
                    {announcement}
                </div>
            </div>

            <aside className={`${railShow} w-72 shrink-0`} aria-labelledby="command-catalog-rail-title">
                <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <h2 id="command-catalog-rail-title" className="text-base font-display font-semibold text-neutral-900 mb-4">
                        What you can do
                    </h2>
                    {catalogPanel}
                    {import.meta.env.DEV && mockOn && import.meta.env.VITE_COMMANDS_MOCK !== "true" && (
                        <button
                            type="button"
                            onClick={() => toggleMock(false)}
                            className={`mt-6 text-xs text-neutral-400 hover:text-neutral-700 underline underline-offset-2 rounded ${focusRing}`}
                        >
                            Turn off demo data
                        </button>
                    )}
                </div>
            </aside>

            <CatalogSheet open={sheetOpen} onClose={closeSheet}>
                {catalogPanel}
            </CatalogSheet>
        </div>
    );
}

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessagesSquare, Smartphone } from "lucide-react";
import { EmptyState, ErrorState, Skeleton } from "@components/ui";
import { chatService, type ChatMessage, type ChatThread } from "@services/chat.service";
import { useBusiness } from "../context";
import { usePartnerPortal } from "../partnerPortal";
import { errorMessage } from "../utils";
import { CreatorAvatar, PageHeader } from "../components/bits";

const STATUS_LABEL: Record<string, string> = {
    requested: "New request",
    invited: "Invite sent",
    approved: "Visit approved",
    redeemed: "Redeemed",
    overdue: "Content overdue",
    delivered: "Content sent",
    completed: "Complete",
    declined: "Declined",
    expired: "Expired",
    cancelled: "Cancelled",
    no_show: "No-show",
};

function when(iso?: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return sameDay
        ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

/** Collab chats with creators, read-only. Replies happen in the SeekKrr app's Collabs tab. */
export function MessagesPage() {
    const { businessId } = useBusiness();
    const { matchmakingVisible } = usePartnerPortal();
    const threads = useQuery({
        queryKey: ["business-chats", businessId],
        queryFn: () => chatService.listThreads(businessId),
        refetchInterval: 30_000,
    });
    const [openId, setOpenId] = useState<string | null>(null);
    const open = useMemo(() => threads.data?.find((t) => t.id === openId) ?? null, [threads.data, openId]);

    useEffect(() => {
        const first = threads.data?.[0];
        if (!openId && first && window.matchMedia("(min-width: 1024px)").matches) {
            setOpenId(first.id);
        }
    }, [threads.data, openId]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Messages"
                description="Every collab has its own chat with the creator. Read them here; reply from the SeekKrr app."
            />
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <Smartphone className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                    To reply, open the <b>Collabs</b> tab in the SeekKrr app. Your team gets a notification for each new message.
                </p>
            </div>

            {threads.isLoading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => <Skeleton key={i} height={72} className="w-full" />)}
                </div>
            ) : threads.isError ? (
                <ErrorState message={errorMessage(threads.error, "Couldn't load your chats.")} onRetry={() => threads.refetch()} />
            ) : !threads.data?.length ? (
                <EmptyState
                    icon={<MessagesSquare className="w-10 h-10 text-neutral-400" />}
                    title="No chats yet"
                    description={
                        matchmakingVisible
                            ? "A chat opens when a creator requests a visit, accepts your invite or redeems a UGC brief."
                            : "A chat opens when a creator requests a visit or redeems a UGC brief."
                    }
                />
            ) : (
                <div className="grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-4">
                    <ul className={`rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100 overflow-hidden ${open ? "hidden lg:block" : ""}`}>
                        {threads.data.map((t) => (
                            <li key={t.id}>
                                <button
                                    type="button"
                                    onClick={() => setOpenId(t.id)}
                                    className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${t.id === openId ? "bg-primary-50/50" : ""}`}
                                >
                                    <CreatorAvatar name={t.title} size={40} />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-primary-900 truncate">{t.title}</span>
                                            <span className="text-xs text-neutral-400 shrink-0">{when(t.last_message_at)}</span>
                                        </span>
                                        <span className={`block text-sm truncate ${t.unread ? "text-neutral-900 font-semibold" : "text-neutral-500"}`}>
                                            {t.last_preview ?? "No messages yet"}
                                        </span>
                                        <span className="mt-1 inline-flex items-center gap-2 text-xs">
                                            <span className="rounded-full bg-teal-50 text-teal-800 px-2 py-0.5 font-medium">
                                                {t.read_only ? "Closed" : STATUS_LABEL[t.status ?? ""] ?? "Collab"}
                                            </span>
                                            {t.unread > 0 && (
                                                <span className="rounded-full bg-fuchsia-700 text-white px-2 py-0.5 font-semibold">{t.unread}</span>
                                            )}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {open ? <ThreadPane thread={open} onBack={() => setOpenId(null)} /> : (
                        <div className="hidden lg:flex rounded-2xl border border-dashed border-neutral-200 items-center justify-center text-sm text-neutral-400 min-h-[320px]">
                            Pick a chat to read it.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ThreadPane({ thread, onBack }: { thread: ChatThread; onBack: () => void }) {
    const messages = useQuery({
        queryKey: ["business-chat", thread.id],
        queryFn: () => chatService.messages(thread.id),
        refetchInterval: 15_000,
    });
    return (
        <section className="rounded-2xl border border-neutral-200 bg-white flex flex-col min-h-[420px] min-w-0">
            <header className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
                <button type="button" onClick={onBack} className="lg:hidden p-1 -ml-1 text-neutral-500" aria-label="Back to chats">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <CreatorAvatar name={thread.title} size={36} />
                <div className="min-w-0">
                    <p className="font-semibold text-primary-900 truncate">{thread.title}</p>
                    <p className="text-xs text-neutral-500 truncate">
                        {thread.want ? `${thread.want} · ` : ""}For: {thread.offer ?? "UGC brief"}
                    </p>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-neutral-50/60 max-h-[60vh]">
                {messages.isLoading ? (
                    <Skeleton height={120} className="w-full" />
                ) : messages.isError ? (
                    <ErrorState message={errorMessage(messages.error, "Couldn't load this chat.")} onRetry={() => messages.refetch()} />
                ) : (
                    (messages.data ?? []).map((m) => <Bubble key={m.id} m={m} />)
                )}
            </div>
            <footer className="border-t border-neutral-100 px-4 py-3 text-sm text-neutral-500 flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Reply from the Collabs tab in the SeekKrr app.
            </footer>
        </section>
    );
}

function Bubble({ m }: { m: ChatMessage }) {
    if (m.side === "system") {
        return (
            <p className="text-center">
                <span className="inline-block rounded-full bg-neutral-200/70 text-neutral-600 text-xs font-medium px-3 py-1">
                    {m.body} · {when(m.created_at)}
                </span>
            </p>
        );
    }
    const ours = m.side === "business";
    // Requests and invites arrive as cards; the note may be empty.
    const card = m.type === "request" || m.type === "invite";
    return (
        <div className={`flex ${ours ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${ours ? "bg-primary-900 text-white rounded-br-md" : "bg-white border border-neutral-200 rounded-bl-md"}`}>
                {m.sender_name && <p className={`text-[11px] font-bold ${ours ? "text-white/80" : "text-fuchsia-700"}`}>{m.sender_name}</p>}
                {card && (
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${ours ? "text-white/70" : "text-neutral-500"}`}>
                        {m.type === "request" ? "Collab request" : "Invite"}
                        {m.meta?.offer ? ` · For: ${m.meta.offer}` : ""}
                    </p>
                )}
                {m.type === "photo" && m.media_url && (
                    <img src={m.media_url} alt="Photo from the chat" className="rounded-lg mb-1 max-h-60 object-cover" />
                )}
                {m.body ? (
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                ) : (
                    card && <p className={`italic ${ours ? "text-white/70" : "text-neutral-500"}`}>No note</p>
                )}
                <p className={`text-[10px] mt-0.5 ${ours ? "text-white/60" : "text-neutral-400"}`}>{when(m.created_at)}</p>
            </div>
        </div>
    );
}

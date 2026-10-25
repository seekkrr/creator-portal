import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import { ACTING_ENDED_PATH, ACTING_TAB, endActingSession, getActingSession } from "@services/actingSession";

/** Minutes left, rounded up ("ends in 1 min" until the very end). */
function minutesLeft(endsAt: number): number {
    return Math.max(0, Math.ceil((endsAt - Date.now()) / 60_000));
}

/**
 * The strip across the top of a tab acting as a creator: whose portal this is,
 * the time left, and Exit. Sends the tab to the "ended" page at the time limit.
 */
export function ActingBanner() {
    const [session] = useState(getActingSession);
    const [left, setLeft] = useState(() => (session ? minutesLeft(session.endsAt) : 0));

    useEffect(() => {
        if (!session) return;
        const tick = () => {
            if (session.endsAt <= Date.now()) {
                window.location.replace(ACTING_ENDED_PATH);
                return;
            }
            setLeft(minutesLeft(session.endsAt));
        };
        const id = window.setInterval(tick, 15_000);
        return () => window.clearInterval(id);
    }, [session]);

    if (!ACTING_TAB || !session) return null;

    const exit = async () => {
        await endActingSession();
        window.location.replace(ACTING_ENDED_PATH);
    };

    return (
        <div role="status" className="bg-amber-400 text-amber-950 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <UserCog className="w-4 h-4 shrink-0" aria-hidden />
                <span className="min-w-0">
                    Acting as <strong>{session.user.name}</strong>
                    <span className="hidden sm:inline"> · signed in as {session.admin.name}</span>
                </span>
                <span className="text-amber-900">· ends in {left} min</span>
                <span className="hidden md:inline text-amber-900">· payouts and account settings are off</span>
                <button
                    type="button"
                    onClick={exit}
                    className="ml-auto px-3 py-1 rounded-full bg-amber-950 text-amber-50 text-xs font-semibold hover:bg-black"
                >
                    Exit
                </button>
            </div>
        </div>
    );
}

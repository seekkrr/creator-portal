import { useEffect, useRef, useState } from "react";
import { ShieldAlert, UserCog } from "lucide-react";
import { startActingSession } from "@services/actingSession";

/**
 * Opened by the admin portal's "Act as creator": `/creator/act-as#code=…`.
 * Swaps the one-time code (kept in the URL fragment, so it never reaches a
 * server log) for the creator's session in this tab, then reloads into it.
 */
export function ActAsPage() {
    const [error, setError] = useState<string | null>(null);
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        const code = new URLSearchParams(window.location.hash.slice(1)).get("code") ?? "";
        window.history.replaceState(null, "", window.location.pathname);
        if (!code) {
            setError("This link is missing its code. Start again from the admin portal.");
            return;
        }
        startActingSession(code)
            .then(() => window.location.replace("/"))
            .catch(() => setError("This link has expired or was already used. Start again from the admin portal."));
    }, []);

    return (
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-auto text-center border border-neutral-200">
            {error ? (
                <>
                    <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5">
                        <ShieldAlert className="w-7 h-7" />
                    </div>
                    <h1 className="text-xl font-bold text-neutral-900 mb-2">Couldn't open the creator's portal</h1>
                    <p className="text-neutral-500">{error}</p>
                </>
            ) : (
                <>
                    <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-5">
                        <UserCog className="w-7 h-7" />
                    </div>
                    <h1 className="text-xl font-bold text-neutral-900 mb-2">Opening the creator's portal…</h1>
                    <p className="text-neutral-500">You'll act as this creator in this tab only.</p>
                </>
            )}
        </div>
    );
}

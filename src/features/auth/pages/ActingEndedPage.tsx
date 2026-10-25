import { useEffect } from "react";
import { UserCheck } from "lucide-react";
import { clearActingSession } from "@services/actingSession";

/** Where a tab acting as a creator lands when the session ends (Exit or time limit). */
export function ActingEndedPage() {
    useEffect(() => clearActingSession(), []);

    return (
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-auto text-center border border-neutral-200">
            <div className="w-14 h-14 bg-primary-50 text-primary-700 rounded-full flex items-center justify-center mx-auto mb-5">
                <UserCheck className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 mb-2">You've stopped acting as the creator</h1>
            <p className="text-neutral-500 mb-6">
                The session has ended. You can close this tab. To continue, start again from the admin portal.
            </p>
            <button
                type="button"
                onClick={() => window.close()}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
            >
                Close tab
            </button>
        </div>
    );
}

import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "@store/auth.store";
import { evaluateCreatorAccess, type CreatorAccessDenialReason } from "@/types";

const DENIAL_COPY: Record<CreatorAccessDenialReason, { title: string; body: string }> = {
    not_creator: {
        title: "Creator Access Required",
        body: "This account is not a creator. If you'd like to become a creator, please apply through the SeekKrr app.",
    },
    no_profile: {
        title: "Finishing Setup",
        body: "Your creator account is still being provisioned. Please log out and sign in again in a moment. If this persists, contact support.",
    },
    suspended: {
        title: "Account Suspended",
        body: "Your creator account is currently suspended. Please contact SeekKrr support for assistance.",
    },
    rejected: {
        title: "Application Not Approved",
        body: "Your creator application was not approved, so the Creator Portal isn't available for this account.",
    },
};

export function AccessDeniedPage() {
    const { logout, user, creator } = useAuthStore();

    const reason = evaluateCreatorAccess(user, creator).reason ?? "not_creator";
    const copy = DENIAL_COPY[reason];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center border border-neutral-200">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="w-8 h-8" />
                </div>

                <h1 className="text-2xl font-bold text-neutral-900 mb-2">{copy.title}</h1>

                <p className="text-neutral-500 mb-8">{copy.body}</p>

                <div className="space-y-3">
                    <button
                        onClick={() => logout().then(() => (window.location.href = "/creator/login"))}
                        className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors font-medium"
                    >
                        Log out and try a different account
                    </button>
                </div>
            </div>
        </div>
    );
}

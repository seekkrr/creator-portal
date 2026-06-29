import type { PayoutAccountStatus } from "@/types";

/** Tailwind badge classes per payout-account status. */
export function getPayoutStatusColor(status: PayoutAccountStatus): string {
    switch (status) {
        case "verified":
            return "bg-green-50 text-green-700";
        case "pending_verification":
            return "bg-amber-50 text-amber-700";
        case "rejected":
            return "bg-red-50 text-red-700";
        case "disabled":
            return "bg-neutral-100 text-neutral-500";
        default:
            return "bg-neutral-100 text-neutral-500";
    }
}

export const PAYOUT_STATUS_LABEL: Record<PayoutAccountStatus, string> = {
    pending_verification: "Pending verification",
    verified: "Verified",
    rejected: "Rejected",
    disabled: "Disabled",
};

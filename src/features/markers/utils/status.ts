import type { MarkerStatus } from "@/types";

export function getMarkerStatusColor(status: MarkerStatus): string {
    switch (status) {
        case "approved": return "bg-emerald-100 text-emerald-700 border border-emerald-200";
        case "pending": return "bg-amber-100 text-amber-700 border border-amber-200";
        case "rejected": return "bg-red-100 text-red-700 border border-red-200";
        case "hidden": return "bg-neutral-100 text-neutral-500 border border-neutral-200";
        default: return "bg-slate-100 text-slate-700 border border-slate-200";
    }
}

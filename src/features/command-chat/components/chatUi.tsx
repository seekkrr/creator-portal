import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ImageOff } from "lucide-react";

/**
 * Small shared pieces for the command chat, in the Partner Portal's visual
 * language: white rounded-2xl cards on warm neutrals, brand green
 * (primary-900 #003634) for the chat's own voice, primary-600 actions,
 * pill chips, and the highlight yellow for the avatar mark.
 */

/** Keyboard focus, like the portal's Button. */
export const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1";

/** Square icon-only primary button (send). */
export const btnIconPrimary = `inline-flex items-center justify-center w-10 h-10 shrink-0 text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${focusRing}`;

/** Same look as the portal's `<Button variant="secondary" size="sm">`, for places that need a ref. */
export const btnSecondarySm = `inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2`;

/** Compact header action (white, bordered), like the business picker / outline buttons. */
export const btnToolbar = `inline-flex items-center justify-center gap-2 h-9 px-3 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`;

export const btnLink = `inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-900 hover:underline underline-offset-2 rounded ${focusRing}`;

/** Tappable example phrase / suggestion chip (the portal's pill style). */
export const exampleChip = `inline-flex items-center max-w-full px-3 py-1.5 rounded-full border border-neutral-200 bg-white text-xs text-neutral-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`;

export const inputClass =
    "w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 read-only:bg-neutral-50";

/** In-portal link for a url_path the chat may open (see isPortalPath). */
export function PortalLink({ to, className, children, ariaLabel }: { to: string; className?: string; children: ReactNode; ariaLabel?: string }) {
    return (
        <Link to={to.trim()} className={className} aria-label={ariaLabel}>
            {children}
        </Link>
    );
}

/** Square thumbnail with a quiet fallback (no image, or it failed to load). */
export function Thumb({ src, alt = "", size = "md" }: { src: string | null | undefined; alt?: string; size?: "sm" | "md" | "lg" }) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const box = { sm: "w-8 h-8 rounded-lg", md: "w-10 h-10 rounded-xl", lg: "w-16 h-16 rounded-xl border border-neutral-200" }[size];
    if (!src || failedSrc === src) {
        return (
            <span
                className={`${box} shrink-0 bg-neutral-100 text-neutral-300 flex items-center justify-center`}
                role={alt ? "img" : undefined}
                aria-label={alt || undefined}
                aria-hidden={alt ? undefined : true}
            >
                <ImageOff className="w-4 h-4" aria-hidden="true" />
            </span>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailedSrc(src)}
            className={`${box} shrink-0 object-cover bg-neutral-100`}
        />
    );
}

/** The chat's avatar next to its messages. */
export function BotAvatar() {
    return (
        <span className="w-8 h-8 shrink-0 rounded-xl bg-primary-900 flex items-center justify-center shadow-sm" aria-hidden="true">
            <span className="font-display font-bold text-[13px] leading-none text-highlight">S</span>
        </span>
    );
}

import { toast } from "sonner";

const EMAIL_LIKE = /^[^/\s]+@[^/\s]+\.[^/\s]+$/;

/** Typed text → a public https link, or "" for emails, credentials or junk. */
export function toWebLink(raw: string): string {
    const text = raw.trim();
    if (!text || /\s/.test(text)) return "";
    const bare = text.replace(/^https?:\/\//i, "");
    if (EMAIL_LIKE.test(bare)) return "";
    try {
        const url = new URL(`https://${bare}`);
        if (url.username || url.password || !url.hostname.includes(".")) return "";
        return url.toString().replace(/\/$/, bare.endsWith("/") ? "/" : "");
    } catch {
        return "";
    }
}

/** ChipInput `normalize` for web links: rejects with a short explanation. */
export function normalizeWebLink(raw: string): string {
    const link = toWebLink(raw);
    if (!link && raw.trim()) {
        const bare = raw.trim().replace(/^https?:\/\//i, "");
        toast.error(
            EMAIL_LIKE.test(bare)
                ? "That's an email address, not a link. Add it as your contact email instead."
                : "That isn't a web link. Paste the full address, like instagram.com/yourplace.",
        );
    }
    return link;
}

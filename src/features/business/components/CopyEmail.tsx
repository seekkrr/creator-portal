import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@components/ui";

export const SUPPORT_EMAIL = "support@seekkrr.com";

async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Older browsers / non-secure contexts: fall back to a hidden textarea.
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(area);
        return ok;
    }
}

function useCopied(): [boolean, (text: string) => Promise<void>] {
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (!copied) return;
        const t = window.setTimeout(() => setCopied(false), 2000);
        return () => window.clearTimeout(t);
    }, [copied]);
    return [copied, async (text: string) => setCopied(await copyText(text))];
}

/** "Contact us" button that copies the support email and confirms with a small note. */
export function CopyEmailButton({ label = "Contact us", email = SUPPORT_EMAIL }: { label?: string; email?: string }) {
    const [copied, copy] = useCopied();
    return (
        <div className="space-y-1.5">
            <Button variant="outline" fullWidth onClick={() => void copy(email)} aria-label={`${label}: copy ${email}`}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Email copied" : label}
            </Button>
            <p className="text-center text-xs text-neutral-500" aria-live="polite">
                {copied ? "Copied to clipboard" : email}
            </p>
        </div>
    );
}

/** Inline email that copies itself on click, with a small "Copied" note. */
export function CopyEmailText({ email = SUPPORT_EMAIL }: { email?: string }) {
    const [copied, copy] = useCopied();
    return (
        <button
            type="button"
            onClick={() => void copy(email)}
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
            title="Copy email"
        >
            {email}
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="sr-only" aria-live="polite">{copied ? "Copied to clipboard" : ""}</span>
            {copied && <span className="text-xs font-normal no-underline">Copied to clipboard</span>}
        </button>
    );
}

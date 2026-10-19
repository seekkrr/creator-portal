import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

interface PinInputProps {
    value: string;
    onChange: (value: string) => void;
    length?: number;
    autoFocus?: boolean;
    invalid?: boolean;
    ariaLabel?: string;
}

/** The app's 4-box code input: digits only, auto-advance, paste-friendly. */
export function PinInput({ value, onChange, length = 4, autoFocus, invalid, ariaLabel = "Code" }: PinInputProps) {
    const refs = useRef<(HTMLInputElement | null)[]>([]);
    const digits = Array.from({ length }, (_, i) => value[i] ?? "");

    const setDigit = (i: number, d: string) => {
        const next = digits.slice();
        next[i] = d;
        onChange(next.join("").slice(0, length));
    };

    const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !digits[i] && i > 0) {
            e.preventDefault();
            setDigit(i - 1, "");
            refs.current[i - 1]?.focus();
        } else if (e.key === "ArrowLeft" && i > 0) {
            refs.current[i - 1]?.focus();
        } else if (e.key === "ArrowRight" && i < length - 1) {
            refs.current[i + 1]?.focus();
        }
    };

    const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
        if (!pasted) return;
        e.preventDefault();
        onChange(pasted);
        refs.current[Math.min(pasted.length, length - 1)]?.focus();
    };

    return (
        <div className="flex gap-3 justify-center" role="group" aria-label={ariaLabel}>
            {digits.map((d, i) => (
                <input
                    key={i}
                    ref={(el) => {
                        refs.current[i] = el;
                    }}
                    value={d}
                    autoFocus={autoFocus && i === 0}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={length}
                    aria-label={`${ariaLabel} digit ${i + 1}`}
                    onPaste={onPaste}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onChange={(e) => {
                        const typed = e.target.value.replace(/\D/g, "");
                        // Typing over an existing digit leaves two chars; keep the new one.
                        const incoming = d && typed.length === 2 && typed.startsWith(d) ? typed.slice(1) : typed;
                        if (incoming.length <= 1) {
                            setDigit(i, incoming);
                            if (incoming && i < length - 1) refs.current[i + 1]?.focus();
                            return;
                        }
                        // Several digits at once (autofill / fast input): spread them from this box on.
                        const next = digits.slice();
                        incoming
                            .slice(0, length - i)
                            .split("")
                            .forEach((c, k) => {
                                next[i + k] = c;
                            });
                        onChange(next.join("").slice(0, length));
                        refs.current[Math.min(i + incoming.length, length - 1)]?.focus();
                    }}
                    className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 ${
                        invalid ? "border-red-400" : "border-neutral-300 focus:border-primary-600"
                    }`}
                />
            ))}
        </div>
    );
}

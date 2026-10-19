import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

interface ChipInputProps {
    id: string;
    values: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    max?: number;
    /** Normalise a typed value (e.g. strip "@", add "#"); return "" to reject. */
    normalize?: (raw: string) => string;
    prefix?: string;
    suggestions?: string[];
    disabled?: boolean;
}

/** Type and press Enter (or comma) to add a chip; Backspace on empty removes the last. */
export function ChipInput({
    id,
    values,
    onChange,
    placeholder,
    max,
    normalize = (s) => s.trim(),
    prefix,
    suggestions,
    disabled,
}: ChipInputProps) {
    const [draft, setDraft] = useState("");
    const full = max !== undefined && values.length >= max;

    const add = (raw: string) => {
        const parts = raw.split(",").map(normalize).filter(Boolean);
        if (!parts.length) return;
        const next = [...values];
        for (const p of parts) {
            if (max !== undefined && next.length >= max) break;
            if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
        }
        onChange(next);
        setDraft("");
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
        } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
        }
    };

    const remaining = (suggestions ?? []).filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()));

    return (
        <div>
            <div
                className={`flex flex-wrap items-center gap-1.5 min-h-[44px] px-2 py-1.5 bg-white border border-neutral-300 rounded-lg focus-within:ring-2 focus-within:ring-primary-200 focus-within:border-primary-500 ${
                    disabled ? "bg-neutral-100 opacity-70" : ""
                }`}
            >
                {values.map((v) => (
                    <span
                        key={v}
                        className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-primary-50 text-primary-800 text-sm border border-primary-100"
                    >
                        {prefix}
                        {v}
                        {!disabled && (
                            <button
                                type="button"
                                aria-label={`Remove ${v}`}
                                onClick={() => onChange(values.filter((x) => x !== v))}
                                className="p-0.5 rounded-full hover:bg-primary-100"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </span>
                ))}
                {!full && !disabled && (
                    <input
                        id={id}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={onKeyDown}
                        onBlur={() => draft && add(draft)}
                        placeholder={values.length ? "" : placeholder}
                        className="flex-1 min-w-[8rem] px-1 py-1 text-sm bg-transparent focus:outline-none placeholder:text-neutral-400"
                    />
                )}
            </div>
            {!disabled && !full && remaining.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {remaining.slice(0, 10).map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => add(s)}
                            className="px-2.5 py-0.5 rounded-full text-xs border border-dashed border-neutral-300 text-neutral-600 hover:border-primary-400 hover:text-primary-700"
                        >
                            + {s}
                        </button>
                    ))}
                </div>
            )}
            {max !== undefined && (
                <p className="text-xs text-neutral-400 mt-1">
                    {values.length}/{max}
                </p>
            )}
        </div>
    );
}

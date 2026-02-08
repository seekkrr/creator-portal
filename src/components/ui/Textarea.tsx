import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, helperText, className = "", id, ...props }, ref) => {
        const textareaId = id ?? `textarea-${label?.toLowerCase().replace(/\s+/g, "-") ?? "field"}`;
        const hasError = !!error;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="block text-sm font-medium text-neutral-700 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? `${textareaId}-error` : undefined}
                    className={`
            w-full px-4 py-2.5 min-h-[120px]
            bg-white border rounded-lg
            text-neutral-900 placeholder:text-neutral-400
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-offset-0
            resize-y
            ${hasError
                            ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                            : "border-neutral-300 focus:border-indigo-500 focus:ring-indigo-200"
                        }
            disabled:bg-neutral-100 disabled:cursor-not-allowed
            ${className}
          `}
                    {...props}
                />
                {error && (
                    <p id={`${textareaId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
                        {error}
                    </p>
                )}
                {helperText && !error && (
                    <p className="mt-1.5 text-sm text-neutral-500">{helperText}</p>
                )}
            </div>
        );
    }
);

Textarea.displayName = "Textarea";

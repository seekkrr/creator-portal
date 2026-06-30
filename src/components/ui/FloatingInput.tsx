import { forwardRef, useState, type InputHTMLAttributes, type ReactNode, type FocusEvent } from "react";

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    helperText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    highlightOnFocus?: boolean;
}

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
    ({ label, error, helperText, leftIcon, rightIcon, highlightOnFocus = true, className = "", id, value, onFocus, onBlur, ...props }, ref) => {
        const [isFocused, setIsFocused] = useState(false);
        const inputId = id ?? `floating-input-${label.toLowerCase().replace(/\s+/g, "-")}`;
        const hasError = !!error;
        const hasValue = value !== undefined && value !== "" && value !== null;
        const isActive = isFocused || hasValue;

        const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
            setIsFocused(true);
            onFocus?.(e);
        };

        const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
            setIsFocused(false);
            onBlur?.(e);
        };

        return (
            <div className="w-full">
                <div
                    className={`
                        relative rounded-xl border transition-all duration-200
                        ${highlightOnFocus && isFocused
                            ? "border-primary-600 shadow-sm ring-2 ring-primary-500 ring-offset-2"
                            : hasError
                                ? "border-red-400"
                                : "border-neutral-300 hover:border-neutral-400"
                        }
                        bg-white
                    `}
                >
                    {/* Floating Label */}
                    <label
                        htmlFor={inputId}
                        className={`
                            absolute transition-all duration-200 pointer-events-none z-10 px-1 bg-white
                            ${leftIcon ? "left-11" : "left-3"}
                            ${isActive
                                ? "-top-2.5 text-xs font-medium"
                                : "top-1/2 -translate-y-1/2 text-sm"
                            }
                            ${isFocused
                                ? "text-primary-700"
                                : hasError
                                    ? "text-red-500"
                                    : "text-neutral-500"
                            }
                        `}
                    >
                        {label}
                    </label>

                    <div className="relative flex items-center">
                        {leftIcon && (
                            <div className={`absolute left-3.5 flex items-center pointer-events-none transition-colors ${isFocused ? "text-neutral-800" : "text-neutral-400"}`}>
                                {leftIcon}
                            </div>
                        )}

                        <input
                            ref={ref}
                            id={inputId}
                            value={value}
                            aria-invalid={hasError}
                            aria-describedby={hasError ? `${inputId}-error` : undefined}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            className={`
                                w-full px-4 py-3 bg-transparent
                                text-neutral-900 text-sm placeholder:text-neutral-400
                                focus:outline-none rounded-xl
                                ${leftIcon ? "pl-11" : ""}
                                ${rightIcon ? "pr-11" : ""}
                                disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400
                                ${className}
                            `}
                            placeholder={isActive ? props.placeholder : ""}
                            {...props}
                        />

                        {rightIcon && (
                            <div className="absolute right-3.5 flex items-center text-neutral-400">
                                {rightIcon}
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-600" role="alert">
                        {error}
                    </p>
                )}
                {helperText && !error && (
                    <p className="mt-1.5 text-xs text-neutral-500">{helperText}</p>
                )}
            </div>
        );
    }
);

FloatingInput.displayName = "FloatingInput";

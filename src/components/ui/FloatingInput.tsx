import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";

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

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(true);
            onFocus?.(e);
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(false);
            onBlur?.(e);
        };

        return (
            <div className="w-full">
                <div
                    className={`
                        relative rounded-xl border transition-all duration-200
                        ${highlightOnFocus && isFocused
                            ? "border-slate-900 shadow-sm"
                            : hasError
                                ? "border-red-400"
                                : "border-slate-300 hover:border-slate-400"
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
                                ? "text-slate-900"
                                : hasError
                                    ? "text-red-500"
                                    : "text-slate-500"
                            }
                        `}
                    >
                        {label}
                    </label>

                    <div className="relative flex items-center">
                        {leftIcon && (
                            <div className={`absolute left-3.5 flex items-center pointer-events-none transition-colors ${isFocused ? "text-slate-800" : "text-slate-400"}`}>
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
                                text-slate-900 text-sm placeholder:text-slate-400
                                focus:outline-none rounded-xl
                                ${leftIcon ? "pl-11" : ""}
                                ${rightIcon ? "pr-11" : ""}
                                disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400
                                ${className}
                            `}
                            placeholder={isActive ? props.placeholder : ""}
                            {...props}
                        />

                        {rightIcon && (
                            <div className="absolute right-3.5 flex items-center text-slate-400">
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
                    <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
                )}
            </div>
        );
    }
);

FloatingInput.displayName = "FloatingInput";

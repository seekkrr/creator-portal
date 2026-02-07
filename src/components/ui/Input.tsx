import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, leftIcon, rightIcon, className = "", id, ...props }, ref) => {
        const inputId = id ?? `input-${label?.toLowerCase().replace(/\s+/g, "-") ?? "field"}`;
        const hasError = !!error;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-neutral-700 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        aria-invalid={hasError}
                        aria-describedby={hasError ? `${inputId}-error` : undefined}
                        className={`
              w-full px-4 py-2.5 
              bg-white border rounded-lg
              text-neutral-900 placeholder:text-neutral-400
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-offset-0
              ${leftIcon ? "pl-10" : ""}
              ${rightIcon ? "pr-10" : ""}
              ${hasError
                                ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                : "border-neutral-300 focus:border-indigo-500 focus:ring-indigo-200"
                            }
              disabled:bg-neutral-100 disabled:cursor-not-allowed
              ${className}
            `}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
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

Input.displayName = "Input";

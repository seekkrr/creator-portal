import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
    children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary:
        "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-md hover:shadow-lg",
    secondary:
        "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus:ring-neutral-400",
    outline:
        "border-2 border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-400",
    ghost:
        "text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-400",
    danger:
        "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-sm rounded-md gap-1.5",
    md: "px-4 py-2 text-base rounded-lg gap-2",
    lg: "px-6 py-3 text-lg rounded-xl gap-2.5",
};

export function Button({
    variant = "primary",
    size = "md",
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    disabled,
    className = "",
    ...props
}: ButtonProps) {
    const isDisabled = disabled ?? isLoading;

    return (
        <button
            disabled={isDisabled}
            className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-150 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : leftIcon ? (
                <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>
            ) : null}
            <span>{children}</span>
            {!isLoading && rightIcon && (
                <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>
            )}
        </button>
    );
}

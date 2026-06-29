import { AlertCircle } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
    /** Short, human-readable message describing what failed to load. */
    message?: string;
    /** Retry handler — wire to TanStack Query's `refetch`. */
    onRetry?: () => void;
    className?: string;
}

/**
 * Consistent error-state block used across every list page.
 * Centered: warning icon, short message, and an outline "Try again" button.
 */
export function ErrorState({
    message = "Something went wrong while loading this list.",
    onRetry,
    className = "",
}: ErrorStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-600 mb-4">
                <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-display font-semibold text-neutral-900">Couldn't load data</h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-sm">{message}</p>
            {onRetry && (
                <div className="mt-6">
                    <Button variant="outline" onClick={onRetry}>
                        Try again
                    </Button>
                </div>
            )}
        </div>
    );
}

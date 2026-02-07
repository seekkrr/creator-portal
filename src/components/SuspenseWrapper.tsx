import type { ReactNode } from "react";
import { Suspense } from "react";
import { ErrorBoundary, LoadingFallback } from "@components/index";

interface SuspenseWrapperProps {
    children: ReactNode;
}

export function SuspenseWrapper({ children }: SuspenseWrapperProps) {
    return (
        <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
        </ErrorBoundary>
    );
}

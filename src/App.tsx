import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { router } from "@routes/index";
import { useAuthStore } from "@store/auth.store";
import { config } from "@config/env";

// Create React Query client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

export function App() {
    const { checkAuth, isLoading } = useAuthStore();

    // Check auth on mount
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-neutral-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <GoogleOAuthProvider clientId={config.googleClientId}>
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} future={{ v7_startTransition: true }} />
                <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    classNames: {
                        toast: "bg-white border border-neutral-200 shadow-lg",
                        title: "text-neutral-900 font-medium",
                        description: "text-neutral-600",
                        success: "border-l-4 border-l-green-500",
                        error: "border-l-4 border-l-red-500",
                        warning: "border-l-4 border-l-amber-500",
                        info: "border-l-4 border-l-blue-500",
                    },
                }}
            />
            <SpeedInsights />
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
            </QueryClientProvider>
        </GoogleOAuthProvider>
    );
}

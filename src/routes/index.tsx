import { createBrowserRouter, Navigate, Outlet, Link } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { RouteTracker } from "@components/RouteTracker";
import { AuthLayout, DashboardLayout, PublicLayout } from "@layouts/index";
import { ProtectedRoute } from "./ProtectedRoute";
import { SuspenseWrapper } from "@components/index";
import { lazyRetry } from "@utils/lazyRetry";

// Lazy load pages with retry mechanism
const LoginPage = lazyRetry(() =>
    import("@features/auth/pages/LoginPage").then((m) => ({ default: m.LoginPage }))
);

const AuthCallbackPage = lazyRetry(() =>
    import("@features/auth/pages/AuthCallbackPage").then((m) => ({ default: m.AuthCallbackPage }))
);

const DashboardPage = lazyRetry(() =>
    import("@features/dashboard/pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);

const CreateQuestPage = lazyRetry(() =>
    import("@features/quest/pages/CreateQuestPage").then((m) => ({ default: m.CreateQuestPage }))
);

const QuestSuccessPage = lazyRetry(() =>
    import("@features/quest/pages/QuestSuccessPage").then((m) => ({ default: m.QuestSuccessPage }))
);

const PrivacyPolicyPage = lazyRetry(() =>
    import("@features/legal/pages/PrivacyPolicyPage").then((m) => ({ default: m.PrivacyPolicyPage }))
);



const ContactUsPage = lazyRetry(() =>
    import("@features/contact/pages/ContactUsPage").then((m) => ({ default: m.ContactUsPage }))
);

const RootWrapper = () => (
    <>
        <RouteTracker />
        <Analytics />
        <Outlet />
    </>
);

export const router = createBrowserRouter([
    {
        element: <RootWrapper />,
        children: [
            {
                path: "/",
                element: <Navigate to="/creator/login" replace />,
            },
            {
                element: <PublicLayout />,
                children: [
                    {
                        path: "/privacy-policy",
                        element: (
                            <SuspenseWrapper>
                                <PrivacyPolicyPage />
                            </SuspenseWrapper>
                        ),
                    },
                    {
                        path: "/contact",
                        element: (
                            <SuspenseWrapper>
                                <ContactUsPage />
                            </SuspenseWrapper>
                        ),
                    },
                ],
            },
            {
                path: "/creator",
                children: [
                    {
                        element: <AuthLayout />,
                        children: [
                            {
                                path: "login",
                                element: (
                                    <SuspenseWrapper>
                                        <LoginPage />
                                    </SuspenseWrapper>
                                ),
                            },
                            {
                                path: "auth/callback",
                                element: (
                                    <SuspenseWrapper>
                                        <AuthCallbackPage />
                                    </SuspenseWrapper>
                                ),
                            },
                        ],
                    },
                    {
                        element: (
                            <ProtectedRoute>
                                <DashboardLayout />
                            </ProtectedRoute>
                        ),
                        children: [
                            {
                                path: "dashboard",
                                element: (
                                    <SuspenseWrapper>
                                        <DashboardPage />
                                    </SuspenseWrapper>
                                ),
                            },
                            {
                                path: "quest/create",
                                element: (
                                    <SuspenseWrapper>
                                        <CreateQuestPage />
                                    </SuspenseWrapper>
                                ),
                            },
                            {
                                path: "quest/success",
                                element: (
                                    <SuspenseWrapper>
                                        <QuestSuccessPage />
                                    </SuspenseWrapper>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                path: "*",
                element: (
                    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                        <div className="text-center">
                            <h1 className="text-6xl font-bold text-neutral-900 mb-4">404</h1>
                            <p className="text-neutral-600 mb-8">Page not found</p>
                            <Link
                                to="/creator/login"
                                className="text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                Go to Login
                            </Link>
                        </div>
                    </div>
                ),
            },
        ],
    },
]);

import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout, DashboardLayout } from "@layouts/index";
import { ProtectedRoute } from "./ProtectedRoute";
import { SuspenseWrapper } from "@components/index";

// Lazy load pages
const LoginPage = lazy(() =>
    import("@features/auth/pages/LoginPage").then((m) => ({ default: m.LoginPage }))
);

const DashboardPage = lazy(() =>
    import("@features/dashboard/pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);

const CreateQuestPage = lazy(() =>
    import("@features/quest/pages/CreateQuestPage").then((m) => ({ default: m.CreateQuestPage }))
);

const QuestSuccessPage = lazy(() =>
    import("@features/quest/pages/QuestSuccessPage").then((m) => ({ default: m.QuestSuccessPage }))
);


export const router = createBrowserRouter([
    {
        path: "/",
        element: <Navigate to="/creator/login" replace />,
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
                    <a
                        href="/creator/login"
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Go to Login
                    </a>
                </div>
            </div>
        ),
    },
]);

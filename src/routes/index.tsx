import { createBrowserRouter, Navigate, Link } from "react-router-dom";
import { AuthLayout, DashboardLayout, PublicLayout } from "@layouts/index";
import { ProtectedRoute } from "./ProtectedRoute";
import { SuspenseWrapper, RootWrapper } from "@components/index";
import { lazyRetry } from "@utils/lazyRetry";

// Lazy load pages with retry mechanism
const LoginPage = lazyRetry(() =>
    import("@features/auth/pages/LoginPage").then((m) => ({ default: m.LoginPage }))
);

const AccessDeniedPage = lazyRetry(() =>
    import("@features/auth/pages/AccessDeniedPage").then((m) => ({ default: m.AccessDeniedPage }))
);

const DashboardPage = lazyRetry(() =>
    import("@features/dashboard/pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);

const ProfilePage = lazyRetry(() =>
    import("@features/profile/pages/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);

const CreateQuestPage = lazyRetry(() =>
    import("@features/quest/pages/CreateQuestPage").then((m) => ({ default: m.CreateQuestPage }))
);

const QuestsPage = lazyRetry(() =>
    import("@features/quest/pages/QuestsPage").then((m) => ({ default: m.QuestsPage }))
);

const QuestSuccessPage = lazyRetry(() =>
    import("@features/quest/pages/QuestSuccessPage").then((m) => ({ default: m.QuestSuccessPage }))
);

const QuestDetailPage = lazyRetry(() =>
    import("@features/quest/pages/QuestDetailPage").then((m) => ({ default: m.QuestDetailPage }))
);

const PrivacyPolicyPage = lazyRetry(() =>
    import("@features/legal/pages/PrivacyPolicyPage").then((m) => ({ default: m.PrivacyPolicyPage }))
);

const TermsAndConditionsPage = lazyRetry(() =>
    import("@features/legal/pages/TermsAndConditionsPage").then((m) => ({ default: m.TermsAndConditionsPage }))
);

const ContactUsPage = lazyRetry(() =>
    import("@features/contact/pages/ContactUsPage").then((m) => ({ default: m.ContactUsPage }))
);

const MarkersPage = lazyRetry(() =>
    import("@features/markers/pages/MarkersPage").then((m) => ({ default: m.MarkersPage }))
);

const MarkerDetailPage = lazyRetry(() =>
    import("@features/markers/pages/MarkerDetailPage").then((m) => ({ default: m.MarkerDetailPage }))
);

const NarrativesPage = lazyRetry(() =>
    import("@features/narratives/pages/NarrativesPage").then((m) => ({ default: m.NarrativesPage }))
);

const NarrativeDetailPage = lazyRetry(() =>
    import("@features/narratives/pages/NarrativeDetailPage").then((m) => ({ default: m.NarrativeDetailPage }))
);

const TasksPage = lazyRetry(() =>
    import("@features/tasks/pages/TasksPage").then((m) => ({ default: m.TasksPage }))
);

const TaskDetailPage = lazyRetry(() =>
    import("@features/tasks/pages/TaskDetailPage").then((m) => ({ default: m.TaskDetailPage }))
);

const PayoutAccountsPage = lazyRetry(() =>
    import("@features/payoutAccounts/pages/PayoutAccountsPage").then((m) => ({
        default: m.PayoutAccountsPage,
    }))
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
                        path: "/terms-and-conditions",
                        element: (
                            <SuspenseWrapper>
                                <TermsAndConditionsPage />
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
                                path: "access-denied",
                                element: (
                                    <SuspenseWrapper>
                                        <AccessDeniedPage />
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
                                path: "profile",
                                element: (
                                    <SuspenseWrapper>
                                        <ProfilePage />
                                    </SuspenseWrapper>
                                ),
                            },
                            {
                                path: "quests",
                                element: (
                                    <SuspenseWrapper>
                                        <QuestsPage />
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
                                path: "quest/edit/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <CreateQuestPage />
                                    </SuspenseWrapper>
                                ),
                            },
                            {
                                path: "quest/view/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <QuestDetailPage />
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
                            {
                                path: "markers",
                                element: (
                                    <SuspenseWrapper>
                                        <MarkersPage />
                                    </SuspenseWrapper>
                                ),
                            },
                            {
                                path: "markers/view/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <MarkerDetailPage />
                                    </SuspenseWrapper>
                                ),
                            },
                            {
                                path: "narratives",
                                element: (
                                    <SuspenseWrapper>
                                        <NarrativesPage />
                                    </SuspenseWrapper>
                                ),
                            },
                            {
                                path: "narratives/view/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <NarrativeDetailPage />
                                    </SuspenseWrapper>
                                ),
                            },
                            {
                                path: "tasks",
                                element: (
                                    <SuspenseWrapper>
                                        <TasksPage />
                                    </SuspenseWrapper>
                                ),
                            },
                            {
                                path: "tasks/view/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <TaskDetailPage />
                                    </SuspenseWrapper>
                                ),
                            },
                            {
                                path: "payout-accounts",
                                element: (
                                    <SuspenseWrapper>
                                        <PayoutAccountsPage />
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
                                className="text-primary-600 hover:text-primary-700 font-medium"
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

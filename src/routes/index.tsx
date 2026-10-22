import type { ComponentType, ReactNode } from "react";
import { createBrowserRouter, Navigate, Link } from "react-router-dom";
import { AuthLayout, DashboardLayout, PublicLayout } from "@layouts/index";
import { HomeRedirect, ProtectedRoute } from "./ProtectedRoute";
import { SuspenseWrapper, RootWrapper } from "@components/index";
import { SectionGate } from "@features/business/components/SectionGate";
import { FeatureGate } from "@features/business/components/FeatureGate";
import type { BusinessFeature, PartnerSection } from "@services/business.types";
import { lazyRetry } from "@utils/lazyRetry";

// Lazy load pages with retry mechanism
const LoginPage = lazyRetry(() =>
    import("@features/auth/pages/LoginPage").then((m) => ({ default: m.LoginPage }))
);

const CreatorApplicationPage = lazyRetry(() =>
    import("@features/auth/pages/CreatorApplicationPage").then((m) => ({ default: m.CreatorApplicationPage }))
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

const EventsPage = lazyRetry(() =>
    import("@features/events/pages/EventsPage").then((m) => ({ default: m.EventsPage }))
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

// ── Partner Portal (business workspace) ─────────────────────────────────────
const lazyBusiness = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
    lazyRetry(() => load().then((m) => ({ default: m[name] })));

const BusinessLayout = lazyBusiness(() => import("@features/business/BusinessLayout"), "BusinessLayout");
const BusinessOverviewPage = lazyBusiness(() => import("@features/business/pages/OverviewPage"), "OverviewPage");
const BusinessCollabsPage = lazyBusiness(() => import("@features/business/pages/CollabsPage"), "CollabsPage");
const BusinessRequestsPage = lazyBusiness(() => import("@features/business/pages/RequestsPage"), "RequestsPage");
const BusinessDiscoverPage = lazyBusiness(() => import("@features/business/pages/DiscoverPage"), "DiscoverPage");
const BusinessContentPage = lazyBusiness(() => import("@features/business/pages/ContentPage"), "ContentPage");
const BusinessAttributionPage = lazyBusiness(() => import("@features/business/pages/AttributionPage"), "AttributionPage");
const BusinessOffersPage = lazyBusiness(() => import("@features/business/pages/OffersPage"), "OffersPage");
const BusinessLocationsPage = lazyBusiness(() => import("@features/business/pages/LocationsPage"), "LocationsPage");
const BusinessTeamPage = lazyBusiness(() => import("@features/business/pages/TeamPage"), "TeamPage");
const BusinessBillingPage = lazyBusiness(() => import("@features/business/pages/BillingPage"), "BillingPage");
const BusinessProfilePage = lazyBusiness(() => import("@features/business/pages/BusinessProfilePage"), "BusinessProfilePage");
const BusinessBlocksPage = lazyBusiness(() => import("@features/business/pages/BlocksPage"), "BlocksPage");
const BusinessMessagesPage = lazyBusiness(() => import("@features/business/pages/MessagesPage"), "MessagesPage");
const BusinessExperiencesPage = lazyBusiness(() => import("@features/business/pages/ExperiencesPage"), "ExperiencesPage");
const BusinessExperienceEditorPage = lazyBusiness(
    () => import("@features/business/pages/ExperienceEditorPage"),
    "ExperienceEditorPage"
);
const BusinessExperienceSlotsPage = lazyBusiness(
    () => import("@features/business/pages/ExperienceSlotsPage"),
    "ExperienceSlotsPage"
);
const BusinessExperienceBookingsPage = lazyBusiness(
    () => import("@features/business/pages/ExperienceBookingsPage"),
    "ExperienceBookingsPage"
);
const BusinessApplicationPage = lazyBusiness(
    () => import("@features/business/pages/BusinessApplicationPage"),
    "BusinessApplicationPage"
);

const page = (node: ReactNode) => <SuspenseWrapper>{node}</SuspenseWrapper>;
/** A Partner Portal page the admin can hide; hidden pages redirect to the Overview. */
const gated = (section: PartnerSection, node: ReactNode) => <SectionGate section={section}>{page(node)}</SectionGate>;
/** Pages of a per-business product (Collabs, Experiences); when it's off they show a friendly note. */
const featured = (feature: BusinessFeature, element: ReactNode) => <FeatureGate feature={feature}>{element}</FeatureGate>;

export const router = createBrowserRouter(
    [
    {
        element: <RootWrapper />,
        children: [
            {
                path: "/",
                element: <HomeRedirect />,
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
                    // "Become a creator": Google sign-in first, then the short application.
                    {
                        element: (
                            <ProtectedRoute workspace="any">
                                <AuthLayout />
                            </ProtectedRoute>
                        ),
                        children: [
                            {
                                path: "apply",
                                element: (
                                    <SuspenseWrapper>
                                        <CreatorApplicationPage />
                                    </SuspenseWrapper>
                                ),
                            },
                        ],
                    },
                    // Legacy business URLs → the Partner Portal.
                    { path: "business", element: <Navigate to="/business" replace /> },
                    { path: "business/apply", element: <Navigate to="/business/apply" replace /> },
                    {
                        element: (
                            <ProtectedRoute workspace="creator">
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
                                path: "events",
                                element: (
                                    <SuspenseWrapper>
                                        <EventsPage />
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
                // Partner Portal. Any signed-in user may apply; the rest needs a business membership.
                path: "/business",
                element: (
                    <ProtectedRoute workspace="any">
                        <DashboardLayout />
                    </ProtectedRoute>
                ),
                children: [
                    { path: "apply", element: page(<BusinessApplicationPage />) },
                    {
                        element: (
                            <ProtectedRoute workspace="business">
                                {page(<BusinessLayout />)}
                            </ProtectedRoute>
                        ),
                        children: [
                            { index: true, element: page(<BusinessOverviewPage />) },
                            { path: "experiences", element: featured("experiences", page(<BusinessExperiencesPage />)) },
                            {
                                path: "experiences/new",
                                element: featured("experiences", page(<BusinessExperienceEditorPage />)),
                            },
                            {
                                path: "experiences/:experienceId",
                                element: featured("experiences", page(<BusinessExperienceEditorPage />)),
                            },
                            {
                                path: "experiences/:experienceId/slots",
                                element: featured("experiences", page(<BusinessExperienceSlotsPage />)),
                            },
                            { path: "bookings", element: featured("experiences", page(<BusinessExperienceBookingsPage />)) },
                            { path: "collabs", element: featured("collabs", page(<BusinessCollabsPage />)) },
                            { path: "requests", element: featured("collabs", page(<BusinessRequestsPage />)) },
                            { path: "messages", element: featured("collabs", gated("messages", <BusinessMessagesPage />)) },
                            { path: "discover", element: featured("collabs", gated("matchmaking", <BusinessDiscoverPage />)) },
                            { path: "content", element: featured("collabs", gated("content_library", <BusinessContentPage />)) },
                            { path: "attribution", element: featured("collabs", gated("attribution", <BusinessAttributionPage />)) },
                            { path: "offers", element: gated("offers", <BusinessOffersPage />) },
                            { path: "locations", element: page(<BusinessLocationsPage />) },
                            { path: "team", element: gated("team", <BusinessTeamPage />) },
                            { path: "billing", element: gated("plans", <BusinessBillingPage />) },
                            { path: "profile", element: page(<BusinessProfilePage />) },
                            { path: "blocks", element: featured("collabs", gated("blocked_creators", <BusinessBlocksPage />)) },
                            { path: "*", element: <Navigate to="/business" replace /> },
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
    ],
    {
        future: {
            v7_relativeSplatPath: true,
        },
    }
);

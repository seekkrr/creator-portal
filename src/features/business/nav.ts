import {
    Ban,
    CalendarCheck,
    CreditCard,
    Handshake,
    Images,
    Inbox,
    KeyRound,
    LayoutDashboard,
    LineChart,
    MessageSquareText,
    MessagesSquare,
    Sparkles,
    Store,
    Tag,
    Ticket,
    Users,
    type LucideIcon,
} from "lucide-react";
import type { BusinessFeature, MemberRole, PartnerSection } from "@services/business.types";

export interface BusinessNavItem {
    to: string;
    label: string;
    icon: LucideIcon;
    /** Minimum team role that sees the item. */
    minRole?: MemberRole;
    end?: boolean;
    badge?: "pending_requests";
    /** Admin-controlled section; the item is hidden when it's switched off. */
    section?: PartnerSection;
    /** Per-business product (admin switch); the item is hidden when it's off for this business. */
    feature?: BusinessFeature;
}

export interface BusinessNavGroup {
    title: string | null;
    items: BusinessNavItem[];
}

export const BUSINESS_NAV: BusinessNavGroup[] = [
    {
        title: null,
        items: [
            { to: "/business", label: "Overview", icon: LayoutDashboard, end: true },
            // Command chat: every role sees it; the server decides what each may run.
            { to: "/business/chat", label: "Chat", icon: MessageSquareText },
        ],
    },
    {
        title: "Experiences",
        items: [
            { to: "/business/experiences", label: "Experiences", icon: Ticket, feature: "experiences" },
            { to: "/business/bookings", label: "Bookings", icon: CalendarCheck, feature: "experiences" },
        ],
    },
    {
        title: "Creators",
        items: [
            { to: "/business/collabs", label: "UGC Content", icon: Handshake, feature: "collabs" },
            {
                to: "/business/requests",
                label: "Requests & visits",
                icon: Inbox,
                badge: "pending_requests",
                feature: "collabs",
            },
            {
                to: "/business/messages",
                label: "Messages",
                icon: MessagesSquare,
                section: "messages",
                feature: "collabs",
            },
            {
                to: "/business/discover",
                label: "Discover creators",
                icon: Sparkles,
                minRole: "manager",
                section: "matchmaking",
                feature: "collabs",
            },
        ],
    },
    {
        title: "Proof of value",
        items: [
            {
                to: "/business/content",
                label: "Redemptions & content",
                icon: Images,
                section: "content_library",
                feature: "collabs",
            },
            {
                to: "/business/attribution",
                label: "Attribution",
                icon: LineChart,
                section: "attribution",
                feature: "collabs",
            },
        ],
    },
    {
        title: "Your place",
        items: [
            { to: "/business/offers", label: "Check-in offers", icon: Tag, section: "offers" },
            { to: "/business/locations", label: "Locations & codes", icon: KeyRound },
            { to: "/business/profile", label: "Business profile", icon: Store },
        ],
    },
    {
        title: "Account",
        items: [
            { to: "/business/team", label: "Team", icon: Users, minRole: "owner", section: "team" },
            { to: "/business/billing", label: "Plan & billing", icon: CreditCard, section: "plans" },
            {
                to: "/business/blocks",
                label: "Blocked creators",
                icon: Ban,
                minRole: "manager",
                section: "blocked_creators",
                feature: "collabs",
            },
        ],
    },
];

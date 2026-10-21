import {
    Ban,
    CreditCard,
    Handshake,
    Images,
    Inbox,
    KeyRound,
    LayoutDashboard,
    LineChart,
    MessagesSquare,
    Sparkles,
    Store,
    Tag,
    Users,
    type LucideIcon,
} from "lucide-react";
import type { MemberRole, PartnerSection } from "@services/business.types";

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
}

export interface BusinessNavGroup {
    title: string | null;
    items: BusinessNavItem[];
}

export const BUSINESS_NAV: BusinessNavGroup[] = [
    {
        title: null,
        items: [{ to: "/business", label: "Overview", icon: LayoutDashboard, end: true }],
    },
    {
        title: "Creators",
        items: [
            { to: "/business/collabs", label: "UGC Content", icon: Handshake },
            { to: "/business/requests", label: "Requests & visits", icon: Inbox, badge: "pending_requests" },
            { to: "/business/messages", label: "Messages", icon: MessagesSquare, section: "messages" },
            {
                to: "/business/discover",
                label: "Discover creators",
                icon: Sparkles,
                minRole: "manager",
                section: "matchmaking",
            },
        ],
    },
    {
        title: "Proof of value",
        items: [
            { to: "/business/content", label: "Redemptions & content", icon: Images, section: "content_library" },
            { to: "/business/attribution", label: "Attribution", icon: LineChart, section: "attribution" },
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
            },
        ],
    },
];

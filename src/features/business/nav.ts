import {
    Ban,
    CreditCard,
    Handshake,
    Images,
    Inbox,
    KeyRound,
    LayoutDashboard,
    LineChart,
    Sparkles,
    Store,
    Tag,
    Users,
    type LucideIcon,
} from "lucide-react";
import type { MemberRole } from "@services/business.types";

export interface BusinessNavItem {
    to: string;
    label: string;
    icon: LucideIcon;
    /** Minimum team role that sees the item. */
    minRole?: MemberRole;
    end?: boolean;
    badge?: "pending_requests";
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
            { to: "/business/discover", label: "Discover creators", icon: Sparkles, minRole: "manager" },
        ],
    },
    {
        title: "Proof of value",
        items: [
            { to: "/business/content", label: "Redemptions & content", icon: Images },
            { to: "/business/attribution", label: "Attribution", icon: LineChart },
        ],
    },
    {
        title: "Your place",
        items: [
            { to: "/business/offers", label: "Check-in offers", icon: Tag },
            { to: "/business/locations", label: "Locations & codes", icon: KeyRound },
            { to: "/business/profile", label: "Business profile", icon: Store },
        ],
    },
    {
        title: "Account",
        items: [
            { to: "/business/team", label: "Team", icon: Users, minRole: "owner" },
            { to: "/business/billing", label: "Plan & billing", icon: CreditCard },
            { to: "/business/blocks", label: "Blocked creators", icon: Ban, minRole: "manager" },
        ],
    },
];

import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@store/auth.store";
import { Briefcase, Check, ChevronDown, Compass, LogOut, Menu, Store, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Footer } from "@components/ui";
import { BUSINESS_HOME, CREATOR_HOME, useWorkspace, type Workspace } from "@hooks/useWorkspace";

const CREATOR_LINKS = [
    { to: "/creator/quests", label: "My Quests" },
    { to: "/creator/markers", label: "My Markers" },
    { to: "/creator/events", label: "My Events" },
    { to: "/creator/narratives", label: "My Narratives" },
    { to: "/creator/tasks", label: "My Tasks" },
    { to: "/creator/payout-accounts", label: "My Payouts" },
    { to: "/creator/chat", label: "Chat" },
    { to: "/creator/profile", label: "Profile" },
];

/** Creator ↔ Business toggle for accounts that hold both roles. */
function WorkspaceSwitcher({ ws, onSwitch }: { ws: Workspace; onSwitch?: () => void }) {
    const navigate = useNavigate();
    if (!ws.isDualRole) return null;
    const go = (mode: "creator" | "business") => {
        ws.rememberMode(mode);
        navigate(mode === "creator" ? CREATOR_HOME : BUSINESS_HOME);
        onSwitch?.();
    };
    return (
        <div role="radiogroup" aria-label="Workspace" className="inline-flex p-1 rounded-full bg-neutral-100 border border-neutral-200 shrink-0">
            {(
                [
                    { mode: "creator", label: "Creator", icon: Compass },
                    { mode: "business", label: "Business", icon: Briefcase },
                ] as const
            ).map(({ mode, label, icon: Icon }) => (
                <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={ws.mode === mode}
                    onClick={() => ws.mode !== mode && go(mode)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        ws.mode === mode ? "bg-white text-primary-800 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                    }`}
                >
                    <Icon className="w-4 h-4" />
                    {label}
                </button>
            ))}
        </div>
    );
}

/** Active business + picker when the user belongs to several businesses. */
function BusinessPicker({ ws, onPick }: { ws: Workspace; onPick?: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    const active = ws.activeBusiness;
    if (!active) return null;
    const multiple = ws.businesses.length > 1;

    const label = (
        <>
            {active.logo_url ? (
                <img src={active.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover border border-neutral-200" />
            ) : (
                <span className="w-7 h-7 rounded-lg bg-primary-900 text-highlight flex items-center justify-center">
                    <Store className="w-4 h-4" />
                </span>
            )}
            <span className="min-w-0 text-left">
                <span className="block text-sm font-semibold text-neutral-900 truncate max-w-[12rem]">{active.name}</span>
                <span className="block text-[11px] text-neutral-500 capitalize leading-tight">
                    {active.admin_view ? "Admin view" : (active.my_role ?? "member")}
                </span>
            </span>
        </>
    );

    if (!multiple) return <div className="flex items-center gap-2 min-w-0">{label}</div>;

    return (
        <div ref={ref} className="relative min-w-0">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-neutral-100 min-w-0"
            >
                {label}
                <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <ul
                    role="listbox"
                    className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-1.5"
                >
                    {ws.businesses.map((b) => (
                        <li key={b.id}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={b.id === active.id}
                                onClick={() => {
                                    ws.setActiveBusiness(b.id);
                                    setOpen(false);
                                    onPick?.();
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50"
                            >
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-medium text-neutral-900 truncate">{b.name}</span>
                                    <span className="block text-xs text-neutral-500 capitalize">
                                        {b.admin_view ? "Admin view" : (b.my_role ?? "member")}
                                    </span>
                                </span>
                                {b.id === active.id && <Check className="w-4 h-4 text-primary-600" />}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function DashboardLayout() {
    const { logout } = useAuthStore();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const ws = useWorkspace();
    const { mode, access, rememberMode } = ws;
    const businessMode = mode === "business";

    // Remember the last workspace a dual-role user worked in (used after login). An admin view isn't theirs.
    useEffect(() => {
        if (mode === "business" ? access.business && !access.adminView : access.creator) rememberMode(mode);
    }, [mode, access.business, access.adminView, access.creator, rememberMode]);

    const handleLogout = async () => {
        await logout();
        navigate("/creator/login");
    };

    const homeLink = businessMode ? (access.business ? BUSINESS_HOME : ws.homePath) : CREATOR_HOME;

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col">
            <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 font-sans">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-20 gap-4">
                        {/* Logo */}
                        <Link to={homeLink} className="flex items-center gap-2 shrink-0">
                            <img src="/seekkrr-logo.svg" alt="SeekKrr" className="h-8" />
                            {businessMode && (
                                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-highlight text-primary-900 text-[11px] font-bold uppercase tracking-wide">
                                    Partner
                                </span>
                            )}
                        </Link>

                        {businessMode ? (
                            <div className="hidden md:flex items-center gap-4 ml-4 min-w-0">
                                <BusinessPicker ws={ws} />
                            </div>
                        ) : (
                            /* Desktop Navigation — creator workflow tabs only.
                               Terms / Privacy / Contact live in the footer. */
                            access.creator && (
                                <nav className="hidden md:flex items-center gap-8 ml-auto">
                                    {CREATOR_LINKS.map((l) => (
                                        <Link
                                            key={l.to}
                                            to={l.to}
                                            className="text-base font-normal text-neutral-600 hover:text-neutral-900 transition-colors"
                                        >
                                            {l.label}
                                        </Link>
                                    ))}
                                </nav>
                            )
                        )}

                        {/* Workspace switcher + user menu */}
                        <div className={`hidden md:flex items-center gap-4 ${businessMode || !access.creator ? "ml-auto" : "ml-8"}`}>
                            <WorkspaceSwitcher ws={ws} />
                            {businessMode && !access.business && access.creator && (
                                <Link to={CREATOR_HOME} className="text-sm font-medium text-primary-700 hover:underline">
                                    Back to Creator Portal
                                </Link>
                            )}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="text-sm font-normal">Logout</span>
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden ml-auto p-2 text-neutral-600 hover:text-neutral-900"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-neutral-200 bg-white">
                        <div className="px-4 py-4 space-y-4">
                            {ws.isDualRole && (
                                <WorkspaceSwitcher ws={ws} onSwitch={() => setIsMobileMenuOpen(false)} />
                            )}
                            {businessMode ? (
                                <>
                                    <BusinessPicker ws={ws} onPick={() => setIsMobileMenuOpen(false)} />
                                    {!access.business && access.creator && (
                                        <Link
                                            to={CREATOR_HOME}
                                            className="block text-base font-medium text-primary-700"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            Back to Creator Portal
                                        </Link>
                                    )}
                                </>
                            ) : (
                                access.creator &&
                                CREATOR_LINKS.map((l) => (
                                    <Link
                                        key={l.to}
                                        to={l.to}
                                        className="block text-base font-normal text-neutral-600 hover:text-neutral-900"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {l.label}
                                    </Link>
                                ))
                            )}
                            <div className="pt-4 border-t border-neutral-100">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 text-red-600 hover:text-red-700 font-normal"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
                <Outlet />
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}

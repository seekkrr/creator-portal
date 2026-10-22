import { useMemo } from "react";
import { Navigate, NavLink, Outlet } from "react-router-dom";
import { LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { LoadingFallback } from "@components/LoadingFallback";
import { Button } from "@components/ui";
import { useWorkspace } from "@hooks/useWorkspace";
import { BusinessContext, type BusinessContextValue } from "./context";
import { BUSINESS_NAV } from "./nav";
import { useHub } from "./queries";
import { usePartnerPortal } from "./partnerPortal";
import { useBusinessFeatures } from "./features";
import { errorMessage, roleAtLeast } from "./utils";
import { Banner } from "./components/bits";
import { CopyEmailText } from "./components/CopyEmail";

function NavBadge({ count }: { count: number }) {
    if (!count) return null;
    return (
        <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-accent-500 text-white text-[11px] font-bold flex items-center justify-center">
            {count > 99 ? "99+" : count}
        </span>
    );
}

function BusinessNav({ ctx }: { ctx: BusinessContextValue }) {
    const { data: hub } = useHub();
    const { show } = usePartnerPortal();
    const { has } = useBusinessFeatures();
    const groups = BUSINESS_NAV.map((g) => ({
        ...g,
        items: g.items.filter(
            (i) =>
                (!i.minRole || roleAtLeast(ctx.role, i.minRole)) &&
                (!i.section || show(i.section)) &&
                (!i.feature || has(i.feature))
        ),
    })).filter((g) => g.items.length);

    const badgeFor = (badge?: string) => (badge === "pending_requests" ? (hub?.pending_requests ?? 0) : 0);

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden lg:block w-60 shrink-0">
                <nav className="sticky top-24 space-y-5" aria-label="Partner Portal">
                    {groups.map((g) => (
                        <div key={g.title ?? "root"}>
                            {g.title && (
                                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                                    {g.title}
                                </p>
                            )}
                            <ul className="space-y-0.5">
                                {g.items.map((item) => (
                                    <li key={item.to}>
                                        <NavLink
                                            to={item.to}
                                            end={item.end}
                                            className={({ isActive }) =>
                                                `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                                                    isActive
                                                        ? "bg-primary-900 text-white font-semibold"
                                                        : "text-neutral-600 hover:bg-white hover:text-neutral-900"
                                                }`
                                            }
                                        >
                                            <item.icon className="w-4 h-4 shrink-0" />
                                            <span className="truncate">{item.label}</span>
                                            <NavBadge count={badgeFor(item.badge)} />
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Mobile / tablet: horizontal scroller */}
            <nav
                className="lg:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 mb-4 overflow-x-auto"
                aria-label="Partner Portal sections"
            >
                <ul className="flex gap-1.5 w-max pb-1">
                    {groups.flatMap((g) => g.items).map((item) => (
                        <li key={item.to}>
                            <NavLink
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
                                        isActive
                                            ? "bg-primary-900 text-white border-primary-900"
                                            : "bg-white text-neutral-600 border-neutral-200"
                                    }`
                                }
                            >
                                <item.icon className="w-3.5 h-3.5" />
                                {item.label}
                                <NavBadge count={badgeFor(item.badge)} />
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </>
    );
}

/** Slim strip shown while a platform admin works on a business (admin view). */
function AdminViewBanner({ name, onExit }: { name: string; onExit: () => void }) {
    return (
        <div
            role="status"
            className="mb-4 flex items-center gap-3 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900"
        >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <p className="flex-1 min-w-0 truncate">
                <span className="font-semibold">Admin view:</span> {name}
                <span className="hidden sm:inline text-amber-800/80"> · you have owner access</span>
            </p>
            <button
                type="button"
                onClick={onExit}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-900 hover:bg-amber-100 shrink-0"
            >
                <LogOut className="w-3.5 h-3.5" />
                Exit
            </button>
        </div>
    );
}

/**
 * Partner Portal shell: resolves the active business (workspace picker, or the
 * business a platform admin opened with `?business=<id>`), provides it to every
 * page, and renders the role-filtered section nav.
 */
export function BusinessLayout() {
    const { activeBusiness, adminView } = useWorkspace();

    const ctx = useMemo<BusinessContextValue | null>(() => {
        if (!activeBusiness) return null;
        const role = activeBusiness.my_role ?? "staff";
        return {
            business: activeBusiness,
            businessId: activeBusiness.id,
            role,
            isOwner: role === "owner",
            canManage: roleAtLeast(role, "manager"),
        };
    }, [activeBusiness]);

    if (!ctx && adminView.active) {
        if (adminView.isLoading) return <LoadingFallback message="Opening the business..." />;
        return (
            <Banner
                tone="danger"
                icon={<ShieldAlert className="w-5 h-5" />}
                title="Couldn't open this business"
                action={
                    <Button variant="outline" size="sm" onClick={adminView.exit}>
                        Exit admin view
                    </Button>
                }
            >
                {errorMessage(adminView.error, "Check the business ID and try again.")}
            </Banner>
        );
    }

    if (!ctx) return <Navigate to="/business/apply" replace />;

    return (
        <BusinessContext.Provider value={ctx}>
            {adminView.active && <AdminViewBanner name={ctx.business.name} onExit={adminView.exit} />}
            <div className="lg:flex lg:gap-8 animate-fade-in">
                <BusinessNav ctx={ctx} />
                <div className="flex-1 min-w-0 space-y-6">
                    {ctx.business.status === "suspended" && (
                        <Banner tone="danger" icon={<ShieldAlert className="w-5 h-5" />} title="This business is suspended">
                            Creators can't see your UGC briefs right now and most changes are disabled. Contact{" "}
                            <CopyEmailText />
                        </Banner>
                    )}
                    <Outlet />
                </div>
            </div>
        </BusinessContext.Provider>
    );
}

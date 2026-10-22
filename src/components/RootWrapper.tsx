import { Outlet } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { RouteTracker } from "@components/RouteTracker";
import { AdminViewSync } from "@hooks/useAdminView";

export function RootWrapper() {
    return (
        <>
            <RouteTracker />
            <AdminViewSync />
            <Analytics />
            <Outlet />
        </>
    );
}

import { Outlet } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { RouteTracker } from "@components/RouteTracker";

export function RootWrapper() {
    return (
        <>
            <RouteTracker />
            <Analytics />
            <Outlet />
        </>
    );
}

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Handshake, Ticket } from "lucide-react";
import { Button, Skeleton } from "@components/ui";
import type { BusinessFeature } from "@services/business.types";
import { useBusinessFeatures } from "../features";
import { CopyEmailText } from "./CopyEmail";

const OFF_COPY: Record<BusinessFeature, { title: string; body: string; icon: ReactNode }> = {
    collabs: {
        title: "Collabs are turned off for this business",
        body: "Collabs are turned off for this business. Contact SeekKrr to turn them on.",
        icon: <Handshake className="w-7 h-7" />,
    },
    experiences: {
        title: "Experiences aren't turned on for this business",
        body: "Experiences aren't turned on for this business. Contact SeekKrr to turn them on.",
        icon: <Ticket className="w-7 h-7" />,
    },
};

/** Friendly panel for a product SeekKrr hasn't switched on for this business. */
export function FeatureOff({ feature }: { feature: BusinessFeature }) {
    const copy = OFF_COPY[feature];
    return (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
            <div className="flex flex-col items-center justify-center text-center py-14 px-6">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 text-primary-600 mb-4">
                    {copy.icon}
                </div>
                <h2 className="text-lg font-display font-semibold text-neutral-900">{copy.title}</h2>
                <p className="text-sm text-neutral-500 mt-1 max-w-md">{copy.body}</p>
                <p className="text-sm text-neutral-600 mt-3">
                    Write to <CopyEmailText />
                </p>
                <Link to="/business" className="mt-6">
                    <Button variant="outline">Back to Overview</Button>
                </Link>
            </div>
        </div>
    );
}

/**
 * Route guard for a per-business product (admin switch). Pages of a product
 * that's off show a friendly note instead of the page.
 */
export function FeatureGate({ feature, children }: { feature: BusinessFeature; children: ReactNode }) {
    const { has, isLoading } = useBusinessFeatures();
    if (isLoading) {
        return (
            <div className="space-y-6" aria-busy="true">
                <Skeleton height={40} className="w-72" />
                <Skeleton height={260} />
            </div>
        );
    }
    if (!has(feature)) return <FeatureOff feature={feature} />;
    return <>{children}</>;
}

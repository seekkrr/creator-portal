import { useCallback, useMemo } from "react";
import type { BusinessFeature, BusinessFeatures } from "@services/business.types";
import { useBusiness } from "./context";
import { useBusinessDetail } from "./queries";

/** Backend defaults for a business created before the switches existed. */
export const BUSINESS_FEATURE_DEFAULTS: BusinessFeatures = { collabs: true, experiences: false };

export interface BusinessFeaturesValue {
    features: BusinessFeatures;
    /** Whether SeekKrr switched this product on for the active business. */
    has: (feature: BusinessFeature) => boolean;
    /** True only while nothing is known yet (no session copy and the detail is loading). */
    isLoading: boolean;
}

/**
 * Per-business products (Collabs, Experiences) for the active business. Reads
 * the fresh business detail (`GET /businesses/{id}`) and falls back to the
 * session copy from `GET /businesses/mine` while it loads.
 */
export function useBusinessFeatures(): BusinessFeaturesValue {
    const { business } = useBusiness();
    const detail = useBusinessDetail();
    const source = detail.data?.features ?? business.features ?? null;

    const features = useMemo<BusinessFeatures>(
        () => ({
            collabs: typeof source?.collabs === "boolean" ? source.collabs : BUSINESS_FEATURE_DEFAULTS.collabs,
            experiences:
                typeof source?.experiences === "boolean" ? source.experiences : BUSINESS_FEATURE_DEFAULTS.experiences,
        }),
        [source?.collabs, source?.experiences]
    );

    const has = useCallback((feature: BusinessFeature) => features[feature], [features]);

    return { features, has, isLoading: !source && detail.isLoading };
}

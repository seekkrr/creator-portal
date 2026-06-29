import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, MapPin, Link2, Navigation } from "lucide-react";
import { Button, FloatingInput, InfoHint } from "@components/ui";
import { RegionSearchSelect } from "./RegionSearchSelect";
import { regionService } from "@services/region.service";
import { locationStepSchema, type LocationStepData } from "../schemas/quest.schema";
import { config } from "@config/env";
import { VideoWalkthroughModal, VideoHelpButton } from "@components/VideoWalkthroughModal";
import { WALKTHROUGH_VIDEOS } from "@config/walkthroughVideos";
import type { ResolvedRegion } from "@/types";

interface LocationStepProps {
    defaultValues: Partial<LocationStepData>;
    onNext: (data: LocationStepData) => void;
}

export function LocationStep({ defaultValues, onNext }: LocationStepProps) {
    const [activeSection, setActiveSection] = useState<"location" | "url">(
        defaultValues.locationType === "url" ? "url" : "location"
    );
    const [isLocating, setIsLocating] = useState(false);

    // Restore a previously-resolved region (e.g. navigating back in the wizard).
    const [selectedRegion, setSelectedRegion] = useState<ResolvedRegion | null>(() => {
        if (
            defaultValues.regionId &&
            typeof defaultValues.latitude === "number" &&
            typeof defaultValues.longitude === "number"
        ) {
            return {
                region_id: defaultValues.regionId,
                name: defaultValues.regionName ?? defaultValues.city ?? "Selected region",
                type: defaultValues.regionType ?? "city",
                center: [defaultValues.longitude, defaultValues.latitude],
            };
        }
        return null;
    });

    // Seeds the region search box from "Use my current location". The nonce lets
    // the same place re-apply if the button is tapped again from the same spot.
    const [prefillQuery, setPrefillQuery] = useState<string | undefined>(undefined);
    const [prefillNonce, setPrefillNonce] = useState(0);
    const [proximity, setProximity] = useState<string | undefined>(undefined);
    // Region resolution is deferred to "Next" (see handleNextClick), so we track
    // its in-flight / error state here rather than in the search dropdown.
    const [isResolving, setIsResolving] = useState(false);
    const [resolveError, setResolveError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<LocationStepData>({
        resolver: zodResolver(locationStepSchema),
        defaultValues: {
            locationType: defaultValues.locationType ?? "city",
            city: defaultValues.city ?? "",
            sourceUrl: defaultValues.sourceUrl ?? "",
            latitude: defaultValues.latitude,
            longitude: defaultValues.longitude,
            regionId: defaultValues.regionId,
            regionName: defaultValues.regionName,
            regionType: defaultValues.regionType,
        },
    });

    const sourceUrl = watch("sourceUrl");

    const onSubmit = (data: LocationStepData) => {
        onNext(data);
    };

    // Resolve/create the region ONLY here, on an explicit "Next" — never on
    // dropdown selection — so clicking around can't spawn orphan regions. Existing
    // regions already carry a real region_id and skip the network call entirely.
    const handleNextClick = async () => {
        if (activeSection === "url") {
            handleSubmit(onSubmit)();
            return;
        }
        if (!selectedRegion) return;

        let region = selectedRegion;
        if (!region.region_id && region.pending_payload) {
            setIsResolving(true);
            setResolveError(null);
            try {
                const created = await regionService.resolveOrCreateRegion(region.pending_payload);
                const c = created.center_point?.coordinates;
                region = {
                    region_id: created.id,
                    name: created.name ?? region.name,
                    type: created.type,
                    center: Array.isArray(c) && c.length === 2 ? [c[0], c[1]] : region.center,
                };
                setSelectedRegion(region);
            } catch (err) {
                setResolveError(
                    err instanceof Error ? err.message : "Couldn't set that region. Try again."
                );
                setIsResolving(false);
                return;
            }
            setIsResolving(false);
        }

        if (!region.region_id) return;
        onNext({
            locationType: "city",
            city: region.name,
            sourceUrl: "",
            regionId: region.region_id,
            regionName: region.name,
            regionType: region.type,
            longitude: region.center[0],
            latitude: region.center[1],
        });
    };

    const handleRegionSelect = (region: ResolvedRegion | null) => {
        setResolveError(null);
        setSelectedRegion(region);
        if (region) {
            setValue("regionId", region.region_id);
            setValue("regionName", region.name);
            setValue("regionType", region.type);
            setValue("city", region.name);
            setValue("longitude", region.center[0]);
            setValue("latitude", region.center[1]);
            setValue("locationType", "city");
        } else {
            setValue("regionId", undefined);
            setValue("regionName", undefined);
            setValue("regionType", undefined);
            setValue("latitude", undefined);
            setValue("longitude", undefined);
        }
    };

    // Current location → reverse-geocode to a place NAME, then seed the region
    // search so the creator confirms the right region (one resolution path).
    const requestCurrentLocation = useCallback(() => {
        if (isLocating) return;
        setIsLocating(true);
        setActiveSection("location");
        setValue("locationType", "city");

        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            setIsLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { longitude, latitude } = position.coords;
                setProximity(`${longitude},${latitude}`);
                try {
                    const response = await fetch(
                        `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&access_token=${config.mapbox.accessToken}&limit=1&types=place,locality,neighborhood,district`
                    );
                    const data = await response.json();
                    const feature = data.features?.[0];
                    const name =
                        feature?.properties?.name ??
                        feature?.properties?.place_formatted ??
                        `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                    setPrefillQuery(name);
                    setPrefillNonce((n) => n + 1);
                } catch (err) {
                    console.error("Reverse geocode error:", err);
                    alert("Couldn't look up your location. Please search manually.");
                } finally {
                    setIsLocating(false);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                alert(`Unable to get your location: ${error.message}`);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }, [isLocating, setValue]);

    const canProceed =
        activeSection === "location" ? !!selectedRegion : !!(sourceUrl && sourceUrl.trim());

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="min-h-[60vh] flex flex-col justify-center"
            >
                {/* Step Header with section-level walkthrough video */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-neutral-900">Set Quest Location</h2>
                        <p className="text-sm text-neutral-500 mt-0.5">
                            Choose a region or share a reel URL to get started
                        </p>
                    </div>
                    <VideoHelpButton onClick={() => setIsModalOpen(true)} label="Watch walkthrough" />
                </div>

                <div className="grid lg:grid-cols-[1fr_auto_1fr] md:grid-cols-1 gap-6 lg:gap-0 items-stretch w-full">
                    {/* Location Section */}
                    <div
                        className={`
                            relative flex flex-col rounded-2xl border transition-all duration-200 cursor-pointer
                            p-8 lg:p-10
                            ${
                                activeSection === "location"
                                    ? "border-slate-900 bg-slate-50/50 shadow-md"
                                    : "border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm"
                            }
                        `}
                        onClick={() => {
                            setActiveSection("location");
                            setValue("locationType", "city");
                        }}
                    >
                        <div
                            className={`
                                w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors
                                ${activeSection === "location" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}
                            `}
                        >
                            <MapPin className="w-6 h-6" />
                        </div>

                        <div className="flex items-start gap-2 mb-2">
                            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">
                                Where is the Quest Located?
                            </h2>
                            <InfoHint
                                side="bottom"
                                widthClass="w-72"
                                label="About choosing a region"
                                text={
                                    <>
                                        Search a city, area, or landmark. We match it to a SeekKrr
                                        region — a broad pick becomes a <b>city</b>, a more specific
                                        area becomes a <b>hotspot</b> inside its city. Existing regions
                                        are reused automatically so quests stay grouped.
                                    </>
                                }
                            />
                        </div>
                        <p className="text-slate-500 mb-6">Search for a city, area, or landmark</p>

                        <div className="flex-1 space-y-4">
                            <RegionSearchSelect
                                value={selectedRegion}
                                onChange={handleRegionSelect}
                                proximity={proximity}
                                prefillQuery={prefillQuery}
                                prefillNonce={prefillNonce}
                                highlightOnFocus={activeSection === "location"}
                                error={
                                    activeSection === "location"
                                        ? (resolveError ??
                                          (!selectedRegion
                                              ? (errors.locationType?.message as string | undefined)
                                              : undefined))
                                        : undefined
                                }
                            />

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    requestCurrentLocation();
                                }}
                                disabled={isLocating}
                                className={`
                                    w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                                    bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium
                                    hover:from-indigo-600 hover:to-purple-700
                                    transition-all duration-200 shadow-md hover:shadow-lg
                                    disabled:opacity-70 disabled:cursor-wait
                                `}
                            >
                                {isLocating ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        <span>Getting your location...</span>
                                    </>
                                ) : (
                                    <>
                                        <Navigation className="w-5 h-5" />
                                        <span>Use My Current Location</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* OR Divider */}
                    <div className="flex items-center justify-center lg:px-8">
                        <div className="lg:flex flex-col items-center hidden">
                            <div className="w-px h-24 bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
                            <span className="my-4 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 font-medium text-xs tracking-wide">
                                OR
                            </span>
                            <div className="w-px h-24 bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
                        </div>
                        <div className="flex lg:hidden items-center w-full gap-4">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                            <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 font-medium text-xs tracking-wide">
                                OR
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                        </div>
                    </div>

                    {/* URL Section */}
                    <div
                        className={`
                            relative flex flex-col rounded-2xl border transition-all duration-200 cursor-pointer
                            p-8 lg:p-10
                            ${
                                activeSection === "url"
                                    ? "border-slate-900 bg-slate-50/50 shadow-md"
                                    : "border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm"
                            }
                        `}
                        onClick={() => {
                            setActiveSection("url");
                            setValue("locationType", "url");
                        }}
                    >
                        <div
                            className={`
                                w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors
                                ${activeSection === "url" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}
                            `}
                        >
                            <Link2 className="w-6 h-6" />
                        </div>

                        <div className="flex items-start gap-2 mb-2">
                            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">
                                Share URL of Reel / Video
                            </h2>
                            <InfoHint
                                side="bottom"
                                widthClass="w-72"
                                label="About sharing a URL"
                                text={
                                    <>
                                        Paste a reel, Short, YouTube, or blog link and we'll help build
                                        the quest from it. You'll set the region later when you place
                                        markers on the map.
                                    </>
                                }
                            />
                        </div>
                        <p className="text-slate-500 mb-6">
                            Shorts, Instagram Reels, YouTube, Blog links
                        </p>

                        <div className="flex-1">
                            <Controller
                                name="sourceUrl"
                                control={control}
                                render={({ field }) => (
                                    <FloatingInput
                                        {...field}
                                        label="URL"
                                        placeholder="https://instagram.com/reel/..."
                                        leftIcon={<Link2 className="w-5 h-5" />}
                                        error={
                                            activeSection === "url"
                                                ? errors.sourceUrl?.message
                                                : undefined
                                        }
                                        highlightOnFocus={activeSection === "url"}
                                    />
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* Next */}
                <div className="flex justify-center mt-10">
                    <Button
                        type="button"
                        onClick={handleNextClick}
                        disabled={!canProceed || isResolving}
                        variant="outline"
                        className="rounded-lg px-10 py-3 text-sm font-medium border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        rightIcon={<ChevronRight className="w-5 h-5" />}
                    >
                        {isResolving ? "Setting region…" : "Next"}
                    </Button>
                </div>
            </form>

            <VideoWalkthroughModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                videoUrl={WALKTHROUGH_VIDEOS.LOCATION}
                title="Location & Details Walkthrough"
            />
        </>
    );
}

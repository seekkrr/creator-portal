import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, MapPin, Link2, Navigation } from "lucide-react";
import { Button, FloatingInput } from "@components/ui";
import { MapboxLocationSearch, type SelectedLocation } from "@components/MapboxLocationSearch";
import { locationStepSchema, type LocationStepData } from "../schemas/quest.schema";
import { config } from "@config/env";

interface LocationStepProps {
    defaultValues: Partial<LocationStepData>;
    onNext: (data: LocationStepData) => void;
}

export function LocationStep({ defaultValues, onNext }: LocationStepProps) {
    const [activeSection, setActiveSection] = useState<"location" | "url">(
        defaultValues.locationType === "url" ? "url" : "location"
    );
    const [isLocating, setIsLocating] = useState(false);

    // Initialize selectedLocation from defaults if available
    const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(() => {
        if (defaultValues.latitude && defaultValues.longitude && defaultValues.city) {
            return {
                latitude: defaultValues.latitude,
                longitude: defaultValues.longitude,
                place_name: defaultValues.city,
                city: defaultValues.city,
            };
        }
        return null;
    });

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
        },
    });

    const sourceUrl = watch("sourceUrl");

    const onSubmit = (data: LocationStepData) => {
        onNext(data);
    };

    const handleLocationSelect = (location: SelectedLocation | null) => {
        setSelectedLocation(location);
        if (location) {
            setValue("city", location.city ?? location.place_name);
            setValue("latitude", location.latitude);
            setValue("longitude", location.longitude);
            setValue("locationType", "city");
        } else {
            setValue("latitude", undefined);
            setValue("longitude", undefined);
        }
    };

    // Get current location using Geolocation API
    const requestCurrentLocation = useCallback(() => {
        if (isLocating) return;

        setIsLocating(true);
        setActiveSection("location");

        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            setIsLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { longitude, latitude } = position.coords;

                // Reverse geocode for place name
                try {
                    const response = await fetch(
                        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${config.mapbox.accessToken}`
                    );
                    const data = await response.json();

                    const place = data.features?.[0];
                    const city = place?.context?.find((c: { id: string }) => c.id.startsWith("place"))?.text;

                    const locationData: SelectedLocation = {
                        longitude,
                        latitude,
                        place_name: place?.place_name ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                        city: city ?? place?.text ?? place?.place_name,
                    };

                    // Update state directly to avoid stale closure
                    setSelectedLocation(locationData);
                    setValue("city", locationData.city ?? locationData.place_name);
                    setValue("latitude", locationData.latitude);
                    setValue("longitude", locationData.longitude);
                    setValue("locationType", "city");
                } catch (err) {
                    console.error('Geocode error:', err);
                    const locationData: SelectedLocation = {
                        longitude,
                        latitude,
                        place_name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                    };
                    setSelectedLocation(locationData);
                    setValue("city", locationData.place_name);
                    setValue("latitude", locationData.latitude);
                    setValue("longitude", locationData.longitude);
                    setValue("locationType", "city");
                }

                setIsLocating(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert(`Unable to get your location: ${error.message}`);
                setIsLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    }, [isLocating, setValue]);

    // Determine if the Next button should be enabled
    const canProceed = activeSection === "location"
        ? !!selectedLocation
        : !!(sourceUrl && sourceUrl.trim());

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="min-h-[60vh] flex flex-col justify-center">
            {/* Main Content Container */}
            <div className="grid lg:grid-cols-[1fr_auto_1fr] md:grid-cols-1 gap-6 lg:gap-0 items-stretch w-full">

                {/* Location Section */}
                <div
                    className={`
                        relative flex flex-col rounded-2xl border transition-all duration-200 cursor-pointer
                        p-8 lg:p-10
                        ${activeSection === "location"
                            ? "border-slate-900 bg-slate-50/50 shadow-md"
                            : "border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm"
                        }
                    `}
                    onClick={() => {
                        setActiveSection("location");
                        setValue("locationType", "city");
                    }}
                >
                    {/* Icon Badge */}
                    <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors
                        ${activeSection === "location"
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-500"
                        }
                    `}>
                        <MapPin className="w-6 h-6" />
                    </div>

                    <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                        Where is the Quest Located?
                    </h2>
                    <p className="text-slate-500 mb-6">
                        Search for a city, landmark, or address
                    </p>

                    <div className="flex-1 space-y-4">
                        <MapboxLocationSearch
                            label="Location, City, Pincode etc."
                            placeholder="Enter Location"
                            value={selectedLocation}
                            onChange={handleLocationSelect}
                            error={activeSection === "location" ? errors.city?.message : undefined}
                            highlightOnFocus={activeSection === "location"}
                        />

                        {/* Current Location Button */}
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

                {/* OR Divider - Center Column */}
                <div className="flex items-center justify-center lg:px-8">
                    <div className="lg:flex flex-col items-center hidden">
                        <div className="w-px h-24 bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
                        <span className="my-4 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 font-medium text-xs tracking-wide">
                            OR
                        </span>
                        <div className="w-px h-24 bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
                    </div>
                    {/* Mobile Divider */}
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
                        ${activeSection === "url"
                            ? "border-slate-900 bg-slate-50/50 shadow-md"
                            : "border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm"
                        }
                    `}
                    onClick={() => {
                        setActiveSection("url");
                        setValue("locationType", "url");
                    }}
                >
                    {/* Icon Badge */}
                    <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors
                        ${activeSection === "url"
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-500"
                        }
                    `}>
                        <Link2 className="w-6 h-6" />
                    </div>

                    <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                        Share URL of Reel / Video
                    </h2>
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
                                    error={activeSection === "url" ? errors.sourceUrl?.message : undefined}
                                    highlightOnFocus={activeSection === "url"}
                                />
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Single Unified Next Button */}
            <div className="flex justify-center mt-10">
                <Button
                    type="submit"
                    disabled={!canProceed}
                    variant="outline"
                    className="rounded-lg px-10 py-3 text-sm font-medium border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    rightIcon={<ChevronRight className="w-5 h-5" />}
                >
                    Next
                </Button>
            </div>
        </form>
    );
}

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, MapPin, Link2 } from "lucide-react";
import { Button, FloatingInput } from "@components/ui";
import { MapboxLocationSearch, type SelectedLocation } from "@components/MapboxLocationSearch";
import { locationStepSchema, type LocationStepData } from "../schemas/quest.schema";

interface LocationStepProps {
    defaultValues: Partial<LocationStepData>;
    onNext: (data: LocationStepData) => void;
}

export function LocationStep({ defaultValues, onNext }: LocationStepProps) {
    const [activeSection, setActiveSection] = useState<"location" | "url">(
        defaultValues.locationType === "url" ? "url" : "location"
    );
    const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);

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
            setValue("locationType", "city");
        }
    };

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

                    <div className="flex-1">
                        <MapboxLocationSearch
                            label="Location, City, Pincode etc."
                            placeholder="Enter Location"
                            value={selectedLocation}
                            onChange={handleLocationSelect}
                            error={activeSection === "location" ? errors.city?.message : undefined}
                            highlightOnFocus={activeSection === "location"}
                        />
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

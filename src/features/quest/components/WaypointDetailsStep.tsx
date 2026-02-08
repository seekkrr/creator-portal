import { useState, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, MapPin, X, ChevronLeft, ChevronRight, Info, Image } from "lucide-react";
import {
    type WaypointDetailsStepData,
    waypointDetailsStepSchema,
    type CreateQuestFormData
} from "../schemas/quest.schema";
import { Button, Textarea } from "@/components/ui";
import { ImageUpload } from "./ImageUpload";
import { WaypointMapComponent } from "@features/map";
import type { CloudinaryAsset, QuestLocation } from "@/types";

interface WaypointDetailsStepProps {
    defaultValues: Partial<CreateQuestFormData>;
    onNext: (data: WaypointDetailsStepData) => void;
    onBack?: (data: WaypointDetailsStepData) => void;
}

export function WaypointDetailsStep({ defaultValues, onNext, onBack }: WaypointDetailsStepProps) {
    // Ensure we have waypoint details for each waypoint
    const initialDetails = defaultValues.waypoints?.map((_, index) => {
        return defaultValues.waypointDetails?.[index] || {
            howToReach: "",
            description: "",
            images: []
        };
    }) || [];

    const {
        register,
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<WaypointDetailsStepData>({
        resolver: zodResolver(waypointDetailsStepSchema),
        defaultValues: {
            waypointDetails: initialDetails,
            galleryImages: defaultValues.galleryImages || [],
        },
    });

    const { fields } = useFieldArray({
        control,
        name: "waypointDetails",
    });

    const watchedDetails = watch("waypointDetails");
    const galleryImages = watch("galleryImages");
    const waypoints = defaultValues.waypoints || [];

    // Manage accordion state
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [activeWaypoint, setActiveWaypoint] = useState<QuestLocation | null>(null);

    // Update active waypoint when accordion changes
    useEffect(() => {
        if (openIndex !== null && waypoints && waypoints[openIndex]) {
            setActiveWaypoint(waypoints[openIndex]);
        } else {
            setActiveWaypoint(null);
        }
    }, [openIndex, waypoints]);

    const toggleAccordion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const onSubmit = (data: WaypointDetailsStepData) => {
        onNext(data);
    };

    const handleBack = () => {
        if (onBack) {
            onBack({
                waypointDetails: watchedDetails,
                galleryImages: galleryImages
            });
        }
    };

    // Handle multiple images for a specific waypoint
    const handleWaypointImageUpload = (index: number, asset: CloudinaryAsset | undefined) => {
        if (asset) {
            const currentImages = watchedDetails[index]?.images || [];
            setValue(`waypointDetails.${index}.images`, [...currentImages, asset], { shouldValidate: true });
        }
    };

    const handleWaypointImageRemove = (index: number, publicId: string) => {
        const currentImages = watchedDetails[index]?.images || [];
        setValue(
            `waypointDetails.${index}.images`,
            currentImages.filter((img) => img.public_id !== publicId),
            { shouldValidate: true }
        );
    };

    // Handle gallery images
    const handleGalleryUpload = (asset: CloudinaryAsset | undefined) => {
        if (asset) {
            const currentGeneric = galleryImages || [];
            setValue("galleryImages", [...currentGeneric, asset]);
        }
    };

    const handleGalleryRemove = (publicId: string) => {
        const currentGeneric = galleryImages || [];
        setValue(
            "galleryImages",
            currentGeneric.filter((img: CloudinaryAsset) => img.public_id !== publicId)
        );
    };

    // Calculate map center
    const firstWaypoint = waypoints.length > 0 ? waypoints[0] : undefined;
    const mapCenter = activeWaypoint
        ? { lng: activeWaypoint.longitude, lat: activeWaypoint.latitude }
        : firstWaypoint
            ? { lng: firstWaypoint.longitude, lat: firstWaypoint.latitude }
            : { lng: 77.5946, lat: 12.9716 };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Waypoint Details</h2>
                <p className="text-neutral-500">
                    Add detailed instructions and activities for each stop on your quest.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">

                {/* Left Column: Accordion List */}
                <div className="space-y-4 order-2 lg:order-1">
                    {fields.map((field, index) => {
                        const waypoint = waypoints[index];
                        if (!waypoint) return null;
                        const placeName = waypoint.place_name || `Waypoint ${index + 1}`;
                        const hasError = errors.waypointDetails?.[index];
                        const isOpen = openIndex === index;
                        const waypointImages = watchedDetails[index]?.images || [];

                        return (
                            <div
                                key={field.id}
                                className={`
                                    border rounded-2xl transition-all duration-200 shadow-sm overflow-hidden
                                    ${hasError ? "border-red-300 bg-red-50/10" : "border-slate-200 bg-white"}
                                    ${isOpen ? "ring-1 ring-slate-900 border-slate-900 shadow-md" : "hover:border-slate-400"}
                                `}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleAccordion(index)}
                                    className="flex w-full items-center justify-between p-4 bg-white transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`
                                            flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-sm transition-colors shrink-0
                                            ${isOpen
                                                ? "bg-slate-900 border-slate-900 text-white"
                                                : "bg-white border-slate-300 text-slate-500"
                                            }
                                        `}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <span className={`font-semibold text-base block ${isOpen ? "text-slate-900" : "text-slate-600"}`}>
                                                {placeName}
                                            </span>
                                            {hasError && (
                                                <span className="text-xs text-red-500 font-medium mt-0.5 block">
                                                    Missing details
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {isOpen ? (
                                        <ChevronUp className="w-5 h-5 text-slate-900" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                    )}
                                </button>

                                <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                    <div className="overflow-hidden">
                                        <div className="px-5 py-5 border-t border-slate-100 bg-slate-50/50 space-y-6">

                                            {/* How to Reach - Navigation */}
                                            <div className="space-y-3">
                                                <div>
                                                    <label
                                                        htmlFor={`waypointDetails.${index}.howToReach`}
                                                        className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-1"
                                                    >
                                                        <MapPin className="w-4 h-4 text-indigo-500" />
                                                        Navigation Instructions <span className="text-red-500">*</span>
                                                    </label>
                                                    <p className="text-xs text-slate-500 ml-6">
                                                        Landmarks or specific directions to help users find this spot.
                                                    </p>
                                                </div>
                                                <Textarea
                                                    id={`waypointDetails.${index}.howToReach`}
                                                    placeholder="e.g. Look for the red gate behind the old banyan tree..."
                                                    {...register(`waypointDetails.${index}.howToReach`)}
                                                    error={errors.waypointDetails?.[index]?.howToReach?.message}
                                                    className="bg-white text-sm border-slate-200 focus:border-slate-900 focus:ring-slate-900 min-h-[80px]"
                                                />
                                            </div>

                                            {/* Description - Activity */}
                                            <div className="space-y-3">
                                                <div>
                                                    <label
                                                        htmlFor={`waypointDetails.${index}.description`}
                                                        className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-1"
                                                    >
                                                        <Info className="w-4 h-4 text-indigo-500" />
                                                        Activity Description <span className="text-red-500">*</span>
                                                    </label>
                                                    <p className="text-xs text-slate-500 ml-6">
                                                        What should the user do or observe here?
                                                    </p>
                                                </div>
                                                <Textarea
                                                    id={`waypointDetails.${index}.description`}
                                                    placeholder="e.g. Count the number of pillars in the main hall..."
                                                    {...register(`waypointDetails.${index}.description`)}
                                                    error={errors.waypointDetails?.[index]?.description?.message}
                                                    className="bg-white text-sm border-slate-200 focus:border-slate-900 focus:ring-slate-900 min-h-[100px]"
                                                />
                                            </div>

                                            {/* Images */}
                                            <div className="space-y-3">
                                                <label className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-2">
                                                    <Image className="w-4 h-4 text-indigo-500" />
                                                    Visual Enablers
                                                </label>
                                                <div className="flex flex-wrap gap-3 ml-6">
                                                    {waypointImages.map((img) => (
                                                        <div key={img.public_id} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm shrink-0">
                                                            <img
                                                                src={img.secure_url}
                                                                alt="Waypoint detail"
                                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleWaypointImageRemove(index, img.public_id)}
                                                                className="absolute top-1 right-1 p-1 bg-white/90 backdrop-blur rounded-full text-slate-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <div className="w-20 h-20 shrink-0">
                                                        <ImageUpload
                                                            onChange={(asset) => handleWaypointImageUpload(index, asset)}
                                                            className="h-full w-full"
                                                            allowMultiple={true}
                                                            variant="minimal"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right Column: Sticky Map */}
                <div className="order-1 lg:order-2 lg:sticky lg:top-6">
                    <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
                        <WaypointMapComponent
                            center={mapCenter}
                            waypoints={waypoints}
                            focusedLocation={activeWaypoint ? { lng: activeWaypoint.longitude, lat: activeWaypoint.latitude } : null}
                            onWaypointAdd={() => { }}
                            onWaypointUpdate={() => { }}
                            onWaypointRemove={() => { }}
                            height="400px"
                            className="w-full"
                        />
                        {/* Footer removed as requested */}
                    </div>
                </div>
            </div>

            {/* Gallery Section */}
            <div className="pt-8 border-t border-slate-200">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                        Additional Gallery Images
                    </h3>
                    <p className="text-sm text-slate-500 max-w-2xl">
                        Upload general atmosphere shots, wide angles, or anything else that doesn't fit into a specific waypoint step.
                    </p>

                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {galleryImages?.map((img: CloudinaryAsset) => (
                            <div key={img.public_id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
                                <img
                                    src={img.secure_url}
                                    alt="Gallery"
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleGalleryRemove(img.public_id)}
                                    className="absolute top-1 right-1 p-1 bg-white/90 backdrop-blur rounded-full text-slate-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}

                        <div className="aspect-square">
                            <ImageUpload
                                onChange={handleGalleryUpload}
                                className="h-full w-full"
                                variant="minimal"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-200">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                    Back
                </Button>
                <Button
                    type="submit"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                    Next
                </Button>
            </div>
        </form>
    );
}

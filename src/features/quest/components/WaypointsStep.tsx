import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Trash2, MapPin } from "lucide-react";
import { Button, Card } from "@components/ui";
import { MapComponent, LocationSearch } from "@features/map";
import { waypointsStepSchema, type WaypointsStepData } from "../schemas/quest.schema";
import type { QuestLocation } from "@/types";

interface WaypointsStepProps {
    defaultValues: Partial<WaypointsStepData>;
    onNext: (data: WaypointsStepData) => void;
    onBack: () => void;
}

export function WaypointsStep({ defaultValues, onNext, onBack }: WaypointsStepProps) {
    const [mapCenter, setMapCenter] = useState({ lng: 77.5946, lat: 12.9716 });

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<WaypointsStepData>({
        resolver: zodResolver(waypointsStepSchema),
        defaultValues: {
            waypoints: defaultValues.waypoints ?? [],
        },
    });

    const waypoints = watch("waypoints");

    const handleLocationSelect = (location: QuestLocation) => {
        const newWaypoints = [...waypoints, location];
        setValue("waypoints", newWaypoints);
        setMapCenter({ lng: location.longitude, lat: location.latitude });
    };

    const handleMapClick = (location: QuestLocation) => {
        const newWaypoints = [...waypoints, location];
        setValue("waypoints", newWaypoints);
    };

    const handleRemoveWaypoint = (index: number) => {
        const newWaypoints = waypoints.filter((_, i) => i !== index);
        setValue("waypoints", newWaypoints);
    };

    const onSubmit = (data: WaypointsStepData) => {
        onNext(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                    Enter the locations user will cover
                </h2>
                <p className="text-neutral-600">
                    Add waypoints by searching or clicking on the map
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Search & List */}
                <div className="space-y-4">
                    {/* Search */}
                    <LocationSearch
                        onSelect={handleLocationSelect}
                        placeholder="Search for a location..."
                    />

                    {/* Waypoints List */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral-700">
                            Waypoints ({waypoints.length})
                        </label>

                        {waypoints.length === 0 ? (
                            <Card padding="md" className="text-center">
                                <MapPin className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                                <p className="text-sm text-neutral-500">
                                    No waypoints added yet
                                </p>
                                <p className="text-xs text-neutral-400 mt-1">
                                    Search or click on the map to add
                                </p>
                            </Card>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {waypoints.map((wp, index) => (
                                    <Card key={index} padding="sm" className="flex items-start gap-3">
                                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-neutral-900 truncate">
                                                {wp.place_name ?? `Location ${index + 1}`}
                                            </p>
                                            <p className="text-xs text-neutral-500">
                                                {wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveWaypoint(index)}
                                            className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                                            aria-label={`Remove waypoint ${index + 1}`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {errors.waypoints && (
                            <p className="text-sm text-red-600" role="alert">
                                {errors.waypoints.message}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Column - Map */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Click to add waypoints
                    </label>
                    <Controller
                        name="waypoints"
                        control={control}
                        render={({ field }) => (
                            <MapComponent
                                height="400px"
                                center={mapCenter}
                                markers={field.value}
                                onMapClick={handleMapClick}
                                onMarkerClick={(_, index) => handleRemoveWaypoint(index)}
                                className="border border-neutral-200"
                            />
                        )}
                    />
                    <p className="mt-2 text-sm text-neutral-500">
                        Click markers to remove them
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onBack}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                    Back
                </Button>
                <Button type="submit" rightIcon={<ChevronRight className="w-4 h-4" />}>
                    Next
                </Button>
            </div>
        </form>
    );
}

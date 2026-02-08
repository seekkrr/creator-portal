import { useState, useCallback, type DragEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Trash2, MapPin, GripVertical, Search } from "lucide-react";
import { Button, Card } from "@components/ui";
import { WaypointMapComponent, LocationSearch } from "@features/map";
import { waypointsStepSchema, type WaypointsStepData } from "../schemas/quest.schema";
import type { QuestLocation } from "@/types";

interface WaypointsStepProps {
    defaultValues: Partial<WaypointsStepData>;
    initialCenter?: { lng: number; lat: number };
    onNext: (data: WaypointsStepData) => void;
    onBack: (data?: WaypointsStepData) => void;
}

export function WaypointsStep({ defaultValues, initialCenter, onNext, onBack }: WaypointsStepProps) {
    // Use initial center from LocationStep or default
    const defaultCenter = initialCenter ?? { lng: 77.5946, lat: 12.9716 };

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const {
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

    // Stable callbacks - use getValues to read current waypoints without dependency
    const { getValues } = { getValues: () => watch("waypoints") };

    // Add waypoint (from search or map click)
    const handleWaypointAdd = useCallback((location: QuestLocation) => {
        const currentWaypoints = getValues();
        setValue("waypoints", [...currentWaypoints, location]);
    }, [setValue, getValues]);

    // Update waypoint position (from marker drag)
    const handleWaypointUpdate = useCallback((index: number, location: QuestLocation) => {
        const currentWaypoints = getValues();
        const newWaypoints = [...currentWaypoints];
        newWaypoints[index] = location;
        setValue("waypoints", newWaypoints);
    }, [setValue, getValues]);

    // Remove waypoint
    const handleWaypointRemove = useCallback((index: number) => {
        const currentWaypoints = getValues();
        const newWaypoints = currentWaypoints.filter((_, i) => i !== index);
        setValue("waypoints", newWaypoints);
    }, [setValue, getValues]);

    // Drag and drop handlers for reordering
    const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
        // Add visual feedback
        (e.target as HTMLElement).style.opacity = '0.5';
    };

    const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
        setDraggedIndex(null);
        setDragOverIndex(null);
        (e.target as HTMLElement).style.opacity = '1';
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);

        if (sourceIndex !== targetIndex && !isNaN(sourceIndex)) {
            const newWaypoints = [...waypoints];
            const [draggedItem] = newWaypoints.splice(sourceIndex, 1);
            if (draggedItem) {
                newWaypoints.splice(targetIndex, 0, draggedItem);
                setValue("waypoints", newWaypoints);
            }
        }

        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const onSubmit = (data: WaypointsStepData) => {
        onNext(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                    Create Your Quest Route
                </h2>
                <p className="text-neutral-600">
                    Add waypoints to define the path users will follow. Drag to reorder, right-click to remove.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Search & List (1/3 width on large screens) */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                            <Search className="w-4 h-4" />
                        </div>
                        <LocationSearch
                            onSelect={handleWaypointAdd}
                            placeholder="Search for a location..."
                        />
                    </div>

                    {/* Waypoints List with drag-drop reordering */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-neutral-700">
                                Waypoints
                            </label>
                            <span className="text-sm text-neutral-500">
                                {waypoints.length} location{waypoints.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {waypoints.length === 0 ? (
                            <Card padding="lg" className="text-center bg-neutral-50 border-dashed">
                                <MapPin className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-neutral-600">
                                    No waypoints yet
                                </p>
                                <p className="text-xs text-neutral-400 mt-1">
                                    Click on the map or search above to add locations
                                </p>
                            </Card>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                {waypoints.map((wp, index) => (
                                    <div
                                        key={`${wp.latitude}-${wp.longitude}-${index}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, index)}
                                        className={`
                                            group
                                            transition-all duration-200 ease-out
                                            ${dragOverIndex === index ? 'transform scale-[1.02]' : ''}
                                            ${draggedIndex === index ? 'opacity-50' : ''}
                                        `}
                                    >
                                        <Card
                                            padding="sm"
                                            className={`
                                                flex items-start gap-2 cursor-grab active:cursor-grabbing
                                                hover:shadow-md hover:border-indigo-200
                                                transition-all duration-150
                                                ${dragOverIndex === index ? 'border-indigo-400 bg-indigo-50' : ''}
                                            `}
                                        >
                                            {/* Drag handle */}
                                            <div className="flex-shrink-0 text-neutral-300 group-hover:text-neutral-500 transition-colors pt-1">
                                                <GripVertical className="w-4 h-4" />
                                            </div>

                                            {/* Number badge */}
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm">
                                                {index + 1}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-neutral-900 truncate">
                                                    {wp.place_name ?? `Location ${index + 1}`}
                                                </p>
                                                <p className="text-xs text-neutral-400 font-mono">
                                                    {wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}
                                                </p>
                                            </div>

                                            {/* Delete button */}
                                            <button
                                                type="button"
                                                onClick={() => handleWaypointRemove(index)}
                                                className="p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                aria-label={`Remove waypoint ${index + 1}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        )}

                        {errors.waypoints && (
                            <p className="text-sm text-red-600 mt-2" role="alert">
                                {errors.waypoints.message}
                            </p>
                        )}

                        {waypoints.length > 0 && (
                            <p className="text-xs text-neutral-400 mt-2">
                                Drag items to reorder your route
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Column - Map (2/3 width on large screens) */}
                <div className="lg:col-span-2">
                    <WaypointMapComponent
                        center={defaultCenter}
                        waypoints={waypoints}
                        onWaypointAdd={handleWaypointAdd}
                        onWaypointUpdate={handleWaypointUpdate}
                        onWaypointRemove={handleWaypointRemove}
                        height="500px"
                    />
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onBack({ waypoints })}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                    Back
                </Button>
                <Button
                    type="submit"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    disabled={waypoints.length === 0}
                >
                    Next
                </Button>
            </div>
        </form>
    );
}

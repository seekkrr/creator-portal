import { ChevronLeft, Check, MapPin, Clock, AlertCircle, BookOpen } from "lucide-react";
import { Button, Card, Badge } from "@components/ui";
import { WaypointMapComponent } from "@features/map";
import { useAuthStore } from "@store/auth.store";
import type { CreateQuestFormData, QuestDifficulty, QuestStatus } from "@/types";

interface ReviewStepProps {
    formData: Partial<CreateQuestFormData>;
    onBack: () => void;
    onSubmit: (status: QuestStatus) => void;
    isSubmitting: boolean;
}

const difficultyColors: Record<QuestDifficulty, "success" | "info" | "warning" | "danger"> = {
    Easy: "success",
    Medium: "info",
    Hard: "warning",
    Expert: "danger",
};

export function ReviewStep({ formData, onBack, onSubmit, isSubmitting }: ReviewStepProps) {
    const { creator } = useAuthStore();
    const { title, description, difficulty, duration, waypoints = [], latitude, longitude } = formData;
    const isApproved = creator?.status === "approved";

    // Calculate map center from first waypoint or location step
    const mapCenter = waypoints.length > 0 && waypoints[0]
        ? { lng: waypoints[0].longitude, lat: waypoints[0].latitude }
        : { lng: longitude ?? 77.5946, lat: latitude ?? 12.9716 };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                    Review Your Quest
                </h2>
                <p className="text-neutral-600">
                    Make sure everything looks good before submitting
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Details */}
                <div className="lg:col-span-1 space-y-4">

                    {/* Title & Description */}
                    <Card padding="md">
                        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                            {title ?? "Untitled Quest"}
                        </h3>
                        <p className="text-neutral-600 text-sm mb-4">
                            {description ?? "No description provided"}
                        </p>

                        <div className="flex flex-wrap gap-3">
                            {difficulty && (
                                <Badge variant={difficultyColors[difficulty]}>
                                    {difficulty}
                                </Badge>
                            )}
                            {duration && (
                                <div className="flex items-center gap-1 text-sm text-neutral-500">
                                    <Clock className="w-4 h-4" />
                                    {duration} min
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Waypoints Summary */}
                    <Card padding="md">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-neutral-900">Waypoints</h4>
                            <Badge variant={waypoints.length > 0 ? "primary" : "default"}>
                                {waypoints.length} locations
                            </Badge>
                        </div>

                        {waypoints.length === 0 ? (
                            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                <p className="text-sm text-amber-700">
                                    No waypoints added
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {waypoints.slice(0, 5).map((wp, index) => (
                                    <li key={index} className="flex items-center gap-2 text-sm">
                                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium">
                                            {index + 1}
                                        </div>
                                        <span className="text-neutral-600 truncate">
                                            {wp.place_name ?? `${wp.latitude.toFixed(4)}, ${wp.longitude.toFixed(4)}`}
                                        </span>
                                    </li>
                                ))}
                                {waypoints.length > 5 && (
                                    <li className="text-sm text-neutral-500">
                                        +{waypoints.length - 5} more locations
                                    </li>
                                )}
                            </ul>
                        )}
                    </Card>

                    {/* Narratives Summary */}
                    {formData.narratives && formData.narratives.length > 0 && (
                        <Card padding="md">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-neutral-900 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-indigo-500" />
                                    Narratives
                                </h4>
                                <Badge variant="primary">
                                    {formData.narratives.length} stories
                                </Badge>
                            </div>
                            <ul className="space-y-2">
                                {formData.narratives.map((n, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm">
                                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                                            <BookOpen className="w-3 h-3" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-medium text-neutral-800 block">
                                                {n.title?.trim() || `Step ${n.fromStepIndex + 1} → ${n.toStepIndex + 1}`}
                                            </span>
                                            <span className="text-neutral-500 text-xs line-clamp-2">
                                                {n.content}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>

                {/* Right Column - Map */}
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Quest Route Preview
                    </label>
                    {waypoints.length > 0 ? (
                        <WaypointMapComponent
                            height="400px"
                            center={mapCenter}
                            waypoints={waypoints}
                            onWaypointAdd={() => { }} // No-op for read-only
                            onWaypointUpdate={() => { }} // No-op for read-only
                            onWaypointRemove={() => { }} // No-op for read-only
                            className="border border-neutral-200"
                        />
                    ) : (
                        <Card padding="lg" className="h-[400px] flex items-center justify-center">
                            <div className="text-center">
                                <MapPin className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                                <p className="text-neutral-500">No waypoints to display</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onBack()}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                    disabled={isSubmitting}
                >
                    Back
                </Button>
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => onSubmit("Draft")}
                        isLoading={isSubmitting}
                        disabled={isSubmitting}
                    >
                        Save as Draft
                    </Button>
                    <div className="relative group">
                        <Button
                            onClick={() => onSubmit("Under Review")}
                            isLoading={isSubmitting}
                            disabled={isSubmitting || (waypoints?.length ?? 0) < 2 || !isApproved}
                            leftIcon={<Check className="w-4 h-4" />}
                        >
                            Submit for Review
                        </Button>
                        {!isApproved && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-neutral-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                                Your account must be approved by an admin before you can submit quests for review.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

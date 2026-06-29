import { ChevronLeft, Check, MapPin, Clock, AlertCircle, Tag, Building2 } from "lucide-react";
import { Button, Card, Badge } from "@components/ui";
import { WaypointMapComponent, type PlaylistPoint } from "@features/map";
import { useAuthStore } from "@store/auth.store";
import type { CreateQuestFormData } from "../schemas/quest.schema";
import type { QuestDifficulty, QuestStatus } from "@/types";

interface ReviewStepProps {
    formData: Partial<CreateQuestFormData>;
    onBack: () => void;
    onSubmit: (status: QuestStatus) => void;
    isSubmitting: boolean;
}

const difficultyColors: Record<QuestDifficulty, "success" | "info" | "warning" | "danger"> = {
    easy: "success",
    moderate: "info",
    hard: "warning",
    expert: "danger",
};

const difficultyLabels: Record<QuestDifficulty, string> = {
    easy: "Easy",
    moderate: "Moderate",
    hard: "Hard",
    expert: "Expert",
};

function titleizeTheme(theme: string): string {
    return theme
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

export function ReviewStep({ formData, onBack, onSubmit, isSubmitting }: ReviewStepProps) {
    const { creator } = useAuthStore();
    const {
        title,
        description,
        difficulty,
        duration,
        theme = [],
        markerPlaylist = [],
        regionName,
        city,
        latitude,
        longitude,
    } = formData;

    // Submission is allowed for any active creator (the portal login gate guarantees
    // active status). is_verified is a trust badge, never a submission gate.
    const isActive = !creator || creator.status === "active";
    const enoughMarkers = markerPlaylist.length >= 2;

    // Ordered pins for the read-only preview map (from each item's _display).
    const playlistPoints: PlaylistPoint[] = markerPlaylist.flatMap((it) =>
        it._display ? [{ lng: it._display.lng, lat: it._display.lat, title: it._display.title }] : []
    );

    const mapCenter = playlistPoints[0]
        ? { lng: playlistPoints[0].lng, lat: playlistPoints[0].lat }
        : { lng: longitude ?? 77.5946, lat: latitude ?? 12.9716 };

    const regionLabel = regionName ?? city;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">Review Your Quest</h2>
                <p className="text-neutral-600">Make sure everything looks good before submitting</p>
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

                        <div className="flex flex-wrap items-center gap-3">
                            {difficulty && (
                                <Badge variant={difficultyColors[difficulty]}>
                                    {difficultyLabels[difficulty]}
                                </Badge>
                            )}
                            {duration && (
                                <div className="flex items-center gap-1 text-sm text-neutral-500">
                                    <Clock className="w-4 h-4" />
                                    {duration} min
                                </div>
                            )}
                        </div>

                        {regionLabel && (
                            <div className="flex items-center gap-1.5 text-sm text-neutral-500 mt-3">
                                <Building2 className="w-4 h-4 text-indigo-500" />
                                <span className="font-medium text-neutral-700">{regionLabel}</span>
                            </div>
                        )}

                        {theme.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                <Tag className="w-4 h-4 text-indigo-500" />
                                {theme.map((t) => (
                                    <span
                                        key={t}
                                        className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full"
                                    >
                                        {titleizeTheme(t)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Marker Playlist Summary */}
                    <Card padding="md">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-neutral-900">Marker playlist</h4>
                            <Badge variant={markerPlaylist.length > 0 ? "primary" : "default"}>
                                {markerPlaylist.length} markers
                            </Badge>
                        </div>

                        {markerPlaylist.length === 0 ? (
                            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                <p className="text-sm text-amber-700">No markers added</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {markerPlaylist.slice(0, 6).map((item, index) => (
                                    <li key={index} className="flex items-center gap-2 text-sm">
                                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                                            {index + 1}
                                        </div>
                                        <span className="text-neutral-600 truncate flex-1">
                                            {item._display?.title ??
                                                (item.marker_id ? "Existing marker" : "New marker")}
                                        </span>
                                        <span
                                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                                item.marker_id
                                                    ? "bg-teal-100 text-teal-700"
                                                    : "bg-indigo-100 text-indigo-700"
                                            }`}
                                        >
                                            {item.marker_id ? "Reused" : "New"}
                                        </span>
                                    </li>
                                ))}
                                {markerPlaylist.length > 6 && (
                                    <li className="text-sm text-neutral-500">
                                        +{markerPlaylist.length - 6} more markers
                                    </li>
                                )}
                            </ul>
                        )}
                    </Card>
                </div>

                {/* Right Column - Map */}
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Quest Route Preview
                    </label>
                    {playlistPoints.length > 0 ? (
                        <WaypointMapComponent
                            height="400px"
                            center={mapCenter}
                            playlistPoints={playlistPoints}
                            className="border border-neutral-200"
                        />
                    ) : (
                        <Card padding="lg" className="h-[400px] flex items-center justify-center">
                            <div className="text-center">
                                <MapPin className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                                <p className="text-neutral-500">No markers to display</p>
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
                            disabled={isSubmitting || !enoughMarkers || !isActive}
                            leftIcon={<Check className="w-4 h-4" />}
                        >
                            Submit for Review
                        </Button>
                        {!enoughMarkers && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-neutral-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                                Add at least 2 markers before submitting for review.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

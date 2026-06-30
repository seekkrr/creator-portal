import {
    ChevronLeft,
    MapPin,
    Clock,
    AlertCircle,
    Tag,
    Building2,
    BookOpen,
    Images,
    Flag,
    ListChecks,
    Info,
} from "lucide-react";
import { Button, Card, Badge } from "@components/ui";
import { WaypointMapComponent, type PlaylistPoint } from "@features/map";
import { useAuthStore } from "@store/auth.store";
import type { CreateQuestFormData } from "../schemas/quest.schema";
import type { CloudinaryAsset, QuestDifficulty, QuestStatus } from "@/types";

interface ReviewStepProps {
    // Widened beyond CreateQuestFormData to include the quest-level extras the
    // later steps collect (gallery + quest narrative) so Review reflects everything.
    formData: Partial<CreateQuestFormData> & {
        galleryImages?: CloudinaryAsset[];
        questNarrative?: { title?: string; content?: string; voice_persona?: string; custom_voice_id?: string };
    };
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

function titleize(value: string): string {
    return value
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
        galleryImages = [],
        questNarrative,
        regionName,
        city,
        latitude,
        longitude,
    } = formData;

    // Submission is allowed for any active creator (the portal login gate guarantees
    // active status). is_verified is a trust badge, never a submission gate.
    const isActive = !creator || creator.status === "active";
    const enoughMarkers = markerPlaylist.length >= 2;

    const playlistPoints: PlaylistPoint[] = markerPlaylist.flatMap((it) =>
        it._display ? [{ lng: it._display.lng, lat: it._display.lat, title: it._display.title }] : []
    );
    const mapCenter = playlistPoints[0]
        ? { lng: playlistPoints[0].lng, lat: playlistPoints[0].lat }
        : { lng: longitude ?? 77.5946, lat: latitude ?? 12.9716 };

    const regionLabel = regionName ?? city;
    const narrativeTitle = questNarrative?.title?.trim() ?? "";
    const narrativeContent = questNarrative?.content?.trim() ?? "";
    const narrativeVoice = questNarrative?.voice_persona ?? "";
    const hasNarrative = !!narrativeTitle;
    const requiredCount = markerPlaylist.filter((it) => it.is_required !== false).length;
    const withActivity = markerPlaylist.filter((it) => it.thingsToDo?.trim()).length;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-1">Review Your Quest</h2>
                <p className="text-neutral-600">Make sure everything looks good before submitting.</p>
            </div>

            {/* ── At-a-glance header band ────────────────────────────────────── */}
            <Card padding="lg" className="bg-gradient-to-br from-primary-50/70 to-white">
                <h3 className="text-2xl font-bold text-neutral-900">{title || "Untitled Quest"}</h3>
                {description ? (
                    <p className="text-neutral-600 text-sm mt-1.5 max-w-3xl">{description}</p>
                ) : (
                    <p className="text-neutral-400 text-sm mt-1.5 italic">No description provided</p>
                )}

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm">
                    {regionLabel && (
                        <span className="inline-flex items-center gap-1.5 text-neutral-700">
                            <Building2 className="w-4 h-4 text-primary-500" />
                            <span className="font-medium">{regionLabel}</span>
                        </span>
                    )}
                    {difficulty && (
                        <Badge variant={difficultyColors[difficulty]}>
                            {difficultyLabels[difficulty]}
                        </Badge>
                    )}
                    {duration && (
                        <span className="inline-flex items-center gap-1.5 text-neutral-600">
                            <Clock className="w-4 h-4" />
                            {duration} min
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-neutral-600">
                        <MapPin className="w-4 h-4 text-primary-500" />
                        {markerPlaylist.length} stop{markerPlaylist.length === 1 ? "" : "s"}
                    </span>
                    {hasNarrative && (
                        <span className="inline-flex items-center gap-1.5 text-neutral-600">
                            <BookOpen className="w-4 h-4 text-primary-500" />
                            Narrative
                        </span>
                    )}
                    {galleryImages.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-neutral-600">
                            <Images className="w-4 h-4 text-primary-500" />
                            {galleryImages.length} photo{galleryImages.length === 1 ? "" : "s"}
                        </span>
                    )}
                </div>

                {theme.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        <Tag className="w-4 h-4 text-primary-500" />
                        {theme.map((t) => (
                            <span
                                key={t}
                                className="inline-block px-2 py-0.5 bg-white border border-primary-100 text-primary-700 text-xs font-medium rounded-full"
                            >
                                {titleize(t)}
                            </span>
                        ))}
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* ── Left: the stops (the heart of the quest) ───────────────── */}
                <div className="space-y-5">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-neutral-900 flex items-center gap-2">
                                <ListChecks className="w-4 h-4 text-primary-500" />
                                Stops
                            </h4>
                            <span className="text-xs text-neutral-500">
                                {requiredCount} required · {withActivity}/{markerPlaylist.length} with
                                activity
                            </span>
                        </div>

                        {markerPlaylist.length === 0 ? (
                            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                <p className="text-sm text-amber-700">No markers added yet.</p>
                            </div>
                        ) : (
                            <ol className="space-y-2.5">
                                {markerPlaylist.map((item, index) => (
                                    <li
                                        key={index}
                                        className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                            {index + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="text-sm font-medium text-neutral-900 truncate">
                                                    {item._display?.title ??
                                                        (item.marker_id
                                                            ? "Existing marker"
                                                            : "New marker")}
                                                </span>
                                                <span
                                                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                                        item.marker_id
                                                            ? "bg-teal-100 text-teal-700"
                                                            : "bg-primary-100 text-primary-700"
                                                    }`}
                                                >
                                                    {item.marker_id ? "Reused" : "New"}
                                                </span>
                                                {item.is_required === false && (
                                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                                                        Optional
                                                    </span>
                                                )}
                                            </div>
                                            {item.thingsToDo?.trim() ? (
                                                <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                                                    {item.thingsToDo}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-neutral-300 italic mt-1">
                                                    No activity added
                                                </p>
                                            )}
                                        </div>
                                        {item.thingsToDoImage?.secure_url && (
                                            <img
                                                src={item.thingsToDoImage.secure_url}
                                                alt=""
                                                className="w-12 h-12 rounded-lg object-cover border border-neutral-200 flex-shrink-0"
                                            />
                                        )}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>

                    {/* Quest narrative */}
                    <div>
                        <h4 className="font-semibold text-neutral-900 flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-primary-500" />
                            Quest narrative
                        </h4>
                        {/* Inline hint: per-marker narratives and full narrative editing happen in Narratives section */}
                        <div className="flex items-start gap-2 mb-2 rounded-lg bg-primary-50 border border-primary-100 px-3 py-2 text-xs text-primary-700">
                            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary-500" />
                            <span>Narrative content is managed in the <strong>Narratives</strong> section after creation. This preview reflects the quest-level narrative you set in step 5.</span>
                        </div>
                        {hasNarrative ? (
                            <div className="rounded-xl border border-neutral-200 bg-white p-3">
                                <p className="text-sm font-medium text-neutral-900">
                                    {narrativeTitle}
                                </p>
                                {narrativeContent && (
                                    <p className="text-xs text-neutral-500 mt-1 line-clamp-4 whitespace-pre-line">
                                        {narrativeContent}
                                    </p>
                                )}
                                <p className="text-[11px] text-neutral-400 mt-2">
                                    Draft narrative
                                    {narrativeVoice ? ` · ${titleize(narrativeVoice)} voice` : ""}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-400 italic">
                                No quest narrative added (optional).
                            </p>
                        )}
                    </div>

                    {/* Gallery */}
                    {galleryImages.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-neutral-900 flex items-center gap-2 mb-2">
                                <Images className="w-4 h-4 text-primary-500" />
                                Gallery
                                <Badge variant="default">{galleryImages.length}</Badge>
                            </h4>
                            <div className="grid grid-cols-5 gap-2">
                                {galleryImages.map((img) => (
                                    <img
                                        key={img.public_id || img.secure_url}
                                        src={img.secure_url}
                                        alt=""
                                        className="aspect-square w-full rounded-lg object-cover border border-neutral-200"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right: route map ───────────────────────────────────────── */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Quest Route Preview
                    </label>
                    {playlistPoints.length > 0 ? (
                        <WaypointMapComponent
                            height="420px"
                            center={mapCenter}
                            playlistPoints={playlistPoints}
                            className="border border-neutral-200"
                        />
                    ) : (
                        <Card padding="lg" className="h-[420px] flex items-center justify-center">
                            <div className="text-center">
                                <MapPin className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                                <p className="text-neutral-500">No markers to display</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* ── Navigation ─────────────────────────────────────────────────── */}
            <div className="flex justify-between pt-4 border-t border-neutral-200">
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
                            leftIcon={<Flag className="w-4 h-4" />}
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

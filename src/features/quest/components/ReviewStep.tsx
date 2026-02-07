import { ChevronLeft, Check, MapPin, Clock, AlertCircle } from "lucide-react";
import { Button, Card, Badge } from "@components/ui";
import { MapComponent } from "@features/map";
import type { CreateQuestFormData, QuestDifficulty } from "@/types";

interface ReviewStepProps {
    formData: Partial<CreateQuestFormData>;
    onBack: () => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

const difficultyColors: Record<QuestDifficulty, "success" | "info" | "warning" | "danger"> = {
    Easy: "success",
    Medium: "info",
    Hard: "warning",
    Expert: "danger",
};

export function ReviewStep({ formData, onBack, onSubmit, isSubmitting }: ReviewStepProps) {
    const { title, description, difficulty, duration, waypoints = [] } = formData;

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Details */}
                <div className="space-y-4">

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
                </div>

                {/* Right Column - Map */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Quest Route Preview
                    </label>
                    {waypoints.length > 0 ? (
                        <MapComponent
                            height="400px"
                            markers={waypoints}
                            interactive={false}
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
                    onClick={onBack}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                    disabled={isSubmitting}
                >
                    Back
                </Button>
                <Button
                    onClick={onSubmit}
                    isLoading={isSubmitting}
                    leftIcon={<Check className="w-4 h-4" />}
                >
                    Create Quest
                </Button>
            </div>
        </div>
    );
}

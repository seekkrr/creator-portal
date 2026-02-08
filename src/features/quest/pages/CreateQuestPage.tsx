import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@components/ui";
import { questService } from "@services/quest.service";
import { LocationStep } from "../components/LocationStep";
import { DetailsStep } from "../components/DetailsStep";
import { WaypointsStep } from "../components/WaypointsStep";
import { ReviewStep } from "../components/ReviewStep";
import {
    type LocationStepData,
    type DetailsStepData,
    type WaypointsStepData,
    defaultFormValues,
} from "../schemas/quest.schema";
import type { CreateQuestFormData, CreateQuestPayload } from "@/types";

type Step = 1 | 2 | 3 | 4;

const stepLabels: Record<Step, string> = {
    1: "Location",
    2: "Details",
    3: "Waypoints",
    4: "Review",
};

const SESSION_STORAGE_KEY = "quest_creation_form";

// Helper to get initial form data from session storage
function getInitialFormData(): Partial<CreateQuestFormData> {
    try {
        const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return { ...defaultFormValues, ...parsed.formData };
        }
    } catch (e) {
        console.error("Failed to parse session storage:", e);
    }
    return defaultFormValues;
}

// Helper to get initial step from session storage
function getInitialStep(): Step {
    try {
        const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed.currentStep ?? 1;
        }
    } catch (e) {
        console.error("Failed to parse session storage:", e);
    }
    return 1;
}

export function CreateQuestPage() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState<Step>(getInitialStep);
    const [formData, setFormData] = useState<Partial<CreateQuestFormData>>(getInitialFormData);

    // Save to session storage whenever formData or currentStep changes
    const saveToSession = useCallback(() => {
        try {
            sessionStorage.setItem(
                SESSION_STORAGE_KEY,
                JSON.stringify({ formData, currentStep })
            );
        } catch (e) {
            console.error("Failed to save to session storage:", e);
        }
    }, [formData, currentStep]);

    useEffect(() => {
        saveToSession();
    }, [saveToSession]);

    // Clear session storage on successful submit
    const clearSession = () => {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
    };

    // Create quest mutation
    const createQuestMutation = useMutation({
        mutationFn: async (data: CreateQuestFormData) => {
            // Get the last waypoint for end_location (or use start if no waypoints)
            const lastWaypoint = data.waypoints.length > 0
                ? data.waypoints[data.waypoints.length - 1]
                : null;

            const startCoords = [data.longitude ?? 0, data.latitude ?? 0];
            const endCoords = lastWaypoint
                ? [lastWaypoint.longitude, lastWaypoint.latitude]
                : startCoords;

            const payload: CreateQuestPayload = {
                metadata: {
                    title: data.title,
                    description: [data.description], // Backend expects array
                    theme: data.theme,
                    difficulty: data.difficulty,
                    duration_minutes: data.duration ?? 60,
                },
                location: {
                    region: data.city ?? "Unknown",
                    start_location: {
                        type: "Point" as const,
                        coordinates: startCoords,
                    },
                    end_location: {
                        type: "Point" as const,
                        coordinates: endCoords,
                    },
                    route_waypoints: data.waypoints.map((wp, index) => ({
                        order: index + 1,
                        location: {
                            type: "Point" as const,
                            coordinates: [wp.longitude, wp.latitude],
                        },
                    })),
                    map_data: {
                        zoom_level: 14,
                        map_style: "standard",
                    },
                },
                media: {
                    cloudinary_assets: [],
                    source_url: data.sourceUrl,
                },
                steps: data.waypoints.map((wp, index) => ({
                    title: wp.place_name ?? `Step ${index + 1}`,
                    description: `Visit ${wp.place_name ?? `location ${index + 1}`}`,
                })),
                status: "Draft",
                booking_enabled: false,
            };

            return questService.createQuest(payload);
        },
        onSuccess: () => {
            clearSession();
            toast.success("Quest created successfully!");
            navigate("/creator/quest/success");
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : "Failed to create quest");
        },
    });

    // Step handlers - update formData and save to session
    const handleStep1Next = (data: LocationStepData) => {
        setFormData((prev) => ({ ...prev, ...data }));
        setCurrentStep(2);
    };

    const handleStep2Next = (data: DetailsStepData) => {
        setFormData((prev) => ({ ...prev, ...data }));
        setCurrentStep(3);
    };

    const handleStep3Next = (data: WaypointsStepData) => {
        setFormData((prev) => ({ ...prev, ...data }));
        setCurrentStep(4);
    };

    const handleBack = (data?: WaypointsStepData) => {
        // Save waypoints data if provided (when coming back from WaypointsStep)
        if (data) {
            setFormData((prev) => ({ ...prev, ...data }));
        }
        setCurrentStep((prev) => (prev > 1 ? (prev - 1) as Step : prev));
    };

    const handleSubmit = () => {
        createQuestMutation.mutate(formData as CreateQuestFormData);
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            {/* Progress Steps */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {([1, 2, 3, 4] as const).map((step) => (
                        <div
                            key={step}
                            className={`flex items-center ${step < 4 ? "flex-1" : ""}`}
                        >
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${step === currentStep
                                        ? "bg-indigo-600 text-white"
                                        : step < currentStep
                                            ? "bg-green-500 text-white"
                                            : "bg-neutral-200 text-neutral-500"
                                        }`}
                                >
                                    {step < currentStep ? "✓" : step}
                                </div>
                                <span
                                    className={`mt-2 text-xs font-medium ${step === currentStep
                                        ? "text-indigo-600"
                                        : step < currentStep
                                            ? "text-green-600"
                                            : "text-neutral-500"
                                        }`}
                                >
                                    {stepLabels[step]}
                                </span>
                            </div>
                            {step < 4 && (
                                <div
                                    className={`flex-1 h-1 mx-4 rounded ${step < currentStep ? "bg-green-500" : "bg-neutral-200"
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <Card padding="lg" shadow="md">
                {currentStep === 1 && (
                    <LocationStep defaultValues={formData} onNext={handleStep1Next} />
                )}
                {currentStep === 2 && (
                    <DetailsStep
                        defaultValues={formData}
                        onNext={handleStep2Next}
                        onBack={handleBack}
                    />
                )}
                {currentStep === 3 && (
                    <WaypointsStep
                        defaultValues={formData}
                        initialCenter={
                            formData.latitude && formData.longitude
                                ? { lat: formData.latitude, lng: formData.longitude }
                                : undefined
                        }
                        onNext={handleStep3Next}
                        onBack={handleBack}
                    />
                )}
                {currentStep === 4 && (
                    <ReviewStep
                        formData={formData}
                        onBack={handleBack}
                        onSubmit={handleSubmit}
                        isSubmitting={createQuestMutation.isPending}
                    />
                )}
            </Card>
        </div>
    );
}

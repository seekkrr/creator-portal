import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@components/ui";
import { questService } from "@services/quest.service";
import { narrativeService } from "@services/narrative.service";
import { LocationStep } from "../components/LocationStep";
import { DetailsStep } from "../components/DetailsStep";
import { WaypointsStep } from "../components/WaypointsStep";
import { WaypointDetailsStep } from "../components/WaypointDetailsStep";
import { NarrativeStep } from "../components/NarrativeStep";
import { ReviewStep } from "../components/ReviewStep";
import {
  type LocationStepData,
  type DetailsStepData,
  type WaypointsStepData,
  type WaypointDetailsStepData,
  type NarrativeStepData,
  defaultFormValues,
} from "../schemas/quest.schema";
import type { CreateQuestFormData, CreateQuestPayload, QuestStatus } from "@/types";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const stepLabels: Record<Step, string> = {
  1: "Location",
  2: "Details",
  3: "Waypoints",
  4: "Waypoint Details",
  5: "Narrative",
  6: "Review",
};

const SESSION_STORAGE_KEY = "quest_creation_form";

export function CreateQuestPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState<Partial<CreateQuestFormData>>(defaultFormValues);
  const [isQuestInitialized, setIsQuestInitialized] = useState(false);
  const [isNarrativesInitialized, setIsNarrativesInitialized] = useState(false);

  // Fetch quest data if editing
  const { data: existingQuest, isLoading: isLoadingQuest } = useQuery({
    queryKey: ["quest", id],
    queryFn: () => questService.getQuestById(id!),
    enabled: isEditing,
  });

  // Populate form data when quest is loaded (only once to prevent overwriting user changes on refetch)
  useEffect(() => {
    if (existingQuest && !isQuestInitialized) {
      // Prevent editing of Published quests by creators
      if (existingQuest.status === "Published") {
        toast.error("Published quests cannot be edited. Please contact an administrator.");
        navigate("/creator/quests");
        return;
      }

      const mappedData: Partial<CreateQuestFormData> = {
        title: existingQuest.metadata?.title || "",
        description: Array.isArray(existingQuest.metadata?.description)
          ? existingQuest.metadata.description[0] || ""
          : typeof existingQuest.metadata?.description === "string"
            ? existingQuest.metadata.description
            : "",
        theme: existingQuest.metadata?.theme || "Culture",
        difficulty: existingQuest.metadata?.difficulty || "Medium",
        duration: existingQuest.metadata?.duration_minutes,
        city: existingQuest.location?.region,
        latitude: existingQuest.location?.start_location.coordinates[1] || 0,
        longitude: existingQuest.location?.start_location.coordinates[0] || 0,
        waypoints:
          existingQuest.location?.route_waypoints?.map((rw) => ({
            latitude: rw.location.coordinates[1] || 0,
            longitude: rw.location.coordinates[0] || 0,
            place_name: `Waypoint ${rw.order + 1}`,
          })) || [],
        waypointDetails:
          existingQuest.steps?.map((step) => ({
            description: step.description || "",
            howToReach: step.how_to_reach || "",
            images: step.cloudinary_assets || [],
          })) || [],
        galleryImages: existingQuest.media?.cloudinary_assets || [],
        sourceUrl: existingQuest.media?.reel_url || "",
        narratives: [], // Will be populated from separate API call
      };
      setFormData(mappedData);
      setIsQuestInitialized(true);
    }
  }, [existingQuest, isQuestInitialized, navigate]);

  // Fetch existing narratives when editing
  const { data: existingNarratives } = useQuery({
    queryKey: ["quest-narratives", id],
    queryFn: () => narrativeService.getNarrativesByQuest(id!),
    enabled: isEditing && !!existingQuest,
  });

  // Map existing narratives to form format when loaded
  useEffect(() => {
    // Only initialize narratives once and only if not already initialized
    if (!isNarrativesInitialized && existingNarratives?.narratives && existingQuest?.steps) {
      const steps = existingQuest.steps;
      const mappedNarratives = existingNarratives.narratives.map((n) => {
        // Match by order since QuestDetailsStep doesn't have _id in creator types
        const fromIdx = Math.max(0, n.from_step_order);
        const toIdx = Math.max(1, n.to_step_order);
        return {
          fromStepIndex: fromIdx < steps.length ? fromIdx : 0,
          toStepIndex: toIdx < steps.length ? toIdx : Math.min(1, steps.length - 1),
          title: n.title || "",
          content: n.content,
          triggerRadiusM: n.trigger_radius_m,
          isMandatory: n.is_mandatory,
        };
      });
      setFormData((prev) => ({ ...prev, narratives: mappedNarratives }));
      setIsNarrativesInitialized(true);
    }
  }, [existingNarratives, existingQuest, isNarrativesInitialized]);

  // Save/Load session storage only if NOT editing
  useEffect(() => {
    if (isEditing) return;
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed.formData }));
        setCurrentStep(parsed.currentStep || 1);
      } catch (e) {
        console.error(e);
      }
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) return;
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ formData, currentStep }));
  }, [formData, currentStep, isEditing]);

  const clearSession = () => sessionStorage.removeItem(SESSION_STORAGE_KEY);

  // Save/Update quest mutation
  const questMutation = useMutation({
    mutationFn: async ({ data, status }: { data: CreateQuestFormData; status: QuestStatus }) => {
      const startWaypoint = data.waypoints[0];
      const endWaypoint = data.waypoints[data.waypoints.length - 1];

      const payload: CreateQuestPayload = {
        metadata: {
          title: data.title,
          description: [data.description],
          theme: data.theme,
          difficulty: data.difficulty,
          duration_minutes: data.duration ?? 60,
        },
        location: {
          region: data.city ?? "Unknown",
          start_location: {
            type: "Point",
            coordinates: [startWaypoint!.longitude, startWaypoint!.latitude],
          },
          end_location: {
            type: "Point",
            coordinates: [endWaypoint!.longitude, endWaypoint!.latitude],
          },
          route_waypoints: data.waypoints.map((wp, index) => ({
            order: index,
            location: { type: "Point", coordinates: [wp.longitude, wp.latitude] },
          })),
          route_geometry: {
            type: "LineString",
            coordinates: data.waypoints.map((wp) => [wp.longitude, wp.latitude]),
          },
          map_data: { zoom_level: 14, map_style: "standard" },
        },
        media: {
          cloudinary_assets: data.galleryImages || [],
          mapbox_reference: { style_id: "mapbox/standard" },
          reel_url: data.sourceUrl,
        },
        steps: data.waypoints.map((wp, index) => {
          const details = data.waypointDetails?.[index];
          return {
            order: index,
            title: wp.place_name ?? `Step ${index + 1}`,
            description:
              details?.description ?? `Visit ${wp.place_name ?? `location ${index + 1}`}`,
            how_to_reach: details?.howToReach,
            waypoint_order: index,
            cloudinary_assets: details?.images || [],
          };
        }),
        status,
        price: 0,
        currency: "INR",
        booking_enabled: false,
      };

      if (isEditing) {
        return questService.updateQuest(id!, payload);
      } else {
        return questService.createQuest(payload);
      }
    },
    onSuccess: async (result) => {
      try {
        const narrativesToCreate = formData.narratives || [];
        const isCreateResult = !isEditing && result && "_id" in result && "steps" in result;

        if (isCreateResult) {
          // Handle new quest: create narratives in parallel with robust error handling
          if (narrativesToCreate.length > 0) {
            const createResult = result as import("@services/quest.service").CreateQuestResponse;
            const questId = createResult._id;
            const createdSteps = createResult.steps;
            const wps = formData.waypoints || [];

            const narrativePromises = narrativesToCreate.map(async (narrative) => {
              const fromStep = createdSteps[narrative.fromStepIndex];
              const toStep = createdSteps[narrative.toStepIndex];
              if (!fromStep?._id || !toStep?._id) {
                throw new Error(
                  `Invalid step references for narrative between steps ${narrative.fromStepIndex} and ${narrative.toStepIndex}`
                );
              }

              // Auto-calculate trigger location as midpoint between waypoints
              // TODO: Future enhancement — allow creators to manually set trigger location
              const fromWp = wps[narrative.fromStepIndex];
              const toWp = wps[narrative.toStepIndex];
              const midLat = fromWp && toWp ? (fromWp.latitude + toWp.latitude) / 2 : null;
              const midLng = fromWp && toWp ? (fromWp.longitude + toWp.longitude) / 2 : null;

              return narrativeService.createNarrative({
                quest_id: questId,
                from_step_id: fromStep._id,
                to_step_id: toStep._id,
                title: narrative.title || undefined,
                content: narrative.content,
                trigger_location:
                  midLat !== null && midLng !== null
                    ? { type: "Point", coordinates: [midLng, midLat] }
                    : undefined,
                trigger_radius_m: narrative.triggerRadiusM,
                is_mandatory: narrative.isMandatory,
              });
            });

            const results = await Promise.allSettled(narrativePromises);
            const successful = results.filter((r) => r.status === "fulfilled").length;
            const failed = results.filter((r) => r.status === "rejected");

            if (successful > 0) {
              toast.success(`${successful} of ${narrativesToCreate.length} narrative(s) added to quest`);
            }
            if (failed.length > 0) {
              console.error("Failed narratives:", failed);
              toast.warning(
                `${failed.length} narrative(s) could not be created. Check console for details.`
              );
            }
          }
        } else if (isEditing) {
          // Handle quest update: narratives are read-only in edit mode
          // Narrative updates must be managed separately via narrative service endpoints
          // This is intentional to prevent accidental narrative overwrites
        }
      } catch (err) {
        console.error("Error managing narratives:", err);
        toast.warning("Quest saved but some narratives could not be created.");
      }

      clearSession();
      toast.success(isEditing ? "Quest updated successfully!" : "Quest created successfully!");
      navigate("/creator/quest/success");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save quest");
    },
  });

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
  const handleStep4Next = (data: WaypointDetailsStepData) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(5);
  };
  const handleStep5Next = (data: NarrativeStepData) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(6);
  };
  const handleBack = (data?: any) => {
    if (data) setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  };
  const handleSubmit = (status: QuestStatus) => {
    if (!formData.waypoints || formData.waypoints.length < 2) {
      toast.error("Quest must have at least two locations (Start and End)");
      return;
    }
    questMutation.mutate({ data: formData as CreateQuestFormData, status });
  };

  if (isEditing && isLoadingQuest) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading quest details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {([1, 2, 3, 4, 5, 6] as const).map((step) => (
            <div key={step} className={`flex items-center ${step < 6 ? "flex-1" : ""}`}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${step === currentStep ? "bg-indigo-600 text-white" : step < currentStep ? "bg-green-500 text-white" : "bg-neutral-200 text-neutral-500"}`}
                >
                  {step < currentStep ? "✓" : step}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${step === currentStep ? "text-indigo-600" : step < currentStep ? "text-green-600" : "text-neutral-500"}`}
                >
                  {stepLabels[step]}
                </span>
              </div>
              {step < 6 && (
                <div
                  className={`flex-1 h-1 mx-4 rounded ${step < currentStep ? "bg-green-500" : "bg-neutral-200"}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card padding="lg" shadow="md">
        {currentStep === 1 && <LocationStep defaultValues={formData} onNext={handleStep1Next} />}
        {currentStep === 2 && (
          <DetailsStep defaultValues={formData} onNext={handleStep2Next} onBack={handleBack} />
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
          <WaypointDetailsStep
            defaultValues={formData}
            onNext={handleStep4Next}
            onBack={handleBack as any}
          />
        )}
        {currentStep === 5 && !isEditing && (
          <NarrativeStep defaultValues={formData} onNext={handleStep5Next} onBack={handleBack} />
        )}
        {currentStep === 5 && isEditing && (
          <div className="space-y-4 p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium">ℹ️ Narrative Management</p>
              <p className="text-sm text-blue-700 mt-2">
                Narratives cannot be edited in this view. To manage narratives for this quest, please use the narrative 
                management interface or delete and recreate the quest with updated narratives.
              </p>
            </div>
            <button
              onClick={() => handleBack()}
              className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-300 transition-colors"
            >
              Back to Waypoint Details
            </button>
          </div>
        )}
        {currentStep === 6 && (
          <ReviewStep
            formData={formData}
            onBack={handleBack}
            onSubmit={handleSubmit}
            isSubmitting={questMutation.isPending}
          />
        )}
      </Card>
    </div>
  );
}

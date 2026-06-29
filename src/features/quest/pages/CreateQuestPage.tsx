import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@components/ui";
import { questService } from "@services/quest.service";
import { LocationStep } from "../components/LocationStep";
import { DetailsStep } from "../components/DetailsStep";
import { WaypointsStep } from "../components/WaypointsStep";
import { WaypointDetailsStep } from "../components/WaypointDetailsStep";
import { NarrativeStep } from "../components/NarrativeStep";
import { ReviewStep } from "../components/ReviewStep";
import {
  type LocationStepData,
  type DetailsStepData,
  type MarkerPlaylistStepData,
  type MarkerPlaylistItemData,
  type QuestTheme,
  type CreateQuestFormData,
  defaultFormValues,
} from "../schemas/quest.schema";
import type {
  CreateQuestPayload,
  PlaylistItemInput,
  QuestStatus,
  RegionType,
} from "@/types";

// Wizard: Location → Details → Markers → Marker Details → Narrative → Review.
type Step = 1 | 2 | 3 | 4 | 5 | 6;

const stepLabels: Record<Step, string> = {
  1: "Location",
  2: "Details",
  3: "Markers",
  4: "Marker Details",
  5: "Narrative",
  6: "Review",
};

const ALL_STEPS: Step[] = [1, 2, 3, 4, 5, 6];
const LAST_STEP = 6;

const SESSION_STORAGE_KEY = "quest_creation_form";

// Valid lowercase theme enum values accepted by the create payload + schema.
const VALID_THEMES: readonly QuestTheme[] = [
  "adventure", "romance", "culture", "food", "history", "nature",
  "spiritual", "photography", "archaeological", "offbeat", "finding_yourself", "other",
];

/** Normalize a backend theme string (Title-Case / spaced) to the lowercase enum. */
function normalizeTheme(value: string): QuestTheme | null {
  const slug = value.trim().toLowerCase().replace(/[\s-]+/g, "_") as QuestTheme;
  return VALID_THEMES.includes(slug) ? slug : null;
}

// The wizard form holds the V2 quest fields plus the extra per-marker detail
// the restored Marker-Details / Narrative steps collect. Those legacy-shaped
// extras are carried as `unknown` here until they're wired into the V2 payload
// in a later sequential step.
type WizardFormData = Partial<CreateQuestFormData> & {
  waypoints?: unknown;
  waypointDetails?: unknown;
  galleryImages?: unknown;
  narratives?: unknown;
};

export function CreateQuestPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState<WizardFormData>(defaultFormValues);
  const [isQuestInitialized, setIsQuestInitialized] = useState(false);

  // Fetch quest data if editing
  const { data: existingQuest, isLoading: isLoadingQuest } = useQuery({
    queryKey: ["quest", id],
    queryFn: () => questService.getQuestById(id!),
    enabled: isEditing,
  });

  // Prefill the wizard from the V2 QuestDetail (only once, so refetches don't
  // clobber in-progress edits).
  useEffect(() => {
    if (existingQuest && !isQuestInitialized) {
      // Creators cannot edit a Published quest.
      if (existingQuest.status === "Published") {
        toast.error("Published quests cannot be edited. Please contact an administrator.");
        navigate("/creator/quests");
        return;
      }

      const themes = (existingQuest.theme ?? [])
        .map(normalizeTheme)
        .filter((t): t is QuestTheme => t !== null);

      const regionSummary = existingQuest.region_summary;
      const regionId =
        regionSummary && "id" in regionSummary ? (regionSummary.id ?? undefined) : undefined;
      const regionName =
        regionSummary && "name" in regionSummary
          ? (regionSummary.name ?? undefined)
          : undefined;

      // marker_summaries → playlist items (existing markers, with coords when unlocked).
      const markerPlaylist: MarkerPlaylistItemData[] = (existingQuest.marker_summaries ?? []).map(
        (m) => ({
          marker_id: m.marker_id,
          is_required: m.is_required ?? true,
          custom_description: m.things_to_do_text ?? undefined,
          _display:
            m.coordinates && m.coordinates.lng != null && m.coordinates.lat != null
              ? { title: m.name ?? "Marker", lng: m.coordinates.lng, lat: m.coordinates.lat }
              : undefined,
        })
      );

      const startPoint = existingQuest.start_point;
      const mappedData: Partial<CreateQuestFormData> = {
        locationType: "city",
        title: existingQuest.title ?? "",
        description: existingQuest.description ?? "",
        theme: themes.length > 0 ? themes : ["adventure"],
        difficulty: existingQuest.difficulty ?? "moderate",
        duration: existingQuest.duration_minutes ?? 60,
        regionId,
        regionName,
        city: regionName,
        latitude: startPoint?.lat ?? undefined,
        longitude: startPoint?.lng ?? undefined,
        sourceUrl: existingQuest.reel_urls?.[0] ?? "",
        markerPlaylist,
      };
      setFormData(mappedData);
      setIsQuestInitialized(true);
    }
  }, [existingQuest, isQuestInitialized, navigate]);

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

  // Build a V2 CreateQuestPayload from the wizard form data.
  const buildPayload = (data: CreateQuestFormData, submit: boolean): CreateQuestPayload => {
    const marker_playlist: PlaylistItemInput[] = (data.markerPlaylist ?? []).map((item, index) => {
      const base: PlaylistItemInput = {
        suggested_order: index,
        is_required: item.is_required,
        ...(item.custom_description ? { custom_description: item.custom_description } : {}),
      };
      if (item.marker_id) {
        return { ...base, marker_id: item.marker_id };
      }
      const nm = item.new_marker!;
      return {
        ...base,
        new_marker: {
          title: nm.title,
          location: { type: "Point", coordinates: [nm.longitude, nm.latitude] },
          ...(nm.category ? { category: nm.category } : {}),
          ...(nm.description ? { description: nm.description } : {}),
          ...(nm.address ? { address: nm.address } : {}),
        },
      };
    });

    const reelUrls = data.sourceUrl?.trim() ? [data.sourceUrl.trim()] : undefined;

    return {
      title: data.title,
      description: data.description,
      theme: data.theme,
      difficulty: data.difficulty,
      duration_minutes: data.duration,
      region_id: data.regionId!,
      marker_playlist,
      ...(reelUrls ? { reel_urls: reelUrls } : {}),
      ...(submit ? { submit: true } : {}),
    };
  };

  // Save/Update quest mutation.
  const questMutation = useMutation({
    mutationFn: async ({ data, status }: { data: CreateQuestFormData; status: QuestStatus }) => {
      const submit = status === "Under Review";

      if (isEditing) {
        // region_id / submit are not part of the update payload; PUT then submit.
        const payload = buildPayload(data, false);
        const { region_id: _region, submit: _submit, ...updatePayload } = payload;
        void _region;
        void _submit;
        const updated = await questService.updateQuest(id!, updatePayload);
        if (submit) {
          await questService.submitQuest(updated.id);
        }
        return updated;
      }

      // Create. `submit: true` creates directly in "Under Review", so no
      // separate submit call is needed for new quests.
      const payload = buildPayload(data, submit);
      return questService.createQuest(payload);
    },
    onSuccess: () => {
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
  const handleStep3Next = (data: MarkerPlaylistStepData) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(4);
  };
  // Steps 4 (per-marker "things to do") and 5 (narratives) collect extra detail.
  // Their data rides along on formData; wiring it into the V2 payload is the
  // next sequential migration step, so for now we just persist it here.
  const handleStep4Next = (data: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(5);
  };
  const handleStep5Next = (data: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(6);
  };
  const handleBack = (data?: Partial<WizardFormData>) => {
    if (data) setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  };
  // Lets the Markers step expand the quest's region to the parent city.
  const handleRegionChange = (region: {
    regionId: string;
    regionName: string;
    regionType: RegionType;
  }) => {
    setFormData((prev) => ({
      ...prev,
      regionId: region.regionId,
      regionName: region.regionName,
      regionType: region.regionType,
      city: region.regionName,
    }));
  };
  const handleSubmit = (status: QuestStatus) => {
    if (!formData.regionId) {
      toast.error("Pick a region in step 1 before saving.");
      setCurrentStep(1);
      return;
    }
    if (!formData.markerPlaylist || formData.markerPlaylist.length < 2) {
      toast.error("Add at least two markers before saving.");
      setCurrentStep(3);
      return;
    }
    questMutation.mutate({ data: formData as CreateQuestFormData, status });
  };

  // The restored Marker-Details (step 4) and Narrative (step 5) components are
  // keyed on a legacy `waypoints[]` shape. Derive it from the marker playlist so
  // those steps render against the chosen markers without changing their code.
  const derivedWaypoints = (formData.markerPlaylist ?? [])
    .filter((it) => it._display)
    .map((it) => ({
      latitude: it._display!.lat,
      longitude: it._display!.lng,
      place_name: it._display!.title,
    }));
  const stepWaypointDefaults = { ...formData, waypoints: derivedWaypoints } as never;

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
          {ALL_STEPS.map((step) => (
            <div key={step} className={`flex items-center ${step < LAST_STEP ? "flex-1" : ""}`}>
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
              {step < LAST_STEP && (
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
            onNext={handleStep3Next}
            onBack={handleBack}
            onRegionChange={handleRegionChange}
          />
        )}
        {currentStep === 4 && (
          <WaypointDetailsStep
            defaultValues={stepWaypointDefaults}
            onNext={handleStep4Next}
            onBack={handleBack}
          />
        )}
        {currentStep === 5 && (
          <NarrativeStep
            defaultValues={stepWaypointDefaults}
            onNext={handleStep5Next}
            onBack={handleBack}
          />
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

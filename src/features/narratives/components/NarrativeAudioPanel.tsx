import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, RefreshCw, Trash2, AlertCircle, Volume2 } from "lucide-react";
import { Button } from "@components/ui";
import { narrativeService } from "@services/narrative.service";
import type { Narrative } from "@/types";

interface NarrativeAudioPanelProps {
    narrative: Narrative;
    onChanged: () => void;
}

const POLLING_STATUSES = new Set(["pending", "generating"]);

export function NarrativeAudioPanel({ narrative, onChanged }: NarrativeAudioPanelProps) {
    const queryClient = useQueryClient();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

    const canGenerate = !!(narrative.voice_persona && narrative.content);

    // Poll audio status whenever generation is possible or in-flight.
    // `enabled: true` ensures the query starts immediately after "Generate Audio"
    // is clicked (the stale `narrative.audio_status` prop would have kept it
    // disabled until the parent re-renders). The `refetchInterval` function
    // already stops polling on terminal statuses (ready/failed/quota_exceeded).
    const { data: audioStatus } = useQuery({
        queryKey: ["narrative-audio-status", narrative.id],
        queryFn: () => narrativeService.getAudioStatus(narrative.id),
        enabled: canGenerate || isGenerating,
        refetchInterval: (query) => {
            const status = query.state.data?.audio_status;
            return status !== undefined && status !== null && POLLING_STATUSES.has(status) ? 3000 : false;
        },
    });

    // Resolved values: prefer live-polled data over snapshot in narrative prop
    const currentStatus = audioStatus?.audio_status ?? narrative.audio_status;
    const currentUrl = audioStatus?.audio_url ?? narrative.audio_url;
    const isPolling = POLLING_STATUSES.has(currentStatus);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGenerateError(null);
        try {
            await narrativeService.generateAudio(narrative.id);
            await queryClient.invalidateQueries({ queryKey: ["narrative-audio-status", narrative.id] });
            onChanged();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to generate audio";
            setGenerateError(message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClear = async () => {
        setIsClearing(true);
        setGenerateError(null);
        try {
            await narrativeService.clearAudio(narrative.id);
            await queryClient.invalidateQueries({ queryKey: ["narrative-audio-status", narrative.id] });
            onChanged();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to clear audio";
            setGenerateError(message);
        } finally {
            setIsClearing(false);
        }
    };

    if (!canGenerate) {
        return (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center gap-2 text-neutral-500">
                    <Volume2 className="w-4 h-4 shrink-0" />
                    <p className="text-sm">
                        Add a <span className="font-medium">Voice Persona</span> and{" "}
                        <span className="font-medium">Content</span> to enable audio generation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-primary-600 shrink-0" />
                <span className="text-sm font-semibold text-neutral-800">Audio Narration</span>
                {narrative.voice_persona && (
                    <span className="text-xs text-neutral-400 capitalize">
                        ({narrative.voice_persona.replace(/_/g, " ")})
                    </span>
                )}
            </div>

            {/* Polling state */}
            {isPolling && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>
                        {currentStatus === "pending" ? "Queued for generation…" : "Generating audio…"}
                    </span>
                </div>
            )}

            {/* Ready state */}
            {currentStatus === "ready" && currentUrl && (
                <div className="space-y-2">
                    <audio controls src={currentUrl} className="w-full h-10" preload="metadata">
                        <track kind="captions" />
                    </audio>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            isLoading={isGenerating}
                            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                            onClick={handleGenerate}
                        >
                            Regenerate
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            isLoading={isClearing}
                            leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                            onClick={handleClear}
                            className="text-red-600 hover:bg-red-50"
                        >
                            Clear
                        </Button>
                    </div>
                </div>
            )}

            {/* Failed / quota exceeded */}
            {(currentStatus === "failed" || currentStatus === "quota_exceeded") && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="text-sm text-red-700">
                        {currentStatus === "quota_exceeded"
                            ? "Audio generation quota exceeded. Please try again later."
                            : "Audio generation failed. You can try regenerating below."}
                    </div>
                </div>
            )}

            {/* No audio yet (initial state) */}
            {(currentStatus === null || currentStatus === undefined || (!isPolling && currentStatus !== "ready" && currentStatus !== "failed" && currentStatus !== "quota_exceeded")) && (
                <p className="text-sm text-neutral-500">No audio generated yet.</p>
            )}

            {/* Generate / retry button (shown when not ready and not polling) */}
            {!isPolling && currentStatus !== "ready" && (
                <Button
                    variant="primary"
                    size="sm"
                    isLoading={isGenerating}
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                    onClick={handleGenerate}
                    className="bg-primary-600 hover:bg-primary-700 text-white"
                >
                    {currentStatus === "failed" || currentStatus === "quota_exceeded"
                        ? "Retry Generation"
                        : "Generate Audio"}
                </Button>
            )}

            {generateError && (
                <p className="text-sm text-red-600" role="alert">{generateError}</p>
            )}
        </div>
    );
}

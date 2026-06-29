import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit2, Volume2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button, Card } from "@components/ui";
import { narrativeService } from "@services/narrative.service";
import { NarrativeAudioPanel } from "../components/NarrativeAudioPanel";
import { NarrativeFormModal } from "../components/NarrativeFormModal";
import type { Narrative, NarrativeStatus } from "@/types";

const CREATOR_EDITABLE: NarrativeStatus[] = ["draft", "rejected"];

function StatusBadge({ status }: { status: NarrativeStatus }) {
    const colorMap: Record<NarrativeStatus, string> = {
        draft: "bg-slate-100 text-slate-700 border border-slate-200",
        under_review: "bg-amber-100 text-amber-700 border border-amber-200",
        approved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        rejected: "bg-red-100 text-red-700 border border-red-200",
        archived: "bg-neutral-100 text-neutral-500 border border-neutral-200",
    };
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${colorMap[status]}`}
        >
            {status.replace("_", " ")}
        </span>
    );
}

export function NarrativeDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const {
        data: narrative,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: ["creator-narrative", id],
        queryFn: () => {
            if (!id) throw new Error("No narrative id");
            return narrativeService.getNarrativeById(id);
        },
        enabled: !!id,
    });

    const handleAudioChanged = async () => {
        await queryClient.invalidateQueries({ queryKey: ["creator-narrative", id] });
        await refetch();
    };

    const handleSaved = (updated: Narrative) => {
        setIsEditModalOpen(false);
        void queryClient.invalidateQueries({ queryKey: ["creator-narrative", updated.id] });
        void queryClient.invalidateQueries({ queryKey: ["creator-narratives"] });
        void refetch();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh] text-slate-400">
                Loading narrative…
            </div>
        );
    }

    if (isError || !narrative) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <span>Failed to load narrative.</span>
                </div>
                <Button variant="ghost" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Go Back
                </Button>
            </div>
        );
    }

    const isEditable = CREATOR_EDITABLE.includes(narrative.status);

    return (
        <div className="animate-fade-in w-full max-w-3xl mx-auto pb-8 px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Back + actions header */}
            <div className="flex items-center justify-between gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                    onClick={() => navigate(-1)}
                >
                    Back
                </Button>
                {isEditable && (
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit2 className="w-4 h-4" />}
                        onClick={() => setIsEditModalOpen(true)}
                    >
                        Edit
                    </Button>
                )}
            </div>

            {/* Main card */}
            <Card className="overflow-hidden">
                <div className="p-6 space-y-6">
                    {/* Title + status */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                                {narrative.title}
                            </h1>
                            {narrative.subtitle && (
                                <p className="mt-1 text-slate-500 text-base">{narrative.subtitle}</p>
                            )}
                        </div>
                        <StatusBadge status={narrative.status} />
                    </div>

                    {/* Rejected review note */}
                    {narrative.status === "rejected" && narrative.review_note && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-700 mb-0.5">Review Note</p>
                                <p className="text-sm text-red-600">{narrative.review_note}</p>
                            </div>
                        </div>
                    )}

                    {/* Attach info */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-y border-slate-100">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                Attach Type
                            </p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold uppercase">
                                {narrative.attach_type}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                Attach ID
                            </p>
                            <p className="text-sm text-slate-700 font-mono truncate">{narrative.attach_id}</p>
                        </div>
                        {narrative.voice_persona && (
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Voice Persona
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <Volume2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <p className="text-sm text-slate-700 capitalize">
                                        {narrative.voice_persona.replace(/_/g, " ")}
                                    </p>
                                </div>
                            </div>
                        )}
                        {narrative.sequence_order !== undefined && narrative.sequence_order !== null && (
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Sequence
                                </p>
                                <p className="text-sm text-slate-700">#{narrative.sequence_order}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                Mandatory
                            </p>
                            <p className="text-sm text-slate-700">{narrative.is_mandatory ? "Yes" : "No"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                Unlocked
                            </p>
                            <p className="text-sm text-slate-700">{narrative.is_unlocked ? "Yes" : "No"}</p>
                        </div>
                    </div>

                    {/* Content */}
                    {narrative.content && (
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                Content
                            </p>
                            <div className="prose prose-slate prose-sm max-w-none rounded-xl bg-slate-50 border border-slate-100 p-5">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {narrative.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Media */}
                    {narrative.media.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                Media
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {narrative.media.map((url, idx) => (
                                    <img
                                        key={idx}
                                        src={url}
                                        alt={`Narrative media ${idx + 1}`}
                                        className="w-28 h-28 object-cover rounded-xl border border-slate-200 shadow-sm"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Audio Panel */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                            Audio
                        </p>
                        <NarrativeAudioPanel
                            narrative={narrative}
                            onChanged={handleAudioChanged}
                        />
                    </div>

                    {/* Meta footer */}
                    <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-xs text-slate-400">
                        {narrative.created_at && (
                            <span>
                                Created{" "}
                                {new Date(narrative.created_at).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                })}
                            </span>
                        )}
                        {narrative.updated_at && (
                            <span>
                                Updated{" "}
                                {new Date(narrative.updated_at).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                })}
                            </span>
                        )}
                        <span>{narrative.view_count} view{narrative.view_count !== 1 ? "s" : ""}</span>
                    </div>
                </div>
            </Card>

            {/* Edit modal */}
            {isEditable && (
                <NarrativeFormModal
                    open={isEditModalOpen}
                    mode="edit"
                    initial={narrative}
                    onClose={() => setIsEditModalOpen(false)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}

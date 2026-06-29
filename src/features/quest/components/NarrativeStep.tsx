// Step 5 — Quest-level narrative (attach_type: "quest").
//
// Per the product flow, per-MARKER narratives are managed on the dedicated
// Narratives page (built/linked later). This step only collects ONE optional
// narrative for the whole quest. It's posted to POST /api/v2/narratives AFTER
// the quest is created (the narrative's attach_id is the new quest id), so this
// component just collects { title, content, voice_persona } — the create-page
// wiring fires the request on submit.
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, SkipForward, BookOpen } from "lucide-react";
import { Button, Textarea, InfoHint } from "@components/ui";

/** Narrator voices the V2 narrative audio pipeline supports (optional). */
const VOICE_OPTIONS = [
    { value: "", label: "No narrator voice" },
    { value: "historian_warm", label: "Historian — warm" },
    { value: "mystery_whisper", label: "Mystery — whisper" },
    { value: "energetic_guide", label: "Energetic guide" },
    { value: "elder_storyteller", label: "Elder storyteller" },
] as const;

const questNarrativeSchema = z
    .object({
        title: z.string().max(200).optional().default(""),
        content: z.string().max(10000).optional().default(""),
        voice_persona: z.string().optional().default(""),
    })
    // The whole narrative is optional, but if a story is written it needs a title
    // (the backend requires a title on every narrative).
    .refine((d) => !d.content?.trim() || !!d.title?.trim(), {
        message: "Add a title for your narrative",
        path: ["title"],
    });

export type QuestNarrativeData = z.infer<typeof questNarrativeSchema>;

interface NarrativeStepProps {
    defaultValues: { questNarrative?: Partial<QuestNarrativeData> };
    onNext: (data: { questNarrative: QuestNarrativeData }) => void;
    onBack?: (data: { questNarrative: QuestNarrativeData }) => void;
}

export function NarrativeStep({ defaultValues, onNext, onBack }: NarrativeStepProps) {
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<QuestNarrativeData>({
        resolver: zodResolver(questNarrativeSchema),
        defaultValues: {
            title: defaultValues.questNarrative?.title ?? "",
            content: defaultValues.questNarrative?.content ?? "",
            voice_persona: defaultValues.questNarrative?.voice_persona ?? "",
        },
    });

    const submit = (data: QuestNarrativeData) => onNext({ questNarrative: data });
    const skip = () => onNext({ questNarrative: { title: "", content: "", voice_persona: "" } });
    const back = () => onBack?.({ questNarrative: watch() });

    return (
        <form onSubmit={handleSubmit(submit)} className="space-y-7">
            <div>
                <h2 className="text-xl font-semibold text-neutral-900">Quest Narrative</h2>
                <p className="text-sm text-neutral-500 mt-0.5">
                    Set the scene for the whole quest.
                    <span className="ml-1 font-medium text-indigo-600">This step is optional.</span>
                </p>
            </div>

            {/* Per-marker narratives live elsewhere — make that explicit. */}
            <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
                <BookOpen className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-indigo-900">Need narratives for specific stops?</p>
                    <p className="text-indigo-700 mt-0.5">
                        Per-marker narratives are managed on the dedicated{" "}
                        <strong>Narratives page</strong> (coming soon). Here you add just one
                        narrative for the whole quest.
                    </p>
                </div>
            </div>

            {/* Title */}
            <div className="max-w-2xl space-y-1.5">
                <div className="flex items-center gap-1.5">
                    <label htmlFor="qn-title" className="text-sm font-medium text-neutral-700">
                        Narrative title
                    </label>
                    <InfoHint
                        side="top"
                        text="A short title for your quest's opening narrative (e.g. 'The Ghats Awaken'). Only required if you write a story below."
                    />
                </div>
                <input
                    id="qn-title"
                    type="text"
                    placeholder="e.g. The Ghats Awaken"
                    {...register("title")}
                    className="w-full bg-white text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
                {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
            </div>

            {/* Story / content */}
            <div className="max-w-2xl space-y-1.5">
                <div className="flex items-center gap-1.5">
                    <label htmlFor="qn-content" className="text-sm font-medium text-neutral-700">
                        Story
                    </label>
                    <InfoHint
                        side="top"
                        text="The story or context explorers experience when they begin the quest. Leave everything blank to skip the narrative entirely."
                    />
                </div>
                <Textarea
                    id="qn-content"
                    placeholder="e.g. As dawn breaks over Varanasi, the ancient city stirs to life along the sacred Ganga…"
                    {...register("content")}
                    className="bg-white text-sm border-slate-300 focus:border-slate-900 focus:ring-slate-900 min-h-[140px]"
                />
            </div>

            {/* Voice persona (optional) */}
            <div className="max-w-xs space-y-1.5">
                <div className="flex items-center gap-1.5">
                    <label htmlFor="qn-voice" className="text-sm font-medium text-neutral-700">
                        Narrator voice{" "}
                        <span className="text-neutral-400 font-normal">(optional)</span>
                    </label>
                    <InfoHint
                        side="top"
                        text="Optional AI narrator voice — we generate spoken audio for this narrative once it's submitted for review."
                    />
                </div>
                <select
                    id="qn-voice"
                    {...register("voice_persona")}
                    className="w-full bg-white text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                >
                    {VOICE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>

            <p className="text-xs text-neutral-500">
                Saved as a draft — you can refine it or add audio later from the Narratives page.
            </p>

            {/* Navigation — Skip and Next both proceed (the narrative is optional). */}
            <div className="flex justify-between pt-6 border-t border-slate-200">
                <Button
                    type="button"
                    variant="outline"
                    onClick={back}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                    Back
                </Button>
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={skip}
                        leftIcon={<SkipForward className="w-4 h-4" />}
                    >
                        Skip
                    </Button>
                    <Button type="submit" rightIcon={<ChevronRight className="w-4 h-4" />}>
                        Next
                    </Button>
                </div>
            </div>
        </form>
    );
}

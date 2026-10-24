import { ChevronRight, Clock, ImageOff, MapPin, Ticket } from "lucide-react";
import type { TitledText } from "@services/experience.types";
import { formatINR } from "../utils";

export interface ExperiencePreviewData {
    title: string;
    tagline: string;
    description: string;
    tags: string[];
    regionName: string | null;
    media: string[];
    curatorName: string;
    curatorTitle: string;
    curatorYears: string;
    curatorPhoto: string;
    durationText: string;
    locationLabel: string;
    priceFrom: number | null;
    highlights: TitledText[];
    experienceMedia: string[];
}

/**
 * A phone-sized sketch of the app's Overview tab, so businesses see roughly
 * what customers will see while they edit.
 */
export function ExperiencePreview({ data }: { data: ExperiencePreviewData }) {
    const cover = data.media[0];
    const chips = [data.regionName, ...data.tags].filter((c): c is string => !!c).slice(0, 4);
    const years = Number(data.curatorYears);
    const highlights = data.highlights.filter((h) => h.title.trim() || h.description.trim());

    return (
        <div className="rounded-[2rem] border-[6px] border-neutral-900 bg-white shadow-xl overflow-hidden">
            <div className="relative aspect-[4/3] bg-neutral-100">
                {cover ? (
                    <img src={cover} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 gap-1">
                        <ImageOff className="w-6 h-6" />
                        <span className="text-[11px]">Your cover photo</span>
                    </div>
                )}
                {data.media.length > 1 && (
                    <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
                        {data.media.slice(0, 6).map((_, i) => (
                            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-white" : "bg-white/50"}`} />
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 space-y-3 max-h-[560px] overflow-y-auto">
                <div>
                    <h3 className="text-lg font-display font-bold text-primary-900 leading-snug">
                        {data.title.trim() || "Your experience title"}
                    </h3>
                    {data.curatorName.trim() && <p className="text-xs text-neutral-500 mt-0.5">By: {data.curatorName.trim()}</p>}
                </div>
                {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {chips.map((c) => (
                            <span key={c} className="px-2 py-0.5 rounded-full bg-highlight/50 text-primary-900 text-[11px] font-medium">
                                {c}
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex rounded-full bg-neutral-100 p-0.5 text-[11px] font-semibold text-center">
                    <span className="flex-1 py-1 rounded-full bg-white shadow-sm text-primary-900">Overview</span>
                    <span className="flex-1 py-1 text-neutral-500">Details</span>
                    <span className="flex-1 py-1 text-neutral-500">Book Now</span>
                </div>

                <section>
                    <p className="text-xs font-bold text-neutral-900 mb-1">At a Glance</p>
                    <p className="text-xs text-neutral-600 whitespace-pre-line line-clamp-6">
                        {data.description.trim() || data.tagline.trim() || "Describe the experience in a few lines."}
                    </p>
                </section>

                {data.curatorName.trim() && (
                    <section className="flex items-center gap-2.5 rounded-xl border border-neutral-200 p-2.5">
                        {data.curatorPhoto ? (
                            <img src={data.curatorPhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <span className="w-10 h-10 rounded-full bg-primary-100" />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-wider text-neutral-400">Meet the Curator</p>
                            <p className="text-xs font-semibold text-neutral-900 truncate">{data.curatorName.trim()}</p>
                            <p className="text-[11px] text-neutral-500 truncate">
                                {[data.curatorTitle.trim(), years > 0 ? `${years} years` : ""].filter(Boolean).join(" · ")}
                            </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </section>
                )}

                <section className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-neutral-50 p-2">
                        <Clock className="w-3.5 h-3.5 text-primary-600" />
                        <p className="text-[10px] text-neutral-400 mt-1">Duration</p>
                        <p className="text-[11px] font-semibold text-neutral-800 truncate">{data.durationText.trim() || "—"}</p>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-2">
                        <Ticket className="w-3.5 h-3.5 text-primary-600" />
                        <p className="text-[10px] text-neutral-400 mt-1">Tickets</p>
                        <p className="text-[11px] font-semibold text-neutral-800 truncate">
                            {data.priceFrom === null ? "—" : data.priceFrom === 0 ? "Free" : `From ${formatINR(data.priceFrom)}`}
                        </p>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-2 col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-primary-600" />
                        <p className="text-[10px] text-neutral-400 mt-1">Location</p>
                        <p className="text-[11px] font-semibold text-neutral-800 truncate">{data.locationLabel || "—"}</p>
                    </div>
                </section>

                {(highlights.length > 0 || data.experienceMedia.length > 0) && (
                    <section>
                        <p className="text-xs font-bold text-neutral-900 mb-1.5">What You'll Experience</p>
                        {data.experienceMedia.length > 0 && (
                            <div className="flex gap-1.5 overflow-hidden mb-2">
                                {data.experienceMedia.slice(0, 3).map((url, i) => (
                                    <img key={`${url}-${i}`} src={url} alt="" className="w-20 h-14 rounded-lg object-cover shrink-0" />
                                ))}
                            </div>
                        )}
                        <ol className="space-y-1.5">
                            {highlights.slice(0, 5).map((h, i) => (
                                <li key={i} className="flex gap-2">
                                    <span className="w-4 h-4 rounded-full bg-primary-900 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                        {i + 1}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-[11px] font-semibold text-neutral-900">{h.title}</span>
                                        {h.description && (
                                            <span className="block text-[11px] text-neutral-500 line-clamp-2">{h.description}</span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}
            </div>
        </div>
    );
}

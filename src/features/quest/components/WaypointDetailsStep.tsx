// Step 4 (Marker Details) of the V2 quest builder.
//
// Per quest stop this collects a PER-QUEST "Things to do" text + a single
// "Things to do image" (stored on the quest's marker_playlist item, NOT on the
// shared marker). It also collects quest-level "Additional Gallery images"
// (mapped to the quest's cloudinary_assets, independent of any marker).
//
// The form holds `{ markerPlaylist, galleryImages }`. A local zod resolver makes
// every stop's things-to-do text + single image required, and requires ≥1 gallery
// image. The other playlist fields (marker_id, new_marker, _display, …) are kept
// untouched via `.passthrough()`.
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Image as ImageIcon, X } from "lucide-react";
import { Button, Textarea, InfoHint } from "@/components/ui";
import { ImageUpload } from "./ImageUpload";
import { WaypointMapComponent, type PlaylistPoint } from "@features/map";
import { cloudinaryAssetSchema, type MarkerPlaylistItemData } from "../schemas/quest.schema";
import type { CloudinaryAsset } from "@/types";
import { VideoWalkthroughModal, VideoHelpButton } from "@components/VideoWalkthroughModal";
import { WALKTHROUGH_VIDEOS } from "@config/walkthroughVideos";

// Local resolver schema for draft/proceed: thingsToDo text is recommended but
// optional (min 0), images are optional. Images are only enforced on "Submit for
// Review" (checked in CreateQuestPage.handleSubmit — F2 fix). `.passthrough()`
// keeps the rest of the playlist item (marker_id, new_marker, _display, …) intact.
const detailsItemSchema = z
    .object({
        thingsToDo: z.string().optional(),
        thingsToDoImage: cloudinaryAssetSchema.optional(),
    })
    .passthrough();

const waypointDetailsStepSchema = z.object({
    markerPlaylist: z.array(detailsItemSchema),
    galleryImages: z.array(cloudinaryAssetSchema).optional(),
});

type WaypointDetailsFormData = {
    markerPlaylist: MarkerPlaylistItemData[];
    galleryImages: CloudinaryAsset[];
};

interface WaypointDetailsStepProps {
    defaultValues: { markerPlaylist?: MarkerPlaylistItemData[]; galleryImages?: CloudinaryAsset[] };
    onNext: (data: { markerPlaylist: MarkerPlaylistItemData[]; galleryImages: CloudinaryAsset[] }) => void;
    onBack?: (data: { markerPlaylist: MarkerPlaylistItemData[]; galleryImages: CloudinaryAsset[] }) => void;
}

export function WaypointDetailsStep({ defaultValues, onNext, onBack }: WaypointDetailsStepProps) {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isValid },
    } = useForm<WaypointDetailsFormData>({
        resolver: zodResolver(waypointDetailsStepSchema) as never,
        mode: "onChange",
        defaultValues: {
            markerPlaylist: defaultValues.markerPlaylist ?? [],
            galleryImages: defaultValues.galleryImages ?? [],
        },
    });

    const markerPlaylist = watch("markerPlaylist");
    const galleryImages = watch("galleryImages");

    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const toggleAccordion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    // ─── Per-stop things-to-do image ─────────────────────────────────────────
    const setThingsToDoImage = (index: number, asset: CloudinaryAsset | undefined) => {
        setValue(`markerPlaylist.${index}.thingsToDoImage`, asset, { shouldValidate: true });
    };

    // ─── Gallery images ──────────────────────────────────────────────────────
    const handleGalleryUpload = (asset: CloudinaryAsset | undefined) => {
        if (!asset) return;
        setValue("galleryImages", [...(galleryImages ?? []), asset], { shouldValidate: true });
    };
    const handleGalleryRemove = (publicId: string) => {
        setValue(
            "galleryImages",
            (galleryImages ?? []).filter((img) => img.public_id !== publicId),
            { shouldValidate: true }
        );
    };

    // ─── Map: pins from items that carry a _display point ─────────────────────
    const playlistPoints = useMemo<PlaylistPoint[]>(
        () =>
            (markerPlaylist ?? []).flatMap((it) =>
                it._display
                    ? [{ lng: it._display.lng, lat: it._display.lat, title: it._display.title }]
                    : []
            ),
        [markerPlaylist]
    );

    const openItem = openIndex !== null ? markerPlaylist?.[openIndex] : undefined;
    const focusedLocation =
        openItem?._display ? { lng: openItem._display.lng, lat: openItem._display.lat } : null;

    const firstPoint = playlistPoints[0];
    const mapCenter = focusedLocation ??
        (firstPoint ? { lng: firstPoint.lng, lat: firstPoint.lat } : { lng: 77.5946, lat: 12.9716 });

    // Keep an open card in view as the playlist length changes.
    useEffect(() => {
        if (markerPlaylist.length === 0) {
            setOpenIndex(null);
        } else if (openIndex === null || openIndex >= markerPlaylist.length) {
            setOpenIndex(0);
        }
    }, [markerPlaylist.length, openIndex]);

    const onSubmit = (data: WaypointDetailsFormData) => {
        onNext({ markerPlaylist: data.markerPlaylist, galleryImages: data.galleryImages });
    };

    const handleBack = () => {
        onBack?.({ markerPlaylist: markerPlaylist ?? [], galleryImages: galleryImages ?? [] });
    };

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight">Marker Details</h2>
                        <p className="text-neutral-500">
                            Tell explorers what to do at each stop and add photos for your quest.
                        </p>
                    </div>
                    <VideoHelpButton onClick={() => setIsModalOpen(true)} label="Watch walkthrough" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
                    {/* Left Column: Accordion List */}
                    <div className="space-y-4 order-2 lg:order-1">
                        {markerPlaylist.map((item, index) => {
                            const title = item._display?.title ?? `Stop ${index + 1}`;
                            const isOpen = openIndex === index;
                            const itemErrors = errors.markerPlaylist?.[index];
                            const hasError = !!itemErrors;
                            const thingsToDoImage = item.thingsToDoImage;

                            return (
                                <div
                                    key={`${item.marker_id ?? "new"}-${item._display?.lng ?? 0}-${item._display?.lat ?? 0}-${index}`}
                                    className={`
                                        border rounded-2xl transition-all duration-200 shadow-sm overflow-hidden
                                        ${hasError ? "border-red-300 bg-red-50/10" : "border-neutral-200 bg-white"}
                                        ${isOpen ? "ring-1 ring-neutral-900 border-neutral-900 shadow-md" : "hover:border-neutral-400"}
                                    `}
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleAccordion(index)}
                                        className="flex w-full items-center justify-between p-4 bg-white transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`
                                                flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-sm transition-colors shrink-0
                                                ${isOpen
                                                    ? "bg-neutral-900 border-neutral-900 text-white"
                                                    : "bg-white border-neutral-300 text-neutral-500"
                                                }
                                            `}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <span className={`font-semibold text-base block ${isOpen ? "text-neutral-900" : "text-neutral-600"}`}>
                                                    {title}
                                                </span>
                                                {hasError && (
                                                    <span className="text-xs text-red-500 font-medium mt-0.5 block">
                                                        Missing details
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isOpen ? (
                                            <ChevronUp className="w-5 h-5 text-neutral-900" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-neutral-400" />
                                        )}
                                    </button>

                                    <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                        <div className="overflow-hidden">
                                            <div className="px-5 py-5 border-t border-neutral-100 bg-neutral-50/50 space-y-6">
                                                {/* Things to do */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <label
                                                            htmlFor={`markerPlaylist.${index}.thingsToDo`}
                                                            className="text-sm font-semibold text-neutral-900"
                                                        >
                                                            Things to do
                                                            <span className="ml-1 text-xs font-normal text-neutral-400">(required to submit)</span>
                                                        </label>
                                                        <InfoHint
                                                            side="top"
                                                            text="What should explorers do or notice at this stop?"
                                                        />
                                                    </div>
                                                    <Textarea
                                                        id={`markerPlaylist.${index}.thingsToDo`}
                                                        placeholder="e.g. Count the pillars in the main hall and snap a photo of the carved ceiling…"
                                                        {...register(`markerPlaylist.${index}.thingsToDo`)}
                                                        error={itemErrors?.thingsToDo?.message}
                                                        className="bg-white text-sm border-neutral-200 focus:border-neutral-900 focus:ring-neutral-900 min-h-[100px]"
                                                    />
                                                </div>

                                                {/* Things to do image (single) */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <label className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                                                            <ImageIcon className="w-4 h-4 text-primary-500" />
                                                            Things to do image
                                                            <span className="text-xs font-normal text-neutral-400">(required to submit)</span>
                                                        </label>
                                                        <InfoHint
                                                            side="top"
                                                            text="A single photo that illustrates the activity — distinct from the marker's own photos."
                                                        />
                                                    </div>
                                                    {thingsToDoImage ? (
                                                        <div className="relative group w-32 h-32 rounded-lg overflow-hidden border border-neutral-200 bg-white shadow-sm">
                                                            <img
                                                                src={thingsToDoImage.secure_url}
                                                                alt="Things to do"
                                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setThingsToDoImage(index, undefined)}
                                                                className="absolute top-1 right-1 p-1 bg-white/90 backdrop-blur rounded-full text-neutral-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                                                aria-label="Remove things to do image"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="w-32 h-32">
                                                            <ImageUpload
                                                                onChange={(asset) => setThingsToDoImage(index, asset)}
                                                                allowMultiple={false}
                                                                variant="minimal"
                                                                className="h-full w-full"
                                                            />
                                                        </div>
                                                    )}
                                                    {itemErrors?.thingsToDoImage && (
                                                        <p className="text-sm text-red-600" role="alert">
                                                            A photo is required for this stop.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Column: Sticky Map */}
                    <div className="order-1 lg:order-2 lg:sticky lg:top-6">
                        <div className="rounded-2xl overflow-hidden shadow-lg border border-neutral-200 bg-white">
                            <WaypointMapComponent
                                center={mapCenter}
                                playlistPoints={playlistPoints}
                                focusedLocation={focusedLocation}
                                height="400px"
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Additional Gallery Images */}
                <div className="pt-8 border-t border-neutral-200">
                    <div className="space-y-4">
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-lg font-semibold text-neutral-900">
                                Additional Gallery images
                                <span className="ml-1 text-sm font-normal text-neutral-400">(required to submit)</span>
                            </h3>
                            <InfoHint
                                side="top"
                                text="Quest-level photos shown on the quest page — independent of any marker."
                            />
                        </div>

                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {(galleryImages ?? []).map((img) => (
                                <div key={img.public_id} className="relative group aspect-square rounded-lg overflow-hidden border border-neutral-200 bg-white shadow-sm">
                                    <img
                                        src={img.secure_url}
                                        alt="Gallery"
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleGalleryRemove(img.public_id)}
                                        className="absolute top-1 right-1 p-1 bg-white/90 backdrop-blur rounded-full text-neutral-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                                        aria-label="Remove gallery image"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            <div className="aspect-square">
                                <ImageUpload
                                    onChange={handleGalleryUpload}
                                    allowMultiple={true}
                                    variant="minimal"
                                    className="h-full w-full"
                                />
                            </div>
                        </div>
                        {errors.galleryImages && (
                            <p className="text-sm text-red-600" role="alert">
                                {errors.galleryImages.message ?? errors.galleryImages.root?.message}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-neutral-200">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        leftIcon={<ChevronLeft className="w-4 h-4" />}
                    >
                        Back
                    </Button>
                    <Button
                        type="submit"
                        disabled={!isValid}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                        Next
                    </Button>
                </div>
            </form>

            <VideoWalkthroughModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                videoUrl={WALKTHROUGH_VIDEOS.WAYPOINT_DETAILS}
                title="Marker Details Walkthrough"
            />
        </>
    );
}

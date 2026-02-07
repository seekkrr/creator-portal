import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Link, ChevronRight } from "lucide-react";
import { Button, Input, Card } from "@components/ui";
import { locationStepSchema, type LocationStepData } from "../schemas/quest.schema";

interface LocationStepProps {
    defaultValues: Partial<LocationStepData>;
    onNext: (data: LocationStepData) => void;
}

export function LocationStep({ defaultValues, onNext }: LocationStepProps) {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<LocationStepData>({
        resolver: zodResolver(locationStepSchema),
        defaultValues: {
            locationType: defaultValues.locationType ?? "city",
            city: defaultValues.city ?? "",
            sourceUrl: defaultValues.sourceUrl ?? "",
        },
    });

    const locationType = watch("locationType");

    const onSubmit = (data: LocationStepData) => {
        onNext(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                    Where is your quest located?
                </h2>
                <p className="text-neutral-600">
                    Enter the city or share a URL from social media to start
                </p>
            </div>

            {/* Location Type Toggle */}
            <div className="grid grid-cols-2 gap-4">
                <Card
                    padding="md"
                    hover
                    className={`cursor-pointer transition-all ${locationType === "city"
                            ? "ring-2 ring-indigo-500 border-indigo-500"
                            : "hover:border-neutral-300"
                        }`}
                    onClick={() => setValue("locationType", "city")}
                >
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${locationType === "city" ? "bg-indigo-100" : "bg-neutral-100"
                            }`}>
                            <MapPin className={`w-6 h-6 ${locationType === "city" ? "text-indigo-600" : "text-neutral-500"
                                }`} />
                        </div>
                        <h3 className="font-medium text-neutral-900">Enter City</h3>
                        <p className="text-sm text-neutral-500 mt-1">
                            Specify quest location
                        </p>
                    </div>
                </Card>

                <Card
                    padding="md"
                    hover
                    className={`cursor-pointer transition-all ${locationType === "url"
                            ? "ring-2 ring-indigo-500 border-indigo-500"
                            : "hover:border-neutral-300"
                        }`}
                    onClick={() => setValue("locationType", "url")}
                >
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${locationType === "url" ? "bg-indigo-100" : "bg-neutral-100"
                            }`}>
                            <Link className={`w-6 h-6 ${locationType === "url" ? "text-indigo-600" : "text-neutral-500"
                                }`} />
                        </div>
                        <h3 className="font-medium text-neutral-900">Share URL</h3>
                        <p className="text-sm text-neutral-500 mt-1">
                            Reel / Short / Video
                        </p>
                    </div>
                </Card>
            </div>

            {/* Input Field */}
            {locationType === "city" ? (
                <Input
                    {...register("city")}
                    label="Enter the next location"
                    placeholder="e.g., Mumbai, Paris, Tokyo"
                    error={errors.city?.message ?? (errors.locationType as { message?: string } | undefined)?.message}
                    leftIcon={<MapPin className="w-5 h-5" />}
                />
            ) : (
                <Input
                    {...register("sourceUrl")}
                    label="Share URL / Reel / Short"
                    placeholder="https://instagram.com/reel/... or YouTube link"
                    error={errors.sourceUrl?.message ?? (errors.locationType as { message?: string } | undefined)?.message}
                    leftIcon={<Link className="w-5 h-5" />}
                />
            )}

            {/* Navigation */}
            <div className="flex justify-end pt-4">
                <Button type="submit" rightIcon={<ChevronRight className="w-4 h-4" />}>
                    Next
                </Button>
            </div>
        </form>
    );
}

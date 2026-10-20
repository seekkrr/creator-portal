import { useState } from "react";
import { toast } from "sonner";
import { Link2, MapPin, Send } from "lucide-react";
import { Button } from "@components/ui";
import { ApiRequestError } from "@services/api";
import { businessService } from "@services/business.service";
import type { Marker } from "@/types";
import { MarkerMapPicker, type LngLat } from "@features/markers/components/MarkerMapPicker";
import { useBusiness } from "../context";
import { useInvalidateBusiness, useUpgradePrompt } from "../queries";
import { FieldLabel, SegmentedControl, inputClass } from "./bits";
import { PlaceSearchSelect } from "./PlaceSearchSelect";
import { UpgradeDialog } from "./UpgradeDialog";

type Mode = "find" | "new";

// Bir, where the pilot runs: a better starting point than the generic map default.
const BIR: LngLat = { lng: 76.7179, lat: 32.0436 };

/**
 * Add a place to the business: link one that's already on SeekKrr (instant),
 * or drop a pin for a new one (reviewed by our team, then linked automatically).
 */
export function AddPlacePanel({ onDone }: { onDone?: () => void }) {
    const { businessId } = useBusiness();
    const invalidate = useInvalidateBusiness();
    const { notifyError, upgrade } = useUpgradePrompt();
    const [mode, setMode] = useState<Mode>("find");
    const [place, setPlace] = useState<Marker | null>(null);
    const [title, setTitle] = useState("");
    const [point, setPoint] = useState<LngLat | null>(null);
    const [address, setAddress] = useState("");
    const [nearby, setNearby] = useState<{ id: string; title: string } | null>(null);
    const [busy, setBusy] = useState(false);

    const link = async (markerId: string) => {
        setBusy(true);
        try {
            await businessService.linkPlace(businessId, markerId);
            toast.success("Place linked. Set its 4-digit redeem code next.");
            await invalidate();
            onDone?.();
        } catch (e) {
            notifyError(e, "Couldn't link this place");
        } finally {
            setBusy(false);
        }
    };

    const request = async (confirmNearby = false) => {
        if (!title.trim() || !point) return;
        setBusy(true);
        try {
            await businessService.requestPlace(businessId, {
                title: title.trim(),
                lat: point.lat,
                lng: point.lng,
                address: address.trim() || undefined,
                confirm_nearby: confirmNearby,
            });
            toast.success("Sent for review. We'll link it to your business as soon as it's approved.");
            setNearby(null);
            await invalidate();
            onDone?.();
        } catch (e) {
            if (e instanceof ApiRequestError && e.code === "NEARBY_MARKER" && e.details) {
                setNearby({ id: String(e.details.existing_marker_id), title: String(e.details.existing_title ?? "a place") });
            } else {
                notifyError(e, "Couldn't send the place for review");
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <SegmentedControl<Mode>
                size="sm"
                ariaLabel="How to add your place"
                value={mode}
                onChange={(m) => {
                    setMode(m);
                    setNearby(null);
                }}
                options={[
                    { value: "find", label: "It's on SeekKrr" },
                    { value: "new", label: "Add a new place" },
                ]}
            />

            {mode === "find" ? (
                <div className="space-y-3">
                    <div>
                        <FieldLabel htmlFor="add-place-search" hint="Search by name, like your café or hostel.">
                            Find your place
                        </FieldLabel>
                        <PlaceSearchSelect id="add-place-search" value={place} onChange={setPlace} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            variant="accent"
                            className="rounded-full"
                            disabled={!place || busy}
                            isLoading={busy}
                            onClick={() => place && void link(place.id)}
                        >
                            <Link2 className="w-4 h-4" /> Link this place
                        </Button>
                        <button type="button" onClick={() => setMode("new")} className="text-sm font-semibold text-primary-700 hover:underline">
                            Can't find it? Add a new place
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <FieldLabel htmlFor="add-place-title">Place name *</FieldLabel>
                        <input
                            id="add-place-title"
                            className={inputClass}
                            maxLength={150}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Garden Café Bir"
                        />
                    </div>
                    <div>
                        <FieldLabel hint="Search or tap the map to drop the pin on your entrance.">Where is it? *</FieldLabel>
                        <div className="rounded-2xl overflow-hidden border border-neutral-200">
                            <MarkerMapPicker
                                value={point}
                                onChange={setPoint}
                                defaultCenter={BIR}
                                onPlace={(p) => {
                                    if (p.address) setAddress(p.address);
                                    if (!title.trim() && p.place_name) setTitle(p.place_name);
                                }}
                            />
                        </div>
                    </div>
                    <div>
                        <FieldLabel htmlFor="add-place-address">Address</FieldLabel>
                        <input
                            id="add-place-address"
                            className={inputClass}
                            maxLength={500}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Filled in from the pin; edit if needed"
                        />
                    </div>

                    {nearby && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-3" role="alert">
                            <p>
                                <span className="font-semibold">{nearby.title}</span> is already on SeekKrr right here. Is that your place?
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="accent" className="rounded-full" disabled={busy} onClick={() => void link(nearby.id)}>
                                    Yes, link it
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => void request(true)}>
                                    No, it's a different place
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            variant="accent"
                            className="rounded-full"
                            disabled={!title.trim() || !point || busy}
                            isLoading={busy}
                            onClick={() => void request(false)}
                        >
                            <Send className="w-4 h-4" /> Send for review
                        </Button>
                        <p className="text-xs text-neutral-500 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> Our team checks new places, usually within a day.
                        </p>
                    </div>
                </div>
            )}
            <UpgradeDialog {...upgrade} />
        </div>
    );
}

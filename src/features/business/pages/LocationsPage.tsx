import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, MapPin, ShieldCheck } from "lucide-react";
import { Button, EmptyState, ErrorState, Skeleton } from "@components/ui";
import { businessService } from "@services/business.service";
import type { HubPlace } from "@services/business.types";
import { useBusiness } from "../context";
import { bkeys, useHub } from "../queries";
import { errorMessage, formatDate } from "../utils";
import { PageHeader, Pill } from "../components/bits";
import { Modal } from "../components/Overlay";
import { PinInput } from "../components/PinInput";

function ChangeCodeDialog({
    place,
    onClose,
    isFirst,
}: {
    place: HubPlace;
    onClose: () => void;
    isFirst: boolean;
}) {
    const { businessId } = useBusiness();
    const queryClient = useQueryClient();
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!/^\d{4}$/.test(code)) {
            setError("Enter all 4 digits.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const result = await businessService.setRedeemCode(businessId, place.marker_id, code);
            queryClient.setQueryData(bkeys.redeemCode(businessId, place.marker_id), result);
            await queryClient.invalidateQueries({ queryKey: bkeys.hub(businessId) });
            toast.success(isFirst ? "Redeem code set — creators can redeem now." : "Redeem code changed. Let your staff know!");
            onClose();
        } catch (e) {
            // e.g. "Pick a code that's harder to guess than repeated or sequential digits"
            setError(errorMessage(e, "Couldn't save the code"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={saving ? () => undefined : onClose}
            size="sm"
            icon={
                <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                </div>
            }
            title={isFirst ? `Set the redeem code for ${place.title ?? "this place"}` : `Change the redeem code`}
            description={
                isFirst
                    ? "Pick 4 digits your staff will remember. They type it on the creator's phone to redeem."
                    : "The old code stops working immediately — tell your staff the new one."
            }
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="accent" onClick={() => void save()} isLoading={saving} disabled={saving || code.length < 4}>
                        {isFirst ? "Set code" : "Change code"}
                    </Button>
                </>
            }
        >
            <div className="py-3 space-y-3">
                <PinInput
                    value={code}
                    onChange={(v) => {
                        setCode(v);
                        setError(null);
                    }}
                    autoFocus
                    invalid={!!error}
                    ariaLabel="Redeem code"
                />
                {error ? (
                    <p className="text-sm text-red-600 text-center" role="alert">
                        {error}
                    </p>
                ) : (
                    <p className="text-xs text-neutral-500 text-center">
                        Avoid easy codes like 1234, 0000 or 1111 — they're rejected.
                    </p>
                )}
            </div>
        </Modal>
    );
}

function PlaceCard({ place, canManage, onChange }: { place: HubPlace; canManage: boolean; onChange: () => void }) {
    const { businessId } = useBusiness();
    const [revealed, setRevealed] = useState(false);
    const code = useQuery({
        queryKey: bkeys.redeemCode(businessId, place.marker_id),
        queryFn: () => businessService.getRedeemCode(businessId, place.marker_id),
        enabled: place.code_set && revealed,
        staleTime: 5 * 60_000,
    });

    return (
        <article className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold text-neutral-900 truncate">{place.title ?? "Untitled place"}</h3>
                    <div className="mt-1">
                        {place.code_set ? (
                            <Pill className="bg-green-50 text-green-700 border-green-200">
                                <ShieldCheck className="w-3 h-3" /> Code set
                            </Pill>
                        ) : (
                            <Pill className="bg-amber-50 text-amber-700 border-amber-200">Code not set</Pill>
                        )}
                    </div>
                </div>
            </div>

            {place.code_set ? (
                <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 flex items-center gap-4">
                    <div className="flex gap-2" aria-live="polite">
                        {(revealed && code.data?.code ? code.data.code : "••••").split("").map((ch, i) => (
                            <span
                                key={i}
                                className="w-10 h-12 rounded-lg bg-white border border-neutral-300 flex items-center justify-center text-xl font-bold text-primary-900 tabular-nums"
                            >
                                {revealed && code.isLoading ? "·" : ch}
                            </span>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setRevealed((r) => !r)}
                        className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
                        aria-pressed={revealed}
                    >
                        {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {revealed ? "Hide" : "Show"}
                    </button>
                </div>
            ) : (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-3">
                    Creators can't redeem collabs or check-in offers here until you set a code.
                </p>
            )}
            {revealed && code.isError && <p className="text-sm text-red-600">{errorMessage(code.error, "Couldn't load the code")}</p>}
            {revealed && code.data?.set_at && (
                <p className="text-xs text-neutral-500 -mt-2">Last changed {formatDate(code.data.set_at)}</p>
            )}

            {canManage ? (
                <Button variant={place.code_set ? "outline" : "accent"} size="sm" onClick={onChange} className="self-start">
                    {place.code_set ? "Change code" : "Set code"}
                </Button>
            ) : (
                <p className="text-xs text-neutral-500">Only managers and owners can change the code.</p>
            )}
        </article>
    );
}

export function LocationsPage() {
    const { canManage } = useBusiness();
    const hub = useHub();
    const [editing, setEditing] = useState<HubPlace | null>(null);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Locations & redeem codes"
                description="Each place has its own 4-digit code. Staff type it on the creator's phone (“Ask the staff to enter the code”) to redeem a collab or offer."
            />

            <div className="rounded-2xl bg-primary-900 text-white p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { n: "1", t: "Creator checks in", d: "At your place, in the SeekKrr app." },
                    { n: "2", t: "Staff enters your code", d: "On the creator's phone — keep it off the counter." },
                    { n: "3", t: "Redeemed", d: "Slot used, the brief starts, and you're notified." },
                ].map((s) => (
                    <div key={s.n} className="flex gap-3">
                        <span className="w-8 h-8 rounded-full bg-highlight text-primary-900 font-bold flex items-center justify-center shrink-0">
                            {s.n}
                        </span>
                        <div>
                            <p className="font-semibold">{s.t}</p>
                            <p className="text-sm text-primary-100">{s.d}</p>
                        </div>
                    </div>
                ))}
            </div>

            {hub.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton height={200} />
                    <Skeleton height={200} />
                </div>
            ) : hub.isError ? (
                <ErrorState message="We couldn't load your places." onRetry={() => void hub.refetch()} />
            ) : (hub.data?.places ?? []).length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200">
                    <EmptyState
                        icon={<MapPin className="w-7 h-7" />}
                        title="No place linked yet"
                        description="Your business needs a place on the SeekKrr map. Email partners@seekkrr.com with your Google Maps link and we'll connect it."
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(hub.data?.places ?? []).map((p) => (
                        <PlaceCard key={p.marker_id} place={p} canManage={canManage} onChange={() => setEditing(p)} />
                    ))}
                </div>
            )}

            <p className="text-xs text-neutral-500">
                Too many wrong attempts lock redemption for a while and we'll alert you — consider changing the code if that
                happens. Staff can also scan the creator's QR in the SeekKrr app when the creator has no network.
            </p>

            {editing && <ChangeCodeDialog place={editing} isFirst={!editing.code_set} onClose={() => setEditing(null)} />}
        </div>
    );
}

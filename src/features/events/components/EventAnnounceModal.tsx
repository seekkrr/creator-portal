import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Megaphone, Upload, Loader2 } from "lucide-react";
import { Card, Button, Input, Textarea } from "@components/ui";
import { eventService } from "@services/event.service";
import { cloudinaryService } from "@services/cloudinary.service";

interface EventAnnounceModalProps {
    eventId: string;
    eventTitle: string;
    onClose: () => void;
}

/** Send a push announcement to everyone who RSVP'd to an event. */
export function EventAnnounceModal({ eventId, eventTitle, onClose }: EventAnnounceModalProps) {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [longBody, setLongBody] = useState("");
    const [image, setImage] = useState("");
    const [imgUploading, setImgUploading] = useState(false);

    const uploadImage = async (file: File) => {
        setImgUploading(true);
        try {
            const res = await cloudinaryService.uploadImage(file, { category: "event" });
            setImage(res.secure_url);
        } catch {
            toast.error("Image upload failed");
        } finally {
            setImgUploading(false);
        }
    };

    const mutation = useMutation({
        mutationFn: () => eventService.announce(eventId, title.trim(), body.trim(), {
            image: image || undefined,
            long_body: longBody.trim() || undefined,
        }),
    });

    const send = async () => {
        if (!title.trim() || !body.trim()) return;
        try {
            const res = await mutation.mutateAsync();
            toast.success(
                res.sent > 0
                    ? `Sent to ${res.sent} device(s) across ${res.recipients} attendee(s).`
                    : `Queued for ${res.recipients} attendee(s). (Push delivery activates once SNS is configured.)`
            );
            onClose();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to send announcement");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-md shadow-2xl border-neutral-200 overflow-hidden animate-scale-up">
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
                    <div className="flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-primary-600" />
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900">Announce</h2>
                            <p className="text-xs text-neutral-500">{eventTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
                        <Input value={title} maxLength={120}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                            placeholder="e.g. Gates open early today!" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Message</label>
                        <Textarea value={body} rows={3} maxLength={500}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
                            placeholder="Short line shown in the notification" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Longer description <span className="text-neutral-400 font-normal">(optional)</span></label>
                        <Textarea value={longBody} rows={3} maxLength={2000}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLongBody(e.target.value)}
                            placeholder="Shown when the notification is expanded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Image <span className="text-neutral-400 font-normal">(optional — defaults to the event cover)</span></label>
                        {image ? (
                            <div className="relative w-full rounded-lg overflow-hidden border border-neutral-200">
                                <img src={image} alt="" className="w-full aspect-video object-cover" />
                                <button type="button" onClick={() => setImage("")}
                                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-neutral-600 hover:text-red-600 shadow" aria-label="Remove image">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 hover:bg-white cursor-pointer text-neutral-500">
                                {imgUploading ? <Loader2 className="w-6 h-6 animate-spin text-neutral-700" /> : <><Upload className="w-6 h-6 mb-1 text-neutral-400" /><span className="text-xs font-medium">Click to upload (PNG/JPG/WebP)</span></>}
                                <input type="file" accept="image/*" className="hidden" disabled={imgUploading}
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f); e.target.value = ""; }} />
                            </label>
                        )}
                    </div>
                    <div className="flex gap-3 pt-1">
                        <Button variant="ghost" fullWidth onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
                        <Button variant="primary" fullWidth onClick={send}
                            isLoading={mutation.isPending}
                            disabled={mutation.isPending || !title.trim() || !body.trim()}>
                            Send Announcement
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

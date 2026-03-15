import { useEffect, useRef, useState } from "react";
import { X, PlayCircle, HelpCircle } from "lucide-react";

/**
 * Applies Cloudinary progressive delivery optimisations to a video URL.
 * Inserts /q_auto/f_auto/ before the version segment (v<digits>).
 * Falls back to the original URL if the pattern doesn't match.
 *
 * Per Cloudinary best-practices docs: for short-form walkthrough videos,
 * progressive delivery with auto-quality + auto-format is optimal.
 * Adaptive bitrate streaming is only recommended for long-form/live content.
 */
function optimiseCloudinaryUrl(url: string): string {
    return url.replace(
        /(\/video\/upload\/)(v\d+\/)/,
        "$1q_auto/f_auto/$2"
    );
}

interface VideoWalkthroughModalProps {
    videoUrl: string;
    title: string;
    isOpen: boolean;
    onClose: () => void;
}

export function VideoWalkthroughModal({
    videoUrl,
    title,
    isOpen,
    onClose,
}: VideoWalkthroughModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    /**
     * Lazy src – only assigned the first time the modal opens.
     * This prevents ANY network request to Cloudinary until the user
     * explicitly clicks the help button.
     */
    const [mountedUrl, setMountedUrl] = useState<string>("");

    useEffect(() => {
        if (isOpen && !mountedUrl) {
            // First open: compute optimised URL and give it to the player.
            setMountedUrl(optimiseCloudinaryUrl(videoUrl));
        }
    }, [isOpen, mountedUrl, videoUrl]);

    // Close on ESC
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    // Pause & reset video when modal closes
    useEffect(() => {
        if (!isOpen && videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    }, [isOpen]);

    // Prevent scroll on the body while open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="video-modal-backdrop"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className="video-modal-card">
                {/* Header */}
                <div className="video-modal-header">
                    <div className="video-modal-title-row">
                        <div className="video-modal-icon">
                            <PlayCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="video-modal-eyebrow">How-to walkthrough</p>
                            <h2 className="video-modal-title">{title}</h2>
                        </div>
                    </div>
                    <button
                        className="video-modal-close"
                        onClick={onClose}
                        aria-label="Close walkthrough video"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Video */}
                <div className="video-modal-body">
                    <video
                        ref={videoRef}
                        className="video-modal-player"
                        controls
                        autoPlay
                        playsInline
                        preload="none"
                    >
                        {/*
                         * mountedUrl is only set after the first click –
                         * no Cloudinary request happens until then.
                         * Cloudinary auto-selects WebM/MP4/etc via f_auto.
                         */}
                        {mountedUrl && <source src={mountedUrl} />}
                        {/* Original MP4 fallback */}
                        {mountedUrl && <source src={videoUrl} type="video/mp4" />}
                        Your browser does not support HTML5 video.
                    </video>
                </div>

                {/* Footer hint */}
                <div className="video-modal-footer">
                    <span>Press <kbd>Esc</kbd> or click outside to close</span>
                </div>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// Trigger button – a small circular help icon placed inline in each
// step's heading row.
// ------------------------------------------------------------------
interface VideoHelpButtonProps {
    onClick: () => void;
    label?: string;
}

export function VideoHelpButton({ onClick, label = "Watch walkthrough" }: VideoHelpButtonProps) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="video-help-btn"
            aria-label={label}
            title={label}
        >
            <HelpCircle className="w-4 h-4" />
            <span
                className={`video-help-label ${hovered ? "video-help-label--visible" : ""}`}
                aria-hidden="true"
            >
                {label}
            </span>
        </button>
    );
}

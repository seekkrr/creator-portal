import { Link } from "react-router-dom";
import { useAuthStore } from "@store/auth.store";
import { useCreatorStats } from "@hooks/useCreatorStats";
import { MapPin, Compass, Trophy, Clock, Play, BadgeCheck, AlertTriangle, BookOpen, Navigation, FileText } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { WALKTHROUGH_VIDEOS } from "@config/walkthroughVideos";
import { Button } from "@components/ui";
import { markerService } from "@services/marker.service";
import { narrativeService } from "@services/narrative.service";
import { questService } from "@services/quest.service";

// ... (StackedHeroCards remains same)

function StackedHeroCards() {
    const [activeIndex, setActiveIndex] = useState(0);
    const cards = [
        { id: 1, src: "/hiker.png", alt: "Hiker looking at scenic mountains", color: "bg-neutral-100" },
        { id: 2, src: "/cafe.png", alt: "Cozy cafe table setting", color: "bg-primary-50" },
        { id: 3, src: "/dancing.png", alt: "Group of people dancing outdoors", color: "bg-green-50" },
        { id: 4, src: "/old_man.png", alt: "Portrait of an elderly man with traditional headwear", color: "bg-amber-50" },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % cards.length);
        }, 3000);

        return () => clearInterval(interval);
    }, [cards.length]);

    return (
        <div className="relative w-full h-full perspective-1000">
            {cards.map((card, index) => {
                const position = (index - activeIndex + cards.length) % cards.length;

                const isExiting = position === cards.length - 1;
                const isVisible = position <= 2 || isExiting;

                if (!isVisible) return null;

                let zIndex = 30 - position * 10;
                let scale = 1 - position * 0.05;
                let translateX = position * 20;
                let rotate = position * 5;
                let opacity = 1 - position * 0.15;

                if (isExiting) {
                    zIndex = 40;
                    scale = 1.1;
                    translateX = 0;
                    rotate = 0;
                    opacity = 0;
                }

                return (
                    <div
                        key={card.id}
                        className={`absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-1000 ease-in-out border-4 border-white ${card.color}`}
                        style={{
                            zIndex,
                            transform: `translateX(${translateX}px) rotate(${rotate}deg) scale(${scale})`,
                            opacity,
                        }}
                    >
                        <img
                            src={card.src}
                            alt={card.alt}
                            loading="lazy"
                            className="w-full h-full object-cover"
                        />
                        {position > 0 && !isExiting && (
                            <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------
   Lazy-loaded video player for the How to Create section.
   Shows a Cloudinary thumbnail immediately; only fetches the video
   when the user explicitly clicks the play button.
   ------------------------------------------------------------------ */

/** Build an optimised Cloudinary URL by inserting transform segments. */
function buildCloudinaryUrl(base: string, transforms: string): string {
    return base.replace(/(\/video\/upload\/)(v\d+\/)/, `$1${transforms}$2`);
}

function HowToVideoPlayer() {
    const [playing, setPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    // Thumbnail: first frame, auto-format image, 1280px wide
    const thumbnailUrl = buildCloudinaryUrl(
        WALKTHROUGH_VIDEOS.HOW_TO_VIDEO_URL,
        "q_auto/f_auto/so_0/"
    ).replace(/\.mp4$/, ".jpg");
    // Optimised video URL — only computed / used after click
    const videoSrc = buildCloudinaryUrl(WALKTHROUGH_VIDEOS.HOW_TO_VIDEO_URL, "q_auto/f_auto/");

    const handlePlay = () => {
        setPlaying(true);
        // Let the browser paint the video element first, then autoplay
        requestAnimationFrame(() => {
            videoRef.current?.play().catch(() => {/* silent */ });
        });
    };

    return (
        <div className="how-to-video-wrap">
            {!playing ? (
                /* ── Thumbnail state ── */
                <button
                    className="how-to-video-thumb"
                    onClick={handlePlay}
                    aria-label="Play how to create a quest walkthrough"
                >
                    <img
                        src={thumbnailUrl}
                        alt="Quest creation walkthrough thumbnail"
                        loading="lazy"
                        decoding="async"
                        className="how-to-video-img"
                    />
                    {/* Gradient overlay */}
                    <div className="how-to-video-overlay" />
                    {/* Play button */}
                    <div className="how-to-play-btn" aria-hidden="true">
                        <Play className="w-7 h-7 text-white fill-white" />
                    </div>
                    {/* Duration badge */}
                    <span className="how-to-video-badge">Watch demo</span>
                </button>
            ) : (
                /* ── Video state: only rendered after click ── */
                <video
                    ref={videoRef}
                    className="how-to-video-player"
                    controls
                    playsInline
                    preload="none"
                    autoPlay
                >
                    <source src={videoSrc} />
                    <source src={WALKTHROUGH_VIDEOS.HOW_TO_VIDEO_URL} type="video/mp4" />
                </video>
            )}
        </div>
    );
}

// --- Resume Draft Cue ---
// Reads the quest_creation_form sessionStorage key written by CreateQuestPage.
// Returns null when no draft exists (cue is hidden).
interface WizardDraftInfo {
    title: string | null;
    step: number;
    totalSteps: number;
}
function useWizardDraft(): WizardDraftInfo | null {
    const [draft, setDraft] = useState<WizardDraftInfo | null>(null);
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem("quest_creation_form");
            if (!raw) return;
            const parsed = JSON.parse(raw) as { formData?: { title?: string }; currentStep?: number };
            setDraft({
                title: parsed.formData?.title ?? null,
                step: parsed.currentStep ?? 1,
                totalSteps: 6,
            });
        } catch {
            // ignore
        }
    }, []);
    return draft;
}

export function DashboardPage() {
    const { user, creator } = useAuthStore();

    // Headline stats are pulled live from /creators/me/analytics/summary on mount,
    // falling back to the creator profile cached at login.
    const stats = useCreatorStats();
    const isVerified = !!creator?.is_verified;
    // Operational lifecycle. The portal login gate (evaluateCreatorAccess) only lets
    // ACTIVE creators (or staff, where creator is null) in, so the suspended/rejected
    // banners are defensive — they should only ever surface on a stale session.
    const status = creator?.status;
    const isBlocked = status === "suspended" || status === "rejected";

    // Draft resume cue (sessionStorage wizard draft)
    const wizardDraft = useWizardDraft();

    // Content counts — markers, narratives, quests (my own, all statuses).
    // page_size=1 is enough: we only need the total count from the response.
    const { data: markerData } = useQuery({
        queryKey: ["markers", "mine", "dashboard"],
        queryFn: () => markerService.listMarkers({ mine: true, page_size: 1 }),
        staleTime: 60_000,
    });
    const { data: narrativeData } = useQuery({
        queryKey: ["narratives", "mine", "dashboard"],
        queryFn: () => narrativeService.listNarratives({ mine: true, page_size: 1 }),
        staleTime: 60_000,
    });
    const { data: myQuestData } = useQuery({
        queryKey: ["quests", "me", "dashboard"],
        queryFn: () => questService.getMyQuests({ page_size: 1 }),
        staleTime: 60_000,
    });

    const markerCount = markerData?.total ?? 0;
    const narrativeCount = narrativeData?.total ?? 0;
    const myQuestCount = myQuestData?.total ?? 0;
    // "has content" = at least one marker, narrative, or quest exists
    const hasContent = markerCount > 0 || narrativeCount > 0 || myQuestCount > 0;

    return (
        <div className="animate-fade-in font-sans space-y-4 lg:space-y-6">
            {/* Account status banners (defensive — the login gate normally blocks these) */}
            {status === "suspended" && (
                <div className="p-4 rounded-2xl flex items-center gap-4 bg-red-50 text-red-700 border border-red-100">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Account suspended</p>
                        <p className="text-sm opacity-90">
                            Your creator account is suspended. Please contact support to restore access.
                        </p>
                    </div>
                </div>
            )}
            {status === "rejected" && (
                <div className="p-4 rounded-2xl flex items-center gap-4 bg-red-50 text-red-700 border border-red-100">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Application not approved</p>
                        <p className="text-sm opacity-90">
                            Your creator application was not approved, so quest tools are unavailable.
                        </p>
                    </div>
                </div>
            )}

            {/* Verification is a trust BADGE, never a submission blocker. */}
            {!isBlocked && (isVerified ? (
                <div className="p-4 rounded-2xl max-[420px]:hidden flex items-center gap-4 bg-primary-50 text-primary-700 border border-primary-100">
                    <BadgeCheck className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Verified Creator</p>
                        <p className="text-sm opacity-90">
                            Your account is verified — your published quests carry the Verified Creator badge.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-amber-50 text-amber-800 border border-amber-100">
                    <div className="flex items-center gap-4 flex-1">
                        <Clock className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Not yet verified</p>
                            <p className="text-sm opacity-90">
                                You can create and submit quests for review right now. Getting verified just
                                adds a Verified Creator badge to your published quests.
                            </p>
                        </div>
                    </div>
                    <Link to="/creator/profile" className="flex-shrink-0">
                        <button className="px-4 py-2 rounded-full bg-white border border-amber-200 text-amber-800 text-sm font-semibold hover:bg-amber-100 transition-colors whitespace-nowrap cursor-pointer">
                            Get verified
                        </button>
                    </Link>
                </div>
            ))}

            {/* Resume Draft Cue — shown only when a wizard draft exists in sessionStorage */}
            {wizardDraft && (
                <Link to="/creator/quest/create" className="block">
                    <div className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-primary-50 border border-primary-200 hover:border-primary-400 hover:bg-primary-100 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-primary-900 text-sm">
                                    Continue your draft
                                    {wizardDraft.title ? ` — ${wizardDraft.title}` : ""}
                                </p>
                                <p className="text-xs text-primary-700 mt-0.5">
                                    Step {wizardDraft.step} of {wizardDraft.totalSteps} · Pick up where you left off
                                </p>
                            </div>
                        </div>
                        <span className="flex-shrink-0 px-4 py-2 rounded-full bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors whitespace-nowrap">
                            Resume
                        </span>
                    </div>
                </Link>
            )}

            {/* Hero Section */}
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-24 items-center justify-between mt-4">
                <div className="space-y-4 sm:space-y-6 lg:space-y-8 xl:space-y-10 max-w-2xl flex-1">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-display font-bold text-primary-900 leading-tight tracking-tight">
                        Welcome to SeekKrr, {user?.first_name ? `${user.first_name}` : "Creator"}
                    </h1>

                    <div className="space-y-4 lg:space-y-6 text-lg lg:text-xl text-neutral-600 leading-relaxed font-normal max-w-xl">
                        <p className="font-medium">
                            Your stories inspired them. Now, your Quests will lead them!
                        </p>
                        <p>
                            You're already out there discovering the best of India, let's make those footsteps
                            count. Turn your passion for the 'unseen' into immersive journeys that your followers can
                            actually experience.
                        </p>
                    </div>

                    <div className="pt-1 lg:pt-2">
                        <p className="text-lg lg:text-xl font-medium text-neutral-900 mb-3 sm:mb-4 lg:mb-6 xl:mb-8">
                            {hasContent
                                ? "Keep building your journeys"
                                : "What's the wait then, create your first Quest today"}
                        </p>
                        <Link to="/creator/quest/create">
                            <Button variant="accent" size="lg" className="rounded-full text-lg lg:text-xl tracking-wide px-8 py-3 lg:px-10 lg:py-4 hover:scale-105 transition-transform">
                                {hasContent ? "Create Quest" : "Create Quest"}
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="relative h-[300px] w-full max-w-[300px] lg:h-[500px] lg:max-w-[500px] hidden md:block flex-shrink-0 perspective-1000">
                    <StackedHeroCards />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 lg:gap-6">
                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Quests Published</p>
                            <p className="text-3xl font-bold text-neutral-900">{stats.total_quests}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                            <Compass className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Travelers Served</p>
                            <p className="text-3xl font-bold text-neutral-900">{stats.travelers_served}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Total Earnings</p>
                            <p className="text-3xl font-bold text-neutral-900">₹{stats.total_earnings.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                            <Navigation className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Markers</p>
                            <p className="text-3xl font-bold text-neutral-900">{markerCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Narratives</p>
                            <p className="text-3xl font-bold text-neutral-900">{narrativeCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* How to Create a Quest — video first, then steps */}
            <div className="space-y-8">
                <div>
                    <h2 className="text-2xl font-display font-semibold text-primary-900 tracking-tight">
                        How to create a Quest?
                    </h2>
                    <p className="text-neutral-500 mt-1 text-sm">
                        Watch the full walkthrough or follow the steps below.
                    </p>
                </div>

                {/* Video */}
                <HowToVideoPlayer />

                {/* Steps — 6-step flow mirroring the actual wizard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[
                        {
                            n: 1,
                            title: "Add Destination",
                            desc: "Enter the location or region your quest takes place in.",
                        },
                        {
                            n: 2,
                            title: "Add Quest Details",
                            desc: "Give your quest a name, description, theme, and estimated duration.",
                        },
                        {
                            n: 3,
                            title: "Add Markers",
                            desc: "Pin waypoints on the map — these are the stops explorers will visit.",
                        },
                        {
                            n: 4,
                            title: "Add Marker Details",
                            desc: "Fill in \"Things to do\" text and photos for each stop.",
                        },
                        {
                            n: 5,
                            title: "Add Narratives",
                            desc: "Write audio-guided stories that play at each marker during the quest.",
                        },
                        {
                            n: 6,
                            title: "Review & Publish",
                            desc: "Review your quest and submit it for approval to start earning.",
                        },
                    ].map(({ n, title, desc }) => (
                        <div
                            key={n}
                            className="group p-5 bg-white rounded-2xl border border-neutral-100 hover:border-primary-100 hover:shadow-lg transition-all duration-300 flex flex-col gap-3"
                        >
                            <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-base shadow-primary-200 shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                                {n}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-neutral-900 mb-1">{title}</h3>
                                <p className="text-xs text-neutral-500 leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

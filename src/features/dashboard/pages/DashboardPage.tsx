import { Link } from "react-router-dom";
import { useAuthStore } from "@store/auth.store";
import { MapPin, Compass, Trophy, AlertCircle, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { creatorService, CreatorStats } from "@services/creator.service";

// ... (StackedHeroCards remains same)

function StackedHeroCards() {
    const [activeIndex, setActiveIndex] = useState(0);
    const cards = [
        { id: 1, src: "/hiker.png", alt: "Hiker looking at scenic mountains", color: "bg-neutral-100" },
        { id: 2, src: "/cafe.png", alt: "Cozy cafe table setting", color: "bg-indigo-50" },
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

export function DashboardPage() {
    const { user, creator } = useAuthStore();
    const [stats, setStats] = useState<CreatorStats | null>(null);

    useEffect(() => {
        async function fetchStats() {
            if (user?._id) {
                try {
                    const data = await creatorService.getStats(user._id);
                    setStats(data.stats);
                } catch (error) {
                    console.error("Failed to fetch dashboard stats:", error);
                }
            }
        }
        fetchStats();
    }, [user?._id]);

    const isRejected = creator?.status === "rejected";
    const isApproved = creator?.status === "approved";

    return (
        <div className="animate-fade-in font-sans space-y-12 lg:space-y-24">
            {/* Approval Status Banner */}
            {!isApproved && (
                <div className={`p-4 rounded-2xl flex items-center gap-4 ${isRejected ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                    {isRejected ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5 animate-pulse" />}
                    <div>
                        <p className="font-semibold">
                            {isRejected ? "Application Rejected" : "Verification in Progress"}
                        </p>
                        <p className="text-sm opacity-90">
                            {isRejected
                                ? "Your creator application was not approved. You can still create draft quests, but cannot submit them for review."
                                : "We're currently reviewing your creator application. You can start building your quests as drafts while you wait!"}
                        </p>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-24 items-center justify-between mt-4">
                <div className="space-y-6 lg:space-y-10 max-w-2xl flex-1">
                    <h1 className="text-4xl lg:text-7xl font-light text-neutral-900 leading-tight tracking-tight">
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

                    <div className="pt-2 lg:pt-4">
                        <p className="text-lg lg:text-xl font-medium text-neutral-900 mb-4 lg:mb-8">
                            What's the wait then, create your first Quest today
                        </p>
                        <Link to="/creator/quest/create">
                            <button className="px-8 py-3 lg:px-10 lg:py-4 bg-white border-2 border-neutral-900 text-neutral-900 font-normal rounded-full hover:bg-neutral-900 hover:text-white transition-all transform hover:scale-105 duration-200 text-lg lg:text-xl tracking-wide cursor-pointer">
                                Create Quest
                            </button>
                        </Link>
                    </div>
                </div>

                <div className="relative h-[300px] w-full max-w-[300px] lg:h-[500px] lg:max-w-[500px] hidden md:block flex-shrink-0 perspective-1000">
                    <StackedHeroCards />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Quests Published</p>
                            <p className="text-3xl font-bold text-neutral-900">{stats?.total_quests ?? 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                            <Compass className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Impressions</p>
                            <p className="text-3xl font-bold text-neutral-900">{stats?.impressions ?? 0}</p>
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
                            <p className="text-3xl font-bold text-neutral-900">₹{stats?.total_earnings?.toLocaleString() ?? 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Getting Started - Modernized */}
            <div>
                <h2 className="text-2xl font-medium text-neutral-900 mb-6 tracking-tight">
                    How to create a Quest ?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group p-6 bg-white rounded-3xl border border-neutral-100 hover:border-indigo-100 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-start gap-5">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-indigo-200 shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                                1
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                                    Add Destination or Content Link
                                </h3>
                                <p className="text-sm text-neutral-600 leading-relaxed">
                                    Click Create Quest and enter the location. You can also add a link to your content
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="group p-6 bg-white rounded-3xl border border-neutral-100 hover:border-indigo-100 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-start gap-5">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-indigo-200 shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                                2
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                                    Add Quest Details
                                </h3>
                                <p className="text-sm text-neutral-600 leading-relaxed">
                                    Add the name of the quest, description and duration of the quest
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="group p-6 bg-white rounded-3xl border border-neutral-100 hover:border-indigo-100 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-start gap-5">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-indigo-200 shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                                3
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                                    Add Locations
                                </h3>
                                <p className="text-sm text-neutral-600 leading-relaxed">
                                    Guide travelers on how to reach and
                                    what to expect by pinning locations on the map
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="group p-6 bg-white rounded-3xl border border-neutral-100 hover:border-indigo-100 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-start gap-5">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-indigo-200 shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                                4
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                                    Earn Rewards
                                </h3>
                                <p className="text-sm text-neutral-600 leading-relaxed">
                                    Get recognized and earn commission as more explorers complete your quests
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

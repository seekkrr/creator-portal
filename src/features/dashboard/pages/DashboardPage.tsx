import { Link } from "react-router-dom";
import { useAuthStore } from "@store/auth.store";
import { MapPin, Compass, Trophy } from "lucide-react";
import { useState, useEffect } from "react";

function StackedHeroCards() {
    const [activeIndex, setActiveIndex] = useState(0);
    const cards = [
        { id: 1, src: "/hiker.png", alt: "Adventure 1", color: "bg-neutral-100" },
        { id: 2, src: "/cafe.png", alt: "Adventure 2", color: "bg-indigo-50" },
        { id: 3, src: "/dancing.png", alt: "Adventure 3", color: "bg-green-50" },
        { id: 4, src: "/old_man.png", alt: "Adventure 4", color: "bg-amber-50" },
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

                // Active Card (Front) -> Position 0
                // Next Cards -> Position 1, 2
                // Exiting Card (Previously Front) -> Position 3 (cards.length - 1)

                const isExiting = position === cards.length - 1;
                const isVisible = position <= 2 || isExiting;

                if (!isVisible) return null;

                let zIndex = 30 - position * 10;
                let scale = 1 - position * 0.05;
                let translateX = position * 20;
                let rotate = position * 5;
                let opacity = 1 - position * 0.15;

                // Ghost Exit Animation for the card leaving the front
                if (isExiting) {
                    zIndex = 40; // Stay on top
                    scale = 1.1; // Expand slightly
                    translateX = 0;
                    rotate = 0;
                    opacity = 0; // Fade out completely
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
    const { user } = useAuthStore();

    return (
        <div className="animate-fade-in font-sans space-y-12 lg:space-y-32">
            {/* Hero Section */}
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-24 items-center justify-between mt-4 lg:mt-8">
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

            {/* Quick Stats - Modernized */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all duration-300 group flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm flex-shrink-0">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-md font-medium text-neutral-500">Quests Created</p>
                        <p className="text-2xl font-bold text-neutral-900 mt-1">0</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-lg hover:border-green-100 transition-all duration-300 group flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:scale-110 group-hover:bg-green-600 group-hover:text-white transition-all duration-300 shadow-sm flex-shrink-0">
                        <Compass className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-md font-medium text-neutral-500">Active Explorers</p>
                        <p className="text-2xl font-bold text-neutral-900 mt-1">0</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-lg hover:border-amber-100 transition-all duration-300 group flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-sm flex-shrink-0">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-md font-medium text-neutral-500">Completions</p>
                        <p className="text-2xl font-bold text-neutral-900 mt-1">0</p>
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

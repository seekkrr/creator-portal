import { Link } from "react-router-dom";
import { useAuthStore } from "@store/auth.store";
import { Button, Card } from "@components/ui";
import { MapPin, Plus, Compass, Trophy } from "lucide-react";

export function DashboardPage() {
    const { user, creator } = useAuthStore();

    return (
        <div className="animate-fade-in">
            {/* Welcome Hero */}
            <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-8 md:p-12 mb-8 text-white">
                {/* Decorative background */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <h1 className="text-3xl md:text-4xl font-bold mb-3">
                            Welcome back, {user?.first_name ?? "Creator"}! 👋
                        </h1>
                        <p className="text-lg text-white/80 max-w-xl">
                            Ready to create your next adventure? Design immersive quests that
                            inspire explorers to discover amazing places.
                        </p>
                        {creator && !creator.is_verified && (
                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-full text-sm">
                                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                                Verification pending
                            </div>
                        )}
                    </div>

                    <Link to="/creator/quest/create">
                        <Button
                            size="lg"
                            className="bg-white text-indigo-700 hover:bg-neutral-100 shadow-lg"
                            leftIcon={<Plus className="w-5 h-5" />}
                        >
                            Create Quest
                        </Button>
                    </Link>
                </div>

                {/* Hero Image Placeholder */}
                <div className="absolute right-8 bottom-0 hidden lg:block">
                    <div className="relative w-64 h-48 bg-white/10 rounded-t-2xl backdrop-blur">
                        <img
                            src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop"
                            alt="Adventure landscape"
                            className="w-full h-full object-cover rounded-t-2xl opacity-80"
                            loading="lazy"
                        />
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card hover className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-neutral-900">0</p>
                        <p className="text-sm text-neutral-500">Quests Created</p>
                    </div>
                </Card>

                <Card hover className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                        <Compass className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-neutral-900">0</p>
                        <p className="text-sm text-neutral-500">Active Explorers</p>
                    </div>
                </Card>

                <Card hover className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-neutral-900">0</p>
                        <p className="text-sm text-neutral-500">Completions</p>
                    </div>
                </Card>
            </div>

            {/* Getting Started Section */}
            <Card padding="lg">
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">
                    Getting Started
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-medium">
                            1
                        </div>
                        <div>
                            <h3 className="font-medium text-neutral-900 mb-1">
                                Create Your First Quest
                            </h3>
                            <p className="text-sm text-neutral-600">
                                Design an adventure with locations, challenges, and rewards for explorers to discover.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-medium">
                            2
                        </div>
                        <div>
                            <h3 className="font-medium text-neutral-900 mb-1">
                                Add Waypoints
                            </h3>
                            <p className="text-sm text-neutral-600">
                                Mark interesting locations on the map that explorers will visit during their journey.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-medium">
                            3
                        </div>
                        <div>
                            <h3 className="font-medium text-neutral-900 mb-1">
                                Publish & Share
                            </h3>
                            <p className="text-sm text-neutral-600">
                                Once your quest is ready, publish it for adventurers around the world to enjoy.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-medium">
                            4
                        </div>
                        <div>
                            <h3 className="font-medium text-neutral-900 mb-1">
                                Earn Rewards
                            </h3>
                            <p className="text-sm text-neutral-600">
                                Get recognized and earn rewards as more explorers complete your quests.
                            </p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

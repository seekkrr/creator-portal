import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@store/auth.store";
import { Button } from "@components/ui";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export function DashboardLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate("/creator/login");
    };

    return (
        <div className="min-h-screen bg-neutral-50">
            {/* Header */}
            <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/creator/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">S</span>
                            </div>
                            <span className="text-xl font-bold text-neutral-900">SeekKrr</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-6">
                            <Link
                                to="/creator/dashboard"
                                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                            >
                                Dashboard
                            </Link>
                            <Link
                                to="/creator/quest/create"
                                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                            >
                                Create Quest
                            </Link>
                        </nav>

                        {/* User Menu */}
                        <div className="hidden md:flex items-center gap-4">
                            {user && (
                                <span className="text-sm text-neutral-600">
                                    {user.first_name} {user.last_name}
                                </span>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                leftIcon={<LogOut className="w-4 h-4" />}
                            >
                                Logout
                            </Button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 text-neutral-600 hover:text-neutral-900"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                        >
                            {isMobileMenuOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <Menu className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-neutral-200 bg-white">
                        <div className="px-4 py-4 space-y-3">
                            <Link
                                to="/creator/dashboard"
                                className="block px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Dashboard
                            </Link>
                            <Link
                                to="/creator/quest/create"
                                className="block px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Create Quest
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-neutral-200 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-neutral-500">
                            © {new Date().getFullYear()} SeekKrr. All rights reserved.
                        </p>
                        <div className="flex gap-6">
                            <a href="#" className="text-sm text-neutral-500 hover:text-neutral-700">
                                Privacy Policy
                            </a>
                            <a href="#" className="text-sm text-neutral-500 hover:text-neutral-700">
                                Terms of Service
                            </a>
                            <a href="#" className="text-sm text-neutral-500 hover:text-neutral-700">
                                Contact Us
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

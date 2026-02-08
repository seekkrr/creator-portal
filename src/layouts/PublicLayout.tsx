import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@store/auth.store";
import { Footer } from "@components/ui/Footer";
import { Button } from "@components/ui";

export function PublicLayout() {
    const { isAuthenticated } = useAuthStore();
    const location = useLocation();
    const isLoginPage = location.pathname === "/creator/login";

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
            <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <Link to={isAuthenticated ? "/creator/dashboard" : "/creator/login"} className="flex items-center gap-2">
                            <img src="/seekkrr-logo.svg" alt="SeekKrr" className="h-8" />
                        </Link>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            {!isLoginPage && (
                                <Link to={isAuthenticated ? "/creator/dashboard" : "/creator/login"}>
                                    <Button variant="outline" size="sm">
                                        {isAuthenticated ? "Go to Dashboard" : "Login"}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow">
                <Outlet />
            </main>

            <Footer />
        </div>
    );
}

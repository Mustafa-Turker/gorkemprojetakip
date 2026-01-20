"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, LayoutDashboard, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
    { href: "/", label: "Cost Metrics" },
    { href: "/received", label: "Received Amounts" },
    { href: "/balances", label: "Balances" },
    { href: "/study", label: "Study" },
    { href: "/issues", label: "Issues" },
];

export default function NavHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [username, setUsername] = useState<string | null>(null);

    // Get username from cookie on mount
    useEffect(() => {
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
        if (authCookie) {
            setUsername(decodeURIComponent(authCookie.split('=')[1]));
        }
    }, []);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.refresh(); // Refresh to trigger middleware
        window.location.href = "/login";
    };

    // For sliding indicator animation
    const navContainerRef = useRef<HTMLDivElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
    const buttonRefs = useRef<(HTMLAnchorElement | null)[]>([]);

    // Update indicator position when pathname changes
    useEffect(() => {
        const activeIndex = NAV_ITEMS.findIndex(item => item.href === pathname);
        const activeButton = buttonRefs.current[activeIndex];
        const container = navContainerRef.current;

        if (activeButton && container) {
            const containerRect = container.getBoundingClientRect();
            const buttonRect = activeButton.getBoundingClientRect();

            setIndicatorStyle({
                left: buttonRect.left - containerRect.left,
                width: buttonRect.width,
            });
        }
    }, [pathname]);

    // Also update on mount and resize
    useEffect(() => {
        const updateIndicator = () => {
            const activeIndex = NAV_ITEMS.findIndex(item => item.href === pathname);
            const activeButton = buttonRefs.current[activeIndex];
            const container = navContainerRef.current;

            if (activeButton && container) {
                const containerRect = container.getBoundingClientRect();
                const buttonRect = activeButton.getBoundingClientRect();

                setIndicatorStyle({
                    left: buttonRect.left - containerRect.left,
                    width: buttonRect.width,
                });
            }
        };

        // Initial update
        updateIndicator();

        // Update on resize
        window.addEventListener('resize', updateIndicator);
        return () => window.removeEventListener('resize', updateIndicator);
    }, [pathname]);

    // Don't show header on login page
    if (pathname === "/login") return null;

    return (
        <header className="sticky top-0 z-50 w-full">
            {/* Premium light background with subtle shadow */}
            <div className="absolute inset-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-sm" />

            <nav className="relative max-w-[1600px] mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo / Brand - Premium styling */}
                    <div className="flex items-center gap-10">
                        <Link href="/" className="flex items-center space-x-3 group min-w-fit">
                            <div className="relative">
                                {/* Outer glow ring */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-xl blur-md group-hover:blur-lg transition-all duration-500" />
                                {/* Icon container */}
                                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 group-hover:scale-105 transition-all duration-300">
                                    <LayoutDashboard className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                    Gorkem
                                    <span className="text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text ml-1">
                                        Dashboard
                                    </span>
                                </h1>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 -mt-0.5 tracking-wide font-medium">
                                    Project Cost Management
                                </p>
                            </div>
                        </Link>

                        {/* Desktop Navigation - Premium pill style with sliding indicator */}
                        <div className="hidden md:flex items-center">
                            <div
                                ref={navContainerRef}
                                className="relative flex items-center bg-zinc-100/80 dark:bg-zinc-800/50 rounded-full p-1 shadow-inner"
                            >
                                {/* Sliding indicator */}
                                <div
                                    className="absolute top-1 bottom-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-full shadow-lg shadow-indigo-500/30 transition-all duration-300 ease-out"
                                    style={{
                                        left: `${indicatorStyle.left}px`,
                                        width: `${indicatorStyle.width}px`,
                                        opacity: indicatorStyle.width ? 1 : 0
                                    }}
                                />

                                {NAV_ITEMS.map((item, index) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            ref={(el) => { buttonRefs.current[index] = el; }}
                                            className={`relative px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-full z-10 ${isActive
                                                ? "text-white"
                                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                                }`}
                                        >
                                            <span className="relative whitespace-nowrap">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* User Profile & Logout - Desktop */}
                    <div className="hidden md:flex items-center gap-4">
                        {username && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                <div className="p-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                                    <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 pr-1 capitalize">
                                    {username}
                                </span>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            className="text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden relative p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all duration-200"
                    >
                        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Mobile Navigation - Premium card style */}
                {mobileMenuOpen && (
                    <div className="md:hidden absolute left-4 right-4 top-full mt-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl shadow-zinc-900/10 dark:shadow-black/30 border border-zinc-200 dark:border-zinc-800 overflow-hidden z-20">
                        <div className="p-2 space-y-1">
                            {NAV_ITEMS.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`block px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${isActive
                                            ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                                            }`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}

                            {/* Mobile User Section */}
                            <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800">
                                {username && (
                                    <div className="px-4 py-3 flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                                            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Signed in as</p>
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white capitalize">{username}</p>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}

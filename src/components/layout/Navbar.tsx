/**
 * Navigation bar component with section detection and switching
 */

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { UserIcon, LogInIcon } from "@/components/icons";

const skillsNavItems = [
  { href: "/skills/drill", label: "Drill" },
  { href: "/skills/analytics", label: "Analytics" },
  { href: "/skills/leaderboard", label: "Leaderboard" },
];

const papersNavItems = [
  { href: "/papers/roadmap", label: "Roadmap" },
  { href: "/papers/library", label: "Library" },
  { href: "/papers/drill", label: "Drill" },
  { href: "/papers/analytics", label: "Analytics" },
];

const questionsNavItems = [
  { href: "/questions/bank", label: "Bank" },
  { href: "/questions/library", label: "Library" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [activePress, setActivePress] = useState<string | null>(null);
  const session = useSupabaseSession();
  const supabase = useSupabaseClient();

  const currentSection =
    pathname.startsWith("/skills") ? "skills" 
    : pathname.startsWith("/papers") ? "papers" 
    : pathname.startsWith("/questions") ? "questions"
    : "home";

  const currentNavItems = 
    currentSection === "skills" ? skillsNavItems 
    : currentSection === "papers" ? papersNavItems 
    : currentSection === "questions" ? questionsNavItems
    : [];

  useEffect(() => {
    const allRoutes = [
      "/",
      "/skills/drill",
      "/skills/analytics",
      "/papers/roadmap",
      "/papers/library",
      "/papers/drill",
      "/papers/analytics",
      "/questions/bank",
      "/questions/library",
    ];

    allRoutes.forEach((route, index) => {
      setTimeout(() => router.prefetch(route), index * 5);
    });
  }, [router]);

  const handleMouseDown = useCallback(
    (href: string) => {
      setActivePress(href);
      router.prefetch(href);
    },
    [router]
  );

  const handleMouseEnter = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router]
  );

  const handleMouseUp = useCallback(() => {
    setTimeout(() => setActivePress(null), 120);
  }, []);

  const loginHref = useMemo(() => {
    // Default to /papers/library if on home page or login page
    const redirectTo = pathname && pathname !== "/login" && pathname !== "/" ? pathname : "/papers/library";
    return `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="interaction-scale">
              <span className="text-sm font-semibold uppercase tracking-wider text-white/90 transition-colors duration-fast ease-signature hover:text-white">
                ChanAcademy
              </span>
            </Link>

            <div className="flex items-center space-x-3">
              <Link
                href="/skills/drill"
                className={cn(
                  "text-sm font-semibold uppercase tracking-wider transition-colors duration-fast ease-signature",
                  currentSection === "skills" ? "text-primary" : "text-white/50 hover:text-white/80"
                )}
              >
                Mental Maths
              </Link>
              <span className="text-sm text-white/30">/</span>
              <Link
                href="/papers/library"
                className={cn(
                  "text-sm font-semibold uppercase tracking-wider transition-colors duration-fast ease-signature",
                  currentSection === "papers" ? "text-[#5B8D94]" : "text-white/50 hover:text-white/80"
                )}
              >
                Past Papers
              </Link>
              <span className="text-sm text-white/30">/</span>
              <Link
                href="/questions/bank"
                className={cn(
                  "text-sm font-semibold uppercase tracking-wider transition-colors duration-fast ease-signature",
                  pathname.startsWith("/questions") ? "text-interview" : "text-white/50 hover:text-white/80"
                )}
              >
                Question Bank
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {currentSection !== "home" && (
              <div className="flex items-center space-x-2">
                {currentNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const isPressed = activePress === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onMouseEnter={() => handleMouseEnter(item.href)}
                      onMouseDown={() => handleMouseDown(item.href)}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all duration-instant ease-signature will-change-transform",
                        "active:scale-[0.97]",
                        isActive
                          ? currentSection === "skills"
                            ? "bg-primary/10 text-primary"
                            : currentSection === "papers"
                            ? "bg-[#5B8D94]/10 text-[#5B8D94]"
                            : "bg-interview/10 text-interview"
                          : "text-white/60 hover:text-white/90 hover:bg-white/5",
                        isPressed && !isActive && "bg-[#121418] scale-[0.97]"
                      )}
                      style={{
                        transform: isPressed ? "scale(0.97)" : undefined,
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="flex items-center">
              {session?.user ? (
                <Link
                  href="/profile"
                  className={cn(
                    "relative p-2 rounded-lg transition-all duration-fast ease-signature interaction-scale",
                    pathname === "/profile"
                      ? "bg-primary/10"
                      : "hover:bg-white/5"
                  )}
                >
                  <UserIcon 
                    size="md" 
                    className={cn(
                      pathname === "/profile" ? "text-primary" : "text-white/70 hover:text-white/90"
                    )}
                  />
                  {/* Checkmark badge indicator */}
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                    <svg 
                      viewBox="0 0 12 12" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-2.5 h-2.5"
                    >
                      <path 
                        d="M2.5 6L5 8.5L9.5 3.5" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="text-neutral-900"
                      />
                    </svg>
                  </div>
                </Link>
              ) : (
                <Link
                  href={loginHref}
                  className="p-2 rounded-lg transition-all duration-fast ease-signature hover:bg-white/5 interaction-scale"
                >
                  <LogInIcon size="md" className="text-white/70 hover:text-white/90" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}




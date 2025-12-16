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

const trainNavItems = [
  { href: "/train/drill", label: "Drill" },
  { href: "/train/analytics", label: "Analytics" },
];

const papersNavItems = [
  { href: "/papers/plan", label: "Plan" },
  { href: "/papers/drill", label: "Drill" },
  { href: "/papers/analytics", label: "Analytics" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [activePress, setActivePress] = useState<string | null>(null);
  const session = useSupabaseSession();
  const supabase = useSupabaseClient();

  const currentSection =
    pathname.startsWith("/train") ? "train" : pathname.startsWith("/papers") ? "papers" : "home";

  const currentNavItems = currentSection === "train" ? trainNavItems : currentSection === "papers" ? papersNavItems : [];

  useEffect(() => {
    const allRoutes = [
      "/",
      "/train",
      "/train/drill",
      "/train/analytics",
      "/papers/plan",
      "/papers/drill",
      "/papers/analytics",
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
    const redirectTo = pathname && pathname !== "/login" ? pathname : "/papers/plan";
    return `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
  }, [pathname]);

  const handleLogout = useCallback(async () => {
    setActivePress(null);
    await supabase.auth.signOut();
    router.push("/login");
  }, [router, supabase]);

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
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
                href="/train"
                className={cn(
                  "text-sm font-semibold uppercase tracking-wider transition-colors duration-fast ease-signature",
                  currentSection === "train" ? "text-primary" : "text-white/50 hover:text-white/80"
                )}
              >
                Train
              </Link>
              <span className="text-sm text-white/30">/</span>
              <Link
                href="/papers/plan"
                className={cn(
                  "text-sm font-semibold uppercase tracking-wider transition-colors duration-fast ease-signature",
                  currentSection === "papers" ? "text-[#5B8D94]" : "text-white/50 hover:text-white/80"
                )}
              >
                Papers
              </Link>
              <span className="text-sm text-white/30">/</span>
              <Link
                href="/"
                className={cn(
                  "text-sm font-semibold uppercase tracking-wider transition-colors duration-fast ease-signature",
                  pathname === "/" ? "text-white/90" : "text-white/50 hover:text-white/80"
                )}
              >
                Overview
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
                          ? currentSection === "train"
                            ? "bg-primary/10 text-primary"
                            : "bg-[#5B8D94]/10 text-[#5B8D94]"
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

            <div className="flex items-center space-x-2">
              {session?.user ? (
                <>
                  <span className="hidden md:inline text-sm text-white/70">
                    {session.user.email}
                  </span>
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    Sign out
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="sm" className="uppercase tracking-wide">
                  <Link href={loginHref}>Sign in</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}




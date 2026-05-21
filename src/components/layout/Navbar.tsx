/**
 * Navigation bar component with section detection and switching
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  useSupabaseClient,
  useSupabaseSession,
} from '@/components/auth/SupabaseSessionProvider';
import { cn } from '@/lib/utils';
import { SessionProgressBar } from '@/components/papers/SessionProgressBar';
import { usePaperSessionStore } from '@/store/paperSessionStore';
import { useTheme } from '@/contexts/ThemeContext';
import { LogIn, LogOut, Moon, Settings, Sun } from 'lucide-react';

/** Unified lucide sizing so logout / login glyphs match sun + gear optically */
const NAV_ICON_PX = 22;
const NAV_ICON_STROKE = 2;

const skillsNavItems = [
  { href: '/mental-maths/drill', label: 'Drill' },
  { href: '/mental-maths/analytics', label: 'Analytics' },
  { href: '/mental-maths/leaderboard', label: 'Leaderboard' },
];

const papersNavItems = [
  { href: '/past-papers/roadmap', label: 'Roadmap' },
  { href: '/past-papers/library', label: 'Library' },
  { href: '/past-papers/analytics', label: 'Analytics' },
];

const questionsNavItems = [
  { href: '/questions', label: 'Home' },
  { href: '/questions/questionbank', label: 'Practice' },
  { href: '/questions/library', label: 'Library' },
  { href: '/questions/questionbank/drill', label: 'Drill' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [activePress, setActivePress] = useState<string | null>(null);
  const session = useSupabaseSession();
  const supabase = useSupabaseClient();
  const {
    sessionId,
    endedAt,
    justQuitSessionId,
    justQuitTimestamp,
    paperFullscreenShowMainNavbar,
    setPaperFullscreenShowMainNavbar,
  } = usePaperSessionStore();
  const [docFullscreen, setDocFullscreen] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();

  // Show progress bar if there's an active session
  // Don't show if this session was just quit (within last 5 seconds)
  const isJustQuit =
    justQuitSessionId === sessionId &&
    justQuitTimestamp &&
    Date.now() - justQuitTimestamp < 5000;
  const hasActiveSession =
    sessionId !== null && endedAt === null && !isJustQuit;

  useEffect(() => {
    const sync = () => {
      const d = document as Document & {
        webkitFullscreenElement?: Element | null;
      };
      setDocFullscreen(
        !!(document.fullscreenElement ?? d.webkitFullscreenElement),
      );
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener(
      'webkitfullscreenchange',
      sync as EventListener,
    );
    sync();
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener(
        'webkitfullscreenchange',
        sync as EventListener,
      );
    };
  }, []);

  const showMainNavStrip =
    !hasActiveSession ||
    !docFullscreen ||
    paperFullscreenShowMainNavbar;

  const currentSection = pathname.startsWith('/mental-maths')
    ? 'skills'
    : pathname.startsWith('/past-papers')
      ? 'papers'
      : pathname.startsWith('/questions')
        ? 'questions'
        : 'home';

  const currentNavItems =
    currentSection === 'skills'
      ? skillsNavItems
      : currentSection === 'papers'
        ? papersNavItems
        : currentSection === 'questions'
          ? questionsNavItems
          : [];

  useEffect(() => {
    const allRoutes = [
      '/',
      '/mental-maths/drill',
      '/mental-maths/analytics',
      '/past-papers/roadmap',
      '/past-papers/library',
      '/past-papers/analytics',
      '/questions',
      '/questions/questionbank',
      '/questions/library',
      '/questions/questionbank/drill',
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
    [router],
  );

  const handleMouseEnter = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  const handleMouseUp = useCallback(() => {
    setTimeout(() => setActivePress(null), 120);
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }, [supabase, router]);

  const loginHref = useMemo(() => {
    // Default to /papers/library if on home page or login page
    const redirectTo =
      pathname && pathname !== '/login' && pathname !== '/'
        ? pathname
        : '/past-papers/library';
    return `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
  }, [pathname]);

  const settingsHref = '/settings';

  const loginHrefWithSettingsRedirect = useMemo(
    () =>
      `/login?redirectTo=${encodeURIComponent(settingsHref)}`,
    [],
  );

  const isSettingsActive =
    pathname === '/settings' || pathname.startsWith('/profile');

  const navIconSlotClass =
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-fast ease-signature hover:bg-surface-subtle interaction-scale';

  return (
    <>
      {hasActiveSession &&
        docFullscreen &&
        !paperFullscreenShowMainNavbar && (
          <button
            type='button'
            onClick={() => setPaperFullscreenShowMainNavbar(true)}
            className='fixed top-3 left-4 z-[100] rounded-lg border border-white/15 bg-background/90 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text shadow-lg backdrop-blur-md transition-opacity duration-200 hover:bg-surface-subtle'
            aria-label='Show site navigation'
          >
            No-Calc
          </button>
        )}
      {showMainNavStrip && (
      <nav className='sticky top-0 z-50 w-full border-b border-border bg-background/98 backdrop-blur-xl'>
        <div className='mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8'>
          <div className='flex h-[65px] items-center justify-between'>
            <div className='flex min-w-0 flex-1 items-center gap-6 lg:gap-8'>
              <Link href='/' className='interaction-scale shrink-0'>
                <span className='text-sm font-bold uppercase tracking-[0.14em] text-text transition-colors duration-fast ease-signature hover:text-text-muted'>
                  No-Calc
                </span>
              </Link>

              {!hasActiveSession && (
                <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1'>
                  <Link
                    href='/mental-maths/drill'
                    className={cn(
                      'text-sm uppercase tracking-wider transition-colors duration-fast ease-signature',
                      currentSection === 'skills'
                        ? 'font-bold text-primary'
                        : 'font-semibold text-text-muted hover:text-text',
                    )}
                  >
                    Mental Maths
                  </Link>
                  <span
                    className='text-sm text-text-subtle select-none'
                    aria-hidden
                  >
                    /
                  </span>
                  <Link
                    href='/past-papers/library'
                    className={cn(
                      'text-sm uppercase tracking-wider transition-colors duration-fast ease-signature',
                      currentSection === 'papers'
                        ? 'font-bold text-accent'
                        : 'font-semibold text-text-muted hover:text-text',
                    )}
                  >
                    Past Papers
                  </Link>
                  <span
                    className='text-sm text-text-subtle select-none'
                    aria-hidden
                  >
                    /
                  </span>
                  <Link
                    href='/questions'
                    className={cn(
                      'text-sm uppercase tracking-wider transition-colors duration-fast ease-signature',
                      currentSection === 'questions'
                        ? 'font-bold text-secondary'
                        : 'font-semibold text-text-muted hover:text-text',
                    )}
                  >
                    Question Bank
                  </Link>
                </div>
              )}
            </div>

            <div className='flex min-w-0 shrink-0 items-center gap-2 sm:gap-3'>
              {!hasActiveSession && currentSection !== 'home' && (
                <div className='flex min-w-0 items-center gap-1 sm:gap-2'>
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
                          'px-3 py-2 rounded-organic-md text-sm font-semibold uppercase tracking-[0.12em] transition-all duration-instant ease-signature will-change-transform',
                          'active:scale-[0.97]',
                          isActive
                            ? currentSection === 'skills'
                              ? 'bg-primary/15 text-primary'
                              : currentSection === 'papers'
                                ? 'bg-accent/10 text-accent'
                                : 'bg-secondary/10 text-secondary'
                            : 'text-text hover:bg-surface-subtle hover:text-text',
                          isPressed &&
                            !isActive &&
                            'bg-surface-elevated scale-[0.97]',
                        )}
                        style={{
                          transform: isPressed ? 'scale(0.97)' : undefined,
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              {!hasActiveSession && (
                  <div
                    className='flex shrink-0 items-center gap-1 border-l border-border-subtle pl-3 sm:pl-4'
                    aria-label='Account and preferences'
                  >
                    <button
                      type='button'
                      onClick={toggleTheme}
                      className={navIconSlotClass}
                      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                    >
                      {isDark ? (
                        <Sun
                          className='text-text'
                          aria-hidden
                          size={NAV_ICON_PX}
                          strokeWidth={NAV_ICON_STROKE}
                        />
                      ) : (
                        <Moon
                          className='text-text'
                          aria-hidden
                          size={NAV_ICON_PX}
                          strokeWidth={NAV_ICON_STROKE}
                        />
                      )}
                    </button>

                    {session?.user ? (
                      <>
                        <button
                          type='button'
                          onClick={() => void handleSignOut()}
                          className={navIconSlotClass}
                          aria-label='Sign out'
                        >
                          <LogOut
                            className='text-text'
                            aria-hidden
                            size={NAV_ICON_PX}
                            strokeWidth={NAV_ICON_STROKE}
                          />
                        </button>
                        <Link
                          href={settingsHref}
                          className={cn(
                            navIconSlotClass,
                            isSettingsActive && 'bg-secondary/15',
                          )}
                          aria-label='Settings'
                        >
                          <Settings
                            aria-hidden
                            className={cn(
                              isSettingsActive ? 'text-secondary' : 'text-text',
                            )}
                            size={NAV_ICON_PX}
                            strokeWidth={NAV_ICON_STROKE}
                          />
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href={loginHref}
                          className={navIconSlotClass}
                          aria-label='Sign in'
                        >
                          <LogIn
                            aria-hidden
                            className='text-text'
                            size={NAV_ICON_PX}
                            strokeWidth={NAV_ICON_STROKE}
                          />
                        </Link>
                        <Link
                          href={loginHrefWithSettingsRedirect}
                          className={cn(navIconSlotClass)}
                          aria-label='Settings'
                        >
                          <Settings
                            aria-hidden
                            className='text-text'
                            size={NAV_ICON_PX}
                            strokeWidth={NAV_ICON_STROKE}
                          />
                        </Link>
                      </>
                    )}
                  </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      )}
      {hasActiveSession && <SessionProgressBar embedded />}
    </>
  );
}

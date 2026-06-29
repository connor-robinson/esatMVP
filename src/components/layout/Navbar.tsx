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
import { BrandNavLockup } from '@/components/brand/BrandNavLockup';
import { APP_NAME } from '@/config/brand';
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
  { href: '/questions/library', label: 'Library' },
  { href: '/questions/questionbank/analytics', label: 'Analytics' },
];

const sectionNavItems = [
  {
    href: '/mental-maths/drill',
    label: 'Mental Maths',
    section: 'skills' as const,
  },
  {
    href: '/past-papers/library',
    label: 'Past Papers',
    section: 'papers' as const,
  },
  {
    href: '/questions',
    label: 'Question Bank',
    section: 'questions' as const,
  },
];

const sectionNavLinkClass =
  'text-sm font-semibold uppercase tracking-[0.12em] transition-colors duration-fast ease-signature';

const navPillClass =
  'px-3 py-2 rounded-organic-md text-sm font-semibold uppercase tracking-[0.12em] transition-all duration-instant ease-signature will-change-transform active:scale-[0.97]';

const navGroupGapClass = 'flex min-w-0 items-center gap-1 sm:gap-2';

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
    isMarkingInfo,
    paperFullscreenShowMainNavbar,
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
    sessionId !== null &&
    !isJustQuit &&
    (endedAt === null || isMarkingInfo);

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
    (docFullscreen && paperFullscreenShowMainNavbar);

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
      '/questions/questionbank/analytics',
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
      {showMainNavStrip && (
      <nav className='sticky top-0 z-50 w-full border-b border-border bg-background/98 backdrop-blur-xl'>
        <div className='w-full px-4 sm:px-6 lg:px-10 xl:px-12'>
          <div className='flex h-[65px] items-center justify-between gap-4'>
            <div className='flex min-w-0 flex-1 items-center gap-4 sm:gap-6 lg:gap-8'>
              <Link
                href='/'
                className='group interaction-scale inline-flex shrink-0 items-center'
                aria-label={APP_NAME}
              >
                <BrandNavLockup />
              </Link>

              {!hasActiveSession && (
                <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1'>
                  {sectionNavItems.map((item, index) => {
                    const isActive = currentSection === item.section;

                    return (
                      <span key={item.href} className='inline-flex items-center gap-x-3'>
                        {index > 0 && (
                          <span
                            className='text-sm text-text-subtle select-none'
                            aria-hidden
                          >
                            /
                          </span>
                        )}
                        <Link
                          href={item.href}
                          prefetch={true}
                          onMouseEnter={() => handleMouseEnter(item.href)}
                          className={cn(
                            sectionNavLinkClass,
                            isActive
                              ? item.section === 'skills'
                                ? 'font-bold text-primary'
                                : item.section === 'papers'
                                  ? 'font-bold text-accent'
                                  : 'font-bold text-secondary'
                              : 'text-text-muted hover:text-text',
                          )}
                        >
                          {item.label}
                        </Link>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className='flex min-w-0 shrink-0 items-center gap-2 sm:gap-3'>
              {!hasActiveSession && currentSection !== 'home' && (
                <div className={navGroupGapClass}>
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
                          navPillClass,
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

/**
 * Navigation bar with section dropdowns and mobile menu
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  NavSectionDropdown,
  type NavSectionConfig,
  type NavSectionId,
} from '@/components/layout/NavSectionDropdown';
import { LogIn, LogOut, Menu, Moon, Settings, Sun, X } from 'lucide-react';

/** Unified lucide sizing so logout / login glyphs match sun + gear optically */
const NAV_ICON_PX = 22;
const NAV_ICON_STROKE = 2;

const navSections: NavSectionConfig[] = [
  {
    label: 'Mental Maths',
    href: '/mental-maths/drill',
    section: 'skills',
    items: [
      {
        href: '/mental-maths/drill',
        label: 'Drill',
        description: 'Start a practice session',
      },
      {
        href: '/mental-maths/analytics',
        label: 'Analytics',
        description: 'Track your progress',
      },
      {
        href: '/mental-maths/leaderboard',
        label: 'Leaderboard',
        description: 'Compare with others',
      },
    ],
  },
  {
    label: 'Past Papers',
    href: '/past-papers/library',
    section: 'papers',
    items: [
      {
        href: '/past-papers/library',
        label: 'Library',
        description: 'Browse exam papers',
      },
      {
        href: '/past-papers/roadmap',
        label: 'Roadmap',
        description: 'Plan your prep',
      },
      {
        href: '/past-papers/analytics',
        label: 'Analytics',
        description: 'Review your results',
      },
    ],
  },
  {
    label: 'Question Bank',
    href: '/questions',
    section: 'questions',
    items: [
      {
        href: '/questions',
        label: 'Home',
        description: 'Overview and mixed practice',
      },
      {
        href: '/questions/questionbank/drill',
        label: 'Drill',
        description: 'Topic-focused sessions',
      },
      {
        href: '/questions/library',
        label: 'Library',
        description: 'Browse all questions',
      },
      {
        href: '/questions/questionbank/analytics',
        label: 'Analytics',
        description: 'Track your progress',
      },
    ],
  },
  {
    label: 'Tools',
    href: '/tools/score-converter',
    section: 'tools',
    items: [
      {
        href: '/tools/score-converter',
        label: 'Score Converter',
        description: 'Convert raw scores to percentiles',
      },
      {
        href: '/tools/faqs',
        label: 'FAQs',
        description: 'Common questions answered',
      },
      {
        href: '/tools/tutorials',
        label: 'Tutorials',
        description: 'Learn how to use the platform',
      },
    ],
  },
];

const ALL_NAV_ROUTES = navSections.flatMap((section) => [
  section.href,
  ...section.items.map((item) => item.href),
]);

function resolveSection(pathname: string): NavSectionId | 'home' {
  if (pathname.startsWith('/mental-maths')) return 'skills';
  if (pathname.startsWith('/past-papers')) return 'papers';
  if (pathname.startsWith('/questions')) return 'questions';
  if (pathname.startsWith('/tools')) return 'tools';
  return 'home';
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const currentSection = resolveSection(pathname);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  useEffect(() => {
    ALL_NAV_ROUTES.forEach((route, index) => {
      setTimeout(() => router.prefetch(route), index * 5);
    });
  }, [router]);

  const handlePrefetch = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }, [supabase, router]);

  const loginHref = useMemo(() => {
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

  const accountControls = (
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
  );

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
                  <div className='hidden min-w-0 items-center gap-x-4 lg:gap-x-5 md:flex'>
                    {navSections.map((section) => (
                      <NavSectionDropdown
                        key={section.section}
                        config={section}
                        isActive={currentSection === section.section}
                        onPrefetch={handlePrefetch}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className='flex min-w-0 shrink-0 items-center gap-2 sm:gap-3'>
                {!hasActiveSession && (
                  <>
                    <button
                      type='button'
                      className={cn(navIconSlotClass, 'md:hidden')}
                      aria-expanded={mobileMenuOpen}
                      aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                      onClick={() => setMobileMenuOpen((prev) => !prev)}
                    >
                      {mobileMenuOpen ? (
                        <X
                          aria-hidden
                          className='text-text'
                          size={NAV_ICON_PX}
                          strokeWidth={NAV_ICON_STROKE}
                        />
                      ) : (
                        <Menu
                          aria-hidden
                          className='text-text'
                          size={NAV_ICON_PX}
                          strokeWidth={NAV_ICON_STROKE}
                        />
                      )}
                    </button>
                    {accountControls}
                  </>
                )}
              </div>
            </div>

            {!hasActiveSession && mobileMenuOpen && (
              <div className='border-t border-border-subtle pb-4 pt-3 md:hidden'>
                <div className='flex flex-col gap-5'>
                  {navSections.map((section) => (
                    <div key={section.section}>
                      <Link
                        href={section.href}
                        prefetch
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'text-sm font-semibold uppercase tracking-[0.12em]',
                          currentSection === section.section
                            ? section.section === 'skills'
                              ? 'text-primary'
                              : section.section === 'papers'
                                ? 'text-accent'
                                : section.section === 'questions'
                                  ? 'text-secondary'
                                  : 'text-text'
                            : 'text-text-muted',
                        )}
                      >
                        {section.label}
                      </Link>
                      <div className='mt-2 flex flex-col gap-0.5 pl-1'>
                        {section.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            prefetch
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              'rounded-organic-md px-2 py-2 text-sm transition-colors duration-fast ease-signature',
                              pathname === item.href
                                ? 'bg-surface-subtle text-text font-semibold'
                                : 'text-text-muted hover:bg-surface-subtle hover:text-text',
                            )}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>
      )}
      {hasActiveSession && <SessionProgressBar embedded />}
    </>
  );
}

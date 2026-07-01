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
import { useSubscription } from '@/hooks/useSubscription';
import { BrandNavLockup } from '@/components/brand/BrandNavLockup';
import { SignOutConfirmModal } from '@/components/auth/SignOutConfirmModal';
import { APP_NAME } from '@/config/brand';
import {
  NavSectionDropdown,
  NavDropdownMenuItem,
  getNavSectionItems,
  type NavSectionConfig,
  type NavSectionId,
} from '@/components/layout/NavSectionDropdown';
import {
  FERMI_GUESSR_NAME,
  FERMI_GUESSR_PLAY_PATH,
} from '@/config/fermiGuessr';
import { FermiGuessrIcon } from '@/components/icons/FermiGuessrIcon';
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  HelpCircle,
  GraduationCap,
  Home,
  Library,
  LogIn,
  LogOut,
  Map,
  Menu,
  Moon,
  Settings,
  Sun,
  Trophy,
  X,
  Zap,
} from 'lucide-react';

/** Unified lucide sizing so logout / login glyphs match sun + gear optically */
const NAV_ICON_PX = 22;
const NAV_ICON_STROKE = 2;

const navSections: NavSectionConfig[] = [
  {
    label: 'Mental Maths',
    href: '/mental-maths/drill',
    section: 'skills',
    groups: [
      {
        items: [
          {
            href: '/mental-maths/drill',
            label: 'Drill',
            description: 'Start a practice session',
            icon: Zap,
          },
          {
            href: '/mental-maths/analytics',
            label: 'Analytics',
            description: 'Track your progress',
            icon: BarChart3,
          },
          {
            href: '/mental-maths/leaderboard',
            label: 'Leaderboard',
            description: 'Compare with others',
            icon: Trophy,
          },
        ],
      },
      {
        title: FERMI_GUESSR_NAME,
        items: [
          {
            href: FERMI_GUESSR_PLAY_PATH,
            label: FERMI_GUESSR_NAME,
            description: 'Daily estimation game',
            icon: FermiGuessrIcon,
            badge: 'NEW',
            iconBoxClassName: 'bg-surface-elevated',
            badgeClassName: 'text-sm',
          },
        ],
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
        icon: Library,
      },
      {
        href: '/past-papers/roadmap',
        label: 'Roadmap',
        description: 'Plan your prep',
        icon: Map,
      },
      {
        href: '/past-papers/analytics',
        label: 'Analytics',
        description: 'Review your results',
        icon: BarChart3,
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
        icon: Home,
      },
      {
        href: '/questions/library',
        label: 'Library',
        description: 'Browse all questions',
        icon: BookOpen,
      },
      {
        href: '/questions/questionbank/analytics',
        label: 'Analytics',
        description: 'Track your progress',
        icon: BarChart3,
      },
    ],
  },
  {
    label: 'Exam Tools',
    href: '/tools/score-converter',
    section: 'tools',
    triggerPadding: 'px-1.5',
    items: [
      {
        href: '/tools/score-converter',
        label: 'Score Converter',
        description: 'Convert raw scores to percentiles',
        icon: ArrowLeftRight,
      },
      {
        href: '/tools/faqs',
        label: 'FAQs',
        description: 'Common questions answered',
        icon: HelpCircle,
      },
      {
        href: '/tools/tutorials',
        label: 'Tutorials',
        description: 'Learn how to use the platform',
        icon: GraduationCap,
      },
    ],
  },
];

const ALL_NAV_ROUTES = navSections.flatMap((section) => [
  section.href,
  ...getNavSectionItems(section).map((item) => item.href),
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
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
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
  const { theme, toggleTheme, isDark, lightStrategy, toggleLightStrategy } = useTheme();
  const { hasFullAccess } = useSubscription();

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
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      setShowSignOutConfirm(false);
      router.push('/');
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
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
      className='flex shrink-0 items-center gap-2 border-l border-border-subtle pl-3 sm:gap-3 sm:pl-4'
      aria-label='Account and preferences'
    >
      {!hasFullAccess ? (
        <Link
          href='/pricing'
          className='inline-flex h-9 shrink-0 items-center justify-center rounded-organic-md bg-primary px-3.5 text-xs font-bold uppercase tracking-[0.14em] text-black transition-opacity hover:opacity-90 sm:h-10 sm:px-4 sm:text-sm'
        >
          Upgrade
        </Link>
      ) : null}

      <button
        type='button'
        onClick={(event) => {
          if (!isDark && event.altKey) {
            toggleLightStrategy();
            return;
          }
          toggleTheme();
        }}
        className={navIconSlotClass}
        aria-label={
          isDark
            ? `Switch to light mode (${lightStrategy === "inverted" ? "inverted palette preview" : "designed light theme"})`
            : `Switch to dark mode${lightStrategy === "inverted" ? " (Alt+click: designed light)" : " (Alt+click: inverted palette preview)"}`
        }
        title={
          isDark
            ? undefined
            : lightStrategy === "inverted"
              ? "Light mode: inverted palette preview. Alt+click for designed light."
              : "Light mode: designed theme. Alt+click for inverted palette preview."
        }
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
            onClick={() => setShowSignOutConfirm(true)}
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
              <div className='flex min-w-0 flex-[1.35] items-center gap-5 sm:gap-8 lg:gap-10 xl:gap-12'>
                <Link
                  href='/'
                  className='group interaction-scale inline-flex shrink-0 items-center'
                  aria-label={APP_NAME}
                >
                  <BrandNavLockup />
                </Link>

                {!hasActiveSession && (
                  <div className='hidden min-w-0 flex-1 items-center gap-x-6 lg:gap-x-8 xl:gap-x-9 md:flex'>
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
              <div className='border-t border-border-subtle pb-5 pt-4 md:hidden'>
                <div className='flex flex-col gap-6'>
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
                      <div className='mt-3 flex flex-col gap-1'>
                        {section.groups?.length
                          ? section.groups.map((group, groupIndex) => (
                              <div
                                key={group.title ?? `mobile-group-${groupIndex}`}
                                className={cn(groupIndex > 0 && 'mt-3 border-t border-border-subtle pt-3')}
                              >
                                {group.title ? (
                                  <p className='mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted'>
                                    {group.title}
                                  </p>
                                ) : null}
                                <div className='flex flex-col gap-1'>
                                  {group.items.map((item) => (
                                    <NavDropdownMenuItem
                                      key={item.href}
                                      item={item}
                                      section={section.section}
                                      isActive={pathname === item.href}
                                      onPrefetch={handlePrefetch}
                                      onNavigate={() => setMobileMenuOpen(false)}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))
                          : (section.items ?? []).map((item) => (
                              <NavDropdownMenuItem
                                key={item.href}
                                item={item}
                                section={section.section}
                                isActive={pathname === item.href}
                                onPrefetch={handlePrefetch}
                                onNavigate={() => setMobileMenuOpen(false)}
                              />
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
      <SignOutConfirmModal
        open={showSignOutConfirm}
        isLoading={isSigningOut}
        onClose={() => {
          if (!isSigningOut) setShowSignOutConfirm(false);
        }}
        onConfirm={handleSignOut}
      />
    </>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, type LucideIcon, type LucideProps } from 'lucide-react';

export type NavDropdownIcon = LucideIcon | ComponentType<LucideProps>;
import { cn } from '@/lib/utils';
import {
  MENTAL_MATHS_DRILL_HREF,
  isMentalMathsDrillPath,
  requestMentalMathsDrillHome,
} from '@/lib/mentalMathsNav';

export type NavSectionId = 'skills' | 'papers' | 'questions' | 'tools';

export interface NavDropdownItem {
  href: string;
  label: string;
  description?: string;
  icon: NavDropdownIcon;
  /** Uppercase label beside the title (e.g. NEW). */
  badge?: string;
  /** Optional override for the icon container background. */
  iconBoxClassName?: string;
  /** Optional override for badge typography. */
  badgeClassName?: string;
}

export interface NavDropdownGroup {
  /** Optional group heading inside the dropdown. */
  title?: string;
  items: NavDropdownItem[];
}

export interface NavSectionConfig {
  label: string;
  href: string;
  section: NavSectionId;
  /** Extra horizontal padding on the trigger label for visual balance. */
  triggerPadding?: string;
  items?: NavDropdownItem[];
  /** When set, renders labelled sections inside the dropdown. */
  groups?: NavDropdownGroup[];
}

export function getNavSectionItems(config: NavSectionConfig): NavDropdownItem[] {
  if (config.groups?.length) {
    return config.groups.flatMap((group) => group.items);
  }
  return config.items ?? [];
}

const sectionActiveClass: Record<NavSectionId, string> = {
  skills: 'font-bold text-primary',
  papers: 'font-bold text-accent',
  questions: 'font-bold text-secondary',
  tools: 'font-bold text-text',
};

const sectionTheme: Record<
  NavSectionId,
  {
    iconColor: string;
    activeMark: string;
  }
> = {
  skills: {
    iconColor: 'text-primary',
    activeMark: 'bg-primary',
  },
  papers: {
    iconColor: 'text-accent',
    activeMark: 'bg-accent',
  },
  questions: {
    iconColor: 'text-secondary',
    activeMark: 'bg-secondary',
  },
  tools: {
    iconColor: 'text-text',
    activeMark: 'bg-text/55',
  },
};

/** Visible in both themes; border-subtle alone washes out on dark elevated surfaces. */
const dropdownPanelClass =
  'min-w-[17.5rem] w-max overflow-hidden rounded-[8px] border border-border bg-surface-elevated shadow-sm dark:border-white/15';

const sectionLabelClass =
  'whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.11em] transition-colors duration-fast ease-signature';

const dropdownMotion = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const },
};

interface NavSectionDropdownProps {
  config: NavSectionConfig;
  isActive: boolean;
  onPrefetch: (href: string) => void;
}

export function NavDropdownMenuItem({
  item,
  section,
  isActive,
  onPrefetch,
  onNavigate,
  compact = false,
  showRule = false,
}: {
  item: NavDropdownItem;
  section: NavSectionId;
  isActive: boolean;
  onPrefetch: (href: string) => void;
  onNavigate?: () => void;
  compact?: boolean;
  /** Hairline separator above this row (ruled list). */
  showRule?: boolean;
}) {
  const theme = sectionTheme[section];
  const Icon = item.icon;
  const pathname = usePathname();

  return (
    <Link
      href={item.href}
      prefetch
      role='menuitem'
      onMouseEnter={() => onPrefetch(item.href)}
      onClick={() => {
        if (
          item.href === MENTAL_MATHS_DRILL_HREF &&
          isMentalMathsDrillPath(pathname)
        ) {
          requestMentalMathsDrillHome();
        }
        onNavigate?.();
      }}
      className={cn(
        'relative flex items-start gap-2.5 text-left transition-colors duration-fast ease-signature',
        compact ? 'px-3 py-2.5' : 'gap-3 px-3 py-3',
        showRule && 'border-t border-border dark:border-white/10',
      )}
    >
      {isActive ? (
        <span
          className={cn(
            'absolute bottom-2 left-0 top-2 w-px',
            theme.activeMark,
          )}
          aria-hidden
        />
      ) : null}
      <Icon
        className={cn(
          'mt-0.5 shrink-0',
          compact ? 'h-[15px] w-[15px]' : 'h-4 w-4',
          theme.iconColor,
        )}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className='min-w-0 flex-1'>
        <span
          className={cn(
            'inline-flex items-center gap-2 text-[13px] leading-tight',
            isActive ? cn('font-semibold', theme.iconColor) : 'font-medium text-text',
          )}
        >
          {item.label}
          {item.badge ? (
            <span
              className={cn(
                'font-bold uppercase tracking-[0.08em] text-error',
                item.badgeClassName ?? (compact ? 'text-[10px]' : 'text-xs'),
              )}
            >
              {item.badge}
            </span>
          ) : null}
        </span>
        {item.description ? (
          <span
            className={cn(
              'mt-0.5 block leading-snug text-text-muted',
              compact ? 'text-[11px]' : 'text-xs leading-relaxed',
            )}
          >
            {item.description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function NavDropdownItemList({
  config,
  pathname,
  onPrefetch,
  onItemNavigate,
  compact,
}: {
  config: NavSectionConfig;
  pathname: string;
  onPrefetch: (href: string) => void;
  onItemNavigate: (href: string) => void;
  compact?: boolean;
}) {
  if (config.groups?.length) {
    return (
      <>
        {config.groups.map((group, groupIndex) => (
          <div key={group.title ?? `group-${groupIndex}`}>
            {group.title ? (
              <p
                className={cn(
                  'px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted',
                  groupIndex > 0 && 'border-t border-border dark:border-white/10',
                )}
              >
                {group.title}
              </p>
            ) : null}
            {group.items.map((item, itemIndex) => {
              const showRule =
                itemIndex > 0 ||
                (groupIndex > 0 && !group.title && itemIndex === 0);
              return (
                <NavDropdownMenuItem
                  key={item.href}
                  item={item}
                  section={config.section}
                  isActive={pathname === item.href}
                  onPrefetch={onPrefetch}
                  onNavigate={() => onItemNavigate(item.href)}
                  compact={compact}
                  showRule={showRule}
                />
              );
            })}
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {(config.items ?? []).map((item, itemIndex) => (
        <NavDropdownMenuItem
          key={item.href}
          item={item}
          section={config.section}
          isActive={pathname === item.href}
          onPrefetch={onPrefetch}
          onNavigate={() => onItemNavigate(item.href)}
          compact={compact}
          showRule={itemIndex > 0}
        />
      ))}
    </>
  );
}

export function NavSectionDropdown({
  config,
  isActive,
  onPrefetch,
}: NavSectionDropdownProps) {
  const pathname = usePathname();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearHoverTimeout();
    setOpen(true);
  };

  const handleMouseLeave = () => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => setOpen(false), 160);
  };

  const toggleMenu = () => {
    setOpen((prev) => !prev);
  };

  const handleItemClick = (href: string) => {
    router.prefetch(href);
    close();
  };

  return (
    <div
      ref={rootRef}
      className={cn('relative inline-flex', open && 'z-[80]')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className='inline-flex items-center px-2 py-1'>
        <Link
          href={config.href}
          prefetch
          onMouseEnter={() => onPrefetch(config.href)}
          onClick={() => {
            if (
              config.href === MENTAL_MATHS_DRILL_HREF &&
              isMentalMathsDrillPath(pathname)
            ) {
              requestMentalMathsDrillHome();
            }
          }}
          className={cn(
            sectionLabelClass,
            config.triggerPadding,
            isActive
              ? sectionActiveClass[config.section]
              : 'text-text-muted hover:text-text',
          )}
        >
          {config.label}
        </Link>
        <button
          type='button'
          onClick={toggleMenu}
          className={cn(
            'ml-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] transition-colors duration-fast ease-signature',
            isActive || open
              ? sectionActiveClass[config.section]
              : 'text-text-muted hover:text-text',
          )}
          aria-expanded={open}
          aria-haspopup='true'
          aria-label={`${config.label} menu`}
        >
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            {...dropdownMotion}
            className={cn('absolute left-0 top-full z-50 mt-1.5', dropdownPanelClass)}
            role='menu'
            style={{ transformOrigin: 'top left' }}
          >
            <NavDropdownItemList
              config={config}
              pathname={pathname}
              onPrefetch={onPrefetch}
              onItemNavigate={handleItemClick}
              compact
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Shared panel chrome for mobile section lists (ruled rows). */
export const navDropdownMobileListClass = cn(
  'mt-3 overflow-hidden rounded-[8px] border border-border bg-surface-elevated dark:border-white/15',
);

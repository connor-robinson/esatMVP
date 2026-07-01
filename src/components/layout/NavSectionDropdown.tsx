'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, type LucideIcon, type LucideProps } from 'lucide-react';

export type NavDropdownIcon = LucideIcon | ComponentType<LucideProps>;
import { cn } from '@/lib/utils';

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
    accentBar: string;
    iconBox: string;
    iconColor: string;
    itemActive: string;
    triggerOpen: string;
  }
> = {
  skills: {
    accentBar: 'bg-primary',
    iconBox: 'bg-primary/15',
    iconColor: 'text-primary',
    itemActive: 'bg-primary/10',
    triggerOpen: 'bg-surface-elevated',
  },
  papers: {
    accentBar: 'bg-accent',
    iconBox: 'bg-accent/15',
    iconColor: 'text-accent',
    itemActive: 'bg-accent/10',
    triggerOpen: 'bg-surface-elevated',
  },
  questions: {
    accentBar: 'bg-secondary',
    iconBox: 'bg-secondary/15',
    iconColor: 'text-secondary',
    itemActive: 'bg-secondary/10',
    triggerOpen: 'bg-surface-elevated',
  },
  tools: {
    accentBar: 'bg-text-subtle',
    iconBox: 'bg-surface-mid',
    iconColor: 'text-text',
    itemActive: 'bg-surface-mid',
    triggerOpen: 'bg-surface-elevated',
  },
};

const sectionLabelClass =
  'whitespace-nowrap text-sm font-semibold uppercase tracking-[0.12em] transition-colors duration-fast ease-signature';

const dropdownMotion = {
  initial: { opacity: 0, y: -8, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
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
}: {
  item: NavDropdownItem;
  section: NavSectionId;
  isActive: boolean;
  onPrefetch: (href: string) => void;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const theme = sectionTheme[section];
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      prefetch
      role='menuitem'
      onMouseEnter={() => onPrefetch(item.href)}
      onClick={onNavigate}
      className={cn(
        'flex items-start gap-2.5 rounded-organic-md transition-colors duration-fast ease-signature',
        compact ? 'px-2 py-2.5' : 'gap-3.5 px-3 py-3',
        isActive ? theme.itemActive : 'hover:bg-surface-subtle/80',
      )}
    >
      <span
        className={cn(
          'mt-0.5 inline-flex shrink-0 items-center justify-center rounded-[10px]',
          compact ? 'h-8 w-8' : 'h-9 w-9',
          item.iconBoxClassName ?? theme.iconBox,
        )}
        aria-hidden
      >
        <Icon
          className={cn(compact ? 'h-4 w-4' : 'h-[18px] w-[18px]', theme.iconColor)}
          strokeWidth={2}
        />
      </span>
      <span className='min-w-0 flex-1 pt-0.5'>
        <span
          className={cn(
            'block text-sm font-semibold leading-tight',
            isActive ? theme.iconColor : 'text-text',
          )}
        >
          <span className="inline-flex items-center gap-2">
            {item.label}
            {item.badge ? (
              <span
                className={cn(
                  'font-bold uppercase tracking-[0.08em] text-error',
                  item.badgeClassName ??
                    (compact ? 'text-xs' : 'text-sm'),
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </span>
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
  const theme = sectionTheme[config.section];

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
      className='relative inline-flex'
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn(
          'inline-flex flex-col transition-[background-color,box-shadow,border-radius] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
          open && 'rounded-t-organic-md',
        )}
      >
        <div
          className={cn(
            'inline-flex items-center rounded-organic-md px-3 py-1.5 transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
            open && cn(theme.triggerOpen, 'rounded-b-none shadow-sm'),
          )}
        >
          <Link
            href={config.href}
            prefetch
            onMouseEnter={() => onPrefetch(config.href)}
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
              'ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-fast ease-signature',
              isActive || open
                ? sectionActiveClass[config.section]
                : 'text-text-muted hover:bg-surface-subtle hover:text-text',
            )}
            aria-expanded={open}
            aria-haspopup='true'
            aria-label={`${config.label} menu`}
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
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
              className='absolute -mt-px left-0 top-full z-50 min-w-[19rem] w-max overflow-hidden rounded-b-organic-lg rounded-t-none bg-surface-elevated backdrop-blur-xl shadow-modal-card'
              role='menu'
              style={{ transformOrigin: 'top center' }}
            >
              <div className={cn('h-[3px] w-full shrink-0', theme.accentBar)} aria-hidden />

              <div className='flex flex-col gap-1 p-2'>
                {config.groups?.length
                  ? config.groups.map((group, groupIndex) => (
                      <div
                        key={group.title ?? `group-${groupIndex}`}
                        className={cn(groupIndex > 0 && 'mt-2 border-t border-border-subtle pt-2')}
                      >
                        {group.title ? (
                          <p className='mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted'>
                            {group.title}
                          </p>
                        ) : null}
                        <div className='flex flex-col gap-1'>
                          {group.items.map((item) => (
                            <NavDropdownMenuItem
                              key={item.href}
                              item={item}
                              section={config.section}
                              isActive={pathname === item.href}
                              onPrefetch={onPrefetch}
                              onNavigate={() => handleItemClick(item.href)}
                              compact
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  : (config.items ?? []).map((item) => (
                      <NavDropdownMenuItem
                        key={item.href}
                        item={item}
                        section={config.section}
                        isActive={pathname === item.href}
                        onPrefetch={onPrefetch}
                        onNavigate={() => handleItemClick(item.href)}
                        compact
                      />
                    ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

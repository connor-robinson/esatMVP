'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NavSectionId = 'skills' | 'papers' | 'questions' | 'tools';

export interface NavDropdownItem {
  href: string;
  label: string;
  description?: string;
}

export interface NavSectionConfig {
  label: string;
  href: string;
  section: NavSectionId;
  items: NavDropdownItem[];
}

const sectionActiveClass: Record<NavSectionId, string> = {
  skills: 'font-bold text-primary',
  papers: 'font-bold text-accent',
  questions: 'font-bold text-secondary',
  tools: 'font-bold text-text',
};

const sectionItemActiveClass: Record<NavSectionId, string> = {
  skills: 'bg-primary/15 text-primary',
  papers: 'bg-accent/10 text-accent',
  questions: 'bg-secondary/10 text-secondary',
  tools: 'bg-surface-elevated text-text',
};

const sectionLabelClass =
  'text-sm font-semibold uppercase tracking-[0.12em] transition-colors duration-fast ease-signature';

interface NavSectionDropdownProps {
  config: NavSectionConfig;
  isActive: boolean;
  onPrefetch: (href: string) => void;
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
    hoverTimeoutRef.current = setTimeout(() => setOpen(false), 120);
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
      className='relative inline-flex items-center'
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className='inline-flex items-center'>
        <Link
          href={config.href}
          prefetch
          onMouseEnter={() => onPrefetch(config.href)}
          className={cn(
            sectionLabelClass,
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
            'ml-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-fast ease-signature',
            isActive ? sectionActiveClass[config.section] : 'text-text-muted hover:text-text hover:bg-surface-subtle',
          )}
          aria-expanded={open}
          aria-haspopup='true'
          aria-label={`${config.label} menu`}
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-fast ease-signature',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </div>

      {open && (
        <div
          className='absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-organic-md bg-surface-elevated py-1.5 shadow-lg'
          role='menu'
        >
          {config.items.map((item) => {
            const itemActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                role='menuitem'
                onMouseEnter={() => onPrefetch(item.href)}
                onClick={() => handleItemClick(item.href)}
                className={cn(
                  'block px-3 py-2 transition-colors duration-fast ease-signature',
                  itemActive
                    ? sectionItemActiveClass[config.section]
                    : 'text-text hover:bg-surface-subtle',
                )}
              >
                <span className='block text-sm font-semibold'>{item.label}</span>
                {item.description ? (
                  <span className='mt-0.5 block text-xs text-text-muted'>
                    {item.description}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

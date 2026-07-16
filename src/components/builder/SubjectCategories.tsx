/**
 * Subject categories sidebar - Left column
 */

'use client';

import {
  Calculator,
  FunctionSquare,
  Triangle,
  Atom,
  Infinity,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HighLevelCategory } from '@/components/builder/TopicFolders';
import { FERMI_GUESSR_NAME } from '@/config/fermiGuessr';
import { FermiGuessrIcon } from '@/components/icons/FermiGuessrIcon';

interface SubjectCategoriesProps {
  selectedCategory: HighLevelCategory | null;
  onSelectCategory: (category: HighLevelCategory) => void;
  /** Opens FermiGuessr — a daily estimation minigame, separate from drills. */
  onLaunchFermiGuessr?: () => void;
}

const SIDEBAR_CATEGORY_ORDER: HighLevelCategory[] = [
  'most_useful',
  'arithmetic',
  'algebra',
  'geometry',
  'number_theory',
  'physics',
];

/** Selected pill fills only; icon stays white, caption is dark in light / white in dark. */
const categorySelectedPillBg: Record<HighLevelCategory, string> = {
  most_useful: 'bg-primary dark:bg-primary/35',
  arithmetic: 'bg-primary dark:bg-primary/35',
  algebra: 'bg-accent dark:bg-accent/35',
  geometry: 'bg-secondary dark:bg-secondary/35',
  number_theory: 'bg-biology dark:bg-biology/35',
  physics: 'bg-physics dark:bg-physics/35',
};

const selectedGlyphShadow =
  'text-white [filter:drop-shadow(0_0.5px_1.5px_rgb(0_0_0_/_0.55))_drop-shadow(0_1px_2px_rgb(0_0_0_/_0.35))]';
/** Caption under icon: near-black on pills in light UI; white + shadow in dark UI. */
const selectedLabelClasses =
  'text-background [text-shadow:0_0.5px_1px_rgb(255_255_255_/_0.35)] dark:text-white dark:[text-shadow:0_0.5px_2px_rgb(0_0_0_/_0.45),0_0_1px_rgb(0_0_0_/_0.35)]';

const categoryConfig: Record<
  HighLevelCategory,
  {
    label: string;
    icon: LucideIcon;
  }
> = {
  most_useful: { label: 'Most Useful', icon: Sparkles },
  arithmetic: { label: 'Arithmetic', icon: Calculator },
  algebra: { label: 'Algebra', icon: FunctionSquare },
  geometry: { label: 'Geometry', icon: Triangle },
  number_theory: { label: 'Number Theory', icon: Infinity },
  physics: { label: 'Physics', icon: Atom },
};

export function SubjectCategories({
  selectedCategory,
  onSelectCategory,
  onLaunchFermiGuessr,
}: SubjectCategoriesProps) {
  return (
    <aside className='scrollbar-hide hidden h-full min-h-0 w-[5.75rem] shrink-0 flex-col overflow-hidden rounded-organic-xl bg-surface lg:flex xl:w-[6.5rem]'>
      <nav className='flex h-full min-h-0 flex-1 flex-col px-1.5 py-3'>
        <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5'>
          {SIDEBAR_CATEGORY_ORDER.map((category) => {
            const config = categoryConfig[category];
            const Icon = config.icon;
            const isSelected = selectedCategory === category;

            return (
              <button
                key={category}
                type='button'
                onClick={() => onSelectCategory(category)}
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-1 px-1 transition-all',
                  !isSelected && 'opacity-70 hover:opacity-100',
                )}
              >
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-organic-lg transition-colors duration-150 ease-out xl:h-14 xl:w-14',
                    isSelected
                      ? categorySelectedPillBg[category]
                      : 'bg-surface-mid text-text-muted',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 xl:h-6 xl:w-6',
                      isSelected ? selectedGlyphShadow : 'text-text-muted',
                    )}
                    strokeWidth={isSelected ? 2.25 : 2}
                  />
                </div>
                <span
                  className={cn(
                    'text-center text-[10px] font-medium leading-tight tracking-[0.04em] xl:text-[11px]',
                    isSelected ? selectedLabelClasses : 'text-text-muted',
                  )}
                >
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>

        {onLaunchFermiGuessr ? (
          <div className='mt-2 flex shrink-0 flex-col items-center gap-3 pt-1'>
            <div
              className='h-px w-10 rounded-full bg-border-subtle xl:w-12'
              aria-hidden
            />
            <button
              type='button'
              onClick={onLaunchFermiGuessr}
              className='group flex w-full flex-col items-center justify-center gap-1 px-1 outline-none opacity-90 transition-opacity hover:opacity-100'
              title={`${FERMI_GUESSR_NAME} — daily estimation game`}
            >
              <div className='relative flex h-12 w-12 items-center justify-center rounded-organic-lg bg-surface-elevated xl:h-14 xl:w-14'>
                <span className='absolute -right-1 -top-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-error'>
                  New
                </span>
                <FermiGuessrIcon
                  className='h-5 w-5 text-secondary xl:h-6 xl:w-6'
                  strokeWidth={2}
                />
              </div>
              <span className='text-center text-[10px] font-medium leading-tight tracking-[0.04em] text-secondary xl:text-[11px]'>
                {FERMI_GUESSR_NAME}
              </span>
            </button>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}

/**
 * Subject categories sidebar - Left column
 */

'use client';

import {
  Calculator,
  FunctionSquare,
  Triangle,
  Atom,
  Zap,
  Infinity,
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
  'arithmetic',
  'algebra',
  'geometry',
  'number_theory',
  'shortcuts',
  'physics',
];

/** Selected pill fills only; icon stays white, caption is dark in light / white in dark. */
const categorySelectedPillBg: Record<HighLevelCategory, string> = {
  arithmetic: 'bg-primary dark:bg-primary/35',
  algebra: 'bg-accent dark:bg-accent/35',
  geometry: 'bg-secondary dark:bg-secondary/35',
  number_theory: 'bg-biology dark:bg-biology/35',
  shortcuts: 'bg-advanced dark:bg-advanced/35',
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
  arithmetic: { label: 'Arithmetic', icon: Calculator },
  algebra: { label: 'Algebra', icon: FunctionSquare },
  geometry: { label: 'Geometry', icon: Triangle },
  number_theory: { label: 'Number Theory', icon: Infinity },
  shortcuts: { label: 'Shortcuts', icon: Zap },
  physics: { label: 'Physics', icon: Atom },
};

export function SubjectCategories({
  selectedCategory,
  onSelectCategory,
  onLaunchFermiGuessr,
}: SubjectCategoriesProps) {
  return (
    <aside className='scrollbar-hide hidden h-full min-h-0 w-20 shrink-0 flex-col overflow-hidden rounded-organic-xl bg-surface lg:flex xl:w-24'>
      <div className='scrollbar-hide flex min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden px-2 py-4'>
        <div className='flex w-full flex-col items-center space-y-5'>
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
                  'flex w-full flex-col items-center gap-1.5 px-1.5 transition-all',
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
                    'text-center text-[10px] font-medium leading-tight tracking-[0.06em]',
                    isSelected ? selectedLabelClasses : 'text-text-muted',
                  )}
                >
                  {config.label}
                </span>
              </button>
            );
          })}

          {onLaunchFermiGuessr && (
            <>
              <div className='my-1 h-px w-10 rounded-full bg-surface-mid' aria-hidden='true' />
              <button
                type='button'
                onClick={onLaunchFermiGuessr}
                className='group relative flex w-full flex-col items-center px-1.5 outline-none'
                title={`${FERMI_GUESSR_NAME} — daily estimation game`}
              >
                <div className='relative flex w-full flex-col items-center gap-1.5 rounded-organic-lg bg-surface-elevated px-1 py-2.5 transition-opacity duration-150 group-hover:opacity-90 group-active:opacity-80'>
                  <span className='absolute -right-0.5 -top-1 text-[7px] font-bold uppercase tracking-[0.1em] text-error'>
                    New
                  </span>
                  <div className='flex h-11 w-11 items-center justify-center xl:h-12 xl:w-12'>
                    <FermiGuessrIcon className='h-6 w-6 text-secondary xl:h-[1.65rem] xl:w-[1.65rem]' />
                  </div>
                  <span className='max-w-full text-center text-[9px] font-bold leading-tight tracking-[0.04em] text-secondary xl:text-[10px]'>
                    {FERMI_GUESSR_NAME}
                  </span>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

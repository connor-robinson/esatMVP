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

interface SubjectCategoriesProps {
  selectedCategory: HighLevelCategory | null;
  onSelectCategory: (category: HighLevelCategory) => void;
}

const SIDEBAR_CATEGORY_ORDER: HighLevelCategory[] = [
  'arithmetic',
  'algebra',
  'geometry',
  'number_theory',
  'shortcuts',
  'trigonometry',
  'physics',
];

/** Selected pill fills only; icon stays white, caption is dark in light / white in dark. */
const categorySelectedPillBg: Record<HighLevelCategory, string> = {
  arithmetic: 'bg-primary dark:bg-primary/35',
  algebra: 'bg-accent dark:bg-accent/35',
  geometry: 'bg-secondary dark:bg-secondary/35',
  number_theory: 'bg-biology dark:bg-biology/35',
  shortcuts: 'bg-advanced dark:bg-advanced/35',
  trigonometry: 'bg-chemistry dark:bg-chemistry/35',
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
  trigonometry: { label: 'Trigonometry', icon: Triangle },
  physics: { label: 'Physics', icon: Atom },
};

export function SubjectCategories({
  selectedCategory,
  onSelectCategory,
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
        </div>
      </div>
    </aside>
  );
}

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

/** Selected chip — existing palette colors only; same light-tint / dark-ink vs solid / light-ink pattern as drill difficulty pills. */
const categorySelectedChip: Record<HighLevelCategory, string> = {
  arithmetic:
    'bg-primary text-surface shadow-sm dark:bg-primary/35 dark:text-background',
  algebra: 'bg-accent text-surface shadow-sm dark:bg-accent/35 dark:text-background',
  geometry:
    'bg-secondary text-surface shadow-sm dark:bg-secondary/35 dark:text-background',
  number_theory:
    'bg-biology text-surface shadow-sm dark:bg-biology/35 dark:text-background',
  shortcuts:
    'bg-advanced text-surface shadow-sm dark:bg-advanced/35 dark:text-background',
  trigonometry:
    'bg-chemistry text-surface shadow-sm dark:bg-chemistry/35 dark:text-background',
  physics: 'bg-physics text-surface shadow-sm dark:bg-physics/35 dark:text-background',
};

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
                    'flex h-12 w-12 items-center justify-center rounded-organic-lg transition-all xl:h-14 xl:w-14',
                    isSelected
                      ? categorySelectedChip[category]
                      : 'bg-surface-mid text-text-muted',
                  )}
                >
                  <Icon className='h-5 w-5 xl:h-6 xl:w-6' strokeWidth={isSelected ? 2.25 : 2} />
                </div>
                <span
                  className={cn(
                    'text-center text-[10px] font-medium leading-tight tracking-[0.06em]',
                    isSelected ? 'text-text' : 'text-text-muted',
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

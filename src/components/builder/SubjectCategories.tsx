/**
 * Subject categories sidebar - Left column
 */

'use client';

import {
  Calculator,
  FunctionSquare,
  Triangle,
  BarChart3,
  Atom,
  Zap,
  Infinity,
} from 'lucide-react';
import { TopicCategory } from '@/types/core';
import { cn } from '@/lib/utils';

type HighLevelCategory =
  | 'arithmetic'
  | 'algebra'
  | 'geometry'
  | 'number_theory'
  | 'shortcuts'
  | 'trigonometry'
  | 'physics'
  | 'other';

interface SubjectCategoriesProps {
  selectedCategory: HighLevelCategory | null;
  onSelectCategory: (category: HighLevelCategory) => void;
}

/** Selected capsule fills — Tailwind semantic colors from theme tokens. */
const categorySelectedClasses: Record<HighLevelCategory, string> = {
  arithmetic: 'bg-accent text-background shadow-md shadow-accent/20',
  algebra: 'bg-maths text-background shadow-md shadow-maths/20',
  geometry: 'bg-biology text-background shadow-md shadow-biology/25',
  number_theory: 'bg-advanced text-background shadow-md shadow-advanced/25',
  shortcuts: 'bg-secondary text-background shadow-md shadow-secondary/25',
  trigonometry: 'bg-chemistry text-background shadow-md shadow-chemistry/25',
  physics: 'bg-physics text-background shadow-md shadow-physics/25',
  other: 'bg-primary text-background shadow-md shadow-primary/25',
};

const categoryConfig: Record<
  HighLevelCategory,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  arithmetic: { label: 'Arithmetic', icon: Calculator },
  algebra: { label: 'Algebra', icon: FunctionSquare },
  geometry: { label: 'Geometry', icon: Triangle },
  number_theory: { label: 'Number Theory', icon: Infinity },
  shortcuts: { label: 'Shortcuts', icon: Zap },
  trigonometry: { label: 'Trigonometry', icon: Triangle },
  physics: { label: 'Physics', icon: Atom },
  other: { label: 'Other', icon: BarChart3 },
};

export function SubjectCategories({
  selectedCategory,
  onSelectCategory,
}: SubjectCategoriesProps) {
  return (
    <aside className='hidden h-full min-h-0 w-20 shrink-0 flex-col overflow-hidden rounded-organic-xl border border-border bg-surface lg:flex xl:w-24'>
      <div className='flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-2 py-4'>
        <div className='space-y-5'>
          {(Object.keys(categoryConfig) as HighLevelCategory[]).map(
            (category) => {
              const config = categoryConfig[category];
              const Icon = config.icon;
              const isSelected = selectedCategory === category;

              return (
                <button
                  key={category}
                  onClick={() => onSelectCategory(category)}
                  className={cn(
                    'flex w-full flex-col items-center gap-1.5 px-1.5 transition-all',
                    !isSelected && 'opacity-60 hover:opacity-100',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-organic-lg border border-border-subtle transition-all xl:h-14 xl:w-14',
                      isSelected
                        ? cn(
                            categorySelectedClasses[category],
                            'border-transparent',
                          )
                        : 'bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text',
                    )}
                  >
                    <Icon className='h-5 w-5 xl:h-6 xl:w-6' />
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
            },
          )}
        </div>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HighLevelCategory } from "@/components/builder/TopicFolders";
import {
  ANALYTICS_CATEGORY_LABELS,
  ANALYTICS_CATEGORY_ORDER,
  categoryFilterValue,
  getAnalyticsFilterLabel,
  getDisplayFoldersGroupedByCategory,
  isCategoryFilter,
  parseCategoryFromFilter,
} from "@/lib/display-folder-registry";

const triggerClass =
  "flex min-w-[148px] max-w-[220px] items-center gap-2 rounded-organic-md bg-surface-dark py-2.5 pl-3 pr-9 text-left text-xs font-medium text-text outline-none transition-colors hover:opacity-90 focus:outline-none focus-visible:outline-none dark:bg-surface-neutral sm:text-sm";

interface AnalyticsTopicFilterProps {
  value: string;
  onChange: (value: string) => void;
  /** Folder ids the user has practiced (from session history). */
  practicedFolderIds: string[];
  className?: string;
  "aria-label"?: string;
}

export function AnalyticsTopicFilter({
  value,
  onChange,
  practicedFolderIds,
  className,
  "aria-label": ariaLabel = "Filter by topic",
}: AnalyticsTopicFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<HighLevelCategory | null>(
    null,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const practicedSet = useMemo(
    () => new Set(practicedFolderIds),
    [practicedFolderIds],
  );

  const grouped = useMemo(() => getDisplayFoldersGroupedByCategory(), []);

  const categoriesWithPractice = useMemo(() => {
    return ANALYTICS_CATEGORY_ORDER.filter((cat) =>
      grouped[cat].some((f) => practicedSet.has(f.id)),
    );
  }, [grouped, practicedSet]);

  const selectedCategoryFromValue = parseCategoryFromFilter(value);
  const selectedFolderCategory = useMemo((): HighLevelCategory | null => {
    if (value === "all" || isCategoryFilter(value)) return null;
    for (const cat of ANALYTICS_CATEGORY_ORDER) {
      if (grouped[cat].some((f) => f.id === value)) return cat;
    }
    return null;
  }, [value, grouped]);

  const highlightedCategory =
    activeCategory ??
    selectedCategoryFromValue ??
    selectedFolderCategory ??
    categoriesWithPractice[0] ??
    ANALYTICS_CATEGORY_ORDER[0];

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    type SearchHit =
      | {
          kind: "category";
          value: string;
          label: string;
          practiced: boolean;
        }
      | {
          kind: "folder";
          folderId: string;
          folderName: string;
          categoryLabel: string;
          practiced: boolean;
        };

    const results: SearchHit[] = [];

    for (const cat of ANALYTICS_CATEGORY_ORDER) {
      const catLabel = ANALYTICS_CATEGORY_LABELS[cat];
      const catPracticed = grouped[cat].some((f) => practicedSet.has(f.id));

      if (catLabel.toLowerCase().includes(q)) {
        results.push({
          kind: "category",
          value: categoryFilterValue(cat),
          label: `All ${catLabel}`,
          practiced: catPracticed,
        });
      }

      for (const folder of grouped[cat]) {
        if (folder.name.toLowerCase().includes(q)) {
          results.push({
            kind: "folder",
            folderId: folder.id,
            folderName: folder.name,
            categoryLabel: catLabel,
            practiced: practicedSet.has(folder.id),
          });
        }
      }
    }

    return results;
  }, [searchQuery, grouped, practicedSet]);

  const foldersInView = useMemo(() => {
    const folders = grouped[highlightedCategory] ?? [];
    return folders.filter((f) => practicedSet.has(f.id));
  }, [grouped, highlightedCategory, practicedSet]);

  const handleSelect = (next: string) => {
    onChange(next);
    setIsOpen(false);
    setSearchQuery("");
  };

  useEffect(() => {
    if (!isOpen) return;
    const cat =
      parseCategoryFromFilter(value) ?? selectedFolderCategory ?? null;
    if (cat) setActiveCategory(cat);
    const t = window.setTimeout(() => searchRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [isOpen, value, selectedFolderCategory]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const isSearchMode = searchQuery.trim().length > 0;

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={triggerClass}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">{getAnalyticsFilterLabel(value)}</span>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Close topic filter"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              ref={panelRef}
              role="listbox"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full z-50 mt-2 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-organic-lg bg-surface-elevated shadow-xl sm:w-[26rem]"
            >
              <div className="bg-surface-mid/60 px-3 py-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    ref={searchRef}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search topics or categories…"
                    className="w-full rounded-organic-md bg-surface-dark py-2 pl-9 pr-9 text-sm text-text placeholder:text-text-muted outline-none focus:outline-none dark:bg-surface-neutral"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-organic-sm p-1 text-text-muted hover:bg-surface-dark hover:text-text"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {isSearchMode ? (
                <div className="max-h-[min(50vh,320px)] overflow-y-auto p-2">
                  {searchResults.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-text-muted">
                      No matches
                    </p>
                  ) : (
                    <ul className="space-y-0.5">
                      {searchResults.map((row, i) =>
                        row.kind === "category" ? (
                          <li key={`cat-${row.value}`}>
                            <button
                              type="button"
                              disabled={!row.practiced}
                              onClick={() => handleSelect(row.value)}
                              className={cn(
                                "flex w-full flex-col rounded-organic-md px-3 py-2 text-left transition-colors",
                                value === row.value
                                  ? "bg-primary/15 text-text"
                                  : row.practiced
                                    ? "text-text hover:bg-surface-mid"
                                    : "cursor-not-allowed text-text-muted opacity-50",
                              )}
                            >
                              <span className="text-sm font-medium">
                                {row.label}
                              </span>
                              <span className="text-xs text-text-muted">
                                Whole category
                              </span>
                            </button>
                          </li>
                        ) : (
                          <li key={`folder-${row.folderId}-${i}`}>
                            <button
                              type="button"
                              disabled={!row.practiced}
                              onClick={() => handleSelect(row.folderId)}
                              className={cn(
                                "flex w-full flex-col rounded-organic-md px-3 py-2 text-left transition-colors",
                                value === row.folderId
                                  ? "bg-primary/15 text-text"
                                  : row.practiced
                                    ? "text-text hover:bg-surface-mid"
                                    : "cursor-not-allowed text-text-muted opacity-50",
                              )}
                            >
                              <span className="text-sm font-medium">
                                {row.folderName}
                              </span>
                              <span className="text-xs text-text-muted">
                                {row.categoryLabel}
                                {!row.practiced && " · not practiced yet"}
                              </span>
                            </button>
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="flex max-h-[min(52vh,340px)]">
                  <nav
                    className="flex w-[9.5rem] shrink-0 flex-col gap-0.5 overflow-y-auto bg-surface-mid/40 p-2 sm:w-[10.5rem]"
                    aria-label="Categories"
                  >
                    <CategoryNavItem
                      label="All topics"
                      selected={value === "all"}
                      onClick={() => handleSelect("all")}
                    />
                    <div className="my-1.5 h-px bg-surface-dark/80" />
                    {ANALYTICS_CATEGORY_ORDER.map((cat) => {
                      const practicedCount = grouped[cat].filter((f) =>
                        practicedSet.has(f.id),
                      ).length;
                      const catValue = categoryFilterValue(cat);
                      return (
                        <CategoryNavItem
                          key={cat}
                          label={ANALYTICS_CATEGORY_LABELS[cat]}
                          selected={value === catValue}
                          active={
                            highlightedCategory === cat && value !== catValue
                          }
                          sublabel={
                            practicedCount > 0
                              ? `${practicedCount}`
                              : undefined
                          }
                          muted={practicedCount === 0}
                          onClick={() => setActiveCategory(cat)}
                        />
                      );
                    })}
                  </nav>

                  <div className="min-w-0 flex-1 overflow-y-auto p-2">
                    <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      {ANALYTICS_CATEGORY_LABELS[highlightedCategory]}
                    </p>
                    {(() => {
                      const catValue = categoryFilterValue(highlightedCategory);
                      const catPracticed = grouped[highlightedCategory].some(
                        (f) => practicedSet.has(f.id),
                      );
                      return (
                        <ul className="space-y-0.5">
                          <li>
                            <FolderRow
                              name={`All ${ANALYTICS_CATEGORY_LABELS[highlightedCategory]}`}
                              selected={value === catValue}
                              disabled={!catPracticed}
                              subtle
                              onClick={() => handleSelect(catValue)}
                            />
                          </li>
                          {foldersInView.length > 0 && (
                            <li className="my-2 h-px bg-surface-mid" aria-hidden />
                          )}
                          {foldersInView.length === 0 ? (
                            <li className="px-2 py-4 text-center text-sm text-text-muted">
                              No sessions in this category yet
                            </li>
                          ) : (
                            foldersInView.map((folder) => (
                              <li key={folder.id}>
                                <FolderRow
                                  name={folder.name}
                                  selected={value === folder.id}
                                  onClick={() => handleSelect(folder.id)}
                                />
                              </li>
                            ))
                          )}
                        </ul>
                      );
                    })()}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryNavItem({
  label,
  selected,
  active,
  onClick,
  sublabel,
  muted,
}: {
  label: string;
  selected: boolean;
  active?: boolean;
  onClick: () => void;
  sublabel?: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-organic-md px-2.5 py-2 text-left text-sm transition-colors",
        selected || active
          ? "bg-surface-dark font-medium text-text dark:bg-surface-neutral"
          : muted
            ? "text-text-muted hover:bg-surface-mid/80"
            : "text-text hover:bg-surface-mid/80",
      )}
    >
      <span className="truncate">{label}</span>
      {sublabel != null && (
        <span
          className={cn(
            "shrink-0 rounded-organic-sm px-1.5 py-0.5 text-[10px] tabular-nums",
            selected
              ? "bg-primary/20 text-primary"
              : "bg-surface-dark text-text-muted",
          )}
        >
          {sublabel}
        </span>
      )}
    </button>
  );
}

function FolderRow({
  name,
  selected,
  onClick,
  disabled,
  subtle,
}: {
  name: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-organic-md px-3 py-2 text-left text-sm transition-colors",
        selected
          ? "bg-primary/15 font-medium text-text"
          : disabled
            ? "cursor-not-allowed text-text-muted opacity-50"
            : subtle
              ? "text-text hover:bg-surface-mid"
              : "text-text hover:bg-surface-mid",
      )}
    >
      <span className="truncate">{name}</span>
      {selected && (
        <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      )}
    </button>
  );
}

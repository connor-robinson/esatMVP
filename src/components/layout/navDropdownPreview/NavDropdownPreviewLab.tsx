"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type MouseEvent,
} from "react";
import {
  ArrowLeftRight,
  BarChart3,
  ChevronDown,
  GraduationCap,
  HelpCircle,
  Home,
  Library,
  Map,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { FermiGuessrIcon } from "@/components/icons/FermiGuessrIcon";
import { FERMI_GUESSR_NAME } from "@/config/fermiGuessr";
import { cn } from "@/lib/utils";

type PreviewIcon = LucideIcon | ComponentType<LucideProps>;

type PreviewItem = {
  label: string;
  description?: string;
  icon: PreviewIcon;
  badge?: string;
  active?: boolean;
};

type PreviewGroup = {
  title?: string;
  items: PreviewItem[];
};

type VariantId = "current" | "quiet" | "ruled" | "inline";

const SAMPLE_GROUPS: PreviewGroup[] = [
  {
    items: [
      {
        label: "Drill",
        description: "Start a practice session",
        icon: Zap,
        active: true,
      },
      {
        label: "Analytics",
        description: "Track your progress",
        icon: BarChart3,
      },
      {
        label: "Leaderboard",
        description: "Compare with others",
        icon: Trophy,
      },
    ],
  },
  {
    title: FERMI_GUESSR_NAME,
    items: [
      {
        label: FERMI_GUESSR_NAME,
        description: "Daily estimation game",
        icon: FermiGuessrIcon,
        badge: "NEW",
      },
    ],
  },
];

const SAMPLE_FLAT: PreviewItem[] = [
  {
    label: "Roadmap",
    description: "Plan your prep",
    icon: Map,
    active: true,
  },
  {
    label: "Library",
    description: "Browse exam papers",
    icon: Library,
  },
  {
    label: "Analytics",
    description: "Review your results",
    icon: BarChart3,
  },
];

const SAMPLE_TOOLS: PreviewItem[] = [
  {
    label: "Calibration Test",
    description: "Diagnose your Math 1 weak spots",
    icon: Target,
    badge: "NEW",
    active: true,
  },
  {
    label: "Score Converter",
    description: "Convert raw scores to percentiles",
    icon: ArrowLeftRight,
  },
  {
    label: "FAQs",
    description: "ESAT guides and articles",
    icon: HelpCircle,
  },
  {
    label: "Tutorials",
    description: "Learn how to use the platform",
    icon: GraduationCap,
  },
];

const VARIANTS: {
  id: VariantId;
  name: string;
  summary: string;
  notes: string[];
}[] = [
  {
    id: "current",
    name: "Current",
    summary: "Colored icon tiles, accent bar, soft hover fills, larger radii.",
    notes: [
      "Icon sits in a tinted rounded square",
      "Top accent strip + hover/active washes",
      "organic-md / organic-lg corners",
    ],
  },
  {
    id: "quiet",
    name: "Quiet icons",
    summary:
      "Keep icons, drop the colored boxes and washes. Muted glyphs, tighter panel.",
    notes: [
      "No icon background, no accent bar",
      "Hover: text darkens only (no fill)",
      "8px panel radius, 4px item radius",
    ],
  },
  {
    id: "ruled",
    name: "Ruled rows",
    summary:
      "Hairline separators between items instead of hover cards. Icons stay monochrome.",
    notes: [
      "Items divided by 1px rules",
      "No hover highlight fill",
      "Active = small left mark + weight",
    ],
  },
  {
    id: "inline",
    name: "Inline compact",
    summary:
      "Densest option: icon + label on one line, description secondary, square-ish panel.",
    notes: [
      "Thinner icon stroke (1.5)",
      "Tighter padding, 6px outer radius",
      "Badge as plain muted text, not loud",
    ],
  },
];

function PreviewTrigger({
  label,
  open,
  onToggle,
  tone = "muted",
}: {
  label: string;
  open: boolean;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  tone?: "primary" | "accent" | "secondary" | "muted";
}) {
  const openTone =
    tone === "primary"
      ? "font-bold text-primary"
      : tone === "accent"
        ? "font-bold text-accent"
        : tone === "secondary"
          ? "font-bold text-secondary"
          : "font-semibold text-text";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex w-fit items-center gap-0.5 whitespace-nowrap px-2 py-1 text-[13px] uppercase tracking-[0.11em]",
        open ? openTone : "font-semibold text-text-muted hover:text-text",
      )}
      aria-expanded={open}
    >
      {label}
      <ChevronDown
        className={cn(
          "h-3 w-3 transition-transform duration-200",
          open && "rotate-180",
        )}
        aria-hidden
      />
    </button>
  );
}

function CurrentMenu({
  groups,
  items,
}: {
  groups?: PreviewGroup[];
  items?: PreviewItem[];
}) {
  const rows = groups ?? [{ items: items ?? [] }];
  return (
    <div className="min-w-[19rem] overflow-hidden rounded-b-[16px] rounded-t-none bg-surface-elevated shadow-modal-card">
      <div className="h-[3px] w-full bg-primary" aria-hidden />
      <div className="flex flex-col gap-1 p-2">
        {rows.map((group, groupIndex) => (
          <div
            key={group.title ?? `g-${groupIndex}`}
            className={cn(groupIndex > 0 && "mt-2 border-t border-border-subtle pt-2")}
          >
            {group.title ? (
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
                {group.title}
              </p>
            ) : null}
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-start gap-2.5 rounded-[10px] px-2 py-2.5",
                      item.active ? "bg-primary/10" : "hover:bg-surface-subtle/80",
                    )}
                  >
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/15">
                      <Icon className="h-4 w-4 text-primary" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1 pt-0.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 text-sm font-semibold leading-tight",
                          item.active ? "text-primary" : "text-text",
                        )}
                      >
                        {item.label}
                        {item.badge ? (
                          <span className="text-xs font-bold uppercase tracking-[0.08em] text-error">
                            {item.badge}
                          </span>
                        ) : null}
                      </span>
                      {item.description ? (
                        <span className="mt-0.5 block text-[11px] leading-snug text-text-muted">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuietMenu({
  groups,
  items,
}: {
  groups?: PreviewGroup[];
  items?: PreviewItem[];
}) {
  const rows = groups ?? [{ items: items ?? [] }];
  return (
    <div className="min-w-[17.5rem] overflow-hidden rounded-[8px] border border-border-subtle bg-surface-elevated shadow-sm">
      <div className="flex flex-col py-1.5">
        {rows.map((group, groupIndex) => (
          <div
            key={group.title ?? `g-${groupIndex}`}
            className={cn(groupIndex > 0 && "mt-1 border-t border-border-subtle pt-1")}
          >
            {group.title ? (
              <p className="mb-0.5 px-3 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted/80">
                {group.title}
              </p>
            ) : null}
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-[4px] px-3 py-2 text-left",
                    "hover:text-text",
                    item.active ? "text-text" : "text-text-muted",
                  )}
                >
                  <Icon
                    className="mt-0.5 h-[15px] w-[15px] shrink-0 text-text-muted"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-2 text-[13px] font-medium leading-tight text-text">
                      {item.label}
                      {item.badge ? (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                          {item.badge}
                        </span>
                      ) : null}
                    </span>
                    {item.description ? (
                      <span className="mt-0.5 block text-[11px] leading-snug text-text-muted">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function RuledMenu({
  groups,
  items,
}: {
  groups?: PreviewGroup[];
  items?: PreviewItem[];
}) {
  const rows = groups ?? [{ items: items ?? [] }];
  return (
    <div className="min-w-[17.5rem] overflow-hidden rounded-[8px] border border-border-subtle bg-surface-elevated shadow-sm">
      {rows.map((group, groupIndex) => (
        <div key={group.title ?? `g-${groupIndex}`}>
          {group.title ? (
            <p
              className={cn(
                "px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted",
                groupIndex > 0 && "border-t border-border-subtle",
              )}
            >
              {group.title}
            </p>
          ) : null}
          <ul className="m-0 list-none p-0">
            {group.items.map((item, itemIndex) => {
              const Icon = item.icon;
              const showRule =
                itemIndex > 0 || (groupIndex > 0 && !group.title && itemIndex === 0);
              return (
                <li
                  key={item.label}
                  className={cn(showRule && "border-t border-border-subtle")}
                >
                  <button
                    type="button"
                    className="relative flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-transparent"
                  >
                    {item.active ? (
                      <span
                        className="absolute bottom-2 left-0 top-2 w-px bg-text/55"
                        aria-hidden
                      />
                    ) : null}
                    <Icon
                      className="mt-0.5 h-[15px] w-[15px] shrink-0 text-text-muted"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 text-[13px] leading-tight text-text",
                          item.active ? "font-semibold" : "font-medium",
                        )}
                      >
                        {item.label}
                        {item.badge ? (
                          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-muted">
                            {item.badge}
                          </span>
                        ) : null}
                      </span>
                      {item.description ? (
                        <span className="mt-0.5 block text-[11px] leading-snug text-text-muted">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function InlineMenu({
  groups,
  items,
}: {
  groups?: PreviewGroup[];
  items?: PreviewItem[];
}) {
  const rows = groups ?? [{ items: items ?? [] }];
  return (
    <div className="min-w-[15.5rem] overflow-hidden rounded-[6px] border border-border-subtle bg-surface-elevated shadow-sm">
      <div className="py-1">
        {rows.map((group, groupIndex) => (
          <div
            key={group.title ?? `g-${groupIndex}`}
            className={cn(groupIndex > 0 && "mt-1 border-t border-border-subtle pt-1")}
          >
            {group.title ? (
              <p className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">
                {group.title}
              </p>
            ) : null}
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
                >
                  <Icon
                    className="h-3.5 w-3.5 shrink-0 text-text-muted"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          "truncate text-[13px] text-text",
                          item.active ? "font-semibold" : "font-medium",
                        )}
                      >
                        {item.label}
                      </span>
                      {item.badge ? (
                        <span className="shrink-0 text-[9px] font-medium uppercase tracking-[0.08em] text-text-muted">
                          {item.badge}
                        </span>
                      ) : null}
                    </span>
                    {item.description ? (
                      <span className="block truncate text-[10px] text-text-muted">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuForVariant({
  variant,
  groups,
  items,
}: {
  variant: VariantId;
  groups?: PreviewGroup[];
  items?: PreviewItem[];
}) {
  if (variant === "current") return <CurrentMenu groups={groups} items={items} />;
  if (variant === "quiet") return <QuietMenu groups={groups} items={items} />;
  if (variant === "ruled") return <RuledMenu groups={groups} items={items} />;
  return <InlineMenu groups={groups} items={items} />;
}

function PreviewDropdown({
  label,
  tone,
  variant,
  groups,
  items,
  defaultOpen = false,
}: {
  label: string;
  tone?: "primary" | "accent" | "secondary" | "muted";
  variant: VariantId;
  groups?: PreviewGroup[];
  items?: PreviewItem[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    // Attach after this tick so the opening click cannot immediately close.
    const timer = window.setTimeout(() => {
      document.addEventListener("click", onDoc);
    }, 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div
      ref={rootRef}
      className={cn("relative flex min-w-[15.5rem] flex-col", open && "z-[80]")}
    >
      <PreviewTrigger
        label={label}
        open={open}
        onToggle={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        tone={tone}
      />
      {/* In-flow panel so later variant cards cannot cover the menu. */}
      {open ? (
        <div id={menuId} className="relative z-[80] mt-2">
          <MenuForVariant variant={variant} groups={groups} items={items} />
        </div>
      ) : null}
    </div>
  );
}

function VariantCard({
  variant,
  children,
}: {
  variant: (typeof VARIANTS)[number];
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-visible rounded-[10px] border border-border-subtle bg-surface px-4 py-5 focus-within:z-[70] sm:px-5 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">{variant.name}</h2>
          <p className="mt-1 max-w-xl text-sm text-text-muted">{variant.summary}</p>
        </div>
        <code className="rounded bg-surface-mid px-2 py-1 text-[11px] text-text-muted">
          {variant.id}
        </code>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
        {variant.notes.map((note) => (
          <li key={note} className="before:mr-1.5 before:content-['·']">
            {note}
          </li>
        ))}
      </ul>
      <div className="mt-5 grid items-start gap-x-6 gap-y-8 border-t border-border-subtle pt-5 sm:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

export function NavDropdownPreviewLab() {
  const [focusVariant, setFocusVariant] = useState<VariantId | "all">("all");

  const visible =
    focusVariant === "all"
      ? VARIANTS
      : VARIANTS.filter((v) => v.id === focusVariant);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-16 pt-8 sm:pt-10">
      <Container size="xl" className="space-y-8">
        <header className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
            Dev preview
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Nav dropdown experiments
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Sandbox only. Live navbar is unchanged. Open each trigger to compare
            chrome: less highlight, tighter radius, clearer separation, quieter
            icons.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFocusVariant("all")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              focusVariant === "all"
                ? "bg-text text-background"
                : "bg-surface-elevated text-text-muted hover:text-text",
            )}
          >
            Show all
          </button>
          {VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setFocusVariant(v.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                focusVariant === v.id
                  ? "bg-text text-background"
                  : "bg-surface-elevated text-text-muted hover:text-text",
              )}
            >
              {v.name}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {visible.map((variant) => (
            <VariantCard key={variant.id} variant={variant}>
              <PreviewDropdown
                label="Mental Maths"
                tone="primary"
                variant={variant.id}
                groups={SAMPLE_GROUPS}
                defaultOpen={focusVariant === variant.id}
              />
              <PreviewDropdown
                label="Past Papers"
                tone="accent"
                variant={variant.id}
                items={SAMPLE_FLAT}
              />
              <PreviewDropdown
                label="Question Bank"
                tone="secondary"
                variant={variant.id}
                items={[
                  {
                    label: "Home",
                    description: "Overview and mixed practice",
                    icon: Home,
                    active: true,
                  },
                  {
                    label: "Analytics",
                    description: "Track your progress",
                    icon: BarChart3,
                  },
                ]}
              />
              <PreviewDropdown
                label="Exam Tools"
                tone="muted"
                variant={variant.id}
                items={SAMPLE_TOOLS}
              />
            </VariantCard>
          ))}
        </div>

        <aside className="rounded-[10px] border border-dashed border-border-subtle px-4 py-4 text-sm text-text-muted sm:px-5">
          <p className="font-medium text-text">Icon recommendation</p>
          <p className="mt-1 max-w-2xl">
            Keep Lucide icons, but drop the tinted rounded squares. Use one muted
            stroke color, slightly thinner weight (1.5–1.75), and let hierarchy
            come from typography and separators instead of colored tiles. That
            usually reads less “AI SaaS kit” while staying scannable.
          </p>
        </aside>
      </Container>
    </div>
  );
}

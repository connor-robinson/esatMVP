import Link from "next/link";
import { cn } from "@/lib/utils";
import { INDEPENDENT_DISCLAIMER, LAST_CHECKED, type SourceLink } from "@/lib/seo/config";
import type { SeoLink } from "@/lib/seo/links";

/** A titled content block. Every SEO page body is a stack of these. */
export function SeoSection({
  id,
  heading,
  lead,
  children,
  className,
}: {
  id?: string;
  heading?: string;
  lead?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      {heading ? (
        <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          {heading}
        </h2>
      ) : null}
      {lead ? (
        <p className="mt-4 text-lg leading-relaxed text-[#94A3B8]">{lead}</p>
      ) : null}
      {children ? <div className={cn(heading || lead ? "mt-6" : "")}>{children}</div> : null}
    </section>
  );
}

/** Body copy. Renders one paragraph per string so spacing stays consistent. */
export function SeoProse({
  paragraphs,
  className,
}: {
  paragraphs: readonly string[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="leading-relaxed text-[#94A3B8]">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function SeoSubheading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xl font-display font-bold text-white">{children}</h3>
  );
}

/** Inline internal link for use inside body copy. */
export function SeoTextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[#3B82F6]"
    >
      {children}
    </Link>
  );
}

/** Bulleted list with the dot marker used across the marketing pages. */
export function SeoList({
  items,
  className,
}: {
  items: readonly React.ReactNode[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]"
          />
          <span className="leading-relaxed text-[#94A3B8]">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export type InfoCard = {
  title: string;
  body: string;
};

export function InfoCardGrid({
  cards,
  columns = 2,
  className,
}: {
  cards: readonly InfoCard[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const columnClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div className={cn("grid gap-4", columnClass, className)}>
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-2xl bg-white/[0.04] p-5 transition-colors hover:bg-white/[0.06]"
        >
          <h3 className="font-bold text-white">{card.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
            {card.body}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Compact fact box — used for "the basic format" style summaries. */
export function SummaryBox({
  title,
  items,
  className,
}: {
  title?: string;
  items: readonly string[];
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-[#161D2F] p-6", className)}>
      {title ? (
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
          {title}
        </p>
      ) : null}
      <ul className={cn("grid gap-x-8 gap-y-2.5 sm:grid-cols-2", title ? "mt-4" : "")}>
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]"
            />
            <span className="text-sm leading-relaxed text-[#94A3B8]">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Emphasised aside — tips, warnings and transparency notes. */
export function HighlightBox({
  title,
  children,
  tone = "accent",
  className,
}: {
  title?: string;
  children: React.ReactNode;
  tone?: "accent" | "warning" | "neutral";
  className?: string;
}) {
  const tones = {
    accent: "bg-[#3B82F6]/10",
    warning: "bg-[#EAB308]/10",
    neutral: "bg-white/[0.04]",
  } as const;

  const titleTones = {
    accent: "text-[#93C5FD]",
    warning: "text-[#FDE68A]",
    neutral: "text-white",
  } as const;

  return (
    <div className={cn("rounded-2xl p-5", tones[tone], className)}>
      {title ? (
        <p className={cn("text-sm font-bold", titleTones[tone])}>{title}</p>
      ) : null}
      <div
        className={cn(
          "space-y-3 text-sm leading-relaxed text-[#94A3B8]",
          title ? "mt-2" : "",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Inline formula or expression. */
export function Expr({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.9em] text-white">
      {children}
    </span>
  );
}

/** Short worked example: the question, the fast route, and the takeaway. */
export function MiniExample({
  question,
  solution,
  point,
  className,
}: {
  question: React.ReactNode;
  solution: React.ReactNode;
  point: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-[#161D2F] p-6", className)}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
        Question
      </p>
      <p className="mt-3 leading-relaxed text-white">{question}</p>

      <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
        Solution
      </p>
      <p className="mt-3 leading-relaxed text-[#94A3B8]">{solution}</p>

      <p className="mt-6 rounded-xl bg-white/[0.04] p-4 text-sm leading-relaxed text-[#94A3B8]">
        <span className="font-bold text-white">The point: </span>
        {point}
      </p>
    </div>
  );
}

export function NumberedSteps({
  steps,
  className,
}: {
  steps: readonly string[];
  className?: string;
}) {
  return (
    <ol className={cn("space-y-3", className)}>
      {steps.map((step, index) => (
        <li key={step} className="flex items-start gap-4">
          <span
            aria-hidden
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3B82F6]/15 text-sm font-bold tabular-nums text-[#93C5FD]"
          >
            {index + 1}
          </span>
          <span className="leading-relaxed text-[#94A3B8]">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export type TimelineItem = {
  when: string;
  what: string;
};

export function TimelineSection({
  items,
  className,
}: {
  items: readonly TimelineItem[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <div key={item.when} className="rounded-2xl bg-white/[0.04] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3B82F6]">
            {item.when}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
            {item.what}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Horizontally scrolling data table. Bleeds to the screen edge on mobile so a
 * wide table stays readable without squashing the columns.
 */
export function ResponsiveTable({
  columns,
  rows,
  caption,
  className,
  minWidthClass = "min-w-[36rem]",
}: {
  columns: readonly string[];
  rows: readonly (readonly React.ReactNode[])[];
  caption?: string;
  className?: string;
  minWidthClass?: string;
}) {
  return (
    <figure className={cn("m-0", className)}>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className={cn("overflow-hidden rounded-2xl bg-white/[0.04]", minWidthClass)}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/[0.04]">
                {columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-[#93C5FD]"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 1 ? "bg-white/[0.02]" : undefined}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={cn(
                        "px-4 py-3.5 align-top leading-relaxed",
                        cellIndex === 0
                          ? "font-semibold text-white"
                          : "text-[#94A3B8]",
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {caption ? (
        <figcaption className="mt-3 text-sm text-[#94A3B8]">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

/** Visible verification date for pages carrying official dates or rules. */
export function LastCheckedNote({
  detail,
  className,
}: {
  detail?: string;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-[#94A3B8]", className)}>
      <span className="font-semibold text-white">
        Last checked against UAT-UK:{" "}
        <time dateTime={LAST_CHECKED.iso}>{LAST_CHECKED.label}</time>.
      </span>{" "}
      {detail ?? "Always confirm details on the official UAT-UK website before booking."}
    </p>
  );
}

export function IndependentDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-[#94A3B8]", className)}>
      {INDEPENDENT_DISCLAIMER}
    </p>
  );
}

export function SourceList({
  sources,
  className,
}: {
  sources: readonly SourceLink[];
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-white/[0.04] p-6", className)}>
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
        Sources
      </h2>
      <ul className="mt-4 space-y-2.5">
        {sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-sm text-[#94A3B8] underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-[#3B82F6]"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InternalLinks({
  links,
  heading = "Related guides",
  className,
}: {
  links: readonly SeoLink[];
  heading?: string;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="text-2xl font-display font-bold tracking-tight text-white">
        {heading}
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-2xl bg-white/[0.04] p-5 transition-colors hover:bg-white/[0.07]"
          >
            <p className="font-bold text-white">
              {link.label}
              <span
                aria-hidden
                className="ml-2 inline-block transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
              {link.blurb}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FaqItem } from "@/lib/seo/config";
import type { SeoLink } from "@/lib/seo/links";

/**
 * SEO copy blocks for the in-app tool pages. These use the product theme tokens
 * rather than the marketing palette, so they sit correctly around the existing
 * calibration and score-converter UI in both light and dark mode.
 */
export function AppSeoSection({
  heading,
  paragraphs,
  children,
  className,
}: {
  heading?: string;
  paragraphs?: readonly string[];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-organic-xl bg-surface-elevated p-6 sm:p-8", className)}>
      {heading ? (
        <h2 className="text-lg font-bold tracking-tight text-text sm:text-xl">
          {heading}
        </h2>
      ) : null}
      {paragraphs?.length ? (
        <div className={cn("space-y-3", heading ? "mt-3" : "")}>
          {paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-sm leading-relaxed text-text-muted sm:text-[15px]"
            >
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}
      {children ? <div className={heading || paragraphs ? "mt-5" : ""}>{children}</div> : null}
    </section>
  );
}

export function AppSeoList({
  items,
  ordered,
  className,
}: {
  items: readonly string[];
  ordered?: boolean;
  className?: string;
}) {
  const Tag = ordered ? "ol" : "ul";

  return (
    <Tag className={cn("space-y-2.5", className)}>
      {items.map((item, index) => (
        <li key={item} className="flex items-start gap-3">
          <span
            aria-hidden
            className={
              ordered
                ? "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold tabular-nums text-primary"
                : "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
            }
          >
            {ordered ? index + 1 : null}
          </span>
          <span className="text-sm leading-relaxed text-text-muted sm:text-[15px]">
            {item}
          </span>
        </li>
      ))}
    </Tag>
  );
}

/** Native-details FAQ so answers stay in the server-rendered HTML. */
export function AppSeoFaq({
  items,
  heading = "Frequently asked questions",
  lead,
  className,
}: {
  items: readonly FaqItem[];
  heading?: string;
  lead?: string;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-organic-xl bg-surface-elevated p-5 sm:p-6", className)}
    >
      <h2 className="text-lg font-bold tracking-tight text-text sm:text-xl">
        {heading}
      </h2>
      {lead ? <p className="mt-1.5 text-sm text-text-muted">{lead}</p> : null}

      <div className="mt-5 space-y-2">
        {items.map((item) => (
          <details
            key={item.question}
            className="group rounded-organic-lg bg-surface-mid/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
              <h3 className="text-sm font-medium text-text">{item.question}</h3>
              <ChevronDown
                aria-hidden
                className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-fast group-open:rotate-180"
              />
            </summary>
            <p className="px-4 pb-4 text-sm leading-relaxed text-text-muted">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function AppSeoRelatedLinks({
  links,
  heading = "Related guides",
  className,
}: {
  links: readonly SeoLink[];
  heading?: string;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-organic-xl bg-surface-elevated p-6 sm:p-8", className)}
    >
      <h2 className="text-lg font-bold tracking-tight text-text sm:text-xl">
        {heading}
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-organic-lg bg-surface-mid/40 p-4 transition-colors hover:bg-surface-subtle"
          >
            <p className="text-sm font-semibold text-text">
              {link.label}
              <span
                aria-hidden
                className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
              {link.blurb}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

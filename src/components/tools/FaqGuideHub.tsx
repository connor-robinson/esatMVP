import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { FAQ_GUIDE_SECTIONS, SEO_LINKS } from "@/lib/seo/links";

export function FaqGuideHub() {
  return (
    <Container size="md" className="py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Exam Tools
        </p>
        <h1 className="mt-3 text-3xl font-display font-bold tracking-tight text-text sm:text-4xl">
          ESAT guides
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted sm:text-base">
          Short articles on dates, modules, past papers, scoring and test-day
          rules. Pick a topic below.
        </p>
      </header>

      <nav
        aria-label="Guide categories"
        className="mt-8 flex flex-wrap gap-2"
      >
        {FAQ_GUIDE_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-organic-md bg-surface-mid px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-subtle hover:text-text"
          >
            {section.title}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-10">
        {FAQ_GUIDE_SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24"
          >
            <div className="mb-4">
              <h2 className="text-lg font-bold tracking-tight text-text sm:text-xl">
                {section.title}
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                {section.description}
              </p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {section.keys.map((key) => {
                const guide = SEO_LINKS[key];
                return (
                  <li key={guide.href}>
                    <Link
                      href={guide.href}
                      className="group flex h-full flex-col rounded-organic-lg bg-surface-elevated p-4 transition-colors hover:bg-surface-subtle sm:p-5"
                    >
                      <p className="text-sm font-semibold text-text">
                        {guide.label}
                        <span
                          aria-hidden
                          className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5"
                        >
                          →
                        </span>
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                        {guide.blurb}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Container>
  );
}

import { cn } from "@/lib/utils";
import { SeoCta, SeoCtaRow } from "@/components/seo/SeoCta";

/**
 * Routes out of the reading and into the product. Uses the shared SEO CTA so
 * clicks land in the same analytics event as every other marketing page.
 */
export function PastPaperCTA({
  heading,
  body,
  primary,
  secondary,
  placement,
  className,
}: {
  heading: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  placement: string;
  className?: string;
}) {
  return (
    <section className={cn("rounded-3xl bg-[#161D2F] p-6 sm:p-9", className)}>
      <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
        {heading}
      </h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-[#94A3B8]">{body}</p>
      <SeoCtaRow className="mt-7">
        <SeoCta href={primary.href} placement={placement}>
          {primary.label}
        </SeoCta>
        {secondary ? (
          <SeoCta
            href={secondary.href}
            variant="quiet"
            placement={`${placement}_secondary`}
          >
            {secondary.label}
          </SeoCta>
        ) : null}
      </SeoCtaRow>
    </section>
  );
}

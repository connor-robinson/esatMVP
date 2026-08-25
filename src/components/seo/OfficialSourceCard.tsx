import { cn } from "@/lib/utils";

type OfficialSourceCardProps = {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  className?: string;
};

/**
 * Link-out card for official Pearson / UAT-UK visuals we do not rehost.
 * Prefer this over scraping or permanently mirroring third-party photos.
 */
export function OfficialSourceCard({
  title,
  description,
  href,
  linkLabel,
  className,
}: OfficialSourceCardProps) {
  return (
    <figure
      className={cn(
        "m-0 rounded-2xl bg-[#161D2F] p-5 sm:p-6",
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
        Official source
      </p>
      <figcaption className="mt-3">
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
          {description}
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-medium text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[#3B82F6]"
        >
          {linkLabel}
        </a>
      </figcaption>
    </figure>
  );
}

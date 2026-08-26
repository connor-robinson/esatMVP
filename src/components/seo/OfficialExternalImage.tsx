import { cn } from "@/lib/utils";

type OfficialExternalImageProps = {
  src: string;
  alt: string;
  title: string;
  caption: string;
  href: string;
  linkLabel: string;
  className?: string;
};

/**
 * Displays an official third-party image via hotlink (not rehosted locally),
 * with a caption that links back to the original Pearson / UAT-UK source.
 */
export function OfficialExternalImage({
  src,
  alt,
  title,
  caption,
  href,
  linkLabel,
  className,
}: OfficialExternalImageProps) {
  return (
    <figure className={cn("m-0 overflow-hidden rounded-2xl bg-[#161D2F]", className)}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-white/[0.03]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- hotlink official Pearson assets; do not rehost */}
        <img
          src={src}
          alt={alt}
          className="mx-auto h-auto max-h-[28rem] w-full object-contain"
          loading="lazy"
          decoding="async"
        />
      </a>
      <figcaption className="space-y-2 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
          Official source
        </p>
        <p className="font-semibold text-white">{title}</p>
        <p className="text-sm leading-relaxed text-[#94A3B8]">{caption}</p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-medium text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[#3B82F6]"
        >
          {linkLabel}
        </a>
      </figcaption>
    </figure>
  );
}

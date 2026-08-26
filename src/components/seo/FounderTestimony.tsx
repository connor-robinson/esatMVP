import Image from "next/image";
import Link from "next/link";
import { ABOUT_PATH, FOUNDERS, type FounderKey } from "@/config/founders";
import { cn } from "@/lib/utils";

type FounderTestimonyProps = {
  founder: FounderKey;
  children: React.ReactNode;
  className?: string;
};

/**
 * Compact first-hand quote card with founder portrait.
 * Use for short ESAT sitting anecdotes attributed to a named founder.
 */
export function FounderTestimony({
  founder: founderKey,
  children,
  className,
}: FounderTestimonyProps) {
  const founder = FOUNDERS[founderKey];

  return (
    <aside
      className={cn("rounded-2xl bg-white/[0.04] p-5 sm:p-6", className)}
    >
      <div className="flex items-center gap-3.5">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#161D2F]">
          <Image
            src={founder.imageSrc}
            alt={founder.imageAlt}
            fill
            sizes="48px"
            className="object-cover"
            style={{ objectPosition: founder.imagePosition }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            <Link
              href={`${ABOUT_PATH}#${founder.id}`}
              className="transition-colors hover:text-[#93C5FD]"
            >
              {founder.name}
            </Link>
          </p>
          <p className="text-xs text-[#64748B]">{founder.credential}</p>
        </div>
      </div>
      <blockquote className="mt-4 space-y-3 text-sm leading-relaxed text-[#CBD5E1]">
        {children}
      </blockquote>
    </aside>
  );
}

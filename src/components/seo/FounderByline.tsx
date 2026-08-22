import Link from "next/link";
import { ABOUT_PATH, FOUNDERS, type FounderKey } from "@/config/founders";

type FounderBylineProps = {
  founder: FounderKey;
  attribution: "Written by" | "Reviewed by";
  className?: string;
};

/**
 * Shared founder attribution for future editorial author cards.
 * Only render this after the article's authorship or review has been verified.
 */
export function FounderByline({
  founder: founderKey,
  attribution,
  className,
}: FounderBylineProps) {
  const founder = FOUNDERS[founderKey];

  return (
    <p className={className}>
      {attribution}{" "}
      <Link
        href={`${ABOUT_PATH}#${founder.id}`}
        className="font-medium text-[#CBD5E1] transition-colors hover:text-[#3B82F6]"
      >
        {founder.name}
      </Link>
    </p>
  );
}

import Image from "next/image";
import { cn } from "@/lib/utils";

type Partner = {
  id: string;
  name: string;
  logoSrc: string;
  logoAlt: string;
  logoClassName: string;
};

const PARTNERS: Partner[] = [
  {
    id: "arkwright",
    name: "Arkwright Scholars",
    logoSrc: "/images/partners/arkwright.png",
    logoAlt: "Arkwright Engineering Scholarships",
    // Wide lockup: keep height modest so both cards match.
    logoClassName: "h-8 w-auto max-w-[9.25rem] sm:h-9 sm:max-w-[10rem]",
  },
  {
    id: "elephant",
    name: "The Elephant Group",
    logoSrc: "/images/partners/elephant-group.png",
    logoAlt: "The Elephant Group",
    // Tall lockup: constrain height to sit in the same card.
    logoClassName: "h-11 w-auto max-h-11 max-w-[3.25rem] sm:h-12 sm:max-h-12",
  },
];

/**
 * White partner cards in the founder strip: logos only, equal size.
 */
export function HomepagePartnerTrust({ className }: { className?: string }) {
  return (
    <div className={cn("min-w-0 text-left", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8] sm:text-xs">
        We partner with
      </p>
      <ul className="mt-3 grid w-full max-w-[22.5rem] grid-cols-2 gap-2.5 sm:gap-3">
        {PARTNERS.map((partner) => (
          <li key={partner.id} className="min-w-0">
            <div className="flex h-16 w-full items-center justify-center rounded-lg bg-white px-3 sm:h-[4.25rem] sm:px-3.5">
              <Image
                src={partner.logoSrc}
                alt={partner.logoAlt}
                width={220}
                height={80}
                className={cn("object-contain", partner.logoClassName)}
              />
              <span className="sr-only">{partner.name}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

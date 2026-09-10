import { Suspense } from "react";
import { HomepageHeroVariantsLab } from "@/components/home/HomepageHeroVariantsLab";

/**
 * Dev-only homepage hero A/B drafts.
 *
 *   /dev/homepage-heroes
 *   /dev/homepage-heroes?v=pace
 *   /dev/homepage-heroes?v=stat
 *   /dev/homepage-heroes?v=runout
 *   /dev/homepage-heroes?v=plain
 *   /dev/homepage-heroes?v=trust
 */
export default function HomepageHeroesDevPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0A0F1D] text-[#94A3B8]">
          Loading hero variants…
        </div>
      }
    >
      <HomepageHeroVariantsLab />
    </Suspense>
  );
}

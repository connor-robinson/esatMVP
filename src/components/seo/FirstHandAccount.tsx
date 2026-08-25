import { cn } from "@/lib/utils";
import {
  FIRST_HAND_SITTING_YEAR,
  LAST_CHECKED,
} from "@/lib/seo/config";

type FirstHandAccountProps = {
  className?: string;
};

/**
 * Compact provenance badge for first-hand ESAT test-centre pages.
 * Distinguishes 2025 sitting details from current official rules.
 */
export function FirstHandAccount({ className }: FirstHandAccountProps) {
  return (
    <aside
      className={cn(
        "rounded-2xl bg-white/[0.04] px-5 py-4 sm:px-6 sm:py-5",
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
        First-hand account
      </p>
      <p className="mt-2 text-sm font-semibold text-white">
        ESAT sat in {FIRST_HAND_SITTING_YEAR}
      </p>
      <p className="mt-1 text-sm text-[#94A3B8]">
        Pearson VUE, St Aldates, Oxford
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
        Official rules are checked against current UAT-UK guidance. Centre-specific
        details below are from my own sitting.
      </p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[#64748B]">First-hand sitting</dt>
          <dd className="font-medium text-[#CBD5E1]">{FIRST_HAND_SITTING_YEAR}</dd>
        </div>
        <div>
          <dt className="text-[#64748B]">Official rules last checked</dt>
          <dd className="font-medium text-[#CBD5E1]">
            <time dateTime={LAST_CHECKED.iso}>{LAST_CHECKED.label}</time>
          </dd>
        </div>
      </dl>
    </aside>
  );
}

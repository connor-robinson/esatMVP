import Link from "next/link";
import { APP_ROUTES, SEO_ROUTES } from "@/lib/seo/config";
import { SeoSection, SeoTextLink } from "@/components/seo/SeoSections";

export function PastPaperGuideContent() {
  return (
    <>
      <SeoSection heading="Which past papers should I use for ESAT?">
        <p className="text-[0.95rem] leading-relaxed text-[#94A3B8]">
          There are no published ESAT past papers yet. The closest free resources
          are ENGAA and NSAA papers, where UAT-UK marks questions that fall
          outside the current ESAT specification. Use ENGAA for Maths 1, Maths 2
          and Physics. Use NSAA when you also need Chemistry or Biology, or when
          you want Section 2 physics-style practice.
        </p>
      </SeoSection>

      <SeoSection heading="NSAA vs ESAT">
        <p className="text-[0.95rem] leading-relaxed text-[#94A3B8]">
          NSAA Section 1 covers maths, physics, chemistry and biology in one
          sitting. That makes it the only public source for chem and bio
          practice. Much of the maths and physics overlaps with the same
          year&apos;s ENGAA, so you usually should not grind both full Section 1
          papers from the same year.
        </p>
      </SeoSection>

      <SeoSection heading="ENGAA vs ESAT">
        <p className="text-[0.95rem] leading-relaxed text-[#94A3B8]">
          ENGAA Section 1 is the closest match for ESAT Maths 1, Maths 2 and
          Physics. Section 2 is useful for harder physics-style questions,
          especially from 2020 onwards where it overlaps NSAA Section 2. Skip
          anything flagged as out of spec in the PDF.
        </p>
      </SeoSection>

      <SeoSection heading="How should I use these papers?">
        <ul className="list-disc space-y-2 pl-5 text-[0.95rem] leading-relaxed text-[#94A3B8]">
          <li>Do at least one paper under timed conditions near the end of prep.</li>
          <li>Review every mistake with the answer key before moving on.</li>
          <li>
            Use the{" "}
            <SeoTextLink href={APP_ROUTES.scoreConverter}>
              score converter
            </SeoTextLink>{" "}
            to turn raw marks into scaled scores where conversion tables exist.
          </li>
          <li>
            For a deeper guide on overlap and module choice, see{" "}
            <SeoTextLink href={SEO_ROUTES.pastPapersGuide}>
              which ESAT past papers to use
            </SeoTextLink>
            .
          </li>
        </ul>
      </SeoSection>
    </>
  );
}

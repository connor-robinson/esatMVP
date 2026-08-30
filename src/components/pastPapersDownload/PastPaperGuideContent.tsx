import Link from "next/link";
import { APP_ROUTES, SEO_ROUTES } from "@/lib/seo/config";

export function PastPaperGuideContent() {
  return (
    <div className="space-y-8 border-t border-border/60 pt-10 text-sm leading-relaxed text-text-muted">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text">
          Which past papers should I use for ESAT?
        </h2>
        <p>
          There are no published ESAT past papers yet. The closest free resources
          are ENGAA and NSAA papers, where UAT-UK marks questions that fall
          outside the current ESAT specification. Use ENGAA for Maths 1, Maths 2
          and Physics. Use NSAA when you also need Chemistry or Biology, or when
          you want Section 2 physics-style practice.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text">NSAA vs ESAT</h2>
        <p>
          NSAA Section 1 covers maths, physics, chemistry and biology in one
          sitting. That makes it the only public source for chem and bio
          practice. Much of the maths and physics overlaps with the same
          year&apos;s ENGAA, so you usually should not grind both full Section 1
          papers from the same year.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text">ENGAA vs ESAT</h2>
        <p>
          ENGAA Section 1 is the closest match for ESAT Maths 1, Maths 2 and
          Physics. Section 2 is useful for harder physics-style questions,
          especially from 2020 onwards where it overlaps NSAA Section 2. Skip
          anything flagged as out of spec in the PDF.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text">
          How should I use these papers?
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Do at least one paper under timed conditions near the end of prep.</li>
          <li>Review every mistake with the answer key before moving on.</li>
          <li>
            Use the{" "}
            <Link
              href={APP_ROUTES.scoreConverter}
              className="text-maths underline-offset-4 hover:underline"
            >
              score converter
            </Link>{" "}
            to turn raw marks into scaled scores where conversion tables exist.
          </li>
          <li>
            For a deeper guide on overlap and module choice, see{" "}
            <Link
              href={SEO_ROUTES.pastPapersGuide}
              className="text-maths underline-offset-4 hover:underline"
            >
              ESAT past papers guide
            </Link>
            .
          </li>
        </ul>
      </section>
    </div>
  );
}

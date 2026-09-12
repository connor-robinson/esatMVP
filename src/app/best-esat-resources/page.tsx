import type { Metadata } from "next";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import { CALIBRATION_TOTAL_QUESTIONS } from "@/lib/calibration/constants";
import {
  APP_ROUTES,
  SEO_ROUTES,
  articleSchema,
  breadcrumbSchema,
  buildSeoMetadata,
  type FaqItem,
} from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import {
  COMPARISON_VERIFIED,
  ESAT_CAMP_SEASON_PASS_GBP_VERIFIED,
  PRIMARY_COMPARISON_SOURCE_LIST,
} from "@/data/bestEsatResourcesComparison";
import { formatGbpPrice, MONTHLY_PRICE_GBP } from "@/lib/stripe/best-value";
import { daysUntilOctoberEsat } from "@/components/seo/EsatOctoberCountdown";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { SeoCta, SeoCtaRow } from "@/components/seo/SeoCta";
import {
  PracticeLoopDiagram,
  ResourceComparisonTable,
} from "@/components/seo/BestEsatResourcesExtras";
import {
  HighlightBox,
  ResponsiveTable,
  SeoProse,
  SeoSection,
  SeoSubheading,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.bestEsatResources;

const TITLE =
  "Best ESAT Preparation Resources 2026: An Honest Comparison";
const DESCRIPTION =
  "We compared UAT-UK, ESAT Lab, ESAT Ninja, Lab45 and ESAT CAMP by price, questions, mocks and usefulness. Here's what each is actually best for.";

const H1 = "The Best ESAT Preparation Resources in 2026";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "best ESAT resources",
    "best ESAT preparation",
    "ESAT Ninja vs ESAT Lab",
    "ESAT Lab review",
    "ESAT Ninja review",
    "Lab45 review",
    "ESAT preparation websites",
    "free ESAT resources",
    "best ESAT question bank",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Is ESAT Lab better than ESAT Ninja?",
    answer:
      "They're quite different. ESAT Lab is attractive if you primarily want free additional practice. Ninja is a paid, more structured package containing tutorials, questions and mock material. Which is more useful depends on whether you need teaching or simply more questions.",
  },
  {
    question: "Is Lab45 worth £349?",
    answer:
      "If you value a very large question bank and can comfortably afford it, it has an impressive feature set. If you're sitting ESAT soon and mainly need additional question practice, considerably cheaper options exist.",
  },
  {
    question: "Do I need to pay for ESAT preparation?",
    answer:
      "No. UAT-UK explicitly provides free preparation material and says paid preparation isn't necessary. Paid platforms mainly provide convenience, more practice questions, analytics, explanations and additional mocks.",
  },
  {
    question: "Which ESAT resource is closest to the real test?",
    answer:
      "Start with UAT-UK's official specimen and practice material. It's the only material where you don't have to rely on a third party's judgement about what ESAT should feel like.",
  },
  {
    question: "What's the best ESAT question bank?",
    answer:
      "There isn't enough objective evidence to award one universal winner. Lab45 advertises the largest bank of the platforms compared here. ESAT Lab is compelling for free practice. ESAT Ninja combines its bank with teaching content. ESAT CAMP sits between them as a lower-cost all-in-one practice platform. Pick based on what you actually need.",
  },
];

const DISCLOSURE =
  "A quick disclosure: this comparison is published by ESAT CAMP, so we're obviously not neutral. Rather than pretending otherwise, we've linked to the other resources, used their current public pricing, and given them credit where we think they do something particularly well. Prices and features were checked on 11 September 2026.";

const MONTHLY_LABEL = formatGbpPrice(MONTHLY_PRICE_GBP);
const SEASON_LABEL = formatGbpPrice(ESAT_CAMP_SEASON_PASS_GBP_VERIFIED);
const QUESTION_LABEL = `${QUESTION_BANK_TOTAL_COUNT.toLocaleString()}+`;

export default function BestEsatResourcesPage() {
  const daysUntilOctober = daysUntilOctoberEsat();

  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Independent comparison · Updated 11 Sep 2026"
      title={H1}
      intro={[
        "There are now enough ESAT resources that choosing what to use can become a form of procrastination.",
        "You do not need five question banks, three sets of mocks and a folder full of half-finished past papers.",
        "You need three things: a reliable benchmark → enough targeted practice → realistic timed practice.",
        "So we compared the main ESAT resources by what they are actually useful for.",
      ]}
      primaryCta={{ href: "#comparison", label: "Compare resources" }}
      secondaryCta={{
        href: APP_ROUTES.calibration,
        label: "Take free calibration",
      }}
      faq={FAQ}
      faqHeading="FAQ"
      finalCta={{
        heading: "The simplest free starting point",
        body: `If you're still unsure which resource to use, don't buy anything yet. Take a short calibration, see where you're losing marks, and then decide what kind of practice you actually need. That's why our calibration test is free. About ${CALIBRATION_TOTAL_QUESTIONS} questions. Then you can decide what to do next.`,
        primary: {
          href: APP_ROUTES.calibration,
          label: "Find my weakest area",
        },
        secondary: {
          href: SEO_ROUTES.preparation,
          label: "ESAT preparation guide",
        },
      }}
      related={seoLinks(
        "preparation",
        "pastPapers",
        "pastPapersGuide",
        "drill",
        "scoreConverter",
        "questionBankGuide",
        "calibration",
        "goodScore",
      )}
      sources={PRIMARY_COMPARISON_SOURCE_LIST}
      showDisclaimer
      schema={[
        articleSchema({
          headline: H1,
          description: DESCRIPTION,
          path: PATH,
          datePublished: COMPARISON_VERIFIED.iso,
          dateModified: COMPARISON_VERIFIED.iso,
        }),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "ESAT preparation", path: SEO_ROUTES.preparation },
          { name: "Best ESAT resources", path: PATH },
        ]),
      ]}
    >
      <HighlightBox tone="neutral" title="Disclosure">
        <p>{DISCLOSURE}</p>
      </HighlightBox>

      <SeoSection
        id="comparison"
        heading="The short answer"
        lead="A quick view of what each resource is actually useful for."
      >
        <ResourceComparisonTable />
      </SeoSection>

      <SeoSection>
        <SeoProse
          paragraphs={[
            "There isn't one resource that is objectively best for everyone.",
            "And question count alone isn't a useful ranking. Five thousand mediocre questions would be worse than 500 excellent ones; equally, a beautiful dashboard is useless if you never review your mistakes.",
            "The more useful question is:",
          ]}
        />
        <p className="mt-4 text-xl font-display font-bold tracking-tight text-white sm:text-2xl">
          What is currently costing you marks?
        </p>
      </SeoSection>

      <SeoSection
        id="uat-uk"
        heading="1. Official UAT-UK materials"
        lead="Best for: establishing reality"
      >
        <SeoProse
          paragraphs={[
            "This should be your starting point.",
            "UAT-UK provides the ESAT specification, ESAT Guide, official specimen and practice tests, and historic ENGAA and NSAA papers free of charge. UAT-UK itself says candidates do not need paid preparation materials.",
            "That's important.",
            "Third-party resources, including ours, are interpretations of the ESAT.",
            "The official material is the reference point.",
          ]}
        />
        <div className="mt-6 space-y-4">
          <SeoSubheading>What we like</SeoSubheading>
          <SeoProse
            paragraphs={[
              "It's authoritative, free and gives you the closest available view of the real format.",
              "The official Pearson practice tests are particularly valuable because they also familiarize you with the actual test interface. UAT-UK says the specimen and practice questions are representative of the difficulty candidates may experience, while warning that practice performance should not be treated as a precise prediction of your eventual score.",
            ]}
          />
        </div>
        <div className="mt-6 space-y-4">
          <SeoSubheading>The limitation</SeoSubheading>
          <SeoProse
            paragraphs={[
              "There simply isn't unlimited official material.",
              "Once you've understood the format and used the historic papers properly, you may want fresh questions for drilling specific weaknesses without repeatedly seeing questions you remember.",
            ]}
          />
        </div>
        <p className="mt-6 text-sm leading-relaxed text-[#94A3B8]">
          <span className="font-semibold text-white">Verdict: </span>
          use it regardless of what else you choose.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">
          Official papers and how to use them:{" "}
          <SeoTextLink href={SEO_ROUTES.pastPapers}>ESAT past papers</SeoTextLink>
          {" · "}
          <SeoTextLink href={SEO_ROUTES.pastPapersGuide}>
            which past papers to use
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection
        id="esat-lab"
        heading="2. ESAT Lab"
        lead="Best for: getting lots of practice without immediately paying"
      >
        <SeoProse
          paragraphs={[
            "ESAT Lab has become one of the most commonly mentioned free ESAT resources among students.",
            "That's a very good reason to try it before buying anything.",
            "Recent student discussions are broadly positive about its usefulness, but there is one recurring theme: students often find it substantially harder than historic ENGAA/NSAA material. The creator has also said publicly that the average ESAT Lab question is intended to be somewhat harder than the real ESAT.",
            "That isn't necessarily bad.",
            "Hard practice can expose weaknesses quickly.",
            "But we would be careful about using a deliberately difficult third-party bank as your sole measure of how well prepared you are.",
            "If ESAT Lab gives you a frightening score after you were doing well on official material, it does not suddenly mean you've forgotten physics.",
          ]}
        />
        <div className="mt-6 space-y-4">
          <SeoSubheading>Our take</SeoSubheading>
          <SeoProse
            paragraphs={[
              "Use ESAT Lab for stretch practice.",
              "Use official material to keep your sense of difficulty calibrated.",
            ]}
          />
        </div>
        <p className="mt-6 text-sm leading-relaxed text-[#94A3B8]">
          <span className="font-semibold text-white">Verdict: </span>
          probably the first third-party resource we&apos;d try if your budget is
          £0.
        </p>
      </SeoSection>

      <SeoSection
        id="esat-ninja"
        heading="3. ESAT Ninja"
        lead="Best for: students who want teaching material as well as practice"
      >
        <SeoProse
          paragraphs={[
            "ESAT Ninja is one of the more established admissions-test platforms.",
            "Its ESAT product currently advertises:",
            "225 written tutorials, 1,100+ original practice questions, original mocks, past-paper access and progress tracking. Its complete package is currently listed at £149, with the question bank sold separately for £89.",
            "A free account currently includes introductory teaching material, 30 practice questions and access to the past papers.",
          ]}
        />
        <div className="mt-6 space-y-4">
          <SeoSubheading>What we like</SeoSubheading>
          <SeoProse
            paragraphs={[
              "The breadth.",
              "If you want something closer to a traditional course (learn the content, practise it, then sit mocks), Ninja makes sense.",
              "It also has a substantial historic-paper archive.",
            ]}
          />
        </div>
        <div className="mt-6 space-y-4">
          <SeoSubheading>The limitation</SeoSubheading>
          <SeoProse
            paragraphs={[
              "If you've already learned the syllabus at school and mainly want large amounts of fresh timed practice, you may be paying for teaching material you don't need.",
              "That's a personal decision rather than a flaw with the platform.",
            ]}
          />
        </div>
        <p className="mt-6 text-sm leading-relaxed text-[#94A3B8]">
          <span className="font-semibold text-white">Verdict: </span>
          strongest fit for someone who wants a structured course rather than just
          a practice engine.
        </p>
      </SeoSection>

      <SeoSection
        id="lab45"
        heading="4. Lab45"
        lead="Best for: question volume and a premium experience"
      >
        <SeoProse
          paragraphs={[
            "Lab45 is probably the most ambitious premium option currently available.",
            "Its question bank advertises 5,000+ questions, topic and difficulty filtering, worked solutions, recommended sessions and detailed progress tracking.",
            "That's a lot of material.",
            "It also offers lectures and eight mock exams in its larger package.",
          ]}
        />
        <div className="mt-6 space-y-4">
          <SeoSubheading>What we like</SeoSubheading>
          <SeoProse
            paragraphs={[
              "The product looks polished and the practice system is deep.",
              "If money isn't a major consideration and you want a very large pool of questions, Lab45 deserves to be considered.",
            ]}
          />
        </div>
        <div className="mt-6 space-y-4">
          <SeoSubheading>The limitation</SeoSubheading>
          <SeoProse
            paragraphs={[
              "Price.",
              "At the time of writing, one subject module starts at £249, the three-module question bank is £349, and the ESAT All Pass is £849.",
              "Recent student discussions reflect that trade-off fairly consistently: people speak positively about the platform, while price is the repeated objection.",
              "Whether £349–£849 makes sense depends entirely on your budget.",
              "For most students sitting the test in roughly a month, we'd think carefully before spending that much.",
            ]}
          />
        </div>
        <p className="mt-6 text-sm leading-relaxed text-[#94A3B8]">
          <span className="font-semibold text-white">Verdict: </span>
          powerful, but very difficult to justify if value for money matters to
          you.
        </p>
      </SeoSection>

      <SeoSection
        id="esat-camp"
        heading="5. ESAT CAMP"
        lead="Best for: getting the core practice tools in one place without a large upfront cost"
      >
        <SeoProse
          paragraphs={[
            "Now for the obvious conflict of interest.",
            "We built ESAT CAMP.",
            `So rather than telling you that we're "the best," here's what it currently has:`,
            `${QUESTION_LABEL} practice questions, original mocks, a past-paper simulator and roadmap, no-calculator practice, a free calibration test, score conversion and performance tracking.`,
            "You can try parts of it for free.",
            `Full access is currently ${MONTHLY_LABEL} for a month or ${SEASON_LABEL} once for access through the October exam season.`,
          ]}
        />
        <div className="mt-6 space-y-4">
          <SeoSubheading>Where we think ESAT CAMP makes sense</SeoSubheading>
          <SeoProse
            paragraphs={[
              "If you already know most of the school content and your problem is more like:",
              "What am I actually weak at?",
              "Where can I get more questions?",
              "How do I practise at ESAT pace?",
              "Which old papers should I actually use?",
              "then that's the problem we're trying to solve.",
              "We don't think you need to spend hundreds of pounds to do that.",
            ]}
          />
        </div>
        <div className="mt-6 space-y-4">
          <SeoSubheading>Where we aren&apos;t the obvious choice</SeoSubheading>
          <SeoProse
            paragraphs={[
              "If you specifically want a large video-teaching course, look carefully at Lab45 or Ninja.",
              "If you simply want free questions and don't care about having everything in one system, use the official material and try ESAT Lab first.",
              "We're comfortable saying that.",
            ]}
          />
        </div>
        <p className="mt-6 text-sm leading-relaxed text-[#94A3B8]">
          <span className="font-semibold text-white">Verdict: </span>
          try the free calibration first. If the platform helps you practise more
          effectively, then decide whether full access is worth it.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">
          Related on this site:{" "}
          <SeoTextLink href={SEO_ROUTES.preparation}>
            ESAT preparation guide
          </SeoTextLink>
          {" · "}
          <SeoTextLink href={SEO_ROUTES.noCalcPractice}>
            no-calculator practice
          </SeoTextLink>
          {" · "}
          <SeoTextLink href={APP_ROUTES.scoreConverter}>
            score converter
          </SeoTextLink>
          {" · "}
          <SeoTextLink href={SEO_ROUTES.questionBankGuide}>
            ESAT question bank explained
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <section className="rounded-3xl bg-[#161D2F] p-6 sm:p-9">
        <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          Not sure what you actually need?
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-[#94A3B8]">
          Find the part of the ESAT that&apos;s currently costing you marks before
          choosing another resource.
        </p>
        <SeoCtaRow className="mt-7">
          <SeoCta href={APP_ROUTES.calibration} placement="mid_calibration">
            Take the free calibration
          </SeoCta>
        </SeoCtaRow>
        <p className="mt-4 text-sm text-[#64748B]">
          Start free. Decide what to use afterwards.
        </p>
      </section>

      <SeoSection
        id="which-to-use"
        heading="So which ESAT resource should you actually use?"
        lead="This is the comparison we'd use ourselves:"
      >
        <ResponsiveTable
          columns={["If this sounds like you…", "Start with"]}
          minWidthClass="min-w-[28rem]"
          rows={[
            [
              "“I haven't really started yet.”",
              "Official UAT-UK guide + specimen test",
            ],
            [
              "“I have no budget.”",
              "UAT-UK + ESAT Lab + historic papers",
            ],
            [
              "“I need to relearn topics.”",
              "Ninja or Lab45 teaching material",
            ],
            [
              "“I know the content but need lots of practice.”",
              "ESAT CAMP / ESAT Lab / Lab45",
            ],
            [
              "“I want the biggest question bank possible.”",
              "Lab45",
            ],
            [
              "“I don't know what I'm weak at.”",
              <>
                A{" "}
                <SeoTextLink href={APP_ROUTES.calibration}>
                  free calibration test
                </SeoTextLink>{" "}
                first
              </>,
            ],
            [
              "“I've used all the old papers.”",
              "Move onto fresh question banks and original mocks",
            ],
            [
              "“The ESAT is close and I keep changing resources.”",
              "Stop changing resources. Pick one bank and start reviewing mistakes.",
            ],
          ]}
        />
        <p className="mt-5 leading-relaxed text-[#94A3B8]">
          That last one matters more than it sounds.
        </p>
      </SeoSection>

      <SeoSection
        id="resource-hopping"
        heading="The resource-hopping trap"
      >
        <SeoProse
          paragraphs={[
            "With the exam close, the biggest danger isn't choosing the second-best website.",
            "It's spending three evenings comparing websites instead of answering questions.",
            "A typical student does something like:",
            "ESAT Lab → Ninja → Reddit → another mock → another website → back to old past papers.",
            "It feels productive because you're thinking about ESAT all evening.",
            "But you've done 12 questions.",
            "A better system is:",
          ]}
        />
        <div className="mt-6 rounded-2xl bg-white/[0.04] p-5 sm:p-7">
          <PracticeLoopDiagram />
        </div>
        <p className="mt-6 leading-relaxed text-[#94A3B8]">
          Repeat that.
        </p>
        <p className="mt-4 leading-relaxed text-[#94A3B8]">
          The platform matters much less than whether you&apos;re actually
          completing this loop.
        </p>
      </SeoSection>

      <SeoSection
        id="thirty-days"
        heading="What we'd do with 30 days left"
      >
        {daysUntilOctober > 0 ? (
          <p className="mb-4 text-sm text-[#64748B]">
            {daysUntilOctober === 1
              ? "1 day until the first October ESAT sitting (12 October 2026)."
              : `${daysUntilOctober} days until the first October ESAT sitting (12 October 2026).`}
          </p>
        ) : null}
        <SeoProse
          paragraphs={[
            "Don't try to finish the internet.",
            "First, use official material to establish your current level.",
            "Then identify whether your limiting factor is knowledge, speed, careless errors or unfamiliar problem solving.",
            "Use one main question bank to attack that weakness.",
            "Keep some realistic timed material unused for the final couple of weeks.",
            "And when a third-party score looks unexpectedly brilliant, or catastrophically bad, check it against official material before changing your entire preparation plan.",
            "That's especially important because students currently report noticeably different difficulty between different third-party resources.",
          ]}
        />
      </SeoSection>

      <SeoSection id="methodology" heading="Methodology">
        <SeoProse
          paragraphs={[
            "We checked public product pages and prices on 11 September 2026, compared publicly listed features, reviewed official UAT-UK guidance and looked at recent student discussions to identify common strengths and complaints.",
            `We haven't given numerical "quality scores" because there isn't a defensible dataset that would let us claim, for example, that one company's questions are 8.7/10 and another's are 7.9/10.`,
            "Where something is subjective, we've tried to say so.",
          ]}
        />
        <p className="mt-4 text-sm leading-relaxed text-[#64748B]">
          Primary sources are linked below. Community discussion was used only to
          label common sentiment, not as a substitute for product pages.
        </p>
      </SeoSection>

    </SeoPageLayout>
  );
}

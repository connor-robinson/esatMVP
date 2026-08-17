import type { Metadata } from "next";
import {
  APP_ROUTES,
  SEO_ROUTES,
  SOURCES,
  articleSchema,
  buildSeoMetadata,
  type FaqItem,
} from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import {
  ResponsiveTable,
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";
import {
  OXFORD_COMPETITION_ROWS,
  OXFORD_COURSE_ROWS,
} from "@/lib/seo/universityRequirements";

const PATH = SEO_ROUTES.oxfordRequirements;

const TITLE =
  "Oxford ESAT Requirements 2027: Courses, Modules & Entry Requirements";
const DESCRIPTION =
  "Oxford ESAT 2027 modules for Engineering Science, Physics, Physics and Philosophy and Biomedical Sciences, plus published course competition.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "Oxford ESAT",
    "Oxford ESAT requirements",
    "Oxford Engineering ESAT",
    "Oxford Physics ESAT",
    "ESAT Oxford 2027",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Which Oxford courses use ESAT?",
    answer:
      "Engineering Science, Physics, Physics and Philosophy, and Biomedical Sciences. Standard undergraduate applicants with the 15 October UCAS deadline must use the October sitting.",
  },
  {
    question: "What modules does Oxford Engineering require?",
    answer: "Mathematics 1, Mathematics 2 and Physics.",
  },
  {
    question: "What modules does Oxford Physics require?",
    answer:
      "Mathematics 1, Mathematics 2 and Physics. Physics and Philosophy uses the same three modules.",
  },
  {
    question: "Is there an Oxford ESAT cut-off?",
    answer:
      "Oxford does not publish a mark that guarantees shortlisting. Engineering Science says it assesses education and qualification history, application materials, predicted grades, ESAT and interviews together.",
  },
  {
    question: "Does Oxford publish college-level ESAT data?",
    answer:
      "Oxford has not published a college-by-college ESAT score table. Older Physics admissions reports are about the PAT, which ESAT replaced.",
  },
];

export default function OxfordEsatRequirementsPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Oxford"
      title="Oxford ESAT Requirements 2027"
      intro={[
        "Oxford uses ESAT for several science and engineering courses. Standard applicants with the 15 October UCAS deadline must take the October sitting.",
      ]}
      lastChecked
      primaryCta={{ href: APP_ROUTES.calibration, label: "Start free calibration" }}
      secondaryCta={{
        href: SEO_ROUTES.universityRequirements,
        label: "All university requirements",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Same modules as Cambridge Engineering, different process",
        body: "Engineering and Physics both use Maths 1, Maths 2 and Physics. Biomedical Sciences uses Maths 1 plus two science modules. Practise those papers, then use the score converter as an estimate only.",
        primary: { href: SEO_ROUTES.maths2, label: "Maths 2 guide" },
        secondary: { href: APP_ROUTES.scoreConverter, label: "Score converter" },
      }}
      related={seoLinks(
        "universityRequirements",
        "cambridgeRequirements",
        "imperialRequirements",
        "uclRequirements",
        "maths1",
        "maths2",
        "physics",
        "testDates",
      )}
      sources={[
        SOURCES.oxfordAdmissionsTests,
        SOURCES.oxfordEngineering,
        SOURCES.oxfordPhysics,
        SOURCES.oxfordPhysicsPhilosophy,
        SOURCES.oxfordBiomedical,
        SOURCES.oxfordPhysicsAdmissions,
        SOURCES.oxfordPhysicsEsat,
        SOURCES.oxfordEngineeringEsat,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "Oxford ESAT Requirements 2027",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="Required ESAT modules">
        <ResponsiveTable
          columns={["Course", "Required modules"]}
          rows={OXFORD_COURSE_ROWS}
        />
      </SeoSection>

      <SeoSection heading="What ESAT score do you need for Oxford?">
        <SeoProse
          paragraphs={[
            "Oxford does not publish an ESAT cut-off. The course statistics below show how competitive the courses are, not a required module score.",
          ]}
        />
        <ResponsiveTable
          className="mt-6"
          columns={[
            "Course",
            "Interviewed",
            "Successful",
            "Intake",
            "Data period",
          ]}
          rows={OXFORD_COMPETITION_ROWS}
          minWidthClass="min-w-[40rem]"
        />
        <SeoProse
          className="mt-6"
          paragraphs={[
            "Oxford Physics states that applicants per place have typically reached 8 to 10, around 2.5 candidates per place are interviewed, and ESAT is the primary shortlisting criterion interpreted in light of contextual data.",
            "Oxford Engineering Science says there is no specific mark that guarantees shortlisting. It assesses education and qualification history, application materials, predicted grades, ESAT and interviews together.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Does Oxford college choice change the ESAT you need?">
        <SeoProse
          paragraphs={[
            "Your college matters to the admissions process, but there is no published official ESAT score required by a named college.",
            "Applications are collegiate. Oxford Physics also says candidates can be interviewed at a second college after first-college interviews have concluded.",
            "Older Oxford Physics admissions reports are about the PAT, which ESAT replaced.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Oxford Physics ESAT page:{" "}
          <SeoTextLink href={SOURCES.oxfordPhysicsEsat.url}>
            current ESAT, historical PAT reports
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="International applicants">
        <SeoList
          items={[
            "Oxford has not published separate Home and international ESAT averages.",
            "Use the official course statistics above.",
            "Oxford says contextual information is used in shortlisting and final decisions.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Compare{" "}
          <SeoTextLink href={SEO_ROUTES.cambridgeEngineering}>
            Cambridge Engineering data
          </SeoTextLink>{" "}
          and the{" "}
          <SeoTextLink href={SEO_ROUTES.universityRequirements}>
            university requirements hub
          </SeoTextLink>
          .
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}

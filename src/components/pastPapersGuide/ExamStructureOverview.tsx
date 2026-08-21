import { cn } from "@/lib/utils";
import type { ExamStructureBlock } from "@/content/legacyExamStructures";
import {
  getSectionSubjectPillClass,
  ON_SOLID_SUBJECT_TEXT,
} from "@/config/colors";

const BODY = "text-[#CBD5E1]";
const META = "text-[#E2E8F0]";
const COMMENTARY =
  "max-w-xl text-[15px] leading-[1.45] text-[#CBD5E1] sm:text-base";

type RecBadge =
  | "recommended"
  | "optional"
  | "lowPriority"
  | "bestMatch"
  | "harderPractice"
  | "duplicateAfterNsaa"
  | "doUniqueOnly"
  | "checkYear"
  | "skip"
  | "mostlyOverlap"
  | "doAll";

function RecommendationBadge({ kind }: { kind: RecBadge }) {
  const gray =
    "bg-white/15 text-white/75";
  const styles: Record<RecBadge, { label: string; className: string }> = {
    recommended: {
      label: "Recommended",
      className: gray,
    },
    optional: {
      label: "Optional",
      className: gray,
    },
    lowPriority: {
      label: "Low priority",
      className: gray,
    },
    bestMatch: {
      label: "Best match",
      className: gray,
    },
    harderPractice: {
      label: "Harder practice",
      className: gray,
    },
    duplicateAfterNsaa: {
      label: "Duplicate after NSAA",
      className: `bg-error ${ON_SOLID_SUBJECT_TEXT}`,
    },
    doUniqueOnly: {
      label: "Do unique only",
      className: gray,
    },
    checkYear: {
      label: "Check year",
      className: `bg-error ${ON_SOLID_SUBJECT_TEXT}`,
    },
    skip: {
      label: "Skip",
      className: `bg-error ${ON_SOLID_SUBJECT_TEXT}`,
    },
    mostlyOverlap: {
      label: "Mostly overlap",
      className: `bg-error ${ON_SOLID_SUBJECT_TEXT}`,
    },
    doAll: {
      label: "Do all",
      className: "bg-white/12 text-white/65",
    },
  };
  const style = styles[kind];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
        style.className,
      )}
    >
      {style.label}
    </span>
  );
}

function FormatChangeNotice({
  year,
  children,
}: {
  year: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-accent/15 px-4 py-3.5">
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-accent">
        Format changed in {year}
      </p>
      <p className={cn("mt-1.5", COMMENTARY)}>{children}</p>
    </div>
  );
}

function StatLine({
  questions,
  time,
  pace,
}: {
  questions: string;
  time: string;
  pace: string;
}) {
  return (
    <p className="mt-2.5 font-mono text-xs leading-snug text-[#94A3B8] sm:text-sm">
      {questions} · {time} · {pace}
    </p>
  );
}

function Commentary({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <p className={COMMENTARY}>
      <span className="font-bold text-white">{label}</span> {children}
    </p>
  );
}

function PartChip({
  code,
  label,
  sectionKey,
  required,
  questions,
  badge,
  compact,
}: {
  code: string;
  label: string;
  sectionKey: string;
  required?: boolean;
  questions?: number;
  badge?: RecBadge;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-md px-2 text-center shadow-md shadow-black/35",
        compact ? "min-h-0 py-2" : "min-h-[3.5rem] py-2",
        required && "pt-3.5",
        badge && "pr-2 pt-5",
        getSectionSubjectPillClass(sectionKey),
      )}
    >
      {required ? (
        <span className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neutral-900 shadow-sm shadow-black/25">
          Required
        </span>
      ) : null}
      {badge ? (
        <span className="absolute right-1 top-1 z-10">
          <RecommendationBadge kind={badge} />
        </span>
      ) : null}
      <p className="text-sm font-bold leading-none">{code}</p>
      <p className="mt-1 text-[10px] font-semibold leading-tight">{label}</p>
      {questions != null ? (
        <p className="mt-1 text-[11px] font-bold tabular-nums">
          {questions} questions
        </p>
      ) : null}
    </div>
  );
}

function EngaaPartCard({
  code,
  label,
  sectionKey,
  questions,
  badge,
}: {
  code: string;
  label: string;
  sectionKey: string;
  questions: number;
  badge: RecBadge;
}) {
  return (
    <div className="relative pt-3">
      <span className="absolute right-0 top-0 z-10">
        <RecommendationBadge kind={badge} />
      </span>
      <div
        className={cn(
          "flex min-h-[4.25rem] flex-1 items-center gap-3 rounded-md px-4 py-3.5 shadow-md shadow-black/35 sm:min-h-[4.5rem]",
          getSectionSubjectPillClass(sectionKey),
        )}
      >
        <p className="shrink-0 text-sm font-bold leading-none">{code}</p>
        <p className="min-w-0 flex-1 text-left text-xs font-semibold leading-snug sm:text-sm">
          {label}
        </p>
        <p className="shrink-0 text-xs font-bold tabular-nums sm:text-sm">
          {questions} questions
        </p>
      </div>
    </div>
  );
}

function EraHeading({ years }: { years: string }) {
  return (
    <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-[#E2E8F0]">
      {years}
    </h3>
  );
}

function SectionPanel({
  title,
  choose,
  badge,
  commentary,
  children,
  stretch,
}: {
  title: string;
  choose: string;
  badge?: RecBadge;
  commentary: React.ReactNode;
  children: React.ReactNode;
  stretch?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col gap-2.5",
        stretch && "h-full",
      )}
    >
      <div
        className={cn(
          "relative flex flex-1 flex-col rounded-xl bg-white/[0.09] px-5 py-5 sm:px-6 sm:py-6",
          stretch && "h-full",
        )}
      >
        {badge ? (
          <span className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5">
            <RecommendationBadge kind={badge} />
          </span>
        ) : null}
        <h4
          className={cn(
            "font-display text-base font-bold text-white",
            badge && "pr-28 sm:pr-36",
          )}
        >
          {title}
        </h4>
        <p className={cn("mt-1.5 text-sm font-medium", META)}>{choose}</p>
        <div className="mt-3.5 flex flex-1 flex-col">{children}</div>
      </div>
      {commentary}
    </div>
  );
}

function NsaaEra({
  years,
  s1,
  s2,
}: {
  years: string;
  s1: {
    parts: {
      code: string;
      label: string;
      sectionKey: string;
      required?: boolean;
    }[];
    choose: string;
    questions: number;
    minutes: number;
    badge: RecBadge;
    commentary: React.ReactNode;
    title: string;
    timing: { questions: string; time: string; pace: string };
  };
  s2: {
    parts: { code: string; label: string; sectionKey: string }[];
    choose: string;
    badge: RecBadge;
    commentary: React.ReactNode;
    title: string;
    timing: { questions: string; time: string; pace: string };
  };
}) {
  return (
    <section className="space-y-2.5">
      <EraHeading years={years} />
      <div className="grid gap-3 lg:grid-cols-2 lg:items-stretch lg:gap-4">
        <SectionPanel
          title={s1.title}
          choose={s1.choose}
          badge={s1.badge}
          commentary={s1.commentary}
          stretch
        >
          <div
            className={cn(
              "grid gap-2 pt-1",
              s1.parts.length >= 5
                ? "grid-cols-2 sm:grid-cols-5"
                : "grid-cols-2 sm:grid-cols-4",
            )}
          >
            {s1.parts.map((part) => (
              <PartChip
                key={part.code}
                code={part.code}
                label={part.label}
                sectionKey={part.sectionKey}
                required={part.required}
                compact
              />
            ))}
          </div>
          <StatLine {...s1.timing} />
        </SectionPanel>

        <SectionPanel
          title={s2.title}
          choose={s2.choose}
          badge={s2.badge}
          commentary={s2.commentary}
          stretch
        >
          <div
            className={cn(
              "grid gap-2",
              s2.parts.length > 3
                ? "grid-cols-3 sm:grid-cols-6"
                : "grid-cols-3",
            )}
          >
            {s2.parts.map((part, index) => (
              <PartChip
                key={`${part.code}-${index}`}
                code={part.code}
                label={part.label}
                sectionKey={part.sectionKey}
                compact
              />
            ))}
          </div>
          <StatLine {...s2.timing} />
        </SectionPanel>
      </div>
    </section>
  );
}

function EngaaEra({
  years,
  s1,
  s2,
}: {
  years: string;
  s1: {
    partA: number;
    partB: number;
    partABadge: RecBadge;
    partBBadge: RecBadge;
    commentary: React.ReactNode;
  };
  s2: {
    questions: number;
    commentary: React.ReactNode;
    badge: RecBadge;
    title: string;
    choose: string;
  };
}) {
  return (
    <section className="space-y-2.5">
      <EraHeading years={years} />
      <div className="grid gap-3 lg:grid-cols-2 lg:items-stretch lg:gap-4">
        <SectionPanel
          title="Section 1 · No calculator"
          choose="Complete both parts"
          commentary={s1.commentary}
          stretch
        >
          <div className="flex flex-1 flex-col gap-3 pt-1">
            <EngaaPartCard
              code="A"
              label="Mathematics + Physics"
              sectionKey="Mathematics and Physics"
              questions={s1.partA}
              badge={s1.partABadge}
            />
            <EngaaPartCard
              code="B"
              label="Advanced Math + Phy"
              sectionKey="Advanced Mathematics and Advanced Physics"
              questions={s1.partB}
              badge={s1.partBBadge}
            />
          </div>
        </SectionPanel>

        <SectionPanel
          title={s2.title}
          choose={s2.choose}
          commentary={s2.commentary}
          stretch
        >
          <div className="flex flex-1 flex-col justify-center pt-1">
            <EngaaPartCard
              code="S2"
              label="Physics"
              sectionKey="Physics"
              questions={s2.questions}
              badge={s2.badge}
            />
          </div>
        </SectionPanel>
      </div>
    </section>
  );
}

function NsaaGuide() {
  return (
    <div className="space-y-8">
      <div className="w-full">
        <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          Which NSAA Papers Should You Use for ESAT?
        </h2>
        <p className={cn("mt-3 w-full text-[15px] leading-[1.45] sm:text-base", BODY)}>
          The NSAA format changed in 2020. Here is what to use for ESAT.
        </p>
      </div>

      <NsaaEra
        years="2016-2019"
        s1={{
          parts: [
            {
              code: "A",
              label: "Mathematics",
              sectionKey: "Mathematics",
              required: true,
            },
            { code: "B", label: "Physics", sectionKey: "Physics" },
            { code: "C", label: "Chemistry", sectionKey: "Chemistry" },
            { code: "D", label: "Biology", sectionKey: "Biology" },
            {
              code: "E",
              label: "Advanced Math + Phy",
              sectionKey: "Advanced Mathematics and Advanced Physics",
            },
          ],
          choose: "Take Maths + two subjects",
          questions: 54,
          minutes: 80,
          badge: "recommended",
          title: "Section 1 · No calculator",
          timing: {
            questions: "54 questions",
            time: "80 min",
            pace: "89 sec/question",
          },
          commentary: (
            <Commentary label="Use:">
              Strong practice for Maths 1 and your chosen sciences. Part E adds
              harder Maths and Physics.
            </Commentary>
          ),
        }}
        s2={{
          parts: [
            { code: "1", label: "Physics", sectionKey: "Physics" },
            { code: "2", label: "Physics", sectionKey: "Physics" },
            { code: "3", label: "Chemistry", sectionKey: "Chemistry" },
            { code: "4", label: "Chemistry", sectionKey: "Chemistry" },
            { code: "5", label: "Biology", sectionKey: "Biology" },
            { code: "6", label: "Biology", sectionKey: "Biology" },
          ],
          choose: "Choose any two written questions",
          badge: "lowPriority",
          title: "Section 2 · Calculator allowed",
          timing: {
            questions: "2 written questions",
            time: "40 min",
            pace: "~20 min/question",
          },
          commentary: (
            <Commentary label="Skip for normal ESAT practice.">
              Use only for extra long-form problem solving.
            </Commentary>
          ),
        }}
      />

      <FormatChangeNotice year="2020">
        Part E was removed. Section 1 became shorter, while Section 2 became
        no-calculator multiple choice.
      </FormatChangeNotice>

      <NsaaEra
        years="2020-2023"
        s1={{
          parts: [
            {
              code: "A",
              label: "Mathematics",
              sectionKey: "Mathematics",
              required: true,
            },
            { code: "B", label: "Physics", sectionKey: "Physics" },
            { code: "C", label: "Chemistry", sectionKey: "Chemistry" },
            { code: "D", label: "Biology", sectionKey: "Biology" },
          ],
          choose: "Take Maths + one science",
          questions: 40,
          minutes: 60,
          badge: "bestMatch",
          title: "Section 1 · No calculator",
          timing: {
            questions: "40 questions",
            time: "60 min",
            pace: "90 sec/question",
          },
          commentary: (
            <Commentary label="Use first:">
              The closest NSAA practice for ESAT Maths 1 and science.
            </Commentary>
          ),
        }}
        s2={{
          parts: [
            { code: "X", label: "Physics", sectionKey: "Physics" },
            { code: "Y", label: "Chemistry", sectionKey: "Chemistry" },
            { code: "Z", label: "Biology", sectionKey: "Biology" },
          ],
          choose: "Choose one science",
          badge: "harderPractice",
          title: "Section 2 · No calculator",
          timing: {
            questions: "20 questions",
            time: "60 min",
            pace: "180 sec/question",
          },
          commentary: (
            <Commentary label="Use later:">
              Good harder science practice. Skip anything outside the ESAT
              syllabus.
            </Commentary>
          ),
        }}
      />

      <p className={COMMENTARY}>
        Some questions repeat in ENGAA. UAT-UK currently publishes NSAA Section 1
        only.
      </p>
    </div>
  );
}

function EngaaGuide() {
  return (
    <div className="space-y-8">
      <div className="w-full">
        <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          ENGAA Guide
        </h2>
        <p className={cn("mt-3 w-full text-[15px] leading-[1.45] sm:text-base", BODY)}>
          ENGAA combines Maths and Physics. Its format changed in 2019.
        </p>
      </div>

      <EngaaEra
        years="2016-2019"
        s1={{
          partA: 28,
          partB: 26,
          partABadge: "skip",
          partBBadge: "mostlyOverlap",
          commentary: (
            <Commentary label="After NSAA:">
              Skip Part A. Part B mostly overlaps NSAA Part E, so do the unique
              questions only.
            </Commentary>
          ),
        }}
        s2={{
          questions: 20,
          badge: "doAll",
          title: "Section 2 · Physics",
          choose: "Complete all questions",
          commentary: (
            <Commentary label="Do all:">
              Unique Physics practice for these years. Complete the full paper.
            </Commentary>
          ),
        }}
      />

      <FormatChangeNotice year="2019">
        From 2019, Section 1 is 40 questions in 60 minutes. From 2020, Section 2
        is 60 minutes and duplicates NSAA Section 2 Physics.
      </FormatChangeNotice>

      <EngaaEra
        years="2020-2023"
        s1={{
          partA: 20,
          partB: 20,
          partABadge: "skip",
          partBBadge: "doAll",
          commentary: (
            <Commentary label="After NSAA:">
              Skip Part A. Do all relevant Part B questions for Maths 2 and
              extra Physics.
            </Commentary>
          ),
        }}
        s2={{
          questions: 20,
          badge: "skip",
          title: "Section 2 · Physics",
          choose: "Skip if you did NSAA Section 2",
          commentary: (
            <Commentary label="Skip:">
              Same Physics set as NSAA Section 2 Part X. Complete either copy,
              not both.
            </Commentary>
          ),
        }}
      />

      <p className={COMMENTARY}>
        UAT-UK currently publishes ENGAA Section 1 only.
      </p>
    </div>
  );
}

function TmuaGuide() {
  return (
    <div className="space-y-8">
      <div className="w-full">
        <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          TMUA Guide
        </h2>
        <p className={cn("mt-3 w-full text-[15px] leading-[1.45] sm:text-base", BODY)}>
          Two maths papers with the same format from 2016–2023. No science
          content.
        </p>
      </div>

      <section className="space-y-2.5">
        <EraHeading years="2016–2023" />
        <div className="grid gap-3 sm:grid-cols-2 sm:items-stretch lg:gap-4">
          <div className="flex h-full flex-col gap-2.5">
            <div className="relative flex flex-1 flex-col rounded-xl bg-white/[0.09] px-5 py-5 sm:px-6 sm:py-6">
              <span className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5">
                <RecommendationBadge kind="recommended" />
              </span>
              <h4 className="font-display pr-28 text-xl font-bold text-white sm:pr-36 sm:text-2xl">
                Paper 1
              </h4>
              <p className={cn("mt-1.5 text-sm font-medium", META)}>
                Applications of Mathematical Knowledge
              </p>
              <div className="mt-4 flex min-h-[5.5rem] flex-1 flex-col items-center justify-center rounded-md bg-white/[0.14] px-4 py-5 text-center sm:min-h-[6.25rem]">
                <p className="text-base font-bold text-white sm:text-lg">
                  Maths 2 practice
                </p>
                <p className="mt-2 text-sm font-semibold tabular-nums text-white/80">
                  20 questions
                </p>
              </div>
            </div>
            <Commentary label="Use:">
              Good extra Maths 2 practice once you finish ENGAA Part B.
            </Commentary>
          </div>

          <div className="flex h-full flex-col gap-2.5">
            <div className="relative flex flex-1 flex-col rounded-xl bg-white/[0.09] px-5 py-5 sm:px-6 sm:py-6">
              <span className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5">
                <RecommendationBadge kind="lowPriority" />
              </span>
              <h4 className="font-display pr-28 text-xl font-bold text-white sm:pr-36 sm:text-2xl">
                Paper 2
              </h4>
              <p className={cn("mt-1.5 text-sm font-medium", META)}>
                Mathematical Reasoning
              </p>
              <div className="mt-4 flex min-h-[5.5rem] flex-1 flex-col items-center justify-center rounded-md bg-white/[0.14] px-4 py-5 text-center sm:min-h-[6.25rem]">
                <p className="text-base font-bold text-white sm:text-lg">
                  Reasoning practice
                </p>
                <p className="mt-2 text-sm font-semibold tabular-nums text-white/80">
                  20 questions
                </p>
              </div>
            </div>
            <Commentary label="Use later:">
              More logic-based and less similar to ESAT questions.
            </Commentary>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ExamStructureOverview({
  data,
}: {
  data: ExamStructureBlock;
}) {
  if (data.id === "nsaa") return <NsaaGuide />;
  if (data.id === "engaa") return <EngaaGuide />;
  return <TmuaGuide />;
}

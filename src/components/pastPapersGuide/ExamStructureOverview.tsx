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
  | "checkYear";

function secPerQuestion(minutes: number, questions: number): number | null {
  if (questions <= 0) return null;
  return Math.round((minutes * 60) / questions);
}

function RecommendationBadge({ kind }: { kind: RecBadge }) {
  const styles: Record<RecBadge, { label: string; className: string }> = {
    recommended: {
      label: "Recommended",
      className: `bg-accent ${ON_SOLID_SUBJECT_TEXT}`,
    },
    optional: {
      label: "Optional",
      className: `bg-warning ${ON_SOLID_SUBJECT_TEXT}`,
    },
    lowPriority: {
      label: "Low priority",
      className: `bg-error ${ON_SOLID_SUBJECT_TEXT}`,
    },
    bestMatch: {
      label: "Best match",
      className: `bg-primary ${ON_SOLID_SUBJECT_TEXT}`,
    },
    harderPractice: {
      label: "Harder practice",
      className: `bg-warning ${ON_SOLID_SUBJECT_TEXT}`,
    },
    duplicateAfterNsaa: {
      label: "Duplicate after NSAA",
      className: `bg-warning ${ON_SOLID_SUBJECT_TEXT}`,
    },
    doUniqueOnly: {
      label: "Do unique only",
      className: `bg-accent ${ON_SOLID_SUBJECT_TEXT}`,
    },
    checkYear: {
      label: "Check year",
      className: `bg-error ${ON_SOLID_SUBJECT_TEXT}`,
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
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2.5 pr-28 shadow-md shadow-black/35 sm:pr-36",
        getSectionSubjectPillClass(sectionKey),
      )}
    >
      <span className="absolute right-2 top-2 z-10">
        <RecommendationBadge kind={badge} />
      </span>
      <p className="shrink-0 text-sm font-bold leading-none">{code}</p>
      <p className="min-w-0 flex-1 text-left text-xs font-semibold leading-snug sm:text-sm">
        {label}
      </p>
      <p className="shrink-0 text-xs font-bold tabular-nums sm:text-sm">
        {questions} questions
      </p>
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
}: {
  title: string;
  choose: string;
  badge?: RecBadge;
  commentary: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2.5">
      <div className="relative rounded-xl bg-white/[0.09] px-4 py-3.5 sm:px-5 sm:py-4">
        {badge ? (
          <span className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
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
        <div className="mt-2.5">{children}</div>
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
      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4 lg:items-start">
        <SectionPanel
          title={s1.title}
          choose={s1.choose}
          badge={s1.badge}
          commentary={s1.commentary}
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
    minutes: number;
    partABadge: RecBadge;
    partBBadge: RecBadge;
    commentary: React.ReactNode;
    timing: { questions: string; time: string; pace: string };
  };
  s2: {
    questions: number;
    minutes: number;
    commentary: React.ReactNode;
    badge: RecBadge;
    title: string;
    choose: string;
    timing: { questions: string; time: string; pace: string };
  };
}) {
  return (
    <section className="space-y-2.5">
      <EraHeading years={years} />
      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4 lg:items-start">
        <SectionPanel
          title="Section 1 · No calculator"
          choose="Complete both parts"
          commentary={s1.commentary}
        >
          <div className="space-y-3 pt-1">
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
          <StatLine {...s1.timing} />
        </SectionPanel>

        <SectionPanel
          title={s2.title}
          choose={s2.choose}
          commentary={s2.commentary}
        >
          <div className="pt-1">
            <EngaaPartCard
              code="S2"
              label="Physics"
              sectionKey="Physics"
              questions={s2.questions}
              badge={s2.badge}
            />
          </div>
          <StatLine {...s2.timing} />
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
        years="2016-2018"
        s1={{
          partA: 28,
          partB: 26,
          minutes: 80,
          partABadge: "duplicateAfterNsaa",
          partBBadge: "doUniqueOnly",
          timing: {
            questions: "54 questions",
            time: "80 min",
            pace: "89 sec/question",
          },
          commentary: (
            <Commentary label="After NSAA:">
              Skip Part A and complete only the unique Part B questions.
            </Commentary>
          ),
        }}
        s2={{
          questions: 20,
          minutes: 40,
          badge: "optional",
          title: "Section 2 · Physics",
          choose: "Complete all questions",
          timing: {
            questions: "20 questions",
            time: "40 min",
            pace: "120 sec/question",
          },
          commentary: (
            <Commentary label="Optional:">
              Unique, harder Physics questions, but less similar to the ESAT.
            </Commentary>
          ),
        }}
      />

      <FormatChangeNotice year="2019">
        Section 1 was shortened to 40 questions. Section 2 became a 60-minute,
        no-calculator paper.
      </FormatChangeNotice>

      <EngaaEra
        years="2019-2023"
        s1={{
          partA: 20,
          partB: 20,
          minutes: 60,
          partABadge: "duplicateAfterNsaa",
          partBBadge: "recommended",
          timing: {
            questions: "40 questions",
            time: "60 min",
            pace: "90 sec/question",
          },
          commentary: (
            <Commentary label="After NSAA:">
              Skip Part A. In 2019, do unique Part B questions only. From 2020,
              do all relevant Part B questions.
            </Commentary>
          ),
        }}
        s2={{
          questions: 20,
          minutes: 60,
          badge: "checkYear",
          title: "Section 2 · Physics",
          choose: "Complete all questions",
          timing: {
            questions: "20 questions",
            time: "60 min",
            pace: "180 sec/question",
          },
          commentary: (
            <p className={COMMENTARY}>
              <span className="font-bold text-white">2019:</span> Unique Physics
              practice.{" "}
              <span className="font-bold text-white">2020-2023:</span> Duplicate
              of NSAA Section 2 Physics.
            </p>
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
    <div className="space-y-6">
      <div className="w-full">
        <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          TMUA Guide
        </h2>
        <p className={cn("mt-3 w-full text-[15px] leading-[1.45] sm:text-base", BODY)}>
          Two maths papers, same shape every year from 2016-2023. No science
          content.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white/[0.08] px-4 py-5">
          <p className="font-mono text-xs uppercase tracking-widest text-[#E2E8F0]">
            Paper 1
          </p>
          <p className="mt-2 font-semibold text-white">Applications</p>
          <StatLine
            questions="20 questions"
            time="75 min"
            pace={`${secPerQuestion(75, 20)} sec/question`}
          />
        </div>
        <div className="rounded-xl bg-white/[0.08] px-4 py-5">
          <p className="font-mono text-xs uppercase tracking-widest text-[#E2E8F0]">
            Paper 2
          </p>
          <p className="mt-2 font-semibold text-white">Reasoning</p>
          <StatLine
            questions="20 questions"
            time="75 min"
            pace={`${secPerQuestion(75, 20)} sec/question`}
          />
          <p className={cn("mt-2 text-sm", BODY)}>Lower priority for ESAT</p>
        </div>
      </div>
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

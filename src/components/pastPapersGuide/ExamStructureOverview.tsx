import { cn } from "@/lib/utils";
import type { ExamStructureBlock } from "@/content/legacyExamStructures";
import {
  getSectionSubjectPillClass,
  ON_SOLID_SUBJECT_TEXT,
} from "@/config/colors";

const BODY = "text-[#CBD5E1]";
const META = "text-[#E2E8F0]";

type RecBadge = "best" | "recommended" | "optional" | "skip";

function secPerQuestion(minutes: number, questions: number): number | null {
  if (questions <= 0) return null;
  return Math.round((minutes * 60) / questions);
}

function RecommendationBadge({ kind }: { kind: RecBadge }) {
  const styles: Record<RecBadge, { label: string; className: string }> = {
    best: {
      label: "Best for ESAT",
      className: `bg-primary ${ON_SOLID_SUBJECT_TEXT}`,
    },
    recommended: {
      label: "Recommended",
      className: `bg-accent ${ON_SOLID_SUBJECT_TEXT}`,
    },
    optional: {
      label: "Optional",
      className: `bg-warning ${ON_SOLID_SUBJECT_TEXT}`,
    },
    skip: {
      label: "Skip",
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

function StatLine({
  paceLabel,
  questionsLabel,
  minutes,
}: {
  paceLabel: string;
  questionsLabel: string;
  minutes: number;
}) {
  return (
    <p className="mt-3 font-mono text-sm leading-snug">
      <span className="font-bold text-accent">{paceLabel}</span>
      <span className="font-semibold text-[#E2E8F0]">
        {" "}
        · {questionsLabel} · {minutes} minutes
      </span>
    </p>
  );
}

function PartChip({
  code,
  label,
  sectionKey,
  required,
  questions,
}: {
  code: string;
  label: string;
  sectionKey: string;
  required?: boolean;
  questions?: number;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[4.75rem] flex-col items-center justify-center rounded-md px-2 py-2.5 text-center shadow-md shadow-black/35",
        required && "pt-4",
        getSectionSubjectPillClass(sectionKey),
      )}
    >
      {required ? (
        <span className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neutral-900 shadow-sm shadow-black/25">
          Required
        </span>
      ) : null}
      <p className="text-sm font-bold leading-none">{code}</p>
      <p className="mt-1.5 text-[10px] font-semibold leading-tight">{label}</p>
      {questions != null ? (
        <p className="mt-1.5 text-[11px] font-bold tabular-nums">
          {questions} questions
        </p>
      ) : null}
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
  badge: RecBadge;
  commentary: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="rounded-xl bg-white/[0.09] px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-center gap-2">
          <RecommendationBadge kind={badge} />
          <h4 className="font-display text-base font-bold text-white">{title}</h4>
        </div>
        <p className={cn("mt-2 text-sm font-medium", META)}>{choose}</p>
        <div className="mt-3">{children}</div>
      </div>
      <p className={cn("text-sm leading-relaxed", BODY)}>{commentary}</p>
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
    commentary: string;
    title: string;
  };
  s2: {
    parts: { code: string; label: string; sectionKey: string }[];
    choose: string;
    questionsLabel: string;
    minutes: number;
    paceLabel: string;
    badge: RecBadge;
    commentary: string;
    title: string;
  };
}) {
  const s1Pace = secPerQuestion(s1.minutes, s1.questions);

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
              "grid gap-3 pt-1",
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
              />
            ))}
          </div>
          <StatLine
            paceLabel={
              s1Pace
                ? `${s1Pace} seconds per question`
                : "Timing varies"
            }
            questionsLabel={`${s1.questions} questions`}
            minutes={s1.minutes}
          />
        </SectionPanel>

        <SectionPanel
          title={s2.title}
          choose={s2.choose}
          badge={s2.badge}
          commentary={s2.commentary}
        >
          <div
            className={cn(
              "grid gap-3",
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
              />
            ))}
          </div>
          <StatLine
            paceLabel={s2.paceLabel}
            questionsLabel={s2.questionsLabel}
            minutes={s2.minutes}
          />
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
  };
  s2: {
    questions: number;
    minutes: number;
    note: string;
  };
}) {
  const total = s1.partA + s1.partB;
  const s1Pace = secPerQuestion(s1.minutes, total);
  const s2Pace = secPerQuestion(s2.minutes, s2.questions);

  return (
    <section className="space-y-2.5">
      <EraHeading years={years} />
      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4 lg:items-start">
        <SectionPanel
          title="Section 1: No Calculator"
          choose="Answer all parts"
          badge="recommended"
          commentary="Core ENGAA practice for Maths and Physics. No Chemistry or Biology content."
        >
          <div className="space-y-3">
            <PartChip
              code="A"
              label="Maths & Physics"
              sectionKey="Mathematics and Physics"
              questions={s1.partA}
            />
            <PartChip
              code="B"
              label="Advanced Math + Phy"
              sectionKey="Advanced Mathematics and Advanced Physics"
              questions={s1.partB}
            />
          </div>
          <StatLine
            paceLabel={
              s1Pace
                ? `${s1Pace} seconds per question`
                : "Timing varies"
            }
            questionsLabel={`${total} questions`}
            minutes={s1.minutes}
          />
        </SectionPanel>

        <SectionPanel
          title="Section 2: Advanced Physics only"
          choose="All questions in this section"
          badge="optional"
          commentary={s2.note}
        >
          <PartChip
            code="S2"
            label="Physics"
            sectionKey="Physics"
            questions={s2.questions}
          />
          <StatLine
            paceLabel={
              s2Pace
                ? `${s2Pace} seconds per question`
                : "Timing varies"
            }
            questionsLabel={`${s2.questions} questions`}
            minutes={s2.minutes}
          />
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
        <p className={cn("mt-3 w-full text-base leading-relaxed", BODY)}>
          The NSAA format changed in 2020. Use the guide below to see what each
          section contains and how useful it is for ESAT preparation.
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
          title: "Section 1: No Calculator",
          commentary:
            "Highly recommended. It is strong practice for ESAT Maths 1 and sciences. Only complete the parts matching your ESAT subjects.",
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
          choose: "Answer any two questions",
          questionsLabel: "2 long questions",
          minutes: 40,
          paceLabel: "About 20 minutes per question",
          badge: "skip",
          title: "Section 2: Calculator Allowed",
          commentary:
            "Skip this section. These are long, written, calculator-allowed questions, so they are very different from the ESAT. Useful only as harder extension practice.",
        }}
      />

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
          badge: "best",
          title: "Section 1: No Calculator",
          commentary:
            "Best NSAA practice for ESAT. The short, timed multiple-choice questions resemble ESAT Maths 1 and science modules.",
        }}
        s2={{
          parts: [
            { code: "X", label: "Physics", sectionKey: "Physics" },
            { code: "Y", label: "Chemistry", sectionKey: "Chemistry" },
            { code: "Z", label: "Biology", sectionKey: "Biology" },
          ],
          choose: "Choose one subject",
          questionsLabel: "20 questions",
          minutes: 60,
          paceLabel: (() => {
            const pace = secPerQuestion(60, 20);
            return pace
              ? `${pace} seconds per question`
              : "Timing varies";
          })(),
          badge: "optional",
          title: "Section 2: No Calculator",
          commentary:
            "Good secondary practice. The questions are longer and harder than the ESAT, but useful for developing deeper problem-solving once you finish Section 1.",
        }}
      />

      <p className={cn("text-sm leading-relaxed", BODY)}>
        Watch for duplicates: some NSAA questions also appear in ENGAA papers,
        so avoid completing both.
      </p>
      <p className={cn("text-sm leading-relaxed", BODY)}>
        UAT-UK&apos;s ESAT archive publishes NSAA Section 1 only.
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
        <p className={cn("mt-3 w-full text-base leading-relaxed", BODY)}>
          ENGAA consists of two sections. Section 1 mixes Mathematics and Physics
          in both parts. Section 2 is Advanced Physics only, with no choosing
          between sciences.
        </p>
      </div>

      <EngaaEra
        years="2016-2018"
        s1={{ partA: 28, partB: 26, minutes: 80 }}
        s2={{
          questions: 20,
          minutes: 40,
          note: "Linked MCQs with a basic calculator allowed. Less similar to ESAT.",
        }}
      />

      <EngaaEra
        years="2019-2023"
        s1={{ partA: 20, partB: 20, minutes: 60 }}
        s2={{
          questions: 20,
          minutes: 60,
          note: "No calculator. From 2020 this overlaps NSAA Section 2 Part X.",
        }}
      />

      <p className={cn("text-sm leading-relaxed", BODY)}>
        UAT-UK&apos;s ESAT archive publishes ENGAA Section 1 only.
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
        <p className={cn("mt-3 w-full text-base leading-relaxed", BODY)}>
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
            paceLabel={`${secPerQuestion(75, 20)} seconds per question`}
            questionsLabel="20 questions"
            minutes={75}
          />
        </div>
        <div className="rounded-xl bg-white/[0.08] px-4 py-5">
          <p className="font-mono text-xs uppercase tracking-widest text-[#E2E8F0]">
            Paper 2
          </p>
          <p className="mt-2 font-semibold text-white">Reasoning</p>
          <StatLine
            paceLabel={`${secPerQuestion(75, 20)} seconds per question`}
            questionsLabel="20 questions"
            minutes={75}
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

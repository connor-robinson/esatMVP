import { cn } from "@/lib/utils";
import type { ExamStructureBlock } from "@/content/legacyExamStructures";
import {
  getExamAccentBadgeClass,
  getExamAccentSurfaceClass,
  getSectionSubjectPillClass,
} from "@/config/colors";

const MUTED = "text-[#64748B]";
const SOFT = "text-[#94A3B8]";

function secPerQuestion(minutes: number, questions: number): number | null {
  if (questions <= 0) return null;
  return Math.round((minutes * 60) / questions);
}

function StatRow({
  questions,
  minutes,
  perQuestion,
  accent = "NSAA",
}: {
  questions: string;
  minutes: string;
  perQuestion?: string | null;
  accent?: "NSAA" | "ENGAA" | "TMUA";
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="font-mono text-xs text-[#94A3B8]">{questions}</span>
      <span className="font-mono text-xs text-[#94A3B8]">{minutes}</span>
      {perQuestion ? (
        <span
          className={cn(
            "rounded-full px-2.5 py-1 font-mono text-xs font-bold tabular-nums",
            getExamAccentBadgeClass(accent),
          )}
        >
          {perQuestion}
        </span>
      ) : null}
    </div>
  );
}

function PartChip({
  code,
  label,
  sectionKey,
  required,
}: {
  code: string;
  label: string;
  sectionKey: string;
  required?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[4.5rem] flex-col items-center justify-center rounded-md px-2 py-2.5 text-center",
        getSectionSubjectPillClass(sectionKey),
      )}
    >
      <p className="text-sm font-bold leading-none">{code}</p>
      <p className="mt-1.5 text-[10px] font-semibold leading-tight">{label}</p>
      {required ? (
        <span className="mt-2 rounded-full bg-black/25 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          Required
        </span>
      ) : null}
    </div>
  );
}

function EraHeading({ years }: { years: string }) {
  return (
    <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-[#94A3B8]">
      {years}
    </h3>
  );
}

function SectionPanel({
  title,
  choose,
  accent,
  children,
}: {
  title: string;
  choose: string;
  accent?: "NSAA" | "ENGAA";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-4 py-4 sm:px-5 sm:py-5",
        accent ? getExamAccentSurfaceClass(accent) : "bg-white/[0.04]",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-display text-base font-bold text-white">{title}</h4>
        <p className={cn("text-xs font-medium", SOFT)}>{choose}</p>
      </div>
      <div className="mt-3">{children}</div>
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
  };
  s2: {
    parts: { code: string; label: string; sectionKey: string }[];
    choose: string;
    questionsLabel: string;
    minutes: number;
    perQuestion?: string | null;
    note: string;
  };
}) {
  const s1Pace = secPerQuestion(s1.minutes, s1.questions);

  return (
    <section className="space-y-3">
      <EraHeading years={years} />
      <div className="grid gap-3 lg:grid-cols-2">
        <SectionPanel title="Section 1" choose={s1.choose} accent="NSAA">
          <div
            className={cn(
              "grid gap-2",
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
          <StatRow
            questions={`${s1.questions} questions`}
            minutes={`${s1.minutes} min`}
            perQuestion={s1Pace ? `${s1Pace} sec / q` : null}
            accent="NSAA"
          />
          <p className={`mt-2 text-xs ${MUTED}`}>No calculator</p>
        </SectionPanel>

        <SectionPanel title="Section 2" choose={s2.choose} accent="NSAA">
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
              />
            ))}
          </div>
          <StatRow
            questions={s2.questionsLabel}
            minutes={`${s2.minutes} min`}
            perQuestion={s2.perQuestion}
            accent="NSAA"
          />
          <p className={`mt-2 text-xs ${MUTED}`}>{s2.note}</p>
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
    <section className="space-y-3">
      <EraHeading years={years} />
      <div className="grid gap-3 lg:grid-cols-2">
        <SectionPanel title="Section 1" choose="Answer all parts" accent="ENGAA">
          <div className="space-y-3">
            <div>
              <p className={cn("mb-2 text-xs font-medium", SOFT)}>
                Part A · {s1.partA} questions · Mathematics and Physics mixed
              </p>
              <div className="grid grid-cols-2 gap-2">
                <PartChip
                  code="A"
                  label="Mathematics"
                  sectionKey="Mathematics"
                />
                <PartChip code="A" label="Physics" sectionKey="Physics" />
              </div>
            </div>
            <div>
              <p className={cn("mb-2 text-xs font-medium", SOFT)}>
                Part B · {s1.partB} questions
              </p>
              <PartChip
                code="B"
                label="Advanced Math + Phy"
                sectionKey="Advanced Mathematics and Advanced Physics"
              />
            </div>
          </div>
          <StatRow
            questions={`${total} questions`}
            minutes={`${s1.minutes} min`}
            perQuestion={s1Pace ? `${s1Pace} sec / q` : null}
            accent="ENGAA"
          />
          <p className={`mt-2 text-xs ${MUTED}`}>
            No calculator · no Chemistry or Biology
          </p>
        </SectionPanel>

        <SectionPanel
          title="Section 2"
          choose="Advanced Physics only"
          accent="ENGAA"
        >
          <PartChip code="S2" label="Physics" sectionKey="Physics" />
          <StatRow
            questions={`${s2.questions} questions`}
            minutes={`${s2.minutes} min`}
            perQuestion={s2Pace ? `${s2Pace} sec / q` : null}
            accent="ENGAA"
          />
          <p className={`mt-2 text-xs ${MUTED}`}>{s2.note}</p>
        </SectionPanel>
      </div>
    </section>
  );
}

function NsaaGuide() {
  return (
    <div className="space-y-10">
      <div className="w-full">
        <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          NSAA Guide
        </h2>
        <p className={`mt-3 w-full text-base leading-relaxed ${SOFT}`}>
          NSAA consists of two sections. In each section candidates choose which
          parts to sit based on their subject.
        </p>
      </div>

      <NsaaEra
        years="2016–2019"
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
          choose: "Sit A + any 2 others",
          questions: 54,
          minutes: 80,
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
          choose: "Pick any 2 of 6 written qs",
          questionsLabel: "2 long questions",
          minutes: 40,
          perQuestion: "~20 min / q",
          note: "Calculator allowed · not ESAT-shaped",
        }}
      />

      <NsaaEra
        years="2020–2023"
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
          choose: "Sit A + one science",
          questions: 40,
          minutes: 60,
        }}
        s2={{
          parts: [
            { code: "X", label: "Physics", sectionKey: "Physics" },
            { code: "Y", label: "Chemistry", sectionKey: "Chemistry" },
            { code: "Z", label: "Biology", sectionKey: "Biology" },
          ],
          choose: "Pick one part",
          questionsLabel: "20 questions",
          minutes: 60,
          perQuestion: (() => {
            const pace = secPerQuestion(60, 20);
            return pace ? `${pace} sec / q` : null;
          })(),
          note: "No calculator · harder / secondary for ESAT",
        }}
      />

      <p className={`text-sm ${MUTED}`}>
        UAT-UK&apos;s ESAT archive publishes NSAA Section 1 only.
      </p>
    </div>
  );
}

function EngaaGuide() {
  return (
    <div className="space-y-10">
      <div className="w-full">
        <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          ENGAA Guide
        </h2>
        <p className={`mt-3 w-full text-base leading-relaxed ${SOFT}`}>
          ENGAA consists of two sections. Section 1 mixes Mathematics and Physics
          in both parts. Section 2 is Advanced Physics only — no choosing between
          sciences.
        </p>
      </div>

      <EngaaEra
        years="2016–2018"
        s1={{ partA: 28, partB: 26, minutes: 80 }}
        s2={{
          questions: 20,
          minutes: 40,
          note: "Linked MCQs · basic calculator allowed · less similar to ESAT",
        }}
      />

      <EngaaEra
        years="2019–2023"
        s1={{ partA: 20, partB: 20, minutes: 60 }}
        s2={{
          questions: 20,
          minutes: 60,
          note: "No calculator · from 2020 overlaps NSAA Section 2 Part X",
        }}
      />

      <p className={`text-sm ${MUTED}`}>
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
        <p className={`mt-3 w-full text-base leading-relaxed ${SOFT}`}>
          Two maths papers, same shape every year from 2016–2023. No science
          content.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white/[0.04] px-4 py-5">
          <p className="font-mono text-xs uppercase tracking-widest text-[#64748B]">
            Paper 1
          </p>
          <p className="mt-2 font-semibold text-white">Applications</p>
          <StatRow
            questions="20 questions"
            minutes="75 min"
            perQuestion={`${secPerQuestion(75, 20)} sec / q`}
            accent="TMUA"
          />
        </div>
        <div className="rounded-xl bg-white/[0.04] px-4 py-5">
          <p className="font-mono text-xs uppercase tracking-widest text-[#64748B]">
            Paper 2
          </p>
          <p className="mt-2 font-semibold text-white">Reasoning</p>
          <StatRow
            questions="20 questions"
            minutes="75 min"
            perQuestion={`${secPerQuestion(75, 20)} sec / q`}
            accent="TMUA"
          />
          <p className={`mt-2 text-xs ${MUTED}`}>Lower priority for ESAT</p>
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

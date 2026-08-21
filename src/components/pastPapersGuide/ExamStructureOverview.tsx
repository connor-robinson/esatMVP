import { cn } from "@/lib/utils";
import type { ExamStructureBlock } from "@/content/legacyExamStructures";

const MUTED = "text-[#64748B]";
const SOFT = "text-[#94A3B8]";

function secPerQuestion(minutes: number, questions: number): string {
  if (questions <= 0) return "—";
  const sec = Math.round((minutes * 60) / questions);
  return `${sec} sec / q`;
}

function StatRow({
  questions,
  minutes,
  perQuestion,
}: {
  questions: string;
  minutes: string;
  perQuestion?: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-[#94A3B8]">
      <span>{questions}</span>
      <span>{minutes}</span>
      {perQuestion ? <span>{perQuestion}</span> : null}
    </div>
  );
}

function PartChip({
  code,
  label,
  required,
  dim,
}: {
  code: string;
  label: string;
  required?: boolean;
  dim?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md px-2.5 py-2 text-center",
        dim ? "bg-white/[0.04]" : required ? "bg-white/[0.12]" : "bg-white/[0.08]",
      )}
    >
      <p className="text-sm font-bold text-white">{code}</p>
      <p className={cn("mt-0.5 text-[10px] leading-tight", dim ? MUTED : SOFT)}>
        {label}
      </p>
      {required ? (
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-white/70">
          required
        </p>
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
  muted,
  children,
}: {
  title: string;
  choose: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-4 py-4 sm:px-5 sm:py-5",
        muted ? "bg-white/[0.02] opacity-55 grayscale" : "bg-white/[0.04]",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4
          className={cn(
            "font-display text-base font-bold",
            muted ? "text-[#94A3B8]" : "text-white",
          )}
        >
          {title}
        </h4>
        <p className={cn("text-xs font-medium", muted ? MUTED : SOFT)}>
          {choose}
        </p>
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
    parts: { code: string; label: string; required?: boolean }[];
    choose: string;
    questions: number;
    minutes: number;
  };
  s2: {
    parts: { code: string; label: string }[];
    choose: string;
    questionsLabel: string;
    minutes: number;
    perQuestion?: string;
    note: string;
  };
}) {
  return (
    <section className="space-y-3">
      <EraHeading years={years} />
      <div className="grid gap-3 lg:grid-cols-2">
        <SectionPanel title="Section 1" choose={s1.choose}>
          <div
            className={cn(
              "grid gap-2",
              s1.parts.length >= 5 ? "grid-cols-5" : "grid-cols-4",
            )}
          >
            {s1.parts.map((part) => (
              <PartChip
                key={part.code}
                code={part.code}
                label={part.label}
                required={part.required}
              />
            ))}
          </div>
          <StatRow
            questions={`${s1.questions} questions`}
            minutes={`${s1.minutes} min`}
            perQuestion={secPerQuestion(s1.minutes, s1.questions)}
          />
          <p className={`mt-2 text-xs ${MUTED}`}>No calculator</p>
        </SectionPanel>

        <SectionPanel title="Section 2" choose={s2.choose} muted>
          <div
            className={cn(
              "grid gap-2",
              s2.parts.length > 3 ? "grid-cols-6" : "grid-cols-3",
            )}
          >
            {s2.parts.map((part, index) => (
              <PartChip
                key={`${part.code}-${index}`}
                code={part.code}
                label={part.label}
                dim
              />
            ))}
          </div>
          <StatRow
            questions={s2.questionsLabel}
            minutes={`${s2.minutes} min`}
            perQuestion={s2.perQuestion}
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
  return (
    <section className="space-y-3">
      <EraHeading years={years} />
      <div className="grid gap-3 lg:grid-cols-2">
        <SectionPanel title="Section 1" choose="Answer all parts">
          <div className="space-y-2">
            <div className="rounded-md bg-white/[0.08] px-3 py-3">
              <p className="text-sm font-semibold text-white">
                Part A · Maths + Physics mixed
              </p>
              <p className={`mt-1 font-mono text-xs ${SOFT}`}>
                {s1.partA} questions
              </p>
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-black/25">
                <span className="w-1/2 bg-white/30" />
                <span className="w-1/2 bg-white/15" />
              </div>
            </div>
            <div className="rounded-md bg-white/[0.08] px-3 py-3">
              <p className="text-sm font-semibold text-white">
                Part B · Advanced Maths + Advanced Physics
              </p>
              <p className={`mt-1 font-mono text-xs ${SOFT}`}>
                {s1.partB} questions
              </p>
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-black/25">
                <span className="w-1/2 bg-white/30" />
                <span className="w-1/2 bg-white/15" />
              </div>
            </div>
          </div>
          <StatRow
            questions={`${total} questions`}
            minutes={`${s1.minutes} min`}
            perQuestion={secPerQuestion(s1.minutes, total)}
          />
          <p className={`mt-2 text-xs ${MUTED}`}>
            No calculator · no Chemistry or Biology
          </p>
        </SectionPanel>

        <SectionPanel
          title="Section 2"
          choose="Advanced Physics only"
          muted
        >
          <div className="rounded-md bg-white/[0.06] px-3 py-6 text-center">
            <p className="text-sm font-semibold text-white/80">Physics</p>
            <p className={`mt-1 text-xs ${MUTED}`}>All questions in this section</p>
          </div>
          <StatRow
            questions={`${s2.questions} questions`}
            minutes={`${s2.minutes} min`}
            perQuestion={secPerQuestion(s2.minutes, s2.questions)}
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
      <div>
        <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          NSAA Guide
        </h2>
        <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${SOFT}`}>
          You sit two sections. In each section you choose which parts to take —
          you never answer every part on the paper.
        </p>
      </div>

      <NsaaEra
        years="2016–2019"
        s1={{
          parts: [
            { code: "A", label: "Maths", required: true },
            { code: "B", label: "Physics" },
            { code: "C", label: "Chem" },
            { code: "D", label: "Bio" },
            { code: "E", label: "Advanced" },
          ],
          choose: "Sit A + any 2 others",
          questions: 54,
          minutes: 80,
        }}
        s2={{
          parts: [
            { code: "P", label: "Phys" },
            { code: "P", label: "Phys" },
            { code: "C", label: "Chem" },
            { code: "C", label: "Chem" },
            { code: "B", label: "Bio" },
            { code: "B", label: "Bio" },
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
            { code: "A", label: "Maths", required: true },
            { code: "B", label: "Physics" },
            { code: "C", label: "Chem" },
            { code: "D", label: "Bio" },
          ],
          choose: "Sit A + one science",
          questions: 40,
          minutes: 60,
        }}
        s2={{
          parts: [
            { code: "X", label: "Physics" },
            { code: "Y", label: "Chem" },
            { code: "Z", label: "Bio" },
          ],
          choose: "Pick one part",
          questionsLabel: "20 questions",
          minutes: 60,
          perQuestion: secPerQuestion(60, 20),
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
      <div>
        <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          ENGAA Guide
        </h2>
        <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${SOFT}`}>
          You sit two sections. Section 1 is always Maths and Physics mixed in
          both parts. Section 2 is Advanced Physics only — no choosing between
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
      <div>
        <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          TMUA Guide
        </h2>
        <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${SOFT}`}>
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
            perQuestion={secPerQuestion(75, 20)}
          />
        </div>
        <div className="rounded-xl bg-white/[0.02] px-4 py-5 opacity-70">
          <p className="font-mono text-xs uppercase tracking-widest text-[#64748B]">
            Paper 2
          </p>
          <p className="mt-2 font-semibold text-white/80">Reasoning</p>
          <StatRow
            questions="20 questions"
            minutes="75 min"
            perQuestion={secPerQuestion(75, 20)}
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

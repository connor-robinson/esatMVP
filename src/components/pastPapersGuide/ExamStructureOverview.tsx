"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ExamStructureBlock } from "@/content/legacyExamStructures";

const MUTED = "text-[#64748B]";
const SOFT = "text-[#94A3B8]";

function YearTabs({
  left,
  right,
  active,
  onChange,
}: {
  left: string;
  right: string;
  active: "left" | "right";
  onChange: (next: "left" | "right") => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-full bg-white/[0.04] p-1">
      {(
        [
          ["left", left],
          ["right", right],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            active === key
              ? "bg-white/10 text-white"
              : "text-[#64748B] hover:text-white",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function StructureBlock({
  title,
  muted,
  children,
  control,
}: {
  title: string;
  muted?: boolean;
  children: ReactNode;
  control?: ReactNode;
}) {
  return (
    <section className={cn(muted && "rounded-xl bg-white/[0.02] p-4 sm:p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3
          className={cn(
            "font-display text-lg font-bold",
            muted ? "text-[#94A3B8]" : "text-white",
          )}
        >
          {title}
          {muted ? (
            <span className="ml-2 text-xs font-medium uppercase tracking-wide text-[#64748B]">
              lower priority for ESAT
            </span>
          ) : null}
        </h3>
        {control}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Hub-and-spoke map of NSAA Section 1 parts. */
function NsaaSection1Map({ era }: { era: "old" | "new" }) {
  const nodes =
    era === "old"
      ? [
          { id: "A", label: "Maths", x: 50, y: 12 },
          { id: "B", label: "Physics", x: 88, y: 38 },
          { id: "C", label: "Chem", x: 78, y: 82 },
          { id: "D", label: "Bio", x: 22, y: 82 },
          { id: "E", label: "Advanced", x: 12, y: 38 },
        ]
      : [
          { id: "A", label: "Maths", x: 50, y: 14 },
          { id: "B", label: "Physics", x: 86, y: 50 },
          { id: "C", label: "Chem", x: 50, y: 86 },
          { id: "D", label: "Bio", x: 14, y: 50 },
        ];

  const meta =
    era === "old"
      ? {
          sit: "Sit A + any 2",
          time: "80 min · 18 qs/part",
          note: "Part E = advanced Maths / Physics",
        }
      : {
          sit: "Sit A + one science",
          time: "60 min · 20 qs/part",
          note: "Part E removed",
        };

  return (
    <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="relative mx-auto aspect-square w-full max-w-[280px]">
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          {nodes.map((node) => (
            <line
              key={`line-${node.id}`}
              x1={50}
              y1={50}
              x2={node.x}
              y2={node.y}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={0.8}
            />
          ))}
          <circle cx={50} cy={50} r={11} fill="rgba(255,255,255,0.08)" />
          <text
            x={50}
            y={51.5}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={5.5}
            fontWeight={700}
          >
            S1
          </text>
          {nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={9}
                fill={
                  node.id === "E"
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.1)"
                }
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={0.6}
              />
              <text
                x={node.x}
                y={node.y - 1.2}
                textAnchor="middle"
                fill="#fff"
                fontSize={5}
                fontWeight={700}
              >
                {node.id}
              </text>
              <text
                x={node.x}
                y={node.y + 4.2}
                textAnchor="middle"
                fill="rgba(255,255,255,0.55)"
                fontSize={3.2}
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="space-y-2 text-sm">
        <p className="font-semibold text-white">{meta.sit}</p>
        <p className={SOFT}>{meta.time}</p>
        <p className={MUTED}>{meta.note}</p>
        <p className={MUTED}>No calculator</p>
      </div>
    </div>
  );
}

function NsaaSection2Map({ era }: { era: "old" | "new" }) {
  if (era === "old") {
    const slots = ["P", "P", "C", "C", "B", "B"];
    return (
      <div className="space-y-3 opacity-45 grayscale">
        <p className="text-sm font-semibold text-white">
          6 long written questions · pick any 2
        </p>
        <div className="grid grid-cols-6 gap-2">
          {slots.map((label, index) => (
            <div
              key={`${label}-${index}`}
              className="flex aspect-[3/4] items-center justify-center rounded-md bg-white/[0.06] text-xs font-bold text-white/70"
            >
              {label}
            </div>
          ))}
        </div>
        <p className={`text-sm ${MUTED}`}>
          40 min · calculator allowed · not ESAT-shaped
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 opacity-50 grayscale">
      <p className="text-sm font-semibold text-white">
        Pick one science part · 20 MCQs
      </p>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["X", "Physics"],
          ["Y", "Chemistry"],
          ["Z", "Biology"],
        ].map(([id, label]) => (
          <div
            key={id}
            className="rounded-md bg-white/[0.06] px-3 py-4 text-center"
          >
            <p className="text-lg font-bold text-white/80">{id}</p>
            <p className="mt-1 text-xs text-white/50">{label}</p>
          </div>
        ))}
      </div>
      <p className={`text-sm ${MUTED}`}>
        60 min · no calculator · harder / secondary
      </p>
    </div>
  );
}

function EngaaSection1Map({ era }: { era: "old" | "new" }) {
  const counts =
    era === "old"
      ? { a: 28, b: 26, total: 54, mins: 80 }
      : { a: 20, b: 20, total: 40, mins: 60 };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="rounded-md bg-white/[0.07] px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-white">
              Part A · Maths + Physics mixed
            </p>
            <p className="font-mono text-xs text-[#94A3B8]">{counts.a} qs</p>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-black/30">
            <span className="w-1/2 bg-white/25" />
            <span className="w-1/2 bg-white/15" />
          </div>
        </div>
        <div className="rounded-md bg-white/[0.07] px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-white">
              Part B · Advanced Maths + Advanced Physics
            </p>
            <p className="font-mono text-xs text-[#94A3B8]">{counts.b} qs</p>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-black/30">
            <span className="w-1/2 bg-white/25" />
            <span className="w-1/2 bg-white/15" />
          </div>
        </div>
      </div>
      <p className={`text-sm ${SOFT}`}>
        Answer all {counts.total} · {counts.mins} min · no calculator · no Chem /
        Bio
      </p>
    </div>
  );
}

function EngaaSection2Map({ era }: { era: "old" | "new" }) {
  return (
    <div className="space-y-3 opacity-45 grayscale">
      <div className="rounded-md bg-white/[0.06] px-4 py-5 text-center">
        <p className="text-sm font-semibold text-white/80">
          Section 2 · Advanced Physics only
        </p>
        <p className={`mt-2 text-sm ${MUTED}`}>
          {era === "old"
            ? "~20 linked MCQs · 40 min · basic calculator allowed"
            : "20 MCQs · 60 min · no calculator"}
        </p>
      </div>
      <p className={`text-sm ${MUTED}`}>
        {era === "old"
          ? "Less similar to ESAT"
          : "From 2020 overlaps NSAA Section 2 Part X"}
      </p>
    </div>
  );
}

function TmuaMap() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-md bg-white/[0.06] px-4 py-5">
        <p className="font-mono text-xs uppercase tracking-widest text-[#64748B]">
          Paper 1
        </p>
        <p className="mt-2 font-semibold text-white">Applications</p>
        <p className={`mt-2 text-sm ${SOFT}`}>20 MCQs · 75 min</p>
      </div>
      <div className="rounded-md bg-white/[0.04] px-4 py-5 opacity-70">
        <p className="font-mono text-xs uppercase tracking-widest text-[#64748B]">
          Paper 2
        </p>
        <p className="mt-2 font-semibold text-white/80">Reasoning</p>
        <p className={`mt-2 text-sm ${MUTED}`}>
          20 MCQs · 75 min · lower priority
        </p>
      </div>
    </div>
  );
}

function NsaaGuide() {
  const [s1, setS1] = useState<"left" | "right">("right");
  const [s2, setS2] = useState<"left" | "right">("right");

  return (
    <div className="space-y-10">
      <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
        NSAA Guide
      </h2>

      <StructureBlock
        title="Section 1"
        control={
          <YearTabs
            left="2016–2019"
            right="2020–2023"
            active={s1}
            onChange={setS1}
          />
        }
      >
        <NsaaSection1Map era={s1 === "left" ? "old" : "new"} />
      </StructureBlock>

      <StructureBlock
        title="Section 2"
        muted
        control={
          <YearTabs
            left="2016–2019"
            right="2020–2023"
            active={s2}
            onChange={setS2}
          />
        }
      >
        <NsaaSection2Map era={s2 === "left" ? "old" : "new"} />
      </StructureBlock>

      <p className={`text-sm ${MUTED}`}>
        UAT-UK&apos;s ESAT archive publishes NSAA Section 1 only.
      </p>
    </div>
  );
}

function EngaaGuide() {
  const [s1, setS1] = useState<"left" | "right">("right");
  const [s2, setS2] = useState<"left" | "right">("right");

  return (
    <div className="space-y-10">
      <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
        ENGAA Guide
      </h2>

      <StructureBlock
        title="Section 1"
        control={
          <YearTabs
            left="2016–2018"
            right="2019–2023"
            active={s1}
            onChange={setS1}
          />
        }
      >
        <EngaaSection1Map era={s1 === "left" ? "old" : "new"} />
      </StructureBlock>

      <StructureBlock
        title="Section 2"
        muted
        control={
          <YearTabs
            left="2016–2018"
            right="2019–2023"
            active={s2}
            onChange={setS2}
          />
        }
      >
        <EngaaSection2Map era={s2 === "left" ? "old" : "new"} />
      </StructureBlock>

      <p className={`text-sm ${MUTED}`}>
        UAT-UK&apos;s ESAT archive publishes ENGAA Section 1 only.
      </p>
    </div>
  );
}

function TmuaGuide() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
        TMUA Guide
      </h2>
      <TmuaMap />
      <p className={`text-sm ${MUTED}`}>
        Stable 2016–2023 format. Maths only · no calculator.
      </p>
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

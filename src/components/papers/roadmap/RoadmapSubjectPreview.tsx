/**
 * Dev-only subject filter preview for the roadmap table.
 * Production always uses the user's saved profile subjects.
 */

"use client";

import { ESAT_SUBJECTS } from "@/components/profile/settingsSubjectPills";
import { cn } from "@/lib/utils";

export type RoadmapPreviewState = {
  enabled: boolean;
  examPreference: "ESAT" | "TMUA";
  subjects: string[];
};

type Props = {
  value: RoadmapPreviewState;
  onChange: (next: RoadmapPreviewState) => void;
  profileSubjects: string[] | null;
  profileExamPreference: "ESAT" | "TMUA" | null;
};

const PRESETS: Array<{ label: string; subjects: string[] }> = [
  { label: "Math 1 + Physics", subjects: ["Math 1", "Physics"] },
  { label: "Math 1 + Chem", subjects: ["Math 1", "Chemistry"] },
  { label: "Math 1 + Bio", subjects: ["Math 1", "Biology"] },
  {
    label: "Math 1 + Math 2 + Physics",
    subjects: ["Math 1", "Math 2", "Physics"],
  },
  { label: "All modules", subjects: [...ESAT_SUBJECTS] },
];

export function RoadmapSubjectPreview({
  value,
  onChange,
  profileSubjects,
  profileExamPreference,
}: Props) {
  if (process.env.NODE_ENV === "production") return null;

  const toggleSubject = (subject: string) => {
    const next = new Set(value.subjects);
    if (next.has(subject)) next.delete(subject);
    else next.add(subject);
    onChange({ ...value, enabled: true, subjects: Array.from(next) });
  };

  return (
    <section className="mb-6 rounded-md border border-dashed border-border-subtle bg-surface-mid/40 px-3 py-3 font-sans text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-text">
          Local subject preview
          <span className="ml-2 font-normal text-text-muted">
            (dev only; live users still use profile subjects)
          </span>
        </p>
        <label className="inline-flex items-center gap-2 text-text-muted">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) =>
              onChange({ ...value, enabled: e.target.checked })
            }
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          Override profile
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-muted">
        <span>
          Profile:{" "}
          {profileExamPreference ?? "unset"}
          {profileSubjects?.length
            ? ` · ${profileSubjects.join(", ")}`
            : " · no subjects"}
        </span>
      </div>

      <div
        className={cn(
          "mt-3 space-y-3",
          !value.enabled && "pointer-events-none opacity-45",
        )}
      >
        <div className="flex flex-wrap gap-2">
          {(["ESAT", "TMUA"] as const).map((pref) => (
            <button
              key={pref}
              type="button"
              onClick={() =>
                onChange({ ...value, enabled: true, examPreference: pref })
              }
              className={cn(
                "rounded border px-2.5 py-1 text-xs font-medium transition-colors",
                value.examPreference === pref
                  ? "border-primary bg-primary/15 text-text"
                  : "border-border-subtle bg-background text-text-muted hover:text-text",
              )}
            >
              {pref}
            </button>
          ))}
        </div>

        {value.examPreference === "ESAT" ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {ESAT_SUBJECTS.map((subject) => {
                const selected = value.subjects.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className={cn(
                      "rounded border px-2 py-1 text-xs transition-colors",
                      selected
                        ? "border-primary bg-primary/15 text-text"
                        : "border-border-subtle text-text-muted hover:text-text",
                    )}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      enabled: true,
                      examPreference: "ESAT",
                      subjects: preset.subjects,
                    })
                  }
                  className="rounded border border-border-subtle px-2 py-1 text-xs text-text-muted hover:border-border hover:text-text"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

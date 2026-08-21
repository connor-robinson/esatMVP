/**
 * Pre-mark completion summary - sections completed and CTA to continue marking.
 */

"use client";

import { useMemo } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import {
  mapPartToSection,
  normalizeTmuaSectionSubject,
} from "@/lib/papers/sectionMapping";
import type { ExamName, PaperSection, PaperType, Question } from "@/types/papers";
import { getMarkSessionPartHeaderClass } from "@/config/colors";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface MarkingInfoPageProps {
  selectedSections: PaperSection[];
  onNext: () => void;
}

function derivePartLetter(
  partLetter: string,
  partName: string,
  paperType: PaperType,
): string {
  const trimmedLetter = (partLetter || "").trim();
  if (trimmedLetter && trimmedLetter !== "-") {
    if (/^part\s+/i.test(trimmedLetter)) return trimmedLetter;
    const letterOnly = trimmedLetter.match(/^([A-E])$/i)?.[1];
    if (letterOnly) return `Part ${letterOnly.toUpperCase()}`;
    return trimmedLetter;
  }

  const trimmedName = (partName || "").trim().toLowerCase();
  if (!trimmedName) return "-";

  if (paperType === "NSAA") {
    if (
      trimmedName.includes("advanced mathematics") &&
      trimmedName.includes("advanced physics")
    ) {
      return "Part E";
    }
    if (trimmedName.includes("advanced")) return "Part E";
    if (
      trimmedName === "mathematics" ||
      (trimmedName.includes("mathematics") && !trimmedName.includes("advanced"))
    ) {
      return "Part A";
    }
    if (
      trimmedName === "physics" ||
      (trimmedName.includes("physics") && !trimmedName.includes("advanced"))
    ) {
      return "Part B";
    }
    if (trimmedName === "chemistry" || trimmedName.includes("chemistry")) {
      return "Part C";
    }
    if (trimmedName === "biology" || trimmedName.includes("biology")) {
      return "Part D";
    }
  }

  if (paperType === "ENGAA") {
    if (
      trimmedName.includes("advanced mathematics") &&
      trimmedName.includes("advanced physics")
    ) {
      return "Part B";
    }
    if (trimmedName.includes("mathematics") && trimmedName.includes("physics")) {
      return "Part A";
    }
  }

  return "-";
}

function getSectionRow(
  section: PaperSection,
  paperType: PaperType,
  firstQuestion: Question | null | undefined,
): { badgeLabel: string; subjectName: string; pillSection: PaperSection };
function getSectionRow(
  section: PaperSection,
  index: number,
  paperType: PaperType,
  firstQuestion: Question | null | undefined,
): { badgeLabel: string; subjectName: string; pillSection: PaperSection };
function getSectionRow(
  section: PaperSection,
  arg2: PaperType | number,
  arg3: PaperType | Question | null | undefined,
  arg4?: Question | null | undefined,
): { badgeLabel: string; subjectName: string; pillSection: PaperSection } {
  const paperType =
    typeof arg2 === "number" ? (arg3 as PaperType) : (arg2 as PaperType);
  const firstQuestion =
    typeof arg2 === "number"
      ? arg4
      : (arg3 as Question | null | undefined);

  if (paperType === "TMUA") {
    const badgeLabel = section;
    const subjectName = normalizeTmuaSectionSubject(
      firstQuestion?.partName,
      section,
    );
    return { badgeLabel, subjectName, pillSection: section };
  }

  const partName = (firstQuestion?.partName || section).trim();
  const badgeLabel = derivePartLetter(
    (firstQuestion?.partLetter || "").toString(),
    partName,
    paperType,
  );
  const mappedSection = firstQuestion
    ? mapPartToSection(
        {
          partLetter: firstQuestion.partLetter || "",
          partName: firstQuestion.partName || "",
        },
        paperType,
      )
    : section;

  return {
    badgeLabel,
    subjectName: partName || section,
    pillSection: mappedSection,
  };
}

export function MarkingInfoPage({
  selectedSections,
  onNext,
}: MarkingInfoPageProps) {
  const { allSectionsQuestions, questions, paperName, sectionTimeLimits } =
    usePaperSessionStore();

  const paperType =
    examNameToPaperType((questions[0]?.examName || paperName) as ExamName) ||
    paperName;

  const sectionRows = useMemo(() => {
    return selectedSections.map((section, index) => {
      const firstQuestion =
        allSectionsQuestions[index]?.[0] ??
        questions.find((q) => {
          if (paperType === "TMUA") {
            return (
              mapPartToSection(
                { partLetter: q.partLetter, partName: q.partName },
                "TMUA",
              ) === section
            );
          }
          return (
            mapPartToSection(
              { partLetter: q.partLetter, partName: q.partName },
              paperType,
            ) === section
          );
        }) ??
        null;

      const row = getSectionRow(section, paperType, firstQuestion);
      const timeLimit = sectionTimeLimits?.[index];
      return { ...row, timeLimit, index };
    });
  }, [
    selectedSections,
    allSectionsQuestions,
    questions,
    paperType,
    sectionTimeLimits,
  ]);

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col justify-center bg-background px-6 py-12 sm:px-10">
      <div className="mx-auto w-full max-w-xl space-y-10">
        <header className="space-y-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-text sm:text-[1.65rem]">
            You have completed:
          </h1>
          <p className="text-sm text-text-muted sm:text-[0.9375rem]">
            Next step: Review your answer and analyse your performance
          </p>
        </header>

        <ul className="space-y-5">
          {sectionRows.map(
            ({ badgeLabel, subjectName, pillSection, timeLimit, index }) => (
              <li
                key={`${badgeLabel}-${index}`}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "shrink-0 rounded-organic-md px-3 py-1.5 text-xs font-semibold",
                      getMarkSessionPartHeaderClass(pillSection),
                    )}
                  >
                    {badgeLabel}
                  </span>
                  <span className="truncate text-sm font-medium text-text sm:text-[0.9375rem]">
                    {subjectName}
                  </span>
                </div>
                {typeof timeLimit === "number" && timeLimit > 0 ? (
                  <Clock
                    className="h-4 w-4 shrink-0 text-text-muted"
                    strokeWidth={2}
                    aria-hidden
                  />
                ) : null}
              </li>
            ),
          )}
        </ul>

        <Button
          type="button"
          variant="wide"
          size="lg"
          onClick={onNext}
          className="gap-2.5"
        >
          Continue To Mark
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </Button>
      </div>
    </div>
  );
}

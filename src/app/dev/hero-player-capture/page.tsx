"use client";

import { useEffect, useMemo } from "react";
import { PearsonExamShell } from "@/components/pearson/PearsonExamShell";
import { PearsonFooter } from "@/components/pearson/PearsonFooter";
import { PearsonHeader } from "@/components/pearson/PearsonHeader";
import { PearsonQuestionViewport } from "@/components/pearson/PearsonQuestionViewport";
import { PearsonRichQuestion } from "@/components/pearson/PearsonRichQuestion";
import { PearsonToolbar } from "@/components/pearson/PearsonToolbar";
import { MATHS1_MOCK_01 } from "@/data/esatCampMocks";
import { mockQuestionToPaperQuestion } from "@/lib/papers/esatCampMocks";

/**
 * Dev-only still for the homepage laptop mock.
 * Layout is tightened so stem + diagram + all options fit without scrolling.
 *
 *   /dev/hero-player-capture
 */
export default function HeroPlayerCapturePage() {
  const question = useMemo(() => {
    const raw = MATHS1_MOCK_01.questions.find((q) => q.number === 22);
    if (!raw) throw new Error("Maths 1 Mock Q22 missing");
    return mockQuestionToPaperQuestion(MATHS1_MOCK_01, raw);
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-hero-capture", "1");
    style.textContent = `
      header.site-header, nav, [data-cookie-banner], footer.site-footer,
      [class*="cookie" i], [id*="cookie" i], [aria-label*="cookie" i],
      a[href="/"], button[aria-label="Open menu"],
      [data-testid*="cookie" i] { display: none !important; visibility: hidden !important; }
      body > div > nav, body nav { display: none !important; }

      .pearson-viewport {
        overflow: hidden !important;
        padding: 12px 26px 10px 26px !important;
      }
      .pearson-stem { margin-bottom: 2px !important; }
      .pearson-stem p { margin: 0 0 6px !important; }
      .pearson-diagram { margin: 2px 0 4px !important; }
      .pearson-diagram > div { width: 58% !important; max-width: 17rem !important; }
      .pearson-radio-group { margin-top: 2px !important; gap: 0 !important; }
      .pearson-radio-row { min-height: 0 !important; padding-top: 2px !important; padding-bottom: 2px !important; }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  return (
    <PearsonExamShell colourScheme="black_on_white" zoomLevel={130}>
      <PearsonHeader
        examTitle="ESAT Camp Mock 1"
        showTimer
        remainingLabel="29:57"
        showQuestionCounter
        questionIndex={21}
        totalQuestions={27}
      />
      <PearsonToolbar
        showFlag
        colourScheme="black_on_white"
        onColourSchemeChange={() => {}}
      />
      <div className="pearson-main">
        <PearsonQuestionViewport
          questionKey={question.id}
          zoomLevel={130}
          onViewedChange={() => {}}
        >
          <PearsonRichQuestion
            question={question}
            selected={null}
            onSelect={() => {}}
          />
        </PearsonQuestionViewport>
      </div>
      <PearsonFooter
        variant="question"
        endLabel="End Section"
        onEndExam={() => {}}
        onNext={() => {}}
        onNavigator={() => {}}
      />
    </PearsonExamShell>
  );
}

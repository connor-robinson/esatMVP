import Link from "next/link";
import type { Question } from "@/types/papers";
import {
  ESAT_MOCK_QUESTION_COUNT,
  ESAT_MOCK_TIME_LIMIT_MINUTES,
  findMockModule,
  mockLetterForNumber,
  mockSlotsForModule,
  type EsatMockModuleId,
} from "@/lib/esatMockTests/catalog";
import {
  mockHtmlPageTitle,
  mockHtmlPath,
  mockQuestionAnchorId,
} from "@/lib/esatMockTests/htmlRoutes";
import { ServerStemHtml } from "@/components/esatMockTests/ServerStemHtml";
import { SEO_ROUTES } from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";

const OPTION_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

const ACTION_BTN =
  "inline-flex items-center justify-center rounded-sm px-4 py-2.5 text-sm font-semibold transition-colors";

type EsatMockPaperViewProps = {
  moduleId: EsatMockModuleId;
  mockNumber: number;
  questions: readonly Question[];
};

export function EsatMockPaperView({
  moduleId,
  mockNumber,
  questions,
}: EsatMockPaperViewProps) {
  const module = findMockModule(moduleId);
  const slot = mockSlotsForModule(module).find((s) => s.mockNumber === mockNumber);
  const title = mockHtmlPageTitle(moduleId, mockNumber);
  const letter = mockLetterForNumber(mockNumber);
  const prevPath =
    mockNumber > 1 ? mockHtmlPath(moduleId, mockNumber - 1) : null;
  const nextPath =
    mockNumber < module.mockCount
      ? mockHtmlPath(moduleId, mockNumber + 1)
      : null;
  const resourceLinks = seoLinks(
    "pastPapers",
    "pastPapersGuide",
    "scoreConverter",
    "questionBank",
  );

  const sorted = [...questions].sort(
    (a, b) => a.questionNumber - b.questionNumber,
  );

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[#94A3B8]">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link
              href={SEO_ROUTES.mockTests}
              className="text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
            >
              ESAT Mock Tests
            </Link>
          </li>
          <li aria-hidden className="text-[#64748B]">
            /
          </li>
          <li>
            <Link
              href={`${SEO_ROUTES.mockTests}#choose-mock`}
              className="text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
            >
              {module.fullLabel}
            </Link>
          </li>
          <li aria-hidden className="text-[#64748B]">
            /
          </li>
          <li className="text-[#CBD5E1]">Mock {mockNumber}</li>
        </ol>
      </nav>

      <header className="space-y-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="text-base text-[#94A3B8] sm:text-lg">
          {ESAT_MOCK_QUESTION_COUNT} questions · {ESAT_MOCK_TIME_LIMIT_MINUTES}{" "}
          minutes
        </p>
        <p className="text-base leading-relaxed text-[#CBD5E1]">
          Original full-length ESAT-style mock paper ({module.builderSubject}{" "}
          Mock {letter}).
        </p>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {slot?.startHref ? (
            <Link
              href={slot.startHref}
              className={`${ACTION_BTN} bg-[#3B82F6] text-white hover:bg-[#2563EB]`}
            >
              Start Timed Mock
            </Link>
          ) : null}
          {slot?.paperHref ? (
            <a
              href={slot.paperHref}
              download
              className={`${ACTION_BTN} bg-white/[0.08] text-[#F8FAFC] hover:bg-white/[0.12]`}
            >
              Download PDF
            </a>
          ) : null}
        </div>
      </header>

      <section className="mt-10 space-y-4" aria-labelledby="questions-heading">
        <div className="space-y-2">
          <h2
            id="questions-heading"
            className="font-display text-2xl font-bold tracking-tight text-white"
          >
            Questions
          </h2>
          <p className="text-sm text-[#94A3B8]">
            Questions &amp; worked solutions — spoilers below
          </p>
        </div>

        <div className="space-y-3">
          {sorted.map((question) => {
            const qn = question.questionNumber;
            const options = OPTION_ORDER.filter(
              (letterKey) => question.options?.[letterKey],
            );
            const answer = question.answerLetter?.trim().toUpperCase() || null;
            const hasSolution =
              Boolean(question.solutionText?.trim()) || Boolean(answer);

            return (
              <details
                key={question.id}
                id={mockQuestionAnchorId(qn)}
                className="group rounded-md bg-[#161D2F] px-4 py-3 open:pb-4"
              >
                <summary className="cursor-pointer list-none font-semibold text-white marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="text-[#64748B] transition-transform group-open:rotate-90"
                    >
                      ▸
                    </span>
                    Question {qn}
                  </span>
                </summary>

                <div className="question-content mt-4 space-y-4 border-t border-white/[0.06] pt-4">
                  <ServerStemHtml
                    content={question.questionStem}
                    className="text-[#E2E8F0]"
                  />

                  {options.length > 0 ? (
                    <ol className="space-y-2" type="A">
                      {options.map((letterKey) => (
                        <li
                          key={letterKey}
                          className="flex gap-2 text-[#CBD5E1]"
                        >
                          <span className="shrink-0 font-semibold text-white">
                            {letterKey}.
                          </span>
                          <ServerStemHtml
                            content={question.options?.[letterKey]}
                            className="min-w-0 flex-1 text-[#CBD5E1]"
                          />
                        </li>
                      ))}
                    </ol>
                  ) : null}

                  {hasSolution ? (
                    <details className="rounded-sm bg-white/[0.04] px-3 py-2">
                      <summary className="cursor-pointer text-sm font-medium text-[#93C5FD]">
                        Answer and solution
                      </summary>
                      <div className="solution mt-3 space-y-3 text-[#E2E8F0]">
                        {answer ? (
                          <p>
                            <strong>Answer: {answer}</strong>
                          </p>
                        ) : null}
                        {question.solutionText?.trim() ? (
                          <ServerStemHtml content={question.solutionText} />
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <nav
        aria-label="Nearby mocks"
        className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-sm"
      >
        {prevPath ? (
          <Link
            href={prevPath}
            className="text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
          >
            ← Mock {mockNumber - 1}
          </Link>
        ) : (
          <span />
        )}
        <Link
          href={SEO_ROUTES.mockTests}
          className="text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
        >
          All ESAT mock tests
        </Link>
        {nextPath ? (
          <Link
            href={nextPath}
            className="text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
          >
            Mock {mockNumber + 1} →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <section className="mt-10 space-y-3" aria-labelledby="more-resources">
        <h2
          id="more-resources"
          className="font-display text-xl font-bold tracking-tight text-white"
        >
          More free ESAT resources
        </h2>
        <ul className="space-y-2 text-sm">
          {resourceLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

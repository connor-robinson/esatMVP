import type { Answer, Letter, MistakeTag, PaperSession } from "@/types/papers";

const DAY = 24 * 60 * 60 * 1000;

function buildAnswers(total: number, correctCount: number) {
  const answers: Answer[] = [];
  const correctFlags: (boolean | null)[] = [];
  const guessedFlags: boolean[] = [];
  const perQuestionSec: number[] = [];
  const mistakeTags: MistakeTag[] = [];

  for (let i = 0; i < total; i++) {
    const correct = i < correctCount;
    correctFlags.push(correct);
    guessedFlags.push(!correct && i % 3 === 0);
    perQuestionSec.push(45 + ((i * 17) % 140));
    const choice: Letter = correct ? "A" : "C";
    answers.push({
      choice,
      other: "",
      correctChoice: "A",
      explanation: "",
      addToDrill: !correct,
    });
    if (correct) {
      mistakeTags.push("None");
    } else {
      const tags: MistakeTag[] = [
        "Calc / algebra mistakes",
        "Read the question wrong",
        "Failed to spot setup",
        "Understanding",
        "Formula recall",
        "Poor Time management",
      ];
      mistakeTags.push(tags[i % tags.length]!);
    }
  }

  return { answers, correctFlags, guessedFlags, perQuestionSec, mistakeTags };
}

/**
 * Fake past-paper sessions for the locked analytics preview (logged-out / unpaid).
 */
export function getSamplePaperAnalyticsSessions(
  now = Date.now(),
): PaperSession[] {
  const specs: Array<{
    id: string;
    paperName: PaperSession["paperName"];
    paperVariant: string;
    sessionName: string;
    daysAgo: number;
    timeLimitMinutes: number;
    total: number;
    correct: number;
    predictedScore: number;
    selectedSections?: PaperSession["selectedSections"];
  }> = [
    {
      id: "sample-esat-2023-m1",
      paperName: "ESAT",
      paperVariant: "2023 · Mathematics 1",
      sessionName: "ESAT 2023 Mathematics 1",
      daysAgo: 3,
      timeLimitMinutes: 40,
      total: 27,
      correct: 19,
      predictedScore: 6.8,
      selectedSections: ["Mathematics"],
    },
    {
      id: "sample-tmua-2022-p1",
      paperName: "TMUA",
      paperVariant: "2022 Paper 1",
      sessionName: "TMUA 2022 Paper 1",
      daysAgo: 8,
      timeLimitMinutes: 75,
      total: 20,
      correct: 13,
      predictedScore: 5.9,
      selectedSections: ["Paper 1"],
    },
    {
      id: "sample-nsaa-2021-phys",
      paperName: "NSAA",
      paperVariant: "2021 · Physics",
      sessionName: "NSAA 2021 Physics",
      daysAgo: 14,
      timeLimitMinutes: 60,
      total: 20,
      correct: 11,
      predictedScore: 5.4,
      selectedSections: ["Physics"],
    },
    {
      id: "sample-esat-2022-m2",
      paperName: "ESAT",
      paperVariant: "2022 · Mathematics 2",
      sessionName: "ESAT 2022 Mathematics 2",
      daysAgo: 21,
      timeLimitMinutes: 40,
      total: 27,
      correct: 16,
      predictedScore: 6.1,
      selectedSections: ["Advanced Math"],
    },
    {
      id: "sample-engaa-2020",
      paperName: "ENGAA",
      paperVariant: "2020 Section 1",
      sessionName: "ENGAA 2020 Section 1",
      daysAgo: 28,
      timeLimitMinutes: 60,
      total: 40,
      correct: 24,
      predictedScore: 6.3,
      selectedSections: ["Maths and Physics"],
    },
    {
      id: "sample-tmua-2023-p2",
      paperName: "TMUA",
      paperVariant: "2023 Paper 2",
      sessionName: "TMUA 2023 Paper 2",
      daysAgo: 35,
      timeLimitMinutes: 75,
      total: 20,
      correct: 15,
      predictedScore: 6.7,
      selectedSections: ["Paper 2"],
    },
  ];

  return specs.map((spec) => {
    const startedAt = now - spec.daysAgo * DAY - 2 * 60 * 60 * 1000;
    const endedAt = startedAt + spec.timeLimitMinutes * 60 * 1000;
    const built = buildAnswers(spec.total, spec.correct);

    return {
      id: spec.id,
      paperName: spec.paperName,
      paperVariant: spec.paperVariant,
      sessionName: spec.sessionName,
      startedAt,
      endedAt,
      timeLimitMinutes: spec.timeLimitMinutes,
      questionRange: { start: 1, end: spec.total },
      selectedSections: spec.selectedSections,
      answers: built.answers,
      perQuestionSec: built.perQuestionSec,
      correctFlags: built.correctFlags,
      guessedFlags: built.guessedFlags,
      mistakeTags: built.mistakeTags,
      score: { correct: spec.correct, total: spec.total },
      predictedScore: spec.predictedScore,
      sectionPercentiles: {
        overall: {
          percentile: 55 + (spec.correct % 30),
          score: spec.predictedScore,
          table: "sample",
          label: "Overall",
        },
      },
      createdAt: new Date(startedAt).toISOString(),
      updatedAt: new Date(endedAt).toISOString(),
    };
  });
}

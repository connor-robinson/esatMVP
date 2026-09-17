import { hydrateQuestionBankSessionForMark } from '@/lib/questionBank/hydrateSessionForMark';
import { buildSessionSummary } from '@/lib/questionBank/sessionStats';
import { labelForQuestionBankTag } from '@/lib/questionBank/esatCurriculumTopicLabels';
import type {
  QuestionBankAnalyticsOverview,
  QuestionBankSessionRecord,
} from '@/types/questionBank';

/** Localhost-only demo session ids. */
export const QB_DEMO_SESSION_IDS = {
  mixed: 'demo-qb-session-mixed',
  perfect: 'demo-qb-session-perfect',
  tough: 'demo-qb-session-tough',
} as const;

export function isQuestionBankDemoSessionId(id: string | null | undefined): boolean {
  if (!id) return false;
  return Object.values(QB_DEMO_SESSION_IDS).includes(
    id as (typeof QB_DEMO_SESSION_IDS)[keyof typeof QB_DEMO_SESSION_IDS],
  );
}

/**
 * Allow demo fixtures without auth only on local/dev hosts.
 * Safe to call from the client (uses window) or pass an explicit host.
 */
export function isQuestionBankDemoPreviewAllowed(hostname?: string): boolean {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Still allow explicit localhost hostnames if someone runs next start locally.
    const host =
      hostname ??
      (typeof window !== 'undefined' ? window.location.hostname : '');
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  }
  return true;
}

function demoSessionMeta(params: {
  id: string;
  subjects: string;
  startedAt: string;
  endedAt: string;
  timeLimitMinutes?: number | null;
  uiDifficulties?: QuestionBankSessionRecord['ui_difficulties'];
}): Omit<
  QuestionBankSessionRecord,
  'question_count' | 'correct_count' | 'total_time_ms' | 'summary'
> {
  return {
    id: params.id,
    user_id: 'demo-user',
    started_at: params.startedAt,
    ended_at: params.endedAt,
    time_limit_minutes: params.timeLimitMinutes ?? 20,
    source: 'home',
    subjects: params.subjects,
    test_type: 'ESAT',
    ui_difficulties: params.uiDifficulties ?? ['Easy', 'Medium', 'Hard'],
  };
}

function buildDemoHydrated(
  meta: ReturnType<typeof demoSessionMeta>,
  attemptRows: Parameters<typeof hydrateQuestionBankSessionForMark>[1],
) {
  const provisional: QuestionBankSessionRecord = {
    ...meta,
    question_count: attemptRows.length,
    correct_count: 0,
    total_time_ms: 0,
    summary: {},
  };
  const hydrated = hydrateQuestionBankSessionForMark(provisional, attemptRows);
  const summary = buildSessionSummary(
    hydrated.attempts,
    labelForQuestionBankTag,
  );
  const session: QuestionBankSessionRecord = {
    ...provisional,
    question_count: summary.totalQuestions,
    correct_count: summary.correctCount,
    total_time_ms: summary.totalTimeMs,
    summary,
  };
  return { ...hydrated, session };
}

const mixedAttempts = [
  {
    question_id: 'demo-q-1',
    user_answer: 'B',
    is_correct: true,
    time_spent_ms: 42000,
    attempted_at: '2026-09-17T10:01:00.000Z',
    was_revealed: false,
    used_hint: false,
    wrong_answers_before: [],
    ai_generated_questions: {
      id: 'demo-q-1',
      question_stem:
        'A particle moves in a straight line with velocity $v = 3t^2 - 2t$. What is its acceleration at $t = 2$?',
      correct_option: 'B',
      options: {
        A: '$4$',
        B: '$10$',
        C: '$8$',
        D: '$12$',
        E: '$6$',
      },
      difficulty: 'Easy',
      subjects: 'Math 1',
      primary_tag: 'differentiation',
      secondary_tags: ['kinematics'],
      solution_reasoning:
        'Acceleration is $\\frac{dv}{dt} = 6t - 2$. At $t = 2$, $a = 12 - 2 = 10$.',
      solution_key_insight: 'Differentiate velocity to get acceleration.',
    },
  },
  {
    question_id: 'demo-q-2',
    user_answer: 'C',
    is_correct: false,
    time_spent_ms: 78000,
    attempted_at: '2026-09-17T10:03:00.000Z',
    was_revealed: false,
    used_hint: true,
    wrong_answers_before: ['A'],
    ai_generated_questions: {
      id: 'demo-q-2',
      question_stem:
        'How many real roots does the equation $x^3 - 3x + 2 = 0$ have?',
      correct_option: 'B',
      options: {
        A: '1',
        B: '2',
        C: '3',
        D: '0',
        E: '4',
      },
      difficulty: 'Medium',
      subjects: 'Math 1',
      primary_tag: 'polynomials',
      secondary_tags: ['factorisation'],
      solution_reasoning:
        'Factor as $(x-1)^2(x+2)=0$, so roots $x=1$ (repeated) and $x=-2$. That is two distinct real roots.',
      solution_key_insight: 'Try rational roots, then factor.',
    },
  },
  {
    question_id: 'demo-q-3',
    user_answer: 'D',
    is_correct: true,
    time_spent_ms: 95000,
    attempted_at: '2026-09-17T10:05:30.000Z',
    was_revealed: false,
    used_hint: false,
    wrong_answers_before: [],
    ai_generated_questions: {
      id: 'demo-q-3',
      question_stem:
        'A ball is thrown vertically upwards with speed $20\\,\\mathrm{m\\,s^{-1}}$. Ignoring air resistance, how long until it returns to the throw point? Take $g = 10\\,\\mathrm{m\\,s^{-2}}$.',
      correct_option: 'D',
      options: {
        A: '$1\\,\\mathrm{s}$',
        B: '$2\\,\\mathrm{s}$',
        C: '$3\\,\\mathrm{s}$',
        D: '$4\\,\\mathrm{s}$',
        E: '$5\\,\\mathrm{s}$',
      },
      difficulty: 'Medium',
      subjects: 'Physics',
      primary_tag: 'kinematics',
      secondary_tags: ['projectile_motion'],
      solution_reasoning:
        'Time to top is $u/g = 2\\,\\mathrm{s}$. Total flight time is $4\\,\\mathrm{s}$.',
      solution_key_insight: 'Up and down times are equal when landing at the same height.',
    },
  },
  {
    question_id: 'demo-q-4',
    user_answer: 'A',
    is_correct: false,
    time_spent_ms: 110000,
    attempted_at: '2026-09-17T10:08:00.000Z',
    was_revealed: true,
    used_hint: false,
    wrong_answers_before: ['A', 'C'],
    ai_generated_questions: {
      id: 'demo-q-4',
      question_stem:
        'Which of the following is equal to $\\displaystyle\\int_0^1 (2x+1)\\,dx$?',
      correct_option: 'E',
      options: {
        A: '$1$',
        B: '$1.5$',
        C: '$3$',
        D: '$2.5$',
        E: '$2$',
      },
      difficulty: 'Easy',
      subjects: 'Math 1',
      primary_tag: 'integration',
      secondary_tags: [],
      solution_reasoning:
        '$[x^2 + x]_0^1 = (1+1) - 0 = 2$.',
      solution_key_insight: 'Antiderivative of $2x+1$ is $x^2+x$.',
    },
  },
  {
    question_id: 'demo-q-5',
    user_answer: 'B',
    is_correct: true,
    time_spent_ms: 64000,
    attempted_at: '2026-09-17T10:10:00.000Z',
    was_revealed: false,
    used_hint: false,
    wrong_answers_before: [],
    ai_generated_questions: {
      id: 'demo-q-5',
      question_stem:
        'If $\\sin\\theta = \\tfrac{3}{5}$ and $\\theta$ is acute, what is $\\cos\\theta$?',
      correct_option: 'B',
      options: {
        A: '$\\tfrac{3}{4}$',
        B: '$\\tfrac{4}{5}$',
        C: '$\\tfrac{5}{4}$',
        D: '$\\tfrac{5}{3}$',
        E: '$\\tfrac{1}{5}$',
      },
      difficulty: 'Easy',
      subjects: 'Math 1',
      primary_tag: 'trigonometry',
      secondary_tags: [],
      solution_reasoning:
        'Use a 3-4-5 triangle: adjacent $=4$, hypotenuse $=5$, so $\\cos\\theta = 4/5$.',
      solution_key_insight: 'Pythagoras with a right triangle.',
    },
  },
];

const perfectAttempts = [
  {
    question_id: 'demo-q-p1',
    user_answer: 'A',
    is_correct: true,
    time_spent_ms: 30000,
    attempted_at: '2026-09-16T15:01:00.000Z',
    was_revealed: false,
    used_hint: false,
    wrong_answers_before: [],
    ai_generated_questions: {
      id: 'demo-q-p1',
      question_stem: 'Simplify $2(x+3) - (x-1)$.',
      correct_option: 'A',
      options: {
        A: '$x+7$',
        B: '$x+5$',
        C: '$3x+5$',
        D: '$x-7$',
        E: '$3x+7$',
      },
      difficulty: 'Easy',
      subjects: 'Math 2',
      primary_tag: 'algebra',
      secondary_tags: [],
      solution_reasoning: '$2x+6 - x + 1 = x + 7$.',
      solution_key_insight: 'Distribute the minus carefully.',
    },
  },
  {
    question_id: 'demo-q-p2',
    user_answer: 'C',
    is_correct: true,
    time_spent_ms: 45000,
    attempted_at: '2026-09-16T15:02:30.000Z',
    was_revealed: false,
    used_hint: false,
    wrong_answers_before: [],
    ai_generated_questions: {
      id: 'demo-q-p2',
      question_stem: 'What is the gradient of the line through $(1,2)$ and $(3,8)$?',
      correct_option: 'C',
      options: {
        A: '$2$',
        B: '$2.5$',
        C: '$3$',
        D: '$4$',
        E: '$6$',
      },
      difficulty: 'Easy',
      subjects: 'Math 2',
      primary_tag: 'coordinate_geometry',
      secondary_tags: [],
      solution_reasoning: 'Gradient $= (8-2)/(3-1) = 6/2 = 3$.',
      solution_key_insight: 'Rise over run.',
    },
  },
  {
    question_id: 'demo-q-p3',
    user_answer: 'B',
    is_correct: true,
    time_spent_ms: 52000,
    attempted_at: '2026-09-16T15:04:00.000Z',
    was_revealed: false,
    used_hint: false,
    wrong_answers_before: [],
    ai_generated_questions: {
      id: 'demo-q-p3',
      question_stem: 'Solve $3^{x} = 81$.',
      correct_option: 'B',
      options: {
        A: '$3$',
        B: '$4$',
        C: '$5$',
        D: '$27$',
        E: '$9$',
      },
      difficulty: 'Medium',
      subjects: 'Math 2',
      primary_tag: 'exponentials',
      secondary_tags: [],
      solution_reasoning: '$81 = 3^4$, so $x = 4$.',
      solution_key_insight: 'Write both sides as powers of 3.',
    },
  },
];

const toughAttempts = [
  {
    question_id: 'demo-q-t1',
    user_answer: 'A',
    is_correct: false,
    time_spent_ms: 120000,
    attempted_at: '2026-09-15T09:02:00.000Z',
    was_revealed: false,
    used_hint: true,
    wrong_answers_before: ['A'],
    ai_generated_questions: {
      id: 'demo-q-t1',
      question_stem:
        'The sum of an infinite geometric series is $6$ and the first term is $4$. What is the common ratio?',
      correct_option: 'D',
      options: {
        A: '$\\tfrac{1}{2}$',
        B: '$\\tfrac{2}{3}$',
        C: '$\\tfrac{1}{4}$',
        D: '$\\tfrac{1}{3}$',
        E: '$\\tfrac{3}{4}$',
      },
      difficulty: 'Hard',
      subjects: 'Math 1',
      primary_tag: 'sequences_series',
      secondary_tags: [],
      solution_reasoning: '$S = a/(1-r) \\Rightarrow 6 = 4/(1-r) \\Rightarrow 1-r = 2/3 \\Rightarrow r = 1/3$.',
      solution_key_insight: 'Use $S_\\infty = a/(1-r)$ for $|r|<1$.',
    },
  },
  {
    question_id: 'demo-q-t2',
    user_answer: 'E',
    is_correct: false,
    time_spent_ms: 140000,
    attempted_at: '2026-09-15T09:05:00.000Z',
    was_revealed: true,
    used_hint: false,
    wrong_answers_before: ['B', 'E'],
    ai_generated_questions: {
      id: 'demo-q-t2',
      question_stem:
        'A force of $12\\,\\mathrm{N}$ acts at $30^\\circ$ to the horizontal. What is the horizontal component?',
      correct_option: 'C',
      options: {
        A: '$6\\,\\mathrm{N}$',
        B: '$12\\,\\mathrm{N}$',
        C: '$6\\sqrt{3}\\,\\mathrm{N}$',
        D: '$4\\,\\mathrm{N}$',
        E: '$8\\,\\mathrm{N}$',
      },
      difficulty: 'Hard',
      subjects: 'Physics',
      primary_tag: 'forces',
      secondary_tags: ['vectors'],
      solution_reasoning: 'Horizontal $= 12\\cos 30^\\circ = 12 \\cdot \\sqrt{3}/2 = 6\\sqrt{3}\\,\\mathrm{N}$.',
      solution_key_insight: 'Resolve with cosine for the adjacent component.',
    },
  },
  {
    question_id: 'demo-q-t3',
    user_answer: 'B',
    is_correct: true,
    time_spent_ms: 88000,
    attempted_at: '2026-09-15T09:07:00.000Z',
    was_revealed: false,
    used_hint: false,
    wrong_answers_before: [],
    ai_generated_questions: {
      id: 'demo-q-t3',
      question_stem: 'Differentiate $y = \\ln(2x+1)$ with respect to $x$.',
      correct_option: 'B',
      options: {
        A: '$\\dfrac{1}{2x+1}$',
        B: '$\\dfrac{2}{2x+1}$',
        C: '$\\dfrac{1}{2x}$',
        D: '$2\\ln(2x+1)$',
        E: '$\\dfrac{2x}{2x+1}$',
      },
      difficulty: 'Medium',
      subjects: 'Math 1',
      primary_tag: 'differentiation',
      secondary_tags: ['logarithms'],
      solution_reasoning: 'Chain rule: $\\frac{1}{2x+1}\\cdot 2 = \\frac{2}{2x+1}$.',
      solution_key_insight: 'Do not forget the inner derivative.',
    },
  },
  {
    question_id: 'demo-q-t4',
    user_answer: 'A',
    is_correct: false,
    time_spent_ms: 99000,
    attempted_at: '2026-09-15T09:09:00.000Z',
    was_revealed: false,
    used_hint: false,
    wrong_answers_before: ['A'],
    ai_generated_questions: {
      id: 'demo-q-t4',
      question_stem:
        'Which statement about an ideal gas at fixed volume is correct when temperature rises?',
      correct_option: 'C',
      options: {
        A: 'Pressure falls',
        B: 'Density rises',
        C: 'Pressure rises',
        D: 'Mass increases',
        E: 'Volume increases',
      },
      difficulty: 'Medium',
      subjects: 'Physics',
      primary_tag: 'thermal_physics',
      secondary_tags: [],
      solution_reasoning:
        'At fixed volume and amount of gas, $P \\propto T$, so pressure rises with temperature.',
      solution_key_insight: 'Gay-Lussac / pressure law at constant volume.',
    },
  },
];

export const QB_DEMO_HYDRATED = {
  [QB_DEMO_SESSION_IDS.mixed]: buildDemoHydrated(
    demoSessionMeta({
      id: QB_DEMO_SESSION_IDS.mixed,
      subjects: 'Math 1, Physics',
      startedAt: '2026-09-17T10:00:00.000Z',
      endedAt: '2026-09-17T10:12:00.000Z',
      timeLimitMinutes: 20,
    }),
    mixedAttempts,
  ),
  [QB_DEMO_SESSION_IDS.perfect]: buildDemoHydrated(
    demoSessionMeta({
      id: QB_DEMO_SESSION_IDS.perfect,
      subjects: 'Math 2',
      startedAt: '2026-09-16T15:00:00.000Z',
      endedAt: '2026-09-16T15:08:00.000Z',
      timeLimitMinutes: null,
      uiDifficulties: ['Easy', 'Medium'],
    }),
    perfectAttempts,
  ),
  [QB_DEMO_SESSION_IDS.tough]: buildDemoHydrated(
    demoSessionMeta({
      id: QB_DEMO_SESSION_IDS.tough,
      subjects: 'Math 1, Physics',
      startedAt: '2026-09-15T09:00:00.000Z',
      endedAt: '2026-09-15T09:18:00.000Z',
      timeLimitMinutes: 25,
      uiDifficulties: ['Medium', 'Hard', 'Extreme'],
    }),
    toughAttempts,
  ),
} as const;

export function getQuestionBankDemoSessions(): QuestionBankSessionRecord[] {
  return Object.values(QB_DEMO_HYDRATED).map((h) => h.session);
}

export function getQuestionBankDemoOverview(): QuestionBankAnalyticsOverview {
  const sessions = getQuestionBankDemoSessions();
  let totalQuestions = 0;
  let correctCount = 0;
  const difficultyBreakdown = {
    Easy: { attempted: 0, correct: 0 },
    Medium: { attempted: 0, correct: 0 },
    Hard: { attempted: 0, correct: 0 },
    Extreme: { attempted: 0, correct: 0 },
  };
  const topicMap = new Map<
    string,
    { label: string; attempted: number; correct: number; weight: number }
  >();

  for (const session of sessions) {
    totalQuestions += session.question_count;
    correctCount += session.correct_count;
    const summary = session.summary;
    if (summary && typeof summary === 'object' && 'difficultyBreakdown' in summary) {
      const db = (summary as { difficultyBreakdown: typeof difficultyBreakdown })
        .difficultyBreakdown;
      for (const key of Object.keys(difficultyBreakdown) as Array<
        keyof typeof difficultyBreakdown
      >) {
        difficultyBreakdown[key].attempted += db[key]?.attempted ?? 0;
        difficultyBreakdown[key].correct += db[key]?.correct ?? 0;
      }
    }
    if (summary && typeof summary === 'object' && 'topicStats' in summary) {
      const topics = (summary as { topicStats: Array<{
        topicId: string;
        label: string;
        attempted: number;
        correct: number;
        weight: number;
      }> }).topicStats;
      for (const t of topics) {
        const row = topicMap.get(t.topicId) ?? {
          label: t.label,
          attempted: 0,
          correct: 0,
          weight: t.weight,
        };
        row.attempted += t.attempted;
        row.correct += t.correct;
        topicMap.set(t.topicId, row);
      }
    }
  }

  const topicStats = Array.from(topicMap.entries()).map(([topicId, row]) => ({
    topicId,
    label: row.label,
    attempted: row.attempted,
    correct: row.correct,
    accuracy: row.attempted > 0 ? (row.correct / row.attempted) * 100 : 0,
    weight: row.weight,
  }));

  const weakestTopics = [...topicStats]
    .filter((t) => t.attempted >= 1)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  return {
    totalQuestions,
    correctCount,
    accuracy: totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0,
    sessionsCompleted: sessions.length,
    currentStreak: 3,
    longestStreak: 7,
    difficultyBreakdown,
    topicStats,
    weakestTopics,
  };
}

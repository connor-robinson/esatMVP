import type { MainSectionGroup } from "./types";

export const HOMEPAGE_SECTIONS: MainSectionGroup[] = [
  {
    title: "Train",
    items: [
      {
        label: "Recommended Practice",
        description: "Your next focused session",
        href: "/mental-maths/drill",
        icon: "Zap",
        analyticsDestination: "recommended_practice",
      },
      {
        label: "All Practice Modes",
        description: "Browse every drill topic",
        href: "/mental-maths/drill",
        icon: "Layers",
        analyticsDestination: "all_practice_modes",
      },
      {
        label: "Mental Maths",
        description: "No-calculator speed drills",
        href: "/mental-maths/drill",
        icon: "Calculator",
        analyticsDestination: "mental_maths",
      },
    ],
  },
  {
    title: "Test",
    items: [
      {
        label: "Calibration",
        description: "Diagnose your skill profile",
        href: "/calibration",
        icon: "Target",
        analyticsDestination: "calibration",
      },
      {
        label: "Question Bank",
        description: "ESAT & TMUA questions",
        href: "/questions",
        icon: "BookOpen",
        analyticsDestination: "question_bank",
      },
      {
        label: "Past Papers",
        description: "Full exam practice",
        href: "/past-papers/library",
        icon: "Library",
        analyticsDestination: "past_papers",
      },
    ],
  },
  {
    title: "Review",
    items: [
      {
        label: "Progress",
        description: "Track improvement over time",
        href: "/mental-maths/analytics",
        icon: "BarChart3",
        analyticsDestination: "progress",
      },
      {
        label: "Weak Skills",
        description: "Focus on problem areas",
        href: "/mental-maths/analytics",
        icon: "TrendingDown",
        analyticsDestination: "weak_skills",
      },
      {
        label: "Recent Sessions",
        description: "Review past practice",
        href: "/mental-maths/analytics",
        icon: "Clock",
        analyticsDestination: "recent_sessions",
      },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        label: "FermiGuessr",
        description: "Daily estimation game",
        href: "/mental-maths/fermiguessr",
        icon: "FermiGuessr",
        analyticsDestination: "fermi_game",
      },
      {
        label: "Score Converter",
        description: "Raw score to percentile",
        href: "/tools/score-converter",
        icon: "ArrowLeftRight",
        analyticsDestination: "score_converter",
      },
    ],
  },
];

/** Lighter section set for logged-out visitors — public tools stay accessible. */
export const LOGGED_OUT_SECTIONS: MainSectionGroup[] = HOMEPAGE_SECTIONS;

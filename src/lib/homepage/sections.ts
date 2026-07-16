import {
  FERMI_GUESSR_NAME,
  FERMI_GUESSR_PLAY_PATH,
  FERMI_GUESSR_STATS_PATH,
} from "@/config/fermiGuessr";
import type { DashboardTopic, MainSectionGroup } from "./types";

/** Logged-in dashboard: four color-coded topic hubs with submodes. */
export const DASHBOARD_TOPICS: DashboardTopic[] = [
  {
    id: "mental-maths",
    title: "Mental Maths",
    accent: "primary",
    items: [
      {
        label: "Drill",
        href: "/mental-maths/drill",
        analyticsDestination: "mental_maths",
      },
      {
        label: "Analytics",
        href: "/mental-maths/analytics",
        analyticsDestination: "progress",
      },
      {
        label: "Leaderboard",
        href: "/mental-maths/leaderboard",
        analyticsDestination: "mental_maths_leaderboard",
      },
    ],
  },
  {
    id: "past-papers",
    title: "Past Papers",
    accent: "accent",
    items: [
      {
        label: "Library",
        href: "/past-papers/library",
        analyticsDestination: "past_papers",
      },
      {
        label: "Roadmap",
        href: "/past-papers/roadmap",
        analyticsDestination: "past_papers_roadmap",
      },
      {
        label: "Analytics",
        href: "/past-papers/analytics",
        analyticsDestination: "past_papers_analytics",
      },
    ],
  },
  {
    id: "question-bank",
    title: "Question Bank",
    accent: "secondary",
    items: [
      {
        label: "Home",
        href: "/questions",
        analyticsDestination: "question_bank",
      },
      {
        label: "Library",
        href: "/questions/library",
        analyticsDestination: "question_bank_library",
      },
      {
        label: "Analytics",
        href: "/questions/questionbank/analytics",
        analyticsDestination: "question_bank_analytics",
      },
    ],
  },
  {
    id: "fermiguessr",
    title: FERMI_GUESSR_NAME,
    accent: "warning",
    items: [
      {
        label: "Play",
        href: FERMI_GUESSR_PLAY_PATH,
        analyticsDestination: "fermi_game",
      },
      {
        label: "Stats",
        href: FERMI_GUESSR_STATS_PATH,
        analyticsDestination: "fermi_game",
      },
    ],
  },
];

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

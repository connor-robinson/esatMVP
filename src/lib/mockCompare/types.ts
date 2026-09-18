import type { EsatMockModuleId } from "@/lib/esatMockTests/catalog";

export type MockCompareParticipantStatus =
  | "joined"
  | "in_progress"
  | "completed";

/** Aggregates shown on the compare split view (from mark overview stats). */
export type MockCompareResults = {
  correctCount: number;
  totalQuestions: number;
  accuracyPct: number;
  predictedScore: number | null;
  avgSecPerQuestion: number;
  flaggedCount: number;
  /** Per-question correctness for head-to-head grid. */
  perQuestionCorrect: boolean[];
  perQuestionSec: number[];
  completedAt: number;
};

export type MockCompareParticipant = {
  participantId: string;
  displayName: string;
  status: MockCompareParticipantStatus;
  results: MockCompareResults | null;
  joinedAt: number;
  startedAt: number | null;
};

export type MockCompareRoom = {
  roomId: string;
  paperId: number;
  paperLabel: string;
  moduleId: EsatMockModuleId;
  mockNumber: number;
  createdAt: number;
  /** Max 2. */
  participants: MockCompareParticipant[];
};

export type MockComparePublicRoom = MockCompareRoom;

export const MOCK_COMPARE_MAX_PARTICIPANTS = 2;

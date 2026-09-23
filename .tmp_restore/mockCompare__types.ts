import type { EsatMockModuleId } from "@/lib/esatMockTests/catalog";
import type { RoadmapPart } from "@/lib/papers/roadmapConfig";
import type { RoadmapStartOptions } from "@/components/papers/roadmap/StageListCard";

export type MockCompareParticipantStatus =
  | "joined"
  | "in_progress"
  | "completed";

export type MockCompareResults = {
  correctCount: number;
  totalQuestions: number;
  accuracyPct: number;
  predictedScore: number | null;
  avgSecPerQuestion: number;
  flaggedCount: number;
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

export type MockCompareRoadmapStart = {
  stageId: string;
  selectedParts: RoadmapPart[];
  options: RoadmapStartOptions;
};

export type MockCompareCatalogStart = {
  moduleId: EsatMockModuleId;
  mockNumber: number;
  paperId: number;
};

export type MockCompareRoom = {
  roomId: string;
  paperLabel: string;
  paperId: number;
  moduleId?: EsatMockModuleId;
  mockNumber?: number;
  roadmapStart?: MockCompareRoadmapStart;
  catalogStart?: MockCompareCatalogStart;
  createdAt: number;
  participants: MockCompareParticipant[];
};

export const MOCK_COMPARE_MAX_PARTICIPANTS = 2;

/**
 * Publish / reserve workflow helpers (pure + SQL-shaped updates).
 */

import { statusReservesQuestions } from "./exclusivity";
import { isFreeTierHookQuestion } from "./poolFilters";
import type { MockCandidateQuestion, MockStatus } from "./types";

export function assertCanPublish(input: {
  status: MockStatus;
  slots: Array<{ question?: MockCandidateQuestion | null; questionId: string }>;
  questionCount: number;
  /** IDs already used by other approved/published mocks (excludes this mock). */
  usedElsewhereIds?: Set<string>;
  /** Status before this transition; used to detect reserved-from-elsewhere bugs. */
  fromStatus?: MockStatus;
}): { ok: true } | { ok: false; error: string } {
  if (input.slots.length !== input.questionCount) {
    return {
      ok: false,
      error: `Mock must contain exactly ${input.questionCount} questions (have ${input.slots.length}).`,
    };
  }

  const usedElsewhere = input.usedElsewhereIds ?? new Set<string>();
  const fromReserves =
    input.fromStatus != null && statusReservesQuestions(input.fromStatus);

  const ids = new Set<string>();
  for (const slot of input.slots) {
    if (ids.has(slot.questionId)) {
      return { ok: false, error: "Duplicate question IDs in mock." };
    }
    ids.add(slot.questionId);
    const q = slot.question;
    if (!q) {
      return { ok: false, error: `Missing question data for ${slot.questionId}.` };
    }
    if (isFreeTierHookQuestion(q)) {
      return {
        ok: false,
        error: `Free-tier preview question ${slot.questionId} cannot enter a published mock.`,
      };
    }
    if (usedElsewhere.has(slot.questionId)) {
      return {
        ok: false,
        error: `Question ${slot.questionId} is already used in another approved/published mock and cannot be reused.`,
      };
    }
    // Draft/review must not ship questions reserved by another mock.
    if (q.reservedForMock && !fromReserves) {
      return {
        ok: false,
        error: `Question ${slot.questionId} is reserved for another mock and cannot be reused.`,
      };
    }
    if (q.status !== "approved") {
      return {
        ok: false,
        error: `Question ${slot.questionId} is not approved and cannot enter a published mock.`,
      };
    }
    if (!q.questionStem?.trim() || !q.correctOption) {
      return {
        ok: false,
        error: `Question ${slot.questionId} is incomplete.`,
      };
    }
    if (Object.keys(q.options).length < 2) {
      return {
        ok: false,
        error: `Question ${slot.questionId} has insufficient options.`,
      };
    }
  }

  return { ok: true };
}

export type QuestionReservationUpdate = {
  id: string;
  reserved_for_mock: boolean;
  practice_eligible: boolean;
  mock_usage_count_delta: number;
};

/**
 * When entering approved/published: reserve questions.
 * When leaving those statuses (draft/review/archived): release unless still used elsewhere.
 */
export function reservationUpdatesForTransition(input: {
  fromStatus: MockStatus;
  toStatus: MockStatus;
  questionIds: string[];
  /** Question IDs still reserved by other approved/published mocks. */
  stillReservedElsewhere: Set<string>;
  currentUsageCounts: Map<string, number>;
}): QuestionReservationUpdate[] {
  const wasReserving = statusReservesQuestions(input.fromStatus);
  const willReserve = statusReservesQuestions(input.toStatus);

  return input.questionIds.map((id) => {
    const usage = input.currentUsageCounts.get(id) ?? 0;
    if (!wasReserving && willReserve) {
      return {
        id,
        reserved_for_mock: true,
        practice_eligible: false,
        mock_usage_count_delta: 1,
      };
    }
    if (wasReserving && !willReserve) {
      const still = input.stillReservedElsewhere.has(id);
      return {
        id,
        reserved_for_mock: still,
        practice_eligible: !still,
        mock_usage_count_delta: usage > 0 ? -1 : 0,
      };
    }
    return {
      id,
      reserved_for_mock: willReserve || input.stillReservedElsewhere.has(id),
      practice_eligible: !(willReserve || input.stillReservedElsewhere.has(id)),
      mock_usage_count_delta: 0,
    };
  });
}

export function nextStatusAfterGenerate(): MockStatus {
  return "draft";
}

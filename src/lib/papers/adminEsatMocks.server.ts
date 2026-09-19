/**
 * Server-only: load admin mock-builder modules for past-papers sessions.
 */

import "server-only";

import { createTesterServiceClient } from "@/lib/tester/service";
import { getMockWithSlots, listMocks } from "@/lib/mockBuilder/server";
import type { Question } from "@/types/papers";
import {
  ADMIN_ESAT_MOCK_COUNT,
  adminMockSlotsToPaperQuestions,
  paperIdForAdminEsatMock,
  parseAdminEsatMockPaperId,
  type AdminEsatMockSubject,
} from "@/lib/papers/adminEsatMocks";
import type { EsatMockRow } from "@/lib/mockBuilder/types";

/** Statuses visible on the student past-papers surface. */
const STUDENT_VISIBLE_STATUSES = new Set([
  "review",
  "approved",
  "published",
]);

export type AdminEsatMockCatalogModule = {
  id: string;
  subject: AdminEsatMockSubject;
  mockNumber: number;
  title: string;
  status: string;
  questionCount: number;
  timeLimitMinutes: number;
  paperId: number;
};

export type AdminEsatMockCatalogSitting = {
  mockNumber: number;
  label: string;
  modules: AdminEsatMockCatalogModule[];
};

function isVisibleMock(mock: Pick<EsatMockRow, "status" | "mock_number">): boolean {
  return (
    STUDENT_VISIBLE_STATUSES.has(mock.status) &&
    mock.mock_number >= 1 &&
    mock.mock_number <= ADMIN_ESAT_MOCK_COUNT
  );
}

export async function listAdminEsatMockCatalog(): Promise<
  AdminEsatMockCatalogSitting[]
> {
  const service = createTesterServiceClient();
  const mocks = await listMocks(service, { light: true });
  const byNumber = new Map<number, AdminEsatMockCatalogModule[]>();

  for (const mock of mocks) {
    if (!isVisibleMock(mock)) continue;
    const subject = mock.subject as AdminEsatMockSubject;
    const paperId = paperIdForAdminEsatMock(mock.mock_number, subject);
    if (paperId < 0) continue;

    const entry: AdminEsatMockCatalogModule = {
      id: mock.id,
      subject,
      mockNumber: mock.mock_number,
      title: mock.title,
      status: mock.status,
      questionCount: mock.question_count,
      timeLimitMinutes: mock.time_limit_minutes,
      paperId,
    };
    const list = byNumber.get(mock.mock_number) ?? [];
    list.push(entry);
    byNumber.set(mock.mock_number, list);
  }

  const sittings: AdminEsatMockCatalogSitting[] = [];
  for (let n = 1; n <= ADMIN_ESAT_MOCK_COUNT; n++) {
    const modules = (byNumber.get(n) ?? []).sort((a, b) =>
      a.subject.localeCompare(b.subject),
    );
    sittings.push({
      mockNumber: n,
      label: `Mock ${String.fromCharCode(64 + n)}`,
      modules,
    });
  }
  return sittings;
}

export async function getAdminEsatMockQuestionsForPaperId(
  paperId: number,
): Promise<Question[]> {
  const parsed = parseAdminEsatMockPaperId(paperId);
  if (!parsed) return [];

  const service = createTesterServiceClient();
  // Direct lookup: avoid listMocks() on every module (full mock = 5× catalog scan).
  const { data: match, error } = await service
    .from("esat_mocks")
    .select("id, status, mock_number, subject")
    .eq("mock_number", parsed.mockNumber)
    .eq("subject", parsed.subject)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!match || !isVisibleMock(match)) return [];

  const { mock, slots } = await getMockWithSlots(service, match.id);
  return adminMockSlotsToPaperQuestions(slots, mock, paperId);
}

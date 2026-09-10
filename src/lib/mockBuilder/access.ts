/**
 * Free vs paid access for bank-built ESAT mocks.
 * Integrates with existing hasFullAccess entitlement (no new payment logic).
 */

import { isFreeMockNumber } from "./blueprints";
import type { EsatMockRow } from "./types";

export function canAccessMock(
  mock: Pick<EsatMockRow, "is_free" | "mock_number" | "status">,
  hasFullAccess: boolean,
): boolean {
  if (mock.status !== "published" && mock.status !== "approved") {
    // Non-published mocks are admin-only; callers should gate separately.
    return hasFullAccess;
  }
  if (hasFullAccess) return true;
  return mock.is_free || isFreeMockNumber(mock.mock_number);
}

export function mockAccessReason(
  mock: Pick<EsatMockRow, "is_free" | "mock_number">,
  hasFullAccess: boolean,
): "full_access" | "free_mock" | "requires_upgrade" {
  if (hasFullAccess) return "full_access";
  if (mock.is_free || isFreeMockNumber(mock.mock_number)) return "free_mock";
  return "requires_upgrade";
}

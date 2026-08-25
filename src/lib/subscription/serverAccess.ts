/**
 * Server-side full-access checks.
 * Re-exports the partner-aware authoritative helpers.
 */

export {
  getUserAccess,
  userHasFullAccess,
  getActivePartnerEntitlement,
} from "@/lib/partners/access";
export type { UserAccess, AccessSource } from "@/lib/partners/types";

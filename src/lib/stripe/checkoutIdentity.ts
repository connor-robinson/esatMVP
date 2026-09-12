/**
 * Checkout identity helpers: customer vs email params, and resolving the app user
 * from a completed Checkout Session without requiring a pre-created Stripe Customer.
 */

export type CheckoutCustomerFields =
  | { customer: string; customer_email?: never }
  | { customer_email: string; customer?: never };

/** Pass exactly one of customer or customer_email. Never both. */
export function buildCheckoutCustomerFields(
  existingStripeCustomerId: string | null | undefined,
  email: string,
): CheckoutCustomerFields {
  const trimmedId = existingStripeCustomerId?.trim();
  if (trimmedId) {
    return { customer: trimmedId };
  }
  return { customer_email: email };
}

export function resolveUserIdFromCheckoutSession(session: {
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
}): string | null {
  const fromRef = session.client_reference_id?.trim();
  if (fromRef) return fromRef;

  const meta = session.metadata;
  const fromMeta =
    meta?.user_id?.trim() ||
    meta?.userId?.trim() ||
    "";
  return fromMeta || null;
}

export function resolveUserIdFromStripeMetadata(
  metadata: Record<string, string> | null | undefined,
): string | null {
  if (!metadata) return null;
  const id = metadata.user_id?.trim() || metadata.userId?.trim() || "";
  return id || null;
}

export type LinkStripeCustomerResult =
  | { ok: true; action: "created" | "unchanged" }
  | { ok: false; action: "mismatch" | "already_linked"; existingCustomerId?: string; otherUserId?: string };

/** Decide how to treat an incoming Stripe Customer ID for a known app user. */
export function decideStripeCustomerLink(params: {
  userId: string;
  incomingCustomerId: string;
  existingCustomerIdForUser: string | null | undefined;
  userIdAlreadyLinkedToIncoming?: string | null;
}): LinkStripeCustomerResult {
  const {
    userId,
    incomingCustomerId,
    existingCustomerIdForUser,
    userIdAlreadyLinkedToIncoming,
  } = params;

  if (
    userIdAlreadyLinkedToIncoming &&
    userIdAlreadyLinkedToIncoming !== userId
  ) {
    return {
      ok: false,
      action: "already_linked",
      otherUserId: userIdAlreadyLinkedToIncoming,
    };
  }

  if (!existingCustomerIdForUser) {
    return { ok: true, action: "created" };
  }

  if (existingCustomerIdForUser === incomingCustomerId) {
    return { ok: true, action: "unchanged" };
  }

  return {
    ok: false,
    action: "mismatch",
    existingCustomerId: existingCustomerIdForUser,
  };
}

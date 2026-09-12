/** Fire-and-forget: record first time we showed the invite / survey. */
export function markFeedbackReferralAsked(): void {
  void fetch("/api/feedback-referral/mark-asked", { method: "POST" }).catch(
    () => {
      // ignore; analytics only
    },
  );
}

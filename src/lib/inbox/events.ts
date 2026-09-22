/** Fired when the user marks inbox message(s) as read so the nav badge can sync. */
export const INBOX_READ_EVENT = "esatcamp:inbox-read";

export type InboxReadEventDetail = {
  /** Message ids marked read. Empty when mark-all. */
  messageIds: string[];
  all?: boolean;
};

export function notifyInboxRead(detail: InboxReadEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(INBOX_READ_EVENT, { detail }),
  );
}

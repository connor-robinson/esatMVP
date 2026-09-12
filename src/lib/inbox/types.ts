export type InboxAudience = "personal" | "broadcast";
export type InboxDirection = "outbound" | "inbound";

export type InboxMessageRow = {
  id: string;
  subject: string;
  body: string;
  audience: InboxAudience;
  direction: InboxDirection;
  parent_id: string | null;
  support_request_id: string | null;
  legacy_bug_report_id: string | null;
  allow_reply: boolean;
  created_by: string | null;
  created_at: string;
};

export type InboxThreadReply = {
  id: string;
  body: string;
  direction: InboxDirection;
  created_by: string | null;
  created_at: string;
};

export type InboxMessageListItem = InboxMessageRow & {
  read_at: string | null;
  replies?: InboxThreadReply[];
  /** Present on admin list: usernames/emails of personal recipients. */
  recipients?: Array<{
    user_id: string;
    username: string | null;
    email: string | null;
  }>;
};

export type InboxUserSearchHit = {
  id: string;
  username: string | null;
  email: string | null;
};

export const INBOX_LIMITS = {
  subjectMin: 1,
  subjectMax: 200,
  bodyMin: 1,
  bodyMax: 10000,
  maxPersonalRecipients: 50,
  replyMax: 4000,
} as const;

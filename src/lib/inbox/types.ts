export type InboxAudience = "personal" | "broadcast";

export type InboxMessageRow = {
  id: string;
  subject: string;
  body: string;
  audience: InboxAudience;
  created_by: string | null;
  created_at: string;
};

export type InboxMessageListItem = InboxMessageRow & {
  read_at: string | null;
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
} as const;

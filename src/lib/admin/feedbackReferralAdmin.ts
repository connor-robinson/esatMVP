import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FEEDBACK_REFERRAL_SURVEY,
  feedbackWhyId,
} from "@/lib/feedbackReferral/survey";

export type CountRow = { label: string; count: number };

function bump(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function toSortedRows(map: Map<string, number>): CountRow[] {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const FEEDBACK_QUESTION_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    FEEDBACK_REFERRAL_SURVEY.questions.flatMap((q) => {
      const rows: Array<[string, string]> = [[q.id, q.label]];
      if (q.whyOptional) {
        rows.push([feedbackWhyId(q.id), `${q.label} (why)`]);
      }
      if (q.followUpText) {
        rows.push([q.followUpText.id, q.followUpText.label]);
      }
      for (const detail of q.requiredDetails ?? []) {
        rows.push([detail.id, detail.label]);
      }
      return rows;
    }),
  ),
  parts_used: "Which parts did you use?",
};

const FEEDBACK_OPTION_LABELS: Record<string, string> = Object.fromEntries(
  FEEDBACK_REFERRAL_SURVEY.questions.flatMap((q) =>
    (q.options ?? []).map((opt) => [opt.value, opt.label]),
  ),
);

function formatAnswerValue(value: unknown): string {
  if (value == null || value === "") return "(skipped)";
  if (Array.isArray(value)) {
    if (value.length === 0) return "(none)";
    return value
      .map((v) => FEEDBACK_OPTION_LABELS[String(v)] ?? String(v))
      .join(", ");
  }
  if (typeof value === "number") return String(value);
  const raw = String(value).trim();
  if (!raw) return "(skipped)";
  return FEEDBACK_OPTION_LABELS[raw] ?? raw;
}

function formatAnswerRows(
  answers: Array<{ questionId?: string; value?: unknown }>,
): FeedbackReferralSubmissionRow["answers"] {
  return answers.map((answer) => {
    const questionId = String(answer.questionId ?? "unknown");
    return {
      questionId,
      label: FEEDBACK_QUESTION_LABELS[questionId] ?? questionId,
      display: formatAnswerValue(answer.value),
    };
  });
}

function bumpChoice(
  map: Map<string, number>,
  value: unknown,
  mode: "single" | "multi",
) {
  if (mode === "multi" && Array.isArray(value)) {
    for (const part of value) {
      const key = String(part);
      bump(map, FEEDBACK_OPTION_LABELS[key] ?? key);
    }
    return;
  }
  if (typeof value === "string" && value.trim()) {
    bump(map, FEEDBACK_OPTION_LABELS[value] ?? value);
  }
}

export type FeedbackReferralSubmissionRow = {
  id: string;
  userId: string;
  username: string | null;
  email: string | null;
  createdAt: string;
  answers: Array<{
    questionId: string;
    label: string;
    display: string;
  }>;
};

export type FeedbackReferralCodeRow = {
  code: string;
  createdAt: string;
  redeemedAt: string | null;
  ownerEmail: string | null;
  ownerUsername: string | null;
  redeemedByEmail: string | null;
};

export type FeedbackReferralStats = {
  asked: number;
  answered: number;
  responseRate: number | null;
  codesIssued: number;
  codesRedeemed: number;
  codesUnused: number;
  surveySubmissions: number;
  mostUseful: CountRow[];
  leastUseful: CountRow[];
  partsUsed: CountRow[];
  priceFair: CountRow[];
  recommendMore: CountRow[];
  campMissing: CountRow[];
  almostStopped: CountRow[];
  recommendAvg: number | null;
  recommendCount: number;
  submissions: FeedbackReferralSubmissionRow[];
  codes: FeedbackReferralCodeRow[];
};

export type FeedbackReferralNotificationItem = {
  id: string;
  userId: string;
  username: string | null;
  email: string | null;
  createdAt: string;
};

export type FeedbackReferralNotificationsPayload = {
  total: number;
  items: FeedbackReferralNotificationItem[];
};

export async function loadFeedbackReferralStats(
  service: SupabaseClient,
): Promise<FeedbackReferralStats> {
  const [
    { count: askedCount, error: askedError },
    { count: codesIssuedCount, error: codesIssuedError },
    { count: codesRedeemedCount, error: codesRedeemedError },
    { data: codes, error: codesError },
    { data: submissions, error: submissionsError },
  ] = await Promise.all([
    service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("feedback_referral_asked_at", "is", null),
    service
      .from("feedback_referral_codes")
      .select("id", { count: "exact", head: true }),
    service
      .from("feedback_referral_codes")
      .select("id", { count: "exact", head: true })
      .not("redeemed_at", "is", null),
    service
      .from("feedback_referral_codes")
      .select(
        "code, user_id, redeemed_at, redeemed_by_user_id, created_at, checkout_session_id",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    service
      .from("feedback_referral_submissions")
      .select("id, user_id, answers, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (askedError) throw new Error(askedError.message);
  if (codesIssuedError) throw new Error(codesIssuedError.message);
  if (codesRedeemedError) throw new Error(codesRedeemedError.message);
  if (codesError) throw new Error(codesError.message);
  if (submissionsError) throw new Error(submissionsError.message);

  const codesIssued = codesIssuedCount ?? 0;
  const codesRedeemed = codesRedeemedCount ?? 0;
  const answered = submissions?.length ?? 0;
  const asked = askedCount ?? 0;

  const userIds = [
    ...new Set(
      [
        ...(submissions ?? []).map((s) => s.user_id as string | null),
        ...(codes ?? []).flatMap((c) => [
          c.user_id as string | null,
          c.redeemed_by_user_id as string | null,
        ]),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];

  const profileById = new Map<
    string,
    { username: string | null; email: string | null }
  >();
  if (userIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id, username, email")
      .in("id", userIds);
    for (const profile of profiles ?? []) {
      profileById.set(profile.id as string, {
        username: (profile.username as string | null) ?? null,
        email: (profile.email as string | null) ?? null,
      });
    }
  }

  const mostUseful = new Map<string, number>();
  const leastUseful = new Map<string, number>();
  const partsUsed = new Map<string, number>();
  const priceFair = new Map<string, number>();
  const recommendMore = new Map<string, number>();
  const campMissing = new Map<string, number>();
  const almostStopped = new Map<string, number>();
  let recommendSum = 0;
  let recommendCount = 0;
  const submissionRows: FeedbackReferralSubmissionRow[] = [];

  for (const submission of submissions ?? []) {
    const answers = Array.isArray(submission.answers)
      ? (submission.answers as Array<{ questionId?: string; value?: unknown }>)
      : [];
    const profile = profileById.get(String(submission.user_id ?? ""));
    submissionRows.push({
      id: String(submission.id),
      userId: String(submission.user_id ?? ""),
      username: profile?.username ?? null,
      email: profile?.email ?? null,
      createdAt: String(submission.created_at ?? ""),
      answers: formatAnswerRows(answers),
    });

    for (const answer of answers) {
      const id = String(answer.questionId ?? "");
      const value = answer.value;
      if (id === "most_useful") bumpChoice(mostUseful, value, "single");
      else if (id === "least_useful") bumpChoice(leastUseful, value, "single");
      else if (id === "parts_used") bumpChoice(partsUsed, value, "multi");
      else if (id === "price_fair") bumpChoice(priceFair, value, "single");
      else if (id === "recommend_more")
        bumpChoice(recommendMore, value, "single");
      else if (id === "camp_missing") bumpChoice(campMissing, value, "multi");
      else if (id === "almost_stopped")
        bumpChoice(almostStopped, value, "multi");
      else if (id === "recommend" && typeof value === "number") {
        recommendSum += value;
        recommendCount += 1;
      }
    }
  }

  const codeRows: FeedbackReferralCodeRow[] = (codes ?? []).map((row) => ({
    code: String(row.code),
    createdAt: String(row.created_at ?? ""),
    redeemedAt: row.redeemed_at ? String(row.redeemed_at) : null,
    ownerEmail: profileById.get(String(row.user_id ?? ""))?.email ?? null,
    ownerUsername:
      profileById.get(String(row.user_id ?? ""))?.username ?? null,
    redeemedByEmail: row.redeemed_by_user_id
      ? profileById.get(String(row.redeemed_by_user_id))?.email ?? null
      : null,
  }));

  return {
    asked,
    answered,
    responseRate:
      asked > 0 ? Math.round((answered / asked) * 1000) / 10 : null,
    codesIssued,
    codesRedeemed,
    codesUnused: codesIssued - codesRedeemed,
    surveySubmissions: answered,
    mostUseful: toSortedRows(mostUseful),
    leastUseful: toSortedRows(leastUseful),
    partsUsed: toSortedRows(partsUsed),
    priceFair: toSortedRows(priceFair),
    recommendMore: toSortedRows(recommendMore),
    campMissing: toSortedRows(campMissing),
    almostStopped: toSortedRows(almostStopped),
    recommendAvg:
      recommendCount > 0
        ? Math.round((recommendSum / recommendCount) * 10) / 10
        : null,
    recommendCount,
    submissions: submissionRows,
    codes: codeRows,
  };
}

export async function loadFeedbackReferralNotifications(
  service: SupabaseClient,
  sinceIso: string | null,
): Promise<FeedbackReferralNotificationsPayload> {
  let query = service
    .from("feedback_referral_submissions")
    .select("id, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (sinceIso) {
    query = query.gt("created_at", sinceIso);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const userIds = [
    ...new Set(
      rows
        .map((r) => r.user_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const profileById = new Map<
    string,
    { username: string | null; email: string | null }
  >();
  if (userIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id, username, email")
      .in("id", userIds);
    for (const profile of profiles ?? []) {
      profileById.set(profile.id as string, {
        username: (profile.username as string | null) ?? null,
        email: (profile.email as string | null) ?? null,
      });
    }
  }

  const items: FeedbackReferralNotificationItem[] = rows.map((row) => {
    const profile = profileById.get(String(row.user_id ?? ""));
    return {
      id: String(row.id),
      userId: String(row.user_id ?? ""),
      username: profile?.username ?? null,
      email: profile?.email ?? null,
      createdAt: String(row.created_at ?? ""),
    };
  });

  return { total: items.length, items };
}

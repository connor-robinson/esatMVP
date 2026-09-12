import type { SupabaseClient } from "@supabase/supabase-js";
import { FEEDBACK_REFERRAL_SURVEY } from "@/lib/feedbackReferral/survey";

export type CountRow = { label: string; count: number };

function bump(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function toSortedRows(map: Map<string, number>): CountRow[] {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function labelOrUnset(value: unknown): string {
  if (value == null || value === "") return "(not set)";
  return String(value);
}

const FEEDBACK_QUESTION_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    FEEDBACK_REFERRAL_SURVEY.questions.map((q) => [q.id, q.label]),
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

export type SurveyStatsPayload = {
  funnel: {
    totalProfiles: number;
    onboardingCompleted: number;
    onboardingIncomplete: number;
    hasReferralSource: number;
    marketingOptIn: number;
    marketingOptOut: number;
    marketingNotAsked: number;
  };
  referralSources: CountRow[];
  examPreference: CountRow[];
  esatSubjects: CountRow[];
  targetUniversities: CountRow[];
  earlyApplicant: CountRow[];
  qbUiSurveyChoice: CountRow[];
  qbUiVariant: CountRow[];
  qbUiPreferenceSource: CountRow[];
  partnerCodes: Array<{
    code: string;
    label: string | null;
    partnerSlug: string | null;
    redemptionCount: number;
    maxRedemptions: number;
    status: string;
  }>;
  partnerInviteSummary: {
    generated: number;
    redeemed: number;
    unused: number;
    revoked: number;
    expired: number;
  };
  feedbackReferral: {
    codesIssued: number;
    codesRedeemed: number;
    codesUnused: number;
    surveySubmissions: number;
    mostUseful: CountRow[];
    leastUseful: CountRow[];
    partsUsed: CountRow[];
    recommendAvg: number | null;
    recommendCount: number;
    submissions: FeedbackReferralSubmissionRow[];
  };
};

export async function loadSurveyStats(
  service: SupabaseClient,
): Promise<SurveyStatsPayload> {
  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select(
      "referral_source, exam_preference, esat_subjects, target_universities, is_early_applicant, marketing_emails_consent, onboarding_completed, qb_session_ui_variant, qb_session_ui_survey_choice, qb_session_ui_preference_source",
    );

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const rows = profiles ?? [];
  const referralSources = new Map<string, number>();
  const examPreference = new Map<string, number>();
  const esatSubjects = new Map<string, number>();
  const targetUniversities = new Map<string, number>();
  const earlyApplicant = new Map<string, number>();
  const qbUiSurveyChoice = new Map<string, number>();
  const qbUiVariant = new Map<string, number>();
  const qbUiPreferenceSource = new Map<string, number>();

  let onboardingCompleted = 0;
  let hasReferralSource = 0;
  let marketingOptIn = 0;
  let marketingOptOut = 0;
  let marketingNotAsked = 0;

  for (const row of rows) {
    if (row.onboarding_completed === true) onboardingCompleted += 1;

    const referral = row.referral_source as string | null;
    if (referral) hasReferralSource += 1;
    bump(referralSources, labelOrUnset(referral));

    bump(examPreference, labelOrUnset(row.exam_preference));

    const subjects = Array.isArray(row.esat_subjects)
      ? (row.esat_subjects as string[])
      : [];
    if (subjects.length === 0) {
      bump(esatSubjects, "(none)");
    } else {
      for (const subject of subjects) bump(esatSubjects, subject);
    }

    const unis = Array.isArray(row.target_universities)
      ? (row.target_universities as string[])
      : [];
    if (unis.length === 0) {
      bump(targetUniversities, "(none)");
    } else {
      for (const uni of unis) bump(targetUniversities, uni);
    }

    if (row.is_early_applicant === true) bump(earlyApplicant, "Early / Oct-ish");
    else if (row.is_early_applicant === false) bump(earlyApplicant, "Later / Jan-ish");
    else bump(earlyApplicant, "(not set)");

    if (row.marketing_emails_consent === true) marketingOptIn += 1;
    else if (row.marketing_emails_consent === false) marketingOptOut += 1;
    else marketingNotAsked += 1;

    bump(qbUiSurveyChoice, labelOrUnset(row.qb_session_ui_survey_choice));
    bump(qbUiVariant, labelOrUnset(row.qb_session_ui_variant));
    bump(
      qbUiPreferenceSource,
      labelOrUnset(row.qb_session_ui_preference_source),
    );
  }

  const { data: partners } = await service.from("partners").select("id, slug");
  const partnerSlugById = new Map(
    (partners ?? []).map((p) => [p.id as string, p.slug as string]),
  );

  const { data: cohortCodes } = await service
    .from("partner_cohort_codes")
    .select(
      "code_normalized, label, redemption_count, max_redemptions, status, partner_id",
    )
    .order("redemption_count", { ascending: false });

  const partnerCodes = (cohortCodes ?? []).map((c) => ({
    code: c.code_normalized as string,
    label: (c.label as string | null) ?? null,
    partnerSlug: partnerSlugById.get(c.partner_id as string) ?? null,
    redemptionCount: Number(c.redemption_count ?? 0),
    maxRedemptions: Number(c.max_redemptions ?? 0),
    status: String(c.status ?? ""),
  }));

  const { data: invites } = await service
    .from("partner_invites")
    .select("status");
  const partnerInviteSummary = {
    generated: invites?.length ?? 0,
    redeemed: 0,
    unused: 0,
    revoked: 0,
    expired: 0,
  };
  for (const invite of invites ?? []) {
    const status = String(invite.status ?? "");
    if (status === "redeemed") partnerInviteSummary.redeemed += 1;
    else if (status === "unused") partnerInviteSummary.unused += 1;
    else if (status === "revoked") partnerInviteSummary.revoked += 1;
    else if (status === "expired") partnerInviteSummary.expired += 1;
  }

  const { data: feedbackCodes } = await service
    .from("feedback_referral_codes")
    .select("redeemed_at");
  const codesIssued = feedbackCodes?.length ?? 0;
  const codesRedeemed = (feedbackCodes ?? []).filter((c) => c.redeemed_at).length;

  const { data: submissions, error: submissionsError } = await service
    .from("feedback_referral_submissions")
    .select("id, user_id, answers, created_at")
    .order("created_at", { ascending: false });

  if (submissionsError) {
    throw new Error(submissionsError.message);
  }

  const submissionUserIds = [
    ...new Set(
      (submissions ?? [])
        .map((s) => s.user_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const submissionProfileById = new Map<
    string,
    { username: string | null; email: string | null }
  >();
  if (submissionUserIds.length > 0) {
    const { data: submissionProfiles } = await service
      .from("profiles")
      .select("id, username, email")
      .in("id", submissionUserIds);
    for (const profile of submissionProfiles ?? []) {
      submissionProfileById.set(profile.id as string, {
        username: (profile.username as string | null) ?? null,
        email: (profile.email as string | null) ?? null,
      });
    }
  }

  const mostUseful = new Map<string, number>();
  const leastUseful = new Map<string, number>();
  const partsUsed = new Map<string, number>();
  let recommendSum = 0;
  let recommendCount = 0;
  const submissionRows: FeedbackReferralSubmissionRow[] = [];

  for (const submission of submissions ?? []) {
    const answers = Array.isArray(submission.answers)
      ? (submission.answers as Array<{ questionId?: string; value?: unknown }>)
      : [];
    const profile = submissionProfileById.get(String(submission.user_id ?? ""));
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
      if (id === "most_useful" && typeof value === "string") {
        bump(mostUseful, FEEDBACK_OPTION_LABELS[value] ?? value);
      } else if (id === "least_useful" && typeof value === "string") {
        bump(leastUseful, FEEDBACK_OPTION_LABELS[value] ?? value);
      } else if (id === "parts_used" && Array.isArray(value)) {
        for (const part of value) {
          const key = String(part);
          bump(partsUsed, FEEDBACK_OPTION_LABELS[key] ?? key);
        }
      } else if (id === "recommend" && typeof value === "number") {
        recommendSum += value;
        recommendCount += 1;
      }
    }
  }

  return {
    funnel: {
      totalProfiles: rows.length,
      onboardingCompleted,
      onboardingIncomplete: rows.length - onboardingCompleted,
      hasReferralSource,
      marketingOptIn,
      marketingOptOut,
      marketingNotAsked,
    },
    referralSources: toSortedRows(referralSources),
    examPreference: toSortedRows(examPreference),
    esatSubjects: toSortedRows(esatSubjects),
    targetUniversities: toSortedRows(targetUniversities),
    earlyApplicant: toSortedRows(earlyApplicant),
    qbUiSurveyChoice: toSortedRows(qbUiSurveyChoice),
    qbUiVariant: toSortedRows(qbUiVariant),
    qbUiPreferenceSource: toSortedRows(qbUiPreferenceSource),
    partnerCodes,
    partnerInviteSummary,
    feedbackReferral: {
      codesIssued,
      codesRedeemed,
      codesUnused: codesIssued - codesRedeemed,
      surveySubmissions: submissions?.length ?? 0,
      mostUseful: toSortedRows(mostUseful),
      leastUseful: toSortedRows(leastUseful),
      partsUsed: toSortedRows(partsUsed),
      recommendAvg:
        recommendCount > 0
          ? Math.round((recommendSum / recommendCount) * 10) / 10
          : null,
      recommendCount,
      submissions: submissionRows,
    },
  };
}

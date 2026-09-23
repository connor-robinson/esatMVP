/**
 * Flood mental-maths / drills leaderboards with ~1000 synthetic users.
 *
 * Seeds:
 *   - auth.users + identities (emails *@seed.esatcamp.local)
 *   - profiles (usernames)
 *   - topic_progress (powers /mental-maths/leaderboard)
 *   - drill_sessions (powers post-session global rankings)
 *
 * Score caps: ~800 general, easy topics up to ~900.
 *
 * Run (service role):
 *   npx tsx scripts/seed-drill-leaderboard.ts
 *
 * Cleanup:
 *   npx tsx scripts/seed-drill-leaderboard.ts --cleanup
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SEED_DOMAIN = "seed.esatcamp.local";
const TARGET_USERS = 1000;
const BATCH = 50;

/** Easy topics: scores can reach ~900 */
const EASY_TOPICS = [
  "addition",
  "subtraction",
  "percentages",
  "multiplication",
  "squaring",
] as const;

/** Other topics: cap around 800 */
const OTHER_TOPICS = [
  "division",
  "fractions",
  "common_multiples",
  "linearEquations",
  "exponents",
  "surds",
  "geometry_2d",
  "factors",
  "divisibility",
  "sci_rewrite",
  "powers",
] as const;

const ADJECTIVES = [
  "swift", "calm", "bright", "quiet", "bold", "keen", "lucky", "rapid",
  "steady", "clever", "sharp", "nimble", "crisp", "prime", "vivid", "eager",
  "solid", "brisk", "clear", "noble", "witty", "fresh", "grand", "sable",
];

const NOUNS = [
  "fox", "owl", "lynx", "hawk", "wolf", "bear", "pike", "rook",
  "fern", "wave", "spark", "stone", "comet", "river", "pine", "maple",
  "delta", "nova", "orbit", "quark", "prism", "cipher", "vector", "axiom",
];

function isEasy(topicId: string): boolean {
  return (EASY_TOPICS as readonly string[]).includes(topicId);
}

function maxScoreForTopic(topicId: string): number {
  return isEasy(topicId) ? 900 : 800;
}

/** Biased random in [min, max], higher power → more low scores */
function skewedInt(min: number, max: number, power = 0.55): number {
  const t = Math.pow(Math.random(), power);
  return Math.round(min + t * (max - min));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function usernameFor(i: number): string {
  const adj = ADJECTIVES[(i - 1) % ADJECTIVES.length]!;
  const noun = NOUNS[Math.floor((i - 1) / ADJECTIVES.length) % NOUNS.length]!;
  const base = `${adj}${noun}${i}`;
  return base.slice(0, 20);
}

/** Approximate calculateLeaderboardScore from analytics.ts */
function leaderboardScore(
  attempted: number,
  correct: number,
  avgMs: number,
): number {
  if (attempted <= 0) return 0;
  const accuracy = correct / attempted;
  const speedScore = Math.min(1, 5000 / Math.max(avgMs, 100));
  const volumeScore = Math.log10(attempted + 1) / 4;
  return (accuracy * 0.4 + speedScore * 0.3 + volumeScore * 0.3) * 1000;
}

function statsForTargetScore(cap: number): {
  attempted: number;
  correct: number;
  avgMs: number;
  score: number;
} {
  for (let attempt = 0; attempt < 40; attempt++) {
    const target = skewedInt(140, cap, 0.5);
    const accuracy = 0.55 + Math.random() * 0.43;
    const avgMs = skewedInt(1800, 7500, 1.2);
    // Solve rough volume from leftover budget
    const aPart = accuracy * 0.4;
    const sPart = Math.min(1, 5000 / avgMs) * 0.3;
    const needVolume = Math.max(0.02, target / 1000 - aPart - sPart);
    const volumeUnit = needVolume / 0.3;
    const attempted = Math.max(
      8,
      Math.min(800, Math.round(Math.pow(10, volumeUnit * 4) - 1)),
    );
    const correct = Math.max(
      1,
      Math.min(attempted, Math.round(attempted * accuracy)),
    );
    const score = leaderboardScore(attempted, correct, avgMs);
    if (score <= cap && score >= 100) {
      return { attempted, correct, avgMs, score };
    }
  }
  // Safe fallback under cap
  return {
    attempted: 40,
    correct: 32,
    avgMs: 4200,
    score: leaderboardScore(40, 32, 4200),
  };
}

function sessionScoreForTopic(topicId: string): {
  score: number;
  questionCount: number;
  correct: number;
  avgMs: number;
  accuracy: number;
  avgDifficulty: number;
} {
  const cap = maxScoreForTopic(topicId);
  const score = skewedInt(150, cap, 0.55);
  const questionCount = skewedInt(8, isEasy(topicId) ? 50 : 35, 0.7);
  const accuracy = 0.6 + Math.random() * 0.38;
  const correct = Math.max(1, Math.round(questionCount * accuracy));
  const avgMs = skewedInt(2000, 6500, 1.1);
  const avgDifficulty = isEasy(topicId)
    ? 1.5 + Math.random() * 1.2
    : 3 + Math.random() * 2.5;
  return {
    score,
    questionCount,
    correct,
    avgMs,
    accuracy: (correct / questionCount) * 100,
    avgDifficulty: Math.round(avgDifficulty * 10) / 10,
  };
}

async function cleanup(supabase: SupabaseClient) {
  console.log("Looking up seed users…");
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email")
    .like("email", `%@${SEED_DOMAIN}`);

  if (error) throw error;
  const ids = (profiles ?? []).map((p) => p.id as string);
  console.log(`Deleting ${ids.length} seed users…`);

  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    for (const id of slice) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(id);
      if (delErr) console.warn(`delete ${id}:`, delErr.message);
    }
    console.log(`Deleted ${Math.min(i + BATCH, ids.length)} / ${ids.length}`);
  }
}

async function seed(supabase: SupabaseClient) {
  const { count: existing } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .like("email", `%@${SEED_DOMAIN}`);

  if ((existing ?? 0) > 0) {
    console.log(
      `Found ${existing} existing seed users — cleaning up first…`,
    );
    await cleanup(supabase);
  }

  console.log(`Creating ${TARGET_USERS} seed users…`);
  const allTopics = [...EASY_TOPICS, ...OTHER_TOPICS];
  let created = 0;

  for (let i = 0; i < TARGET_USERS; i += BATCH) {
    const batchSize = Math.min(BATCH, TARGET_USERS - i);
    const userIds: string[] = [];

    for (let j = 0; j < batchSize; j++) {
      const n = i + j + 1;
      const id = randomUUID();
      const email = `drill_${String(n).padStart(4, "0")}@${SEED_DOMAIN}`;
      const username = usernameFor(n);

      const { data, error } = await supabase.auth.admin.createUser({
        id,
        email,
        email_confirm: true,
        user_metadata: {
          is_seed: true,
          seed_batch: "drill_leaderboard_v1",
        },
        app_metadata: {
          provider: "email",
          providers: ["email"],
          is_seed: true,
        },
      });

      if (error || !data.user) {
        console.warn(`createUser ${email}:`, error?.message);
        continue;
      }

      userIds.push(data.user.id);

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          username,
          display_name: username,
          onboarding_completed: true,
        })
        .eq("id", data.user.id);

      if (profileErr) {
        // onboarding_completed may not exist yet — retry without it
        const { error: profileErr2 } = await supabase
          .from("profiles")
          .update({ username, display_name: username })
          .eq("id", data.user.id);
        if (profileErr2) {
          console.warn(`profile ${username}:`, profileErr2.message);
        }
      }
    }

    const progressRows: Array<Record<string, unknown>> = [];
    const sessionRows: Array<Record<string, unknown>> = [];

    for (const userId of userIds) {
      const topicCount = 1 + Math.floor(Math.random() * 3);
      const shuffled = [...allTopics].sort(() => Math.random() - 0.5);
      const topics = shuffled.slice(0, topicCount);

      for (const topicId of topics) {
        const cap = maxScoreForTopic(topicId);
        const stats = statsForTargetScore(cap);
        const lastPracticed = new Date(
          Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000),
        ).toISOString();

        progressRows.push({
          user_id: userId,
          topic_id: topicId,
          current_level: 1 + Math.floor(Math.random() * 4),
          questions_attempted: stats.attempted,
          questions_correct: stats.correct,
          average_time_ms: stats.avgMs,
          last_practiced: lastPracticed,
        });

        // 1–2 drill sessions per topic for post-session global ranks
        const sessions = 1 + (Math.random() > 0.55 ? 1 : 0);
        for (let s = 0; s < sessions; s++) {
          const sess = sessionScoreForTopic(topicId);
          const completedAt = new Date(
            Date.now() - Math.floor(Math.random() * 45 * 24 * 60 * 60 * 1000),
          ).toISOString();
          sessionRows.push({
            id: randomUUID(),
            user_id: userId,
            topic_id: topicId,
            level: 1,
            question_count: sess.questionCount,
            started_at: completedAt,
            completed_at: completedAt,
            accuracy: Math.round(sess.accuracy * 100) / 100,
            average_time_ms: sess.avgMs,
            summary: {
              score: sess.score,
              correctAnswers: sess.correct,
              totalQuestions: sess.questionCount,
              totalTimeMs: sess.avgMs * sess.questionCount,
              avgDifficulty: sess.avgDifficulty,
              is_seed: true,
            },
            created_at: completedAt,
            updated_at: completedAt,
          });
        }
      }
    }

    if (progressRows.length) {
      const { error: tpErr } = await supabase
        .from("topic_progress")
        .upsert(progressRows, { onConflict: "user_id,topic_id" });
      if (tpErr) console.warn("topic_progress:", tpErr.message);
    }

    if (sessionRows.length) {
      const { error: dsErr } = await supabase
        .from("drill_sessions")
        .upsert(sessionRows, { onConflict: "id" });
      if (dsErr) console.warn("drill_sessions:", dsErr.message);
    }

    created += userIds.length;
    console.log(`Seeded ${created} / ${TARGET_USERS} users`);
  }

  console.log("Done.");
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (process.argv.includes("--cleanup")) {
    await cleanup(supabase);
    return;
  }

  await seed(supabase);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

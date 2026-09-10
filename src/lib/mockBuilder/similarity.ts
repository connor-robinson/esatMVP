/**
 * Similarity / duplication checks for mock papers.
 * Deterministic heuristics only (no embeddings).
 */

import type { MockCandidateQuestion, SimilarityIssue } from "./types";

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function mechanismKey(q: MockCandidateQuestion): string {
  return `${q.topicCode}|${q.reasoningType}|${q.mockDifficulty}`;
}

export function findSimilarityIssues(
  ordered: MockCandidateQuestion[],
): SimilarityIssue[] {
  const issues: SimilarityIssue[] = [];
  const tokens = ordered.map((q) => tokenize(q.stemSummary || q.questionStem));

  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      const a = ordered[i];
      const b = ordered[j];
      const posA = i + 1;
      const posB = j + 1;

      if (
        a.topicCode !== "UNTAGGED" &&
        a.topicCode === b.topicCode &&
        a.reasoningType === b.reasoningType &&
        Math.abs(a.mockDifficulty - b.mockDifficulty) <= 1
      ) {
        issues.push({
          a: posA,
          b: posB,
          severity: "medium",
          reason: `Questions ${posA} and ${posB} share topic ${a.topicCode} and reasoning ${a.reasoningType}.`,
        });
      }

      if (mechanismKey(a) === mechanismKey(b)) {
        issues.push({
          a: posA,
          b: posB,
          severity: "high",
          reason: `Questions ${posA} and ${posB} appear to test almost the same mechanism (${a.topicCode}, ${a.reasoningType}).`,
        });
      }

      const sim = jaccard(tokens[i], tokens[j]);
      if (sim >= 0.55) {
        issues.push({
          a: posA,
          b: posB,
          severity: sim >= 0.7 ? "high" : "medium",
          reason: `Questions ${posA} and ${posB} have highly similar wording (overlap ${(sim * 100).toFixed(0)}%).`,
        });
      }
    }
  }

  // Deduplicate identical pairs keeping highest severity
  const byPair = new Map<string, SimilarityIssue>();
  const rank = { high: 3, medium: 2, low: 1 };
  for (const issue of issues) {
    const key = `${Math.min(issue.a, issue.b)}-${Math.max(issue.a, issue.b)}-${issue.reason.slice(0, 40)}`;
    const prev = byPair.get(key);
    if (!prev || rank[issue.severity] > rank[prev.severity]) {
      byPair.set(key, issue);
    }
  }
  return [...byPair.values()];
}

/** True if candidate conflicts with existing paper questions (same mechanism). */
export function conflictsWithPaper(
  candidate: MockCandidateQuestion,
  paper: MockCandidateQuestion[],
  avoidIds: Set<string> = new Set(),
): boolean {
  if (avoidIds.has(candidate.id)) return true;
  const key = mechanismKey(candidate);
  for (const q of paper) {
    if (q.id === candidate.id) return true;
    if (mechanismKey(q) === key) return true;
    const sim = jaccard(
      tokenize(candidate.stemSummary),
      tokenize(q.stemSummary),
    );
    if (sim >= 0.55) return true;
  }
  return false;
}

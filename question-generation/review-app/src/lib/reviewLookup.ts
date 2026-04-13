/**
 * Resolve dashboard / reviewer “jump to question” input: UUID or walkthrough code (LLNN).
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WALKTHROUGH_CODE_RE = /^[A-Z]{2}\d{2}$/;

export type ReviewLookupResult =
  | { kind: "id"; id: string }
  | { kind: "error"; message: string };

export async function resolveReviewQuestionInput(raw: string): Promise<ReviewLookupResult> {
  const q = raw.trim();
  if (!q) {
    return { kind: "error", message: "Enter a question id or walkthrough code." };
  }

  if (UUID_RE.test(q)) {
    return { kind: "id", id: q };
  }

  const code = q.toUpperCase().replace(/\s+/g, "");
  if (WALKTHROUGH_CODE_RE.test(code)) {
    const r = await fetch(
      `/api/review/questions?mediaUploadCode=${encodeURIComponent(code)}&limit=1&slim=1`,
      { cache: "no-store" }
    );
    if (!r.ok) {
      return { kind: "error", message: "Lookup failed. Try again." };
    }
    const data = (await r.json()) as { questions?: { id?: string }[] };
    const id = data.questions?.[0]?.id;
    if (!id) {
      return { kind: "error", message: `No question with walkthrough code ${code}.` };
    }
    return { kind: "id", id };
  }

  return {
    kind: "error",
    message:
      "Use the full question UUID, or a 4-character walkthrough code (two letters + two digits, e.g. AB12).",
  };
}

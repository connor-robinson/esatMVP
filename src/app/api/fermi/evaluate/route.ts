import { NextResponse } from "next/server";
import { parseFermiInput } from "@/lib/fermi/parseNumber";
import { closenessScore, getVerdict, logError } from "@/lib/fermi/scoring";
import {
  buildQuestionNote,
  scheduledQuestionId,
  toPublicQuestion,
} from "@/lib/fermi/scheduledBatch";
import { getScheduledRowByPublicId } from "@/lib/fermi/resolveDailyRound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EvaluateBody = {
  questionId: string;
  guess: number | string;
};

export async function POST(request: Request) {
  let body: EvaluateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { questionId } = body;
  const guess =
    typeof body.guess === "number"
      ? body.guess
      : parseFermiInput(String(body.guess ?? ""));

  if (!questionId || guess == null || !Number.isFinite(guess) || guess <= 0) {
    return NextResponse.json({ error: "Invalid question or guess" }, { status: 400 });
  }

  const row = await getScheduledRowByPublicId(questionId);
  if (!row) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const logErr = logError(guess, row.answer);
  const verdict = getVerdict(guess, row.answer);
  const score = closenessScore(logErr);
  const publicQuestion = toPublicQuestion(row);

  return NextResponse.json({
    question: {
      ...publicQuestion,
      answer: row.answer,
      note: buildQuestionNote(row.source_note, row.seasonal_note),
    },
    guess,
    logErr,
    score,
    verdict,
    questionId: scheduledQuestionId(row.batch_item_id),
  });
}

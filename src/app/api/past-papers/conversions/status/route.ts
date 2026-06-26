import { NextResponse } from "next/server";
import { isQuestionGenerationEnabled } from "@/lib/features";
import { readConversionStatus } from "@/lib/papers/conversionStatus";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isQuestionGenerationEnabled()) {
    return NextResponse.json({ error: "Not enabled" }, { status: 403 });
  }
  return NextResponse.json(readConversionStatus());
}

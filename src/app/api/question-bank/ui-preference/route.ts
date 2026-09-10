import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import {
  isQuestionBankSessionUiVariant,
  isQuestionBankUiPreferenceSource,
  type QuestionBankSessionUiVariant,
  type QuestionBankUiPreferenceChoice,
  type QuestionBankUiPreferenceSource,
} from "@/lib/questionBank/sessionUiPreference";

export const dynamic = "force-dynamic";

type PreferenceRow = {
  qb_session_ui_variant: string | null;
  qb_session_ui_survey_choice: string | null;
  qb_session_ui_preference_source: string | null;
  qb_session_ui_preference_updated_at: string | null;
};

function serialize(row: PreferenceRow | null) {
  const variant =
    row?.qb_session_ui_variant &&
    isQuestionBankSessionUiVariant(row.qb_session_ui_variant)
      ? row.qb_session_ui_variant
      : null;
  const surveyChoice =
    row?.qb_session_ui_survey_choice &&
    isQuestionBankSessionUiVariant(row.qb_session_ui_survey_choice)
      ? (row.qb_session_ui_survey_choice as QuestionBankUiPreferenceChoice)
      : null;
  const source =
    row?.qb_session_ui_preference_source &&
    isQuestionBankUiPreferenceSource(row.qb_session_ui_preference_source)
      ? row.qb_session_ui_preference_source
      : null;

  return {
    variant,
    surveyChoice,
    source,
    updatedAt: row?.qb_session_ui_preference_updated_at ?? null,
  };
}

/**
 * GET /api/question-bank/ui-preference
 * Current user's saved question bank UI preference.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await (supabase as any)
      .from("profiles")
      .select(
        "qb_session_ui_variant, qb_session_ui_survey_choice, qb_session_ui_preference_source, qb_session_ui_preference_updated_at",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch preference" },
        { status: 500 },
      );
    }

    return NextResponse.json(serialize((data as PreferenceRow | null) ?? null));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/question-bank/ui-preference
 * Persist current chrome variant and optional survey choice.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const variantRaw = body?.variant;
    const surveyChoiceRaw = body?.surveyChoice;
    const sourceRaw = body?.source;

    if (!isQuestionBankSessionUiVariant(variantRaw)) {
      return NextResponse.json(
        { error: "variant must be esat or classic" },
        { status: 400 },
      );
    }

    const variant = variantRaw as QuestionBankSessionUiVariant;
    const source: QuestionBankUiPreferenceSource =
      isQuestionBankUiPreferenceSource(sourceRaw) ? sourceRaw : "toggle";

    const updateData: Record<string, unknown> = {
      qb_session_ui_variant: variant,
      qb_session_ui_preference_source: source,
      qb_session_ui_preference_updated_at: new Date().toISOString(),
    };

    if (surveyChoiceRaw !== undefined && surveyChoiceRaw !== null) {
      if (!isQuestionBankSessionUiVariant(surveyChoiceRaw)) {
        return NextResponse.json(
          { error: "surveyChoice must be esat or classic" },
          { status: 400 },
        );
      }
      updateData.qb_session_ui_survey_choice =
        surveyChoiceRaw as QuestionBankUiPreferenceChoice;
    }

    const { data, error } = await (supabase as any)
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select(
        "qb_session_ui_variant, qb_session_ui_survey_choice, qb_session_ui_preference_source, qb_session_ui_preference_updated_at",
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save preference" },
        { status: 500 },
      );
    }

    return NextResponse.json(serialize((data as PreferenceRow | null) ?? null));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

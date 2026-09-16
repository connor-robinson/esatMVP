import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import {
  isPastPapersUiPreference,
  isPastPapersUiPreferenceSource,
  normalizePastPapersUiPreference,
  type PastPapersUiPreferenceSource,
} from "@/lib/papers/pastPapersUiPreference";

export const dynamic = "force-dynamic";

type PreferenceRow = {
  past_papers_ui_preference: string | null;
  past_papers_ui_survey_choice: string | null;
  past_papers_ui_preference_source: string | null;
  past_papers_ui_preference_updated_at: string | null;
};

function serialize(row: PreferenceRow | null) {
  const preference = normalizePastPapersUiPreference(
    row?.past_papers_ui_preference,
  );
  const surveyChoice = normalizePastPapersUiPreference(
    row?.past_papers_ui_survey_choice,
  );
  const source =
    row?.past_papers_ui_preference_source &&
    isPastPapersUiPreferenceSource(row.past_papers_ui_preference_source)
      ? row.past_papers_ui_preference_source
      : null;

  return {
    preference,
    surveyChoice,
    source,
    updatedAt: row?.past_papers_ui_preference_updated_at ?? null,
  };
}

/**
 * GET /api/past-papers/ui-preference
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
        "past_papers_ui_preference, past_papers_ui_survey_choice, past_papers_ui_preference_source, past_papers_ui_preference_updated_at",
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
 * POST /api/past-papers/ui-preference
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const preferenceRaw = body?.preference;
    const surveyChoiceRaw = body?.surveyChoice;
    const sourceRaw = body?.source;

    const preference = normalizePastPapersUiPreference(preferenceRaw);
    if (!preference || !isPastPapersUiPreference(preference)) {
      return NextResponse.json(
        { error: "preference must be home, library, or roadmap" },
        { status: 400 },
      );
    }

    const source: PastPapersUiPreferenceSource =
      isPastPapersUiPreferenceSource(sourceRaw) ? sourceRaw : "toggle";

    const updateData: Record<string, unknown> = {
      past_papers_ui_preference: preference,
      past_papers_ui_preference_source: source,
      past_papers_ui_preference_updated_at: new Date().toISOString(),
    };

    if (surveyChoiceRaw !== undefined && surveyChoiceRaw !== null) {
      const surveyChoice = normalizePastPapersUiPreference(surveyChoiceRaw);
      if (!surveyChoice) {
        return NextResponse.json(
          { error: "surveyChoice must be home, library, or roadmap" },
          { status: 400 },
        );
      }
      updateData.past_papers_ui_survey_choice = surveyChoice;
    }

    const { data, error } = await (supabase as any)
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select(
        "past_papers_ui_preference, past_papers_ui_survey_choice, past_papers_ui_preference_source, past_papers_ui_preference_updated_at",
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

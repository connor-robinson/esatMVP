import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { createTesterServiceClient, getTesterConfig } from "@/lib/tester/service";
import {
  syncTesterProgramme,
  getPaidAccess,
  buildTesterState,
} from "@/lib/tester/access";
import { logTesterEvent } from "@/lib/tester/analytics";
import type { TesterProgrammeRow } from "@/lib/tester/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/tester/join
 * Records programme consents and enrols the user (status: stage_1_survey_pending).
 * Stage 1 premium access is granted only once the initial survey is submitted.
 *
 * Body: {
 *   understandTemporary: boolean,   // access is temporary
 *   agreeFeedback: boolean,         // will complete required feedback surveys
 *   essentialEmails: boolean,       // consent to essential tester emails
 *   marketing?: boolean,            // OPTIONAL, stored separately
 *   trafficSource?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const understandTemporary = body.understandTemporary === true;
    const agreeFeedback = body.agreeFeedback === true;
    const essentialEmails = body.essentialEmails === true;
    const marketing = body.marketing === true;
    const trafficSource =
      typeof body.trafficSource === "string" ? body.trafficSource.slice(0, 200) : null;

    if (!understandTemporary || !agreeFeedback || !essentialEmails) {
      return NextResponse.json(
        {
          error:
            "You must accept the three required tester agreements to join.",
        },
        { status: 400 },
      );
    }

    const service = createTesterServiceClient();
    const config = await getTesterConfig(service);
    const paid = await getPaidAccess(service, user.id);

    if (paid.hasPaid && !config.offer_to_paid_users) {
      return NextResponse.json(
        {
          error:
            "You already have full premium access, so the tester programme is not available.",
        },
        { status: 400 },
      );
    }

    // Already a member? Return current state (idempotent - one join per user).
    const { data: existing } = await service
      .from("tester_programmes")
      .select("id, programme_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing && existing.programme_status !== "not_joined") {
      const { state } = await syncTesterProgramme(service, user.id);
      return NextResponse.json({ state, alreadyMember: true });
    }

    const nowIso = new Date().toISOString();
    const { data: inserted, error: insertError } = await service
      .from("tester_programmes")
      .insert({
        user_id: user.id,
        programme_status: "stage_1_survey_pending",
        current_stage: 0,
        joined_at: nowIso,
        essential_emails_consent: essentialEmails,
        marketing_consent: marketing,
        terms_accepted_at: nowIso,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      const msg = insertError?.message ?? "";
      if (
        insertError?.code === "42P01" ||
        msg.includes("does not exist") ||
        msg.includes("tester_programmes")
      ) {
        return NextResponse.json(
          {
            error:
              "The Founding Tester Programme is not set up in the database yet. Apply migration 20260703000000_founding_tester_programme.sql in Supabase.",
          },
          { status: 503 },
        );
      }
      // Unique violation (race) - someone just enrolled; return current state.
      const { state } = await syncTesterProgramme(service, user.id);
      if (state.isMember) {
        return NextResponse.json({ state, alreadyMember: true });
      }
      return NextResponse.json(
        { error: "Could not join the programme. Please try again." },
        { status: 500 },
      );
    }

    const row = inserted as TesterProgrammeRow;

    await logTesterEvent(service, {
      userId: user.id,
      programmeId: row.id,
      event: "tester_programme_join_started",
      trafficSource,
      metadata: { marketing },
    });

    const state = buildTesterState(row, config, paid, Date.now());
    return NextResponse.json({ state });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

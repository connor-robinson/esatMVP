import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import {
  DEFAULT_BLUEPRINTS,
  getDefaultBlueprint,
  mergeBlueprintConfig,
} from "@/lib/mockBuilder/blueprints";
import {
  MOCK_BUILDER_SUBJECTS,
  type MockBlueprintConfig,
  type MockBuilderSubject,
} from "@/lib/mockBuilder/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  const { data } = await admin.service
    .from("esat_mock_blueprints")
    .select("*")
    .order("subject");

  const defaults = Object.fromEntries(
    MOCK_BUILDER_SUBJECTS.map((s) => [s, getDefaultBlueprint(s)]),
  );

  return NextResponse.json({
    defaults,
    saved: data ?? [],
  });
}

export async function PUT(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  try {
    const body = await request.json();
    const subject = body.subject as MockBuilderSubject;
    if (!MOCK_BUILDER_SUBJECTS.includes(subject)) {
      return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
    }
    const config = mergeBlueprintConfig(
      DEFAULT_BLUEPRINTS[subject],
      body.config as Partial<MockBlueprintConfig>,
    );

    // Upsert default blueprint for subject
    const { data: existing } = await admin.service
      .from("esat_mock_blueprints")
      .select("id")
      .eq("subject", subject)
      .eq("is_default", true)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await admin.service
        .from("esat_mock_blueprints")
        .update({
          config,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ blueprint: data });
    }

    const { data, error } = await admin.service
      .from("esat_mock_blueprints")
      .insert({
        subject,
        name: "Default",
        config,
        is_default: true,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ blueprint: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}

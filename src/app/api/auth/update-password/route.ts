import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/auth/recovery";
import {
  MIN_PASSWORD_LENGTH,
  validatePassword,
} from "@/lib/auth/password";
import { mapAuthError } from "@/lib/auth/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = createRouteClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const password =
      typeof body?.password === "string" ? body.password : "";
    const check = validatePassword(password);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      return NextResponse.json(
        { error: mapAuthError(updateError, "Could not update your password.") },
        { status: 400 },
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(PASSWORD_RECOVERY_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

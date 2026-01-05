/**
 * Profile API route for managing user profiles
 */

import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { UserProfileInsert, UserProfileUpdate } from "@/lib/supabase/types";

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("[profile] Error fetching profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const supabase = createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { display_name, avatar_url, bio } = body;

  // Check if profile exists
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (existing) {
    // Update existing profile
    const update: UserProfileUpdate = {};
    if (display_name !== undefined) update.display_name = display_name;
    if (avatar_url !== undefined) update.avatar_url = avatar_url;
    if (bio !== undefined) update.bio = bio;

    const { data: profile, error } = await supabase
      .from("user_profiles")
      // @ts-ignore - Type inference issue with user_profiles Update type
      .update(update)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("[profile] Error updating profile:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } else {
    // Create new profile
    const insert: UserProfileInsert = {
      id: user.id,
      display_name: display_name || `User${Math.floor(Math.random() * 9999) + 1}`,
      avatar_url: avatar_url || null,
      bio: bio || null,
    };

    const { data: profile, error } = await supabase
      .from("user_profiles")
      // @ts-ignore - Type inference issue with user_profiles Insert type
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.error("[profile] Error creating profile:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
  }
}

export async function PATCH(request: Request) {
  const supabase = createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { display_name, avatar_url, bio } = body;

  const update: UserProfileUpdate = {};
  if (display_name !== undefined) update.display_name = display_name;
  if (avatar_url !== undefined) update.avatar_url = avatar_url;
  if (bio !== undefined) update.bio = bio;

  const { data: profile, error } = await supabase
    .from("user_profiles")
    // @ts-ignore - Type inference issue with user_profiles Update type
    .update(update)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[profile] Error updating profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}


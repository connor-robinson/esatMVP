/**
 * Profile page - User account information and quick stats
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/shared/PageHeader";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type PaperSession = Database["public"]["Tables"]["paper_sessions"]["Row"];

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSessions: 0,
    recentSessions: 0,
  });

  useEffect(() => {
    if (!session?.user) {
      router.push("/login?redirectTo=/profile");
      return;
    }

    async function loadProfile() {
      try {
        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error("[profile] Error loading profile:", profileError);
        } else {
          setProfile(profileData);
        }

        // Load session stats
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("paper_sessions")
          .select("id, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (!sessionsError && sessionsData) {
          const total = sessionsData.length;
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const recent = sessionsData.filter(
            (s) => new Date(s.created_at) >= sevenDaysAgo
          ).length;

          setStats({
            totalSessions: total,
            recentSessions: recent,
          });
        }
      } catch (error) {
        console.error("[profile] Error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [session, supabase, router]);

  if (!session?.user) {
    return null;
  }

  if (loading) {
    return (
      <Container size="lg">
        <div className="space-y-8">
          <PageHeader title="Profile" />
          <Card className="p-8">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </Card>
        </div>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <div className="space-y-8">
        <PageHeader
          title="Profile"
          description="Your account information and activity overview."
        />

        {/* User Info Card */}
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100 mb-4 uppercase tracking-wider">
                Account Information
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Email
                </label>
                <div className="text-base text-neutral-100">
                  {profile?.email || session.user.email || "Not available"}
                </div>
              </div>

              {profile?.full_name && (
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Name
                  </label>
                  <div className="text-base text-neutral-100">{profile.full_name}</div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Account Type
                </label>
                <div className="text-base text-neutral-100 capitalize">
                  {profile?.role || "user"}
                </div>
              </div>

              {profile?.created_at && (
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Member Since
                  </label>
                  <div className="text-base text-neutral-100">
                    {new Date(profile.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {stats.totalSessions}
            </div>
            <div className="text-sm text-neutral-400">Total Sessions</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-cyan-400 mb-2">
              {stats.recentSessions}
            </div>
            <div className="text-sm text-neutral-400">Sessions This Week</div>
          </Card>
        </div>

        {/* Quick Links */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100 mb-4 uppercase tracking-wider">
                Analytics & History
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/papers/analytics">
                <Card variant="flat" className="p-4 hover:bg-white/10 transition-colors duration-fast cursor-pointer">
                  <div className="space-y-2">
                    <div className="font-medium text-neutral-100">Papers Analytics</div>
                    <div className="text-sm text-neutral-400">
                      View detailed analytics for your paper sessions
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/train/analytics">
                <Card variant="flat" className="p-4 hover:bg-white/10 transition-colors duration-fast cursor-pointer">
                  <div className="space-y-2">
                    <div className="font-medium text-neutral-100">Train Analytics</div>
                    <div className="text-sm text-neutral-400">
                      Track your training progress and performance
                    </div>
                  </div>
                </Card>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </Container>
  );
}


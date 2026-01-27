/**
 * Profile Settings page - Comprehensive user settings and preferences
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/shared/PageHeader";
import { CountdownCard } from "@/components/profile/CountdownCard";
import { DeleteAccountModal } from "@/components/profile/DeleteAccountModal";
import { ChangePasswordModal } from "@/components/profile/ChangePasswordModal";
import { ChangeEmailModal } from "@/components/profile/ChangeEmailModal";
import { ResetDataModal } from "@/components/profile/ResetDataModal";
import { cn } from "@/lib/utils";
import { 
  LogOut, 
  Trash2, 
  Download, 
  RotateCcw, 
  Mail, 
  Lock, 
  User, 
  BookOpen, 
  Settings, 
  Eye, 
  Type,
  Info,
  ExternalLink
} from "lucide-react";
import type { ExamType } from "@/lib/profile/countdown";

type Preferences = {
  nickname: string | null;
  exam_preference: ExamType | null;
  esat_subjects: string[];
  is_early_applicant: boolean;
  has_extra_time: boolean;
  extra_time_percentage: number;
  has_rest_breaks: boolean;
  font_size: 'small' | 'medium' | 'large';
  reduced_motion: boolean;
  dark_mode: boolean;
};

const ESAT_SUBJECTS = ['Math 1', 'Math 2', 'Chemistry', 'Biology', 'Physics'];

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({
    nickname: null,
    exam_preference: null,
    esat_subjects: [],
    is_early_applicant: true,
    has_extra_time: false,
    extra_time_percentage: 25,
    has_rest_breaks: false,
    font_size: 'medium',
    reduced_motion: false,
    dark_mode: false,
  });
  const [email, setEmail] = useState<string>("");
  
  // Modal states
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showResetData, setShowResetData] = useState(false);

  // Load preferences
  useEffect(() => {
    async function loadPreferences() {
      if (!session?.user) {
        router.push("/login?redirectTo=/profile");
        return;
      }

      try {
        setEmail(session.user.email || "");

        const response = await fetch("/api/profile/preferences");
        if (response.ok) {
          const data = await response.json();
          setPreferences({
            nickname: data.nickname || null,
            exam_preference: data.exam_preference || null,
            esat_subjects: data.esat_subjects || [],
            is_early_applicant: data.is_early_applicant ?? true,
            has_extra_time: data.has_extra_time ?? false,
            extra_time_percentage: data.extra_time_percentage ?? 25,
            has_rest_breaks: data.has_rest_breaks ?? false,
            font_size: data.font_size || 'medium',
            reduced_motion: data.reduced_motion ?? false,
            dark_mode: data.dark_mode ?? false,
          });
        }
      } catch (error) {
        console.error("[profile] Error loading preferences:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, [session, router]);

  const savePreferences = async (updates: Partial<Preferences>, section?: string) => {
    if (!session?.user) return;

    setSaving(section || "preferences");
    try {
      const response = await fetch("/api/profile/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save preferences");
      }

      const data = await response.json();
      setPreferences((prev) => ({ ...prev, ...data }));
      
      // Refresh roadmap if exam preference changed
      if (updates.exam_preference !== undefined) {
        router.refresh();
      }
    } catch (error: any) {
      console.error("[profile] Error saving preferences:", error);
      alert(error.message || "Failed to save preferences");
    } finally {
      setSaving(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    const response = await fetch("/api/profile/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete account");
    }

    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    const response = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to change password");
    }
  };

  const handleChangeEmail = async (newEmail: string, password: string) => {
    const response = await fetch("/api/profile/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to change email");
    }

    setEmail(newEmail);
  };

  const handleExportData = async () => {
    try {
      const response = await fetch("/api/profile/export");
      if (!response.ok) throw new Error("Failed to export data");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-data-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("[profile] Error exporting data:", error);
      alert(error.message || "Failed to export data");
    }
  };

  const handleResetData = async () => {
    const response = await fetch("/api/profile/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "RESET" }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to reset data");
    }

    router.refresh();
  };

  const handleESATSubjectToggle = (subject: string) => {
    const current = preferences.esat_subjects || [];
    let newSubjects: string[];
    
    if (current.includes(subject)) {
      newSubjects = current.filter((s) => s !== subject);
    } else {
      if (current.length >= 3) {
        alert("You must select exactly 3 subjects for ESAT");
        return;
      }
      newSubjects = [...current, subject];
    }

    setPreferences((prev) => ({ ...prev, esat_subjects: newSubjects }));
    savePreferences({ esat_subjects: newSubjects }, "esat_subjects");
  };

  if (!session?.user) {
    return null;
  }

  if (loading) {
    return (
      <Container size="lg">
        <div className="space-y-8">
          <PageHeader title="Settings" />
          <Card className="p-8">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </Card>
        </div>
      </Container>
    );
  }

  const esatSubjectsSelected = (preferences.esat_subjects || []).length;
  const canSaveESAT = preferences.exam_preference !== 'ESAT' || esatSubjectsSelected === 3;

  // Calculate time with extra time
  const getTimeWithExtraTime = () => {
    if (!preferences.has_extra_time) return null;
    const percentage = preferences.extra_time_percentage || 25;
    if (preferences.exam_preference === 'TMUA') {
      const baseMinutes = 150; // 2h 30m
      const extra = baseMinutes * (percentage / 100);
      const total = baseMinutes + extra;
      const hours = Math.floor(total / 60);
      const minutes = Math.round(total % 60);
      return `${hours}h ${minutes}m`;
    } else if (preferences.exam_preference === 'ESAT') {
      const baseMinutes = 40; // per module
      const extra = baseMinutes * (percentage / 100);
      const total = baseMinutes + extra;
      return `${Math.round(total)}m`;
    }
    return null;
  };

  return (
    <Container size="lg">
      <div className="space-y-8">
        <PageHeader
          title="Settings"
          description="Manage your account, preferences, and data."
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar with Countdown */}
          <div className="lg:col-span-1">
            <CountdownCard
              examType={preferences.exam_preference}
              isEarlyApplicant={preferences.is_early_applicant}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* 1. Account Basics */}
            <Card className="p-6 bg-white/[0.02] border border-white/10">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-white/60" strokeWidth={2} />
                  <h2 className="text-lg font-mono text-white/90 font-semibold uppercase tracking-wide">
                    Account Basics
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Nickname */}
                  <div>
                    <label className="block text-sm font-mono text-white/70 mb-2">
                      Nickname
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={preferences.nickname || ""}
                        onChange={(e) => setPreferences((prev) => ({ ...prev, nickname: e.target.value }))}
                        onBlur={() => savePreferences({ nickname: preferences.nickname }, "nickname")}
                        placeholder="Enter your nickname"
                        className="flex-1"
                      />
                      {saving === "nickname" && (
                        <div className="flex items-center px-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-mono text-white/70 mb-2">
                      Email
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={email}
                        disabled
                        className="flex-1 bg-white/5 text-white/50"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowChangeEmail(true)}
                      >
                        <Mail className="w-4 h-4" strokeWidth={2} />
                        Change
                      </Button>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-mono text-white/70 mb-2">
                      Password
                    </label>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowChangePassword(true)}
                    >
                      <Lock className="w-4 h-4" strokeWidth={2} />
                      Change Password
                    </Button>
                  </div>

                  {/* Logout */}
                  <div className="pt-4 border-t border-white/10">
                    <Button
                      variant="secondary"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" strokeWidth={2} />
                      Logout
                    </Button>
                  </div>

                  {/* Delete Account */}
                  <div className="pt-4 border-t border-red-500/30">
                    <Button
                      variant="danger"
                      onClick={() => setShowDeleteAccount(true)}
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={2} />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* 2. Exam and Subject Preferences */}
            <Card className="p-6 bg-white/[0.02] border border-white/10">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-white/60" strokeWidth={2} />
                  <h2 className="text-lg font-mono text-white/90 font-semibold uppercase tracking-wide">
                    Exam and Subject Preferences
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Exam Type */}
                  <div>
                    <label className="block text-sm font-mono text-white/70 mb-3">
                      Exam Type
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="exam_preference"
                          value="ESAT"
                          checked={preferences.exam_preference === 'ESAT'}
                          onChange={(e) => {
                            const newPref = e.target.value as ExamType;
                            setPreferences((prev) => ({ ...prev, exam_preference: newPref, esat_subjects: [] }));
                            savePreferences({ exam_preference: newPref, esat_subjects: [] }, "exam_preference");
                          }}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                        />
                        <span className="text-sm font-mono text-white/80 group-hover:text-white/90">ESAT</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="exam_preference"
                          value="TMUA"
                          checked={preferences.exam_preference === 'TMUA'}
                          onChange={(e) => {
                            const newPref = e.target.value as ExamType;
                            setPreferences((prev) => ({ ...prev, exam_preference: newPref, esat_subjects: [] }));
                            savePreferences({ exam_preference: newPref, esat_subjects: [] }, "exam_preference");
                          }}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                        />
                        <span className="text-sm font-mono text-white/80 group-hover:text-white/90">TMUA</span>
                      </label>
                    </div>
                  </div>

                  {/* ESAT Subjects */}
                  {preferences.exam_preference === 'ESAT' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-mono text-white/70">
                          ESAT Subjects (Select exactly 3)
                        </label>
                        <span className={cn(
                          "text-xs font-mono",
                          esatSubjectsSelected === 3 ? "text-green-400" : "text-yellow-400"
                        )}>
                          {esatSubjectsSelected} / 3 selected
                        </span>
                      </div>
                      <div className="space-y-2">
                        {ESAT_SUBJECTS.map((subject) => (
                          <label
                            key={subject}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-organic-md border cursor-pointer transition-all duration-fast",
                              (preferences.esat_subjects || []).includes(subject)
                                ? "bg-primary/20 border-primary/50 text-white/90"
                                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={(preferences.esat_subjects || []).includes(subject)}
                              onChange={() => handleESATSubjectToggle(subject)}
                              disabled={!canSaveESAT && !(preferences.esat_subjects || []).includes(subject)}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer disabled:opacity-50"
                            />
                            <span className="text-sm font-mono">{subject}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-3">
                        <a
                          href="#"
                          className="text-xs font-mono text-primary hover:text-primary-hover flex items-center gap-1"
                        >
                          Not sure what to take? <span className="underline">Learn more</span>
                          <ExternalLink className="w-3 h-3" strokeWidth={2} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* 3. Practice Behavior */}
            <Card className="p-6 bg-white/[0.02] border border-white/10">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-white/60" strokeWidth={2} />
                  <h2 className="text-lg font-mono text-white/90 font-semibold uppercase tracking-wide">
                    Practice Behavior
                  </h2>
                </div>

                <div className="space-y-6">
                  {/* Application Type */}
                  <div>
                    <label className="block text-sm font-mono text-white/70 mb-3">
                      Application Type
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="applicant_type"
                          checked={preferences.is_early_applicant}
                          onChange={() => {
                            setPreferences((prev) => ({ ...prev, is_early_applicant: true }));
                            savePreferences({ is_early_applicant: true }, "applicant_type");
                          }}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                        />
                        <span className="text-sm font-mono text-white/80 group-hover:text-white/90">Early Applicant</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="applicant_type"
                          checked={!preferences.is_early_applicant}
                          onChange={() => {
                            setPreferences((prev) => ({ ...prev, is_early_applicant: false }));
                            savePreferences({ is_early_applicant: false }, "applicant_type");
                          }}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                        />
                        <span className="text-sm font-mono text-white/80 group-hover:text-white/90">Late Applicant</span>
                      </label>
                    </div>
                  </div>

                  {/* Exam Arrangements */}
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <h3 className="text-sm font-mono text-white/70 uppercase tracking-wide">
                      Exam Arrangements
                    </h3>

                    {/* Extra Time */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={preferences.has_extra_time}
                          onChange={(e) => {
                            setPreferences((prev) => ({ ...prev, has_extra_time: e.target.checked }));
                            savePreferences({ has_extra_time: e.target.checked }, "extra_time");
                          }}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-mono text-white/80 group-hover:text-white/90">
                            Extra Time
                          </span>
                          <p className="text-xs font-mono text-white/50 mt-1">
                            Standard award: 25% additional time on top of normal test duration.
                          </p>
                        </div>
                      </label>

                      {preferences.has_extra_time && (
                        <div className="ml-7 space-y-2">
                          <div>
                            <label className="block text-xs font-mono text-white/60 mb-1">
                              Extra Time Percentage
                            </label>
                            <div className="flex gap-2 items-center">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={preferences.extra_time_percentage}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 25;
                                  setPreferences((prev) => ({ ...prev, extra_time_percentage: value }));
                                }}
                                onBlur={() => savePreferences({ extra_time_percentage: preferences.extra_time_percentage }, "extra_time_percentage")}
                                className="w-24"
                              />
                              <span className="text-xs font-mono text-white/50">%</span>
                            </div>
                          </div>
                          {getTimeWithExtraTime() && (
                            <div className="text-xs font-mono text-white/60 bg-white/5 p-2 rounded-organic-md">
                              {preferences.exam_preference === 'TMUA' 
                                ? `TMUA: ~${getTimeWithExtraTime()} with +${preferences.extra_time_percentage}%`
                                : `ESAT: ~${getTimeWithExtraTime()} per module with +${preferences.extra_time_percentage}%`
                              }
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Rest Breaks */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={preferences.has_rest_breaks}
                        onChange={(e) => {
                          setPreferences((prev) => ({ ...prev, has_rest_breaks: e.target.checked }));
                          savePreferences({ has_rest_breaks: e.target.checked }, "rest_breaks");
                        }}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-mono text-white/80 group-hover:text-white/90">
                          Rest Breaks
                        </span>
                        <p className="text-xs font-mono text-white/50 mt-1">
                          Request rest breaks / "pause-the-clock" breaks during the exam.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </Card>

            {/* 4. Progress and Data */}
            <Card className="p-6 bg-white/[0.02] border border-white/10">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-white/60" strokeWidth={2} />
                  <h2 className="text-lg font-mono text-white/90 font-semibold uppercase tracking-wide">
                    Progress and Data
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Button
                      variant="secondary"
                      onClick={handleExportData}
                    >
                      <Download className="w-4 h-4" strokeWidth={2} />
                      Export Results (CSV)
                    </Button>
                    <p className="text-xs font-mono text-white/50 mt-2">
                      Download all your sessions, attempts, and progress data
                    </p>
                  </div>

                  <div className="pt-4 border-t border-red-500/30">
                    <Button
                      variant="danger"
                      onClick={() => setShowResetData(true)}
                    >
                      <RotateCcw className="w-4 h-4" strokeWidth={2} />
                      Reset All Data
                    </Button>
                    <p className="text-xs font-mono text-white/50 mt-2">
                      Permanently delete all your sessions, attempts, and progress
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* 5. Visual / UI Preferences */}
            <Card className="p-6 bg-white/[0.02] border border-white/10">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-white/60" strokeWidth={2} />
                  <h2 className="text-lg font-mono text-white/90 font-semibold uppercase tracking-wide">
                    Visual / UI Preferences
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Font Size */}
                  <div>
                    <label className="block text-sm font-mono text-white/70 mb-3">
                      Font Size
                    </label>
                    <div className="flex gap-4">
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <label key={size} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="radio"
                            name="font_size"
                            value={size}
                            checked={preferences.font_size === size}
                            onChange={() => {
                              setPreferences((prev) => ({ ...prev, font_size: size }));
                              savePreferences({ font_size: size }, "font_size");
                            }}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                          />
                          <span className="text-sm font-mono text-white/80 group-hover:text-white/90 capitalize">
                            {size}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Reduced Motion */}
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={preferences.reduced_motion}
                      onChange={(e) => {
                        setPreferences((prev) => ({ ...prev, reduced_motion: e.target.checked }));
                        savePreferences({ reduced_motion: e.target.checked }, "reduced_motion");
                      }}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                    />
                    <span className="text-sm font-mono text-white/80 group-hover:text-white/90">
                      Reduced Motion
                    </span>
                  </label>

                  {/* Dark Mode (Disabled) */}
                  <div className="opacity-50">
                    <label className="flex items-center gap-3 cursor-not-allowed">
                      <input
                        type="checkbox"
                        checked={preferences.dark_mode}
                        disabled
                        className="w-4 h-4 rounded border-white/20 bg-white/5 cursor-not-allowed"
                      />
                      <span className="text-sm font-mono text-white/60">
                        Dark Mode <span className="text-xs">(Coming soon)</span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DeleteAccountModal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onConfirm={handleDeleteAccount}
      />
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onConfirm={handleChangePassword}
      />
      <ChangeEmailModal
        isOpen={showChangeEmail}
        onClose={() => setShowChangeEmail(false)}
        currentEmail={email}
        onConfirm={handleChangeEmail}
      />
      <ResetDataModal
        isOpen={showResetData}
        onClose={() => setShowResetData(false)}
        onConfirm={handleResetData}
      />
    </Container>
  );
}

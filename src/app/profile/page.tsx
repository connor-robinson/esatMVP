/**
 * Profile Settings page - Modern, minimal, and aesthetic design
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Container } from "@/components/layout/Container";
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
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon
} from "lucide-react";
import type { ExamType } from "@/lib/profile/countdown";
import { useTheme } from "@/contexts/ThemeContext";

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

type SettingSection = {
  id: string;
  title: string;
  icon: React.ReactNode;
};

const SETTING_SECTIONS: SettingSection[] = [
  { id: 'account', title: 'Account', icon: <User className="w-4 h-4" /> },
  { id: 'exam', title: 'Exam & Practice', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'data', title: 'Data Management', icon: <Download className="w-4 h-4" /> },
  { id: 'appearance', title: 'Appearance', icon: <Eye className="w-4 h-4" /> },
];

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const { theme, toggleTheme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('account');
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
      // Deselect if already selected
      newSubjects = current.filter((s) => s !== subject);
    } else {
      // If already at 3, replace the first one with the new selection
      if (current.length >= 3) {
        newSubjects = [current[1], current[2], subject];
      } else {
        newSubjects = [...current, subject];
      }
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Container>
    );
  }

  const esatSubjectsSelected = (preferences.esat_subjects || []).length;
  const canSaveESAT = preferences.exam_preference !== 'ESAT' || esatSubjectsSelected === 3;

  const getTimeWithExtraTime = () => {
    if (!preferences.has_extra_time) return null;
    const percentage = preferences.extra_time_percentage || 25;
    if (preferences.exam_preference === 'TMUA') {
      const baseMinutes = 150;
      const extra = baseMinutes * (percentage / 100);
      const total = baseMinutes + extra;
      const hours = Math.floor(total / 60);
      const minutes = Math.round(total % 60);
      return `${hours}h ${minutes}m`;
    } else if (preferences.exam_preference === 'ESAT') {
      const baseMinutes = 40;
      const extra = baseMinutes * (percentage / 100);
      const total = baseMinutes + extra;
      return `${Math.round(total)}m`;
    }
    return null;
  };

  const SettingItem = ({ 
    label, 
    description, 
    children, 
    className 
  }: { 
    label: string; 
    description?: string; 
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={cn("space-y-2", className)}>
      <div className="space-y-1">
        <label className="text-sm font-medium text-text">{label}</label>
        {description && (
          <p className="text-xs text-text-muted">{description}</p>
        )}
      </div>
      {children}
    </div>
  );

  const Toggle = ({ 
    checked, 
    onChange, 
    label, 
    description 
  }: { 
    checked: boolean; 
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
  }) => (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={cn(
          "w-11 h-6 rounded-full transition-colors duration-200",
          checked ? "bg-primary" : "bg-surface-elevated"
        )}>
          <div className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          )} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text group-hover:text-text-muted transition-colors">
          {label}
        </div>
        {description && (
          <div className="text-xs text-text-muted mt-1">{description}</div>
        )}
      </div>
    </label>
  );

  const RadioGroup = ({ 
    value, 
    onChange, 
    options 
  }: { 
    value: string; 
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <div className="flex gap-4">
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
          <div className="relative">
            <input
              type="radio"
              name="radio-group"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <div className={cn(
              "w-4 h-4 rounded-full border-2 transition-colors",
              value === option.value 
                ? "border-primary bg-primary" 
                : "border-border bg-surface-subtle group-hover:border-border-subtle"
            )}>
              {value === option.value && (
                <div className="absolute inset-0.5 rounded-full bg-white" />
              )}
            </div>
          </div>
          <span className="text-sm text-text group-hover:text-text-muted transition-colors">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );

  return (
    <Container size="lg">
      <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-text mb-2">Settings</h1>
          <p className="text-sm text-text-muted">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3">
            <div className="space-y-2">
              {SETTING_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    activeSection === section.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-text-muted hover:text-text hover:bg-surface-subtle"
                  )}
                >
                  {section.icon}
                  <span className="flex-1 text-left">{section.title}</span>
                  {activeSection === section.id && (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>

            {/* Countdown Card */}
            <div className="mt-6">
              <CountdownCard
                examType={preferences.exam_preference}
                isEarlyApplicant={preferences.is_early_applicant}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <Card className="p-8">
              {/* Account Section */}
              {activeSection === 'account' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold text-text mb-1">Account</h2>
                    <p className="text-sm text-text-muted">Manage your account information</p>
                  </div>

                  <div className="space-y-6">
                    <SettingItem label="Nickname">
                      <div className="flex gap-3">
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
                    </SettingItem>

                    <SettingItem 
                      label="Email" 
                      description="Your email address for account recovery"
                    >
                      <div className="flex gap-3">
                        <Input
                          value={email}
                          disabled
                          className="flex-1"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowChangeEmail(true)}
                          className="flex items-center gap-2"
                        >
                          <span>Change</span>
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </SettingItem>

                    <SettingItem 
                      label="Password" 
                      description="Change your account password"
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowChangePassword(true)}
                        className="flex items-center gap-2"
                      >
                        <span>Change Password</span>
                        <Lock className="w-4 h-4" />
                      </Button>
                    </SettingItem>

                    <div className="pt-6 border-t border-border">
                      <div className="space-y-4">
                        <button
                          onClick={handleLogout}
                          className="w-full px-6 py-3 rounded-organic-md bg-interview/30 hover:bg-interview/40 text-interview transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium"
                          style={{
                            boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 8px 0 rgba(0, 0, 0, 0.7)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)';
                          }}
                        >
                          <span>Logout</span>
                          <LogOut className="w-4 h-4" strokeWidth={2.5} />
                        </button>

                        <button
                          onClick={() => setShowDeleteAccount(true)}
                          className="w-full px-6 py-3 rounded-organic-md bg-error/30 hover:bg-error/40 text-error transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium"
                          style={{
                            boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 8px 0 rgba(0, 0, 0, 0.7)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)';
                          }}
                        >
                          <span>Delete Account</span>
                          <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Exam & Practice Section */}
              {activeSection === 'exam' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold text-text mb-1">Exam & Practice</h2>
                    <p className="text-sm text-text-muted">Configure your exam type, subjects, and practice behavior</p>
                  </div>

                  <div className="space-y-6">
                    <SettingItem label="Exam Type">
                      <RadioGroup
                        value={preferences.exam_preference || ''}
                        onChange={(value) => {
                          const newPref = value as ExamType;
                          setPreferences((prev) => ({ ...prev, exam_preference: newPref, esat_subjects: [] }));
                          savePreferences({ exam_preference: newPref, esat_subjects: [] }, "exam_preference");
                        }}
                        options={[
                          { value: 'ESAT', label: 'ESAT' },
                          { value: 'TMUA', label: 'TMUA' },
                        ]}
                      />
                    </SettingItem>

                    {preferences.exam_preference === 'ESAT' && (
                      <SettingItem 
                        label="ESAT Subjects" 
                        description={`Select exactly 3 subjects (${esatSubjectsSelected}/3 selected)`}
                      >
                        <div className="flex flex-wrap gap-3">
                          {ESAT_SUBJECTS.map((subject) => {
                            const isSelected = (preferences.esat_subjects || []).includes(subject);
                            const isDisabled = !isSelected && esatSubjectsSelected >= 3;
                            
                            return (
                              <button
                                key={subject}
                                onClick={() => !isDisabled && handleESATSubjectToggle(subject)}
                                disabled={isDisabled}
                                className={cn(
                                  "px-4 py-2.5 rounded-organic-md transition-all duration-fast ease-signature",
                                  "interaction-scale outline-none focus:outline-none",
                                  "text-sm font-medium",
                                  isSelected
                                    ? "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25 shadow-lg shadow-primary/10"
                                    : isDisabled
                                    ? "bg-surface-subtle text-text-muted border border-border opacity-50 cursor-not-allowed"
                                    : "bg-surface-subtle text-text border border-border hover:bg-surface-elevated hover:border-border-subtle"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  {isSelected && (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                  <span>{subject}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {esatSubjectsSelected !== 3 && (
                          <div className="flex items-center gap-2 text-xs text-warning mt-3">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Please select exactly 3 subjects</span>
                          </div>
                        )}
                      </SettingItem>
                    )}

                    <div className="pt-6 border-t border-border">
                      <SettingItem label="Application Type">
                        <RadioGroup
                          value={preferences.is_early_applicant ? 'early' : 'late'}
                          onChange={(value) => {
                            const isEarly = value === 'early';
                            setPreferences((prev) => ({ ...prev, is_early_applicant: isEarly }));
                            savePreferences({ is_early_applicant: isEarly }, "applicant_type");
                          }}
                          options={[
                            { value: 'early', label: 'Early Applicant' },
                            { value: 'late', label: 'Late Applicant' },
                          ]}
                        />
                      </SettingItem>
                    </div>

                    <div className="pt-6 border-t border-border space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-text mb-4">Exam Arrangements</h3>
                        <div className="space-y-4">
                          <Toggle
                            checked={preferences.has_extra_time}
                            onChange={(checked) => {
                              setPreferences((prev) => ({ ...prev, has_extra_time: checked }));
                              savePreferences({ has_extra_time: checked }, "extra_time");
                            }}
                            label="Extra Time"
                            description="Standard award: 25% additional time on top of normal test duration"
                          />

                          {preferences.has_extra_time && (
                            <div className="ml-14 space-y-3">
                              <SettingItem label="Extra Time Percentage">
                                <div className="flex gap-3 items-center">
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
                                  <span className="text-sm text-text-muted">%</span>
                                </div>
                              </SettingItem>
                              {getTimeWithExtraTime() && (
                                <div className="text-xs text-text-muted bg-surface-subtle p-3 rounded-lg">
                                  {preferences.exam_preference === 'TMUA' 
                                    ? `TMUA: ~${getTimeWithExtraTime()} with +${preferences.extra_time_percentage}%`
                                    : `ESAT: ~${getTimeWithExtraTime()} per module with +${preferences.extra_time_percentage}%`
                                  }
                                </div>
                              )}
                            </div>
                          )}

                          <Toggle
                            checked={preferences.has_rest_breaks}
                            onChange={(checked) => {
                              setPreferences((prev) => ({ ...prev, has_rest_breaks: checked }));
                              savePreferences({ has_rest_breaks: checked }, "rest_breaks");
                            }}
                            label="Rest Breaks"
                            description='Request rest breaks / "pause-the-clock" breaks during the exam'
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Management Section */}
              {activeSection === 'data' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold text-text mb-1">Data Management</h2>
                    <p className="text-sm text-text-muted">Export or reset your practice data</p>
                  </div>

                  <div className="space-y-6">
                    <SettingItem 
                      label="Export Data" 
                      description="Download all your sessions, attempts, and progress data as CSV"
                    >
                      <Button
                        variant="secondary"
                        onClick={handleExportData}
                        className="flex items-center gap-2"
                      >
                        <span>Export Results (CSV)</span>
                        <Download className="w-4 h-4" />
                      </Button>
                    </SettingItem>

                    <div className="pt-6 border-t border-error/20">
                      <SettingItem 
                        label="Reset All Data" 
                        description="Permanently delete all your sessions, attempts, and progress. This cannot be undone."
                      >
                        <Button
                          variant="danger"
                          onClick={() => setShowResetData(true)}
                          className="flex items-center gap-2"
                        >
                          <span>Reset All Data</span>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </SettingItem>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Section */}
              {activeSection === 'appearance' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold text-text mb-1">Appearance</h2>
                    <p className="text-sm text-text-muted">Customize the visual appearance of the app</p>
                  </div>

                  <div className="space-y-6">
                    <SettingItem label="Font Size">
                      <RadioGroup
                        value={preferences.font_size}
                        onChange={(value) => {
                          const size = value as 'small' | 'medium' | 'large';
                          setPreferences((prev) => ({ ...prev, font_size: size }));
                          savePreferences({ font_size: size }, "font_size");
                        }}
                        options={[
                          { value: 'small', label: 'Small' },
                          { value: 'medium', label: 'Medium' },
                          { value: 'large', label: 'Large' },
                        ]}
                      />
                    </SettingItem>

                    <Toggle
                      checked={preferences.reduced_motion}
                      onChange={(checked) => {
                        setPreferences((prev) => ({ ...prev, reduced_motion: checked }));
                        savePreferences({ reduced_motion: checked }, "reduced_motion");
                      }}
                      label="Reduced Motion"
                      description="Reduce animations for better accessibility"
                    />

                    <SettingItem 
                      label="Theme" 
                      description={`Currently using ${isDark ? 'dark' : 'light'} mode`}
                    >
                      <button
                        onClick={toggleTheme}
                        className={cn(
                          "flex items-center gap-2 px-4 py-3 rounded-lg border transition-all",
                          "bg-surface-subtle border-border hover:border-border-subtle",
                          "text-text hover:text-text-muted"
                        )}
                      >
                        {isDark ? (
                          <>
                            <span className="text-sm font-medium">Switch to Light Mode</span>
                            <Sun className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium">Switch to Dark Mode</span>
                            <Moon className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </SettingItem>
                  </div>
                </div>
              )}
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

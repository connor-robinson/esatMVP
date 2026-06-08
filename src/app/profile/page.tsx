/**
 * Profile Settings page - Modern, minimal, and aesthetic design
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Container } from "@/components/layout/Container";
import { DeleteAccountModal } from "@/components/profile/DeleteAccountModal";
import { SettingsPricingPanel } from "@/components/profile/SettingsPricingPanel";
import {
  ESAT_SUBJECTS,
  esatSubjectPillClass,
} from "@/components/profile/settingsSubjectPills";
import { ChangePasswordModal } from "@/components/profile/ChangePasswordModal";
import { ChangeEmailModal } from "@/components/profile/ChangeEmailModal";
import { ResetDataModal } from "@/components/profile/ResetDataModal";
import { UsernameSetupModal } from "@/components/profile/UsernameSetupModal";
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
  Eye,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Edit3,
  X,
  Check,
  CreditCard
} from "lucide-react";
import type { ExamType } from "@/lib/profile/countdown";
import { useTheme } from "@/contexts/ThemeContext";

type Preferences = {
  username: string | null;
  last_username_change: string | null;
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

type SettingSection = {
  id: string;
  title: string;
  icon: React.ReactNode;
};

const SETTING_SECTIONS: SettingSection[] = [
  { id: 'account', title: 'Account', icon: <User className="w-4 h-4" /> },
  { id: 'exam', title: 'Exam & Practice', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'pricing', title: 'Pricing', icon: <CreditCard className="w-4 h-4" /> },
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
    username: null,
    last_username_change: null,
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
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<{
    available: boolean | null;
    message: string | null;
  }>({ available: null, message: null });
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState<string>("");
  const [localESATSubjects, setLocalESATSubjects] = useState<string[]>([]);
  
  // Modal states
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showResetData, setShowResetData] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section");
    if (section && SETTING_SECTIONS.some((s) => s.id === section)) {
      setActiveSection(section);
    }
  }, []);

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
            username: data.username || null,
            last_username_change: data.last_username_change || null,
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
          
          // Show username setup if username is missing
          if (!data.username) {
            setShowUsernameSetup(true);
          }
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
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[profile] Logout error:", error);
        alert("Failed to logout. Please try again.");
        setLoading(false);
        return;
      }
      // Wait a moment for the session state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      // Force a hard redirect to ensure session is cleared
      window.location.href = "/login";
    } catch (err) {
      console.error("[profile] Logout error:", err);
      alert("Failed to logout. Please try again.");
      setLoading(false);
    }
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

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[profile] Logout error after delete:", error);
      }
      // Wait a moment for the session state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      // Force a hard redirect to ensure session is cleared
      window.location.href = "/login";
    } catch (err) {
      console.error("[profile] Logout error after delete:", err);
      // Still redirect even if signOut fails
      window.location.href = "/login";
    }
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

  // Initialize local ESAT subjects when preferences load or exam preference changes
  useEffect(() => {
    if (preferences.exam_preference === 'ESAT') {
      if (preferences.esat_subjects) {
        setLocalESATSubjects(preferences.esat_subjects);
      } else {
        setLocalESATSubjects([]);
      }
    } else {
      setLocalESATSubjects([]);
    }
  }, [preferences.esat_subjects, preferences.exam_preference]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingUsername && usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, [isEditingUsername]);

  // Check if username can be edited (14-day restriction)
  const canEditUsername = useCallback(() => {
    if (!preferences.last_username_change) return true;
    const lastChange = new Date(preferences.last_username_change);
    const daysSinceChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange >= 14;
  }, [preferences.last_username_change]);

  // Check if username is valid
  const isUsernameValid = useCallback((value: string) => {
    if (value.length < 2) return false;
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    return usernameRegex.test(value) && value.length <= 20;
  }, []);

  // Debounced username availability check
  const checkUsernameAvailability = useCallback(async (value: string) => {
    if (!value || value === preferences.username) {
      setUsernameAvailability({ available: null, message: null });
      return;
    }

    if (!isUsernameValid(value)) {
      setUsernameAvailability({
        available: false,
        message: 'Username must be 2-20 characters and contain only letters, numbers, underscores, or hyphens'
      });
      return;
    }

    setUsernameChecking(true);
    try {
      const response = await fetch(`/api/profile/username/check?username=${encodeURIComponent(value)}`);
      const data = await response.json();
      if (response.ok) {
        setUsernameAvailability({
          available: data.available,
          message: data.message
        });
      }
    } catch (err) {
      setUsernameAvailability({ available: null, message: null });
    } finally {
      setUsernameChecking(false);
    }
  }, [preferences.username, isUsernameValid]);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle username input change with debounce - stable handler
  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsernameInput(value);
    setUsernameError(null);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce the availability check
    debounceTimerRef.current = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 500);
  }, [checkUsernameAvailability]);

  // Handle save username
  const handleSaveUsername = useCallback(async () => {
    if (!usernameInput || usernameInput === preferences.username) {
      setIsEditingUsername(false);
      setUsernameInput("");
      return;
    }

    if (!isUsernameValid(usernameInput)) {
      setUsernameError('Username must be 2-20 characters and contain only letters, numbers, underscores, or hyphens');
      return;
    }

    if (usernameAvailability.available !== true) {
      setUsernameError('Please choose an available username');
      return;
    }

    setSaving("username");
    setUsernameError(null);

    try {
      await savePreferences({ username: usernameInput.trim() }, "username");
      setUsernameInput("");
      setIsEditingUsername(false);
    } catch (err: any) {
      setUsernameError(err.message || 'Failed to save username');
    } finally {
      setSaving(null);
    }
  }, [usernameInput, preferences.username, isUsernameValid, usernameAvailability, savePreferences]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setUsernameInput("");
    setUsernameAvailability({ available: null, message: null });
    setUsernameError(null);
    setIsEditingUsername(false);
  }, []);

  // Handle start editing
  const handleStartEdit = useCallback(() => {
    if (!canEditUsername()) return;
    setUsernameInput(preferences.username || "");
    setIsEditingUsername(true);
  }, [preferences.username, canEditUsername]);

  const handleESATSubjectToggle = (subject: string) => {
    const current = localESATSubjects || [];

    if (current.includes(subject)) {
      setLocalESATSubjects(current.filter((s) => s !== subject));
      return;
    }

    if (current.length >= 3) return;

    setLocalESATSubjects([...current, subject]);
  };

  const handleSaveESATSubjects = async () => {
    if (localESATSubjects.length !== 3) {
      alert("Please select exactly 3 subjects");
      return;
    }
    await savePreferences({ esat_subjects: localESATSubjects }, "esat_subjects");
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
    description,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
  }) => (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 outline-none",
          checked ? "bg-primary" : "bg-surface-mid",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-text shadow-sm transition-transform duration-300",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-text">{label}</div>
        {description && (
          <div className="mt-1 text-xs text-text-muted">{description}</div>
        )}
      </div>
    </div>
  );

  const accountBtnClass =
    "h-8 shrink-0 rounded-organic-md bg-background/50 px-3 font-sans text-xs font-semibold text-text transition-all duration-fast ease-signature hover:bg-background/80 focus-visible:shadow-none active:scale-[0.98]";

  const accountBtnDangerClass =
    "h-8 shrink-0 rounded-organic-md bg-background/50 px-3 font-sans text-xs font-semibold text-error transition-all duration-fast ease-signature hover:bg-error/10 focus-visible:shadow-none active:scale-[0.98]";

  const AccountSection = ({
    title,
    className,
    children,
  }: {
    title: string;
    className?: string;
    children: React.ReactNode;
  }) => (
    <section
      className={cn(
        "rounded-organic-lg px-4 py-3.5 sm:px-5",
        className,
      )}
    >
      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-subtle">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </section>
  );

  const AccountRow = ({
    label,
    hint,
    value,
    action,
    children,
  }: {
    label: string;
    hint?: string;
    value?: React.ReactNode;
    action?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div className="py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="w-20 shrink-0 text-xs font-medium text-text-muted sm:w-24">
          {label}
        </span>
        {value !== undefined && (
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
            {value}
          </span>
        )}
        {action && <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {hint && (
        <p className="mt-1 pl-0 text-[11px] text-text-subtle sm:pl-24">{hint}</p>
      )}
      {children}
    </div>
  );

  const usernameChangeHint = preferences.last_username_change
    ? (() => {
        const lastChange = new Date(preferences.last_username_change);
        const daysSinceChange =
          (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
        const daysRemaining = Math.max(0, Math.ceil(14 - daysSinceChange));
        return daysRemaining > 0
          ? `You can change your username in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`
          : "You can change your username now";
      })()
    : undefined;

  const RadioGroup = ({
    value,
    onChange,
    options,
    selectedTone = "primary",
  }: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    selectedTone?: "primary" | "secondary" | "accent";
  }) => {
    const toneSelected =
      selectedTone === "secondary"
        ? "bg-secondary/20 text-secondary"
        : selectedTone === "accent"
          ? "bg-accent/15 text-accent"
          : "bg-primary/20 text-primary";

    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-organic-md px-5 py-2.5 text-sm font-medium outline-none transition-colors duration-fast ease-signature",
                isSelected
                  ? cn("font-semibold", toneSelected)
                  : "bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Container size="lg" className="py-4">
      <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-text mb-2">Settings</h1>
          <p className="text-sm text-text-muted">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3">
            <div className="space-y-1 rounded-organic-xl bg-surface-elevated/60 p-2 backdrop-blur-sm">
              {SETTING_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-organic-lg px-4 py-3 text-sm font-medium outline-none transition-colors duration-fast ease-signature",
                    activeSection === section.id
                      ? "bg-secondary/15 text-secondary"
                      : "text-text-muted hover:bg-surface-mid hover:text-text",
                  )}
                >
                  {section.icon}
                  <span className="flex-1 text-left">{section.title}</span>
                  {activeSection === section.id && (
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <Card variant="elevated" className="rounded-organic-xl p-5 sm:p-6">
              {/* Account Section */}
              {activeSection === 'account' && (
                <div className="space-y-3 font-sans">
                  <div className="mb-1">
                    <h2 className="font-heading text-lg font-bold tracking-tight text-text sm:text-xl">
                      Account
                    </h2>
                    <p className="mt-1 text-xs text-text-muted">
                      Profile, security, and billing
                    </p>
                  </div>

                  <AccountSection title="Profile" className="bg-surface-mid">
                    {!isEditingUsername ? (
                      <AccountRow
                        label="Username"
                        hint={usernameChangeHint}
                        value={preferences.username || "Not set"}
                        action={
                          <button
                            type="button"
                            onClick={handleStartEdit}
                            disabled={!canEditUsername() || saving === "username"}
                            className={cn(
                              accountBtnClass,
                              "inline-flex items-center gap-1.5",
                              !canEditUsername() && "cursor-not-allowed opacity-50",
                            )}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        }
                      />
                    ) : (
                      <div className="py-2">
                        <div className="flex flex-wrap items-center gap-2 sm:pl-24">
                          <div className="relative min-w-[12rem] flex-1">
                            <Input
                              ref={usernameInputRef}
                              type="text"
                              value={usernameInput}
                              onChange={handleUsernameChange}
                              placeholder="Username"
                              className={cn(
                                "h-9 py-2 pr-9 text-sm focus-visible:ring-0",
                                usernameAvailability.available === true &&
                                  "border-success/60 focus-visible:border-success",
                                usernameAvailability.available === false &&
                                  "border-error/60 focus-visible:border-error",
                                usernameError &&
                                  "border-error/60 focus-visible:border-error",
                              )}
                              disabled={saving === "username"}
                              autoComplete="username"
                            />
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                              {usernameChecking && (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-primary" />
                              )}
                              {!usernameChecking && usernameAvailability.available === true && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                              )}
                              {!usernameChecking && usernameAvailability.available === false && (
                                <AlertCircle className="h-3.5 w-3.5 text-error" />
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={saving === "username"}
                            className={accountBtnClass}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveUsername}
                            disabled={
                              saving === "username" ||
                              !isUsernameValid(usernameInput) ||
                              usernameAvailability.available !== true ||
                              usernameInput === preferences.username
                            }
                            className={cn(
                              accountBtnClass,
                              isUsernameValid(usernameInput) &&
                                usernameAvailability.available === true &&
                                usernameInput !== preferences.username
                                ? "text-success hover:bg-success/10"
                                : "cursor-not-allowed opacity-40",
                            )}
                          >
                            {saving === "username" ? "Saving…" : "Save"}
                          </button>
                        </div>
                        {usernameAvailability.message && (
                          <p
                            className={cn(
                              "mt-1 text-[11px] sm:pl-24",
                              usernameAvailability.available === true
                                ? "text-success"
                                : "text-error",
                            )}
                          >
                            {usernameAvailability.message}
                          </p>
                        )}
                        {(usernameError || !canEditUsername()) && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-error sm:pl-24">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {usernameError ?? "14 days needed between each change"}
                          </p>
                        )}
                      </div>
                    )}

                    <AccountRow
                      label="Email"
                      value={email}
                      action={
                        <button
                          type="button"
                          onClick={() => setShowChangeEmail(true)}
                          className={cn(accountBtnClass, "inline-flex items-center gap-1.5")}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Change
                        </button>
                      }
                    />
                  </AccountSection>

                  <AccountSection title="Security" className="bg-surface-neutral/60">
                    <AccountRow
                      label="Password"
                      value="••••••••"
                      action={
                        <button
                          type="button"
                          onClick={() => setShowChangePassword(true)}
                          className={cn(accountBtnClass, "inline-flex items-center gap-1.5")}
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Update
                        </button>
                      }
                    />
                  </AccountSection>

                  <AccountSection title="Billing" className="bg-surface-elevated">
                    <AccountRow
                      label="Plan"
                      value="Manage subscription"
                      action={
                        <>
                          <button
                            type="button"
                            onClick={() => setActiveSection("pricing")}
                            className={accountBtnClass}
                          >
                            View plans
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/stripe/create-portal-link", {
                                  method: "POST",
                                });
                                const data = await res.json();
                                if (data.url) window.location.href = data.url;
                                else throw new Error(data.error ?? "Failed");
                              } catch (err: unknown) {
                                console.error(err);
                                alert("Failed to open billing portal");
                              }
                            }}
                            className={cn(accountBtnClass, "inline-flex items-center gap-1.5")}
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Billing
                          </button>
                        </>
                      }
                    />
                  </AccountSection>

                  <AccountSection title="Session" className="bg-surface-subtle">
                    <div className="flex flex-wrap items-center gap-2 py-1.5">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className={cn(accountBtnClass, "inline-flex items-center gap-1.5")}
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Log out
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteAccount(true)}
                        className={cn(accountBtnDangerClass, "inline-flex items-center gap-1.5")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete account
                      </button>
                    </div>
                  </AccountSection>
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
                          setLocalESATSubjects([]);
                          setPreferences((prev) => ({
                            ...prev,
                            exam_preference: newPref,
                            esat_subjects: [],
                          }));
                          savePreferences(
                            { exam_preference: newPref, esat_subjects: [] },
                            "exam_preference",
                          );
                        }}
                        options={[
                          { value: 'ESAT', label: 'ESAT' },
                          { value: 'TMUA', label: 'TMUA' },
                        ]}
                        selectedTone="secondary"
                      />
                    </SettingItem>

                    {preferences.exam_preference === 'ESAT' && (
                      <SettingItem 
                        label="ESAT Subjects" 
                        description={`Select exactly 3 subjects (${localESATSubjects.length}/3 selected)`}
                      >
                        <div className="flex flex-wrap gap-2">
                          {ESAT_SUBJECTS.map((subject) => {
                            const isSelected = localESATSubjects.includes(subject);
                            return (
                              <button
                                key={subject}
                                type="button"
                                onClick={() => handleESATSubjectToggle(subject)}
                                className={cn(
                                  "inline-flex min-h-[42px] items-center gap-2 rounded-organic-md px-4 py-2.5 text-sm font-medium outline-none transition-colors duration-fast ease-signature",
                                  "interaction-scale touch-manipulation",
                                  esatSubjectPillClass(subject, isSelected),
                                  !isSelected &&
                                    localESATSubjects.length >= 3 &&
                                    "cursor-not-allowed opacity-50",
                                )}
                                disabled={
                                  !isSelected && localESATSubjects.length >= 3
                                }
                              >
                                <span>{subject}</span>
                                {isSelected && (
                                  <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-4 space-y-2">
                          {localESATSubjects.length !== 3 && (
                            <div className="flex items-center gap-2 text-xs text-error">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Please select exactly three subjects</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleSaveESATSubjects}
                            disabled={localESATSubjects.length !== 3 || saving === "esat_subjects"}
                            className={cn(
                              "w-full rounded-organic-md px-5 py-3 font-medium outline-none transition-colors duration-fast ease-signature",
                              localESATSubjects.length === 3 && saving !== "esat_subjects"
                                ? "bg-surface-mid text-text hover:bg-surface-neutral"
                                : "cursor-not-allowed bg-surface-elevated/80 text-text-disabled",
                            )}
                          >
                            {saving === "esat_subjects" ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                <span>Saving...</span>
                              </div>
                            ) : (
                              <span>Save Subjects</span>
                            )}
                          </button>
                        </div>
                      </SettingItem>
                    )}

                    <div className="pt-6">
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
                          selectedTone="accent"
                        />
                      </SettingItem>
                    </div>

                    <div className="pt-6 border-t border-border-subtle space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-text mb-4">Exam Arrangements</h3>
                        <div className="space-y-5">
                          <Toggle
                            checked={preferences.has_extra_time}
                            onChange={(checked) => {
                              setPreferences((prev) => ({ ...prev, has_extra_time: checked }));
                              savePreferences({ has_extra_time: checked }, "extra_time");
                            }}
                            label="Exam Time"
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

              {/* Pricing Section */}
              {activeSection === 'pricing' && <SettingsPricingPanel />}

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
                        className={cn(
                          "inline-flex items-center gap-2 rounded-organic-md bg-surface-mid px-5 py-2.5 font-medium outline-none transition-colors",
                          "text-text hover:bg-surface-neutral",
                        )}
                      >
                        <span>Export Results (CSV)</span>
                        <Download className="h-4 w-4 shrink-0" strokeWidth={2} />
                      </Button>
                    </SettingItem>

                    <div className="pt-6 border-t border-border-subtle">
                      <SettingItem 
                        label="Reset All Data" 
                        description="Permanently delete all your sessions, attempts, and progress. This cannot be undone."
                      >
                        <Button
                          variant="secondary"
                          onClick={() => setShowResetData(true)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-organic-md bg-surface-mid px-5 py-2.5 font-medium outline-none transition-colors",
                            "text-text hover:bg-error/10 hover:text-error",
                          )}
                        >
                          <span>Reset All Data</span>
                          <RotateCcw className="h-4 w-4 shrink-0" strokeWidth={2} />
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
                        selectedTone="accent"
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
                      description={`Currently using ${isDark ? 'Dark' : 'Light'} mode.`}
                    >
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-organic-md px-4 py-3 outline-none transition-colors duration-fast ease-signature",
                          "bg-surface-mid text-text hover:bg-surface-neutral",
                        )}
                      >
                        {isDark ? (
                          <>
                            <span className="text-sm font-medium">Switch to Light Mode</span>
                            <Sun className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={2} />
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium">Switch to Dark Mode</span>
                            <Moon className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={2} />
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
      <UsernameSetupModal
        isOpen={showUsernameSetup}
        onComplete={() => {
          setShowUsernameSetup(false);
          // Reload preferences
          window.location.reload();
        }}
      />
    </Container>
  );
}

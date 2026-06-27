/**
 * Profile Settings page - Modern, minimal, and aesthetic design
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
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
import { getExamAccentFillClass } from "@/config/colors";
import { CheckCircle2, AlertCircle, Check } from "lucide-react";
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
};

const SETTING_SECTIONS: SettingSection[] = [
  { id: "account", title: "Account" },
  { id: "exam", title: "Exam & Practice" },
  { id: "pricing", title: "Pricing" },
  { id: "data", title: "Data Management" },
  { id: "appearance", title: "Appearance" },
];

function getDisplayInitials(
  name: string | null | undefined,
  email?: string,
): string {
  const source = (name || email || "?").trim();
  if (!source || source === "?") return "?";
  const words = source.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return source.substring(0, 2).toUpperCase();
}

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
    exam_preference: "ESAT",
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
          const examPreference =
            data.exam_preference === "ESAT" || data.exam_preference === "TMUA"
              ? data.exam_preference
              : "ESAT";

          setPreferences({
            username: data.username || null,
            last_username_change: data.last_username_change || null,
            exam_preference: examPreference,
            esat_subjects: data.esat_subjects || [],
            is_early_applicant: data.is_early_applicant ?? true,
            has_extra_time: data.has_extra_time ?? false,
            extra_time_percentage: data.extra_time_percentage ?? 25,
            has_rest_breaks: data.has_rest_breaks ?? false,
            font_size: data.font_size || "medium",
            reduced_motion: data.reduced_motion ?? false,
            dark_mode: data.dark_mode ?? false,
          });

          if (!data.exam_preference) {
            void fetch("/api/profile/preferences", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ exam_preference: examPreference }),
            });
          }
          
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
      setPreferences((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(updates) as Array<keyof Preferences>) {
          if (key in data) {
            (next as Record<keyof Preferences, Preferences[keyof Preferences]>)[key] =
              data[key];
          }
        }
        return next;
      });
      
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
    const examPreference = preferences.exam_preference ?? "ESAT";
    await savePreferences(
      { esat_subjects: localESATSubjects, exam_preference: examPreference },
      "esat_subjects",
    );
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

  const settingsButtonClass =
    "border-0 bg-surface-mid text-text shadow-none hover:bg-surface-neutral focus-visible:shadow-none";

  const SettingsButton = ({
    className,
    ...props
  }: React.ComponentProps<typeof Button>) => (
    <Button
      variant="secondary"
      size="sm"
      className={cn(settingsButtonClass, className)}
      {...props}
    />
  );

  const SettingsSectionHeader = ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div className="border-b border-border-subtle px-5 py-4 sm:px-7">
      <h2 className="text-lg font-semibold text-text sm:text-xl">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      )}
    </div>
  );

  const SettingsGroup = ({
    title,
    children,
  }: {
    title?: string;
    children: React.ReactNode;
  }) => (
    <div className="border-t border-border-subtle first:border-t-0">
      {title && (
        <p className="px-5 pt-6 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-text sm:px-7">
          {title}
        </p>
      )}
      <div className="divide-y divide-border-subtle">{children}</div>
    </div>
  );

  const SettingsRow = ({
    label,
    description,
    value,
    action,
    children,
  }: {
    label: string;
    description?: string;
    value?: React.ReactNode;
    action?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div className="px-5 py-4 sm:px-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 sm:w-44 shrink-0">
          <p className="text-sm text-text-muted">{label}</p>
          {description && (
            <p className="mt-0.5 text-xs text-text-subtle">{description}</p>
          )}
        </div>
        {value !== undefined && (
          <div className="min-w-0 flex-1 text-sm text-text-subtle">{value}</div>
        )}
        {action && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto">
            {action}
          </div>
        )}
      </div>
      {children}
    </div>
  );

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
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-text">
          {label}
        </label>
        {description && (
          <p className="mt-1 text-xs text-text-subtle">{description}</p>
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
        <div className="text-sm text-text-muted">{label}</div>
        {description && (
          <div className="mt-1 text-xs text-text-subtle">{description}</div>
        )}
      </div>
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

  const ChoicePillGroup = ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string; selectedClass: string }[];
  }) => (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-[42px] items-center rounded-organic-md px-4 py-2.5 text-sm font-medium outline-none transition-colors duration-fast ease-signature",
              isSelected
                ? cn("font-semibold", option.selectedClass)
                : "bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

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
    <Container size="lg" className="py-6 sm:py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
        <aside className="lg:col-span-3">
          <h1 className="text-xl font-semibold text-text sm:text-2xl">Settings</h1>
          <p className="mt-1 text-sm text-text-muted">
            Manage your account and preferences
          </p>
          <nav className="mt-5 flex flex-row flex-wrap gap-1 lg:flex-col">
            {SETTING_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                type="button"
                className={cn(
                  "rounded-organic-md px-3 py-2 text-left text-sm font-medium outline-none transition-colors duration-fast ease-signature lg:w-full lg:px-4 lg:py-2.5",
                  activeSection === section.id
                    ? "bg-surface-mid text-text"
                    : "text-text-muted hover:bg-surface-subtle hover:text-text",
                )}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 lg:col-span-9">
          <div className="overflow-hidden rounded-organic-xl border border-border-subtle bg-surface">
              {/* Account Section */}
              {activeSection === 'account' && (
                <>
                  <SettingsSectionHeader
                    title="Account"
                    description="Profile, security, and billing"
                  />

                  <SettingsGroup title="Profile">
                    <SettingsRow
                      label="Avatar"
                      description="Generated from your username"
                      value={
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-text-muted/35 bg-surface-mid text-base font-semibold text-text">
                          {getDisplayInitials(preferences.username, email)}
                        </div>
                      }
                    />

                    {!isEditingUsername ? (
                      <SettingsRow
                        label="Username"
                        description={usernameChangeHint}
                        value={preferences.username || "Not set"}
                        action={
                          <SettingsButton
                            type="button"
                            onClick={handleStartEdit}
                            disabled={!canEditUsername() || saving === "username"}
                          >
                            Edit
                          </SettingsButton>
                        }
                      />
                    ) : (
                      <div className="px-5 py-4 sm:px-7">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <p className="text-sm text-text-muted sm:w-44 shrink-0">
                            Username
                          </p>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
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
                              <SettingsButton
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={saving === "username"}
                              >
                                Cancel
                              </SettingsButton>
                              <SettingsButton
                                type="button"
                                onClick={handleSaveUsername}
                                disabled={
                                  saving === "username" ||
                                  !isUsernameValid(usernameInput) ||
                                  usernameAvailability.available !== true ||
                                  usernameInput === preferences.username
                                }
                              >
                                {saving === "username" ? "Saving…" : "Save"}
                              </SettingsButton>
                            </div>
                            {usernameAvailability.message && (
                              <p
                                className={cn(
                                  "text-xs",
                                  usernameAvailability.available === true
                                    ? "text-success"
                                    : "text-error",
                                )}
                              >
                                {usernameAvailability.message}
                              </p>
                            )}
                            {(usernameError || !canEditUsername()) && (
                              <p className="flex items-center gap-1 text-xs text-error">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                {usernameError ?? "14 days needed between each change"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <SettingsRow
                      label="Email"
                      value={email}
                      action={
                        <SettingsButton
                          type="button"
                          onClick={() => setShowChangeEmail(true)}
                        >
                          Change
                        </SettingsButton>
                      }
                    />
                  </SettingsGroup>

                  <SettingsGroup title="Security">
                    <SettingsRow
                      label="Password"
                      value="••••••••"
                      action={
                        <SettingsButton
                          type="button"
                          onClick={() => setShowChangePassword(true)}
                        >
                          Update
                        </SettingsButton>
                      }
                    />
                  </SettingsGroup>

                  <SettingsGroup title="Billing">
                    <SettingsRow
                      label="Plan"
                      value="Manage subscription"
                      action={
                        <>
                          <SettingsButton
                            type="button"
                            onClick={() => setActiveSection("pricing")}
                          >
                            View plans
                          </SettingsButton>
                          <SettingsButton
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
                          >
                            Billing
                          </SettingsButton>
                        </>
                      }
                    />
                  </SettingsGroup>

                  <SettingsGroup title="Session">
                    <SettingsRow
                      label="Sign out"
                      description="Log out of this device"
                      action={
                        <SettingsButton type="button" onClick={handleLogout}>
                          Log out
                        </SettingsButton>
                      }
                    />
                    <SettingsRow
                      label="Delete account"
                      description="Permanently remove your account and data"
                      action={
                        <SettingsButton
                          type="button"
                          onClick={() => setShowDeleteAccount(true)}
                          className="text-error hover:bg-error/10 hover:text-error"
                        >
                          Delete account
                        </SettingsButton>
                      }
                    />
                  </SettingsGroup>
                </>
              )}

              {/* Exam & Practice Section */}
              {activeSection === 'exam' && (
                <>
                  <SettingsSectionHeader
                    title="Exam & Practice"
                    description="Configure your exam type, subjects, and practice behavior"
                  />
                  <div className="space-y-6 px-5 py-5 sm:px-7">
                    <SettingItem label="Exam Type">
                      <ChoicePillGroup
                        value={preferences.exam_preference ?? "ESAT"}
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
                          {
                            value: "ESAT",
                            label: "ESAT",
                            selectedClass: getExamAccentFillClass("ESAT"),
                          },
                          {
                            value: "TMUA",
                            label: "TMUA",
                            selectedClass: getExamAccentFillClass("TMUA"),
                          },
                        ]}
                      />
                    </SettingItem>

                    {preferences.exam_preference === "ESAT" && (
                      <SettingItem
                        label="ESAT Subjects"
                        description={`Select exactly 3 subjects (${localESATSubjects.length}/3 selected)`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
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
                          <SettingsButton
                            type="button"
                            onClick={handleSaveESATSubjects}
                            disabled={
                              localESATSubjects.length !== 3 ||
                              saving === "esat_subjects"
                            }
                            className="min-h-[42px]"
                          >
                            {saving === "esat_subjects" ? "Saving…" : "Save Subjects"}
                          </SettingsButton>
                        </div>
                        {localESATSubjects.length !== 3 && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-error">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>Please select exactly three subjects</span>
                          </div>
                        )}
                      </SettingItem>
                    )}

                    <div className="pt-6">
                      <SettingItem label="Application Type">
                        <ChoicePillGroup
                          value={preferences.is_early_applicant ? "early" : "late"}
                          onChange={(value) => {
                            const isEarly = value === "early";
                            setPreferences((prev) => ({
                              ...prev,
                              is_early_applicant: isEarly,
                            }));
                            savePreferences(
                              { is_early_applicant: isEarly },
                              "applicant_type",
                            );
                          }}
                          options={[
                            {
                              value: "early",
                              label: "Early Applicant",
                              selectedClass: "bg-accent text-background hover:opacity-90",
                            },
                            {
                              value: "late",
                              label: "Late Applicant",
                              selectedClass: "bg-biology text-background hover:opacity-90",
                            },
                          ]}
                        />
                      </SettingItem>
                    </div>

                    <div className="pt-6 border-t border-border-subtle space-y-6">
                      <div>
                        <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-text">
                          Exam Arrangements
                        </h3>
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
                </>
              )}

              {/* Pricing Section */}
              {activeSection === 'pricing' && (
                <>
                  <SettingsSectionHeader
                    title="Pricing"
                    description="Choose a plan that fits your exam timeline."
                  />
                  <div className="px-5 py-5 sm:px-7">
                    <SettingsPricingPanel />
                  </div>
                </>
              )}

              {/* Data Management Section */}
              {activeSection === 'data' && (
                <>
                  <SettingsSectionHeader
                    title="Data Management"
                    description="Export or reset your practice data"
                  />
                  <div className="space-y-6 px-5 py-5 sm:px-7">
                    <SettingItem 
                      label="Export Data" 
                      description="Download all your sessions, attempts, and progress data as CSV"
                    >
                      <SettingsButton onClick={handleExportData}>
                        Export Results (CSV)
                      </SettingsButton>
                    </SettingItem>

                    <div className="pt-6 border-t border-border-subtle">
                      <SettingItem 
                        label="Reset All Data" 
                        description="Permanently delete all your sessions, attempts, and progress. This cannot be undone."
                      >
                        <SettingsButton
                          onClick={() => setShowResetData(true)}
                          className="text-error hover:bg-error/10 hover:text-error"
                        >
                          Reset All Data
                        </SettingsButton>
                      </SettingItem>
                    </div>
                  </div>
                </>
              )}

              {/* Appearance Section */}
              {activeSection === 'appearance' && (
                <>
                  <SettingsSectionHeader
                    title="Appearance"
                    description="Customize the visual appearance of the app"
                  />
                  <div className="space-y-6 px-5 py-5 sm:px-7">
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
                      description={`Currently using ${isDark ? "Dark" : "Light"} mode.`}
                    >
                      <SettingsButton type="button" onClick={toggleTheme}>
                        {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                      </SettingsButton>
                    </SettingItem>
                  </div>
                </>
              )}
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

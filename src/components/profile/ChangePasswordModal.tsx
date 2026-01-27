"use client";

import { useState } from "react";
import { X, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (currentPassword: string, newPassword: string) => Promise<void>;
}

export function ChangePasswordModal({ isOpen, onClose, onConfirm }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = async () => {
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setIsChanging(true);

    try {
      await onConfirm(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-white/[0.02] border border-white/10 rounded-organic-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-white/70" strokeWidth={2.5} />
            <h2 className="text-lg font-mono text-white/90 font-semibold">Change Password</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isChanging}
            className="p-2 rounded-organic-md hover:bg-white/10 text-white/70 hover:text-white/90 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4 font-mono text-sm">
            <div>
              <label className="block text-sm font-mono text-white/70 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setError(null);
                }}
                disabled={isChanging}
                className={cn(
                  "w-full px-4 py-3 rounded-organic-md bg-white/5 border text-white/90 font-mono text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  error ? "border-red-500/50" : "border-white/10"
                )}
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-white/70 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError(null);
                }}
                disabled={isChanging}
                className={cn(
                  "w-full px-4 py-3 rounded-organic-md bg-white/5 border text-white/90 font-mono text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  error ? "border-red-500/50" : "border-white/10"
                )}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-white/70 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                disabled={isChanging}
                className={cn(
                  "w-full px-4 py-3 rounded-organic-md bg-white/5 border text-white/90 font-mono text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  error ? "border-red-500/50" : "border-white/10"
                )}
                placeholder="Confirm new password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 font-mono">{error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex-shrink-0 flex gap-3">
          <button
            onClick={onClose}
            disabled={isChanging}
            className="flex-1 px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium bg-white/10 hover:bg-white/15 text-white/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleChange}
            disabled={isChanging}
            className={cn(
              "flex-1 px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium",
              isChanging
                ? "bg-primary/50 text-white/50 cursor-not-allowed"
                : "bg-primary text-neutral-900 hover:bg-primary-hover cursor-pointer"
            )}
          >
            <span>{isChanging ? "Changing..." : "Change Password"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


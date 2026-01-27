"use client";

import { useState } from "react";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteAccountModal({ isOpen, onClose, onConfirm }: DeleteAccountModalProps) {
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (confirmation !== "DELETE") {
      setError("Please type DELETE to confirm");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-white/[0.02] border border-red-500/30 rounded-organic-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-red-500/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" strokeWidth={2.5} />
            <h2 className="text-lg font-mono text-red-400 font-semibold">Delete Account</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 rounded-organic-md hover:bg-white/10 text-white/70 hover:text-white/90 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4 font-mono text-sm text-white/80 leading-relaxed">
            <p className="text-white/90 font-semibold">
              This action cannot be undone. This will permanently delete your account and all associated data.
            </p>
            <p className="text-white/70">
              All your sessions, attempts, progress, and preferences will be permanently deleted.
            </p>
            <div className="pt-4">
              <label className="block text-sm font-mono text-white/70 mb-2">
                Type <span className="text-red-400 font-semibold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => {
                  setConfirmation(e.target.value);
                  setError(null);
                }}
                disabled={isDeleting}
                className={cn(
                  "w-full px-4 py-3 rounded-organic-md bg-white/5 border text-white/90 font-mono text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  error ? "border-red-500/50" : "border-white/10"
                )}
                placeholder="DELETE"
              />
              {error && (
                <p className="mt-2 text-sm text-red-400 font-mono">{error}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-red-500/30 flex-shrink-0 flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium bg-white/10 hover:bg-white/15 text-white/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || confirmation !== "DELETE"}
            className={cn(
              "flex-1 px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium",
              isDeleting || confirmation !== "DELETE"
                ? "bg-red-500/20 text-red-400/50 cursor-not-allowed"
                : "bg-red-500/30 hover:bg-red-500/40 text-red-400 hover:text-red-300 cursor-pointer"
            )}
          >
            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
            <span>{isDeleting ? "Deleting..." : "Delete Account"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


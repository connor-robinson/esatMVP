"use client";

import { useState } from "react";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ResetDataModal({ isOpen, onClose, onConfirm }: ResetDataModalProps) {
  const [confirmation, setConfirmation] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReset = async () => {
    if (confirmation !== "RESET") {
      setError("Please type RESET to confirm");
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to reset data");
    } finally {
      setIsResetting(false);
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
            <h2 className="text-lg font-mono text-red-400 font-semibold">Reset All Data</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isResetting}
            className="p-2 rounded-organic-md hover:bg-white/10 text-white/70 hover:text-white/90 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4 font-mono text-sm text-white/80 leading-relaxed">
            <p className="text-white/90 font-semibold">
              This will delete all your sessions, attempts, and progress. This cannot be undone.
            </p>
            <p className="text-white/70">
              Your account and preferences will remain, but all practice data will be permanently deleted.
            </p>
            <div className="pt-4">
              <label className="block text-sm font-mono text-white/70 mb-2">
                Type <span className="text-red-400 font-semibold">RESET</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => {
                  setConfirmation(e.target.value);
                  setError(null);
                }}
                disabled={isResetting}
                className={cn(
                  "w-full px-4 py-3 rounded-organic-md bg-white/5 border text-white/90 font-mono text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  error ? "border-red-500/50" : "border-white/10"
                )}
                placeholder="RESET"
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
            disabled={isResetting}
            className="flex-1 px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium bg-white/10 hover:bg-white/15 text-white/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            disabled={isResetting || confirmation !== "RESET"}
            className={cn(
              "flex-1 px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium",
              isResetting || confirmation !== "RESET"
                ? "bg-red-500/20 text-red-400/50 cursor-not-allowed"
                : "bg-red-500/30 hover:bg-red-500/40 text-red-400 hover:text-red-300 cursor-pointer"
            )}
          >
            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
            <span>{isResetting ? "Resetting..." : "Reset Data"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


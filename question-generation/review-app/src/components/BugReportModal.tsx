"use client";

import { useState } from "react";
import { X, Bug, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId?: string | null;
}

export function BugReportModal({ isOpen, onClose, questionId }: BugReportModalProps) {
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setSubmitStatus({ type: 'error', message: 'Please provide a description' });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch('/api/bug-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description.trim(),
          questionId: questionId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send bug report');
      }

      setSubmitStatus({ type: 'success', message: 'Bug report sent successfully!' });
      
      // Reset form
      setDescription("");

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSubmitStatus(null);
      }, 2000);
    } catch (error: any) {
      setSubmitStatus({ type: 'error', message: error.message || 'Failed to send bug report' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setDescription("");
      setSubmitStatus(null);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[80vh] mx-4 bg-white/[0.02] border border-white/10 rounded-organic-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Bug className="w-5 h-5 text-white/90" strokeWidth={2.5} />
            <h2 className="text-lg font-mono text-white/90 font-semibold">Report a Bug</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 rounded-organic-md hover:bg-white/10 text-white/70 hover:text-white/90 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Status Message */}
          {submitStatus && (
            <div className={cn(
              "p-3 rounded-organic-md text-sm font-mono",
              submitStatus.type === 'success'
                ? "bg-[#85BC82]/20 text-[#85BC82] border border-[#85BC82]/30"
                : "bg-[#ef7d7d]/20 text-[#ef7d7d] border border-[#ef7d7d]/30"
            )}>
              {submitStatus.message}
            </div>
          )}

          {/* Question ID (if available) */}
          {questionId && (
            <div className="p-3 rounded-organic-md bg-white/5 border border-white/10 mb-4">
              <div className="text-xs font-mono text-white/50 mb-1">Question ID (automatically included):</div>
              <div className="text-sm font-mono text-white/90">{questionId}</div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-sm font-mono text-white/70 mb-2 block">
              Briefly explain the issue <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the bug you encountered..."
              required
              disabled={isSubmitting}
              rows={5}
              className="w-full px-4 py-3 rounded-organic-md bg-white/5 border border-white/10 text-white/90 font-mono text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex-shrink-0 flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium bg-white/10 hover:bg-white/15 text-white/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !description.trim()}
            className={cn(
              "flex-1 px-4 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium",
              isSubmitting || !description.trim()
                ? "bg-white/5 text-white/40 cursor-not-allowed"
                : "bg-[#85BC82]/30 hover:bg-[#85BC82]/40 text-[#85BC82] cursor-pointer"
            )}
          >
            <Send className="w-4 h-4" strokeWidth={2.5} />
            <span>{isSubmitting ? 'Sending...' : 'Send Report'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


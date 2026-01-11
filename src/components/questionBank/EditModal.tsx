"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onSave: (newContent: string) => Promise<void>;
}

export function EditModal({
  isOpen,
  onClose,
  title,
  content,
  onSave,
}: EditModalProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update edited content when content prop changes
  useEffect(() => {
    setEditedContent(content);
    setError(null);
  }, [content, isOpen]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(editedContent);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(content);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal Content */}
      <div className="relative bg-neutral-900 rounded-organic-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
          <h2 className="text-lg font-semibold text-white/90">
            {title}
          </h2>
          <button
            onClick={handleCancel}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full min-h-[400px] p-4 bg-white/5 border border-white/10 rounded-organic-md text-base text-white/90 placeholder:text-white/40 focus:bg-white/10 focus:border-primary/30 focus:outline-none resize-none font-mono"
            placeholder="Enter content..."
            disabled={isSaving}
          />
          
          {error && (
            <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-organic-md text-sm text-error">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-semibold transition-all text-sm text-white/70 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || editedContent === content}
            className={cn(
              "px-6 py-2 rounded-lg font-semibold transition-all text-sm",
              isSaving || editedContent === content
                ? "bg-primary/50 text-neutral-900/50 cursor-not-allowed"
                : "bg-primary text-neutral-900 hover:bg-primary-hover"
            )}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}



















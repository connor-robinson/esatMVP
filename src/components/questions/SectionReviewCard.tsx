"use client";

import { useState } from "react";
import { MathContent } from "@/components/shared/MathContent";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface SectionReviewCardProps {
  title: string;
  content: string;
  sectionKey: string;
  onApprove: (sectionKey: string) => void;
  onReject: (sectionKey: string) => void;
  onEdit: (sectionKey: string, newContent: string) => void;
  approved?: boolean;
  rejected?: boolean;
  isEditing?: boolean;
  onStartEdit?: (sectionKey: string) => void;
  onCancelEdit?: () => void;
}

export function SectionReviewCard({
  title,
  content,
  sectionKey,
  onApprove,
  onReject,
  onEdit,
  approved = false,
  rejected = false,
  isEditing = false,
  onStartEdit,
  onCancelEdit,
}: SectionReviewCardProps) {
  const [editContent, setEditContent] = useState(content);
  const [isLocalEditing, setIsLocalEditing] = useState(false);

  const editing = isEditing || isLocalEditing;

  const handleStartEdit = () => {
    setEditContent(content);
    setIsLocalEditing(true);
    if (onStartEdit) onStartEdit(sectionKey);
  };

  const handleSaveEdit = () => {
    onEdit(sectionKey, editContent);
    setIsLocalEditing(false);
    if (onCancelEdit) onCancelEdit();
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsLocalEditing(false);
    if (onCancelEdit) onCancelEdit();
  };

  return (
    <Card
      className={`p-6 transition-all ${
        approved
          ? "border-green-500 bg-green-500/5"
          : rejected
          ? "border-red-500 bg-red-500/5"
          : "border-neutral-700"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          {approved && <Badge className="bg-green-500">Approved</Badge>}
          {rejected && <Badge className="bg-red-500">Rejected</Badge>}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full min-h-[200px] px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white font-mono text-sm"
            placeholder="Edit content (supports KaTeX with $ for inline and $$ for display math)..."
          />
          <div className="flex items-center gap-2">
            <Button onClick={handleSaveEdit} variant="primary" size="sm">
              Save
            </Button>
            <Button onClick={handleCancelEdit} variant="secondary" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-neutral-900/50 rounded border border-neutral-700">
            <MathContent content={content} className="text-base leading-relaxed" />
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-700">
            <Button
              onClick={() => onApprove(sectionKey)}
              variant="primary"
              size="sm"
              disabled={approved}
            >
              {approved ? "Approved" : "Approve"}
            </Button>
            <Button
              onClick={() => onReject(sectionKey)}
              variant="secondary"
              size="sm"
              disabled={rejected}
            >
              {rejected ? "Rejected" : "Reject"}
            </Button>
            <Button
              onClick={handleStartEdit}
              variant="secondary"
              size="sm"
            >
              Edit
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}


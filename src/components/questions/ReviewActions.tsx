"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface ReviewActionsProps {
  questionId: string;
  currentStatus: string;
  onStatusUpdate: (status: string, notes?: string) => Promise<void>;
}

export function ReviewActions({
  questionId,
  currentStatus,
  onStatusUpdate,
}: ReviewActionsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      await onStatusUpdate(newStatus, notes || undefined);
      setStatus(newStatus);
      setNotes("");
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (status !== "pending_review") {
    return (
      <div className="p-4 rounded bg-neutral-800">
        <p className="text-sm text-neutral-400">
          Status: <span className="font-semibold text-white">{status}</span>
        </p>
        {status === "approved" && (
          <p className="text-xs text-green-400 mt-1">
            This question has been approved and is ready for use.
          </p>
        )}
        {status === "rejected" && (
          <p className="text-xs text-red-400 mt-1">
            This question has been rejected and will not be used.
          </p>
        )}
        {status === "needs_revision" && (
          <p className="text-xs text-yellow-400 mt-1">
            This question needs revision before it can be approved.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Review Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about your review decision..."
          className="w-full p-3 rounded bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => handleStatusChange("approved")}
          disabled={isUpdating}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isUpdating ? "Updating..." : "Approve"}
        </Button>
        <Button
          onClick={() => handleStatusChange("rejected")}
          disabled={isUpdating}
          className="flex-1 bg-red-600 hover:bg-red-700"
        >
          {isUpdating ? "Updating..." : "Reject"}
        </Button>
        <Button
          onClick={() => handleStatusChange("needs_revision")}
          disabled={isUpdating}
          className="flex-1 bg-yellow-600 hover:bg-yellow-700"
        >
          {isUpdating ? "Updating..." : "Needs Revision"}
        </Button>
      </div>
    </div>
  );
}


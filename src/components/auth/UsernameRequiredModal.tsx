/**
 * Username Required Modal - Blocks site access until username is set
 * Wrapper around UsernameSetupModal with blocking behavior
 */

"use client";

import { UsernameSetupModal } from "@/components/profile/UsernameSetupModal";
import { useRouter } from "next/navigation";

interface UsernameRequiredModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function UsernameRequiredModal({ isOpen, onComplete }: UsernameRequiredModalProps) {
  const router = useRouter();

  const handleComplete = () => {
    // Reload the page to ensure all components get the updated username
    router.refresh();
    onComplete();
  };

  return (
    <UsernameSetupModal
      isOpen={isOpen}
      onComplete={handleComplete}
      blocking={true}
    />
  );
}


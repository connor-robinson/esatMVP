"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { TesterCheckpointModal } from "@/components/tester/TesterCheckpointModal";
import type { TesterState } from "@/lib/tester/types";
import {
  dismissCheckpoint,
  shouldAutoShowCheckpointModal,
  testerActionPending,
} from "@/lib/tester/checkpoint";

interface TesterProgrammeContextValue {
  state: TesterState | null;
  isLoading: boolean;
  loadError: string | null;
  loadWarning: string | null;
  refresh: () => Promise<void>;
  /** True while a checkpoint is pending (even if modal was dismissed). */
  actionPending: boolean;
  dismissModal: () => void;
}

const TesterProgrammeContext =
  createContext<TesterProgrammeContextValue | null>(null);

export function useTesterProgramme(): TesterProgrammeContextValue {
  const ctx = useContext(TesterProgrammeContext);
  if (!ctx) {
    throw new Error(
      "useTesterProgramme must be used within TesterProgrammeProvider",
    );
  }
  return ctx;
}

/** Safe hook for Navbar — returns null context values when outside provider. */
export function useTesterProgrammeOptional(): TesterProgrammeContextValue | null {
  return useContext(TesterProgrammeContext);
}

export function TesterProgrammeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = useSupabaseSession();
  const pathname = usePathname();
  const [state, setState] = useState<TesterState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissedLocally, setDismissedLocally] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setState(null);
      setLoadError(null);
      setLoadWarning(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/tester/status", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setState(null);
        return;
      }
      if (data?.state) {
        setState(data.state as TesterState);
        setLoadWarning(
          typeof data.warning === "string" ? data.warning : null,
        );
        if (!res.ok) {
          setLoadError(data.error ?? "Could not fully load programme status");
        }
        return;
      }
      setLoadError(
        data?.error ??
          "Could not load the Founding Tester Programme. Try signing in again.",
      );
    } catch {
      setLoadError("Could not load the Founding Tester Programme.");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Reset local dismiss flag when server status changes (new checkpoint).
  useEffect(() => {
    setDismissedLocally(false);
  }, [state?.status, state?.checkpointDue]);

  const actionPending = testerActionPending(state);

  useEffect(() => {
    if (isLoading || !state || dismissedLocally) {
      setModalOpen(false);
      return;
    }
    setModalOpen(shouldAutoShowCheckpointModal(state, pathname));
  }, [state, pathname, isLoading, dismissedLocally]);

  const dismissModal = useCallback(() => {
    if (state) dismissCheckpoint(state);
    setDismissedLocally(true);
    setModalOpen(false);
  }, [state]);

  const value = useMemo(
    () => ({
      state,
      isLoading,
      loadError,
      loadWarning,
      refresh,
      actionPending,
      dismissModal,
    }),
    [state, isLoading, loadError, loadWarning, refresh, actionPending, dismissModal],
  );

  return (
    <TesterProgrammeContext.Provider value={value}>
      {children}
      <TesterCheckpointModal
        open={modalOpen}
        state={state}
        onDismiss={dismissModal}
      />
    </TesterProgrammeContext.Provider>
  );
}

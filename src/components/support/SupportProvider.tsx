"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SupportCategory } from "@/lib/support/constants";
import { SupportLauncher } from "./SupportLauncher";
import { SupportPanel } from "./SupportPanel";

export type SupportOpenOptions = {
  category?: SupportCategory;
  subject?: string;
  questionId?: string;
  paperId?: string;
  sessionId?: string;
};

type SupportContextValue = {
  open: boolean;
  openSupport: (options?: SupportOpenOptions) => void;
  closeSupport: () => void;
  draftOptions: SupportOpenOptions | null;
};

const SupportContext = createContext<SupportContextValue | null>(null);

export function useSupport() {
  const ctx = useContext(SupportContext);
  if (!ctx) {
    throw new Error("useSupport must be used within SupportProvider");
  }
  return ctx;
}

/** Optional hook when the provider may be absent (e.g. isolated tests). */
export function useOptionalSupport(): SupportContextValue | null {
  return useContext(SupportContext);
}

export function SupportProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [draftOptions, setDraftOptions] = useState<SupportOpenOptions | null>(
    null,
  );

  const openSupport = useCallback((options?: SupportOpenOptions) => {
    setDraftOptions(options ?? null);
    setOpen(true);
  }, []);

  const closeSupport = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ open, openSupport, closeSupport, draftOptions }),
    [open, openSupport, closeSupport, draftOptions],
  );

  return (
    <SupportContext.Provider value={value}>
      {children}
      <SupportLauncher />
      <SupportPanel />
    </SupportContext.Provider>
  );
}

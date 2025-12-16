"use client";

import { createContext, useContext, ReactNode } from "react";
import { useLoadingState } from "@/hooks/useLoadingState";
import { LoadingPage } from "@/components/shared/LoadingPage";

interface LoadingContextType {
  isCompiling: boolean;
  isNavigating: boolean;
  progress: number;
  message: string;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const loadingState = useLoadingState();

  return (
    <LoadingContext.Provider value={loadingState}>
      {loadingState.isCompiling && (
        <LoadingPage
          message={loadingState.message}
          showProgress={true}
          progress={loadingState.progress}
        />
      )}
      {children}
    </LoadingContext.Provider>
  );
}




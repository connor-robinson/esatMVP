/**
 * Zustand store for session state
 */

import { create } from "zustand";

interface SessionState {
  topicId: string | null;
  level: number | null;
  isActive: boolean;
  setTopic: (topicId: string, level: number) => void;
  setActive: (active: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  topicId: null,
  level: null,
  isActive: false,
  
  setTopic: (topicId, level) => set({ topicId, level }),
  setActive: (active) => set({ isActive: active }),
  reset: () => set({ topicId: null, level: null, isActive: false }),
}));





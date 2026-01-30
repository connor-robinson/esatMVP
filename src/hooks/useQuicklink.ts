import { useEffect } from "react";

declare global {
  interface Window {
    quicklink: {
      listen: (options?: {
        ignores?: RegExp[] | Function[];
        timeout?: number;
        priority?: boolean;
        origins?: string[];
        timeoutFn?: () => void;
      }) => void;
    };
  }
}

export function useQuicklink() {
  useEffect(() => {
    // Quicklink temporarily disabled to fix exports error
  }, []);
}

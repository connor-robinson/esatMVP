import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface LoadingState {
  isCompiling: boolean;
  isNavigating: boolean;
  progress: number;
  message: string;
}

/**
 * Navigation loading flags only.
 * The old first-visit "Initializing..." splash was theatrical and blocked
 * SEO/marketing first paint, so it is intentionally gone.
 */
export function useLoadingState() {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isCompiling: false,
    isNavigating: false,
    progress: 0,
    message: "Loading...",
  });
  const router = useRouter();

  useEffect(() => {
    const handleRouteChangeStart = () => {
      setLoadingState((prev) => ({
        ...prev,
        isNavigating: true,
        progress: 0,
        message: "Loading page...",
      }));
    };

    const handleRouteChangeComplete = () => {
      setLoadingState((prev) => ({
        ...prev,
        isNavigating: false,
        progress: 0,
      }));
    };

    const originalPush = router.push;
    const originalReplace = router.replace;

    router.push = (...args) => {
      handleRouteChangeStart();
      return originalPush.apply(router, args);
    };

    router.replace = (...args) => {
      handleRouteChangeStart();
      return originalReplace.apply(router, args);
    };

    const timeout = setTimeout(() => {
      handleRouteChangeComplete();
    }, 300);

    return () => {
      clearTimeout(timeout);
      router.push = originalPush;
      router.replace = originalReplace;
    };
  }, [router]);

  return loadingState;
}

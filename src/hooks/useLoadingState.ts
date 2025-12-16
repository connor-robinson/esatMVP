import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface LoadingState {
  isCompiling: boolean;
  isNavigating: boolean;
  progress: number;
  message: string;
}

export function useLoadingState() {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isCompiling: false,
    isNavigating: false,
    progress: 0,
    message: "Loading...",
  });
  const router = useRouter();

  useEffect(() => {
    const hasLoadedBefore = sessionStorage.getItem("app-has-loaded");

    if (!hasLoadedBefore) {
      setLoadingState((prev) => ({
        ...prev,
        isCompiling: true,
        progress: 0,
        message: "Initializing...",
      }));

      const messages = [
        "Initializing math engines...",
        "Loading practice sessions...",
        "Optimizing algorithms...",
        "Preparing analytics...",
        "Almost ready...",
      ];

      let progress = 0;
      let messageIndex = 0;

      const interval = setInterval(() => {
        progress += Math.random() * 20 + 10;

        if (progress >= 100) {
          progress = 100;
          setLoadingState((prev) => ({
            ...prev,
            isCompiling: false,
            progress: 100,
          }));
          sessionStorage.setItem("app-has-loaded", "true");
          clearInterval(interval);
          return;
        }

        const newMessageIndex = Math.floor((progress / 100) * messages.length);
        if (newMessageIndex !== messageIndex && newMessageIndex < messages.length) {
          messageIndex = newMessageIndex;
          setLoadingState((prev) => ({
            ...prev,
            progress,
            message: messages[messageIndex],
          }));
        } else {
          setLoadingState((prev) => ({
            ...prev,
            progress,
          }));
        }
      }, 150);

      return () => clearInterval(interval);
    }
  }, []);

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

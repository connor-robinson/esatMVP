"use client";

import { useEffect, useState } from "react";

export function BuildBadge() {
  const [buildTime, setBuildTime] = useState<string>("");
  const [isProd, setIsProd] = useState<boolean>(true);

  useEffect(() => {
    setIsProd(process.env.NODE_ENV === "production");

    try {
      const buildId = (window as any).__NEXT_DATA__?.buildId;
      if (buildId && buildId !== "dev") {
        const timestamp = parseInt(buildId);
        if (!isNaN(timestamp)) {
          const buildDate = new Date(timestamp);
          const timeString = buildDate.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          setBuildTime(timeString);
          return;
        }
      }
    } catch {}

    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setBuildTime(timeString);
  }, []);

  if (isProd) return null;

  return (
    <div
      className="fixed bottom-3 left-3 z-[9999] px-2.5 py-1.5 text-xs font-mono rounded-md border border-white/15 bg-black/60 text-white/70 backdrop-blur-sm"
      title="Build time"
    >
      build: {buildTime}
    </div>
  );
}




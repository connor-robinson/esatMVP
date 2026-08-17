const OCTOBER_START_MS = Date.UTC(2026, 9, 12);

export function daysUntilOctoberEsat(now = new Date()): number {
  const startOfTodayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.ceil((OCTOBER_START_MS - startOfTodayUtc) / 86_400_000);
}

export function EsatOctoberCountdown() {
  const days = daysUntilOctoberEsat();

  let headline: string;
  let detail: string;
  if (days > 1) {
    headline = `${days} days`;
    detail = "until the October 2026 sitting opens on 12 October.";
  } else if (days === 1) {
    headline = "1 day";
    detail = "until the October 2026 sitting opens on 12 October.";
  } else if (days === 0) {
    headline = "Today";
    detail = "The October 2026 sitting window starts today, 12 October.";
  } else if (days >= -4) {
    headline = "Window open";
    detail = "The October 2026 sitting is 12 to 16 October. Check your booked slot.";
  } else {
    headline = "October sitting passed";
    detail =
      "The next published window is 4 to 8 January 2027, where your course allows it.";
  }

  return (
    <div className="rounded-2xl bg-[#161D2F] p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6]">
        October sitting countdown
      </p>
      <p className="mt-4 text-4xl font-display font-bold tracking-tight text-white sm:text-5xl">
        {headline}
      </p>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#94A3B8] sm:text-base">
        {detail}
      </p>
    </div>
  );
}

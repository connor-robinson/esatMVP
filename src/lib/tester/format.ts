/**
 * Client-safe display helpers for the tester programme.
 * Timestamps are stored in UTC; these render them in the user's local timezone.
 * Always pair a countdown with the absolute date (never rely on a timer alone).
 */

export function formatExpiry(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const date = d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} at ${time}`;
}

export function formatRemaining(ms: number | null): string {
  if (ms === null) return "-";
  if (ms <= 0) return "Expired";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days >= 1) {
    return `${days} day${days === 1 ? "" : "s"}${
      hours > 0 ? ` ${hours} hr${hours === 1 ? "" : "s"}` : ""
    } remaining`;
  }
  if (hours >= 1) {
    return `${hours} hour${hours === 1 ? "" : "s"}${
      minutes > 0 ? ` ${minutes} min` : ""
    } remaining`;
  }
  return `${minutes} minute${minutes === 1 ? "" : "s"} remaining`;
}

export function formatDuration(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

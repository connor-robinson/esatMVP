/**
 * Queue GA calls until the gtag stub exists.
 */

type GaCall = () => void;

const pendingCalls: GaCall[] = [];

export function runWhenGtagReady(call: GaCall): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    call();
    return;
  }
  pendingCalls.push(call);
}

/** Flush calls queued while gtag was not yet defined. */
export function flushGaQueue(): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  while (pendingCalls.length > 0) {
    const call = pendingCalls.shift();
    try {
      call?.();
    } catch {
      /* analytics is non-critical */
    }
  }
}

/** Test-only. */
export function __resetGaQueueForTests(): void {
  pendingCalls.length = 0;
}

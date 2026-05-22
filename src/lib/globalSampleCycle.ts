/**
 * Coordinates drill preview sample rotation so at most one card advances per tick.
 */

const TICK_MS = 5000;

type Subscriber = {
  tick: () => void;
  canCycle: boolean;
};

const subscribers = new Map<string, Subscriber>();
let intervalId: ReturnType<typeof setInterval> | undefined;

function pickAndTick() {
  const active = [...subscribers.values()].filter((s) => s.canCycle);
  if (active.length === 0) return;
  active[Math.floor(Math.random() * active.length)]!.tick();
}

function syncInterval() {
  const hasActive = [...subscribers.values()].some((s) => s.canCycle);
  if (hasActive && intervalId === undefined) {
    intervalId = setInterval(pickAndTick, TICK_MS);
  } else if (!hasActive && intervalId !== undefined) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
}

export function setGlobalSampleCycleSubscriber(
  id: string,
  tick: () => void,
  canCycle: boolean,
) {
  subscribers.set(id, { tick, canCycle });
  syncInterval();
}

export function removeGlobalSampleCycleSubscriber(id: string) {
  subscribers.delete(id);
  syncInterval();
}

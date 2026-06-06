import { useEffect, useRef, useState } from "react";

/** Per-frame lerp toward measured card centers (smooth spine + nodes during expand). */
const LERP = 0.16;
const SETTLE_THRESHOLD = 0.35;

function positionsSettled(current: number[], targets: number[]): boolean {
  if (current.length !== targets.length) return false;
  return current.every(
    (value, index) =>
      Math.abs((targets[index] ?? value) - value) < SETTLE_THRESHOLD,
  );
}

export function useSmoothNodePositions(targets: number[]): number[] {
  const [smooth, setSmooth] = useState<number[]>(targets);
  const targetsRef = useRef(targets);
  const smoothRef = useRef(targets);
  const rafRef = useRef<number | null>(null);

  const runLoop = () => {
    const nextTargets = targetsRef.current;
    const prev = smoothRef.current;

    if (nextTargets.length === 0) {
      rafRef.current = null;
      return;
    }

    if (prev.length !== nextTargets.length) {
      smoothRef.current = nextTargets;
      setSmooth(nextTargets);
      rafRef.current = requestAnimationFrame(runLoop);
      return;
    }

    let moved = false;
    const next = prev.map((value, index) => {
      const target = nextTargets[index] ?? value;
      const diff = target - value;
      if (Math.abs(diff) < SETTLE_THRESHOLD) {
        if (value !== target) moved = true;
        return target;
      }
      moved = true;
      return value + diff * LERP;
    });

    if (moved) {
      smoothRef.current = next;
      setSmooth(next);
    } else {
      smoothRef.current = nextTargets;
    }

    if (!positionsSettled(smoothRef.current, nextTargets)) {
      rafRef.current = requestAnimationFrame(runLoop);
    } else {
      rafRef.current = null;
    }
  };

  const ensureLoop = () => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(runLoop);
    }
  };

  useEffect(() => {
    targetsRef.current = targets;
    if (targets.length !== smoothRef.current.length) {
      smoothRef.current = targets;
      setSmooth(targets);
      return;
    }
    if (!positionsSettled(smoothRef.current, targets)) {
      ensureLoop();
    }
  }, [targets]);

  useEffect(() => {
    ensureLoop();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return smooth;
}

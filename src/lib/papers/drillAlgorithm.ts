/**
 * Weighted selection algorithm for drill items
 */

import type { DrillItem } from '@/types/papers';

export function pickNextDrillItem(drillPool: DrillItem[]): DrillItem | null {
  if (drillPool.length === 0) return null;

  const nowTs = Date.now();
  const weights = drillPool.map((item) => {
    const sinceWrongH = Math.max(0, (nowTs - item.lastWrongAt) / (1000 * 60 * 60));
    const recencyBoost = 1 + 2 * Math.exp(-sinceWrongH / 48); // Decay over 48 hours
    
    const baseTime = item.lastTimeSec ?? 0;
    const slowFactor = 1 + 1.5 * Math.min(1, baseTime / 120); // Boost for questions taking >2 minutes
    
    let reviewFactor = 1;
    if (item.lastReviewedAt) {
      const sinceReviewH = (nowTs - item.lastReviewedAt) / (1000 * 60 * 60);
      reviewFactor = sinceReviewH < 2 ? 0.2 : sinceReviewH < 8 ? 0.6 : sinceReviewH < 24 ? 0.8 : 1;
    }
    
    const outcomeFactor = item.lastOutcome === "correct" ? 0.7 : 1.3;
    
    return Math.max(0.05, recencyBoost * slowFactor * reviewFactor * outcomeFactor);
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  
  for (let i = 0; i < drillPool.length; i++) {
    r -= weights[i];
    if (r <= 0) return drillPool[i];
  }
  
  return drillPool[drillPool.length - 1];
}

export function calculateDrillWeights(drillPool: DrillItem[]): Array<{ item: DrillItem; weight: number }> {
  if (drillPool.length === 0) return [];

  const nowTs = Date.now();
  return drillPool.map((item) => {
    const sinceWrongH = Math.max(0, (nowTs - item.lastWrongAt) / (1000 * 60 * 60));
    const recencyBoost = 1 + 2 * Math.exp(-sinceWrongH / 48);
    
    const baseTime = item.lastTimeSec ?? 0;
    const slowFactor = 1 + 1.5 * Math.min(1, baseTime / 120);
    
    let reviewFactor = 1;
    if (item.lastReviewedAt) {
      const sinceReviewH = (nowTs - item.lastReviewedAt) / (1000 * 60 * 60);
      reviewFactor = sinceReviewH < 2 ? 0.2 : sinceReviewH < 8 ? 0.6 : sinceReviewH < 24 ? 0.8 : 1;
    }
    
    const outcomeFactor = item.lastOutcome === "correct" ? 0.7 : 1.3;
    
    const weight = Math.max(0.05, recencyBoost * slowFactor * reviewFactor * outcomeFactor);
    
    return { item, weight };
  });
}



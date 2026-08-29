/**
 * Pure helpers for Pearson Unseen Content viewport tracking.
 */

const DEFAULT_TOLERANCE_PX = 8;

export function isViewportContentFullyViewed(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  tolerancePx: number = DEFAULT_TOLERANCE_PX,
): boolean {
  if (scrollHeight <= clientHeight + tolerancePx) {
    return true;
  }
  return scrollHeight - scrollTop - clientHeight <= tolerancePx;
}

export function isSentinelVisibleInRoot(
  sentinel: Element,
  root: Element,
  tolerancePx: number = DEFAULT_TOLERANCE_PX,
): boolean {
  const sentinelRect = sentinel.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();

  if (sentinelRect.height === 0 && sentinelRect.width === 0) {
    return false;
  }

  return sentinelRect.bottom <= rootRect.bottom + tolerancePx;
}

export function viewportRequiresScrolling(
  scrollHeight: number,
  clientHeight: number,
  tolerancePx: number = DEFAULT_TOLERANCE_PX,
): boolean {
  return scrollHeight > clientHeight + tolerancePx;
}

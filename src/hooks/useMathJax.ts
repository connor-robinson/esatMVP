/**
 * Hook to ensure MathJax is loaded and ready, then typeset math content
 */

"use client";

import { useEffect, useRef, useCallback } from 'react';

/**
 * Wait for MathJax to be loaded and ready
 */
export function waitForMathJax(timeout = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      console.log('[MathJax] Window not available');
      resolve(false);
      return;
    }

    // Check if MathJax is already loaded and ready
    if (window.MathJax?.typesetPromise) {
      console.log('[MathJax] Already loaded and ready');
      resolve(true);
      return;
    }

    console.log('[MathJax] Waiting for MathJax to load...');
    const startTime = Date.now();
    
    // Listen for the mathjax-ready event
    const handleReady = () => {
      console.log('[MathJax] Received ready event');
      if (window.MathJax?.typesetPromise) {
        window.removeEventListener('mathjax-ready', handleReady);
        clearInterval(checkInterval);
        resolve(true);
      }
    };
    window.addEventListener('mathjax-ready', handleReady);
    
    // Also poll as fallback
    const checkInterval = setInterval(() => {
      if (window.MathJax?.typesetPromise) {
        console.log('[MathJax] Loaded after', Date.now() - startTime, 'ms');
        window.removeEventListener('mathjax-ready', handleReady);
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        console.warn('[MathJax] Timeout waiting for MathJax to load after', timeout, 'ms');
        window.removeEventListener('mathjax-ready', handleReady);
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);
  });
}

/**
 * Typeset math in a specific element or the whole page
 */
export async function typesetMath(element?: HTMLElement | null): Promise<void> {
  const isReady = await waitForMathJax();
  if (!isReady) {
    console.warn('[MathJax] Cannot typeset - MathJax not ready');
    return;
  }

  try {
    if (element) {
      console.log('[MathJax] Typesetting element:', element);
      await window.MathJax!.typesetPromise!([element]);
    } else {
      console.log('[MathJax] Typesetting entire page');
      await window.MathJax!.typesetPromise!();
    }
    console.log('[MathJax] Typesetting complete');
  } catch (error) {
    console.error('[MathJax] Typesetting error:', error);
  }
}

/**
 * Hook to automatically typeset math when content changes
 */
export function useMathJax(dependencies: any[] = []) {
  const containerRef = useRef<HTMLElement>(null);

  const typeset = useCallback(async () => {
    if (containerRef.current) {
      await typesetMath(containerRef.current);
    }
  }, []);

  useEffect(() => {
    typeset();
  }, dependencies);

  return { containerRef, typeset };
}


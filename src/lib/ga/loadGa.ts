/**
 * Imperative GA4 bootstrap.
 *
 * next/script inline children that mount only after consent are unreliable:
 * the script node can land in the DOM without the init body ever running, so
 * gtag/js loads while window.gtag / dataLayer stay undefined and no collect
 * or _ga cookie appears. Creating the stub and appending the external script
 * via the DOM API runs exactly once and is deterministic.
 */

import { flushGaQueue } from "./queue";

export const GA_SCRIPT_ATTR = "data-esatcamp-ga";

type GaWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

let loadPromise: Promise<void> | null = null;
let stubReady = false;

function getGaWindow(): GaWindow | null {
  if (typeof window === "undefined") return null;
  return window as GaWindow;
}

/** True once dataLayer + gtag stub exist (external script may still be loading). */
export function isGaStubReady(): boolean {
  const w = getGaWindow();
  return Boolean(w && typeof w.gtag === "function" && Array.isArray(w.dataLayer));
}

/**
 * True once the external gtag.js has finished loading (or was already present).
 */
export function isGaScriptLoaded(measurementId: string): boolean {
  if (typeof document === "undefined") return false;
  const el = document.querySelector(
    `script[${GA_SCRIPT_ATTR}="${measurementId}"]`,
  ) as HTMLScriptElement | null;
  return Boolean(el?.dataset.gaLoaded === "1");
}

/**
 * Install the gtag stub + config, then load googletagmanager gtag.js.
 * Safe to call repeatedly — runs the bootstrap at most once per page.
 */
export function loadGoogleAnalytics(measurementId: string): Promise<void> {
  const w = getGaWindow();
  if (!w || !measurementId) return Promise.resolve();

  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    try {
      installGtagStub(w, measurementId);
      flushGaQueue();

      const existing = document.querySelector(
        `script[${GA_SCRIPT_ATTR}="${measurementId}"]`,
      ) as HTMLScriptElement | null;

      if (existing) {
        existing.dataset.gaLoaded = "1";
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.setAttribute(GA_SCRIPT_ATTR, measurementId);
      script.onload = () => {
        script.dataset.gaLoaded = "1";
        flushGaQueue();
        resolve();
      };
      script.onerror = () => {
        loadPromise = null;
        stubReady = false;
        reject(new Error(`Failed to load Google Analytics script (${measurementId})`));
      };
      document.head.appendChild(script);
    } catch (error) {
      loadPromise = null;
      stubReady = false;
      reject(error);
    }
  });

  return loadPromise;
}

function installGtagStub(w: GaWindow, measurementId: string): void {
  if (stubReady && typeof w.gtag === "function") {
    (w as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] =
      false;
    return;
  }

  (w as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] =
    false;
  w.dataLayer = w.dataLayer || [];
  // GA expects the Arguments object, not a rest-parameter array.
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("js", new Date());
  w.gtag("config", measurementId, {
    send_page_view: false,
    anonymize_ip: true,
  });
  stubReady = true;
}

/** Test-only: reset module state between cases. */
export function __resetGaLoaderForTests(): void {
  loadPromise = null;
  stubReady = false;
}

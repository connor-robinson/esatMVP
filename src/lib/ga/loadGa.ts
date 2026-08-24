/**
 * Imperative GA4 bootstrap.
 *
 * next/script inline children that mount only after consent are unreliable:
 * the script node can land in the DOM without the init body ever running, so
 * gtag/js loads while window.gtag / dataLayer stay undefined and no collect
 * or _ga cookie appears. Creating the stub and appending the external script
 * via the DOM API runs exactly once and is deterministic.
 *
 * Consent Mode v2 defaults are installed separately (layout inline +
 * initGoogleConsentDefaults) and must never trigger a Google network request.
 */

import { ensureGtagStub } from "./consent";
import { flushGaQueue } from "./queue";

export const GA_SCRIPT_ATTR = "data-esatcamp-ga";

type GaWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

let loadPromise: Promise<void> | null = null;
let configReady = false;

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
 * Call only after Consent Mode has been updated to the accepted signals.
 */
export function loadGoogleAnalytics(measurementId: string): Promise<void> {
  const w = getGaWindow();
  if (!w || !measurementId) return Promise.resolve();

  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    try {
      installGaConfig(w, measurementId);
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
        configReady = false;
        reject(new Error(`Failed to load Google Analytics script (${measurementId})`));
      };
      document.head.appendChild(script);
    } catch (error) {
      loadPromise = null;
      configReady = false;
      reject(error);
    }
  });

  return loadPromise;
}

function installGaConfig(w: GaWindow, measurementId: string): void {
  (w as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] =
    false;

  ensureGtagStub();

  if (configReady && typeof w.gtag === "function") {
    return;
  }

  w.gtag!("js", new Date());
  w.gtag!("config", measurementId, {
    send_page_view: false,
    anonymize_ip: true,
  });
  configReady = true;
}

/** Test-only: reset module state between cases. */
export function __resetGaLoaderForTests(): void {
  loadPromise = null;
  configReady = false;
}

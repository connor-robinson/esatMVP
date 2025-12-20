/**
 * MathJax global type declarations
 */

declare global {
  interface Window {
    MathJax?: {
      startup?: {
        defaultPageReady?: () => Promise<void>;
        ready?: (callback: () => void) => void;
        promise?: Promise<void>;
        document?: any;
      };
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      typeset?: (elements?: HTMLElement[]) => void;
    };
  }
}

export {};


"use client";

import { useEffect } from "react";

/**
 * MathJax Loader Component
 * Ensures MathJax is properly initialized with correct configuration
 */
export function MathJaxLoader() {
  useEffect(() => {
    // Configure MathJax before it loads
    if (typeof window !== "undefined") {
      (window as any).MathJax = {
        tex: {
          inlineMath: [["$", "$"], ["\\(", "\\)"]],
          displayMath: [["$$", "$$"], ["\\[", "\\]"]],
          processEscapes: true,
          processEnvironments: true,
          tags: 'ams',
        },
        options: {
          skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
          ignoreHtmlClass: 'no-math',
          processHtmlClass: 'math-content',
        },
        startup: {
          ready: () => {
            console.log('[MathJax] MathJax is ready');
            (window as any).MathJax.startup.defaultReady();
            window.dispatchEvent(new Event("mathjax-ready"));
          },
        },
      };
    }

    // Wait for MathJax script to load
    const checkMathJax = () => {
      if (typeof window !== "undefined" && (window as any).MathJax?.startup) {
        const MathJax = (window as any).MathJax;
        
        // Ensure configuration is set
        if (!MathJax.tex) {
          MathJax.tex = {
            inlineMath: [["$", "$"], ["\\(", "\\)"]],
            displayMath: [["$$", "$$"], ["\\[", "\\]"]],
            processEscapes: true,
            processEnvironments: true,
            tags: 'ams',
          };
        }
        
        // Dispatch ready event
        if (MathJax.startup && MathJax.startup.ready) {
          // Already configured in startup.ready above
          if (!MathJax._readyDispatched) {
            MathJax._readyDispatched = true;
          }
        }
      } else {
        // Retry if MathJax not loaded yet
        setTimeout(checkMathJax, 100);
      }
    };
    
    // Start checking after a short delay to let script load
    setTimeout(checkMathJax, 100);
  }, []);

  return null;
}



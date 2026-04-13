"use client";

import DOMPurify from "dompurify";

const STEM_TABLE_SANITIZE: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "caption",
    "colgroup",
    "col",
    "strong",
    "em",
    "b",
    "i",
    "br",
    "span",
    "code",
    "sub",
    "sup",
  ],
  ALLOWED_ATTR: [
    "style",
    "class",
    "colspan",
    "rowspan",
    "scope",
    "align",
    "width",
    "height",
    "border",
    "cellpadding",
    "cellspacing",
    "valign",
  ],
  ALLOW_DATA_ATTR: false,
};

const STEM_SVG_SANITIZE: Parameters<typeof DOMPurify.sanitize>[1] = {
  USE_PROFILES: { svg: true, svgFilters: true },
  ADD_ATTR: [
    "viewBox",
    "preserveAspectRatio",
    "xmlns",
    "xmlns:xlink",
    "xml:space",
    "xlink:href",
    "href",
    "class",
    "id",
    "style",
    "transform",
    "transform-origin",
    "fill",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-dasharray",
    "stroke-dashoffset",
    "stroke-miterlimit",
    "opacity",
    "fill-opacity",
    "stroke-opacity",
    "d",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "x",
    "y",
    "x1",
    "y1",
    "x2",
    "y2",
    "width",
    "height",
    "points",
    "font-family",
    "font-size",
    "font-weight",
    "text-anchor",
    "dominant-baseline",
    "marker-start",
    "marker-mid",
    "marker-end",
    "orient",
    "refX",
    "refY",
    "patternUnits",
    "patternTransform",
    "gradientUnits",
    "gradientTransform",
    "spreadMethod",
    "offset",
    "stop-color",
    "stop-opacity",
    "clip-path",
    "mask",
    "filter",
    "vector-effect",
    "role",
    "aria-label",
    "focusable",
    "font-style",
    "font-variant",
  ],
  ADD_TAGS: [
    "line",
    "polyline",
    "polygon",
    "circle",
    "rect",
    "path",
    "text",
    "defs",
    "linearGradient",
    "radialGradient",
    "stop",
    "clipPath",
    "mask",
    "pattern",
    "marker",
    "filter",
    "feGaussianBlur",
    "feColorMatrix",
    "feOffset",
    "feMerge",
    "feMergeNode",
    "feFlood",
    "feComposite",
    "feBlend",
    "feComponentTransfer",
    "feFuncR",
    "feFuncG",
    "feFuncB",
    "feFuncA",
    "use",
    "title",
    "desc",
    "g",
    "symbol",
    "image",
    "foreignObject",
    "ellipse",
    "textPath",
    "tspan",
    "animate",
    "animateTransform",
    "animateMotion",
    "set",
    "switch",
    "mpath",
  ],
};

/** ``<figure class="qg-diagram">…<svg>…</svg></figure>`` from quality-gate / backfill merge. */
const _svgAddTags = STEM_SVG_SANITIZE.ADD_TAGS;
const STEM_QG_FIGURE_BLOCK: Parameters<typeof DOMPurify.sanitize>[1] = {
  ...STEM_SVG_SANITIZE,
  ADD_TAGS: [
    "figure",
    ...(Array.isArray(_svgAddTags) ? _svgAddTags : []),
  ],
};

/**
 * Sanitize a full qg-diagram figure wrapper + inner SVG (stem preview).
 */
export function sanitizeStemQgDiagramFigure(html: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  return DOMPurify.sanitize(html, STEM_QG_FIGURE_BLOCK);
}

/**
 * Sanitize an SVG fragment for safe insertion into the DOM (stem preview).
 */
export function sanitizeStemSvg(svgMarkup: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  const out = DOMPurify.sanitize(svgMarkup, STEM_SVG_SANITIZE);
  const inLen = svgMarkup.trim().length;
  const outLen = out.trim().length;
  if (inLen > 0 && outLen === 0) {
    console.warn("[stem-preview] DOMPurify removed entire <svg> fragment (allowlist too strict or invalid markup).", {
      inLen,
      preview: svgMarkup.slice(0, 240),
    });
  } else if (inLen > 80 && outLen > 0 && outLen < inLen * 0.15) {
    console.warn("[stem-preview] DOMPurify stripped most of an <svg> fragment — diagram may look wrong.", {
      inLen,
      outLen,
      previewIn: svgMarkup.slice(0, 160),
      previewOut: out.slice(0, 160),
    });
  }
  return out;
}

/**
 * Sanitize HTML table fragments (and simple inline markup in cells).
 */
export function sanitizeStemTable(html: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  return DOMPurify.sanitize(html, STEM_TABLE_SANITIZE);
}

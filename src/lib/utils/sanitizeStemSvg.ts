"use client";

import DOMPurify from "dompurify";

/** Normalise dark generator colours for the app dark theme. */
function normalizeSvgVisibilityColors(svg: string): string {
  if (!svg) return svg;
  let out = svg
    .replace(/(["'\s=:])(#[0]{3,8}|#[1]{3,8})(?=["'\s;>}/])/gi, "$1#e5e7eb")
    .replace(/(["'\s=:])(black)(?=["'\s;>}/])/gi, "$1#e5e7eb")
    .replace(/(["'\s=:])(rgb\(\s*0\s*,\s*0\s*,\s*0\s*\))(?=["'\s;>}/])/gi, "$1#e5e7eb")
    .replace(
      /(["'\s=:])(rgb\(\s*1[0-9]\s*,\s*1[0-9]\s*,\s*1[0-9]\s*\))(?=["'\s;>}/])/gi,
      "$1#e5e7eb",
    )
    .replace(/\bfill:\s*#111\b/gi, "fill:currentColor")
    .replace(/\bstroke:\s*#111\b/gi, "stroke:currentColor")
    .replace(/\bfill:\s*#222\b/gi, "fill:currentColor")
    .replace(/\bstroke:\s*#222\b/gi, "stroke:currentColor");

  // Hook-set M1 Q6: right-angle mark was misplaced; labels were black in <style>.
  out = out
    .replace(
      /M185 75 L198 84 L189 97/g,
      "M188 71 L203.4 83.7 L215.4 67.7",
    )
    .replace(/x="123" y="104">90°/g, 'x="196" y="78">90°');

  if (!/\bstroke\s*=/.test(out) && !/\bfill\s*=/.test(out) && out.includes("<svg")) {
    out = out.replace(/<svg\b/i, '<svg style="color:#e5e7eb"');
  }
  return out;
}

function extractOriginalViewBox(svgMarkup: string): string | null {
  const m = svgMarkup.match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
  if (!m) return null;
  const value = m[1].trim();
  if (/^-?\d+(\.\d+)?(?:\s+-?\d+(\.\d+)?){3}$/.test(value)) return value;
  return null;
}

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
    "viewbox",
    "preserveAspectRatio",
    "preserveaspectratio",
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

export function sanitizeStemSvg(svgMarkup: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  const out = DOMPurify.sanitize(svgMarkup, STEM_SVG_SANITIZE);
  let visible = normalizeSvgVisibilityColors(out);
  const hasViewBox = /\bviewBox\s*=|\bviewbox\s*=/i.test(visible);
  if (!hasViewBox) {
    const vb = extractOriginalViewBox(svgMarkup);
    if (vb) {
      visible = visible.replace(
        /<svg\b/i,
        `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet"`,
      );
    }
  }
  return visible;
}

export function sanitizeStemTable(html: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  return DOMPurify.sanitize(html, STEM_TABLE_SANITIZE);
}

export function ensureSvgResponsiveMarkup(svgMarkup: string): string {
  return svgMarkup.replace(/<svg\b([^>]*)>/i, (full, attrs: string) => {
    let next = attrs || "";
    const hasViewBox = /\bviewBox\s*=|\bviewbox\s*=/i.test(next);
    if (!hasViewBox) next += ' viewBox="0 0 600 420"';
    if (!/\bwidth\s*=/i.test(next)) next += ' width="100%"';
    if (!/\bheight\s*=/i.test(next)) next += ' height="auto"';
    if (!/\bpreserveAspectRatio\s*=/i.test(next)) {
      next += ' preserveAspectRatio="xMidYMid meet"';
    }
    return `<svg${next}>`;
  });
}

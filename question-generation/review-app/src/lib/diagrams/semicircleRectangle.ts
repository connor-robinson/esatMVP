export interface SemicircleRectangleOptions {
  /** Pixel radius of the semicircle in diagram space */
  radiusPx?: number;
  /** Show dimension labels w, h */
  labels?: boolean;
  /** Show radius tick to top of arc */
  showRadius?: boolean;
}

/**
 * SVG diagram: rectangle inscribed in a semicircle, one side on the diameter.
 * Geometry uses the maximum-area configuration: half-width = height = R/√2, so h/w = 1/2.
 */
export function semicircleInscribedRectangleSvg(
  opts: SemicircleRectangleOptions = {}
): string {
  const R = opts.radiusPx ?? 88;
  const labels = opts.labels !== false;
  const showRadius = opts.showRadius === true;

  const cx = 200;
  const cy = 200;
  const a = R / Math.SQRT2;
  const h = R / Math.SQRT2;
  const x0 = cx - a;
  const x1 = cx + a;
  const yBase = cy;
  const yTop = cy - h;
  const arcTopY = cy - R;

  const stroke = "rgba(248,250,252,0.92)";
  const muted = "rgba(248,250,252,0.45)";
  const fillRect = "rgba(96,165,250,0.12)";
  const tf = `font-family="'Times New Roman', Times, 'Noto Serif', Georgia, serif" font-size="15" font-style="italic"`;

  const diameter = `M ${cx - R} ${yBase} L ${cx + R} ${yBase}`;
  /* Upper semicircle: sweep 0 chooses the arc above the diameter (SVG +y is down). */
  const arc = `M ${cx - R} ${yBase} A ${R} ${R} 0 0 0 ${cx + R} ${yBase}`;
  const rect = `M ${x0} ${yBase} L ${x1} ${yBase} L ${x1} ${yTop} L ${x0} ${yTop} Z`;

  let radiusGuide = "";
  let radiusLabel = "";
  if (showRadius) {
    radiusGuide = `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${arcTopY}" stroke="${muted}" stroke-width="1" stroke-dasharray="4 3"/>`;
    radiusLabel = `<text x="${cx + 6}" y="${cy - R / 2}" fill="${muted}" ${tf}>R</text>`;
  }

  let labelBlock = "";
  if (labels) {
    labelBlock = `
      <text x="${(x0 + x1) / 2}" y="${yBase + 22}" text-anchor="middle" fill="${stroke}" ${tf}>w</text>
      <text x="${x1 + 14}" y="${(yBase + yTop) / 2 + 5}" fill="${stroke}" ${tf}>h</text>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240" role="img" aria-label="Rectangle inscribed in a semicircle">
    <rect width="100%" height="100%" fill="transparent"/>
    <path d="${diameter}" fill="none" stroke="${stroke}" stroke-width="2"/>
    <path d="${arc}" fill="none" stroke="${stroke}" stroke-width="2"/>
    <path d="${rect}" fill="${fillRect}" stroke="${stroke}" stroke-width="1.75"/>
    ${radiusGuide}
    ${radiusLabel}
    ${labelBlock}
  </svg>`.replace(/\s+/g, " ").trim();
}

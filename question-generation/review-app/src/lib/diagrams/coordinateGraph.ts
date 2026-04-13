export type GraphPresetId = "parabola" | "sin" | "cos" | "cubic" | "exp";

export interface CoordinateGraphOptions {
  preset: GraphPresetId;
  /** Plot window */
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  /** Curve label (small, near curve) */
  label?: string;
}

function sample(
  xMin: number,
  xMax: number,
  n: number,
  fn: (x: number) => number
): string {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = xMin + t * (xMax - xMin);
    const y = fn(x);
    pts.push(`${x},${y}`);
  }
  return pts.join(" ");
}

function presetFn(id: GraphPresetId): (x: number) => number {
  switch (id) {
    case "parabola":
      return (x) => x * x;
    case "sin":
      return Math.sin;
    case "cos":
      return Math.cos;
    case "cubic":
      return (x) => x * x * x - x;
    case "exp":
      return (x) => Math.exp(x * 0.35);
    default:
      return (x) => x * x;
  }
}

function defaultWindow(id: GraphPresetId): {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  label: string;
} {
  switch (id) {
    case "parabola":
      return { xMin: -2.2, xMax: 2.2, yMin: -0.5, yMax: 5, label: "y = x^2" };
    case "sin":
      return { xMin: -6.5, xMax: 6.5, yMin: -1.35, yMax: 1.35, label: "y = sin x" };
    case "cos":
      return { xMin: -6.5, xMax: 6.5, yMin: -1.35, yMax: 1.35, label: "y = cos x" };
    case "cubic":
      return { xMin: -2, xMax: 2, yMin: -2, yMax: 2, label: "y = x^3 - x" };
    case "exp":
      return { xMin: -2, xMax: 4, yMin: -0.5, yMax: 4, label: "y = e^{kx}" };
    default:
      return { xMin: -2, xMax: 2, yMin: -1, yMax: 4, label: "" };
  }
}

/**
 * Axes + grid + sampled curve in mathematical coordinates (SVG user space = math space).
 */
export function coordinateGraphSvg(opts: CoordinateGraphOptions): string {
  const def = defaultWindow(opts.preset);
  const xMin = opts.xMin ?? def.xMin;
  const xMax = opts.xMax ?? def.xMax;
  const yMin = opts.yMin ?? def.yMin;
  const yMax = opts.yMax ?? def.yMax;
  const curveLabel = opts.label ?? def.label;

  const W = 420;
  const H = 260;
  const padL = 36;
  const padR = 20;
  const padT = 28;
  const padB = 36;

  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const tx = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * plotW;
  const ty = (y: number) => padT + ((yMax - y) / (yMax - yMin)) * plotH;

  const stroke = "rgba(248,250,252,0.9)";
  const grid = "rgba(248,250,252,0.12)";
  const axis = "rgba(248,250,252,0.75)";
  const curve = "rgba(125,211,252,0.95)";
  const tf = `font-family="'Times New Roman', Times, 'Noto Serif', Georgia, serif" font-size="14" font-style="italic"`;

  const fn = presetFn(opts.preset);

  const y0 = ty(0);
  const xAxisY = Math.min(H - padB, Math.max(padT, y0));
  const yAxisX = Math.min(W - padR, Math.max(padL, tx(0)));

  const gridLines: string[] = [];
  const tickStepX = niceTick(xMax - xMin);
  const tickStepY = niceTick(yMax - yMin);
  for (let gx = Math.ceil(xMin / tickStepX) * tickStepX; gx <= xMax; gx += tickStepX) {
    const X = tx(gx);
    gridLines.push(
      `<line x1="${X}" y1="${padT}" x2="${X}" y2="${H - padB}" stroke="${grid}" stroke-width="1"/>`
    );
  }
  for (let gy = Math.ceil(yMin / tickStepY) * tickStepY; gy <= yMax; gy += tickStepY) {
    const Y = ty(gy);
    gridLines.push(
      `<line x1="${padL}" y1="${Y}" x2="${W - padR}" y2="${Y}" stroke="${grid}" stroke-width="1"/>`
    );
  }

  const poly = sample(xMin, xMax, 160, fn);
  const mappedPoly = poly
    .split(" ")
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return `${tx(x)},${ty(y)}`;
    })
    .join(" ");

  const labelEl = curveLabel
    ? `<text x="${padL + plotW - 8}" y="${padT + 18}" text-anchor="end" fill="${mutedLabel()}" ${tf}>${escapeXml(
        curveLabel
      )}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Coordinate graph">
    <rect width="100%" height="100%" fill="transparent"/>
    ${gridLines.join("")}
    <line x1="${padL}" y1="${xAxisY}" x2="${W - padR}" y2="${xAxisY}" stroke="${axis}" stroke-width="1.25"/>
    <line x1="${yAxisX}" y1="${padT}" x2="${yAxisX}" y2="${H - padB}" stroke="${axis}" stroke-width="1.25"/>
    <polygon points="${W - padR - 6},${xAxisY} ${W - padR},${xAxisY - 4} ${W - padR},${xAxisY + 4}" fill="${axis}"/>
    <polygon points="${yAxisX},${padT + 6} ${yAxisX - 4},${padT} ${yAxisX + 4},${padT}" fill="${axis}"/>
    <polyline points="${mappedPoly}" fill="none" stroke="${curve}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${labelEl}
  </svg>`
    .replace(/\s+/g, " ")
    .trim();
}

function mutedLabel(): string {
  return "rgba(248,250,252,0.5)";
}

function niceTick(span: number): number {
  const raw = span / 6;
  const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow10;
  let base = 1;
  if (n <= 1) base = 1;
  else if (n <= 2) base = 2;
  else if (n <= 5) base = 5;
  else base = 10;
  return base * pow10;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

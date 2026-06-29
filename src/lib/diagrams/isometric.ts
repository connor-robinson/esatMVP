/**
 * Isometric 3D → 2D projection helpers
 */

const ISO_X = 0.866; // cos(30°)
const ISO_Y = 0.5; // sin(30°)

export function isoProject(x: number, y: number, z: number, origin: { x: number; y: number }): { x: number; y: number } {
  return {
    x: origin.x + (x - y) * ISO_X,
    y: origin.y + (x + y) * ISO_Y - z,
  };
}

export function isoLine(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  origin: { x: number; y: number },
): { x1: number; y1: number; x2: number; y2: number } {
  const p1 = isoProject(a.x, a.y, a.z, origin);
  const p2 = isoProject(b.x, b.y, b.z, origin);
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
}

export function isoPath(points: { x: number; y: number; z: number }[], origin: { x: number; y: number }): string {
  const pts = points.map((p) => isoProject(p.x, p.y, p.z, origin));
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
}

export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx - rx} ${cy}`;
}

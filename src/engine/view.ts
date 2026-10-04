// A screen-space move of the finished picture (spec §3.1 rules 3–4: kick
// punches and downbeat shakes): the rendered frame is scaled by `zoom` about
// its centre, turned by `roll` radians, then moved by (x, y) logical px (y up).
// Pure; the pipeline samples every sub-frame through viewMatrix().
export type View = { zoom: number; x: number; y: number; roll: number };
export const IDENTITY_VIEW: View = { zoom: 1, x: 0, y: 0, roll: 0 };

const W = 1920;
const H = 1080;

/** The least zoom at which the moved, turned frame still covers the whole screen. */
export function coverZoom(v: View): number {
  const c = Math.cos(v.roll);
  const s = Math.sin(v.roll);
  let need = 1;
  for (const [cx, cy] of [[W / 2, H / 2], [-W / 2, H / 2], [W / 2, -H / 2], [-W / 2, -H / 2]]) {
    const px = cx - v.x;
    const py = cy - v.y;
    need = Math.max(need, Math.abs(c * px + s * py) / (W / 2), Math.abs(-s * px + c * py) / (H / 2));
  }
  return need;
}

/** `v`, zoomed further where needed so that no edge of the frame shows. */
export const covered = (v: View): View => ({ ...v, zoom: Math.max(v.zoom, coverZoom(v)) });

/** Column-major 3 × 3 matrix taking a screen uv (0–1, y up) to the uv of the rendered frame that shows there. */
export function viewMatrix(v: View): number[] {
  const c = Math.cos(v.roll) / v.zoom;
  const s = Math.sin(v.roll) / v.zoom;
  const m00 = c;
  const m01 = (H / W) * s;
  const m10 = 0 - (W / H) * s;
  const m11 = c;
  const bx = 0.5 - 0.5 * (m00 + m01) - (c * v.x + s * v.y) / W;
  const by = 0.5 - 0.5 * (m10 + m11) - (-s * v.x + c * v.y) / H;
  return [m00, m10, 0, m01, m11, 0, bx, by, 1];
}

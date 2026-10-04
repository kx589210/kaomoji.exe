// The woodblock print's geometry (S31U, drop2 10–11; builder U · WAVE; build sheet notes/bid2/drop2-sheet2.md §3 "drop2 10–11",
// §4.3, §4.8; notes D1 and D2). The great wave as Defender's compass drew it — its curl is four
// quarter arcs of a golden spiral (WAVE_CURL, the arcs the switch drafts on drop2 9.4&) — and, after D2 ("the wave is too thin": make it
// massive, as in Hokusai's print), a huge body of water filling the left two thirds of the frame from the bottom-left corner, 500 px thick
// at mid-height, striated in a dozen bands that follow its curve (pale at the skin, darkest on the inner face, white lines between),
// its lip a lumpy mass of foam breaking into fractal claws that droop over a big hollow; under the lip the small kaomoji mountain on a
// low horizon with a grey-blue band of sky behind it; a turbulent sea of crested mounds with Defender's long boats in the troughs; a
// smaller peaked wave in front. Everything here is in the print's own plane coordinates: layout px (1920 × 1080, origin top left, y
// down), where the print sits at rest (the camera of drop2 10.1 is the identity, so on the burst frame plane = screen). Pure: no three,
// no DOM; tests/drop2Wave.test.ts pins it.
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import { hash, noise1 } from '../engine/random.ts';

export type XY = readonly [number, number];

/** φ, the golden ratio: each quarter arc of the curl is 1/φ of the one before. */
export const PHI = (1 + Math.sqrt(5)) / 2;

/** One quarter arc of the curl: centre, radius, start and end angle (degrees, y down: 0 = right, 90 = down; clockwise on screen). */
export type CurlArc = { cx: number; cy: number; r: number; a0: number; a1: number };

/** A golden curl of `n` quarter arcs from the crest top (`c` its first centre, `r0` its first radius): each 1/φ of the one before, tangent. */
export function goldenCurl(c: XY, r0: number, n: number): CurlArc[] {
  const out: CurlArc[] = [];
  let [cx, cy] = c;
  let r = r0;
  for (let k = 0; k < n; k++) {
    const a0 = -90 + 90 * k;
    out.push({ cx, cy, r, a0, a1: a0 + 90 });
    const rn = r / PHI;
    // The next centre: the shared end point lies on the line through both centres.
    const e = ((a0 + 90) * Math.PI) / 180;
    cx += (r - rn) * Math.cos(e);
    cy += (r - rn) * Math.sin(e);
    r = rn;
  }
  return out;
}

/**
 * The first arc (D2: massive): the crest's top (760, 126), near the top edge, to the lip's farthest reach (1122, 488), far out over the
 * hollow (the switch's drafting keeps it in the left 60 % and its crest in frame: tests/drop2Switch.test.ts).
 */
const R1 = 362;
const C1: XY = [760, 488];
/** The first arc's centre: the hinge the lip is thrown from in the crash. */
export const CURL_CENTRE: XY = C1;

/**
 * WAVE_CURL (contract §6.3, 852 → 864): the four compass arcs of the curl, outer edge, in plane = screen px on drop2 10.1. Each starts
 * where the one before ends, tangent to it (a golden spiral of quarter circles): the crest over the top, the lip down and back, the
 * curl's tip up into the eye. The switch drafts exactly these (ARCS, one a 32nd); on the burst they are the print's sumi keyline.
 */
export const WAVE_CURL: readonly CurlArc[] = goldenCurl(C1, R1, 4);

/** The golden spiral's pole: the eye of the curl. */
export const CURL_EYE: XY = (() => {
  let [cx, cy] = C1;
  let r = R1;
  for (let k = 0; k < 40; k++) {
    const e = ((-90 + 90 * k + 90) * Math.PI) / 180;
    const rn = r / PHI;
    cx += (r - rn) * Math.cos(e);
    cy += (r - rn) * Math.sin(e);
    r = rn;
  }
  return [cx, cy];
})();

/** A point of an arc list (a curl) at parameter s ∈ [0, n], `inset` px toward its arc's centre. */
export function arcPoint(arcs: readonly CurlArc[], s: number, inset = 0): XY {
  const k = Math.min(arcs.length - 1, Math.max(0, Math.floor(s)));
  const a = arcs[k];
  const t = clamp(s - k);
  const ang = ((a.a0 + (a.a1 - a.a0) * t) * Math.PI) / 180;
  const r = Math.max(0, a.r - inset);
  return [a.cx + r * Math.cos(ang), a.cy + r * Math.sin(ang)];
}

/** A point of the curl's outer edge at spiral parameter s ∈ [0, 4] (arc ⌊s⌋, fraction s − ⌊s⌋), with `inset` px toward the arc's centre. */
export const curlPoint = (s: number, inset = 0): XY => arcPoint(WAVE_CURL, s, inset);

/** Arc length of the curl's outer edge from s = 0 to s. */
export function curlLength(s: number): number {
  let L = 0;
  for (let k = 0; k < 4; k++) L += (Math.PI / 2) * WAVE_CURL[k].r * clamp(s - k);
  return L;
}

/** Points along a cubic Bézier (n + 1 of them, endpoints included). */
export function cubic(p0: XY, p1: XY, p2: XY, p3: XY, n: number): XY[] {
  const out: XY[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return out;
}

// ——— The great wave's body ———————————————————————————————————————————————————————————————————————————————————————————————

/** The crest's top: where the back arrives, level, and the first arc begins. */
export const CREST_TOP: XY = [C1[0], C1[1] - R1];
/** Below the frame: the body's floor (it is closed along it). */
export const BOTTOM = 1180;

/**
 * The back (D2): out of the bottom-left corner, a broad convex slope that crosses the left edge at mid-height and arrives level on the
 * crest — so the left third of the frame below it is all water, 500 px thick at mid-height.
 */
const BACK_PTS = [[-320, 1100], [30, 700], [300, 152], CREST_TOP] as const satisfies readonly XY[];
export const BACK: readonly XY[] = cubic(BACK_PTS[0], BACK_PTS[1], BACK_PTS[2], BACK_PTS[3], 48);
/**
 * The back run on 720 px below its start, along its tangent (round 2: where the water and its bands began showed as a straight cut in
 * the bottom-left corner when the camera rode down his loop), far end first: the water polygon starts there.
 */
export const BACK_RUNUP: readonly XY[] = (() => {
  const dx = BACK_PTS[1][0] - BACK_PTS[0][0];
  const dy = BACK_PTS[1][1] - BACK_PTS[0][1];
  const L = Math.hypot(dx, dy);
  return [36, 30, 24, 18, 12, 6].map((k) => [BACK_PTS[0][0] - (dx / L) * 20 * k, BACK_PTS[0][1] - (dy / L) * 20 * k] as XY);
})();

/**
 * Where the lip's water ends on the curl (T08, round 1: the lip came down to the sea and closed the hollow into an 'O'): a little past
 * the farthest reach, at 55–60 % of the hollow's height; the fingers hang off it, down and right toward the boats, over open water.
 * Defender's compass arcs stay the curl's outer keyline (the rest of the spiral is the drafting, gone once the colour blocks print).
 */
export const WATER_END = 1.32;
/** The lip at the crest (px): the overhang is the wave's heaviest mass. */
const LIP_ROOT = 200;
/** The lip's thickness at spiral parameter s: 200 px at the crest, holding its weight round the front, thinning to a point at WATER_END. */
export const lipThickness = (s: number): number => LIP_ROOT * (1 - clamp(s / WATER_END) ** 1.5) ** 0.75 + 2;

/** Sample the curl's outer edge s ∈ [s0, s1] (step ≈ `step` px), with an inset (a function of s). */
export function curlRun(s0: number, s1: number, inset: (s: number) => number = () => 0, step = 10): XY[] {
  const len = Math.abs(curlLength(s1) - curlLength(s0));
  const n = Math.max(2, Math.ceil(len / step));
  const out: XY[] = [];
  for (let i = 0; i <= n; i++) {
    const s = lerp(s0, s1, i / n);
    out.push(curlPoint(s, inset(s)));
  }
  return out;
}

/** The crest's inner edge continued back past the top (degrees on the first arc): the lip's root, where the face falls from. */
const ROOT_DEG = -155;
const rootPoint = (deg: number): XY => {
  const a = WAVE_CURL[0];
  const r = a.r - lipThickness(0);
  const t = (deg * Math.PI) / 180;
  return [a.cx + r * Math.cos(t), a.cy + r * Math.sin(t)];
};
/** The lip's root arc (inner side of the crest, −90° → ROOT_DEG). */
const ROOT_ARC: readonly XY[] = Array.from({ length: 13 }, (_, i) => rootPoint(lerp(-90, ROOT_DEG, i / 12)));

/** The trough at the face's foot: the hollow's floor of water (y), where he lands and turns (10.2). */
export const TROUGH_Y = 884;
/**
 * The face of the wave (the hollow's inner wall): from the lip's root, a concave wall down to its foot, turning into the trough — the
 * hollow's floor of water, flat to x 860 — which then falls away under the near sea, below the frame.
 */
export const FACE: readonly XY[] = (() => {
  const r0 = rootPoint(ROOT_DEG);
  const wall = cubic(r0, [r0[0] - 36, r0[1] + 150], [556, 760], [650, 858], 26);
  const foot = cubic([650, 858], [690, TROUGH_Y], [740, TROUGH_Y], [860, TROUGH_Y], 10);
  const away = cubic([860, TROUGH_Y], [1000, TROUGH_Y], [1120, 912], [1320, BOTTOM], 12);
  return [...wall, ...foot.slice(1), ...away.slice(1)];
})();

/**
 * The water: one simple polygon, clockwise on screen — up the back to the crest, round the curl's outer edge to where the water ends,
 * back along the lip's underside, round its root and down the face to below the frame, then home along the floor. The hollow is outside.
 */
export const WATER: readonly XY[] = (() => {
  const outer = curlRun(0, WATER_END, () => 0, 8);
  const inner = curlRun(WATER_END, 0, lipThickness, 8);
  // Home along a floor far below the frame (round 2: the floor at BOTTOM showed as a straight cut when the camera rode down the loop).
  const deep = BOTTOM + 600;
  const end = FACE[FACE.length - 1];
  // (The face runs on down in a curve, not a straight cut: no edge of the water is long and straight where the camera can see it.)
  const under = cubic(end, [end[0] + 60, end[1] + 170], [end[0] + 100, end[1] + 370], [end[0] + 120, deep], 12);
  return [...BACK_RUNUP, ...BACK, ...outer.slice(1), ...inner.slice(1), ...ROOT_ARC.slice(1), ...FACE.slice(1), ...under.slice(1), [BACK_RUNUP[0][0], deep]];
})();

/**
 * Where the lip pitches over in the crash (spiral parameter s, on the first arc): the middle of its hinge. Round 2 (R2-01, R2C-01): the
 * lip used to break off here along a straight radial cut, as two polygons of its own, and their chords showed as straight planks and a
 * cream notch in the barrel dive, and as a chopped-off crest after it. Nothing breaks now: the lip's share of the crash (lipWeight) rises
 * smoothly over a wide hinge round this point, so the wave bends and its outline, bands and lines stay one curved piece on every frame.
 */
export const LIP_CUT = 0.42;

/** A polyline moved `d` px to its right (y down: for a curve drawn left to right, "right" is below it). */
export function offsetPolyline(pts: readonly XY[], d: number): XY[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const L = Math.hypot(tx, ty) || 1;
    // Right normal in y-down coordinates: (−ty, tx).
    return [p[0] - (ty / L) * d, p[1] + (tx / L) * d] as XY;
  });
}

/** Total length of a polyline and the point / tangent at arc length `u` along it. */
export function polyLength(pts: readonly XY[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}
export function along(pts: readonly XY[], u: number): { p: XY; t: XY } {
  let rest = Math.max(0, u);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (rest <= l || i === pts.length - 1) {
      const t = l > 0 ? clamp(rest / l) : 0;
      return { p: [lerp(a[0], b[0], t), lerp(a[1], b[1], t)], t: l > 0 ? [(b[0] - a[0]) / l, (b[1] - a[1]) / l] : [1, 0] };
    }
    rest -= l;
  }
  return { p: pts[pts.length - 1], t: [1, 0] };
}

// ——— The claws (design §4.8: a fractal claw generator, 3 levels) ——————————————————————————————————————————————————————————————

/** A claw: its centreline (base on the lip → tip) and its width at the base; its two sub-claws and their sub-claws. */
export type Claw = { spine: XY[]; width: number; level: 1 | 2 | 3; children: Claw[] };

/**
 * One claw grown from base point `b` heading `dir` (radians, y down), `len` long: a foam finger (Hokusai's talon) that runs nearly
 * straight out of the foam and hooks hard at its end, always clockwise, the way the water travels. Level 1 claws open a hand of three
 * fingers from their last half, level 2 fingers carry two small fingers each (3 levels); the fingers fan to the claw's outer side.
 */
export function growClaw(b: XY, dir: number, len: number, width: number, level: 1 | 2 | 3, seed: number, curl = 1): Claw {
  const n = 22;
  const spine: XY[] = [];
  let [x, y] = b;
  let a = dir;
  const k0 = (0.3 + 0.3 * hash(seed, 1)) / n;
  const k1 = (curl * (1.75 + 0.7 * hash(seed, 2))) / n;
  for (let i = 0; i <= n; i++) {
    spine.push([x, y]);
    const u = i / n;
    a += k0 + 3.2 * k1 * u ** 2.2;
    x += (Math.cos(a) * len) / n;
    y += (Math.sin(a) * len) / n;
  }
  const children: Claw[] = [];
  const fingers =
    level === 1
      ? [
          [0.34, -0.95, 0.6],
          [0.46, -0.52, 0.54],
          [0.58, -0.12, 0.44],
        ]
      : level === 2
        ? [
            [0.48, -0.8, 0.46],
            [0.66, -0.36, 0.36],
          ]
        : [];
  fingers.forEach(([u, spread, l], k) => {
    const i = Math.round(u * n);
    const p = spine[i];
    const q = spine[Math.min(n, i + 1)];
    const ta = Math.atan2(q[1] - p[1], q[0] - p[0]);
    children.push(growClaw(p, ta + spread * (0.85 + 0.3 * hash(seed, 10 + k)), len * l * (0.9 + 0.2 * hash(seed, 20 + k)), width * (level === 1 ? 0.62 : 0.55), (level + 1) as 2 | 3, seed * 7 + k + 1, curl * 1.1));
  });
  return { spine, width, level, children };
}

/** The claw's outline as a closed polygon: a full finger at its root, tapering steadily to a fine hooked point. */
export function clawOutline(c: Claw): XY[] {
  const left: XY[] = [];
  const right: XY[] = [];
  const n = c.spine.length;
  for (let i = 0; i < n; i++) {
    const a = c.spine[Math.max(0, i - 1)];
    const b = c.spine[Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const L = Math.hypot(tx, ty) || 1;
    const u = i / (n - 1);
    const w = Math.max(0.9, (c.width / 2) * (1 - u) ** (c.level === 1 ? 1.6 : 1.1));
    const p = c.spine[i];
    left.push([p[0] + (ty / L) * w, p[1] - (tx / L) * w]);
    right.push([p[0] - (ty / L) * w, p[1] + (tx / L) * w]);
  }
  return [...left, ...right.reverse()];
}

/**
 * A foam finger (D3, round 1: "fewer and bigger", Hokusai's talons, not hundreds of thin strands): a large, rounded, tapering finger
 * that runs out of the foam mass and curls the way the water travels (clockwise: forward and down), forking once at its tip into 2–3
 * small claws that splay and hook. One level of forks only.
 */
export function growFinger(b: XY, dir: number, len: number, width: number, seed: number, curl = 1, forks: 2 | 3 = 3): Claw {
  const n = 22;
  const spine: XY[] = [];
  let [x, y] = b;
  let a = dir;
  const k1 = (curl * (1.5 + 0.5 * hash(seed, 2))) / n;
  for (let i = 0; i <= n; i++) {
    spine.push([x, y]);
    const u = i / n;
    a += 0.15 / n + 2.6 * k1 * u ** 1.6;
    x += (Math.cos(a) * len) / n;
    y += (Math.sin(a) * len) / n;
  }
  const tips: [number, number, number][] = forks === 3 ? [[0.7, -0.8, 0.36], [0.78, 0.45, 0.3], [0.86, -0.2, 0.22]] : [[0.72, -0.7, 0.34], [0.82, 0.4, 0.27]];
  const children = tips.map(([u, spread, l], k) => {
    const i = Math.round(u * n);
    const p = spine[i];
    const q = spine[Math.min(n, i + 1)];
    const ta = Math.atan2(q[1] - p[1], q[0] - p[0]);
    return growClaw(p, ta + spread * (0.85 + 0.3 * hash(seed, 30 + k)), len * l * (0.85 + 0.3 * hash(seed, 40 + k)), width * 0.42, 3, seed * 11 + k, curl * 1.3);
  });
  return { spine, width, level: 1, children };
}

/** Every claw of a tree, the root first. */
export const clawsOf = (c: Claw): Claw[] => [c, ...c.children.flatMap(clawsOf)];

/**
 * The lip's fringe (D1: "many fine foam fingers along the lip, in several overlapping rows, white with Prussian-blue line work"; D2:
 * fractal, drooping toward the hollow): three rows of talons from just behind the crest round the front of the lip to where the water
 * ends — the back row longest and pale blue, the middle row white with full hands, the front row short and white — each swept forward
 * with the wave's travel (`lean`) and hooking at its end; the longest hang off the front, down and right toward the boats. Then the
 * scroll (`aim: 'along'`): the drafted spiral's fingers winding on into the eye, each 1/φ smaller a quarter turn; it is whole only while
 * Defender's drafting shows, and winds back to the lip's broken tip as the colour blocks print, so the hollow is open.
 */
export type ClawRow = {
  s0: number;
  s1: number;
  n: number;
  inset: number;
  len: readonly [number, number];
  width: number;
  lean: number;
  fill: 'pale' | 'foam';
  level: 1 | 2;
  seed: number;
  /** 'out': from the edge, swept forward by `lean`; 'along': along the curl's travel, turned inward by `lean`, shrinking by φ a quarter turn. */
  aim?: 'out' | 'along';
  /** How hard the fingers hook at their tips (1.15 a talon's 180°; the lip's 0.72 ≈ 110°, so they reach down and right, not back into the hollow). */
  hook?: number;
  /** 'finger': growFinger (D3: a big finger forking once at its tip), its length ramping from len[1] at s0 to len[0] at s1. */
  form?: 'finger';
};
/**
 * D3 (round 1): two rows of big fingers growing out of the foam mass — a back row of smaller ones behind (14), and the front row (21), all
 * curling the same way, forward and down into the hollow, longest at the front of the lip. (They replace the three rows of thin
 * strands, ≈ 400 shapes, that read as hair.)
 */
export const CLAW_ROWS: readonly ClawRow[] = [
  { s0: 0.1, s1: 1.28, n: 14, inset: 24, len: [120, 56], width: 32, lean: 0.5, fill: 'foam', level: 1, seed: 300, hook: 0.6, form: 'finger' },
  { s0: 0.06, s1: 1.34, n: 21, inset: 12, len: [176, 76], width: 44, lean: 0.3, fill: 'foam', level: 1, seed: 400, hook: 0.55, form: 'finger' },
];
export const SCROLL_ROW: ClawRow = { s0: 1.3, s1: 3.72, n: 21, inset: 2, len: [122, 122], width: 12, lean: 0.42, fill: 'foam', level: 2, seed: 800, aim: 'along' };
/** Where the scroll ends once the print has inked (spiral parameter s): wound right back, so no finger of it hangs in the hollow. */
export const SCROLL_REST = 0.95;
/** Where along a row its claw `i` sits (spiral parameter s). */
export const rowS = (r: ClawRow, i: number): number => lerp(r.s0, r.s1, (i + 0.5 * hash(r.seed, i, 1)) / r.n);
/** A row's claw `i` on a curl (WAVE_CURL's or the front wave's), its curl strength × `curl` (the flick on the drums). */
function rowClaw(arcs: readonly CurlArc[], r: ClawRow, i: number, curl: number, scale = 1): Claw {
  const s = rowS(r, i);
  const p = arcPoint(arcs, s, r.inset);
  const q = arcPoint(arcs, s + 0.01, r.inset);
  const ta = Math.atan2(q[1] - p[1], q[0] - p[0]);
  const jit = 0.12 * (hash(r.seed, i, 3) - 0.5);
  if (r.aim === 'along') {
    const k = PHI ** -(s - r.s0);
    return growClaw(p, ta + r.lean + jit, r.len[0] * k * (0.85 + 0.3 * hash(r.seed, i, 2)) * scale, Math.max(3, r.width * k) * scale, r.level, r.seed + 13 * i, curl * (1.3 + 0.3 * hash(r.seed, i, 5)));
  }
  // Outward normal (y down, clockwise travel): the tangent turned −90°, swept forward along the travel.
  const out = ta - Math.PI / 2;
  if (r.form === 'finger') {
    const ramp = clamp((s - r.s0) / (r.s1 - r.s0)) ** 0.8 * Math.min(1, (r.s1 + 0.04 - s) / 0.16);
    const len = lerp(r.len[1], r.len[0], ramp) * (0.82 + 0.36 * hash(r.seed, i, 2)) * scale;
    const lean = r.lean + 0.2 * clamp((s - r.s0) / (r.s1 - r.s0));
    return growFinger(p, out + lean + jit, len, r.width * scale * (0.85 + 0.3 * hash(r.seed, i, 4)) * (0.75 + 0.25 * ramp), r.seed + 13 * i, curl * ((r.hook ?? 1) + 0.3 * hash(r.seed, i, 5)), i % 2 === 0 ? 3 : 2);
  }
  const bell = Math.sin(Math.PI * clamp((s - r.s0) / (r.s1 - r.s0))) ** 0.7;
  const len = lerp(r.len[1], r.len[0], bell) * (0.78 + 0.44 * hash(r.seed, i, 2)) * scale;
  return growClaw(p, out + r.lean + jit, len, r.width * scale * (0.85 + 0.3 * hash(r.seed, i, 4)), r.level, r.seed + 13 * i, curl * ((r.hook ?? 1.15) + 0.35 * hash(r.seed, i, 5)));
}
/**
 * Every claw of the lip's three rows (back row first) and its scroll, at curl strength `curl` (1 at rest), each with its fixed index `ci`.
 * The scroll reaches to `scrollTo` (spiral parameter): a finger past it shrinks away over 0.35 of a quarter turn (gone under 4 %).
 */
export function lipClaws(curl = 1, scrollTo = SCROLL_ROW.s1): { claw: Claw; row: ClawRow; ci: number }[] {
  const rows = [...CLAW_ROWS, SCROLL_ROW].flatMap((r) => Array.from({ length: r.n }, (_, i) => ({ r, i })));
  const out: { claw: Claw; row: ClawRow; ci: number }[] = [];
  rows.forEach(({ r, i }, ci) => {
    const k = r === SCROLL_ROW ? clamp(1 - (rowS(r, i) - scrollTo) / 0.35) : 1;
    if (k > 0.04) out.push({ claw: rowClaw(WAVE_CURL, r, i, curl, k), row: r, ci });
  });
  return out;
}
/** The lip's claws at rest, the scroll wound back (the mountain's test reads them). */
export const LIP_CLAWS: readonly Claw[] = lipClaws(1, SCROLL_REST).map((c) => c.claw);

// ——— The body: its outer edge, how deep the water runs under each point of it, the edge at any depth ——————————————————————————————

/** How far along `n` (from p) the ray first meets the polyline (Infinity if never). */
function rayHit(p: XY, n: XY, poly: readonly XY[]): number {
  let best = Infinity;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1];
    const b = poly[i];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const den = n[0] * ey - n[1] * ex;
    if (Math.abs(den) < 1e-9) continue;
    const wx = a[0] - p[0];
    const wy = a[1] - p[1];
    const t = (wx * ey - wy * ex) / den;
    const v = (wx * n[1] - wy * n[0]) / den;
    if (t > 0.5 && v >= 0 && v <= 1) best = Math.min(best, t);
  }
  return best;
}

/** A point of a wave's outer edge: where, its inward normal, its curl parameter (−1 on the back), its arc length, how deep the water is under it. */
export type EdgePoint = { p: XY; n: XY; s: number; u: number; depth: number };
/**
 * A wave's outer edge, sampled every ≈ 6 px: up the back, over the crest and round the curl to its tip; at each point the inward normal
 * and the water's depth along it (to the hollow's edge or the floor), capped at `cap`.
 */
export function edgeOf(back: readonly XY[], arcs: readonly CurlArc[], thick: (s: number) => number, hollow: readonly XY[], cap: number, sEnd = arcs.length): EdgePoint[] {
  const len = arcs.reduce((L, a, k) => L + (Math.PI / 2) * a.r * clamp(sEnd - k), 0);
  const n = Math.ceil(len / 6);
  const pts: { p: XY; s: number }[] = [...back.map((p) => ({ p, s: -1 })), ...Array.from({ length: n }, (_, i) => ({ p: arcPoint(arcs, (sEnd * (i + 1)) / n), s: (sEnd * (i + 1)) / n }))];
  let u = 0;
  const out = pts.map((q, i) => {
    const a = pts[Math.max(0, i - 1)].p;
    const b = pts[Math.min(pts.length - 1, i + 1)].p;
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const L = Math.hypot(tx, ty) || 1;
    const nrm: XY = [-ty / L, tx / L];
    if (i > 0) u += Math.hypot(q.p[0] - pts[i - 1].p[0], q.p[1] - pts[i - 1].p[1]);
    let depth = Math.min(cap, rayHit(q.p, nrm, hollow) - 1.5);
    if (q.s >= 0) depth = Math.min(depth, thick(q.s) - 1);
    return { p: q.p, n: nrm, s: q.s, u, depth: Math.max(0, depth) };
  });
  // The depth may not jump along the edge (a ray from the convex back can hit the far face, then the near one): limit its change to
  // 2 px per px of edge, both ways, so the deep bands' inner rails stay smooth (D3: no plank).
  for (let i = 1; i < out.length; i++) out[i].depth = Math.min(out[i].depth, out[i - 1].depth + 2 * (out[i].u - out[i - 1].u));
  for (let i = out.length - 2; i >= 0; i--) out[i].depth = Math.min(out[i].depth, out[i + 1].depth + 2 * (out[i + 1].u - out[i].u));
  return out;
}
/** The edge `d` px in (each point no deeper than the water under it): the bands' and the white lines' rails. */
export const edgeAt = (edge: readonly EdgePoint[], d: number): XY[] => edge.map((e) => [e.p[0] + e.n[0] * Math.min(d, e.depth), e.p[1] + e.n[1] * Math.min(d, e.depth)]);

/** The back, finely sampled (the same curve as BACK), from just off the left edge. */
const BACK_FINE: readonly XY[] = cubic(BACK_PTS[0], BACK_PTS[1], BACK_PTS[2], BACK_PTS[3], 260).filter((p) => p[0] > -260);
/** The hollow's edge (the lip's underside from its tip back to the crest, its root, the face) and the floor: the depth rays' stops. */
export const HOLLOW_EDGE: readonly XY[] = [...curlRun(WATER_END, 0, lipThickness, 6), ...ROOT_ARC.slice(1), ...FACE.slice(1), [BACK_PTS[0][0] - 200, BOTTOM]];
/** The great wave's outer edge with its depths (the whole body: rays run on to the face or the floor). */
export const EDGE: readonly EdgePoint[] = edgeOf(BACK_FINE, WAVE_CURL, lipThickness, HOLLOW_EDGE, 1100, WATER_END);

/**
 * The striated body (D2: "many flowing parallel bands (≈ 8–14) that follow its curve: deep Prussian blue, mid blue, pale blue and thin
 * white lines alternating, darkest on the inner face"): twelve bands from the skin in, each a bokashi of its own (lighter at its outer
 * rail, t0 → t1 on the blue ramp pale 0 · light ⅓ · Prussian ⅔ · deep 1), alternating lighter and darker as they go in, darkening overall.
 */
export type Stripe = { d0: number; d1: number; t0: number; t1: number };
export const STRIPES: readonly Stripe[] = (() => {
  const D = [0, 26, 56, 90, 128, 170, 216, 266, 320, 380, 446, 520, 1100];
  const T: [number, number][] = [
    [0.0, 0.2],
    [0.24, 0.4],
    [0.32, 0.54],
    [0.46, 0.62],
    [0.38, 0.6],
    [0.56, 0.74],
    [0.5, 0.76],
    [0.66, 0.86],
    [0.62, 0.88],
    [0.78, 0.95],
    [0.8, 1],
    [0.94, 1],
  ];
  return T.map(([t0, t1], k) => ({ d0: D[k], d1: D[k + 1], t0, t1 }));
})();

/**
 * The white lines (the uncut paper of the blue block between the bands): one at each inner band boundary, each running from the back's
 * foot up over the crest and round the curl until the lip is too thin to hold it.
 */
export const FOAM_DEPTHS: readonly number[] = STRIPES.slice(1, 11).map((s) => s.d0);
export type FoamLine = { pts: XY[]; u: number[]; depth: number };
const lineOf = (edge: readonly EdgePoint[], d: number, room: number): FoamLine => {
  const rail = edgeAt(edge, d);
  // The longest run of the edge with room for the line under it (the back's foot is shallow over the floor; the lip thins out).
  let best: [number, number] = [0, 0];
  let start = -1;
  edge.forEach((e, i) => {
    const ok = e.depth > d + room;
    if (ok && start < 0) start = i;
    if ((!ok || i === edge.length - 1) && start >= 0) {
      const end = ok ? i + 1 : i;
      if (end - start > best[1] - best[0]) best = [start, end];
      start = -1;
    }
  });
  const pts = rail.slice(best[0], best[1]);
  const u: number[] = [];
  let L = 0;
  pts.forEach((p, i) => {
    if (i > 0) L += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    u.push(L);
  });
  return { pts, u, depth: d };
};
export const FOAM_LINES: readonly FoamLine[] = FOAM_DEPTHS.map((d) => lineOf(EDGE, d, 7));
/** The face's water lines: three rails into the water from the face (the hollow's inner wall), from below the root down. */
export const FACE_LINES: readonly XY[][] = [18, 40, 66].map((d) => offsetPolyline(FACE, d).slice(3));

/** The dashes of line `k` (arc-length intervals in [0, L]), the pattern moved `offset` px along the line (the water flowing): long cuts, short breaks. */
export function dashes(k: number, L: number, offset: number): [number, number][] {
  const pat: [number, number][] = Array.from({ length: 14 }, (_, j) => [150 + 260 * hash(k, j, 61), 10 + 22 * hash(k, j, 62)]);
  const P = pat.reduce((t, [a, b]) => t + a + b, 0);
  const out: [number, number][] = [];
  const o0 = ((offset % P) + P) % P - P;
  for (let base = o0; base < L; base += P) {
    let x = base;
    for (const [dash, gap] of pat) {
      const a = Math.max(0, x);
      const b = Math.min(L, x + dash);
      if (b > a + 4) out.push([a, b]);
      x += dash + gap;
    }
  }
  return out;
}
/** The piece of a polyline (its cumulative lengths `u`) between arc lengths a and b. */
export function subPolyline(pts: readonly XY[], u: readonly number[], a: number, b: number): XY[] {
  const out: XY[] = [];
  const at = (x: number): XY => {
    let i = 1;
    while (i < u.length - 1 && u[i] < x) i++;
    const t = u[i] > u[i - 1] ? clamp((x - u[i - 1]) / (u[i] - u[i - 1])) : 0;
    return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)];
  };
  out.push(at(a));
  for (let i = 0; i < pts.length; i++) if (u[i] > a && u[i] < b) out.push(pts[i]);
  out.push(at(b));
  return out;
}
/** The point of a line nearest to `q`: its arc length. */
export function nearestU(line: FoamLine, q: XY): number {
  let best = Infinity;
  let bu = 0;
  line.pts.forEach((p, i) => {
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < best) {
      best = d;
      bu = line.u[i];
    }
  });
  return bu;
}

/**
 * The foam mass (D2: "the lip is a big lumpy mass of white foam that breaks into claw-like fingers"): white water over the crest and
 * round the front of the lip, from 150 px back down the back to where the water ends; deepest at the front of the lip (where it breaks:
 * `depth` + `swell`), its inner edge lumpy — billows of varied size (`lump`), not a regular scallop.
 */
export const CAP = { from: EDGE.findIndex((e) => e.s >= 0) - 26, to: EDGE.findIndex((e) => e.s >= WATER_END - 0.02), depth: 22, swell: 46, lump: 18 } as const;
/** The cap's depth at edge point `i` (px in from the skin), lumps included. */
export function capDepth(i: number, edge: readonly EdgePoint[] = EDGE, cap: { from: number; to: number; depth: number; swell: number; lump: number } = CAP): number {
  const t = clamp((i - cap.from) / (cap.to - cap.from));
  const taper = Math.sin(Math.PI * t) ** 0.4;
  const front = smoothstep(0.25, 0.8, t);
  const u = edge[i].u - edge[Math.max(0, cap.from)].u;
  // Billows: two noise octaves along the edge, rectified so each lump is a round bulge and the gaps between them pinch in.
  const billow = Math.abs(noise1(u / 46, 911)) ** 0.7 * 0.7 + Math.abs(noise1(u / 17, 912)) ** 0.8 * 0.3;
  return Math.min(edge[i].depth - 2, (cap.depth + cap.swell * front + cap.lump * billow) * taper);
}
/**
 * The foam dots (D2: "white spray dots scattered densely over the dark blue near the crest"; R8, round 1: in place of the lip's bead
 * chain, irregular dots of varied size): 150 dots of 2–9 px inside the blue below the foam mass, thinning with depth; each its edge
 * point, depth below the cap's inner edge and radius.
 */
export const FOAM_DOTS: readonly { i: number; d: number; r: number }[] = (() => {
  const out: { i: number; d: number; r: number }[] = [];
  for (let k = 0; k < 150; k++) {
    const i = Math.round(lerp(CAP.from + 6, CAP.to + 4, hash(k, 931)));
    const d = 6 + 120 * hash(k, 932) ** 1.8;
    const r = 2 + 7 * hash(k, 933) ** 2.2 * (1 - 0.5 * d / 126);
    out.push({ i: Math.min(EDGE.length - 1, i), d, r });
  }
  return out;
})();

/**
 * The lip's share of the crash (11.1), 0 … 1 and smooth everywhere (round 2: no break): 0 for the body (the back, the crest's top, the
 * face, the trough), rising over the hinge round LIP_CUT (by bearing round the first arc's centre) to 1 for the lip; falling again under
 * the hollow (45° → 100°) and below the lip (y 760 → 860), so the trough and the water in front of the face never move with it.
 */
export function lipWeight(p: XY): number {
  const a = (Math.atan2(p[1] - C1[1], p[0] - C1[0]) * 180) / Math.PI;
  const along = a < 45 ? smoothstep(CUT_DEG - LIP_HINGE[0], CUT_DEG + LIP_HINGE[1], a) : 1 - smoothstep(45, 100, a);
  return along * (1 - smoothstep(760, 860, p[1]));
}
/** The hinge's middle bearing round the first arc's centre (degrees). */
const CUT_DEG = -90 + 90 * LIP_CUT;
/** How far the hinge reaches behind and ahead of it (degrees): ≈ 230 px of the curl, so the bend is a curve, never a fold. */
export const LIP_HINGE = [22, 14] as const;

// ——— The front wave (D1: "a second, smaller wave in front"; D2: in the lower centre, rising to a peak that echoes the mountain) ———————

/** Its curl: three golden quarter arcs from its crest top (560, 738). */
export const FRONT_CURL: readonly CurlArc[] = goldenCurl([560, 876], 138, 3);
/** Where the front wave's water ends (as WATER_END: past it, foam). */
export const FRONT_END = 1.5;
export const frontThickness = (s: number): number => 76 * (1 - clamp(s / FRONT_END) ** 1.6) ** 0.8 + 2;
const FRONT_BACK: readonly XY[] = cubic([-200, 1240], [180, 1080], [330, 760], [560, 738], 70);
const FRONT_ROOT: readonly XY[] = Array.from({ length: 7 }, (_, i) => {
  const r = FRONT_CURL[0].r - frontThickness(0);
  const t = (lerp(-90, -150, i / 6) * Math.PI) / 180;
  return [FRONT_CURL[0].cx + r * Math.cos(t), FRONT_CURL[0].cy + r * Math.sin(t)] as XY;
});
export const FRONT_FACE: readonly XY[] = cubic(FRONT_ROOT[6], [FRONT_ROOT[6][0] - 20, FRONT_ROOT[6][1] + 90], [530, 1060], [600, 1240], 18);
const frontRun = (s0: number, s1: number, inset: (s: number) => number): XY[] => {
  const n = 60;
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = lerp(s0, s1, i / n);
    return arcPoint(FRONT_CURL, s, inset(s));
  });
};
/** The front wave's water (one simple polygon, as WATER). */
export const FRONT_WATER: readonly XY[] = [...FRONT_BACK, ...frontRun(0, FRONT_END, () => 0).slice(1), ...frontRun(FRONT_END, 0, frontThickness).slice(1), ...FRONT_ROOT.slice(1), ...FRONT_FACE.slice(1), [600, 1800], [-200, 1800]];
const FRONT_HOLLOW: readonly XY[] = [...frontRun(FRONT_END, 0, frontThickness), ...FRONT_ROOT.slice(1), ...FRONT_FACE.slice(1), [-400, 1260]];
export const FRONT_EDGE: readonly EdgePoint[] = edgeOf(FRONT_BACK.filter((p) => p[0] > -200), FRONT_CURL, frontThickness, FRONT_HOLLOW, 260, FRONT_END);
export const FRONT_FOAM: readonly FoamLine[] = [16, 34, 56, 84].map((d) => lineOf(FRONT_EDGE, d, 5));
export const FRONT_CLAW_ROWS: readonly ClawRow[] = [
  { s0: 0.04, s1: 1.4, n: 10, inset: 14, len: [56, 26], width: 16, lean: 0.85, fill: 'foam', level: 1, seed: 600, hook: 0.9, form: 'finger' },
  { s0: 0.1, s1: 1.52, n: 13, inset: 6, len: [78, 32], width: 22, lean: 0.7, fill: 'foam', level: 1, seed: 700, hook: 0.85, form: 'finger' },
];
export function frontClaws(curl = 1): { claw: Claw; row: ClawRow }[] {
  return FRONT_CLAW_ROWS.flatMap((r) => Array.from({ length: r.n }, (_, i) => ({ claw: rowClaw(FRONT_CURL, r, i, curl), row: r })));
}
/** Is the point inside the polygon (even-odd)? */
export function inside(poly: readonly XY[], p: XY): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

// ——— The sea: the horizon, the far swells, the crested mounds ——————————————————————————————————————————————————————————————————

/** The horizon (D2: low, as in the print), where the far swells ride and the mountain stands. */
export const HORIZON = 790;

/** The far swells: little curled waves along the horizon (left in the hollow and right of the mountain), each a hump with a foam cap. */
export type Swell = { x: number; w: number; h: number };
export const SWELLS: readonly Swell[] = [
  ...Array.from({ length: 3 }, (_, i) => ({ x: 640 + i * 80 + 20 * hash(i, 4), w: 70 + 20 * hash(i, 6), h: 10 + 8 * hash(i, 7) })),
  ...Array.from({ length: 9 }, (_, i) => ({ x: 1150 + i * 120 + 30 * hash(i, 5), w: 100 + 40 * hash(i, 6), h: 14 + 14 * hash(i, 7) })),
];
/** A swell's outline (a hump curling right), as a polygon closed along its base. */
export function swellOutline(s: Swell, y0: number): XY[] {
  const pts: XY[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const h = s.h * Math.sin(Math.PI * u ** 0.8) * (1 + 0.25 * Math.sin(Math.PI * u * 2));
    pts.push([s.x + (u - 0.5) * s.w, y0 - h]);
  }
  // Its base a shallow belly under the horizon (round 2: not a straight cut).
  const base: XY[] = Array.from({ length: 9 }, (_, j) => {
    const u = 1 - j / 8;
    return [s.x + (u - 0.5) * s.w, y0 + 7 * Math.sin(Math.PI * u) ** 0.8] as XY;
  });
  return [...pts, ...base.slice(1, -1)];
}

/**
 * A crested mound of the turbulent sea (D2: "the lower third is a field of rolling mounds, each with its own white foam crest and claws,
 * overlapping in depth; more crested waves on the right edge"): crest at (x, y), `hw` px each side, `h` px tall, its front (right) steeper;
 * parallax `k`. They are listed back to front; `z` places them among the boats (drawn after the boats whose index is below it); the
 * `front` ones roll in front of the great wave's trough (drawn with the wave).
 */
export type Mound = { x: number; y: number; hw: number; h: number; k: number; seed: number; z: number; front?: boolean };
export const MOUNDS: readonly Mound[] = [
  { x: 1380, y: 818, hw: 250, h: 36, k: 0.52, seed: 1, z: 0 },
  { x: 1840, y: 806, hw: 230, h: 44, k: 0.52, seed: 2, z: 0 },
  { x: 1110, y: 872, hw: 280, h: 48, k: 0.6, seed: 3, z: 1 },
  { x: 1560, y: 880, hw: 300, h: 56, k: 0.62, seed: 4, z: 2 },
  { x: 2000, y: 868, hw: 230, h: 66, k: 0.66, seed: 5, z: 3 },
  { x: 1280, y: 960, hw: 360, h: 70, k: 0.8, seed: 6, z: 3, front: true },
  { x: 1860, y: 986, hw: 300, h: 84, k: 0.86, seed: 7, z: 3 },
  { x: 860, y: 1016, hw: 320, h: 64, k: 0.9, seed: 8, z: 3, front: true },
];
/** A mound's top edge, left to right (its crest a little right of centre, the front steeper). */
export function moundTop(m: Mound): XY[] {
  const n = 36;
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = -1 + (2 * i) / n;
    const c = 0.18;
    const z = (u - c) / (u > c ? 0.42 : 0.62);
    const ripple = 0.06 * Math.sin(u * 7 + m.seed);
    return [m.x + u * m.hw, m.y + m.h * (1 - Math.exp(-z * z) * (1 + ripple))] as XY;
  });
}
/** A mound's polygon: its top and down below the frame. */
export const moundPoly = (m: Mound): XY[] => {
  const top = moundTop(m);
  return [...top, [m.x + m.hw, 1320], [m.x - m.hw, 1320]];
};

// ——— The boats, the mountain ——————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * Defender's three boats (the box's red fragments, design §4.8; T09, round 1: oshiokuri-bune — long, slim crescent hulls with a raised
 * bow, half hidden in the troughs): centre, length, hull depth, rest tilt (degrees, + = bow up; the bow points left, at the wave),
 * rowers, parallax. The lead boat rides a mound on the right (his prow, 11.2&), the middle one sits under the lip (the crash lands on
 * it), the far one behind them.
 */
export type Boat = { x: number; y: number; len: number; h: number; tilt: number; rowers: number; k: number };
export const BOATS: readonly Boat[] = [
  { x: 1950, y: 772, len: 600, h: 36, tilt: 7, rowers: 3, k: 0.7 },
  { x: 1300, y: 846, len: 470, h: 32, tilt: -3, rowers: 3, k: 0.62 },
  { x: 1560, y: 806, len: 400, h: 28, tilt: 4, rowers: 2, k: 0.55 },
];
/** How high the bow rises above the gunwale's line (px), as a share of the length. */
const BOW_RISE = 0.11;
/** A point of a hull's centreline at t ∈ [0, 1] (bow → stern) and its half-depth, in the boat's own frame (x along, y down). */
function hullAt(b: Boat, t: number): { x: number; y: number; half: number } {
  const x = -b.len / 2 + b.len * t;
  const rise = b.len * BOW_RISE * Math.max(0, 1 - t / 0.3) ** 2;
  const half = (b.h / 2) * Math.sin(Math.PI * clamp(t)) ** 0.42;
  return { x, y: -rise + 0.04 * b.len * (t - 0.55) ** 2, half };
}
/** The hull's outline at bob angle `tilt` (degrees) and offset (dx, dy): the gunwale from the bow tip to the stern, the keel back. */
export function hullOutline(b: Boat, tilt: number, dx = 0, dy = 0): XY[] {
  // + tilt raises the bow (the left end): a clockwise turn on screen (y down).
  const a = (-tilt * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pt = (x: number, y: number): XY => [b.x + dx + x * c + y * s, b.y + dy - x * s + y * c];
  const n = 24;
  const top: XY[] = [];
  const keel: XY[] = [];
  for (let i = 0; i <= n; i++) {
    const h = hullAt(b, i / n);
    top.push(pt(h.x, h.y - h.half * 1.05));
    keel.push(pt(h.x, h.y + h.half * 0.95));
  }
  return [...top, ...keel.slice(1, -1).reverse()];
}
/** The gunwale: the top edge, bow to stern (the rowers sit along it, the dark band follows it). */
export const gunwaleOf = (b: Boat, tilt: number, dx = 0, dy = 0): XY[] => hullOutline(b, tilt, dx, dy).slice(0, 25);
/** The prow's tip (the bow's raised point) at bob angle `tilt`. */
export const prowOf = (b: Boat, tilt: number, dx = 0, dy = 0): XY => hullOutline(b, tilt, dx, dy)[0];

/**
 * THE SMALL KAOMOJI MOUNTAIN (sheet §4.3; D2: small and low in the centre, framed inside the hollow under the lip,
 * with a darker grey-blue band of sky behind it): a cone of seven rows of tiny (•ω•) (row k has k + 1 faces, edge to edge), its base on
 * the horizon at (900, 790), ≈ 262 × 156 px; Prussian below, snow on the top two rows whose lower edge is a row of ω; one amber • on the
 * peak. The lip's fingers hang down and right, past it (no claw ever reaches it: tests/drop2Wave.test.ts); the crash throws the lip
 * forward onto the boats, so it stands untouched.
 */
export const MOUNTAIN = { x: 900, base: HORIZON, width: 262, height: 156, rows: 7, snowRows: 2 } as const;
export type MountainFace = { x: number; y: number; row: number };
export const MOUNTAIN_FACES: readonly MountainFace[] = (() => {
  const out: MountainFace[] = [];
  const rowH = MOUNTAIN.height / MOUNTAIN.rows;
  const faceW = MOUNTAIN.width / (MOUNTAIN.rows + 1);
  for (let r = 1; r <= MOUNTAIN.rows; r++) {
    const n = r + 1;
    const y = MOUNTAIN.base - MOUNTAIN.height + (r - 0.5) * rowH;
    for (let k = 0; k < n; k++) out.push({ x: MOUNTAIN.x + (k - (n - 1) / 2) * faceW, y, row: r });
  }
  return out;
})();
/** The mountain's silhouette: concave flanks from the base corners up to a small flat summit. */
export const MOUNTAIN_SHAPE: readonly XY[] = (() => {
  const { x, base, width, height } = MOUNTAIN;
  const top = base - height - 8;
  const half = width / 2 + 22;
  const left = cubic([x - half, base + 4], [x - half * 0.45, base - height * 0.32], [x - half * 0.2, top + 10], [x - 16, top], 16);
  const right = cubic([x + 16, top], [x + half * 0.2, top + 10], [x + half * 0.45, base - height * 0.32], [x + half, base + 4], 16);
  return [...left, ...right.slice(1)];
})();
/** The snow cap: the silhouette above the snowline, its lower edge scalloped as a row of ω (his mouth, Hokusai's jagged cap). */
export const SNOWLINE = MOUNTAIN.base - MOUNTAIN.height + (MOUNTAIN.snowRows * MOUNTAIN.height) / MOUNTAIN.rows + 4;
export const SNOW_CAP: readonly XY[] = (() => {
  const top = MOUNTAIN_SHAPE.filter((p) => p[1] <= SNOWLINE);
  const l = top[0];
  const r = top[top.length - 1];
  const scallops: XY[] = [];
  const n = 5;
  for (let i = 0; i <= n * 6; i++) {
    const u = i / (n * 6);
    const x = lerp(r[0], l[0], u);
    const phase = (u * n) % 1;
    scallops.push([x, SNOWLINE + 9 * Math.sin(Math.PI * phase) ** 0.7]);
  }
  return [...top, ...scallops];
})();

/** Sumi keyline width along a line (6–12 px, noise-modulated: the knife's pressure), at arc length u. */
export const keyWidth = (u: number, seed: number, base = 9, swing = 3): number => base + swing * noise1(u / 90, seed);

// S32B BULLET TIME, drop2 19.4&–20.4& (builder B; build sheet notes/bid2/drop2-sheet2.md §3 drop2 19.4&–20.4&, §4.16, §5 #30–#31,
// from the design notes/extend/drop2-final.md §4.16): the program is frozen, the camera isn't. THE FRAME — the crash's frozen field,
// sorted into hue rings round his (×ω×) — lifts into depth ring band by ring band (the pink outer rings at the back, the bright inner
// rings forward, the indigo clearing a dark well round him at z 0), and a 360° orbit with a shallow depth of field circles him: past a
// crown of glass droplets (the frozen splash, in S07's glass, tinted the cocktail's pink) and the frozen guest with his reticle hat, side-on
// to a stack of glyph discs, behind him through the tunnel of rings, and round again; the depth lands in 8 plates, outer first, and the
// built drain resumes front-on. Under it a music box and two heartbeats; every one of them lights something.
//
// Front-on nothing changes: every cell is a billboard, scaled by its depth so the front view is THE FRAME, and the crown and the guest are
// revealed by the angle alone. The content clock is the crash's, held (src/score/drop2.ts crashClock); the rings of light keep leaving
// him every 6 frames and the glints keep twinkling, both landing in phase with the built drain on drop2 20.4&.
//
// Round 1, R3 (2026-10-02): the near half of a band dissolves before the lens blows it up (BOKEH: side-on the pink outer bands had piled
// into a magenta slab 300–450 px wide at the frame's edge); his card lags the orbit by up to 35° (cardTurn), so it is a thing in the
// rings, not a sticker on the lens; and the heartbeats land in the picture (SEEN, THUMP, BEAT_LIGHT, GLOW: on 20.3 they had read as
// nothing over the orbit). Front-on — the bullet time's first frame and its last — it is unchanged to the byte.
//
// Pure: Node tests import it (tests/drop2Bullet.test.ts). src/scenes/drop2Bullet.ts copies it to the GPU. World units: 1 = 1 layout px on
// the z = 0 plane (the flat world: centred, y up), as the crash shot's camera frames it.
import { RAMP } from '../actors/asciiFace.ts';
import type { Pose, Vec3 } from '../engine/camera.ts';
import { fillDistance } from '../engine/camera.ts';
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Look } from '../engine/types.ts';
import { BULLET, CROWN_TINGS, DEPTH_LIFT, DRAIN, HEARTBEATS, MUSIC_BOX, ORBIT, PLATES, RINGS } from '../score/drop2.ts';
import { GLINTS, RING, type Slot, crashHero, crashLook, driftZoom, glintAt, glowAt, ringGainAt, ringInkAt, whiteAt } from './drop2Crash.ts';
import { CLEARING, type Capsule, type FieldCell, type OverloadLayout, X, Y, capsuleDistance, capsuleOf, clearing } from './drop2Overload.ts';
import { LAW, T7_GRID, drop2Segment, t7CellCentre } from './drop2Shared.ts';
import { FOV, FRONT } from './swiss.ts';

const DEG = Math.PI / 180;
const TAU = 2 * Math.PI;

// ——— Time ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** THE FRAME's instant on the crash clock: what the program shows the whole time (src/score/drop2.ts crashClock holds it there). */
export const HELD = BULLET.from - 1;
/** From here (the bullet time's last half frame, θ within 0.01° of front-on, flat) its sub-frames are the built drain's, drawn by it. */
export const HAND_BACK = DRAIN.from - 0.5;
/**
 * The orbit as the picture flies it: the score's (ORBIT: θ = 360° · (1 − cos πu) / 2 from 19.4 + 6 to 20.4&, peaking at 5.54°/f, 180° behind
 * him on 20.2 + 9) eased in from rest over the bullet time's first beat. ORBIT leaves inside THE FRAME's hold, but that hold is carried
 * byte-identical (it is v04's), so the picture's camera leaves on 19.4&, from rest (THE FRAME → bullet time is seamless), and from 20.1&
 * it IS the score's orbit — so the music's whoosh, panned by the score's θ, flies with it. Lands front-on, at rest, on 20.4&.
 */
export const SWING = { from: BULLET.from, to: DRAIN.from, ease: 24 } as const;
/** The score's θ (degrees) at `f`. */
export const scoreDegrees = (f: number): number => (360 * (1 - Math.cos((Math.PI * clamp((f - ORBIT.from) / (ORBIT.to - ORBIT.from))) ))) / 2;
/** θ in degrees at instant `f` (0 front-on, 180 behind him, 360 front-on again; the camera swings to his right first). */
export function orbitDegrees(f: number): number {
  if (f <= SWING.from) return 0;
  if (f >= SWING.to) return 360;
  return scoreDegrees(f) * smoothstep(SWING.from, SWING.from + SWING.ease, f);
}
export const orbitAngle = (f: number): number => orbitDegrees(f) * DEG;

// ——— The camera ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The crash shot's drift on THE FRAME (held): the front view's zoom, and so its distance. */
export const ZOOM = driftZoom(HELD);
/** The front camera's distance: the crash pose's (FRONT / zoom, FOV 20). Cells are scaled by their depth against it. */
export const D_REF = FRONT / ZOOM;
/**
 * The lens: front-on the crash pose's (FOV 20); swinging round it dollies in and widens (a Vertigo move, the z = 0 plane framed the same)
 * to 34° behind him, so the depth reads; the camera rises a little mid-turn and looks down on him. The aperture opens with the depth
 * (19.4& → 20.1) and closes with the plates (20.4 → 20.4& − 1), focused on his face.
 */
export const LENS = { fov: FOV, wide: 34, lift: 0.07, aperture: 30 } as const;
export const fovAt = (f: number): number => LENS.fov + (LENS.wide - LENS.fov) * Math.sin(orbitAngle(f) / 2) ** 2;
/** The camera's distance from his face at `f`: the distance that frames the z = 0 plane as the crash pose does, at that field of view. */
export const distanceAt = (f: number): number => fillDistance(1080, fovAt(f)) / ZOOM;
/** The aperture's radius (world units at the lens) at instant `f`. */
export function apertureAt(f: number): number {
  const open = clamp((f - DEPTH_LIFT.from) / (DEPTH_LIFT.to - DEPTH_LIFT.from));
  const close = clamp((f - PLATES.from) / (DRAIN.from - 1 - PLATES.from));
  return LENS.aperture * smoothstep(0, 1, open) * (1 - smoothstep(0, 1, close));
}

export type Basis = { right: Vec3; up: Vec3; forward: Vec3 };
/** The orbit's camera: its pose (the eye moved across the aperture), its basis (unmoved), θ, its field of view, the aperture's radius and the focus distance (his face, from the unmoved eye). */
export type BulletCamera = { pose: Pose; basis: Basis; theta: number; fov: number; aperture: number; focus: number };
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

/** The camera's basis looking from `eye` at `target` with world up (0, 1, 0). */
export function basisOf(eye: Vec3, target: Vec3): Basis {
  const forward = unit(sub(target, eye));
  const right = unit(cross(forward, [0, 1, 0]));
  return { right, up: cross(right, forward), forward };
}

/**
 * The orbit's camera at instant `f`: round the vertical axis through his face at distanceAt(f), raised 7 % of it mid-turn, aimed at his
 * face; `lens` (the unit disc) moves the eye across the aperture, still aimed at him (the depth of field). Front-on and at rest it is the
 * crash pose exactly (position (0, 0, FRONT / zoom), FOV 20).
 */
export function bulletCamera(f: number, lens: readonly [number, number] = [0, 0]): BulletCamera {
  const theta = orbitAngle(f);
  const d = distanceAt(f);
  const u = clamp((f - SWING.from) / (SWING.to - SWING.from));
  const lift = LENS.lift * d * Math.sin(Math.PI * u);
  const target: Vec3 = [0, 0, 0];
  let eye: Vec3 = [d * Math.sin(theta), lift, d * Math.cos(theta)];
  const focus = Math.hypot(eye[0], eye[1], eye[2]);
  const basis = basisOf(eye, target);
  const a = apertureAt(f);
  if (a > 0 && (lens[0] !== 0 || lens[1] !== 0)) eye = add(eye, add(mul(basis.right, a * lens[0]), mul(basis.up, a * lens[1])));
  const fov = thumpFov(fovAt(f), thumpAt(f));
  return { pose: { position: eye, target, up: [0, 1, 0], fov }, basis, theta, fov, aperture: a, focus };
}

/**
 * How strongly each heartbeat (HEARTBEATS) shows in the picture. The design weighed them by the mix — the second, 6 dB down, at half — but
 * on 20.3 that half did not read over the orbit (R3, 2026-10-02: check-sync 'none', Δ 21.8 against the orbit's 28.8). The picture keeps
 * the second a little weaker (his heart failing) but lands it.
 */
export const SEEN: readonly number[] = [1, 0.85];
/**
 * The heartbeats' pulse at `f` (0 … 1): each lub at its weight (SEEN), its dub `dub` of it; whole on its frame (every sub-frame of it),
 * then decaying over `decay` frames, gone `span` frames after it.
 */
export function beatPulse(f: number, decay: number, span: number, dub = 0.6): number {
  let p = 0;
  HEARTBEATS.forEach((h, i) => {
    for (const [at, w] of [[h.at, 1], [h.dub, dub]] as const) {
      const t = f - at;
      if (t >= -0.5 && t < span) p = Math.max(p, SEEN[i] * w * Math.exp(-Math.max(0, t) / decay));
    }
  });
  return p;
}
/**
 * The heartbeats in the camera (R3): on each lub the lens punches in THUMP.zoom (the dub 60 % of it) and lets go over a few frames — the
 * camera feels his heart. Never on a front-on frame: nothing before the first lub, settled long before the plates.
 */
export const THUMP = { zoom: 0.035, decay: 2.5, span: 12 } as const;
export const thumpAt = (f: number): number => beatPulse(f, THUMP.decay, THUMP.span);
/** The field of view `fov` (degrees) punched in by the thump `p` (0 none … 1 a whole lub): the picture THUMP.zoom × p bigger about its centre. */
export const thumpFov = (fov: number, p: number): number => (p > 0 ? (2 * Math.atan(Math.tan((fov * DEG) / 2) / (1 + THUMP.zoom * p))) / DEG : fov);

/** Sub-frames: 64 on a 90° shutter — the lens's samples, and short streaks, so the frozen type stays crisp in focus while the world turns. */
export const BULLET_TEMPORAL: Temporal = { samples: 64, shutter: 0.25, persistence: 0 };
/** The bullet time's sub-frames at output frame `f` (outside its span, which it never draws, the crash shot's 180°). */
export const bulletTemporal = (f: number): Temporal => (f >= SWING.from && f < SWING.to ? BULLET_TEMPORAL : { ...BULLET_TEMPORAL, shutter: 0.5 });
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
/** Point `k` of an `n`-point Vogel (sunflower) disc of radius 1. */
export const vogel = (k: number, n: number): [number, number] => {
  const r = Math.sqrt((k + 0.5) / n);
  return [r * Math.cos(k * GOLDEN), r * Math.sin(k * GOLDEN)];
};
/** The lens point (unit disc) of sub-frame instant `f`: its output frame's i-th sample sits at Vogel point 37·i mod n (decorrelated from time). */
export function lensPoint(f: number): [number, number] {
  const out = Math.round(f);
  const t = bulletTemporal(out);
  const open = out - t.shutter / 2;
  const i = Math.min(t.samples - 1, Math.max(0, Math.round(((f - open) / t.shutter) * t.samples - 0.5)));
  return vogel((37 * i) % t.samples, t.samples);
}
export const bulletSegment = (f: number): Segment => drop2Segment(f);

// ——— Depth: the rings lift into a funnel and land in 8 plates ——————————————————————————————————————————————————————————————————

/** The frozen rings in 8 bands, inner (0) to outer (7), each a flat disc of glyphs 64 px behind the one inside it. */
export const PLATE_BANDS = 8;
export const Z_STEP = 64;
/** Band `k` lifts to its depth after k × 3/7 frames, each over 9 frames (fast out, settling): all lifted by 20.1. */
export const LIFT = { stagger: 3 / 7, frames: 9 } as const;
/** Band `k` lands on frame PLATES.from + 7 − k (outer first, one a frame): falling over 6 frames, faster and faster, with a 5 % bounce. */
export const LAND = { fall: 6, bounce: 0.05, settle: 4 } as const;
export const plateAt = (k: number): number => PLATES.from + (PLATE_BANDS - 1 - k);
/** How far band `k` has lifted at `f` (0 flat … 1 at its depth). */
export function bandDepth(f: number, k: number): number {
  const u = clamp((f - (DEPTH_LIFT.from + k * LIFT.stagger)) / LIFT.frames);
  const lift = 1 - (1 - u) ** 3;
  const at = plateAt(k);
  if (f >= at) {
    const t = f - at;
    return t < LAND.settle ? lift * LAND.bounce * Math.sin((Math.PI * t) / LAND.settle) : 0;
  }
  const v = clamp((f - (at - LAND.fall)) / LAND.fall);
  return lift * (1 - v * v * v);
}
/** Band `k`'s z at `f` (behind him: negative). */
export const bandZ = (f: number, k: number): number => -k * Z_STEP * bandDepth(f, k);
/** A thing at depth z is drawn this much bigger and further out, so the front camera sees it where (and as big as) it was on the frame. */
export const compensation = (z: number): number => (D_REF - z) / D_REF;
/** Where the front camera's z = 0 point (x, y) is when it is pushed to depth z: on the same line of sight. */
export const atDepth = (x: number, y: number, z: number): Vec3 => {
  const s = compensation(z);
  return [x * s, y * s, z];
};

// ——— The living hold: rings of light every 6 frames, two heartbeats, the music box, the glints ——————————————————————————————————————

/**
 * The rings of light keep leaving him every 6 frames (RINGS's beat): a living hold, ±8 % (the design's), but every sound of the bullet time
 * launches a bright one — the heartbeats' lub and dub (the second heartbeat's at half), the music box's notes — and the two the plates land
 * on (20.4, 20.4 + 6) are the built ones' 40 %, so on 20.4& the built drain's two rings are exactly these two.
 */
export const PULSE = 6;
export const PULSE_GAIN = { hold: 0.08, lub: 0.3, dub: 0.18, note: 0.22, built: RING.gain } as const;
export function waveGain(w: number): number {
  if (RINGS.includes(w) || w >= PLATES.from) return PULSE_GAIN.built;
  for (const h of HEARTBEATS) {
    const k = 10 ** ((h.db + 18) / 20);
    if (w === h.at) return PULSE_GAIN.lub * k;
    if (w === h.dub) return PULSE_GAIN.dub * k;
  }
  if (MUSIC_BOX.some((n) => n.at === w)) return PULSE_GAIN.note;
  return PULSE_GAIN.hold;
}
export type Pulses = { at: number[]; gain: number[] };
export function pulsesAt(f: number): Pulses {
  const at: number[] = [];
  for (let w = RINGS[0]; w <= f; w += PULSE) at.push(w);
  return { at, gain: at.map(waveGain) };
}
/**
 * The heartbeats (HEARTBEATS, lub-dub): the rings swell +8 % on the first lub (−18 dBFS), +4 % on the second (−24), the dub 60 % of its
 * lub — weighed by the mix, as the rings of light they launch are; the accents that land the beat in the picture are SEEN's.
 */
export function heartbeat(f: number): number {
  let g = 1;
  for (const h of HEARTBEATS) {
    const amp = 0.08 * 10 ** ((h.db + 18) / 20);
    for (const [at, k] of [[h.at, 1], [h.dub, 0.6]] as const) {
      const t = f - at;
      if (t >= 0) g += amp * k * Math.exp(-t / 5) * clamp(t + 1);
    }
  }
  return g;
}
/**
 * The glints twinkle on a clock a little faster than the film's (2 frames more over the bullet time), so where it hands back to the built
 * drain (handsBack: 20.4& − ½) their phase is the drain's: seven twinkles of 14 frames where the film runs 96.5.
 */
export const glintClock = (f: number): number => HELD + ((f - HELD) * (HAND_BACK - HELD + 2)) / (HAND_BACK - HELD);
/** On each note of the music box (MUSIC_BOX) the glints flare to full and die away over about 8 frames. */
export function flare(f: number): number {
  let g = 0;
  for (const n of MUSIC_BOX) {
    const t = f - n.at;
    if (t >= 0) g = Math.max(g, Math.exp(-t / 3.5) * clamp(t + 1));
  }
  return g;
}

// ——— What shows by the angle ———————————————————————————————————————————————————————————————————————————————————————————————————

/** The crown and the guest: invisible front-on (THE FRAME and the drain as built), revealed between 8° and 30° off the front. */
export const revealAlpha = (theta: number): number => {
  const deg = (((theta / DEG) % 360) + 360) % 360;
  return smoothstep(8, 30, Math.min(deg, 360 - deg));
};
/** Edge-on a disc of glyphs piles its cells into a line: their light is thinned as its face turns away (to a quarter, side-on). */
export const EDGE = 0.25;
export const edgeAlpha = (theta: number): number => EDGE + (1 - EDGE) * Math.abs(Math.cos(theta));

// ——— THE FRAME's cells, held ————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * A cell of THE FRAME as the bullet time carries it: its glyph, its place on the frame (flat world), its ring's distance and band, its ink
 * before the rings of light, and its fade (1 on the frame; beyond it, beyondFade).
 */
export type HeldCell = { ch: string; x: number; y: number; d: number; band: number; ink: RGB; fade: number };
/**
 * Off the frame the frozen world goes on: front-on it is out of shot, but turning reveals it, so the rings carry on past the frame's
 * edges (60 columns either side, 16 rows above and below: the void stays out of the orbit's view but at grazing angles) — each cell the
 * colour, glow and band of the ring at its distance from him, further out the outermost ring's pink, dimming.
 */
export const BEYOND = { cols: 60, rows: 16, fade: [0.25, 1] as const } as const;
/**
 * How much of its light a cell beyond the frame keeps, `over` the way from the frame's edge to the border (the larger of its column and row
 * overshoot over BEYOND's): whole for the first quarter, then falling smoothly to nothing at the border, so turned or side-on the frozen
 * world thins into the sky of type and no edge of it ever shows (the stills of 2026-10-02 had a hard magenta wall at 20.1& and 20.3).
 */
export const beyondFade = (over: number): number => 1 - smoothstep(BEYOND.fade[0], BEYOND.fade[1], over);
/**
 * Near the lens a cell fades out (its depth along the view, world units): side-on the plates run up to the camera, and their nearest cells,
 * each a blurred billboard hundreds of px across, piled into a wall. Front-on every cell is ~3000 away, so THE FRAME is untouched.
 */
export const NEAR = { from: 300, to: 1100 } as const;
export const nearFade = (depth: number): number => smoothstep(NEAR.from, NEAR.to, depth);
/** The lens's blur of a point `depth` from it, seen by `cam`: the aperture's circle of confusion focused on his face, in px of the 1080p frame. */
export const blurPx = (cam: BulletCamera, depth: number): number =>
  cam.aperture > 0 ? (2 * cam.aperture * 540 * Math.abs(1 / depth - 1 / cam.focus)) / Math.tan((cam.pose.fov * DEG) / 2) : 0;
/**
 * The bokeh's limit (R3, 2026-10-02): side-on the camera stands inside the stack of plates, and the near half of the outer bands ran past
 * the lens, each cell blown up by the depth of field into a soft disc 150–270 px across — piled edge-on, a magenta slab 300–450 px wide at
 * the frame's edge (stills 20.1& + 6, 20.3). A cell blurred wider than `from` px fades, and none blurred past `to` is drawn, so the near
 * half of a band dissolves before it reaches the lens and the rings stay a tunnel round him. The two outer bands (the pink, the ones that
 * walled the frame) go sooner (BOKEH.outer); the inner ones keep their soft foreground (BOKEH.inner). Behind the focus a cell of the frozen
 * world is never blurred past ≈ 35 px (it ends 2500 behind him; even at infinity the blur is 2 × the aperture × the zoom, ≈ 61 px), so only
 * the near half is touched; front-on (the aperture shut) nothing is.
 */
export const BOKEH = { inner: { from: 64, to: 140 }, outer: { from: 40, to: 80 } } as const;
export const bokehFade = (blur: number, band: number): number => {
  const b = band >= PLATE_BANDS - 2 ? BOKEH.outer : BOKEH.inner;
  return 1 - smoothstep(b.from, b.to, blur);
};
const WHITE: RGB = [1, 1, 1];
const held = new WeakMap<readonly Slot[], HeldCell[]>();
/**
 * THE FRAME's type (crashGlyphs at HELD, every cell home in its slot): his own cells are the hero group's; a cell keeps its glyph, its ring's
 * colour (drifted to HELD), its pale rim and its glow; the band is its ring's place in the order (inner 0 … outer 7). Cached per plan.
 */
export function heldCells(field: readonly FieldCell[], plan: readonly Slot[]): HeldCell[] {
  const hit = held.get(plan);
  if (hit) return hit;
  const m = clearing(field);
  const cap = capsuleOf(field);
  const n = plan.reduce((k, s) => (s.rank === undefined ? k : k + 1), 0);
  const out: HeldCell[] = [];
  field.forEach((cell, k) => {
    if (cell.i <= 0 || cell.hero) return;
    const s = plan[k];
    const [x, y] = t7CellCentre(field[s.to].col, field[s.to].row);
    const d = capsuleDistance(x, y, cap);
    const ink = scaleRGB(mixRGB(ringInkAt(plan, k, HELD), WHITE, whiteAt(d)), glowAt(d) * lerp(1, CLEARING, m[s.to]));
    const band = s.rank === undefined || n === 0 ? 0 : Math.min(PLATE_BANDS - 1, Math.floor((PLATE_BANDS * s.rank) / n));
    out.push({ ch: RAMP[cell.i], x: X(x), y: Y(y), d, band, ink, fade: 1 });
  });
  // The world beyond the frame: each cell takes the ring at its distance (the nearest frame cell's by d); past the outermost, its pink.
  const byD = [...out].sort((a, b) => a.d - b.d);
  const far = byD[byD.length - 1];
  const nearest = (d: number): HeldCell => {
    let lo = 0;
    let hi = byD.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (byD[mid].d < d) lo = mid + 1;
      else hi = mid;
    }
    return byD[lo];
  };
  const [c0, c1] = [T7_GRID.cols[0], T7_GRID.cols[1]];
  const [r0, r1] = [T7_GRID.rows[0], T7_GRID.rows[1]];
  for (let row = r0 - BEYOND.rows; row <= r1 + BEYOND.rows; row++) {
    for (let col = c0 - BEYOND.cols; col <= c1 + BEYOND.cols; col++) {
      if (row >= r0 && row <= r1 && col >= c0 && col <= c1) continue;
      const [x, y] = t7CellCentre(col, row);
      const d = capsuleDistance(x, y, cap);
      const twin = d >= far.d ? far : nearest(d);
      const ink = d > far.d ? scaleRGB(far.ink, glowAt(d) / glowAt(far.d)) : twin.ink;
      const over = Math.max(Math.max(c0 - col, col - c1, 0) / BEYOND.cols, Math.max(r0 - row, row - r1, 0) / BEYOND.rows);
      out.push({ ch: RAMP[9], x: X(x), y: Y(y), d, band: d > far.d ? PLATE_BANDS - 1 : twin.band, ink, fade: beyondFade(over) });
    }
  }
  held.set(plan, out);
  return out;
}
/** The frame cells (not the world beyond it) of a held field: the first `count` of heldCells. */
export const frameCellCount = (field: readonly FieldCell[]): number => field.filter((c) => c.i > 0 && !c.hero).length;
/** A cell at instant `f`: where it is in depth, its size and its light (the rings of light, the heartbeat, its disc turning edge-on). */
export function cellGlyph(c: HeldCell, f: number, theta: number, pulses: Pulses, beat: number): Glyph {
  const z = bandZ(f, c.band);
  const [x, y] = atDepth(c.x, c.y, z);
  const light = ringGainAt(f, c.d, pulses.at, pulses.gain) * beat * edgeAlpha(theta) * c.fade;
  return { ch: c.ch, x, y, z, size: T7_GRID.fontPx * compensation(z), color: scaleRGB(c.ink, light) };
}
/** Whether a thing `size` across at world point p is in the camera's view (with a margin): what is not, is not drawn. */
export function inView(cam: BulletCamera, p: Vec3, size: number, aspect = 16 / 9): boolean {
  const v = sub(p, cam.pose.position);
  const z = dot(v, cam.basis.forward);
  if (z < 10) return false;
  const t = Math.tan((cam.pose.fov * DEG) / 2) * 1.06;
  return Math.abs(dot(v, cam.basis.up)) <= z * t + size && Math.abs(dot(v, cam.basis.right)) <= z * t * aspect + size;
}
/** The field's glyphs at instant `f` seen by `cam` into `out` (those in view, not at the lens and not blown up by the lens: faded by nearFade and bokehFade; returns the count). */
export function fieldGlyphsAt(cells: readonly HeldCell[], f: number, cam: BulletCamera, out: Glyph[]): number {
  const pulses = pulsesAt(f);
  const beat = heartbeat(f);
  let n = 0;
  for (const c of cells) {
    if (c.fade <= 0) continue;
    const z = bandZ(f, c.band);
    const s = compensation(z);
    const p: Vec3 = [c.x * s, c.y * s, z];
    const depth = viewDepth(cam, p);
    const near = nearFade(depth) * bokehFade(blurPx(cam, depth), c.band);
    if (near <= 0 || !inView(cam, p, 2 * T7_GRID.fontPx * s)) continue;
    const g = cellGlyph(c, f, cam.theta, pulses, beat);
    out[n++] = near < 1 ? { ...g, color: scaleRGB(g.color, near) } : g;
  }
  return n;
}

// ——— Groups that face the camera (his face, the guest's card): flat content stood up as one billboard ————————————————————————————

/**
 * Flat content (flat-world units about `pivot`) stood up at world point `at` as one card facing the camera (its right and up), `scale`
 * times its size, at `alpha`: each glyph and shape is itself a billboard (the scene's shader), so the group reads as the flat card it was.
 */
export function standUp(c: FlatContent, pivot: readonly [number, number], at: Vec3, basis: Basis, scale = 1, alpha = 1, narrow = 1): FlatContent {
  const place = (x: number, y: number): Vec3 => add(at, add(mul(basis.right, (x - pivot[0]) * scale), mul(basis.up, (y - pivot[1]) * scale)));
  // A card turned away from the lens (`narrow` = cos of its turn): its billboards are foreshortened across, as the card is.
  const across = (s: Shape): Partial<Shape> => (narrow === 1 ? {} : { w: s.w * scale * narrow, ...(s.r !== undefined ? { r: Math.min(s.r * scale, (s.w * scale * narrow) / 2) } : {}) });
  const shape = (s: Shape): Shape => {
    const [x, y, z] = place(s.x, s.y);
    return { ...s, x, y, z, w: s.w * scale, h: s.h * scale, ...(s.r !== undefined ? { r: s.r * scale } : {}), ...(s.soft !== undefined ? { soft: s.soft * scale } : {}), alpha: (s.alpha ?? 1) * alpha, ...across(s) };
  };
  const glyph = (g: Glyph): Glyph => {
    const [x, y, z] = place(g.x, g.y);
    return { ...g, x, y, z, size: g.size * scale, alpha: (g.alpha ?? 1) * alpha, ...(narrow === 1 ? {} : { stretch: (g.stretch ?? 1) * narrow }) };
  };
  return {
    under: c.under.map(shape),
    glyphs: Object.fromEntries(Object.entries(c.glyphs).map(([k, gs]) => [k, gs.map(glyph)])),
    over: c.over.map(shape),
  };
}
/**
 * His heart (the director's addition over the design's §4.16): on each heartbeat's lub and dub (HEARTBEATS) his frozen (×ω×) throbs — 4 %
 * bigger and 35 % brighter on the first lub, the dub 60 % of it, the second heartbeat at its weight (SEEN: R3) — the frozen program's one sign
 * of life, which the ending's lub-dub on outro 1.1 picks up. A thump: whole on its frame (every sub-frame of it), gone within 12 frames,
 * so it is long settled when the plates land and his card is THE FRAME's again.
 */
export const THROB = { scale: 0.04, light: 0.35, decay: 3.5, span: 12 } as const;
export const throbAt = (f: number): number => beatPulse(f, THROB.decay, THROB.span);
const brighten = (c: FlatContent, k: number): FlatContent => ({
  under: c.under.map((s) => ({ ...s, color: scaleRGB(s.color, k) })),
  glyphs: Object.fromEntries(Object.entries(c.glyphs).map(([n, gs]) => [n, gs.map((g) => ({ ...g, color: scaleRGB(g.color, k) }))])),
  over: c.over.map((s) => ({ ...s, color: scaleRGB(s.color, k) })),
});
/**
 * His card is a thing in the world, not a sticker on the lens (R3, 2026-10-02: at θ 90° and 270° a frontal (×ω×) sat in rings seen
 * edge-on, and the orbit read as the world turning behind a sticker). It lags the orbit, turned away from the lens by
 * TURN.max · tanh(θ / TURN.ease) — about 0.44 θ at first, easing into 35° — so side-on it is seen at an angle, its near side bigger, and it
 * swings back to face the lens from the second heartbeat (20.3) to the plates (20.4), landing on THE FRAME's front view. Foreshortened (its
 * glyphs and shapes narrowed by cos φ); from behind it still reads left to right (it never turns past 35°); front-on it is the flat card.
 */
export const TURN = { max: 35 * DEG, ease: 80 * DEG, from: SWING.from + 0.5, back: { from: HEARTBEATS[1].at, to: PLATES.from - 1 } } as const;
/**
 * His card's turn away from the lens at `f` (radians): none on the bullet time's first frame (it is THE FRAME's front view to the byte;
 * the lag takes hold from its last sub-frame, over the swing's ease, while θ is still a fraction of a degree) nor from 20.4 on.
 */
export function cardTurn(f: number): number {
  if (f <= TURN.from || f >= TURN.back.to) return 0;
  return TURN.max * Math.tanh(orbitAngle(f) / TURN.ease) * smoothstep(TURN.from, SWING.from + SWING.ease, f) * (1 - smoothstep(TURN.back.from, TURN.back.to, f));
}
/** `basis` with its right turned by `phi` about its up, away from the lens (the card's right lags the orbit: toward the camera's side of him). */
export function turnedBasis(basis: Basis, phi: number): Basis {
  const back = unit([-basis.forward[0], 0, -basis.forward[2]]);
  return { ...basis, right: add(mul(basis.right, Math.cos(phi)), mul(back, Math.sin(phi))) };
}
/**
 * On each heartbeat (lub and dub, R3) the light round him and in the crown swells BEAT_LIGHT.gain for two frames — his halo and the drink's
 * light inside the glass — with the thump of the lens; both heartbeats alike, the dub 60 %.
 */
export const BEAT_LIGHT = { gain: 0.3, frames: 2, dub: 0.6 } as const;
export const beatLight = (f: number): number => beatPulse(f, Infinity, BEAT_LIGHT.frames - 0.5, BEAT_LIGHT.dub);
/** His (×ω×) — his hot =+* cells, his face filled in amber, his halo and his indigo spot — as one card at z 0, turned a little from the camera (cardTurn), beating at `f`. */
export function heroCard(field: readonly FieldCell[], L: OverloadLayout, basis: Basis, f: number = HELD): FlatContent {
  const h = crashHero(HELD, field, L);
  const glow = 1 + BEAT_LIGHT.gain * beatLight(f);
  const halo = glow > 1 ? h.under.map((s) => ({ ...s, color: scaleRGB(s.color, glow) })) : h.under;
  const heart = heartGlow(f);
  const card: FlatContent = { under: heart.length ? [...heart, ...halo] : halo, glyphs: { bold: h.bold, rounded: h.rounded }, over: [] };
  const p = throbAt(f);
  const phi = cardTurn(f);
  const at: Vec3 = [0, 0, 0];
  const b = phi === 0 ? basis : turnedBasis(basis, phi);
  const narrow = phi === 0 ? 1 : Math.cos(phi);
  return p > 0 ? standUp(brighten(card, 1 + THROB.light * p), [0, 0], at, b, 1 + THROB.scale * p, 1, narrow) : standUp(card, [0, 0], at, b, 1, 1, narrow);
}
/**
 * The frozen guest (with his hat and his tipped glass; the splash left out: the crown is glass) hangs in front of the frame, up and to the
 * right, a little lower than he stood on it so the orbit's rise never crops his hat: revealed by the angle, he circles the top of the frame.
 */
export const GUEST_CARD = { pivot: [1640, 180] as const, at: [600, 250, 120] as Vec3, scale: 0.72 } as const;
export const guestAnchor = (): Vec3 => GUEST_CARD.at;
export function guestCard(c: { glass: FlatContent; light: FlatContent }, basis: Basis, alpha: number): { glass: FlatContent; light: FlatContent } {
  const pivot: [number, number] = [X(GUEST_CARD.pivot[0]), Y(GUEST_CARD.pivot[1])];
  const k = GUEST_CARD.scale;
  return { glass: standUp(c.glass, pivot, guestAnchor(), basis, k, alpha), light: standUp(c.light, pivot, guestAnchor(), basis, k, alpha) };
}

// ——— The sky of type: what is round the frozen world when the camera looks off its edge ——————————————————————————————————————————

/**
 * Looking along the frozen sheet (side-on, and inside its stack of plates) the camera sees past its edges: there the program's world is a
 * sky of type — a sphere of dim glyphs round him (the terminal's text and the rings' hues, a fifth as bright as the frame's edge), far
 * enough that the lens melts them into bokeh. It is revealed by the angle, as the crown and the guest are: front-on there is none.
 */
export const SKY = { radius: 3800, count: 2400, size: [60, 150] as const, level: [0.05, 0.16] as const } as const;
const SKY_INKS: readonly RGB[] = ['#D8F5E1', '#FF48B0', '#A78BFA', '#3FE0FF', '#4CF08C', '#D8F5E1'].map((h) => linear(h));
const SKY_CHARS = '..::**++=#@';
export type SkyCell = { ch: string; at: Vec3; size: number; ink: RGB };
let sky: SkyCell[] | null = null;
export function skyCells(): SkyCell[] {
  if (sky) return sky;
  const out: SkyCell[] = [];
  for (let k = 0; k < SKY.count; k++) {
    // A Fibonacci sphere, jittered.
    const y = 1 - (2 * (k + 0.5)) / SKY.count;
    const r = Math.sqrt(1 - y * y);
    const a = k * GOLDEN + 0.3 * hash(k, 4371);
    const rad = SKY.radius * (0.85 + 0.3 * hash(k, 4372));
    const ink = scaleRGB(SKY_INKS[Math.floor(hash(k, 4373) * SKY_INKS.length)], lerp(SKY.level[0], SKY.level[1], hash(k, 4374)));
    out.push({ ch: SKY_CHARS[Math.floor(hash(k, 4375) * SKY_CHARS.length)], at: [rad * r * Math.cos(a), rad * y * 0.8, rad * r * Math.sin(a)], size: lerp(SKY.size[0], SKY.size[1], hash(k, 4376)), ink });
  }
  sky = out;
  return out;
}
/** The sky's glyphs at `f` seen by `cam` into `out` from index `n` (those in view, at the angle's reveal); returns the new count. */
export function skyGlyphsAt(f: number, cam: BulletCamera, out: Glyph[], n: number): number {
  const a = revealAlpha(cam.theta);
  if (a <= 0.004) return n;
  const beat = heartbeat(f) * (1 + GLOW.sky * glowPulse(f));
  for (const c of skyCells()) {
    const near = nearFade(viewDepth(cam, c.at));
    if (near <= 0 || !inView(cam, c.at, c.size)) continue;
    out[n++] = { ch: c.ch, x: c.at[0], y: c.at[1], z: c.at[2], size: c.size, color: scaleRGB(c.ink, a * beat * near) };
  }
  return n;
}

// ——— The glints: THE FRAME's six four-point stars, stood in depth ———————————————————————————————————————————————————————————————

/** Each glint's depth (z ∈ [−80, 60]): some float in front of the rings, some sink behind. */
export const GLINT_Z: readonly number[] = [-60, 40, -80, 60, -20, 30];
const GLINT_INK: RGB = [2.2, 2.0, 1.8];
/** A glint's level at `f`: its twinkle on the warped clock, or the music box's flare, whichever is brighter. */
export const glintLevelAt = (f: number, g: (typeof GLINTS)[number], cap: Capsule): number => Math.max(glintAt(glintClock(f), f, g, cap), 0.9 * flare(f));
/** The glints as 3D stars (shapes with z; the scene draws each as a billboard: its rays stay level, like a lens's). */
export function bulletGlints(f: number, cap: Capsule): Shape[] {
  const out: Shape[] = [];
  GLINTS.forEach((g, i) => {
    const l = glintLevelAt(f, g, cap);
    if (l <= 0.01) return;
    const z = GLINT_Z[i];
    const s = compensation(z);
    const [x, y] = atDepth(X(g.x), Y(g.y), z);
    const size = g.size * s;
    out.push({ kind: 'ellipse', x, y, z, w: 0.5 * size * l, h: 0.5 * size * l, color: scaleRGB(GLINT_INK, 0.3 * l), soft: 0.25 * size * l });
    for (const [len, rot] of [[size, 0], [size, Math.PI / 2], [0.42 * size, Math.PI / 4], [0.42 * size, -Math.PI / 4]] as const) {
      out.push({ kind: 'segment', x, y, z, w: len * (0.4 + 0.6 * l), h: 3.2 * s, rot, color: scaleRGB(GLINT_INK, l), soft: 1.4 * s });
    }
  });
  return out;
}

// ——— The crown: the frozen splash, a crown of glass round the flattened drop, the drink's pink light inside it ——————————————————————

/**
 * The splash as the bullet time reveals it — the milk-crown photograph, in glass: a thin wall thrown up round the flattened drop, 12 spikes
 * rising off its rim, each with a bead breaking away at its tip, the splash's ring at its foot (the flat splash drew its side view: 12
 * droplets on a half-ellipse, the ring). Twice the flat splash's size, down and to the left in front of the frame, so the orbit carries it
 * across the bottom of the shot from 20.1 to 20.3 with the rings behind it. World units; static (the splash is frozen).
 */
export const CROWN = { centre: [-430, -390, 330] as Vec3, radius: 150, wall: 62, spike: [58, 92] as const, bead: [15, 23] as const, droplets: 12, ring: 196, tube: 7, disc: [92, 10] as const } as const;
export type Spike = { foot: Vec3; tip: Vec3; width: number; bead: Vec3; radius: number };
let spikes: Spike[] | null = null;
export function crownSpikes(): Spike[] {
  if (spikes) return spikes;
  const out: Spike[] = [];
  const top = CROWN.centre[1] + CROWN.wall;
  for (let k = 0; k < CROWN.droplets; k++) {
    // Round the rim (a whole turn: seen from the side, the half-ellipse the flat splash drew), each thrown a little differently, leaning out.
    const a = (TAU * (k + 0.35 * hash(k, 4361))) / CROWN.droplets;
    const rim = CROWN.radius * 1.08;
    const len = lerp(CROWN.spike[0], CROWN.spike[1], hash(k, 4363));
    const lean = 0.35 + 0.2 * hash(k, 4362);
    const dir = unit([Math.cos(a) * lean, 1, Math.sin(a) * lean]);
    const foot: Vec3 = [CROWN.centre[0] + rim * Math.cos(a), top - 6, CROWN.centre[2] + rim * Math.sin(a)];
    const tip = add(foot, mul(dir, len));
    const radius = lerp(CROWN.bead[0], CROWN.bead[1], hash(k, 4364));
    out.push({ foot, tip, width: 0.55 * radius, bead: add(tip, mul(dir, radius * (1.3 + 0.6 * hash(k, 4365)))), radius });
  }
  spikes = out;
  return out;
}
/** The pink of the guest's cocktail (the law: only his cocktail and its drop): the glass is tinted with it, and it is the light inside. */
export const CROWN_TINT = LAW.cocktail;
const PINK: RGB = linear(LAW.cocktail);
/**
 * The drink's light inside the crown (drawn behind the glass, so the glass bends it): a pink glow filling the wall and a bead of light in
 * each droplet — the flat splash's neon pink, now inside glass. At the reveal's alpha; brighter on each crown ting for its droplet.
 */
export function crownGlow(f: number, alpha: number): Shape[] {
  if (alpha <= 0.01) return [];
  const c = CROWN.centre;
  // The heartbeats swell the drink's light (BEAT_LIGHT, R3).
  const beat = 1 + BEAT_LIGHT.gain * beatLight(f);
  const out: Shape[] = [{ kind: 'ellipse', x: c[0], y: c[1] + CROWN.wall * 0.45, z: c[2], w: 2.6 * CROWN.radius, h: 1.3 * CROWN.wall + 60, color: scaleRGB(PINK, 0.32 * alpha * beat), soft: 70 }];
  out.push({ kind: 'ellipse', x: c[0], y: c[1] + 4, z: c[2], w: 2 * CROWN.disc[0], h: 26, color: scaleRGB(PINK, 0.9 * alpha * beat), soft: 10 });
  crownSpikes().forEach((s, i) => {
    const ting = CROWN_TINGS[i] === undefined ? 0 : Math.max(0, 1 - (f - CROWN_TINGS[i]) / 8) * (f >= CROWN_TINGS[i] ? 1 : 0);
    out.push({ kind: 'ellipse', x: s.bead[0], y: s.bead[1], z: s.bead[2], w: 1.6 * s.radius, h: 1.6 * s.radius, color: scaleRGB(PINK, (0.7 * beat + 1.6 * ting) * alpha), soft: 0.7 * s.radius });
  });
  return out;
}
/** On each crown ting (CROWN_TINGS, 32nds) one droplet catches the light, in turn round the crown: a four-point sparkle, gone in 6 frames. */
export function crownSparkles(f: number, alpha: number): Shape[] {
  if (alpha <= 0.01) return [];
  const beads = crownSpikes();
  const out: Shape[] = [];
  CROWN_TINGS.forEach((at, i) => {
    const t = f - at;
    if (t < 0 || t >= 6) return;
    const l = alpha * (1 - t / 6) ** 2;
    const b = beads[i % beads.length];
    const [x, y, z] = add(b.bead, [0, 0.4 * b.radius, 0]);
    const ink = mixRGB(linear('#FFE6F2', 2.4), WHITE, 0.3);
    out.push({ kind: 'ellipse', x, y, z, w: 34 * l, h: 34 * l, color: scaleRGB(ink, 0.35 * l), soft: 16 * l });
    for (const rot of [0, Math.PI / 2]) out.push({ kind: 'segment', x, y, z, w: 84 * l + 6, h: 2.8, rot, color: scaleRGB(ink, l), soft: 1.2 });
  });
  return out;
}

// ——— Depth order (the scene draws back to front around the two things that are not light: the guest's dark glass and the crown) ——

/** How far in front of the camera a world point is, along its view. */
export const viewDepth = (cam: BulletCamera, p: Vec3): number => dot(sub(p, cam.pose.position), cam.basis.forward);

// ——— Finishing ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The heartbeats in the light (R3): on each lub and dub a wide soft glow of his spot's indigo blooms out of him into the dark (his heart,
 * GLOW.heart: the light, its size and its soft edge, world units round his face), the frozen world's glow swells (the bloom
 * × (1 + GLOW.bloom · p), the exposure + GLOW.exposure · p) and the sky of type round him flares (× 1 + GLOW.sky · p) — gone within a few
 * frames. A pulse the eye takes over the orbit, without a flash: the swing is in the dark, a few hundredths of luminance.
 */
export const GLOW = { heart: { ink: [0.03, 0.011, 0.065] as RGB, w: 2600, h: 1700, soft: 800 }, bloom: 0.8, exposure: 0.12, sky: 2, decay: 2, span: 12 } as const;
export const glowPulse = (f: number): number => beatPulse(f, GLOW.decay, GLOW.span);
/** His heart's glow at `f` (flat, round his face; none between the heartbeats). */
export function heartGlow(f: number): Shape[] {
  const p = glowPulse(f);
  const g = GLOW.heart;
  return p > 0 ? [{ kind: 'ellipse', x: 0, y: 0, w: g.w, h: g.h, color: scaleRGB(g.ink, p), soft: g.soft }] : [];
}
/** THE FRAME's look, held (the CRT and its glow); the heartbeat breathes the exposure with the rings and swells the glow (GLOW). */
export function bulletLook(f: number): Look {
  const look = crashLook(HELD);
  const p = glowPulse(f);
  if (p <= 0) return { ...look, exposure: look.exposure * (1 + 0.35 * (heartbeat(f) - 1)) };
  return { ...look, exposure: look.exposure * (1 + 0.35 * (heartbeat(f) - 1) + GLOW.exposure * p), bloom: { ...look.bloom, intensity: look.bloom.intensity * (1 + GLOW.bloom * p) } };
}
/** True from where the bullet time hands its sub-frames to the built drain (the last half frame: front-on, flat, exactly the drain's). */
export const handsBack = (f: number): boolean => f >= HAND_BACK;

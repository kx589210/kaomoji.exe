// Cosmos 5, "LIGHTNING WEB · 10²⁴ m" (renderer C's first bar; build sheet notes/bcos/sheet.md §4.5, design
// notes/cosmos3/final.md §4 bar 19, prototype cosmos3/w/j5.js from 19.1): pure. The cosmic web as a real 3D graph, seen by one
// perspective camera: his node at the origin, about 290 nodes scattered through a deep slab (each a small spiral-galaxy impostor round a
// host face), a coarse far web behind, and a cloud of galaxy dust through the whole volume (the three depths: the dust past the lens,
// the web, the far web). The infection runs out from him as a wave a hop a 16th: a node's hop is its distance from him in hops of a
// filament's length, so the front of lightning expands round him across the frame, the filaments' signature bytes burning amber behind
// each arc like a fuse. The camera pulls back out of the match cut (L), rolls 90° clockwise about his node on the clap, then drifts
// to the Defender's node, whose red hex shield throws the wall's arcs back (the red is the overlay's: src/shots/cosmosWebOverlay.ts);
// the rack focus is the lens's (each sub-frame looks through its own point of the aperture); the scan plays everyone dead, the relight
// winks, and the camera backs off into the twist.
//
// Everything here is screen px at 1080p, origin at the frame centre, y up (the camera projects the world itself, so the shot code stays
// a pure function of the instant and Node tests read the picture). The scene (src/scenes/cosmosCWeb.ts) writes the lists to the GPU.
// Plain Node loads this file: no three / remotion / react imports.
import { CROWDS, DEFENDER_FACE, HERO_FACES, WEB_NODES, WINKS } from '../content/castCosmos.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import { HATS, HOOK, HOPS, KICKS, MATCH, OPEN_HATS, RACK, RETICLE, ROLL, SCAN, WALL, WINK, cs } from '../score/cosmos.ts';
import { frameOf } from './cosmosKit.ts';

// ——— Motion curves (the prototype's, j1.js: exact) ————————————————————————————————————————————————————————————————————————————

/** L, the launch: starts on its frame at full speed, 75 % of the move in 3 f, ≤ 3 % rebound, settled by about 12 f. */
export const launchL = (t: number): number => (t <= 0 ? 0 : 1 - Math.exp(-0.5625 * t) * (Math.cos(0.496 * t) + 1.134 * Math.sin(0.496 * t)));
/** I, the impact: accelerates into frame n and lands on it, a 2 % rebound over 6 f. */
export const impactI = (t: number, n: number): number => (t <= 0 ? 0 : t < n ? (t / n) ** 2.4 : 1 + 0.02 * Math.sin(Math.PI * clamp((t - n) / 6)));
/** The cosine ease 0 → 1 over t ∈ [0, 1]. */
export const easeCos = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
/** A decaying envelope: 1 on t = 0, (1 − t/n)² down to 0 at n; 0 outside [0, n). */
export const env = (t: number, n: number): number => (t < 0 || t >= n ? 0 : (1 - t / n) ** 2);
/** The latest of `list` at or before `f` (−∞ when none). */
export const lastOf = (list: readonly number[], f: number): number => {
  let k = -Infinity;
  for (const v of list) if (v <= f && v > k) k = v;
  return k;
};

// ——— Inks: the roles the scene maps to light (red never: the Defender's red is drawn after the print) —————————————————————————

/** amber = him and his marks only; cyan, pink, cream = hosts and structure; core = paper-as-light (the bead, the flare); violet = the far web;
 * band = the match cut's light (BAND_INK, exactly as B draws it). */
export type Ink = 'amber' | 'cyan' | 'pink' | 'cream' | 'core' | 'violet' | 'band';

// ——— The web —————————————————————————————————————————————————————————————————————————————————————————————————————————————————

export type V3 = readonly [number, number, number];
export type WebRole = 'hero' | 'defender' | 'host';
export type WebNode = {
  readonly i: number;
  /** World position (units: about one filament long; z away from the camera). */
  readonly p: V3;
  /** Hop number (0 = his node; the Defender's 8; 1–11 by distance from him). */
  readonly hop: number;
  /** The node the lightning reaches it from (−1 for his node). */
  readonly parent: number;
  readonly role: WebRole;
  readonly layer: 'near' | 'far';
  /** Its host face and the face it flips to when infected (his own: (•ω•); the Defender's: never infected). */
  readonly host: string;
  readonly infected: string;
  /** The crowd's wink on the relight (by hash; never his, never the Defender's). */
  readonly wink: string;
  /** The host's ink (pink or cyan; the Defender cream). */
  readonly ink: Ink;
};
export type WebEdge = { readonly a: number; readonly b: number; readonly tree: boolean };

/** A hop's reach: the infection front moves this far (units) a 16th. */
export const HOP_LENGTH = 0.95;
/** The near web's extent: |x| ≤ 9.5, |y| ≤ 7.5, z from −5.6 (the nodes the pull-back passes, then the foreground) to 8.5 deep; nodes no closer than this. */
export const WEB_BOX = { x: 9.5, y: 7.5, z0: -5.6, z1: 8.5, spacing: 1.05 } as const;
/** The far web: this many nodes 10–19 units deep (the coarse background web, lit by hops 9–11). */
export const FAR_COUNT = 110;
/** The Defender's node: where its screen path starts (+420, +300) with the pull-back settled 7 units away. */
export const DEFENDER_P: V3 = [(420 * 7) / 1100, (300 * 7) / 1100, 1];

const NARROW_CROWD = CROWDS.web.filter((c) => !c.wide);
const dist = (a: V3, b: V3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function buildWeb(): { nodes: WebNode[]; edges: WebEdge[]; defender: number } {
  type Raw = { p: V3; hop: number; parent: number };
  // His node, and the strand through it that the match cut lands on: two nodes level with him, left and right.
  const raw: Raw[] = [
    { p: [0, 0, 0], hop: 0, parent: 0 },
    { p: [-1.05, 0, 0], hop: 1, parent: 0 },
    { p: [1.05, 0, 0], hop: 1, parent: 0 },
  ];
  // The Defender: a hop-8 node a few units off his; nothing grows too close to it.
  const D = DEFENDER_P;
  // The near web: dart-throwing in the slab, denser near him (the eye's region), every node at least `spacing` from the others.
  const B = WEB_BOX;
  const pts: V3[] = [];
  for (let k = 0; pts.length < 300 && k < 40000; k++) {
    const r = hash(k, 1) ** 0.75;
    const a = Math.PI * 2 * hash(k, 2);
    const p: V3 = [Math.cos(a) * r * B.x * (0.6 + 0.4 * hash(k, 4)), Math.sin(a) * r * B.y * (0.6 + 0.4 * hash(k, 5)), B.z0 + (B.z1 - B.z0) * hash(k, 3) ** 0.8];
    if (dist(p, [0, 0, 0]) < 1.6 || dist(p, D) < 1.25 || Math.abs(p[1]) < 0.5 && Math.abs(p[2]) < 0.6 && Math.abs(p[0]) < 2.2) continue;
    if (pts.some((q) => dist(p, q) < B.spacing) || raw.some((q) => dist(p, q.p) < B.spacing)) continue;
    pts.push(p);
  }
  // Each node's hop is its distance from him in hops (jittered a little, so the front frays), at least one more than its parent's.
  const order = pts.map((p, i) => ({ p, i, d: dist(p, [0, 0, 0]) + (hash(i, 6) - 0.5) * 0.7 })).sort((x, y) => x.d - y.d);
  for (const { p, d } of order) {
    const hop = clamp(Math.round(d / HOP_LENGTH), 2, 11);
    // The parent: the nearest node already infected a hop or more before it (his node for the first ones).
    let parent = 0;
    let best = Infinity;
    raw.forEach((q, j) => {
      if (q.hop >= hop || q.hop < hop - 3) return;
      const dd = dist(p, q.p) + (hop - 1 - q.hop) * 0.6;
      if (dd < best) {
        best = dd;
        parent = j;
      }
    });
    raw.push({ p, hop, parent });
  }
  const defender = raw.length;
  // The Defender hangs off the nearest hop-7 node (its strand is where the wall's first arc runs).
  let dp = 1;
  let dd = Infinity;
  raw.forEach((q, j) => {
    if (q.hop !== 7) return;
    const e = dist(q.p, D);
    if (e < dd) {
      dd = e;
      dp = j;
    }
  });
  raw.push({ p: D, hop: 8, parent: dp });
  const nearCount = raw.length;
  // The far web: a coarse layer behind, each node grown from the nearest near node a hop before its own (9–11).
  for (let k = 0; k < FAR_COUNT; k++) {
    const i = raw.length;
    const z = 10 + 9 * hash(i, 11);
    const p: V3 = [(hash(i, 12) - 0.5) * 1.9 * (z + 6), (hash(i, 13) - 0.5) * 1.15 * (z + 6), z];
    const hop = 9 + Math.floor(hash(i, 14) * 3);
    let best = 1;
    let bd = Infinity;
    for (let j = 1; j < nearCount; j++) {
      if (j === defender || raw[j].hop !== hop - 1) continue;
      const e = dist(p, raw[j].p);
      if (e < bd) {
        bd = e;
        best = j;
      }
    }
    raw.push({ p, hop, parent: best });
  }
  const edges: WebEdge[] = raw.flatMap((n, i) => (i > 0 ? [{ a: n.parent, b: i, tree: true }] : []));
  const has = new Set(edges.map((e) => `${Math.min(e.a, e.b)}:${Math.max(e.a, e.b)}`));
  // Cross filaments: each near node to its two nearest neighbours under 1.9 units (the web's mesh).
  for (let i = 1; i < nearCount; i++) {
    if (i === defender) continue;
    const near = raw
      .map((n, j) => [j, dist(n.p, raw[i].p)] as const)
      .filter(([j, e]) => j !== i && j !== defender && j < nearCount && e < 1.9)
      .sort((x, y) => x[1] - y[1])
      .slice(0, 2);
    for (const [j] of near) {
      const key = `${Math.min(i, j)}:${Math.max(i, j)}`;
      if (has.has(key)) continue;
      has.add(key);
      edges.push({ a: Math.min(i, j), b: Math.max(i, j), tree: false });
    }
  }
  // The far web's own mesh: each far node to its two nearest far neighbours under 7 units.
  for (let i = nearCount; i < raw.length; i++) {
    const near = raw
      .map((n, j) => [j, dist(n.p, raw[i].p)] as const)
      .filter(([j, e]) => j > i && e < 7)
      .sort((x, y) => x[1] - y[1])
      .slice(0, 2);
    for (const [j] of near) edges.push({ a: i, b: j, tree: false });
  }
  let named = 0;
  const nodes = raw.map((n, i): WebNode => {
    const role: WebRole = i === 0 ? 'hero' : i === defender ? 'defender' : 'host';
    const layer = i < nearCount ? 'near' : 'far';
    if (role === 'hero') return { i, p: n.p, hop: 0, parent: -1, role, layer, host: HERO_FACES.face, infected: HERO_FACES.face, wink: HERO_FACES.face, ink: 'amber' };
    if (role === 'defender') return { i, p: n.p, hop: 8, parent: n.parent, role, layer, host: DEFENDER_FACE, infected: DEFENDER_FACE, wink: DEFENDER_FACE, ink: 'cream' };
    // The twelve named faces on the first nodes the lightning reaches (hops 1–3, where they read); then the crowd, narrow faces where a node stays small.
    const crowd = layer === 'far' || n.p[2] > 5 ? NARROW_CROWD : CROWDS.web;
    const face = named < WEB_NODES.length ? { host: WEB_NODES[named].host, infected: WEB_NODES[named].infected ?? WEB_NODES[named].host } : crowd[Math.floor(hash(i, 6) * crowd.length)];
    named++;
    return { i, p: n.p, hop: n.hop, parent: n.parent, role, layer, host: face.host, infected: face.infected, wink: WINKS[Math.floor(hash(i, 7) * WINKS.length)], ink: hash(i, 8) < 0.5 ? 'cyan' : 'pink' };
  });
  return { nodes, edges, defender };
}

const BUILT = buildWeb();
/** Every node of the web, his node first. */
export const NODES: readonly WebNode[] = BUILT.nodes;
/** Every filament: the tree's (the lightning runs along them) and the cross and far ones (they light as their ends do). */
export const EDGES: readonly WebEdge[] = BUILT.edges;
/** The Defender's node (index into NODES). */
export const DEFENDER = BUILT.defender;
/** The three strands the wall's arcs run up: the three infected near nodes nearest the Defender (its own parent first). */
export const WALL_STRANDS: readonly number[] = (() => {
  const d = NODES[DEFENDER];
  const others = NODES.filter((n) => n.layer === 'near' && n.role === 'host' && n.hop < 8 && n.i !== d.parent)
    .map((n) => [n.i, dist(n.p, d.p)] as const)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([i]) => i);
  return [d.parent, ...others];
})();

/** The instant node `n` is struck (its hop's 16th); his node always was; the Defender never is. */
export const struckAt = (n: WebNode): number => (n.role === 'hero' ? -Infinity : n.role === 'defender' ? Infinity : HOPS[n.hop - 1]);

/** The galaxy dust through the whole volume (the three depths' near layer: it passes the lens as the camera moves). */
export const DUST: readonly { p: V3; r: number; ink: Ink }[] = Array.from({ length: 1400 }, (_, k) => {
  const z = -7.6 + 26 * hash(k, 41) ** 1.15;
  const spread = 1.1 * (z + 9);
  return { p: [(hash(k, 42) - 0.5) * 2 * spread, (hash(k, 43) - 0.5) * 1.2 * spread, z] as V3, r: 0.012 + 0.03 * hash(k, 44) ** 3, ink: (hash(k, 45) < 0.5 ? 'cyan' : hash(k, 46) < 0.6 ? 'cream' : 'pink') as Ink };
});

// ——— The camera: the pull-back out of the match cut, the roll, the drift to the Defender, the back-off into the twist ——————————————

/** The lens's focal length, px at 1080p (a 52° vertical field). */
export const FOCAL = 1100;
/** The pull-back: from 0.12 units off his node to 6 (×50 in log space, L on the match cut). */
export const PULL = { near: 0.12, far: 6 } as const;
/** The relight's pull-back (from WINK, L): the camera backs off this far with the Defender held at the centre, into the twist. */
export const BACK_OFF = 2.4;
/** The drift: from the roll's settle to the reticle the view eases onto the Defender's node, ending this far in front of where it was. */
export const DRIFT = { from: ROLL.settled, to: RETICLE, dz: 0.6 } as const;

export type WebCamera = { eye: V3; /** Clockwise picture roll (radians). */ roll: number; focal: number };

/** The roll at instant f: 90° clockwise on the clap (L: 75 % by +3 f, 3 % over, settled 12 f later). */
export const rollAt = (f: number): number => (Math.PI / 2) * Math.min(1.02, launchL(f - ROLL.at));

/**
 * The drift's progress (0 → 1) over [DRIFT.from, DRIFT.to]: 4 f to get going, an even glide, 4 f to settle — so the Defender crosses the
 * frame at ≤ 260 px a beat (the design's cap) and passes (+300, −330) on the wall.
 */
export function driftU(f: number): number {
  const a = DRIFT.from;
  const b = DRIFT.to;
  const up = 4;
  const down = 4;
  const v = 1 / (b - a - up / 2 - down / 2);
  const t = clamp(f - a, 0, b - a);
  if (t < up) return (v * t * t) / (2 * up);
  if (t < b - a - down) return v * (up / 2 + (t - up));
  const s = b - a - t;
  return 1 - (v * s * s) / (2 * down);
}

/** The camera at instant `f` (≥ MATCH). */
export function webCamera(f: number): WebCamera {
  const t = f - MATCH;
  const d = PULL.near * (PULL.far / PULL.near) ** Math.min(1, launchL(t));
  const u = driftU(f);
  // A creep so the camera never rests (≈ 20 px a beat at the Defender's depth), handed over to the drift.
  const creep: V3 = [0.0028 * t, -0.0012 * t, 0.004 * t];
  const back = BACK_OFF * Math.min(1.02, launchL(f - WINK));
  const D = DEFENDER_P;
  const eye: V3 = [lerp(creep[0], D[0], u), lerp(creep[1], D[1], u), lerp(-d + creep[2], -d + DRIFT.dz, u) - back];
  return { eye, roll: rollAt(f), focal: FOCAL };
}

/** The aperture (lens radius, world units) at instant `f`: the rack focus to the Defender, open on the wall (L), closed by RACK.to. */
export const APERTURE = 0.06;
export const apertureAt = (f: number): number => APERTURE * Math.min(1, launchL(f - RACK.from)) * (1 - smoothstep(RACK.to - 6, RACK.to, f));
/** What the lens focuses on: the Defender's node. */
export const focusDepth = (cam: WebCamera): number => DEFENDER_P[2] - cam.eye[2];

/** Point `k` of an `n`-point Vogel (sunflower) disc of radius 1. */
export const vogel = (k: number, n: number): [number, number] => {
  const r = Math.sqrt((k + 0.5) / n);
  const a = k * Math.PI * (3 - Math.sqrt(5));
  return [r * Math.cos(a), r * Math.sin(a)];
};
/** Sub-frame `i`'s lens point (37 is coprime with the sample counts used: 48, 64), decorrelated from time. */
export const lensIndex = (i: number, n: number): number => (37 * i) % n;

export type Lens = { x: number; y: number; focus: number } | null;
export type Projected = { x: number; y: number; /** px per world unit at that depth */ k: number; z: number };

/** Turns a screen point clockwise by `roll` (y up). */
export const rollPoint = (x: number, y: number, roll: number): [number, number] => {
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  return [x * c + y * s, -x * s + y * c];
};

/** Projects world point `p` (null behind the near plane); `lens` shifts the eye across the aperture, keeping the focus plane fixed. */
export function project(cam: WebCamera, p: V3, lens: Lens = null): Projected | null {
  const z = p[2] - cam.eye[2];
  if (z < 0.05) return null;
  const k = cam.focal / z;
  let x = (p[0] - cam.eye[0]) * k;
  let y = (p[1] - cam.eye[1]) * k;
  if (lens) {
    x += lens.x * cam.focal * (1 / lens.focus - 1 / z);
    y += lens.y * cam.focal * (1 / lens.focus - 1 / z);
  }
  const [rx, ry] = rollPoint(x, y, cam.roll);
  return { x: rx, y: ry, k, z };
}

// ——— What happens to each node and filament ———————————————————————————————————————————————————————————————————————————————

/** The scanline's travel (y up): from the top edge to the bottom edge; on the clap's frame it has already swept `first` of the frame. */
export const SCAN_TRAVEL = { top: 540, bottom: -540, first: 0.22 } as const;
/**
 * The scanline's height (y up) at instant `f`: a wipe top → bottom in 12 f with a fast start (5.4, the clap: the line slams in with the
 * top fifth of the frame already dead under it), decelerating to land on the bottom edge on its 12th frame (the whole frame plays dead;
 * the relight is the next frame, the open hat).
 */
export const scanY = (f: number): number => {
  if (f < SCAN.from) return Infinity;
  if (f >= SCAN.to) return -Infinity;
  const k = Math.min(1, (f - SCAN.from) / (SCAN.to - SCAN.from - 1));
  const u = SCAN_TRAVEL.first + (1 - SCAN_TRAVEL.first) * (1 - (1 - k) ** 1.5);
  return lerp(SCAN_TRAVEL.top, SCAN_TRAVEL.bottom, u);
};
/**
 * Whether the scan has passed over screen height y by instant f (the light there plays dead until the relight). Whole a frame: every
 * sub-frame of an output frame takes that frame's line — the line is the overlay's, drawn once a frame, so what is dead is exactly what
 * lies above the red line on screen (nothing lit peeks out above it) — and the relight lands whole on its frame (a drum swap).
 */
export const scanned = (f: number, y: number): boolean => y > deadAbove(f);
/** Everything drawn above this height (y up) at instant f plays dead: the output frame's line through the scan, +∞ (nothing) outside it. */
export const deadAbove = (f: number): number => {
  const out = frameOf(f);
  return out >= SCAN.from && out < WINK ? scanY(out) : Infinity;
};
/**
 * How far above its centre a node's light reaches, for the scan (em, px → px): its spiral impostor's arms (0.82 of its radius 1.87 em),
 * the farthest of its light — a node plays dead as soon as the line reaches any of it, so nothing of its amber is ever left above the line.
 */
export const nodeReach = (em: number): number => 1.55 * em;

export type NodeLook = { face: string; ink: Ink; /** 0–1 */ glow: number; infected: boolean; dead: boolean; winking: boolean };

/** The bar's top note (row A's G6 on the wall): his face is (>ω<) for its three 16ths. */
export const HOOK_TOP_A = HOOK.find((n) => n.top && n.at >= MATCH && n.at < cs(6))!.at;
/**
 * His disguise while the scan passes (EVERYONE PLAYS DEAD, him included): his own • eyes with the ω — the virus's mark — hidden behind a
 * flat mouth; a host face in dim cyan like every other node, so `[SCAN] 0 THREATS ✓` is true of what the scan saw.
 */
export const HERO_DISGUISE = '(•_•)';
/** His wink on the relight (5.4&), with the crowd's; on the reticle's twitch (5.4a) he is innocent (•ω•) again. */
export const HERO_WINK = WINKS[0];
/** How a dead node shows: dims to 35 % cyan (design: “each node, arc and face flips back to its host face and dims to 35 % cyan”). */
export const DEAD_GLOW = 0.35;

/** Node `n`'s face, ink and light at instant f, its screen height y (the scan reads it). Drum-keyed: whole on the 16th's frame. */
export function nodeLook(n: WebNode, f: number, y: number): NodeLook {
  const out = frameOf(f);
  if (n.role === 'defender') return { face: DEFENDER_FACE, ink: 'cream', glow: 1, infected: false, dead: false, winking: false };
  const dead = scanned(f, y);
  if (dead) return { face: n.role === 'hero' ? HERO_DISGUISE : n.host, ink: 'cyan', glow: DEAD_GLOW, infected: false, dead, winking: false };
  if (n.role === 'hero') {
    const winking = out >= WINK && out < RETICLE;
    const face = winking ? HERO_WINK : out >= HOOK_TOP_A && out < HOOK_TOP_A + 18 ? HERO_FACES.top : HERO_FACES.face;
    return { face, ink: 'amber', glow: 1, infected: true, dead, winking };
  }
  const infected = out >= struckAt(n);
  if (!infected) return { face: n.host, ink: n.ink, glow: 0.6, infected: false, dead, winking: false };
  const winking = out >= WINK;
  return { face: winking ? n.wink : n.infected, ink: 'amber', glow: 1, infected: true, dead: false, winking };
}

/** His bob on the hook's note starts (+6 px, back over 4 f). */
export function heroBob(f: number): number {
  let b = 0;
  for (const n of HOOK) if (f >= n.at && f < n.at + n.len * 6 && n.at >= MATCH && n.at < cs(6)) b = 6 * Math.sin(Math.PI * clamp((f - n.at) / 4));
  return b;
}
/** The kick's emissive pulse on the SUBJECT (×1.35 for 2 f, back over 10 f). */
export function pulse(f: number): number {
  const k = lastOf(KICKS, f);
  const t = f - k;
  return t < 0 ? 0 : t < 2 ? 1 : env(t - 2, 8);
}

/** How much of filament e is lit (0–1, from its `a` end) at instant f: the fuse burns over the 16th after its arc lands. */
export function litFraction(e: WebEdge, f: number): number {
  const b = NODES[e.b];
  const a = NODES[e.a];
  if (b.role === 'defender' || a.role === 'defender') return 0;
  const at = e.tree ? struckAt(b) : Math.max(struckAt(a), struckAt(b));
  return at === -Infinity ? 1 : clamp((f - at) / 6);
}
/** Every filament's text scrolls one byte on each open hat (from 5.1&). */
export const scrollAt = (f: number): number => OPEN_HATS.filter((h) => h >= MATCH && h <= frameOf(f)).length;

export type Arc = { a: number; b: number; age: number; kind: 'hop' | 'wall'; seed: number };
/** Arcs live 4 f then fade over 6. */
export const ARC_LIFE = { live: 4, fade: 6 } as const;

/** The arcs alive at instant f: each near tree edge's on its hop's 16th (none after the scan), and the wall's three on the Defender's shield. */
export function arcsAt(f: number): Arc[] {
  const out: Arc[] = [];
  const life = ARC_LIFE.live + ARC_LIFE.fade;
  for (const e of EDGES) {
    if (!e.tree) continue;
    const b = NODES[e.b];
    if (b.role === 'defender' || b.layer === 'far') continue;
    const age = f - struckAt(b);
    if (age < 0 || age >= life || f >= SCAN.from) continue;
    out.push({ a: e.a, b: e.b, age, kind: 'hop', seed: e.b * 7 + Math.floor(frameOf(f) / 2) });
  }
  const wall = f - WALL;
  if (wall >= 0 && wall < life) for (const s of WALL_STRANDS) out.push({ a: s, b: DEFENDER, age: wall, kind: 'wall', seed: s * 13 + Math.floor(frameOf(f) / 2) });
  return out;
}

/** A lightning bolt between screen points (seeded midpoint displacement, 4 levels: 17 points), with up to two branches. */
export function bolt(a: readonly [number, number], b: readonly [number, number], seed: number): { trunk: [number, number][]; branches: [number, number][][] } {
  let pts: [number, number][] = [[a[0], a[1]], [b[0], b[1]]];
  for (let l = 0; l < 4; l++) {
    const next: [number, number][] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const A = pts[i - 1];
      const B = pts[i];
      const dx = B[0] - A[0];
      const dy = B[1] - A[1];
      const d = Math.hypot(dx, dy) || 1;
      const o = (hash(seed, l, i) - 0.5) * 0.42 * d;
      next.push([(A[0] + B[0]) / 2 - (dy / d) * o, (A[1] + B[1]) / 2 + (dx / d) * o], B);
    }
    pts = next;
  }
  const branches: [number, number][][] = [];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dir = Math.atan2(b[1] - a[1], b[0] - a[0]);
  for (const bi of [5, 11]) {
    if (hash(seed, bi) < 0.35) continue;
    const A = pts[bi];
    const an = dir + (hash(seed, bi, 2) - 0.5) * 1.6;
    const l = len * 0.3;
    branches.push([A, [A[0] + Math.cos(an) * l * 0.5 + (hash(seed, bi, 3) - 0.5) * 20, A[1] + Math.sin(an) * l * 0.5], [A[0] + Math.cos(an) * l, A[1] + Math.sin(an) * l]]);
  }
  return { trunk: pts, branches };
}

// ——— The match cut's band (E15; B draws its last frames' band to it) ————————————————————————————————————————————————————————

/**
 * The brightness across the band that carries the match cut (B's flattened galaxy on its last frames, C's filament on 5.1), linear HDR
 * before the print, as a multiplier of BAND_INK, at `y` px from the band's centre line (y = 0 through the frame centre): a white-hot
 * 5 px core, a 22 px glow and a 70 px haze. Symmetric, peak 3.2 on the line, under 0.02 beyond ±120 px.
 */
export const bandProfile = (y: number): number => BAND_GAUSSIANS.reduce((s, t) => s + t.gain * Math.exp(-((y / t.sigma) ** 2)), 0);
/** bandProfile's three terms: gain × exp(−(y/σ)²). */
export const BAND_GAUSSIANS: readonly { sigma: number; gain: number }[] = [
  { sigma: 5, gain: 2.2 },
  { sigma: 22, gain: 0.8 },
  { sigma: 70, gain: 0.2 },
];
/** A soft capsule's falloff (ShapeField: (1 − |y|/R)^1.6 inside R) matches exp(−(y/σ)²)'s area and shape with R = 2.3σ. */
export const BAND_REACH = 2.3;
/** The band's colour (cream-amber, his light), linear-light sRGB hex: multiply by bandProfile(y). */
export const BAND_INK = '#FFE2B4';
/** How long the band holds on C's side of the cut before the text takes over (it resolves into the strand by 5.1e). */
export const bandAt = (f: number): number => 1 - smoothstep(MATCH, MATCH + 6, f);

// ——— The picture: what the scene draws at an instant ——————————————————————————————————————————————————————————————————————

export type FaceItem = { text: string; x: number; y: number; em: number; ink: Ink; alpha: number; glow: number; role: 'hero' | 'host' | 'infected' | 'wink' | 'defender' | 'ghost' };
/** A filament's run of signature text from (x0, y0) to (x1, y1), `h` px tall, starting `u0` bytes into the signature. */
export type TextRun = { x0: number; y0: number; x1: number; y1: number; h: number; u0: number; ink: Ink; alpha: number };
/** A stroke of light (a capsule `w` px thick; `soft` its glow's falloff, 0 = crisp). */
export type Stroke = { x0: number; y0: number; x1: number; y1: number; w: number; soft: number; ink: Ink; gain: number };
/** A sprite: a node's spiral impostor, a soft blob, a ✦ glint, a spark square. */
export type Sprite = { kind: 'spiral' | 'blob' | 'glint' | 'square'; x: number; y: number; r: number; rot: number; ink: Ink; gain: number };

export type WebPicture = {
  faces: FaceItem[];
  runs: TextRun[];
  strokes: Stroke[];
  sprites: Sprite[];
  /** Where things are this instant (for the overlay's red, the light grammar and the tests). */
  hero: { x: number; y: number; em: number } | null;
  defender: { x: number; y: number; k: number } | null;
};

/** A node's face size (em, px) at depth `k` px/unit: 0.2 units (em 28–90 near), his node and the Defender's capped. */
export const nodeEm = (n: WebNode, k: number): number => (n.role === 'hero' ? clamp(0.24 * k, 40, 64) : n.role === 'defender' ? 28 : 0.22 * k);
/** A filament's type size: JetBrains Mono 9–22 px by depth. */
export const runHeight = (k: number): number => clamp(0.075 * k, 9, 22);
/** Bytes of the signature per run of text (one cycle: the ten bytes and a space). */
export const SIGNATURE_CYCLE = 11;
/** The text's advance per byte, in ems of its height (two characters and a space of JetBrains Mono: 3 × 0.6). */
export const BYTE_ADVANCE = 1.8;

const W2 = 1100;
const H2 = 640;
const onScreen = (x: number, y: number, m = 0): boolean => x > -W2 - m && x < W2 + m && y > -H2 - m && y < H2 + m;
const crosses = (A: { x: number; y: number }, B: { x: number; y: number }): boolean => {
  const minX = Math.min(A.x, B.x);
  const maxX = Math.max(A.x, B.x);
  const minY = Math.min(A.y, B.y);
  const maxY = Math.max(A.y, B.y);
  return maxX > -W2 && minX < W2 && maxY > -H2 && minY < H2;
};

/** The shield's radius (px) round the Defender's node; its red ring sits at 70. */
export const SHIELD_R = 110;
/**
 * The light of the bar, brightest first (the SUBJECT is the lightning: nothing outshines an arc in its 4 f). An arc's 3 px core is
 * white-hot HDR light (`core` × ARC.core, far above the print's cap: the look carries it through, cLook's `hdr`), in a pink or cyan
 * fringe; a burnt fuse is amber at FUSE of the light the print caps at (≤ 50 % of an arc's brightness once printed), its burning head a
 * spark under the arc's; a filament not yet reached is dim cyan type (UNLIT), and dead under the scan dimmer still (DEAD_RUN).
 */
export const ARC = { core: 1.7, fringe: 0.42, width: 3, wall: 4.5 } as const;
export const FUSE = { near: 0.42, far: 0.3, head: 0.6 } as const;
export const UNLIT = { near: 0.5, far: 0.32 } as const;
/** A filament’s text while it plays dead: dim cyan, printed, never empty. */
export const DEAD_RUN = 0.38;
/** The faces' size cap (em, px; the design's near nodes are em 28–90): a nearer node shows at the cap and fades out past 1.3 × it. */
export const FACE_CAP = 90;
/** While the camera dollies fast (the pull-back out of the match, the back-off into the twist) the cap lifts: those faces pass the lens. */
export const PASSING = { from: 0.04, to: 0.15, lift: 150 } as const;
/** How fast (world units a frame along the view axis) the camera moves at instant f. */
export const dollySpeed = (f: number): number => Math.abs(webCamera(f + 0.5).eye[2] - webCamera(f - 0.5).eye[2]);
/** The faces' size cap at instant f: FACE_CAP, lifted while the camera passes nodes at speed. */
export const faceCap = (f: number): number => FACE_CAP + PASSING.lift * smoothstep(PASSING.from, PASSING.to, dollySpeed(f));
/** Sparks per shower (three showers on the wall). */
export const SHOWER = 300;
/** The showers' life (f from the wall): each spark lives 10–20 f. */
export const SHOWER_LIFE = 20;

/** The web's picture at instant `f` through lens point `lens` (null: the pinhole). */
export function webPicture(f: number, lens: { x: number; y: number } | null = null): WebPicture {
  const cam = webCamera(f);
  const ap = apertureAt(f);
  const L: Lens = lens && ap > 0 ? { x: lens.x * ap, y: lens.y * ap, focus: focusDepth(cam) } : null;
  const P = NODES.map((n) => project(cam, n.p, L));
  const faces: FaceItem[] = [];
  const runs: TextRun[] = [];
  const strokes: Stroke[] = [];
  const sprites: Sprite[] = [];
  const out = frameOf(f);
  const scroll = scrollAt(f);
  const band = bandAt(f);
  const kick = pulse(f);

  // The galaxy dust, through the whole volume: dots that swell on the kicks (+20 %), soft when they pass close to the lens.
  // On every closed 16th 4 % of the specks twinkle (2 f).
  const hat = lastOf(HATS, out);
  const twinkle = out - hat < 2 ? hat : -1;
  DUST.forEach((d, k) => {
    const s = project(cam, d.p, L);
    if (!s || !onScreen(s.x, s.y, 40)) return;
    const r = d.r * s.k * (1 + 0.2 * kick);
    if (r < 0.6) return;
    const near = clamp((r - 6) / 30);
    const dead = scanned(f, s.y);
    const tw = twinkle >= 0 && hash(k, twinkle, 47) < 0.04 ? 2.4 : 1;
    sprites.push({ kind: 'blob', x: s.x, y: s.y, r: Math.min(r, 70) * (1 + near), rot: 0, ink: d.ink, gain: (0.5 + 0.5 * clamp(r / 3)) * (1 - 0.75 * near) * (dead ? 0.6 : 1) * tw });
  });

  // Filaments: his signature typeset along each, dim cyan; amber (dimmer than any arc) where the fuse has burned; dead under the scan.
  for (const e of EDGES) {
    const A = P[e.a];
    const B = P[e.b];
    if (!A || !B) continue;
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    if (len < 4 || len > 4200 || (!onScreen(A.x, A.y, 200) && !onScreen(B.x, B.y, 200) && !crosses(A, B))) continue;
    const h = runHeight((A.k + B.k) / 2);
    const lit = litFraction(e, f);
    const far = NODES[e.a].layer === 'far' && NODES[e.b].layer === 'far';
    const unlit: Ink = far ? 'violet' : 'cyan';
    const dim = far ? UNLIT.far : UNLIT.near;
    const u0 = (scroll + e.a * 3) % SIGNATURE_CYCLE;
    // Under the scan a strand is cut where the line crosses it (its type reaches h/2 above its line): above, dead; below, as it was.
    const level = deadAbove(f) - h / 2;
    const piece = (t0: number, t1: number, ink: Ink, alpha: number): void => {
      if (t1 - t0 < 1e-6) return;
      runs.push({ x0: lerp(A.x, B.x, t0), y0: lerp(A.y, B.y, t0), x1: lerp(A.x, B.x, t1), y1: lerp(A.y, B.y, t1), h, u0: u0 + (t0 * len) / (h * BYTE_ADVANCE), ink, alpha });
    };
    const style = (t0: number, t1: number, ink: Ink, alpha: number): void => {
      const dead = (t: number) => lerp(A.y, B.y, t) > level;
      const cross = A.y === B.y ? -1 : (level - A.y) / (B.y - A.y);
      const deadInk: Ink = far ? 'violet' : 'cyan';
      const deadAlpha = far ? DEAD_RUN * 0.7 : DEAD_RUN;
      if (cross <= t0 || cross >= t1) piece(t0, t1, ...(dead((t0 + t1) / 2) ? ([deadInk, deadAlpha] as const) : ([ink, alpha] as const)));
      else {
        piece(t0, cross, ...(dead((t0 + cross) / 2) ? ([deadInk, deadAlpha] as const) : ([ink, alpha] as const)));
        piece(cross, t1, ...(dead((cross + t1) / 2) ? ([deadInk, deadAlpha] as const) : ([ink, alpha] as const)));
      }
    };
    if (lit <= 0) style(0, 1, unlit, dim);
    else {
      style(0, lit, 'amber', far ? FUSE.far : FUSE.near);
      if (lit < 1) {
        style(lit, 1, unlit, dim);
        // The fuse's burning head: a spark running along the strand (under the arc that lit it).
        const my = lerp(A.y, B.y, lit);
        if (!far && my + h <= deadAbove(f)) sprites.push({ kind: 'blob', x: lerp(A.x, B.x, lit), y: my, r: h * 0.9, rot: 0, ink: 'core', gain: FUSE.head });
      }
    }
  }
  // On the match cut the strand through his node is the band itself, resolving into type over the first 16th.
  // It is bandProfile's light exactly as B draws it on its last frames: three soft capsules, one a gaussian.
  if (band > 0) for (const t of BAND_GAUSSIANS) strokes.push({ x0: -1400, y0: 0, x1: 1400, y1: 0, w: 2 * BAND_REACH * t.sigma, soft: BAND_REACH * t.sigma, ink: 'band', gain: t.gain * band });

  // Arcs: amber-white cores with a pink or cyan fringe; live 4 f then fading; the wall's end on the shield's surface.
  for (const arc of arcsAt(f)) {
    const A = P[arc.a];
    let B = P[arc.b];
    if (!A || !B) continue;
    if (Math.hypot(B.x - A.x, B.y - A.y) > 900 && arc.kind === 'hop') continue;
    if (arc.kind === 'wall') {
      const r = SHIELD_R;
      const dx = A.x - B.x;
      const dy = A.y - B.y;
      const d = Math.hypot(dx, dy) || 1;
      B = { ...B, x: B.x + (dx / d) * r, y: B.y + (dy / d) * r };
    }
    const g = arc.age < ARC_LIFE.live ? 1 : 0.35 * (1 - (arc.age - ARC_LIFE.live) / ARC_LIFE.fade);
    const { trunk, branches } = bolt([A.x, A.y], [B.x, B.y], arc.seed);
    const fringe: Ink = hash(arc.seed, 3) < 0.5 ? 'pink' : 'cyan';
    const w = arc.kind === 'wall' ? ARC.wall : ARC.width;
    // The fringe first, then the white-hot core over it (the branches a little thinner and cooler than the trunk).
    [trunk, ...branches].forEach((line, k) => {
      const t = k === 0 ? 1 : 0.7;
      for (let i = 1; i < line.length; i++) {
        const [x0, y0] = line[i - 1];
        const [x1, y1] = line[i];
        strokes.push({ x0, y0, x1, y1, w: 20 * t, soft: 10 * t, ink: fringe, gain: ARC.fringe * g });
        strokes.push({ x0, y0, x1, y1, w: Math.max(2, w * t), soft: 0, ink: 'core', gain: ARC.core * g * t });
      }
    });
  }

  // Nodes: a spiral impostor round a face; struck → ω with a pop, a Ctrl+V ghost and a spark burst; the scan plays them dead.
  const hp = P[0];
  let hero: WebPicture['hero'] = null;
  const cap = faceCap(f);
  const order = NODES.map((n) => n.i).filter((i) => P[i]).sort((a, b) => P[b]!.z - P[a]!.z);
  for (const i of order) {
    const n = NODES[i];
    const s = P[i]!;
    const em0 = nodeEm(n, s.k);
    // A node nearer than the design's em 90 shows at the cap and fades out past 1.3 × it (unless it is passing the lens).
    const em = Math.min(em0, cap);
    const w = em * 2.6;
    if (em0 > 2 * cap || !onScreen(s.x, s.y, w)) continue;
    const bob = n.role === 'hero' ? heroBob(f) : 0;
    const look = nodeLook(n, f, s.y + bob + nodeReach(em));
    const fade = n.role === 'hero' ? 1 : clamp(1 - (em0 - 1.3 * cap) / (0.5 * cap));
    if (fade <= 0.02) continue;
    const since = out - struckAt(n);
    const pop = n.role === 'host' && since >= 0 && since < 8 ? 1 + 0.25 * (1 - Math.min(1, launchL(since))) : 1;
    // He is lit like nobody else, except while he plays dead: then a host like the rest.
    const lit = n.role === 'hero' && !look.dead;
    const glow = look.glow * (lit ? 1 + 0.35 * kick : 1) * fade;
    if (em < 8) {
      sprites.push({ kind: 'blob', x: s.x, y: s.y, r: 3 + em * 0.7, rot: 0, ink: look.ink, gain: 0.9 * glow });
      continue;
    }
    sprites.push({ kind: 'spiral', x: s.x, y: s.y + bob, r: w * 0.72, rot: hash(n.i, 9) * Math.PI * 2 + (f - MATCH) * 0.012 * (hash(n.i, 10) < 0.5 ? 1 : -1), ink: look.ink, gain: (lit ? 0.75 : 0.42) * glow });
    const role: FaceItem['role'] = n.role === 'hero' ? 'hero' : n.role === 'defender' ? 'defender' : look.winking ? 'wink' : look.infected ? 'infected' : 'host';
    faces.push({ text: look.face, x: s.x, y: s.y + bob, em: em * pop, ink: look.ink, alpha: fade, glow: glow * (lit ? 1.5 : 1.15), role });
    // The Ctrl+V ghost: the newly infected face lands misregistered for 2 frames, snapping into place.
    if (n.role === 'host' && since >= 0 && since < 2) faces.push({ text: look.face, x: s.x + 9 * (1 - since / 2), y: s.y - 7 * (1 - since / 2), em: em * pop, ink: 'amber', alpha: 0.45 * fade, glow, role: 'ghost' });
    // The spark: a ✦ for 3 frames and a burst of six amber motes (under the arc that struck it).
    if (n.role === 'host' && since >= 0 && since < 3) {
      sprites.push({ kind: 'glint', x: s.x, y: s.y, r: Math.min(w * 0.5, 46), rot: 0, ink: 'core', gain: 0.6 * (1 - since / 3) });
      for (let k = 0; k < 6; k++) {
        const an = Math.PI * 2 * hash(n.i, k, 4);
        sprites.push({ kind: 'blob', x: s.x + Math.cos(an) * w * 0.35 * (since + 1), y: s.y + Math.sin(an) * w * 0.35 * (since + 1), r: 6, rot: 0, ink: 'amber', gain: 0.6 });
      }
    }
    if (n.role === 'hero') hero = { x: s.x, y: s.y + bob, em };
  }
  if (!hero && hp) hero = { x: hp.x, y: hp.y, em: nodeEm(NODES[0], hp.k) };

  // The wall: three spark showers glance off the shield (ballistic, cooling amber → pink), each from a white-hot splash where its arc
  // strikes. The sparks fly 150–600 px in the shower's life, fast ones first, each a streak along its velocity (the shutter's smear
  // does the rest), drag slowing them as gravity bends them down: the one big burst of the bar, on its highest note.
  const D = P[DEFENDER];
  const wt = f - WALL;
  if (D && wt >= 0 && wt < SHOWER_LIFE) {
    WALL_STRANDS.forEach((s, k) => {
      const A = P[s];
      if (!A) return;
      const an = Math.atan2(A.y - D.y, A.x - D.x);
      const ix = D.x + SHIELD_R * Math.cos(an);
      const iy = D.y + SHIELD_R * Math.sin(an);
      // The splash: a hot core and a wide amber bloom at the strike, gone in 6 f.
      if (wt < 6) {
        const g = env(wt, 6);
        sprites.push({ kind: 'blob', x: ix, y: iy, r: 70 + 40 * (1 - g), rot: 0, ink: 'amber', gain: 1.3 * g }, { kind: 'blob', x: ix, y: iy, r: 26, rot: 0, ink: 'core', gain: 1.6 * g });
        sprites.push({ kind: 'glint', x: ix, y: iy, r: 90 * g + 30, rot: hash(k, 9) * Math.PI, ink: 'core', gain: 1.2 * g });
      }
      // Glancing off: thrown back out of the shield (reflected about its surface), ballistic with drag.
      for (let i = 0; i < SHOWER; i++) {
        const a2 = an + (hash(k, i, 1) - 0.5) * 2.4;
        const v = 10 + 34 * hash(k, i, 2) ** 1.6;
        const life = 10 + 10 * hash(k, i, 6);
        if (wt >= life) continue;
        // Distance under drag (v e^{−t/τ}): s(t) = v τ (1 − e^{−t/τ}), τ 7 f; gravity 0.45 px/f².
        const tau = 7;
        const s = v * tau * (1 - Math.exp(-wt / tau));
        const sv = v * Math.exp(-wt / tau);
        const x = ix + Math.cos(a2) * s;
        const y = iy + Math.sin(a2) * s - 0.45 * wt * wt;
        const vx = Math.cos(a2) * sv;
        const vy = Math.sin(a2) * sv - 0.9 * wt;
        const u = wt / life;
        const ink: Ink = u < 0.3 ? (hash(k, i, 4) < 0.35 ? 'core' : 'amber') : u < 0.65 ? 'amber' : 'pink';
        const g = (1 - u) * (0.75 + 0.6 * hash(k, i, 3));
        strokes.push({ x0: x - vx * 1.4, y0: y - vy * 1.4, x1: x, y1: y, w: 2.4 + 2.2 * hash(k, i, 5) * (1 - u), soft: 0, ink, gain: g });
      }
    });
  }
  return { faces, runs, strokes, sprites, hero, defender: D ? { x: D.x, y: D.y, k: D.k } : null };
}

/** Where the overlay's red and the light grammar find things at output frame `out` (the pinhole camera); `node` asks for one more node. */
export function webAnchors(out: number, node = -1): { hero: [number, number] | null; defender: [number, number] | null; k: number; roll: number; heroParent: [number, number] | null; node: [number, number] | null } {
  const cam = webCamera(out);
  const at = (i: number): [number, number] | null => {
    const p = project(cam, NODES[i].p);
    return p ? [p.x, p.y] : null;
  };
  const d = project(cam, NODES[DEFENDER].p);
  return { hero: at(0), defender: d ? [d.x, d.y] : null, k: d?.k ?? 0, roll: cam.roll, heroParent: at(NODES[DEFENDER].parent), node: node >= 0 ? at(node) : null };
}

/** The closed 16ths that infect (the hops) and the hats' glints, for the light grammar. */
export const WEB_HATS: readonly number[] = HATS.filter((h) => h >= MATCH && h < cs(6));

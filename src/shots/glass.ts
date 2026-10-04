// The end of Drop 1 (the script of 2026-10-01): thrown at us, (•ω•)
// hits the glass on the last beat of club bar 4 — dying, (×ω×), squashed flat in
// the middle, the one face on the glass — and the screen cracks out from it;
// it hangs there trembling through the beat of silence, and on the break's
// downbeat (break 1.1) the glass breaks: real glass shards (the scene builds
// them, his face in pieces on them) fly out at the viewer. Also how the club
// scene photographs club bars 1–4 and break 1.1–1.2 (its sub-frames and
// shots). Screen px at 1080p, origin at the centre, y up. Every position is
// part-local (src/score/film.ts). Pure.
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Advance, typeset } from '../engine/typeset.ts';
import { scaleRGB } from '../engine/color.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import { FLIP, HIT, SMASH, THROW } from '../score/drop1.ts';
import { partFrame, seedFrame } from '../score/film.ts';
import { AT_GLASS, FORMATIONS, HERO, NEON, TUNNEL, frameOf } from './lines.ts';
import { FRONT } from './swiss.ts';

/** The hit; the faces settled half a beat later (the cracks still creaking); the glass breaking; the end of the preview (break 1.3). */
export const GLASS = { hit: HIT, silence: HIT + 12, shatter: SMASH, end: partFrame('break', 1, 2) } as const;

type V2 = [number, number];
/** A shard: its outline (screen px), its middle, its size, its ring (0 at the hit) and index. */
export type Shard = { pts: V2[]; c: V2; size: number; ring: number; k: number };

const RAYS = 15;
const RINGS = [0, 120, 290, 500, 760, 1180];
/** The cracks: rays from the hit, crossed by rings, each a little irregular; the cells between them are the shards. */
export const SHARDS: readonly Shard[] = (() => {
  const angle = Array.from({ length: RAYS }, (_, i) => ((i + 0.4 * (hash(i, 501) - 0.5)) / RAYS) * 2 * Math.PI);
  const at = (i: number, r: number): V2 => {
    const a = angle[i % RAYS] + (i >= RAYS ? 2 * Math.PI : 0);
    const rr = RINGS[r] * (0.86 + 0.28 * hash(i % RAYS, r, 502));
    return [Math.cos(a) * rr, Math.sin(a) * rr];
  };
  const out: Shard[] = [];
  for (let r = 0; r < RINGS.length - 1; r++) {
    for (let i = 0; i < RAYS; i++) {
      const pts = r === 0 ? [[0, 0] as V2, at(i, 1), at(i + 1, 1)] : [at(i, r), at(i, r + 1), at(i + 1, r + 1), at(i + 1, r)];
      const c: V2 = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
      out.push({ pts, c, size: RINGS[r + 1] - RINGS[r], ring: r, k: out.length });
    }
  }
  return out;
})();

/** His face at rest on the glass: its em (px) and how much wider than tall it is squashed; on the hit, squashed flatter still. */
const REST = { size: 360, stretch: 1.3 } as const;
const SQUASH = 2.2;

/**
 * His one face on the glass — dying, (×ω×) — trembling (a new jolt every two frames, between two frames' shutters); the cracks growing out
 * from it over four frames. The hit is a smack: he lands flat on the glass as wide as he flew in (AT_GLASS) and squashed to under half his
 * height, and springs back (no overshoot) to his resting face by the end of the half beat.
 */
export function glassFrame(f: number, advance: Advance): { light: FlatContent; cracks: Shape[] } {
  const glyphs: Glyph[] = [];
  const settle = smoothstep(GLASS.hit, GLASS.silence, f);
  const shake = lerp(4, 1, settle);
  const line = typeset(HERO.dying, advance);
  const t = Math.max(0, f - GLASS.hit);
  const k = Math.exp(-t / 2) * (1 + t / 2) * (1 - smoothstep(8, GLASS.silence - GLASS.hit, t));
  const across = REST.size * REST.stretch * (AT_GLASS / (REST.size * REST.stretch)) ** k;
  const stretch = REST.stretch * (SQUASH / REST.stretch) ** k;
  const size = across / stretch;
  const step = Math.floor(frameOf(seedFrame(f)) / 2);
  const jx = shake * (2 * hash(1, step, 506) - 1);
  const jy = shake * (2 * hash(2, step, 506) - 1);
  for (const ch of line.chars) {
    if (ch.ch.trim() === '') continue;
    glyphs.push({ ch: ch.ch, x: jx + (ch.x - line.width / 2) * across, y: jy, size, stretch, color: scaleRGB(NEON.amber, lerp(1.5, 1.15, settle)), tube: 0.012 });
  }
  const grow = smoothstep(GLASS.hit, GLASS.hit + 4, f);
  const cracks: Shape[] = [];
  const edge = (p0: V2, p1: V2, k: number) => {
    const x0 = p0[0] * grow;
    const y0 = p0[1] * grow;
    const x1 = p1[0] * grow;
    const y1 = p1[1] * grow;
    cracks.push({ kind: 'segment', x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: Math.hypot(x1 - x0, y1 - y0) + 2, h: 2.2, rot: Math.atan2(y1 - y0, x1 - x0), color: scaleRGB([0.6, 0.92, 1], 0.9 * (0.6 + 0.4 * hash(k, 507))) });
  };
  for (const sh of SHARDS) for (let i = 0; i < sh.pts.length; i++) edge(sh.pts[i], sh.pts[(i + 1) % sh.pts.length], sh.k * 7 + i);
  // A white smack on the frame of the hit.
  if (f < GLASS.hit + 3) cracks.push({ kind: 'ellipse', x: 0, y: 0, w: 1400, h: 1400, color: scaleRGB([1, 1, 1], 1.5 * (1 - (f - GLASS.hit) / 3)), soft: 700 });
  return { light: { under: [], glyphs: { neon: glyphs }, over: [] }, cracks };
}

/** The shards' glass: how deep it is (its middle on z = 0), and where its face decal lies — just in front of its bevelled front. */
export const SHARD_DEPTH = 22;
export const DECAL_Z = SHARD_DEPTH / 2 + 3.5;
/**
 * Where a point (x, y) of a resting shard's face decal samples the frozen glass (0–1): the decal lies DECAL_Z nearer the camera (at FRONT)
 * than the glass, so it shows FRONT / (FRONT − DECAL_Z) larger on screen; sampling at that magnified point keeps every stroke exactly
 * where it was on the frame before the break.
 */
export function decalUV(x: number, y: number): [number, number] {
  const k = FRONT / (FRONT - DECAL_Z);
  return [(x * k + 960) / 1920, (y * k + 540) / 1080];
}

/** Where corner `pt` of shard `s`'s face lands on screen at `f` (px), through the camera at FRONT; null once the shard has passed it. */
export function shardCorner(s: Shard, pt: V2, f: number): V2 | null {
  const m = shardFlight(s, f);
  if (m.z >= FRONT - 40) return null;
  // The face's corner turned as three.js turns the shard (Euler XYZ: Rx · Ry · Rz), then moved with it.
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(m.rx), Math.sin(m.rx), Math.cos(m.ry), Math.sin(m.ry), Math.cos(m.rz), Math.sin(m.rz)];
  const [x0, y0, z0] = [pt[0] - s.c[0], pt[1] - s.c[1], DECAL_Z];
  const [x1, y1] = [x0 * cz - y0 * sz, x0 * sz + y0 * cz];
  const [x2, z2] = [x1 * cy + z0 * sy, -x1 * sy + z0 * cy];
  const [y3, z3] = [y1 * cx - z2 * sx, y1 * sx + z2 * cx];
  const k = FRONT / (FRONT - (m.z + z3));
  return [(s.c[0] + m.x + x2) * k, (s.c[1] + m.y + y3) * k];
}

/** The fastest any shard corner on screen moves at `f` (px a frame). */
const shardSpeed = (f: number): number => {
  let v = 0;
  for (const s of SHARDS) {
    for (const pt of s.pts) {
      const a = shardCorner(s, pt, f);
      const b = shardCorner(s, pt, f + 1e-3);
      if (a && b && Math.abs(a[0]) < 1100 && Math.abs(a[1]) < 700) v = Math.max(v, Math.hypot(b[0] - a[0], b[1] - a[1]) / 1e-3);
    }
  }
  return v;
};

const shutter = (samples: number, open: number): Temporal => ({ samples, shutter: open, persistence: 0 });
/** Sub-frames through the tunnel, by frame from club 1.1 (dancers streaming past at up to ~2000 px a frame, slowing as he nears). */
const TUNNEL_SAMPLES = (t: number): number => (t < 28 ? 176 : t < 40 ? 128 : 80);
/** Sub-frames on each frame of a formation's snap on club 2.1 and 2.3, from its kick: lines spin round and swing in at up to ~1700 px a frame. */
const SNAP_SAMPLES: readonly number[] = [288, 400, 288, 176, 112, 80, 48, 32];
/** How far apart consecutive sub-frames may print a moving shard (px): no further than its bright bevel is wide. */
const SHARD_STEP = 3;

/**
 * How the club photographs output frame `frame`: wherever the picture moves fast, enough sub-frames that consecutive ones move nothing by
 * more than a tube's stroke (a tenth of its em), so it blurs instead of printing copies — the tunnel, each formation's snap, the cracks
 * racing out on the hit, the shards flying at (and past) the camera; the throw starts on a long shutter, its flight on a short one keeps his
 * panicking face readable. Flat frames cost well under a millisecond a sub-frame.
 */
export function clubTemporal(frame: number): Temporal {
  if (frame >= TUNNEL.from && frame < TUNNEL.to + 4) return shutter(TUNNEL_SAMPLES(frame - TUNNEL.from), 0.5);
  for (const at of FORMATIONS.slice(1)) if (frame >= at && frame < at + SNAP_SAMPLES.length) return shutter(SNAP_SAMPLES[frame - at], 0.5);
  if (frame >= FLIP && frame < FLIP + 14) return shutter(32, 0.75);
  if (frame >= THROW.from && frame < THROW.to) return shutter(24, 0.4);
  if (frame >= GLASS.hit && frame < GLASS.hit + 5) return shutter(96, 0.5);
  if (frame >= GLASS.shatter) {
    // As many as the fastest corner on screen anywhere in the shutter needs (a shard is fastest just before it passes the camera).
    const open = 0.6;
    const fastest = Math.max(...Array.from({ length: 9 }, (_, i) => shardSpeed(Math.max(GLASS.shatter, frame + (i / 8 - 0.5) * open))));
    return shutter(Math.min(1024, Math.max(64, 16 * Math.ceil((1.2 * fastest * open) / SHARD_STEP / 16))), open);
  }
  return shutter(24, 0.5);
}

/** The club's shots — sub-frames never mix them: the lines (club 1.1 to the hit), the glass (the hit to the break), the shards. */
export function clubSegment(frame: number): Segment {
  if (frame < GLASS.hit) return { from: TUNNEL.from, to: GLASS.hit };
  if (frame < GLASS.shatter) return { from: GLASS.hit, to: GLASS.shatter };
  return { from: GLASS.shatter, to: GLASS.end };
}

/** How shard `s` has flown at `f` (from break 1.1): towards us and out, turning; z in px towards the camera. */
export function shardFlight(s: Shard, f: number): { x: number; y: number; z: number; rx: number; ry: number; rz: number } {
  const t = Math.max(0, f - GLASS.shatter);
  const r = Math.hypot(s.c[0], s.c[1]) + 1;
  const speed = 0.6 + 0.8 * hash(s.k, 511) + (s.ring === 0 ? 0.6 : 0);
  const z = speed * (16 * t + 1.6 * t * t);
  const out = (4 + 10 * hash(s.k, 512)) * t;
  return { x: (s.c[0] / r) * out, y: (s.c[1] / r) * out - 0.5 * t * t * hash(s.k, 513), z, rx: (hash(s.k, 514) - 0.5) * 0.07 * t, ry: (hash(s.k, 515) - 0.5) * 0.07 * t, rz: (hash(s.k, 516) - 0.5) * 0.04 * t };
}

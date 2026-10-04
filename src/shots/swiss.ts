// Shots S05–S08 (the part 'swiss', 5 bars: the Swiss world) as pure functions of the frame; positions are swiss-local
// (src/score/film.ts). Bars 1–14 design: notes/b112/final.md §3.6–3.10 and §4.4–4.6; build sheet notes/b114/sheet.md §3.6–3.10.
//
//   swiss 1  S05  THE LENS: T1's red contracts into the antivirus's lens; Müller-Brockmann arcs print round it and step on the kicks;
//                 he pastes himself together from Saul Bass cut paper on the eighths; the lens slides onto his right eye; he blinks.
//   swiss 2  S06  the split 1 → 4 → 16 → 64 (v04's mechanics), recast with real faces; the lens swells over him; red L-ticks
//                 re-acquire his oval on every split; six innocent cells and his print red.
//   swiss 3  S07a the glass (•ω•): its first 72 frames are v04's swiss 3 frame for frame (the identity gate G2); a third hit on 3.4
//                 turns him toward us instead of v04's whip-off; the disc breathes into the iris.
//   swiss 4  S07B THE SCAN: the lens irises open into the antivirus's X-ray POV (src/scenes/swiss.ts maps it on the backplate the
//                 glass refracts); the reticle hops the 12 columns on the 32nds, pings dead on him and reads `0 threats ✓`; a hard cut
//                 back to colour on 4.3 with him dead-on and the red disc behind him; red bar 3 through him; the anchored pull.
//   swiss 5  S08  INFECTION: a Swiss poster of 114 faces and its own type; a Warhol silkscreen wave turns every card into him but the
//                 guest's; the antivirus quarantines three copies, which revive as Four-Marilyns 2×2s; T2 (src/transitions) turns it over.
//
// `world` is drawn on the poster plane through the shot camera, `overlay` in screen space over it; `pieces` are S05's cut paper (drawn
// with the world, knocked out to paper inside `knock`); S07 adds the glass face, S07B the POV plate (`pov`: X-ray, iris, stamps), a
// HUD over the glass (`hud`) and the readout (readoutAt, drawn once per output frame by the scene's screenOverlay).
// Every bars 1–14 addition sits behind its BUILD_THREADS flag (src/content/build.ts); off, the shot draws v04's picture there.
import { type Kaomoji, PROTAGONIST, SHUT, faceWidth, kaomoji, layoutFace } from '../actors/cast.ts';
import {
  ARCS,
  BASS_CUT,
  BASS_PIECES,
  BASS_STRIPS,
  BUILD_THREADS,
  type BuildThreads,
  DEFENDER_POV,
  DISC as LENS,
  GLASS_TYPE,
  GUEST,
  GUEST_PULSE,
  HERO_BLINK,
  HIT3_POSE,
  IRIS_RING,
  LABELS,
  OMEGA_AT,
  POV_GRID,
  REACQUIRE_TICKS,
  S05_FROM as LENS_FROM,
  S08_CARDS,
  S08_HERO,
  S08_ZOOM,
  SCAN_DRIFT,
  SILK,
  STRIP_MOVES,
  SWISS_SMALL_PRINT,
  TINTS,
  TYPE_CARD,
  type Tint,
  CLEAN,
  marilyn,
  povReadout,
  reticleX,
} from '../content/build.ts';
import { READOUT_SLOT } from '../content/boot.ts';
import { S06_HOSTS, S08_FACES } from '../content/castBuild.ts';
import { type Pose, fillDistance, frontal } from '../engine/camera.ts';
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp, prog, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { DEFAULT_TEMPORAL, type Segment, type Temporal } from '../engine/temporal.ts';
import { type Advance, typeset } from '../engine/typeset.ts';
import type { Look } from '../engine/types.ts';
import { type Aim, aimPose, hop, launch, moveTrack, slam, strike, within } from '../motion/hit.ts';
import {
  ARC_BLOWOUT,
  ARC_PRINT,
  ARC_STEPS,
  BLINK_WAVE_V04,
  BUILD_START,
  DISC_BREATH,
  DISC_LAND,
  FLIP,
  GLASS_TURN,
  GREY,
  GUEST_RING,
  HATS,
  HIT3,
  HOPS,
  INFECT,
  IRIS,
  LENS_TRACK,
  PIECES,
  PING,
  PING_RING,
  PULL,
  PULL_EXIT,
  PULL_FADE,
  QUARANTINE,
  REACQUIRE,
  RED_CELL,
  RETICLE,
  RETURN,
  REVIVE,
  RIPPLE_V04,
  ROW_RULE,
  RULES,
  S05_BLINK,
  S05_BLINK_V04,
  S06_HOP,
  S07_TRUCK,
  S08_DRIFT,
  SIG_SWISS,
  SLIDE,
  SPLITS,
  SPLIT_STAGGER,
  STRIPS_OUT,
  SWEEPS,
  XRAY_MOVES,
  ZERO_THREATS,
  blinkFrame,
  infectFrame,
} from '../score/build.ts';
import { partFrame } from '../score/film.ts';
import { FRAMES_PER_BAR, FRAMES_PER_BEAT, TOTAL_BARS, barFrame, barOfFrame } from '../score/tempo.ts';
import { INK, PAPER, SWISS_RED, swissLook } from '../worlds/swiss.ts';
import { faceGlyphs, rule, textGlyphs, textWidth } from './common.ts';

export const FOV = 20;
/** The frontal camera sees exactly the 1920 × 1080 poster. */
export const FRONT = fillDistance(1080, FOV);
const HALF_DIAGONAL = Math.hypot(960, 540);

/**
 * Advances (ems) of the Swiss atlases, measured in the browser. `mono` (the POV's JetBrains Mono) and `bullet` (where the • glyph's
 * ink is deepest, in ems from its quad's centre, y up: the lens tracks his right eye's centre) are optional: tests may leave them out.
 */
export type SwissLayout = { jp: Advance; display: Advance; text: Advance; mono?: Advance; bullet?: readonly [number, number] };
export type Glyphs = { jp: Glyph[]; display: Glyph[]; text: Glyph[]; mono: Glyph[] };
export type Layer = { under: Shape[]; glyphs: Glyphs; over: Shape[] };
/** Where S07's glass face is and how it is turned (world units = logical px at the poster plane; radians). */
export type GlassPose = { x: number; y: number; z: number; rx: number; ry: number; rz: number; scale: number };
/** One of S05's Saul Bass cut-paper pieces: a glyph of the jp atlas with a ragged edge, on the poster plane. */
export type BassPiece = { ch: string; x: number; y: number; size: number; rot: number; sx: number; sy: number; seed: number };
/** An ellipse on the poster plane (centre, half-axes). */
export type Ellipse = { x: number; y: number; rx: number; ry: number };
/** The cut paper this frame: ink outside `knock`, paper inside it (he knocks out where the lens's red is under him). */
export type Pieces = { list: BassPiece[]; knock: Ellipse | null };
/**
 * The antivirus's POV on the backplate (swiss 4.1–4.3): 'full' X-ray, 'lite' the colour plate with its red scanlines, 'hud' no plate
 * change at all (the hops as a HUD only). `iris`: the lens opening (screen px, y up; X-ray inside r, a red annulus outside it); null once
 * it has left the frame. `crawl`: the scanlines' offset (px). `stamps`: the `clean ✓` stamps, drawn on the plate after the X-ray, so
 * those behind him bend through the glass.
 */
export type Pov = { mode: 'full' | 'lite' | 'hud'; iris: { x: number; y: number; r: number } | null; crawl: number; stamps: Layer };
export type SwissFrame = {
  camera: Pose;
  world: Layer;
  overlay: Layer;
  glass: GlassPose | null;
  /** How much of the glass shows over its backplate (1 = all; the glass dissolves into his card face in the pull). */
  glassFade: number;
  pieces: Pieces | null;
  pov: Pov | null;
  /** Screen-space shapes over the glass (the reticle, the ping); null when empty. */
  hud: Layer | null;
};

/** The Swiss part's bar `bar` (1-based), plus `beat` beats (0-based). */
const swiss = (bar: number, beat = 0): number => partFrame('swiss', bar, beat);

const layer = (): Layer => ({ under: [], glyphs: { jp: [], display: [], text: [], mono: [] }, over: [] });
const push = (list: Shape[], s: Shape | null): void => {
  if (s) list.push(s);
};
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** The output frame a sub-frame belongs to (a discrete change seen through the whole shutter). */
const frameOf = (f: number): number => Math.floor(f + 0.5);

/** The screen-space zoom by `k` about (cx, cy): S07B's push and pull scale the poster and its layers about his ω together. */
const about = (k: number, x: number, y: number, cx = OMEGA_AT[0], cy = OMEGA_AT[1]): [number, number] => [cx + (x - cx) * k, cy + (y - cy) * k];

// ——— Colours ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** His amber (the only amber in Swiss: his S08 card). */
export const AMBER: RGB = linear('#FFB23E');
const TINT_RGB: Readonly<Record<Tint | 'grey', RGB>> = { pink: linear(TINTS.pink), blue: linear(TINTS.blue), yellow: linear(TINTS.yellow), grey: linear(TINTS.grey) };
export const BONE: RGB = linear(DEFENDER_POV.bone);
export const GROUND: RGB = linear(DEFENDER_POV.ground);
const READOUT_GROUND: RGB = linear(READOUT_SLOT.ground);

// ——— S05 (swiss bar 1): the lens, the arcs, the cut paper ————————————————————————————————————————————————————————————————————————

/** v04's disc (BUILD_THREADS.lens off): where it landed, and its radius there. The lens (on) is src/content/build.ts DISC. */
export const V04_DISC = { x: 470, y: 205, r: 330 } as const;
/** The protagonist of S05: a giant face on the bottom rule, `bleed` of its width cropped by the left edge. */
export const ROW = { bleed: 0.08, y: -250, size: 440, rule: -505 } as const;
/** Swiss motion is precise: tighter overshoot (spec §3.1 rule 5). */
export const SWISS_BOUNCE = 0.6;

/** `a` moved so that its view stays inside the poster (no rule or cell ever ends inside the frame), and never wider than the poster. */
export const clampAim = (a: Aim): Aim => {
  const zoom = Math.max(1, a.zoom);
  const mx = 960 * (1 - 1 / zoom);
  const my = 540 * (1 - 1 / zoom);
  return { zoom, x: clamp(a.x, -mx, mx), y: clamp(a.y, -my, my), roll: 0 };
};

/** v04's poster camera on swiss 1.1, inside the red (lens off). */
const V04_S05_FROM = { zoom: 1.42, x: -190, y: -145 } as const;
/** Where S05 hands the poster camera to S06 on swiss 2.1 (unchanged by the lens). */
export const S05_TO = { zoom: 1.025 ** 4, x: -48, y: -40 } as const;

/**
 * The poster camera through S05–S06 (spec §3.1 rule 2): never still. Through S05 a linear glide (zoom geometric) from S05_FROM to S05_TO
 * — with the lens from the design's {1.22, 50, −30}, so the lens lands 142 px from the centre (E5b); without it from v04's. Through
 * S06 it pushes in (2.5% a beat), drifting towards the protagonist's quarter of the grid. Always inside the poster.
 */
export function posterAim(frame: number, threads: BuildThreads = BUILD_THREADS): Aim {
  const b = Math.max(0, (frame - BUILD_START) / 24);
  if (b < 4) {
    const from = threads.lens ? LENS_FROM : V04_S05_FROM;
    const u = b / 4;
    return clampAim({ zoom: from.zoom * (S05_TO.zoom / from.zoom) ** u, x: lerp(from.x, S05_TO.x, u), y: lerp(from.y, S05_TO.y, u), roll: 0 });
  }
  const s06 = b - 4;
  return clampAim({ zoom: 1.025 ** b, x: S05_TO.x + 22 * s06, y: S05_TO.y + 16 * s06, roll: 0 });
}
const posterCam = (frame: number, threads: BuildThreads): Pose => aimPose(posterAim(frame, threads), FRONT, FOV);

/** The poster's 12 × 12 module grid (160 × 90 px): 22 thin rules in groups, one group per eighth note (verticals left to right, then horizontals bottom to top, rising from the row). */
const RULE_GROUPS: readonly (readonly (readonly ['v' | 'h', number])[])[] = [
  [['v', 1], ['v', 2], ['v', 3]],
  [['v', 4], ['v', 5], ['v', 6]],
  [['v', 7], ['v', 8], ['v', 9]],
  [['v', 10], ['v', 11]],
  [['h', 11], ['h', 10], ['h', 9], ['h', 8]],
  [['h', 7], ['h', 6], ['h', 5], ['h', 4]],
  [['h', 3], ['h', 2], ['h', 1]],
];
const THIN = 0.16;

/**
 * The pen that draws S05's rules (secondary motion on the hats, spec §3.1 rule 6): a rule is drawn at an even speed over `draw` frames
 * by a bold head with a fading tail (each step: how far back from the tip, and its alpha), which runs on past the rule's end until it
 * has drained out.
 */
export const PEN = { draw: 12, width: 8, tail: [[160, 1], [320, 0.55], [480, 0.25]] } as const;

/** Rule (x0, y0) → (x1, y1) as the pen draws it from `start` on (axis-aligned). */
function penRule(frame: number, start: number, x0: number, y0: number, x1: number, y1: number, width: number, alpha: number | undefined, out: Shape[]): void {
  const t = frame - start;
  push(out, rule(x0, y0, x1, y1, width, clamp(t / PEN.draw), INK, alpha));
  const len = Math.hypot(x1 - x0, y1 - y0);
  const tip = (t / PEN.draw) * len;
  if (t <= 0 || tip - PEN.tail[PEN.tail.length - 1][0] >= len) return;
  const [ux, uy] = [(x1 - x0) / len, (y1 - y0) / len];
  let near = 0;
  for (const [far, a] of PEN.tail) {
    const s0 = Math.max(0, tip - far);
    const s1 = Math.min(len, tip - near);
    near = far;
    if (s1 <= s0) continue;
    const mid = (s0 + s1) / 2;
    out.push({ kind: 'rect', x: x0 + ux * mid, y: y0 + uy * mid, w: Math.abs(ux) * (s1 - s0) + Math.abs(uy) * PEN.width, h: Math.abs(uy) * (s1 - s0) + Math.abs(ux) * PEN.width, color: INK, alpha: a });
  }
}

/** The 22 thin module rules, drawn by the pen group by group on the eighths (one frame after the one before in its group): the verticals rise from the bottom, the horizontals run left to right; they run past the frame, so no camera move shows an end. */
function moduleRules(frame: number, alpha: number, out: Shape[]): void {
  RULE_GROUPS.forEach((group, g) =>
    group.forEach(([dir, i], k) => {
      if (dir === 'v') penRule(frame, RULES[g] + k, -960 + 160 * i, -640, -960 + 160 * i, 640, 1.5, alpha, out);
      else penRule(frame, RULES[g] + k, -1100, 540 - 90 * i, 1100, 540 - 90 * i, 1.5, alpha, out);
    }),
  );
}

/** x of the protagonist's centre in S05: its left edge `ROW.bleed` of its width past the frame. */
export const rowX = (L: SwissLayout): number => -960 + (0.5 - ROW.bleed) * faceWidth(PROTAGONIST, L.jp) * ROW.size;

/** His right eye (the screen-right •, the eye T1 entered) assembled in S05: where its ink is deepest, on the poster plane. */
export function rightEye(L: SwissLayout): [number, number] {
  const eye = layoutFace(PROTAGONIST, L.jp)[3];
  const [bx, by] = L.bullet ?? [0, 0];
  return [rowX(L) + (eye.dx + bx) * ROW.size, ROW.y + by * ROW.size];
}

/** The lens's breath on every kick once it has landed (2.5 %, gone in a few frames). */
const kickBreath = (frame: number): number => (frame >= DISC_LAND.to ? 0.025 * Math.exp(-mod(frame - BUILD_START, 24) / 4) : 0);

/**
 * The lens (BUILD_THREADS.lens): on swiss 1.1 it still covers the frame (T1's red) through that frame's shutter; it launches on the
 * downbeat — v04's disc waited half a frame, which left frame 481 as red as 480, a dead frame — three quarters of the way in 3 frames,
 * settling with a small overshoot at the design's (150, 30), r 300 (142 px from the centre on screen); it breathes on every kick, and on
 * 1.4 slides (launch τ 3) onto his right eye.
 */
export function lensAt(frame: number, L: SwissLayout): { x: number; y: number; r: number } {
  const p = launch(frame, DISC_LAND.from, { tau: 2.5, bounce: SWISS_BOUNCE });
  const t = launch(frame, LENS_TRACK, { tau: 3, bounce: SWISS_BOUNCE });
  const [ex, ey] = rightEye(L);
  const r = lerp(1.05 * HALF_DIAGONAL, LENS.r, p) * (1 + kickBreath(frame));
  return { x: lerp(lerp(0, LENS.x, p), ex, t), y: lerp(lerp(0, LENS.y, p), ey, t), r };
}

/** v04's disc (lens off): as the lens, at v04's place and radius, and it never tracks him. */
function v04Disc(frame: number): { x: number; y: number; r: number } {
  const p = launch(frame, DISC_LAND.from + 0.5, { tau: 2.5, bounce: SWISS_BOUNCE });
  const r = lerp(1.05 * HALF_DIAGONAL, V04_DISC.r, p) * (1 + kickBreath(frame));
  return { x: lerp(0, V04_DISC.x, p), y: lerp(0, V04_DISC.y, p), r };
}

const discShape = (d: { x: number; y: number; r: number }): Shape => ({ kind: 'ellipse', x: d.x, y: d.y, w: 2 * d.r, h: 2 * d.r, color: SWISS_RED });

/**
 * Müller-Brockmann's arcs (src/content/build.ts ARCS): ring k is 4 + k black segments over the fan −35° … +150° with gaps of 8–20°
 * (hashed per ring), as [start, end] in degrees (counter-clockwise from +x, y up).
 */
export const ARC_SEGMENTS: readonly (readonly (readonly [number, number])[])[] = ARCS.radii.map((_, k) => {
  const n = ARCS.segments(k);
  const gaps = Array.from({ length: n - 1 }, (_, i) => ARCS.gapDeg[0] + (ARCS.gapDeg[1] - ARCS.gapDeg[0]) * hash(k, i, 31));
  const weights = Array.from({ length: n }, (_, i) => 0.4 + hash(k, i, 32));
  const fan = ARCS.fanDeg[1] - ARCS.fanDeg[0];
  const scale = (fan - gaps.reduce((a, b) => a + b, 0)) / weights.reduce((a, b) => a + b, 0);
  let a = ARCS.fanDeg[0];
  return weights.map((w, i) => {
    const seg: [number, number] = [a, a + w * scale];
    a += w * scale + (gaps[i] ?? 0);
    return seg;
  });
});
/** How many of the rings draw (the design's stills fallback is ARCS.fallbackRings). */
export const ARC_RINGS = ARCS.radii.length;
/** The swiss 1 hats the arcs breathe on. */
const ARC_HATS = HATS.filter((h) => h < swiss(2));

/** An arc of radius r, width w, from a0 to a1 (radians) about (cx, cy), as tangent rects ≤ 1.5° each, overlapped by 3 px past their anti-aliased ends (no seams; the ink is opaque, so the overlaps never show). */
function arcRects(cx: number, cy: number, r: number, w: number, a0: number, a1: number, color: RGB, out: Shape[]): void {
  const span = a1 - a0;
  if (span <= 1e-6) return;
  const n = Math.max(1, Math.ceil(span / ((1.5 * Math.PI) / 180)));
  const d = span / n;
  const chord = 2 * r * Math.sin(d / 2) + w * Math.tan(d / 2) + 3;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i + 0.5) * d;
    out.push({ kind: 'rect', x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), w: chord, h: w, rot: a + Math.PI / 2, color });
  }
}

/**
 * The arcs round the lens at `c`: ring k prints outward from ARC_PRINT[k] (its segments sweeping open over 4 frames), steps ±11° on the
 * kicks of 1.2 and 1.3 (alternate rings opposite ways; launch τ 1.5, no bounce: an aperture clicking), tightens to 92 % as the lens
 * tracks him, focuses on the hats (a pulse in and back, ARC_FOCUS) and blows out (×1.6, fading) over 576–582.
 */
function arcs(frame: number, c: { x: number; y: number }, out: Shape[]): void {
  if (frame < ARC_PRINT[0]) return;
  const blow = frame >= ARC_BLOWOUT.from ? prog(frame, ARC_BLOWOUT.from, ARC_BLOWOUT.to, ease.outCubic) : 0;
  const fade = frame >= ARC_BLOWOUT.from ? prog(frame, ARC_BLOWOUT.from, ARC_BLOWOUT.to, ease.linear) : 0;
  if (fade >= 1) return;
  const tighten = 1 - (1 - ARCS.tighten) * launch(frame, LENS_TRACK, { tau: 3, bounce: 0 });
  const hat = ARC_HATS.filter((h) => h <= frame).pop();
  const breath = 1 - (hat === undefined ? 0 : ARC_FOCUS.depth * focusPulse(frame - hat));
  const color = mixRGB(INK, PAPER, fade);
  for (let k = 0; k < ARC_RINGS; k++) {
    const pk = clamp((frame - ARC_PRINT[k]) / 4);
    if (pk <= 0) continue;
    let rot = 0;
    ARC_STEPS.forEach((s, m) => {
      rot += ((k + m) % 2 ? -1 : 1) * ARCS.stepDeg * launch(frame, s, { tau: 1.5, bounce: 0 });
    });
    const r = ARCS.radii[k] * tighten * breath * (1 + (ARCS.blowOut - 1) * blow);
    for (const [a0, a1] of ARC_SEGMENTS[k]) {
      const from = ((a0 + rot) * Math.PI) / 180;
      arcRects(c.x, c.y, r, ARCS.widths[k], from, from + (((a1 - a0) * pk) * Math.PI) / 180, color, out);
    }
  }
}

/**
 * The arcs focus on the hats: the rings pull in by `depth` and spring back, peaking `peak` frames after the hat (the design's 1 % breath
 * made an aperture's focusing pulse, so the off-beats of S05 move as its kicks do; measured: S05 read 4.8 mean motion without it).
 */
export const ARC_FOCUS = { depth: 0.03, peak: 2 } as const;
const focusPulse = (t: number): number => (t <= 0 ? 0 : (t / ARC_FOCUS.peak) * Math.exp(1 - t / ARC_FOCUS.peak));

const PIECE_FROM = { left: [-1, 0], top: [0, 1], bottom: [0, -1], right: [1, 0] } as const;
/** Frames a cut-paper piece flies in (an impact: easing in, landing exactly on its eighth: a whole eighth, so one is always in flight) and how far it comes from. */
export const PIECE_FLIGHT = { lead: 12, distance: 1100 } as const;
/** He is whole on 1.4 (the last piece): from there the assembled face floats and breathes (a living hold). */
const ASSEMBLED = PIECES[PIECES.length - 1];

/**
 * S05's cut paper (Saul Bass): his five pieces, each an impact from its side landing exactly on its eighth (PIECES), assembled where
 * v04's protagonist sat (ROW). While a piece moves it jitters on twos (±2 px, ±1°, re-rolled every second output frame); its landing
 * frame is crisp, then it squashes 5 % against its direction for 5 frames. Whole, the face floats and breathes; its eyes squash shut for
 * the blink (S05_BLINK).
 */
export function bassPieces(frame: number, L: SwissLayout): BassPiece[] {
  const parts = layoutFace(PROTAGONIST, L.jp);
  const x0 = rowX(L);
  const breathe = breatheAt(frame);
  const float = floatAt(frame);
  const shut = frame >= S05_BLINK && frame < S05_BLINK + 6 ? 1 - 0.9 * Math.sin((Math.PI * (frame - S05_BLINK)) / 6) : 1;
  const out: BassPiece[] = [];
  BASS_PIECES.forEach((p, i) => {
    const at = PIECES[i];
    if (frame < at - PIECE_FLIGHT.lead) return;
    const u = slam(frame, at, PIECE_FLIGHT.lead, 0);
    const [dx, dy] = PIECE_FROM[p.from];
    const moving = frame < at;
    const j = Math.floor(frameOf(frame) / BASS_CUT.onTwos);
    const jit = (n: number) => (moving ? (hash(at, j, n) - 0.5) * 2 : 0);
    const since = frame - at;
    const sq = since >= 0 && since < 5 ? 0.05 * Math.sin((Math.PI * since) / 5) : 0;
    const horizontal = dx !== 0;
    out.push({
      ch: p.ch,
      x: x0 + parts[i].dx * ROW.size * breathe + dx * PIECE_FLIGHT.distance * (1 - u) + BASS_CUT.jitterPx * jit(1),
      y: ROW.y + float + dy * PIECE_FLIGHT.distance * (1 - u) + BASS_CUT.jitterPx * jit(2),
      size: ROW.size * breathe,
      rot: ((BASS_CUT.jitterDeg * Math.PI) / 180) * jit(3),
      sx: horizontal ? 1 - sq : 1 + sq,
      sy: (horizontal ? 1 + sq : 1 - sq) * (parts[i].role === 'eye' ? shut : 1),
      seed: i + 1,
    });
  });
  return out;
}

/** v04's protagonist (lens off): it launches in from the left on swiss 1.3 (a small overshoot), breathes and floats, and blinks on 1.4. */
function protagonistS05(frame: number, L: SwissLayout, out: Glyph[]): void {
  if (frame < SLIDE.from) return;
  const width = faceWidth(PROTAGONIST, L.jp) * ROW.size;
  const x = lerp(-960 - width / 2 - 60, rowX(L), launch(frame, SLIDE.from, { tau: 3, bounce: SWISS_BOUNCE }));
  const t = frame - SLIDE.from;
  const size = ROW.size * (1 + 0.008 * Math.sin((2 * Math.PI * t) / 48));
  const y = ROW.y + 4 * Math.sin((2 * Math.PI * t) / FRAMES_PER_BAR);
  const shut = frame >= S05_BLINK_V04 && frame < S05_BLINK_V04 + 6;
  out.push(...faceGlyphs(PROTAGONIST, { x, y, size, advance: L.jp, ink: () => INK, edit: (part, g) => (part.role === 'eye' && shut ? { ...g, ch: SHUT } : g) }));
}

/** The corner counter types on from swiss 1.1e; the poster's title from 2 frames after swiss 1.1a, its footer from 2 frames after swiss 1.2e. */
const COUNTER_FROM = swiss(1, 0.25);
const TITLE_FROM = swiss(1, 0.75) + 2;
const FOOTER_FROM = swiss(1, 1.25) + 2;
/** The counter's "/61": the film's length in bars (the map's). */
const OF_BARS = `/${TOTAL_BARS}`;

/**
 * The corner counter shows the real (film) bar number (spec §15 gag 6), typed on from COUNTER_FROM in paper on an ink tab (so it reads
 * over the grids of S06 and S08); each new number rolls up into place from its downbeat. v04's: drawn only with `cleanCorner` off (N3:
 * on, the corner stays clear).
 */
function counter(frame: number, L: SwissLayout, o: Layer): void {
  const typed = Math.floor(frame - COUNTER_FROM) + 1;
  if (typed <= 0) return;
  const size = 34;
  const right = 880;
  const y = 470;
  const bar = barOfFrame(frame);
  const roll = frame >= swiss(2) ? clamp(launch(frame, barFrame(bar), { tau: 1.5, bounce: 0 })) : 1;
  const x = right - textWidth(OF_BARS, size, L.display);
  const num = (b: number) => String(b).padStart(2, '0');
  const tab = (textWidth(`00${OF_BARS}`, size, L.display) + 24) * prog(frame, COUNTER_FROM, COUNTER_FROM + 6, ease.outExpo);
  // The tab runs down under the numbers to hold four beat squares; it stays a tab over the grid (the camera flows, so no grid cell stays put under it).
  const tabH = 1.35 * size + 24;
  o.under.push({ kind: 'rect', x: right + 12 - tab / 2, y: y - 12, w: tab, h: tabH, color: INK });
  // Four beat squares under the numbers, the current beat's lit: secondary motion, a step a beat (spec §3.1 rule 6).
  const beat = Math.floor((((frame % FRAMES_PER_BAR) + FRAMES_PER_BAR) % FRAMES_PER_BAR) / FRAMES_PER_BEAT);
  if (tab > 60) for (let i = 0; i < 4; i++) o.over.push({ kind: 'rect', x: right - (3 - i) * 14 - 5, y: y - 0.68 * size - 6, w: 10, h: 10, color: PAPER, alpha: i === beat ? 1 : 0.3 });
  o.glyphs.display.push(...textGlyphs(OF_BARS, { x: right, y, size, color: PAPER, advance: L.display, align: 1, count: typed - 2 }));
  o.glyphs.display.push(...textGlyphs(num(bar), { x, y: y - (1 - roll) * 0.7 * size, size, color: PAPER, advance: L.display, align: 1, alpha: roll, count: typed }));
  if (roll < 1) o.glyphs.display.push(...textGlyphs(num(bar - 1), { x, y: y + roll * 0.7 * size, size, color: PAPER, advance: L.display, align: 1, alpha: 1 - roll }));
}

/**
 * Poster type: the title top left (typed from TITLE_FROM) and a footer bottom right (typed from FOOTER_FROM, two characters a frame);
 * A7 (BUILD_THREADS.slugs): the signature as Swiss small print 24 px left of the footer, typed two characters a frame from SIG_SWISS.
 * All leave as the grid splits into 64 cells, whose faces fill the corners.
 */
function labels(frame: number, L: SwissLayout, threads: BuildThreads, out: Glyph[]): void {
  const stay = 1 - prog(frame, SPLITS[3], SPLITS[3] + 6, ease.linear);
  if (stay <= 0) return;
  out.push(...textGlyphs(LABELS.title, { x: -880, y: 470, size: 26, color: INK, advance: L.text, alpha: stay, count: Math.floor(frame - TITLE_FROM) + 1 }));
  // Bottom right: the giant protagonist of S05 fills the bottom left.
  out.push(...textGlyphs(LABELS.footer, { x: 880, y: -478, size: 20, color: INK, advance: L.text, align: 1, alpha: 0.75 * stay, count: 2 * Math.floor(frame - FOOTER_FROM) + 2 }));
  if (threads.slugs && frame >= SIG_SWISS.from) {
    const right = 880 - textWidth(LABELS.footer, 20, L.text) - SWISS_SMALL_PRINT.gap;
    out.push(...textGlyphs(LABELS.sig, { x: right, y: SWISS_SMALL_PRINT.baseline, size: SWISS_SMALL_PRINT.px, color: INK, advance: L.text, align: 1, alpha: SWISS_SMALL_PRINT.alpha * stay, count: 2 * Math.floor(frame - SIG_SWISS.from) + 2 }));
  }
}

/** The screen-space overlay every Swiss shot shares: the labels, and (v04, `cleanCorner` off) the corner counter. */
function overlayText(frame: number, L: SwissLayout, threads: BuildThreads): Layer {
  const o = layer();
  if (!threads.cleanCorner) counter(frame, L, o);
  labels(frame, L, threads, o.glyphs.text);
  return o;
}

const noGlass = { glass: null, glassFade: 1, pov: null, hud: null } as const;

function s05(frame: number, L: SwissLayout, threads: BuildThreads): SwissFrame {
  const world = layer();
  moduleRules(frame, THIN, world.under);
  penRule(frame, ROW_RULE, -1100, ROW.rule, 1100, ROW.rule, 5, undefined, world.under);
  if (!threads.lens) {
    world.under.push(discShape(v04Disc(frame)));
    protagonistS05(frame, L, world.glyphs.jp);
    return { camera: posterCam(frame, threads), world, overlay: overlayText(frame, L, threads), pieces: null, ...noGlass };
  }
  const lens = lensAt(frame, L);
  arcs(frame, frame >= LENS_TRACK ? lens : LENS, world.under);
  world.under.push(discShape(lens));
  const pieces: Pieces = { list: bassPieces(frame, L), knock: { x: lens.x, y: lens.y, rx: lens.r, ry: lens.r } };
  return { camera: posterCam(frame, threads), world, overlay: overlayText(frame, L, threads), pieces, ...noGlass };
}

// ——— S06 (swiss bar 2): the grid splits on every beat, 1 → 4 → 16 → 64 cells, every face a different one ——————————————————————

/** Level of the S06 grid at `frame`: 2^level cells per side; each level shows from its beat (its faces burst out on it). */
export const levelAt = (frame: number): number => Math.max(0, SPLITS.filter((f) => f <= frame).length - 1);
const cellW = (level: number) => 1920 / 2 ** level;
const cellH = (level: number) => 1080 / 2 ** level;
/** Centre of cell (col, row) of `level` (world units, y up). */
export const cellCentre = (level: number, col: number, row: number): [number, number] => [-960 + (col + 0.5) * cellW(level), 540 - (row + 0.5) * cellH(level)];
/** Em of face `k` in a cell of `level`: 88% of the cell's width, at most 45% of its height; at one cell the protagonist overflows the frame by 4% a side. */
export const cellFaceSize = (k: Kaomoji, level: number, L: SwissLayout): number =>
  level === 0 ? (1.08 * 1920) / faceWidth(k, L.jp) : Math.min(0.45 * cellH(level), (0.88 * cellW(level)) / faceWidth(k, L.jp));

/** The child of cell (col, row) nearest the frame's centre (ties: right before left, top before bottom): where that cell's face goes when it splits. */
export function anchorChild(level: number, col: number, row: number): [number, number] {
  let best: [number, number] = [2 * col + 1, 2 * row];
  let bestD = Infinity;
  for (const [dx, dy] of [[1, 0], [0, 0], [1, 1], [0, 1]] as const) {
    const [x, y] = cellCentre(level + 1, 2 * col + dx, 2 * row + dy);
    const d = Math.hypot(x, y);
    if (d < bestD - 1e-6) {
      bestD = d;
      best = [2 * col + dx, 2 * row + dy];
    }
  }
  return best;
}

/** The level-3 cell a face of cell (col, row) at `level` ends up in. */
export function anchorLeaf(level: number, col: number, row: number): [number, number] {
  let c = col;
  let r = row;
  for (let l = level; l < 3; l++) [c, r] = anchorChild(l, c, r);
  return [c, r];
}

/** The protagonist's cell in the 8 × 8 grid: (4, 3), next to the middle. */
export const HERO_LEAF = anchorLeaf(0, 0, 0);

/** A host face of the cast as a rig: every character a part (whitespace kept for the typesetting, never drawn). */
export const castFace = (text: string): Kaomoji => kaomoji(text, 'm'.repeat([...text].length));
const dropSpace = (_: unknown, g: Glyph): Glyph | null => (g.ch.trim() === '' ? null : g);

/**
 * Who ends in each level-3 cell (the S06 cast, src/content/castBuild.ts S06_HOSTS): him in HERO_LEAF; each level's hosts, in order,
 * to the cells that level adds — the cells that are not their parent's anchor child — nearest the frame's centre first (ties: right
 * before left, top before bottom), each carried to its anchor leaf as the grid splits on.
 */
export const S06_CAST: ReadonlyMap<string, Kaomoji> = (() => {
  const m = new Map<string, Kaomoji>([[`${HERO_LEAF[0]},${HERO_LEAF[1]}`, PROTAGONIST]]);
  const lists = [S06_HOSTS.level1, S06_HOSTS.level2, S06_HOSTS.level3];
  for (let level = 1; level <= 3; level++) {
    const n = 2 ** level;
    const fresh: [number, number][] = [];
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const [ac, ar] = anchorChild(level - 1, Math.floor(col / 2), Math.floor(row / 2));
        if (ac !== col || ar !== row) fresh.push([col, row]);
      }
    }
    const d = ([c, r]: [number, number]) => Math.hypot(...cellCentre(level, c, r));
    fresh.sort((a, b) => d(a) - d(b) || b[0] - a[0] || a[1] - b[1]);
    const hosts = lists[level - 1];
    if (hosts.length !== fresh.length) throw new Error(`S06: level ${level} adds ${fresh.length} cells, the cast has ${hosts.length} hosts`);
    fresh.forEach(([c, r], i) => {
      const [lc, lr] = anchorLeaf(level, c, r);
      m.set(`${lc},${lr}`, castFace(hosts[i]));
    });
  }
  return m;
})();

/** Face of whoever ends in level-3 cell (col, row): the cast's (S06_CAST), him in his cell. */
export const leafFace = (col: number, row: number): Kaomoji => S06_CAST.get(`${col},${row}`)!;

/** Level-3 cells printed red, their faces reversed out in paper; they and the protagonist's cell land red together on the last eighth. */
export const RED_LEAVES: readonly (readonly [number, number])[] = [[1, 1], [6, 0], [2, 5], [7, 3], [5, 6], [3, 7]];

/** When level-3 cell (col, row) turns red, or null. */
function redAt(col: number, row: number): number | null {
  if (col === HERO_LEAF[0] && row === HERO_LEAF[1]) return RED_CELL;
  return RED_LEAVES.some(([c, r]) => c === col && r === row) ? RED_CELL : null;
}

/** Idle hops of the S06 faces (secondary motion, spec §3.1 rule 6): each face hops once a beat, alternate cells on the off-beat, never on a split's beat or after the red. */
function hopY(frame: number, level: number, col: number, row: number): number {
  if (level === 0) return 0;
  const phase = ((col + row) % 2) * 12;
  const land = phase + 24 * Math.ceil((frame - phase) / 24);
  if (SPLITS.includes(land) || land > RED_CELL) return 0;
  return 0.05 * cellH(level) * hop(frame, land, 6);
}

/** The red oval behind the protagonist at `level`, holding its whole face (reversed out in paper); at one cell, S05's disc swollen over the whole frame. */
function heroOval(level: number, L: SwissLayout, size: number): [number, number] {
  if (level === 0) return [2.2 * HALF_DIAGONAL, 2.2 * HALF_DIAGONAL];
  return [1.15 * faceWidth(PROTAGONIST, L.jp) * size, Math.min(0.95 * cellH(level), 1.35 * size)];
}

/** Where the red was on S05's last frame (swiss 1.4&'s end): the lens on his eye, or v04's disc. */
const s05Red = (L: SwissLayout, threads: BuildThreads) => (threads.lens ? lensAt(SPLITS[0] - 1, L) : V04_DISC);

/** The protagonist's red: S05's lens swelling over the whole frame at one cell (from its 575 place), then an oval that follows its face into each new cell, shrinking as the face does. */
function heroRed(level: number, L: SwissLayout, threads: BuildThreads, x: number, y: number, size: number, move: number): Ellipse {
  if (level === 0) {
    const from = s05Red(L, threads);
    const r = lerp(from.r, 1.1 * HALF_DIAGONAL, move);
    return { x: lerp(from.x, 0, move), y: lerp(from.y, 0, move), rx: r, ry: r };
  }
  const [w0, h0] = heroOval(level - 1, L, cellFaceSize(PROTAGONIST, level - 1, L));
  const [w1, h1] = heroOval(level, L, cellFaceSize(PROTAGONIST, level, L));
  return { x, y, rx: lerp(w0, w1, move) / 2, ry: lerp(h0, h1, move) / 2 };
}
const ovalShape = (e: Ellipse): Shape => ({ kind: 'ellipse', x: e.x, y: e.y, w: 2 * e.rx, h: 2 * e.ry, color: SWISS_RED });

/** The re-acquire ticks (BUILD_THREADS.reacquire): on each split after the first, four red L-ticks snap round his oval from 12 px out. */
function ticks(frame: number, level: number, oval: Ellipse, out: Shape[]): void {
  if (level === 0) return;
  const at = REACQUIRE[level - 1];
  if (frame < at) return;
  const T = REACQUIRE_TICKS;
  const o = 8 + T.from * (1 - launch(frame, at, { tau: 1.5, bounce: 0 }));
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const x = oval.x + sx * (oval.rx + o);
    const y = oval.y + sy * (oval.ry + o);
    out.push({ kind: 'rect', x: x - (sx * T.arm) / 2, y, w: T.arm, h: T.width, color: SWISS_RED });
    out.push({ kind: 'rect', x, y: y - (sy * T.arm) / 2, w: T.width, h: T.arm, color: SWISS_RED });
  }
}

/**
 * The giant face's hop on swiss 2.1& (BUILD_THREADS.reacquire): 8 px up and back down over the 8 frames before the hat, landing on it
 * (so 2.1& itself moves: v04's dead frame there is gone), then a 2 % squash over the 6 frames after.
 */
function s06Hop(frame: number): { dy: number; squash: number } {
  const t = frame - S06_HOP;
  const squash = t > 0 && t < 6 ? REACQUIRE_TICKS.hopSquash * Math.sin((Math.PI * t) / 6) : 0;
  return { dy: REACQUIRE_TICKS.hopPx * hop(frame, S06_HOP, 8), squash };
}
/** S05's living hold (the assembled face breathes 0.8 % on 48 frames and floats 4 px on a bar), carried on by the giant face of S06's first beat. */
const breatheAt = (frame: number): number => (frame > ASSEMBLED ? 1 + 0.008 * Math.sin((2 * Math.PI * (frame - ASSEMBLED)) / 48) : 1);
const floatAt = (frame: number): number => (frame > ASSEMBLED ? 4 * Math.sin((2 * Math.PI * (frame - ASSEMBLED)) / FRAMES_PER_BAR) : 0);

/**
 * S06's faces at `frame`, with the red cells and the protagonist's red under them. On each split every face bursts into its anchor
 * child on the beat and three new ones grow out of it, up to SPLIT_STAGGER frames apart. At one cell (with the lens) he is S05's cut
 * paper, moving to the centre and reversing out where the swelling lens is under him.
 */
function s06Cells(frame: number, L: SwissLayout, threads: BuildThreads, w: Layer): Pieces | null {
  const level = levelAt(frame);
  const n = 2 ** level;
  let pieces: Pieces | null = null;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const [lc, lr] = anchorLeaf(level, col, row);
      const face = leafFace(lc, lr);
      const [x1, y1] = cellCentre(level, col, row);
      let x = x1;
      let y = y1;
      let size = cellFaceSize(face, level, L);
      let move = launch(frame, SPLITS[level], { tau: 3, bounce: SWISS_BOUNCE });
      if (level === 0) {
        x = lerp(rowX(L), x1, move);
        y = lerp(ROW.y, y1, move);
        size = lerp(ROW.size, size, move);
      } else {
        const pc = Math.floor(col / 2);
        const pr = Math.floor(row / 2);
        const [px, py] = cellCentre(level - 1, pc, pr);
        const [ac, ar] = anchorChild(level - 1, pc, pr);
        const anchor = ac === col && ar === row;
        const k = anchor ? 0 : (1 + (((col % 2) + 2 * (row % 2)) % 3)) * (SPLIT_STAGGER / 3);
        move = launch(frame, SPLITS[level] + k, { tau: 2.5, bounce: SWISS_BOUNCE });
        x = lerp(px, x1, move);
        y = lerp(py, y1, move);
        size = anchor ? lerp(cellFaceSize(face, level - 1, L), size, move) : size * Math.max(0, move);
      }
      y += hopY(frame, level, col, row);
      if (size < 1) continue;
      const hero = lc === HERO_LEAF[0] && lr === HERO_LEAF[1];
      const red = level === 3 ? redAt(lc, lr) : null;
      if (red !== null) {
        const p = launch(frame, red, { tau: 2, bounce: 0 });
        if (p > 0) {
          const [cx, cy] = cellCentre(3, lc, lr);
          const full = cellW(3) - 6;
          w.under.push({ kind: 'rect', x: cx - full / 2 + (full * p) / 2, y: cy, w: full * p, h: cellH(3) - 6, color: SWISS_RED });
        }
      }
      if (hero) {
        const oval = heroRed(level, L, threads, x, y, size, move);
        w.under.push(ovalShape(oval));
        if (threads.reacquire) ticks(frame, level, oval, w.over);
        if (level === 0 && threads.lens) {
          // His cut paper, carried from S05's row to the centre; the swelling lens knocks him out to paper; the hop on 2.1&.
          const h = threads.reacquire ? s06Hop(frame) : { dy: 0, squash: 0 };
          const s = size * breatheAt(frame);
          const list = layoutFace(PROTAGONIST, L.jp).map((p, i) => ({
            ch: p.ch,
            x: x + p.dx * s,
            y: y + floatAt(frame) + h.dy,
            size: s,
            rot: 0,
            sx: 1 + h.squash,
            sy: 1 - h.squash,
            seed: i + 1,
          }));
          pieces = { list, knock: oval };
          continue;
        }
      }
      // Reversed out in paper, over a few frames, once the red is under the face.
      const start = SPLITS[0];
      const reverse = Math.max(hero ? prog(frame, start + 1, start + 7, ease.inOutSine) : 0, red !== null ? prog(frame, red, red + 4, ease.inOutSine) : 0);
      const ink = mixRGB(INK, PAPER, reverse);
      w.glyphs.jp.push(...faceGlyphs(face, { x, y, size, advance: L.jp, ink: () => ink, edit: dropSpace }));
    }
  }
  return pieces;
}

/** S06's bold rules: at each split the new halving lines grow out from the frame's centre lines, landing on the beat. */
function cellRules(frame: number, out: Shape[]): void {
  for (let level = 1; level <= 3; level++) {
    const p = launch(frame, SPLITS[level], { tau: 2, bounce: 0 });
    if (p <= 0) continue;
    const width = [0, 3, 2.5, 2][level];
    for (let k = 1; k < 2 ** level; k += 2) {
      out.push({ kind: 'rect', x: -960 + k * cellW(level), y: 0, w: width, h: 1240 * p, color: INK });
      out.push({ kind: 'rect', x: 0, y: 540 - k * cellH(level), w: 2200 * p, h: width, color: INK });
    }
  }
}

function s06(frame: number, L: SwissLayout, threads: BuildThreads): SwissFrame {
  const world = layer();
  const settle = prog(frame, SPLITS[0], SPLITS[0] + 12, ease.linear);
  moduleRules(frame, lerp(THIN, 0.07, settle), world.under);
  push(world.under, rule(-1100, ROW.rule, 1100, ROW.rule, 5, 1, INK, 1 - settle));
  if (threads.lens) arcs(frame, s05Red(L, threads), world.under);
  const pieces = s06Cells(frame, L, threads, world);
  cellRules(frame, world.under);
  return { camera: posterCam(frame, threads), world, overlay: overlayText(frame, L, threads), pieces, ...noGlass };
}

// ——— The S08 poster (S07 looks at it 40 times closer) ————————————————————————————————————————————————————————————————————————————

export const GRID = { cols: 16, rows: 9, cell: 120, face: 40 } as const;
export const HERO_CARD = S08_HERO;
/** S07 looks at the protagonist's mouth 40 times closer than S08 does … */
export const ZOOM = 40;
/** … with the mouth 330 px below the centre, cropped by the bottom edge, so the "150" has the top half. */
const MOUTH_Y = -330;
/** Centre of card (col, row) of the S08 grid (world units, y up). */
export const cardAt = (col: number, row: number): [number, number] => [(col + 0.5) * GRID.cell - 960, 540 - (row + 0.5) * GRID.cell];

/** Em of the face in a card: GRID.face, or less for a wide face, so every face keeps clear of its neighbours (86 % of the card). */
export const cardFaceSize = (k: Kaomoji, L: SwissLayout): number => Math.min(GRID.face, (0.86 * GRID.cell) / faceWidth(k, L.jp));

/** The protagonist's mouth in the grid: S07 looks at it, S07B re-aims it onto OMEGA_AT, and the pull is anchored on it. */
export function mouthAt(L: SwissLayout): [number, number] {
  const [x, y] = cardAt(HERO_CARD[0], HERO_CARD[1]);
  const mouth = layoutFace(PROTAGONIST, L.jp).find((p) => p.role === 'mouth')!;
  return [x + mouth.dx * cardFaceSize(PROTAGONIST, L), y];
}

/** The type cards' em: cap height TYPE_CARD.cap (Inter Tight's caps are 0.7275 em). */
export const TYPE_EM = TYPE_CARD.cap / 0.7275;
/** The glyph's 'middle' sits this many ems above the caps' centre (measured on the 864 still): the type cards drop by it, optically centred. */
const TYPE_DROP = 0.075;
/** A host of the poster: his card, the guest's, a type card's character or a face of the cast. */
const CARDS_BY_KEY = new Map(S08_CARDS.map((c) => [`${c.col},${c.row}`, c]));
export const s08Card = (col: number, row: number) => CARDS_BY_KEY.get(`${col},${row}`)!;
const CARD_FACES = new Map(S08_CARDS.filter((c) => c.kind === 'face').map((c) => [`${c.col},${c.row}`, castFace(c.text)]));
const GUEST_FACE = castFace(GUEST);
const HERO_BLINK_FACE = kaomoji(HERO_BLINK, 'bemeb');

/** The face a card shows before the wave (or for good, with the infection off: v04's ripple swaps it for another face of the cast). */
function hostFace(col: number, row: number, frame: number, threads: BuildThreads): Kaomoji | null {
  const c = s08Card(col, row);
  if (c.kind !== 'face') return null;
  if (!threads.infection && frame >= rippleV04(col, row)) {
    const i = S08_FACES.indexOf(c.text);
    return castFace(S08_FACES[(i + 57) % S08_FACES.length]);
  }
  return CARD_FACES.get(`${col},${row}`)!;
}

/** v04's ripple (BUILD_THREADS.infection off): from swiss 5.1&, 0.9 frames a card from his. */
const rippleV04 = (col: number, row: number): number => RIPPLE_V04 + 0.9 * Math.hypot(col - HERO_CARD[0], row - HERO_CARD[1]);

/** A copy of him (or his own card's face), blinking with the wave: (•ω•) → (-ω-) → (•ω•) for 3 frames from blinkFrame. */
const copyFace = (frame: number, col: number, row: number, threads: BuildThreads): Kaomoji => {
  const at = threads.infection ? blinkFrame(col, row) : BLINK_WAVE_V04 + 0.7 * (col + row);
  return frame >= at && frame < at + 3 ? HERO_BLINK_FACE : PROTAGONIST;
};

/** The quarantine's grey (stepped, as a print: four steps over GREY). */
const greyAt = (frame: number): number => (frame < GREY.from ? 0 : Math.round(clamp((frame - GREY.from) / (GREY.to - GREY.from)) * 4) / 4);

export type PosterOpts = { amber: number; threads: BuildThreads };

/**
 * The S08 poster on the poster plane (as built: 16 × 9 cards of 120 px, hairline rules). His card (8, 4) amber (`amber` of it: it
 * prints in during the pull), ink (•ω•); the guest's (12, 2) DEFENDER red, (￣▽￣) reversed out, never infected; the headline and
 * footer type cards; 114 faces. The Warhol wave (BUILD_THREADS.infection): a card prints on its step (infectFrame) over 3 frames — the
 * tint wipes in from the edge facing his card with a 2 px ghost the other way, the face swaps to him on the middle frame printed 3 px
 * off register, a 6 px hop lands on the third. The quarantine: red cut-paper strips fly round three copies (882 → 888), which go grey;
 * on 900 the strips fly off and each reprints as a Four-Marilyns 2×2. The blink wave runs from his card (blinkFrame).
 */
function poster(frame: number, L: SwissLayout, w: Layer, o: PosterOpts): void {
  const { threads } = o;
  for (let i = 1; i < GRID.cols; i++) w.under.push({ kind: 'rect', x: -960 + i * GRID.cell, y: 0, w: 1.5, h: 1280, color: INK, alpha: 0.22 });
  for (let j = 1; j < GRID.rows; j++) w.under.push({ kind: 'rect', x: 0, y: 540 - j * GRID.cell, w: 2200, h: 1.5, color: INK, alpha: 0.22 });
  const sq = SILK.tint;
  for (let row = 0; row < GRID.rows; row++) {
    for (let col = 0; col < GRID.cols; col++) {
      const c = s08Card(col, row);
      // The corner: under v04's counter tab nothing; with the corner clear (N3), a blank card the wave prints like the rest.
      if (c.kind === 'counter' && !threads.cleanCorner) continue;
      const [x, y0] = cardAt(col, row);
      if (c.kind === 'hero') {
        if (o.amber > 0) w.under.push({ kind: 'rect', x, y: y0, w: sq, h: sq, color: mixRGB(PAPER, AMBER, o.amber) });
        const face = threads.infection ? copyFace(frame, col, row, threads) : PROTAGONIST;
        w.glyphs.jp.push(...faceGlyphs(face, { x, y: y0, size: cardFaceSize(PROTAGONIST, L), advance: L.jp, ink: () => INK }));
        continue;
      }
      if (c.kind === 'guest') {
        const y = y0 + GUEST_PULSE.hop * hop(frame, GUEST_RING.from + 6, 6);
        w.under.push({ kind: 'rect', x, y, w: sq, h: sq, color: SWISS_RED });
        w.glyphs.jp.push(...faceGlyphs(GUEST_FACE, { x, y, size: cardFaceSize(GUEST_FACE, L), advance: L.jp, ink: () => PAPER, edit: dropSpace }));
        if (frame >= GUEST_RING.from && frame < GUEST_RING.to) {
          const t = (frame - GUEST_RING.from) / (GUEST_RING.to - GUEST_RING.from);
          const r = lerp(GUEST_PULSE.r[0], GUEST_PULSE.r[1], t);
          w.over.push({ kind: 'ring', x, y, w: 2 * r, h: 2 * r, r: GUEST_PULSE.width, color: SWISS_RED, alpha: 1 - t });
        }
        continue;
      }
      const base = (y: number) => {
        if (c.kind === 'face') {
          const f = hostFace(col, row, frame, threads)!;
          w.glyphs.jp.push(...faceGlyphs(f, { x, y, size: cardFaceSize(f, L), advance: L.jp, ink: () => INK, edit: dropSpace }));
        } else if (threads.typeCards) {
          w.glyphs.display.push(...textGlyphs(c.text, { x, y: y - TYPE_DROP * TYPE_EM, size: TYPE_EM, color: INK, advance: L.display, align: 0.5 }));
        }
      };
      if (!threads.infection) {
        const y = y0 + (c.kind === 'face' ? 10 * hop(frame, rippleV04(col, row), 6) : 0);
        base(y);
        continue;
      }
      const at = infectFrame(col, row);
      const t = frame - at;
      if (t < 0) {
        base(y0);
        continue;
      }
      const y = y0 + SILK.hop * hop(frame, at + SILK.frames, SILK.frames);
      const tint = c.tint!;
      const q = c.quarantine === true;
      if (q && frame >= REVIVE) {
        // Revived: a Four-Marilyns 2×2 of him (12 copies over the three cards), never red or amber, blinking with the wave.
        w.under.push({ kind: 'rect', x, y, w: sq, h: sq, color: PAPER });
        marilyn(col, row).forEach((m, k) => {
          if (frame < REVIVE + 0.75 * k) return;
          if (m.tint !== 'paper') w.under.push({ kind: 'rect', x: x + m.dx, y: y + m.dy, w: 56, h: 56, color: TINT_RGB[m.tint] });
          const ink = m.ink === 'ink' ? INK : PAPER;
          w.glyphs.jp.push(...faceGlyphs(copyFace(frame, col, row, threads), { x: x + m.dx + m.off[0], y: y + m.dy + m.off[1], size: 20 * (cardFaceSize(PROTAGONIST, L) / GRID.face), advance: L.jp, ink: () => ink }));
        });
      } else {
        const grey = q ? greyAt(frame) : 0;
        const color = mixRGB(TINT_RGB[tint], TINT_RGB.grey, grey);
        // The squeegee: the tint wipes in from the edge facing his card, its 2 px ghost the other way.
        const wipe = clamp((t + 1) / SILK.frames);
        const dx = col - S08_HERO[0];
        const dy = row - S08_HERO[1];
        let rx = x;
        let ry = y;
        let rw = sq;
        let rh = sq;
        if (Math.abs(dx) >= Math.abs(dy)) {
          rw = sq * wipe;
          rx = dx > 0 ? x - sq / 2 + rw / 2 : x + sq / 2 - rw / 2;
        } else {
          rh = sq * wipe;
          ry = dy > 0 ? y + sq / 2 - rh / 2 : y - sq / 2 + rh / 2;
        }
        w.under.push({ kind: 'rect', x: rx - SILK.ghost, y: ry + SILK.ghost, w: rw, h: rh, color, alpha: 0.45 });
        w.under.push({ kind: 'rect', x: rx, y: ry, w: rw, h: rh, color });
        if (t < 1) base(y);
        else {
          const ink0 = tint === 'blue' ? PAPER : INK;
          const ink = mixRGB(ink0, mixRGB(INK, PAPER, 0.6), grey);
          w.glyphs.jp.push(...faceGlyphs(copyFace(frame, col, row, threads), { x: x + SILK.off[0], y: y + SILK.off[1], size: cardFaceSize(PROTAGONIST, L), advance: L.jp, ink: () => ink }));
        }
      }
      if (q) strips(frame, col, row, x, y0, w.over);
    }
  }
}

/** The antivirus's Saul Bass strips round a quarantined copy: they fly in from 40 px out (an impact on 888) and fly off on the revival. */
function strips(frame: number, col: number, row: number, x: number, y: number, out: Shape[]): void {
  if (frame < QUARANTINE.in || frame >= STRIPS_OUT.to) return;
  const flyIn = STRIP_MOVES.flyIn * (1 - slam(frame, QUARANTINE.at, QUARANTINE.at - QUARANTINE.in, 0));
  const off = launch(frame, STRIPS_OUT.from, { tau: 2, bounce: 0 });
  const alpha = 1 - prog(frame, STRIPS_OUT.from, STRIPS_OUT.to, ease.linear);
  for (const s of BASS_STRIPS) {
    const [nx, ny] = s.side === 'top' ? [0, 1] : s.side === 'bottom' ? [0, -1] : s.side === 'left' ? [-1, 0] : [1, 0];
    const k = flyIn + STRIP_MOVES.flyOut * off;
    const turn = (hash(col, row, nx, ny) < 0.5 ? -1 : 1) * STRIP_MOVES.turn * off;
    out.push({ kind: 'rect', x: x + s.x + nx * k, y: y + s.y + ny * k, w: s.w, h: s.h, rot: s.rot + turn, color: SWISS_RED, alpha });
  }
}

// ——— S07a (swiss bar 3): the glass, its first 72 frames v04's ———————————————————————————————————————————————————————————————————

const S07_RATE = 200 / (S07_TRUCK.to - S07_TRUCK.from);
/**
 * Screen shift (px) of the poster in S07: the camera trucks steadily at v04's slope (200 px over S07_TRUCK, the mouth from 100 px left
 * of centre), to the third hit (HIT3); from there it decelerates (τ 10) and comes to rest on the iris.
 */
export function truck(frame: number): number {
  if (frame < HIT3) return -100 + 200 * clamp((frame - S07_TRUCK.from) / (S07_TRUCK.to - S07_TRUCK.from));
  const at = -100 + 200 * ((HIT3 - S07_TRUCK.from) / (S07_TRUCK.to - S07_TRUCK.from));
  return at + S07_RATE * HIT3_POSE.truckTau * (1 - Math.exp(-(Math.min(frame, IRIS) - HIT3) / HIT3_POSE.truckTau));
}
/** S07's slow push on top of the truck: 1 % a beat, at rest from the iris. */
const s07Push = (frame: number): number => 1.01 ** (Math.max(0, Math.min(frame, IRIS) - swiss(3)) / 24);

function s07Camera(frame: number, L: SwissLayout): Pose {
  const [mx, my] = mouthAt(L);
  return frontal(FRONT / ZOOM / s07Push(frame), mx - truck(frame) / ZOOM, my - MOUTH_Y / ZOOM, FOV);
}

/** The poster's zoom under the X-ray (at rest), and from the hard cut back the groove's push: 2.5 % a beat about OMEGA_AT. */
const REST_ZOOM = ZOOM * s07Push(IRIS);
const returnPush = (frame: number): number => (frame < RETURN ? 1 : (1 + SCAN_DRIFT.push) ** ((Math.min(frame, PULL.from) - RETURN) / 24));

/** The pull (swiss 4.4&): strike τ 2.5, normalised to land exactly on swiss 5.1 (the poster square, his card under his ω). */
export const pullAt = (frame: number): number => clamp(strike(frame, PULL.from, 2.5, 0) / strike(PULL.to, PULL.from, 2.5, 0));

/**
 * The poster camera from the iris to the pull's landing: where his printed ω (mouthAt) sits on screen and how much the poster is
 * magnified. Under the X-ray (768–810, inOutSine) the scanner re-aims the ω from S07's (truck, −330) onto OMEGA_AT, at rest; from the
 * hard cut the push; from 852 the pull straight back about the ω (it drifts the last fraction of a pixel to land the poster square).
 */
export function scanView(frame: number, L: SwissLayout): { zoom: number; x: number; y: number } {
  const [ax, ay] = mouthAt(L);
  if (frame < RETURN) {
    const u = prog(frame, XRAY_MOVES.from, XRAY_MOVES.to, ease.inOutSine);
    const p = s07Push(IRIS);
    return { zoom: REST_ZOOM, x: lerp(truck(IRIS) * p, OMEGA_AT[0], u), y: lerp(MOUTH_Y * p, OMEGA_AT[1], u) };
  }
  const z0 = REST_ZOOM * returnPush(frame);
  if (frame < PULL.from) return { zoom: z0, x: OMEGA_AT[0], y: OMEGA_AT[1] };
  const p = pullAt(frame);
  return { zoom: z0 * (1 / z0) ** p, x: lerp(OMEGA_AT[0], ax, p), y: lerp(OMEGA_AT[1], ay, p) };
}
const scanCamera = (frame: number, L: SwissLayout): Pose => {
  const v = scanView(frame, L);
  const [ax, ay] = mouthAt(L);
  return frontal(FRONT / v.zoom, ax - v.x / v.zoom, ay - v.y / v.zoom, FOV);
};
/** How much S07's screen layers (and the glass) are scaled about OMEGA_AT: 1 until the hard cut, then with the push and the pull. */
const layerZoom = (frame: number, L: SwissLayout): number => (frame < RETURN ? 1 : scanView(frame, L).zoom / REST_ZOOM);

/** The disc in S07 (screen px): v04's place on the truck, breathing r 300 → 330 into the iris, then slid onto OMEGA_AT under the X-ray. */
export function s07Disc(frame: number): { x: number; y: number; r: number } {
  const at = (f: number) => ({ x: 100 + 0.6 * truck(f), y: 40 });
  if (frame < IRIS) {
    const r = lerp(IRIS_RING.breathe[0], IRIS_RING.breathe[1], prog(frame, DISC_BREATH.from, DISC_BREATH.to - 1, ease.inOutSine));
    return { ...at(frame), r };
  }
  const c = at(IRIS - 1);
  const u = prog(frame, XRAY_MOVES.from, XRAY_MOVES.to, ease.inOutSine);
  return { x: lerp(c.x, OMEGA_AT[0], u), y: lerp(c.y, OMEGA_AT[1], u), r: IRIS_RING.open[0] };
}

/** v04's giant "150": 460 px, its em box's centre at y 340; Inter Tight Black's cap tops stand 0.42 em above that centre (v04's frame 720: the top crop). */
const V04_TYPE = { big: '150', px: 460, y: 340, capTop: 0.42 } as const;
/**
 * S07's type behind the glass: v04's "150" / "bpm", or (N2, `glassBytes`) his bytes set to v04's measure — as wide as v04's "150" at
 * 460 px, its cap tops on v04's (so the left and top crops, and the gap to his eye and the disc, are v04's). `px` and `y` (the em
 * box's centre) of the big type; the small print stays at v04's place beside its top.
 */
function glassType(threads: BuildThreads, L: SwissLayout): { big: string; small: string; px: number; y: number } {
  if (!threads.glassBytes) return { big: V04_TYPE.big, small: LABELS.bpm, px: V04_TYPE.px, y: V04_TYPE.y };
  const px = Math.min(V04_TYPE.px, (V04_TYPE.px * textWidth(V04_TYPE.big, 1, L.display)) / textWidth(GLASS_TYPE.big, 1, L.display));
  return { big: GLASS_TYPE.big, small: GLASS_TYPE.small, px, y: V04_TYPE.y + V04_TYPE.capTop * (V04_TYPE.px - px) };
}

/**
 * S07's screen-space layers over the close-up (spec §7: 大号裁切的 ω 和 "150" 分成几层，带视差横移): fine module rules (far), the red
 * disc, then the big type and its small print (near; v04's "150" and "bpm", N2's "CF 89" and "U+03C9 ω": glassType), each shifted by
 * its own share of the truck. Red bars sweep on the claps: above him on 3.2, below
 * him on 3.4, at his height through him on 4.4. Before the third hit this is v04's code, unchanged; from it the layers stay (no exit),
 * the disc breathes and slides; from the hard cut they scale with the push about OMEGA_AT and drift; the pull whips them off.
 */
function s07Layers(frame: number, L: SwissLayout, threads: BuildThreads, o: Layer): void {
  const type = glassType(threads, L);
  if (frame < HIT3) {
    const s = truck(frame);
    for (let i = 0; i <= 12; i++) o.under.push({ kind: 'rect', x: -960 + 160 * i + 0.35 * s, y: 0, w: 1.5, h: 1280, color: INK, alpha: 0.14 });
    for (let j = 1; j < 12; j++) o.under.push({ kind: 'rect', x: 0, y: 540 - 90 * j, w: 2200, h: 1.5, color: INK, alpha: 0.14 });
    o.under.push({ kind: 'ellipse', x: 100 + 0.6 * s, y: 40, w: 600, h: 600, color: SWISS_RED });
    const x150 = -1010 + 1.4 * s;
    o.glyphs.display.push(...textGlyphs(type.big, { x: x150, y: type.y, size: type.px, color: INK, advance: L.display }));
    // Beside the top of the big type, clear of the disc's edge.
    o.glyphs.text.push(...textGlyphs(type.small, { x: x150 + textWidth(type.big, type.px, L.display) + 20, y: 400, size: 48, color: INK, advance: L.text }));
    sweeps(frame, 1, o);
    return;
  }
  const s = truck(frame);
  const k = layerZoom(frame, L);
  const exit = frame >= PULL_EXIT.from ? launch(frame, PULL_EXIT.from, { tau: 3, bounce: 0 }) : 0;
  const ruleAlpha = 0.14 * (1 - prog(frame, PULL.from, PULL.from + 4, ease.linear));
  if (ruleAlpha > 0) {
    for (let i = 0; i <= 12; i++) o.under.push({ kind: 'rect', x: about(k, -960 + 160 * i + 0.35 * s, 0)[0], y: 0, w: 1.5, h: 1280, color: INK, alpha: ruleAlpha });
    for (let j = 1; j < 12; j++) o.under.push({ kind: 'rect', x: 0, y: about(k, 0, 540 - 90 * j)[1], w: 2200, h: 1.5, color: INK, alpha: ruleAlpha });
  }
  const d = s07Disc(frame);
  const [dx, dy] = about(k, d.x, d.y);
  if (exit < 0.9) o.under.push({ kind: 'ellipse', x: dx + 2400 * exit, y: dy, w: 2 * d.r * k, h: 2 * d.r * k, color: SWISS_RED });
  // The type ("150" / "bpm", or his bytes): still from the third hit (the truck stops), drifting from the hard cut, whipped off left in the pull.
  const drift = frame >= RETURN ? 6 * Math.sin((2 * Math.PI * (frame - RETURN)) / FRAMES_PER_BAR) : 0;
  if (exit < 0.9) {
    const x150 = -1010 + 1.4 * s;
    const [bx, by] = about(k, x150 + drift, type.y);
    const size = type.px * k;
    o.glyphs.display.push(...textGlyphs(type.big, { x: bx - 2400 * exit, y: by, size, color: INK, advance: L.display }));
    const [px, py] = about(k, x150 + drift + textWidth(type.big, type.px, L.display) + 20, 400);
    o.glyphs.text.push(...textGlyphs(type.small, { x: px - 2400 * exit, y: py, size: 48 * k, color: INK, advance: L.text }));
  }
  sweeps(frame, k, o);
}

/** The red bars (SWEEPS), crossing the centre on their claps with both ends off the frame; scaled about OMEGA_AT by `k`. */
function sweeps(frame: number, k: number, o: Layer): void {
  SWEEPS.forEach((at, i) => {
    const u = (frame - at) / 10 + 0.5;
    if (!(u > 0 && u < 1)) return;
    const y = [260, -300, 10][i];
    if (k === 1) o.over.push({ kind: 'rect', x: -2300 + 4600 * u, y, w: 2400, h: 84, color: SWISS_RED });
    else {
      const [x, yy] = about(k, -2300 + 4600 * u, y);
      o.over.push({ kind: 'rect', x, y: yy, w: 2400 * k, h: 84 * k, color: SWISS_RED });
    }
  });
}

/** The glass's world z, its scale in S07 (v04), its size (EM of the brackets, as src/scenes/glass.ts builds it) and its face's width in those ems. */
export const GLASS = { z: 150, scale: 1.45, em: 640, faceEm: 1.6 } as const;
/** Screen px per world unit at the glass's depth (the glass camera sits at FRONT). */
const GLASS_PROJ = FRONT / (FRONT - GLASS.z);

/** v04's glass pose (no exit): in place on the cut, big enough that the frame crops it, turning all the time and drifting left; a hit on beat 2 and a harder one on beat 3. */
function v04GlassPose(frame: number): GlassPose {
  const b = (frame - swiss(3)) / 24;
  const hit2 = swiss(3, 1);
  return {
    x: moveTrack(frame, 460, [{ at: hit2, to: 310 }, { at: GLASS_TURN, to: 190 }]) - 30 * b,
    y: 30 + 6 * Math.sin(Math.PI * b),
    z: GLASS.z,
    rx: moveTrack(frame, 0, [{ at: hit2, to: 0.06 }, { at: GLASS_TURN, to: 0.14 }]),
    ry: -0.55 + 0.12 * b + moveTrack(frame, 0, [{ at: hit2, to: 0.3 }, { at: GLASS_TURN, to: 0.9 }]),
    rz: -0.04 + 0.02 * Math.sin((Math.PI * b) / 2) + moveTrack(frame, 0, [{ at: hit2, to: 0.05 }, { at: GLASS_TURN, to: 0 }]),
    scale: GLASS.scale,
  };
}

/** S07a's pose with the third hit (swiss 3.4): a launch (τ 4) of HIT3_POSE's deltas, a quarter turn back toward us. */
function hitPose(frame: number): GlassPose {
  const p = v04GlassPose(frame);
  const h = launch(frame, HIT3, { tau: HIT3_POSE.tau });
  return { ...p, x: p.x + HIT3_POSE.x * h, rx: p.rx + HIT3_POSE.rx * h, ry: p.ry + HIT3_POSE.ry * h, rz: p.rz + HIT3_POSE.rz * h };
}

/** The living drift from the ✓ on (rz ±0.01 on 48 frames, x ±3 px on 24): it starts from 0, so the pose is continuous into it and across the cut. */
const living = (frame: number): { x: number; rx: number; ry: number; rz: number } => {
  const t = Math.max(0, frame - ZERO_THREATS);
  const s = (period: number) => Math.sin((2 * Math.PI * t) / period);
  return { x: SCAN_DRIFT.x * s(24), rx: GLASS_SWAY.rx * s(72), ry: GLASS_SWAY.ry * s(48), rz: SCAN_DRIFT.rz * s(SCAN_DRIFT.period) };
};
/**
 * … and a slow sway of the glass about its own axes (rx ±0.03 on 72 frames, ry ±0.06 on 48), so the refraction swims while he faces us
 * dead-on: the design's ±3 px and ±0.01 alone left 828–839 nearly dead (0.5–1.0 mean motion) right after the groove slams back.
 */
export const GLASS_SWAY = { rx: 0.03, ry: 0.06 } as const;

/** How much the glass grows against the poster in the pull, so it dissolves into his card face at its size (the card face is this many times wider than the glass face at 40×). */
export const glassToCard = (L: SwissLayout): number => (faceWidth(PROTAGONIST, L.jp) * cardFaceSize(PROTAGONIST, L) * REST_ZOOM) / (GLASS.faceEm * GLASS.em * GLASS.scale * GLASS_PROJ);

/**
 * S07's glass face (spec §15 视觉大招 1): 672–743 v04's pose frame for frame (the identity gate G2); the third hit on 3.4 (no exit); under
 * the X-ray (768–810, inOutSine) it turns dead-on and drifts onto OMEGA_AT; alive after the ✓; from the hard cut it scales with the
 * push about OMEGA_AT; in the pull it scales with the poster (growing against it, so it is his card face's size when it dissolves).
 */
export function glassPose(frame: number, L?: SwissLayout): GlassPose | null {
  if (frame < swiss(3) || frame >= PULL_FADE.to) return null;
  if (frame < HIT3) return v04GlassPose(frame);
  if (frame < IRIS) return hitPose(frame);
  const from = hitPose(IRIS - 1);
  const u = prog(frame, XRAY_MOVES.from, XRAY_MOVES.to, ease.inOutSine);
  const live = living(frame);
  const toX = (sx: number) => sx / GLASS_PROJ;
  if (frame < RETURN) {
    return { x: lerp(from.x, toX(OMEGA_AT[0] + live.x), u), y: lerp(from.y, toX(OMEGA_AT[1]), u), z: GLASS.z, rx: lerp(from.rx, 0, u) + live.rx, ry: lerp(from.ry, 0, u) + live.ry, rz: lerp(from.rz, 0, u) + live.rz, scale: GLASS.scale };
  }
  const k = L ? layerZoom(frame, L) : returnPush(frame);
  const p = frame >= PULL.from ? pullAt(frame) : 0;
  const grow = L ? lerp(1, glassToCard(L), p) : 1;
  return { x: toX(OMEGA_AT[0] + live.x * (1 - p)), y: toX(OMEGA_AT[1]), z: GLASS.z, rx: live.rx * (1 - p), ry: live.ry * (1 - p), rz: live.rz * (1 - p), scale: GLASS.scale * k * grow };
}

/** The glass dissolves into his flat card face over PULL_FADE (858–860), inside the pull's blur. */
export const glassFadeAt = (frame: number): number => 1 - prog(frame, PULL_FADE.from, PULL_FADE.to, ease.linear);

// ——— S07B (swiss bar 4): the antivirus's POV ————————————————————————————————————————————————————————————————————————————————————

/** The mode of the POV (BUILD_THREADS.pov): the X-ray, the lite rung, or the HUD alone. */
const povMode = (threads: BuildThreads): Pov['mode'] => (threads.pov === 'full' ? 'full' : threads.pov === 'lite' ? 'lite' : 'hud');

/** How many hops have landed by `frame` (0 before the first). */
export const hopsAt = (frame: number): number => HOPS.filter((h) => h <= frame).length;

/** The iris (swiss 4.1): the disc's red annulus opening r 330 → 1250 (launch τ 2) from the disc's 767 centre; null when there is none. */
export function irisAt(frame: number): { x: number; y: number; r: number } | null {
  if (frame < IRIS || frame >= RETURN) return null;
  const c = s07Disc(IRIS - 1);
  // It opens to the design's 1250, or far enough past the farthest corner to clear it by 774 (the disc sits a little right of the design's).
  const corner = Math.hypot(960 + Math.abs(c.x), 540 + Math.abs(c.y));
  const r = lerp(IRIS_RING.open[0], Math.max(IRIS_RING.open[1], corner + 60), launch(frame, IRIS, { tau: IRIS_RING.tau, bounce: 0 }));
  // Once its inner edge is past every corner, the whole frame is POV.
  if (r > corner + 4) return null;
  return { x: c.x, y: c.y, r };
}

/** The scanner's light on the column it stamps: a bone wash `alpha` deep, dying with `tau` (frames). */
export const SCAN_LIGHT = { alpha: 0.14, tau: 3 } as const;

/** The readout's box at its longest (`[SCAN] grid 144/144 · 0 threats ✓`): the stamps it would cover are left out. */
const readoutBox = (adv: Advance) => ({ x0: READOUT_SLOT.x - 12, x1: READOUT_SLOT.x + textWidth(povReadout(144, true), READOUT_SLOT.px, adv) + 12, y0: READOUT_SLOT.y - READOUT_SLOT.px, y1: READOUT_SLOT.y + READOUT_SLOT.px });

/** The stamps on S07's 12 × 12 module grid: column k's 12 cells stamp `clean ✓` top → bottom over 2 frames from hop k (but under the readout). */
function stampsAt(frame: number, L: SwissLayout): Layer {
  const s = layer();
  const adv: Advance = L.mono ?? (() => 0.6);
  const S = DEFENDER_POV.stamp;
  const clean = CLEAN.split(' ')[0];
  const tick = CLEAN.split(' ')[1];
  const wClean = textWidth(clean, S.px, adv);
  const wTick = textWidth(tick, S.px, adv);
  const space = textWidth(' ', S.px, adv);
  const tabW = wClean + space + wTick + 2 * S.tab;
  const tabH = S.px + 2 * S.tab;
  const box = readoutBox(adv);
  // The scanner's light: each column washes bone as the reticle stamps it, fading over a few frames (under its stamps).
  for (let k = 0; k < POV_GRID.cols; k++) {
    if (frame < HOPS[k]) break;
    const a = SCAN_LIGHT.alpha * Math.exp(-(frame - HOPS[k]) / SCAN_LIGHT.tau);
    if (a > 0.004) s.under.push({ kind: 'rect', x: -960 + POV_GRID.cellW * (k + 0.5), y: 0, w: POV_GRID.cellW, h: 1080, color: BONE, alpha: a });
  }
  for (let k = 0; k < POV_GRID.cols; k++) {
    for (let r = 0; r < POV_GRID.rows; r++) {
      if (frame < HOPS[k] + (2 * r) / POV_GRID.rows) break;
      const x = -960 + POV_GRID.cellW * k + S.offset[0];
      const y = 540 - POV_GRID.cellH * r + S.offset[1];
      if (x < box.x1 && x + tabW > box.x0 && y > box.y0 && y - tabH < box.y1) continue;
      s.under.push({ kind: 'rect', x: x + tabW / 2, y: y - tabH / 2, w: tabW, h: tabH, color: GROUND });
      s.glyphs.mono.push(...textGlyphs(clean, { x: x + S.tab, y: y - tabH / 2, size: S.px, color: BONE, advance: adv, alpha: S.cleanAlpha }));
      s.glyphs.mono.push(...textGlyphs(tick, { x: x + S.tab + wClean + space, y: y - tabH / 2, size: S.px, color: SWISS_RED, advance: adv }));
    }
  }
  return s;
}

/** The POV on the plate this frame (swiss 4.1 to the hard cut), or null. */
export function povAt(frame: number, L: SwissLayout, threads: BuildThreads = BUILD_THREADS): Pov | null {
  if (frame < IRIS || frame >= RETURN) return null;
  const mode = povMode(threads);
  return { mode, iris: mode === 'hud' ? null : irisAt(frame), crawl: mod(3 * frameOf(frame), DEFENDER_POV.scanlines.pitch), stamps: mode === 'hud' ? layer() : stampsAt(frame, L) };
}

/** The reticle's centre (screen px, y up): the lens condenses into it at column 1 over RETICLE, then it hops a column a 32nd (launch τ 1). */
export function reticleAt(frame: number): { x: number; y: number; r: number } {
  const R = DEFENDER_POV.reticle;
  if (frame < HOPS[0]) {
    const u = prog(frame, RETICLE.from, HOPS[0], ease.inOutSine);
    const c = s07Disc(frame);
    return { x: lerp(c.x, reticleX(0), u), y: lerp(c.y, R.y, u), r: lerp(IRIS_RING.breathe[0], R.r, u) };
  }
  const x = moveTrack(frame, reticleX(0), HOPS.slice(1).map((at, i) => ({ at, to: reticleX(i + 1), tau: R.hopTau, bounce: 0 })));
  const pulse = frame >= ZERO_THREATS + 1 ? 1 + 0.04 * Math.sin((frame - ZERO_THREATS - 1) * 1.6) : 1;
  return { x, y: R.y, r: R.r * pulse };
}

/** The HUD over the glass: the red reticle (a ring, four inward ticks, an open centre) and the ping on him (PING_RING). */
function hudAt(frame: number): Layer | null {
  if (frame < RETICLE.from || frame >= RETURN) return null;
  const h = layer();
  const R = DEFENDER_POV.reticle;
  const c = reticleAt(frame);
  h.over.push({ kind: 'ring', x: c.x, y: c.y, w: 2 * c.r, h: 2 * c.r, r: R.width, color: SWISS_RED });
  for (let i = 0; i < R.ticks; i++) {
    const a = (i * 2 * Math.PI) / R.ticks;
    const m = c.r - R.tick / 2;
    h.over.push({ kind: 'rect', x: c.x + m * Math.cos(a), y: c.y + m * Math.sin(a), w: R.tick, h: R.width, rot: a, color: SWISS_RED });
  }
  if (frame >= PING_RING.from && frame < PING_RING.to) {
    const t = (frame - PING_RING.from) / (PING_RING.to - PING_RING.from);
    const r = lerp(DEFENDER_POV.ping.r[0], DEFENDER_POV.ping.r[1], t);
    // On the hop's landing place: dead on him.
    const at = { x: reticleX(HOPS.indexOf(PING)), y: R.y };
    h.over.push({ kind: 'ring', x: at.x, y: at.y, w: 2 * r, h: 2 * r, r: 3, color: SWISS_RED, alpha: 1 - t });
  }
  return h;
}

/**
 * The readout in the readout slot (src/content/boot.ts READOUT_SLOT), once per output frame (the scene's screenOverlay: never shaken or
 * blurred): `[SCAN] grid NNN/144 · 0 threats` from the reticle's forming to the hard cut — `· 0 threats` on every frame — the ✓ from
 * ZERO_THREATS, where the line flashes ×2 (τ 3, HDR: it blooms). `[SCAN]` and ✓ in DEFENDER red, the rest bone, on the slot's ground.
 */
export function readoutAt(frame: number, L: SwissLayout): Layer | null {
  if (frame < RETICLE.from || frame >= RETURN) return null;
  const o = layer();
  const adv: Advance = L.mono ?? (() => 0.6);
  const done = frame >= ZERO_THREATS;
  const text = povReadout(12 * hopsAt(frame), done);
  const flash = done ? 1 + Math.exp(-(frame - ZERO_THREATS) / 3) : 1;
  const px = READOUT_SLOT.px;
  const width = textWidth(text, px, adv);
  const pad = 8;
  o.under.push({ kind: 'rect', x: READOUT_SLOT.x - pad + (width + 2 * pad) / 2, y: READOUT_SLOT.y, w: width + 2 * pad, h: px + 2 * pad, color: READOUT_GROUND, alpha: READOUT_SLOT.groundAlpha });
  const red = (i: number) => i < '[SCAN]'.length || (done && i === [...text].length - 1);
  typeset(text, adv).chars.forEach((c, i) => {
    if (c.ch === ' ') return;
    o.glyphs.mono.push({ ch: c.ch, x: READOUT_SLOT.x + c.x * px, y: READOUT_SLOT.y, size: px, color: scaleRGB(red(i) ? SWISS_RED : BONE, flash) });
  });
  return o;
}

function s07(frame: number, L: SwissLayout, threads: BuildThreads): SwissFrame {
  const world = layer();
  poster(frame, L, world, { amber: prog(frame, PULL.from + 2, PULL_FADE.to, ease.linear), threads });
  const overlay = overlayText(frame, L, threads);
  s07Layers(frame, L, threads, overlay);
  const camera = frame < IRIS ? s07Camera(frame, L) : scanCamera(frame, L);
  const glass = glassPose(frame, L);
  return { camera, world, overlay, glass, glassFade: glassFadeAt(frame), pieces: null, pov: povAt(frame, L, threads), hud: hudAt(frame) };
}

// ——— S08 (swiss bar 5): the infection ————————————————————————————————————————————————————————————————————————————————————————————

/** S08's camera: a drift in toward his card (1 → 1.03 about OMEGA_AT over 864–900, ease out), back square by the flip (inOutSine). */
export function s08Zoom(frame: number, threads: BuildThreads = BUILD_THREADS): number {
  const din = prog(frame, S08_DRIFT.in.from, S08_DRIFT.in.to, ease.outCubic);
  const dout = prog(frame, S08_DRIFT.out.from, S08_DRIFT.out.to, ease.inOutSine);
  const thumps = threads.infection ? INFECT.reduce((s, at) => s + thumpShape(frame - at), 0) : 0;
  return (1 + (S08_ZOOM - 1) * (din - dout)) * (1 + PRINT_THUMP * thumps);
}
/** The press thumps on every print step of the wave (INFECT, the music's print thumps): the poster jolts in this much and back over a sixteenth, about his card. */
export const PRINT_THUMP = 0.006;
/** A thump: in fast (peak 1.5 frames after the step), out slowly, and exactly 0 from a sixteenth on (the last one is gone by the flip). */
const thumpShape = (t: number): number => (t <= 0 || t >= 6 ? 0 : (t / 1.5) * Math.exp(1 - t / 1.5) * (1 - smoothstep(4, 6, t)));
const s08Camera = (frame: number, threads: BuildThreads): Pose => {
  const z = s08Zoom(frame, threads);
  return frontal(FRONT / z, OMEGA_AT[0] * (1 - 1 / z), OMEGA_AT[1] * (1 - 1 / z), FOV);
};

function s08(frame: number, L: SwissLayout, threads: BuildThreads): SwissFrame {
  const world = layer();
  poster(frame, L, world, { amber: 1, threads });
  return { camera: s08Camera(frame, threads), world, overlay: overlayText(frame, L, threads), pieces: null, ...noGlass };
}

// ——— The part ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Everything the Swiss scene draws at `frame` (the Swiss part; T2 turns its last half bar over). */
export function swissFrame(frame: number, L: SwissLayout, threads: BuildThreads = BUILD_THREADS): SwissFrame {
  if (frame < SPLITS[0]) return s05(frame, L, threads);
  if (frame < swiss(3)) return s06(frame, L, threads);
  if (frame < PULL.to) return s07(frame, L, threads);
  return s08(frame, L, threads);
}


const near = (frame: number, a: number, b: number): boolean => frame >= a - 1 && frame <= b + 1;

/** The poster's quick moves (32 sub-frames): the rules, the splits and the red cells shooting out, the ticks, the hop, the infection. */
const POSTER_MOVES: readonly (readonly [number, number])[] = [
  ...[...RULES, ROW_RULE].map((f) => [f - 1, f + 3 + PEN.draw * (1 + PEN.tail[PEN.tail.length - 1][0] / 1280)] as const),
  ...SPLITS.map((f) => [f - 1, f + SPLIT_STAGGER + 8] as const),
  [RED_CELL - 1, RED_CELL + 6],
  [S06_HOP, S06_HOP + 8],
];
/** S05's fast moves with the lens (64): the lens landing and the arcs printing; every piece's flight into its eighth. */
const LENS_FAST: readonly (readonly [number, number])[] = [[DISC_LAND.from, ARC_PRINT[ARC_PRINT.length - 1] + 4], ...PIECES.map((f) => [f - PIECE_FLIGHT.lead, f + 1] as const)];
/** … and its quick ones (48): the arcs stepping, the lens tracking him. */
const LENS_QUICK: readonly (readonly [number, number])[] = [...ARC_STEPS.map((f) => [f - 1, f + 8] as const), [LENS_TRACK - 1, LENS_TRACK + 10]];
/** S07's quick moves (48), v04's for the glass's first 72 frames (so they are photographed as approved): the hits, the red bars; the third hit. */
const S07_MOVES: readonly (readonly [number, number])[] = [
  [swiss(3, 1) - 1, swiss(3, 1) + 8],
  [GLASS_TURN - 1, GLASS_TURN + 8],
  [HIT3, HIT3 + 12],
  ...SWEEPS.map((f) => [f - 6, f + 6] as const),
];
/** S07B's quick moves (48): the iris, the hops and the re-aim, the cut, red bar 3. */
const SCAN_MOVES: readonly (readonly [number, number])[] = [
  [IRIS - 1, IRIS + 8],
  [RETICLE.from + 2, ZERO_THREATS],
  [RETURN - 1, RETURN + 2],
  [SWEEPS[2] - 6, SWEEPS[2] + 6],
];
/** S08's infection, quarantine and revival (32). */
const INFECT_MOVES: readonly (readonly [number, number])[] = [[INFECT[0] - 2, INFECT[INFECT.length - 1] + 4]];

/**
 * Sub-frames: 64 for the pull, the disc launching off the whole frame (and, with the lens, the arcs printing and the pieces' flights);
 * 48 for the arcs' steps and the lens's track, S07's and S07B's quick moves; 32 for the poster's and the infection; 16 otherwise.
 */
export function swissTemporal(frame: number, threads: BuildThreads = BUILD_THREADS): Temporal {
  if (frame >= PULL.from - 1 && frame <= PULL.to + 1) return { samples: 64, shutter: 0.5, persistence: 0 };
  if (near(frame, DISC_LAND.from, DISC_LAND.to)) return { samples: 64, shutter: 0.5, persistence: 0 };
  if (frame < SPLITS[0]) {
    if (threads.lens) {
      if (within(frame, LENS_FAST)) return { samples: 64, shutter: 0.5, persistence: 0 };
      if (within(frame, LENS_QUICK)) return { samples: 48, shutter: 0.5, persistence: 0 };
    } else if (near(frame, SLIDE.from, SLIDE.from + 8)) return { samples: 64, shutter: 0.5, persistence: 0 };
  }
  if (frame >= swiss(3) && frame < IRIS && within(frame, S07_MOVES)) return { samples: 48, shutter: 0.5, persistence: 0 };
  if (frame >= IRIS - 1 && frame < PULL.from && within(frame, SCAN_MOVES)) return { samples: 48, shutter: 0.5, persistence: 0 };
  if (frame < swiss(3) && within(frame, POSTER_MOVES)) return { samples: 32, shutter: 0.5, persistence: 0 };
  if (frame >= PULL.to && within(frame, INFECT_MOVES)) return { samples: 32, shutter: 0.5, persistence: 0 };
  return DEFAULT_TEMPORAL;
}

/** S05 flows into S06; S06 → S07 is a hard cut (red on red); S07 irises into the POV and the POV hard-cuts back to colour on swiss 4.3, from where the pull, S08 and T2 are one take into S09. */
export const swissSegment = (frame: number): Segment =>
  frame < swiss(3) ? { from: BUILD_START, to: swiss(3) } : frame < RETURN ? { from: swiss(3), to: RETURN } : { from: RETURN, to: FLIP.to };

/** Clean, with bloom only over the glass (S07a, S07B and the pull). */
export const swissLookAt = (frame: number): Look => swissLook(frame >= swiss(3) && frame < PULL.to);


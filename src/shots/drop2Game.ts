// S30 FULL COMBO, drop2 5.1–7.1 − 1 (E8 merged), and Drop2Game's whole part, drop2 5.1–8.1 − 1 (builder G · GAME; build sheet
// notes/bid2/drop2-sheet2.md §3 bars 5–7, §1.3 items C, E, F; the as-built bar: notes/d2build/sheet.md §5.7). The drums become a
// Swiss rhythm game: the notes are the real drum hits of src/score/drop2.ts, riding a perspective highway whose floor is the song's own
// spectrogram (one ridge per 16th, public/audio/bgm-spectrum.bin from scripts/audio/spectrumDrop2.mjs).
//   Bar 5 (new, the crane bar): the hard match cut lands on the game seen in plan — the whole rest of the song as a flat Swiss poster of
//   hairlines, its future labelled (Defender v2.0's red barrier, the crash, the end) — and the crane tips the poster back into the road
//   (75 % by + 6, settled on 5.2), the hairlines growing their measured relief into ridges. Its chart has no new faces: KICK chips are his
//   own poses, VOX chips the kana the hook sings, the HAT lane carries the signature's bytes, and the CLAP lane Defender's faceless red
//   probes, each stamped with his amber ω as he hits it.
//   Bar 6 (as built, re-keyed): the cast's faces, Defender's red scan bars (the snare roll), its lens falling for FULL COMBO on 6.4; the
//   camera whip-tilts down into the party monitor (S31, src/shots/drop2Overflow.ts) and, after the wrap, whip-pans left into the kernel.
// The colour law (sheet §1.3 C): red is Defender's (the now-line, the probes, the scan bars, the lens, the barrier, the bar numerals); his
// ω is amber with a #111 keyline; his COMBO and his hits' pops are Swiss ink.
// Pure: Node tests import it. Layout px (1920 × 1080, origin top-left, y down; the monitor 1300 px below) are converted to the flat world
// (centre origin, y up) where content is built; the highway's ridges are returned as data for the scene's own mesh.
import { S30_CLAP, S30_KICK, S30_VOX, S31_GAUGE } from '../content/castDrop2.ts';
import { GAME_LABELS, GAME_TYPE, HERO2, READOUT2, SIGNATURE, VOX_KANA_TEXT } from '../content/drop2.ts';
import { type RGB, linear, mixRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Segment, type Temporal, struck } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import { type Look, mixLook } from '../engine/types.ts';
import type { Aim } from '../motion/hit.ts';
import {
  CLAPS2,
  CRANE,
  CRASH,
  DISC,
  DROP2_END,
  FULL_COMBO,
  GAME,
  HAT_BYTES,
  HATS2,
  KERNEL,
  KICKS2,
  NOTES_CLAP,
  NOTES_KICK,
  NOTES_VOX,
  PAN,
  PROBES,
  ROLL31,
  ROLL33,
  ROLL34,
  SCAN_BARS,
  SCRUB,
  SCREAM,
  SNARE32_32,
  SWITCH,
  TILT,
  VOX_CLIMB,
  VOX_KANA,
  VOX_STUTTER,
  WRAP,
} from '../score/drop2.ts';
import { HEARTBEAT, OPEN } from '../score/outro.ts';
import { partBars } from '../score/film.ts';
import { TOTAL_FRAMES, barFrame } from '../score/tempo.ts';
import { swissLook } from '../worlds/swiss.ts';
import { terminalLook } from '../worlds/terminal.ts';
import { KERNEL_LOOK_IN, MON, OVERFLOW_STRINGS, type OverflowLayout, PAN_ROLL, SURF_FACE, type Surfer, TUBE_FACE, heroGlyphs, overflowCamX, overflowContent, panWorld, sparkShapes, surfer, whip } from './drop2Overflow.ts';
import { LAW, PALETTES, SWISS_OMEGA, drop2Segment, flow, hop, impact, snap, springL } from './drop2Shared.ts';

/** Advances (ems) of the part's atlases, measured in the browser: the hero (Noto Sans JP Black, per character), the cast's faces (whole), Inter Tight 900 / 700 / 500, Space Grotesk Bold, JetBrains Mono, M PLUS Rounded. */
export type GameLayout = { jp: Advance; faces: Advance; heavy: Advance; bold: Advance; medium: Advance; ui: Advance; mono: Advance; rounded: Advance };

const SW = PALETTES.swiss;
const PAPER = linear(SW.ground);
const INK = linear(SW.ink);
/** Defender's red on the Swiss paper (LAW.defender.print = the Swiss red): the now-line, probes, scan bars, the lens, the barrier, the bar numerals. */
const RED = linear(LAW.defender.print);
/** His ω on the paper (sheet §1.3 C, SWISS_OMEGA): amber with a 2 px #111 keyline. */
const OMEGA = linear(SWISS_OMEGA.fill);
const KEYLINE = linear(SWISS_OMEGA.keyline.color);
const DARK = linear(PALETTES.terminal.ground);
const TEXT_GREEN = linear(PALETTES.terminal.green, 1.3);
/** The monitor's hero glows amber (and lands so in the kernel). */
const AMBER = linear(PALETTES.neon.amber, 1.7);

/** The SCORE's ink as it falls from the paper into the dark: #111 turning to the monitor's text green. */
const INK_ON_DARK = (u: number): RGB => [INK[0] + (TEXT_GREEN[0] - INK[0]) * smoothstep(0.3, 0.7, u), INK[1] + (TEXT_GREEN[1] - INK[1]) * smoothstep(0.3, 0.7, u), INK[2] + (TEXT_GREEN[2] - INK[2]) * smoothstep(0.3, 0.7, u)];
/** Layout px → the flat world (centre origin, y up). */
const ex = (x: number): number => x - 960;
const ey = (y: number): number => 540 - y;
/** Discrete changes on a drum are taken at the output frame. */
const frameOf = (f: number): number => Math.floor(f + 0.5);
const deg = (d: number): number => (d * Math.PI) / 180;

// ——— The highway (sheet §5.7) ————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The perspective highway: vanishing point (960, 196), the playhead (judgement line) at y 880; Δ = an event's frame − now, drawn for
 * Δ ∈ [−30, 576] (six bars ahead); the lanes and ridges span u ∈ [−840, 840] at the playhead; a full spectrum bin stands 150 px tall.
 */
export const HIGHWAY = { vx: 960, vy: 196, playhead: 880, depth: 48, ahead: 576, behind: -30, halfWidth: 840, height: 150, bins: 96, end: TOTAL_FRAMES } as const;
/** The depth factor σ(Δ) = 48 / (48 + Δ) (Δ > −36). */
export const sigma = (d: number): number => HIGHWAY.depth / (HIGHWAY.depth + d);
/** Layout px of the highway point at lateral offset `u` and height `h` (px at the playhead), Δ frames ahead. */
export const project = (u: number, h: number, d: number): [number, number] => {
  const s = sigma(d);
  return [HIGHWAY.vx + u * s, HIGHWAY.vy + (HIGHWAY.playhead - HIGHWAY.vy - h) * s];
};

// ——— The crane (drop2 bar 5, new: sheet §3 bar 5; design 39.1) ———————————————————————————————————————————————————————————————

/**
 * The crane's launch is keyed half a frame after the cut, so every sub-frame of the cut frame is the plan view (the poster lands crisp on
 * the downbeat, then tips away); its ease-out reaches 75 % by + 6 and lands, at rest, on drop2 5.2.
 */
const CRANE_KEY = CRANE.from + 0.5;
const CRANE_POW = Math.log(0.25) / Math.log(1 - (CRANE.from + 6 - CRANE_KEY) / (CRANE.to - CRANE_KEY));
/** The crane's progress at instant `f`: 0 on the cut (the plan view), 1 from drop2 5.2 (the road, as built). */
export function craneAt(f: number): number {
  if (f <= CRANE_KEY) return 0;
  if (f >= CRANE.to) return 1;
  return 1 - (1 - (f - CRANE_KEY) / (CRANE.to - CRANE_KEY)) ** CRANE_POW;
}

/**
 * The highway's camera at one instant: a level camera with a shifted lens over the road, which the crane carries from a long lens high
 * over the poster down to the as-built road camera. A point Δ frames ahead at lateral u (px at the playhead) and height h lands at
 * x = 960 + u·s, y = 880 − A·Δ/(B + Δ) − h·relief·s, s = B/(B + Δ): the playhead's line never moves (y 880, scale 1) and the horizon is
 * at 880 − A. The road (c = 1) is A 684, B 48 — the as-built projection (vy 196, σ = 48/(48 + Δ)). The plan view (c = 0) sets the song's
 * end on y 110 with the lanes all but parallel; between, the slope at the playhead (A/B) grows geometrically while the song's end
 * recedes steadily to the horizon, so the poster only ever tips away. `relief` is how much of the ridges' measured height stands up
 * (none in plan: flat hairlines; it grows as the tilt passes the halfway mark); `far` how far ahead the floor is drawn (the whole song
 * in the crane; six bars on the road); `fade` how much of the poster's far future (past six bars) is still drawn as the road takes over.
 */
export type HighwayView = { c: number; A: number; B: number; relief: number; far: number; near: number; fade: number };
/** The plan view's top: the song's end, y 110 (the poster's head). */
const PLAN_TOP = 110;
export function highwayView(f: number): HighwayView {
  const c = craneAt(f);
  const end = HIGHWAY.end - f;
  if (c >= 1) return { c: 1, A: HIGHWAY.playhead - HIGHWAY.vy, B: HIGHWAY.depth, relief: 1, far: Math.min(HIGHWAY.ahead, end), near: HIGHWAY.behind, fade: 0 };
  // Fitted at the cut: the song's end Δ0 ahead lands on PLAN_TOP in plan and where the road puts it at the end.
  const d0 = HIGHWAY.end - GAME;
  const P = HIGHWAY.playhead;
  const g1 = P - ((P - HIGHWAY.vy) * d0) / (HIGHWAY.depth + d0);
  const s0 = (1.05 * (P - PLAN_TOP)) / d0;
  const s1 = (P - HIGHWAY.vy) / HIGHWAY.depth;
  const span = P - lerp(PLAN_TOP, g1, c);
  const s = Math.exp(lerp(Math.log(s0), Math.log(s1), c));
  const B = (span * d0) / (s * d0 - span);
  const A = s * B;
  // The page's bottom edge (y 1080) lies this far behind the playhead: the poster shows the song's past below the now-line.
  const near = Math.min(HIGHWAY.behind, (-1.1 * 200 * B) / (A + 200));
  return { c, A, B, relief: smoothstep(0.35, 0.95, c), far: end, near, fade: 1 - smoothstep(0.6, 0.98, c) };
}
/** The road's lateral scale at Δ in a view (σ on the road). */
export const sigmaV = (v: HighwayView, d: number): number => (v.c >= 1 ? sigma(d) : v.B / (v.B + d));
/** Layout px of the highway point at lateral `u`, height `h` (px at the playhead), Δ frames ahead, through a view (the road: project). */
export const projectV = (v: HighwayView, u: number, h: number, d: number): [number, number] => {
  if (v.c >= 1) return project(u, h, d);
  const s = v.B / (v.B + d);
  return [HIGHWAY.vx + u * s, HIGHWAY.playhead - (v.A * d) / (v.B + d) - h * v.relief * s];
};

/** The film bars whose bar lines GAME_TYPE.bars labels down the highway, in order: drop 2's bars from 5, bridge B's and the outro's. */
// v08 (integrator): bridge B's bar too, or the ladder skips 58/63 between 57 and 59.
const HIGHWAY_BARS: readonly number[] = [...partBars('drop2').slice(4), ...partBars('bridgeB'), ...partBars('outro')];

/** The song's spectrum: `at(frame, bin)` is 0–1 (0 outside the film). */
export type Spectrum = { at(frame: number, bin: number): number };
const ROWS = HIGHWAY.end;
/** Parses public/audio/bgm-spectrum.bin (one row per film frame (TOTAL_FRAMES) × 96 bytes, scripts/audio/spectrumDrop2.mjs); throws on any other size. */
export function parseSpectrum(bytes: Uint8Array): Spectrum {
  if (bytes.length !== ROWS * HIGHWAY.bins) throw new Error(`bgm-spectrum.bin: ${bytes.length} bytes, expected ${ROWS} × ${HIGHWAY.bins}`);
  return { at: (frame, bin) => (Number.isInteger(frame) && frame >= 0 && frame < ROWS ? bytes[frame * HIGHWAY.bins + bin] / 255 : 0) };
}
/** A silent song (the spectrum file is missing): flat ridges. */
export const emptySpectrum = (): Spectrum => ({ at: () => 0 });

/** How a bin's level (0–1, from dB −72…0) stands as a ridge: the quiet floor of the mix lies flat, the loud parts rise (0 → 0, 1 → 1). */
const RIDGE_FLOOR = 0.3;
const ridgeShape = (m: number): number => clamp((m - RIDGE_FLOOR) / (1 - RIDGE_FLOOR)) ** 1.5;
/** How much of a louder neighbour bin a ridge point keeps (a max-filter: peaks stay, the comb between them fills). */
const RIDGE_SPREAD = 0.6;

/**
 * One ridge of the floor: the 16th starting at `t`, Δ ahead; its points (u at the playhead, height px at the playhead) left to right; its
 * stroke width (px); red for "now" (the ridge crossing the playhead), grey once played. `s` is its lateral scale, `base` the plane's y
 * under it and `k` how its heights stand on screen (the view's relief × s). `barrier`: Defender v2.0's red wall across the road (its
 * switch, drop2 9.1), filled red. `fade`: how much of it is drawn (the poster's far future fading as the road takes over). `tone`
 * (the crane only; null on the road): how much ink each segment takes — in the plan view the hairline is shaded by the mix's level in
 * each band (the song's spectrogram printed as a poster), turning to solid ink as the relief stands up.
 */
export type Ridge = { t: number; d: number; u: number[]; heights: number[]; width: number; red: boolean; past: boolean; glint: boolean; s: number; base: number; k: number; barrier: boolean; fade: number; tone: number[] | null };
export type RidgeSet = { plane: [number, number][] | null; lines: Ridge[]; end: { y: number; width: number } | null; cliff: { y: number; x0: number; x1: number; width: number } | null };
/** The crash's silence (drop2 19.3 → the ending): the highway lies flat there, a gap he can see coming, its near edge a red cliff line (R1-11). */
export const SILENCE = { from: CRASH, to: DROP2_END } as const;
/** The plan view's bands: four bins a band (24 a side), so the poster's hairlines carry the spectrum without a needle's detail. */
const POSTER_GROUP = 4;
/** How much ink a band of the poster takes at level m (0–1, dB −72…0): the quiet floor a faint grey, the loud parts solid. */
const posterTone = (m: number): number => 0.1 + 0.9 * clamp((m - 0.2) / 0.7) ** 0.8;
/**
 * The poster prints in (round 1, R2): the 5.1 match cut lands on the paper and the plan view's hairlines ink in over the cut's first 4
 * frames (smoothstep), instead of standing dark on the cut frame and blurring light two frames later (a dark → light swing the strict 6 × 6
 * flash test counted at 384 / 386).
 */
export const PRINT_IN = 4;
export const printIn = (f: number): number => smoothstep(0, 1, (f - GAME) / PRINT_IN);
/** Defender v2.0's barrier: the switch's downbeat stands up out of the road as a red wall this tall (px at the playhead). */
export const BARRIER = { at: SWITCH.from, height: 260 } as const;

/**
 * The floor at `f`: a ridge per 16th from just behind the playhead to as far as the view draws (the whole song in the crane's plan view,
 * six bars on the road; never past the song's end), far to near, flat over the crash's silence; the paper plane under them; the crash
 * as a red edge and the song's end as a black one; Defender v2.0's switch a red barrier. Nothing once the tilt has left the page.
 */
export function ridgesAt(f: number, spec: Spectrum): RidgeSet {
  if (f >= TILT.to) return { plane: null, lines: [], end: null, cliff: null };
  const v = highwayView(f);
  const far = v.far;
  const near = v.near;
  const plane: [number, number][] = [projectV(v, -HIGHWAY.halfWidth, 0, near), projectV(v, HIGHWAY.halfWidth, 0, near), projectV(v, HIGHWAY.halfWidth, 0, far), projectV(v, -HIGHWAY.halfWidth, 0, far)];
  const lines: Ridge[] = [];
  const last = Math.min(HIGHWAY.end - 6, 6 * Math.floor((f + far) / 6));
  for (let t = last; t - f >= near; t -= 6) {
    if (t >= SILENCE.from && t < SILENCE.to) continue;
    const d = t - f;
    const fade = d > HIGHWAY.ahead ? v.fade : 1;
    if (fade <= 0.01) continue;
    const s = sigmaV(v, d);
    const barrier = t === BARRIER.at;
    const k = v.relief * s;
    const base = v.c >= 1 ? HIGHWAY.vy + (HIGHWAY.playhead - HIGHWAY.vy) * s : HIGHWAY.playhead - (v.A * d) / (v.B + d);
    // The 16th's spacing on screen: the poster's hairlines are kept thinner than the gaps between them.
    const spacing = v.c >= 1 ? Infinity : Math.abs(base - (HIGHWAY.playhead - (v.A * (d + 6)) / (v.B + d + 6)));
    let u: number[];
    let heights: number[];
    let tone: number[] | null = null;
    if (barrier) {
      u = [-HIGHWAY.halfWidth, HIGHWAY.halfWidth];
      heights = [BARRIER.height, BARRIER.height];
    } else if (k * HIGHWAY.height < 0.75) {
      // Flat (the plan view): a hairline shaded band by band by the mix's level — the spectrogram as a print.
      const group = POSTER_GROUP;
      const lv: number[] = [];
      for (let b = 0; b < HIGHWAY.bins; b += group) {
        let m = 0;
        for (let q = b; q < b + group; q++) for (let g = 0; g < 6; g++) m = Math.max(m, spec.at(t + g, q));
        lv.push(posterTone(m));
      }
      const us = lv.map((_, i) => (HIGHWAY.halfWidth * (i + 1)) / lv.length);
      u = [-HIGHWAY.halfWidth, ...us.slice(0, -1).map((x) => -x).reverse(), 0, ...us];
      heights = u.map(() => 0);
      tone = [...[...lv].reverse(), ...lv].map((x) => lerp(x, 1, v.relief) * printIn(f));
    } else {
      // Far ridges are a few px wide: their bins are taken in groups (the loudest of each); so are the poster's crowded ones.
      const group = s >= 0.3 && spacing >= 6 ? 1 : s >= 0.15 && spacing >= 3 ? 2 : 4;
      const half: { u: number; h: number }[] = [];
      for (let b = 0; b < HIGHWAY.bins; b += group) {
        let m = 0;
        for (let q = b; q < b + group; q++) for (let g = 0; g < 6; g++) m = Math.max(m, spec.at(t + g, q));
        half.push({ u: (HIGHWAY.halfWidth * (b + group / 2)) / HIGHWAY.bins, h: HIGHWAY.height * ridgeShape(m) });
      }
      // A bin never sinks far below its louder neighbour: the mix's comb of single loud bins reads as hills, not needles.
      const raw = half.map((p) => p.h);
      half.forEach((p, i) => (p.h = Math.max(raw[i], RIDGE_SPREAD * Math.max(raw[i - 1] ?? 0, raw[i + 1] ?? 0))));
      u = [-HIGHWAY.halfWidth, ...half.map((p) => -p.u).reverse(), ...half.map((p) => p.u), HIGHWAY.halfWidth];
      heights = [0, ...half.map((p) => p.h).reverse(), ...half.map((p) => p.h), 0];
      // Still in the crane: the print's shading gives way to solid ink as the relief stands.
      if (v.c < 1 && v.relief < 1) {
        const hs = heights;
        tone = hs.slice(0, -1).map((h, i) => lerp(0.1 + 0.9 * (Math.max(h, hs[i + 1]) / HIGHWAY.height) ** 0.6, 1, v.relief) * printIn(f));
      }
    }
    // The ridge crossing the playhead, chosen per output frame (a sub-frame never splits the red between two ridges).
    const red = frameOf(f) >= t - 3 && frameOf(f) < t + 3;
    // E8's scrub: on drop2 6.3, as the music plays a grain of drop2 6.4 ahead of time, FULL COMBO's own ridge glints red down the highway.
    const glint = t === FULL_COMBO && frameOf(f) >= SCRUB && frameOf(f) < SCRUB + 6;
    let width = red || glint || barrier ? 3 : Math.max(0.75, 2 * s) * (t % 96 === 0 ? 1.6 : 1);
    if (!red && !barrier && v.c < 1) width = Math.min(width, Math.max(0.5, 0.45 * spacing));
    lines.push({ t, d, u, heights, width, red, past: !red && d < 0, glint, s, base, k, barrier, fade, tone: red || barrier ? null : tone });
  }
  const end = HIGHWAY.end - f <= far ? { y: projectV(v, 0, 0, HIGHWAY.end - f)[1], width: 2 } : null;
  const dc = SILENCE.from - f;
  const cliff = dc <= far && dc > 0 ? { y: projectV(v, 0, 0, dc)[1], x0: projectV(v, -HIGHWAY.halfWidth, 0, dc)[0], x1: projectV(v, HIGHWAY.halfWidth, 0, dc)[0], width: 2 } : null;
  return { plane, lines, end, cliff };
}

/**
 * The future's callouts (R1-11), Inter Tight Bold, Swiss style: Defender v2.0's switch (red, on its barrier), the crash (red, at the
 * silence's near edge) and the song's end (#111, on its end rule). On the road each has a dot on the highway's left edge and sits on the
 * left margin (right-aligned at x 628), the crash's and the barrier's with a hairline leader; in the crane's plan view each sits on its
 * rule, left-aligned just inside the highway's left edge, and slides out to the margin as the poster tips back.
 */
export const HORIZON_TEXT = GAME_TYPE.horizon;
export type HorizonLabel = { kind: 'defender' | 'crash' | 'end'; text: string; anchor: [number, number]; at: [number, number]; size: number; color: RGB; alpha: number; leader: boolean; align: number };
const LABEL = { size: 22, right: 628, gap: 1.25 } as const;
/** The callouts at `f`, held apart on the margin (nearest first: the barrier, the crash, the end); they give way to FULL COMBO. */
export function horizonLabels(f: number): HorizonLabel[] {
  const v = highwayView(f);
  const alpha = 1 - smoothstep(FULL_COMBO - 6, FULL_COMBO, f);
  const out = (d: number) => (d > v.far ? v.fade : 1);
  const defender = projectV(v, -HIGHWAY.halfWidth, 0, BARRIER.at - f);
  const crash = projectV(v, -HIGHWAY.halfWidth, 0, SILENCE.from - f);
  const end = projectV(v, -HIGHWAY.halfWidth, 0, HIGHWAY.end - f);
  // On the margin: the barrier at its own height, the crash and the end held at least 1.25 lines above the label below.
  const yd = defender[1];
  const yc = Math.min(crash[1], yd - LABEL.gap * LABEL.size);
  const ye = Math.min(end[1] - 0.8 * LABEL.size, yc - LABEL.gap * LABEL.size);
  // The plan view's places: on each rule, just inside the highway's left edge.
  const k = v.c >= 1 ? 1 : smoothstep(0.2, 0.9, v.c);
  const place = (anchor: [number, number], y: number): [number, number] => [lerp(anchor[0] + 14, LABEL.right, k), lerp(anchor[1] - 0.45 * LABEL.size, y, k)];
  const rows: HorizonLabel[] = [
    { kind: 'crash', text: HORIZON_TEXT.crash, anchor: crash, at: place(crash, yc), size: LABEL.size, color: RED, alpha: alpha * out(SILENCE.from - f), leader: true, align: k },
    { kind: 'end', text: HORIZON_TEXT.end, anchor: end, at: place(end, ye), size: LABEL.size, color: INK, alpha: alpha * out(HIGHWAY.end - f), leader: false, align: k },
  ];
  // The barrier is passed on the switch (drop2 9.1); while it is ahead it heads the list.
  if (BARRIER.at > f) rows.unshift({ kind: 'defender', text: HORIZON_TEXT.defender, anchor: defender, at: place(defender, yd), size: LABEL.size, color: RED, alpha, leader: true, align: k });
  return rows;
}

/** A ridge's points in layout px (x, y pairs), and the plane's y under it. */
export function ridgePoints(r: Ridge): { xy: Float32Array; base: number } {
  const xy = new Float32Array(2 * r.u.length);
  for (let i = 0; i < r.u.length; i++) {
    xy[2 * i] = HIGHWAY.vx + r.u[i] * r.s;
    xy[2 * i + 1] = r.base - r.heights[i] * r.k;
  }
  return { xy, base: r.base };
}

// ——— The lanes and the notes ——————————————————————————————————————————————————————————————————————————————————————————

/** The lanes at the playhead (u px): KICK, CLAP, (his column), HAT, VOX. */
export const LANES: readonly { label: string; u0: number; u1: number }[] = [
  { label: GAME_LABELS.lanes[0], u0: -840, u1: -600 },
  { label: GAME_LABELS.lanes[1], u0: -600, u1: -360 },
  { label: GAME_LABELS.lanes[2], u0: 360, u1: 600 },
  { label: GAME_LABELS.lanes[3], u0: 600, u1: 840 },
];
const laneU = (lane: number): number => (LANES[lane].u0 + LANES[lane].u1) / 2;
/** The lane rules (u at the playhead) and the judgement rule's halves (layout x). */
const RULES_U = [-840, -600, -360, 360, 600, 840] as const;
const JUDGE = { y: 880, h: 10, left: [120, 600], right: [1320, 1800] } as const;
/** The page ends at y 1080: the Δ (behind the playhead) where the highway's plane meets it. */
const PAGE_EDGE = HIGHWAY.depth * ((HIGHWAY.playhead - HIGHWAY.vy) / (1080 - HIGHWAY.vy)) - HIGHWAY.depth;

/**
 * A note: `face` a chip with a face (or a kana) on it; `card` a plain chip (the future); `hat` a square; `roll` a bar (bar 6's snare roll:
 * Defender's red scan bars); `probe` Defender's faceless red disc (bar 5's CLAP lane); `byte` a HAT square carrying one of the signature's
 * bytes (`text`).
 */
export type Note = { at: number; lane: 0 | 1 | 2 | 3; kind: 'face' | 'card' | 'hat' | 'roll' | 'probe' | 'byte'; face?: string; text?: string };

/** Bar 5's kicks (the crane bar): his own poses on the KICK chips — no new faces (sheet §3 bar 5). */
export const KICKS5: readonly number[] = KICKS2.filter((k) => k >= GAME && k < NOTES_KICK[0]);
export const KICK_POSES5: readonly string[] = [HERO2.danceL, HERO2.danceR, HERO2.jump, HERO2.danceL];

/**
 * Every note of the game: bar 5's (his poses on the kicks, Defender's probes in the CLAP lane, the kana the hook sings, the hats, the
 * signature's bytes riding the HAT lane from 5.2&), bar 6's drum hits with the cast's faces (kicks, claps, the hook's notes), its snare
 * roll (Defender's scan bars) and hats; then every later drum event of the song as a plain card, up to the crash, then the soft kick and
 * the last chord.
 */
export const NOTES: readonly Note[] = (() => {
  const out: Note[] = [];
  const add = (at: number, lane: Note['lane'], kind: Note['kind'], face?: string, text?: string) => {
    if (!out.some((n) => n.at === at && n.lane === lane)) out.push({ at, lane, kind, ...(face ? { face } : {}), ...(text ? { text } : {}) });
  };
  KICKS5.forEach((at, i) => add(at, 0, 'face', KICK_POSES5[i % KICK_POSES5.length]));
  PROBES.forEach((at) => add(at, 1, 'probe'));
  VOX_KANA.forEach((at, i) => add(at, 3, 'face', VOX_KANA_TEXT[i]));
  HAT_BYTES.forEach((at, i) => add(at, 2, 'byte', undefined, SIGNATURE.hat[i]));
  NOTES_KICK.forEach((at, i) => add(at, 0, 'face', S30_KICK[i].face));
  NOTES_CLAP.forEach((at, i) => add(at, 1, 'face', S30_CLAP[i].face));
  NOTES_VOX.forEach((at, i) => add(at, 3, 'face', S30_VOX[i].face));
  ROLL31.forEach((at) => add(at, 1, 'roll'));
  HATS2.filter((h) => h >= GAME && h < TILT.to).forEach((at) => add(at, 2, 'hat'));
  // The future.
  KICKS2.filter((k) => k >= TILT.to).forEach((at) => add(at, 0, 'card'));
  CLAPS2.filter((c) => c >= TILT.to).forEach((at) => add(at, 1, 'card'));
  [...SNARE32_32, ...ROLL33, ...ROLL34].forEach((at) => add(at, 1, 'roll'));
  HATS2.filter((h) => h >= TILT.to).forEach((at) => add(at, 2, 'hat'));
  const stutter = [...Array.from({ length: 4 }, (_, i) => VOX_STUTTER.from + 12 * i), ...Array.from({ length: 8 }, (_, i) => VOX_STUTTER.from + 48 + 6 * i)];
  [...VOX_CLIMB, ...stutter].forEach((at) => add(at, 3, 'card'));
  for (let at = SCREAM.from; at < SCREAM.to; at += 3) add(at, 3, 'roll');
  add(HEARTBEAT, 0, 'card');
  add(OPEN, 3, 'card');
  return out.sort((a, b) => a.at - b.at || a.lane - b.lane);
})();

/**
 * The notes' own shutter (R1-11): they are drawn at the output frame plus 40 % of each sub-frame's offset, so as they rush at the rule
 * their faces smear 40 % as far as the camera's 0.5 shutter would (and a note's hit frame is still whole: every sub-frame is past it).
 */
const NOTE_SHUTTER = 0.4;
const noteTime = (f: number): number => frameOf(f) + (f - frameOf(f)) * NOTE_SHUTTER;
/**
 * Over its last 200 px of screen (y 680 → the rule at 880) a faced note grows from the sheet's chip (216 × 56, its face ≤ 30 px) to a
 * chip 80 px tall that hugs its face at up to 62 px (≤ 340 px wide): the face reads 1.6–2× bigger as it is hit (R1-11).
 */
const GROW = { from: 680, to: 880, h: 80, maxW: 340, pad: 28 } as const;
/**
 * Where a grown chip settles at the rule (layout x): the kick’s left edge on the margin (inside the frame at S30’s 1.06 zoom), the vox
 * centred right of its lane (its right edge inside the zoomed frame), and the hats stay clear. A clap hit together with a kick (drop2 5.2, drop2 5.4)
 * is not held by its lane but by the kick: its chip rides and pops at the kick chip’s right edge + PAIR_GAP (σ-scaled up the highway), so
 * the pair reads as one row and never touches (D2-GAME-PERFECT-PILE); a lone clap would settle with its left edge at 484.
 */
const SETTLE: readonly { edge: number; side: -1 | 0 | 1 }[] = [
  { edge: 72, side: -1 },
  { edge: 484, side: -1 },
  { edge: 1440, side: 0 },
  { edge: 1660, side: 0 },
];
const PAIR_GAP = 16;
/** The chip's centre (layout x at the rule) for a chip `w` wide, held by its lane's edge. */
const settleX = (lane: number, w: number): number => {
  const a = SETTLE[lane];
  return a.side < 0 ? a.edge + w / 2 : a.side > 0 ? a.edge - w / 2 : a.edge;
};
/** The kick a faced clap is hit together with, if any: the clap's chip is placed off it. */
const kickOf = (n: Note): Note | undefined => (n.lane === 1 && n.kind === 'face' ? NOTES.find((m) => m.at === n.at && m.lane === 0 && m.kind === 'face') : undefined);
/** A faced note's size at the rule: its face's em and its chip's width. */
const atRule = (face: string, L: GameLayout): { em: number; w: number } => {
  const adv = L.faces(face);
  const em = Math.min(0.78 * GROW.h, (GROW.maxW - GROW.pad) / adv);
  return { em, w: Math.min(GROW.maxW, em * adv + GROW.pad) };
};
/** A HAT byte's chip at the rule (px): paper, a #111 keyline, the byte in Space Grotesk Bold 18 px (sheet §3 5.2&). */
export const BYTE_CHIP = { w: 46, h: 30, size: 18, line: 2 } as const;
/** A probe at the rule: Defender's faceless red disc, Ø 80 (design 39.2). */
export const PROBE = { r: 40 } as const;
/**
 * How far a chip stands up off the road (1 on the road; in the crane's plan view the chips lie flat, thin dashes in their lanes, and
 * stand as the poster tips back, with the ridges' relief).
 */
const standOf = (v: HighwayView): number => lerp(0.05, 1, v.relief);
/** A riding note at Δ frames ahead: its chip's centre, scale and size, and its face's size (fitted to the chip). */
function noteChip(n: Note, d: number, L: GameLayout, v: HighwayView = highwayView(Infinity)): { x: number; y: number; s: number; w: number; h: number; em: number } {
  const s = sigmaV(v, d);
  const up = standOf(v);
  const [lx, y] = projectV(v, laneU(n.lane), 0, d);
  if (n.kind === 'hat') return { x: lx, y, s, w: 18 * s, h: 18 * s * up, em: 0 };
  if (n.kind === 'byte') return { x: lx, y, s, w: BYTE_CHIP.w * s, h: BYTE_CHIP.h * s * up, em: BYTE_CHIP.size * s * up };
  if (n.kind === 'probe') return { x: lx, y, s, w: 2 * PROBE.r * s, h: 2 * PROBE.r * s * up, em: 0 };
  if (n.kind === 'roll') return { x: lx, y, s, w: 216 * s, h: 12 * s * up, em: 0 };
  if (n.kind !== 'face' || !n.face) return { x: lx, y, s, w: 216 * s, h: 56 * s * up, em: 0 };
  const k = smoothstep(GROW.from, GROW.to, y);
  const rule = atRule(n.face, L);
  const w = lerp(216, rule.w, k) * s;
  const h = lerp(56, GROW.h, k) * s * up;
  const em = lerp(Math.min(30, 200 / L.faces(n.face)), rule.em, k) * s * up;
  const kick = kickOf(n);
  if (kick) {
    const kc = noteChip(kick, d, L, v);
    return { x: kc.x + kc.w / 2 + PAIR_GAP * s + w / 2, y, s, w, h, em };
  }
  const x = lerp(lx, HIGHWAY.vx + (settleX(n.lane, rule.w) - HIGHWAY.vx) * s, k);
  return { x, y, s, w, h, em };
}
/**
 * How long a hit chip stays: popped 1.18× on the hit frame, settling to 1.08× and fading over + 2.5 … + 7.5. (As built its first 3 frames
 * flashed Swiss red; under the colour law his hits are Swiss ink: `red` is kept as the flash's window, drawn #111 — sheet §1.3 C.)
 */
const POP = { scale: 1.18, rest: 1.08, red: 3, until: 8 } as const;
export type Pop = { at: number; lane: number; face: string; x: number; y: number; w: number; h: number; em: number; red: boolean; alpha: number };
/** A faced note's pop on its hit (`nf` the notes' time): its chip at the rule, held by its lane's edge so a kick and a clap pop side by side. */
function popAt(n: Note, nf: number, L: GameLayout): Pop | null {
  const t = nf - n.at;
  if (n.kind !== 'face' || !n.face || t >= POP.until) return null;
  const rule = atRule(n.face, L);
  const p = t < 0.75 ? POP.scale : lerp(POP.scale, POP.rest, smoothstep(0.75, 5, t));
  const w = rule.w * p;
  const kick = kickOf(n);
  const kp = kick ? popAt(kick, nf, L) : null;
  const x = kp ? kp.x + kp.w / 2 + PAIR_GAP + w / 2 : settleX(n.lane, w);
  return { at: n.at, lane: n.lane, face: n.face, x, y: HIGHWAY.playhead, w, h: GROW.h * p, em: rule.em * p, red: t < POP.red, alpha: 1 - smoothstep(2.5, 7.5, t) };
}

/**
 * What his hit leaves on Defender's red (layout px): a probe's disc (bar 5) pops at the rule and his amber ω is stamped into it with the
 * snap (S: 104 % by + 6, 100 % by + 8), fading over + 6 … + 12 — infected, still red; each scan bar of the roll (bar 6) shows at the rule
 * for 6 frames with an amber ω notch. `omega` is the ω's size (px), `kind` which.
 */
export type Stamp = { at: number; kind: 'probe' | 'bar'; x: number; y: number; w: number; h: number; omega: number; alpha: number };
export function stampsAt(nf: number): Stamp[] {
  const out: Stamp[] = [];
  for (const at of PROBES) {
    const t = nf - at;
    if (!struck(at, nf) || t >= 12) continue;
    const p = t < 0.75 ? POP.scale : lerp(POP.scale, POP.rest, smoothstep(0.75, 5, t));
    const r = PROBE.r * p;
    out.push({ at, kind: 'probe', x: HIGHWAY.vx + laneU(1), y: HIGHWAY.playhead, w: 2 * r, h: 2 * r, omega: 1.15 * r * snap(t, 0), alpha: 1 - smoothstep(6, 12, t) });
  }
  for (const at of SCAN_BARS) {
    const t = nf - at;
    if (!struck(at, nf) || t >= 6) continue;
    out.push({ at, kind: 'bar', x: HIGHWAY.vx + laneU(1), y: HIGHWAY.playhead - 3, w: 216, h: 14, omega: 28 * snap(t, 0), alpha: 1 - smoothstep(2, 6, t) });
  }
  return out;
}

/** His amber ω (centred on layout (x, y), `size` px) with its 2 px #111 keyline: the stamp on Defender's red (sheet §1.3 C, LAW). */
export function amberOmega(x: number, y: number, size: number, alpha = 1): Glyph {
  return { ch: 'ω', x: ex(x), y: ey(y), size, color: OMEGA, alpha, outline: SWISS_OMEGA.keyline.px / Math.max(size, 1e-6), outlineColor: KEYLINE };
}

/**
 * Defender's ticker, under SCORE (sheet §7.2: `[SCAN] probe 1 · caught` 5.2, `[SCAN] incoming` 5.4, `[SCAN] lens · full power` 6.3,
 * `[SCAN] caught 0 / 10` 6.4): JetBrains Mono 20 px, red; one line at a time, typed in over a 16th (taken at the output frame), the last
 * gone with the page.
 */
export const TICKER = { x: 640, y: 104, size: 20, type: 6 } as const;
const TICKER_LINES = READOUT2.filter((l) => l.site === 'ticker');
export function tickerAt(f: number): { text: string; count: number; alpha: number } | null {
  const d = frameOf(f);
  const line = TICKER_LINES.filter((l) => l.at <= d).pop();
  if (!line) return null;
  const n = [...line.text].length;
  return { text: line.text, count: Math.min(n, Math.ceil((n * (d - line.at + 1)) / TICKER.type)), alpha: 1 };
}

/** The notes he plays: drop2 bars 5–6, up to FULL COMBO. */
const JUDGED = NOTES.filter((n) => n.at >= GAME && n.at <= FULL_COMBO);

/** COMBO's numeral's ink: #111 this far toward the paper (linear light; 0.78 is the ghost it steps back to on FULL COMBO). */
export const COMBO_TONE = 0.7;
/** COMBO at `f`: every note he has hit (each on its frame), held after FULL COMBO. */
export const combo = (f: number): number => JUDGED.filter((n) => struck(n.at, f)).length;
/** The raw score: +100 × the combo for each hit. */
const RAW = JUDGED.map((_, i) => 100 * (i + 1)).reduce<number[]>((acc, v) => [...acc, (acc.at(-1) ?? 0) + v], []);
/** SCORE at `f`: the raw score scaled to land exactly on 255 255 (0xFF 0xFF) on FULL COMBO. */
export const score = (f: number): number => {
  const c = combo(f);
  return c === 0 ? 0 : Math.round((255255 * RAW[c - 1]) / RAW[RAW.length - 1]);
};

/**
 * PERFECT (Space Grotesk Bold 44 px #111 with a paper knock-out, D2-GAME-PERFECT-PILE): one per lane at a time, under the lane's label and
 * left-aligned with it (the lane's left + 12, baseline y 1000) — below the chips that pop at the rule, where no note ever rides, so nothing
 * crosses it. A hit pops it 1.15 → 1 from its baseline's left end (settled by + 5), whole until + 4 and gone by + 8, and a newer hit in its
 * lane replaces it at once: the snare roll is one tag re-popping on every 16th and 32nd, not a tower. The hats light only the rule.
 * FULL COMBO's own hits print none: the clap lane's tag bursts into a starburst of 8 (each word on its own ray of the upper half),
 * gone by + 7 — the one multi-PERFECT moment.
 */
export const TAG = { size: 44, base: 1000, middle: 0.3, pop: 1.15, settle: 5, hold: 4, until: 8, burst: 8, burstUntil: 7, outline: 0.08 } as const;
/** A tag: `x` its left edge (`align` 0) or centre (`align` 0.5), `y` its em's middle (layout px), `size` px; `rot` about (x, y). */
export type Tag = { x: number; y: number; size: number; align: 0 | 0.5; alpha: number; rot: number; burst: boolean; at: number; lane: number };
/** A tag's size `t` frames after its hit (t may be a hair negative on the hit frame's sub-frames). */
const tagSize = (t: number): number => TAG.size * (t < 0.75 ? TAG.pop : lerp(TAG.pop, 1, smoothstep(0.75, TAG.settle, t)));
const tagX = (lane: number): number => HIGHWAY.vx + LANES[lane].u0 + 12;
/** The burst: how far its words' inner ends are thrown (px), and its drag (their speed falls by e every 2 frames). */
const BURST_REACH = 170;
const BURST_DRAG = 2;
const tagY = (size: number): number => TAG.base - TAG.middle * size;

/** The PERFECT tags at `f` (layout px), measured with the ui atlas (`L.ui`) so the burst starts from the clap tag's own middle. */
export function perfectTags(f: number, L: Pick<GameLayout, 'ui'>): Tag[] {
  if (struck(FULL_COMBO, f)) {
    const t = Math.max(0, f - FULL_COMBO);
    if (t >= TAG.burstUntil) return [];
    const size = tagSize(t);
    const w = [...GAME_LABELS.perfect].reduce((a, ch) => a + L.ui(ch), 0) * size;
    const [x0, y0] = [tagX(1) + w / 2, tagY(size)];
    // A starburst of words (the disc's 8 bars, in type), opening like a fan: on the hit the 8 lie on the tag, one word; then each is thrown
    // along its own ray of the upper half (−172° … −8°, layout y down: a rising sun of words), turning onto it, its inner end out to 170 px
    // from the hub with a firework's drag; none is upside down (the left half's words read toward the hub), none drops below the hub (off
    // the bottom of the frame), and neighbours never touch once out of the hub.
    const k = 1 - Math.exp(-t / BURST_DRAG);
    const reach = (BURST_REACH + w / 2) * k;
    return Array.from({ length: TAG.burst }, (_, i) => {
      const a = deg(-172 + (164 * i) / (TAG.burst - 1));
      const rot = k * (Math.cos(a) >= 0 ? -a : -a - Math.PI);
      return { x: x0 + Math.cos(a) * reach, y: y0 + Math.sin(a) * reach, size, align: 0.5, alpha: 1 - smoothstep(3, TAG.burstUntil, t), rot, burst: true, at: FULL_COMBO, lane: 1 };
    });
  }
  const out: Tag[] = [];
  for (const lane of [0, 1, 3]) {
    const n = JUDGED.filter((m) => m.lane === lane && m.kind !== 'hat' && struck(m.at, f)).at(-1);
    if (!n) continue;
    const t = f - n.at;
    if (t >= TAG.until) continue;
    const size = tagSize(t);
    out.push({ x: tagX(lane), y: tagY(size), size, align: 0, alpha: 1 - smoothstep(TAG.hold, TAG.until, t), rot: 0, burst: false, at: n.at, lane });
  }
  return out;
}

/** The red disc (Ø 300, layout px centre) falling at 22.5 px/f from drop2 5.3 + 9 to his brackets' top on drop2 5.4; then 8 red bars flung out at 30 px/f, gone by + 14. */
export function discAt(f: number): { disc: { x: number; y: number; r: number } | null; bars: { x: number; y: number; rot: number; alpha: number }[] } {
  const disc = f >= DISC.from && f < FULL_COMBO ? { x: 960, y: 226 - 22.5 * (FULL_COMBO - f), r: 150 } : null;
  const t = f - FULL_COMBO;
  const bars = t >= 0 && t < 14 ? Array.from({ length: 8 }, (_, i) => ({ x: 960 + Math.cos((i * Math.PI) / 4) * 30 * t, y: 226 + Math.sin((i * Math.PI) / 4) * 30 * t, rot: -(i * Math.PI) / 4, alpha: 1 - smoothstep(9, 14, t) })) : [];
  return { disc, bars };
}

// ——— The hero ———————————————————————————————————————————————————————————————————————————————————————————————————————————

/** `arms`: how much of the surfer's arms is drawn (they fade in the fling's blur); `rot` is in the world (the camera's roll is made up for). */
export type HeroPose = { face: string; x: number; y: number; width: number; rot: number; sx: number; sy: number; omega: number; look: 'swiss' | 'monitor'; arms: number };

/**
 * S30's face for the beat: bar 5 (the crane bar) (•ω•) on the cut, ヽ(•ω•)ノ as he catches the first probe (5.2), └(•ω•)┐ with the second
 * (5.4); bar 6 as built: (•ω•) on 6.1, ヽ(•ω•)ノ on 6.2, (•ω•;) trembling on 6.3, ＼(•ω•)／ on FULL COMBO.
 */
const swissFace = (f: number): string =>
  struck(FULL_COMBO, f)
    ? HERO2.jump
    : struck(NOTES_KICK[2], f)
      ? HERO2.tremble
      : struck(NOTES_KICK[1], f)
        ? HERO2.cheer
        : struck(NOTES_KICK[0], f)
          ? HERO2.base
          : struck(PROBES[1], f)
            ? HERO2.danceR
            : struck(PROBES[0], f)
              ? HERO2.cheer
              : HERO2.base;
/** The swap to the monitor's surfer, inside the tilt's blur: the slam is fastest over its last frames. */
const SURF_LOOK = TILT.to - 3;
/** The tilt's recoil as it slams into the monitor on drop2 6.1 (× 5 % of its 1300 px). */
const TILT_BOUNCE = 0.5;
/** Where he lands in the monitor (H3). */
const H3 = surfer(TILT.to);

/** The hero at `f` (layout px; `width` is the (•ω•) core's): over the playhead in S30, hopping on the kicks, singing (ω) on the hook; leaping into FULL COMBO; falling with the tilt into the monitor (a hair behind the camera), changing into the surfer as he crosses into the dark (a 2-frame cross-fade); then the surfer. */
export function heroAt(f: number): HeroPose {
  if (f >= TILT.to) {
    const s = surfer(f);
    return { face: s.face, x: s.x, y: s.y, width: s.width, rot: s.rot - panRoll(f), sx: s.sx, sy: s.sy, omega: 1, look: 'monitor', arms: s.arms };
  }
  const kick = [...KICKS5, ...NOTES_KICK].filter((k) => k < FULL_COMBO).reduce((s, k) => s + hop(f, k, 10), 0);
  // He sings: his ω pulses on every VOX note (bar 5's kana, bar 6's faces).
  const sing = [...VOX_KANA, ...NOTES_VOX].reduce((s, v) => s + (f >= v && f < v + 6 ? 0.1 * Math.sin((Math.PI * (f - v)) / 6) : 0), 0);
  const tremble = struck(NOTES_KICK[2], f) && !struck(FULL_COMBO, f) ? (frameOf(f) % 2 === 0 ? 2 : -2) : 0;
  const leap = 120 * springL(f, FULL_COMBO);
  let x = 960 + tremble;
  let y = 520 - kick - leap;
  let width = 560;
  if (f >= TILT.from - 1) {
    // He falls with the camera's own slam, so he lands on the gauge exactly as it does (H3) — no step into the surfer on drop2 6.1.
    const e = whip(f, TILT.from, TILT.to);
    x = lerp(x, H3.x, e);
    y = lerp(y, H3.y, e);
    width = lerp(560, H3.width, e);
  }
  if (f >= SURF_LOOK) return { face: HERO2.surf, x, y, width, rot: lerp(0, H3.rot, smoothstep(SURF_LOOK, TILT.to, f)), sx: 1, sy: 1, omega: 1, look: 'monitor', arms: 1 };
  return { face: swissFace(f), x, y, width, rot: 0, sx: 1, sy: 1, omega: 1 + sing, look: 'swiss', arms: 1 };
}

const ARMS = 'ヽノ＼／';
/**
 * S30's hero glyphs: Noto Sans JP Black #111, knocked out of everything behind by a paper outline; his ω (singing) amber with a 2 px #111
 * keyline over the knock-out (sheet §1.3 C: it was Swiss red); the core (•ω•) centred and `width` wide.
 */
function swissHero(h: HeroPose, L: GameLayout, alpha = 1): Glyph[] {
  const chars = [...h.face];
  const open = chars.indexOf('(');
  const close = chars.lastIndexOf(')');
  const adv = chars.map((c) => L.jp(c));
  const core = adv.slice(open, close + 1).reduce((a, b) => a + b, 0);
  const size = h.width / core;
  let x = -adv.slice(0, open).reduce((a, b) => a + b, 0) - core / 2;
  const out: Glyph[] = [];
  chars.forEach((ch, i) => {
    const cx = h.x + (x + adv[i] / 2) * size;
    x += adv[i];
    const omega = ch === 'ω' ? h.omega : 1;
    // Arms are raised beside his head: a little smaller, lifted, tucked toward the brackets.
    const arm = ARMS.includes(ch) ? (i < open ? 1 : -1) : 0;
    const k = arm ? 0.8 : 1;
    const g: Glyph = { ch, x: ex(cx + arm * 0.08 * size), y: ey(h.y - (arm ? 0.24 * size : 0)), size: size * omega * k, stretch: 1 / omega, color: INK, outline: 0.07, outlineColor: PAPER, alpha };
    out.push(g);
    if (ch === 'ω') out.push({ ...g, color: OMEGA, outline: SWISS_OMEGA.keyline.px / g.size, outlineColor: KEYLINE });
  });
  return out;
}

// ——— The camera, the look, time ——————————————————————————————————————————————————————————————————————————————————————————

/** The camera's roll over the whip-pan into the kernel (drop2 7.4& → 8.1): a roll that swells with the pan and lands level (Drop2Overflow PAN_ROLL). */
export const panRoll = (f: number): number => PAN_ROLL(f);

/**
 * The part's camera (C in layout px): bar 5 holds for the crane (the highway's own camera moves), then S30's flow from the crane's landing
 * (drop2 5.2) to the tilt — zoom 1.00 → 1.06, roll 0 → 0.6° — so FULL COMBO is framed as built; the whip-tilt slammed 1300 px down into
 * the monitor (zoom and roll unwinding, a tiny recoil); the monitor's truck and the whip-pan slammed left into the kernel.
 */
export function gameAim(f: number): Aim {
  let zoom = 1;
  let roll = 0;
  let cy = 540;
  const k = flow((f - CRANE.to) / (TILT.from - 1 - CRANE.to));
  if (f < TILT.from - 1) {
    zoom = 1 + 0.06 * k;
    roll = deg(0.6) * k;
  } else {
    // The slam lands on drop2 7.1 at its fastest; only the drop recoils (a tiny bounce), the zoom and the roll land and stay.
    const e = whip(f, TILT.from, TILT.to, TILT_BOUNCE);
    const k = Math.min(1, e);
    zoom = lerp(1.06, 1, k);
    roll = lerp(deg(0.6), 0, k) + panRoll(f);
    cy = lerp(540, MON.y0 + 540, e);
  }
  const cx = overflowCamX(f);
  return { zoom, x: cx - 960, y: 540 - cy, roll };
}

/** The crane's fast part (75 % in its first 6 frames) and its tail. */
const CRANE_FAST = CRANE.from + 6;
/**
 * Sub-frames: 64 over the crane's fast part, 32 over its tail; 16 over the game; 32 as FULL COMBO's type slams in and bursts; 64 over
 * the whip-tilt; 32 over the monitor (no phosphor tail: it smeared the odometer's rolls, the box and the surfer into trails — the CRT here
 * is its curvature, scanlines, grille and band); 64 → 128 over the whip-pan (the slam is fastest over its last frames).
 */
export function gameTemporal(f: number): Temporal {
  if (f < CRANE_FAST) return { samples: 64, shutter: 0.5, persistence: 0 };
  if (f < CRANE.to) return { samples: 32, shutter: 0.5, persistence: 0 };
  if (f < FULL_COMBO - 8) return { samples: 16, shutter: 0.5, persistence: 0 };
  if (f < TILT.from - 1) return { samples: 32, shutter: 0.5, persistence: 0 };
  if (f <= TILT.to + 2) return { samples: 64, shutter: 0.5, persistence: 0 };
  if (f < WRAP - 1) return { samples: 32, shutter: 0.5, persistence: 0 };
  if (f < PAN.to - 5) return { samples: 64, shutter: 0.5, persistence: 0 };
  return { samples: 128, shutter: 0.5, persistence: 0 };
}

/** The part's segment: from the drop2 5.1 match cut to the next hard cut (the crane, the tilt and the pan are continuous). */
export const gameSegment = (f: number): Segment => drop2Segment(f);

/**
 * The look: Swiss (clean, no glow) over the game; the CRT warming up inside the tilt's blur (warm on the landing) (curvature 0.06, a
 * rolling band); over the pan the CRT drains away on the pan's own curve and the finish turns into the kernel's (KERNEL_LOOK_IN: dark,
 * Defender's emissive red blooming).
 */
export function gameLook(f: number): Look {
  const band = (((f - TILT.from) / 150) % 1 + 1) % 1;
  const swiss = swissLook(false);
  if (f < SURF_LOOK) return swiss;
  const warm = clamp((f - SURF_LOOK) / (TILT.to - SURF_LOOK));
  const crt = terminalLook(warm, 0, band, 0.06);
  if (f < PAN.from - 1) return warm < 1 ? mixLook(swiss, crt, warm) : crt;
  // On the pan's own slam: the monitor's glass stays on through the blur and is gone on the landing (drop2 8.1), part of its hit.
  const e = whip(f, PAN.from, PAN.to);
  const look: Look = { ...mixLook(crt, KERNEL_LOOK_IN, e) };
  delete look.crt;
  const amount = (1 - e) * (crt.crt?.amount ?? 0);
  return amount > 1e-3 && crt.crt ? { ...look, crt: { ...crt.crt, amount } } : look;
}

// ——— Content ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Every string the part draws, per atlas (the scene builds one atlas per key; whole faces are one key each). */
export const GAME_STRINGS = {
  jp: [...new Set([HERO2.base, HERO2.cheer, HERO2.jump, HERO2.tremble, HERO2.danceR].flatMap((s) => [...s]))],
  faces: [...new Set([...[...S30_KICK, ...S30_CLAP, ...S30_VOX, ...S31_GAUGE].map((c) => c.face), ...KICK_POSES5, ...VOX_KANA_TEXT, 'ω'])],
  heavy: [...new Set([...GAME_TYPE.full, ...GAME_TYPE.combo, ...'0123456789'])],
  bold: [...new Set([...GAME_TYPE.combo, ...GAME_TYPE.bars.join(''), ...'0123456789', ...HORIZON_TEXT.defender, ...HORIZON_TEXT.crash, ...HORIZON_TEXT.end])].filter((c) => c !== ' '),
  medium: [...new Set([...GAME_TYPE.score(255255), ...'0123456789'])].filter((c) => c !== ' '),
  ui: [...new Set([...GAME_LABELS.lanes.join(''), ...GAME_LABELS.perfect, ...SIGNATURE.hat.join('')])],
  mono: [...new Set([...OVERFLOW_STRINGS.mono, ...TICKER_LINES.map((l) => l.text).join('')])].filter((c) => c.trim() !== ''),
  rounded: OVERFLOW_STRINGS.rounded,
} as const;

/** A note on screen: its place (layout px, the chip's centre), its scale σ, its chip's size (px) and its face's size (px). */
export type DrawnNote = Note & { x: number; y: number; s: number; w: number; h: number; em: number };
export type GameFrame = {
  aim: Aim;
  /** The page (paper, its 16 columns, its bottom rule) over the monitor's dark ground. */
  back: FlatContent;
  /** The highway's plane and ridges (the scene's own mesh, between back and track). */
  ridges: RidgeSet;
  notes: DrawnNote[];
  /** The faced notes just hit, popping at the rule. */
  pops: Pop[];
  /** The full-screen monitor (S31), and the dizzy faces on their chips over its gauge. */
  monitor: FlatContent;
  inner: FlatContent;
  /** Lane rules, the judgement rule, the notes, the bar and lane labels, the future's callouts. */
  track: FlatContent;
  /** COMBO, SCORE, FULL COMBO; the disc and its burst. */
  type: FlatContent;
  /** The whip-pan's neon world, under him: its dark glass (normal) and its light (add). */
  glass: FlatContent;
  glow: FlatContent;
  /** The hero, PERFECT, the ✧ burst. */
  hero: FlatContent;
  /** Light over him (add): his lit neon tube and its glow, the snap's sparks. */
  light: FlatContent;
  /** The snap's flying pieces. */
  fore: FlatContent;
};

const text = (s: string, x: number, y: number, size: number, advance: Advance, color: RGB, o: { align?: number; alpha?: number; rot?: number; pivot?: [number, number] } = {}): Glyph[] => {
  const chars = [...s];
  const w = chars.reduce((a, c) => a + advance(c), 0) * size;
  let cx = x - (o.align ?? 0) * w;
  const out: Glyph[] = [];
  const [px, py] = o.pivot ?? [x, y];
  const [c, sn] = [Math.cos(o.rot ?? 0), Math.sin(o.rot ?? 0)];
  for (const ch of chars) {
    const a = advance(ch) * size;
    const gx = cx + a / 2;
    cx += a;
    if (ch === ' ') continue;
    // Rotated about the pivot (layout y down: a positive `rot` turns counter-clockwise on screen).
    const dx = gx - px;
    const dy = y - py;
    out.push({ ch, x: ex(px + dx * c + dy * sn), y: ey(py - dx * sn + dy * c), size, color, alpha: o.alpha ?? 1, rot: o.rot ?? 0 });
  }
  return out;
};

/** A rectangle from layout px (centre, size), turned `rot` counter-clockwise about `pivot`. */
const rect = (x: number, y: number, w: number, h: number, color: RGB, o: { alpha?: number; rot?: number; pivot?: [number, number]; r?: number } = {}): Shape => {
  const [px, py] = o.pivot ?? [x, y];
  const rot = o.rot ?? 0;
  const dx = x - px;
  const dy = y - py;
  return { kind: 'rect', x: ex(px + dx * Math.cos(rot) + dy * Math.sin(rot)), y: ey(py - dx * Math.sin(rot) + dy * Math.cos(rot)), w, h, color, alpha: o.alpha ?? 1, rot, r: o.r ?? 0 };
};
/** A capsule from (x0, y0) to (x1, y1) layout px, `w` thick. */
const seg = (x0: number, y0: number, x1: number, y1: number, w: number, color: RGB, alpha = 1): Shape => ({ kind: 'segment', x: ex((x0 + x1) / 2), y: ey((y0 + y1) / 2), w: Math.hypot(x1 - x0, y1 - y0) + w, h: w, rot: Math.atan2(-(y1 - y0), x1 - x0), color, alpha });

/** The lane furniture springs apart on FULL COMBO: the left half −700 px and turned 8°, the right half +700 px and −8° (L). */
const apart = (f: number, side: -1 | 1): { dx: number; rot: number; pivot: [number, number] } => {
  const p = springL(f, FULL_COMBO);
  return { dx: 700 * side * p, rot: deg(8) * -side * p, pivot: [side < 0 ? 360 : 1560, 880] };
};
/** A layout point moved with its half of the furniture. */
const moved = (x: number, y: number, a: { dx: number; rot: number; pivot: [number, number] }): [number, number] => {
  const dx = x - a.pivot[0];
  const dy = y - a.pivot[1];
  const [c, s] = [Math.cos(a.rot), Math.sin(a.rot)];
  return [a.pivot[0] + dx * c + dy * s + a.dx, a.pivot[1] - dx * s + dy * c];
};

/** The judgement rule's thickness over a lane at `f`: 10 px, rising to 40 on each hit there (I, 3 f) and relaxing over 9 f; a hat lifts it 2 px for 2 f. */
function ruleThickness(f: number, lane: number): number {
  let h: number = JUDGE.h;
  for (const n of JUDGED) {
    if (n.lane !== lane) continue;
    if (n.kind === 'hat') {
      if (f >= n.at && f < n.at + 2) h = Math.max(h, JUDGE.h + 2);
      continue;
    }
    const t = f - n.at;
    if (t >= -3 && t < 0) h = Math.max(h, JUDGE.h + 30 * impact(f, n.at, 3));
    else if (t >= 0 && t < 9) h = Math.max(h, JUDGE.h + 30 * (1 - flow(t / 9)));
  }
  return h;
}

/** Everything Drop2Game draws at instant `f` (drop2 5.1–7.1 − 1). */
export function gameFrame(f: number, L: GameLayout, spec: Spectrum): GameFrame {
  const aim = gameAim(f);
  const onPage = f < TILT.to;
  const back: FlatContent = { under: [], glyphs: {}, over: [] };
  const track = { under: [] as Shape[], glyphs: { bold: [] as Glyph[], ui: [] as Glyph[], faces: [] as Glyph[] }, over: [] as Shape[] };
  const type = { under: [] as Shape[], glyphs: { heavy: [] as Glyph[], bold: [] as Glyph[], medium: [] as Glyph[], mono: [] as Glyph[] }, over: [] as Shape[] };
  const hero = { under: [] as Shape[], glyphs: { jp: [] as Glyph[], rounded: [] as Glyph[], ui: [] as Glyph[] }, over: [] as Shape[] };
  const notes: DrawnNote[] = [];
  const pops: Pop[] = [];

  if (onPage) {
    const v = highwayView(f);
    // The page: paper with 16 columns of hairlines, ending at y 1080 on a 6 px rule; the monitor's dark world lies below it.
    const under = back.under as Shape[];
    under.push(rect(960, 240, 3200, 1680, PAPER));
    for (let c = 0; c <= 16; c++) under.push(rect(120 * c, 240, 1, 1680, INK, { alpha: 0.12 }));

    // Lane rules (tapering with σ) and the judgement rule, springing apart on FULL COMBO.
    const left = apart(f, -1);
    const right = apart(f, 1);
    const far = v.far;
    const edge = v.c >= 1 ? PAGE_EDGE : v.near;
    const cuts = [edge, 0, 24, 48, 96, 192, 384, 768, 1536].filter((d) => d < far);
    cuts.push(far);
    for (const u of RULES_U) {
      const a = u < 0 ? left : right;
      for (let i = 0; i + 1 < cuts.length; i++) {
        const [x0, y0] = moved(...projectV(v, u, 0, cuts[i]), a);
        const [x1, y1] = moved(...projectV(v, u, 0, cuts[i + 1]), a);
        track.under.push(seg(x0, y0, x1, y1, Math.max(0.6, 2 * sigmaV(v, (cuts[i] + cuts[i + 1]) / 2)), INK));
      }
    }
    // The judgement rule, red (Defender's now-line), per lane, thickening upward on a hit.
    LANES.forEach((lane, k) => {
      const a = k < 2 ? left : right;
      const h = ruleThickness(f, k);
      const x0 = HIGHWAY.vx + lane.u0;
      const x1 = HIGHWAY.vx + lane.u1;
      const [cx, cy] = moved((x0 + x1) / 2, JUDGE.y + JUDGE.h / 2 - h / 2, a);
      track.under.push(rect(cx, cy, x1 - x0, h, RED, { rot: a.rot }));
      // (Below the grown chips: they settle over the rule, y 840–927.)
      const [lx, ly] = moved(x0 + 12, 946, a);
      track.glyphs.ui.push(...text(lane.label, lx, ly, 22, L.ui, INK, { rot: a.rot }));
    });

    // The notes, far to near, each a chip on the highway, drawn with their own short shutter and growing over their last 200 px, so
    // every face reads as it is hit (R1-11); removed on the hit frame, where a faced chip pops 1.18× and fades as PERFECT prints. In
    // the crane's plan view they lie flat in their lanes all the way up the poster (the song's score) and stand as it tips back.
    const nf = noteTime(f);
    for (let i = NOTES.length - 1; i >= 0; i--) {
      const n = NOTES[i];
      const d = n.at - nf;
      if (d > far) continue;
      const fade = d > HIGHWAY.ahead ? v.fade : 1;
      if (fade <= 0.01) continue;
      if (struck(n.at, nf)) {
        const p = popAt(n, nf, L);
        if (p) {
          pops.push(p);
          // His hit: Swiss ink (as built it flashed Swiss red for 3 frames — red is Defender's).
          track.under.push(rect(p.x, p.y, p.w, p.h, INK, { r: 6, alpha: p.alpha }));
          track.glyphs.faces.push({ ch: p.face, x: ex(p.x), y: ey(p.y), size: p.em, color: PAPER, alpha: p.alpha });
        }
        continue;
      }
      const c = noteChip(n, d, L, v);
      notes.push({ ...n, ...c });
      if (n.kind === 'hat') track.under.push(rect(c.x, c.y, c.w, c.h, INK, { alpha: fade }));
      else if (n.kind === 'roll') track.under.push(rect(c.x, c.y, c.w, c.h, RED, { alpha: fade }));
      else if (n.kind === 'probe') track.under.push({ kind: 'ellipse', x: ex(c.x), y: ey(c.y), w: c.w, h: c.h, color: RED, alpha: fade });
      else if (n.kind === 'byte') {
        // A paper square with a #111 keyline, the byte on it: the signature riding the HAT lane (never decoded).
        const line = BYTE_CHIP.line * c.s;
        track.under.push(rect(c.x, c.y, c.w, c.h, INK, { r: 3 * c.s, alpha: fade }), rect(c.x, c.y, c.w - 2 * line, Math.max(0, c.h - 2 * line), PAPER, { r: 2 * c.s, alpha: fade }));
        if (n.text && c.em > 2) track.glyphs.ui.push(...text(n.text, c.x, c.y + 0.02 * c.em, c.em, L.ui, INK, { align: 0.5, alpha: fade }));
      } else {
        track.under.push(rect(c.x, c.y, c.w, c.h, INK, { r: 4 * c.s, alpha: fade }));
        if (n.face && c.em > 2) track.glyphs.faces.push({ ch: n.face, x: ex(c.x), y: ey(c.y), size: c.em, color: PAPER, alpha: fade });
      }
    }
    // His stamps on Defender's red: the caught probes and the scan bars, each with his amber ω (a #111 keyline).
    for (const st of stampsAt(nf)) {
      if (st.alpha <= 1e-3) continue;
      if (st.kind === 'probe') track.under.push({ kind: 'ellipse', x: ex(st.x), y: ey(st.y), w: st.w, h: st.h, color: RED, alpha: st.alpha });
      else track.under.push(rect(st.x, st.y, st.w, st.h, RED, { alpha: st.alpha }));
      if (st.omega > 1) track.glyphs.faces.push(amberOmega(st.x, st.y - 0.08 * st.omega, st.omega, st.alpha));
    }
    // Down the highway, the future's callouts: a dot on its edge, a hairline out to the margin, the label (on its rule in plan).
    for (const l of horizonLabels(f)) {
      if (l.alpha <= 1e-3) continue;
      track.under.push({ kind: 'ellipse', x: ex(l.anchor[0]), y: ey(l.anchor[1]), w: 7, h: 7, color: l.color, alpha: l.alpha });
      if (l.leader && l.align > 0.5) track.under.push({ ...seg(l.anchor[0] - 6, l.anchor[1], l.at[0] + 10, l.at[1], 1.5, l.color), alpha: l.alpha * smoothstep(0.5, 1, l.align) });
      track.glyphs.bold.push(...text(l.text, l.at[0], l.at[1], l.size, L.bold, l.color, { align: l.align, alpha: l.alpha }));
    }
    // The hats' ticks under the rule (6 px, fading over 6 f).
    for (const n of JUDGED) {
      const t = f - n.at;
      if ((n.kind !== 'hat' && n.kind !== 'byte') || t < 0 || t >= 6 || f >= FULL_COMBO) continue;
      track.under.push(rect(HIGHWAY.vx + laneU(2), JUDGE.y + JUDGE.h + 6, 2, 6, INK, { alpha: 1 - t / 6 }));
    }
    // The bar labels on the bar lines down the highway (drop 2's bars from 5, then the outro's): Defender's world counts the bars, in
    // red; in the plan view, set small enough that a bar's height on the poster still holds them apart.
    GAME_TYPE.bars.forEach((label, k) => {
      const d = barFrame(HIGHWAY_BARS[k]) - f;
      if (d < 0 || d > far) return;
      const fade = d > HIGHWAY.ahead ? v.fade : 1;
      if (fade <= 0.01) return;
      const s = sigmaV(v, d);
      const [x, y] = projectV(v, -870, 0, d);
      const gap = v.c >= 1 ? Infinity : Math.abs(y - projectV(v, -870, 0, d + 96)[1]);
      const size = Math.min(48 * s, 0.7 * gap);
      if (size < 6) return;
      track.glyphs.bold.push(...text(label, x, y - (20 / 48) * size, size, L.bold, RED, { align: 1, alpha: fade }));
    });

    // COMBO, his streak (cropped by the top edge; it flies off with the right half on FULL COMBO) and its label: Swiss ink (it was red;
    // red is Defender's — sheet §1.3 C).
    const c = combo(f);
    const comboSize = 360 / 0.727;
    const rightHalf = apart(f, 1);
    const digits = String(c);
    // On each hit the new count pops (1.12 → 1 over 4 f, its frame the hit's).
    const changed = JUDGED.filter((n) => struck(n.at, f)).pop()?.at;
    const popped = changed === undefined ? 1 : 1 + 0.12 * (1 - smoothstep(0, 4, f - changed + 0.25));
    const nx = 1880 + rightHalf.dx;
    const ny = 330 - 0.364 * comboSize;
    const size = comboSize * popped;
    const w = [...digits].reduce((a, ch) => a + L.heavy(ch), 0) * size;
    // As FULL COMBO slams in over it, the numeral steps back to a ghost (the headline is black on paper, the count behind it pale).
    // Round 1 (R2): it counts in a mid tone (COMBO_TONE toward the paper) — the big pale Swiss numeral behind the play — so each swap of
    // its digits and each hit's pop swings its corner of the frame by less than the strict flash test's 0.1 (in #111 it swung 6 a second).
    const ghost = mixRGB(INK, PAPER, lerp(COMBO_TONE, 0.78, impact(f, FULL_COMBO, 6)));
    type.glyphs.heavy.push(...text(digits, nx - w, ny - 0.364 * (size - comboSize), size, L.heavy, ghost, { rot: rightHalf.rot, pivot: [nx, ny] }));
    type.glyphs.bold.push(...text(GAME_TYPE.combo, 1500 + rightHalf.dx, 368, 28, L.bold, INK, { rot: rightHalf.rot }));

    // FULL COMBO slams in from both sides on drop2 6.4 (I, lead 6), set to fit between x 120 and 1800 on baseline 300.
    if (f >= FULL_COMBO - 6) {
      const wf = [...GAME_TYPE.full].reduce((a, ch) => a + L.heavy(ch), 0);
      const wc = [...GAME_TYPE.combo].reduce((a, ch) => a + L.heavy(ch), 0);
      const size = Math.min(230 / 0.727, (1680 - 60) / (wf + wc));
      const p = impact(f, FULL_COMBO, 6);
      const y = 300 - 0.364 * size;
      type.glyphs.heavy.push(...text(GAME_TYPE.full, lerp(-wf * size - 40, 120, p), y, size, L.heavy, INK));
      type.glyphs.heavy.push(...text(GAME_TYPE.combo, lerp(1960 + wc * size, 1800, p), y, size, L.heavy, INK, { align: 1 }));
    }
    // Defender's lens (the red disc) and its burst: 8 red bars, each notched with his amber ω.
    const d = discAt(f);
    if (d.disc) type.over.push({ kind: 'ellipse', x: ex(d.disc.x), y: ey(d.disc.y), w: 2 * d.disc.r, h: 2 * d.disc.r, color: RED });
    for (const b of d.bars) {
      type.over.push({ kind: 'rect', x: ex(b.x), y: ey(b.y), w: 40, h: 8, rot: b.rot, color: RED, alpha: b.alpha });
      hero.glyphs.jp.push({ ...amberOmega(b.x, b.y, 18, b.alpha), rot: b.rot });
    }

    // PERFECT, over the track's notes and knocked out of anything under it.
    for (const t of perfectTags(f, L)) {
      if (t.alpha <= 1e-3) continue;
      for (const g of text(GAME_LABELS.perfect, t.x, t.y, t.size, L.ui, INK, { align: t.align, alpha: t.alpha, rot: t.rot })) hero.glyphs.ui.push({ ...g, outline: TAG.outline, outlineColor: PAPER });
    }
    // The last VOX note reaches the playhead with no rule left: a small ✧ burst (6 rays, 8 f) in Swiss ink (his note; it was red).
    const lastVox = NOTES_VOX[NOTES_VOX.length - 1];
    const tb = f - lastVox;
    if (tb >= 0 && tb < 8) {
      const [bx, by] = project(laneU(3), 0, 0);
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3 + Math.PI / 6;
        const r = 14 + 9 * tb;
        hero.over.push({ kind: 'segment', x: ex(bx + Math.cos(ang) * r), y: ey(by - Math.sin(ang) * r), w: 22, h: 5, rot: ang, color: INK, alpha: 1 - tb / 8 });
      }
    }
    // Defender's ticker under SCORE (JetBrains Mono, red): one line at a time, typed in over a 16th.
    const tk = tickerAt(f);
    if (tk) type.glyphs.mono.push(...text([...tk.text].slice(0, tk.count).join(''), TICKER.x, TICKER.y, TICKER.size, L.mono, RED, { alpha: tk.alpha }));
  }

  // SCORE: top left on the page; on the tilt its line drops faster than the camera (down the screen, growing, accelerating) and lands
  // on the gauge's front on drop2 6.1: the payout.
  if (f < TILT.to) {
    const u = clamp((f - TILT.from) / (TILT.to - TILT.from));
    const sx = lerp(640, 330, u);
    const sy = lerp(60, 540, u * u);
    const size = lerp(32, 48, u);
    const a = gameAim(f);
    // Screen → world through the camera (C = (960 + aim.x, 540 − aim.y), zoom; the roll is small and left out).
    const wx = 960 + a.x + (sx - 960) / a.zoom;
    const wy = 540 - a.y + (sy - 540) / a.zoom;
    type.glyphs.medium.push(...text(GAME_TYPE.score(score(f)), wx, wy, size / a.zoom, L.medium, u > 0 ? INK_ON_DARK(u) : INK));
  }

  // S31: the monitor (once the tilt brings it in), the snap's pieces, the surfer.
  const ol: OverflowLayout = { mono: L.mono, jp: L.faces, rounded: L.rounded };
  const inMonitor = f >= TILT.from;
  const m = inMonitor ? overflowContent(f, ol) : null;
  // Below the page (y 1080, its 6 px bottom rule) lies the monitor's dark world: it masks the highway's near end.
  const mask: Shape[] = onPage ? [rect(960, 1080 + 1500, 6000, 3000, DARK), rect(960, 1077, 6000, 6, INK)] : [];
  const h = heroAt(f);
  // Inside the tilt's blur he changes from S30's ＼(•ω•)／ into the monitor's amber surfer: a 2-frame cross-fade on the same spot.
  const swap = f >= TILT.from && f < TILT.to ? smoothstep(SURF_LOOK - 1, SURF_LOOK + 1, f) : h.look === 'swiss' ? 0 : 1;
  if (swap < 1) {
    const pose = h.look === 'swiss' ? h : { ...h, face: HERO2.jump, rot: 0, look: 'swiss' as const };
    // A calm halo of paper behind him (soft-edged), so the ridges and the notes passing behind never cut into his face.
    // (Fainter while the crane's poster lies flat: its hairlines pass behind him without cutting in.)
    if (onPage && f < TILT.from) hero.under.push({ ...rect(h.x, h.y + 0.02 * h.width, h.width + 70, 0.5 * h.width + 40, PAPER, { r: 0.2 * h.width, alpha: lerp(0.55, 1, highwayView(f).relief) }), soft: 36 });
    hero.glyphs.jp.push(...swissHero(pose, L, 1 - swap));
  }
  const light = { under: [] as Shape[], glyphs: { rounded: [] as Glyph[] }, over: [] as Shape[] };
  if (swap > 0) {
    // The amber surfer; flung into the kernel, his arms fade inside the spin's blur and he lands as (•ω•) (as built he became the reel
    // card's neon tube here).
    const s: Surfer = { face: h.face === TUBE_FACE ? TUBE_FACE : SURF_FACE, x: h.x, y: h.y, width: h.width, rot: h.rot, sx: h.sx, sy: h.sy, tube: 0, level: 1, arms: h.arms };
    hero.glyphs.rounded.push(...heroGlyphs(s, ol, AMBER, swap));
  }
  if (inMonitor) light.under.push(...sparkShapes(f));
  const pan = panWorld(f);
  return {
    aim,
    back,
    ridges: ridgesAt(f, spec),
    notes,
    pops,
    monitor: { under: [...mask, ...(m?.monitor.under ?? [])], glyphs: m ? { mono: m.monitor.glyphs.mono ?? [] } : {}, over: m?.monitor.over ?? [] },
    inner: m ? { under: m.faces.under, glyphs: { faces: m.faces.glyphs.jp ?? [] }, over: [] } : { under: [], glyphs: {}, over: [] },
    track,
    type,
    glass: pan.glass,
    glow: pan.light,
    hero,
    light,
    fore: m ? m.pieces : { under: [], glyphs: {}, over: [] },
  };
}

/** The monitor's dark ground (the FlatLayer's paper under everything). */
export const GAME_GROUND = DARK;
/** The frames Drop2Game draws. */
export const GAME_FRAMES = { from: GAME, to: KERNEL.from, pan: PAN } as const;

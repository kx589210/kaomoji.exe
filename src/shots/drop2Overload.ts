// S32 OVERLOAD, drop2 7.1–8.3 − 1 (build sheet notes/d2build/sheet.md §4.2 rows drop2 7.1–8.2&, §5.9, §5.10; hand-off H4): the hero locked
// dead centre while eight worlds arrive, each by its own signature move — the neon tube igniting, the LED column scan, the Swiss red
// bar, the Riso plates snapping into register, the brutal press, the star streaks, the terminal log (the one cut that flashes into
// characters, iteration 2), S27's blades — and (round 2) every world racing past him in its own direction while he ticks on the
// 8ths — until the picture sticks in ASCII (drop 2's own field on the terminal grid, from drop2 8.1) and climbs the monitor's density ramp a
// step a kick to a wall of @ on the last kick, only his face calm in his black spot. E9: the picture really drops
// frames (`stutterFrame`), and an honest fps line says so. E10: the guest (￣▽￣) with a fresh cocktail, one smooth drop falling at true
// time while everything stutters; the frame it lands is the freeze (T7 is src/shots/drop2Crash.ts).
// Pure: Node tests import it (tests/drop2Overload*.test.ts). src/scenes/drop2Overload.ts copies it to the GPU. Layout px: 1920 × 1080,
// origin top-left, y down; the flat world is centred, y up (X(), Y() convert).
import { RAMP } from '../actors/asciiFace.ts';
import { LOG_LINES } from '../content/boot.ts';
import { CAT, GUEST as GUEST_FACE, GUEST_INFECTED, REEL_CAST } from '../content/castDrop2.ts';
import { CAMERA_FPS_LINE, HERO2, MONITOR2, SWISS_NUMERALS, fpsLine } from '../content/drop2.ts';
import { type Pose, frontal } from '../engine/camera.ts';
import { type RGB, linear, mixRGB, scaleRGB, transmit } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Blend, Shape } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import { type Advance, typeset } from '../engine/typeset.ts';
import type { Look } from '../engine/types.ts';
import { aimPose } from '../motion/hit.ts';
import { CAMERA_LINE, CRASH, CUTS2, DRIP, GUEST, HATS2, LATCH, REEL, REEL_BLADES, REGISTER, SATURATE, WIPES, honestFps, stutterFrame } from '../score/drop2.ts';
import { BRIDGE_B_END } from '../score/bridgeB.ts';
import { seedFrame } from '../score/film.ts';
import { cameraLineText, lineFade } from './bridgeB.ts';
import { BLADE_LINES, type BladeLine, COLOR_LAW_V2, LAW, PALETTES, REEL_DRESS, RETICLE_HAT, SWISS_OMEGA, T7_GRID, drop2Segment, flow, hop, impact, impactSquash, press, springL, t7CellCentre } from './drop2Shared.ts';
import { FOV, FRONT } from './swiss.ts';
import { terminalLook } from '../worlds/terminal.ts';

// ——— Frames and coordinates ————————————————————————————————————————————————————————————————————————————————————————————————————

/** Layout x (top-left origin) → the flat world's x (centred). */
export const X = (x: number): number => x - 960;
/** Layout y (top-left origin, y down) → the flat world's y (centred, y up). */
export const Y = (y: number): number => 540 - y;
const DEG = Math.PI / 180;
/** The output frame a sub-frame instant belongs to (the shutter is 0.5 and there is no phosphor tail, so it never reaches ±0.5). */
export const outputOf = (s: number): number => Math.round(s);
/** Content time of sub-frame instant `s`: the frame the picture really shows (E9), plus the sub-frame's offset, so a held frame repeats its source exactly. */
export const contentTime = (s: number): number => {
  const out = outputOf(s);
  return stutterFrame(out) + (s - out);
};
/** From here (LATCH, the drop2 8.1 kick) the picture is drop 2's own character field; drop2 8.1 − 1 is still the reel, under the flash's last frame. */
export const FIELD_FROM = LATCH;

// ——— The cards (sheet §5.9) ——————————————————————————————————————————————————————————————————————————————————————————————————

export type World = 'neon' | 'led' | 'swiss' | 'riso' | 'interlude' | 'space' | 'terminal';
/** drop2 bar 7's cards in order: the frame each takes over (by content time) and how. */
export const CARDS: readonly { world: World; at: number; by: 'whip' | 'scan' | 'cut' | 'plates' | 'streaks' }[] = [
  { world: 'neon', at: REEL.from, by: 'whip' },
  { world: 'led', at: WIPES[0], by: 'scan' },
  { world: 'swiss', at: CUTS2[1], by: 'cut' },
  { world: 'riso', at: WIPES[1], by: 'plates' },
  { world: 'interlude', at: CUTS2[2], by: 'cut' },
  { world: 'space', at: WIPES[2], by: 'streaks' },
  { world: 'terminal', at: CUTS2[3], by: 'cut' },
];
/** The blades bring back S27's six worlds over the terminal card: C1 on drop2 7.4&, C2 + C3 on drop2 7.4& + 3, C4 on drop2 8.1 − 6, C5 on drop2 8.1 − 3. */
export const BLADE_AT: readonly number[] = [REEL_BLADES[0], REEL_BLADES[1], REEL_BLADES[1], REEL_BLADES[2], REEL_BLADES[3]];
/** The world a card shows at content time `c` (the latest card that has arrived; S27's composite from the first blade). */
export function cardAt(c: number): World {
  let w: World = 'neon';
  for (const k of CARDS) if (c >= k.at) w = k.world;
  return w;
}
/** The LED column scan: 27 columns of 12 px a frame from drop2 7.1&, so the frame is lit by drop2 7.1& + 5 (screen x, quantised to the dot columns). */
export const scanEdge = (c: number): number => 12 * Math.floor(27 * (c - (WIPES[0] - 1)));
/**
 * The Riso plates: the pink sheet in from the left (his face knocked out of it, paper-white), the blue plate from the right, meeting
 * 56 px out of register on drop2 7.2& + 5 — a white crescent on one side of him and a purple overprint on the other — …
 */
export const PLATES = { from: WIPES[1], meet: REGISTER - 1, register: REGISTER, apart: 56 } as const;
/** The plates run in at a constant 320 px a frame, like the press's rollers, and land on their marks on drop2 7.2& + 5 (round 2: a cubic-out entry left drop2 7.2& + 4 … 7.2& + 5 nearly still). */
const platesIn = (c: number): number => clamp((c - (PLATES.from - 1)) / (PLATES.meet - (PLATES.from - 1)));
/** After the snap the pink plate drifts back out of register, leftward and gathering speed (4·t² px: 4, 16, 36), until the cut: the press losing its grip. */
export const pinkDrift = (c: number): number => (c > PLATES.register ? 4 * (c - PLATES.register) ** 2 : 0);
/** … the pink sheet's leading edge (screen x) … */
export const pinkEdge = (c: number): number => 1920 * platesIn(c);
/** … and the blue plate's offset (px right of register), snapping into register on drop2 7.3 − 6 (S, 2 f): the clack. */
export function blueOffset(c: number): number {
  // His plate decelerates onto its mark (quadratic out) while the pink sheet sweeps on at full speed: his face lands, readable.
  const slide = (1920 - PLATES.apart) * (1 - platesIn(c)) ** 2;
  const seat = PLATES.apart * (1 - (1 - clamp(c - PLATES.meet)) ** 3);
  return slide + PLATES.apart - seat;
}
/** The star-streak wipe: the reveal edge runs 320 px a frame from drop2 7.3& (screen x), gone past the frame by drop2 7.3& + 5. */
export const streakEdge = (c: number): number => 320 * (c - (WIPES[2] - 1));

/** One blade of the reel's composite: the world it opens, its line, how far its tip has run (px), and the shear of the new piece (px along it). */
export type BladeState = { world: World; line: BladeLine; from: readonly [number, number]; dir: readonly [number, number]; len: number; normal: readonly [number, number]; tip: number; shear: number; age: number };
/** The unit normal of a blade pointing into its new piece (layout, y down). */
export function bladeNormal(b: BladeLine): [number, number] {
  const dx = b.to[0] - b.from[0];
  const dy = b.to[1] - b.from[1];
  const l = Math.hypot(dx, dy);
  const n: [number, number] = [-dy / l, dx / l];
  const want = b.side === 'above' ? n[1] < 0 : b.side === 'right' ? n[0] > 0 : n[0] < 0;
  return want ? n : [-n[0], -n[1]];
}
/**
 * The five blades at content time `c` (inactive before their frame): the tip runs on the launch (L keyed one frame early, 3 f). The reel
 * slices them into the terminal card, so C1's new piece is the one below it (the interlude: S27's region 0); the others open as in S27.
 */
export function bladesAt(c: number): BladeState[] {
  return BLADE_LINES.map((line, k) => {
    const n = bladeNormal(line);
    const at = BLADE_AT[k];
    const dx = line.to[0] - line.from[0];
    const dy = line.to[1] - line.from[1];
    const len = Math.hypot(dx, dy);
    const p = springL(c, at);
    const s = p * lerp(14, 3, flow(clamp((c - at) / 18)));
    const world: World = k === 0 ? 'interlude' : line.world;
    return { world, line, from: line.from, dir: [dx / len, dy / len], len, normal: k === 0 ? [-n[0], -n[1]] : n, tip: Math.max(0, p) * len, shear: s, age: c - at };
  });
}
/**
 * The world showing at layout point (x, y) under the blades at content time `c` (S27's BSP: C1 splits the frame — below it, behind its
 * tip, the interlude; C2 and C4 split the terminal above, C3 and C5 the interlude below). The scene's compositor does the same per pixel.
 */
export function regionAt(x: number, y: number, blades: readonly BladeState[]): World {
  const inside = (b: BladeState): boolean => {
    if (b.age < 0) return false;
    const px = x - b.from[0];
    const py = y - b.from[1];
    const along = px * b.dir[0] + py * b.dir[1];
    return px * b.normal[0] + py * b.normal[1] > 0 && along < Math.min(b.tip, b.len) && along > -1;
  };
  const [c1, c2, c3, c4, c5] = blades;
  if (inside(c1)) return inside(c3) ? 'riso' : inside(c5) ? 'led' : 'interlude';
  return inside(c2) ? 'swiss' : inside(c4) ? 'neon' : 'terminal';
}

// ——— The camera ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The camera of drop2 bar 7 is one continuous move (the review's 顿 fix: the cards must never settle while the music runs at full tilt): a
 * push from drop2 7.1 that gathers speed through the reel — 40 % of the way to 1.62 in log zoom (u^1.5: ≈ 1.2 px a frame at the frame's
 * edges by the Swiss card, ≈ 2.5 by the terminal) — with a constant roll drift −1.5° → +1.5°; from drop2 7.4& + 4 the crash-zoom (I, cubic) adds
 * the rest, landing 1.62 on drop2 8.1; the content then creeps on to 1.84 by drop2 8.3 − 1.
 */
export const CRASH_ZOOM = { from: REEL_BLADES[1] + 1, to: LATCH, land: 1.62, end: 1.84, push: 0.4, roll: 1.5 } as const;
const LOG_LAND = Math.log(CRASH_ZOOM.land);
/** The cards' camera at content time `c`: the push and the roll drift over drop2 bar 7, the crash-zoom, the creep. */
export function reelCamera(c: number): { zoom: number; roll: number } {
  if (c < CRASH_ZOOM.to) {
    const u = clamp((c - REEL.from) / (CRASH_ZOOM.to - REEL.from));
    const p = impact(c, CRASH_ZOOM.to, CRASH_ZOOM.to - CRASH_ZOOM.from);
    const drift = (-1 + 2 * clamp((c - REEL.from) / (CRASH_ZOOM.from - REEL.from))) * CRASH_ZOOM.roll * DEG;
    return { zoom: Math.exp(LOG_LAND * (CRASH_ZOOM.push * u ** 1.5 + (1 - CRASH_ZOOM.push) * p)), roll: drift * (1 - p) };
  }
  const q = clamp((c - CRASH_ZOOM.to) / (CRASH - 1 - CRASH_ZOOM.to));
  return { zoom: CRASH_ZOOM.land * (CRASH_ZOOM.end / CRASH_ZOOM.land) ** (1 - (1 - q) ** 1.5), roll: 0 };
}
/** His growth under the crash-zoom: 1 until drop2 7.4& + 4, 1.5 (900 px) on drop2 8.1 (the same cubic impact), then carried by the creep (≈ 1020 px at the freeze). */
export function crashGrowth(c: number): number {
  if (c < CRASH_ZOOM.from) return 1;
  if (c < CRASH_ZOOM.to) return 1.5 ** impact(c, CRASH_ZOOM.to, CRASH_ZOOM.to - CRASH_ZOOM.from);
  return (1.5 * reelCamera(c).zoom) / CRASH_ZOOM.land;
}
/**
 * The cards' pose at instant `cam`. The scene films the reel's content at the honest stutter's content time but moves this camera
 * (and his scale with it) at true time, so the picture's held frames still drift and push (sheet §5.14: the rig keeps moving).
 */
export const cardPose = (c: number): Pose => {
  const { zoom, roll } = reelCamera(c);
  return aimPose({ zoom, x: 0, y: 0, roll }, FRONT, FOV);
};
/** The screen: the hero and every screen-fixed layer. */
export const SCREEN_POSE: Pose = frontal(FRONT, 0, 0, FOV);
/** The hero's face width (bracket to bracket ink) at content time `c`: locked at 600 px, +4 % on every 8th, landing squashed from the whip, then carried by the crash-zoom (900 on drop2 8.1, ≈ 1020 at the freeze). */
export const HERO_WIDTH = 600;
/**
 * His tick (round 2, D2-REEL-STATIC): on every 8th of drop2 bar 7 until the blades he swells to 1.04 inside that frame's shutter (k ± ¼, so
 * the frame before never shows it and no two sizes double up), then settles back to 1 at a constant rate over the 8th (never quite still).
 * A scale about his centre only: no translation, so the 0 px lock holds.
 */
export const HERO_TICK = { gain: 0.04, every: 12 } as const;
export const TICKS: readonly number[] = Array.from({ length: (REEL_BLADES[0] - REEL.from) / HERO_TICK.every }, (_, i) => REEL.from + i * HERO_TICK.every);
export function heroTick(c: number): number {
  const at = TICKS.filter((k) => k - 0.25 <= c).pop();
  if (at === undefined) return 0;
  const t = c - at;
  if (t < 0.25) return (t + 0.25) / 0.5;
  return 1 - clamp((t - 0.25) / (HERO_TICK.every - 0.5)); // back to exactly 1 as the next one starts
}
export function heroScale(c: number): { s: number; sx: number; sy: number } {
  const crash = crashGrowth(c);
  const beat = c >= CRASH_ZOOM.from ? 0 : HERO_TICK.gain * heroTick(c);
  // The landing squash (1.08 / 0.92) builds over the landing frame's own shutter, so it never doubles against the whip's last sub-frames.
  const land = (impactSquash(c, REEL.from) / 0.06) * 0.08 * clamp((c - REEL.from) / 0.5);
  return { s: crash * (1 + beat), sx: 1 + land, sy: 1 - land };
}

// ——— The layout only the browser can measure ————————————————————————————————————————————————————————————————————————————————

/** A string's ink at 1 em: from its start (left, right; ems right of the start) and from the middle line (up, down; ems). */
export type InkBox = { left: number; right: number; up: number; down: number };
export type FontKey = 'rounded' | 'jp' | 'mono' | 'display' | 'bold';
/** A cell of the hero's ASCII fill, relative to his face centre at 600 px (layout px, y down). */
export type AsciiCell = { dx: number; dy: number; ch: string; lum: number; part: number };
export type HeroFace = 'base' | 'squeeze' | 'crashed';
export const HERO_FACES: Readonly<Record<HeroFace, string>> = { base: HERO2.base, squeeze: HERO2.squeeze, crashed: HERO2.crashed };
/** The hero's face at content time `c` (sheet §5.10.3): (•ω•), (>ω<) from drop2 8.2, (×ω×) from the freeze. */
export const heroFaceAt = (c: number): HeroFace => (c >= CRASH ? 'crashed' : c >= SATURATE[2] ? 'squeeze' : 'base');
export type OverloadLayout = {
  advance: Readonly<Record<FontKey, Advance>>;
  /** Ink boxes of every string placed by its ink, keyed `${font}|${text}`. */
  ink: ReadonlyMap<string, InkBox>;
  /** The terminal card's ASCII hero (9.6 × 19.2 cells). */
  ascii: readonly AsciiCell[];
  /** The LED card's hero: lit dots on the 12 px lattice, (i, j) dots right of and below his centre. */
  led: readonly (readonly [number, number])[];
  /** The LED marquee: lit dots (col, row from the top) of one period `width` dots wide, 8 rows tall. */
  marquee: { width: number; lit: readonly (readonly [number, number])[] };
};
export const inkKey = (font: FontKey, text: string): string => `${font}|${text}`;
/** What the scene must measure: every face drawn by its ink. */
export const INK_STRINGS: readonly [FontKey, string][] = [
  ...Object.values(HERO_FACES).map((t) => ['rounded', t] as [FontKey, string]),
  ['jp', HERO2.base],
  ['display', SWISS_NUMERALS.reel],
];
/** The LED card's marquee text. */
export const MARQUEE = `${REEL_CAST[1].face}  ${REEL_CAST[2].face}  `;
/** Every string the part draws, by atlas (src/content lists each with its role; tests check the atlases cover them). */
export const OVERLOAD_STRINGS: Readonly<Record<FontKey, readonly string[]>> = {
  rounded: [...Object.values(HERO_FACES), REEL_CAST[0].face, GUEST_FACE.face, GUEST_INFECTED.face],
  jp: [HERO2.base, REEL_CAST[3].face, CAT.face],
  mono: [RAMP, ...LOG_LINES.map((l) => l.text), ...MONITOR2.rows, ...MONITOR2.copy, fpsLine(60, 0, false), fpsLine(0, 0, true), CAMERA_FPS_LINE, '0123456789'],
  display: [SWISS_NUMERALS.reel],
  /** JetBrains Mono ExtraBold: the terminal card's ASCII hero (the ramp's strokes heavy enough to carry a 600 px face). */
  bold: [RAMP],
};

// ——— Drawing helpers ———————————————————————————————————————————————————————————————————————————————————————————————————————

/** One draw of a card: a blend, a camera (the card's flowing one or the fixed screen) and its flat content. */
export type Draw = { blend: Blend; cam: 'card' | 'screen'; content: FlatContent };
/** A card: its ground and its draws in order. */
export type CardFrame = { ground: RGB; draws: Draw[] };
const EMPTY: FlatContent = { under: [], glyphs: {}, over: [] };
const content = (o: { under?: Shape[]; over?: Shape[]; glyphs?: Record<string, Glyph[]> }): FlatContent => ({ under: o.under ?? [], glyphs: o.glyphs ?? {}, over: o.over ?? [] });

/** Glyphs of `text` in `font`, its ink centred on layout (cx, cy) and `width` px wide (a face, by its brackets). */
export function inkGlyphs(L: OverloadLayout, font: FontKey, text: string, o: { cx: number; cy: number; width: number; sx?: number; sy?: number; color: (i: number, ch: string) => RGB; extra?: Partial<Glyph> }): Glyph[] {
  const box = L.ink.get(inkKey(font, text));
  if (!box) throw new Error(`no ink box for ${font} "${text}"`);
  const sx = o.sx ?? 1;
  const sy = o.sy ?? 1;
  const em = o.width / (box.right - box.left);
  const line = typeset(text, L.advance[font]);
  const start = o.cx - (em * (box.left + box.right)) / 2;
  const mid = o.cy - (em * (box.down - box.up)) / 2;
  const out: Glyph[] = [];
  [...line.chars].forEach((ch, i) => {
    if (ch.ch.trim() === '') return;
    const x = o.cx + (start + em * ch.x - o.cx) * sx;
    const y = o.cy + (mid - o.cy) * sy;
    out.push({ ch: ch.ch, x: X(x), y: Y(y), size: em * sy, stretch: sx / sy, color: o.color(i, ch.ch), ...o.extra });
  });
  return out;
}
/** Glyphs of a line of text left-aligned at layout x, its middle line on layout y. */
function textAt(text: string, adv: Advance, x: number, y: number, size: number, color: RGB, extra: Partial<Glyph> = {}): Glyph[] {
  const line = typeset(text, adv);
  return line.chars.filter((ch) => ch.ch.trim() !== '').map((ch) => ({ ch: ch.ch, x: X(x + ch.x * size), y: Y(y), size, color, ...extra }));
}
/** A neon tube between two layout points, as drop 1's club draws them: dark glass, a glow, the tube and its hot core. */
function tube(glass: Shape[], light: Shape[], x0: number, y0: number, x1: number, y1: number, w: number, hue: RGB, level: number): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const s: Shape = { kind: 'segment', x: X((x0 + x1) / 2), y: Y((y0 + y1) / 2), w: len + w, h: w, rot: -Math.atan2(y1 - y0, x1 - x0), color: GHOST };
  glass.push(s);
  if (level > 0.01) {
    light.push({ ...s, h: w * 2.8, color: scaleRGB(hue, 0.12 * level), soft: w * 1.4 });
    light.push({ ...s, color: scaleRGB(hue, level) });
    light.push({ ...s, h: w * 0.4, w: len + w * 0.4, color: mixRGB(scaleRGB(hue, 0.9 * level), [level, level, level], 0.5) });
  }
}
const GHOST = linear('#1C1A24');
const TUBE = 0.018;
/** His tube is thinner than the club's signs (he is 600 px, they were 80): a neon stroke, not a fill. */
const HERO_TUBE = 0.026;
const THIN = /[─-╿｡-ﾟヽ〜~︵ノ＼／/|=3]/u;
const tubeOf = (ch: string): number => (THIN.test(ch) ? 0.001 : TUBE);
/** The 16th the instant is in, and how far into it. */
const sixteenth = (c: number): { k: number; t: number } => {
  const k = HATS2.filter((h) => h <= c).pop() ?? HATS2[0];
  return { k, t: c - k };
};

// ——— The heroes, one per world (REEL_DRESS) ————————————————————————————————————————————————————————————————————————————————

const C = { x: 960, y: 540 } as const;
const OMEGA = 2;
const RGB_OF = {
  amber: linear(PALETTES.neon.amber),
  ink: linear(PALETTES.swiss.ink),
  red: linear(PALETTES.swiss.red),
  green: linear(PALETTES.terminal.green),
  text: linear(PALETTES.terminal.text),
  tpink: linear(PALETTES.terminal.pink),
  blue: linear(PALETTES.riso.blue),
  rpink: linear(PALETTES.riso.pink),
  gold: linear(PALETTES.space.hero),
  cyan: linear(PALETTES.neon.cyan),
  npink: linear(PALETTES.neon.pink),
  black: linear('#111111'),
} as const;

/** §1.3 C: his ω on Swiss paper (SWISS_OMEGA): amber, keyed in #111. */
const OMEGA_INK: RGB = linear(SWISS_OMEGA.fill);
const OMEGA_KEYLINE: RGB = linear(SWISS_OMEGA.keyline.color);

/** How far the tube overshoots as it ignites on drop2 7.1 (× its full level), and over how many frames the pop dies back to full. */
export const IGNITION_POP = { gain: 0.6, frames: 6 } as const;
/**
 * The tube's ignition as he lands from the whip: he arrives lit at 0.6 (drop2Overflow's LANDING_LEVEL), so drop2 7.1 ignites him at full
 * with a pop — ×1.6, easing back to 1 over 6 frames (the bloom flares with it). No flicker: a dark drop2 7.1 + 1 read as a drop-out (R1-05).
 */
export const ignition = (c: number): number => {
  const t = c - REEL.from;
  if (t < 0) return 0;
  const k = 1 - clamp(t / IGNITION_POP.frames);
  return 1 + IGNITION_POP.gain * k * k;
};

/** The hero in `world`'s dress at content time `c`: his draws, in order (screen-fixed). `field` = the plain rounded fill the character field reads. */
export function heroDraws(world: World, c: number, L: OverloadLayout, field = false, cam = c): Draw[] {
  const { s } = heroScale(cam);
  const { sx, sy } = heroScale(c);
  const width = HERO_WIDTH * s;
  const faceKey = heroFaceAt(c);
  const face = HERO_FACES[faceKey];
  const dress = REEL_DRESS[world];
  if (field) {
    const ink = linear(dress.fill ?? dress.tube?.color ?? dress.dots?.lit ?? dress.ascii?.ink ?? PALETTES.neon.amber);
    const glow: Shape = { kind: 'ellipse', x: 0, y: 0, w: FIELD_GLOW.w * s, h: FIELD_GLOW.h * s, color: scaleRGB(FIELD_GLOW.ink, fieldTint(c)), soft: FIELD_GLOW.soft * s };
    return [
      { blend: 'add', cam: 'screen', content: content({ under: [glow] }) },
      { blend: 'normal', cam: 'screen', content: content({ glyphs: { rounded: inkGlyphs(L, 'rounded', face, { cx: C.x, cy: C.y, width, color: () => ink }) } }) },
    ];
  }
  if (world === 'neon') {
    const level = ignition(c) * 1.05;
    const glass = inkGlyphs(L, 'rounded', face, { cx: C.x, cy: C.y, width, sx, sy, color: () => GHOST, extra: {} }).map((g) => ({ ...g, tube: HERO_TUBE }));
    const lit = glass.map((g) => ({ ...g, color: scaleRGB(RGB_OF.amber, level) }));
    const glow: Shape = { kind: 'ellipse', x: 0, y: 0, w: width * 1.5, h: width * 0.8, color: scaleRGB(RGB_OF.amber, 0.1 * level), soft: width * 0.35 };
    return [
      { blend: 'normal', cam: 'screen', content: content({ glyphs: { rounded: glass } }) },
      { blend: 'add', cam: 'screen', content: content({ under: [glow], glyphs: { rounded: lit } }) },
    ];
  }
  if (world === 'led') {
    const lit: Shape[] = [];
    const glow: Shape[] = [];
    const level = 1.5;
    for (const [i, j] of L.led) {
      const x = 12 * i * s;
      const y = -12 * j * s;
      glow.push({ kind: 'ellipse', x, y, w: 26 * s, h: 26 * s, color: scaleRGB(RGB_OF.amber, 0.1 * level), soft: 13 * s });
      lit.push({ kind: 'ellipse', x, y, w: 9.2 * s, h: 9.2 * s, color: scaleRGB(RGB_OF.amber, level) });
    }
    return [{ blend: 'add', cam: 'screen', content: content({ under: glow, over: [] , glyphs: {} }) }, { blend: 'add', cam: 'screen', content: content({ under: lit }) }];
  }
  if (world === 'swiss') {
    // §1.3 C (COLOR_LAW_V2): his ω on the Swiss paper is amber with a 2 px #111 keyline — red is Defender's alone.
    const jp = inkGlyphs(L, 'jp', HERO2.base, { cx: C.x, cy: C.y, width, sx, sy, color: (i) => (i !== OMEGA ? RGB_OF.ink : COLOR_LAW_V2 ? OMEGA_INK : RGB_OF.red) });
    const keyed = COLOR_LAW_V2 ? jp.map((g) => (g.ch === 'ω' ? { ...g, outline: SWISS_OMEGA.keyline.px / g.size, outlineColor: OMEGA_KEYLINE } : g)) : jp;
    return [{ blend: 'normal', cam: 'screen', content: content({ glyphs: { jp: keyed } }) }];
  }
  if (world === 'riso') {
    const off = blueOffset(c);
    const blue = transmit(RGB_OF.blue, 0.95);
    return [{ blend: 'multiply', cam: 'screen', content: content({ glyphs: { jp: inkGlyphs(L, 'jp', HERO2.base, { cx: C.x + off, cy: C.y, width, sx, sy, color: () => blue }) } }) }];
  }
  if (world === 'interlude') {
    const p = interludePress(c);
    const em = inkGlyphs(L, 'rounded', face, { cx: C.x, cy: C.y, width, color: () => RGB_OF.amber })[0]?.size ?? 200;
    const at = { cx: C.x + p.x, cy: C.y + p.y, width, sx, sy };
    const shadow = inkGlyphs(L, 'rounded', face, { ...at, cx: at.cx + 14 * p.shadow, cy: at.cy + 14 * p.shadow, color: () => RGB_OF.black });
    const fill = inkGlyphs(L, 'rounded', face, { ...at, color: () => linear(PALETTES.interlude.amber), extra: { outline: 8 / em, outlineColor: RGB_OF.black } });
    return [{ blend: 'normal', cam: 'screen', content: content({ glyphs: { rounded: [...shadow, ...fill] } }) }];
  }
  if (world === 'space') {
    const glow: Shape = { kind: 'ellipse', x: 0, y: 0, w: width * 1.7, h: width * 0.9, color: scaleRGB(RGB_OF.gold, 0.16), soft: width * 0.42 };
    return [
      { blend: 'add', cam: 'screen', content: content({ under: [glow] }) },
      { blend: 'normal', cam: 'screen', content: content({ glyphs: { rounded: inkGlyphs(L, 'rounded', face, { cx: C.x, cy: C.y, width, sx, sy, color: () => scaleRGB(RGB_OF.gold, 1.35) }) } }) },
    ];
  }
  // terminal: his ASCII fill (9.6 × 19.2 cells, JetBrains Mono ExtraBold 16 px), green to white on the highlights, the ω pink.
  const cells: Glyph[] = L.ascii.map((a) => ({
    ch: a.ch,
    x: X(C.x + a.dx * s),
    y: Y(C.y + a.dy * s),
    size: 16 * s,
    color: a.part === OMEGA ? scaleRGB(RGB_OF.tpink, 2.2) : scaleRGB(mixRGB(RGB_OF.green, RGB_OF.text, a.lum * a.lum), 2.2),
  }));
  return [{ blend: 'add', cam: 'screen', content: content({ glyphs: { bold: cells } }) }];
}

// ——— The worlds ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The NEON card's two cyan tube arcs, layout px (x0, y0, x1, y1): 18 segments each, 800 px wide, sagging 46 px, from y 760 and 790.
 * drop2Overflow's whip-pan imports them (and RUNNER), so the pan lands on the card's own tubes (tests/drop2Overflow.test.ts).
 */
export const NEON_ARCS: readonly (readonly [number, number, number, number])[] = [760, 790].flatMap((y0) =>
  Array.from({ length: 18 }, (_, i) => {
    const u0 = -1 + (2 * i) / 18;
    const u1 = -1 + (2 * (i + 1)) / 18;
    const yy = (u: number) => y0 + 46 * (1 - u * u);
    return [960 + 400 * u0, yy(u0), 960 + 400 * u1, yy(u1)] as const;
  }),
);
/** The card's runner, ヽ(￣д￣;)ノ=3=3=3, 56 px, along y 950, at x 150 on drop2 7.1 and running 30 px a frame (so it runs in during the pan). */
export const RUNNER = { face: REEL_CAST[0].face, x0: 150, speed: 30, y: 950, size: 56 } as const;

/**
 * NEON's stream (round 2): tube lines race past him left to right at four speeds (parallax), carrying the whip-pan's momentum on — none
 * on screen on drop2 7.1 (the pan lands on the card alone), each entering from the left edge after it. Layout px: the line's y, its length,
 * px a frame, how many frames after drop2 7.1 its head enters, its hue and width.
 */
export const NEON_STREAM: readonly { y: number; len: number; speed: number; lag: number; hue: 'cyan' | 'pink'; w: number }[] = [
  { y: 118, len: 360, speed: 92, lag: 0.5, hue: 'pink', w: 6 },
  { y: 205, len: 240, speed: 64, lag: 2, hue: 'cyan', w: 5 },
  { y: 300, len: 420, speed: 78, lag: 4.5, hue: 'cyan', w: 6 },
  { y: 372, len: 200, speed: 52, lag: 1, hue: 'pink', w: 4 },
  { y: 690, len: 300, speed: 70, lag: 3, hue: 'pink', w: 5 },
  { y: 880, len: 460, speed: 96, lag: 6, hue: 'cyan', w: 7 },
  { y: 1012, len: 260, speed: 58, lag: 0.25, hue: 'cyan', w: 5 },
  { y: 1048, len: 340, speed: 84, lag: 7.5, hue: 'pink', w: 6 },
  { y: 160, len: 280, speed: 74, lag: 5.5, hue: 'cyan', w: 5 },
  { y: 255, len: 520, speed: 104, lag: 8.5, hue: 'pink', w: 7 },
  { y: 655, len: 220, speed: 60, lag: 6.5, hue: 'cyan', w: 4 },
  { y: 590, len: 380, speed: 88, lag: 3.5, hue: 'pink', w: 6 },
];
/** A stream line's head (layout x) at content time `c`: on the left edge `lag` frames after drop2 7.1, then `speed` px a frame. */
export const streamHead = (s: (typeof NEON_STREAM)[number], c: number): number => s.speed * (c - REEL.from - s.lag);
/** NEON (drop2 7.1–7.1& − 1): two cyan tube arcs under him, a tube runner along the bottom, a spark on a random tube each 16th, tube lines racing past. */
function neonWorld(c: number, L: OverloadLayout): Draw[] {
  const glass: Shape[] = [];
  const light: Shape[] = [];
  const arcs = NEON_ARCS;
  for (const [x0, y0, x1, y1] of arcs) tube(glass, light, x0, y0, x1, y1, 6, RGB_OF.cyan, 1.1);
  // The runner, running left to right.
  const rx = RUNNER.x0 + RUNNER.speed * (c - REEL.from);
  const runG = textAt(RUNNER.face, L.advance.rounded, rx, RUNNER.y, RUNNER.size, GHOST).map((g) => ({ ...g, tube: tubeOf(g.ch) }));
  const runL = runG.map((g) => ({ ...g, color: scaleRGB(RGB_OF.cyan, 1.15) }));
  // A spark on a random tube each 16th: hot white, cyan glow, gone in 4 f.
  const { k, t } = sixteenth(c);
  if (t < 4) {
    const a = arcs[Math.floor(hash(seedFrame(k), 4310) * arcs.length)];
    const u = hash(seedFrame(k), 4311);
    const x = lerp(a[0], a[2], u);
    const y = lerp(a[1], a[3], u);
    const e = 1 - t / 4;
    light.push({ kind: 'ellipse', x: X(x), y: Y(y), w: 60 * e + 8, h: 60 * e + 8, color: scaleRGB(RGB_OF.cyan, 0.5 * e), soft: 30 * e + 4 });
    light.push({ kind: 'ellipse', x: X(x), y: Y(y), w: 10, h: 10, color: [2.2 * e, 2.2 * e, 2.2 * e] });
  }
  // The stream (its own draws after the card's arcs and runner, which the whip-pan lands on exactly: tests/drop2Overflow.test.ts).
  const sGlass: Shape[] = [];
  const sLight: Shape[] = [];
  for (const s of NEON_STREAM) {
    const head = streamHead(s, c);
    if (head <= 0 || head - s.len >= 1920) continue;
    tube(sGlass, sLight, Math.max(-40, head - s.len), s.y, head, s.y, s.w, s.hue === 'cyan' ? RGB_OF.cyan : RGB_OF.npink, 1.15);
  }
  return [
    { blend: 'normal', cam: 'card', content: content({ under: glass, glyphs: { rounded: runG } }) },
    { blend: 'add', cam: 'card', content: content({ under: light, glyphs: { rounded: runL } }) },
    { blend: 'normal', cam: 'card', content: content({ under: sGlass }) },
    { blend: 'add', cam: 'card', content: content({ under: sLight }) },
  ];
}

/** The LED lattice: 12 px dots, unlit ones a halftone screen locked to the lattice (dots on multiples of 12 px from the centre). */
const LED_PITCH = 12;
/** The LED marquee's crawl, dots a frame. */
export const MARQUEE_DOTS = 3;
/** The marquee's left shift (dots) at content time `c`: a whole step per output frame. */
export const marqueeCrawl = (c: number): number => MARQUEE_DOTS * Math.round(c - REEL.from);
const LED_UNLIT: Shape = { kind: 'rect', x: 0, y: 0, w: 1920 + 48, h: 1080 + 48, color: linear(PALETTES.led.unlit), tint: 0.32, screen: LED_PITCH, angle: 0 };
/** LED (drop2 7.1&–7.2 − 1): the marquee racing three dots a frame, flashing +25 % on the 16ths. */
function ledWorld(c: number, L: OverloadLayout): Draw[] {
  const lit: Shape[] = [];
  const glow: Shape[] = [];
  const { t } = sixteenth(c);
  const level = 1.35 * (t < 2 ? 1.25 : 1);
  // Round 2: the marquee races, three dots (36 px) a frame, crisp on each frame as a real LED board steps (no two positions doubled).
  const crawl = marqueeCrawl(c);
  const top = 900;
  const cols = 1920 / LED_PITCH;
  const w = L.marquee.width;
  for (const [col, row] of L.marquee.lit) {
    for (let base = 0; base < cols + w; base += w) {
      const i = (((col + base - crawl) % (cols + w)) + cols + w) % (cols + w);
      if (i > cols) continue;
      const x = X(i * LED_PITCH);
      const y = Y(top + row * LED_PITCH);
      glow.push({ kind: 'ellipse', x, y, w: 26, h: 26, color: scaleRGB(RGB_OF.amber, 0.08 * level), soft: 13 });
      lit.push({ kind: 'ellipse', x, y, w: 9.2, h: 9.2, color: scaleRGB(RGB_OF.amber, level) });
    }
  }
  return [{ blend: 'normal', cam: 'screen', content: content({ under: [LED_UNLIT] }) }, { blend: 'add', cam: 'screen', content: content({ under: glow }) }, { blend: 'add', cam: 'screen', content: content({ under: lit }) }];
}

/**
 * Round 2 (D2-REEL-STATIC: drop2 bar 7's cards entered on their move and then sat still, 3.5 /255 a frame against 9–12 in drop2 bars 2–6): each
 * world races past him in its own direction for the whole of its card while he stays locked. SWISS: the poster slides right to left,
 * 40 px a frame and 10 up, entering from the right so the sheet's layout lands at drop2 7.2& − 3 and nothing has left by the cut (the disc slides in, `33/36`
 * stays whole); its grid ruled heavier (2 px at 28 %, from 1 px at 12 %) so the slide reads.
 */
export const SWISS_SLIDE = { speed: 40, rise: 10, mid: CUTS2[1] + 9 } as const;
export const swissSlide = (c: number): number => -SWISS_SLIDE.speed * (c - SWISS_SLIDE.mid);
/** … and a little upward (layout px, y down): the poster races off toward the upper left. */
export const swissRise = (c: number): number => -SWISS_SLIDE.rise * (c - SWISS_SLIDE.mid);
/** SWISS (drop2 7.2–7.2& − 1): 16 columns of hairlines, the cropped red circle, `33/36`, a face waving in a cell, the red bar launched in from the right, the pen ruling a segment per 16th — the whole poster sliding past him. */
function swissWorld(c: number, L: OverloadLayout): Draw[] {
  const ink = RGB_OF.ink;
  const under: Shape[] = [];
  const sx = swissSlide(c);
  const sy = swissRise(c);
  // The 16-column grid slides with the poster (it repeats every column, so it never runs out).
  const shift = ((sx % 120) + 120) % 120;
  for (let k = 0; k <= 16; k++) {
    const x = 120 * k + shift;
    if (x > 0 && x < 1920) under.push({ kind: 'rect', x: X(x), y: 0, w: 2, h: 1080 * 1.2, color: ink, alpha: 0.28 });
  }
  // The cropped red circle, upper right.
  under.push({ kind: 'ellipse', x: X(1700 + sx), y: Y(120 + sy), w: 700, h: 700, color: RGB_OF.red });
  // The red bar launches in from the right under him (the poster's own direction) and rides the slide on.
  const p = springL(c, CUTS2[1]);
  under.push({ kind: 'rect', x: X(960 + 1300 * (1 - p) + sx), y: Y(740 + sy), w: 600, h: 40, color: RGB_OF.red });
  const { k } = sixteenth(c);
  const segs = 1 + Math.round((k - CUTS2[1]) / 6);
  const pen = Math.max(0, Math.min(14, segs)) * 120 + 120 * clamp((c - k) / 2) - 120;
  if (pen > 0) under.push({ kind: 'rect', x: X(120 + sx + pen / 2), y: Y(840 + sy), w: pen, h: 2, color: ink, alpha: 0.6 });
  const numerals = inkGlyphs(L, 'display', SWISS_NUMERALS.reel, { cx: 96 + sx + inkWidthOf(L, 'display', SWISS_NUMERALS.reel, 120) / 2, cy: 120 + sy, width: inkWidthOf(L, 'display', SWISS_NUMERALS.reel, 120), color: () => ink });
  const wave = (k / 6) % 2 === 0 ? 1 : -1;
  const waver = textAt(REEL_CAST[3].face, L.advance.jp, 300 + sx, 900 + sy, 40, ink).map((g, i, all) => (i >= all.length - 2 ? { ...g, rot: 0.12 * wave } : g));
  return [{ blend: 'normal', cam: 'card', content: content({ under, glyphs: { display: numerals, jp: waver } }) }];
}
/** The width of `text`'s ink when its ink is `height` px tall. */
function inkWidthOf(L: OverloadLayout, font: FontKey, text: string, height: number): number {
  const b = L.ink.get(inkKey(font, text));
  if (!b) throw new Error(`no ink box for ${font} "${text}"`);
  return (height * (b.right - b.left)) / (b.up + b.down);
}

/** RISO (drop2 7.2&–7.3 − 1): over paper, the pink plate; the hero, the registration marks and the cat in the blue plate (purple overprint); a yellow halftone foot. */
function risoWorld(c: number, L: OverloadLayout, field = false, cam = c): Draw[] {
  const edge = pinkEdge(c);
  const paper = linear(PALETTES.riso.ground);
  const base: Shape[] = [];
  const plate: Shape[] = [];
  const w = Math.max(0, edge + 24);
  const drift = pinkDrift(c);
  if (w > 0) {
    base.push({ kind: 'rect', x: X(w / 2 - 12), y: 0, w, h: 1080 * 1.2, color: paper });
    plate.push({ kind: 'rect', x: X(w / 2 - 12 - drift), y: 0, w, h: 1080 * 1.2, color: transmit(RGB_OF.rpink, 0.85) });
    // The yellow halftone foot rises 2 px a frame while its screen turns 0.9° a frame: the dots shimmer the whole time.
    const t = c - WIPES[1];
    plate.push({ kind: 'rect', x: X(Math.min(w, 1944) / 2 - 12), y: Y(990 - 2 * t), w: Math.min(w, 1944), h: 180 + 4 * t, color: transmit(linear(PALETTES.riso.yellow), 1), tint: 0.3, screen: 10, angle: (15 + 0.9 * t) * DEG });
  }
  const off = blueOffset(c);
  const blue = transmit(RGB_OF.blue, 0.95);
  const marks: Shape[] = [];
  const { k } = sixteenth(c);
  const turn = (-15 * DEG * (k - WIPES[1])) / 6;
  for (const [mx, my] of [[90, 90], [1830, 90], [90, 990], [1830, 990]] as const) {
    marks.push({ kind: 'ring', x: X(mx + off), y: Y(my), w: 44, h: 44, r: 3, color: blue });
    marks.push({ kind: 'rect', x: X(mx + off), y: Y(my), w: 74, h: 3, rot: turn, color: blue });
    marks.push({ kind: 'rect', x: X(mx + off), y: Y(my), w: 3, h: 74, rot: turn, color: blue });
  }
  const cat = textAt(CAT.face, L.advance.jp, 1640 + off - typeset(CAT.face, L.advance.jp).width * 32, 930, 64, blue);
  const draws: Draw[] = [];
  if (c < PLATES.meet + 1) draws.push(...swissWorld(c, L), ...heroDraws('swiss', c, L, field, cam));
  draws.push({ blend: 'normal', cam: 'card', content: content({ under: base }) });
  draws.push({ blend: 'multiply', cam: 'card', content: content({ under: plate }) });
  draws.push({ blend: 'multiply', cam: 'card', content: content({ under: marks, glyphs: { jp: cat } }) });
  // His face knocked out of the pink plate (paper shows through), each glyph once the sheet's edge has passed it: the blue plate lands
  // in this hole 56 px off (a white crescent and a purple one) and the snap on drop2 7.3 − 6 fills it exactly.
  const { s } = heroScale(cam);
  const { sx, sy } = heroScale(c);
  const knock = inkGlyphs(L, 'jp', HERO2.base, { cx: C.x - drift, cy: C.y, width: HERO_WIDTH * s, sx, sy, color: () => paper })
    .map((g) => ({ ...g, alpha: clamp((edge - (g.x + 960) - 0.6 * g.size) / 60) }))
    .filter((g) => (g.alpha ?? 1) > 0);
  if (knock.length > 0) draws.push({ blend: 'normal', cam: 'screen', content: content({ glyphs: { jp: knock } }) });
  return draws;
}

/**
 * The interlude card's press: on the cut (drop2 7.3, a clean cut since iteration 2) and again on the first snare 16th (drop2 7.3 + 6), so the world
 * arrives pressing and presses again.
 */
export const PRESSES: readonly number[] = [CUTS2[2], CUTS2[2] + 6];
export const interludePress = (c: number): { x: number; y: number; shadow: number } =>
  c >= PRESSES[1] ? press(c, PRESSES[1]) : press(PRESSES[0] + 1.6 * (c - PRESSES[0]), PRESSES[0]); // the first recovers in time for the second
/**
 * INTERLUDE's stream (round 2): the blocks sink past him 26 px a frame, turning, and a rain of confetti — 40 pieces, 30–46 px a frame,
 * spinning — pours down through the card (each piece wraps round the card's height, so the rain never thins).
 */
export const INTERLUDE_STREAM = { blocks: 26, confetti: 40, fall: [30, 46], spin: 7 } as const;
/** INTERLUDE (drop2 7.3–7.3& − 1): violet, the cream square and the yellow pill with ink outlines and hard shadows, confetti; everything presses on the cut and on drop2 7.3 + 6, and streams down past him. */
function interludeWorld(c: number): Draw[] {
  const P = PALETTES.interlude;
  const p = interludePress(c);
  const { k } = sixteenth(c);
  const t = c - CUTS2[2];
  const S = INTERLUDE_STREAM;
  const blocks: { x: number; y: number; w: number; h: number; r: number; rot: number; color: string; line: number; drop: number }[] = [
    { x: 1650, y: 900 + S.blocks * (t - 6), w: 420, h: 420, r: 56, rot: 12 + 0.8 * (t - 6), color: P.cream, line: 6, drop: 12 },
    { x: 240, y: 140 + S.blocks * (t - 6), w: 700, h: 220, r: 110, rot: -8 - 0.5 * (t - 6), color: P.yellow, line: 6, drop: 12 },
  ];
  const confetti = [P.mint, P.coral, P.yellow, P.cream];
  for (let i = 0; i < S.confetti; i++) {
    const tw = (hash(k, 4320 + i) - 0.5) * 6;
    const fall = lerp(S.fall[0], S.fall[1], hash(i, 4324));
    const span = 1080 + 160;
    const y = ((((hash(i, 4325) * span + fall * t) % span) + span) % span) - 80;
    const x = 60 + 1800 * ((i + 0.5 * hash(i, 4326)) / S.confetti);
    const spin = (i % 2 ? -1 : 1) * S.spin * (0.7 + 0.6 * hash(i, 4327));
    blocks.push({ x: x + tw, y, w: 56, h: 22, r: 4, rot: 360 * hash(i, 4328) + spin * t, color: confetti[i % 4], line: 4, drop: 6 });
  }
  const under: Shape[] = [];
  for (const b of blocks) under.push({ kind: 'rect', x: X(b.x + p.x + b.drop * p.shadow), y: Y(b.y + p.y + b.drop * p.shadow), w: b.w, h: b.h, r: b.r, rot: -b.rot * DEG, color: RGB_OF.black });
  for (const b of blocks) under.push({ kind: 'rect', x: X(b.x + p.x), y: Y(b.y + p.y), w: b.w, h: b.h, r: b.r, rot: -b.rot * DEG, color: linear(b.color), outline: b.line, outlineColor: RGB_OF.black });
  return [{ blend: 'normal', cam: 'card', content: content({ under }) }];
}

/**
 * FLAT SPACE's warp (round 2): the stars stream out from behind him, accelerating — each one's distance from his centre grows
 * exponentially, 30 → 1300 px over 36 frames, so it moves ≈ 0.1 × its distance a frame — drawn as streaks along their flight (their
 * length the shutter's travel), fading in near the centre where they are born. The flat cosmos flies at him.
 */
export const WARP = { stars: 200, period: 36, r0: 30, r1: 1300 } as const;
const WARP_RATE = Math.log(WARP.r1 / WARP.r0) / WARP.period;
/** Star `i`'s distance from his centre (layout px) at content time `c`. */
export function warpRadius(i: number, c: number): number {
  const u = (((hash(i, 4331) + (c - WIPES[2]) / WARP.period) % 1) + 1) % 1;
  return WARP.r0 * Math.exp(WARP_RATE * WARP.period * u);
}
/** FLAT SPACE (drop2 7.3&–7.4 − 1): 200 stars — pearl, gold, ice — streaming out from behind him at warp, a fifth of them flaring on each 16th. */
function spaceWorld(c: number): Draw[] {
  const S = PALETTES.space;
  const inks = [linear(S.pearl), linear(S.gold), linear(S.ice)];
  const { k, t } = sixteenth(c);
  const stars: Shape[] = [];
  for (let i = 0; i < WARP.stars; i++) {
    const a = 2 * Math.PI * hash(i, 4330);
    const r = warpRadius(i, c);
    const size = (1.8 + 1.8 * hash(i, 4332)) * (0.6 + 0.4 * clamp(r / 600));
    const len = 0.5 * WARP_RATE * r + 2 * size;
    const flare = t < 2 && hash(i, k, 4333) < 0.2 ? 1.6 : 1;
    const ink = inks[i % 3 === 0 ? 1 : i % 5 === 0 ? 2 : 0];
    const fade = clamp((r - WARP.r0) / 120);
    const mid = r - len / 2;
    stars.push({ kind: 'segment', x: X(960 + mid * Math.cos(a)), y: Y(540 + mid * Math.sin(a)), w: len, h: 2 * size * flare, rot: -a, color: scaleRGB(ink, 1.3 * flare), alpha: fade });
  }
  return [{ blend: 'add', cam: 'card', content: content({ under: stars }) }];
}

/** TERMINAL's scroll (round 2): the boot log races up behind him without a pause, half a line (15 px) a frame. */
export const LOG_SCROLL = 0.5;
/** TERMINAL (drop2 7.4–7.4& − 1): the boot log scrolling dim behind him, on the terminal grid; the monitor's copy bottom-left. */
function terminalWorld(c: number, L: OverloadLayout): Draw[] {
  const dim = linear(PALETTES.terminal.text, 0.22);
  const scroll = LOG_SCROLL * (c - CUTS2[3]);
  const glyphs: Glyph[] = [];
  for (let row = -1; row < 33; row++) {
    const n = Math.floor(row + scroll);
    const line = LOG_LINES[((n % LOG_LINES.length) + LOG_LINES.length) % LOG_LINES.length];
    const y = T7_GRID.top + (row + 0.5 - (scroll % 1)) * T7_GRID.cellH;
    glyphs.push(...textAt(line.text, L.advance.mono, T7_GRID.left, y, T7_GRID.fontPx, line.kind === 'warn' ? linear(PALETTES.terminal.amber, 0.22) : dim));
  }
  return [{ blend: 'add', cam: 'card', content: content({ glyphs: { mono: glyphs } }) }];
}
/** The monitor's copy on the terminal card, bottom-left above the fps line (screen-fixed: part of the card, sliced away by C3 on drop2 7.4& + 3). */
function monitorCopy(L: OverloadLayout): Draw {
  const dim = linear(PALETTES.terminal.text, 0.55);
  const green = linear(PALETTES.terminal.green, 1.3);
  const pink = linear(PALETTES.terminal.pink, 1.4);
  const g: Glyph[] = [];
  MONITOR2.rows.forEach((label, i) => {
    const y = 900 + 27 * i;
    g.push(...textAt(label, L.advance.mono, 58, y, 19, green), ...textAt(MONITOR2.copy[i], L.advance.mono, 58 + 9 * 11.4, y, 19, i === 1 ? pink : dim));
  });
  g.push(...textAt(MONITOR2.copy[3], L.advance.mono, 58, 900 + 27 * 3, 19, pink));
  const box: Shape = { kind: 'rect', x: X(46 + 230), y: Y(900 + 40), w: 460, h: 138, color: dim, alpha: 0, outline: 1.5, outlineColor: dim };
  const back: Shape = { kind: 'rect', x: X(46 + 230), y: Y(900 + 40), w: 460, h: 138, color: linear(PALETTES.terminal.ground) };
  return { blend: 'normal', cam: 'screen', content: content({ under: [back, { ...box, alpha: 1, color: linear(PALETTES.terminal.ground) }], glyphs: { mono: g } }) };
}

const GROUND: Readonly<Record<World, RGB>> = {
  neon: linear(PALETTES.neon.ground),
  led: linear(PALETTES.led.ground),
  swiss: linear(PALETTES.swiss.ground),
  riso: linear(PALETTES.riso.ground),
  interlude: linear(PALETTES.interlude.ground),
  space: linear(PALETTES.space.ground),
  terminal: linear(PALETTES.terminal.ground),
};

/**
 * What the character field reads each world's ground as: one of its own hues (the cells' ink is the hue at full strength, their
 * density the luminance), each at a luminance of ≈ 0.36, so the field starts at `=` and the heartbeat's waves climb it to @: neon
 * cyan, terminal green, Swiss red, Riso pink, the interlude's violet, LED mint (a cool LED wall: his amber brackets must read against
 * it). Amber is his alone (and the guest's). The hues are picked so the rows of T7 sort into gradients (their luminances differ:
 * green, mint and cyan beside him, red, pink and violet at the edges).
 */
const FIELD_LUMA = 0.36;
const atLuma = (hex: string): RGB => {
  const c = linear(hex);
  return scaleRGB(c, FIELD_LUMA / (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]));
};
export const FIELD_GROUND: Readonly<Record<World, RGB>> = {
  neon: atLuma(PALETTES.neon.cyan),
  terminal: atLuma(PALETTES.terminal.green),
  swiss: atLuma(PALETTES.swiss.red),
  riso: atLuma(PALETTES.riso.pink),
  interlude: atLuma(PALETTES.interlude.ground),
  led: atLuma(PALETTES.interlude.mint),
  space: atLuma(PALETTES.space.ice),
};
/**
 * How far the field's source has bled into the signature hues at content time `c`: none on the last blade's content frame (drop2 8.1 − 3, the
 * one the film's flash crumbles), next to none (3 %) on drop2 8.1 where the field takes over on the kick, all of it by drop2 8.2 — the
 * heartbeat's waves and the hues arrive together. The light he gives off rises with it.
 */
export const fieldTint = (c: number): number => flow((c - REEL_BLADES[3]) / (SATURATE[2] - REEL_BLADES[3]));
/** In the field's source, the light he gives off: a warm glow round his face, so the cells beside him are paler and brighter (the sort then runs each row from pale beside him to full colour at its edges). */
export const FIELD_GLOW = { w: 1800, h: 1050, soft: 700, ink: linear('#FFF1DC', 1.05) } as const;
/** A whole card at content time `c`: the world, then the hero in its dress (`field`: as the character field reads it — FIELD_GROUND, his plain fill). */
export function cardFrame(world: World, c: number, L: OverloadLayout, field = false, cam = c): CardFrame {
  const draws: Draw[] = [];
  if (world === 'neon') draws.push(...neonWorld(c, L));
  else if (world === 'led') draws.push(...ledWorld(c, L));
  else if (world === 'swiss') draws.push(...swissWorld(c, L));
  else if (world === 'riso') draws.push(...risoWorld(c, L, field, cam));
  else if (world === 'interlude') draws.push(...interludeWorld(c));
  else if (world === 'space') draws.push(...spaceWorld(c));
  else draws.push(...terminalWorld(c, L));
  draws.push(...heroDraws(world, c, L, field, cam));
  if (world === 'terminal' && !field && c < REEL_BLADES[0] + 3) draws.push(monitorCopy(L));
  // In the field's source the world bleeds into its signature hue over the heartbeat (under him: his draws come last).
  if (field) {
    const k = fieldTint(c);
    if (k > 0) draws.splice(draws.length - heroDraws(world, c, L, true, cam).length, 0, { blend: 'normal', cam: 'screen', content: content({ under: [{ kind: 'rect', x: 0, y: 0, w: 1960, h: 1120, color: FIELD_GROUND[world], alpha: k }] }) });
  }
  // During the plates the card starts as the Swiss card (its own draws carry the Swiss underlay).
  return { ground: world === 'riso' && c < PLATES.meet + 1 ? GROUND.swiss : GROUND[world], draws };
}

// ——— The plan of an instant ——————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * How the scene composes an instant of the reel: one card, a card wiped over another along a screen x edge (the over card shows left of
 * it), or S27's blades over the terminal card. `fx` are screen-space strokes drawn over the composite (the scan's bar, the streaks, the
 * blades' seams).
 */
export type Plan =
  | { kind: 'card'; world: World; fx: Draw[] }
  | { kind: 'edge'; under: World; over: World; edge: number; fx: Draw[] }
  | { kind: 'blades'; base: World; blades: BladeState[]; fx: Draw[] };

/** The plan at content time `c` of the reel (c < the field). */
export function planAt(c: number): Plan {
  if (c >= REEL_BLADES[0]) return { kind: 'blades', base: 'terminal', blades: bladesAt(c), fx: [seams(c)] };
  const w = cardAt(c);
  if (w === 'led' && scanEdge(c) < 1920) return { kind: 'edge', under: 'neon', over: 'led', edge: scanEdge(c), fx: [scanBar(c)] };
  if (w === 'space' && streakEdge(c) < 1920 + 40) return { kind: 'edge', under: 'interlude', over: 'space', edge: streakEdge(c), fx: [streaks(c)] };
  return { kind: 'card', world: w, fx: [] };
}
/** The LED scan's leading column: a bright amber bar. */
function scanBar(c: number): Draw {
  const x = scanEdge(c);
  return { blend: 'add', cam: 'screen', content: content({ under: [{ kind: 'rect', x: X(x - 6), y: 0, w: 12, h: 1080, color: scaleRGB(RGB_OF.amber, 0.55) }, { kind: 'rect', x: X(x - 30), y: 0, w: 60, h: 1080, color: scaleRGB(RGB_OF.amber, 0.12), soft: 30 }] }) };
}
/** 40 star streaks, pearl and gold, racing left to right at 300 px a frame around the reveal edge. */
function streaks(c: number): Draw {
  const S = PALETTES.space;
  const edge = streakEdge(c);
  const under: Shape[] = [];
  for (let i = 0; i < 40; i++) {
    const len = 200 + 400 * hash(i, 4340);
    const h = 2 + 2 * hash(i, 4341);
    const lead = (hash(i, 4342) - 0.35) * 420;
    const xHead = edge + lead + (300 - 320) * (c - WIPES[2]);
    const y = 30 + 1020 * hash(i, 4343);
    const ink = linear(i % 3 === 0 ? S.gold : S.pearl, 1.5);
    const fade = clamp((WIPES[2] + 7 - c) / 2);
    under.push({ kind: 'segment', x: X(xHead - len / 2), y: Y(y), w: len, h, color: ink, alpha: fade });
  }
  return { blend: 'add', cam: 'screen', content: content({ under }) };
}
/** The blades' seams: 4 px white for 6 f behind each tip, then 2 px in the new world's accent. */
function seams(c: number): Draw {
  const under: Shape[] = [];
  for (const b of bladesAt(c)) {
    if (b.age < 0) continue;
    const l = Math.min(b.tip, b.len + 40);
    if (l <= 0) continue;
    const hot = b.age < 6;
    const x0 = b.from[0];
    const mx = x0 + (b.dir[0] * l) / 2;
    const my = b.from[1] + (b.dir[1] * l) / 2;
    const rot = -Math.atan2(b.dir[1], b.dir[0]);
    if (hot) under.push({ kind: 'segment', x: X(mx), y: Y(my), w: l, h: 14, rot, color: [0.5, 0.5, 0.5], soft: 7 });
    under.push({ kind: 'segment', x: X(mx), y: Y(my), w: l, h: hot ? 4 : 2, rot, color: hot ? [2.2, 2.2, 2.2] : scaleRGB(linear(b.line.seam), 1.4) });
  }
  return { blend: 'add', cam: 'screen', content: content({ under }) };
}

// ——— Drop 2's own field (sheet §5.10.2–§5.10.3) ——————————————————————————————————————————————————————————————————————————————

/** The field's columns and rows (T7_GRID: the intro's terminal grid extended to bleed). */
export const FIELD = { c0: T7_GRID.cols[0], c1: T7_GRID.cols[1], r0: T7_GRID.rows[0], r1: T7_GRID.rows[1], cols: T7_GRID.cols[1] - T7_GRID.cols[0] + 1, rows: T7_GRID.rows[1] - T7_GRID.rows[0] + 1 } as const;
/** One cell of the field: its ramp index (0 ' ' … 9 '@'), its ink (linear), whether it is his, and `lum`: its ink's luminance (T7 sorts by it: by the colour each cell shows, so the rows sort into bands of hue). */
export type FieldCell = { col: number; row: number; i: number; ink: RGB; hero: boolean; lum: number };
/** Rec. 709 luminance of a linear colour. */
export const luma = (c: RGB): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
/** The glyph a luminance draws: RAMP[round(9·Y^0.8)]. */
export const rampIndex = (y: number): number => Math.round(9 * clamp(y) ** 0.8);
/**
 * The ink of a cell: its colour normalised to its brightest channel (the cells keep their world's colour; no heat shift), at 0.95 —
 * just under the glow's threshold, so the wall stays crisp and only he (and the rings of T7) bloom. (The sheet's × 1.2 made the whole
 * wall bloom into a haze.)
 */
export const FIELD_INK_GAIN = 0.95;
export function fieldInk(c: RGB): RGB {
  const m = Math.max(c[0], c[1], c[2]);
  const k = FIELD_INK_GAIN;
  if (m < 1e-5) return [k * 0.3, k, k * 0.55];
  return [(k * c[0]) / m, (k * c[1]) / m, (k * c[2]) / m];
}
/** His ink in the field: always amber, glowing — the one calm, lit thing in the overload. */
export const HERO_INK: RGB = scaleRGB(linear(PALETTES.terminal.amber), 1.9);
/**
 * The heartbeat's saturation waves leave his centre on the kicks of drop2 8.1–8.3 (SATURATE). The first (drop2 8.1, the picture still at 30 fps)
 * leaves a frame before its kick and crosses 280 px a frame, so drop2 8.1 − 1 stays clean and the kick frame has lit the 280 px round him. The
 * stuttered ones (drop2 8.1&, 8.2, 8.2&: 20, 15 and 10 fps, every kick a shown frame) must finish inside their own kick frame (SYNC2-01: at
 * 280 px a frame the drop2 8.1& wave showed on drop2 8.1& + 3, 50 ms late): they leave 1.75 frames early and cross 640 px a frame — 960 px by k − ¼,
 * the whole field (its farthest cell is ≈ 1106 px out) by k — and never reach the content frame shown before the kick (k − 2 at most).
 */
export const WAVE = { first: { lead: 1, speed: 280 }, stuttered: { lead: 1.75, speed: 640 } } as const;
/** How many of the waves have reached a cell `rho` px from his centre by content time `c`. */
export const wavesAt = (c: number, rho: number): number =>
  SATURATE.filter((k, i) => {
    const w = i === 0 ? WAVE.first : WAVE.stuttered;
    return c >= k - w.lead + rho / w.speed;
  }).length;
/** From the last kick (drop2 8.2&, drop2 8.3) every cell but his is maxed out: the last drum hit before the crash completes the wall. */
export const MAXED = SATURATE[3];
/**
 * The ramp index of a cell: the others climb one step a wave (= + * #, so every kick has a step left to show) and the last wave takes
 * them all to @; his climb one, clamped to the calm =+* (4–6).
 */
export function saturate(i0: number, waves: number, hero: boolean, c: number): number {
  if (hero) return clamp(i0 + waves, 4, 6);
  return c >= MAXED || waves >= SATURATE.length ? 9 : Math.min(9, i0 + waves);
}
/** What the scene samples per cell from the content it rendered at content time `c`: the box-filtered colour and his coverage (0–1). */
export type FieldSampler = { rgb(col: number, row: number): RGB; hero(col: number, row: number): number };
/** His cells: where his silhouette covers at least this much of the cell. */
export const HERO_COVER = 0.3;
/** The field at content time `c` from the sampled content (row-major, rows r0…r1, columns c0…c1). */
export function buildField(c: number, sample: FieldSampler): FieldCell[] {
  const out: FieldCell[] = [];
  for (let row = FIELD.r0; row <= FIELD.r1; row++) {
    for (let col = FIELD.c0; col <= FIELD.c1; col++) {
      const rgb = sample.rgb(col, row);
      const hero = sample.hero(col, row) >= HERO_COVER;
      const y = luma(rgb);
      const [x, yy] = t7CellCentre(col, row);
      const rho = Math.hypot(x - 960, yy - 540);
      const i = saturate(rampIndex(y), wavesAt(c, rho), hero, c);
      const ink = hero ? HERO_INK : fieldInk(rgb);
      out.push({ col, row, i, ink, hero, lum: luma(ink) });
    }
  }
  return out;
}
// ——— His clearing and his strokes (from drop2 8.1 to the hand-off he is the one calm, readable shape) ——————————————————————————————————

/** His capsule: the half-width and half-height (layout px, about (960, 540)) of his cells' extent; T7's rings are its offsets. */
export type Capsule = { hx: number; hy: number };
const capsules = new WeakMap<readonly FieldCell[], Capsule>();
export function capsuleOf(field: readonly FieldCell[]): Capsule {
  const hit = capsules.get(field);
  if (hit) return hit;
  let hx = 0;
  let hy = 0;
  for (const c of field) {
    if (!c.hero) continue;
    const [x, y] = t7CellCentre(c.col, c.row);
    hx = Math.max(hx, Math.abs(x - 960) + T7_GRID.cellW / 2);
    hy = Math.max(hy, Math.abs(y - 540) + T7_GRID.cellH / 2);
  }
  const cap = hx > 0 ? { hx, hy } : { hx: 510, hy: 180 };
  capsules.set(field, cap);
  return cap;
}
/** How far layout point (x, y) is outside his capsule (negative inside): his clearing's edge and THE FRAME's rings are its level lines. */
export function capsuleDistance(x: number, y: number, cap: Capsule): number {
  const ax = Math.max(0, Math.abs(x - 960) - Math.max(0, cap.hx - cap.hy));
  return Math.hypot(ax, y - 540) - cap.hy;
}
/**
 * His clearing is the soap film's black spot (drop2 1.1's callback): every cell within 12 px of his outline (his capsule) is cleared, and the
 * type fades back in over the next 60 px — two rows. A function of the distance from his outline alone, so it has no box edge (round 2,
 * D2-CRASH-MUD: the old clearing ran from his first to his last cell in each row, a rounded box with square corners).
 */
export const CLEAR = { inside: 24, outside: 120 } as const;
export const smoothstepClear = (d: number): number => smoothstep(CLEAR.inside, CLEAR.outside, d);
/**
 * What is left of the type in his clearing: none. The review saw the dim @ there (10 % in round 1) mix with his amber glow into an olive
 * box; the spot is now an empty deep indigo (HERO_SPOT, amber's complement) under his strokes.
 */
export const CLEARING = 0;
const spansCache = new WeakMap<readonly FieldCell[], Map<number, readonly [number, number]>>();
/** Per row, his first and last column in a field (cached per field: a field is never mutated, so this is deterministic). */
export function heroSpans(field: readonly FieldCell[]): Map<number, readonly [number, number]> {
  const hit = spansCache.get(field);
  if (hit) return hit;
  const out = new Map<number, [number, number]>();
  for (const c of field) {
    if (!c.hero) continue;
    const s = out.get(c.row);
    out.set(c.row, s ? [Math.min(s[0], c.col), Math.max(s[1], c.col)] : [c.col, c.col]);
  }
  spansCache.set(field, out);
  return out;
}
const clearCache = new WeakMap<readonly FieldCell[], Float32Array>();
/** Per cell (in field order), how deep in his clearing it sits: 1 within CLEAR.inside of his outline, 0 beyond CLEAR.outside; 0 for his own cells. */
export function clearing(field: readonly FieldCell[]): Float32Array {
  const hit = clearCache.get(field);
  if (hit) return hit;
  const cap = capsuleOf(field);
  const out = new Float32Array(field.length);
  field.forEach((c, k) => {
    if (c.hero) return;
    const [x, y] = t7CellCentre(c.col, c.row);
    out[k] = 1 - smoothstepClear(capsuleDistance(x, y, cap));
  });
  clearCache.set(field, out);
  return out;
}
/**
 * His strokes: the field's =+* in JetBrains Mono ExtraBold (denser than the field's regular weight; the same characters, so the hexdump
 * bytes stay), a pale, white-hot amber well over the glow's threshold — a glowing core in an amber halo, as drop 1's (×ω×) under the glass.
 */
export const HERO_HOT: RGB = linear('#FFDDA8', 2.8);
/** Under his strokes, his face itself in a deep amber (the same face, size and place as the mask the cells were read from), so the strokes read as one solid shape at a glance. */
export const HERO_FILL: RGB = linear('#FFB868', 0.38);
/** And his glow: a soft amber light under each of his cells only — tight round his strokes (round 2: a wide glow over the whole face fogged his clearing olive). */
export const HERO_GLOW: RGB = scaleRGB(linear(PALETTES.terminal.amber), 0.14);
/** His halo per cell (layout px): about a cell and a half, so the bloom hugs his strokes. */
export const HERO_HALO = { w: 28, h: 40, soft: 13 } as const;
/**
 * Under him, his clearing's deep indigo — amber's complement, the soap film's black spot gone violet — a stadium shaped like his
 * outline (his capsule, 90 px out), feathered over 150 px so it has no edge: added to the ground it reads ≈ #21174A.
 */
export const HERO_SPOT = { ink: [0.012, 0.004, 0.06] as RGB, pad: 90, soft: 150 } as const;
/** Where his cells and his face are drawn: `scale`d about (960, 540) and lifted to `cy`, at `alpha`, `dy` px down (the CRT's slip); `spot`: his indigo spot's opacity (default `alpha`). */
export type HeroPlace = { scale?: number; cy?: number; alpha?: number; dy?: number; spot?: number };
/** His indigo spot (always first, even when spent: alpha 0) and his warm halo under his cells, placed like his cells. */
export function heroHalo(cells: readonly FieldCell[], o: HeroPlace = {}): Shape[] {
  const k = o.scale ?? 1;
  const a = o.alpha ?? 1;
  const out: Shape[] = [];
  if (a <= 0.001) return out;
  const cy = o.cy ?? 540;
  const dy = o.dy ?? 0;
  const cap = capsuleOf(cells);
  const hw = (cap.hx + HERO_SPOT.pad) * k;
  const hh = (cap.hy + HERO_SPOT.pad) * k;
  out.push({ kind: 'rect', x: 0, y: Y(cy + dy), w: 2 * hw, h: 2 * hh, r: hh, color: HERO_SPOT.ink, alpha: clamp(o.spot ?? a), soft: HERO_SPOT.soft * k });
  for (const cell of cells) {
    if (!cell.hero) continue;
    const [x, y] = t7CellCentre(cell.col, cell.row);
    out.push({ kind: 'ellipse', x: X(960 + (x - 960) * k), y: Y(cy + (y - 540) * k + dy), w: HERO_HALO.w * k, h: HERO_HALO.h * k, color: scaleRGB(HERO_GLOW, a), soft: HERO_HALO.soft * k });
  }
  return out;
}
/**
 * His face in the field at content time `c`: his cells (=+* hot, in the bold mono), his face filled in deep amber under them (the face the
 * mask was read from: HERO_FACES at heroFaceAt(c), HERO_WIDTH × heroScale(c).s, centred (960, 540)) and his halo; placed by `o`.
 */
export function heroField(cells: readonly FieldCell[], c: number, L: OverloadLayout, o: HeroPlace = {}, ink: RGB = HERO_HOT): { under: Shape[]; bold: Glyph[]; rounded: Glyph[] } {
  const k = o.scale ?? 1;
  const a = o.alpha ?? 1;
  const cy = o.cy ?? 540;
  const dy = o.dy ?? 0;
  if (a <= 0.001) return { under: [], bold: [], rounded: [] };
  const bold: Glyph[] = [];
  for (const cell of cells) {
    if (!cell.hero || cell.i <= 0) continue;
    const [x, y] = t7CellCentre(cell.col, cell.row);
    bold.push({ ch: RAMP[cell.i], x: X(960 + (x - 960) * k), y: Y(cy + (y - 540) * k + dy), size: T7_GRID.fontPx * k, color: ink, alpha: a });
  }
  const width = HERO_WIDTH * heroScale(c).s;
  const fill = inkGlyphs(L, 'rounded', HERO_FACES[heroFaceAt(c)], { cx: 960, cy: 540, width, color: () => HERO_FILL }).map((g) => ({
    ...g,
    x: g.x * k,
    y: Y(cy + (540 - g.y - 540) * k + dy),
    size: g.size * k,
    alpha: a,
  }));
  return { under: heroHalo(cells, o), bold, rounded: fill };
}
/** The glyphs of the field's type (his cells are heroField's; screen-fixed on the terminal grid; `dy` layout px down, e.g. the CRT's vertical-hold slip), dimmed in his clearing. */
export function fieldGlyphs(cells: readonly FieldCell[], out: Glyph[], dy = 0): number {
  const m = clearing(cells);
  let n = 0;
  cells.forEach((cell, k) => {
    if (cell.i <= 0 || cell.hero) return;
    const [x, y] = t7CellCentre(cell.col, cell.row);
    out[n++] = { ch: RAMP[cell.i], x: X(x), y: Y(y + dy), size: T7_GRID.fontPx, color: m[k] > 0 ? scaleRGB(cell.ink, lerp(1, CLEARING, m[k])) : cell.ink };
  });
  return n;
}

// ——— E10: the guest, his cocktail and the last drop (sheet §5.10.5) ———————————————————————————————————————————————————————————

/** The guest drops in at the top edge on drop2 8.1 (L keyed drop2 8.1 − 1), x 1640, y −120 → 150, and watches, smug, breathing 2 %. */
export function guestAt(f: number): { x: number; y: number; em: number; level: number } {
  const p = springL(f, GUEST);
  const breathe = 1 + 0.02 * Math.sin((2 * Math.PI * (f - GUEST)) / 48);
  return { x: 1640, y: lerp(-120, 150, p), em: 120 * breathe, level: 1.2 };
}
/** The glass: drop 1's pink neon martini, tilted 35° over the drop's path, its lip at (1600, 240) once he has landed. */
export const LIP = { x: 1600, y: 240 } as const;
export const GLASS_TILT = -35 * DEG;
const GLASS_H = 84;
/** The lip, travelling with him as he drops in. */
export const lipAt = (f: number): { x: number; y: number } => ({ x: LIP.x, y: LIP.y + (guestAt(f).y - 150) });
/**
 * Where the drop lands on the freeze: on the keyboard at the bottom of the screen, high enough that the flattened drop, its crown and
 * its ring are all inside the CRT's curved frame (the review: at y 1060 the splash fell off the bottom edge).
 */
export const LAND = { x: 1600, y: 1024 } as const;
/** The drop (true time): beading on the lip, leaving it on DRIP, falling along x 1600, landing on the freeze at LAND. */
export function dropAt(f: number): { x: number; y: number; len: number; bead: number } | null {
  if (f < GUEST + 2) return null;
  if (f < DRIP) {
    const lip = lipAt(f);
    return { x: lip.x, y: lip.y + 4, len: 14, bead: clamp((f - GUEST - 2) / (DRIP - GUEST - 2)) };
  }
  const u = (f - DRIP) / (CRASH - DRIP);
  return { x: LIP.x, y: LIP.y + (LAND.y - LIP.y) * u * u, len: 30 + 50 * clamp(u), bead: 1 };
}
/** The drop's dark halo (the ground's own colour): it reads on any world's colour of the @ wall. */
const HALO = linear(PALETTES.terminal.ground);
/** The drop's core: white-pink, hot. */
const CORE: RGB = [2.4, 1.7, 2];
/**
 * §1.3 G: the guest is infected (since the interlude) and wears the reticle Defender spun off on its give-up (17.4) as a party hat:
 * (￣ω￣), a red neon tube (Defender's emissive red, ×1.6) with an amber ω. `v04`: the guest as the master drew him — (￣▽￣) in an amber
 * tube, no hat — which the frozen field is still read from, so the sort and THE FRAME stay v04's to the byte (the change's box is the
 * crisp guest over the field). `splash: false` leaves the splash out (the bullet time draws its crown in glass).
 */
export type GuestOptions = { v04?: boolean; splash?: boolean };
/** His tube's red: Defender's emissive, lit as his amber was (1.25: brighter, its white-hot core swallows the red). */
const GUEST_RED: RGB = linear(LAW.defender.emissive, 1.25);
/** The hat's red (RETICLE_HAT.color, Defender's emissive, ×1.6). */
const HAT_RED: RGB = linear(RETICLE_HAT.color, LAW.defender.emissiveGain);
/**
 * The hat (RETICLE_HAT): Defender v2.0's reticle at 30 % — its four L brackets (36 px arms, a 150 × 110 box) and its centre ring (r 27) —
 * sitting on his head tilted 15° (leaning into the frame), its lower brackets on his brow line, riding his drop-in; on drop2 19.1& it
 * settles with a 4 px bounce. Its strokes as layout segments (one per arm) and its ring, in Defender's red; guestContent draws them as tubes.
 */
export const HAT = { dx: -18, dy: -100 } as const;
export function hatShapes(f: number): Shape[] {
  const g = guestAt(f);
  const cx = g.x + HAT.dx;
  const cy = g.y + HAT.dy - hop(f, GUEST + 12, RETICLE_HAT.bounce);
  const tilt = (RETICLE_HAT.tilt * Math.PI) / 180;
  const [hw, hh] = [RETICLE_HAT.box[0] / 2, RETICLE_HAT.box[1] / 2];
  const arm = RETICLE_HAT.arm;
  const cs = Math.cos(tilt);
  const sn = Math.sin(tilt);
  // Layout (y down) → rotated about the hat's centre, counter-clockwise on screen by `tilt`.
  const at = (x: number, y: number): [number, number] => [cx + x * cs + y * sn, cy - x * sn + y * cs];
  const out: Shape[] = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const corner: [number, number] = [sx * hw, sy * hh];
    for (const [ex, ey] of [[corner[0] - sx * arm, corner[1]], [corner[0], corner[1] - sy * arm]] as const) {
      const [x0, y0] = at(...corner);
      const [x1, y1] = at(ex, ey);
      out.push({ kind: 'segment', x: X((x0 + x1) / 2), y: Y((y0 + y1) / 2), w: arm + RETICLE_HAT.stroke, h: RETICLE_HAT.stroke, rot: -Math.atan2(y1 - y0, x1 - x0), color: HAT_RED });
    }
  }
  out.push({ kind: 'ring', x: X(cx), y: Y(cy), w: 2 * RETICLE_HAT.ring, h: 2 * RETICLE_HAT.ring, r: RETICLE_HAT.stroke, color: HAT_RED });
  return out;
}

/** The guest, the glass and the drop as flat content: dark glass and the drop's halo (normal) and lit tubes (add). The splash on the freeze. */
export function guestContent(f: number, L: OverloadLayout, o: GuestOptions = {}): { glass: FlatContent; light: FlatContent } {
  if (f < GUEST - 1) return { glass: EMPTY, light: EMPTY };
  const g = guestAt(f);
  const glassU: Shape[] = [];
  const lightU: Shape[] = [];
  const amber = RGB_OF.amber;
  const pink = RGB_OF.npink;
  const face = o.v04 ? GUEST_FACE.face : GUEST_INFECTED.face;
  const faceGlass = textAt(face, L.advance.rounded, g.x - (typeset(face, L.advance.rounded).width * g.em) / 2, g.y, g.em, GHOST).map((q) => ({ ...q, tube: tubeOf(q.ch) }));
  const faceLit = faceGlass.map((q) => ({ ...q, color: o.v04 || q.ch === 'ω' ? scaleRGB(amber, g.level) : GUEST_RED }));
  if (!o.v04) {
    for (const h of hatShapes(f)) {
      if (h.kind === 'ring') {
        glassU.push({ ...h, color: GHOST });
        lightU.push({ ...h, w: h.w + 10, h: h.h + 10, r: (h.r ?? 4) * 3, color: scaleRGB(HAT_RED, 0.12), soft: 6 });
        lightU.push(h);
        continue;
      }
      const half = (h.w - RETICLE_HAT.stroke) / 2;
      const dx = Math.cos(-(h.rot ?? 0)) * half;
      const dy = Math.sin(-(h.rot ?? 0)) * half;
      const [mx, my] = [h.x + 960, 540 - h.y];
      tube(glassU, lightU, mx - dx, my - dy, mx + dx, my + dy, RETICLE_HAT.stroke, HAT_RED, 1);
    }
  }
  // The martini: rim, bowl, stem, foot (drop 1's points), tilted about the lip.
  const lip = lipAt(f);
  const pts: [number, number, number, number][] = [[-0.5, 1, 0, 0.45], [0.5, 1, 0, 0.45], [-0.5, 1, 0.5, 1], [0, 0.45, 0, 0.04], [-0.28, 0.02, 0.28, 0.02]];
  const cs = Math.cos(GLASS_TILT);
  const sn = Math.sin(GLASS_TILT);
  // Local (u, v) in glass heights, v up; the lip is the rim's right end (0.5, 1): rotate about it, then put it on the lip.
  const at = (u: number, v: number): [number, number] => {
    const du = (u - 0.5) * GLASS_H;
    const dv = (v - 1) * GLASS_H;
    return [lip.x + du * cs - dv * sn, lip.y - (du * sn + dv * cs)];
  };
  for (const [u0, v0, u1, v1] of pts) {
    const [x0, y0] = at(u0, v0);
    const [x1, y1] = at(u1, v1);
    tube(glassU, lightU, x0, y0, x1, y1, 5, pink, 1.15);
  }
  // The drink inside the bowl: a soft pink glow.
  const [bx, by] = at(0.15, 0.78);
  lightU.push({ kind: 'ellipse', x: X(bx), y: Y(by), w: 46, h: 30, rot: -GLASS_TILT, color: scaleRGB(pink, 0.35), soft: 15 });
  const d = dropAt(f);
  if (d && f < CRASH) {
    const r = 13 * (0.4 + 0.6 * d.bead);
    // A dark halo round it (it reads on any colour of the wall), then the pink tube, its glow and a white-pink core.
    glassU.push({ kind: 'ellipse', x: X(d.x), y: Y(d.y - d.len / 3), w: 5.2 * r, h: 4.2 * r + d.len, color: HALO, alpha: 0.85, soft: 1.6 * r });
    lightU.push({ kind: 'ellipse', x: X(d.x), y: Y(d.y - d.len / 3), w: 6 * r, h: 5 * r + d.len, color: scaleRGB(pink, 0.3), soft: 3 * r });
    lightU.push({ kind: 'segment', x: X(d.x), y: Y(d.y - d.len / 2 + r), w: d.len, h: 2 * r * 0.75, rot: Math.PI / 2, color: scaleRGB(pink, 1.5) });
    lightU.push({ kind: 'ellipse', x: X(d.x), y: Y(d.y), w: 2 * r, h: 2 * r, color: scaleRGB(pink, 1.7) });
    lightU.push({ kind: 'segment', x: X(d.x), y: Y(d.y - d.len / 2 + r), w: d.len * 0.85, h: r * 0.7, rot: Math.PI / 2, color: CORE });
    lightU.push({ kind: 'ellipse', x: X(d.x), y: Y(d.y), w: r, h: r, color: CORE });
  }
  if (f >= CRASH && o.splash !== false) {
    glassU.push(...splashHalo());
    lightU.push(...splash(CRASH));
  }
  return { glass: { under: glassU, glyphs: { rounded: faceGlass }, over: [] }, light: { under: lightU, glyphs: { rounded: faceLit }, over: [] } };
}
/** The splash's crown: 12 droplets on a half-ellipse this far out from the impact (px across, px up). */
export const CROWN = { across: 74, up: 58, droplets: 12, ring: 120 } as const;
/** The dark ground under the splash, so the crown reads on the frozen wall. */
function splashHalo(): Shape[] {
  return [{ kind: 'ellipse', x: X(LAND.x), y: Y(LAND.y - 24), w: 2 * CROWN.across + 70, h: 2 * CROWN.up + 60, color: HALO, alpha: 0.8, soft: 30 }];
}
/** The splash on the freeze, at LAND: the drop flattened (1.6× wide, 0.4× tall), a just-born crown of 12 droplets, a pink ring 120 px across — the moment, held. */
export function splash(f: number): Shape[] {
  const pink = RGB_OF.npink;
  const out: Shape[] = [];
  const { x, y } = LAND;
  out.push({ kind: 'ellipse', x: X(x), y: Y(y), w: CROWN.ring + 50, h: 44, color: scaleRGB(pink, 0.3), soft: 22 });
  out.push({ kind: 'ring', x: X(x), y: Y(y), w: CROWN.ring, h: 30, r: 4, color: scaleRGB(pink, 1.4) });
  out.push({ kind: 'ellipse', x: X(x), y: Y(y), w: 26 * 1.6 * 1.6, h: 26 * 0.4, color: scaleRGB(pink, 1.7) });
  out.push({ kind: 'ellipse', x: X(x), y: Y(y), w: 26 * 1.6, h: 26 * 0.22, color: CORE });
  for (let k = 0; k < CROWN.droplets; k++) {
    const a = Math.PI * (0.08 + (0.84 * k) / (CROWN.droplets - 1));
    const r = 0.86 + 0.14 * hash(k, 4350);
    const px = x + Math.cos(a) * CROWN.across * r;
    const py = y - Math.sin(a) * CROWN.up * r;
    // Each droplet a short pink tube along its flight (outward), a white-pink bead at its tip.
    const rot = Math.atan2(Math.sin(a) * CROWN.up, Math.cos(a) * CROWN.across);
    out.push({ kind: 'segment', x: X(px - Math.cos(rot) * 7), y: Y(py + Math.sin(rot) * 7), w: 18, h: 6, rot, color: scaleRGB(pink, 1.5) });
    out.push({ kind: 'ellipse', x: X(px), y: Y(py), w: 8, h: 8, color: CORE });
  }
  out.push({ kind: 'ellipse', x: X(x), y: Y(y - 20), w: 220, h: 120, color: scaleRGB(pink, 0.22 * (f >= CRASH ? 1 : 0)), soft: 50 });
  return out;
}
/**
 * E10's payoff over the frozen field: the guest, his glass and the splash, crisp, screen-fixed (exempt from the CRT's slip on drop2 8.3),
 * held drop2 8.3–8.3& − 1 while the sort starts round them, then dissolving into it by drop2 8.3& + 5. Their own cells are in the frozen field, so they
 * sort in with everything once the overlay has gone. Opacity at output frame `f` (0 outside).
 */
export const FREEZE_OVERLAY = { hold: CRASH + 12, gone: CRASH + 18 } as const;
/** Flat content at opacity `a` (every shape and glyph's alpha scaled). */
export const fadeContent = (c: FlatContent, a: number): FlatContent => ({
  under: c.under.map((s) => ({ ...s, alpha: (s.alpha ?? 1) * a })),
  glyphs: Object.fromEntries(Object.entries(c.glyphs).map(([k, gs]) => [k, gs.map((g) => ({ ...g, alpha: (g.alpha ?? 1) * a }))])),
  over: c.over.map((s) => ({ ...s, alpha: (s.alpha ?? 1) * a })),
});
export const freezeOverlayAlpha = (f: number): number => (f < CRASH || f >= FREEZE_OVERLAY.gone ? 0 : 1 - clamp((f - FREEZE_OVERLAY.hold + 1) / (FREEZE_OVERLAY.gone - FREEZE_OVERLAY.hold)));

// ——— E9: the honest fps line (sheet §5.10.4) ————————————————————————————————————————————————————————————————————————————————

/** E9's ink for a count: green ≥ 50 fps, amber ≥ 20, pink-red below, and a brighter pink frozen. */
const fpsInk = (fps: number, frozen: boolean): RGB =>
  frozen ? linear(PALETTES.terminal.pink, 1.6) : fps < 20 ? linear(PALETTES.terminal.pink, 1.3) : fps < 50 ? linear(PALETTES.terminal.amber, 1.3) : linear(PALETTES.terminal.green, 1.3);
/**
 * The line at output frame `f` (null outside the readout): its text, ink and opacity. Green ≥ 50 fps, amber ≥ 20, pink-red below; from the
 * freeze `not responding`, blinking on the 16ths; v08: on through bridge B (where the camera's line runs down under it), fading with its
 * inhale (src/shots/bridgeB.ts lineFade).
 */
export function fpsAt(f: number): { text: string; ink: RGB; alpha: number } | null {
  if (f < REEL.from || f >= BRIDGE_B_END) return null;
  const r = honestFps(f);
  const text = fpsLine(r.fps, r.dropped, r.frozen);
  const blink = r.frozen && Math.floor((f - CRASH) / 6) % 2 === 1 ? 0 : 1;
  return { text, ink: fpsInk(r.fps, r.frozen), alpha: blink * lineFade(f) };
}
/**
 * The bullet time's second line (sheet §7.2, drop2 20.1): `camera 60.0 fps · still rolling` in the ok green, typed over drop2 20.1 → 20.1 + 6
 * (CAMERA_LINE), then steady — the program is frozen, the film isn't. v08 (bridge B): the camera runs down too, and the line says so
 * honestly (src/score/bridgeB.ts cameraFps: `camera 54.0 fps · dropping frames` … `camera 0.0 fps · not responding`, E9's inks, blinking
 * with the frozen line once frozen), fading with the inhale. It stacks 32 px above the frozen line (under it the frame ends 25 px below
 * the chip). Null before it types.
 */
export const CAMERA_ROW = { dy: -32 } as const;
export function cameraLineAt(f: number): { text: string; count: number; ink: RGB; alpha: number } | null {
  if (f < CAMERA_LINE.from || f >= BRIDGE_B_END) return null;
  const c = cameraLineText(f);
  const n = [...c.text].length;
  const count = Math.min(n, Math.ceil(([...CAMERA_FPS_LINE].length * (Math.floor(f) - CAMERA_LINE.from + 1)) / (CAMERA_LINE.to - CAMERA_LINE.from + 1)));
  const blink = c.frozen && Math.floor((f - CRASH) / 6) % 2 === 1 ? 0 : 1;
  return { text: c.text, count, ink: fpsInk(c.fps, c.frozen), alpha: blink * lineFade(f) };
}
/** The fps line as screen content: JetBrains Mono 19 px on a #0C0F0E chip (padding 8 / 4 px) at x 46, baseline 1050 (the camera's line above it). */
export function fpsContent(f: number, mono: Advance): FlatContent {
  const l = fpsAt(f);
  const cam = cameraLineAt(f);
  const size = 19;
  const mid = 1050 - 0.3 * size;
  const under: Shape[] = [];
  const glyphs: Glyph[] = [];
  const ground = linear(PALETTES.terminal.ground);
  if (cam && cam.alpha > 0) {
    // Its own chip and backing, drawn first: the frozen line's backing lies over its lower edge.
    const shown = [...cam.text].slice(0, cam.count).join('');
    const w = typeset(cam.text, mono).width * size;
    const y = mid + CAMERA_ROW.dy;
    under.push({ kind: 'rect', x: X(46 - 32 + (w + 64) / 2), y: Y(y), w: w + 64, h: 50, color: ground, alpha: Math.min(1, cam.alpha * 1.2) * 0.92, soft: 14 });
    under.push({ kind: 'rect', x: X(46 - 8 + (w + 16) / 2), y: Y(y), w: w + 16, h: size + 8 + 4, color: ground, alpha: Math.min(1, cam.alpha * 1.2) });
    glyphs.push(...textAt(shown, mono, 46, y, size, cam.ink, { alpha: cam.alpha }));
  }
  if (l && l.alpha > 0) {
    const w = typeset(l.text, mono).width * size;
    const chip: Shape = { kind: 'rect', x: X(46 - 8 + (w + 16) / 2), y: Y(mid), w: w + 16, h: size + 8 + 4, color: ground, alpha: Math.min(1, l.alpha * 1.2) };
    // A feathered dark backing round the chip (two rows tall, 24 px either side), so the line never sits on the field's type.
    const back: Shape = { kind: 'rect', x: X(46 - 32 + (w + 64) / 2), y: Y(mid), w: w + 64, h: 66, color: ground, alpha: Math.min(1, l.alpha * 1.2) * 0.92, soft: 16 };
    under.push(back, chip);
    glyphs.push(...textAt(l.text, mono, 46, mid, size, l.ink, { alpha: l.alpha }));
  }
  if (under.length === 0) return EMPTY;
  return { under, glyphs: { mono: glyphs }, over: [] };
}

// ——— Finishing, sub-frames, segments ————————————————————————————————————————————————————————————————————————————————————————

const NEON_BLOOM = { intensity: 1.15, threshold: 0.75, smoothing: 0.3, radius: 0.75 } as const;
const LOOK: Readonly<Record<World, Look>> = {
  neon: { toneMapping: 'linear', exposure: 1, bloom: NEON_BLOOM, aberration: 0, grain: 0.04, vignette: 0.18 },
  led: { toneMapping: 'linear', exposure: 1, bloom: { intensity: 1, threshold: 0.75, smoothing: 0.3, radius: 0.7 }, aberration: 0, grain: 0.04, vignette: 0.18 },
  swiss: { toneMapping: 'linear', exposure: 1, bloom: { intensity: 0, threshold: 1, smoothing: 0.1, radius: 0.7 }, aberration: 0, grain: 0.05, vignette: 0 },
  riso: { toneMapping: 'linear', exposure: 1, bloom: { intensity: 0, threshold: 1, smoothing: 0.1, radius: 0.7 }, aberration: 0, grain: 0.18, vignette: 0.12 },
  interlude: { toneMapping: 'linear', exposure: 1, bloom: { intensity: 0, threshold: 1, smoothing: 0.1, radius: 0.7 }, aberration: 0, grain: 0.05, vignette: 0.05 },
  space: { toneMapping: 'linear', exposure: 1, bloom: { intensity: 0.9, threshold: 0.95, smoothing: 0.3, radius: 0.75 }, aberration: 0, grain: 0.05, vignette: 0.2 },
  terminal: { ...terminalLook(0.55), bloom: { intensity: 1.0, threshold: 0.85, smoothing: 0.25, radius: 0.75 } },
};
/** The look of the field (drop2 8.1–8.2): flat, a little glow on the bright cells, no CRT until the freeze. */
export const FIELD_LOOK: Look = { toneMapping: 'linear', exposure: 1, bloom: { intensity: 1.1, threshold: 0.98, smoothing: 0.2, radius: 0.75 }, aberration: 0, grain: 0.05, vignette: 0.16 };
/** S32's finishing at output frame `f` (< the freeze): the card's world's look; the field's from drop2 8.1 (FIELD_FROM). */
export function overloadLook(f: number): Look {
  if (f >= FIELD_FROM) return FIELD_LOOK;
  const c = stutterFrame(f);
  const p = planAt(c);
  const w = p.kind === 'card' ? p.world : p.kind === 'edge' ? (p.edge > 960 ? p.over : p.under) : 'terminal';
  return LOOK[w];
}
/**
 * Sub-frames (shutter 0.5): 64 as he lands from the whip, 32 on the wipes, the blades, the crash-zoom and the field (for the drop), and
 * on every card frame since round 2 (the worlds race past him: the neon stream at up to 96 px a frame, the warp's outer stars ≈ 130).
 */
export function overloadTemporal(f: number): Temporal {
  const T = (samples: number): Temporal => ({ samples, shutter: 0.5, persistence: 0 });
  if (f <= REEL.from + 2) return T(64);
  return T(32);
}
/** Segments: drop 2's (the hard cuts drop2 7.2, 7.3, 7.4 and the freeze). */
export const overloadSegment = (f: number): Segment => drop2Segment(f);

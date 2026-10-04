// Shots S09–S12 (the part 'riso', 4 bars: the Riso world) as pure functions of
// the frame; positions are riso-local (src/score/film.ts).
// Every ink multiplies (src/scenes/riso.ts prints them on paper), so where two
// overlap they make a third colour whatever the order. S09 and S10 are stacks
// of printed sheets in screen px, drawn back to front: each sheet an opaque
// page (so a sheet on top hides the one below) with its inks multiplied over it.
//
// Bars 11–14 of the 60-bar map (build sheet notes/b114/sheet.md §3.11–3.14, §8 W4): S09–S11 are v04's frame for frame (their
// plates drift on v04's clock: seedFrame), with A8's press slug in S09; T2's card backs are S09's first sheet with its plates
// converging on the fill (s09PreRoll, before riso 1.1); S12 prints proof → print on the snare sixteenths, rolls a halftone sky,
// rocks its sea and rings its sun in halftone dots instead of rays, and hands the lift v04's last frame. Each addition sits behind
// its thread (src/content/build.ts BUILD_THREADS): off, the shot draws what v04 drew.
import { PROTAGONIST, layoutFace } from '../actors/cast.ts';
import { SIGNATURE } from '../content/boot.ts';
import { BUILD_THREADS, type BuildThreads, FLIPBOOK, MOUTH_FACES, PRINT, RISO_ADDED, RISO_GLYPHS, RISO_SLUG, SEA_STEP, SKY, SUN_RING } from '../content/build.ts';
import { type Pose, frontal } from '../engine/camera.ts';
import { type RGB, linear, multiplyRGB } from '../engine/color.ts';
import { counterKey } from '../engine/glyphAtlas.ts';
import type { Glyph } from '../engine/glyphField.ts';
import type { HalftoneState } from '../engine/halftone.ts';
import { hash } from '../engine/random.ts';
import { clamp, ease, lerp, prog, smoothstep } from '../engine/math.ts';
import type { Shape } from '../engine/shapeField.ts';
import { DEFAULT_TEMPORAL, type Segment, type Temporal, struck } from '../engine/temporal.ts';
import { type Advance, typeset } from '../engine/typeset.ts';
import { type Aim, type Move, aimPose, launch, moveTrack, slam, strike, within } from '../motion/hit.ts';
import {
  BUILD_END, FACES, HATS, HOLE, MERGED, MOUTHS, PRINT_STEPS, REGISTER, ROLL, SEA, SKY_ROLLER, SKY_UNPRINT, SLAMS, SLUG, STRETCH, SUCK, SUNRISE, SUN_RINGS, TEARS,
} from '../score/build.ts';
import { partFrame, partStart, seedFrame } from '../score/film.ts';
import { PAPER, PLATE, type Plate, RISO, SCREEN, misregistration } from '../worlds/riso.ts';
import { FOV, FRONT } from './swiss.ts';

/** The Riso part's bar `bar` (1-based), plus `beat` beats (0-based). */
const riso = (bar: number, beat = 0): number => partFrame('riso', bar, beat);

/** The bars 1–14 threads the Riso shots read (src/content/build.ts BUILD_THREADS); risoFrame takes them, so tests can draw both paths. */
export type RisoThreads = Pick<BuildThreads, 'register' | 'slugs' | 'printSteps' | 'sunRings'>;

/**
 * Measured in the browser: advances (ems) of the rounded atlas (and of the slug's own atlas), and for each of S10's mouths the largest
 * frame-shaped window inside its counter (centre in ems from the glyph's centre, y up; half its height in ems).
 */
export type RisoLayout = { advance: Advance; slug?: Advance; mouths: Readonly<Record<string, { x: number; y: number; half: number }>> };
/** S11's halftone plane: its z, which face shows (one weight per mask channel), the dot scale, and each ink's shift. */
export type Halftone = HalftoneState;
/** What a sheet or a frame prints: shapes, then glyphs of the main atlas (`rounded`) and of A8's slug atlas (`slug`), then shapes. */
export type RisoContent = { under: Shape[]; glyphs: { rounded: Glyph[]; slug?: Glyph[] }; over: Shape[] };
/** One printed sheet: its page and knockouts (opaque, normal blend), then its inks (multiplied over it); drawn through `view` if it has its own (S09's last tear, flat over S10's flight). */
export type Sheet = { card: RisoContent; ink: RisoContent; view?: Pose };
/** Sheets drawn back to front through `view` over `clear` — or, in S10's flight, over S11's halftone (seen through the last mouth). */
export type Stack = { clear: RGB; view: Pose; halftone: boolean; sheets: readonly Sheet[] };
/**
 * S12's proof (riso 4.1–4.1a): glyphs printed as two halftone screens at `coverage` (dot area, 0–1), S11's pitch and angles, each
 * screen shifted by `shift` px. `mask` holds those glyphs in world units with their screens as colours — red: the pink screen prints
 * there, green: the blue (a fraction fades it) — for src/scenes/riso.ts to draw into a mask and print through it.
 */
export type RisoPrint = { mask: Glyph[]; coverage: number; shift: Readonly<Record<'pink' | 'blue', readonly [number, number]>> };
export type RisoFrame = { camera: Pose; content: RisoContent; halftone: Halftone | null; near: readonly [number, number]; stack: Stack | null; print?: RisoPrint | null };

/**
 * The Riso scene's atlases. `main` is v04's (RISO_GLYPHS without A8's slug-only characters and the characters added since, in v04's
 * order), so every cell of it, and the mouths' counters packed after it, sits where v04's did (S10's holes are guarded byte for byte);
 * `added` (N1's ・) packs after the counters; the slug has an atlas of its own.
 */
const SLUG_CHARS: readonly string[] = [...new Set(SIGNATURE.replaceAll(' ', ''))];
export const RISO_ATLAS: { readonly main: readonly string[]; readonly added: readonly string[]; readonly slug: readonly string[] } = {
  main: RISO_GLYPHS.filter((c) => !SLUG_CHARS.includes(c) && !RISO_ADDED.includes(c)),
  added: RISO_ADDED,
  slug: SLUG_CHARS,
};

const content = (): RisoContent => ({ under: [], glyphs: { rounded: [] }, over: [] });
const sheet = (): Sheet => ({ card: content(), ink: content() });
/** The view the sheets are drawn in: square on, 1 unit = 1 px at 1080p. */
export const FLAT: Pose = frontal(FRONT, 0, 0, FOV);
/** Riso motion is playful: bouncier landings (spec §3.1 rule 5). */
export const RISO_BOUNCE = 1.2;
/** A printed page's colour: paper, or paper under a full-bleed plate inked solid (full density: S11's contrast, not the washed-out pastels of the old S09). */
const pageColor = (p: Plate | 'paper'): RGB => (p === 'paper' ? PAPER : multiplyRGB(PAPER, linear(RISO[p])));

/** `text` set in one line at (x, y) — centred, ending at x, or starting at x — `size` px to the em. */
function line(text: string, L: RisoLayout, x: number, y: number, size: number, color: RGB, align: 'centre' | 'end' | 'start' = 'centre'): Glyph[] {
  const t = typeset(text, L.advance);
  const left = align === 'centre' ? -t.width / 2 : align === 'end' ? -t.width : 0;
  return t.chars.filter((c) => c.ch.trim() !== '').map((c) => ({ ch: c.ch, x: x + (left + c.x) * size, y, size, color }));
}

/** A sheet moved as one piece: scaled by `k` about the frame's centre, turned by `rot`, then shifted by (dx, dy). */
function moved(s: Sheet, k: number, rot: number, dx: number, dy: number): Sheet {
  const c = Math.cos(rot);
  const n = Math.sin(rot);
  const at = (x: number, y: number): [number, number] => [dx + k * (x * c - y * n), dy + k * (x * n + y * c)];
  const shape = (p: Shape): Shape => {
    const [x, y] = at(p.x, p.y);
    const q: Shape = { ...p, x, y, w: p.w * k, h: p.h * k, rot: (p.rot ?? 0) + rot };
    if (p.r !== undefined) q.r = p.r * k;
    if (p.screen !== undefined) q.screen = p.screen * k;
    return q;
  };
  const glyph = (g: Glyph): Glyph => {
    const [x, y] = at(g.x, g.y);
    return { ...g, x, y, size: g.size * k, rot: (g.rot ?? 0) + rot };
  };
  const all = (q: RisoContent): RisoContent => ({ under: q.under.map(shape), glyphs: { rounded: q.glyphs.rounded.map(glyph) }, over: q.over.map(shape) });
  return { card: all(s.card), ink: all(s.ink) };
}

// S09 (riso bar 1), a tear-off flipbook (picked from the prototypes,
// 2026-10-01): a pad of full-bleed printed sheets, one face on each. On every
// sixteenth the sheet on top is torn off and flies out toward the side its arp
// note sounds, showing the next; on each beat a new face slams down, and the
// three sheets between animate it (a hand up, both hands, a blink). The sheets
// run paper, pink, blue, yellow; registration marks turn a step a sixteenth.

/** How each sheet of a beat is printed: its page, its face (knocked out to paper, an ink, or both plates out of register), and the face's ghost plate. */
const FLIP_SHEETS: readonly { page: Plate | 'paper'; face: Plate | 'paper' | 'plates'; ghost: Plate }[] = [
  { page: 'paper', face: 'plates', ghost: 'blue' },
  { page: 'pink', face: 'paper', ghost: 'blue' },
  { page: 'blue', face: 'paper', ghost: 'pink' },
  { page: 'yellow', face: 'pink', ghost: 'blue' },
];
/** Half the width of a tooth of a torn edge. */
const TOOTH = 26;
/** Every sheet's face: as wide as 112% of the frame (or 95% as tall), its centre this far below the frame's. */
const FACE_Y = -24;
const faceSize = (text: string, L: RisoLayout): number => Math.min((1.12 * 1920) / typeset(text, L.advance).width, 0.95 * 1080);

/**
 * Flipbook sheet `s` (0–15). `torn` ≠ 0: the sheet tearing off toward that side (−1 left), its trailing edge ragged where it left the
 * pad. `plates`: how many times its usual distance the two plates of a 'plates' face print apart (T2's backs converge to 1).
 */
function flipSheet(s: number, L: RisoLayout, torn: -1 | 0 | 1, plates = 1): Sheet {
  const out = sheet();
  const how = FLIP_SHEETS[s % 4];
  const text = FLIPBOOK[Math.floor(s / 4)][s % 4];
  const color = pageColor(how.page);
  const w = 1920 + (torn ? 60 : 160);
  out.card.under.push({ kind: 'rect', x: 30 * torn, y: 0, w, h: 1240, color });
  if (torn) {
    for (let i = 0; i <= 1240 / (2 * TOOTH); i++) out.card.under.push({ kind: 'rect', x: -960 * torn, y: -620 + 2 * TOOTH * i, w: TOOTH * Math.SQRT2, h: TOOTH * Math.SQRT2, rot: Math.PI / 4, color });
  }
  const size = faceSize(text, L);
  const y = FACE_Y;
  if (how.face === 'plates') {
    out.ink.under.push({ kind: 'rect', x: 30 * torn, y: 0, w, h: 1240, color: PLATE.blue, tint: 0.16, screen: 40, angle: SCREEN.angle.blue });
    out.ink.glyphs.rounded.push(...line(text, L, -14 * plates, y + 6 * plates, size, PLATE.pink), ...line(text, L, 14 * plates, y - 6 * plates, size, PLATE.blue));
    return out;
  }
  if (how.face === 'paper') out.card.glyphs.rounded.push(...line(text, L, 0, y, size, PAPER));
  else {
    out.ink.under.push({ kind: 'rect', x: 30 * torn, y: 0, w, h: 1240, color: PLATE.blue, tint: 0.12, screen: 40, angle: SCREEN.angle.blue });
    out.ink.glyphs.rounded.push(...line(text, L, 0, y, size, PLATE[how.face]));
  }
  out.ink.glyphs.rounded.push(...line(text, L, 20, y - 12, size, PLATE[how.ghost]));
  return out;
}

/**
 * A8 (threads, bars 1–14 design §4.7): the signature as a press slug just right of the bottom-left registration mark, set from
 * RISO_SLUG.x and centred on its y, RISO_SLUG.px to the em — the blue plate, and a pink ghost a touch off register (right and down) at
 * 60 %. It never turns. In its own atlas (RISO_ATLAS.slug), with its own advances.
 */
function slugGlyphs(L: RisoLayout): Glyph[] {
  const t = typeset(SIGNATURE, L.slug ?? L.advance);
  const px = RISO_SLUG.px;
  const set = (dx: number, dy: number, color: RGB, alpha?: number): Glyph[] =>
    t.chars.filter((c) => c.ch.trim() !== '').map((c) => ({ ch: c.ch, x: RISO_SLUG.x + c.x * px + dx, y: RISO_SLUG.y + dy, size: px, color, ...(alpha === undefined ? {} : { alpha }) }));
  return [...set(0, 0, PLATE.blue), ...set(RISO_SLUG.ghost[0], -RISO_SLUG.ghost[1], PLATE.pink, RISO_SLUG.ghostAlpha)];
}

/** The registration marks in the corners, in both plates a touch out of register, turning a step on every sixteenth; with `slug`, A8's slug by the bottom-left one. */
function marks(step: number, L: RisoLayout, slug: boolean): Sheet {
  const out = sheet();
  const a = (step * Math.PI) / 8;
  for (const [x, y] of [[-840, 420], [840, 420], [-840, -420], [840, -420]] as const) {
    for (const [plate, d] of [['pink', 3], ['blue', -3]] as const) {
      out.ink.over.push({ kind: 'ring', x: x + d, y: y + d, w: 56, h: 56, r: 6, color: PLATE[plate] });
      for (const r of [a, a + Math.PI / 2]) out.ink.over.push({ kind: 'segment', x: x + d, y: y + d, w: 100, h: 6, rot: r, color: PLATE[plate] });
    }
  }
  if (slug) out.ink.glyphs.slug = slugGlyphs(L);
  return out;
}

// T2's backs (swiss 5.3–5.4, bars 1–14 design §3.10, E12): the cards turn over onto S09's first sheet — its two plates still far out of
// register, closing on each sixteenth of the fill (REGISTER) with a clack as they seat, the registration marks rolling round to S09's;
// on riso 1.1 S09 slams the same sheet down in register. Behind the `register` thread (off: S09's first frame, as v04's backs were).

/** The plates' distance apart, as a multiple of S09's own (−14, +6 / +14, −6): before the fill, then after each of its sixteenths. */
export const REGISTER_K: readonly number[] = [5, 4, 3, 2, 1.4];
/** A register step is a 2-frame launch (τ 0.75: exactly seated 6 frames on) … */
const REGISTER_TAU = 0.75;
/** … with a clack as the plate seats: an overshoot, then a ring, 35 % of the step, exactly still 6 frames on. */
const clack = (t: number): number => (t <= 0 || t >= 6 ? 0 : 0.35 * Math.exp(-t / 2) * Math.sin((Math.PI * t) / 2.5) * (1 - smoothstep(4, 6, t)));
/** How many times S09's distance the plates of T2's backs print apart at `frame`. */
export function registerK(frame: number): number {
  let k = REGISTER_K[0];
  REGISTER.forEach((at, i) => {
    k += (REGISTER_K[i + 1] - REGISTER_K[i]) * (launch(frame, at, { tau: REGISTER_TAU, bounce: 0 }) + clack(frame - at));
  });
  return k;
}
/** The registration marks' turn on T2's backs, in S09's steps of π/8: −4 (a quarter turn back, the same cross) rolling up a step on each sixteenth of the fill to S09's 0. */
export const preRollTurn = (frame: number): number => moveTrack(frame, -4, REGISTER.map((at, i) => ({ at, to: i - 3, tau: REGISTER_TAU, bounce: 1 })));
/** S09 slams its sheets in at 110 % (s09's `k` on a beat, t = 0): the backs show the first sheet at that size, as riso 1.1 does. */
const SLAM_IN = 1 + 0.1;

/** T2's backs at `frame` (before riso 1.1): S09's first sheet, its plates converging, its marks rolling round. */
function s09PreRoll(frame: number, L: RisoLayout, th: RisoThreads): RisoFrame {
  if (!th.register) return s09(SLAMS[0], L, th);
  const sheets: Sheet[] = [moved(flipSheet(0, L, 0, registerK(frame)), SLAM_IN, 0, 0, 0), { ...marks(preRollTurn(frame), L, th.slugs), view: FLAT }];
  return { camera: FLAT, content: content(), halftone: null, near: [0, 0], stack: { clear: PAPER, view: FLAT, halftone: false, sheets } };
}

function s09(frame: number, L: RisoLayout, th: RisoThreads): RisoFrame {
  const s = TEARS.filter((t) => t <= frame).length;
  const from = s === 0 ? SLAMS[0] : TEARS[s - 1];
  const t = frame - from;
  // The sheet on top now: slammed down on the beat (in at 110%, settling fast), barely breathing between.
  const k = SLAMS.includes(from) ? 1 + 0.1 * Math.exp(-t / 2.4) : 1 + 0.015 * Math.exp(-t / 2);
  // The last sheet is the first open mouth, and S10's flight already hangs beyond it: the camera dives into it from here, bursting through on the downbeat.
  const M = s === TEARS.length ? mouths(L) : null;
  const view = M ? flightCamera(frame, M) : FLAT;
  const sheets: Sheet[] = M ? flightStack(frame, view.position[2], M, L) : [moved(flipSheet(s, L, 0), k, 0, 0, 0)];
  if (s > 0) {
    // The sheet before it tears off toward its note's side (even sixteenths left): a launch, three quarters gone in three frames.
    const side = s % 2 === 0 ? -1 : 1;
    const go = 1 - Math.exp(-t / 1.7);
    sheets.push({ ...moved(flipSheet(s - 1, L, side), 1, -side * 0.3 * go, side * 2020 * go, 120 * go), view: FLAT });
  }
  // A8: the slug goes with S09 — before riso 2.1's shutter opens (struck), so S10's first frame is v04's.
  sheets.push({ ...marks(s, L, th.slugs && frame >= SLUG.from && !struck(SLUG.to, frame)), view: FLAT });
  return { camera: view, content: content(), halftone: null, near: [0, 0], stack: { clear: PAPER, view, halftone: false, sheets } };
}

// S10 (riso bar 2), through the open mouths (refined: real
// kaomoji with many mouths, joined to S09, far apart, and in time). S09's last
// sheet is a shout whose mouth is a hole cut through the page; the faces hang
// one after another down a long flight, each GAP deep, each a little off the
// last. On every kick the camera bursts through a mouth (accelerating into the
// drum): the first on riso 2.1, the last on riso 3.1, into S11. After each it rushes across the gap — dots and dotted rings
// streaming past — slowing to land on the next face, filling the frame, on the
// and; then it accelerates into that face's mouth for the next kick. Each hole
// is the mouth glyph's own counter (the inside of its 〇, ロ, ▽, ◇, O).

/** How each mouth's page is printed. The first is S09's last sheet (the yellow of its beat). */
const MOUTH_SHEETS: readonly { page: Plate | 'paper'; face: Plate | 'paper'; ghost: Plate }[] = [
  { page: 'yellow', face: 'pink', ghost: 'blue' },
  { page: 'pink', face: 'paper', ghost: 'blue' },
  { page: 'blue', face: 'paper', ghost: 'pink' },
  { page: 'paper', face: 'pink', ghost: 'blue' },
  { page: 'pink', face: 'paper', ghost: 'blue' },
];
/** How far apart the faces hang: six times the distance at which a face fills the frame, so through a mouth the next looks a sixth of its size. */
export const GAP = 6 * FRONT;
/** How big a face's mouth hole looks as the camera bursts through it: big enough to cover the frame. */
const THROUGH = 6;
/** Where each face's page hangs (its centre; the first is S09's last sheet, square in the frame). The last is placed so its mouth is on the axis, where S11's flight goes on. */
const OFFSETS: readonly (readonly [number, number])[] = [
  [0, 0],
  [520, -230],
  [-470, 250],
  [460, 210],
];
/** A page's half-size: wide enough to fill the frame from GAP away even right after a burst, with the camera still on the last mouth's window (up to ~1200 px to the page's side). */
const PAGE = { w: 8 * 960, h: 8 * 540 } as const;

/** The string mouth `j`'s face is set as (its size and every character's place): MOUTH_FACES' `setAs`, or the face itself. */
const mouthSet = (j: number): string => MOUTH_FACES[j].setAs ?? MOUTH_FACES[j].face;
/** Mouth `j`'s face `set` at (x, y): the characters of its `setAs` string where they set, each replaced by the face's own (centred on it). */
function mouthLine(j: number, L: RisoLayout, x: number, y: number, size: number, color: RGB): Glyph[] {
  const own = [...MOUTH_FACES[j].face].filter((c) => c.trim() !== '');
  const set = line(mouthSet(j), L, x, y, size, color);
  if (own.length !== set.length) throw new Error(`S10: ${MOUTH_FACES[j].face} cannot be set as ${mouthSet(j)}`);
  return set.map((g, i) => (g.ch === own[i] ? g : { ...g, ch: own[i] }));
}

/** Mouth `j`'s page in its own coordinates (centre at the origin, the face as it fills the frame), and where its hole's window is (px from the centre). */
function mouthPage(j: number, L: RisoLayout): { sheet: Sheet; focus: readonly [number, number] } {
  const out = sheet();
  const how = MOUTH_SHEETS[j];
  const { face, mouth } = MOUTH_FACES[j];
  const size = faceSize(mouthSet(j), L);
  const ink = how.face === 'paper' ? PAPER : PLATE[how.face];
  const glyphs = mouthLine(j, L, 0, FACE_Y, size, ink);
  const m = glyphs.find((g) => g.ch === mouth);
  const win = L.mouths[mouth];
  if (!m || !win) throw new Error(`S10: no mouth ${mouth} in ${face}`);
  // The page: a tile with the mouth's counter cut through it (the counter glyph, inverted, at the mouth's place and size), and four bands round it out to the page's edges.
  const color = pageColor(how.page);
  const t = (size * QUAD_PER_EM * 1.2) / 2;
  out.card.glyphs.rounded.push({ ch: counterKey(mouth), x: m.x, y: m.y, size, color, invert: true, sheet: 1.2 });
  const o = 2; // overlap, so the bands and the tile meet without a seam
  out.card.under.push(
    { kind: 'rect', x: 0, y: (PAGE.h + m.y + t) / 2 - o, w: 2 * PAGE.w, h: PAGE.h - m.y - t + 2 * o, color },
    { kind: 'rect', x: 0, y: (-PAGE.h + m.y - t) / 2 + o, w: 2 * PAGE.w, h: PAGE.h + m.y - t + 2 * o, color },
    { kind: 'rect', x: (-PAGE.w + m.x - t) / 2 + o, y: m.y, w: PAGE.w + m.x - t + 2 * o, h: 2 * t + 2 * o, color },
    { kind: 'rect', x: (PAGE.w + m.x + t) / 2 - o, y: m.y, w: PAGE.w - m.x - t + 2 * o, h: 2 * t + 2 * o, color },
  );
  (how.face === 'paper' ? out.card : out.ink).glyphs.rounded.push(...glyphs);
  // The ghost plate a touch out of register — all but the mouth, so no ink spills into the hole.
  out.ink.glyphs.rounded.push(...mouthLine(j, L, 20, FACE_Y - 12, size, PLATE[how.ghost]).filter((g) => g.ch !== mouth));
  return { sheet: out, focus: [m.x + win.x * size, m.y + win.y * size] };
}

/** A sheet set into the world: shifted by (dx, dy) and hung at depth z (shapes that already have a z keep it). */
function hung(s: Sheet, dx: number, dy: number, z: number): Sheet {
  const all = (q: RisoContent): RisoContent => ({
    under: q.under.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy, z: p.z ?? z })),
    glyphs: { rounded: q.glyphs.rounded.map((g) => ({ ...g, x: g.x + dx, y: g.y + dy, z: g.z ?? z })) },
    over: q.over.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy, z: p.z ?? z })),
  });
  return { card: all(s.card), ink: all(s.ink) };
}

/** The dive into a face's mouth: from filling the frame (FRONT away) to bursting through (FRONT / THROUGH away). */
const DIVE = FRONT - FRONT / THROUGH;

/**
 * The flight, beat by beat (burst to burst), as a speed in units a frame:
 * it bursts through each mouth on the kick at a steady clip (the hole swells
 * over the last few frames), shoots across the gap — a rush peaking a sixteenth
 * in — and slows to glide onto the next face on the and (still zooming 4% a
 * frame: a living hold), then accelerates into its mouth for the next kick.
 * The rush is sized so the first half crosses the gap and lands on the face;
 * the dive covers the rest. The first beat starts at the speed of the first
 * dive (into S09's last sheet), the others at the kick's.
 */
const LAND = 0.04 * FRONT;
const KICK = LAND + (DIVE - 12 * LAND) / (12 / 2.5);
/** The first dive, into S09's last sheet: from its tear (the last of TEARS) to the downbeat, accelerating (τ^2.5) into the first burst. */
const DIVE0 = { from: TEARS[TEARS.length - 1], to: MOUTHS[0] } as const;
const DIVE0_KICK = (2.5 * DIVE) / (DIVE0.to - DIVE0.from);
const beatSpeed = (kick: number) => {
  const rush = (GAP - DIVE - 12 * LAND - 6 * (kick - LAND)) / 6;
  return (t: number): number => {
    if (t >= 12) return LAND + (KICK - LAND) * ((t - 12) / 12) ** 1.5;
    return LAND + (kick - LAND) * (1 - smoothstep(0, 12, t)) + rush * Math.sin((Math.PI * t) / 12) ** 2;
  };
};
/** Distance flown `t` frames into a beat (0–24), for the first beat and the others: integrated once, finely. */
const BEAT_DISTANCE = [DIVE0_KICK, KICK].map((kick) => {
  const v = beatSpeed(kick);
  const n = 24 * 16;
  const cum = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) cum[i] = cum[i - 1] + v((i - 0.5) / 16) / 16;
  return (t: number): number => {
    const x = clamp(t / 24) * n;
    const i = Math.min(n - 1, Math.floor(x));
    return cum[i] + (cum[i + 1] - cum[i]) * (x - i);
  };
});

/** The camera's depth at `frame`, from S09's last sheet to the last burst (HOLE). The first face hangs at z 0; face j at −GAP · j. */
const flightZ = (frame: number): number => {
  if (frame < DIVE0.to) return FRONT - DIVE * clamp((frame - DIVE0.from) / (DIVE0.to - DIVE0.from)) ** 2.5;
  const b = (frame - MOUTHS[0]) / 24;
  const j = Math.floor(b);
  return FRONT / THROUGH - GAP * j - BEAT_DISTANCE[j === 0 ? 0 : 1](24 * (b - j));
};
/** Where the camera is as it bursts through the last mouth (HOLE); S11's halftone lies FRONT + 700 beyond. */
const PUNCH_Z = flightZ(HOLE);

type Mouth = { sheet: Sheet; centre: readonly [number, number]; z: number; window: readonly [number, number] };
/** The faces in the world: each page's centre, its depth, and the window of its hole (where the camera goes through). */
function mouths(L: RisoLayout): Mouth[] {
  return MOUTH_FACES.map((_, j) => {
    const p = mouthPage(j, L);
    const centre: readonly [number, number] = j < OFFSETS.length ? OFFSETS[j] : [-p.focus[0], -p.focus[1]];
    return { sheet: p.sheet, centre, z: -GAP * j, window: [centre[0] + p.focus[0], centre[1] + p.focus[1]] };
  });
}

const lerp2 = (a: readonly [number, number], c: readonly [number, number], w: number): [number, number] => [lerp(a[0], c[0], w), lerp(a[1], c[1], w)];
/** Sideways during a dive into face `m`: square on the face while it fills the frame, onto its mouth's window by the time the hole covers it. */
const diving = (frame: number, m: Mouth): [number, number] => lerp2(m.centre, m.window, smoothstep(1, THROUGH * 0.85, FRONT / (flightZ(frame) - m.z)));

/** The camera's sideways position at `frame`: diving onto each mouth's window, then across the gap to land square on the next face. */
function flightXY(frame: number, M: readonly Mouth[]): [number, number] {
  if (frame < MOUTHS[0]) return diving(frame, M[0]);
  const b = (frame - MOUTHS[0]) / 24;
  const j = clamp(Math.floor(b), 0, M.length - 2);
  const u = b - j;
  if (u < 0.5) return lerp2(M[j].window, M[j + 1].centre, ease.inOutCubic(u / 0.5));
  return diving(frame, M[j + 1]);
}

/** Each gap's stream: dotted rings, one for each sixteenth, each leaving the frame on its sixteenth (the arp), and dots scattered through the gap — in two inks that stand out against the page beyond. Keyed by the gap (−1: before the first face). */
function streams(M: readonly Mouth[]): Map<number, Shape[]> {
  const out = new Map<number, Shape[]>();
  const gapOf = (z: number): number => (z > 0 ? -1 : Math.min(M.length - 2, Math.floor(-z / GAP)));
  /** The two inks of gap `g`'s stream: paper and yellow over pink or blue pages, pink and blue over paper or yellow ones. */
  const inks = (g: number): readonly [RGB, RGB] => {
    const beyond = MOUTH_SHEETS[g + 1].page;
    return beyond === 'pink' || beyond === 'blue' ? [PAPER, pageColor('yellow')] : [pageColor('pink'), pageColor('blue')];
  };
  const add = (z: number, s: Shape) => {
    const g = gapOf(z);
    if (!out.has(g)) out.set(g, []);
    out.get(g)!.push(s);
  };
  for (let at = DIVE0.from, n = 0; at < HOLE; at += 6, n++) {
    const z = flightZ(at) - 0.29 * FRONT;
    const [x, y] = flightXY(at, M);
    const color = inks(gapOf(z))[n % 2];
    for (let i = 0; i < 44; i++) {
      const phi = (2 * Math.PI * i) / 44 + 0.3 * n;
      add(z, { kind: 'ellipse', x: x + 330 * Math.cos(phi), y: y + 330 * Math.sin(phi), z, w: 11, h: 11, color, alpha: 0.85 });
    }
  }
  for (let g = 0; g < M.length - 1; g++) {
    const [a, b] = inks(g);
    for (let i = 0; i < 260; i++) {
      const f = 0.03 + 0.94 * hash(g, i, 211);
      const z = M[g].z - f * GAP;
      const [x, y] = lerp2(M[g].window, M[g + 1].centre, f);
      const r = 14 + 22 * hash(g, i, 212);
      add(z, { kind: 'ellipse', x: x + 3200 * (hash(g, i, 213) - 0.5), y: y + 1900 * (hash(g, i, 214) - 0.5), z, w: r, h: r, color: i % 3 ? a : b, alpha: 0.9 });
    }
  }
  return out;
}

/** The faces jolt sideways with each arp note (left on the even sixteenths, right on the odd, counted from riso 1.1 like the tears), dying away within it: the held face stays alive. */
const jolt = (frame: number): number => {
  const n = Math.floor((frame - riso(1)) / 6);
  return (n % 2 === 0 ? -1 : 1) * 18 * Math.exp(-(frame - riso(1) - 6 * n) / 2);
};

/** Everything of the flight still ahead of a camera at depth `cz`, far to near: the faces not yet gone through, and between them their gaps' streams. */
function flightStack(frame: number, cz: number, M: readonly Mouth[], L: RisoLayout): Sheet[] {
  const items: { z: number; sheet: Sheet }[] = [];
  const dx = jolt(frame);
  M.forEach((m, j) => {
    // A face drops out once its hole covers the frame (the camera is through).
    const cover = (1.04 * 540) / (L.mouths[MOUTH_FACES[j].mouth].half * faceSize(mouthSet(j), L));
    if (cz - m.z > FRONT / cover) items.push({ z: m.z, sheet: hung(m.sheet, m.centre[0] + dx, m.centre[1], m.z) });
  });
  for (const [g, shapes] of streams(M)) {
    const ahead = shapes.filter((s) => (s.z ?? 0) < cz - 30);
    if (!ahead.length) continue;
    const s = sheet();
    s.card.over.push(...ahead);
    items.push({ z: g < 0 ? 1 : M[g].z - GAP / 2, sheet: s });
  }
  return items.sort((a, b) => a.z - b.z).map((i) => i.sheet);
}

/** The flight's camera at `frame`: looking straight down the flight. */
function flightCamera(frame: number, M: readonly Mouth[]): Pose {
  const z = flightZ(frame);
  const [x, y] = flightXY(frame, M);
  return { position: [x, y, z], target: [x, y, z - 1000], up: [0, 1, 0], fov: FOV };
}

function s10(frame: number, L: RisoLayout): RisoFrame {
  const M = mouths(L);
  const view = flightCamera(frame, M);
  return { camera: view, content: content(), halftone: halftoneAt(frame), near: [0, 0], stack: { clear: PAPER, view, halftone: true, sheets: flightStack(frame, view.position[2], M, L) } };
}

/** The camera's z from the last mouth on: punching through — a launch — and settling 700 further on, onto S11's halftone (a small overshoot). */
export function flyZ(frame: number): number {
  return PUNCH_Z - 700 * strike(frame, HOLE, 3, 0.6);
}

/** S11's halftone faces: drawn at this size on masks covering 1.5 × the frame, so the widest (the cat) runs off the frame's edges. */
export const MASK_PX = 430;
export const MASK_COVER = 1.5;
/** S11's halftone plane: FRONT beyond where the camera settles after the last mouth. */
export const HALFTONE_Z = PUNCH_Z - 700 - FRONT;
/** The halftone plane is this many times the frame across: wide enough that no camera that sees it (through the last mouth, then S11's) reaches past its edges. */
export const HALFTONE_EXTENT = 4;
/** Quad heights per em in the Riso atlas (fontPx 160, radius 20: cellH 260); src/scenes/riso.ts checks it. */
export const QUAD_PER_EM = 260 / 160;

/** S11's dots: which face shows (a new one each beat from riso 3.1), their size (a pulse on each sixteenth-note hat, a jump on each new face) and the inks' drift. */
export function halftoneAt(frame: number): Halftone {
  // Every change happens a quarter frame early, so the whole shutter of a hit frame sees only the new face and the new pulse (no double exposure).
  const f = frame + 0.25;
  const beat = clamp(FACES.filter((x) => x <= f).length - 1, 0, 3);
  // No face until riso 3.1: the last mouth opens onto bare dots, and the cat appears on riso 3.1.
  const faces: [number, number, number, number] = [0, 0, 0, 0];
  if (f >= FACES[0]) faces[beat] = 1;
  const hat = HATS.filter((h) => h >= riso(3) && h <= f).pop();
  const pulse = hat === undefined ? 0 : Math.exp(-(f - hat) / 2.2);
  const change = f >= FACES[0] ? Math.exp(-(f - FACES[beat]) / 4) : 0;
  // The plates drift on v04's clock (the bars before them grew by two), so S10's distant rosette and S11 are v04's frame for frame.
  const mis = misregistration(frame, FACES, 6, seedFrame(frame));
  return { z: HALFTONE_Z, faces, scale: 0.8 + 0.12 * pulse + 0.08 * change, shift: { pink: mis.pink, blue: mis.blue } };
}

/** S11's camera (spec §3.1 rule 2): settling in from the last mouth, then a steady push (2.5% a beat) with a slow roll; the faces and the dots carry the beats. */
function s11Camera(frame: number): Pose {
  const b = Math.max(0, (frame - riso(3)) / 24);
  const zoom = 1.025 ** b;
  const roll = 0.01 * b;
  return { position: [0, 0, HALFTONE_Z + (flyZ(frame) - HALFTONE_Z) / zoom], target: [0, 0, HALFTONE_Z], up: [Math.sin(roll), Math.cos(roll), 0], fov: FOV };
}

function s11(frame: number): RisoFrame {
  return { camera: s11Camera(frame), content: content(), halftone: halftoneAt(frame), near: [0, 0], stack: null };
}

// S12 (riso bar 4): the face lands on the cut; on beat 2 its brackets fly off and
// its mouth lands as the horizon; the sea's bands bounce up on the sixteenths;
// the eyes slam together into the sun's core; the sun rises in two hits
// (beats 3 and 4) through the snare roll, the camera pushing in on each; on
// the last eighth everything swells, then is sucked into the sun (T3's first
// half, spec §6).
// Bars 1–14 (design §3.14, §4.8): the cut is an inversion print — S11's negative rosette face becomes (•ω•) printed as a positive
// proof, its ω where S11's was, and the press prints it up to the solid two-plate face on the snare sixteenths (printSteps); a roller
// prints a halftone sky over the stretch, the sea's ω rows chop with the snare, and the sun glows in rings of halftone dots instead of
// rays (sunRings). Off, each draws v04's S12. Every new layer is gone by the suck: 1332–1343 are v04's.

/** Low in the frame, so the sun has room to rise to the middle. */
export const HORIZON = -260;
/** The sun: its radius and its core's, as it rises and after the pull (the Riso part's last frame). */
export const SUN = { r: 175, core: 112, endR: 150, endCore: 90 } as const;
/** The big face of S12: its brackets at the frame's edges. */
export const BIG = { x: 0, y: 70, size: 640 } as const;
/** Diameter (ems) of a glyph's morph circle in the Riso glyph fields: S12's eyes become the sun's core; S10's mouths are holes this round. */
export const SUN_CIRCLE_PER_EM = (2 * SUN.core) / BIG.size;
/** Where the eyes meet and the sun sits until beat 3: on the horizon. */
const SUN_ON_HORIZON: readonly [number, number] = [0, HORIZON + 50];
/** The sun's centre: on the horizon, launching halfway up on beat 3 and to the middle of the frame on beat 4. */
export const sunCentre = (frame: number): [number, number] => [
  0,
  moveTrack(frame, SUN_ON_HORIZON[1], [
    { at: SUNRISE.from, to: SUN_ON_HORIZON[1] / 2, tau: 3, bounce: RISO_BOUNCE },
    { at: SUNRISE.to, to: 0, tau: 3, bounce: RISO_BOUNCE },
  ]),
];
/** S12's camera (spec §3.1 rule 2): a steady push towards the sun (4% a beat), its aim rising with it. */
export const s12Aim = (frame: number): Aim => ({ zoom: 1.04 ** Math.max(0, (frame - riso(4)) / 24), x: 0, y: 0.4 * sunCentre(frame)[1], roll: 0 });

/** The pull into the sun: a swell (−0.07) over the first 3 frames of the last eighth, then in to 1, reached as the last frame's shutter opens (so it sees only the sun). */
export function suckAt(frame: number): number {
  const t = frame - SUCK.from;
  if (t <= 0) return 0;
  if (t < 3) return -0.07 * Math.sin((Math.PI / 2) * (t / 3));
  return -0.07 + 1.07 * ease.inCubic(clamp((t - 3) / (SUCK.to - 1.25 - SUCK.from - 3)));
}

// ——— the proof → print (riso 4.1 … 4.1a, `printSteps`) ————————————————————————————————————————————————————————————————————————

/** S11's dot screen (src/scenes/riso.ts draws S11's halftone at this pitch): the proof prints on the same screen, at S11's angles. */
export const PRINT_PITCH = 22;
/**
 * Where S11's ω is on screen on its last frame (1080p px from the centre): S11 centres its faces on the halftone plane, the ω is the
 * middle character of (≧ω≦), and S11's camera looks at the plane's centre, so the ω sits on the frame's centre. E15 pins the proof's ω here.
 */
export const OMEGA_S11: readonly [number, number] = [0, 0];
/** How big S11's faces look on its last frame: MASK_PX ems at S11's last zoom (1.025 a beat), the em the proof's ω matches on the cut. */
const S11_EM = MASK_PX * (FRONT / (s11Camera(riso(4) - 1).position[2] - HALFTONE_Z));
/** A print step is a 2-frame launch, exactly seated 6 frames on (the next sixteenth). */
const PRINT_TAU = 0.75;
const printMoves = (values: readonly number[], bounce: number): Move[] => PRINT_STEPS.slice(1).map((at, i) => ({ at, to: values[i + 1], tau: PRINT_TAU, bounce }));
/** The proof's screens at `frame`: dot area 0.75 → 0.45 → 0.18 → 0 on the snare sixteenths (no overshoot: a screen never prints below 0). */
export const printCoverage = (frame: number): number => moveTrack(frame, PRINT.coverage[0], printMoves(PRINT.coverage, 0));
/** The print's size at `frame`, as a fraction of BIG: 0.76 → 0.84 → 0.92 → 1, a press hit on each sixteenth (each lands with a small ring). */
export const printScale = (frame: number): number => moveTrack(frame, PRINT.scale[0], printMoves(PRINT.scale, 1));
/**
 * The proof lands exactly as big as S11's face looked (its ω is S11's ω, size and place), a touch under 0.76 of BIG, and grows the rest of
 * the way by the stretch: v04's landing (a launch over the bar's first beat, τ 3) turned into growth, so every size change of the print grows.
 */
const PROOF_IN = S11_EM / (PRINT.scale[0] * BIG.size * s12Aim(riso(4)).zoom);
const proofGrowth = (frame: number): number => lerp(PROOF_IN, 1, launch(frame, riso(4), { tau: 3, bounce: RISO_BOUNCE }));
/** How far the print has come from S11's ω point to BIG's place: half on the press hits, half a glide (the sheet feeding up), so it never stops. */
const printTravel = (frame: number): number =>
  (0.5 * (printScale(frame) - PRINT.scale[0])) / (1 - PRINT.scale[0]) + 0.5 * smoothstep(riso(4), STRETCH.from, frame);
/** The plates jolt as each later step's impression comes down and seat by the next sixteenth (a registration clack, S12's misregistration's amount). */
const printClack = (frame: number): number => 8 * PRINT_STEPS.slice(1).reduce((s, at) => s + clack(frame - at), 0);
/** Each plate's offset during the print: S12's own drift (in register on the cut) plus the clacks, in the same directions as its strong-beat clack. */
const printShift = (mis: Record<Plate, [number, number]>, plate: 'pink' | 'blue', frame: number): [number, number] => {
  const seed = plate === 'pink' ? 11 : 23;
  const k = printClack(frame);
  return [mis[plate][0] + k * (2 * hash(seed, 7) - 1), mis[plate][1] + k * (2 * hash(seed, 8) - 1)];
};

/**
 * The print of riso 4.1 … 4.1a: the face's glyphs (solid where a plate has printed) and its proof (`print`: the screens, through a mask
 * of the same glyphs). The ω is pinned on S11's on the cut and the face travels to BIG's place and size by the stretch, where v04's takes over.
 */
function printFace(frame: number, L: RisoLayout, mis: Record<Plate, [number, number]>, glyph: (g: Glyph) => void): RisoPrint {
  const size = BIG.size * printScale(frame) * proofGrowth(frame);
  const parts = layoutFace(PROTAGONIST, L.advance);
  const omega = parts.find((p) => p.role === 'mouth');
  const a = s12Aim(riso(4));
  const pin: [number, number] = [a.x + OMEGA_S11[0] / a.zoom - (omega?.dx ?? 0) * size, a.y + OMEGA_S11[1] / a.zoom];
  const w = printTravel(frame);
  const [cx, cy] = [lerp(pin[0], BIG.x, w), lerp(pin[1], BIG.y, w)];
  const solid = { blue: struck(PRINT_STEPS[PRINT.solidBlueFrom], frame), pink: struck(PRINT_STEPS[PRINT.solidPinkFrom], frame) };
  const mask: Glyph[] = [];
  for (const p of parts) {
    const plate = p.role === 'eye' ? 'pink' : 'blue';
    const x = cx + p.dx * size;
    if (solid[plate]) {
      const [ox, oy] = printShift(mis, plate, frame);
      glyph({ ch: p.ch, x: x + ox, y: cy + oy, size, color: PLATE[plate] });
    }
    // The screens: pink over the whole face until the eyes print solid (then none on them); blue until the blue plate prints solid.
    if (plate === 'pink' && solid.pink) continue;
    mask.push({ ch: p.ch, x, y: cy, size, color: [1, plate === 'blue' && solid.blue ? 0 : 1, 0] });
  }
  return { mask, coverage: printCoverage(frame), shift: { pink: printShift(mis, 'pink', frame), blue: printShift(mis, 'blue', frame) } };
}

// ——— the sky, the sea's chop and the sun's rings (`sunRings`) ———————————————————————————————————————————————————————————————————

/** The sky's top: above every view of S12 (its camera never looks higher than ≈ 490). */
export const SKY_TOP = 560;
/** The roller's front at `frame`: from SKY_TOP down to the horizon over SKY_ROLLER (a launch: off fast, landing as the ω becomes the horizon). */
export const skyFront = (frame: number): number => lerp(SKY_TOP, HORIZON, prog(frame, SKY_ROLLER.from, SKY_ROLLER.to - 1, ease.outCubic));
/** The sky is printed in this many bands of yellow, deeper toward the horizon (a stepped gradient, as a screen-printed blend is), … */
const SKY_BANDS = 10;
/** … and three of pink in its lower third. */
const SKY_PINK_BANDS = 3;
/** What is left of the sky's dots as it un-prints over SKY_UNPRINT (and of the rings): 1 → 0, gone on its last frame. */
const unprinted = (frame: number): number => 1 - prog(frame, SKY_UNPRINT.from, SKY_UNPRINT.to - 1, ease.linear);

/** The halftone sky at `frame`: printed band by band down to the roller's front, un-printed over SKY_UNPRINT; the roller itself while it runs. */
function skyShapes(frame: number): Shape[] {
  const left = unprinted(frame);
  if (frame < SKY_ROLLER.from || left <= 0) return [];
  const front = skyFront(frame);
  const out: Shape[] = [];
  const band = (top: number, bottom: number, plate: Plate, tint: number): void => {
    const b = Math.max(bottom, front);
    if (b < top) out.push({ kind: 'rect', x: 0, y: (top + b) / 2, w: 2800, h: top - b, color: PLATE[plate], tint: tint * left, screen: SKY.pitch, angle: SCREEN.angle[plate] });
  };
  const h = (SKY_TOP - HORIZON) / SKY_BANDS;
  for (let k = 0; k < SKY_BANDS; k++) band(SKY_TOP - k * h, SKY_TOP - (k + 1) * h, 'yellow', lerp(SKY.yellow[0], SKY.yellow[1], k / (SKY_BANDS - 1)));
  const third = (SKY_TOP - HORIZON) / 3;
  const ph = third / SKY_PINK_BANDS;
  for (let k = 0; k < SKY_PINK_BANDS; k++) band(HORIZON + third - k * ph, HORIZON + third - (k + 1) * ph, 'pink', lerp(SKY.pink[0], SKY.pink[1], (k + 1) / SKY_PINK_BANDS));
  // The roller: a blue bar riding the front until it lands on the horizon.
  if (frame < SKY_ROLLER.to) out.push({ kind: 'rect', x: 0, y: front, w: 2600, h: 6, color: PLATE.blue, alpha: 0.5 });
  return out;
}

/** The sea's chop: a 20 px step on each snare sixteenth from MERGED, on each 32nd of the roll from the sunrise, rows alternating, seated on v04's drift by the un-print. */
const CHOP: readonly Move[] = (() => {
  const steps = [MERGED, MERGED + 6, ...SUN_RINGS.filter((at) => at < SKY_UNPRINT.from - 3)];
  return [...steps.map((at, i) => ({ at, to: i % 2 === 0 ? 1 : -1, tau: 0.75, bounce: 0 })), { at: SKY_UNPRINT.from - 3, to: 0, tau: 0.75, bounce: 0 }];
})();
/** Sideways offset (px) of the sea's ω row `row` at `frame` on top of v04's drift: ±SEA_STEP/2, neighbouring rows the opposite way. */
export const seaChop = (frame: number, row: number): number => (row % 2 === 0 ? 1 : -1) * (SEA_STEP / 2) * moveTrack(frame, 0, CHOP);

/**
 * The sun's halftone rings: one off the rim on each 32nd of SUN_RINGS, its dots shrinking as they fly out (halftone dots shrink rather
 * than fade: full ink to 60 % of the way, gone by the end); the last fade out with the sky. Each dot prints in the sun's two plates — its
 * yellow, and its pink a touch off register (the plates' offset `pink`) — so the rings are the sun's orange: yellow alone vanishes on the sky.
 */
function ringShapes(frame: number, centre: readonly [number, number], r: number, pink: readonly [number, number]): Shape[] {
  const left = unprinted(frame);
  const out: Shape[] = [];
  if (left <= 0) return out;
  SUN_RINGS.forEach((at, m) => {
    const a = frame - at;
    if (a < 0 || a >= SUN_RING.frames) return;
    const u = a / SUN_RING.frames;
    const rr = r + lerp(SUN_RING.r[0], SUN_RING.r[1], ease.outCubic(u));
    const d = lerp(SUN_RING.size[0], SUN_RING.size[1], u);
    const ink = (1 - smoothstep(0.6, 1, u)) * left;
    const dots: Shape[] = [];
    for (let i = 0; i < SUN_RING.dots; i++) {
      // Each ring a little turned from the one before, so the dots shimmer outward instead of running in spokes.
      const t = (2 * Math.PI * i) / SUN_RING.dots + 0.09 * m;
      dots.push({ kind: 'ellipse', x: centre[0] + rr * Math.cos(t), y: centre[1] + rr * Math.sin(t), w: d, h: d, color: PLATE.yellow, ...(ink < 1 ? { alpha: ink } : {}) });
    }
    out.push(...dots, ...dots.map((s) => ({ ...s, x: s.x + pink[0], y: s.y + pink[1], color: PLATE.pink })));
  });
  return out;
}

/** S12's plates at `frame`: they drift on v04's clock (the bars before them grew by two), so the suck and the last frame are v04's. */
const s12Plates = (frame: number): Record<Plate, [number, number]> => misregistration(frame, [riso(4), riso(4, 2)], 8, seedFrame(frame));

/** The sun's disc at `frame` (from MERGED): its radius and its core's, growing out of the merge and shrinking into the pull, and its bob. */
function sunDisc(frame: number): { r: number; core: number; bob: number } {
  const grow = launch(frame, MERGED, { tau: 3, bounce: RISO_BOUNCE });
  const end = prog(frame, SUCK.from, SUCK.to - 1.25, ease.inCubic);
  // The sun bobs a little between its launches (a living hold).
  const bob = 3 * Math.sin((2 * Math.PI * (frame - MERGED)) / 24) * (1 - smoothstep(SUCK.from - 6, SUCK.from, frame));
  return { r: lerp(SUN.r * grow, SUN.endR, end), core: lerp(SUN.core, SUN.endCore, end), bob };
}

/**
 * The output frame a sub-frame instant of S12 belongs to: its shutter is centred on it and half a frame long (risoTemporal), so every
 * instant of it rounds to it.
 */
export const s12OutputFrame = (instant: number): number => Math.round(instant);

/**
 * The sun's rings at sub-frame instant `instant`, printed crisp (RI1): each dot is drawn as it stands on the output frame — its ring's
 * way out, the sun's place, bob and plates all taken there — and held still on screen against S12's camera through the shutter. Blurred
 * along their flight (up to 20 px a shutter, on dots of 12 → 4 px), the dots smeared into pink-over-yellow dashes round the sun, which
 * read as the dotted ray burst the rings replaced. The screen rig's punches and shakes still move them with the rest of the picture.
 */
function heldRings(instant: number): Shape[] {
  const frame = s12OutputFrame(instant);
  const mis = s12Plates(frame);
  const sun = sunCentre(frame);
  const { r, bob } = sunDisc(frame);
  const dots = ringShapes(frame, [sun[0] + mis.yellow[0], sun[1] + bob + mis.yellow[1]], r, [mis.pink[0] - mis.yellow[0], mis.pink[1] - mis.yellow[1]]);
  if (instant === frame) return dots;
  // World → screen through S12's camera is (p − aim) × zoom (it never rolls): the world point that shows where p showed on the frame.
  const [then, now] = [s12Aim(frame), s12Aim(instant)];
  const k = then.zoom / now.zoom;
  return dots.map((d) => ({ ...d, x: now.x + (d.x - then.x) * k, y: now.y + (d.y - then.y) * k, w: d.w * k, h: d.h * k }));
}

function s12(frame: number, L: RisoLayout, th: RisoThreads): RisoFrame {
  const c = content();
  const mis = s12Plates(frame);
  const sun = sunCentre(frame);
  const suck = suckAt(frame);
  const spin = 2.2 * Math.max(0, suck);
  /** Where a point goes as it is sucked into the sun (spiralling in; pushed out first by the swell), and how much of its size is left. */
  const into = (x: number, y: number): [number, number, number] => {
    if (suck === 0) return [x, y, 1];
    const dx = x - sun[0];
    const dy = y - sun[1];
    const k = 1 - suck;
    return [sun[0] + (dx * Math.cos(spin) - dy * Math.sin(spin)) * k, sun[1] + (dx * Math.sin(spin) + dy * Math.cos(spin)) * k, k];
  };
  const shape = (s: Shape): void => {
    const [x, y, k] = into(s.x, s.y);
    if (k > 0.001) c.under.push({ ...s, x, y, w: s.w * k, h: s.h * k, rot: (s.rot ?? 0) + spin });
  };
  const glyph = (g: Glyph): void => {
    const [x, y, k] = into(g.x, g.y);
    if (k > 0.001) c.glyphs.rounded.push({ ...g, x, y, size: g.size * k, rot: (g.rot ?? 0) + spin });
  };

  // The sky: printed by the roller over the stretch, under everything.
  if (th.sunRings) skyShapes(frame).forEach(shape);
  // The sea: four blue bands, darker with depth, launching up from below the frame on the 32nds from beat 2, the bottom one first; the deepest runs far below any view.
  // They rise without overshoot, so the lower band always leads the one above it and they stay joined (the waves on them bounce).
  const bandH = (540 + HORIZON) / 4;
  [0.3, 0.5, 0.72, 1].forEach((tint, k) => {
    const up = launch(frame, SEA.from + 3 * (3 - k), { tau: 3, bounce: 0 });
    const deep = k === 3 ? 400 : 0;
    if (up > 0) shape({ kind: 'rect', x: 0, y: HORIZON - (k + 0.5) * bandH - deep / 2 - 640 * (1 - up), w: 2600, h: bandH + 1 + deep, color: PLATE.blue, tint, screen: 11, angle: SCREEN.angle.blue });
  });
  // The horizon shoots out from the centre as the mouth becomes it.
  const line = launch(frame, STRETCH.from, { tau: 3, bounce: 0.6 });
  if (line > 0) shape({ kind: 'rect', x: 0, y: HORIZON, w: 2600 * line, h: 6, color: PLATE.blue });
  // Waves: rows of stretched ω launching up with the sea, drifting alternately left and right (secondary motion); with the rings, chopping with the snare too.
  for (let j = 0; j < 3; j++) {
    const up = launch(frame, SEA.from + 6 + 3 * j, { tau: 3, bounce: RISO_BOUNCE });
    if (up <= 0) continue;
    const drift = (j % 2 === 0 ? 1 : -1) * 1.4 * (frame - SEA.from) + (th.sunRings ? seaChop(frame, j) : 0);
    for (let i = 0; i < 8; i++) glyph({ ch: 'ω', x: -1155 + 330 * i + drift, y: HORIZON - 55 - 110 * j - 640 * (1 - up), size: 56, stretch: 4.2, color: PLATE.blue });
  }

  // The big face: blue brackets and mouth, pink eyes, each plate at its own misregistration. It lands on the cut 10% big and settles (a launch from the cut);
  // on beat 2 its brackets fly off and its mouth launches into the horizon; the eyes slam together into the sun on MERGED. With the print, the press prints it up to here first.
  const print = th.printSteps && frame < STRETCH.from ? printFace(frame, L, mis, glyph) : null;
  if (!print) {
    const pop = lerp(1.1, 1, launch(frame, riso(4), { tau: 3, bounce: RISO_BOUNCE }));
    const stretch = launch(frame, STRETCH.from, { tau: 3, bounce: 0.8 });
    const fly = clamp(launch(frame, STRETCH.from, { tau: 2, bounce: 0 }));
    const merge = clamp(slam(frame, MERGED, 8, 0));
    const size = BIG.size * pop;
    for (const p of layoutFace(PROTAGONIST, L.advance)) {
      const plate: Plate = p.role === 'eye' ? 'pink' : 'blue';
      const [ox, oy] = mis[plate];
      const g: Glyph = { ch: p.ch, x: BIG.x + p.dx * size + ox, y: BIG.y + oy, size, color: PLATE[plate] };
      if (p.role === 'bracket') {
        if (fly < 0.95) glyph({ ...g, x: g.x + Math.sign(p.dx) * 1500 * fly, rot: -Math.sign(p.dx) * 0.8 * fly });
      } else if (p.role === 'mouth') {
        const s = Math.min(1, stretch);
        glyph({ ...g, y: lerp(g.y, HORIZON + 8, s), size: lerp(size, 120, s), stretch: lerp(1, 26, stretch) });
      } else if (frame < MERGED) {
        // The eyes slam together onto the horizon, rounding into circles; the left one fades so the pink does not double. On MERGED they are the sun's core.
        glyph({ ...g, x: lerp(g.x, SUN_ON_HORIZON[0] + ox, merge), y: lerp(g.y, SUN_ON_HORIZON[1] + oy, merge), morph: merge, alpha: p.dx < 0 ? 1 - merge : 1 });
      }
    }
  }

  // The sun: the pink core the eyes became and a yellow disc bouncing out from under it (orange where they overprint).
  if (frame >= MERGED) {
    const { r, core, bob } = sunDisc(frame);
    if (th.sunRings) {
      // Rings of halftone dots off the rim, one on each 32nd of the roll (a sun on a horizon glows in rings, never in wedge rays),
      // printed crisp: held still on screen through the shutter.
      heldRings(frame).forEach(shape);
    } else {
      // v04: rays, one more on each 32nd note of the roll, turning slowly.
      ROLL.filter((f) => f >= SUNRISE.from).forEach((at, k) => {
        const len = 150 * launch(frame, at, { tau: 1.5, bounce: 0 });
        if (len <= 0) return;
        const a = (((k * 5) % 12) / 12) * 2 * Math.PI + 0.015 * (frame - SUNRISE.from);
        const d = SUN.r + 30 + len / 2;
        shape({ kind: 'rect', x: sun[0] + d * Math.cos(a), y: sun[1] + d * Math.sin(a), w: 10, h: len, rot: a - Math.PI / 2, color: PLATE.yellow });
      });
    }
    c.under.push({ kind: 'ellipse', x: sun[0] + mis.yellow[0], y: sun[1] + bob + mis.yellow[1], w: 2 * r, h: 2 * r, color: PLATE.yellow });
    c.under.push({ kind: 'ellipse', x: sun[0] + mis.pink[0], y: sun[1] + bob + mis.pink[1], w: 2 * core, h: 2 * core, color: PLATE.pink });
  }
  return { camera: aimPose(s12Aim(frame), FRONT, FOV), content: c, halftone: null, near: [0, 0], stack: null, ...(print ? { print } : {}) };
}

/** Everything the Riso scene draws at `frame` (the Riso part, and before it T2's backs), with the bars 1–14 threads (default: the build's). */
export function risoFrame(frame: number, L: RisoLayout, th: RisoThreads = BUILD_THREADS): RisoFrame {
  if (frame < riso(1)) return s09PreRoll(frame, L, th);
  if (frame < riso(2)) return s09(frame, L, th);
  if (frame < riso(3)) return s10(frame, L);
  if (frame < riso(4)) return s11(frame);
  return s12(frame, L, th);
}

/** S12's quick moves (48 sub-frames): the face landing, the horizon and the sea, the eyes and the sun's launches. */
const RISO_MOVES: readonly (readonly [number, number])[] = [
  [riso(4), riso(4) + 8],
  [STRETCH.from - 1, STRETCH.from + 10],
  [MERGED - 8, MERGED + 8],
  [SUNRISE.from - 1, SUNRISE.from + 8],
  [SUNRISE.to - 1, SUNRISE.to + 8],
];

/**
 * Sub-frames: 64 for the pull into the sun and through the last mouth (on into S11's settle onto the halftone: 56 px a frame on HOLE + 1, still over 20 to HOLE + 4, 12 on HOLE + 6), 48 for S09's tearing sheets (a 72° shutter, so each tear snaps instead of smearing the frame), S10's flight and S12's hits, 16 otherwise.
 * With the threads, 32 through the print's press hits (riso 4.1 … 4.1a) and through the roll's rings and chop (riso 4.3 … 4.4); off, v04's.
 */
export function risoTemporal(frame: number, th: RisoThreads = BUILD_THREADS): Temporal {
  if (within(frame, RISO_MOVES)) return { samples: 48, shutter: 0.5, persistence: 0 };
  if (frame >= SUCK.from - 1) return { samples: 64, shutter: 0.5, persistence: 0 };
  if (frame >= HOLE - 2 && frame <= HOLE + 6) return { samples: 64, shutter: 0.5, persistence: 0 };
  if (frame >= riso(1) && frame < riso(2)) return { samples: 48, shutter: 0.2, persistence: 0 };
  if (frame >= riso(2) && frame <= riso(3)) return { samples: 48, shutter: 0.5, persistence: 0 };
  if (th.printSteps && frame >= PRINT_STEPS[0] && frame <= PRINT_STEPS[PRINT_STEPS.length - 1] + 4) return { samples: 32, shutter: 0.5, persistence: 0 };
  if (th.sunRings && frame >= SUNRISE.from && frame < SUCK.from) return { samples: 32, shutter: 0.5, persistence: 0 };
  return DEFAULT_TEMPORAL;
}

/** S09 flows into S10 (the dive into its last sheet's mouth) and S10 into S11 (through the last mouth); S11 → S12 is a hard cut. */
export function risoSegment(frame: number): Segment {
  if (frame < riso(4)) return { from: partStart('riso'), to: riso(4) };
  return { from: riso(4), to: BUILD_END };
}

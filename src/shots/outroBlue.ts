// E1 BLUE, outro 1.1 → 2.2 (OutroBlue; build sheet notes/b58/ending-sheet.md §3.1, §3.2 rows 2.1 → 2.1a, §4 IN, §5, §7 E1). Pure.
// The seam decodes in place: the blue screen bursts out of his blue spot (WP6, v07: BURST; drop 2 turned his clearing blue and drew it in
// onto him), its front running out along the spot's level lines with the band's light on its rim, drop 2's drained @ field (H5)
// flickering through DECODE glyphs just ahead of it where it lies, the static copy decoding in behind it; his crash face, untouched
// on the downbeat, flickers amber as the burst leaves him and decodes, where it stands and in his colour, into his own UTF-8 bytes, which
// unfold out of his box (outro 1.1 + 3) and decode back one group a 32nd into (•ω•), the brackets flying in from the line's ends; the
// blue screen stamps his eyes × (1.2); he slides into the screen's emoticon slot (1.2&); the crash log stages a line a beat under him,
// each older one rolling up into the stack; the body copy, the progress line (a step a 16th), the 2D code (three module rows a 16th),
// its footnotes and the 14-line small print; his eye flicks alive for a 16th on 1.4; the antivirus's reticle slides in (1.4&) and locks
// on 2.1 with a red ✓ where his next heartbeat should be, and the dub never comes: `[FATAL] heartbeat lost`; it types `exit`; on Enter
// (2.1a) the picture squeezes to a white-hot line (outroAperture.ts squeezeAt) and its last word is lifted out to the centre.
// Layout px: 1920 × 1080, origin top-left, y down; glyphs and shapes in the flat world (centre, y up). Strings: src/content/outro.ts.
import { kaomoji } from '../actors/cast.ts';
import { DECODE } from '../content/boot.ts';
import {
  BODY_COPY,
  EXIT_LINE,
  FOOTNOTES,
  HERO_OUT,
  PROGRESS_STEPS,
  SIGNATURE,
  SIG_GLYPHS,
  SIG_GROUP,
  SMALL_PRINT_LINES,
  STAGED,
  type InkRun,
  type StagedLine,
  progressText,
} from '../content/outro.ts';
import type { Pose } from '../engine/camera.ts';
import { type RGB, mixRGB, scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Segment, type Temporal, struck } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { Look } from '../engine/types.ts';
import { aimPose } from '../motion/hit.ts';
import { seedFrame } from '../score/film.ts';
import { BLUE_PUSH, BODY, CODE_ROWS, DUB, DUB_MISSING, ENTER, FLICK, FLIPS, GATHER, HEX, HEX_SETTLED, KEYS, LAST_BEAT, LINE, LINES, LUB, OUTRO_SEGMENT, OUTRO_START, PROGRESS, RETICLE, SLOT, SMALL_PRINT, STAMP } from '../score/outro.ts';
import { FRAMES_PER_BAR } from '../score/tempo.ts';
import { FOV, FRONT_DISTANCE } from './intro.ts';
import { BROW_DROP, INKS, X, Y, bump, faceOffsets, glow, inkRuns, middleY, monoLine, monoWidth, outCubicAt, pop } from './outroKit.ts';
import { BLUE_FACE, LAST_WORD_AT, SEAM_FACE, SEAM_SPOT, impact, seamSpotDistance } from './outroShared.ts';
import { SIG_CODE } from './outroSigCode.ts';
import { TERM, TERMINAL_CURVATURE, cellCenter, terminalLook } from '../worlds/terminal.ts';
import { RAMP } from '../actors/asciiFace.ts';
import { linear } from '../engine/color.ts';

/** What only the browser can measure: the atlases' advances (ems). Tests pass fakes. */
export type BlueLayout = { mono: Advance; bold: Advance; rounded: Advance; display: Advance };
/** Discrete changes are taken at the output frame. */
const frameOf = (f: number): number => Math.floor(f + 0.5);
const DECODE_LIST = [...DECODE];
const flicker = (a: number, b: number, F: number): string => DECODE_LIST[Math.floor(hash(a, b, seedFrame(F), 55) * DECODE_LIST.length)];

// ——— The seam (sheet §4 IN; WP6, v07): drop 2's H5, decoded in place as the blue screen bursts out of his spot ————————————————————

/**
 * WP6 (the review, 10-03: the transition from drop 2 into the ending was weak). v06's refresh band swept the blue down the tube in three frames over a full-screen
 * glyph chatter, unrelated to anything drop 2 was doing. Now the blue screen bursts out of his spot (outroShared.ts SEAM_SPOT, which drop 2
 * turned blue and closed on him through the drain and the digital zero): on 1.1 its front leaves the spot's half-lit edge (`start`) and
 * launches outward along the spot's level lines — cubic-out, three quarters of the way by 1.1 + 3 (HEX, his bytes), past the farthest
 * corner (913 px out) by 1.1 + `frames` — the bullet time's rings of light, which left him every 6 frames, carried on as one last ring.
 * Its rim is the band's light (#9DB6FF at 50 %, additive, a 44 px soft ring: the scene's composite); a `zone` of the field ahead of it
 * decodes in place (a new DECODE glyph a frame, same ink, same cell), the rest is still drop 2's @; behind it, the blue and the static
 * copy decoding in. His face, at the centre of it all, is untouched on the downbeat.
 */
export const BURST = { from: OUTRO_START, frames: 8, start: -SEAM_SPOT.soft / 2, reach: 960, zone: 240, ring: { alpha: 0.5, width: 22, lead: 6 } } as const;
/** The burst's front (px outside SEAM_SPOT's stadium) at instant `f`: −∞ before the ending, BURST.reach from 1.1 + BURST.frames on. */
export function burstFront(f: number): number {
  if (f < BURST.from) return -Infinity;
  const u = clamp((f - BURST.from) / BURST.frames);
  return BURST.start + (BURST.reach - BURST.start) * (1 - (1 - u) ** 3);
}
/** The first output frame on which the front has reached distance `d` (1.1 for anything inside the spot). */
export function burstPass(d: number): number {
  const v = clamp((d - BURST.start) / (BURST.reach - BURST.start));
  const u = 1 - Math.cbrt(1 - v);
  return BURST.from + Math.max(0, Math.ceil(u * BURST.frames - 1e-9));
}
/** The ring of light on the front at instant `f` (its alpha; 0 once the front is off the screen). */
export const burstRing = (f: number): number => (f >= BURST.from && f < BURST.from + BURST.frames ? BURST.ring.alpha : 0);
/** Layout px → how far outside the spot (the front's measure). */
const spotD = (x: number, y: number): number => seamSpotDistance(x, y);
/** The drained field (H5, src/shots/drop2Crash.ts): one @ per T7 cell, #D8F5E1 at 42 %. */
export const DRAINED: RGB = linear('#D8F5E1', 0.42);
/** T7's cells (src/shots/drop2Shared.ts T7_GRID: cols −7 … 139, rows −2 … 33): the frozen field covers the whole tube. */
export const FIELD = { cols: [-7, 139], rows: [-2, 33] } as const;
/**
 * The field's glyphs at instant `f` (the seam frames only): drop 2's @ in every cell the front has not reached; within BURST.zone ahead of
 * it a new DECODE glyph a frame, same ink, same place; behind it, nothing (the blue).
 */
export function seamField(f: number, out: Glyph[] = []): Glyph[] {
  const F = frameOf(f);
  const front = burstFront(f);
  if (front >= BURST.reach) return out;
  for (let row = FIELD.rows[0]; row <= FIELD.rows[1]; row++) {
    for (let col = FIELD.cols[0]; col <= FIELD.cols[1]; col++) {
      const [x, y] = cellCenter(col, row);
      const d = spotD(x + 960, 540 - y);
      if (d < front) continue;
      const decoding = F >= OUTRO_START && d < front + BURST.zone;
      out.push({ ch: decoding ? flicker(col, row, F) : RAMP[9], x, y, size: TERM.fontPx, color: DRAINED });
    }
  }
  return out;
}

// ——— His face (rounded, glyph by glyph) ——————————————————————————————————————————————————————————————————————————————————————

/** drop 2's crisp amber (×ω×) (H5, src/shots/drop2Crash.ts CRISP_INK: INK.amber × 0.7). */
export const SEAM_INK: RGB = scaleRGB(linear('#FFB23E', 1.7), 0.7);
/** The seam face's em (T7_CONDENSED: 163, 440 px wide). */
export const SEAM_EM = 163;
/**
 * His (×ω×) exactly as drop 2 hands it over (src/shots/drop2Crash.ts crispFace = the old outroLog logHero on outro 1.1): M PLUS Rounded
 * em 163, the five parts typeset with 0.02 em tracking and centred on (960, 450), in drop 2's amber.
 */
export function seamHero(L: BlueLayout): Glyph[] {
  const parts = kaomoji(SEAM_FACE.face, 'bemeb').map((p) => p.ch);
  const offs = faceOffsets(parts, L.rounded);
  return parts.map((ch, i) => ({ ch, x: X(SEAM_FACE.centre[0]) + offs[i] * SEAM_EM, y: Y(SEAM_FACE.centre[1]), size: SEAM_EM, color: SEAM_INK, rot: 0 }));
}

// ——— The bytes ⇄ the face (sheet §3.1 rows 1.1 + 3 … 1.1a + 3) ——————————————————————————————————————————————————————————————————

/** His bytes: JetBrains Mono 76 px, centred on x 960, baseline 478 (ink centre y 450), hero amber with a 2 px navy shadow. */
export const BYTES = { size: 76, baseline: 478, x: 960, compressed: 0.33 } as const;
const SIG_CHARS = [...SIGNATURE];
/** Character k of the signature line → its byte (0–9), or −1 for a space. */
const byteOf = (k: number): number => (SIG_CHARS[k] === ' ' ? -1 : Math.floor(k / 3));
/** The layout x of signature character k on the settled line. */
export function byteX(k: number, L: BlueLayout): number {
  const cell = L.mono('0') * BYTES.size;
  return BYTES.x - (SIG_CHARS.length * cell) / 2 + (k + 0.5) * cell;
}
/** The centre (layout x) of byte group g (0 the left •, 1 the ω, 2 the right •) on the settled line. */
export function groupX(g: number, L: BlueLayout): number {
  const ks = SIG_CHARS.map((_, k) => k).filter((k) => byteOf(k) >= 0 && SIG_GROUP[byteOf(k)] === g);
  return (byteX(ks[0], L) + byteX(ks.at(-1)!, L)) / 2;
}
/** The line's ends (where the brackets appear on the second flip). */
export const lineEnds = (L: BlueLayout): [number, number] => {
  const cell = L.mono('0') * BYTES.size;
  return [BYTES.x - (SIG_CHARS.length * cell) / 2, BYTES.x + (SIG_CHARS.length * cell) / 2];
};
/** How far the bytes have unfolded (0 = compressed ×0.33 about x 960 on HEX, 1 settled on HEX_SETTLED): cubic-out, ¾ by 1.1e, no overshoot. */
export const unfold = (f: number): number => outCubicAt(f, HEX, HEX_SETTLED - HEX);
/** His face on the blue screen: em 230, typeset like every face of his (0.02 em tracking). */
export const FACE_EM = BLUE_FACE.em;
/** The face's centre (layout px) at instant f: (960, 450) until the slide on 1.2&, then into the slot (526, 320) (L: ¾ by + 3, settled by 1.3). */
export function facePlace(f: number): [number, number] {
  const u = f < SLOT.from ? 0 : ease.outQuint(clamp((f - SLOT.from) / (SLOT.to - SLOT.from)));
  return [lerp(BLUE_FACE.centre[0], BLUE_FACE.slot[0], u), lerp(BLUE_FACE.centre[1], BLUE_FACE.slot[1], u)];
}
/** Where the gathered face's glyphs sit (layout x of each of `(•ω•)`'s five, about x 960). */
export const faceSlots = (L: BlueLayout): number[] => faceOffsets(['(', '•', 'ω', '•', ')'], L.rounded).map((o) => BLUE_FACE.centre[0] + o * FACE_EM);
/** The face he wears at instant f (the stamp on 1.2, the flick for a 16th on 1.4; whole on each frame's first sub-frame). */
export function faceText(f: number): string {
  if (!struck(STAMP, f)) return HERO_OUT.alive;
  if (struck(FLICK.from, f) && !struck(FLICK.to, f)) return HERO_OUT.flick;
  return HERO_OUT.crashed;
}

const SHADOW = { dx: 2, dy: 2 } as const;
/** A glyph and its 2 px navy shadow (the shadow first). */
const withShadow = (g: Glyph): Glyph[] => [{ ...g, x: g.x + SHADOW.dx, y: g.y - SHADOW.dy, color: INKS.navy, alpha: (g.alpha ?? 1) * 0.9 }, g];
/** The heartbeat on his face once he sits in the slot: a light pulse on lub (1.3) and dub (1.3e); none on 2.1e — that one never comes. */
const heartLight = (f: number): number => Math.max(glow(f, LUB[1], 0.45, 4), glow(f, DUB[1], 0.3, 4));

/**
 * The hero at instant f (rounded glyphs, the mono bytes, and their shadows, flat world): his seam face (1.1, untouched), its amber
 * flicker as the band crosses it (+1, +2), the bytes (+3 → the flips), the flipped glyphs and the brackets gathering (→ 1.1a + 3), the
 * face (stamped on 1.2, sliding on 1.2&, in the slot), each glyph with its 2 px navy shadow from the bytes on.
 */
export function heroGlyphs(f: number, L: BlueLayout): { rounded: Glyph[]; mono: Glyph[] } {
  const F = frameOf(f);
  const rounded: Glyph[] = [];
  const mono: Glyph[] = [];
  if (f < HEX - 0.25) {
    // The seam face: untouched on 1.1; its glyphs flicker through amber DECODE glyphs for the two frames the band crosses it.
    const seam = seamHero(L);
    if (F < OUTRO_START + 1) return { rounded: seam, mono };
    for (const [i, g] of seam.entries()) mono.push({ ...g, ch: flicker(i, 99, F), color: scaleRGB(INKS.hero, 0.8) });
    return { rounded, mono };
  }
  const cellSize = BYTES.size;
  const u = unfold(f);
  const yB = Y(middleY(BYTES.baseline, cellSize));
  const slots = faceSlots(L);
  const ends = lineEnds(L);
  // The gather: brackets in from the line's ends, the left • and the right group to their slots (I into GATHER.to).
  const g = f < GATHER.from ? 0 : impact(f, GATHER.to, GATHER.to - GATHER.from);
  const gx = [lerp(groupX(0, L), slots[1], g), groupX(1, L), lerp(groupX(2, L), slots[3], g)];
  if (f < GATHER.to - 0.25) {
    // The bytes still in hex: each group collapses into its centre over the 32nd before its flip (I), then is a glyph.
    SIG_CHARS.forEach((ch, k) => {
      if (ch === ' ') return;
      const b = byteOf(k);
      const grp = SIG_GROUP[b];
      // A space byte (20) collapses with the group after it.
      const flipOf = grp >= 0 ? grp : b < 5 ? 1 : 2;
      if (struck(FLIPS[flipOf], f)) return;
      const settled = BYTES.x + (byteX(k, L) - BYTES.x) * (BYTES.compressed + (1 - BYTES.compressed) * u);
      const home = grp === 2 ? settled + (gx[2] - groupX(2, L)) : settled;
      const c = grp >= 0 ? gx[grp] : flipOf === 1 ? gx[1] : gx[2];
      const k3 = impact(f, FLIPS[flipOf], 3);
      const x = lerp(home, c, k3);
      mono.push(...withShadow({ ch, x: X(x), y: yB, size: cellSize * (1 - 0.35 * k3), color: INKS.hero, alpha: 1 - 0.3 * k3 }));
    });
    // Flipped groups: the glyph, popping 1.25 → 1 over 4 f.
    for (let grp = 0; grp < 3; grp++) {
      if (!struck(FLIPS[grp], f)) continue;
      const k = pop(f, FLIPS[grp], 1.25, 4);
      rounded.push(...withShadow({ ch: SIG_GLYPHS[grp], x: X(gx[grp]), y: Y(BLUE_FACE.centre[1]), size: FACE_EM * k, color: INKS.hero }));
    }
    // The brackets: on the second flip at the line's ends, flying in.
    if (struck(FLIPS[1], f)) {
      const bx = [lerp(ends[0], slots[0], g), lerp(ends[1], slots[4], g)];
      const k = pop(f, FLIPS[1], 0.6, 3);
      for (const [i, ch] of ['(', ')'].entries()) rounded.push(...withShadow({ ch, x: X(bx[i]), y: Y(BLUE_FACE.centre[1]), size: FACE_EM * k, color: INKS.hero }));
    }
    return { rounded, mono };
  }
  // The face: closed on GATHER.to with a squash (1 → 1.06 → 1 over 3 f); stamped × on 1.2 (1 → 0.9 → 1 over 2 f); in the slot from 1.2&.
  const text = faceText(f);
  const parts = kaomoji(text, 'bemeb').map((p) => p.ch);
  const [cx, cy] = facePlace(f);
  const squash = bump(f, GATHER.to, 1.06, 3) * bump(f, STAMP, 0.9, 2);
  const shudder = f >= LINES[1] ? ((2 * Math.PI) / 180) * Math.sin(((f - LINES[1]) * 2 * Math.PI) / 3) * Math.max(0, 1 - (f - LINES[1]) / 6) : 0;
  const light = heartLight(f) * glow(f, STAMP, 0.5, 4);
  const offs = faceOffsets(parts, L.rounded);
  const cos = Math.cos(shudder);
  const sin = Math.sin(shudder);
  parts.forEach((ch, i) => {
    const dx = offs[i] * FACE_EM * squash;
    rounded.push(...withShadow({ ch, x: X(cx) + dx * cos, y: Y(cy) + dx * sin, size: FACE_EM * squash, color: scaleRGB(INKS.hero, light), rot: shudder }));
  });
  return { rounded, mono };
}

// ——— The staged lines and the stack (sheet §3.1, §3.2 row 2.1) ——————————————————————————————————————————————————————————————————

/** The current staged line: JetBrains Mono (bold) 56 px, baseline 660, from x 200; the stack line above it 36 px at 45 %, baseline 576. */
export const STAGE = { x: 200, baseline: 660, size: 56, stack: { baseline: 576, size: 36, alpha: 0.45 }, bar: { x0: 184, x1: 1291, y0: 612, y1: 674 } } as const;
const runInk = (r: InkRun, lineIndex: number): RGB => (r.ink === 'amber' ? INKS.hero : r.ink === 'red' ? INKS.redOnBlue : r.ink === 'redChip' ? (lineIndex === 3 ? INKS.text : INKS.redOnBlue) : r.ink === 'green' ? INKS.green : INKS.text);
/** A staged line's place in the log at instant f: 0 current, 1 the stack, 2 rolling out; with its roll (L, 6 f) between. */
function stagedState(i: number, f: number): { level: number; u: number } | null {
  if (!struck(LINES[i], f)) return null;
  const next = LINES.findIndex((at, j) => j > i && struck(at, f));
  if (next < 0) return { level: 0, u: 0 };
  const rolled = LINES.filter((at, j) => j > i && struck(at, f)).length;
  const last = LINES[i + rolled];
  const u = ease.outQuint(clamp((f - (last - 0.25)) / 6));
  return { level: rolled - 1 + u, u };
}
/** A staged line drawn at its level (0 current … 1 the stack … 2 gone), with its bar, chips, pop. */
function stagedDraw(line: StagedLine, i: number, level: number, f: number, L: BlueLayout, under: Shape[], glyphs: Glyph[]): void {
  if (level >= 2) return;
  const toStack = clamp(level);
  const out = clamp(level - 1);
  const size = lerp(STAGE.size, STAGE.stack.size, toStack) * (level <= 0 ? pop(f, LINES[i], 1.1, 4) : 1);
  const baseline = lerp(STAGE.baseline, STAGE.stack.baseline, toStack) - 34 * out;
  const alpha = lerp(1, STAGE.stack.alpha, toStack) * (1 - out);
  const light = level <= 0 ? glow(f, LINES[i], 0.8, 2) : 1;
  const cell = L.bold('0') * size;
  const yMid = middleY(baseline, size);
  if (alpha <= 0.001) return;
  const chars = [...line.text];
  // Chips under the runs that ask for one (line 2's face on navy; line 4's [DEFENDER] on red).
  for (const r of line.inks) {
    if (r.ink !== 'redChip') continue;
    const x0 = STAGE.x + monoWidth(chars.slice(0, r.from).join(''), size, L.bold) - 6;
    const x1 = STAGE.x + monoWidth(chars.slice(0, r.to).join(''), size, L.bold) + 6;
    under.push({ kind: 'rect', x: X((x0 + x1) / 2), y: Y(yMid), w: x1 - x0, h: size * 1.08, r: 4, color: i === 3 ? INKS.redOnBlue : INKS.navy, alpha });
  }
  if (line.style === 'inverse') {
    // The inverse bar: #F2F6FF with the blue type; in the stack, a 2 px outline.
    const w = (STAGE.bar.x1 - STAGE.bar.x0) * (size / STAGE.size);
    const h = (STAGE.bar.y1 - STAGE.bar.y0) * (size / STAGE.size);
    const x0 = STAGE.x - 16 * (size / STAGE.size);
    const [bx, by] = [X(x0 + w / 2), Y(yMid + 0.02 * size)];
    under.push({ kind: 'rect', x: bx, y: by, w, h, color: scaleRGB(INKS.paper, lerp(light, 1, 0.5)), alpha: alpha * (1 - toStack) });
    if (toStack > 0) {
      // In the stack the bar is a 2 px outline: four thin rules.
      const a = alpha * toStack;
      under.push({ kind: 'rect', x: bx, y: by + h / 2 - 1, w, h: 2, color: INKS.paper, alpha: a }, { kind: 'rect', x: bx, y: by - h / 2 + 1, w, h: 2, color: INKS.paper, alpha: a });
      under.push({ kind: 'rect', x: bx - w / 2 + 1, y: by, w: 2, h, color: INKS.paper, alpha: a }, { kind: 'rect', x: bx + w / 2 - 1, y: by, w: 2, h, color: INKS.paper, alpha: a });
    }
  }
  const ink = inkRuns(line.inks.map((r) => ({ ...r, ink: runInk(r, i) })), INKS.text);
  // The guest's ￣ drop to his eye line inside the chip (ending fixer a, review F7: at the em's top they read as ( ▽ )).
  glyphs.push(
    ...monoLine(line.text, {
      x: STAGE.x,
      baseline,
      size,
      advance: L.bold,
      alpha,
      ink: (j, ch) => (line.style === 'inverse' ? mixRGB(INKS.blue, INKS.text, toStack) : scaleRGB(ink(j, ch), light)),
    }).map((g) => (g.ch === '￣' ? { ...g, y: g.y - BROW_DROP * g.size } : g)),
  );
  void cell;
}
/** Every staged line at instant f. */
export function stagedLines(f: number, L: BlueLayout, lifted: boolean): { under: Shape[]; glyphs: Glyph[] } {
  const under: Shape[] = [];
  const glyphs: Glyph[] = [];
  STAGED.forEach((line, i) => {
    const s = stagedState(i, f);
    if (!s) return;
    if (lifted && i === 3) return;
    stagedDraw(line, i, s.level, f, L, under, glyphs);
  });
  return { under, glyphs };
}

// ——— The static copy, the code, the small print, `exit` ———————————————————————————————————————————————————————————————————————

/** The progress line (JetBrains Mono 30 px, baseline 784, x 200); the footnotes (22 px, dim, x 470, baselines 850 / 882 / 914). */
export const PROGRESS_LINE = { x: 200, baseline: 784, size: 30 } as const;
export const FOOTNOTE = { x: 470, baselines: [850, 882, 914], size: 22 } as const;
/** The 2D code's tile: 8 px modules, a 4-module quiet zone, 29 modules = 232 px, at x 200–432, y 806–1038. */
export const CODE = { x0: 200, y0: 806, module: 8, quiet: 4 } as const;
export const CODE_TILE = (QR: number): number => (QR + 2 * CODE.quiet) * CODE.module;
/** The small print: 16 px, #A9BCF5 at 55 %, x 1180, baselines 136 + 21·k; line k (0–12) a frame from SMALL_PRINT, line 14 alone on DUB_MISSING. */
export const SMALL = { x: 1180, baseline: 136, pitch: 21, size: 16 } as const;
export const smallPrintAt = (k: number): number => (k < SMALL_PRINT_LINES.length - 1 ? SMALL_PRINT + k : DUB_MISSING);
/** `exit`: 36 px, baseline 726, x 200: the prompt dim, the keys DEFENDER red, a key a 32nd. */
export const EXIT = { x: 200, baseline: 726, size: 36 } as const;

/** How many progress steps have been taken at instant f (0 at the seam … 14 = 100 % on 1.4a). */
export const progressStep = (f: number): number => PROGRESS.filter((at) => struck(at, f)).length;
/** The code's three finder patterns (top-left, top-right, bottom-left: 7 × 7 modules each), their top-left module. */
export const finderCorners = (n: number): [number, number][] => [
  [0, 0],
  [0, n - 7],
  [n - 7, 0],
];
export const inFinder = (n: number, r: number, c: number): boolean => finderCorners(n).some(([r0, c0]) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7);
/** How much of the code's paper tile shows (0 → 1 over the 32nd into 1.2e, with the first rows). */
export const codeTileIn = (f: number): number => clamp((f - (CODE_ROWS[0] - 3)) / 3);
/** How many module rows of the code are filled at instant f (3 a 16th from 1.2e: all 21 on 1.3a). */
export const codeRows = (f: number): number => Math.min(SIG_CODE.length, 3 * CODE_ROWS.filter((at) => struck(at, f)).length);

/**
 * A static glyph decoding in behind the burst (WP6) at layout (x, y): hidden until the front reaches it, DECODE glyphs for 3 frames from
 * the frame it passes, then final — glyph by glyph, so a line decodes outward with the blue, never ahead of it on drop 2's dark.
 */
export const decoding = (f: number, x: number, y: number): 'hidden' | 'decode' | 'final' => {
  const d = spotD(x, y);
  return burstFront(f) < d ? 'hidden' : frameOf(f) < burstPass(d) + 3 ? 'decode' : 'final';
};
/** A static line's glyphs as the burst reveals them (the line's own seed `seedY` for its DECODE glyphs). */
const revealed = (gs: Glyph[], f: number, seedY: number): Glyph[] =>
  gs.flatMap((g, j) => {
    const s = decoding(f, g.x + 960, 540 - g.y);
    return s === 'hidden' ? [] : s === 'decode' ? [{ ...g, ch: flicker(j, seedY, frameOf(f)) }] : [g];
  });

export function staticCopy(f: number, L: BlueLayout): { under: Shape[]; glyphs: Glyph[]; small: Glyph[]; display: Glyph[] } {
  const F = frameOf(f);
  const under: Shape[] = [];
  const glyphs: Glyph[] = [];
  const small: Glyph[] = [];
  const display: Glyph[] = [];
  // The progress line, from the seam (0 %), a step a 16th.
  {
    const step = progressStep(f);
    const last = PROGRESS[step - 1] ?? -1e9;
    const text = progressText(step);
    const barFrom = text.indexOf('[') + 1;
    const line = monoLine(text, {
      x: PROGRESS_LINE.x,
      baseline: PROGRESS_LINE.baseline,
      size: PROGRESS_LINE.size,
      advance: L.mono,
      ink: (j) => (j >= barFrom && j < barFrom + 10 ? scaleRGB(INKS.text, glow(f, last, 0.6, 4)) : j > barFrom + 10 ? scaleRGB(INKS.text, glow(f, last, 0.4, 4)) : INKS.text),
    });
    glyphs.push(...revealed(line, f, PROGRESS_LINE.baseline));
  }
  // The footnotes.
  FOOTNOTES.forEach((t, i) => {
    const b = FOOTNOTE.baselines[i];
    glyphs.push(...revealed(monoLine(t, { x: FOOTNOTE.x, baseline: b, size: FOOTNOTE.size, advance: L.mono, ink: () => INKS.dim }), f, b));
  });
  // The code tile (ending fixer a, round 1, review F8: as built its blank paper faded in on 1.1 + 2 and sat empty for 36 frames, the
  // brightest thing on the blue screen, pulling the eye off the bytes → face reveal at the centre). Now its three finder patterns snap in
  // on the stamp (1.2), each on its own patch of paper; the whole tile fades in over the 32nd into 1.2e with the first three module rows,
  // and the rest fill three rows a 16th as before.
  const n = SIG_CODE.length;
  const finders = struck(STAMP, f);
  const tileIn = codeTileIn(f);
  if (finders || tileIn > 0) {
    const tile = CODE_TILE(n);
    const cell = (r: number, c: number): [number, number] => [CODE.x0 + (CODE.quiet + c + 0.5) * CODE.module, CODE.y0 + (CODE.quiet + r + 0.5) * CODE.module];
    if (tileIn > 0) under.push({ kind: 'rect', x: X(CODE.x0 + tile / 2), y: Y(CODE.y0 + tile / 2), w: tile, h: tile, color: INKS.paper, alpha: tileIn });
    if (finders && tileIn < 1)
      for (const [r0, c0] of finderCorners(n)) {
        const [x, y] = cell(r0 + 3, c0 + 3);
        under.push({ kind: 'rect', x: X(x), y: Y(y), w: 9 * CODE.module, h: 9 * CODE.module, color: INKS.paper });
      }
    const rows = codeRows(f);
    const lastRows = CODE_ROWS.filter((at) => struck(at, f)).at(-1) ?? -1e9;
    for (let r = 0; r < n; r++) {
      const inRows = r < rows;
      const fresh = inRows ? (r >= rows - 3 ? glow(f, lastRows, 1, 2) : 1) : glow(f, STAMP, 1, 2);
      for (let c = 0; c < n; c++) {
        if (!SIG_CODE[r][c] || !(inRows || (finders && inFinder(n, r, c)))) continue;
        const [x, y] = cell(r, c);
        under.push({ kind: 'rect', x: X(x), y: Y(y), w: CODE.module, h: CODE.module, color: fresh > 1.01 ? mixRGB(INKS.navy, INKS.blue, (fresh - 1) * 0.8) : INKS.navy });
      }
    }
  }
  // The body copy (Inter Tight 300, 44 px, baseline 506, x 200): 6 characters a frame from 1.2&.
  if (struck(BODY, f)) {
    const count = Math.floor((f - BODY + 0.25) * 6) + 6;
    let x = 200;
    const size = 44;
    const y = Y(middleY(506, size));
    [...BODY_COPY].forEach((ch, j) => {
      const w = L.display(ch) * size;
      if (ch !== ' ' && j < count) display.push({ ch, x: X(x + w / 2), y, size, color: INKS.text });
      x += w;
    });
  }
  // The small print: lines 1–13 a frame from 1.2&, line 14 alone on the missing dub (flaring ×1.6 for 4 f).
  SMALL_PRINT_LINES.forEach((line, k) => {
    const at = smallPrintAt(k);
    if (!struck(at, f)) return;
    const base = k === SMALL_PRINT_LINES.length - 1 ? INKS.dim : INKS.small;
    const flare = k === SMALL_PRINT_LINES.length - 1 ? (frameOf(f) < at + 4 ? 1.6 : 1) * 1.15 : glow(f, at, 1.2, 2);
    const ink = inkRuns(line.inks.map((r) => ({ ...r, ink: scaleRGB(r.ink === 'amber' ? INKS.amber : r.ink === 'red' ? INKS.redOnBlue : r.ink === 'green' ? INKS.green : base, 0.75) })), base);
    small.push(...monoLine(line.text, { x: SMALL.x, baseline: SMALL.baseline + SMALL.pitch * k, size: SMALL.size, advance: L.mono, ink: (j, ch) => scaleRGB(ink(j, ch), flare) }));
  });
  // `exit`, a key a 32nd from the missing dub; the prompt with the first key.
  if (struck(KEYS[0], f)) {
    const typed = KEYS.filter((at) => struck(at, f)).length;
    const text = EXIT_LINE.slice(0, 2 + typed);
    glyphs.push(
      ...monoLine(text, {
        x: EXIT.x,
        baseline: EXIT.baseline,
        size: EXIT.size,
        advance: L.mono,
        ink: (j) => (j < 2 ? INKS.dim : scaleRGB(INKS.redOnBlue, glow(f, KEYS[j - 2], 0.8, 3))),
        scale: (j) => (j < 2 ? 1 : pop(f, KEYS[j - 2], 1.35, 3)),
      }),
    );
  }
  void F;
  return { under, glyphs, small, display };
}

// ——— The antivirus's marks: the reticle and the ✓ ——————————————————————————————————————————————————————————————————————————————

/** The reticle's box round the slot (x 190–862, y 186–454), its brackets' arms (40 px, 3 px red, 2 px navy outline), the crosshair (r 60 on his ω at (526, 330)). */
export const RETICLE_BOX = { x0: 190, x1: 862, y0: 186, y1: 454, arm: 40, width: 3, ring: 60, aim: [526, 330] as const, from: [900, 560] as const } as const;
/** The ✓: a red brush stroke 220 px across his face at (526, 320). */
export const CHECK = { at: [526, 320] as const, size: 220, width: 30 } as const;

export function antivirusMarks(f: number): { under: Shape[]; over: Shape[] } {
  const over: Shape[] = [];
  const under: Shape[] = [];
  if (f < RETICLE.from - 0.25) return { under, over };
  // I into 2.1: closing 1.5× → 1×, turning 30° → 0; then 4 px of overshoot on the lock, settling over 6 f.
  const u = impact(f, RETICLE.to, RETICLE.to - RETICLE.from);
  const lock = f >= RETICLE.to ? Math.sin(Math.PI * clamp((f - RETICLE.to) / 6)) * Math.exp(-(f - RETICLE.to) / 4) : 0;
  const k = lerp(1.5, 1, u);
  const rot = lerp(Math.PI / 6, 0, u);
  const cx = (RETICLE_BOX.x0 + RETICLE_BOX.x1) / 2;
  const cy = (RETICLE_BOX.y0 + RETICLE_BOX.y1) / 2;
  const hw = ((RETICLE_BOX.x1 - RETICLE_BOX.x0) / 2) * k + 4 * lock;
  const hh = ((RETICLE_BOX.y1 - RETICLE_BOX.y0) / 2) * k + 4 * lock;
  const alpha = clamp((f - RETICLE.from + 0.25) / 3);
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const rotP = (px: number, py: number): [number, number] => [X(cx) + px * cos - py * sin, Y(cy) + px * sin + py * cos];
  const seg = (ax: number, ay: number, bx: number, by: number) => {
    const [x0, y0] = rotP(ax, ay);
    const [x1, y1] = rotP(bx, by);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const s: Shape = { kind: 'segment', x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: len + RETICLE_BOX.width, h: RETICLE_BOX.width + 4, rot: Math.atan2(y1 - y0, x1 - x0), color: INKS.navy, alpha };
    under.push(s);
    over.push({ ...s, h: RETICLE_BOX.width, w: len + RETICLE_BOX.width - 2, color: INKS.redOnBlue });
  };
  const A = RETICLE_BOX.arm;
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) {
    seg(sx * hw, sy * hh, sx * (hw - A), sy * hh);
    seg(sx * hw, sy * hh, sx * hw, sy * (hh - A));
  }
  // The crosshair ring homes on his ω.
  const [ax, ay] = [lerp(RETICLE_BOX.from[0], RETICLE_BOX.aim[0], u), lerp(RETICLE_BOX.from[1], RETICLE_BOX.aim[1], u)];
  const r = RETICLE_BOX.ring * lerp(1.6, 1, u) * (1 - 0.06 * lock);
  under.push({ kind: 'ring', x: X(ax), y: Y(ay), w: 2 * r + 4, h: 2 * r + 4, r: RETICLE_BOX.width + 4, color: INKS.navy, alpha });
  over.push({ kind: 'ring', x: X(ax), y: Y(ay), w: 2 * r + 2, h: 2 * r + 2, r: RETICLE_BOX.width, color: INKS.redOnBlue, alpha });
  for (const a of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) {
    const [dx, dy] = [Math.cos(a + rot), Math.sin(a + rot)];
    over.push({ kind: 'segment', x: X(ax) + dx * (r + 12), y: Y(ay) + dy * (r + 12), w: 22, h: RETICLE_BOX.width, rot: a + rot, color: INKS.redOnBlue, alpha });
  }
  // The ✓ on 2.1: 1.3 → 1 in 3 f, α 0.9; a navy edge under it.
  if (struck(LAST_BEAT, f)) {
    const s = CHECK.size * pop(f, LAST_BEAT, 1.3, 3);
    const [cx2, cy2] = CHECK.at;
    const P = (px: number, py: number): [number, number] => [X(cx2) + px * s, Y(cy2) + py * s];
    const strokes: [[number, number], [number, number], number][] = [
      [P(-0.42, 0.02), P(-0.14, -0.3), 0.85],
      [P(-0.14, -0.3), P(0.46, 0.42), 1],
    ];
    for (const [[x0, y0], [x1, y1], wk] of strokes) {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const base: Shape = { kind: 'segment', x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: len + CHECK.width * wk, h: CHECK.width * wk * (s / CHECK.size), rot: Math.atan2(y1 - y0, x1 - x0), color: INKS.redOnBlue, alpha: 0.9 };
      under.push({ ...base, h: base.h + 4, w: base.w + 4, color: INKS.navy, alpha: 0.8 });
      over.push({ ...base, color: scaleRGB(INKS.redOnBlue, glow(f, LAST_BEAT, 0.8, 3)) });
    }
  }
  return { under, over };
}

// ——— The last word (line 4), lifted out on Enter ——————————————————————————————————————————————————————————————————————————————————

/** The push (sheet §3.1 camera): 1.00 → 1.05 about (760, 520), linear from the seam to Enter, then held. */
export const PUSH = { amount: 0.05, about: [760, 520] as const } as const;
export const pushZoom = (f: number): number => 1 + PUSH.amount * clamp((f - BLUE_PUSH.from) / (BLUE_PUSH.to - BLUE_PUSH.from));
export function bluePose(f: number): Pose {
  const z = pushZoom(f);
  const [px, py] = [X(PUSH.about[0]), Y(PUSH.about[1])];
  return aimPose({ zoom: z, x: px * (1 - 1 / z), y: py * (1 - 1 / z), roll: 0 }, FRONT_DISTANCE, FOV);
}
/** A layout point under the push at instant f, on screen (layout px). */
export const pushed = (f: number, [x, y]: readonly [number, number]): [number, number] => {
  const z = pushZoom(f);
  return [PUSH.about[0] + (x - PUSH.about[0]) * z, PUSH.about[1] + (y - PUSH.about[1]) * z];
};
/**
 * Line 4 on screen from Enter: lifted out of the picture at exactly its pushed pixels, gliding (I into 2.2) to the centre, x 960
 * (centred), baseline 660, 56 px — where OutroMonitor holds it under the line, decaying. Screen space (flat world at zoom 1).
 */
export function lastWordPlace(f: number, L: BlueLayout): { x: number; baseline: number; size: number } {
  const u = impact(f, LINE, LINE - ENTER);
  const z = pushZoom(ENTER);
  const w = monoWidth(STAGED[3].text, LAST_WORD_AT.size, L.bold);
  const [x0, b0] = pushed(ENTER, [LAST_WORD_AT.x + w / 2, LAST_WORD_AT.baseline]);
  return { x: lerp(x0, LAST_WORD_AT.centreX, u), baseline: lerp(b0, LAST_WORD_AT.baseline, u), size: LAST_WORD_AT.size * lerp(z, 1, u) };
}
/** The last word's glyphs and chip at a centre, size and level (OutroBlue over the squeeze; OutroMonitor under the line). */
export function lastWordContent(place: { x: number; baseline: number; size: number }, level: number, L: BlueLayout): { under: Shape[]; glyphs: Glyph[] } {
  const line = STAGED[3];
  const size = place.size;
  const w = monoWidth(line.text, size, L.bold);
  const x0 = place.x - w / 2;
  const chars = [...line.text];
  const under: Shape[] = [];
  for (const r of line.inks) {
    if (r.ink !== 'redChip') continue;
    const a = x0 + monoWidth(chars.slice(0, r.from).join(''), size, L.bold) - 6;
    const b = x0 + monoWidth(chars.slice(0, r.to).join(''), size, L.bold) + 6;
    under.push({ kind: 'rect', x: X((a + b) / 2), y: Y(middleY(place.baseline, size)), w: b - a, h: size * 1.08, r: 4, color: scaleRGB(INKS.redOnBlue, level), alpha: level > 0 ? 1 : 0 });
  }
  const ink = inkRuns(line.inks.map((r) => ({ ...r, ink: runInk(r, 3) })), INKS.text);
  return { under, glyphs: monoLine(line.text, { x: x0, baseline: place.baseline, size, advance: L.bold, ink: (j, ch) => scaleRGB(ink(j, ch), level) }) };
}

// ——— The frame ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * One instant of E1: the burst's front (px outside SEAM_SPOT; the ground is blue inside it) and its ring's alpha (the scene draws both in
 * screen space: the ground under the picture, the ring over it); the picture's paint (normal blend) and light (additive), under `pose`.
 */
export type BlueFrame = { front: number; ring: number; pose: Pose; paint: FlatContent; light: FlatContent };

export function blueFrame(f: number, L: BlueLayout, o: { lifted?: boolean } = {}): BlueFrame {
  const hero = heroGlyphs(f, L);
  // Line 4 leaves the picture on Enter (it is drawn over the squeeze in screen space); the monitor's ghost asks for it lifted early.
  const lifted = o.lifted ?? f >= ENTER - 0.25;
  const staged = stagedLines(f, L, lifted);
  const copy = staticCopy(f, L);
  const marks = antivirusMarks(f);
  const field = seamField(f);
  return {
    front: burstFront(f),
    ring: burstRing(f),
    pose: bluePose(f),
    paint: { under: [...copy.under, ...staged.under, ...marks.under], glyphs: { mono: [...field, ...copy.glyphs, ...copy.small, ...hero.mono], bold: staged.glyphs, rounded: hero.rounded, display: copy.display }, over: marks.over },
    light: { under: [], glyphs: {}, over: [] },
  };
}

// ——— Finishing and sampling ——————————————————————————————————————————————————————————————————————————————————————————————————

/** The CRT: curvature 0.02 (drop 2's) → 0.045 over 1.1 → + 4; the refresh band rolling once a bar; a lift on the stamp, the lines and the ✓ (never white); the scanlines fading as the picture squeezes. */
export function blueLook(frame: number): Look {
  const F = Math.round(frame);
  const bend = clamp((F - OUTRO_START) / 4);
  const band = (((F % FRAMES_PER_BAR) + FRAMES_PER_BAR) % FRAMES_PER_BAR) / FRAMES_PER_BAR;
  const flash = Math.max(glow(F, STAMP, 0.15, 6), glow(F, LINES[1], 0.08, 6), glow(F, LINES[2], 0.08, 6), glow(F, LAST_BEAT, 0.2, 6), glow(F, ENTER, 0.25, 4)) - 1;
  const look = terminalLook(1, flash, band, lerp(0.02, TERMINAL_CURVATURE, bend));
  const u = clamp((F - ENTER) / (LINE - ENTER));
  return { ...look, crt: { ...look.crt!, scanlines: 0.3 * (1 - u) } };
}
/** 32 sub-frames through the seam, the gather, the slide, the reticle and the squeeze; 16 elsewhere; no tail. */
export function blueTemporal(frame: number): Temporal {
  const fast = [
    [OUTRO_START, HEX_SETTLED + 2],
    [FLIPS[0] - 3, GATHER.to + 4],
    [SLOT.from - 1, SLOT.to + 1],
    [RETICLE.from - 1, LAST_BEAT + 6],
    [ENTER - 1, LINE + 1],
  ].some(([a, b]) => frame >= a && frame <= b);
  return { samples: fast ? 32 : 16, shutter: 0.5, persistence: 0 };
}
export const blueSegment = (): Segment => ({ from: OUTRO_SEGMENT.from, to: OUTRO_SEGMENT.to });

/** Every character E1 draws, per atlas (the content's lists already hold them for check-glyphs; the tests prove the atlases do). */
export const BLUE_STRINGS = {
  mono: [SIGNATURE, ...FOOTNOTES, ...SMALL_PRINT_LINES.map((l) => l.text), EXIT_LINE, DECODE, RAMP, ...Array.from({ length: PROGRESS_STEPS + 1 }, (_, s) => progressText(s))],
  bold: STAGED.map((l) => l.text),
  rounded: [...Object.values(HERO_OUT), ...SIG_GLYPHS, '()'],
  display: [BODY_COPY],
} as const;
void DUB;

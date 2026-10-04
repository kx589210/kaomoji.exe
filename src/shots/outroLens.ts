// S34 STILL HERE, outro 2.1–end − 1 (builder O · OUTRO; build sheet notes/d2build/sheet.md §4.2 rows outro 2.1–2.4&, §5.13, §7.1 W5). Pure.
// What the lens shows (the aperture itself — the vesica, its lids, its rim and chase — is src/shots/outroScreen.ts): on the first
// tonic ヽ(•ω•)ﾉ in the CRT's phosphor amber (src/shots/outroPhosphor.ts, iteration 2), his arms riding the top lid as he pries the
// line open from inside and holding it through the wink; on outro 2.2, on exactly the frame the blink scheduler promised in the log, the
// right • morphs through a dot-sized circle into < — ヽ(•ω<)ﾉ✧, the only wink in the film — the ✧ popping beyond his arm; on outro 2.2&
// the arms let go and slide away, the ✧ settles beside his face and twinkles on the off-beats; on outro 2.3 ↑ recalls the film's first
// command under him with a 3-frame decode shimmer while he rises to make room, and the cursor blinks S01's two blinks (R10), fading
// like phosphor to the last frame, so frame 0 relights it. Outside the lens, in the monitor's slot, W5 types in calm: one friend.
// Flat world: origin at the frame centre, y up; 1 unit = 1 px at 1080p. The lens interior is drawn in the aperture's own space.
import { COMMAND, CURSOR, DECODE as DECODE_GLYPHS, PROMPT } from '../content/boot.ts';
import { HERO_OUT, W5 } from '../content/outroV04.ts';
import { type RGB, linear, scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { SWAP_LEAD, type Segment, type Temporal } from '../engine/temporal.ts';
import { layoutLines, lineWidth } from '../engine/textGrid.ts';
import type { Advance } from '../engine/typeset.ts';
import type { Look } from '../engine/types.ts';
import { ARMS_DOWN, CURSOR as CURSOR_BLINKS, MONITOR_BACK, OPEN, OUTRO_END, RECALL, WINK } from '../score/outroV04.ts';
import { seedFrame } from '../score/film.ts';
import { FRAMES_PER_BAR, FRAMES_PER_BEAT } from '../score/tempo.ts';
import { flow, outroSegment, springL } from './drop2Shared.ts';
import { COLS, HUD } from './hud.ts';
import { PHOSPHOR } from './intro.ts';
import { HERO_PHOSPHOR } from './outroPhosphor.ts';
import { BUTTON, lensClock, lidY, screenAt } from './outroScreen.ts';
import { INK, PALETTE, TERMINAL_CURVATURE, terminalLook } from '../worlds/terminal.ts';

const frameOf = (f: number): number => Math.floor(f + 0.5);
const glow = (f: number, at: number, k: number, tau: number): number => (f >= at ? 1 + k * Math.exp(-(f - at) / tau) : 1);

/** His face in the lens: M PLUS Rounded ExtraBold em 174 (470 px), centred (960, 540), rising to 505 on ↑; the arms and the ✧ (layout px). */
export const LENS_HERO = {
  em: 174,
  centre: [960, 540] as const,
  risen: 505,
  /** The arms, a little larger than the face's type so they reach from his brackets to the lid (the sheet's x 640 / 1280 left a gap). */
  arms: [
    ['ヽ', 676],
    ['ﾉ', 1244],
  ] as const,
  armScale: 1.3,
  /** How far below the top lid an arm's centre rides (px): its tip touches the lid. */
  armDrop: 58,
  /** The ✧ beside him: a little lower, further out and smaller than the sheet's (1230, 430) / 128, so its turning tips stay inside
   *  the lens once he has risen (through the lid's ±12 px breath and the twinkles' 1.15 swell) and clear of his ) once the wink has
   *  re-spaced the face. While his arms still hold the lid (iteration 2, ruling 13: through the wink) it pops beyond the ﾉ instead —
   *  ヽ(•ω<)ﾉ✧, at (dxArms, dyArms) — and glides home once the arm has mostly gone (STAR_HOME). */
  star: { dx: 284, dy: -86, dxArms: 410, dyArms: -76, size: 118, rot: (20 * Math.PI) / 180, twinkle: (15 * Math.PI) / 180 },
} as const;
/** The ✧'s glide home, beside his face: from half way through the arms' slide (the ﾉ at half light, sliding down) over 15 frames, so
 *  it never crosses the arm, home before the button's silence (outro 2.3&), no faster than ≈ 13 px a frame on its own (he rises under it). */
export const STAR_HOME = { from: ARMS_DOWN + 6, to: ARMS_DOWN + 21 } as const;
const TRACKING = 0.02;
/** W5's face (the monitor's flat UI type, outside the screen's phosphor). */
const AMBER = linear(PALETTE.amber, 1.5);
const STAR = linear(PALETTE.pink, 1.6);

/** The wink's morph: the right • grows into a dot-sized circle (the field's circlePerEm), which becomes the < — whole by WINK − SWAP_LEAD, so every sub-frame of WINK shows it. */
const WINK_FROM = WINK - 4 - SWAP_LEAD;
const WINK_SWAP = WINK - 2;
const WINK_DONE = WINK - SWAP_LEAD;
function rightEye(f: number): { ch: string; morph: number } {
  if (f <= WINK_FROM) return { ch: '•', morph: 0 };
  if (f < WINK_SWAP) return { ch: '•', morph: ease.inOutSine((f - WINK_FROM) / (WINK_SWAP - WINK_FROM)) };
  if (f < WINK_DONE) return { ch: '<', morph: 1 - ease.inOutSine((f - WINK_SWAP) / (WINK_DONE - WINK_SWAP)) };
  return { ch: '<', morph: 0 };
}

/** He breathes ±1.5 % once a beat, a quarter beat behind the lens's breath (outroScreen.ts: its turns fall on OPEN + 18 + 12k, where
 *  he is at full speed), so the hold is never dead: the lens opens, and he follows through (R1-bar36-quiet). */
const BREATH = { amount: 0.015, from: OPEN + 18 } as const;
const EIGHTH = FRAMES_PER_BEAT / 2;
/** The ✧ twinkles on every 8th after its pop (the score's TWINKLES are among them): a ✧ that sits between twinkles reads as a sticker
 *  on a still (R1-bar36-quiet) — except in the button's silence (outro 2.3&–2.4 − 1), where it holds still with everything else and the rim's
 *  chase is the only motion (round 2, OUT-BUTTON-UNSEEN: the score's outro 2.3& twinkle is dropped). */
export const STAR_TWINKLES: readonly number[] = Array.from({ length: Math.ceil((OUTRO_END - (WINK + EIGHTH)) / EIGHTH) }, (_, i) => WINK + EIGHTH * (i + 1)).filter(
  (at) => at < BUTTON.from || at >= BUTTON.to,
);
/** The pop's frames: keyed one frame before the wink, 0 → 1.25 by WINK + 3, settling to 1 by the first twinkle's key. */
const POP = { peak: 4, settled: 12 } as const;
/** A twinkle's swell over its 8th, keyed one frame early so the beat's frame already shows it: up over 3 f, then back over 9 (it never sits). */
function swell(f: number, at: number): number {
  const u = f - at + 1;
  if (u <= 0 || u >= EIGHTH) return 0;
  return u < 3 ? Math.sin((Math.PI / 2) * (u / 3)) : 1 - flow((u - 3) / (EIGHTH - 3));
}
/** How far the right eye's slot has widened from the •'s advance to the <'s: 0 → 1 over the morph, whole by WINK − SWAP_LEAD. */
const winkSpacing = (f: number): number => ease.inOutSine(clamp((f - WINK_FROM) / (WINK_DONE - WINK_FROM)));

/** The ✧'s scale: the pop, then a 1.15 swell on each 8th. */
function starScale(f: number): number {
  const t = f - (WINK - 1);
  if (t <= 0) return 0;
  const pop = t < POP.peak ? 1.25 * ease.outCubic(t / POP.peak) : lerp(1.25, 1, flow((t - POP.peak) / (POP.settled - POP.peak)));
  return pop * (1 + 0.15 * STAR_TWINKLES.reduce((a, at) => Math.max(a, swell(f, at)), 0));
}
/** The ✧'s turn: it spins in from −45° on the pop and keeps turning slowly (0.6° a frame, on the lens's clock: still through the
 *  button's silence), with 15° more over each twinkle. */
const SPIN = (0.6 * Math.PI) / 180;
const SPIN_IN = (45 * Math.PI) / 180;
function starRot(f: number): number {
  const t = Math.max(0, lensClock(f) - (WINK - 1));
  const st = LENS_HERO.star;
  const turns = STAR_TWINKLES.reduce((a, at) => a + flow((f - at + 1) / EIGHTH), 0);
  return st.rot - SPIN_IN * (1 - ease.outCubic(clamp(t / POP.settled))) + SPIN * t + st.twinkle * turns;
}

/** Him at instant `f`: the face he wears, his glyphs (flat world), his centre (layout px), how much of his arms is left (0–1). */
export function lensHero(f: number, advance: Advance): { face: string; glyphs: Glyph[]; centre: [number, number]; arms: number } {
  // His breath and his rise run on the lens's clock (outroScreen.ts lensClock): he holds still through the button's silence.
  const clock = lensClock(f);
  const cy = LENS_HERO.centre[1] - (LENS_HERO.centre[1] - LENS_HERO.risen) * springL(clock, RECALL);
  const [cx] = LENS_HERO.centre;
  const eye = rightEye(f);
  // The right eye's slot widens from the •'s advance to the <'s with the morph (eased, whole by WINK − SWAP_LEAD), so the face is
  // re-spaced as one continuous glide: the eye keeps its centre, the brackets drift ≈ 6 px out each side over 3.5 frames, and outro 2.2
  // lands typeset as (•ω<). (Swapping the layout with the glyph jumped the brackets 13 px and doubled the face on the swap frame's
  // sub-frames; holding the •'s spacing jammed the < against the ω.)
  const slots = ['(', '•', 'ω', '•', ')'];
  const widths = slots.map((ch) => advance(ch));
  widths[3] = lerp(advance('•'), advance('<'), winkSpacing(f));
  const total = widths.reduce((a, b) => a + b, 0) + TRACKING * (slots.length - 1);
  // A living hold: he breathes with the lens, a quarter beat behind it, so no frame of the lens is ever dead.
  const size = LENS_HERO.em * (1 + BREATH.amount * Math.sin((2 * Math.PI * (clock - BREATH.from)) / FRAMES_PER_BEAT));
  const glyphs: Glyph[] = [];
  let x = -total / 2;
  slots.forEach((slot, i) => {
    const ch = i === 3 ? eye.ch : slot;
    glyphs.push({ ch, x: cx - 960 + (x + widths[i] / 2) * size, y: 540 - cy, size, color: HERO_PHOSPHOR.ink, morph: i === 3 ? eye.morph : 0 });
    x += widths[i] + TRACKING;
  });
  // The arms ride just under the top lid (he holds it open) through the wink, then let go on outro 2.2&: down 80 px and out over 12 f.
  const off = f < ARMS_DOWN ? 0 : flow((f - ARMS_DOWN) / 12);
  const arms = 1 - off;
  if (arms > 0) {
    const s = screenAt(Math.max(f, OPEN));
    for (const [ch, ax] of LENS_HERO.arms) {
      const ay = lidY(s, ax, 'upper') + LENS_HERO.armDrop + 80 * off;
      glyphs.push({ ch, x: ax - 960, y: 540 - ay, size: LENS_HERO.em * LENS_HERO.armScale, color: HERO_PHOSPHOR.ink, alpha: arms });
    }
  }
  const k = starScale(f);
  if (k > 0) {
    const st = LENS_HERO.star;
    const home = flow((f - STAR_HOME.from) / (STAR_HOME.to - STAR_HOME.from));
    const [dx, dy] = [lerp(st.dxArms, st.dx, home), lerp(st.dyArms, st.dy, home)];
    glyphs.push({ ch: '✧', x: cx - 960 + dx, y: 540 - (cy + dy), size: st.size * k, color: STAR, rot: starRot(f) });
  }
  return { face: `(•ω${eye.ch === '<' ? '<' : '•'})`, glyphs, centre: [cx, cy], arms };
}

/** The cursor's brightness: S01's blinks replayed from ↑ (lit through each, taken at the swap lead), then a phosphor fade. */
export function cursorLevel(f: number): number {
  let level = 0;
  for (const [a, b] of CURSOR_BLINKS) if (f >= a - SWAP_LEAD) level = f < b ? 1 : Math.exp(-(f - b) / PHOSPHOR);
  return level;
}

/** The recalled command, JetBrains Mono 36 px #D8F5E1, centred on (960, 690); `advance` is the mono atlas's (ems). */
export const COMMAND_LINE = { size: 36, y: 690, text: `${PROMPT}${COMMAND}${CURSOR}` } as const;
const DECODE_LIST = [...DECODE_GLYPHS];
export function lensCommand(f: number, advance: Advance): Glyph[] {
  const F = frameOf(f);
  if (F < RECALL) return [];
  const cell = advance('0') * COMMAND_LINE.size;
  const x0 = (-lineWidth(COMMAND_LINE.text) * cell) / 2;
  const y = 540 - COMMAND_LINE.y;
  const out: Glyph[] = [];
  for (const c of layoutLines([COMMAND_LINE.text])) {
    if (c.ch === ' ') continue;
    const x = x0 + (c.col + c.width / 2) * cell;
    if (c.ch === CURSOR) {
      const level = cursorLevel(f);
      if (level > 0) out.push({ ch: CURSOR, x, y, size: COMMAND_LINE.size, color: scaleRGB(INK.green, 1.1 * level) });
      continue;
    }
    // History recall: a 3-frame decode shimmer (two frames of flicker, whole on the third).
    const shimmer = F < RECALL + 2;
    const ch = shimmer ? DECODE_LIST[Math.floor(hash(c.col, seedFrame(F), 36) * DECODE_LIST.length)] : c.ch;
    const ink: RGB = c.col < PROMPT.length ? INK.green : INK.text;
    out.push({ ch, x, y, size: COMMAND_LINE.size, color: scaleRGB(ink, shimmer ? 1.6 : glow(lensClock(F), RECALL + 2, 0.8, 5)) });
  }
  return out;
}

// ——— W5: the readout, back calm (sheet §7.1), in the party monitor's slot (shots/hud.ts style B) ————————————————————————————

const TITLE = ' kaomoji.exe :: party monitor ';
const FRAME_INK = linear(PALETTE.text, 0.55);
const VALUE_INK = linear(PALETTE.green, 1.4);
const W5_GROUND = linear(PALETTE.bg);
const EMPTY: FlatContent = { under: [], glyphs: {}, over: [] };
type W5Row = { frame: { col: number; text: string }[]; text: string; col: number; ink: (j: number) => RGB };

/** W5 at instant `f`, in screen px (origin at the centre, y up): typed in over 8 f from MONITOR_BACK, then held to the end. */
export function w5Content(f: number, advance: Advance): FlatContent {
  const out = Math.round(f);
  if (out < MONITOR_BACK) return EMPTY;
  const green = () => VALUE_INK;
  const side = (text: string): W5Row => ({ frame: [{ col: 0, text: '║' }, { col: COLS - 1, text: '║' }], text, col: 2, ink: green });
  const ok = [...W5.line].length - [...HERO_OUT.alive].length - ' survived'.length;
  const rows: W5Row[] = [
    { frame: [{ col: 0, text: `╔═${TITLE}${'═'.repeat(COLS - 3 - TITLE.length)}╗` }], text: '', col: 0, ink: green },
    ...W5.rows.map(side),
    { frame: [{ col: 0, text: `╚${'═'.repeat(COLS - 2)}╝` }], text: '', col: 0, ink: green },
    { frame: [], text: W5.line, col: 2, ink: (j) => (j < 6 ? VALUE_INK : j >= ok && j < ok + 5 ? AMBER : INK.text) },
  ];
  const typed = clamp((out - MONITOR_BACK) / 8);
  const shown = smoothstep(-1, 1, out - MONITOR_BACK);
  const left = -960 + HUD.margin;
  const cell = advance('═') * HUD.size;
  const bottom = -540 + HUD.margin;
  const top = bottom + HUD.pitch * rows.length;
  const under: Shape[] = [{ kind: 'rect', x: left - 6 + (COLS * cell + 12) / 2, y: (top + bottom) / 2, w: COLS * cell + 12, h: top - bottom + 8, color: W5_GROUND, alpha: 0.85 * shown }];
  const glyphs: Glyph[] = [];
  const count = Math.ceil(typed * COLS * 1.5);
  const put = (text: string, col: number, y: number, ink: (j: number) => RGB) =>
    [...text].slice(0, Math.max(0, count - col)).forEach((ch, j) => {
      if (ch.trim() !== '') glyphs.push({ ch, x: left + (col + j + 0.5) * cell, y, size: HUD.size, color: ink(j), alpha: shown });
    });
  rows.forEach((r, i) => {
    const y = top - i * HUD.pitch - HUD.pitch / 2;
    for (const fr of r.frame) put(fr.text, fr.col, y, () => FRAME_INK);
    put(r.text, r.col, y, r.ink);
  });
  return { under, glyphs: { mono: glyphs }, over: [] };
}

// ——— Finishing and sampling ————————————————————————————————————————————————————————————————————————————————————————————————————

/** The terminal's finishing inside the lens: the scanlines come back as it opens, a bloom pulse on the tonic (radius × 1.3 over ≈ 18 f; iteration 2: half what it was, now that his phosphor blooms by itself);
 *  the refresh band rolls on once a bar, so the film's last frame hands frame 0 its band and its CRT (curvature 0.045, scanlines 0.3). No swell on the
 *  wink (iteration 2): his phosphor blooms by itself now, and the wink's swell on top of it washed the black round the lens (corners
 *  9 → 21 of 255); the wink's accent is its own ting, the ✧'s pop and the eye. */
export function outroLensLook(frame: number): Look {
  const F = Math.round(frame);
  const band = (((F % FRAMES_PER_BAR) + FRAMES_PER_BAR) % FRAMES_PER_BAR) / FRAMES_PER_BAR;
  const boost = glow(F, OPEN, 0.1, 6) - 1;
  const look = terminalLook(1, boost, band, TERMINAL_CURVATURE);
  // (The last tick flares only the rim — outroScreen.ts tickPulse: a bloom swell there lifted the black round the lens to a grey wash.)
  const pulse = F >= OPEN ? 1 + 0.3 * Math.exp(-(F - OPEN) / 6) : 1;
  const opened = smoothstep(OPEN, OPEN + 6, F);
  // The mipmap blur's radius is meaningful only up to 1 (above it the upsampling rings: dark halos, a lifted ground), so the pulse
  // widens it to at most 0.95 and the rest of the swell goes into the intensity.
  const radius = Math.min(0.95, look.bloom.radius * pulse);
  const intensity = look.bloom.intensity * (1 + 0.5 * (pulse - 1));
  // The wink's accent: the whole screen a tenth brighter on its frame, back over ≈ 12 f — exposure only, so black stays black.
  const exposure = look.exposure * (F >= WINK ? 1 + 0.1 * Math.exp(-(F - WINK) / 4) : 1);
  return { ...look, exposure, bloom: { ...look.bloom, radius, intensity }, crt: { ...look.crt!, scanlines: opened >= 1 ? 0.3 : 0.3 * opened } };
}

/** 32 sub-frames while the lens is pried open (fast lids), 16 after; no tail. */
export const outroLensTemporal = (frame: number): Temporal => ({ samples: frame <= OPEN + 6 ? 32 : 16, shutter: 0.5, persistence: 0 });
export const outroLensSegment = (): Segment => outroSegment();

const unique = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');
/** Every character the lens and W5 draw in mono. */
export const OUTRO_LENS_MONO: readonly string[] = unique([COMMAND_LINE.text, DECODE_GLYPHS, ...W5.rows, W5.line, TITLE, '╔═╗║╚╝']);
/** Every character of his faces and the ✧ in the lens (rounded). */
export const OUTRO_LENS_ROUNDED: readonly string[] = unique([HERO_OUT.arms, HERO_OUT.wink, HERO_OUT.alive]);

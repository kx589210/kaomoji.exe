// THE SLOT: Defender v2.0's scoreboard, bottom left, from the switch's box (drop2 9.3) to the give-up (17.4 + 17) (builder S, fix R1-T02;
// build sheet notes/bid2/drop2-sheet2.md §4.4, §7.2; design notes/extend/drop2-final.md §4.4). The spine of act 2: Defender
// deploys five defence layers and loses each one, and this is where the count is kept.
//   row 1  `DEFENDER v2.0` (Inter Tight Black 44 px, red) + its avatar (Noto Sans JP 64 px: (￣▽￣) → (；￣Д￣) → (￣□￣」) → (￣ω￣),
//          its ω amber once the touché re-infects it);
//   row 2  the pips `▮▮▮▮▮ 5/5` (48 px: ▮ red, ▯ red at 30 %) — the row that carries the score at speed; each layer lost is a 3 f crack
//          on the breach's own frame, then the pip drops out (6 f);
//   row 3  the status (JetBrains Mono 26 px, #D8F5E1, its tags red): READOUT2's 'slot' lines, typed in over 3 f, at most one a beat.
// Box x 48–808, y 822–1032, #0C0F0E at 94 % (the design’s 88 % greys out over bright grounds), a 2 px #FF4A1C frame. It opens on the box's clang (DEFENDER v2.0 flies down into row 1:
// drop2Switch.ts titleAt lands on SLOT_TITLE / SLOT_AVATAR), and greys and closes after `giving up` (17.4 + 6 … + 17).
// Where it goes (rulings, each proven against the parts' own exports in tests/drop2SwitchSlot.test.ts):
//   - the switch (9.3 → 10.1 − 1): home, full size — Defender's own POV, its HUD whole; the flood piles up on it and round it.
//   - act 2 (10.1 → the close; fix R2-03): ×0.72 (ACT2_SCALE, the pictograms' size) everywhere but the arcade's own dock. At full size it
//     was the largest dark mass of the woodblock, Memphis and the kaleidoscope.
//   - the wave (10–11, R2-03): at home it sat exactly on his amber wake (the trough at the face's foot, the front wave), the mountain's
//     left foot and the crash's left side. It re-docks on the burst (10.1: gone from home on the cut, powering on top left over 3 f) to
//     WAVE_BOX, top left over the print's sky and the back of the wave, the home's 48 px margins, clear of his whole path (heroWave), the
//     mountain, the cartouche and the seal; there the downsample's scan line (11.4) runs through it and, the frame it crosses its middle,
//     its type drops to the arcade's DotGothic16 (Defender downgrades its own HUD with the world). If his rect ever meets the box it
//     still ghosts out of his way (≤ 20 %).
//   - the arcade and the voxel well (12–13, the 8-bit look pixelates everything under it at 6 px): it re-docks top left under the
//     arcade's SCORE line, in DotGothic16 at 48 / 42 px (26 px would pixelate to mush), on the GP grid, clear of the mothership; the
//     bottom of the playfield is his stomp and the invasion. It powers off over the downsample's last 4 frames (11.4) and back on in
//     the arcade (12.1); off at the morph's end and on again at home as Memphis lands (14.1).
//   - Memphis, the pictograms, the kaleidoscope (14–17): home at ×0.72, anchored bottom left (clear of his trailing foot in 15); the
//     push into the light (15.4&) bleaches it out, so 16.1's light is the frame's alone, and it re-forms at home once the mandala has
//     crystallised.
//   - the give-up (17.4): the white pill slams in over its top, so on 17.3& + 6 the box is crushed down under the pill (row 1 squeezed
//     out), the last pip cracks on 17.4, it greys on 17.4 + 6 and folds shut by 17.4 + 17.
// Pure. Every frame from the score's names (part-local through partFrame; nothing hard-coded). Layout px (top-left origin, y down)
// inside, the flat world (origin at the centre, y up) out. The GPU side: src/scenes/drop2SwitchSlot.ts (Drop2SlotLayer, composited
// over every drop 2 frame by Drop2MonitorLayer).
import { AVATAR, READOUT2, SCOREBOARD, pips } from '../content/drop2.ts';
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp, smoothstep } from '../engine/math.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Advance, typeset } from '../engine/typeset.ts';
import { ARCADE, BOX, BURST, DOWNSAMPLE, GIVING_UP, HINGE, LIGHT, TOTEM, TOUCHE } from '../score/drop2.ts';
import { FRAMES_PER_BEAT } from '../score/grid.ts';
import { LAW } from './drop2Shared.ts';
import { hudLines } from './drop2Arcade.ts';
import { GP } from './drop2ArcadeSprites.ts';
import { SLOT_AVATAR, SLOT_BOX, SLOT_TITLE } from './drop2SwitchSlotGeom.ts';
import { heroWave, scanLineY } from './drop2Wave.ts';

// ——— Geometry (layout px) ———————————————————————————————————————————————————————————————————————————————————————————————————————

export { SLOT_AVATAR, SLOT_BOX, SLOT_TITLE } from './drop2SwitchSlotGeom.ts';
/**
 * The arcade dock (12–13): top left under the arcade's own left HUD lines (hudLines: its 5 × 7 pixel font, 7 game px tall, + 18 px of
 * air), on the 6 px game grid (centred on the frame, like the pixel pass), 198 tall, clear of the mothership's hover, dive and bounce.
 */
export const ARCADE_BOX = (() => {
  const below = Math.max(...hudLines(ARCADE.from).filter((l) => l.align === 0).map((l) => l.y + 7 * GP)) + 18;
  const y0 = 540 - GP * Math.floor((540 - below) / GP);
  return { x0: 48, y0, x1: 618, y1: y0 + 198 } as const;
})();
/**
 * Act 2's size (10.1 → the close, but for the arcade's dock): the home box at ×0.72, anchored at its dock's corner (bottom left at home,
 * top left in the wave). In the pictograms (15) that keeps it ≥ 15 px clear of his trailing leg's stroke (heroLimbs).
 */
export const ACT2_SCALE = 0.72;
/** The pictograms' dock (15): act 2's size at home. */
export const PICTO_SCALE = ACT2_SCALE;
/**
 * The wave's dock (10.1 → 12.1, R2-03): top left at ×0.72, the home box's 48 px margins (x0 the arcade dock's too), over the print's
 * sky and the back of the wave — away from his wake, the mountain and the crash, ≥ 12 px clear of his rect on every frame (tested).
 */
export const WAVE_BOX = (() => {
  const [x0, y0] = [SLOT_BOX.x0, 1080 - SLOT_BOX.y1];
  return { x0, y0, x1: x0 + (SLOT_BOX.x1 - SLOT_BOX.x0) * ACT2_SCALE, y1: y0 + (SLOT_BOX.y1 - SLOT_BOX.y0) * ACT2_SCALE } as const;
})();
/** The frame the downsample's scan line (11.4, sweeping down) crosses the wave dock's middle: its type drops to DotGothic16 there. */
export const WAVE_8BIT = (() => {
  const mid = (WAVE_BOX.y0 + WAVE_BOX.y1) / 2;
  for (let f = DOWNSAMPLE.from; f < ARCADE.from; f++) if ((scanLineY(f) ?? -Infinity) >= mid) return f;
  return DOWNSAMPLE.from;
})();
/** Where the crushed box's top sits under the give-up pill (the pill's bottom edge is ≤ 943 px at its slam's peak). */
export const CRUSH_TOP = 954;

/** One font set: the rows' sizes and offsets inside the box (px at scale 1, from the box's top-left). */
type Type = {
  font: 'mono' | 'dot';
  title: number;
  titleY: number;
  avatar: number;
  avatarX: number;
  pipY: number;
  pipW: number;
  pipH: number;
  pitch: number;
  count: number;
  countX: number;
  status: number;
  statusY: number;
};
const MONO: Type = { font: 'mono', title: SLOT_TITLE.size, titleY: SLOT_TITLE.y - SLOT_BOX.y0, avatar: SLOT_AVATAR.size, avatarX: SLOT_AVATAR.x - SLOT_BOX.x0, pipY: 112, pipW: 22, pipH: 36, pitch: 30, count: 48, countX: 190, status: 26, statusY: 178 };
const DOT: Type = { font: 'dot', title: 48, titleY: 40, avatar: 38, avatarX: 352, pipY: 102, pipW: 24, pipH: 36, pitch: 30, count: 48, countX: 196, status: 42, statusY: 168 };
/** Left padding inside the box. */
const PAD = 24;

// ——— Inks (linear) ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

export const SLOT_INK = {
  red: linear(LAW.defender.emissive, 1.2),
  amber: linear(LAW.hero, 1.2),
  status: linear('#D8F5E1'),
  back: linear('#0C0F0E'),
  grey: linear('#7C8784'),
  crack: linear('#FFF2E0', 2.2),
} as const;
/**
 * The backing's opacity, in linear light (the layer blends there): the design's 88 % is a display-space opacity — at 88 % linear a white
 * ground still shows through as a 38 % grey (Memphis, the pictograms, the mandala) — and 97.5 % linear is ≈ 88 % on screen.
 */
const BACK_ALPHA = 0.975;
const EMPTY_ALPHA = 0.3;

// ——— The script: status lines, pips, avatar ———————————————————————————————————————————————————————————————————————————————————

const BEAT = FRAMES_PER_BEAT;
/** The slot's pips prefix on the give-up line (`▯▯▯▯▯ 0/5 · …`): row 2 carries it, row 3 the rest. */
const PIPS_PREFIX = /^[▮▯]{5} \d\/5 · /;

/**
 * A status line: its text, its frame in READOUT2, the frame it is typed from, and how many of its characters are already there (a count
 * ticking in place — `[SCAN] 12 threats` → `16 threats` — keeps the line and retypes only its number).
 */
export type StatusLine = { text: string; at: number; shown: number; keep: number };

/** A line's template: its numbers (×n, n, ∞) blanked, so a count ticking in the same line is not a new line. */
const template = (t: string): string => t.replace(/×?\d+|∞/g, '#');

/**
 * Row 3's lines: READOUT2's 'slot' lines from the box to the give-up (the box's own line is row 1, the title), in order. A new line is
 * typed on its own frame unless that is under a beat after the line before, then a beat after it — so a breach's `L n+1 … ▸ deploying`
 * lands with the next world (the downsample, Memphis's landing, the pictograms' landing, the mandala) and every line is up for ≥ a beat.
 * A count ticking in the same line (`[SCAN] 12 → 16 → 24 threats`) is no new line: it ticks on its own frame.
 */
export const STATUS_LINES: readonly StatusLine[] = (() => {
  const out: StatusLine[] = [];
  let lastNew = -Infinity;
  for (const l of READOUT2) {
    if (l.site !== 'slot' || l.at <= BOX || l.at > GIVING_UP) continue;
    const text = l.text.replace(PIPS_PREFIX, '');
    const prev = out[out.length - 1];
    if (prev && template(prev.text) === template(text)) {
      let keep = 0;
      const [a, b] = [[...prev.text], [...text]];
      while (keep < a.length && keep < b.length && a[keep] === b[keep]) keep++;
      out.push({ text, at: l.at, shown: Math.max(l.at, prev.shown + 1), keep });
      continue;
    }
    const shown = Math.max(l.at, lastNew + BEAT);
    out.push({ text, at: l.at, shown, keep: 0 });
    lastNew = shown;
  }
  return out;
})();

/** Frames a status line takes to type in. */
export const TYPE_FRAMES = 3;

/** Layers left at f (SCOREBOARD: 5 on the box, one lost on each breach). */
export function pipsLeft(f: number): number {
  let n = SCOREBOARD[0].left;
  for (const s of SCOREBOARD) if (s.at <= f) n = s.left;
  return n;
}
/** The breach frames (each pip's loss). */
export const BREACHES: readonly number[] = SCOREBOARD.slice(1).map((s) => s.at);
/** Frames a pip shows cracked, from its breach, before it drops out. */
export const CRACK = 3;
/** Frames the cracked pip takes to fall away. */
const DROP = 6;

/** Defender's avatar states (design §4.4): clean on the box, sweat on L1's breach, shock on L2's, re-infected on the touché, giving up. */
export const AVATAR_STATES: readonly { at: number; face: string; infected: boolean }[] = [
  { at: BOX, face: AVATAR.clean, infected: false },
  { at: SCOREBOARD[1].at, face: AVATAR.sweat, infected: false },
  { at: SCOREBOARD[2].at, face: AVATAR.shock, infected: false },
  { at: TOUCHE, face: AVATAR.infected, infected: true },
  { at: GIVING_UP, face: AVATAR.givingUp, infected: true },
];
export function avatarAt(f: number): { face: string; infected: boolean; since: number } {
  let s = AVATAR_STATES[0];
  for (const a of AVATAR_STATES) if (a.at <= f) s = a;
  return { face: s.face, infected: s.infected, since: s.at };
}

// ——— Where it is (the docks and the moves between them) ——————————————————————————————————————————————————————————————————————————

/** Powers off over the 4 frames before `at`, back on over the 3 from `at` (a CRT's line), for the re-docks. */
const OFF = 4;
const ON = 3;
/** The light: bleached out over the push's last 10 frames, gone through 16.1's light, back at home over 6 frames from 16.1 + 6. */
const BLEACH = { from: HINGE.from + 2, to: LIGHT.from } as const;
const REFORM = { from: LIGHT.from + 6, to: LIGHT.from + 12 } as const;
/** The give-up: crushed under the pill (17.3& + 6 → 17.4 − 3), greyed (17.4 + 6 … + 9), folded shut (17.4 + 9 … + 17). */
export const CRUSH = { from: GIVING_UP - 6, to: GIVING_UP - 3 } as const;
export const GREY = { from: GIVING_UP + 6, to: GIVING_UP + 9 } as const;
export const FOLD = { from: GIVING_UP + 9, to: GIVING_UP + 17 } as const;
/** The first frame the slot is gone. */
export const SLOT_END = FOLD.to;

/** The slot's placement at output frame `out`. */
export type Dock = {
  /** The box, layout px (y0 the top; the crush moves it down). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** The rows' scale and their origin (the box's top-left before any crush or fold). */
  scale: number;
  ox: number;
  oy: number;
  type: Type;
  /** 0–1: the whole slot's opacity (power, bleach, his carve). */
  alpha: number;
  /** 0–1: the box's height about its middle (a CRT's line when it powers off or on, the fold). */
  open: number;
  /** 0–1: the crush (row 1 squeezed out, rows 2–3 pressed down to the box's new top). */
  crush: number;
  /** 0–1: the grey of the close. */
  grey: number;
};

/**
 * His rect on screen in the wave at output frame g (centre, half width, half height), when a wave other than v09's draws him
 * (DROP2_THREADS.waveStyle: the mochi's src/shots/drop2Mochi.ts mochiHeroRect); absent: v09's heroWave.
 */
export type HeroRect = (g: number) => { x: number; y: number; hw: number; hh: number } | null;
/**
 * With a hero rect (the mochi): the frames his glyph really lies over the box (no air), and any two such spans less than half a bar
 * apart joined into one, so the dock ghosts once per pass and never blinks back on for a few frames between grazes. Per rect, once.
 */
const JOIN = 2 * FRAMES_PER_BEAT;
const rectHits = new WeakMap<HeroRect, Uint8Array>();
function joinedHits(heroRect: HeroRect): Uint8Array {
  const got = rectHits.get(heroRect);
  if (got) return got;
  const B = WAVE_BOX;
  const hits = new Uint8Array(ARCADE.from - BURST);
  for (let i = 0; i < hits.length; i++) {
    const r = heroRect(BURST + i);
    if (r && r.x - r.hw < B.x1 && r.x + r.hw > B.x0 && r.y - r.hh < B.y1 && r.y + r.hh > B.y0) hits[i] = 1;
  }
  let last = -1;
  for (let i = 0; i < hits.length; i++) {
    if (!hits[i]) continue;
    if (last >= 0 && i - last <= JOIN) hits.fill(1, last, i);
    last = i;
  }
  rectHits.set(heroRect, hits);
  return hits;
}
/** He carves through the box in the wave (heroWave's rect, ≈ 0.46 of his width tall, 12 px of air): 1 while he is in it. */
function waveHit(g: number, heroRect?: HeroRect): number {
  if (g < BURST || g >= ARCADE.from) return 0;
  const B = WAVE_BOX;
  if (heroRect) return joinedHits(heroRect)[g - BURST];
  const h = heroWave(g);
  const w = (h.width * h.sx) / 2 + 12;
  const t = (0.46 * h.width * h.sy) / 2 + 12;
  return h.x - w < B.x1 && h.x + w > B.x0 && h.y - t < B.y1 && h.y + t > B.y0 ? 1 : 0;
}
/** The ghosting where he crosses it: ramps in over the 4 frames before he arrives, holds, and comes back over 7 after he leaves. */
export function waveDuck(out: number, heroRect?: HeroRect): number {
  let d = 0;
  for (let k = -7; k <= 4; k++) {
    const w = k >= 0 ? 1 - k / 5 : 1 + k / 8;
    if (w > d && waveHit(out + k, heroRect)) d = w;
  }
  return d;
}

export function dockAt(frame: number, heroRect?: HeroRect): Dock | null {
  const out = Math.round(frame);
  if (out < BOX || out >= SLOT_END) return null;
  const home = { x0: SLOT_BOX.x0, y0: SLOT_BOX.y0, x1: SLOT_BOX.x1, y1: SLOT_BOX.y1 };
  const d: Dock = { ...home, scale: 1, ox: home.x0, oy: home.y0, type: MONO, alpha: 1, open: 1, crush: 0, grey: 0 };
  // Act 2 (from the burst): ×0.72, at home anchored bottom left.
  if (out >= BURST) {
    const s = ACT2_SCALE;
    Object.assign(d, { scale: s, x1: home.x0 + (home.x1 - home.x0) * s, y0: home.y1 - (home.y1 - home.y0) * s });
    d.oy = d.y0;
  }
  // The wave (10.1 → 12.1): top left, gone from home on the burst's cut and powering on there; DotGothic16 from the scan line's pass.
  if (out >= BURST && out < ARCADE.from) Object.assign(d, { ...WAVE_BOX, ox: WAVE_BOX.x0, oy: WAVE_BOX.y0, type: out >= WAVE_8BIT ? DOT : MONO });
  // The arcade and the well (12–13): top left, DotGothic16, full size; powered off and on round each re-dock.
  const inArcade = out >= ARCADE.from && out < TOTEM;
  if (inArcade) Object.assign(d, { ...ARCADE_BOX, ox: ARCADE_BOX.x0, oy: ARCADE_BOX.y0, type: DOT, scale: 1 });
  if (out >= BURST && out < BURST + ON) d.open = (out - BURST + 1) / (ON + 1);
  else if (out >= ARCADE.from - OFF && out < ARCADE.from) d.open = (ARCADE.from - out - 1) / OFF;
  else if (out >= ARCADE.from && out < ARCADE.from + ON) d.open = (out - ARCADE.from + 1) / (ON + 1);
  else if (out >= TOTEM - OFF && out < TOTEM) d.open = (TOTEM - out - 1) / OFF;
  else if (out >= TOTEM && out < TOTEM + ON) d.open = (out - TOTEM + 1) / (ON + 1);
  // The light: bleached by the push's glare, gone through 16.1, re-formed at home once the mandala settles.
  if (out >= BLEACH.from && out < REFORM.from) d.alpha *= 1 - smoothstep(BLEACH.from, BLEACH.to, out);
  if (out >= REFORM.from && out < REFORM.to) {
    const u = (out - REFORM.from + 1) / (REFORM.to - REFORM.from);
    d.alpha *= u;
    d.open = ease.outCubic(u);
  }
  // His carve in the wave.
  if (out >= BURST && out < ARCADE.from) d.alpha *= 1 - 0.8 * waveDuck(out, heroRect);
  // The give-up.
  d.crush = ease.inOutSine(clamp((out - CRUSH.from + 1) / (CRUSH.to - CRUSH.from)));
  d.y0 = lerp(d.y0, CRUSH_TOP, d.crush);
  d.grey = clamp((out - GREY.from + 1) / (GREY.to - GREY.from));
  if (out >= FOLD.from) d.open = 1 - ease.inOutSine((out - FOLD.from + 1) / (FOLD.to - FOLD.from + 1));
  return d;
}

// ——— The picture ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The atlases' advances (em per character). */
export type SlotAdvances = { display: Advance; mono: Advance; dot: Advance; jp: Advance };
export type SlotGlyphs = { display: Glyph[]; mono: Glyph[]; dot: Glyph[]; jp: Glyph[] };
/** The capacities the layer allocates (tested at every frame). */
export const SLOT_CAPACITY = { shapes: 96, glyphs: 160 } as const;

const fx = (x: number): number => x - 960;
const fy = (y: number): number => 540 - y;

/** The status line's runs: its [TAGS] and ✗ red, the rest the readout's pale green. */
export function statusRuns(text: string): { text: string; red: boolean }[] {
  const out: { text: string; red: boolean }[] = [];
  const re = /(\[[A-Z]+\]|✗)/g;
  let i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > i) out.push({ text: text.slice(i, m.index), red: false });
    out.push({ text: m[0], red: true });
    i = m.index! + m[0].length;
  }
  if (i < text.length) out.push({ text: text.slice(i), red: false });
  return out;
}

/** The status line on row 3 at `out`: the latest line typed, and how many of its characters are in. */
export function statusAt(out: number): { line: StatusLine; count: number; typing: boolean } | null {
  let line: StatusLine | null = null;
  for (const l of STATUS_LINES) if (l.shown <= out) line = l;
  if (!line) return null;
  const n = [...line.text].length;
  const count = Math.min(n, line.keep + Math.ceil(((n - line.keep) * (out - line.shown + 1)) / TYPE_FRAMES));
  return { line, count, typing: count < n };
}

/**
 * The slot at instant `frame`, read at its output frame (a typed character, a crack and a swap are whole on their frame): the backing and
 * its frame, row 1 (title + avatar), row 2 (the pips, a breach's crack and fall, the count), row 3 (the status, its cursor). Empty
 * outside BOX … SLOT_END.
 */
export function slotContent(frame: number, adv: SlotAdvances, heroRect?: HeroRect): FlatContent & { glyphs: SlotGlyphs } {
  const out = Math.round(frame);
  const g: SlotGlyphs = { display: [], mono: [], dot: [], jp: [] };
  const under: Shape[] = [];
  const over: Shape[] = [];
  const d = dockAt(out, heroRect);
  if (!d || d.alpha <= 0.002 || d.open <= 0.002) return { under, glyphs: g, over };
  const T = d.type;
  const s = d.scale;
  const A = d.alpha;
  const ink = (c: RGB): RGB => mixRGB(c, SLOT_INK.grey, d.grey);
  const RED = ink(SLOT_INK.red);
  // The box (its height about its middle when powering or folding: a CRT's line), the backing and its 2 px frame.
  const mid = (d.y0 + d.y1) / 2;
  const half = ((d.y1 - d.y0) / 2) * d.open;
  const [x0, x1, y0, y1] = [d.x0, d.x1, mid - half, mid + half];
  under.push({ kind: 'rect', x: fx((x0 + x1) / 2), y: fy(mid), w: x1 - x0, h: Math.max(2, y1 - y0), color: SLOT_INK.back, alpha: BACK_ALPHA * A });
  const edge = (ax: number, ay: number, bx: number, by: number) =>
    under.push({ kind: 'rect', x: fx((ax + bx) / 2), y: fy((ay + by) / 2), w: Math.max(2, bx - ax), h: Math.max(2, by - ay), color: RED, alpha: A });
  edge(x0, y0, x1, y0 + 2);
  edge(x0, y1 - 2, x1, y1);
  edge(x0, y0, x0 + 2, y1);
  edge(x1 - 2, y0, x1, y1);
  // While it powers off or on, a white-hot line across the middle, and no type.
  if (d.open < 0.5) {
    under.push({ kind: 'rect', x: fx((x0 + x1) / 2), y: fy(mid), w: (x1 - x0) * (0.4 + 0.6 * d.open), h: 2, color: SLOT_INK.crack, alpha: A * (1 - d.open) });
    return { under, glyphs: g, over };
  }
  // The rows ride the fold toward the middle (the monitor's fold), the crush presses rows 2–3 down to the crushed top.
  const ty = A * (d.open < 1 ? d.open ** 2 : 1);
  const rowY = (y: number) => mid + (y - mid) * d.open;
  const box = (dy: number) => d.oy + dy * s;
  const atlas = T.font;
  const put = (text: string, x: number, y: number, size: number, color: RGB, alpha: number, font: keyof SlotGlyphs, count = Infinity): number => {
    const line = typeset(text, adv[font]);
    let i = 0;
    for (const c of line.chars) {
      if (i++ >= count) break;
      if (c.ch.trim() === '') continue;
      g[font].push({ ch: c.ch, x: fx(x + c.x * size), y: fy(y), size, color, alpha });
    }
    return x + line.width * size;
  };
  // Row 1: DEFENDER v2.0 and its avatar (squeezed out by the crush). The avatar swaps on its frame with a 3 f pop.
  const r1 = (1 - d.crush) * ty;
  const titleY = rowY(box(T.titleY) + 24 * d.crush);
  // The crush's top edge comes down over row 1: it is clipped out as soon as the edge reaches its middle.
  if (r1 > 0.002 && titleY >= y0 + 0.5 * T.title * s) {
    const y = titleY;
    const titleEnd = put('DEFENDER v2.0', d.ox + PAD * s, y, T.title * s, RED, r1, atlas === 'dot' ? 'dot' : 'display');
    const av = avatarAt(out);
    const pop = 1 + 0.12 * (1 - clamp((out - av.since) / 3)) * (av.since > BOX ? 1 : 0);
    const size = T.avatar * s * pop;
    const line = typeset(av.face, adv.jp);
    // Home: where the clean avatar landed with the title (SLOT_AVATAR); in DotGothic16 (wider) just after the title. It pops from its
    // left edge, away from the title.
    const at = T.font === 'dot' ? Math.max(d.ox + T.avatarX * s, titleEnd + 20 * s) : d.ox + T.avatarX * s;
    const left = at;
    for (const c of line.chars) {
      if (c.ch.trim() === '') continue;
      g.jp.push({ ch: c.ch, x: fx(left + c.x * size), y: fy(y), size, color: c.ch === 'ω' && av.infected ? ink(SLOT_INK.amber) : RED, alpha: r1 });
    }
  }
  // Row 2: the pips. A breach: the last pip cracks on its frame (3 f, the row jolts), then falls away (6 f); its ▯ shows from then.
  const left = pipsLeft(out);
  const b = BREACHES.filter((x) => x <= out).pop();
  const since = b === undefined ? Infinity : out - b;
  const jolt = since < CRACK ? [5, -4, 2][since] * s : 0;
  const pipY = rowY(lerp(box(T.pipY), CRUSH_TOP + 26, d.crush));
  for (let k = 0; k < 5; k++) {
    const cx = d.ox + (PAD + T.pipW / 2 + k * T.pitch) * s + jolt;
    const [w, h] = [T.pipW * s, T.pipH * s * (d.open < 1 ? d.open : 1)];
    const lost = k === left && since < CRACK + DROP;
    if (k < left) {
      under.push({ kind: 'rect', x: fx(cx), y: fy(pipY), w, h, color: RED, alpha: ty });
    } else {
      // The empty pip (▯): a faint fill and its outline.
      if (!lost || since >= CRACK) under.push({ kind: 'rect', x: fx(cx), y: fy(pipY), w, h, color: RED, alpha: EMPTY_ALPHA * 0.5 * ty, outline: 2 * s, outlineColor: RED });
      if (lost) crackedPip(over, cx, pipY, w, h, since, RED, ty);
    }
  }
  const countFont: keyof SlotGlyphs = atlas === 'dot' ? 'dot' : 'mono';
  put(`${left}/5`, d.ox + T.countX * s + jolt, pipY, T.count * s, RED, ty, countFont);
  // Row 3: the status, typed in over 3 f with a cursor at its head (the cursor alone before the first line).
  const st = statusAt(out);
  const sy = rowY(lerp(box(T.statusY), CRUSH_TOP + 60, d.crush));
  const sx = d.ox + PAD * s;
  const statusFont: keyof SlotGlyphs = atlas === 'dot' ? 'dot' : 'mono';
  const room = (d.x1 - d.x0) - 2 * PAD * s;
  let head = sx;
  // The mono status keeps ≥ 85 % of its size in act 2's ×0.72 box (26 px would drop to 19); DotGothic16's 42 px scales with the box (30 px
  // in the wave's dock, under its title's 35 px).
  const want = T.status * (T.font === 'mono' ? Math.max(s, 0.85) : s);
  let size = want;
  if (st) {
    const width = typeset(st.line.text, adv[statusFont]).width;
    size = Math.min(want, room / Math.max(width, 1e-6));
    let shown = 0;
    let x = sx;
    for (const run of statusRuns(st.line.text)) {
      const n = [...run.text].length;
      const take = Math.max(0, Math.min(n, st.count - shown));
      const color = run.red ? RED : ink(SLOT_INK.status);
      const end = put(run.text, x, sy, size, color, ty, statusFont, take);
      if (take > 0) head = take === n ? end : x + typeset([...run.text].slice(0, take).join(''), adv[statusFont]).width * size;
      x = end;
      shown += n;
    }
  }
  const cursorOn = !st || st.typing || out - st.line.shown < TYPE_FRAMES + 6;
  if (cursorOn && d.grey === 0) under.push({ kind: 'rect', x: fx(head + 4 * s + 0.28 * size), y: fy(sy), w: 0.55 * size, h: 0.95 * size, color: RED, alpha: 0.85 * ty });
  return { under, glyphs: g, over };
}

/**
 * A pip cracked: on its frame and the 2 after, split across a white-hot zig-zag crack, the halves sheared apart (upper up-left, lower
 * down-right, the gap opening 4 → 8 px); then the halves fall away (6 f, gravity, a turn each, fading).
 */
function crackedPip(over: Shape[], cx: number, cy: number, w: number, h: number, since: number, red: RGB, alpha: number): void {
  const t = since;
  const fall = Math.max(0, t - CRACK + 1);
  const drop = 0.5 * 3.2 * fall * fall;
  const fade = alpha * (1 - clamp(fall / DROP));
  if (fade <= 0.002) return;
  const gap = t < CRACK ? 4 + 2 * t : 8;
  const shear = t < CRACK ? 2 + t : 4;
  const halves: [number, number, number][] = [
    [-shear - 0.8 * fall, -(h / 4 + gap / 2), -0.12 - 0.07 * fall],
    [shear + 1.2 * fall, h / 4 + gap / 2, 0.1 + 0.1 * fall],
  ];
  // The first frame the pip flashes hot (its red lifted toward white), then it is plain red again.
  const hot = t === 0 ? mixRGB(red, SLOT_INK.crack, 0.35) : red;
  for (const [dx, dy, rot] of halves) over.push({ kind: 'rect', x: fx(cx + dx), y: fy(cy + dy + drop * (dy > 0 ? 1.15 : 1)), w, h: h / 2 - gap / 2, rot, color: hot, alpha: fade });
  if (t < CRACK) {
    // The crack: a zig-zag of white-hot strokes through the break, a little beyond the pip on both sides.
    const k = h / 36;
    const pts: [number, number][] = [
      [cx - w / 2 - 6 * k, cy + 5 * k],
      [cx - w / 6, cy - 6 * k],
      [cx + w / 8, cy + 5 * k],
      [cx + w / 2 + 6 * k, cy - 4 * k],
    ];
    for (let i = 0; i < 3; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      over.push({ kind: 'segment', x: fx((ax + bx) / 2), y: fy((ay + by) / 2), w: Math.hypot(bx - ax, by - ay) + 3 * k, h: 3 * k, rot: -Math.atan2(by - ay, bx - ax), color: scaleRGB(SLOT_INK.crack, 1 - t / (CRACK + 1)), alpha });
    }
  }
}

// ——— What the atlases need ————————————————————————————————————————————————————————————————————————————————————————————————————

/** Every string the slot can draw, by the atlas that draws it (the scene builds its atlases from these; tests check each against its role's stack). */
const COUNTS = [0, 1, 2, 3, 4, 5].map((n) => `${n}/5`);
export const SLOT_STRINGS = {
  display: ['DEFENDER v2.0'],
  mono: [...STATUS_LINES.map((l) => l.text), ...COUNTS],
  dot: ['DEFENDER v2.0', ...STATUS_LINES.map((l) => l.text), ...COUNTS],
  jp: AVATAR_STATES.map((a) => a.face),
} as const;

/** The pips are drawn as shapes (▮ a bar, ▯ its outline); the readout's own string for them is pips(n). */
export const SLOT_PIPS: readonly string[] = [0, 1, 2, 3, 4, 5].map(pips);

/** For the pictograms' and arcade docks' clearances (tests): the box at `out` (null when it is not up). */
export function slotRect(out: number): { x0: number; y0: number; x1: number; y1: number } | null {
  const d = dockAt(out);
  if (!d || d.alpha <= 0.002 || d.open <= 0.002) return null;
  const mid = (d.y0 + d.y1) / 2;
  const half = ((d.y1 - d.y0) / 2) * d.open;
  return { x0: d.x0, y0: mid - half, x1: d.x1, y1: mid + half };
}

// S28 STYLE CUBE, drop2 1.4&–3.1 (builder A · SLASH; build sheet notes/d2build/sheet.md §4.2 rows drop2 1.4&–2.4&, §5.4, §5.5, §9 H1). Pure:
// the pop-out (S27's frame shrinking into the cube's front), the turn θ(f) (anticipation, ease-in landing exactly on each kick, a
// +3° recoil; the whip, unwinding +360° and slammed onto drop2 3.1), which world each of the four side faces wears (slot 0 re-skinned only while it faces away), where each
// visible face lies on screen (orthographic, elevation 0°: every face is a vertical strip) and how it is shaded, the hero's dress,
// pose, hop, lean and wind-up per landing, and each face's motif. Layout px (origin top-left, y down); angles in degrees.
import { LED_ROWS, SWISS_NUMERALS, HERO2 } from '../content/drop2.ts';
import { S28_CAST } from '../content/castDrop2.ts';
import { type RGB, linear, scaleRGB, transmit } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp } from '../engine/math.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Advance, typeset } from '../engine/typeset.ts';
import { HATS2, OPEN_HATS2, POP, POP_OUT, TURNS, WHIP } from '../score/drop2.ts';
import { seedFrame } from '../score/film.ts';
import { FPS } from '../score/tempo.ts';
import { frameOf, toEngine } from './breakShared.ts';
import { CUBE_DRESS, PALETTES, S27_MASTER, hop, impact, impactSquash, springL, whipSlam } from './drop2Shared.ts';
import { type HeroChar, type SlashLayout, heroS27, lGlyph, rowGlyphs, swissOmega, tubeOf } from './drop2Slash.ts';

// ——— The pop-out and the box ————————————————————————————————————————————————————————————————————————————————————————————————————

/** The cube at rest: a square prism 1500 wide and deep, 844 tall, centred (960, 560) (sheet §5.5). */
export const BOX = { w: 1500, h: 844, cx: 960, cy: 560 } as const;
/** The frame (S27's style frame) the box grows out of: 1920 × 1080 about (960, 540). */
const FRAME = { w: 1920, h: 1080, cy: 540 } as const;

/** How far the pop-out has come (L keyed at drop2 1.4& − 1): 0 = S27's whole frame, 1 = the cube's front at rest. */
export const popOut = (f: number): number => (f < POP_OUT - 1 ? 0 : springL(f, POP_OUT));

/** The box at instant f: its width (= depth), height and centre y, shrinking with the pop-out from the frame to 1500 × 844. */
export function box(f: number): { w: number; h: number; cy: number } {
  const k = popOut(f);
  return { w: lerp(FRAME.w, BOX.w, k), h: lerp(FRAME.h, BOX.h, k), cy: lerp(FRAME.cy, BOX.cy, k) };
}

// ——— The turn ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Each turn's anticipation (°, against the turn, over its first 2 f): 4 for the first, 3 for the rest. */
const ANTICIPATION: readonly number[] = [4, 3, 3, 3];

/** One −90° turn at instant f: anticipation, then an ease-in (cubic) landing exactly on the kick, then a +3° recoil over 6 f. */
function turn(f: number, k: number): number {
  const { from, to } = TURNS[k];
  const a = ANTICIPATION[k];
  if (f <= from) return 0;
  if (f < from + 2) return a * Math.sin((Math.PI / 2) * ((f - from) / 2));
  if (f < to) return a + (-90 - a) * ((f - from - 2) / (to - from - 2)) ** 3;
  const t = f - to;
  return -90 + (t < 6 ? 3 * Math.sin((Math.PI * t) / 6) : 0);
}

/**
 * The cube's turn θ(f) (°): −90 per kick on drop2 1.4&–2.4, then the whip, slammed onto drop2 3.1 (whipSlam: fastest on its last frame). The
 * whip unwinds the four turns (+360°, iteration 2, ruling 7) and slot 0 lands as the terminal grid. Its faces are all dark (iteration 3,
 * slotWorld): the light paper passing at drop2 3.1 − 4 … 3.1 − 1 read as a cream pop before the beat, so the light is drop2 3.1's own (the rig's bump and
 * S29's flare on drop2 3.1).
 */
export function cubeTheta(f: number): number {
  let th = 0;
  for (let k = 0; k < TURNS.length; k++) th += turn(f, k);
  if (f > WHIP.from) th += 360 * whipSlam(f, WHIP.from, WHIP.to);
  return th;
}

/** The worlds the cube's faces can wear: A is S27's style frame, F the terminal grid (the backdrop itself). */
export type FaceWorld = 'A' | 'swiss' | 'riso' | 'led' | 'neon' | 'terminal';

/**
 * Which world slot k wears at turn θ (sheet §5.5): slot 0 = A, re-skinned to the neon face E while it faces away (θ past −180°); during
 * the whip (`whipping`) it is the neon face until it faces away again and the terminal grid F after (θ back past −180°); slot 1 = B
 * Swiss, slot 2 = C Riso, slot 3 = D LED. Over the whip (iteration 3) the two light faces come back dark — C as the neon, B as the LED —
 * re-skinned at its start, when both face away (the cube rests on E, B and C behind it), so it strobes LED, neon, LED into the grid.
 */
export function slotWorld(k: number, theta: number, whipping = false): FaceWorld {
  if (k === 1) return whipping ? 'led' : 'swiss';
  if (k === 2) return whipping ? 'neon' : 'riso';
  if (k === 3) return 'led';
  if (whipping) return theta < -180 ? 'neon' : 'terminal';
  return theta > -180 ? 'A' : 'neon';
}

/** The world slot k wears at instant f. */
export const slotWorldAt = (k: number, f: number): FaceWorld => slotWorld(k, cubeTheta(f), f > WHIP.from);

/** A visible face: its slot and world, its angle φ to the viewer, its strip on screen (before the camera) and its shade. */
export type FaceSpan = { slot: number; world: FaceWorld; phi: number; x0: number; x1: number; shade: number };

/**
 * The faces turned toward the viewer at instant f (orthographic, elevation 0°): face k's normal is at φ = θ + 90k; its centre sits at
 * (w/2)·sin φ and its width shows as w·cos φ, so it covers [960 + (w/2) sin φ − (w/2) cos φ, … + (w/2) cos φ]; shaded 0.72 + 0.28 cos φ.
 */
export function visibleFaces(f: number): FaceSpan[] {
  const th = cubeTheta(f);
  const { w } = box(f);
  const out: FaceSpan[] = [];
  for (let k = 0; k < 4; k++) {
    const phi = th + 90 * k;
    const r = (phi * Math.PI) / 180;
    const c = Math.cos(r);
    if (c <= 1e-4) continue;
    const mid = BOX.cx + (w / 2) * Math.sin(r);
    out.push({ slot: k, world: slotWorld(k, th, f > WHIP.from), phi, x0: mid - (w / 2) * c, x1: mid + (w / 2) * c, shade: 0.72 + 0.28 * c });
  }
  return out.sort((a, b) => a.x0 - b.x0);
}

/** The world facing the viewer (the one with the widest strip) at instant f. */
export const frontWorld = (f: number): FaceWorld => visibleFaces(f).reduce((a, b) => (b.x1 - b.x0 > a.x1 - a.x0 ? b : a)).world;

// ——— The hero in front of the cube ——————————————————————————————————————————————————————————————————————————————————————————————

export type CubeDressName = keyof typeof CUBE_DRESS;
/** The landings: the face that lands on each kick, the pose he takes there (sheet §4.2). */
export const LANDINGS: readonly { at: number; world: CubeDressName; face: string }[] = [
  { at: TURNS[0].to, world: 'swiss', face: HERO2.danceL },
  { at: TURNS[1].to, world: 'riso', face: HERO2.danceR },
  { at: TURNS[2].to, world: 'led', face: HERO2.danceL },
  { at: TURNS[3].to, world: 'neon', face: HERO2.danceR },
];
/** From the pop-out's 4 f cross-dissolve until drop2 2.1 he is the Swiss look of S27's last pose ＼(•ω•)／. */
const LIFT = { at: POP_OUT, face: HERO2.jump } as const;
/** From drop2 3.1 − 6 S29's renderer draws him (Drop2Zbuf.renderHero). */
export const HANDOVER = WHIP.from + 6;
/** Whether S29's renderer draws him at instant f: taken at the output frame, so the swap is whole on drop2 3.1 − 6 (no half-and-half sub-frames). */
export const zbufDrawsHero = (f: number): boolean => frameOf(f) >= HANDOVER;

/** The hero in front of the cube: his dress and its font, his pose string, its characters (layout px), how much of him and his shadow shows. */
export type CubeHero = { dress: CubeDressName; font: 'rounded' | 'jp' | 'dot'; face: string; chars: HeroChar[]; alpha: number; shadow: number };

const fontOf = (L: SlashLayout, d: CubeDressName): Advance => (CUBE_DRESS[d].role === 'jp' ? L.jp : CUBE_DRESS[d].role === 'dot' ? L.dot : L.rounded);
/** The ink of a bracket sits this far under its placement point (ems) in each dress's font (S27's measured rounded; JP and dot ≈ centred). */
const INK_DROP: Readonly<Record<CubeDressName, number>> = { swiss: 0.02, riso: 0.02, led: 0.0, neon: 22 / 360 };

/** The size (px wide, bracket to bracket) and centre of his face: 1240 at (960, 540) → 960 at (960, 520) on the pop-out (L). */
export function cubeHeroPlace(f: number): { width: number; cx: number; cy: number } {
  const k = popOut(f);
  return { width: lerp(1240, 960, k), cx: 960, cy: lerp(540, 520, k) };
}

/**
 * The hero at instant f (drop2 1.4&–2.4& + 5): the Swiss look of ＼(•ω•)／ from the pop-out's cross-dissolve, then each landing's dress and pose
 * (swapped whole on the kick's frame), a hop on each landing (12 px, I-squash on touchdown), a −4° lean riding each turn, the wind-up
 * crouch from drop2 2.4 (y 1.0 → 0.86, a notch deeper on +6), the arms fading on the whip.
 */
export function cubeHero(f: number, L: SlashLayout): CubeHero {
  const d = frameOf(f);
  const land = [...LANDINGS].reverse().find((l) => d >= l.at);
  if (!land) return lifted(f, L);
  const dress: CubeDressName = land ? land.world : 'swiss';
  const face = land ? land.face : LIFT.face;
  const adv = fontOf(L, dress);
  const place = cubeHeroPlace(f);
  const core = typeset(HERO2.base, adv).width;
  const em = place.width / core;
  const line = typeset(face, adv);
  const open = line.chars.findIndex((c) => c.ch === '(');
  const close = line.chars.findIndex((c) => c.ch === ')');
  const mid = (line.chars[open].x - line.chars[open].w / 2 + line.chars[close].x + line.chars[close].w / 2) / 2;
  // Hop and touchdown squash on each landing; the lean riding each turn; the wind-up crouch.
  const lastLand = land ? land.at : null;
  const up = lastLand !== null ? hop(f, lastLand) : 0;
  const touch = lastLand !== null ? impactSquash(f, lastLand + 8) : 0;
  let lean = 0;
  for (const t of TURNS.slice(1)) if (f > t.from && f < t.to + 6) lean = -4 * Math.sin(Math.PI * clamp((f - t.from) / (t.to + 6 - t.from)));
  const wind = f >= TURNS[3].to ? 0.115 * ease.inCubic(clamp((f - TURNS[3].to) / (HANDOVER - 1 - TURNS[3].to))) + 0.025 * impact(f, TURNS[3].to + 6, 2) : 0;
  const sy = (1 - wind) * (1 - touch);
  const sx = 1 + touch;
  const armFade = 1 - clamp((f - WHIP.from) / 4);
  const baseY = place.cy - INK_DROP[dress] * em;
  // The crouch squashes about his feet: the bottom of the brackets (≈ 0.5 em under the centre) stays put.
  const feet = place.cy + 0.48 * em;
  const chars: HeroChar[] = [];
  const parts = ['open', 'eyeL', 'mouth', 'eyeR', 'close'] as const;
  let p = 0;
  line.chars.forEach((c, i) => {
    if (c.ch.trim() === '') return;
    const inCore = i >= open && i <= close;
    const part = inCore ? parts[Math.min(p++, 4)] : 'arm';
    const dx = (c.x - mid) * em * sx;
    const r = (lean * Math.PI) / 180;
    const y = feet - (feet - baseY) * sy - up;
    chars.push({
      ch: c.ch,
      part,
      x: place.cx + dx * Math.cos(r) - (y - place.cy) * Math.sin(r),
      y: place.cy + dx * Math.sin(r) + (y - place.cy) * Math.cos(r),
      size: em * sy,
      stretch: sx / sy,
      rot: lean,
      alpha: part === 'arm' ? armFade : 1,
    });
  });
  const font = CUBE_DRESS[dress].role === 'jp' ? 'jp' : CUBE_DRESS[dress].role === 'dot' ? 'dot' : 'rounded';
  return { dress, font, face, chars, alpha: 1, shadow: 1 };
}

/** He leaves the poster once the 4 f dissolve is done: his glide off it is a launch keyed here (review R1-liftoff-ghost). */
export const LIFT_OFF = POP_OUT + 4;

/**
 * Where S27's style frame (1920 × 1080 layout px) lies while the cube's front still shows it, as the cube shader maps it: frame point
 * (x, y) → (ox + sx·x, oy + sy·y), layout px before the camera (the face's strip, its turn and the shrinking box); null once it is gone.
 */
export function posterMap(f: number): { ox: number; oy: number; sx: number; sy: number } | null {
  const a = visibleFaces(f).find((v) => v.world === 'A');
  if (!a) return null;
  const b = box(f);
  return { ox: a.x0, oy: b.cy - b.h / 2, sx: (a.x1 - a.x0) / FRAME.w, sy: b.h / FRAME.h };
}

/**
 * The lift-off (drop2 1.4& → 2.1): the very characters the poster draws (heroS27: the master, its ＼ ／ arms waving, the ω singing), in the
 * Swiss colours. Over the 4 f cross-dissolve he is registered to the poster on every sub-frame (its shrink, its anticipation), so the
 * dissolve changes only his look; then he leaves it on a launch (keyed at LIFT_OFF, clamped: no overshoot to drag him after the
 * turning poster) to 960 px at (960, 520). He keeps the rounded master until face B lands: only then is one world on screen, and he
 * takes its real font (sheet §3.5).
 */
function lifted(f: number, L: SlashLayout): CubeHero {
  const place = cubeHeroPlace(f);
  const k = place.width / S27_MASTER.width;
  const poster = posterMap(f);
  const r = poster ? (f < LIFT_OFF - 1 ? 0 : clamp(springL(f, LIFT_OFF))) : 1;
  const sx = poster ? lerp(poster.sx, k, r) : k;
  const sy = poster ? lerp(poster.sy, k, r) : k;
  const chars: HeroChar[] = heroS27(f, L.rounded)
    .filter((h) => h.part !== 'brow')
    .map((h) => {
      const tx = place.cx + (h.x - 960) * k;
      const ty = place.cy + (h.y - S27_MASTER.centre[1]) * k;
      const x = poster ? lerp(poster.ox + poster.sx * h.x, tx, r) : tx;
      const y = poster ? lerp(poster.oy + poster.sy * h.y, ty, r) : ty;
      return { ...h, x, y, size: h.size * sy, stretch: (h.stretch * sx) / sy };
    });
  const dissolve = clamp((f - POP_OUT) / 4);
  return { dress: 'swiss', font: 'rounded', face: LIFT.face, chars, alpha: dissolve, shadow: dissolve };
}

/** The S27 hero's share in the cube's front while he lifts off it (the other side of the 4 f cross-dissolve). */
export const s27HeroShare = (f: number): number => 1 - clamp((f - POP_OUT) / 4);

const INK = linear('#111111');
const RISO_PINK = transmit(linear(PALETTES.riso.pink), 0.85);
const RISO_BLUE = transmit(linear(PALETTES.riso.blue), 0.85);
const SHADOW = CUBE_DRESS.swiss.shadow!;

/**
 * The hero (layout px) in his cube dress: the hard shadow (14, 14) black at 45 % first; then swiss = ink, the ω amber with a #111
 * keyline (sheet §1.3 C; it was Swiss red); riso = the pink plate
 * and the blue plate offset (−6, +4), multiplied; neon = amber tubes (added light); led = his glyphs as the white source of the LED
 * pass (12 px dots); `atlas` is the key his font has.
 */
export function dressCubeHero(h: CubeHero): { atlas: 'jp' | 'rounded' | 'dot'; shadow: Glyph[]; normal: Glyph[]; add: Glyph[]; multiply: Glyph[]; led: Glyph[] } {
  const atlas = h.font;
  const out = { atlas, shadow: [] as Glyph[], normal: [] as Glyph[], add: [] as Glyph[], multiply: [] as Glyph[], led: [] as Glyph[] } as const;
  for (const c of h.chars) {
    const a = c.alpha * h.alpha;
    if (a <= 0.001) continue;
    const base = { ch: c.ch, x: c.x, y: c.y, size: c.size, stretch: c.stretch, rot: c.rot };
    out.shadow.push(lGlyph({ ...base, x: c.x + SHADOW.x, y: c.y + SHADOW.y, color: [0, 0, 0], alpha: SHADOW.alpha * a * h.shadow }));
    const mouth = c.part === 'mouth';
    if (h.dress === 'swiss') {
      const g = lGlyph({ ...base, color: mouth ? linear(PALETTES.swiss.red) : INK, alpha: a, outline: 14 / c.size, outlineColor: linear(PALETTES.swiss.ground) });
      out.normal.push(...(mouth ? swissOmega(g, c.size) : [g]));
    }
    else if (h.dress === 'riso') {
      out.multiply.push(lGlyph({ ...base, color: RISO_PINK, alpha: a }));
      out.multiply.push(lGlyph({ ...base, x: c.x - 6, y: c.y + 4, color: RISO_BLUE, alpha: a }));
    } else if (h.dress === 'neon') out.add.push(lGlyph({ ...base, color: linear(PALETTES.neon.amber, 1.5 * a), tube: tubeOf(c.ch) }));
    else out.led.push(lGlyph({ ...base, color: mouth ? [1, 1, 0] : [1, 0, 0], alpha: a }));
  }
  return out;
}

// ——— The faces' motifs (face px: u 0–1500, v 0–844; at rest on screen (210 + u, 138 + v)) ————————————————————————————————————

/** Face px → layout px at rest (the face's world target is drawn there, the cube shader samples it there). */
export const facePx = (u: number, v: number): [number, number] => [BOX.cx - BOX.w / 2 + u, BOX.cy - BOX.h / 2 + v];
const fGlyph = (g: Omit<Glyph, 'x' | 'y' | 'rot'> & { u: number; v: number; rot?: number }): Glyph => {
  const [x, y] = facePx(g.u, g.v);
  return lGlyph({ ch: g.ch, size: g.size, color: g.color, alpha: g.alpha, stretch: g.stretch, tube: g.tube, rot: g.rot, x, y });
};
const fRect = (u: number, v: number, w: number, h: number, color: RGB, extra: Partial<Shape> = {}): Shape => {
  const [x, y] = toEngine(...facePx(u, v));
  return { kind: 'rect', x, y, w, h, color, ...extra, rot: extra.rot ?? 0 };
};
/** The 16th the marquees scroll on, counted on seedFrame (their approved phase wherever drop 2 sits). */
const sixteenth = (f: number): number => Math.floor(frameOf(seedFrame(f)) / 6);

/** B · SWISS: 12-column hairlines, a cropped red "28" (cap 760), four friend groups in grid cells hopping 6 px on alternate 16ths. */
export function swissFace(f: number, L: SlashLayout): FlatContent {
  const under: Shape[] = [];
  for (let k = 0; k <= 12; k++) under.push(fRect(60 + (1380 * k) / 12, 422, 1.5, 900, INK, { alpha: 0.12 }));
  for (const v of [24, 196]) under.push(fRect(1175, v, 610, 1.5, INK, { alpha: 0.3 }));
  // The red "28" sits in the face's left half, bleeding off its left and bottom edges (it never runs under his red ω).
  const w = 760;
  const size = w / Math.max(L.display(SWISS_NUMERALS.s28), 0.1);
  const display = [fGlyph({ ch: SWISS_NUMERALS.s28, u: -70 + w / 2, v: 844 - 0.2 * size, size, color: linear(PALETTES.swiss.red) })];
  const s16 = sixteenth(f);
  // The friend groups sit in the cells over his right arm (u 900–1450, v 24–196), clear of his face.
  const jp = S28_CAST.slice(0, 4).map((c, i) => fGlyph({ ch: c.face, u: 1175, v: 48 + 42 * i - ((s16 + i) % 2 === 0 ? 6 : 0), size: 30, color: INK }));
  return { under, glyphs: { display, jp }, over: [] };
}

/** C · RISO: a pink halftone gradient over the bottom 30 %, the pink nested faces across v 140, the blue across v 700, 8 px out of register, snapping in on the landing and drifting out over 12 f. */
export function risoFace(f: number, L: SlashLayout): FlatContent {
  const land = TURNS[1].to;
  const t = f - land;
  const apart = t < -3 ? 1 : t < 0 ? 1 - (t + 3) / 3 : clamp(t / 12);
  const off = 8 * apart;
  const under: Shape[] = [];
  for (let i = 0; i < 5; i++) under.push(fRect(750, 844 - 25 - 50 * i, 1500, 50, RISO_PINK, { tint: 0.5 - 0.09 * i, screen: 10, angle: (75 * Math.PI) / 180 }));
  const size = 64;
  const pinkFace = S28_CAST[4].face;
  const blueFace = S28_CAST[5].face;
  const jp: Glyph[] = [];
  const wp = L.jp(pinkFace) * size;
  for (let u = -((sixteenth(f) * 6) % (wp + 80)); u < 1600; u += wp + 80) jp.push(fGlyph({ ch: pinkFace, u: u + wp / 2 + off, v: 140 - off / 2, size, color: RISO_PINK }));
  const wb = L.jp(blueFace) * size;
  for (let u = -60 + ((sixteenth(f) * 6) % (wb + 80)) - (wb + 80); u < 1600; u += wb + 80) jp.push(fGlyph({ ch: blueFace, u: u + wb / 2 - off, v: 700 + off / 2, size, color: RISO_BLUE }));
  return { under, glyphs: { jp }, over: [] };
}

/**
 * The LED source's colour codes (the LED pass, src/scenes/drop2Slash.ts LED_FRAG): white = a lit amber dot, [1, 1, 0] his ω on S27's
 * board (pink), [1, 0, 1] Defender's red.
 */
export const LED_CODE = { lit: [1, 1, 1] as RGB, defender: [1, 0, 1] as RGB } as const;
/** The guest in the second marquee row is infected (sheet §1.3 B): his characters in Defender's red dots, the ω amber (his). */
const GUEST_CHARS = [...LED_ROWS.second.split('  ').pop()!].filter((ch) => ch.trim() !== '').length;
function guestDots(row: Glyph[]): Glyph[] {
  return row.map((g, k) => (k >= row.length - GUEST_CHARS && g.ch !== 'ω' ? { ...g, color: LED_CODE.defender } : g));
}
/** The LED rows' heights on the face: the timecode over his head, the two marquees under his feet (he stands in front of the middle). */
const LED_ROW_V: readonly number[] = [78, 690, 790];
/** D · LED: three marquee rows (9 dots tall; the sheet's v 160 / 420 / 680 moved off his face) crawling 12 px/f, the first the real timecode; +25 % on each 16th. The white source the LED pass samples. */
export function ledFaceSource(f: number, L: SlashLayout): { content: FlatContent; flash: number } {
  const rows = [LED_ROWS.nowPlaying(f / FPS), LED_ROWS.second, LED_ROWS.third];
  // 9 dots tall: DotGothic16's kana and the faces' marks need it to read on a 12 px pitch.
  const size = 108;
  const dot: Glyph[] = [];
  rows.forEach((text, i) => {
    const w = typeset(text, L.dot).width * size;
    const period = w + 180;
    const crawl = -12 * (f - TURNS[2].from) * (i % 2 === 0 ? 1 : -1) + 400 * i;
    const start = (((crawl % period) + period) % period) - period;
    for (let u = start; u < 1600; u += period) dot.push(...(i === 1 ? guestDots(rowGlyphs(text, L.dot, facePx(u, 0)[0], facePx(0, LED_ROW_V[i])[1], size, [1, 1, 1])) : rowGlyphs(text, L.dot, facePx(u, 0)[0], facePx(0, LED_ROW_V[i])[1], size, [1, 1, 1])));
  });
  const d = frameOf(f);
  const h = HATS2.filter((x) => x <= d).pop() ?? 0;
  return { content: { under: [], glyphs: { dot }, over: [] }, flash: d - h < 3 ? 0.25 : 0 };
}

/** E · NEON: a row of tube dancers at v 700 hopping 6 px a 16th (cyan, pink), tube rules at v 120 and 760 flickering on the open hats. */
export function neonFace(f: number, L: SlashLayout): { normal: FlatContent; add: FlatContent } {
  const ghost = linear('#1C1A24');
  const cyan = linear(PALETTES.neon.cyan);
  const pink = linear(PALETTES.neon.pink);
  const d = frameOf(f);
  const oh = OPEN_HATS2.filter((x) => x <= d).pop() ?? -99;
  const flick = d - oh < 2 ? 0.45 : 1;
  const ghostU: Shape[] = [];
  const addU: Shape[] = [];
  for (const v of [120, 760]) {
    ghostU.push(fRect(750, v, 1440, 6, ghost, { r: 3 }));
    addU.push(fRect(750, v, 1440, 18, scaleRGB(pink, 0.14 * flick), { r: 9, soft: 9 }));
    addU.push(fRect(750, v, 1440, 6, scaleRGB(pink, 1.6 * flick), { r: 3 }));
  }
  const size = 60;
  const faces = S28_CAST.slice(8, 11).map((c) => c.face);
  const ghostG: Glyph[] = [];
  const addG: Glyph[] = [];
  let u = 40;
  let i = 0;
  while (u < 1500) {
    const ch = faces[i % faces.length];
    const w = L.rounded(ch) * size;
    // They hop a 16th apart, and duck on the tom at drop2 2.4 + 6 (the wind-up's notch).
    const t = f - (TURNS[3].to + 6);
    const up = ((sixteenth(f) + i) % 2 === 0 ? 6 : 0) - (t >= 0 ? 14 * Math.exp(-t / 3) : 0);
    ghostG.push(fGlyph({ ch, u: u + w / 2, v: 700, size, color: ghost }));
    addG.push(fGlyph({ ch, u: u + w / 2, v: 700 - up, size, color: scaleRGB(i % 2 === 0 ? cyan : pink, 1.5), tube: 0.012 }));
    u += w + 70;
    i++;
  }
  return { normal: { under: ghostU, glyphs: { rounded: ghostG }, over: [] }, add: { under: addU, glyphs: { rounded: addG }, over: [] } };
}

/** The faces' cream edges (3 px, 85 %) and the terminal grid's dot (#D8F5E1 at 12 % on a 12 × 22 grid from layout (0, 0)). */
export const CUBE_EDGE = { px: 3, color: PALETTES.interlude.cream, alpha: 0.85 } as const;
export const GRID = { cellW: 12, cellH: 22, dot: PALETTES.terminal.text, alpha: 0.12, ground: PALETTES.terminal.ground } as const;

/** The cube's frames: from the pop-out until S29 takes over on drop2 3.1. */
export const CUBE = { from: POP_OUT, to: POP } as const;
/**
 * Whether Drop2Slash draws the cube (not S27) at instant f: taken at the output frame, so drop2 1.4&'s whole shutter is the cube and drop2 1.4& − 1's
 * is S27 — split by the sub-frame instant, drop2 1.4& was half S27's frame and half the shrunk front (a double image).
 */
export const cubeDraws = (f: number): boolean => frameOf(f) >= CUBE.from;

// S27 SLASH, drop2 1.1–2.1 − 1, the drop2 1.1 seam (E6's pop) and the pop-out (builder A · SLASH; build sheet notes/d2build/sheet.md §3.4,
// §3.5, §4.0, §4.2 rows drop2 1.1–1.4&, §5.0, §5.2, §5.3, §5.4, §9 H0). Pure (no three): Drop2Slash (src/scenes/drop2Slash.ts) turns it
// into pixels.
//   - The camera: S27's flow (zoom 1.00 → 1.06, roll −1.2° → +1.2°), the pop-out's pull-back into S28's flow, S28's flow and the whip
//     that hands the camera back at identity on drop2 3.1 (R12). Region 0 (the break's world going on) also unwinds the break's own camera
//     (zoom 1.10, roll −4°) on a launch keyed at the break's last frame.
//   - The hero: caught from the break's real last-frame pose (src/shots/breakLaunch.ts heroChars / brows, read-only) and launched through the
//     hole onto the S27 master (S27_MASTER); his つ arms fold into the brackets, the speed lines streak off, the band's copies snap home
//     into him and the peg pops; the brows pop off and the arms pop in on drop2 1.2, ＼ ／ on drop2 1.4; the ω sings the hook.
//   - The blades C1–C5 (BLADE_LINES): their tips (the launch curve over 3 f), the region each pixel belongs to (regionAt: the shader's
//     twin), the shear of each new piece, the seams (white-hot 4 px for 6 f, then 2 px of the world's accent), the rim glints.
//   - One quiet motif per region: the terminal's log column, the Swiss "27", hairlines and friend, the neon tube rules, the Riso
//     halftone and marks, the LED board, the break's violet world (blocks unshearing, confetti flung, read from breakLaunch.ts). From
//     drop2 1.3 the log and the friend fade out (panelTexture; iteration 2, ruling 11): his face across the worlds is the subject.
//   - E6's pop: the hole in the break's soap film (src/shots/breakFilm.ts, read-only) opening from its black spot past every corner by
//     drop2 1.1 + 6 with a ragged rim, ≈ 2000 flat lens droplets born as the rim passes them, the E5 window's glyphs torn off and flung at the
//     camera, its backing collapsing.
// Layout px (1920 × 1080, origin top-left, y down) unless a name says engine; angles in degrees clockwise (the break's convention).
import { HERO2, DROP2_S27_LOG, LED_ROWS, SWISS_NUMERALS } from '../content/drop2.ts';
import { S27_CAST, S28_CAST } from '../content/castDrop2.ts';
import { type RGB, linear, mixRGB, scaleRGB, transmit } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp, smoothstep } from '../engine/math.ts';
import { hash, noise1 } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import { typeset, type Advance } from '../engine/typeset.ts';
import { type Look, mixLook } from '../engine/types.ts';
import { punch } from '../motion/hit.ts';
import { BREAK_END, MATCH_CUT } from '../score/break.ts';
import { BLADES, DROP2_START, HOOK2, OPEN_HATS2, HATS2, POP, POP_OUT, RIMS2, TURNS, WHIP } from '../score/drop2.ts';
import { seedFrame } from '../score/film.ts';
import { filmAt, filmPoint, filmText, project, type FilmState } from './breakFilm.ts';
import { type BlockOut, bandAt, bandCord, blocksAt, brows as breakBrows, confettiV2, forkAt, heroChars as breakHeroChars, launchCam, pegAt, pegParts, windowAt } from './breakLaunch.ts';
import { BAR25_CONFETTI, BREAK_LOOK, BREAK_PALETTE, type BreakCam, frameOf, fromScreen, rotOf, rotate, toEngine, toScreen } from './breakShared.ts';
import { BLADE_LINES, COLOR_LAW_V2, PALETTES, type Point, S27_MASTER, SWISS_OMEGA, drop2Segment, flow, pop, springL, whipSlam } from './drop2Shared.ts';

// ——— Frames ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Drop2Slash draws drop2 1.1–3.1 − 1: the pop (to drop2 1.2 − 1), S27 (to drop2 2.1 − 1), the pop-out (drop2 1.4&–2.1) and S28 (drop2 2.1–3.1 − 1). */
export const SLASH = { from: DROP2_START, to: POP } as const;
/** The break's last frame: everything the seam catches is read there. */
export const SEAM = DROP2_START - 1;
/** The pop's last frame: droplets and torn glyphs are gone by drop2 1.2 − 1. */
export const POP_END = DROP2_START + 24;
/** The film's rim passes the farthest corner by drop2 1.1 + 6. */
export const RIM_GONE = DROP2_START + 6;
/** S27 ends where the cube's front lands. */
export const S27_END = TURNS[0].to;

/** Every atlas key's characters and whole strings (faces with marks are drawn whole, as one key). */
const uniq = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');
export const SLASH_ATLAS: Readonly<Record<'rounded' | 'jp' | 'mono' | 'display' | 'dot', readonly string[]>> = {
  // (With the break's real last frame, read live: its face, paws and brows are drawn by drop 2 through the seam.)
  rounded: [...uniq([HERO2.slingshot, HERO2.base, ...HERO2.brows, ...HERO2.arms, HERO2.jump, HERO2.danceL, HERO2.danceR, ...[...breakHeroChars(DROP2_START - 1, { advance: () => 0.6 }), ...breakBrows(DROP2_START - 1, { advance: () => 0.6 })].map((c) => c.ch)]), HERO2.base, ...S28_CAST.slice(8, 11).map((c) => c.face)],
  jp: [...uniq([HERO2.base, HERO2.jump, HERO2.danceL, HERO2.danceR]), S27_CAST[2].face, ...S28_CAST.slice(0, 6).map((c) => c.face)],
  mono: uniq([...DROP2_S27_LOG, ...windowAt(DROP2_START - 1).glyphs.map((g) => g.ch), '█·', '0123456789']),
  display: [SWISS_NUMERALS.s27, SWISS_NUMERALS.s28],
  dot: uniq([LED_ROWS.nowPlaying(44.25), '0123456789:.', LED_ROWS.second, LED_ROWS.third, HERO2.base, HERO2.danceL, HERO2.danceR]),
};

/** What only the browser can measure: each font's advances (ems). Tests pass a fake. */
export type SlashLayout = { rounded: Advance; jp: Advance; mono: Advance; display: Advance; dot: Advance };
/** The atlases drop 2's slash scene builds (FlatContent glyph keys). */
export type AtlasKey = keyof SlashLayout;

const hex = (h: string, k = 1): RGB => linear(h, k);
const T = PALETTES.terminal;
const INK = hex('#111111');

// ——— Cameras ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** A camera about the frame centre (the break's BreakCam): screen = R(roll)·zoom·(p − (960, 540)) + (960, 540). */
const cam = (zoom: number, roll: number): BreakCam => ({ zoom, cx: 960, cy: 540, roll, dy: 0 });
/**
 * S27's flow (sheet §5.2): zoom 1.00 → 1.06 and roll −1.2° → +1.2° over the bar — at an even speed (not the sheet's sine), so the
 * frame is already drifting in the held moments after the pop instead of easing out of a standstill.
 */
const s27Flow = (f: number): [number, number] => {
  const u = clamp((f - DROP2_START) / 96);
  return [1 + 0.06 * u, -1.2 + 2.4 * u];
};
/** The blade kicks S27's camera takes itself (the beats; C4 rides the "and"). */
const KICK_POP_AT: readonly number[] = [BLADES[1], BLADES[2], BLADES[4]];
/** How far S27's camera pushes in on a blade kick (a share of its zoom). */
export const KICK_POP = 0.019;
/**
 * S27's own hit on each blade kick (iteration 3; verify: on drop2 1.4 + 1 the centre's change out-did the kick's — the rig's punch, shared with
 * the intro, the build and drop 1, starts the frame after the kick by design): the camera pushes in KICK_POP between the shutters of the frame before and the
 * kick's (k − ¾ … k − ¼, never 1 % in a quarter frame), holds through the kick's shutter and hands over to the rig's punch as it rises
 * (1 − its curve), so the push lands on the kick and the rig carries it on. 0 → 1 → 0, a share of KICK_POP.
 */
export function kickPop(f: number): number {
  let v = 0;
  for (const k of KICK_POP_AT) {
    const t = f - k;
    if (t <= -0.75 || t >= 1.5) continue;
    v += t < -0.25 ? smoothstep(-0.75, -0.25, t) : t <= 0 ? 1 : 1 - punch(f, k);
  }
  return v;
}

/** S28's flow: zoom 1.00 → 1.04 and roll −0.5° → +0.5° from the landing on drop2 2.1 to the whip on drop2 2.4&. */
const s28Flow = (f: number): [number, number] => {
  const u = (f - TURNS[0].to) / (WHIP.from - TURNS[0].to);
  return [1 + 0.04 * flow(u), -0.5 * Math.cos(Math.PI * clamp(u))];
};

/**
 * Drop2Slash's camera at instant f: S27's flow; over the pop-out (launch keyed at drop2 1.4& − 1) it pulls back into S28's flow, so the frame
 * shrinking into the cube's front and the camera read as one move; S28's flow; the whip (slammed onto drop2 3.1 with the cube, whipSlam)
 * returns it to zoom 1, roll 0 on drop2 3.1, where S29 starts at identity (R12).
 */
export function slashCam(f: number): BreakCam {
  // The pull-back's launch is keyed at drop2 1.4& − 1 (springL is 0 up to there), so the blend starts there: no step where the cube takes over.
  if (f < POP_OUT - 1) {
    const [z, r] = s27Flow(f);
    return cam(z * (1 + KICK_POP * kickPop(f)), r);
  }
  if (f < WHIP.from) {
    const [z1, r1] = s28Flow(f);
    if (f >= S27_END + 12) return cam(z1, r1);
    const [z0, r0] = s27Flow(f);
    const k = springL(f, POP_OUT);
    return cam(Math.exp(lerp(Math.log(z0), Math.log(z1), k)), lerp(r0, r1, k));
  }
  const [z, r] = s28Flow(WHIP.from);
  const u = whipSlam(f, WHIP.from, WHIP.to);
  return cam(lerp(z, 1, u), lerp(r, 0, u));
}

/**
 * The break's own camera on its last frame, read live (breakLaunch.ts launchCam: v04's zoom 1.10, roll −4° while the break held v04's
 * frame; its v2 ending's frontal Z 1.05, roll 0 — break-sheet2 §7.3): region 0 starts from it.
 */
const BREAK_CAM = launchCam(SEAM);
/** How far region 0's own camera still is from S27's (launch keyed at the break's last frame, settled by drop2 1.1&): 1 on the break's last frame, 0 once settled. */
const unwind = (f: number): number => 1 - springL(f, DROP2_START);

/** Region 0's camera: S27's (or `base`), times the break's zoom and roll unwinding (L keyed at the break's last frame, sheet §4.0). */
export function r0Cam(f: number, base: BreakCam = slashCam(f)): BreakCam {
  const w = unwind(f);
  const ref = slashCam(SEAM);
  return cam(base.zoom * (BREAK_CAM.zoom / ref.zoom) ** w, base.roll + (BREAK_CAM.roll - ref.roll) * w);
}

/** A layout point seen through `c` (layout px). */
export const seen = (c: BreakCam, p: Point): [number, number] => toScreen(c, p[0], p[1]);

// ——— The hero ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

export type HeroPart = 'open' | 'eyeL' | 'mouth' | 'eyeR' | 'close' | 'brow' | 'arm' | 'speed' | 'tsu';
/** A character of the hero in layout px: its placement point, size (px an em), horizontal stretch, rotation (° clockwise), alpha. */
export type HeroChar = { ch: string; part: HeroPart; x: number; y: number; size: number; stretch: number; rot: number; alpha: number };

const MASTER_CHARS: readonly { ch: string; part: HeroPart }[] = [
  { ch: '(', part: 'open' },
  { ch: '•', part: 'eyeL' },
  { ch: 'ω', part: 'mouth' },
  { ch: '•', part: 'eyeR' },
  { ch: ')', part: 'close' },
];
/**
 * The master's placement line: S27_MASTER.omegaPlace (drop2Shared.ts, one definition with the seam's heroSeam). The brackets' ink sits
 * 22/360 em under the placement point (the break's measured M PLUS Rounded ExtraBold, breakShared.ts HERO_REST: "(" 562 and ω 577 for an
 * em-box centre 540 at em 360), so the master's brackets centre on y 540.
 */
const MASTER_Y = S27_MASTER.omegaPlace[1];

/** The S27 master's characters (layout px, placement points): (•ω•) 1240 px wide about x 960, the brackets' ink centred on y 540. */
export function masterChars(adv: Advance): { ch: string; part: HeroPart; x: number; y: number }[] {
  const line = typeset(MASTER_CHARS.map((c) => c.ch), adv);
  const em = S27_MASTER.em;
  const left = S27_MASTER.centre[0] - (line.width * em) / 2;
  return MASTER_CHARS.map((c, i) => ({ ...c, x: left + line.chars[i].x * em, y: MASTER_Y }));
}

/** The break's last-frame face ─=≡Σ((( つ•ω•)つ (v04), character by character (no spaces), and the part each becomes on the S27 master. */
const SEAM_PARTS: readonly HeroPart[] = ['speed', 'speed', 'speed', 'speed', 'speed', 'speed', 'open', 'tsu', 'eyeL', 'mouth', 'eyeR', 'close', 'tsu'];
/**
 * The part a break character becomes, when the break names it (its v2 last frame, break-sheet2 §7.3: (•̀ω•́) with っ っ flat on the
 * film): his paws fold into his brackets as the zoom's つ did; a stray mark or arm streaks off like the speed lines.
 */
const SEAM_PART_OF: Readonly<Record<string, HeroPart>> = { open: 'open', eyeL: 'eyeL', mouth: 'mouth', eyeR: 'eyeR', close: 'close', brow: 'brow', tsu: 'tsu', paw: 'tsu', speed: 'speed', arm: 'speed', mark: 'speed' };

/** One of his characters on the break's last frame, as seen on screen: placement point, apparent size, stretch, rotation. */
type SeamChar = { ch: string; part: HeroPart; sx: number; sy: number; size: number; stretch: number; rot: number };

/** His characters and brows on the break's last frame, on screen (the break's camera at the break's last frame; its rig is identity there). */
export function seamChars(adv: Advance): SeamChar[] {
  const L = { advance: adv };
  const z = BREAK_CAM.zoom;
  const at = (c: { ch: string; x: number; y: number; size: number; stretch: number; rot?: number }, part: HeroPart): SeamChar => {
    const [sx, sy] = toScreen(BREAK_CAM, c.x, c.y);
    return { ch: c.ch, part, sx, sy, size: c.size * z, stretch: c.stretch, rot: BREAK_CAM.roll + (c.rot ?? 0) };
  };
  const named = (c: object): string | undefined => ('part' in c ? String((c as { part: unknown }).part) : undefined);
  const face = breakHeroChars(SEAM, L).map((c, i) => at(c, SEAM_PART_OF[named(c) ?? ''] ?? SEAM_PARTS[i] ?? 'speed'));
  const brows = breakBrows(SEAM, L).map((c) => at(c, 'brow'));
  return [...face, ...brows];
}

/** The ω sings the hook: scale-y +6 % on each note of S27 (attack 2 f), held through a long note, released over 4 f. */
export function mouthPulse(f: number): number {
  let v = 0;
  for (const n of HOOK2) {
    if (n.at >= S27_END || n.at > f + 2) continue;
    const t = f - n.at;
    const hold = Math.max(0, n.len * 6 - 6);
    const env = t < 0 ? 0 : t < 2 ? t / 2 : t < 2 + hold ? 1 : Math.max(0, 1 - (t - 2 - hold) / 4);
    v = Math.max(v, env);
  }
  return 1 + 0.06 * v;
}

/** The arms' wave on the open hats: ±12° over an 8th. */
const armWave = (f: number): number => {
  let v = 0;
  for (const oh of OPEN_HATS2) if (f >= oh && f < oh + 12) v = Math.sin((Math.PI * (f - oh)) / 12);
  return 12 * v;
};

/** He nods on each open hat once settled (the & of every beat): down 7 px over 3 f (cubic-out), back up by + 9 (sine). */
export function nod(f: number): number {
  let v = 0;
  for (const oh of OPEN_HATS2) {
    const t = f - oh;
    if (oh < DROP2_START + 12 || oh >= S27_END - 12 || t < 0 || t >= 9) continue;
    v = t < 3 ? 1 - (1 - t / 3) ** 3 : 0.5 + 0.5 * Math.cos((Math.PI * (t - 3)) / 6);
  }
  return 7 * v;
}

/** The arms of S27: ヽ ノ pop in on drop2 1.2 (with the brows popping off), ＼ ／ on drop2 1.4 (sheet §3.5, §4.2). */
function arms(f: number, em: number): HeroChar[] {
  const out: HeroChar[] = [];
  const set = [...S27_MASTER.arms].reverse().find((a) => frameOf(f) >= a.from);
  if (!set) return out;
  const s = pop(f, set.from);
  const wave = armWave(f);
  [set.left, set.right].forEach((ch, i) => {
    const [x, y] = set.at[i];
    out.push({ ch, part: 'arm', x, y, size: 0.9 * em * s, stretch: 1, rot: (i === 0 ? -1 : 1) * wave, alpha: clamp((f - set.from + 1.25) / 1) });
  });
  return out;
}

/**
 * The hero at instant f in layout px (seen through slashCam(f)): from the break's last-frame pose (on screen) launched onto the S27 master
 * (L keyed at the break's last frame): positions, size, squash and roll all on the one curve. The speed lines streak off left (−400 px in 3 f), the
 * つ arms fold into the brackets (3 f), the brows ride along until drop2 1.2 and pop off; then the arms; the ω sings the hook.
 */
export function heroS27(f: number, adv: Advance): HeroChar[] {
  const c = slashCam(f);
  const p = springL(f, DROP2_START);
  const em = S27_MASTER.em;
  const master = masterChars(adv);
  const byPart = new Map(master.map((m) => [m.part, m]));
  const out: HeroChar[] = [];
  const mouth = mouthPulse(f);
  const dip = nod(f);
  const eyes = master.filter((m) => m.part === 'eyeL' || m.part === 'eyeR');
  const seam = seamChars(adv);
  // Each brow keeps the break's offset from its eye (in ems): its ink sits high in its em box, so the placement point is near the eye.
  const seamEyes = seam.filter((s) => s.part === 'eyeL' || s.part === 'eyeR');
  let browK = 0;
  for (const s of seam) {
    // Where the break's character is, in this camera's layout, and its size and rotation in this layout.
    const [lx, ly] = fromScreen(c, s.sx, s.sy);
    const size0 = s.size / c.zoom;
    const rot0 = s.rot - c.roll;
    if (s.part === 'speed') {
      const q = clamp((f - SEAM) / 3);
      if (q >= 1) continue;
      const [dx, dy] = rotate(-400 * q, 0, -c.roll);
      out.push({ ch: s.ch, part: 'speed', x: lx + dx / c.zoom, y: ly + dy / c.zoom, size: size0, stretch: s.stretch, rot: rot0, alpha: 1 - q * q });
      continue;
    }
    if (s.part === 'tsu') {
      const q = ease.inCubic(clamp((f - SEAM) / 3));
      if (q >= 1) continue;
      const into = byPart.get(s.sx < 960 ? 'open' : 'close')!;
      out.push({ ch: s.ch, part: 'tsu', x: lerp(lx, into.x, q), y: lerp(ly, into.y, q), size: size0 * (1 - q), stretch: s.stretch, rot: rot0, alpha: 1 });
      continue;
    }
    if (s.part === 'brow') {
      const eye = eyes[browK];
      const from = seamEyes[browK++];
      const gone = browsOff(f);
      if (gone.alpha <= 0) continue;
      const [ox, oy] = rotate(s.sx - from.sx, s.sy - from.sy, -s.rot);
      const tx = eye.x + (ox / s.size) * em;
      const ty = eye.y + (oy / s.size) * em - gone.lift;
      out.push({ ch: s.ch, part: 'brow', x: lerp(lx, tx, p), y: lerp(ly, ty, p), size: lerp(size0, em, p) * gone.scale, stretch: lerp(s.stretch, 1, p), rot: lerp(rot0, 0, p), alpha: gone.alpha });
      continue;
    }
    const m = byPart.get(s.part)!;
    const sy = s.part === 'mouth' ? mouth : 1;
    out.push({ ch: m.ch, part: s.part, x: lerp(lx, m.x, p), y: lerp(ly, m.y, p) + dip, size: lerp(size0, em, p) * sy, stretch: lerp(s.stretch, 1, p) / sy, rot: lerp(rot0, 0, p), alpha: 1 });
  }
  out.push(...arms(f, em));
  return out;
}

/** The brows pop off on drop2 1.2: up 1.15 and lifting, gone in 4 f. */
function browsOff(f: number): { scale: number; lift: number; alpha: number } {
  const t = f - S27_MASTER.brows.until;
  if (t < 0) return { scale: 1, lift: 0, alpha: 1 };
  if (t >= 4) return { scale: 0, lift: 0, alpha: 0 };
  return { scale: t < 1.5 ? 1 + (0.15 * t) / 1.5 : 1.15 * (1 - (t - 1.5) / 2.5), lift: 60 * ease.outCubic(t / 4), alpha: 1 };
}

/** Where his ω is on screen at instant f (layout px through the camera): what the seam test measures against the break's. */
export function omegaScreen(f: number, adv: Advance): [number, number] {
  const w = heroS27(f, adv).find((h) => h.part === 'mouth')!;
  return seen(slashCam(f), [w.x, w.y]);
}

/** His face width (bracket placement to bracket placement plus a bracket advance) on screen at instant f. */
export function faceWidthScreen(f: number, adv: Advance): number {
  const h = heroS27(f, adv);
  const o = h.find((x) => x.part === 'open')!;
  const c = h.find((x) => x.part === 'close')!;
  const a = seen(slashCam(f), [o.x, o.y]);
  const b = seen(slashCam(f), [c.x, c.y]);
  return Math.hypot(b[0] - a[0], b[1] - a[1]) + adv('(') * (o.size * o.stretch);
}

// ——— The band snapping home, the peg popping (region 0, drop2 1.1–1.1 + 4) ——————————————————————————————————————————————————————————

const COPY_FILL: Readonly<Record<string, RGB>> = { cream: BREAK_PALETTE.cream, yellow: BREAK_PALETTE.yellow, mint: BREAK_PALETTE.mint, coral: BREAK_PALETTE.coral };

/** Copy k of the band reaches his body on drop2 1.1 + ⌈3k/8⌉ (the copies nearest the peg last, on drop2 1.1 + 3) and vanishes into him. */
export const copyHome = (k: number): number => DROP2_START + Math.ceil((3 * k) / 8);

/**
 * The band in layout px (seen through slashCam): on the break's last frame the break has strung its copies as a chain of ")" brackets from his ")" to the
 * peg (breakLaunch.ts bandAt: each copy's bracket at (bx, by), its folded core at (x, y) shrunk by `core`). On the drop the band snaps:
 * each bracket eases in (cubic) onto his own ")" and vanishes into it on its home frame, the copies nearest the peg last; any core
 * still showing rides along. They leave as the break left them on screen: turned across the cord (the turn easing out with the
 * flight) and in the break's 5 px ink outlines seen through its camera (5.5 px at its zoom 1.10); the band's fills.
 */
export function bandCopies(f: number, adv: Advance): Glyph[] {
  if (f >= copyHome(8)) return [];
  const c = slashCam(f);
  const hero = heroS27(f, adv);
  const close = hero.find((h) => h.part === 'close')!;
  const omega = hero.find((h) => h.part === 'mouth')!;
  const out: Glyph[] = [];
  for (const k of [...bandAt(SEAM)].reverse()) {
    if (k.k > 8 || f >= copyHome(k.k)) continue;
    const u = ease.inCubic(clamp((f - SEAM) / (copyHome(k.k) - SEAM)));
    const size = ((360 * k.sy * k.scale * BREAK_CAM.zoom) / c.zoom) * (1 - 0.3 * u);
    const color = COPY_FILL[k.color] ?? BREAK_PALETTE.cream;
    const look = { stretch: k.sx / k.sy, rot: BREAK_CAM.roll - c.roll + k.rot * (1 - u), color, alpha: 1 - u * u, outline: (k.outline * BREAK_CAM.zoom) / c.zoom / Math.max(size, 1), outlineColor: INK };
    const at = (x: number, y: number, to: { x: number; y: number }): [number, number] => {
      const [sx, sy] = toScreen(BREAK_CAM, x, y);
      const [lx, ly] = fromScreen(c, sx, sy);
      return [lerp(lx, to.x, u), lerp(ly, to.y, u)];
    };
    const core = 'core' in k ? (k as { core: number }).core : 1;
    if (core > 0.02) {
      const [x, y] = at(k.x, k.y, omega);
      out.push(lGlyph({ ...look, ch: HERO2.base, x, y, size: size * core }));
    }
    if ('bx' in k) {
      const b = k as unknown as { bx: number; by: number };
      const [x, y] = at(b.bx, b.by, close);
      out.push(lGlyph({ ...look, ch: ')', x, y, size }));
    }
  }
  return out;
}

/**
 * The anchor post pops 1 → 1.2 → 0 over drop2 1.1–1.1 + 4 (region 0's world, its own camera; the scene draws it in front of the links, as the
 * break draws it over everything): the break's own post (breakLaunch.ts pegParts: its shadow, the ink post seen from the side, the
 * cream ring and highlight), scaled about its centre and mapped as launchAt maps it. Engine shapes.
 */
export function pegShapes(f: number): Shape[] {
  const peg = pegAt(SEAM);
  if (!peg) return [];
  const t = f - SEAM;
  const s = t <= 0 ? 1 : t < 2 ? 1 + 0.1 * t : Math.max(0, 1.2 * (1 - (t - 2) / 3));
  if (s <= 0.01) return [];
  return pegParts({ ...peg, scale: s }).map((d) => {
    const [x, y] = toEngine(d.x, d.y);
    return { kind: 'rect', x, y, w: d.w, h: d.h, r: d.r, color: d.color === 'ink' ? BREAK_PALETTE.ink : BREAK_PALETTE.cream };
  });
}

// ——— Region 0: the break's violet world going on (its own camera, r0Cam) ———————————————————————————————————————————————————

/** A shape placed in layout px (rot ° clockwise) as an engine shape. */
const lShape = (s: Omit<Shape, 'x' | 'y' | 'rot'> & { x: number; y: number; rot?: number }): Shape => {
  const [x, y] = toEngine(s.x, s.y);
  return { ...s, x, y, rot: rotOf(s.rot ?? 0) };
};
/** A glyph placed in layout px (rot ° clockwise) as an engine glyph. */
export const lGlyph = (g: Omit<Glyph, 'x' | 'y' | 'rot'> & { x: number; y: number; rot?: number }): Glyph => {
  const [x, y] = toEngine(g.x, g.y);
  return { ...g, x, y, rot: rotOf(g.rot ?? 0) };
};
/** A capsule from (x0, y0) to (x1, y1) in layout px. */
const lSeg = (x0: number, y0: number, x1: number, y1: number, w: number, color: RGB, alpha = 1, soft = 0): Shape => {
  const [ax, ay] = toEngine(x0, y0);
  const [bx, by] = toEngine(x1, y1);
  return { kind: 'segment', x: (ax + bx) / 2, y: (ay + by) / 2, w: Math.hypot(bx - ax, by - ay) + w, h: w, rot: Math.atan2(by - ay, bx - ax), color, alpha, ...(soft > 0 ? { soft } : {}) };
};

/**
 * Region 0's world (engine units, seen through r0Cam): the violet ground, break bar 5's blocks unshearing −10° → 0° (L keyed at the break's last frame) and
 * breathing ±1°, their hard shadows, the confetti flung 30 px right (S on drop2 1.1), the band's cord as the break leaves it (bandCord on
 * the break's last frame: ink, ≈ 6.4 px, from the grip in his fist to the post; drawn behind the links until the last copy is home) and the post
 * (pegShapes). `blocks` are drawn through a shear about the world origin (engine x' = x − shear·y), so their centres are pre-moved like
 * the break's.
 */
export function region0(f: number): { blocks: Shape[]; shear: number; confetti: Shape[]; cord: Shape[]; peg: Shape[] } {
  const base0 = blocksAt(SEAM);
  // The break's v2 last frame has no post and its blocks are the fork's (break-sheet2 §7.3): it springs apart and falls away (forkFall).
  const base = pegAt(SEAM) ? base0 : { ...base0, blocks: base0.blocks.flatMap((b) => forkFall(f, b)) };
  const shear = base.shear * (1 - springL(f, DROP2_START));
  const sh = (x: number, y: number): [number, number] => {
    const [ex, ey] = toEngine(x, y);
    return [ex + shear * ey, ey];
  };
  const breath = Math.sin((2 * Math.PI * (f - DROP2_START)) / 96);
  const blocks: Shape[] = [];
  for (const b of base.blocks) {
    const [sx, sy] = sh(b.x + 12, b.y + 12);
    blocks.push({ kind: 'rect', x: sx, y: sy, w: b.w, h: b.h, r: b.r, rot: rotOf(b.rot + breath), color: INK });
  }
  for (const b of base.blocks) {
    const [bx, by] = sh(b.x, b.y);
    blocks.push({ kind: 'rect', x: bx, y: by, w: b.w, h: b.h, r: b.r, rot: rotOf(b.rot + breath), color: BREAK_PALETTE[b.color], outline: 6, outlineColor: INK });
  }
  const c = bandCord(SEAM);
  const cord = c && f < copyHome(8) ? [lSeg(c.x0, c.y0, c.x1, c.y1, c.w, BREAK_PALETTE.ink)] : [];
  return { blocks, shear, confetti: confetti(f), cord, peg: pegShapes(f) };
}

/**
 * The break's fork on drop2 1.1 (its v2 last frame; design 35.1: "the fork's prongs spring apart ±40 px (L) and fall away"): each prong
 * turns about the crotch so its tip opens 40 px outward (L keyed on the drop), and from drop2 1.1 + 1 the whole fork falls (gravity
 * 6 px/f², the prongs tumbling apart 0.8°/f), below the frame by + 16. A block of the fork in, the block where it is at f out (none once
 * it has left the frame).
 */
export const FORK_FALL = { open: 40, gravity: 6, spin: 0.8, gone: 16 } as const;
/** The confetti's fling on the pop (R1-T13): 900 px outward by + 16 on a u^1.6 launch, plus the fork's fall. */
export const CONFETTI_OUT = { reach: 900, power: 1.6 } as const;
export function forkFall(f: number, b: BlockOut): BlockOut[] {
  const t = f - DROP2_START;
  if (t >= FORK_FALL.gone) return [];
  const k = forkAt(SEAM);
  const [cx, cy] = k.crotch;
  const side = b.color === 'yellow' ? -1 : b.color === 'cream' ? 1 : 0;
  const tip = side < 0 ? k.U : k.L;
  const a = side === 0 ? 0 : side * (FORK_FALL.open / Math.hypot(tip[0] - cx, tip[1] - cy)) * springL(f, DROP2_START);
  const fall = t > 1 ? 0.5 * FORK_FALL.gravity * (t - 1) ** 2 : 0;
  const spin = t > 1 ? side * FORK_FALL.spin * (t - 1) : 0;
  const [rx, ry] = [b.x - cx, b.y - cy];
  const x = cx + rx * Math.cos(a) - ry * Math.sin(a);
  const y = cy + rx * Math.sin(a) + ry * Math.cos(a) + fall;
  return [{ ...b, x, y, rot: b.rot + (a * 180) / Math.PI + spin }];
}

/**
 * The confetti as the break leaves them on its last frame, flung 30 px right on the drop (S). The v2 ending (no post): its own confetti
 * (breakLaunch.ts confettiV2: bar 8's four, drifting 0.4 px/f down and turning 0.5°/f) go on drifting and turning where its last frame
 * left them (break-sheet2 §13.5 H-1; sheet §1.3 Q). v04's: break bar 5's four, drifted 120 px left.
 */
function confetti(f: number): Shape[] {
  if (!pegAt(SEAM)) {
    // Round 1 (R1-T13, row Q's logged alternative): the pop flings the break's confetti out of the frame like the fork's prongs — outward
    // from his ω (the frame's centre), accelerating, falling at FORK_FALL's gravity, gone by + 16 — so W1's one line reads clean (the
    // mint squiggle crossed `[ OK ] party resumed · running as root` at local 6–60).
    const t = Math.max(0, f - DROP2_START);
    if (t >= FORK_FALL.gone) return [];
    const out = CONFETTI_OUT.reach * (t / FORK_FALL.gone) ** CONFETTI_OUT.power;
    const fall = t > 1 ? 0.5 * FORK_FALL.gravity * (t - 1) ** 2 : 0;
    return confettiV2(f).map((c) => {
      const n = Math.hypot(c.x, c.y) || 1;
      return { ...c, x: c.x + (c.x / n) * out, y: c.y + (c.y / n) * out - fall };
    });
  }
  const out: Shape[] = [];
  const shadow: Shape[] = [];
  const dx = -120 + 30 * snapS(f - DROP2_START);
  // Turning since the break's match cut, counted through the break's last drawn frame on into drop 2 (its held bars between are one frozen frame).
  const turn = 0.5 * (f - DROP2_START + BREAK_END - MATCH_CUT);
  BAR25_CONFETTI.forEach(([cx, cy], i) => {
    const x = cx + dx;
    const a = (turn * (i % 2 === 0 ? 1 : -1) * Math.PI) / 180;
    const pt = (u: number, v: number): [number, number] => [x + Math.cos(a) * u - Math.sin(a) * v, cy + Math.sin(a) * u + Math.cos(a) * v];
    const line = (pts: [number, number][], color: RGB) => {
      for (let j = 1; j < pts.length; j++) {
        const [x0, y0] = pt(...pts[j - 1]);
        const [x1, y1] = pt(...pts[j]);
        shadow.push(lSeg(x0 + 6, y0 + 6, x1 + 6, y1 + 6, 20, INK));
        out.push(lSeg(x0, y0, x1, y1, 20, INK));
      }
      for (let j = 1; j < pts.length; j++) {
        const [x0, y0] = pt(...pts[j - 1]);
        const [x1, y1] = pt(...pts[j]);
        out.push(lSeg(x0, y0, x1, y1, 12, color));
      }
    };
    if (i === 0) {
      shadow.push(lShape({ kind: 'ellipse', x: x + 6, y: cy + 6, w: 40, h: 40, color: INK }));
      out.push(lShape({ kind: 'ellipse', x, y: cy, w: 40, h: 40, color: INK }));
    } else if (i === 1) {
      line(Array.from({ length: 19 }, (_, j) => [-75 + (150 * j) / 18, 12 * Math.sin((2 * Math.PI * 3 * j) / 18)] as [number, number]), BREAK_PALETTE.mint);
    } else if (i === 2) {
      line([[-65, 16], [-32.5, -16], [0, 16], [32.5, -16], [65, 16]], BREAK_PALETTE.yellow);
    } else {
      const rot = 30 + (a * 180) / Math.PI;
      shadow.push(lShape({ kind: 'rect', x: x + 6, y: cy + 6, w: 120, h: 44, r: 22, rot, color: INK }));
      out.push(lShape({ kind: 'rect', x, y: cy, w: 120, h: 44, r: 22, rot, color: BREAK_PALETTE.cream, outline: 4, outlineColor: INK }));
    }
  });
  return [...shadow, ...out];
}

/** S, the snap, on frames since its event: cubic-out over 6 f to 104 %, back to 100 % over 2 f. */
const snapS = (t: number): number => (t <= 0 ? 0 : t < 6 ? 1.04 * (1 - (1 - t / 6) ** 3) : t < 8 ? lerp(1.04, 1, (t - 6) / 2) : 1);

// ——— The hero in each world's dress (S27_TREATMENTS) ————————————————————————————————————————————————————————————————————————————

/** The flat dresses (the terminal's ASCII fill and the LED's dots are cell passes over the hero's mask). */
export type FlatDress = 'interlude' | 'swiss' | 'neon' | 'riso' | 'mask';
/** Glyphs per blend layer, keyed by atlas. */
export type Dressed = { normal: Glyph[]; add: Glyph[]; multiply: Glyph[] };

const RISO_PINK = transmit(hex(PALETTES.riso.pink), 0.85);
const RISO_BLUE = transmit(hex(PALETTES.riso.blue), 0.85);
/** In the Swiss world his black is knocked out of the red "27" by a 10 px paper outline (an overprint trick; on the paper it vanishes). */
const SWISS_KNOCKOUT = 10;
/**
 * His ω on the Swiss paper (sheet §1.3 C: red that is not the antivirus's becomes another colour): over its paper
 * knock-out, amber with a 2 px #111 keyline (SWISS_OMEGA). As built it was Swiss red; only the ω's own box changes.
 */
export const swissOmega = (g: Glyph, size: number): Glyph[] =>
  COLOR_LAW_V2 ? [{ ...g, color: INK }, { ...g, color: hex(SWISS_OMEGA.fill), outline: SWISS_OMEGA.keyline.px / size, outlineColor: hex(SWISS_OMEGA.keyline.color) }] : [g];
const SWISS_PAPER = hex(PALETTES.swiss.ground);
/** The neon tube's thinning (ems): drop 1's club tubes (src/shots/lines.ts TUBE); thin strokes keep their whole width. */
const TUBE = 0.018;
const THIN = /[─-╿｡-ﾟヽ〜~︵ノ＼／/|]/u;
export const tubeOf = (ch: string): number => (THIN.test(ch) ? 0.001 : TUBE);

/**
 * The hero's characters (layout px) in one world's dress, faded by `alpha`: interlude = amber fill, 8 px ink outline, (14, 14) ink
 * shadow; swiss = solid ink, the ω amber with a #111 keyline (swissOmega); neon = amber tubes (added light, white-hot cores); riso = the pink plate and the blue plate
 * offset (−6, +4) multiplied; mask = white everywhere, the ω's mask in green (the cell passes read it: R = his coverage, G = the ω).
 */
export function dressHero(chars: readonly HeroChar[], dress: FlatDress, alpha = 1, f = Infinity): Dressed {
  const out: Dressed = { normal: [], add: [], multiply: [] };
  const neon = neonIgnite(f);
  const apart = plateApart(f);
  if (alpha <= 0.001) return out;
  for (const h of chars) {
    const a = h.alpha * alpha;
    if (a <= 0.001 || h.size <= 0.5) continue;
    const base = { ch: h.ch, x: h.x, y: h.y, size: h.size, stretch: h.stretch, rot: h.rot };
    const isMouth = h.part === 'mouth';
    if (dress === 'mask') out.normal.push(lGlyph({ ...base, color: isMouth ? [1, 1, 0] : [1, 0, 0], alpha: a }));
    else if (dress === 'interlude') {
      out.normal.push(lGlyph({ ...base, x: h.x + 14, y: h.y + 14, color: INK, alpha: a, outline: 8 / h.size, outlineColor: INK }));
      out.normal.push(lGlyph({ ...base, color: BREAK_PALETTE.amber, alpha: a, outline: 8 / h.size, outlineColor: INK }));
    } else if (dress === 'swiss') {
      if (isMouth) out.normal.push(...swissOmega(lGlyph({ ...base, color: hex(PALETTES.swiss.red), alpha: a, outline: SWISS_KNOCKOUT / h.size, outlineColor: SWISS_PAPER }), h.size));
      else out.normal.push(lGlyph({ ...base, color: INK, alpha: a, outline: SWISS_KNOCKOUT / h.size, outlineColor: SWISS_PAPER }));
    }
    else if (dress === 'neon') {
      if (neon > 0) out.add.push(lGlyph({ ...base, color: hex(PALETTES.neon.amber, 1.5 * a * neon), tube: tubeOf(h.ch) }));
    } else {
      out.multiply.push(lGlyph({ ...base, x: h.x + 6 * (apart - 1), y: h.y - 4 * (apart - 1), color: RISO_PINK, alpha: a }));
      out.multiply.push(lGlyph({ ...base, x: h.x - 6 * apart, y: h.y + 4 * apart, color: RISO_BLUE, alpha: a }));
    }
  }
  return out;
}

/** The neon "(" tube ignites with a stutter as C4 opens it (sheet §4.2 drop2 1.3&): 35 %, off, 60 %, off, on — whole output frames. */
export function neonIgnite(f: number): number {
  const d = frameOf(f) - BLADES[3];
  return d < 0 ? 0 : ([0.35, 0, 0.6, 0][d] ?? 1);
}

/** The Riso plates clack into register as C3 opens them: five times apart on the blade, in register 3 f later (×1 = the sheet's (−6, +4)). */
export function plateApart(f: number): number {
  const t = f - BLADES[2];
  return t < 0 ? 5 : t < 3 ? 1 + 4 * (1 - ease.outCubic(t / 3)) : 1;
}

/**
 * The LED board scans on column by column behind C5 (from its line to the right edge in 5 f, a frame ahead of the blade so the frame's
 * centre is lit on the kick itself — iteration 3): layout x up to which its dots are on.
 */
const LED_SCAN_FROM = Math.min(BLADE_LINES[4].from[0], BLADE_LINES[4].to[0]) - 10;
export const ledScan = (f: number): number => LED_SCAN_FROM + (1940 - LED_SCAN_FROM) * clamp((f - BLADES[4] + 2) / 5);

// ——— The blades (sheet §5.3) ————————————————————————————————————————————————————————————————————————————————————————————————————

export type WorldName = 'interlude' | 'terminal' | 'swiss' | 'riso' | 'neon' | 'led';
/** The S27 worlds in the compositor's slot order. */
export const S27_WORLDS: readonly WorldName[] = ['interlude', 'terminal', 'swiss', 'riso', 'neon', 'led'];

/**
 * The frame blade k's launch is keyed on (iteration 2, the director's ruling 8; sync review 8): C1 on the drop itself (the frame before is
 * the break's), C2–C5 1.5 frames before their beats (a launch keyed between frames: the curve is continuous), so the head crosses his
 * face inside the beat frame's own shutter and the new world's biggest reveal lands ON the kick (C4's on its "and") with each neighbour
 * about half of it — not on the frame after, where the rig's punch adds its own change. Its shing, and the world's own opening (the
 * neon's ignition, the Riso plates' register, the LED scan) stay on the beat.
 */
export const bladeKey = (k: number): number => (k === 0 ? BLADES[0] : BLADES[k] - 1.5);

/** How far along its line blade k's tip is (0 → 1, past 1 = beyond the edge): the launch curve keyed on bladeKey (one frame before that). */
export const bladeTip = (k: number, f: number): number => Math.max(0, springL(f, bladeKey(k)));

/** The shear of blade k's new piece along the blade (px): +14 on the launch, easing to +3 by 18 f after its key. */
export function bladeShear(k: number, f: number): number {
  const t = f - bladeKey(k);
  if (t < -1) return 0;
  return 14 * Math.min(1, springL(f, bladeKey(k))) - 11 * flow((t - 4) / 14);
}

/** Blade k's unit direction (from its start to its end) and length. */
export function bladeDir(k: number): { dx: number; dy: number; len: number } {
  const b = BLADE_LINES[k];
  const dx = b.to[0] - b.from[0];
  const dy = b.to[1] - b.from[1];
  const len = Math.hypot(dx, dy);
  return { dx: dx / len, dy: dy / len, len };
}

/** The x of blade k's line at height y (the vertical-ish blades C2–C5). */
const lineX = (k: number, y: number): number => {
  const b = BLADE_LINES[k];
  return b.from[0] + ((b.to[0] - b.from[0]) * (y - b.from[1])) / (b.to[1] - b.from[1]);
};

/**
 * The wake: a new piece opens behind its blade's head like a wake — the reveal's edge leans back from the head by WAKE.slant px per px
 * off the line, so the world arrives as a slash, not a wipe. The head runs the blade's length plus the wake's lean over the piece's
 * depth (`depth`, the farthest the piece reaches from its line), so the whole piece is open once the launch reaches 1.
 */
export const WAKE = { slant: 0.45, depth: [540, 760, 760, 760, 760] } as const;

/** How far blade k's reveal has run at instant f (px along the blade, the wake's lean included). */
export const bladeReach = (k: number, f: number): number => bladeTip(k, f) * (bladeDir(k).len + WAKE.slant * WAKE.depth[k]);
/** Where blade k's head (the white-hot spark, the end of its seam) is along its line (px, at most its length). */
export const bladeHead = (k: number, f: number): number => Math.min(bladeReach(k, f), bladeDir(k).len);

/** Whether blade k has revealed layout point (x, y): its projection on the blade plus the wake's lean is behind the reach. */
function revealed(k: number, x: number, y: number, f: number): boolean {
  const b = BLADE_LINES[k];
  const { dx, dy } = bladeDir(k);
  const along = (x - b.from[0]) * dx + (y - b.from[1]) * dy;
  const off = Math.abs(dx * (y - b.from[1]) - dy * (x - b.from[0]));
  return along + WAKE.slant * off < bladeReach(k, f);
}

/**
 * The world a layout point shows at instant f (the compositor shader's twin, sheet §5.3): C1 splits the frame (above → TERMINAL);
 * C2 and C4 split TERMINAL (right → SWISS, left → NEON); C3 and C5 split region 0 (left → RISO, right → LED). A new piece shows only
 * behind its blade's tip.
 */
export function regionAt(x: number, y: number, f: number): WorldName {
  const top = y < BLADE_LINES[0].from[1] && revealed(0, x, y, f);
  if (top) {
    if (x > lineX(1, y) && revealed(1, x, y, f)) return 'swiss';
    if (x < lineX(3, y) && revealed(3, x, y, f)) return 'neon';
    return 'terminal';
  }
  if (y >= BLADE_LINES[2].to[1]) {
    if (x < lineX(2, y) && revealed(2, x, y, f)) return 'riso';
    if (x > lineX(4, y) && revealed(4, x, y, f)) return 'led';
  }
  return 'interlude';
}

/**
 * Each blade's state for the compositor: its launch (0 → 1+), reach and head (px along it), the shear of its piece (px), the seam's
 * width, colour and how white-hot it still is, and the spark at the head (1 while it runs, gone once it has crossed).
 */
export type BladeState = { tip: number; reach: number; head: number; shear: number; width: number; color: RGB; white: number; spark: number };
export function bladeStates(f: number): BladeState[] {
  return BLADE_LINES.map((b, k) => {
    const t = f - bladeKey(k);
    const white = t < -1 ? 0 : 1 - smoothstep(5, 7, t);
    const reach = bladeReach(k, f);
    const len = bladeDir(k).len;
    return { tip: bladeTip(k, f), reach, head: bladeHead(k, f), shear: bladeShear(k, f), width: lerp(2, 4, white), color: mixRGB(hex(b.seam, 1.3), [1.6, 1.6, 1.6], white), white, spark: reach > 0 ? 1 - smoothstep(0.85 * len, 1.05 * len, reach) : 0 };
  });
}

/** The rim glint (kick + 18): one seam, C1 → C5 in turn, lights a 1-frame white run along its length. `u` = the run's head (0 → 1). */
export function rimGlint(f: number): { blade: number; u: number } | null {
  const rims = RIMS2.filter((r) => r < S27_END);
  for (let i = 0; i < rims.length; i++) {
    const t = f - rims[i];
    if (t >= -0.5 && t < 1) return { blade: i % BLADE_LINES.length, u: clamp(t + 0.5) };
  }
  return null;
}

// ——— The regions' motifs (sheet §5.3: one quiet motif each) —————————————————————————————————————————————————————————————————————

const empty = (): FlatContent => ({ under: [], glyphs: {}, over: [] });
const sixteenths = (f: number, from: number): number => Math.max(0, Math.floor((frameOf(f) - from) / 6) + 1);

/**
 * The terminal's boot log, kept quiet (review R1-13): a 15 px column from x 590 (its longest line, 46 cells of 9 px, ends at x 1004),
 * at most 5 lines in y 48–168 with the cursor under them, dimmed to ≈ 45 % of the first cut (linear 0.1 of the text colour, the
 * friends' lines 0.2 of pink), so his eyes and ω own the centre and the log reads only when you look for it.
 */
export const S27_LOG = { x: 590, y: 48, size: 15, pitch: 24, rows: 5, text: 0.1, pink: 0.2, cursor: 0.3 } as const;

/**
 * The texture drop2 1.1–1.2 carries and drop2 1.3 lets go of (iteration 2, the director's ruling 11; flow review 9): by drop2 1.4 the frame stacked six
 * world panels, the boot log, three friends and the monitor, five or six focal points around his face. From C3's blade (drop2 1.3) the boot
 * log and the Swiss friend fade out over a 16th, and the Riso bear, the neon dancer and the LED marquee's friends are never drawn: the
 * face across the worlds is the subject. 1 until drop2 1.3, 0 from drop2 1.3 + 6.
 */
export const panelTexture = (f: number): number => 1 - clamp((f - BLADES[2]) / 6);
/** A glyph's alpha under panelTexture (left out at 1, so a whole glyph stays exactly what it was). */
const kept = (k: number): { alpha?: number } => (k < 1 ? { alpha: k } : {});

/** TERMINAL: the log column (S27_LOG), one line a 16th from drop2 1.1 + 6, the friends' lines in pink; a cursor blinking 6 / 6 f; gone from drop2 1.3 (panelTexture). */
export function terminalRegion(f: number, L: SlashLayout): FlatContent {
  const keep = panelTexture(f);
  if (keep <= 0) return empty();
  const { x: x0, y: y0, size, pitch, rows } = S27_LOG;
  const n = Math.min(DROP2_S27_LOG.length, sixteenths(f, DROP2_START + 6));
  const first = Math.max(0, n - rows);
  const glyphs: Glyph[] = [];
  const dim = hex(T.text, S27_LOG.text);
  const pinkInk = hex(T.pink, S27_LOG.pink);
  const faces = S27_CAST.slice(0, 2).map((c) => c.face);
  for (let i = first; i < n; i++) {
    const line = DROP2_S27_LOG[i];
    const y = y0 + (i - first + 0.5) * pitch;
    const pink = faces.some((fc) => line.includes(fc));
    const line_ = typeset(line, L.mono);
    for (const c of line_.chars) {
      if (c.ch.trim() === '') continue;
      glyphs.push(lGlyph({ ch: c.ch, x: x0 + c.x * size, y, size, color: pink ? pinkInk : dim, ...kept(keep) }));
    }
  }
  const lastY = y0 + (Math.min(n, rows) + 0.5) * pitch;
  if (Math.floor(frameOf(f) / 6) % 2 === 0) glyphs.push(lGlyph({ ch: '█', x: x0 + 0.3 * size, y: lastY, size, color: hex(T.green, S27_LOG.cursor), ...kept(keep) }));
  return { under: [], glyphs: { mono: glyphs }, over: [] };
}

/**
 * The Swiss friend's cell (layout px, centre and size; review R1-04): under the pen's y-120 rule, in the white between the "2"'s spine and
 * the "7"'s stroke, above his raised right arm — the sheet's (1760, 470) sat under the 7, so only "ノ～♡" showed.
 */
export const SWISS_FRIEND = { x: 1560, y: 156, w: 250, h: 52, size: 34 } as const;

/**
 * The Swiss world's draws, back to front (sheet §3.3: world layers, then the hero): the region (hairlines, the red "27", the friend), then
 * him over it — one FlatLayer draws its atlases in key order, so in a single draw the Inter Tight "27" covered his ")" and ノ.
 */
export function swissDraws(f: number, L: SlashLayout, hero: readonly HeroChar[], alpha: number): FlatContent[] {
  return [swissRegion(f, L), { under: [], glyphs: { rounded: dressHero(hero, 'swiss', alpha, f).normal }, over: [] }];
}

/** SWISS: 12-column hairlines (one segment drawn a 16th), the cropped red "27" bleeding off the top right, a waving face in a cell through drop2 1.2 (panelTexture). */
export function swissRegion(f: number, L: SlashLayout): FlatContent {
  const under: Shape[] = [];
  const hair = hex('#111111');
  for (let k = 0; k <= 12; k++) {
    const x = 60 + (1800 * k) / 12;
    under.push(lShape({ kind: 'rect', x, y: 540, w: 1.5, h: 1200, color: hair, alpha: 0.12 }));
  }
  // The pen: one cell-wide hairline segment a 16th along y 120 and y 470, from drop2 1.2.
  const n = sixteenths(f, BLADES[1]);
  for (let j = 0; j < Math.min(n, 12); j++) {
    for (const y of [120, 470]) under.push(lShape({ kind: 'rect', x: 60 + 150 * j + 75, y, w: 150, h: 1.5, color: hair, alpha: 0.35 }));
  }
  const red = hex(PALETTES.swiss.red);
  const size = 640 / 0.727;
  const w = L.display(SWISS_NUMERALS.s27) * size;
  const display = [lGlyph({ ch: SWISS_NUMERALS.s27, x: 2010 - w / 2, y: 520 - 320, size, color: red })];
  const cell = S27_CAST[2];
  const c = SWISS_FRIEND;
  const wave = armWave(f) * 0.6;
  const keep = panelTexture(f);
  const jp = keep > 0 ? [lGlyph({ ch: cell.face, x: c.x, y: c.y, size: c.size, color: hair, rot: wave, ...kept(keep) })] : [];
  if (keep > 0) under.push(lShape({ kind: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, color: hair, alpha: 0.06 * keep }));
  return { under, glyphs: { display, jp }, over: [] };
}

/** NEON: two pink tube rules (y 90, 470); a spark on a random rule each hat. Ghost glass under, light added. (No cyan dancer: panelTexture.) */
export function neonRegion(f: number, L: SlashLayout): { normal: FlatContent; add: FlatContent } {
  const ghost = hex('#1C1A24');
  const normal = empty();
  const addU: Shape[] = [];
  const pink = hex(PALETTES.neon.pink);
  for (const y of [90, 470]) {
    (normal.under as Shape[]).push(lSeg(-40, y, 640, y, 6, ghost));
    addU.push(lSeg(-40, y, 640, y, 16, scaleRGB(pink, 0.14), 1, 8));
    addU.push(lSeg(-40, y, 640, y, 6, scaleRGB(pink, 1.6)));
  }
  const d = frameOf(f);
  // A spark on a random rule per hat.
  const hat = HATS2.filter((h) => h <= d).pop();
  if (hat !== undefined && d - hat < 3) {
    const k = Math.floor(hash(seedFrame(hat), 4110) * 2);
    const x = 40 + 560 * hash(seedFrame(hat), 4111);
    const y = k === 0 ? 90 : 470;
    addU.push(lShape({ kind: 'ellipse', x, y, w: 26, h: 26, color: scaleRGB(pink, 2.2 * (1 - (d - hat) / 3)), soft: 12 }));
  }
  void L;
  return { normal, add: { under: addU, glyphs: {}, over: [] } };
}

/** RISO: a pink halftone field (10 px screen at 75°), two registration marks turning 15° a 16th; the plates drift ±2 px. (No blue bear: panelTexture.) */
export function risoRegion(f: number, L: SlashLayout): { normal: FlatContent; multiply: FlatContent } {
  const n = sixteenths(f, BLADES[2]);
  const drift: [number, number] = [2 * noise1(seedFrame(f) / 23, 4120), 2 * noise1(seedFrame(f) / 29, 4121)];
  const fade = clamp((f - BLADES[2]) / 6);
  const under: Shape[] = fade > 0 ? [lShape({ kind: 'rect', x: 380 + drift[0], y: 810 + drift[1], w: 900, h: 600, color: RISO_PINK, tint: 0.32 * fade, screen: 10, angle: (75 * Math.PI) / 180 })] : [];
  const marks: Shape[] = [];
  for (const [x, y] of [[90, 620], [90, 1010]] as Point[]) {
    const rot = 15 * n;
    marks.push(lShape({ kind: 'ring', x, y, w: 46, h: 46, r: 3, color: RISO_BLUE }));
    marks.push(lShape({ kind: 'rect', x, y, w: 70, h: 3, rot, color: RISO_BLUE }));
    marks.push(lShape({ kind: 'rect', x, y, w: 3, h: 70, rot, color: RISO_BLUE }));
  }
  void L;
  return { normal: empty(), multiply: { under: [...under, ...marks], glyphs: {}, over: [] } };
}

/**
 * LED: the white source the LED pass samples at its dot pitch, and its +25 % flash on the hats. No marquee (panelTexture): its two
 * friends were the sixth focal point of drop2 1.4; the board is his ")" in amber dots over the unlit grid.
 */
export function ledRegionSource(f: number, L: SlashLayout): { content: FlatContent; flash: number } {
  void L;
  const d = frameOf(f);
  const h = HATS2.filter((x) => x <= d).pop() ?? 0;
  return { content: { under: [], glyphs: {}, over: [] }, flash: d - h < 3 ? 0.25 : 0 };
}

/** A line of text character by character from left edge x (layout px), its characters' placement points on y. */
export function rowGlyphs(text: string, adv: Advance, x: number, y: number, size: number, color: RGB): Glyph[] {
  return typeset(text, adv)
    .chars.filter((c) => c.ch.trim() !== '')
    .map((c) => lGlyph({ ch: c.ch, x: x + c.x * size, y, size, color }));
}

// ——— E6's pop: the hole in the break's film (sheet §5.0) ———————————————————————————————————————————————————————————————————————————

let filmCache: FilmState | null = null;
/** The break's soap film frozen on its last frame (breakFilm.ts, read-only). */
export const popFilm = (): FilmState => (filmCache ??= filmAt(SEAM));

/** The hole's base radius r(f) (film px about the black spot): from the spot's 120 px past the farthest corner + 80 by drop2 1.1 + 6. */
export function holeRadius(f: number): number {
  const s = popFilm();
  const [ax, ay] = s.anchor;
  const far = Math.max(...[[0, 0], [1920, 0], [0, 1080], [1920, 1080]].map(([x, y]) => Math.hypot(x - ax, y - ay))) + 80;
  const r0 = s.black;
  return r0 + (far - r0) * Math.max(0, springL(f, DROP2_START));
}

/** The rim's ragged edge: r(θ, f) = r(f) · (1 + 0.06 · noise(5θ)). */
export const rimRadius = (theta: number, f: number): number => holeRadius(f) * (1 + 0.06 * noise1(5 * theta, 4100));

/** The rim sampled at `n` angles (θ = 2πi/n), for the shader. */
export const rimProfile = (f: number, n = 64): number[] => Array.from({ length: n }, (_, i) => rimRadius((2 * Math.PI * i) / n, f));

/** Film point at (ρ, θ) about the black spot, on screen (the film frozen at the break's last frame). */
const filmScreen = (rho: number, theta: number): [number, number] => {
  const s = popFilm();
  return project(filmPoint(s.anchor[0] + rho * Math.cos(theta), s.anchor[1] + rho * Math.sin(theta), s));
};

/** The frame the ragged rim passes film radius ρ at angle θ (sampled every 0.05 f); Infinity if it never does. */
function rimPasses(rho: number, theta: number): number {
  for (let f = SEAM; f <= RIM_GONE + 2; f += 0.05) if (rimRadius(theta, f) >= rho) return f;
  return Infinity;
}

export type Droplet = { x: number; y: number; r: number; nx: number; ny: number; alpha: number };
type DropSeed = { born: number; x: number; y: number; nx: number; ny: number; v: number; life: number; r: number };
let dropCache: DropSeed[] | null = null;
/** How many droplets the rim flings (sheet §5.0). */
export const DROPLETS = 2000;

/** The droplets' births: angle uniform, radius uniform in area between the spot and the far corner, born when the rim passes them. */
function dropSeeds(): DropSeed[] {
  if (dropCache) return dropCache;
  const r0 = popFilm().black;
  const far = holeRadius(1e6);
  const apex = popFilm().apex;
  dropCache = Array.from({ length: DROPLETS }, (_, i) => {
    const theta = 2 * Math.PI * hash(i, 4101);
    const rho = Math.sqrt(r0 * r0 + hash(i, 4102) * (far * far - r0 * r0));
    const born = rimPasses(rho, theta);
    const [x, y] = filmScreen(rho, theta);
    const len = Math.hypot(x - apex[0], y - apex[1]) || 1;
    const life = 10 + 10 * hash(i, 4104);
    return { born, x, y, nx: (x - apex[0]) / len, ny: (y - apex[1]) / len, v: 18 + 42 * hash(i, 4103), life: Math.min(life, POP_END - born), r: 3 + 7 * hash(i, 4105) ** 1.5 };
  });
  return dropCache;
}

/** The droplets alive at instant f, on screen: each a lens disc (3–10 px) flying out along its radius at 18–60 px/f with gravity, toward the camera (×1 → ×3). */
export function droplets(f: number): Droplet[] {
  const out: Droplet[] = [];
  for (const d of dropSeeds()) {
    const age = f - d.born;
    if (age < 0 || age >= d.life) continue;
    const x = d.x + d.nx * d.v * age;
    const y = d.y + d.ny * d.v * age + 0.6 * age * age;
    const scale = 1 + (2 * age) / d.life;
    const r = d.r * scale;
    if (x < -r || x > 1920 + r || y < -r || y > 1080 + r) continue;
    out.push({ x, y, r, nx: d.nx, ny: d.ny, alpha: clamp((d.life - age) / 6) });
  }
  return out;
}

export type TornGlyph = { ch: string; x: number; y: number; size: number; rot: number; color: RGB; alpha: number };
type TornSeed = { ch: string; sx: number; sy: number; size: number; color: RGB; alpha: number; torn: number; nx: number; ny: number; v: number; life: number; spin: number; grow: number };
let tornCache: TornSeed[] | null = null;
const GREEN_HOT = hex(T.green, 1.7);

function tornSeeds(): TornSeed[] {
  if (tornCache) return tornCache;
  const s = popFilm();
  const apex = s.apex;
  tornCache = filmText(SEAM).map((g, i) => {
    const dx = g.x - s.anchor[0];
    const dy = g.y - s.anchor[1];
    const torn = rimPasses(Math.hypot(dx, dy), Math.atan2(dy, dx));
    const len = Math.hypot(g.screen[0] - apex[0], g.screen[1] - apex[1]) || 1;
    const life = Math.min(8 + 8 * hash(i, 4131), POP_END - torn);
    return { ch: g.ch, sx: g.screen[0], sy: g.screen[1], size: g.size, color: g.color, alpha: g.alpha, torn, nx: (g.screen[0] - apex[0]) / len, ny: (g.screen[1] - apex[1]) / len, v: 18 + 30 * hash(i, 4132), life, spin: 15 * (2 * hash(i, 4133) - 1), grow: 1.5 + 1.5 * hash(i, 4134) };
  });
  return tornCache;
}

/** The E5 window's glyphs (screen px): in place (its own ink) until the rim passes them, then flung out and at the camera (×2.5–4), green, spinning, gone by drop2 1.2 − 1. */
export function tornGlyphs(f: number): TornGlyph[] {
  const out: TornGlyph[] = [];
  for (const g of tornSeeds()) {
    const age = f - g.torn;
    if (age < 0) {
      out.push({ ch: g.ch, x: g.sx, y: g.sy, size: g.size, rot: 0, color: g.color, alpha: g.alpha });
      continue;
    }
    if (age >= g.life) continue;
    const u = age / g.life;
    out.push({ ch: g.ch, x: g.sx + g.nx * g.v * age, y: g.sy + g.ny * g.v * age, size: g.size * (1 + g.grow * u), rot: g.spin * age, color: mixRGB(g.color, GREEN_HOT, clamp(age / 2)), alpha: Math.max(g.alpha, 0.9) * clamp((g.life - age) / 6) });
  }
  return out;
}

/** The E5 window's backing collapsing: scale-y 1 → 0 (cubic-in) over drop2 1.1–1.1 + 5, about its middle (screen px). */
export function windowBacking(f: number): { x: number; y: number; w: number; h: number; color: RGB; alpha: number } | null {
  const r = windowAt(SEAM).rects[0];
  if (!r) return null;
  const k = 1 - ease.inCubic(clamp((f - SEAM) / (RIM_GONE - SEAM)));
  if (k <= 0) return null;
  return { x: r.x, y: r.y, w: r.w, h: r.h * k, color: r.color, alpha: r.alpha };
}

// ——— Time and finish ————————————————————————————————————————————————————————————————————————————————————————————————————————————

const within = (f: number, a: number, b: number): boolean => f >= a && f <= b;

/**
 * Sub-frames (sheet §5.2): 64 on the pop (drop2 1.1–1.1& − 1: the rim races ≈ 180 px a frame); 32 on its tail, on each blade's tip, over the
 * pop-out and on each turn of the cube (& → kick + 3); 64 on the whip; 16 elsewhere. Shutter 180°.
 */
export function slashTemporal(f: number): Temporal {
  const d = Math.round(f);
  let samples = 16;
  if (within(d, DROP2_START, DROP2_START + 11) || within(d, WHIP.from, WHIP.to + 2)) samples = 64;
  else if (within(d, DROP2_START + 12, POP_END - 1) || BLADES.slice(1).some((b) => within(d, b - 2, b + 4)) || within(d, POP_OUT, S27_END + 3) || TURNS.some((t) => within(d, t.from, t.to + 3))) samples = 32;
  return { samples, shutter: 0.5, persistence: 0 };
}

/** One segment: the slash part has no hard cut (drop2Segment: [drop2 1.1, 5.1)). */
export const slashSegment = (f: number): Segment => drop2Segment(f);

/**
 * Drop 2's flat finish: linear, and only HDR highlights bloom (the white-hot seams, tubes and dots; paper never glows), a touch of
 * grain. The first frames ease out of the break's own finish (BREAK_LOOK) over the pop.
 */
export const SLASH_LOOK: Look = {
  toneMapping: 'linear',
  exposure: 1,
  bloom: { intensity: 0.85, threshold: 1, smoothing: 0.15, radius: 0.72 },
  aberration: 0.0004,
  grain: 0.04,
  vignette: 0.08,
};
export const slashLook = (f: number): Look => mixLook(BREAK_LOOK, SLASH_LOOK, clamp((f - SEAM) / 6));

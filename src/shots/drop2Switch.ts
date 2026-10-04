// S31S THE SWITCH, drop2 9.1 → 10.1 − 1 (2.5D, half time; build sheet notes/bid2/drop2-sheet2.md §3 "The switch", §5 #10–#12, §6.3;
// design notes/extend/drop2-final.md §3.2, §4.5, §4.7). The whole bar is Defender v2.0's point of view:
//   9.1   the kernel's slate X-ray (the install wipe just finished) deepens to v2.0's cyanotype; DEFENDER v2.0 slams in; he is a white
//         blueprint outline in the reticle the kernel's core ring became (Ø 900, his centre); a heavy dolly-in 1.00 → 1.12 to the backbeat.
//   9.1&  the camera turns to a 30° axonometric (L) and flattens (a dolly-zoom toward orthographic); his brackets lift 120 px off the
//         sheet, drawn from the font's real contours (drop2SwitchType.ts): outline, on-curve squares, handles; `1.000 em`, `U+0028 U+0029`.
//   9.2   the eyes lift 240 px, with construction circles (`Ø 0.31 em`, `U+2022`).
//   9.2&  the ω lifts 360 px with its Bézier handles (`U+03C9`); the reticle's ticks snap inward: LOCK; SIGNATURE MATCH types a byte a
//         frame (the film's one reading of his bytes); on the tenth every outline flashes red for 2 f.
//   9.3   the half-time backbeat: the planes slam back and the camera snaps front-on (I); a red box closes round him — its corners fly in
//         from the screen's (I), its edges draw in 2 f, a 30 % hatch, ▣ stamps. (The v2.0 scoreboard opening bottom left is the slot's.)
//   9.3&  near-silence: THREAT CONTAINED ✓; he breathes into the box; the hatch pulses at 2 Hz; the ring turns 1°/f; on + 9 its corner bulges.
//   9.4   the spill, on the 32nds: every box squeezes an amber copy out of a corner (drawn after the POV: the one colour its eyes can't render)
//         and is boxed a 32nd later — ×2 ×4 ×8 ×16, the reticle splitting 1 → 2 → 4 → 8 — while the camera pulls back fast (L, 1.14 → 0.85).
//   9.4&  the flood: every satellite box fails at once; ≈ 400 copies pour down-left into the bottom-left quadrant; his own box holds,
//         bulging, white light leaking through cracks (the frame's mean climbing to the burst); his face hardens (•̀ω•́); Defender drafts its
//         counter-measure — four compass arcs, a great wave's curl (CURL_ARCS) — and the title block `DWG 1/5 · WAVE`.
// Pure (Node tests import it). Every frame comes from the score's names (part-local: nothing hard-coded). The flat world: px at 1080p,
// origin at the frame's centre, y up; "layout" points: top-left origin, y down. Builder S owns this file; the content per layer is
// drop2SwitchFrame.ts, the glyph plans drop2SwitchType.ts, the GPU src/scenes/drop2Switch.ts.
import { HERO2, SIGNATURE, SIGNATURE_BYTES, SWITCH_TEXT } from '../content/drop2.ts';
import type { Pose, Vec3 } from '../engine/camera.ts';
import { fillDistance } from '../engine/camera.ts';
import { type RGB, linear, mixRGB } from '../engine/color.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import { hash, noise1 } from '../engine/random.ts';
import { SWAP_LEAD, type Segment, type Temporal } from '../engine/temporal.ts';
import type { Look } from '../engine/types.ts';
import { within } from '../motion/hit.ts';
import { ARCS, BOX, BULGE, BURST, CONTAINED, CYANOTYPE, EXPLODE, FLOOD, HATS2, SIGNATURE_MATCH, SPILL, SPILL_SNARES, SWITCH } from '../score/drop2.ts';
import { v07Frame } from '../score/film.ts';
import { LAW, PALETTES, type Point, drop2Segment, flow, impact, snap, springL } from './drop2Shared.ts';
import { FACE_ADVANCE, FACE_INK, type Layer } from './drop2SwitchType.ts';
import { SLOT_AVATAR, SLOT_BOX, SLOT_TITLE } from './drop2SwitchSlotGeom.ts';
import { WAVE_CURL } from './drop2WaveGeom.ts';

const T0 = SWITCH.from;
/** The part's last frame (the burst + inversion cut follows: a segment boundary). */
export const LAST = BURST - 1;
/** The slam's lead: the planes, the camera and the box's corners all ease in over the 6 frames before the backbeat and land on it. */
const SNAP = 6;
/** The lock: the ticks snap inward and the bytes start on 9.2& (the ω's note). */
export const LOCK = SIGNATURE_MATCH.from;
/** Every layer's outline flashes red for 2 f on the tenth byte (design: 4077). */
export const RED_FLASH = SIGNATURE_MATCH.from + 9;
/** An output frame's discrete state (text typed, a flash) is whole on its frame: the instant's nearest output frame. */
const frameOf = (f: number): number => Math.floor(f + 0.5);
const rad = (deg: number): number => (deg * Math.PI) / 180;
/** A hit that decays over `n` frames from `at` (1 on it, 0 from at + n; nothing before). */
const decay = (f: number, at: number, n: number): number => (f < at ? 0 : (1 - clamp((f - at) / n)) ** 2);

// ——— Inks (linear light) ———————————————————————————————————————————————————————————————————————————————————————————————————————

const POV = PALETTES.pov;
export const INK = {
  /** Defender: #FF4A1C emissive ×1.6 on these dark and mid grounds (blooms), with its #0B1650 outline on blue. */
  red: linear(LAW.defender.emissive, LAW.defender.emissiveGain),
  onBlue: linear(LAW.defender.onBlue),
  /** His copies: amber, a touch over 1 (they glow past the POV). */
  amber: linear(LAW.hero, 1.2),
  /** The blueprint's lines and labels (v2.0), the X-ray's ink (v1) and its hot spot (his ω). */
  line: linear(POV.line),
  xray: linear(POV.ink),
  hot: linear(POV.ink, 1.7),
  /** The acetate sheets of the exploded planes and the grid's major lines' tone. */
  panel: linear(POV.cyan1),
  crack: linear(POV.crack, 3),
  white: linear('#FFFFFF'),
} as const;

/** The grade v1 → v2.0 (0 the slate X-ray, 1 the cyanotype): X-ray on 9.1 for 3 f, then the ramp deepens over CYANOTYPE. */
export const gradeAt = (f: number): number => (f < CYANOTYPE.from ? 0 : flow((f - CYANOTYPE.from) / (CYANOTYPE.to - CYANOTYPE.from)));
/** The ground: slate #22343C → cyanotype #0B2350 (a grade, never an inversion). */
export const groundAt = (f: number): RGB => mixRGB(linear(POV.slate), linear(POV.cyan0), gradeAt(f));

// ——— The camera ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The axonometric the camera turns to on 9.1& (degrees): 30° round, 16° above, the field of view narrowed toward orthographic. */
export const AXO = { yaw: -34, pitch: 22, fov: 9, push: 0.3 } as const;
/** How far each plane lifts toward the lens (px). */
export const LIFT: Readonly<Record<Layer, number>> = { brackets: 120, eyes: 240, mouth: 360 };
export type SwitchCam = { zoom: number; dolly: number; axo: number; yaw: number; pitch: number; fov: number; lift: number };

/**
 * The shot's camera at instant `f`: the dolly (his scale on screen front-on), the axonometric turn (0 front-on … 1 turned) with its push
 * in (×1.3: the exploded drawing fills the reticle), the zoom (both), and the target's depth (the middle of the exploded stack, so the
 * stack stays centred as it turns).
 */
export function switchCam(f: number): SwitchCam {
  let dolly: number;
  if (f < BOX) dolly = lerp(1, 1.12, flow((f - T0) / (BOX - T0)));
  else if (f < FLOOD) {
    // The creep, and the pull-back launched from it (L: its beat frame already moves).
    const creep = lerp(1.12, 1.14, clamp((f - BOX) / (SPILL[0] - BOX)));
    dolly = lerp(creep, 0.85, springL(f, SPILL[0]));
  } else dolly = 0.85;
  const axo = springL(f, EXPLODE[0]) * (1 - impact(f, BOX, SNAP));
  return { zoom: dolly * (1 + AXO.push * axo), dolly, axo, yaw: rad(AXO.yaw) * axo, pitch: rad(AXO.pitch) * axo, fov: lerp(20, AXO.fov, axo), lift: 0.5 * LIFT.mouth * axo };
}

/** The world camera's pose (the z = 0 sheet fills the frame at zoom 1, front-on: exactly frontal(FRONT / zoom)). */
export function switchPose(f: number): Pose {
  const c = switchCam(f);
  const d = fillDistance(1080, c.fov) / c.zoom;
  const t: Vec3 = [0, 0, c.lift];
  return {
    position: [t[0] + d * Math.sin(c.yaw) * Math.cos(c.pitch), t[1] + d * Math.sin(c.pitch), t[2] + d * Math.cos(c.yaw) * Math.cos(c.pitch)],
    target: t,
    up: [0, 1, 0],
    fov: c.fov,
  };
}

/** A plane's lift toward the lens (px): launched on its scan note (L), slammed back on the box (I). */
export function liftAt(layer: Layer, f: number): number {
  const k = (['brackets', 'eyes', 'mouth'] as const).indexOf(layer);
  return LIFT[layer] * springL(f, EXPLODE[k]) * (1 - impact(f, BOX, SNAP));
}

// ——— The hero ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** His face's width on the sheet (px at zoom 1): the kernel's 600. */
export const HERO_WIDTH = 600;
const EM = HERO_WIDTH / FACE_ADVANCE;
/** His ink box on the sheet, half sizes (px): the brackets bound it. */
export const INK_HALF = { w: ((FACE_INK[2] - FACE_INK[0]) * EM) / 2, h: ((FACE_INK[3] - FACE_INK[1]) * EM) / 2 } as const;

/** He breathes into the box through the held breath (+1.5 % by the bulge), and lets it out as the first copy squeezes free. */
export function breathAt(f: number): number {
  if (f < CONTAINED) return 1;
  if (f < SPILL[0]) return 1 + 0.015 * Math.sin((Math.PI / 2) * clamp((f - CONTAINED) / (BULGE - CONTAINED)));
  return 1 + 0.015 * (1 - flow((f - SPILL[0]) / 6));
}

/** His face at `f`: which face, its width on screen (front-on), its centre on screen (layout px). */
export function heroAt(f: number): { face: string; width: number; centre: Point } {
  return { face: f >= FLOOD ? HERO2.hard : HERO2.base, width: HERO_WIDTH * switchCam(f).zoom * breathAt(f), centre: [960, 540] };
}

/**
 * His blueprint's stroke (rev 2): 2 px of line ink until the flood; on its snare he hardens — a 3 px line over a dark #0B1650 keyline 6 px
 * wider (cubic-out over 1.25 f from the snare's quarter-frame lead) — so he reads on the cyanotype and on the light alike (a lone mid-tone line vanished into the glow's mid-tones at
 * 853–857); the core darkens toward the keyline only as the light grows behind him, a dark silhouette backlit on the cut.
 */
export function heroInk(f: number): { width: number; keyline: number; dark: number } {
  if (f < FLOOD - SWAP_LEAD) return { width: 2, keyline: 0, dark: 0 };
  const k = 1 - (1 - clamp((f - (FLOOD - SWAP_LEAD)) / 1.25)) ** 3;
  return { width: 2 + k, keyline: 6 * k, dark: 0.9 * crackAt(f) ** 0.6 };
}

// ——— The reticle (screen, layout px) ————————————————————————————————————————————————————————————————————————————————————————————

/**
 * Defender v2.0's reticle: the ring (the kernel's core ring, Ø 900 on his centre — `kernelRingAt(767)` must equal it), 36 ticks, the
 * crosshair (its gap clear of his face), four L brackets framing him (aspect 150 : 110, the reticle hat's), stroke 4 px.
 */
export type Reticle = { centre: Point; r: number; stroke: number; rot: number; inward: number; ticks: number; tick: number; gap: number; brackets: { w: number; h: number; arm: number; alpha: number } };

export function reticleAt(f: number): Reticle {
  const z = switchCam(f).zoom;
  const r = f <= BOX ? 450 : (450 * z) / 1.12;
  let rot = 0;
  for (const h of HATS2) if (h >= T0 && h < BOX) rot += 5 * snap(f, h);
  if (f > CONTAINED) rot += f - CONTAINED;
  const lock = snap(f, LOCK);
  const tight = { w: 2 * INK_HALF.w * z + 48, h: 2 * INK_HALF.h * z + 48 };
  return {
    centre: [960, 540],
    r,
    stroke: 4 * (1 + 1.2 * lockFlash(f)),
    rot,
    inward: lock,
    ticks: 36,
    tick: 16,
    gap: 0.74 * r,
    brackets: { w: lerp(780, tight.w, lock), h: lerp(572, tight.h, lock), arm: lerp(96, 60, clamp(lock)), alpha: 1 - impact(f, BOX, SNAP) },
  };
}

// ——— SIGNATURE MATCH, the red flash, the big line, the title ——————————————————————————————————————————————————————————————————

/** The callout at `f`: typed a byte a frame from 9.2& (`SIGNATURE MATCH  E2 …`, `  100%` with the tenth), held to the backbeat. */
export function signatureChip(f: number): { text: string; bytes: number } | null {
  const fo = frameOf(f);
  if (fo < SIGNATURE_MATCH.from || fo >= BOX) return null;
  const bytes = Math.min(10, fo - SIGNATURE_MATCH.from + 1);
  const words = SIGNATURE.match.split('  ');
  return { text: bytes < 10 ? `${words[0]}  ${words[1].split(' ').slice(0, bytes).join(' ')}` : SIGNATURE.match, bytes };
}

/** The label (rev 2): the ten bytes, stamped on his box's top edge two frames after the clang (with the ▣ stamps), held to the burst. */
export const TAG_STAMP = BOX + 2;
export const TAG = { size: 26, pad: 14, h: 40, gap: 12 } as const;
const TAG_TEXT = SIGNATURE_BYTES.join(' ');

/**
 * SIGNATURE MATCH's bytes as his box's label (rev 2: the chip alone held all ten bytes for 3 frames, 813–815, too short to read the film's
 * one reading of them): stamped down (×1.5 → 1, cubic-out over 3 f) centred on the box's top edge, it rides the box — the creep, the
 * pull-back, the swell, the tremble — to the burst, where the wave's cartouche takes the bytes up. Layout px; the width at the mono's
 * 0.6 em advance (JetBrains Mono).
 */
export function sigTagAt(f: number): { text: string; x: number; y: number; w: number; h: number; scale: number; alpha: number } | null {
  if (frameOf(f) < TAG_STAMP) return null;
  const s = clamp((f - (TAG_STAMP - SWAP_LEAD)) / 3);
  const b = mainBox(f);
  const [x, top] = toScreen(f, b.tremble[0], MAIN.hh + b.swell + b.tremble[1]);
  return { text: TAG_TEXT, x, y: top - TAG.gap - TAG.h / 2, w: [...TAG_TEXT].length * 0.6 * TAG.size + 2 * TAG.pad, h: TAG.h, scale: lerp(1.5, 1, 1 - (1 - s) ** 3), alpha: Math.min(1, 0.5 + 1.5 * s) };
}

/** Every layer's outline flashes red for 2 f on the tenth byte. */
export const outlineRed = (f: number): boolean => frameOf(f) >= RED_FLASH && frameOf(f) < RED_FLASH + 2;

/** Defender's claim on the held breath. */
export const CLAIM = 'THREAT CONTAINED ✓';
/**
 * The claim backspaced right to left over the held breath's last 6 frames (R1-T14): gone by 9.4 − 1, so the spill's downbeat opens on a
 * clean field — no half-overwritten word on the beat frame. It deletes like a held key: the ✓ first, then faster.
 */
export const BACKSPACE = { from: SPILL[0] - 6, to: SPILL[0] } as const;

/**
 * The big line (Inter Tight Black 72 px, red on a #0B1650 banner): THREAT CONTAINED ✓ typed on 9.3&, backspaced over 9.3& + 6 … 9.4 − 1,
 * then `quarantine failed ×2` typed in over 3 f from 9.4 and the count stepped on the pops (×4 ×8 ×16). `cursor` while it is being edited.
 */
export function bigLine(f: number): { text: string; count: number; pop: number; cursor: boolean } | null {
  const fo = frameOf(f);
  if (fo < CONTAINED) return null;
  if (fo < SPILL[0]) {
    const n = [...CLAIM].length;
    const typed = Math.min(n, 4 * (fo - CONTAINED) + 4);
    if (fo < BACKSPACE.from) return { text: CLAIM, count: typed, pop: 0, cursor: typed < n };
    const u = (fo - BACKSPACE.from + 1) / (BACKSPACE.to - BACKSPACE.from);
    return { text: CLAIM, count: Math.min(typed, Math.round(n * (1 - u ** 1.6))), pop: 0, cursor: true };
  }
  let k = 0;
  while (k + 1 < SPILL.length && SPILL[k + 1] <= fo) k++;
  const text = SWITCH_TEXT.failed(2 ** (k + 1));
  const n = [...text].length;
  const pop = 1 - clamp((f - SPILL[k]) / 4);
  if (k === 0) {
    const count = Math.min(n, Math.ceil((n * (fo - SPILL[0] + 1)) / 3));
    return { text, count, pop, cursor: count < n };
  }
  return { text, count: n, pop, cursor: false };
}

/**
 * DEFENDER v2.0's title (top left): slams in big on 9.1, settles in 4 f; flies down into the slot's row 1 as the scoreboard opens on 9.3
 * (lands exactly on SLOT_TITLE, its avatar — on the REC line under it — on SLOT_AVATAR: drop2SwitchSlot.ts takes over on the clang).
 */
export function titleAt(f: number): { x: number; y: number; size: number; scale: number; alpha: number; avatar: { x: number; y: number; size: number } } | null {
  if (f >= BOX) return null;
  const s = 1 + 0.45 * (1 - clamp((f - T0) / 4)) ** 3;
  const fly = impact(f, BOX, SNAP);
  const size = lerp(120, SLOT_TITLE.size, fly);
  const x = lerp(96, SLOT_TITLE.x, fly);
  const y = lerp(150, SLOT_TITLE.y, fly);
  const big = size * s;
  const avatar = { x: lerp(x + 0.06 * big + 150 * (size / 120), SLOT_AVATAR.x, fly), y: lerp(y + 0.62 * big, SLOT_AVATAR.y, fly), size: lerp(0.36 * big, SLOT_AVATAR.size, fly) };
  return { x, y, size, scale: s, alpha: 1 - clamp((f - (BOX - 2)) / 2), avatar };
}

export const recLit = (f: number): boolean => (frameOf(f) - T0) % 24 < 12;

// ——— The quarantine boxes (world) —————————————————————————————————————————————————————————————————————————————————————————————

/** His box: his ink box + 48 px. */
export const MAIN = { hw: INK_HALF.w + 48, hh: INK_HALF.h + 48 } as const;

export type MainBox = { corner: number; edges: number; weight: number; bulge: number; swell: number; hatch: number; stamps: number; tremble: Point };

/** The backbeat's clang, struck a quarter frame early (engine/temporal.ts SWAP_LEAD) so 9.3's frame is whole and the frame before has none of it. */
const CLANG = BOX - SWAP_LEAD;

/**
 * His box at `f`: its corners' flight (0 at the screen's corners … 1 on the box); its edges, whole on the backbeat (the clang: the
 * corners land and the box is shut, all on 9.3's frame); its stroke's weight (heavy on the clang, settled in 6 f); the top-right corner's
 * bulge, the swell of the flood, the hatch's alpha (flaring on the clang), the stamps.
 */
export function mainBox(f: number): MainBox {
  const corner = impact(f, BOX, SNAP);
  const edges = f >= CLANG ? 1 : 0;
  const weight = 1 + 1.2 * decay(f, CLANG, 6);
  let bulge = 0;
  if (f >= BULGE && f < SPILL[0]) bulge = 12 * (1 - (1 - clamp((f - BULGE) / (SPILL[0] - BULGE))) ** 3);
  else if (f >= SPILL[0]) bulge = 12 * (1 - springL(f, SPILL[0] + 1));
  const c = crackAt(f);
  const swell = f < FLOOD ? 0 : 4 + 12 * c;
  const pulse = f >= CONTAINED && f < SPILL[0] ? 1 + 0.25 * Math.sin((2 * Math.PI * (f - CONTAINED)) / 30) : 1;
  // (The noise runs on the frame as approved on the 61-bar map, v07Frame: v08's bridge A moved drop 2 a bar.)
  const tremble: Point = f < FLOOD ? [0, 0] : [1.5 * c * noise1(v07Frame(f) * 0.9, 31), 1.5 * c * noise1(v07Frame(f) * 0.9, 47)];
  return { corner, edges, weight, bulge, swell, hatch: 0.3 * edges * pulse * (1 + 1.5 * decay(f, CLANG, 8)), stamps: clamp((f - BOX - 1) / 3), tremble };
}

/** The clang's shock: a red outline thrown off the box on 9.3, growing ×1.45 (cubic-out) and fading over 8 f (null outside). */
export function shockAt(f: number): { scale: number; alpha: number } | null {
  if (f < CLANG || f >= BOX + 8) return null;
  const u = (f - CLANG) / 8;
  return { scale: 1 + 0.45 * (1 - (1 - u) ** 3), alpha: 0.9 * (1 - u) ** 2 };
}

/**
 * The light leaking through his box's cracks: 0 until the flood, then it cracks open in steps on the 32nds the compass ticks (the flood's
 * two snares the biggest), on a slow underlying climb, to 1 on the frame before the burst.
 */
const CRACK_STEPS = [0.4, 0.12, 0.3, 0.18] as const;
export const crackAt = (f: number): number => {
  if (f < FLOOD) return 0;
  let c = 0.15 * clamp((f - FLOOD) / (LAST - FLOOD));
  for (const [k, at] of ARCS.entries()) c += 0.85 * CRACK_STEPS[k] * smoothstep(at - 1, at + 0.5, f);
  return Math.min(1, c);
};
/**
 * The light's cracks and their beams at `f` (world: origin his centre, y up): K = 11 cracks round his box's outline (`u` ∈ [0, 4) round
 * it, born as the light grows), each opening at (x, y) on the bar with its outward normal (nx, ny) and throwing a beam `wide` px wide from
 * there to (bx, by), away from his centre. drop2SwitchFrame.ts light() draws them; the mochi wave (src/shots/drop2Mochi.ts) carries the
 * last frame's beams over the burst as the baren's press lines (continuity plan v07, seam 4320).
 */
export type CrackBeam = { i: number; x: number; y: number; nx: number; ny: number; g: number; dir: number; reach: number; wide: number; bx: number; by: number };
export function crackBeams(f: number): CrackBeam[] {
  const c = crackAt(f);
  if (c <= 0) return [];
  const mb = mainBox(f);
  const hw = MAIN.hw + mb.swell;
  const hh = MAIN.hh + mb.swell;
  const [tx, ty] = mb.tremble;
  const K = 11;
  const out: CrackBeam[] = [];
  for (let i = 0; i < K; i++) {
    // Where on the outline the crack opens (u ∈ [0, 4) round the box), and when (the cracks multiply as the light grows).
    const u = 4 * hash(i, 41);
    const born = i / K;
    const g = clamp((c - born * 0.7) / 0.3);
    if (g <= 0) continue;
    const side = Math.floor(u);
    const s = u - side;
    const pts: [number, number, number, number][] = [
      [-hw + 2 * hw * s, hh, 0, 1],
      [hw, hh - 2 * hh * s, 1, 0],
      [hw - 2 * hw * s, -hh, 0, -1],
      [-hw, -hh + 2 * hh * s, -1, 0],
    ];
    const [px, py, nx, ny] = pts[side];
    const x = px + tx;
    const y = py + ty;
    const dir = Math.atan2(y + ny * 40, x + nx * 40);
    const reach = 120 + 900 * c * g;
    const wide = 26 + 70 * c;
    out.push({ i, x, y, nx, ny, g, dir, reach, wide, bx: x + Math.cos(dir) * reach, by: y + Math.sin(dir) * reach });
  }
  return out;
}

/** The light's pulses on the flood's two snares (the 16ths that pour the two waves of copies). */
export const lightPulse = (f: number): number => 0.3 * decay(f, SPILL_SNARES[0], 5) + 0.2 * decay(f, SPILL_SNARES[1], 5);
/** Defender's lock-on blink (9.2&): the reticle and the picture flare and settle over 6 f. */
export const lockFlash = (f: number): number => decay(f, LOCK, 6);

/** The contract with the wave (U): where the box is on its last frame — his face 510 px at (960, 540), the box round it, the light. */
export function boxBurstAt(f: number): { centre: Point; w: number; h: number; face: number; crack: number } {
  const z = switchCam(f).zoom;
  const b = mainBox(f);
  return { centre: [960, 540], w: 2 * (MAIN.hw + b.swell) * z, h: 2 * (MAIN.hh + b.swell) * z, face: heroAt(f).width, crack: crackAt(f) };
}

// ——— The spill: the copies and their boxes ——————————————————————————————————————————————————————————————————————————————————————

type Corner = readonly [number, number];
const TR: Corner = [1, 1];
const TL: Corner = [-1, 1];
const BL: Corner = [-1, -1];
const BR: Corner = [1, -1];
/** Each generation's copies (face width, px on the sheet): smaller as they multiply. */
const GEN_SIZE = [252, 216, 180, 150] as const;
const BOX_PAD = 18;
const boxHalf = (size: number): { hw: number; hh: number } => ({ hw: (INK_HALF.w * size) / HERO_WIDTH + BOX_PAD, hh: (INK_HALF.h * size) / HERO_WIDTH + BOX_PAD });

/** A copy: its generation, the box it squeezes out of (its corner), where it lands, when it is born and when (if ever) it is boxed. */
export type SpillCopy = { id: number; gen: number; parent: number; born: number; boxedAt: number | null; corner: Point; to: Point; size: number };

/**
 * The plan (designed, not searched): the grid of boxes grows outward round his — cells 420 × 330 apart — every box squeezing a copy out of
 * a corner that faces free space. Box 0 is his; box k + 1 is copy k's. The last generation is never boxed (the flood beats it).
 */
const PLAN: readonly { gen: number; parent: number; corner: Corner; to: Point | null; fly?: Point }[] = [
  { gen: 0, parent: 0, corner: TR, to: [420, 330] },
  { gen: 1, parent: 0, corner: TL, to: [-420, 330] },
  { gen: 1, parent: 1, corner: TR, to: [840, 330] },
  { gen: 2, parent: 0, corner: BL, to: [-840, 0] },
  { gen: 2, parent: 1, corner: TL, to: [0, 330] },
  { gen: 2, parent: 2, corner: TL, to: [-840, 330] },
  { gen: 2, parent: 3, corner: BR, to: [840, 0] },
  { gen: 3, parent: 0, corner: BR, to: null, fly: [560, -300] },
  { gen: 3, parent: 1, corner: TR, to: null, fly: [640, 540] },
  { gen: 3, parent: 2, corner: TL, to: null, fly: [-640, 540] },
  { gen: 3, parent: 3, corner: TR, to: null, fly: [1000, 540] },
  { gen: 3, parent: 4, corner: BL, to: null, fly: [-980, -260] },
  { gen: 3, parent: 5, corner: TL, to: null, fly: [-200, 545] },
  { gen: 3, parent: 6, corner: TL, to: null, fly: [-1000, 540] },
  { gen: 3, parent: 7, corner: BR, to: null, fly: [960, -300] },
];

/** Every copy of the spill, in birth order. */
export const SPILL_COPIES: readonly SpillCopy[] = (() => {
  const boxes: { cx: number; cy: number; hw: number; hh: number }[] = [{ cx: 0, cy: 0, hw: MAIN.hw, hh: MAIN.hh }];
  const out: SpillCopy[] = [];
  for (const [id, p] of PLAN.entries()) {
    const b = boxes[p.parent];
    const corner: Point = [b.cx + p.corner[0] * b.hw, b.cy + p.corner[1] * b.hh];
    const size = GEN_SIZE[p.gen];
    // The free copies fly out of their corner into the frame's empty places (inside the pulled-back frame).
    const to: Point = p.to ?? p.fly!;
    out.push({ id, gen: p.gen, parent: p.parent, born: SPILL[p.gen], boxedAt: p.to ? SPILL[p.gen + 1] : null, corner, to, size });
    if (p.to) boxes.push({ cx: to[0], cy: to[1], ...boxHalf(size) });
  }
  return out;
})();

/** A copy's place, size and stretch at `f` (world): squeezed out of its corner on its pop (a third out on the frame), launched to its cell (soft L). */
export function copyAt(c: SpillCopy, f: number): { x: number; y: number; size: number; stretch: number; alpha: number } | null {
  if (f < c.born - 1) return null;
  const p = springL(f, c.born, 0.75);
  const k = clamp((f - (c.born - 1)) / 3);
  const out = 1 - (1 - k) ** 3;
  return { x: lerp(c.corner[0], c.to[0], p), y: lerp(c.corner[1], c.to[1], p), size: c.size * lerp(0.3, 1, out), stretch: lerp(1.9, 1, out), alpha: 1 };
}

/** A quarantine box at `f`: its centre and half sizes (world), the frame it closed on, how long it has been failing (≤ 0: holds). */
export type QBox = { id: number; main: boolean; cx: number; cy: number; hw: number; hh: number; from: number; fail: number; snap: number };

/** Every box standing at `f` (his first). A copy's box snaps round it (from 1.6× its size) as it lands, tracking it; all but his fail on the flood. */
export function boxesAt(f: number): QBox[] {
  if (f < BOX - SNAP) return [];
  const out: QBox[] = [{ id: 0, main: true, cx: 0, cy: 0, hw: MAIN.hw, hh: MAIN.hh, from: BOX, fail: 0, snap: 1 }];
  for (const c of SPILL_COPIES) {
    if (c.boxedAt === null || frameOf(f) < c.boxedAt) continue;
    const at = copyAt(c, f)!;
    const h = boxHalf(c.size);
    const k = lerp(1.6, 1, Math.min(1, snap(f, c.boxedAt - 1)));
    out.push({ id: c.id + 1, main: false, cx: at.x, cy: at.y, hw: h.hw * k, hh: h.hh * k, from: c.boxedAt, fail: f >= FAIL ? f - FAIL + 1e-9 : 0, snap: clamp((f - c.boxedAt + 1) / 3) });
  }
  return out;
}

/** The flood's snare (9.4&), struck a quarter frame early: every satellite box fails on its frame, flashing white-hot (gone in 4 f). */
const FAIL = FLOOD - SWAP_LEAD;
export const failFlash = (f: number): number => decay(f, FAIL, 4);

/** The world → screen (layout px) map once the camera is front-on (9.3 on). */
export const toScreen = (f: number, x: number, y: number): Point => {
  const z = switchCam(f).zoom;
  return [960 + x * z, 540 - y * z];
};

/**
 * The reticle split (1 → 2 → 4 → 8): one per standing box, his first (drawn as the big reticle). A box's reticle splits off its parent's
 * as the box closes (flies 3 f, launched), locks round it on screen, and falls and fades with it on the flood.
 */
export function splitReticles(f: number): { id: number; main: boolean; x: number; y: number; w: number; h: number; alpha: number; fall: number }[] {
  const boxes = boxesAt(f);
  return boxes.map((b) => {
    const [x, y] = toScreen(f, b.cx, b.cy);
    const z = switchCam(f).zoom;
    if (b.main) return { id: 0, main: true, x, y, w: 2 * b.hw * z, h: 2 * b.hh * z, alpha: 1, fall: 0 };
    const copy = SPILL_COPIES[b.id - 1];
    const parent = boxes.find((p) => p.id === copy.parent) ?? boxes[0];
    const [px, py] = toScreen(f, parent.cx, parent.cy);
    const p = springL(f, b.from, 0.75);
    const fall = Math.max(0, b.fail);
    return { id: b.id, main: false, x: lerp(px, x, p), y: lerp(py, y, p) + 1.2 * fall * fall, w: 2 * b.hw * z + 28, h: 2 * b.hh * z + 28, alpha: 1 - clamp(fall / 8), fall };
  });
}

// ——— The flood (screen, layout px) ——————————————————————————————————————————————————————————————————————————————————————————————

/** The heap the flood fills: under the line from (0, 400) to (1100, 1080), the bottom-left quadrant's water — piled on the scoreboard's box and round it (R1-T02). */
export const HEAP = { x0: 0, y0: 400, x1: 1100, y1: 1080 } as const;
/** The water's surface: the slope, with a swell on it. */
const surface = (x: number): number => HEAP.y0 + ((HEAP.y1 - HEAP.y0) * x) / HEAP.x1 + 16 * Math.sin(x / 55);
/** The slope of the water (for "deepest first": nearest the bottom-left corner, measured across the surface). */
const SLOPE = (HEAP.y1 - HEAP.y0) / HEAP.x1;

/**
 * The flood's copies are him at a readable size (rev 2): 65–72 px faces. The first build's ≈ 400 copies at 34–48 px, tumbling and
 * overlapping, read as glyph texture (the very thing the wave's water avoids: kaomoji as material), not as a crowd of him.
 */
const FLOOD_SIZE = 72;
const inkW = (s: number): number => (s * (FACE_INK[2] - FACE_INK[0])) / FACE_ADVANCE;
const inkH = (s: number): number => (s * (FACE_INK[3] - FACE_INK[1])) / FACE_ADVANCE;

/** Air between the heap and the scoreboard's box. */
const SLOT_AIR = 6;
/** The heap's slots: rows laid like bricks from the bottom edge up, each face whole under the water's surface and in frame; deepest first. */
const SLOTS: readonly { p: Point; size: number; tilt: number }[] = (() => {
  const w = inkW(FLOOD_SIZE);
  const h = inkH(FLOOD_SIZE);
  const col = 1.1 * w;
  const out: { p: Point; size: number; tilt: number; depth: number }[] = [];
  for (let row = 0, y = HEAP.y1 - h / 2 - 6; y - h / 2 > HEAP.y0 - 40; row++, y -= 1.14 * h) {
    for (let x = w / 2 + 6 + ((row % 2) * col) / 2; x + w / 2 <= HEAP.x1; x += col) {
      const jx = x + 4 * (hash(row, Math.round(x), 11) - 0.5);
      const jy = y + 3 * (hash(row, Math.round(x), 13) - 0.5);
      if (jy - h / 2 < surface(jx + w / 2) - 6) continue;
      // The scoreboard opened bottom left on the box's clang (drop2SwitchSlot.ts): the flood piles up on top of it and round it, never under it.
      if (jx + w / 2 > SLOT_BOX.x0 - SLOT_AIR && jx - w / 2 < SLOT_BOX.x1 + SLOT_AIR && jy + h / 2 > SLOT_BOX.y0 - SLOT_AIR && jy - h / 2 < SLOT_BOX.y1 + SLOT_AIR) continue;
      out.push({ p: [jx, jy], size: FLOOD_SIZE * (0.9 + 0.1 * hash(row, Math.round(x), 15)), tilt: 0.1 * (hash(row, Math.round(x), 17) - 0.5), depth: jy - SLOPE * jx });
    }
  }
  return out.sort((a, b) => b.depth - a.depth);
})();

/** Where the copies stand on the flood (screen): the failed boxes' copies, each the head of one stream. */
const SOURCES: readonly Point[] = SPILL_COPIES.map((c) => {
  const at = copyAt(c, FLOOD)!;
  return toScreen(FLOOD, at.x, at.y);
});

/** A drop of the flood: its stream (source copy), launch, flight time, slot, size, tilt and its stream's hop over the box's edge. */
export type FloodDrop = { src: number; spawn: number; dur: number; to: Point; size: number; tilt: number; lift: number };

/** The gushes: the first on the flood's snare (≈ 62 % of the heap, over 3.5 f), the second on the next 16th's snare (over 2.2 f). */
const GUSH = [3.5, 2.2] as const;

/**
 * The flood (rev 2), designed so the blur reads as a pour: the heap's slots split left to right among the failed boxes' copies, also
 * left to right — each box pours one stream into its own stretch of the heap, every drop of a stream on the same hop — and the heap
 * fills from the corner up, the deeper slots in the first gush.
 */
export const FLOOD_DROPS: readonly FloodDrop[] = (() => {
  const n = SLOTS.length;
  const bySrcX = SOURCES.map((p, i) => ({ i, x: p[0] })).sort((a, b) => a.x - b.x).map((o) => o.i);
  const byX = SLOTS.map((s, rank) => ({ rank, x: s.p[0] })).sort((a, b) => a.x - b.x);
  const srcOf = new Array<number>(n);
  byX.forEach((o, j) => (srcOf[o.rank] = bySrcX[Math.min(bySrcX.length - 1, Math.floor((j * bySrcX.length) / n))]));
  const waveOf = (rank: number): 0 | 1 => (rank < 0.62 * n ? 0 : 1);
  // Each (stream, gush)'s drops in depth order, spread evenly across the gush.
  const groups = new Map<string, number[]>();
  for (let r = 0; r < n; r++) {
    const key = `${srcOf[r]}:${waveOf(r)}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const out = new Array<FloodDrop>(n);
  for (const ranks of groups.values()) {
    ranks.forEach((r, j) => {
      const wave = waveOf(r);
      const src = srcOf[r];
      const spawn = SPILL_SNARES[wave] + (GUSH[wave] * (j + 0.5 * hash(r, 3))) / ranks.length;
      const dur = wave === 0 ? 4.5 + 1.5 * hash(r, 5) : Math.min(3.5 + hash(r, 5), LAST - 0.5 - spawn);
      out[r] = { src, spawn, dur, to: SLOTS[r].p, size: SLOTS[r].size, tilt: SLOTS[r].tilt, lift: 40 + 90 * hash(src, 19) };
    });
  }
  return out;
})();

/** The flood at `f` (screen, layout px): each copy pours from its stream's head along the stream's arc (accelerating, like water) to its slot. */
export function floodAt(f: number): { x: number; y: number; size: number; rot: number; alpha: number; landed: boolean }[] {
  if (f < FLOOD) return [];
  const out: { x: number; y: number; size: number; rot: number; alpha: number; landed: boolean }[] = [];
  for (const d of FLOOD_DROPS) {
    if (f < d.spawn) continue;
    const u = clamp((f - d.spawn) / d.dur);
    const e = u * u;
    const a = SOURCES[d.src];
    const b = d.to;
    const c: Point = [(a[0] + b[0]) / 2 - 60, Math.min(a[1], b[1]) - d.lift];
    const x = (1 - e) * (1 - e) * a[0] + 2 * (1 - e) * e * c[0] + e * e * b[0];
    const y = (1 - e) * (1 - e) * a[1] + 2 * (1 - e) * e * c[1] + e * e * b[1];
    const landed = u >= 1;
    // A landing squash springs out over 4 f.
    const t = f - (d.spawn + d.dur);
    const squash = landed ? 1 + 0.12 * Math.exp(-t / 1.5) * Math.cos(1.6 * t) : 1;
    out.push({ x, y, size: d.size * Math.min(1, 0.6 + u) * squash, rot: landed ? d.tilt : 3 * d.tilt, alpha: 1, landed });
  }
  return out;
}

// ——— Defender drafts its counter-measure: the curl (screen, layout px, angles y down) ——————————————————————————————————————————————

/** A compass arc: centre, radius, start and end angles (layout: x right, y down; the arc runs a0 → a1, turning clockwise on screen). */
export type Arc = { centre: Point; r: number; a0: number; a1: number };

/**
 * The great wave's curl as Defender constructs it: the wave builder's WAVE_CURL (src/shots/drop2WaveGeom.ts, contract §6.3), four quarter
 * arcs of a golden spiral, each tangent to the one before and 1/φ of its radius — the crest over the top, the lip down and back, the tip
 * up into the eye. The wave's camera on 10.1 is the identity (its plane = the screen), so drafted in layout px here they are exactly the
 * print's sumi keyline on the cut. The lip stays in the left 60 % (the kaomoji mountain stands right of it).
 */
export const CURL_ARCS: readonly Arc[] = WAVE_CURL.map((a) => ({ centre: [a.cx, a.cy] as Point, r: a.r, a0: rad(a.a0), a1: rad(a.a1) }));

/**
 * Each arc's compass square (layout px): the compass's centre, the arc's two ends and the far corner — together the golden rectangle's
 * squares, the construction everybody overlays on Hokusai's wave. Defender sets the square, then swings the arc through it.
 */
export const CURL_SQUARES: readonly { corners: readonly Point[] }[] = CURL_ARCS.map((a) => {
  const s: Point = [a.centre[0] + a.r * Math.cos(a.a0), a.centre[1] + a.r * Math.sin(a.a0)];
  const e: Point = [a.centre[0] + a.r * Math.cos(a.a1), a.centre[1] + a.r * Math.sin(a.a1)];
  return { corners: [a.centre, s, [s[0] + e[0] - a.centre[0], s[1] + e[1] - a.centre[1]], e] };
});

/** How much of arc `k`'s square is ruled at `f`: half on its 32nd's frame, whole a frame later (the compass is set just ahead of its swing). */
export const squareDrawn = (k: number, f: number): number => clamp((f - ARCS[k] + 1) / 2);

/** How much of arc `k` the compass has drawn at `f`: a third on its 32nd's frame, all of it 2 f later. */
export const arcDrawn = (k: number, f: number): number => clamp((f - ARCS[k] + 1) / 3);

/** The drafting title block (bottom right), drawn in on the flood: its frame over 3 f, then its line typed. */
export function titleBlockAt(f: number): { frame: number; count: number } | null {
  if (f < FLOOD) return null;
  return { frame: clamp((f - FLOOD + 1) / 3), count: Math.max(0, 4 * (frameOf(f) - FLOOD) + 4) };
}

// ——— Photography ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The POV's finishing: vignette 0.35, grain, a little fringing; the red blooms; the leaking light blooms more and lifts the exposure toward the burst. */
export function switchLook(f: number): Look {
  const c = crackAt(f);
  return {
    toneMapping: 'linear',
    exposure: 1 + 0.12 * c + 0.25 * lockFlash(f) + 0.1 * lightPulse(f),
    bloom: { intensity: 0.75 + 1.25 * c, threshold: 0.82, smoothing: 0.3, radius: 0.7 },
    aberration: 0.0007,
    grain: 0.05,
    vignette: 0.35 * (1 - 0.5 * c),
  };
}

/** 32 sub-frames throughout (the camera never stops); 64 on the axonometric turn, the slam and the pull-back; 48 under the flood. */
export function switchTemporal(f: number): Temporal {
  const fast = within(f, [
    [EXPLODE[0] - 1, EXPLODE[0] + 10],
    [BOX - SNAP - 1, BOX + 3],
    [SPILL[0] - 1, SPILL[0] + 11],
  ]);
  // Under the flood the camera is still and only the copies move: a shorter shutter (0.35) keeps them faces in flight, not streaks.
  return { samples: fast ? 64 : f >= FLOOD - SWAP_LEAD ? 48 : 32, shutter: f >= FLOOD - SWAP_LEAD ? 0.35 : 0.5, persistence: 0 };
}

/** One segment with the kernel (the install wipe hands over continuously), cut at the burst. */
export const switchSegment = (f: number): Segment => drop2Segment(f);

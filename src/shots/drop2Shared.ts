// Drop 2's and the ending's shared contracts (build sheet notes/bid2/drop2-sheet2.md §3–§5; the as-built drop 2's
// notes/d2build/sheet.md §3, §5.1, §9): the colour law (red = Defender, amber = him), the palettes, the hero's dress in every world,
// the S27 master layout and its blades (S27 and the reel's blade wipe), the motion curves every shot uses, the hero's pose at every
// hand-off, the grids that must line up across a hand-off (intro bar 4's, T7's = the outro's), the reticle hat, and how Drop2Scene and
// OutroScene split their frames (parts and segments). Pure: Node tests import it, so no three / remotion / react. The sheet agent owns
// this file; builders import it read-only and ask for changes in their HANDOFFS. Layout px: 1920 × 1080, origin top-left, y down.
import type { FontRole } from '../engine/fonts.ts';
import { clamp, lerp } from '../engine/math.ts';
import { slam } from '../motion/hit.ts';
import type { Segment } from '../engine/temporal.ts';
import { RAMP } from '../actors/asciiFace.ts';
import {
  ARCADE,
  BLADES,
  BULLET,
  BURST,
  CRANE,
  CRASH,
  CREST,
  DROP2_END,
  DROP2_START,
  FLOOD,
  FULL_COMBO,
  GAME,
  KERNEL,
  KERNEL_DOLLY,
  LIGHT,
  PICTO,
  POP,
  PROW,
  REEL,
  SEGMENT_CUTS,
  SHEET,
  SWING,
  SWITCH,
  TILT,
  TOTEM,
  TURNS,
} from '../score/drop2.ts';
import { BRIDGE_B_END } from '../score/bridgeB.ts';
import { rigAt } from '../score/energy.ts';
import { OPEN, OUTRO_END, OUTRO_START } from '../score/outro.ts';
import { heroPose, launchCam, omegaOnScreen } from './breakLaunch.ts';
import { HERO_ADVANCE } from './breakShared.ts';
import { FACE, S04_MOVES } from './intro.ts';
import { TERM } from '../worlds/terminal.ts';

export type Point = readonly [number, number];

// ——— The colour law (story bible: 红 = 杀毒，琥珀 = 病毒, the old shots included; sheet §4.1) ———————————————————————————————————

/**
 * Red is Defender's and only Defender's (its voice, its reticles, boxes, scan lines and avatar; the Swiss red circle and grid, which are its
 * lens and its order); amber is his and only his. Two reds, one antivirus: `print` on light grounds, `emissive` (×1.6, bloom on dark) on
 * dark and mid grounds — the interlude's, the cosmos's and the ending's value. An ω on Defender's red is amber (the infection); (￣ω￣) is
 * red with an amber ω, everywhere. Pink #FF3D8B is only the guest's cocktail and its last drop. The system is neutral.
 */
export const LAW = {
  defender: { print: '#E8402B', emissive: '#FF4A1C', emissiveGain: 1.6, onBlue: '#0B1650' },
  hero: '#FFB23E',
  cocktail: '#FF3D8B',
  ok: '#4CF08C',
  warn: '#FFE15C',
  program: '#FF5FA2',
} as const;

/**
 * The colour law in the approved shots (story bible, 2026-10-01): red there that is not the
 * antivirus becomes another colour. In drop 2's carried bars that is his ω drawn in Swiss red — S27's Swiss region, S28's Swiss face, S29's
 * Swiss dialect and the collapse, S30's hero, the reel's Swiss card — which turns amber with a 2 px #111 keyline (SWISS_OMEGA). Each builder
 * flips its own sites under this flag and proves the change stays inside the ω's box (sheet §1.3).
 */
export const COLOR_LAW_V2 = true;
/** His ω on Swiss paper once COLOR_LAW_V2 holds: amber with a 2 px #111 keyline (the paper knock-out kept). */
export const SWISS_OMEGA = { fill: '#FFB23E', keyline: { px: 2, color: '#111111' } } as const;

// ——— Palettes (sheet §3.1; the new worlds: design §4.2) ——————————————————————————————————————————————————————————————————————

/** Every world's colours (sRGB hex; pass them through `linear()` for the engine). */
export const PALETTES = {
  terminal: { ground: '#0C0F0E', text: '#D8F5E1', green: '#4CF08C', amber: '#FFB23E', pink: '#FF5FA2' },
  swiss: { ground: '#F1EEE7', ink: '#111111', red: '#E8402B' },
  riso: { ground: '#F2EDE3', pink: '#FF48B0', blue: '#0078BF', yellow: '#FFE800' },
  neon: { ground: '#07060C', cyan: '#3FE0FF', pink: '#FF3D8B', amber: '#FFB23E' },
  led: { ground: '#121417', amber: '#FFB23E', pink: '#FF5FA2', unlit: '#241F18' },
  interlude: { ground: '#A78BFA', cream: '#FDF3D8', yellow: '#FFD23F', mint: '#5EE6A8', coral: '#FF6B6B', ink: '#111111', amber: '#FFB23E' },
  brutal: { ground: '#FDF3D8', ink: '#111111', yellow: '#FFD23F', coral: '#FF6B6B' },
  space: { ground: '#030409', pearl: '#F4F1EA', gold: '#FFB347', ice: '#6E9BFF', hero: '#FFC46B' },
  // Act 1's new bar and the switch.
  kernel: { ground: '#07090A', floor: '#0E1A14', address: '#D8F5E1', flood: '#4CF08C', veil: '#C8C8C8' },
  pov: { slate: '#22343C', block: '#3A4D56', ink: '#D7ECF2', cyan0: '#0B2350', cyan1: '#23477F', line: '#DCE8F7', crack: '#FFF6E0' },
  // Act 2's five layers.
  ukiyoe: { washi: '#F2E8D5', sky: '#8FA6C4', cloud: '#DCCDB2', prussian: '#1F3F78', deep: '#142B57', light: '#7FA0C8', pale: '#C3D3E6', sumi: '#1B1A18', foam: '#FBF7EE', rows: '#EAF0F2', cartouche: '#F7EEDB', bokashi: '#FFD58A' },
  arcade: { ground: '#000000', sprite: '#F2F2F2', cyan: '#3BD6FF', green: '#3DFF6E' },
  voxel: { floor: '#050608', white: '#FFFFFF', stroke: '#3BD6FF', ghost: '#F6F0E0', glow: '#F6F0E0' },
  memphis: { ground: '#FFFFFF', ink: '#111111', cobalt: '#1F3BFF', magenta: '#FF2E9A', lemon: '#FFE600', turquoise: '#00C2C7', mint: '#4BE3A0' },
  picto: { ground: '#62B6E8', green: '#2FA35B', deep: '#1C6B44', blue: '#2449A0', silver: '#C4CAD1', figure: '#FFFFFF' },
  kaleido: { light: '#FFFFFF', core: '#FFF6E0', rim: '#120E2A', brass: '#A8823C', engraved: '#3A2A10' },
} as const;
export type PaletteName = keyof typeof PALETTES;
/** Alphas the sheet names: Swiss hairlines (#111), dim terminal text, the drained field (T7 → the outro). */
export const ALPHA = { hairline: 0.12, dim: 0.42, drained: 0.42, hexdump: 0.45 } as const;

// ——— The hero's dress per world (sheet §3.5, §5.5, §5.9) ——————————————————————————————————————————————————————————————————————

/** The worlds he is dressed for. */
export type DressWorld = 'interlude' | 'terminal' | 'swiss' | 'riso' | 'neon' | 'led' | 'space';
/**
 * How (•ω•) looks in one world. `fill` null = no solid fill (a tube, dots or ASCII instead). `mouth` is the ω's colour. `tube`: a neon
 * tube on the outline (white-hot core, `TUBE_CORE_GLSL`). `plates`: a Riso fill plate at `fillAlpha` plus a second plate offset by
 * `offset` px, multiplied. `dots`: the glyph mask sampled at `pitch`, lit dots of `radius` with glow. `ascii`: the mask shaded as ASCII
 * (`actors/asciiFace.ts shadeFace`) in cells of `cellW` × `cellH`, ink → highlight on the world's ground.
 */
export type HeroDress = {
  role: FontRole;
  weight: 400 | 800 | 900;
  fill: string | null;
  mouth: string;
  outline?: { px: number; color: string };
  shadow?: { x: number; y: number; color: string; alpha: number };
  tube?: { color: string };
  plates?: { fill: string; fillAlpha: number; offset: Point; offsetInk: string };
  dots?: { pitch: number; lit: string; unlit: string; radius: number };
  ascii?: { cellW: number; cellH: number; ramp: string; ink: string; highlight: string };
  glow?: string;
};

const T = PALETTES.terminal;
const ASCII_FILL = { cellW: 9.6, cellH: 19.2, ramp: RAMP, ink: T.green, highlight: T.text } as const;
const INTERLUDE_DRESS: HeroDress = { role: 'rounded', weight: 800, fill: '#FFB23E', mouth: '#FFB23E', outline: { px: 8, color: '#111111' }, shadow: { x: 14, y: 14, color: '#111111', alpha: 1 } };

/** S27: every region restyles the one rounded master outline (S27_MASTER), so the six worlds register into one face. */
export const S27_TREATMENTS: Readonly<Record<Exclude<DressWorld, 'space'>, HeroDress>> = {
  interlude: INTERLUDE_DRESS,
  terminal: { role: 'rounded', weight: 800, fill: null, mouth: T.pink, ascii: ASCII_FILL },
  swiss: { role: 'rounded', weight: 800, fill: PALETTES.swiss.ink, mouth: PALETTES.swiss.red },
  neon: { role: 'rounded', weight: 800, fill: null, mouth: PALETTES.neon.amber, tube: { color: PALETTES.neon.amber } },
  riso: { role: 'rounded', weight: 800, fill: null, mouth: PALETTES.riso.pink, plates: { fill: PALETTES.riso.pink, fillAlpha: 0.85, offset: [-6, 4], offsetInk: PALETTES.riso.blue } },
  led: { role: 'rounded', weight: 800, fill: null, mouth: PALETTES.led.amber, dots: { pitch: 12, lit: PALETTES.led.amber, unlit: PALETTES.led.unlit, radius: 4.6 } },
};

/** The hero's hard shadow in S28 (it fades in over the pop-out, drop2 1.4&–1.4& + 3). */
const CUBE_SHADOW = { x: 14, y: 14, color: '#000000', alpha: 0.45 } as const;
/** S28: in front of each landed face he wears that world's real font (spec §4), with his hard shadow. */
export const CUBE_DRESS: Readonly<Record<'swiss' | 'riso' | 'led' | 'neon', HeroDress>> = {
  swiss: { role: 'jp', weight: 900, fill: PALETTES.swiss.ink, mouth: PALETTES.swiss.red, shadow: CUBE_SHADOW },
  riso: { role: 'jp', weight: 900, fill: null, mouth: PALETTES.riso.pink, plates: { fill: PALETTES.riso.pink, fillAlpha: 0.85, offset: [-6, 4], offsetInk: PALETTES.riso.blue }, shadow: CUBE_SHADOW },
  led: { role: 'dot', weight: 400, fill: null, mouth: PALETTES.led.amber, dots: { pitch: 12, lit: PALETTES.led.amber, unlit: PALETTES.led.unlit, radius: 4.6 }, shadow: CUBE_SHADOW },
  neon: { role: 'rounded', weight: 800, fill: null, mouth: PALETTES.neon.amber, tube: { color: PALETTES.neon.amber }, shadow: CUBE_SHADOW },
};

/** drop2 bar 7's reel: 600 px, locked at (960, 540), in each card's own look. On the Riso card he is the blue plate over a pink sheet. */
export const REEL_DRESS: Readonly<Record<DressWorld, HeroDress>> = {
  neon: { role: 'rounded', weight: 800, fill: null, mouth: PALETTES.neon.amber, tube: { color: PALETTES.neon.amber } },
  led: { role: 'dot', weight: 400, fill: null, mouth: PALETTES.led.amber, dots: { pitch: 12, lit: PALETTES.led.amber, unlit: PALETTES.led.unlit, radius: 4.6 } },
  swiss: { role: 'jp', weight: 900, fill: PALETTES.swiss.ink, mouth: PALETTES.swiss.red },
  riso: { role: 'jp', weight: 900, fill: PALETTES.riso.blue, mouth: PALETTES.riso.blue },
  interlude: INTERLUDE_DRESS,
  space: { role: 'rounded', weight: 800, fill: PALETTES.space.hero, mouth: PALETTES.space.hero, glow: PALETTES.space.hero },
  terminal: { role: 'rounded', weight: 800, fill: null, mouth: T.pink, ascii: ASCII_FILL },
};

// ——— The S27 master layout and the blades (sheet §3.5, §5.3) ———————————————————————————————————————————————————————————————————

/** A glyph's ink box: [x0, x1, y0, y1] in layout px. */
export type InkBox = readonly [number, number, number, number];

/**
 * (•ω•) in M PLUS Rounded 1c ExtraBold set 1240 px wide (em 459.6, left edge 340, baseline 674.5; the brackets' ink centred on y 540):
 * the S27 composite draws this one outline in every region, and drop2 bar 7's blade wipe reuses it.
 */
export const S27_MASTER = {
  face: '(•ω•)',
  role: 'rounded' as FontRole,
  weight: 800,
  em: 459.6,
  left: 340,
  baseline: 674.5,
  width: 1240,
  centre: [960, 540] as Point,
  /** The ω's ink centre. */
  omega: [960, 558] as Point,
  /**
   * The ω's placement point (the FlatLayer glyph x, y; the convention of the break's `omegaOnScreen` and Drop2Slash's `omegaScreen`):
   * the brackets' ink centre sits 22/360 em below the placement line (drop2Slash.ts MASTER_Y), so y = 540 − 22/360 × em ≈ 511.9.
   */
  omegaPlace: [960, 540 - (22 / 360) * 459.6] as Point,
  ink: { open: [368, 513, 320, 760], eyeL: [583, 718, 440, 575], mouth: [792, 1128, 436, 680], eyeR: [1202, 1337, 440, 575], close: [1407, 1552, 320, 760] } as Readonly<Record<string, InkBox>>,
  /** The determined brows (spacing ˋ ˊ, 0.55 em above each eye centre) until the second blade. */
  brows: { left: 'ˋ', right: 'ˊ', y: 254, until: BLADES[1] },
  /** Arms outside the brackets: ヽ ノ from the second blade, ＼ ／ from the fifth. */
  arms: [
    { from: BLADES[1], left: 'ヽ', right: 'ノ', at: [[250, 400], [1670, 400]] as readonly Point[] },
    { from: BLADES[4], left: '＼', right: '／', at: [[230, 380], [1690, 380]] as readonly Point[] },
  ],
} as const;

/** One of S27's blades: its tip runs `from` → `to` (3 f, S-curve keyed one frame early), splitting `splits`; the piece on `side` becomes `world`. */
export type BladeLine = { id: string; from: Point; to: Point; splits: 'frame' | 'terminal' | 'interlude'; side: 'above' | 'right' | 'left'; world: 'terminal' | 'swiss' | 'riso' | 'neon' | 'led'; seam: string; shing: string; pan: number };

/**
 * C1–C5 in BLADES order (sheet §5.3). Seams: 4 px white with bloom for 6 f, then 2 px in `seam`. C5 (iteration 3) cuts through his right
 * cheek, between the ω and the ")" — C3's mirror — so its LED piece takes his whole lower right on the drop2 1.4 kick, not just the bracket's tail.
 */
export const BLADE_LINES: readonly BladeLine[] = [
  { id: 'C1', from: [0, 540], to: [1920, 540], splits: 'frame', side: 'above', world: 'terminal', seam: PALETTES.terminal.green, shing: 'F♯6', pan: -0.4 },
  { id: 'C2', from: [1205, 0], to: [1160, 540], splits: 'terminal', side: 'right', world: 'swiss', seam: PALETTES.swiss.red, shing: 'A♯6', pan: 0.5 },
  { id: 'C3', from: [720, 1080], to: [760, 540], splits: 'interlude', side: 'left', world: 'riso', seam: PALETTES.riso.pink, shing: 'C♯7', pan: -0.6 },
  { id: 'C4', from: [590, 0], to: [550, 540], splits: 'terminal', side: 'left', world: 'neon', seam: PALETTES.neon.cyan, shing: 'D♯7', pan: 0.3 },
  { id: 'C5', from: [1240, 1080], to: [1205, 540], splits: 'interlude', side: 'right', world: 'led', seam: PALETTES.led.amber, shing: 'F♯7', pan: 0.6 },
];

// ——— Motion vocabulary (sheet §5.1: the break's, so the seam feels like one film) ——————————————————————————————————————————————

const SPRING_OMEGA = 0.674;

/**
 * L, the launch: a damped spring (ζ 0.67, ω 0.674 rad/f) keyed one frame before its beat `at`, so the beat frame already moves:
 * 16.6 / 47.4 / 75.0 / 93.4 / 102.8 / 105.8 % on at … at + 5, 103.6 % at + 7, 100.6 % at + 9, settled by + 11. `zeta` 0.75 is the soft L.
 */
export function springL(f: number, at: number, zeta = 0.67): number {
  const t = f - (at - 1);
  if (t <= 0) return 0;
  const wd = SPRING_OMEGA * Math.sqrt(1 - zeta * zeta);
  const k = zeta * SPRING_OMEGA;
  return 1 - Math.exp(-k * t) * (Math.cos(wd * t) + (k / wd) * Math.sin(wd * t));
}

/** I, the impact: eases in (cubic, p = u³) over `lead` frames and arrives exactly on `at` (1 from there on). */
export function impact(f: number, at: number, lead = 6): number {
  const u = clamp((f - (at - lead)) / lead);
  return u * u * u;
}

/**
 * The whip that slams (iteration 2, the director's ruling 7; sync review 1): 0 on `from`, easing in (u^power: cubic as motion/hit.ts
 * slam, steeper for the camera whips whose frame changes world on its last frames) to land exactly on `to` at its fastest — the biggest
 * change of the move falls on the downbeat itself, not on the "and" before it — then, with `bounce`, slam's recoil of bounce × 5 % that
 * rings out by `to` + 12. Drop 2's three heavy whips (drop2 2.4& → 3.1, drop2 5.4& → 6.1, drop2 6.4& → 7.1) use it; a launch (springL, the
 * whip-pan's old ease-out) put their biggest change on the offbeat.
 */
export const whipSlam = (f: number, from: number, to: number, bounce = 0, power = 3): number =>
  f < to ? (f <= from ? 0 : ((f - from) / (to - from)) ** power) : slam(f, to, to - from, bounce);

/** The impact's squash on landing: +s along the motion and −s across it, 1 − 0.06·e^(−0.45t)·cos(0.9t) springing back over ≈ 8 f. */
export function impactSquash(f: number, at: number): number {
  const t = f - at;
  return t < 0 ? 0 : 0.06 * Math.exp(-0.45 * t) * Math.cos(0.9 * t);
}

/** S, the snap: cubic-out over 6 f to 104 %, then 2 f back to 100 %. */
export function snap(f: number, at: number): number {
  const t = f - at;
  if (t <= 0) return 0;
  if (t < 6) return 1.04 * (1 - (1 - t / 6) ** 3);
  return t < 8 ? lerp(1.04, 1, (t - 6) / 2) : 1;
}

/** F, the flow: ease-in-out sine on u (clamped to 0–1). */
export const flow = (u: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u));

/** The pop: scale 0.6 → 1.05 → 1.0 over 5 f (cubic-out to the peak on + 3, then sine). */
export function pop(f: number, at: number): number {
  const t = f - at;
  if (t <= 0) return 0.6;
  if (t < 3) return lerp(0.6, 1.05, 1 - (1 - t / 3) ** 3);
  return t < 5 ? lerp(1.05, 1, flow((t - 3) / 2)) : 1;
}

/** The neo-brutal press: (+8, +8) in 2 f while the hard shadow shrinks to a third, recovering over 8 f (F). */
export function press(f: number, at: number): { x: number; y: number; shadow: number } {
  const t = f - at;
  const p = t <= 0 ? 0 : t < 2 ? t / 2 : t < 10 ? 1 - flow((t - 2) / 8) : 0;
  return { x: 8 * p, y: 8 * p, shadow: 1 - (2 / 3) * p };
}

/** The hop: up 12 px over 3 f (cubic-out), down by + 8 (cubic-in); the landing gets impactSquash(f, at + 8). Returns px up. */
export function hop(f: number, at: number, height = 12): number {
  const t = f - at;
  if (t <= 0 || t >= 8) return 0;
  return t < 3 ? height * (1 - (1 - t / 3) ** 3) : height * (1 - ((t - 3) / 5) ** 3);
}

// ——— The seam on drop2 1.1 and the hero at every hand-off (sheet §3.4, §4.0, §9) ———————————————————————————————————————————————

/**
 * The break's last frame, on screen, read live from the break's pure launch module (review R1-seam: a literal went stale every time the break
 * re-tuned break bar 6): ─=≡Σ((( つ•̀ω•́)つ wound up, his ω's placement point on screen = `omegaOnScreen(DROP2_START − 1)` (≈ (614, 573) at 04:35), his
 * (•ω•) core's width on screen (the brackets squashed by the body's x, the •ω• by the face's, × em × the shot camera × the rig: ≈ 983 px)
 * and the body's squash (x 0.82, y 1.10).
 */
const SEAM_POSE = heroPose(DROP2_START - 1);
const SEAM_ZOOM = launchCam(DROP2_START - 1).zoom * rigAt(DROP2_START - 1).zoom;
const SEAM_CORE = (HERO_ADVANCE['('] + HERO_ADVANCE[')']) * SEAM_POSE.sx + (2 * HERO_ADVANCE['•'] + HERO_ADVANCE['ω']) * SEAM_POSE.fx;
export const SEAM_FROM: { readonly omega: Point; readonly width: number; readonly squash: Point } = {
  omega: omegaOnScreen(DROP2_START - 1),
  width: SEAM_CORE * SEAM_POSE.em * SEAM_ZOOM,
  squash: [SEAM_POSE.sx, SEAM_POSE.sy],
};

/** The hero across the seam: the launch (L keyed at the break's last frame) from the break's pose to the S27 master — his ω, his width and his squash. */
export function heroSeam(f: number): { omega: [number, number]; width: number; squash: [number, number] } {
  const p = springL(f, DROP2_START);
  return {
    omega: [lerp(SEAM_FROM.omega[0], S27_MASTER.omegaPlace[0], p), lerp(SEAM_FROM.omega[1], S27_MASTER.omegaPlace[1], p)],
    width: lerp(SEAM_FROM.width, S27_MASTER.width, p),
    squash: [lerp(SEAM_FROM.squash[0], 1, p), lerp(SEAM_FROM.squash[1], 1, p)],
  };
}

/** The hero at a hand-off: his face string, the look he wears, his face width (bracket to bracket) and its centre on screen. */
export type HeroPose = { frame: number; face: string; look: string; width: number; centre: Point; note: string };

/** Every row of the sheet's §3.4 that a hand-off pins (§9): both sides of a hand-off assert against these. */
export const HANDOFFS: readonly HeroPose[] = [
  { frame: DROP2_START - 1, face: '─=≡Σ((( つ•̀ω•́)つ', look: 'interlude', width: SEAM_FROM.width, centre: SEAM_FROM.omega, note: 'H0: the break, behind the film (centre = his ω, the break’s live omegaOnScreen)' },
  { frame: DROP2_START, face: '─=≡Σ((( つ•̀ω•́)つ', look: 'interlude', width: heroSeam(DROP2_START).width, centre: heroSeam(DROP2_START).omega, note: 'H0: through the film, launch frame 1 (centre = his ω, as Drop2Slash draws it)' },
  { frame: DROP2_START + 12, face: '(•ω•)', look: 's27', width: 1240, centre: S27_MASTER.centre, note: 'S27 settled: the master' },
  { frame: TURNS[0].to, face: '┌(•ω•)┘', look: 'cube.swiss', width: 960, centre: [960, 520], note: 'S28: face B lands' },
  { frame: POP, face: '(•ω•)', look: 'zbuf.terminal', width: 960, centre: [960, 520], note: 'H1: the dimension pop' },
  { frame: SWING.to, face: '(•ω•)', look: 'zbuf.bar4', width: 1970, centre: [960, 540], note: 'bar 4’s frame (ink width, brackets cropped)' },
  { frame: GAME - 1, face: '(•ω•)', look: 'zbuf.swiss', width: 560, centre: [960, 520], note: 'H2: converged and flat' },
  { frame: GAME, face: '(•ω•)', look: 'game', width: 560, centre: [960, 520], note: 'H2: the hard match cut (paper → paper, Δ 0 px), then the crane' },
  { frame: CRANE.to, face: '└(•ω•)┐', look: 'game', width: 560, centre: [960, 520], note: 'the crane settled: the road at 32°' },
  { frame: FULL_COMBO, face: '＼(•ω•)／', look: 'game', width: 560, centre: [960, 400], note: 'FULL COMBO: the leap' },
  { frame: TILT.to, face: 'ᕕ(•ω•)ᕗ', look: 'overflow', width: 420, centre: [590, 380], note: 'H3: lands surfing' },
  { frame: KERNEL.from, face: '(•ω•)', look: 'kernel', width: 600, centre: [960, 640], note: 'the whip-pan lands him in kernel space (0x80000000), squash 1.08 / 0.92' },
  { frame: KERNEL_DOLLY.to, face: '(•ω•)', look: 'kernel', width: 600, centre: [960, 540], note: 'the dolly lands: framed by the cracked core ring (Ø 900)' },
  { frame: SWITCH.from, face: '(•ω•)', look: 'pov.v2', width: 600, centre: [960, 540], note: 'Defender v2.0’s POV: a white blueprint outline (no amber in its eyes); the reticle ring Ø 900 = the kernel’s' },
  { frame: FLOOD, face: '(•̀ω•́)', look: 'pov.v2', width: 510, centre: [960, 540], note: 'his own box holds, cracking with light; the amber copies flood' },
  { frame: BURST, face: '＼(•ω•)／', look: 'ukiyoe', width: 760, centre: [960, 540], note: 'the burst: he erupts from the box’s centre (L to (900, 420) by + 12), woodblock amber' },
  { frame: CREST, face: '〜(•ω•)〜', look: 'ukiyoe', width: 560, centre: [640, 300], note: 'on the crest' },
  { frame: PROW, face: 'ヽ(•ω•)ノ', look: 'ukiyoe', width: 480, centre: [1300, 640], note: 'on the lead boat’s prow' },
  { frame: ARCADE.from, face: '(•ω•)', look: 'arcade', width: 546, centre: [960, 230], note: 'the amber mothership (13 × 9 at 42 px a pixel)' },
  { frame: ARCADE.to, face: '(•ω•)', look: 'voxel', width: 520, centre: [960, 230], note: 'the voxel mothership rising off the tilted floor, ≥ 520 px on screen, cropped by the top edge' },
  { frame: TOTEM, face: '(•ω•)', look: 'memphis', width: 600, centre: [960, 420], note: 'the totem’s face block (squash 1.12 / 0.88)' },
  { frame: PICTO, face: '(•ω•)', look: 'picto', width: 240, centre: [960, 300], note: 'the pictogram’s head disc (face 200, figure 880 px tall): the size rule is the figure' },
  { frame: SHEET, face: '(•ω•)', look: 'picto.sheet', width: 130, centre: [960, 540], note: 'the contact sheet’s centre tile: the one beat under 420 px (every tile is him)' },
  { frame: LIGHT.from, face: '(•ω•)', look: 'kaleido', width: 520, centre: [960, 540], note: 'unmirrored at the mandala’s centre, 6 px #111 outline' },
  { frame: REEL.from, face: '(•ω•)', look: 'reel.neon', width: 600, centre: [960, 540], note: 'H4: lands in the reel (as built), arriving lit at 0.6; the tube ignites at full with a pop (×1.6 → 1 over 6 f, no flicker)' },
  { frame: REEL.to, face: '(•ω•)', look: 'field', width: 900, centre: [960, 540], note: 'stuck in ASCII, the crash-zoom lands' },
  { frame: CRASH, face: '(×ω×)', look: 'field', width: 1020, centre: [960, 540], note: 'the freeze' },
  { frame: BULLET.from, face: '(×ω×)', look: 'bullet', width: 1020, centre: [960, 540], note: 'THE FRAME, front-on: the orbit leaves it (front views pixel-identical to the 2D frame)' },
  { frame: DROP2_END, face: '(×ω×)', look: 'field', width: 1020, centre: [960, 540], note: 'v08, bridge B 1.1: the tape stop lands front-on (360°), at rest; the crash comes apart in the bridge, a stage a beat' },
  { frame: BRIDGE_B_END - 1, face: '(×ω×)', look: 'condensed', width: 440, centre: [960, 450], note: 'H5: condensed (bridge B’s last frame)' },
  { frame: OUTRO_START, face: '(×ω×)', look: 'log', width: 440, centre: [960, 450], note: 'H5: the log' },
  { frame: OPEN, face: 'ヽ(•ω•)ﾉ', look: 'lens', width: 470, centre: [960, 540], note: 'H6: the lens opens' },
  { frame: OUTRO_END - 1, face: '(•ω<)✧', look: 'lens', width: 470, centre: [960, 505], note: 'the last frame' },
];

// ——— Grids that must line up across a hand-off ———————————————————————————————————————————————————————————————————————————

/** S04's giant ASCII face as its camera held it (shots/intro.ts FACE seen at S04_MOVES' zoom 1.3): S29 lands in it on drop2 4.4. */
const BAR4_ZOOM = S04_MOVES[S04_MOVES.length - 1].aim.zoom;
export const BAR4 = {
  cellW: FACE.cellW * BAR4_ZOOM,
  cellH: FACE.cellH * BAR4_ZOOM,
  col0: FACE.cols / 2 - 0.5,
  row0: FACE.rows / 2 - 0.5,
  centre: [960, 540] as Point,
  inkWidth: 1970,
  fov: 12,
} as const;
/** The screen centre (layout px) of S04's face cell (col, row) in intro bar 4's frame. */
export const bar4CellCentre = (col: number, row: number): [number, number] => [BAR4.centre[0] + BAR4.cellW * (col - BAR4.col0), BAR4.centre[1] + BAR4.cellH * (row - BAR4.row0)];

/** Drop 2's own character field from drop2 8.1 − 1 and T7 (sheet §5.10.2): the intro's terminal grid extended to bleed, so outro 1.1 decodes in place. */
export const T7_GRID = { cellW: TERM.cellW, cellH: TERM.cellH, left: TERM.left, top: TERM.top, fontPx: TERM.fontPx, cols: [-7, 139] as Point, rows: [-2, 33] as Point, ramp: RAMP } as const;
/** The layout centre of T7 cell (col, row): the same cells as worlds/terminal.ts cellCenter (which works in the flat world's y-up frame). */
export const t7CellCentre = (col: number, row: number): [number, number] => [T7_GRID.left + (col + 0.5) * T7_GRID.cellW, T7_GRID.top + (row + 0.5) * T7_GRID.cellH];
/** His mask in the frozen field (drop2 8.3): which cells are his, and their ramp index clamped to 4–6 (`=+*`), so the outro rebuilds the hexdump. */
export const T7_HERO = { face: '(×ω×)', role: 'rounded' as FontRole, weight: 800, width: 1020, centre: [960, 540] as Point, minIndex: 4, maxIndex: 6 } as const;
/** The crisp (×ω×) T7 condenses into and the outro starts from (H5). */
export const T7_CONDENSED = { face: '(×ω×)', role: 'rounded' as FontRole, weight: 800, em: 163, width: 440, centre: [960, 450] as Point } as const;

// ——— The reticle hat (design §4.15; decision A4: the ending's guest wears it on his walk-on and doffs it on his bow) ————————————————

/**
 * Defender v2.0's reticle at 30 %: its four L brackets (arms 36 px, stroke 4 px, a 150 × 110 px box) and its centre ring (r 27), emissive
 * red, worn on the guest's head tilted 15° like a party hat. Its source is the one unmirrored reticle that spins off on the give-up
 * (score HAT_FLIGHT: 2.5 turns, shrinking to 30 %, out past the top-right corner); it is on his head as he drops in on 19.1 and settles
 * with a 4 px bounce a beat later.
 */
export const RETICLE_HAT = { scale: 0.3, arm: 36, stroke: 4, box: [150, 110] as Point, ring: 27, color: LAW.defender.emissive, tilt: 15, turns: 2.5, bounce: 4 } as const;

// ——— Parts and segments ——————————————————————————————————————————————————————————————————————————————————————————————————

export type Part = { name: string; from: number; to: number };

/**
 * Drop2Scene's parts, by frame (sheet §2.3), in film order. The carried shots keep their builders' parts: Drop2Slash (the pop, S27, S28),
 * Drop2Zbuf (S29), Drop2Game (S30 opened to two bars + S31), Drop2Overload (the reel, the stuck bar, the crash; and the drain after the
 * bullet time). Each new bar is a part of its own (a stub until built: src/scenes/drop2Stub.ts). A name may come back (the overload draws
 * the drain too): the dispatcher maps names to renderers.
 */
export const DROP2_PARTS: readonly Part[] = [
  { name: 'slash', from: DROP2_START, to: POP },
  { name: 'zbuf', from: POP, to: GAME },
  { name: 'game', from: GAME, to: KERNEL.from },
  { name: 'kernel', from: KERNEL.from, to: SWITCH.from },
  { name: 'switch', from: SWITCH.from, to: BURST },
  { name: 'wave', from: BURST, to: ARCADE.from },
  { name: 'arcade', from: ARCADE.from, to: ARCADE.to },
  { name: 'voxel', from: ARCADE.to, to: TOTEM },
  { name: 'memphis', from: TOTEM, to: PICTO },
  { name: 'picto', from: PICTO, to: LIGHT.from },
  { name: 'kaleido', from: LIGHT.from, to: REEL.from },
  { name: 'overload', from: REEL.from, to: BULLET.from },
  // v08 (bridge B): the bullet time draws drop 2's last beat on its camera's time (the tape stop), handing its sub-frames to the crash shot
  // (Drop2Overload) from its landing on; the drain is bridge B's (src/scenes/bridgeB.ts draws the crash shot on its own clocks).
  { name: 'bullet', from: BULLET.from, to: DROP2_END },
];
/** OutroScene's parts: OutroLog (S33, the squeeze and the line) and OutroLens (S34). */
export const OUTRO_PARTS: readonly Part[] = [
  { name: 'log', from: OUTRO_START, to: OPEN },
  { name: 'lens', from: OPEN, to: OUTRO_END },
];

const partIndex = (parts: readonly Part[], frame: number): number => {
  const k = parts.findIndex((p) => frame >= p.from && frame < p.to);
  return k >= 0 ? k : frame < parts[0].from ? 0 : parts.length - 1;
};
/** The drop 2 part that draws instant `frame` (a sub-frame instant for render, an output frame for the rest); outside, the nearest. */
export const drop2PartIndex = (frame: number): number => partIndex(DROP2_PARTS, frame);
export const outroPartIndex = (frame: number): number => partIndex(OUTRO_PARTS, frame);

/** The segment of drop 2 that holds output frame `frame`: bounded by the hard cuts and the freeze (SEGMENT_CUTS) and nothing else. */
export function drop2Segment(frame: number): Segment {
  const edges = [DROP2_START, ...SEGMENT_CUTS, DROP2_END];
  const f = Math.min(Math.max(frame, DROP2_START), DROP2_END - 1);
  let k = 0;
  while (k + 2 < edges.length && f >= edges[k + 1]) k++;
  return { from: edges[k], to: edges[k + 1] };
}
/** The ending has no hard cut: one segment. */
export const outroSegment = (): Segment => ({ from: OUTRO_START, to: OUTRO_END });

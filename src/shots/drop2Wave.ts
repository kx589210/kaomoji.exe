// S31U UKIYO-E, drop2 10.1–12.1 − 1 (2.5D), layer 1/5 `ukiyoe.print` (builder U · WAVE; build sheet notes/bid2/drop2-sheet2.md §3
// "drop2 10–11", §4.3, §5 #12–#14, §6.3; design notes/extend/drop2-final.md §4.8; notes D1 and D2). Defender prints a
// great wave to drown him; the wave turns into him.
//   10.1 the burst + inversion cut: the box blows open and the blueprint is a woodblock positive, every line in place (Defender's compass
//        arcs are the curl's sumi keyline, WAVE_CURL); he erupts at 760 px; the print prints block by block on the 16ths, each block 3 px
//        off register, snapping in (keyline · pale · Prussian · sky + THE SMALL KAOMOJI MOUNTAIN · boats + the cartouche's frame).
//   10.2 he kicks off (3 f of anticipation) and surfs: down into the hollow, a bottom turn on the trough, up the face, off the lip and onto
//        the crest (10.3, crisp, a recoil); the camera rides the loop with him; his board lays an amber wake that bleeds into the blue.
//        10.2& the fingers turn toward the boats. 10.3 the rowers look up; the boats fling red boxes the foam eats; spray off his board.
//   10.4 the barrel: the camera dives under the lip, rolling with it; the lip pitches forward, the wave bending (never breaking: round 2).
//        11.1 THE CRASH: the lip lands on the boats on the frame and a burst of round cartoon foam whites out the picture for 3 frames
//        (round 2, R2-04); under it the lip folds back into a small foam nose at the crest's end; the burst breaks up into the tongues of
//        foam and the spray, he is spat out. 11.1& the camera pulls back to the spent wave (lower, its foam nose sinking forward), the
//        mountain untouched. 11.2 the boats come up infected and rock on the hats; his amber seal stamps with a recoil; the cartouche inks
//        the signature's bytes. 11.2& he lands on the prow, breathing; the camera never stops. 11.4 Defender downgrades the world: a red
//        scan line sweeps down and everything above it quantises a step a 16th (4 → 8 → 16 → 32 px, the film's 16 colours, the paper
//        black); the spray becomes game pixels that fly to the formation's cells; he leaps to the top centre and becomes the mothership.
// Pure: Node tests import it. Planes are drawn in layout px (y down) through a 2.5D camera (each plane's parallax k: scale zoom^k, its
// focus moved k of the camera's); glyphs are returned in the flat world (centre origin, y up).
import { GUEST, GUEST_INFECTED, GUEST_VARIANTS } from '../content/castDrop2.ts';
import { HERO2, SIGNATURE } from '../content/drop2.ts';
import { type RGB, linear } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp, smoothstep } from '../engine/math.ts';
import { hash, noise1 } from '../engine/random.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import { FLAT_LOOK, type Look } from '../engine/types.ts';
import { strike } from '../motion/hit.ts';
import { ARCADE, BARREL, BLOCKS, BURST, CLAWS, CREST, DOWNSAMPLE, DOWNSAMPLE_STEPS, OPEN_HATS2, PROW, SEAL, TAIKO2, WAVE_CRASH } from '../score/drop2.ts';
import { partFrame, v07Frame } from '../score/film.ts';
import { GP, HERO_BITMAP, MOTHERSHIP, SIGNATURE_BITS, cellCentre, litOf } from './drop2ArcadeSprites.ts';
import { LAW, PALETTES, drop2Segment, flow, impactSquash } from './drop2Shared.ts';
import {
  BACK,
  BOATS,
  BOTTOM,
  type Boat,
  CAP,
  CLAW_ROWS,
  CREST_TOP,
  type Claw,
  type ClawRow,
  EDGE,
  type EdgePoint,
  FACE,
  FACE_LINES,
  FOAM_DOTS,
  FOAM_LINES,
  FRONT_CLAW_ROWS,
  FRONT_CURL,
  FRONT_EDGE,
  FRONT_END,
  FRONT_FACE,
  FRONT_FOAM,
  FRONT_WATER,
  type FoamLine,
  HORIZON,
  LIP_CLAWS,
  LIP_CUT,
  MOUNDS,
  MOUNTAIN,
  MOUNTAIN_FACES,
  MOUNTAIN_SHAPE,
  type Mound,
  SCROLL_REST,
  SCROLL_ROW,
  SNOW_CAP,
  SNOWLINE,
  STRIPES,
  SWELLS,
  type Stripe,
  TROUGH_Y,
  WATER,
  WATER_END,
  WAVE_CURL,
  type XY,
  arcPoint,
  capDepth,
  clawOutline,
  clawsOf,
  curlPoint,
  curlRun,
  dashes,
  edgeAt,
  frontClaws,
  frontThickness,
  growClaw,
  gunwaleOf,
  hullOutline,
  keyWidth,
  lipClaws,
  lipThickness,
  lipWeight,
  moundTop,
  offsetPolyline,
  prowOf,
  subPolyline,
  swellOutline,
} from './drop2WaveGeom.ts';

export { WAVE_CURL } from './drop2WaveGeom.ts';

const P = PALETTES.ukiyoe;
const mixLin = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const CP = {
  washi: linear(P.washi),
  sky: linear(P.sky),
  cloud: linear(P.cloud),
  /** D2: the darker grey-blue band of sky behind the mountain, near the horizon. */
  haze: linear('#97A3B4'),
  prussian: linear(P.prussian),
  deep: linear(P.deep),
  light: linear(P.light),
  pale: linear(P.pale),
  sumi: linear(P.sumi),
  foam: linear(P.foam),
  cartouche: linear(P.cartouche),
  amber: linear(LAW.hero),
  bokashi: linear(P.bokashi),
  red: linear(LAW.defender.print),
  redDeep: linear('#9E2A1B'),
  /** The rowers' faces: Defender's red, darkened to read on their cream heads. */
  rower: linear('#8A1E12'),
  scan: linear(LAW.defender.emissive, LAW.defender.emissiveGain * 1.6),
  black: linear('#000000'),
  white: linear('#F2F2F2'),
};
type Ink = { [K in keyof typeof CP]: RGB };
/**
 * Defender's 8-bit downgrade of the same print (drawn only under the downsample, then quantised above the scan line): the paper, the sky
 * and the clouds go black, the Prussian goes NES blue, the light blues go the arcade's cyan, the foam its sprite white; his amber and
 * Defender's red stay.
 */
const CG: Ink = {
  ...CP,
  washi: linear('#000000'),
  sky: linear('#000000'),
  cloud: linear('#000000'),
  haze: linear('#0A1440'),
  prussian: linear('#1A3BB0'),
  deep: linear('#0A1440'),
  light: linear('#1F6FD6'),
  pale: linear('#3BD6FF'),
  sumi: linear('#000000'),
  foam: linear('#F2F2F2'),
  cartouche: linear('#000000'),
};
/** The game palette the quantised picture snaps to (sRGB hex). */
export const GAME_PALETTE: readonly string[] = ['#000000', '#0A1440', '#1A3BB0', '#1F6FD6', '#3BD6FF', '#F2F2F2', '#FFB23E', '#E8402B', '#9E2A1B', '#FF4A1C'];
/** The inks of the frame being built (waveFrame sets it for the print or the game version; single-threaded and reset after each call). */
let C: Ink = CP;
/** The blue block's ramp: pale 0 · light ⅓ · Prussian ⅔ · deep 1 (linear light), in the current inks. */
function blue(t: number): RGB {
  const stops = [C.pale, C.light, C.prussian, C.deep];
  const x = clamp(t) * 3;
  const i = Math.min(2, Math.floor(x));
  return mixLin(stops[i], stops[i + 1], x - i);
}

/** Layout px → the flat world (centre origin, y up). */
const ex = (x: number): number => x - 960;
const ey = (y: number): number => 540 - y;
const rad = (d: number): number => (d * Math.PI) / 180;

// ——— Time: every frame from the score, part-local offsets only ——————————————————————————————————————————————————————————

/** The part's span: the burst (10.1) to the arcade (12.1). */
export const WAVE = { from: BURST, to: ARCADE.from } as const;
/** The blocks, in printing order (score BLOCKS: one a 16th). */
export type Block = 'key' | 'pale' | 'prussian' | 'sky' | 'boats';
export const BLOCK_ORDER: readonly Block[] = ['key', 'pale', 'prussian', 'sky', 'boats'];
export const blockAt = (b: Block): number => BLOCKS[BLOCK_ORDER.indexOf(b)];
/** The direction each colour block lands out of register from (px, y down); it snaps in over 3 frames. The keyline is the switch's drafting itself: in register from its first frame (WAVE_CURL's contract). */
const REG: Readonly<Record<Block, XY>> = { key: [0, 0], pale: [-2.4, 1.8], prussian: [1.8, 2.4], sky: [-1.8, -2.4], boats: [2.4, 1.8] };

/** Whether block `b` has printed by `f` (taken half a frame early, so its drum frame shows it whole), and its register offset. */
export function blockState(b: Block, f: number): { on: boolean; dx: number; dy: number } {
  const t = f - blockAt(b) + 0.25;
  if (t < 0) return { on: false, dx: 0, dy: 0 };
  const k = 1 - clamp(t / 3);
  const jitter = t < 3 && b !== 'key' ? 0.4 * (hash(BLOCK_ORDER.indexOf(b), Math.floor(v07Frame(f))) - 0.5) : 0; // v07Frame: the draw approved on the 61-bar map
  return { on: true, dx: REG[b][0] * k + jitter, dy: REG[b][1] * k + jitter };
}

/** Film frame of drop2 11's beat (1-based, fractional). */
const at11 = (beat: number): number => partFrame('drop2', 11, beat - 1);
/** The prow stomp beat (11.3): a squash, the boat dipping under him. */
const PROW_BEAT = at11(3);

// ——— The 2.5D camera —————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The camera: the plane point at the frame's centre (on the wave's plane, k = 1), its zoom and roll (radians, + = counter-clockwise). */
export type WaveCam = { fx: number; fy: number; zoom: number; roll: number };
/** Parallax of each plane (design §4.8; the mountain between the sky and the far swells, sheet §4.3; each boat and mound its own k). */
export const PLANE = { sky: 0.2, cloud: 0.3, mountain: 0.35, swells: 0.4, sea: 0.45, wave: 1, front: 1.06, claws: 1.1, spray: 1.3 } as const;

/** The barrel's aim: inside the hollow, the lip overhead, the boats ahead under its front (the crash lands in frame). */
const DIVE_AIM: XY = [1100, 650];
/** How deep the barrel dives (zoom on the wave's plane) and how far it rolls with the curl (radians). */
const DIVE_ZOOM = 1.75;
const DIVE_ROLL = -0.3;
/** After the crash the camera frames the spent print a little right of centre (the mountain, the boats). */
const REST: WaveCam = { fx: 1010, fy: 548, zoom: 1, roll: 0 };

/** The crest landing's impact on the camera (10.3): a 6 % push-in struck on the beat, easing off over 8 frames. */
const landKick = (f: number): number => (f >= CREST - 0.25 ? 0.06 * Math.exp(-Math.max(0, f - CREST) / 3.5) * clamp((f - CREST + 0.25) / 0.25) : 0);

/** The camera's zoom before the dive: the burst's push (1 → 1.03), out to 0.95 for his loop (D2: the whole massive wave), in for the crest. */
function zoomBefore(f: number): number {
  if (f < BLOCKS[4]) return lerp(1, 1.03, flow((f - BURST) / (BLOCKS[4] - BURST)));
  const turn = BLOCKS[4] + 8;
  if (f < turn) return lerp(1.03, 0.96, ease.outCubic(clamp((f - BLOCKS[4]) / 8)));
  const climb = BLOCKS[4] + 12;
  if (f < climb) return 0.96;
  if (f < CREST) return lerp(0.96, 1.04, flow((f - climb) / (CREST - climb)));
  return lerp(1.04, 1.06, flow((f - CREST) / (BARREL.from - CREST)));
}

/**
 * The camera at f. 10.1 → 10.4: a slow truck left and rise; from 10.1&a it rides his loop with him (two fifths of his moves across, more than half
 * of them up and down: the 炫技 of D2 — the camera travels the bigger wave). 10.4 → 11.1: the dive under the lip, rolling with it. 11.1:
 * held in the crash. 11.1& → 11.2 + 6: the pull-back to the rest frame (L), then a camera that never stops (a slow push to the top centre).
 */
export function waveCam(f0: number): WaveCam {
  // On the beat frames he lands on, the camera too is taken at the frame's own instant: the landing frame is crisp (T04).
  const f = crispTime(f0);
  const pre = Math.min(f, BARREL.from);
  const u = flow((pre - BURST) / (BARREL.from - BURST));
  const g = smoothstep(BLOCKS[4] - 8, BLOCKS[4] - 1, pre);
  const h = g > 0 ? heroPlane(pre) : ERUPT_TO;
  // How much of his move the camera takes: a little more in the climb (the fastest stretch), so on screen he never outruns 40 px a frame.
  const climb = smoothstep(BLOCKS[4] + 11, BLOCKS[4] + 15, pre);
  const kx = lerp(0.4, 0.62, climb);
  const ky = lerp(0.56, 0.72, climb);
  let cam: WaveCam = { fx: lerp(960, 900, u) + kx * (h[0] - ERUPT_TO[0]) * g, fy: lerp(540, 520, u) + ky * (h[1] - ERUPT_TO[1]) * g, zoom: zoomBefore(pre) * (1 + landKick(pre)), roll: 0 };
  // 10.4 → 11.1: the dive into the hollow, rolling with the curl: a lurch forward on the 10.4 kick (fast-out), then accelerating all
  // the way into the crash on 11.1.
  if (f > BARREL.from) {
    const t = clamp((f - BARREL.from) / (BARREL.to - BARREL.from));
    const p = 0.3 * strike(f, BARREL.from, 2, 0) + 0.7 * t ** 2;
    cam = { fx: lerp(cam.fx, DIVE_AIM[0], p), fy: lerp(cam.fy, DIVE_AIM[1], p), zoom: Math.exp(lerp(Math.log(cam.zoom), Math.log(DIVE_ZOOM), p)), roll: lerp(0, DIVE_ROLL, p) };
  }
  // 11.1 → 11.1&: held in the crash; 11.1& → 11.2 + 6: the pull-back out of it to the rest frame (L, no overshoot).
  // The spit (11.1 + 6): a fast pull-back two thirds of the way (fast-out, mostly done by 11.1&); the rest struck on 11.2 (the seal's
  // thunk: an impact move).
  const back = WAVE_CRASH + 6;
  if (f >= back) {
    const p = 0.68 * ease.outCubic(clamp((f - back + 0.25) / 8)) + 0.32 * ease.outCubic(clamp((f - SEAL + 0.25) / 6));
    cam = { fx: lerp(DIVE_AIM[0], REST.fx, p), fy: lerp(DIVE_AIM[1], REST.fy, p), zoom: Math.exp(lerp(Math.log(DIVE_ZOOM), 0, p)), roll: lerp(DIVE_ROLL, 0, p) };
    // A camera that never stops (R2-04: the prow read as a lull): a push toward the top centre, where the mothership will hang, with a
    // little roll, gathering speed into the scan line (11.3&) and on through the downsample.
    const d = clamp((f - (SEAL + 4)) / (DOWNSAMPLE.to - (SEAL + 4)));
    const go = 0.55 * d + 0.45 * d * d;
    cam = { ...cam, fx: cam.fx - 190 * go, fy: cam.fy - 80 * go, zoom: cam.zoom * (1 + 0.14 * go), roll: cam.roll + 0.05 * go };
  }
  return cam;
}

/** A plane point (layout px, plane `k`) → the screen (layout px). */
export function toScreen(cam: WaveCam, k: number, p: XY): XY {
  const s = cam.zoom ** k;
  const fx = 960 + (cam.fx - 960) * k;
  const fy = 540 + (cam.fy - 540) * k;
  const vx = (p[0] - fx) * s;
  const vy = (p[1] - fy) * s;
  // Roll counter-clockwise on screen (y down: the rotation's sign flips).
  const c = Math.cos(cam.roll);
  const sn = Math.sin(cam.roll);
  return [960 + vx * c + vy * sn, 540 - vx * sn + vy * c];
}
/** The scale a plane is drawn at. */
export const planeScale = (cam: WaveCam, k: number): number => cam.zoom ** k;
/** A screen point (layout px) → the plane-`k` point the camera shows there (toScreen's inverse). */
export function fromScreen(cam: WaveCam, k: number, q: XY): XY {
  const s = cam.zoom ** k;
  const fx = 960 + (cam.fx - 960) * k;
  const fy = 540 + (cam.fy - 540) * k;
  const c = Math.cos(cam.roll);
  const sn = Math.sin(cam.roll);
  const vx = q[0] - 960;
  const vy = q[1] - 540;
  return [fx + (c * vx - sn * vy) / s, fy + (sn * vx + c * vy) / s];
}

// ——— The crash (11.1): the lip thrown onto the boats; under the foam it rolls back into the spent wave's foam nose ——————————————————

/** How far the lip is thrown (plane px): forward and down onto the boats. */
export const THROW: XY = [220, 250];
/** The lip's tip where it lands on 11.1 (the impact). */
export const IMPACT: XY = [curlPoint(WATER_END)[0] + THROW[0], curlPoint(WATER_END)[1] + THROW[1]];
/** The throw 0 → 1: the lip pitches forward from 10.4& + 2 and lands on 11.1 (gravity: fastest on the impact; an impact move). */
export const throwAt = (f: number): number => ease.inCubic(clamp((f - (WAVE_CRASH - 10) + 0.25) / 10));
/** The collapse 0 → 1 (11.1 → + 8): the thrown lip turns wholly to foam (its keylines fade, its water whitens). */
export const collapseAt = (f: number): number => ease.outCubic(clamp((f - WAVE_CRASH + 0.25) / 8));
/**
 * The roll-back 0 → 1 (11.1 → + 3.5, under the foam burst that covers the frame: crashBurst): the thrown lip folds back into the crest
 * as its foam nose (round 2, R2-01/R2-02: it used to stay on the water as flattened ribbons with a zigzag keyline over the boats, and
 * the body kept a straight-cut stump; a lip left lying on the water would stretch the hinge into an arch over the mountain, T06).
 */
export const rollAt = (f: number): number => ease.inOutSine(clamp((f - WAVE_CRASH + 0.25) / 3.5));
/** The spent wave 0 → 0.3 (11.1 + 6 → 11.2 + 6): the whole wave lowered by 30 % toward the floor. */
export const spentAt = (f: number): number => 0.3 * ease.inOutSine(clamp((f - (WAVE_CRASH + 6)) / 24));
/** The foam nose sinks 0 → 1 (11.2 + 6 → 12.1), forward and down the spent wave's front, as the sea settles. */
export const sinkAt = (f: number): number => ease.inOutSine(clamp((f - (SEAL + 6)) / (DOWNSAMPLE.to - (SEAL + 6))));
/** The nose: the point the lip folds back to (the middle of the lip's water on the hinge), how far it folds (the lip at 28 % of its size), its sink. */
const NOSE: XY = curlPoint(LIP_CUT, lipThickness(LIP_CUT) / 2);
const NOSE_FOLD = 0.72;
const NOSE_SINK: XY = [70, 110];

/**
 * The great wave's warp at f (null before the throw): each point thrown with the lip by its share (lipWeight, smooth: the wave bends,
 * it never tears), then folded back toward the nose under the burst (each point drawn in toward it by its share, so the lip becomes a
 * small rounded foam curl at the crest's end, sinking forward), the whole wave lowered toward the floor (spent). Smooth maps of the
 * plane, so the wave's polygon stays simple and its lines stay curves.
 */
export function warpAt(f: number): ((p: XY, share?: number) => XY) | null {
  const th = throwAt(f);
  if (th <= 0) return null;
  const ro = rollAt(f);
  const sp = spentAt(f);
  const sk = sinkAt(f);
  return (p: XY, share?: number): XY => {
    const w = share ?? lipWeight(p);
    let x = p[0] + w * THROW[0] * th;
    let y = p[1] + w * THROW[1] * th;
    if (ro > 0) {
      const k = 1 - NOSE_FOLD * w;
      x = lerp(x, NOSE[0] + (p[0] - NOSE[0]) * k + w * NOSE_SINK[0] * sk, ro);
      y = lerp(y, NOSE[1] + (p[1] - NOSE[1]) * k + w * NOSE_SINK[1] * sk, ro);
    }
    if (sp > 0) y = BOTTOM - (BOTTOM - y) * (1 - sp);
    return [x, y];
  };
}
/** A plane point of the great wave, warped at f. */
export const wavePoint = (f: number, p: XY): XY => {
  const w = warpAt(f);
  return w ? w(p) : p;
};

// ——— The hero —————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** M PLUS Rounded 1c ExtraBold advances (ems) of his strings' characters, for widths without the browser (breakShared HERO_ADVANCE; the arms measured alike). */
const ROUNDED_ADV: Readonly<Record<string, number>> = { '(': 0.412, ')': 0.412, '•': 0.526, ω: 0.822, '＼': 1, '／': 1, ヽ: 1, ノ: 1, '〜': 1, ᕕ: 0.62, ᕗ: 0.62 };
export const defaultRounded: Advance = (ch) => ROUNDED_ADV[ch] ?? 0.6;
const strWidth = (s: string, adv: Advance): number => [...s].reduce((w, ch) => w + adv(ch), 0);
/** How far his centre sits off the water so his lower bracket touches it (≈ 0.42 em of his face at `width`). */
const liftOf = (face: string, width: number): number => (0.42 * width) / strWidth(face, defaultRounded);

export type HeroWave = { face: string; x: number; y: number; width: number; rot: number; sx: number; sy: number; alpha: number; bitmap: boolean };

/** Where his keys are: the burst (HANDOFFS: from the box's centre to (900, 420) at 760 px), the rest from the print's geometry. */
const ERUPT_FROM: XY = [960, 540];
const ERUPT_TO: XY = [900, 420];

/** A point of the face (FACE, the hollow's wall and trough) nearest to height y on its wall (the steep part), with its normal into the hollow. */
function faceAt(y: number): { p: XY; n: XY } {
  let best = 1;
  for (let i = 1; i < FACE.length; i++) if (Math.abs(FACE[i][1] - y) < Math.abs(FACE[best][1] - y) && FACE[i][0] < 700) best = i;
  const a = FACE[Math.max(0, best - 1)];
  const b = FACE[Math.min(FACE.length - 1, best + 1)];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  // FACE runs down the wall: the hollow is to its left-hand side walking down (y down: (ty, −tx)).
  return { p: FACE[best], n: [(b[1] - a[1]) / L, -(b[0] - a[0]) / L] };
}
/** His crest contact (on the curl's outer edge at spiral parameter s) and the outward normal there. */
function crestAt(s: number): { p: XY; n: XY; slope: number } {
  const p = curlPoint(s);
  const a = WAVE_CURL[0];
  const n: XY = [(p[0] - a.cx) / a.r, (p[1] - a.cy) / a.r];
  // The surface's slope there (radians, y down): its tangent's angle, the way the water travels.
  return { p, n, slope: Math.atan2(n[0], -n[1]) };
}
/** Where on the crest he lands (10.3) and rides to before the barrel (10.4). */
const CREST_S = [0.28, 0.4] as const;

/**
 * His loop, 10.2 → 10.3 (T04/T05, round 1: he hovered and snapped on 10.2, 10.3 and 11.3): keys of his centre on the wave's plane (time,
 * point, width, tilt in radians + = counter-clockwise), joined by a Hermite spline with velocities from the neighbours, so his path and its
 * speed are continuous: off the eruption point on 10.2 (the launch), down into the hollow, landing on the trough (+ 6), a bottom turn
 * at the face's foot (+ 8 … + 11), up the face (+ 14 … + 16), off the lip and through the air onto the crest, landing on 10.3.
 */
type Key = { t: number; p: XY; w: number; rot: number; v?: XY };
const LOOP: readonly Key[] = (() => {
  const K = BLOCKS[4];
  const trough = (x: number, w: number): XY => [x, TROUGH_Y - liftOf(HERO2.surf, w)];
  const wall = (y: number, w: number): XY => {
    const f = faceAt(y);
    const l = liftOf(HERO2.surf, w);
    return [f.p[0] + f.n[0] * l, f.p[1] + f.n[1] * l];
  };
  const land = crestAt(CREST_S[0]);
  const lc = liftOf(HERO2.ride, 560);
  return [
    // The launch is struck on the kick: his first step already shows on 10.2 (the loop starts 0.6 f before it).
    // The drop is a swoop: fastest off the kick, easing into the trough (so the kick is the move's accent, not a frame after it); a
    // slow bottom turn along the trough to the face's foot (10.2 + 8 → + 15: the beat breathes); then the climb, fast, up the face, off
    // the lip and onto the crest, the last step landing on 10.3.
    { t: K - 0.6, p: ERUPT_TO, w: 760, rot: 0, v: [-18, 88] },
    { t: K + 8, p: trough(806, 640), w: 640, rot: 0, v: [-16, 0] },
    { t: K + 11, p: trough(736, 620), w: 620, rot: -0.14, v: [-14, -10] },
    { t: K + 14, p: wall(740, 610), w: 610, rot: -0.38, v: [-6, -58] },
    { t: K + 16.5, p: wall(560, 595), w: 595, rot: -0.44 },
    { t: K + 19.5, p: [784, 262], w: 575, rot: -0.2 },
    { t: CREST, p: [land.p[0] + land.n[0] * lc, land.p[1] + land.n[1] * lc], w: 560, rot: -land.slope },
  ];
})();
/** The launch's velocity on 10.2 (px a frame: down and a little left, into the hollow) and the landing's on 10.3 (along the crest). */
const LOOP_V0: XY = [-10, 62];
const LOOP_V1: XY = [30, 8];
function loopAt(f: number): { p: XY; w: number; rot: number } {
  const n = LOOP.length;
  let i = 0;
  while (i < n - 2 && f > LOOP[i + 1].t) i++;
  const a = LOOP[i];
  const b = LOOP[i + 1];
  const vel = (k: number): XY => {
    const given = LOOP[k].v;
    if (given) return given;
    if (k === 0) return LOOP_V0;
    if (k === n - 1) return LOOP_V1;
    const q = LOOP[k - 1];
    const r = LOOP[k + 1];
    return [(r.p[0] - q.p[0]) / (r.t - q.t), (r.p[1] - q.p[1]) / (r.t - q.t)];
  };
  const T = b.t - a.t;
  const u = clamp((f - a.t) / T);
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
  const h10 = u ** 3 - 2 * u ** 2 + u;
  const h01 = -2 * u ** 3 + 3 * u ** 2;
  const h11 = u ** 3 - u ** 2;
  const va = vel(i);
  const vb = vel(i + 1);
  const p: XY = [h00 * a.p[0] + h10 * T * va[0] + h01 * b.p[0] + h11 * T * vb[0], h00 * a.p[1] + h10 * T * va[1] + h01 * b.p[1] + h11 * T * vb[1]];
  const s = u * u * (3 - 2 * u);
  return { p, w: lerp(a.w, b.w, s), rot: lerp(a.rot, b.rot, s) };
}
/** The crest ride (10.3 → 10.4): along the curl's top, forward and a little down, his board on the water, tilted with it (≤ 25°). */
function rideAt(f: number): { p: XY; rot: number; contact: XY } {
  const u = (f - CREST) / (BARREL.from - CREST);
  // Starting at the landing's speed (LOOP_V1 ≈ 26 px a frame along the edge), easing to a drift.
  const s = lerp(CREST_S[0], CREST_S[1], 1 - (1 - clamp(u)) ** 2);
  const c = crestAt(s);
  const l = liftOf(HERO2.ride, 560);
  return { p: [c.p[0] + c.n[0] * l, c.p[1] + c.n[1] * l], rot: clamp(-c.slope, -rad(25), rad(25)), contact: c.p };
}
/** His centre on the wave's plane, 10.1 → 10.4 (the camera follows it; the wake and the spray come off it). */
export function heroPlane(f: number): XY {
  if (f < BLOCKS[4]) return eruptAt(f).p;
  if (f < CREST) return loopAt(f).p;
  return rideAt(Math.min(f, BARREL.from)).p;
}
/** The eruption (10.1 → 10.2): out of the box's centre, 75 % of the way by + 3, settled by + 12; a living hold, a crouch before the kick. */
function eruptAt(f: number): { p: XY; w: number } {
  const t = f - BURST + 0.6;
  const e = t <= 0 ? 0 : 1 - Math.exp(-t / 2.1) * (1 + 0.15 * Math.sin(t / 2));
  const k = clamp(e);
  const crouch = 8 * smoothstep(BLOCKS[4] - 4, BLOCKS[4] - 1.5, f);
  return { p: [lerp(ERUPT_FROM[0], ERUPT_TO[0], k), lerp(ERUPT_FROM[1], ERUPT_TO[1], k) + crouch], w: lerp(510, 760, k) };
}

/** The lead boat's bob (tilt degrees, dx, dy px) at f. */
export function boatBob(i: number, f: number): { tilt: number; dx: number; dy: number } {
  const b = BOATS[i];
  const w = (2 * Math.PI * (f - BURST)) / 48 + i * 2.1;
  // After the seal they ride the spent sea's swell (R2-04): each open hat lifts and rocks them (struck half a shutter early, settling
  // with one small counter-swing), alternately bow up and bow down.
  let kick = 0;
  for (const [j, h] of WAVE_HATS.entries()) {
    const t = f - h + 0.25;
    if (h < SEAL || t < 0 || t > 30) continue;
    kick += (j % 2 === 0 ? 1 : -1) * Math.sin(Math.min(Math.PI, (Math.PI * t) / 5)) * Math.exp(-t / 9) * (1 + 0.3 * Math.cos(t / 3));
  }
  return { tilt: b.tilt + 3 * Math.sin(w) + 5 * kick * (i === 0 ? 0.7 : 1), dx: 4 * Math.sin(w * 0.5 + i), dy: 6 * Math.sin(w + 1.3) - 9 * Math.abs(kick) };
}

/** The lead boat's prow on screen at f. */
export const prowScreen = (f: number): XY => {
  const bob = boatBob(0, f);
  return toScreen(waveCam(f), BOATS[0].k, prowOf(BOATS[0], bob.tilt, bob.dx, bob.dy + boatSink(0, f)));
};

/** Where he stands on the prow: his lower bracket on the tip, his centre above it (0.42 em of his face at 440 px). */
const PROW_WIDTH = 440;
const PROW_LIFT = liftOf(HERO2.cheer, PROW_WIDTH) + 4;

/** The arcade's mothership on screen (HANDOFFS 12.1: 546 px at (960, 230)). */
export const MOTHERSHIP_WIDTH = HERO_BITMAP[0].length * MOTHERSHIP.px;

/**
 * The beat frames he lands on crisp (T04: pose swaps are hard swaps on the beat frame, the sprite from a single instant, never a
 * cross-dissolve): every sub-frame of one of these frames draws him at the frame's own instant.
 */
export const HERO_CRISP: readonly number[] = [BLOCKS[4], CREST, BARREL.from, WAVE_CRASH, SEAL, PROW, PROW_BEAT, DOWNSAMPLE.from];
const crispTime = (f: number): number => {
  for (const k of HERO_CRISP) if (f >= k - 0.25 && f < k + 0.25) return k;
  return f;
};

/**
 * His pose at f, on screen (layout px): the eruption (＼(•ω•)／ 510 → 760 px), his loop (ᕕ(•ω•)ᕗ, down into the hollow, the trough, up
 * the face, onto the crest), the crest (〜(•ω•)〜 560 px, a recoil), the barrel (to the tube's centre (960, 520), 480 px), spat out
 * (700 px, ＼(•ω•)／), the prow (ヽ(•ω•)ノ 440 px, riding the boat), the leap to the top centre; from 11.4& + 6 the mothership's bitmap.
 */
export function heroWave(f0: number): HeroWave {
  const f = crispTime(f0);
  const cam = waveCam(f);
  // The eruption (10.1 → 10.2), with 3 frames of anticipation before the kick: a squash 0.92 (T04).
  if (f < BLOCKS[4]) {
    const e = eruptAt(f);
    const [x, y] = toScreen(cam, PLANE.wave, e.p);
    const crouch = smoothstep(BLOCKS[4] - 4, BLOCKS[4] - 1.5, f);
    const sq = impactSquash(f, BLOCKS[1]) + impactSquash(f, BLOCKS[2]) + impactSquash(f, BLOCKS[3]);
    return { face: HERO2.jump, x, y, width: e.w, rot: 0, sx: 1 + sq + 0.05 * crouch, sy: 1 - sq - 0.08 * crouch, alpha: 1, bitmap: false };
  }
  // His loop (10.2 → 10.3): launched on the kick (stretched by the speed), landing on the trough with a squash.
  if (f < CREST - 0.25) {
    const l = loopAt(f);
    const [x, y] = toScreen(cam, PLANE.wave, l.p);
    const st = 0.08 * Math.exp(-(f - BLOCKS[4]) / 2.5);
    const sq = impactSquash(f, BLOCKS[4] + 8) * 1.5;
    return { face: HERO2.surf, x, y, width: l.w * planeScale(cam, 1), rot: l.rot - cam.roll, sx: 1 - st + sq, sy: 1 + st - sq, alpha: 1, bitmap: false };
  }
  // The crest (10.3 → 10.4): his last big step lands on the beat (crisp), the face swaps and he recoils 1.06 → 1.00 over 6 frames; then
  // he rides forward on it.
  if (f < BARREL.from) {
    const r = rideAt(f);
    const [x, y] = toScreen(cam, PLANE.wave, r.p);
    const pop = f >= CREST - 0.25 ? 1 + 0.06 * (1 - ease.outCubic(clamp((f - CREST) / 6))) : 1;
    const breathe = 1 + 0.02 * Math.sin(Math.PI * clamp((f - (CREST + 12)) / 12));
    return { face: f >= CREST - 0.25 ? HERO2.ride : HERO2.surf, x, y, width: 560 * planeScale(cam, 1), rot: r.rot - cam.roll, sx: pop * breathe, sy: pop / breathe, alpha: 1, bitmap: false };
  }
  // The barrel (10.4 → 11.1): off the crest, over the lip's front and down into the tube: to its centre (960, 520) at 480 px by + 12, then
  // riding there, rocking.
  if (f < WAVE_CRASH) {
    // From where the crest left him on 10.4 (on screen: the camera dives past him, he rides on ahead).
    const r = rideAt(BARREL.from);
    const c0 = waveCam(BARREL.from);
    const from = toScreen(c0, PLANE.wave, r.p);
    const fromW = 560 * planeScale(c0, 1);
    const p = ease.inOutSine(clamp((f - BARREL.from) / 12));
    const rock = 0.1 * Math.sin((f - BARREL.from) / 3) * p;
    return { face: HERO2.surf, x: lerp(from[0], 960, p), y: lerp(from[1], 520, p), width: lerp(fromW, 480, p), rot: lerp(r.rot - c0.roll, 0, p) + rock, sx: 1, sy: 1, alpha: 1, bitmap: false };
  }
  // Spat out (11.1): 480 → 700 px, flung up and right, then falling onto the lead boat's prow (11.2&).
  if (f < PROW) {
    const t = f - WAVE_CRASH;
    const T = PROW - WAVE_CRASH;
    const land = prowScreen(PROW);
    const up = 1 - clamp(t / 8);
    const width = t < 10 ? lerp(480, 700, 1 - (1 - clamp(t / 4)) ** 3) : lerp(700, PROW_WIDTH, ease.inCubic(clamp((t - 10) / (T - 10))));
    const u = t / T;
    const x = lerp(960, land[0], ease.inOutSine(u)) + 140 * Math.sin(Math.PI * u);
    const y = lerp(520, land[1] - PROW_LIFT, u) - 360 * Math.sin(Math.PI * Math.min(1, u * 1.05)) * (1 - 0.15 * up);
    return { face: HERO2.jump, x, y, width, rot: 0.6 * Math.sin(Math.PI * u) * (1 - u), sx: 1, sy: 1, alpha: 1, bitmap: false };
  }
  // On the prow (11.2& → 11.4): carried by the boat's bob; on 11.3 a squash as the boat dips under him (no hop, no reset).
  if (f < DOWNSAMPLE.from) {
    const p = prowScreen(f);
    const sq = impactSquash(f, PROW) + impactSquash(f, PROW_BEAT) * 1.3;
    // Alive on the prow (R2-04): he breathes on the beat (a 4 % swell every 24 f) and sways with the boat, a beat behind it.
    const breath = 0.04 * Math.sin((2 * Math.PI * (f - PROW)) / 24 - 0.6);
    const sway = 0.08 * Math.sin((2 * Math.PI * (f - PROW)) / 48);
    return { face: HERO2.cheer, x: p[0], y: p[1] - PROW_LIFT - 250 * breath, width: PROW_WIDTH, rot: -rad(boatBob(0, f).tilt - BOATS[0].tilt) * 0.5 + sway, sx: (1 + sq) * (1 + breath * 0.5), sy: (1 - sq) * (1 + breath), alpha: 1, bitmap: false };
  }
  // The leap (11.4 → 12.1): up off the prow to the top centre, growing; from the last quantise step, the mothership's bitmap.
  const p0 = prowScreen(DOWNSAMPLE.from);
  const u = clamp((f - DOWNSAMPLE.from) / (DOWNSAMPLE_STEPS[3] - DOWNSAMPLE.from));
  const e = 1 - (1 - u) ** 2.2;
  const x = lerp(p0[0], MOTHERSHIP.cx, e);
  const y = lerp(p0[1] - PROW_LIFT, MOTHERSHIP.cy, e) - 120 * Math.sin(Math.PI * u);
  const bitmap = f >= DOWNSAMPLE_STEPS[3] - 0.25;
  return { face: bitmap ? HERO2.base : HERO2.jump, x: bitmap ? MOTHERSHIP.cx : x, y: bitmap ? MOTHERSHIP.cy : y, width: bitmap ? MOTHERSHIP_WIDTH : lerp(PROW_WIDTH, MOTHERSHIP_WIDTH, e), rot: 0, sx: 1, sy: 1, alpha: 1, bitmap };
}

/** The boats sink under the crash and come up on the seal (px down); the lead boat dips under his squash on 11.3. */
export function boatSink(i: number, f: number): number {
  const dip = i === 0 && f >= PROW_BEAT - 0.25 ? 14 * Math.exp(-(f - PROW_BEAT) / 5) * Math.cos((f - PROW_BEAT) / 2.2) * smoothstep(PROW_BEAT - 0.25, PROW_BEAT + 1, f) : 0;
  const t = f - WAVE_CRASH;
  if (t < -4 || f >= SEAL + 12) return dip;
  const down = smoothstep(-4, 6, t);
  // They burst back up on 11.2's kick (accelerating over its last 4 frames), bobbing up past the line after it.
  const up = ease.inCubic(clamp((t - (SEAL - WAVE_CRASH - 4)) / 4));
  return 160 * down * (1 - up) - 18 * Math.sin(Math.PI * clamp((f - SEAL) / 12)) * (f >= SEAL ? 1 : 0) + dip;
}
/** The boats tumble once under the foam (degrees added to the tilt), 11.1 + 6 → 11.2. */
export function boatTumble(i: number, f: number): number {
  const u = clamp((f - (WAVE_CRASH + 6)) / (SEAL - (WAVE_CRASH + 6)));
  return 360 * ease.inOutCubic(u) * (i % 2 === 0 ? 1 : -1);
}

// ——— The frame's content ——————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * A filled polygon (layout px, screen), a four-corner gradient, or a stroked polyline with a width per point. `straight` marks the few
 * items drawn straight on purpose (the horizon and the graded bands of sky and sea it bounds, the paper's kento marks, cartouche and
 * seal, the scan line, the game pixels of the downsample): the D3 test (tests/drop2Wave.test.ts) lets only these carry a long straight edge.
 */
export type VecItem =
  | { kind: 'fill'; pts: number[]; color: RGB; alpha: number; straight?: true }
  | { kind: 'quad'; pts: number[]; colors: readonly [RGB, RGB, RGB, RGB]; alpha: number; alphas?: readonly [number, number, number, number]; straight?: true }
  | { kind: 'stroke'; pts: number[]; widths: number[]; color: RGB; alpha: number; closed: boolean; straight?: true };
/** One pass of the scene: its vectors, then its glyphs (per atlas), over what came before. */
export type WaveLayer = { vec: VecItem[]; glyphs: { rounded: Glyph[]; jp: Glyph[]; hero: Glyph[] } };
export type WaveFrame = {
  layers: WaveLayer[];
  /**
   * The downsample (11.4 →): everything above `lineY` (layout px) quantised into `cell` px game pixels, the paper black; in the last 16th
   * the game pixels fizzle out to black in a random order (`derez` 0 → 1), leaving only the spray's pixels on the formation's cells and the
   * mothership, so the arcade lands on 12.1 over a clean screen.
   */
  downsample: { lineY: number; cell: number; derez: number } | null;
  /** Over the quantised picture: the scan line, the game pixels the spray became, the mothership's bitmap. */
  top: WaveLayer;
  /** The woodgrain's frame: the camera of the wave's plane (it is cut into the blocks, so it moves with the print). */
  cam: WaveCam;
};

const emptyLayer = (): WaveLayer => ({ vec: [], glyphs: { rounded: [], jp: [], hero: [] } });

/** A point mapping on a plane (the crash's warp of the great wave), or none. */
type Warp = ((p: XY) => XY) | null;
/** Whether a point of the great wave is more the lip's than the body's (the lip's lines fade as it collapses into foam). */
const isLip = (p: XY): boolean => lipWeight(p) > 0.5;
/**
 * A polyline cut into runs that lie on one side of the hinge's middle, while the crash's warp is on (the lip's runs fade as it turns to
 * foam); the whole line otherwise. Neighbouring runs share their end point and the warp is one smooth map (round 2: no break), so a line
 * is never cut short or stretched across a gap.
 */
function lipRuns(pts: readonly XY[], warp: Warp): { pts: XY[]; warp: Warp; lip: boolean }[] {
  if (!warp) return [{ pts: pts as XY[], warp: null, lip: false }];
  const out: { pts: XY[]; warp: Warp; lip: boolean }[] = [];
  let cur: XY[] = [];
  let side: boolean | null = null;
  for (const q of pts) {
    const l = isLip(q);
    if (side !== null && l !== side) {
      if (cur.length > 1) out.push({ pts: cur, warp, lip: side });
      cur = [cur[cur.length - 1]];
    }
    cur.push(q);
    side = l;
  }
  if (cur.length > 1) out.push({ pts: cur, warp, lip: !!side });
  return out;
}
/** The warp with every point taken at one share (a claw thrown whole with the water it grows from). */
const shareWarp = (warp: Warp, share: number): Warp => (warp ? (q: XY): XY => (warp as (r: XY, s?: number) => XY)(q, share) : null);
/** keyline() over each of a polyline's runs (lipRuns). */
function keylines(pts: readonly XY[], cam: WaveCam, k: number, seed: number, o: Parameters<typeof keyline>[4] & { lipAlpha?: number } = {}): VecItem[] {
  // The lip's lines fade as it turns to foam (lipAlpha): the foam nose has no water's keyline.
  return lipRuns(pts, o.warp ?? null)
    .filter((r) => !(r.lip && (o.lipAlpha ?? 1) <= 0.01))
    .map((r) => keyline(r.pts, cam, k, seed, { ...o, warp: r.warp, alpha: (o.alpha ?? 1) * (r.lip ? (o.lipAlpha ?? 1) : 1) }));
}
/** Transformed, offset (and optionally warped) points as a flat array. */
const flat = (pts: readonly XY[], cam: WaveCam, k: number, dx = 0, dy = 0, warp: Warp = null): number[] =>
  pts.flatMap((p) => toScreen(cam, k, warp ? warp([p[0] + dx, p[1] + dy]) : [p[0] + dx, p[1] + dy]));

/** A sumi keyline along `pts` (6–12 px, the knife's pressure varying along it), scaled with the plane. */
function keyline(pts: readonly XY[], cam: WaveCam, k: number, seed: number, o: { base?: number; swing?: number; alpha?: number; closed?: boolean; dx?: number; dy?: number; color?: RGB; warp?: Warp } = {}): VecItem {
  const s = planeScale(cam, k);
  let u = 0;
  const widths = pts.map((p, i) => {
    if (i > 0) u += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    return Math.max(1.5, keyWidth(u, seed, o.base ?? 9, o.swing ?? 3) * s);
  });
  return { kind: 'stroke', pts: flat(pts, cam, k, o.dx, o.dy, o.warp ?? null), widths, color: o.color ?? C.sumi, alpha: o.alpha ?? 1, closed: o.closed ?? false };
}

const fill = (pts: readonly XY[], cam: WaveCam, k: number, color: RGB, alpha = 1, dx = 0, dy = 0, warp: Warp = null): VecItem => ({ kind: 'fill', pts: flat(pts, cam, k, dx, dy, warp), color, alpha });

/** A glyph of `ch` at a screen point (layout px). */
const glyphAt = (ch: string, x: number, y: number, size: number, color: RGB, o: Partial<Glyph> = {}): Glyph => ({ ch, x: ex(x), y: ey(y), size, color, ...o });

/** A whole string centred at a screen point, rotated about it (radians, + = counter-clockwise), squashed (sx, sy). */
function stringGlyphs(text: string, x: number, y: number, size: number, color: RGB, adv: Advance, o: { rot?: number; sx?: number; sy?: number; alpha?: number; outline?: number; outlineColor?: RGB } = {}): Glyph[] {
  const chars = [...text];
  const total = chars.reduce((w, ch) => w + adv(ch), 0);
  const c = Math.cos(o.rot ?? 0);
  const s = Math.sin(o.rot ?? 0);
  let pen = -total / 2;
  const out: Glyph[] = [];
  for (const ch of chars) {
    const a = adv(ch);
    const lx = (pen + a / 2) * size * (o.sx ?? 1);
    pen += a;
    if (ch === ' ') continue;
    // Flat world: y up; a counter-clockwise rotation.
    const gx = ex(x) + lx * c;
    const gy = ey(y) + lx * s;
    out.push({ ch, x: gx, y: gy, size: size * (o.sy ?? 1), color, rot: o.rot ?? 0, stretch: (o.sx ?? 1) / (o.sy ?? 1), alpha: o.alpha, outline: o.outline, outlineColor: o.outlineColor });
  }
  return out;
}

/**
 * The sky (D2: pale cream with soft clouds, a darker grey-blue band behind the mountain near the horizon): the woodblock's graded blue at
 * the top fading to the washi by y 380, the washi, then the haze band deepening to the horizon. On the sky plane, wide for the roll.
 */
function skyQuads(cam: WaveCam, alpha: number): VecItem[] {
  const rows: [number, RGB][] = [
    [-1600, C.sky],
    [30, C.sky],
    [380, C.washi],
    [560, C.washi],
    [HORIZON + 6, C.haze],
  ];
  const out: VecItem[] = [];
  for (let i = 0; i + 1 < rows.length; i++) {
    const [y0, c0] = rows[i];
    const [y1, c1] = rows[i + 1];
    const pts = flat([[-2600, y0], [4500, y0], [4500, y1], [-2600, y1]], cam, PLANE.sky);
    out.push({ kind: 'quad', pts, colors: [c0, c0, c1, c1], alpha, straight: true });
  }
  return out;
}

/** Soft cloud shapes in the upper sky (the cloud plane): lumps of the cloud ink, flat, each a run of overlapping rounded humps. */
const CLOUDS: readonly XY[][] = [
  [1180, 228, 380],
  [1560, 300, 300],
  [430, 150, 260],
].map(([cx, cy, w]) => {
  const top: XY[] = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const bump = 22 * Math.abs(Math.sin(Math.PI * u * 3.2 + cx)) ** 0.6 + 16 * Math.sin(Math.PI * u);
    top.push([cx - w / 2 + w * u, cy - bump]);
  }
  // Its underside a soft belly (round 2: a straight-cut bottom was a long straight edge in the sky).
  const belly: XY[] = Array.from({ length: 17 }, (_, j) => {
    const u = 1 - j / 16;
    return [cx - w / 2 + w * u, cy + 6 + 12 * Math.sin(Math.PI * u) ** 0.7 + 3 * Math.sin(7 * Math.PI * u)] as XY;
  });
  return [...top, ...belly];
});

/** The claws turned toward the boats from 10.2& (radians added about each claw's base, + = clockwise on screen). */
const turnClaw = (c: Claw, a: number): Claw => {
  const [bx, by] = c.spine[0];
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  const rot = (p: XY): XY => [bx + (p[0] - bx) * cs - (p[1] - by) * sn, by + (p[0] - bx) * sn + (p[1] - by) * cs];
  const turn = (k: Claw): Claw => ({ ...k, spine: k.spine.map(rot), children: k.children.map(turn) });
  return turn(c);
};

// ——— The moving woodblock (D1): the water lines flow, the fingers flick on the drums, his ink bleeds ——————————————————————————————

/** The drums of the print's two bars (the taiko on every kick) and its open hats (the &s). */
const WAVE_KICKS: readonly number[] = TAIKO2.filter((k) => k >= BURST && k < ARCADE.from);
const WAVE_HATS: readonly number[] = OPEN_HATS2.filter((h) => h >= BURST && h < ARCADE.from);

/** The fingers' flick on each kick: the curl tightens (over 3 f, struck half a shutter early) and relaxes over ≈ 10 f. 0 … 1. */
export function flickAt(f: number): number {
  let p = 0;
  for (const k of WAVE_KICKS) {
    const t = f - k + 0.25;
    if (t < 0 || t > 24) continue;
    p = Math.max(p, ease.outCubic(clamp(t / 3)) * Math.exp(-Math.max(0, t - 3) / 5));
  }
  return p;
}

/** How far the water has flowed along the lines (px): a steady run up the back and over the crest, surging 14 px on every open hat. */
export function flowAt(f: number): number {
  let surge = 0;
  for (const h of WAVE_HATS) if (f >= h - 0.25) surge += 14 * ease.outCubic(clamp((f - h + 0.25) / 4));
  return 3.4 * (f - BURST) + surge;
}

/**
 * A soft-edged ribbon along a polyline (plane k), ink bleeding into the paper: solid to `inner` px each side of the line, fading to
 * nothing at `outer` px (one value per point). Quads only, so nothing overlaps and the alpha never doubles at the joints.
 */
function ribbon(pts: readonly XY[], inner: readonly number[], outer: readonly number[], cam: WaveCam, k: number, color: RGB, alpha: number, o: { dx?: number; dy?: number; warp?: Warp } = {}): VecItem[] {
  const out: VecItem[] = [];
  const n = pts.length;
  if (n < 2) return out;
  const side = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / L;
    const ny = (b[0] - a[0]) / L;
    const w0 = inner[i] ?? inner[0];
    const w1 = Math.max(w0, outer[i] ?? outer[0]);
    return { li: [p[0] - nx * w0, p[1] - ny * w0] as XY, lo: [p[0] - nx * w1, p[1] - ny * w1] as XY, ri: [p[0] + nx * w0, p[1] + ny * w0] as XY, ro: [p[0] + nx * w1, p[1] + ny * w1] as XY };
  });
  const q = (ps: XY[]): number[] => flat(ps, cam, k, o.dx, o.dy, o.warp ?? null);
  const cs = [color, color, color, color] as const;
  for (let i = 0; i + 1 < n; i++) {
    const A = side[i];
    const B = side[i + 1];
    out.push({ kind: 'quad', pts: q([A.lo, A.li, B.li, B.lo]), colors: cs, alpha, alphas: [0, 1, 1, 0] });
    out.push({ kind: 'quad', pts: q([A.li, A.ri, B.ri, B.li]), colors: cs, alpha });
    out.push({ kind: 'quad', pts: q([A.ri, A.ro, B.ro, B.ri]), colors: cs, alpha, alphas: [1, 0, 0, 1] });
  }
  return out;
}

/** A tapering dash (the knife's cut: pointed ends) along a plane-k polyline, `w` px at its widest. */
function dash(pts: readonly XY[], w: number, cam: WaveCam, k: number, color: RGB, alpha: number, dx = 0, dy = 0, warp: Warp = null): VecItem {
  const n = pts.length;
  const s = planeScale(cam, k);
  const widths = pts.map((_, i) => Math.max(0.6, w * s * Math.sin(Math.PI * (n === 1 ? 0.5 : 0.04 + (0.92 * i) / (n - 1))) ** 0.35));
  return { kind: 'stroke', pts: flat(pts, cam, k, dx, dy, warp), widths, color, alpha, closed: false };
}

/**
 * His wake (T05, R8, round 1: it was a fixed stripe inside the lip, nowhere near him, printed as square-cut bars): the line his board
 * carved, laid down as he passes — the trough and the face (10.2 + 6 → + 15) and the crest (10.3 → 10.4) — each point with the instant
 * he passed it. Printed as bokashi (a soft amber gradient multiplied into the blue, feathered 24–36 px, one unbroken run each, tapered
 * at both ends) that keeps bleeding outward a few px a beat.
 */
type WakePoint = { p: XY; t: number };
let WAKES: WakePoint[][] | null = null;
function wakeRuns(): WakePoint[][] {
  if (WAKES) return WAKES;
  const K = BLOCKS[4];
  // His board on the water: the point of the trough or the face nearest him, 20 px into the water (the ink soaks in from there, so
  // its bokashi lies in the blue, not over the hollow).
  const surface = offsetPolyline(FACE, 20);
  const board: WakePoint[] = [];
  for (let t = K + 5.5; t <= K + 15.5; t += 0.25) {
    const c = loopAt(t).p;
    let best = surface[0];
    for (const q of surface) if (Math.hypot(q[0] - c[0], q[1] - c[1]) < Math.hypot(best[0] - c[0], best[1] - c[1])) best = q;
    const last = board[board.length - 1];
    if (!last || Math.hypot(best[0] - last.p[0], best[1] - last.p[1]) > 2) board.push({ p: best, t });
  }
  const crest: WakePoint[] = [];
  for (let t = CREST; t <= BARREL.from; t += 0.5) {
    const c = rideAt(t).contact;
    const a = WAVE_CURL[0];
    const r = Math.hypot(c[0] - a.cx, c[1] - a.cy);
    crest.push({ p: [a.cx + ((c[0] - a.cx) * (r - 20)) / r, a.cy + ((c[1] - a.cy) * (r - 20)) / r], t });
  }
  WAKES = [board, crest];
  return WAKES;
}
/** How far along his wake its ink tapers in from each end (px of path). */
export const WAKE_TAPER = 70;

// ——— The body of a wave, printed (bands, white lines, the foam mass and its dots) and its fingers ——————————————————————————————

/** The blocks' lasting misregistration (px): once each colour block has snapped in it still sits a hair off the keyline, as a hand-printed sheet does. */
const MIS = { pale: [-1.4, 1.1], prussian: [1.2, 1.5] } as const;

type Reg = { dx: number; dy: number };
type BodyBlocks = { pale: { on: boolean }; pru: { on: boolean }; pal: Reg; prd: Reg };
type Body = {
  edge: readonly EdgePoint[];
  water: readonly XY[];
  foam: readonly FoamLine[];
  stripes: readonly Stripe[];
  k: number;
  seed: number;
  cap: { from: number; to: number; depth: number; swell: number; lump: number };
  faceLines: readonly XY[][];
};

const MAIN_BODY: Body = { edge: EDGE, water: WATER, foam: FOAM_LINES, stripes: STRIPES, k: 1, seed: 0, cap: CAP, faceLines: FACE_LINES };
const FRONT_BODY: Body = {
  edge: FRONT_EDGE,
  water: FRONT_WATER,
  foam: FRONT_FOAM,
  stripes: [
    { d0: 0, d1: 18, t0: 0, t1: 0.24 },
    { d0: 18, d1: 40, t0: 0.3, t1: 0.5 },
    { d0: 40, d1: 66, t0: 0.42, t1: 0.66 },
    { d0: 66, d1: 100, t0: 0.6, t1: 0.82 },
    { d0: 100, d1: 260, t0: 0.78, t1: 1 },
  ],
  k: PLANE.front,
  seed: 40,
  cap: { from: FRONT_EDGE.findIndex((e) => e.s >= 0) - 18, to: FRONT_EDGE.findIndex((e) => e.s >= FRONT_END - 0.05), depth: 12, swell: 18, lump: 9 },
  faceLines: [],
};
/** The front wave's keylines: its outer edge (back, crest, curl), the lip's underside. */
const FRONT_KEY: readonly XY[] = FRONT_EDGE.map((e) => e.p).filter((p) => p[0] > -200);
const FRONT_INNER: readonly XY[] = Array.from({ length: 41 }, (_, i) => arcPoint(FRONT_CURL, FRONT_END * (1 - i / 40), frontThickness(FRONT_END * (1 - i / 40))));

/** A white water line's width (px at 1080p): bolder near the skin. */
const foamWidth = (i: number): number => lerp(3.6, 2.0, clamp(i / 9));

/**
 * The rails of each band of a body (cached: the geometry is fixed on the plane), run on 720 px before the edge's first point along its
 * tangent, in 20 px steps (round 2: the bands' straight start showed in the bottom-left corner as the camera rode down his loop).
 */
const RAILS = new Map<Body, { a: XY[]; b: XY[] }[]>();
const railsOf = (b: Body): { a: XY[]; b: XY[] }[] => {
  let r = RAILS.get(b);
  if (!r) {
    const [p0, p1] = [b.edge[0].p, b.edge[1].p];
    const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
    const run = (rail: XY[]): XY[] => [...Array.from({ length: 36 }, (_, i) => [rail[0][0] - ((p1[0] - p0[0]) / L) * 20 * (36 - i), rail[0][1] - ((p1[1] - p0[1]) / L) * 20 * (36 - i)] as XY), ...rail];
    r = b.stripes.map((bd) => ({ a: run(edgeAt(b.edge, bd.d0)), b: run(edgeAt(b.edge, bd.d1)) }));
    RAILS.set(b, r);
  }
  return r;
};

/** One band of graded blue between two rails, t0 at the outer rail, t1 at the inner (round 2: one unbroken strip on every frame). */
function bandQuads(b: Body, i: number, cam: WaveCam, reg: Reg, warp: Warp): VecItem[] {
  const { a, b: z } = railsOf(b)[i];
  const bd = b.stripes[i];
  const c0 = blue(bd.t0);
  const c1 = blue(bd.t1);
  const out: VecItem[] = [];
  for (let j = 0; j + 1 < a.length; j++) {
    const flat0 = Math.hypot(a[j][0] - z[j][0], a[j][1] - z[j][1]) < 0.3;
    const flat1 = Math.hypot(a[j + 1][0] - z[j + 1][0], a[j + 1][1] - z[j + 1][1]) < 0.3;
    if (flat0 && flat1) continue;
    out.push({ kind: 'quad', pts: flat([a[j], a[j + 1], z[j + 1], z[j]], cam, b.k, reg.dx, reg.dy, warp), colors: [c0, c0, c1, c1], alpha: 1 });
  }
  return out;
}

/** A body's colour blocks (the striated bands), its white water lines and the lines on its face. */
function drawBody(L: WaveLayer, b: Body, f: number, cam: WaveCam, st: BodyBlocks, warp: Warp): void {
  // The pale block lays the body light with its pale skin band; the Prussian block overprints the deep body and every band. In the
  // crash the whole wave bends under one smooth warp (round 2: the lip no longer breaks off as a piece of its own).
  if (st.pale.on && !st.pru.on) {
    L.vec.push(fill(b.water, cam, b.k, C.light, 1, st.pal.dx, st.pal.dy, warp));
    L.vec.push(...bandQuads(b, 0, cam, st.pal, warp));
  }
  if (st.pru.on) {
    L.vec.push(fill(b.water, cam, b.k, C.deep, 1, st.prd.dx, st.prd.dy, warp));
    b.stripes.forEach((_, i) => L.vec.push(...bandQuads(b, i, cam, i === 0 ? st.pal : st.prd, warp)));
  }
  if (!st.pale.on) return;
  // The white water lines (the blue block's uncut lines between the bands): long cuts flowing up the back and round the curl.
  const flowed = flowAt(f);
  b.foam.forEach((line, i) => {
    const Ln = line.u[line.u.length - 1] ?? 0;
    for (const [a, z] of dashes(b.seed + i, Ln, flowed * (1 - 0.04 * i))) for (const r of lipRuns(subPolyline(line.pts, line.u, a, z), warp)) L.vec.push(dash(r.pts, foamWidth(i) * (b.k > 1 ? 0.85 : 1), cam, b.k, C.foam, 0.95, st.prd.dx, st.prd.dy, r.warp));
  });
  b.faceLines.forEach((rail, i) => {
    const up = [...rail].reverse();
    const uu: number[] = [];
    let acc = 0;
    up.forEach((p, j) => {
      if (j > 0) acc += Math.hypot(p[0] - up[j - 1][0], p[1] - up[j - 1][1]);
      uu.push(acc);
    });
    for (const [a, z] of dashes(b.seed + 20 + i, acc, flowed * 0.7)) L.vec.push(dash(subPolyline(up, uu, a, z), 2.4, cam, b.k, C.foam, 0.8, st.prd.dx, st.prd.dy, warp));
  });
}

/** A shape of a foam mass: its polygon (plane points), the part of its outline that carries the keyline (null: all of it), plane, warp, offset. */
type MassShape = { pts: XY[]; line: XY[] | null; k: number; warp: Warp; dx: number; dy: number };

/**
 * A foam mass (D3, round 1: the foam is ONE white mass of water with a single clean blue keyline, not hundreds of outlined strands):
 * every shape's keyline first, twice as wide as it shows, then every shape filled — the fills cover each keyline wherever it falls inside
 * another shape, so only the mass's silhouette keeps its line. A shape with a `line` keylines only that part (a cap: its outer edge, so
 * where the foam meets the water there is no line: the white grows out of the blue). Before the pale block prints, the fill is the paper
 * (the key block shows the mass's outline only).
 */
function drawMass(L: WaveLayer, shapes: readonly MassShape[], cam: WaveCam, st: { key: { on: boolean; dx: number; dy: number }; pale: { on: boolean } }, kw = 2.6, seed = 600): void {
  if (shapes.length === 0) return;
  if (st.key.on) shapes.forEach((m, i) => L.vec.push(keyline(m.line ?? [...m.pts, m.pts[0]], cam, m.k, seed + i, { base: 2 * kw, swing: 0.7, color: C.deep, dx: m.dx, dy: m.dy, warp: m.warp })));
  if (st.key.on || st.pale.on) for (const m of shapes) L.vec.push(fill(m.pts, cam, m.k, st.pale.on ? C.foam : C.washi, 1, m.dx, m.dy, m.warp));
}

/** A finger tree's shapes for a foam mass (each claw's outline, keylined all round), on plane k, with its warp. */
const fingerShapes = (c: Claw, k: number, warp: Warp, dx: number, dy: number): MassShape[] => clawsOf(c).map((kk) => ({ pts: clawOutline(kk), line: null, k, warp, dx, dy }));

/** The thin blue lines inside a mass: one along each big finger, from its root to two thirds of the way out (D3: a few, following the flow). */
function fingerLines(L: WaveLayer, fingers: readonly Claw[], cam: WaveCam, k: number, warp: Warp, dx: number, dy: number, alpha = 0.8): void {
  for (const c of fingers) {
    const n = c.spine.length;
    const pts = c.spine.slice(Math.round(0.12 * n), Math.round(0.66 * n));
    if (pts.length > 2) L.vec.push(dash(pts, 1.9, cam, k, C.prussian, alpha, dx, dy, warp));
  }
}

/**
 * A body's foam cap as mass shapes: white water over the crest and round the front of the lip; its inner edge billowing, with teeth of
 * white running back into the blue along the flow (the white grows out of the water: D3), and no line there; in the crash the lip turns
 * to foam by its share of it (`grow` × lipWeight: the white deepens smoothly over the hinge, round 2: no broken ends). Its two thin blue
 * flow lines go into `L`.
 */
function capMass(L: WaveLayer, b: Body, cam: WaveCam, st: BodyBlocks, warp: Warp, grow = 0): MassShape[] {
  const c = b.cap;
  const from = Math.max(0, c.from);
  const i0 = from;
  const run = b.edge.slice(i0, c.to);
  if (run.length < 2) return [];
  const depthAt = (e: EdgePoint, i: number): number => {
    let d = capDepth(i, b.edge, c);
    // Teeth of white running back into the blue, every ≈ 50 px (each its own length).
    const ph = ((((i - from) / 8.5) % 1) + 1) % 1;
    const tooth = Math.max(0, 1 - Math.abs(ph - 0.5) / 0.22) ** 1.4 * (14 + 14 * hash(Math.floor((i - from) / 8.5), b.seed, 71));
    d = Math.min(e.depth - 2, d + tooth * Math.sin(Math.PI * clamp((i - from) / Math.max(1, c.to - from))) ** 0.5);
    if (grow > 0 && b === MAIN_BODY) d = lerp(d, e.depth, grow * lipWeight(e.p));
    return d;
  };
  const depths = run.map((e, j) => depthAt(e, i0 + j));
  const inner = run.map((e, j) => [e.p[0] + e.n[0] * depths[j], e.p[1] + e.n[1] * depths[j]] as XY);
  const outer = run.map((e, j) => {
    const t = (i0 + j - from) / (c.to - 1 - from);
    const d = 6 * Math.sin(Math.PI * t) ** 0.35;
    return [e.p[0] - e.n[0] * d, e.p[1] - e.n[1] * d] as XY;
  });
  const out: MassShape[] = [{ pts: [...outer, ...[...inner].reverse()], line: outer, k: b.k, warp, dx: st.pal.dx, dy: st.pal.dy }];
  // Two thin blue lines inside the white, following the flow (at a third and two thirds of its depth), in long cuts.
  if (st.pale.on)
    for (const [li, frac] of [0.34, 0.68].entries()) {
      const rail = run.map((e, j) => [e.p[0] + e.n[0] * depths[j] * frac, e.p[1] + e.n[1] * depths[j] * frac] as XY);
      const u: number[] = [];
      let acc = 0;
      rail.forEach((q, j) => {
        if (j > 0) acc += Math.hypot(q[0] - rail[j - 1][0], q[1] - rail[j - 1][1]);
        u.push(acc);
      });
      for (const [a, z] of dashes(b.seed + 40 + li, acc, 0)) if (z - a > 20) L.vec.push(dash(subPolyline(rail, u, a, z), 1.7, cam, b.k, C.prussian, 0.75, st.pal.dx, st.pal.dy, warp));
    }
  return out;
}

/** The foam dots in the blue below the main cap (D2; R8: no bead chain), drifting with the water along the crest. */
function drawDots(L: WaveLayer, f: number, cam: WaveCam, st: BodyBlocks, warp: Warp, grow: number): void {
  if (!st.pale.on || grow >= 0.98) return;
  const span = CAP.to + 4 - (CAP.from + 6);
  // (Their drift stops when the lip starts to go: they ride the bending water from there.)
  const drift = (flowAt(Math.min(f, WAVE_CRASH - 10)) * 0.05) / 6;
  for (const [k, d] of FOAM_DOTS.entries()) {
    const i = Math.min(EDGE.length - 1, Math.round(CAP.from + 6 + ((((d.i - CAP.from - 6 + drift * (0.6 + 0.8 * hash(k, 941))) % span) + span) % span)));
    const e = EDGE[i];
    const depth = capDepth(i) + 30 + d.d;
    if (depth > e.depth - d.r - 2) continue;
    const q: XY = [e.p[0] + e.n[0] * depth, e.p[1] + e.n[1] * depth];
    const ring: XY[] = Array.from({ length: 10 }, (_, j) => [q[0] + d.r * Math.cos((2 * Math.PI * j) / 10), q[1] + d.r * (0.85 + 0.15 * hash(k, j)) * Math.sin((2 * Math.PI * j) / 10)]);
    L.vec.push(fill(ring, cam, PLANE.wave, C.foam, 1, st.pal.dx, st.pal.dy, warp));
  }
}

/** One finger and its fingers: filled (pale or white, with the pale block), lined in Prussian (with the keyline). */
function drawClaw(L: WaveLayer, c: Claw, row: ClawRow, ci: number, cam: WaveCam, k: number, st: { key: { on: boolean; dx: number; dy: number }; pale: { on: boolean }; pal: Reg }, warp0: Warp = null): void {
  // A finger is thrown whole, at the share of the water it grows from (its base).
  const warp = shareWarp(warp0, lipWeight(c.spine[0]));
  for (const kk of clawsOf(c)) {
    const o = clawOutline(kk);
    if (st.pale.on) L.vec.push(fill(o, cam, k, row.fill === 'pale' ? C.pale : C.foam, 1, st.pal.dx, st.pal.dy, warp));
    if (st.key.on) L.vec.push(keyline(o, cam, k, 60 + ci * 4 + kk.level, { base: kk.level === 1 ? 2.4 : kk.level === 2 ? 1.9 : 1.5, swing: 0.5, color: C.deep, dx: st.key.dx, dy: st.key.dy, warp }));
  }
}

// ——— The sea's mounds (D2) ——————————————————————————————————————————————————————————————————————————————————————————————————

/** A mound's rails (its top and 3 depths below it) and its foam crest, cached. */
const MOUND_CACHE = new Map<Mound, { top: XY[]; rails: XY[][]; capIn: XY[]; capOut: XY[]; claws: Claw[] }>();
function moundShape(m: Mound): { top: XY[]; rails: XY[][]; capIn: XY[]; capOut: XY[]; claws: Claw[] } {
  let s = MOUND_CACHE.get(m);
  if (s) return s;
  const top = moundTop(m);
  const rails = [16, 42, 90].map((d) => offsetPolyline(top, d));
  // The foam crest: over the crest from u −0.4 to 0.45, its lower edge lumpy; small claws hooking right off its front.
  const i0 = Math.round(0.3 * (top.length - 1));
  const i1 = Math.round(0.72 * (top.length - 1));
  const crest = top.slice(i0, i1 + 1);
  const capOut = offsetPolyline(crest, -3);
  const capIn = offsetPolyline(crest, 1).map((p, j) => {
    const t = j / (crest.length - 1);
    const d = (8 + 0.12 * m.h + 7 * Math.abs(noise1(j / 2.3, 50 + m.seed))) * Math.sin(Math.PI * t) ** 0.5;
    return [p[0], p[1] + d] as XY;
  });
  const claws: Claw[] = [];
  const nC = 3 + Math.round(m.h / 30);
  for (let c = 0; c < nC; c++) {
    const j = Math.round(lerp(0.45, 0.95, (c + 0.5) / nC) * (crest.length - 1));
    const p = crest[j];
    const q = crest[Math.min(crest.length - 1, j + 1)];
    const ta = Math.atan2(q[1] - p[1], q[0] - p[0]);
    claws.push(growClaw(p, ta - 0.9, (22 + 0.5 * m.h) * (0.8 + 0.4 * hash(m.seed, c)), 6 + 0.06 * m.h, 2, 1200 + m.seed * 10 + c, 1.1));
  }
  s = { top, rails, capIn, capOut, claws };
  MOUND_CACHE.set(m, s);
  return s;
}
/**
 * How much of a mound shows at point j of its n top points: 0 at its ends, 1 over its middle (round 2, R2-02: its body was a polygon
 * cut off by straight vertical sides inside the frame; now its ends fade into the sea, a soft bokashi, and its keyline tapers out).
 */
const moundFade = (j: number, n: number): number => {
  const u = j / (n - 1);
  return smoothstep(0, 0.2, u) * smoothstep(0, 0.2, 1 - u);
};
/** A mound: its graded body (pale → light → Prussian → deep with depth), two flowing white lines, its foam crest and claws, its keyline. */
function drawMound(L: WaveLayer, m: Mound, f: number, cam: WaveCam, blocks: { key: { on: boolean; dx: number; dy: number }; pale: { on: boolean }; pru: { on: boolean }; pal: Reg; prd: Reg }, bob: number): void {
  const sh = moundShape(m);
  const dy = bob;
  const n = sh.top.length;
  const fa = sh.top.map((_, j) => moundFade(j, n));
  // A strip of quads between two rails (one point per top point), faded at the mound's ends.
  const strip = (a: readonly XY[], z: readonly XY[], c0: RGB, c1: RGB, ox: number, oy: number): void => {
    for (let j = 0; j + 1 < a.length; j++) if (fa[j] + fa[j + 1] > 0) L.vec.push({ kind: 'quad', pts: flat([a[j], a[j + 1], z[j + 1], z[j]], cam, m.k, ox, oy), colors: [c0, c0, c1, c1], alpha: 1, alphas: [fa[j], fa[j + 1], fa[j + 1], fa[j]] });
  };
  const floor = sh.rails[2].map((p) => [p[0], 1320] as XY);
  if (blocks.pale.on && !blocks.pru.on) strip(sh.top, floor, C.light, C.light, 0, dy);
  if (blocks.pru.on) {
    strip(sh.rails[2], floor, C.deep, C.deep, 0, dy);
    const ts = [0.08, 0.3, 0.58, 0.9];
    const rails = [sh.top, ...sh.rails];
    for (let r = 0; r + 1 < rails.length; r++) strip(rails[r], rails[r + 1], blue(ts[r]), blue(ts[r + 1]), blocks.prd.dx, blocks.prd.dy + dy);
    const flowed = flowAt(f) * 0.6;
    sh.rails.slice(0, 2).forEach((rail, i) => {
      const u: number[] = [];
      let acc = 0;
      rail.forEach((p, j) => {
        if (j > 0) acc += Math.hypot(p[0] - rail[j - 1][0], p[1] - rail[j - 1][1]);
        u.push(acc);
      });
      // Only over the mound's middle (its ends fade).
      for (const [a0, z0] of dashes(300 + m.seed * 3 + i, acc, flowed)) {
        const a = Math.max(a0, 0.2 * acc);
        const z = Math.min(z0, 0.8 * acc);
        if (z - a > 12) L.vec.push(dash(subPolyline(rail, u, a, z), 2.2, cam, m.k, C.foam, 0.85, blocks.prd.dx, blocks.prd.dy + dy));
      }
    });
  }
  if (blocks.key.on) {
    const k = keyline(sh.top, cam, m.k, 500 + m.seed, { base: 3.4, swing: 1.2, dx: blocks.key.dx, dy: blocks.key.dy + dy });
    if (k.kind === 'stroke') k.widths = k.widths.map((w, j) => w * smoothstep(0, 0.6, fa[j]));
    L.vec.push(k);
  }
  // Its foam crest and claws: one mass (D3), keylined only on its outer side (it grows out of the water).
  if (blocks.pale.on) {
    const shapes: MassShape[] = [
      { pts: [...sh.capOut, ...[...sh.capIn].reverse()], line: sh.capOut, k: m.k, warp: null, dx: blocks.pal.dx, dy: blocks.pal.dy + dy },
      ...sh.claws.flatMap((c) => fingerShapes(c, m.k, null, blocks.pal.dx, blocks.pal.dy + dy)),
    ];
    drawMass(L, shapes, cam, blocks, 1.7, 540 + m.seed);
  }
}
/** A mound's swell: a slow bob (px), the sea breathing. */
const moundBob = (m: Mound, f: number): number => 5 * Math.sin((2 * Math.PI * (f - BURST)) / 40 + m.seed * 1.7);

// ——— The spray (design §4.8: • particles with gravity) ————————————————————————————————————————————————————————————————————————

/** A spray particle: born at `b` from (x, y) on plane `k` with velocity (vx, vy) px/f, gravity 0.9 px/f², living `life` frames. */
export type Drop = { b: number; x: number; y: number; vx: number; vy: number; life: number; size: number; k: number; id: number };

const burstDrops = (id0: number, n: number, b: number, x: number, y: number, k: number, speed: [number, number], spread: [number, number], life: [number, number]): Drop[] =>
  Array.from({ length: n }, (_, j) => {
    const id = id0 + j;
    const a = rad(lerp(spread[0], spread[1], hash(id, 1)));
    const v = lerp(speed[0], speed[1], hash(id, 2));
    return { b: b + Math.floor(3 * hash(id, 3)), x: x + 30 * (hash(id, 4) - 0.5), y: y + 30 * (hash(id, 5) - 0.5), vx: v * Math.cos(a), vy: v * Math.sin(a), life: lerp(life[0], life[1], hash(id, 6)), size: lerp(10, 26, hash(id, 7)), k, id };
  });

/** Which row each of LIP_CLAWS belongs to. */
const LIP_ROWS: readonly ClawRow[] = lipClaws(1, SCROLL_REST).map((c) => c.row);

/** Every drop of the part (deterministic): the eruption, his board's trail and the crest's 16ths, the crash, the boats surfacing, the kicks' spray. */
export const DROPS: readonly Drop[] = (() => {
  const out: Drop[] = [];
  out.push(...burstDrops(0, 90, BURST, 960, 540, PLANE.wave, [14, 34], [0, 360], [30, 52]));
  // His board's trail on the water (the trough and the face): a few a frame, thrown back off the board.
  const board = wakeRuns()[0];
  for (let j = 0; j < board.length; j += 4) {
    const w = board[j];
    out.push(...burstDrops(1000 + 4 * j, 4, Math.floor(w.t), w.p[0], w.p[1], PLANE.wave, [4, 12], [190, 350], [18, 30]));
  }
  // The crest's landing, and spray off his board's side on the crest's 16ths (T05).
  const land = rideAt(CREST).contact;
  out.push(...burstDrops(2000, 50, CREST, land[0], land[1] - 30, PLANE.wave, [8, 22], [190, 350], [16, 22]));
  for (let k = 1; k < 4; k++) {
    const t = CREST + 6 * k;
    const c = rideAt(t).contact;
    out.push(...burstDrops(2100 + 20 * k, 12, t, c[0], c[1] - 10, PLANE.wave, [6, 16], [200, 320], [18, 28]).map((d) => ({ ...d, b: t })));
  }
  for (let k = 0; k < 4; k++) {
    const t = BARREL.from - 24 + 6 * k + 3;
    if (t <= CREST) continue;
    const c = rideAt(t).contact;
    out.push(...burstDrops(2200 + 20 * k, 8, t, c[0] - 20, c[1], PLANE.wave, [5, 12], [210, 300], [16, 24]).map((d) => ({ ...d, b: t, size: d.size * 0.8 })));
  }
  // The crash: from the impact, on the spray plane where the camera of 11.1 shows it.
  const cam = waveCam(WAVE_CRASH);
  const imp = fromScreen(cam, PLANE.spray, toScreen(cam, PLANE.wave, IMPACT));
  out.push(...burstDrops(3000, 220, WAVE_CRASH - 1, imp[0], imp[1], PLANE.spray, [6, 26], [180, 360], [26, 48]).map((d) => ({ ...d, size: d.size * 1.4 })));
  BOATS.forEach((b, i) => out.push(...burstDrops(4000 + 100 * i, 30, SEAL, b.x, b.y - 20, b.k, [6, 18], [200, 340], [20, 34])));
  // R2-04: on the open hats after the seal the rocking boats throw spray off their bows and sterns (the prow stays alive).
  [PROW, PROW + 24].forEach((h, j) =>
    BOATS.forEach((b, i) => {
      for (const [m, side] of [-0.42, 0.4].entries()) out.push(...burstDrops(4500 + 200 * j + 40 * i + 20 * m, 12, h, b.x + side * b.len, b.y - 16, b.k, [5, 13], [205, 335], [22, 32]).map((d) => ({ ...d, size: d.size * 0.85 })));
    }),
  );
  // Spray on the beat (D1): on the kicks before the barrel, the flicking fingers throw white dots off their tips (none into the dive:
  // the camera's zoom would streak them across the frame).
  [BLOCKS[4], CREST].forEach((k, j) => {
    const hands = LIP_CLAWS.filter((_, i) => LIP_ROWS[i] === CLAW_ROWS[1]);
    [1, 4, 7, 10, 12].forEach((ci, m) => {
      const tip = hands[ci].spine[hands[ci].spine.length - 1];
      out.push(...burstDrops(6000 + 100 * j + 12 * m, 7, k, tip[0], tip[1], PLANE.claws, [7, 19], [195, 345], [16, 22]).map((d) => ({ ...d, b: k, size: d.size * 0.8 })));
    });
  });
  return out;
})();

/** The leap's splash (11.4): the drops that become the game pixels (sprayAt). */
export const LEAP_DROPS: readonly Drop[] = burstDrops(5000, 96, DOWNSAMPLE.from, 0, 0, 1, [6, 20], [190, 350], [40, 60]);

/** A drop's plane position at f (null when not alive). */
export function dropAt(d: Drop, f: number): XY | null {
  const t = f - d.b;
  if (t < 0 || t > d.life) return null;
  const drag = (1 - Math.exp(-0.06 * t)) / 0.06;
  return [d.x + d.vx * drag, d.y + d.vy * drag + 0.45 * t * t];
}

/** The 80 formation cells (12.1), the copies' first: where the game pixels fly in the last 16th. */
const CELLS: readonly { x: number; y: number; copy: boolean }[] = (() => {
  const out: { x: number; y: number; copy: boolean }[] = [];
  for (let c = 0; c < 10; c++) for (let r = 0; r < 8; r++) {
    const [x, y] = cellCentre(c, r);
    out.push({ x, y, copy: SIGNATURE_BITS[r][c] });
  }
  return out.sort((a, b) => Number(b.copy) - Number(a.copy));
})();

/** A game pixel the spray (or the mountain) became: screen px, its brightness (1 = a copy-to-be, fading for the empty cells). */
export type SprayPixel = { x: number; y: number; on: number; copy: boolean };

/** Where the downsample's scan line is (layout px, from the top); null before 11.4 (on 11.3& it waits on the top edge). */
export function scanLineY(f: number): number | null {
  if (f < DOWNSAMPLE.from - 12 || f >= DOWNSAMPLE.to) return null;
  if (f < DOWNSAMPLE.from) return 2;
  return (1080 * (f - DOWNSAMPLE.from + 1)) / (DOWNSAMPLE.to - DOWNSAMPLE.from);
}
/** The fizzle (0 → 1) of the quantised picture over the downsample's last 16th: a fraction of its game pixels gone black, all by 12.1 − 1. */
export const derezAt = (f: number): number => clamp((f - (DOWNSAMPLE.to - 7)) / 6) ** 1.3;

/** The quantise cell above the line (layout px): 4, 8, 16, 32 on the 16ths of 11.4 (DOWNSAMPLE_STEPS). */
export function downsampleCell(f: number): number {
  const k = DOWNSAMPLE_STEPS.filter((s) => s - 0.25 <= f).length;
  return [0, 4, 8, 16, 32][Math.min(4, k)];
}

/**
 * sprayAt (contract §6.3, 1055 → 1056): the game pixels of the leap's splash and of the mountain's faces once the scan line has passed
 * them. From 11.4& they fly to the formation's 80 cells (the copies' cells first), each snapped to the 6 px game grid; the ones bound for
 * an empty cell fade out, so on drop2 12.1 − 1 exactly the 27 copies' cells hold a lit pixel.
 */
export function sprayAt(f: number): SprayPixel[] {
  const line = scanLineY(f);
  if (line === null || f < DOWNSAMPLE.from) return [];
  const cam = waveCam(f);
  const p0 = prowScreen(DOWNSAMPLE.from);
  const sources: XY[] = [];
  for (const d of LEAP_DROPS) {
    const q = dropAt(d, Math.min(f, DOWNSAMPLE.from + 11));
    if (q) sources.push([p0[0] + q[0], p0[1] + q[1] - 20]);
  }
  for (const m of MOUNTAIN_FACES) sources.push(toScreen(cam, PLANE.mountain, [m.x, m.y]));
  const gather = DOWNSAMPLE.from + 12;
  const out: SprayPixel[] = [];
  sources.forEach((s, i) => {
    if (s[1] > line) return;
    const cell = CELLS[i % CELLS.length];
    const u = ease.inOutCubic(clamp((f - gather) / (DOWNSAMPLE.to - 1 - gather)));
    const x = lerp(s[0], cell.x, u);
    const y = lerp(s[1], cell.y, u);
    const extra = i >= CELLS.length;
    const on = cell.copy && !extra ? 1 : 1 - u;
    if (on <= 0.01) return;
    out.push({ x: GP * Math.round(x / GP), y: GP * Math.round(y / GP), on, copy: cell.copy && !extra });
  });
  return out;
}

// ——— The crash's foam ———————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * A crash claw's outline: clawOutline with its root drawn in to a third as well: a tongue of foam thrown out of the impact, swelling and
 * hooking, not a plank with a square-cut end.
 */
function tongue(c: Claw): XY[] {
  const o = clawOutline(c);
  const n = c.spine.length;
  return o.map((p, j) => {
    const i = j < n ? j : 2 * n - 1 - j;
    const k = 0.32 + 0.68 * Math.sin((Math.PI / 2) * clamp(i / (n - 1) / 0.2)) ** 0.7;
    const s = c.spine[i];
    return [s[0] + (p[0] - s[0]) * k, s[1] + (p[1] - s[1]) * k] as XY;
  });
}

/** The crash's impact on screen at 11.1 (the camera of the crash). */
export const CRASH_AT: XY = toScreen(waveCam(WAVE_CRASH), PLANE.claws, IMPACT);
/** The crash's tongues: how many. */
export const CRASH_TONGUES = 9;

/**
 * The crash's foam tongues (11.1, design §4.8 "the crash"; T06, round 1: inked in the print's plates over the water, not line art on a
 * blank page, and not a radial flower): nine great claws thrown up as a wall where the lip lands on the boats, on the kick (fast-out:
 * 75 % of their reach by + 2, full by + 6), hooking over; from 11.1& they curl back like fingers and sink into the water, gone by
 * 11.2 + 6.
 * Plane px on the claws' plane.
 */
export function crashClaws(f: number): Claw[] {
  if (f < WAVE_CRASH - 0.25 || f >= SEAL + 6) return [];
  const t = f - WAVE_CRASH + 0.25;
  const grow = 1 - (1 - clamp(t / 3.5)) ** 3;
  const back = ease.inOutSine(clamp((f - (WAVE_CRASH + 12)) / (SEAL + 6 - (WAVE_CRASH + 12))));
  const out: Claw[] = [];
  for (let i = 0; i < CRASH_TONGUES; i++) {
    // A wall of foam thrown up where the lip lands: the tongues rise from all along the landing (420 px of it, right of the mountain; not one point: no
    // flower), each leaning forward a little, of uneven height (tallest a little ahead of the impact), each a hand of fingers hooking over
    // at the top as the print's foam does.
    const u = (i + 0.6 * hash(i, 501)) / CRASH_TONGUES;
    const base: XY = [IMPACT[0] - 130 + 400 * u + 30 * grow * (u - 0.5), IMPACT[1] + 14 * Math.sin(9 * u) + 220 * back];
    const th = rad(-80 + 26 * (u - 0.45) + 14 * (hash(i, 502) - 0.5));
    const tall = Math.exp(-(((u - 0.55) / 0.38) ** 2));
    const len = (170 + 260 * tall + 90 * hash(i, 503)) * Math.max(0.04, grow * (1 - 0.85 * back));
    out.push(growClaw(base, th + 0.5 * back, len, (34 + 22 * tall) * (1 - 0.4 * back), 1, 700 + i, 0.75 + 0.5 * back));
  }
  return out;
}

/** A billow of the crash's foam burst on screen (layout px): its centre, radius, its outline's seed. */
export type Billow = { x: number; y: number; r: number; seed: number };
/**
 * The billows' rest layout (round 2, R2-04: the 11.1 crash ramped the frame's luminance from 0.45 to 0.55 and did not land): a wall of
 * round cartoon foam thrown up from the impact over the whole picture, three rows of lumpy discs (82–88 % of the frame), the bottom
 * row biggest; the top-left corner stays open.
 */
const BILLOWS: readonly Billow[] = [
  ...[150, 520, 900, 1250, 1600, 1910].map((x, i) => ({ x, y: 930 + 40 * hash(i, 811), r: 270 + 50 * hash(i, 812), seed: i })),
  ...[330, 720, 1100, 1480, 1860].map((x, i) => ({ x, y: 560 + 50 * hash(i, 813), r: 235 + 45 * hash(i, 814), seed: 10 + i })),
  ...[620, 1000, 1380, 1760].map((x, i) => ({ x, y: 190 + 40 * hash(i, 815), r: 195 + 45 * hash(i, 816), seed: 20 + i })),
];
/**
 * The crash's foam burst (11.1, round 2, R2-04): struck on the impact frame — the billows pop up at 85 % of their size half a shutter
 * early (so 11.1 itself is the hit), swell to full by + 2 and hold the frame white through + 2 (three frames over 70 % foam); from + 2
 * they break up fast, shrinking and flying out from the impact (≈ 35 % on + 4, gone by + 8), revealing the tongues, the spray and the
 * spent sea. Under it the thrown lip rolls back into the crest's foam nose (rollAt). Empty outside 11.1 − 0.25 … + 8.75.
 */
export function crashBurst(f: number): Billow[] {
  const t = f - WAVE_CRASH + 0.25;
  if (t < 0 || t >= 9) return [];
  const g = 0.85 + 0.15 * ease.outCubic(clamp(t / 2));
  const e = 1 - (1 - clamp((t - 2.25) / 6.75)) ** 1.6;
  return BILLOWS.map((b) => {
    const dx = b.x - CRASH_AT[0];
    const dy = b.y - CRASH_AT[1];
    const L = Math.hypot(dx, dy) || 1;
    const fly = 420 * e * (0.7 + 0.6 * hash(b.seed, 817));
    return { x: b.x + (dx / L) * fly, y: b.y + (dy / L) * fly - 60 * e, r: b.r * g * (1 - e), seed: b.seed };
  }).filter((b) => b.r > 2);
}
/** A billow's lumpy outline (screen px, closed). */
function billowOutline(b: Billow): XY[] {
  const n = 56;
  return Array.from({ length: n }, (_, j) => {
    const a = (2 * Math.PI * j) / n;
    const r = b.r * (1 + 0.07 * Math.sin(5 * a + b.seed) + 0.04 * Math.sin(9 * a + 2.3 * b.seed));
    return [b.x + r * Math.cos(a), b.y + r * Math.sin(a)] as XY;
  });
}

// ——— The frame ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The frame at sub-frame instant f: the print's passes back to front (sky, clouds · the mountain · the far sea, its swells and the far
 * mounds · the boats and their rowers among the mounds · the great wave: its bands, white lines, his wake, keylines, foam mass, fingers;
 * the near mounds; the smaller wave in front · the crash's tongues and the spray · the hero · the paper's cartouche, seal and kento marks),
 * the downsample, and what is drawn over the quantised picture.
 */
export function waveFrame(f: number, layout: { rounded: Advance; jp: Advance } = { rounded: defaultRounded, jp: () => 1 }, mode: 'print' | 'game' = 'print'): WaveFrame {
  C = mode === 'game' ? CG : CP;
  try {
    return buildFrame(f, layout, mode);
  } finally {
    C = CP;
  }
}

function buildFrame(f: number, layout: { rounded: Advance; jp: Advance }, mode: 'print' | 'game'): WaveFrame {
  const cam = waveCam(f);
  const key = blockState('key', f);
  const pale = blockState('pale', f);
  const pru = blockState('prussian', f);
  const sky = blockState('sky', f);
  const boats = blockState('boats', f);
  const layers: WaveLayer[] = [];
  const hookPulse = Math.max(0, 1 - Math.abs(f - (CREST + 12)) / 6) + Math.max(0, 1 - Math.abs(f - (SEAL + 36)) / 6) * 0.5;
  const pal = { dx: pale.dx + MIS.pale[0], dy: pale.dy + MIS.pale[1] };
  const prd = { dx: pru.dx + MIS.prussian[0], dy: pru.dy + MIS.prussian[1] };
  const blocks = { key, pale, pru, pal, prd };
  const warp = warpAt(f);

  // 0. The sky, its haze band and the clouds.
  const back = emptyLayer();
  if (sky.on) {
    back.vec.push(...skyQuads(cam, 1));
    for (const c of CLOUDS) back.vec.push(fill(c, cam, PLANE.cloud, C.cloud, 1, sky.dx, sky.dy));
  }
  if (key.on && sky.on) for (const [i, c] of CLOUDS.entries()) back.vec.push(keyline(c.slice(0, 29), cam, PLANE.cloud, 11 + i, { base: 2.2, swing: 0.8, dx: key.dx, dy: key.dy, alpha: 0.7 }));
  layers.push(back);

  // 1. The small kaomoji mountain: silhouette (light blue), snow cap with its ω edge, the faces, the amber • on the peak.
  const mtn = emptyLayer();
  const ms = planeScale(cam, PLANE.mountain);
  if (sky.on) {
    // Its foot runs on 40 px under the horizon, under the sea (the base never shows as a straight cut when the planes part).
    mtn.vec.push(fill([...MOUNTAIN_SHAPE, [MOUNTAIN_SHAPE[MOUNTAIN_SHAPE.length - 1][0], HORIZON + 40], [MOUNTAIN_SHAPE[0][0], HORIZON + 40]], cam, PLANE.mountain, C.light, 1, sky.dx, sky.dy));
    mtn.vec.push(fill(SNOW_CAP, cam, PLANE.mountain, C.foam, 1, sky.dx, sky.dy));
    for (const m of MOUNTAIN_FACES) {
      const [x, y] = toScreen(cam, PLANE.mountain, [m.x + sky.dx, m.y + sky.dy]);
      const snow = m.row <= MOUNTAIN.snowRows;
      const size = 12 * ms * (1 + 0.16 * hookPulse);
      mtn.glyphs.rounded.push(...stringGlyphs(HERO2.base, x, y, size, snow ? C.prussian : C.foam, layout.rounded, { rot: cam.roll }));
    }
    const peak = toScreen(cam, PLANE.mountain, [MOUNTAIN.x, MOUNTAIN.base - MOUNTAIN.height - 14]);
    mtn.glyphs.rounded.push(glyphAt('•', peak[0], peak[1], 22 * ms, C.amber));
  }
  if (key.on) {
    mtn.vec.push(keyline(MOUNTAIN_SHAPE, cam, PLANE.mountain, 21, { base: 3.5, swing: 1, dx: key.dx, dy: key.dy }));
    mtn.vec.push(keyline(SNOW_CAP.filter((p) => p[1] >= SNOWLINE - 1), cam, PLANE.mountain, 22, { base: 2.5, swing: 0.8, dx: key.dx, dy: key.dy }));
  }
  layers.push(mtn);

  // 2. The far sea (graded from the horizon), the far swells, the far mounds.
  const sea = emptyLayer();
  if (pale.on) {
    const rows: [number, RGB][] = [
      [HORIZON, pru.on ? blue(0.12) : C.pale],
      [940, pru.on ? blue(0.45) : C.light],
      [1500, pru.on ? blue(0.75) : C.light],
    ];
    for (let i = 0; i + 1 < rows.length; i++) sea.vec.push({ kind: 'quad', pts: flat([[-2600, rows[i][0]], [4500, rows[i][0]], [4500, rows[i + 1][0]], [-2600, rows[i + 1][0]]], cam, PLANE.sea, pal.dx, pal.dy), colors: [rows[i][1], rows[i][1], rows[i + 1][1], rows[i + 1][1]], alpha: 1, straight: true });
  }
  for (const [i, s] of SWELLS.entries()) {
    const o = swellOutline(s, HORIZON + 4);
    if (pru.on) sea.vec.push(fill(o, cam, PLANE.swells, C.prussian, 1, prd.dx, prd.dy));
    if (key.on) sea.vec.push(keyline(o.slice(0, 15), cam, PLANE.swells, 40 + i, { base: 2.6, swing: 0.8, dx: key.dx, dy: key.dy }));
  }
  if (key.on) sea.vec.push({ ...keyline([[-2600, HORIZON], [4500, HORIZON]], cam, PLANE.swells, 39, { base: 2.2, swing: 0.5, dx: key.dx, dy: key.dy }), straight: true });
  for (const m of MOUNDS) if (m.z === 0 && !m.front) drawMound(sea, m, f, cam, blocks, moundBob(m, f));
  layers.push(sea);

  // 3. The boats (Defender's red boxes) among the mounds: the far boat, the middle one, the lead; each trough's mound in front of it.
  const boatsL = emptyLayer();
  const infected = f >= SEAL - 0.25;
  for (const i of [2, 1, 0]) {
    drawBoat(boatsL, BOATS[i], i, f, cam, { key, boats, infected, layout });
    const z = [3, 2, 1][i];
    for (const m of MOUNDS) if (m.z === z && !m.front) drawMound(boatsL, m, f, cam, blocks, moundBob(m, f));
  }
  layers.push(boatsL);

  // 4. The great wave — a moving woodblock print (D1, D2; no kaomoji in the water): the striated body, the white lines flowing along it,
  //    his amber wake, the sumi keylines, the fingers in three rows (flicking on the kicks), the foam mass and its dots; then the near
  //    mounds and the smaller wave in front.
  const wave = emptyLayer();
  drawBody(wave, MAIN_BODY, f, cam, { pale, pru, pal, prd }, warp);
  // His wake (T05/R8): bokashi amber along the line his board carved, laid down as he passes, bleeding outward slowly. The crest's run
  // is printed over the foam (after it, below), so it shows where he rode the top.
  const crestWake: VecItem[] = [];
  if (pru.on && f >= BLOCKS[4] + 5) {
    for (const [ri, run] of wakeRuns().entries()) {
      const out = ri === 0 ? wave.vec : crestWake;
      const done = run.filter((w) => w.t <= f);
      if (done.length < 2) continue;
      const pts = done.map((w) => w.p);
      const age = done.map((w) => Math.max(0, f - w.t));
      const along = pts.map((_, i) => (i === 0 ? 0 : Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])));
      for (let i = 1; i < along.length; i++) along[i] += along[i - 1];
      const total = along[along.length - 1];
      if (total < 24) continue;
      // Tapered at both ends (the brush lifting); the leading end grows in with him.
      const taper = along.map((d) => Math.sin((Math.PI / 2) * clamp(Math.min(d, total - d) / WAKE_TAPER)) ** 0.8);
      const bleed = age.map((t) => Math.min(8, (7 * t) / 24));
      out.push(...ribbon(pts, taper.map((k, i) => (5 + bleed[i]) * k), taper.map((k, i) => (26 + bleed[i]) * k), cam, PLANE.wave, C.bokashi, 0.62, { warp }));
      out.push(...ribbon(pts, taper.map((k) => 1.6 * k), taper.map((k, i) => (7 + 0.5 * bleed[i]) * k), cam, PLANE.wave, C.amber, 0.92, { warp }));
    }
  }
  if (key.on) {
    const lipAlpha = 1 - collapseAt(f);
    wave.vec.push(...keylines(BACK_KEY, cam, PLANE.wave, 1, { dx: key.dx, dy: key.dy, warp }));
    // The curl: Defender's four compass arcs (WAVE_CURL), the sumi keyline — the water's outer edge to where it ends; past that the
    // drafting is a guide the foam takes over: on the burst it is whole (the switch's arcs, in register), and it dissolves as the colour
    // blocks print (gone on the Prussian block, 10.1&).
    const guide = 1 - clamp((f - blockAt('pale') + 0.25) / (blockAt('prussian') - blockAt('pale')));
    for (const [k, a] of WAVE_CURL.entries()) {
      const arc = (s0: number, s1: number): XY[] =>
        Array.from({ length: 25 }, (_, j) => {
          const t = rad(lerp(a.a0, a.a1, lerp(s0, s1, j / 24) - k));
          return [a.cx + a.r * Math.cos(t), a.cy + a.r * Math.sin(t)];
        });
      const base = lerp(10, 6, k / 3);
      const wet = clamp(WATER_END - k);
      if (wet > 0) wave.vec.push(...keylines(arc(k, k + wet), cam, PLANE.wave, 2 + k, { base, dx: key.dx, dy: key.dy, warp, lipAlpha }));
      if (wet < 1 && guide > 0) wave.vec.push(...keylines(arc(k + wet, k + 1), cam, PLANE.wave, 12 + k, { base: lerp(base, 3, 1 - guide), alpha: guide, dx: key.dx, dy: key.dy, warp, lipAlpha }));
    }
    wave.vec.push(...keylines(curlRun(WATER_END, 0, lipThickness, 10), cam, PLANE.wave, 6, { base: 5, swing: 2, dx: key.dx, dy: key.dy, warp, lipAlpha }));
    wave.vec.push(...keylines(FACE, cam, PLANE.wave, 7, { base: 7, dx: key.dx, dy: key.dy, warp }));
  }
  // The fingers: three rows along the lip (back pale, then white), Prussian line work; from 10.2& turned toward the boats; on every kick
  // their curl tightens and lets go (the flick). Thrown with the lip in the crash, they fold back with it into the nose.
  const turn = 0.22 * clamp((f - CLAWS + 0.25) / 6) ** 0.5;
  const curl = 1 + 0.35 * flickAt(f);
  const grow = Math.max(collapseAt(f), 0.75 * throwAt(f));
  const lipRows = lipClaws(curl, scrollAt(f)).map((c) => ({ ...c, claw: turn > 0 ? turnClaw(c.claw, turn) : c.claw }));
  // The drafted scroll (the key block's spiral, winding back as the colours print) is still Defender's line drawing.
  for (const { claw, row, ci } of lipRows) if (row === SCROLL_ROW) drawClaw(wave, claw, row, ci, cam, PLANE.wave, { key, pale, pal }, warp);
  // D3: the back row of fingers, one mass behind; then the cap and the front row, one mass; the thin blue lines inside; the dots.
  const pieceOf = (c: Claw): Warp => shareWarp(warp, lipWeight(c.spine[0]));
  const backRow = lipRows.filter((c) => c.row === CLAW_ROWS[0]).map((c) => c.claw);
  const frontRow = lipRows.filter((c) => c.row === CLAW_ROWS[1]).map((c) => c.claw);
  drawMass(wave, backRow.flatMap((c) => fingerShapes(c, PLANE.wave, pieceOf(c), pal.dx, pal.dy)), cam, { key, pale }, 2.4, 610);
  const capLines = emptyLayer();
  const caps = capMass(capLines, MAIN_BODY, cam, { pale, pru, pal, prd }, warp, grow);
  drawMass(wave, [...caps, ...frontRow.flatMap((c) => fingerShapes(c, PLANE.wave, pieceOf(c), pal.dx, pal.dy))], cam, { key, pale }, 2.6, 640);
  wave.vec.push(...capLines.vec);
  if (pale.on) for (const c of frontRow) fingerLines(wave, [c], cam, PLANE.wave, pieceOf(c), pal.dx, pal.dy);
  drawDots(wave, f, cam, { pale, pru, pal, prd }, warp, grow);
  wave.vec.push(...crestWake);
  // The near mounds, rolling in front of the trough.
  for (const m of MOUNDS) if (m.front) drawMound(wave, m, f, cam, blocks, moundBob(m, f));
  // The smaller wave in front (plane 1.06): its own bands, lines, keylines, fingers and foam.
  drawBody(wave, FRONT_BODY, f, cam, { pale, pru, pal, prd }, null);
  if (key.on) {
    wave.vec.push(keyline(FRONT_KEY, cam, PLANE.front, 31, { base: 6.5, swing: 2, dx: key.dx, dy: key.dy }));
    wave.vec.push(keyline(FRONT_INNER, cam, PLANE.front, 32, { base: 4, swing: 1.5, dx: key.dx, dy: key.dy }));
    wave.vec.push(keyline(FRONT_FACE, cam, PLANE.front, 33, { base: 5, dx: key.dx, dy: key.dy }));
  }
  {
    const fc = frontClaws(curl);
    drawMass(wave, fc.filter((c) => c.row === FRONT_CLAW_ROWS[0]).flatMap((c) => fingerShapes(c.claw, PLANE.front, null, pal.dx, pal.dy)), cam, { key, pale }, 2, 660);
    const fLines = emptyLayer();
    const fcaps = capMass(fLines, FRONT_BODY, cam, { pale, pru, pal, prd }, null);
    const fFront = fc.filter((c) => c.row === FRONT_CLAW_ROWS[1]).map((c) => c.claw);
    drawMass(wave, [...fcaps, ...fFront.flatMap((c) => fingerShapes(c, PLANE.front, null, pal.dx, pal.dy))], cam, { key, pale }, 2.2, 680);
    wave.vec.push(...fLines.vec);
    if (pale.on) fingerLines(wave, fFront, cam, PLANE.front, null, pal.dx, pal.dy, 0.7);
  }
  layers.push(wave);

  // 5. The crash's tongues (inked in the print's plates: a pale-blue block 3 px off, the foam, Prussian line work) and the spray.
  const fore = emptyLayer();
  // The crash's foam (D3: one mass, not outlined strands): the pale block 5 px off under it, the white mass with its one keyline, the
  // blue block's cuts inside it (two lines out along each tongue).
  const tongues = crashClaws(f);
  if (tongues.length > 0) {
    const shapes: MassShape[] = tongues.flatMap((root) => clawsOf(root).map((k) => ({ pts: tongue(k), line: null, k: PLANE.claws, warp: null, dx: 0, dy: 0 })));
    for (const m of shapes) fore.vec.push(fill(m.pts, cam, PLANE.claws, C.pale, 1, 5, 4));
    drawMass(fore, shapes, cam, { key: { on: true, dx: 0, dy: 0 }, pale: { on: true } }, 2.8, 300);
    for (const root of tongues) {
      const n = root.spine.length;
      for (const side of [-0.28, 0.22]) {
        const pts: XY[] = [];
        for (let i = Math.round(0.12 * n); i < Math.round(0.8 * n); i++) {
          const q0 = root.spine[Math.max(0, i - 1)];
          const q1 = root.spine[Math.min(n - 1, i + 1)];
          const Ln = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) || 1;
          const w = (root.width / 2) * (1 - i / (n - 1)) ** 1.6 * side;
          pts.push([root.spine[i][0] - ((q1[1] - q0[1]) / Ln) * w, root.spine[i][1] + ((q1[0] - q0[0]) / Ln) * w]);
        }
        if (pts.length > 2) fore.vec.push(dash(pts, 2, cam, PLANE.claws, C.prussian, 0.75));
      }
    }
  }
  // The foam burst over it all (R2-04): the pale block 12 px off under the billows, then one white mass with one deep-blue keyline.
  const burst = crashBurst(f);
  if (burst.length > 0) {
    const outlines = burst.map(billowOutline);
    for (const o of outlines) fore.vec.push({ kind: 'fill', pts: o.flatMap((p) => [p[0] + 12, p[1] + 14]), color: C.pale, alpha: 1 });
    for (const [i, o] of outlines.entries()) fore.vec.push({ kind: 'stroke', pts: o.flat(), widths: o.map(() => 9 + 3 * hash(i, 818)), color: C.deep, alpha: 1, closed: true });
    for (const o of outlines) fore.vec.push({ kind: 'fill', pts: o.flat(), color: C.foam, alpha: 1 });
    // Two curls of the blue block's line work in each billow, so the white reads as churning water.
    for (const b of burst)
      for (const k of [0, 1]) {
        const a0 = 2 * Math.PI * hash(b.seed, 820 + k);
        const rr = b.r * (0.5 - 0.2 * k);
        const arc: XY[] = Array.from({ length: 14 }, (_, j) => {
          const a = a0 + (1.9 * j) / 13;
          const q = rr * (1 - 0.25 * (j / 13));
          return [b.x + q * Math.cos(a), b.y + q * Math.sin(a)] as XY;
        });
        fore.vec.push({ kind: 'stroke', pts: arc.flat(), widths: arc.map((_, j) => Math.max(0.8, 5 * Math.sin((Math.PI * (j + 0.5)) / 14) * Math.min(1, b.r / 200))), color: C.light, alpha: 0.85, closed: false });
      }
  }
  for (const d of DROPS) {
    const q = dropAt(d, f);
    if (!q) continue;
    const [x, y] = toScreen(cam, d.k, q);
    const life = (f - d.b) / d.life;
    // The crash's spray is water as well as foam: every third drop light Prussian.
    const isBlue = d.id >= 3000 && d.id < 3220 && d.id % 3 === 0;
    fore.glyphs.rounded.push(glyphAt('•', x, y, d.size * planeScale(cam, d.k) * (1 - 0.4 * life), isBlue ? C.light : C.foam, { outline: 0.06, outlineColor: C.deep }));
  }
  layers.push(fore);

  // 6. The hero: woodblock amber, a 10 px sumi keyline; the mothership's bitmap goes on top of the quantised picture instead.
  const heroL = emptyLayer();
  const h = heroWave(f);
  if (!h.bitmap) {
    const size = h.width / strWidth(h.face, layout.rounded);
    const outline = Math.min(0.17, 10 / size);
    heroL.glyphs.hero.push(...stringGlyphs(h.face, h.x, h.y, size, C.amber, layout.rounded, { rot: h.rot, sx: h.sx, sy: h.sy, outline, outlineColor: C.sumi }));
  }
  layers.push(heroL);

  // 7. The paper: kento marks (keyline block), the cartouche (its frame with the boats block, the bytes on the seal), his amber seal.
  const paper = emptyLayer();
  if (key.on) {
    paper.vec.push({ kind: 'stroke', pts: [1868, 1000, 1868, 1040, 1828, 1040], widths: [5, 5, 5], color: C.sumi, alpha: 1, closed: false, straight: true });
    paper.vec.push({ kind: 'stroke', pts: [52, 40, 52, 80], widths: [5, 5], color: C.sumi, alpha: 1, closed: false, straight: true });
  }
  const CART = WAVE_CARTOUCHE;
  if (boats.on) {
    const r: XY[] = [[CART.x0, CART.y0], [CART.x1, CART.y0], [CART.x1, CART.y1], [CART.x0, CART.y1]];
    paper.vec.push({ kind: 'fill', pts: r.flatMap((p) => [p[0] + boats.dx, p[1] + boats.dy]), color: C.cartouche, alpha: 1, straight: true });
    paper.vec.push({ kind: 'stroke', pts: [...r, r[0]].flatMap((p) => [p[0] + key.dx, p[1] + key.dy]), widths: [5, 5, 5, 5, 5], color: C.sumi, alpha: 1, closed: false, straight: true });
    // The cartouche's inner rule (a print's double border).
    const ri: XY[] = [[CART.x0 + 9, CART.y0 + 9], [CART.x1 - 9, CART.y0 + 9], [CART.x1 - 9, CART.y1 - 9], [CART.x0 + 9, CART.y1 - 9]];
    paper.vec.push({ kind: 'stroke', pts: [...ri, ri[0]].flatMap((p) => [p[0] + key.dx, p[1] + key.dy]), widths: [2, 2, 2, 2, 2], color: C.sumi, alpha: 1, closed: false, straight: true });
    // Until the seal it is Defender's print: his red title, set vertically (top to bottom). On the seal (11.2) he re-signs it: the
    // title lifts off the paper (2 frames) as his bytes ink in over it.
    const off = clamp((f - SEAL + 0.25) / 2);
    if (off < 1) {
      paper.glyphs.jp.push(...stringGlyphs(CART_TITLE, (CART.x0 + CART.x1) / 2 + boats.dx, (CART.y0 + CART.y1) / 2 + boats.dy - 10 * off, 30, C.red, layout.jp, { rot: -Math.PI / 2, alpha: 1 - off }));
    }
  }
  if (f >= SEAL - 0.25) {
    // The bytes (T10, round 1: three columns of Latin read row by row scrambled the signature): one column, top to bottom in the
    // signature's own order, a byte a row, a wider space between its three words; one byte a frame.
    const n = Math.floor(f - SEAL + 0.25) + 1;
    for (const b of cartoucheBytes().slice(0, n)) paper.glyphs.jp.push(...stringGlyphs(b.text, b.x, b.y, CART_BYTE_SIZE, mode === 'game' ? C.foam : C.sumi, layout.jp));
    // The seal: amber, stamped (R2-04: 1.4 → 0.94 over 3 f, a recoil back to 1 by + 8; it lands twisted 10° and snaps to −4°), his
    // face carved out of it.
    const t = f - SEAL + 0.25;
    const s = t < 3 ? lerp(1.4, 0.94, ease.inCubic(clamp(t / 3))) : lerp(0.94, 1, ease.outCubic(clamp((t - 3) / 5)));
    const half = 52 * s;
    const sx = 1760;
    const sy = 980;
    const ang = rad(-4 - 10 * (1 - ease.outCubic(clamp(t / 4))));
    const corner = (u: number, v: number): XY => [sx + u * Math.cos(ang) - v * Math.sin(ang), sy + u * Math.sin(ang) + v * Math.cos(ang)];
    paper.vec.push({ kind: 'fill', pts: [corner(-half, -half), corner(half, -half), corner(half, half), corner(-half, half)].flat(), color: C.amber, alpha: 1, straight: true });
    paper.glyphs.rounded.push(...stringGlyphs(HERO2.base, sx, sy, 30 * s, C.washi, layout.rounded, { rot: -ang }));
  }
  layers.push(paper);

  // The downsample and what goes over it.
  const line = scanLineY(f);
  const cell = downsampleCell(f);
  const top = emptyLayer();
  if (line !== null) {
    // (Flickering on the frame as approved on the 61-bar map: v07Frame, so v08's bridge A, which moved drop 2 a bar, keeps the flicker.)
    const glow = f < DOWNSAMPLE.from ? 0.5 + 0.5 * Math.sin(v07Frame(f) * 1.7) : 1;
    top.vec.push({ kind: 'stroke', pts: [-20, line, 1940, line], widths: [5, 5], color: C.scan, alpha: glow, closed: false, straight: true });
    top.vec.push({ kind: 'stroke', pts: [-20, line - 7, 1940, line - 7], widths: [10, 10], color: C.scan, alpha: 0.18 * glow, closed: false, straight: true });
  }
  for (const s of sprayAt(f)) top.vec.push({ kind: 'fill', pts: [s.x, s.y, s.x + GP, s.y, s.x + GP, s.y + GP, s.x, s.y + GP], color: C.white, alpha: s.on, straight: true });
  if (h.bitmap) {
    for (const [x, y] of litOf(HERO_BITMAP)) {
      const x0 = MOTHERSHIP.cx - MOTHERSHIP_WIDTH / 2 + x * MOTHERSHIP.px;
      const y0 = MOTHERSHIP.cy - (HERO_BITMAP.length * MOTHERSHIP.px) / 2 + y * MOTHERSHIP.px;
      top.vec.push({ kind: 'fill', pts: [x0, y0, x0 + MOTHERSHIP.px, y0, x0 + MOTHERSHIP.px, y0 + MOTHERSHIP.px, x0, y0 + MOTHERSHIP.px], color: C.amber, alpha: 1, straight: true });
    }
  }
  return { layers, downsample: line !== null && cell > 0 ? { lineY: line, cell, derez: derezAt(f) } : null, top, cam };
}

/** The scroll's reach (spiral parameter): whole on the key block, winding back out of the hollow as the colour blocks print (870 → 882). */
export const scrollAt = (f: number): number => lerp(SCROLL_ROW.s1, SCROLL_REST, ease.inOutSine(clamp((f - blockAt('pale') + 0.25) / (blockAt('sky') - blockAt('pale')))));

/** The cartouche on the paper (top right, layout px; no parallax): a tall narrow slip, one column of bytes. */
export const WAVE_CARTOUCHE = { x0: 1712, x1: 1842, y0: 64, y1: 420 } as const;
/** Defender's title in his print's cartouche, until he signs it (the scoreboard's title, src/content/drop2.ts). */
export const CART_TITLE = 'DEFENDER v2.0';
/** The bytes' size (px, Noto Sans JP) and pitch. */
const CART_BYTE_SIZE = 28;
/** His bytes in the cartouche: E2 80 A2 20 CF 89 20 E2 80 A2 in reading order, one column, top to bottom, a gap between the three words. */
export function cartoucheBytes(): { text: string; x: number; y: number }[] {
  const words = SIGNATURE.cartouche.map((w) => w.split(' '));
  const pitch = 30;
  const gap = 12;
  const total = words.flat().length * pitch + (words.length - 1) * gap;
  const C0 = WAVE_CARTOUCHE;
  let y = (C0.y0 + C0.y1) / 2 - total / 2 + pitch / 2;
  const out: { text: string; x: number; y: number }[] = [];
  words.forEach((w, wi) => {
    for (const b of w) {
      out.push({ text: b, x: (C0.x0 + C0.x1) / 2, y });
      y += pitch;
    }
    if (wi < words.length - 1) y += gap;
  });
  return out;
}

/** The back's keyline: the back curve from the frame's left edge to the crest (the arcs carry on from there). */
const BACK_KEY: readonly XY[] = BACK.filter((p) => p[0] > -260);

/**
 * One boat at f (T09, round 1: an oshiokuri-bune, not a plank): the slim crescent hull with its raised bow, Defender's red with a darker
 * gunwale band and a sumi keyline; the rowers in one row along the gunwale, crouched, each a cream head (≥ 28 px) outlined in red with his
 * face in Noto Sans JP — (￣▽￣), looking up (￣□￣」) on the crest, infected (￣ω￣) with an amber ω from the seal; the flung boxes on the crest.
 */
function drawBoat(L: WaveLayer, b: Boat, i: number, f: number, cam: WaveCam, s: { key: { on: boolean; dx: number; dy: number }; boats: { on: boolean; dx: number; dy: number }; infected: boolean; layout: { rounded: Advance; jp: Advance } }): void {
  const bob = boatBob(i, f);
  const sink = boatSink(i, f);
  const tumble = boatTumble(i, f);
  // On the burst the fragments fly from the box's edges (round (960, 540)) to their places (landing ≈ + 12).
  const arrive = 1 - Math.exp(-Math.max(0, f - BURST + 1) / 3.2);
  const fromX = 960 + [200, -180, 0][i];
  const fromY = 540 + [-150, 200, 260][i];
  const dx = lerp(fromX - b.x, 0, arrive) + bob.dx;
  const dy = lerp(fromY - b.y, 0, arrive) + bob.dy + sink;
  const tilt = bob.tilt + lerp([-90, 140, 60][i], 0, arrive) + tumble;
  const hull = hullOutline(b, tilt, dx, dy);
  const top = gunwaleOf(b, tilt, dx, dy);
  L.vec.push(fill(hull, cam, b.k, C.red, 1));
  if (s.boats.on) {
    // The darker gunwale band: the top edge and a line 35 % of the way down the hull.
    const keel = hull.slice(25).reverse();
    const band = top.map((p, j) => {
      const q = keel[Math.min(keel.length - 1, Math.max(0, j - 1))] ?? p;
      return [lerp(p[0], q[0], 0.35), lerp(p[1], q[1], 0.35)] as XY;
    });
    L.vec.push(fill([...top.slice(1, -1), ...band.slice(1, -1).reverse()], cam, b.k, C.redDeep, 1, s.boats.dx, s.boats.dy));
  }
  if (s.key.on) L.vec.push(keyline([...hull, hull[0]], cam, b.k, 80 + i, { base: 3.4, swing: 1, dx: s.key.dx, dy: s.key.dy }));
  const sc = planeScale(cam, b.k);
  // The infected hull: an amber ω on its side.
  if (s.infected) {
    const under = hull[25 + (23 - 12)];
    const mid = toScreen(cam, b.k, [lerp(top[12][0], under[0], 0.5), lerp(top[12][1], under[1], 0.55)]);
    L.glyphs.rounded.push(glyphAt('ω', mid[0], mid[1], 34 * sc, C.amber, { rot: -rad(tilt) + cam.roll }));
  }
  if (!s.boats.on) return;
  const looking = f >= CREST - 0.25 && f < WAVE_CRASH;
  const face = s.infected ? GUEST_INFECTED.face : looking ? GUEST_VARIANTS[1].face : GUEST.face;
  const a = rad(tilt);
  const size = ROWER_SIZE * sc;
  const faceW = [...face].reduce((w, ch) => w + s.layout.jp(ch), 0) * size * ROWER_CONDENSE;
  for (let r = 0; r < b.rowers; r++) {
    const t = lerp(0.28, 0.9, b.rowers === 1 ? 0.5 : r / (b.rowers - 1));
    const g = top[Math.round(t * 24)];
    const wave = s.infected ? 5 * Math.max(0, Math.sin(Math.PI * (((f - SEAL) / 12 + r * 0.5) % 1))) : 0;
    // Crouched on the gunwale, rocking with the stroke; the head's bottom on the gunwale line.
    const stroke = 3 * Math.sin((2 * Math.PI * (f - BURST)) / 24 + r * 1.3 + i);
    const up = ROWER_SIZE * 0.62 + wave + stroke;
    const local: XY = [g[0] + Math.sin(a) * up, g[1] - Math.cos(a) * up];
    const [x, y] = toScreen(cam, b.k, local);
    // The head: a cream pill round the face, outlined in Defender's red.
    const hw = faceW / 2 + 7 * sc;
    const hh = size * 0.6;
    const rot = -a + cam.roll;
    const pill: number[] = [];
    for (let j = 0; j < 20; j++) {
      const th = (2 * Math.PI * j) / 20;
      const px = Math.cos(th) * hw;
      const py = Math.sin(th) * hh;
      const sq = Math.abs(Math.cos(th)) ** 0.25;
      const lx = Math.sign(px) * Math.max(Math.abs(px) * sq, Math.abs(px) - hh * 0.2);
      pill.push(x + lx * Math.cos(rot) + py * Math.sin(rot), y - lx * Math.sin(rot) + py * Math.cos(rot));
    }
    L.vec.push({ kind: 'fill', pts: pill, color: C.foam, alpha: 1 });
    L.vec.push({ kind: 'stroke', pts: pill, widths: pill.filter((_, q) => q % 2 === 0).map(() => 2.4 * sc), color: C.red, alpha: 1, closed: true });
    L.glyphs.jp.push(...stringGlyphs(face, x, y, size, C.rower, s.layout.jp, { rot, sx: ROWER_CONDENSE }));
    if (s.infected) {
      // The amber ω over the red one: (￣ω￣)'s third character.
      const chars = [...face];
      const total = chars.reduce((w, ch) => w + s.layout.jp(ch), 0);
      const before = s.layout.jp(chars[0]) + s.layout.jp(chars[1]) + s.layout.jp(chars[2]) / 2;
      const off = (before - total / 2) * size * ROWER_CONDENSE;
      L.glyphs.jp.push(glyphAt('ω', x + off * Math.cos(rot), y - off * Math.sin(rot), size * 1.04, C.amber, { rot }));
    }
  }
  // The flung boxes (10.3): three per boat, arcing from the bow toward the wave; the foam swallows them (gone by 10.4).
  if (f >= CREST - 0.25 && f < BARREL.from) {
    const bow = top[2];
    // Thrown at the lip's front (in this boat's plane: where the camera of 10.3 shows the lip's tip), arcing up into its fingers.
    const cam0 = waveCam(CREST);
    const aim = fromScreen(cam0, b.k, toScreen(cam0, PLANE.claws, [curlPoint(1.05)[0] + 60, curlPoint(1.05)[1] + 40]));
    for (let k = 0; k < 3; k++) {
      const t = f - CREST - 2 * k;
      if (t < 0) continue;
      const u = clamp(t / 14);
      const px = lerp(bow[0], aim[0] + 30 * (k - 1), u);
      const py = lerp(bow[1] - 30, aim[1] + 20 * (k - 1), u) - 160 * Math.sin(Math.PI * u);
      const gone = clamp((t - 12) / 4);
      const side = 20 * (1 - gone);
      if (side <= 1) continue;
      const box: XY[] = [[px - side, py - side], [px + side, py - side], [px + side, py + side], [px - side, py + side]];
      L.vec.push(fill(box, cam, b.k, C.red, 1));
      L.vec.push(keyline([...box, box[0]], cam, b.k, 90 + k, { base: 2.5, swing: 0.5 }));
    }
  }
}
/** The rowers' face size (px of type at the boats' rest scale; T09: their heads ≥ 28) and its condensing (the faces set narrow, to fit a row on a hull). */
export const ROWER_SIZE = 28;
const ROWER_CONDENSE = 0.8;

// ——— Look, photography, segment ————————————————————————————————————————————————————————————————————————————————————————————

/** The print: flat, the paper is the light (no bloom but the scan line's), a little grain; a soft vignette. */
export function waveLook(f: number): Look {
  const scanning = f >= DOWNSAMPLE.from - 12;
  return { ...FLAT_LOOK, grain: 0.035, vignette: 0.12, bloom: scanning ? { intensity: 0.6, threshold: 0.9, smoothing: 0.1, radius: 0.5 } : FLAT_LOOK.bloom };
}

/** Sub-frames: 32 on the eruption, his loop and the crash (pops, wipes, spray), 64 on the barrel dive, 16 elsewhere. */
export function waveTemporal(f: number): Temporal {
  if (f >= BARREL.from && f <= WAVE_CRASH + 2) return { samples: 64, shutter: 0.5, persistence: 0 };
  if ((f >= BURST && f < BURST + 14) || (f >= BLOCKS[4] && f < CREST + 2) || (f > WAVE_CRASH + 2 && f < SEAL + 6)) return { samples: 32, shutter: 0.5, persistence: 0 };
  return { samples: 16, shutter: 0.5, persistence: 0 };
}

export const waveSegment = (f: number): Segment => drop2Segment(f);

/** Every string the wave draws per atlas (for its atlases). */
export const WAVE_STRINGS = {
  rounded: [...new Set([...HERO2.base, ...HERO2.jump, ...HERO2.surf, ...HERO2.ride, ...HERO2.cheer, '•', 'ω'])],
  jp: [...new Set(['つ', ...GUEST.face, ...GUEST_INFECTED.face, ...GUEST_VARIANTS[1].face, 'ω', ...SIGNATURE.cartouche.join(''), ...CART_TITLE].filter((c) => c !== ' '))],
} as const;

/** The crest's top on the wave's plane (for tests: the spent wave stands lower). */
export const CREST_PEAK: XY = CREST_TOP;

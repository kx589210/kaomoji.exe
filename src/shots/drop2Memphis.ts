// S31M MEMPHIS, drop2 14.1–15.1 − 1 (2.5D), layer 3/5 `memphis.css` (builder act2b; build sheet notes/bid2/drop2-sheet2.md §3 bar 14,
// §4.11, §5 #16–#18, §6.3; the design notes/extend/drop2-final.md §4.11, its frames − 3264 = local). Pure: Node tests import it.
//
// An orthographic isometric room corner (true isometric: pitch 35.264°, yaw 45°), a set of unlit primitives with procedural laminates,
// a 6 px #111 silhouette outline and a hard #111 shadow offset (12, 12) px on screen (src/scenes/drop2Memphis.ts draws them):
//   14.1   he lands as the totem's face block (600 px face at (960, 420), squash 1.12 / 0.88); the arcade's last pieces (voxelStateAt) fly
//          into the totem in rings, one ring a 16th, and each slab pops up on its 16th under him (magenta, turquoise, the zigzag drum, the
//          checker plinth: a boing each, 8 % over); the walls spring up; the props drop in on the 8ths, each bouncing twice.
//   14.1&  the ω laminate: a bacteria field of tiny black ω squiggles spreads over the white floor from under the totem.
//   14.2   Defender's firewall: a red panel with a white 40 px grid slides in from the right and slams down in front of him (I),
//          tagged `firewall.css`; a second from the left on 14.2e. They box him to the chin.
//   14.2&  the laminate climbs the red panels as amber ω squiggles: infected.
//   14.3   SET ROTATION −90° (launched 6 f before with a −4° anticipation, I on the beat): the set turns on its turntable, he doesn't
//          (his block is dragged and springs back to face us); the walls fold like a pop-up book (the one that comes round to the front
//          folds down, the hidden one rises); the panels swing in and bolt onto the totem as Sottsass shelves: the firewall became
//          furniture.
//   14.3&  every surface patterned; the lemon squiggle bounces on the 16ths.
//   14.4   CRANE UP (L): pitch 35° → 90° (I on 15.1), zoom 600 → 240 px on his face, which tilts up to the camera; the walls fold away.
//   14.4&  GRID SNAP on the 32nds (CLICKS: the ruler clicks one 32nd later, R4): the walls are gone on 14.4&, then the 90° lines, the 45°
//          lines, the curves straighten and the palette cools to Aicher's; ON 15.1 the pictograms' sheet itself slams in (src/shots/
//          drop2Picto.ts trackLayers, its world already streaming, its lines settling, its figures stomping) and his face block is the head
//          disc, 240 px at (960, 300): the crane lands (15.1 − 1) and the snap is the pictograms' first frame.
// World: y up, the floor y = 0, the totem's axis x = z = 0; 1 world unit = 1 px at 1080p at zoom 1.
import { HERO2, SIGNATURE } from '../content/drop2.ts';
import { type RGB, linear, mixRGB } from '../engine/color.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import { SWAP_LEAD, type Segment, type Temporal, struck } from '../engine/temporal.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Look } from '../engine/types.ts';
import { COWBELL2, CRANE_UP, GRID_SNAP, KICKS2, PANELS, PICTO, PROPS, SET_ROTATE, SLABS, TOTEM } from '../score/drop2.ts';
import { voxelStateAt } from './drop2ArcadeVoxel.ts';
import { FIG, HEAD_AT, type PictoLayout, trackLayers } from './drop2Picto.ts';
import { LAW, PALETTES, drop2Segment, flow, impact, springL } from './drop2Shared.ts';

export type V3 = readonly [number, number, number];
type M3 = [number, number, number];
const DEG = Math.PI / 180;
const BEAT = 24;
const SIXTEENTH = 6;

/** The part's span: he lands on 14.1; the pictograms take over on 15.1. */
export const MEM = { from: TOTEM, to: PICTO } as const;

// ——— Palette ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

const P = PALETTES.memphis;
/** The Memphis inks (sRGB hex) and the grid snap's Aicher targets (design §4.11: cobalt → ultramarine, turquoise → green, lemon → white, magenta → silver). */
export const INKS = {
  white: P.ground,
  ink: P.ink,
  cobalt: P.cobalt,
  magenta: P.magenta,
  lemon: P.lemon,
  turquoise: P.turquoise,
  mint: P.mint,
  red: LAW.defender.print,
  amber: LAW.hero,
} as const;
export type InkName = keyof typeof INKS;
export const AICHER: Readonly<Record<InkName, string>> = {
  white: PALETTES.picto.ground,
  ink: '#1B2A3A',
  cobalt: PALETTES.picto.blue,
  magenta: PALETTES.picto.silver,
  lemon: '#FFFFFF',
  turquoise: PALETTES.picto.green,
  mint: PALETTES.picto.deep,
  red: LAW.defender.print,
  amber: LAW.hero,
};

// ——— Time ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The grid snap's four stages, one a 32nd: the 90° lines, the 45° lines, the curves straighten (and the palette cools), the sheet slams in.
 * They are the score's ruler 32nds (GRID_SNAP, 14.4& → 14.4a&: the clicks in the music) taken one 32nd later, so the last stage is ON 15.1
 * (PICTO) with the kick, the brass stab and the whistle, and the first three each land on a ruler click (review R4, 2026-10-02: the plan view
 * used to be complete 3 frames before the downbeat, which then read as a settled frame). The first ruler click (14.4&) folds the walls away.
 */
const SNAP_SHIFT = PICTO - GRID_SNAP[GRID_SNAP.length - 1];
export const CLICKS = { lines90: GRID_SNAP[0] + SNAP_SHIFT, lines45: GRID_SNAP[1] + SNAP_SHIFT, straighten: GRID_SNAP[2] + SNAP_SHIFT, sheet: PICTO } as const;
/** The first ruler click (14.4&): the walls have folded away and the floor's tiles are gone (the sheet's grid draws on the next three). */
export const WALLS_AWAY = GRID_SNAP[0];
/** A click's own snap: 0 before, an impact over 3 f landing on it (the ruler's click is the frame it lands). */
export const clickAt = (f: number, at: number): number => impact(f, at, 3);

/** The set's turn (degrees, about the vertical; negative = clockwise seen from above): a −4° anticipation over the 4 f before the launch,
 * then an impact from SET_ROTATE.from to −90° exactly on SET_ROTATE.to (14.3), a 2° recoil ringing out by + 10. */
export function setTurn(f: number): number {
  const { from, to } = SET_ROTATE;
  if (f <= from - 4) return 0;
  if (f < from) return 4 * flow((f - (from - 4)) / 4);
  if (f < to) return lerp(4, -90, impact(f, to, to - from));
  const t = f - to;
  return -90 + 2 * Math.exp(-0.35 * t) * Math.sin(0.9 * t);
}
/** How far the set has turned (0 → 1 across the move; the panels' morph into shelves rides it). */
export const turnProgress = (f: number): number => clamp(-Math.min(0, setTurn(f)) / 90);

/** The crane's ease (14.4 → 15.1 − 1): a launch's first shove (L) and an impact into plan view, landing on 15.1 − 1 (sheet §3). */
export function craneAt(f: number): number {
  const u = clamp((f - CRANE_UP.from) / (CRANE_UP.to - 1 - CRANE_UP.from));
  return 0.3 * (1 - (1 - u) ** 3) + 0.7 * u ** 3;
}
/** He tilts his face up to the rising camera (L on 14.4, soft). */
export const lookUp = (f: number): number => clamp(springL(f, CRANE_UP.from, 0.75));

// ——— The camera ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

export type MemphisCam = { pitch: number; yaw: number; zoom: number; target: V3 };
export const ISO = { pitch: 35.264 * DEG, yaw: 45 * DEG } as const;
/**
 * His face: 600 px ink width on the block's front, at (960, 420) on 14.1. In plan view (15.1 − 1) it is the pictogram's: a 200 px face on
 * the 240 px head disc at (960, 300) (src/shots/drop2Picto.ts FIG, HEAD_AT) — the block, 720 wide, is the disc's 240 at the same zoom.
 */
export const FACE = { width: 600, land: [960, 420] as const, plan: 200, disc: 240, discAt: [960, 300] as const } as const;
/** The plan view's zoom: his 600-unit face at the pictogram's 200 px. */
export const PLAN_ZOOM = FACE.plan / FACE.width;

/** The camera's basis: right, up (screen) and toward the camera (the view direction reversed). */
export function basis(pitch: number, yaw: number): { right: M3; up: M3; back: M3; flat: M3 } {
  const [cp, sp, cy, sy] = [Math.cos(pitch), Math.sin(pitch), Math.cos(yaw), Math.sin(yaw)];
  return { right: [cy, 0, -sy], up: [-sp * sy, cp, -sp * cy], back: [cp * sy, sp, cp * cy], flat: [sy, 0, cy] };
}
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a: V3, b: V3, k = 1): M3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** Where a world point lands on screen (layout px, y down) under the orthographic camera. */
export function project(c: MemphisCam, p: V3): [number, number] {
  const b = basis(c.pitch, c.yaw);
  const d: V3 = [p[0] - c.target[0], p[1] - c.target[1], p[2] - c.target[2]];
  return [960 + c.zoom * dot(d, b.right), 540 - c.zoom * dot(d, b.up)];
}
/** The world point under screen (sx, sy) on the plane n·P = k. */
export function unproject(c: MemphisCam, sx: number, sy: number, n: V3, k: number): M3 {
  const b = basis(c.pitch, c.yaw);
  const o = add(add(c.target, b.right, (sx - 960) / c.zoom), b.up, (540 - sy) / c.zoom);
  const t = (k - dot(n, o)) / dot(n, b.back);
  return add(o, b.back, t);
}

/** The camera's yaw: a slow isometric drift 45° → 53° through the bar (an orbit), unwound by the crane so plan view lands square. */
export function yawAt(f: number): number {
  const drift = 8 * DEG * flow(clamp((f - MEM.from) / (CRANE_UP.from - MEM.from)));
  return ISO.yaw + drift * (1 - craneAt(f));
}
export const pitchAt = (f: number): number => lerp(ISO.pitch, 90 * DEG, craneAt(f));
/** The groove after the turn (14.3 → 14.4): the camera eases in 4 % toward the crane (a living hold), then the crane takes it from there. */
export const pushAt = (f: number): number => 1 + 0.04 * flow(clamp((f - SET_ROTATE.to) / (CRANE_UP.from - SET_ROTATE.to)));
/** The zoom: 1 through the landing and the firewall, the push after the turn, then log-linear to the plan view's (600 → 200 px face). */
export const zoomAt = (f: number): number => Math.exp(lerp(Math.log(pushAt(f)), Math.log(PLAN_ZOOM), craneAt(f)));

/** The 80s kit's pump: the cowbell 8ths from the turn's landing (14.3) to the crane (the totem squashes and the props hop on each). */
export const GROOVE: readonly number[] = COWBELL2.filter((c) => c >= SET_ROTATE.to && c < CRANE_UP.from);
/** The squash of a pump at f (0 → 0.06 on the 8th, ringing out in ≈ 8 f), lag frames late (the cascade down the totem). */
export function groove(f: number, lag = 0): number {
  let s = 0;
  for (const g of GROOVE) {
    const t = f - g - lag;
    if (t >= 0) s += 0.06 * Math.exp(-t / 3) * Math.cos(0.9 * t);
  }
  return s;
}
/** A prop's hop on each pump (18 units, a 6-frame parabola). */
export function grooveHop(f: number): number {
  for (const g of GROOVE) {
    const t = f - g;
    if (t >= 0 && t < 6) return 18 * 4 * (t / 6) * (1 - t / 6);
  }
  return 0;
}

// ——— The totem ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The face block: amber, 720 × 400 × 300, on the magenta slab; the stack below (heights in world units). */
export const BLOCK = { w: 720, h: 400, d: 300, base: 500 } as const;
export const STACK = [
  { id: 'magenta', shape: 'box', size: [560, 100, 500], y0: 400, yaw: -12, ink: 'magenta', laminate: 'solid' },
  { id: 'turquoise', shape: 'box', size: [480, 100, 440], y0: 300, yaw: 22, ink: 'turquoise', laminate: 'dots' },
  { id: 'drum', shape: 'cylinder', size: [340, 180, 340], y0: 120, yaw: 0, ink: 'white', laminate: 'zigzag' },
  { id: 'plinth', shape: 'box', size: [380, 120, 380], y0: 0, yaw: 0, ink: 'white', laminate: 'checker' },
] as const;

/** The impact squash of his landing: x 1.12 / y 0.88 on 14.1, springing back over ≈ 10 f. */
export function landSquash(f: number): [number, number] {
  const t = f - MEM.from;
  const e = t < 0 ? 1 : Math.exp(-0.4 * t) * Math.cos(0.75 * t);
  return [1 + 0.12 * e, 1 - 0.12 * e];
}
/** His block's yaw relative to the camera's: turned 10° (a sliver of its right side shows: a block, not a card); the turntable drags him 14° into the turn, he springs back. */
export const BLOCK_YAW = -10 * DEG;
/** The turntable's drag (radians). */
export function blockDrag(f: number): number {
  const t = f - (SET_ROTATE.from - 1);
  if (t <= 0) return 0;
  return -14 * DEG * Math.exp(-0.28 * t) * Math.sin(0.55 * t);
}
/** His face block at f: centre, yaw (world), tilt (the face up toward the camera) and its face's centre and normal. */
export function heroBlock(f: number): { centre: M3; yaw: number; tilt: number; face: M3; normal: M3; squash: [number, number] } {
  const yaw = yawAt(f) + BLOCK_YAW * (1 - lookUp(f)) + blockDrag(f);
  const tilt = pitchAt(f) * lookUp(f);
  const [sx, sy] = landSquash(f);
  const h: M3 = [Math.sin(yaw), 0, Math.cos(yaw)];
  // Tipping back on its back-bottom edge: centre = pivot + Rx(−tilt)·(0, H/2, D/2), in the block's (right, up, h) frame.
  const a = (BLOCK.h * sy) / 2;
  const b = BLOCK.d / 2;
  const up = a * Math.cos(tilt) + b * Math.sin(tilt);
  const fwd = -a * Math.sin(tilt) + b * Math.cos(tilt);
  const pivot: M3 = [-h[0] * b, BLOCK.base, -h[2] * b];
  const centre = add(add(pivot, [0, 1, 0], up), h, fwd);
  const normal: M3 = [h[0] * Math.cos(tilt), Math.sin(tilt), h[2] * Math.cos(tilt)];
  return { centre, yaw, tilt, face: add(centre, normal, b + 1), normal, squash: [sx, sy] };
}

/** The camera at f: it holds his face at (960, 420) through the bar and carries it to (960, 300) as it cranes into plan view. */
export function memphisCam(f: number): MemphisCam {
  const pitch = pitchAt(f);
  const yaw = yawAt(f);
  const zoom = zoomAt(f);
  const b = basis(pitch, yaw);
  const face = heroBlock(f).face;
  const off = lerp(540 - FACE.land[1], 540 - FACE.discAt[1], craneAt(f));
  return { pitch, yaw, zoom, target: add(face, b.up, -off / zoom) };
}
/** The camera on 14.1 (the layout below is placed on screen with it). */
export const CAM0: MemphisCam = memphisCam(MEM.from);

// ——— The room ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The room's half size: the back corner sits at ≈ (960, 200) on 14.1, so the walls fill the top of the frame in a V. */
export const ROOM = { half: 870, height: 1400 } as const;
/** The four walls, each with its inward normal; `ink` and `laminate` their faces. Only the walls facing the camera stand (a cutaway). */
export const WALLS = [
  { id: 'left', n: [1, 0, 0] as V3, ink: 'cobalt', laminate: 'dots' },
  { id: 'right', n: [0, 0, 1] as V3, ink: 'white', laminate: 'band' },
  { id: 'frontRight', n: [-1, 0, 0] as V3, ink: 'lemon', laminate: 'stripes' },
  { id: 'frontLeft', n: [0, 0, -1] as V3, ink: 'white', laminate: 'stripes' },
] as const;
export type WallId = (typeof WALLS)[number]['id'];
/** A vector of the set's local frame in the world (the set's turn about the vertical). */
export function turned(v: V3, f: number): M3 {
  const a = setTurn(f) * DEG;
  return [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
}
/**
 * How far a wall stands (0 folded flat outward, 1 upright): it stands while its face turns toward the camera (the cutaway), springs up on
 * 14.1e with the second slab (so 14.1 itself is the voxel well's white floor, his block and the arcade's pieces where the well left
 * them: the morph lands clean), and folds away under the crane (by the 90° grid's click).
 */
/** The walls' rise (frames, centred on the second slab's 16th). */
export const WALL_RISE = 4;
export function wallStand(id: WallId, f: number): number {
  const w = WALLS.find((x) => x.id === id)!;
  const n = turned(w.n, f);
  const b = basis(pitchAt(f), yawAt(f));
  const facing = smoothstep(-0.15, 0.45, dot(n, b.flat));
  // Eased up over 4 frames centred on the second slab's 16th, no overshoot (R10: the spring popped them up with a boing; with the right
  // wall's checker band, smeared by the shutter, the rise swept the top right as a grey flash pair in the strict 6 × 6 test).
  const rise = flow(clamp((f - (SLABS[1] - WALL_RISE / 2)) / WALL_RISE));
  const away = 1 - smoothstep(CRANE_UP.from + 2, WALLS_AWAY, f);
  return facing * rise * away;
}

// ——— Placing things on screen (the 14.1 camera) ———————————————————————————————————————————————————————————————————————————————

/** The floor point under screen (sx, sy) on 14.1, at height y. */
export const onFloor = (sx: number, sy: number, y = 0): M3 => unproject(CAM0, sx, sy, [0, 1, 0], y);
/** The point of the set's left wall (x = −half) under screen (sx, sy) on 14.1, `out` units in front of it. */
export const onLeftWall = (sx: number, sy: number, out = 0): M3 => unproject(CAM0, sx, sy, [1, 0, 0], -ROOM.half + out);
export const onRightWall = (sx: number, sy: number, out = 0): M3 => unproject(CAM0, sx, sy, [0, 0, 1], -ROOM.half + out);

// ——— The props (design §4.11), each dropping in on its 8th and bouncing twice ————————————————————————————————————————————————————

export type Prim = 'box' | 'cylinder' | 'cone' | 'sphere' | 'prism' | 'squiggle' | 'arch' | 'disc';
export type Laminate = 'solid' | 'checker' | 'zigzag' | 'dots' | 'grid' | 'stripes' | 'band';
/** The props' places (the set's frame), each landing on PROPS[k]. */
export const PROP_LAYOUT = [
  { id: 'zigzagCylinder', shape: 'cylinder', at: PROPS[0], pos: onFloor(300, 700), size: [220, 260, 220], ink: 'mint', laminate: 'zigzag' },
  { id: 'triangle', shape: 'prism', at: PROPS[1], pos: onRightWall(1560, 300, 70), size: [300, 260, 120], ink: 'magenta', laminate: 'stripes' },
  { id: 'cone', shape: 'cone', at: PROPS[2], pos: onFloor(1480, 760), size: [180, 220, 180], ink: 'ink', laminate: 'solid' },
  { id: 'sphere', shape: 'sphere', at: PROPS[2], pos: add(onFloor(1480, 760), [0, 1, 0], 220 + 80), size: [170, 170, 170], ink: 'turquoise', laminate: 'dots' },
  { id: 'squiggle', shape: 'squiggle', at: PROPS[3], pos: onLeftWall(560, 150, 160), size: [1100, 70, 22], ink: 'lemon', laminate: 'solid' },
] as const;
/** The lemon disc on the left wall: its rim carries the signature (Inter Tight Bold, black). */
export const DISC = { pos: onLeftWall(420, 330, 6), r: 170, ink: 'lemon' as InkName, rim: SIGNATURE.rim } as const;

/**
 * A prop's drop: it grows in (0 → 1, eased) while falling from + 220 (cubic, I on `at`) over the 4 frames before its 8th, then two bounces
 * (35 %, 12 % of a 160-unit hop) by + 14. R10: they used to fall from + 900 over 8 frames, so each dark prop crossed the white top of the
 * frame in two or three frames — a flash pair per prop in the strict 6 × 6 test; now each eases in where it lands.
 */
export const DROP = { height: 220, lead: 4 } as const;
export function dropHeight(f: number, at: number): number {
  if (f < at) return DROP.height * (1 - impact(f, at, DROP.lead));
  const t = f - at;
  if (t < 8) return 160 * 0.35 * 4 * (t / 8) * (1 - t / 8);
  if (t < 14) return 160 * 0.12 * 4 * ((t - 8) / 6) * (1 - (t - 8) / 6);
  return 0;
}
/** A prop's growth into the frame (0 before its drop, eased to 1 on its 8th). */
export const dropGrow = (f: number, at: number): number => flow(clamp((f - (at - DROP.lead)) / DROP.lead));
/** A drop's squash on each landing (y 0.8 → 1, x the inverse). */
export function dropSquash(f: number, at: number): number {
  const s = (t: number) => (t < 0 ? 0 : 0.2 * Math.exp(-0.6 * t) * Math.cos(0.9 * t));
  return Math.max(s(f - at), 0.5 * s(f - at - 8), 0.25 * s(f - at - 14));
}
/** A slab's pop (its scale), keyed on its 16th: from 0, 8 % over, settled by + 10. */
export const slabPop = (f: number, at: number): number => (f < at - 1 ? 0 : springL(f, at, 0.62));
/** The lemon squiggle bounces on the 16ths of 14.3& (a 30-unit hop each). */
export function squiggleBounce(f: number): number {
  const from = SET_ROTATE.to + 12;
  if (f < from || f >= CRANE_UP.from) return 0;
  const t = (f - from) % SIXTEENTH;
  return 30 * 4 * (t / SIXTEENTH) * (1 - t / SIXTEENTH);
}

// ——— The panels → the shelves ———————————————————————————————————————————————————————————————————————————————————————————————

/** The firewall panels: 840 × 700, 30 thick, red with a white 40 px grid, in front of him (the set's frame); the first from the right. */
export const PANEL = { w: 840, h: 700, t: 30, r: 420, grid: 40 } as const;
export const PANEL_LAYOUT = [
  { id: 'panelRight', at: PANELS[0], centre: [PANEL.r, PANEL.h / 2, 0] as V3, yaw: 90, from: 1 },
  { id: 'panelLeft', at: PANELS[1], centre: [0, PANEL.h / 2, PANEL.r] as V3, yaw: 0, from: -1 },
] as const;
/** Each panel's shelf once the set has turned (the world): jutting left and right of the totem, tilted like Sottsass's shelves. */
export const SHELVES = [
  { id: 'panelRight', side: -1, height: 260, out: 470, tilt: 18, size: [560, 34, 240] as V3 },
  { id: 'panelLeft', side: 1, height: 455, out: 500, tilt: -14, size: [600, 34, 250] as V3 },
] as const;
/**
 * A panel's slam (0 none, 1 home): it rolls down like a shutter from its top edge over the 4 frames into its beat (I, cubic: eased in,
 * fastest into the beat), home half a shutter early (SWAP_LEAD) so the beat's frame is the crisp slam, not its blur. R10: it used to fly in
 * 1600 px from the side in 9 frames (cubic: a pop in the last two), crossing the frame's right edge as a red flash pair in the strict 6 × 6
 * test; now it never leaves its own footprint.
 */
export const PANEL_IN = 4;
export const panelIn = (f: number, at: number): number => clamp((f - (at - SWAP_LEAD - PANEL_IN)) / PANEL_IN) ** 3;
/** The amber ω laminate climbing the panels (14.2& → 14.3): its front's height (world). */
export const infectFront = (f: number): number => lerp(-40, PANEL.h + 60, flow(clamp((f - (PANELS[0] + 12)) / 12)));

// ——— The floor's ω laminate ——————————————————————————————————————————————————————————————————————————————————————————————————

/** The bacteria field's front (world radius from the totem's axis): a 40 px front a 16th from 14.1&, faster under the turn. */
export function laminateFront(f: number): number {
  const t = f - (MEM.from + 12);
  if (t <= 0) return 0;
  return 260 + (40 * t) / SIXTEENTH + 900 * smoothstep(SET_ROTATE.from, SET_ROTATE.to + 12, f);
}
/** How straight the curves are (0 Memphis, 1 Aicher): the third click straightens every curve onto the grid. */
export const straightAt = (f: number): number => clickAt(f, CLICKS.straighten);
/**
 * The palette's cooling to Aicher's: the sky's blue ramps in over the 45° click → 15.1 − 1 (SKY: PRECOOL of the way by 15.1 − 1, eased),
 * the rest ON 15.1 with the snap. Continuity plan v07, seam 4800: the white floor turning blue in one frame was the cut's biggest change
 * (Δ 53 against ≈ 12 of motion), so most of it moves into the bar before the line; the downbeat keeps the last fifth with the sheet's slam,
 * the lanes and the figures (R4: 15.1 must not be a settled frame in check-sync — the ramp peaks at 0.2 a frame, the snap's frame more).
 */
export const PRECOOL = 0.8;
export const SKY = { from: CLICKS.lines45 - 1, to: PICTO - 1 } as const;
export const coolAt = (f: number): number => (struck(CLICKS.sheet, f) ? 1 : PRECOOL * smoothstep(SKY.from, SKY.to, f));
/**
 * The 3D set's presence (1 or 0): whole through 15.1 − 1, gone on the last click, 15.1, where the pictograms' sheet slams in (taken half a
 * shutter early, SWAP_LEAD, so 15.1's frame is all sheet and the frame before all set: a snap, not a dissolve of blurred fragments, R4).
 */
export const setAlpha = (f: number): number => (struck(CLICKS.sheet, f) ? 0 : 1);
/** Whether the sheet's lanes, bytes and figures are in (the last click, the same instant the set goes). */
export const sheetIn = (f: number): boolean => struck(CLICKS.sheet, f);

// ——— The arcade's last pieces (contract §6.3: voxelStateAt(1247) → memphisSolidsFrom) ————————————————————————————————————————————

/** The piece → primitive table (design §4.10): S/Z → squiggle, O → cube, T → prism, L/J → arch, I → cylinder. */
export const PIECE_SHAPE: Readonly<Record<string, Prim>> = { S: 'squiggle', Z: 'squiggle', O: 'box', T: 'prism', L: 'arch', J: 'arch', I: 'cylinder' };
const PIECE_INK: Readonly<Record<string, InkName>> = { pink: 'magenta', lemon: 'lemon', turquoise: 'turquoise', mint: 'mint', cobalt: 'cobalt', ink: 'ink', white: 'white', red: 'red', amber: 'amber' };
export type PieceSolid = { id: number; shape: Prim; ink: InkName; screen: [number, number]; ring: number; arrive: number };
/**
 * The arcade's last pieces as Memphis solids, each where the voxel well left it on screen, with the 16th it reaches the totem: the nearest
 * ring melts in on 14.1, the others fly in arriving on SLABS[1…3] (one ring a 16th, the slabs popping as they arrive).
 */
export function memphisSolidsFrom(state: ReturnType<typeof voxelStateAt>): PieceSolid[] {
  const c = FACE.land;
  return state.pieces.map((p, i) => {
    const d = Math.hypot(p.centre[0] - c[0], (p.centre[1] - (c[1] + 240)) * 1.4);
    const ring = Math.min(3, Math.floor(d / 260));
    return { id: i, shape: PIECE_SHAPE[p.type] ?? 'box', ink: PIECE_INK[p.ink] ?? 'ink', screen: [p.centre[0], p.centre[1]], ring, arrive: SLABS[ring] };
  });
}
/** The pieces the bar starts with (read live from the voxel builder's state on 14.1 − 1). */
export const PIECES = memphisSolidsFrom(voxelStateAt(MEM.from - 1));

// ——— The frame: every solid at f ——————————————————————————————————————————————————————————————————————————————————————————————

export type Solid = {
  id: string;
  shape: Prim;
  /** Centre (world). */
  pos: V3;
  /** Full size (world units): box w × h × d; cylinder / cone / sphere / disc ⌀ × h × ⌀; prism w × h × d; squiggle length × amplitude × radius. */
  size: V3;
  /** Euler angles (radians, order YXZ: yaw, then tilt, then roll). */
  rot: V3;
  ink: InkName;
  laminate: Laminate;
  /** The amber ω infection (panels and shelves): its front's world height, or null. */
  infect: number | null;
  /** Scale multipliers (the pops and the squashes). */
  scale: V3;
  alpha: number;
  /** Drawn in the room pass (the walls: no outline, no shadow) or the object pass. */
  pass: 'room' | 'object';
};

const yawOf = (f: number, local: number): number => local * DEG + setTurn(f) * DEG;
const pt = (v: V3, f: number): M3 => turned(v, f);
const lerp3 = (a: V3, b: V3, t: number): M3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** The totem's stack at f (the slabs pop on SLABS, top first: magenta under him on 14.1, the plinth last). */
function totem(f: number): Solid[] {
  return STACK.map((s, k) => {
    const pop = slabPop(f, SLABS[k]);
    const sq = groove(f, k);
    const [w, h, d] = s.size;
    return {
      id: s.id,
      shape: s.shape,
      pos: pt([0, s.y0 + h / 2, 0], f),
      size: [w, h, d],
      rot: [yawOf(f, s.yaw), 0, 0],
      ink: s.ink,
      laminate: s.laminate,
      infect: null,
      scale: [pop * (1 + sq / 2), pop * (1 - sq), pop * (1 + sq / 2)],
      alpha: 1,
      pass: 'object',
    } satisfies Solid;
  });
}

/** The panels: rolling down and slamming (14.2, 14.2e), then collapsing into shelves as the set turns (a box morph: 700 tall → 34 thick). */
function panels(f: number): Solid[] {
  const s = smoothstep(0.1, 0.95, turnProgress(f));
  const b = basis(pitchAt(f), yawAt(f));
  const out: Solid[] = [];
  PANEL_LAYOUT.forEach((p, i) => {
    const k = panelIn(f, p.at);
    if (k <= 0) return;
    // Home in the set's frame, its top edge fixed: the sheet unrolls down to the floor, slamming on its beat.
    const slide = pt(add(p.centre, [0, 1, 0], (PANEL.h * (1 - k)) / 2), f);
    // The shelf: jutting out of the totem along the screen's right or left, a little behind its face, tilted like Sottsass's.
    const sh = SHELVES[i];
    const shelfPos = add(add([0, sh.height, 0], b.right, sh.side * sh.out), b.flat, -60);
    // An outward arc through the turn, so the panel swings round him rather than through him.
    const arc: M3 = [b.flat[0] * 380 * Math.sin(Math.PI * s), 0, b.flat[2] * 380 * Math.sin(Math.PI * s)];
    const yaw0 = yawOf(f, p.yaw);
    let yaw1 = yawAt(f);
    let flips = 0;
    while (yaw1 - yaw0 > Math.PI / 2) {
      yaw1 -= Math.PI;
      flips++;
    }
    while (yaw1 - yaw0 < -Math.PI / 2) {
      yaw1 += Math.PI;
      flips++;
    }
    const roll = sh.tilt * DEG * sh.side * (flips % 2 ? -1 : 1);
    out.push({
      id: p.id,
      shape: 'box',
      pos: add(lerp3(slide, shelfPos, s), arc),
      size: lerp3([PANEL.w, PANEL.h * k, PANEL.t], sh.size, s),
      rot: [lerp(yaw0, yaw1, s), 0, lerp(0, roll, s)],
      ink: 'red',
      laminate: 'grid',
      infect: infectFront(f) + 900 * s,
      scale: [1, 1, 1],
      alpha: 1,
      pass: 'object',
    });
  });
  return out;
}

/** The props at f: dropping in on their 8ths, two bounces each, in the set's frame. */
function props(f: number): Solid[] {
  return PROP_LAYOUT.map((p) => {
    const h = dropHeight(f, p.at);
    const sq = dropSquash(f, p.at);
    const bounce = p.id === 'squiggle' ? squiggleBounce(f) : p.id === 'triangle' ? 0 : grooveHop(f);
    const [w, ht, d] = p.size;
    const base = p.shape === 'cylinder' || p.shape === 'cone' ? ht / 2 : p.shape === 'sphere' ? 0 : 0;
    const grow = dropGrow(f, p.at);
    // The triangle hangs on the right wall: it folds away with it in the turn.
    const k = grow * (p.id === 'triangle' ? Math.min(1, wallStand('right', f) / Math.max(1e-3, wallStand('right', p.at + 14))) : 1);
    return {
      id: p.id,
      shape: p.shape,
      pos: pt(add(p.pos, [0, 1, 0], h + base + bounce), f),
      size: [w, ht, d],
      rot: [yawOf(f, p.id === 'squiggle' ? 0 : p.id === 'triangle' ? 0 : 30), 0, 0],
      ink: p.ink,
      laminate: p.laminate,
      infect: null,
      scale: [k * (1 + sq), k * (1 - sq), k * (1 + sq)],
      alpha: k > 0.01 ? 1 : 0,
      pass: 'object',
    } satisfies Solid;
  });
}

/** The walls at f (the room pass): standing by the cutaway, folding outward about their base edge. */
function walls(f: number): Solid[] {
  return WALLS.map((w) => {
    const stand = wallStand(w.id, f);
    const n = turned(w.n, f);
    // The wall's base edge runs along the room's side; it hinges outward (away from the centre) as it folds.
    const edge: M3 = [-n[0] * ROOM.half, 0, -n[2] * ROOM.half];
    const fold = (1 - stand) * (Math.PI / 2);
    const up: M3 = [-n[0] * Math.sin(fold), Math.cos(fold), -n[2] * Math.sin(fold)];
    const pos = add(edge, up, ROOM.height / 2);
    const yaw = Math.atan2(n[0], n[2]);
    return {
      id: w.id,
      shape: 'box',
      pos,
      size: [2 * ROOM.half + 40, ROOM.height, 20],
      rot: [yaw, -fold, 0],
      ink: w.ink,
      laminate: w.laminate,
      infect: null,
      scale: [1, 1, 1],
      alpha: stand > 0.002 ? 1 : 0,
      pass: 'room',
    } satisfies Solid;
  });
}

/** The arcade's pieces flying into the totem (14.1 → their ring's 16th), spinning and shrinking into it. */
export function pieceSolids(f: number): Solid[] {
  const c = memphisCam(MEM.from);
  const b = basis(c.pitch, c.yaw);
  return PIECES.map((p) => {
    const start = add(unproject(c, p.screen[0], p.screen[1], b.back, dot(b.back, c.target) - 300), [0, 0, 0]);
    const slab = STACK[Math.min(STACK.length - 1, p.ring)];
    const home: M3 = add([0, slab.y0 + slab.size[1] / 2, 0], b.back, -80);
    // Their flight, eased (sucked in steadily, not rushed into the last frames: a rush smeared the dark ones across the white floor).
    const k = p.ring === 0 ? 0 : flow(clamp((f - MEM.from) / (p.arrive - MEM.from)));
    const gone = p.ring === 0 ? clamp((f - MEM.from) / 4) : clamp((f - p.arrive) / 2);
    // Shrinking as they fly, most of it at once (a fifth of their size by the middle of the flight, nothing on arrival): the dark ones
    // crossing the white floor under him dimmed the bottom of the frame for a frame or two (1252–1253), a flash pair in the 3 × 3 test
    // (the integrator, 2026-10-02) and, rushed in and shrinking to 10 %, still one in the strict 6 × 6 test (R10).
    const s = (1 - k ** 0.3) * (1 - gone);
    const spin = (p.id % 2 ? 1 : -1) * 2.4 * k;
    return {
      id: `piece${p.id}`,
      shape: p.shape,
      pos: lerp3(start, home, k),
      size: p.shape === 'squiggle' ? [150, 30, 16] : p.shape === 'arch' ? [120, 90, 50] : [100, 100, 100],
      rot: [c.yaw + spin + p.id, 0.4 * spin, 0],
      ink: p.ink,
      laminate: 'solid',
      infect: null,
      scale: [s, s, s],
      alpha: s > 0.01 ? 1 : 0,
      pass: 'object',
    } satisfies Solid;
  });
}

export type MemphisFrame = {
  cam: MemphisCam;
  floor: { ink: RGB; tile: number; laminate: number; straight: number; tileAlpha: number };
  solids: Solid[];
  hero: ReturnType<typeof heroBlock> & { alpha: number };
  disc: { pos: V3; yaw: number; alpha: number };
  /** The palette's cooling to Aicher's (0–1) and the set's presence. */
  cool: number;
  alpha: number;
  straight: number;
};

/** The bar at instant f. */
export function memphisFrame(f: number): MemphisFrame {
  const cam = memphisCam(f);
  const cool = coolAt(f);
  const alpha = setAlpha(f);
  return {
    cam,
    floor: { ink: inkAt('white', cool), tile: 160, laminate: laminateFront(f), straight: straightAt(f), tileAlpha: 1 - smoothstep(CRANE_UP.from + 6, WALLS_AWAY, f) },
    solids: [...walls(f), ...totem(f), ...panels(f), ...props(f), ...(f < SLABS[3] + 3 ? pieceSolids(f) : [])],
    hero: { ...heroBlock(f), alpha },
    disc: { pos: pt(DISC.pos, f), yaw: yawOf(f, 90), alpha: wallStand('left', f) },
    cool,
    alpha,
    straight: straightAt(f),
  };
}

/** A Memphis ink at f, cooled toward Aicher's by `cool` (0–1), linear. */
export const inkAt = (name: InkName, cool: number): RGB => (cool <= 0 ? linear(INKS[name]) : cool >= 1 ? linear(AICHER[name]) : mixRGB(linear(INKS[name]), linear(AICHER[name]), cool));

// ——— Contract §6.3: 1343 → 1344 ——————————————————————————————————————————————————————————————————————————————————————————————

/** His face as the pictograms' head disc on 15.1 − 1: centre and width on screen (src/shots/drop2Picto.ts HEAD_AT, FIG.head). */
export function totemFaceAt(f: number): { centre: [number, number]; width: number; face: number } {
  const c = memphisCam(f);
  return { centre: project(c, heroBlock(f).face), width: BLOCK.w * c.zoom, face: FACE.width * c.zoom };
}

// ——— The grid snap's flat layers (14.4& → 15.1 − 1): the pictograms' own sheet, revealed click by click ———————————————————————————

/** A capsule grown to g of its length about its centre (a line drawing on from the middle outward). */
export function growFromCentre(s: Shape, g: number): Shape {
  if (s.kind !== 'segment') return { ...s, alpha: (s.alpha ?? 1) * g };
  return { ...s, w: s.h + (s.w - s.h) * g };
}
/** A capsule grown to g of its length from its first end (a limb unfolding from its joint). */
export function growFromStart(s: Shape, g: number): Shape {
  if (s.kind !== 'segment') return { ...s, w: s.w * g, h: s.h * g };
  const len = s.w - s.h;
  const r = s.rot ?? 0;
  const [ax, ay] = [s.x - (len / 2) * Math.cos(r), s.y - (len / 2) * Math.sin(r)];
  return { ...s, x: ax + ((g * len) / 2) * Math.cos(r), y: ay + ((g * len) / 2) * Math.sin(r), w: g * len + s.h };
}
const fade = (gs: readonly Glyph[], a: number): Glyph[] => gs.map((g) => ({ ...g, alpha: (g.alpha ?? 1) * a }));
/**
 * The pictograms' sheet as the grid snap draws it at f (src/shots/drop2Picto.ts trackLayers, its world already streaming): under the set
 * (the 90° lines on the first click, the 45° lines on the second, the lanes, the start line and the bytes on the last) and over it (the
 * red athlete and his strokes, his face block become the head disc). The last click is 15.1 itself: from its instant (SWAP_LEAD early) the
 * whole sheet is in at once, with its landing (trackLayers: the lines settle, the figures stomp), and the set is gone — the frames under the
 * sub-frames this part still draws of 15.1 match the pictograms' own first frame.
 */
export function snapOverlay(f: number, L: PictoLayout): { under: FlatContent; over: FlatContent } | null {
  if (f < CLICKS.lines90 - 3) return null;
  const G = trackLayers(f, L);
  const g90 = clickAt(f, CLICKS.lines90);
  const g45 = clickAt(f, CLICKS.lines45);
  const gs = sheetIn(f) ? 1 : 0;
  // The construction lines are drawn in #111 on the white floor and turn white as the palette cools (they are the pictograms' white grid).
  const ink = mixRGB(linear('#111111'), [1, 1, 1], coolAt(f));
  const pen = (s: Shape): Shape => ({ ...s, color: ink });
  const under: Shape[] = [...G.grid90.shapes.map((s) => pen(growFromCentre(s, g90))), ...G.grid45.shapes.map((s) => pen(growFromCentre(s, g45)))];
  const over: Shape[] = [];
  const rounded: Glyph[] = [];
  if (gs > 0) {
    // The snap: the lanes, the start line and its bytes, the red athlete and him, whole and landing (their stomp, the lines' settle) —
    // his face block is the head disc from this instant, as the pictograms draw it.
    under.push(...G.lanes.shapes, ...G.start.shapes);
    over.push(...G.red.shapes, ...G.hero.shapes);
    rounded.push(...G.red.rounded, ...G.hero.rounded);
  }
  return {
    under: { under, glyphs: { display: fade(G.start.display, gs) }, over: [] },
    over: { under: over, glyphs: { rounded }, over: [] },
  };
}
/** The pictograms' head on 15.1 (their HEAD_AT and FIG.head): the grid snap lands his face block on it. */
export const PICTO_HEAD = { centre: HEAD_AT, width: FIG.head, face: FIG.face } as const;

// ——— Photography ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Sub-frames (shutter 0.5): 32 on the landing, the panels' slams, the turn and the crane with its snap; 16 elsewhere. */
export function memphisTemporal(f: number): Temporal {
  const T = (samples: number): Temporal => ({ samples, shutter: 0.5, persistence: 0 });
  if (f < MEM.from + 8) return T(32);
  if (PANELS.some((p) => f >= p - 9 && f < p + 3)) return T(32);
  if (f >= SET_ROTATE.from - 4 && f < SET_ROTATE.to + 4) return T(32);
  if (f >= CRANE_UP.from) return T(32);
  return T(16);
}
export const memphisSegment = (f: number): Segment => drop2Segment(f);
/** Flat print: no bloom, a whisper of grain (easing to the pictograms' 0.03 as the palette cools: their first frame's look), no vignette. */
export function memphisLook(f: number): Look {
  return { toneMapping: 'linear', exposure: 1, bloom: { intensity: 0, threshold: 1, smoothing: 0.1, radius: 0.7 }, aberration: 0, grain: lerp(0.025, 0.03, coolAt(f)), vignette: 0 };
}

/** The drums the picture moves on (tests): the kicks of bar 14. */
export const DRUMS = { kicks: KICKS2.filter((k) => k >= MEM.from && k < MEM.to) } as const;
/** His face (the cast's: no new face). */
export const FACE_TEXT = HERO2.base;
/** The beat (frames). */
export const MEM_BEAT = BEAT;

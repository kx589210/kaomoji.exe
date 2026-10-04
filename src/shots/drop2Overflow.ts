// S31 OVERFLOW, drop2 6.4&–8.1 (builder G · GAME; build sheet notes/bid2/drop2-sheet2.md §3 bar 7, §1.3 F; as built:
// notes/d2build/sheet.md §5.8): the party monitor is the whole screen and he surfs its memory gauge past every programmer's limit —
// 256 (a byte + 1), 65,536, 16,777,216, 2,147,483,647 — climbing by powers of two on the 16ths, until +1 wraps the integer to
// −2,147,483,648 = 0x80000000, the first address of kernel space, and flings him there. The box frame cracks on the clap, bows like rubber
// when the fill hits the wall, snaps and flies; the camera trucks after him and whip-pans left into the kernel (Drop2Kernel, drop2 8:
// wrapAt is its contract). KEEP-FIRST: everything to drop2 7.4& − 1 is as built; the pan's last 12 frames are the logged change F. Pure: every position is in world layout px (origin at the top left of S30's page,
// x right, y down; the monitor's frame sits 1300 px below the page: MON.y0) and converted to the flat world (centre origin, y up) only
// where content is built. formatFriends and RAMP come from shots/hud.ts read-only (R13).
import { KERNEL_TEXT, MONITOR2 } from '../content/drop2.ts';
import { S31_GAUGE } from '../content/castDrop2.ts';
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Advance } from '../engine/typeset.ts';
import type { Look } from '../engine/types.ts';
import { BOW, CRACK, FRIENDS_ROLLS, HATS2, PAN, SNAP, SURF, TILT, WRAP } from '../score/drop2.ts';
import { seedFrame } from '../score/film.ts';
import { PALETTE, terminalLook } from '../worlds/terminal.ts';
import { LAW, PALETTES, flow, impact, impactSquash, springL, whipSlam } from './drop2Shared.ts';
import { RAMP, formatFriends, meter } from './hud.ts';

/** Advances (ems) of the atlases the monitor draws with: JetBrains Mono, the dizzy faces (Noto Sans JP, whole faces), the hero (M PLUS Rounded). */
export type OverflowLayout = { mono: Advance; jp: Advance; rounded: Advance };

/** The full-screen monitor (sheet §5.8), in layout px inside its frame (add y0 for the world). */
export const MON = {
  /** The monitor's frame sits this far below S30's page (world layout px). */
  y0: 1300,
  left: 67,
  top: 64,
  cellW: 28.8,
  cellH: 56,
  cols: 62,
  rows: 17,
  fontPx: 48,
  /** The gauge: cells 40 × 168 from x 96 (rows 7–9), up to the wall. */
  gauge: { x0: 96, cell: 40, top: 456, height: 168 },
  /** The wall: the left edge of column 61. */
  wall: 1824,
  /**
   * The memory odometer: double-size digits (57.6 × 112), right-aligned at x 1795, on rows 1–2 (the sheet put it on rows 4–5, the height
   * he surfs at, so from 65,536 on his face would sit on the number: moved up, a scoreboard over the gauge).
   */
  odometer: { right: 1795, w: 57.6, h: 112, top: 120 },
  /** His feet on the gauge top: his centre at y 381, x = front − 110; the face (•ω•) 420 px wide. */
  hero: { width: 420, centreY: 381, behind: 110 },
  /** The box frame is dim text at 55 %. */
  dim: 0.55,
} as const;

/** The centre of monitor cell (col, row) in world layout px. */
export const cellAt = (col: number, row: number): [number, number] => [MON.left + (col + 0.5) * MON.cellW, MON.y0 + MON.top + (row + 0.5) * MON.cellH];
/** World layout px → the flat world (origin at the page's centre, y up). */
const ex = (x: number): number => x - 960;
const ey = (y: number): number => 540 - y;
/** Discrete changes on a drum are taken at the output frame. */
const frameOf = (f: number): number => Math.floor(f + 0.5);

const T = PALETTE;
const INK = {
  dim: linear(T.text, MON.dim),
  text: linear(T.text, 1.3),
  green: linear(T.green, 1.5),
  fill: linear(T.green, 1.1),
  amber: linear(T.amber, 1.6),
  pink: linear(T.pink, 1.7),
  ground: linear(T.bg),
  hero: linear(PALETTES.neon.amber, 1.7),
} as const;

// ——— The numbers ———————————————————————————————————————————————————————————————————————————————————————————————————————

/** The landmarks on the kicks (sheet §5.8) and the powers of two the 16ths climb through between them. */
const MEMORY_STEPS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  const climb = (from: number, a: number, b: number) => {
    // From 2^a on the kick, three 16ths later 2^(a + k·(b − a)/4)… landing on 2^b (or INT_MAX) on the next kick.
    for (let k = 0; k < 4; k++) out.push([from + 6 * k, 2 ** Math.round(a + (k * (b - a)) / 4)]);
  };
  climb(SURF[0], 8, 16);
  climb(SURF[1], 16, 24);
  climb(SURF[2], 24, 31);
  out.push([SURF[3], 2147483647], [WRAP, -2147483648]);
  return out;
})();

/** Memory % at output frame `f`: 255 (the FULL COMBO's 0xFF) until the payout, the landmarks on the kicks, the wrap on drop2 6.4&. */
export function memoryAt(f: number): number {
  const d = frameOf(f);
  let v = 255;
  for (const [at, value] of MEMORY_STEPS) if (at <= d) v = value;
  return v;
}
/** The memory as the odometer prints it: hud.ts's commas. */
export const memoryText = (f: number): string => formatFriends(memoryAt(f));
/** −2,147,483,648 is 0x80000000, the first address of kernel space: the odometer rolls over to it a 16th after the wrap, inside the pan's blur. */
export const HEX_AT = WRAP + 6;
export const KERNEL_HEX = KERNEL_TEXT.base;
/** The frame the odometer last changed at (or −∞). */
const memoryChange = (f: number): number => {
  const d = frameOf(f);
  let at = -Infinity;
  for (const [s] of MEMORY_STEPS) if (s <= d) at = s;
  return at;
};

/** Friends online: ∞, then ∞+1, ∞×2, ∞^∞ and NaN on the rolls. */
export function friendsAt(f: number): string {
  const k = FRIENDS_ROLLS.filter((r) => r <= frameOf(f)).length;
  return MONITOR2.friends[k];
}
/** Hype: ∞ until the wrap, then ERR. */
export const hypeAt = (f: number): string => MONITOR2.hype[frameOf(f) >= WRAP ? 1 : 0];

// ——— The fill front, the bow, the hero, the camera ——————————————————————————————————————————————————————————————————————

/** A quick launch to +1 on each of these 16ths after the surge (the front gains 40 px a 16th). */
const STEPS_40 = [SURF[1] + 6, SURF[1] + 12, SURF[1] + 18] as const;
/** Before the surge the fill creeps 16 px on each 16th of drop2 6.1, as the odometer doubles (R1: a living hold, not a still one). */
const CREEP = [SURF[0] + 6, SURF[0] + 12, SURF[0] + 18] as const;
const CREEP_PX = 16;
/** Where the front stands before it hits the wall (sheet's table: 1300 + 3 × 40). */
const BEFORE_WALL = 1300 + 40 * STEPS_40.length;
/** The gush after the snap: from 1984, 26 px/f and accelerating. */
const gush = (f: number): number => {
  const t = f - SNAP;
  return 1984 + 26 * t * (1 + t / 12);
};

/** The bow's amplitude (px at the gauge row): 0 → 190 on drop2 6.3 + 3 → 160 by + 9 (a spring, ζ 0.47), trembling ±3 px on + 6 and + 9. */
export function bowAmplitude(f: number): number {
  const t = f - BOW;
  if (t <= 0) return 0;
  const zeta = 0.47;
  const wd = Math.PI / 3;
  const wn = wd / Math.sqrt(1 - zeta * zeta);
  const k = zeta * wn;
  const spring = 1 - Math.exp(-k * t) * (Math.cos(wd * t) + (k / wd) * Math.sin(wd * t));
  const tremble = (at: number) => (f > at ? 3 * Math.sin(Math.PI * (f - at)) * Math.exp(-(f - at) / 2) : 0);
  return 160 * spring + tremble(BOW + 6) + tremble(BOW + 9);
}

/** How a bowed wall glyph leans so the rows join into one curve: atan of the bow's slope at `row` (counter-clockwise positive, the flat world's convention: the upper half leans out at its foot, the lower half at its head). */
export function wallLean(row: number, f: number): number {
  if (Math.abs(row - 8) > 6) return 0;
  const slope = (-bowAmplitude(f) * (Math.PI / 12) * Math.sin((Math.PI * (row - 8)) / 6)) / MON.cellH;
  return Math.atan(slope);
}

/** How far wall row `row` bows out at `f`: A·cos²(π(r − 8)/12) for rows 2–14, nothing at the corners' rows. */
export function wallDx(row: number, f: number): number {
  if (Math.abs(row - 8) > 6) return 0;
  const c = Math.cos((Math.PI * (row - 8)) / 12);
  return bowAmplitude(f) * c * c;
}

/** The fill front (world x) at `f`: 560 as the monitor enters view, 700 on the payout, the surge to 1300, +40 a 16th, the wall on drop2 6.3, the bow, the gush after the snap, yanked back 1800 px by the wrap. */
export function frontAt(f: number): number {
  let x: number;
  if (f < SNAP) {
    const creep = CREEP.reduce((s, at) => s + CREEP_PX * springL(f, at, 0.75), 0);
    const surge = (600 - CREEP_PX * CREEP.length) * springL(f, SURF[1]);
    x = 560 + 140 * impact(f, SURF[0], 12) + creep + surge + STEPS_40.reduce((s, at) => s + 40 * springL(f, at, 0.75), 0) + (MON.wall - BEFORE_WALL) * impact(f, BOW, 6);
    if (f >= BOW) x = MON.wall + bowAmplitude(f);
  } else x = gush(f);
  return x - 1800 * springL(f, WRAP);
}

/**
 * `width` is the (•ω•) core's advance (M PLUS Rounded's brackets sit inside it: ink ≈ 0.955 × advance, S27_MASTER's 1184 / 1240);
 * `arms` how much of his arms (ᕕ ᕗ) is drawn (1 riding; they fade inside the fling's blur, so he lands in the kernel as (•ω•));
 * `tube` how far he is a neon tube (0 since the pan lands in the kernel, not on the reel's neon card: kept for the scene's tube path);
 * `level` how lit; `face` the face that dominates.
 */
export type Surfer = { face: string; x: number; y: number; width: number; rot: number; sx: number; sy: number; tube: number; level: number; arms: number };
/** The surfer's faces: the amber fill with its arms, and the core he lands as. */
export const SURF_FACE = 'ᕕ(•ω•)ᕗ';
export const TUBE_FACE = '(•ω•)';
/**
 * Where the whip-pan lands him (sheet §1.3 F, §6.3: the kernel's first frame, HANDOFFS): (960, 640) on screen, 600 px of
 * bracket-to-bracket ink — the advance below. The kernel catches him there with its landing squash (1.08 / 0.92).
 */
export const KERNEL_LANDING = { x: 960, y: 640, ink: 600 } as const;
export const KERNEL_ADVANCE = KERNEL_LANDING.ink / 0.955;
/** (As built: the reel locked him at the same 600 px of ink.) */
export const REEL_ADVANCE = KERNEL_ADVANCE;

/** Where the wrap flings him from (screen) and where he lands (screen, H4). */
const FLING_FROM = (): [number, number] => {
  const s = surferRide(WRAP - 1);
  return [s.x - camFollow(WRAP - 1) + 960, s.y - MON.y0];
};
/**
 * A whip's progress (the tilt into drop2 7.1, the pan into drop2 8.1): a slam (iteration 2, the director's ruling 7) — still on `from`, easing in
 * to land exactly on `to` at its fastest, so the biggest change is the downbeat's (drop2Shared whipSlam); `bounce` adds its recoil. It
 * was a launch (75 % by + 3) whose biggest change fell on the open hat 200 ms before the heavy kick.
 */
export const whip = (f: number, from: number, to: number, bounce = 0): number => whipSlam(f, from, to, bounce, WHIP_POWER);
/**
 * The camera whips' ease-in (u^7): the frame changes world over the move's last 15–35 % (the page leaves the frame at 83 % of the tilt;
 * the pan's black and the kernel arrive in its last fifth), so a steep ease puts that change on the landing frame, not the one before.
 */
export const WHIP_POWER = 7;

/**
 * Him riding the gauge (no fling): 110 px behind the front until the snap, then out with the gush; bobbing, and pumping on every 16th
 * from the payout (y 0.95 ↔ 1.05, squashed on the 16th: R1, the surf is a living hold), the pump fading in over the payout's 16th.
 */
function surferRide(f: number): Surfer {
  const x = f < SNAP ? frontAt(f) - MON.hero.behind : 1874 + 26 * (f - SNAP);
  const land = impactSquash(f, SURF[0]) + impactSquash(f, SURF[1]) * 0.6 + impactSquash(f, BOW);
  const pump = f >= SURF[0] ? 0.05 * clamp((f - SURF[0]) / 6) * Math.cos((2 * Math.PI * (f - SURF[0])) / 6) : 0;
  const bob = 6 * Math.sin((2 * Math.PI * (f - SURF[0])) / 12);
  const sy = 1 - land - pump;
  const sx = 1 + land + pump * 0.5;
  // His feet stay on the gauge: the squash pulls his centre down by half the height it loses.
  const y = MON.y0 + MON.hero.centreY + bob + 150 * (1 - sy);
  const lean = -0.1 - 0.05 * Math.sin((2 * Math.PI * (f - SURF[0])) / 24);
  return { face: SURF_FACE, x, y, width: MON.hero.width, rot: lean, sx, sy, tube: 0, level: 1, arms: 1 };
}

/**
 * The fling's change of look (R1-05): his arms fade out over these 2 frames, where his spin is already fast (iteration 2: it speeds up
 * into the landing, FLING_EASE), so they go inside the blur instead of vanishing mid-turn. (As built he turned into the reel card's neon
 * tube here; the pan now lands in the kernel, where he is his amber self.)
 */
export const TUBE_SWAP = { from: WRAP + 6.5, to: WRAP + 8.5 } as const;
/**
 * The fling's ease (iteration 2, the director's ruling 7): he flies faster and faster (s^1.5) and stops dead on drop2 8.1, upright in the
 * kernel, with the pan's slam — the landing is his fastest frame.
 */
const FLING_EASE = 1.5;

/**
 * The surfer at `f` (world layout px): riding, then flung by the wrap one turn counter-clockwise on a ballistic arc to the kernel's
 * landing spot (KERNEL_LANDING: 600 px of ink at (960, 640) on screen), faster and faster into the landing (FLING_EASE), his arms fading
 * inside the spin's blur. The landing's height (100 px below the as-built card's centre) eases in from the wrap, so drop2 7.4& − 1 is
 * as built.
 */
export function surfer(f: number): Surfer {
  if (f < WRAP - 1) return surferRide(f);
  const s = clamp((f - (WRAP - 1)) / (PAN.to - WRAP + 1));
  const e = s ** FLING_EASE;
  const [x0, y0] = FLING_FROM();
  const ty = f < WRAP ? 540 : lerp(540, KERNEL_LANDING.y, flow((f - WRAP) / (PAN.to - WRAP)));
  const sx = lerp(x0, KERNEL_LANDING.x, e);
  const sy = lerp(y0, ty, e) - 4 * 80 * s * (1 - s);
  const arms = 1 - smoothstep(TUBE_SWAP.from, TUBE_SWAP.to, f);
  const ride = surferRide(WRAP - 1);
  return {
    face: arms <= 1e-6 ? TUBE_FACE : SURF_FACE,
    x: overflowCamX(f) + sx - 960,
    y: MON.y0 + sy,
    width: lerp(MON.hero.width, KERNEL_ADVANCE, e),
    rot: lerp(ride.rot, 2 * Math.PI, e),
    sx: 1,
    sy: 1,
    tube: 0,
    level: 1,
    arms,
  };
}

/**
 * The contract the kernel reads (sheet §6.3: `wrapAt(671)` → Drop2Kernel): his pose on screen at instant `f` of the fling — face, centre
 * (layout px), advance and ink width, rotation (screen, radians, counter-clockwise; 2π = upright, one turn), how much of his arms is drawn
 * — and the fling's velocity there (px a frame, radians a frame), measured over ±¼ frame. At drop2 8.1 − 1 he is a frame out from the
 * landing, at his fastest; on drop2 8.1 he is at KERNEL_LANDING.
 */
export type Wrap = { face: string; x: number; y: number; width: number; ink: number; rot: number; arms: number; vx: number; vy: number; spin: number; grow: number };
export function wrapAt(f: number): Wrap {
  const at = (g: number) => {
    const s = surfer(g);
    return { x: s.x - overflowCamX(g) + 960, y: s.y - MON.y0, rot: s.rot, width: s.width, s };
  };
  const a = at(f - 0.25);
  const b = at(Math.min(f + 0.25, PAN.to));
  const h = Math.min(f + 0.25, PAN.to) - (f - 0.25);
  const n = at(f);
  return { face: n.s.face, x: n.x, y: n.y, width: n.width, ink: 0.955 * n.width, rot: n.rot, arms: n.s.arms, vx: (b.x - a.x) / h, vy: (b.y - a.y) / h, spin: (b.rot - a.rot) / h, grow: (b.width - a.width) / h };
}

/** The camera’s right-most C.x while he surfs: the odometer’s longest value (from x 989) stays in frame, 29 px in (the CRT’s curvature eats the corners). */
const MAX_CAM_X = 1920;
/**
 * Critically damped (τ 4 f), the camera trucks after him, sampled every quarter frame from the payout: it aims 4 frames ahead of him
 * (so the wall's bow on drop2 6.3 is framed, not chased) at his x − 300 (− 240 plus the follow's lag once he rides the gush at 26 px/f), never
 * left of the page's 960 and never so far right that INT_MAX (from x 989) leaves the frame.
 */
const FOLLOW = (() => {
  const dt = 0.25;
  const w = 1 / 4;
  const xs: number[] = [];
  let x = 960;
  let v = 0;
  for (let f = SURF[0]; f <= WRAP; f += dt) {
    xs.push(x);
    const lead = f >= SNAP ? 8 * 26 - 60 : 0;
    const target = Math.min(MAX_CAM_X, Math.max(960, surferRide(f + 4).x - 300 + lead));
    v += dt * (w * w * (target - x) - 2 * w * v);
    x += dt * v;
  }
  return { xs, dt };
})();
const camFollow = (f: number): number => {
  if (f <= SURF[0]) return 960;
  const i = (f - SURF[0]) / FOLLOW.dt;
  const k = Math.min(FOLLOW.xs.length - 2, Math.floor(i));
  return lerp(FOLLOW.xs[k], FOLLOW.xs[k + 1], i - k);
};

/** The camera's C.x (world layout px): 960 through S30 and the tilt; trucking after him from the payout; the whip-pan left onto the cards (−2400) over drop2 6.4& → 7.1, slammed onto the downbeat. */
export function overflowCamX(f: number): number {
  if (f < WRAP - 1) return camFollow(f);
  return lerp(camFollow(WRAP - 1), -2400, whip(f, WRAP, PAN.to));
}

// ——— The box ———————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The crack in the top border (row 0): from the clap a 3-cell gap (columns 40–42) between ╪ and ╬, widening a cell a 16th to 6. */
export function crackAt(f: number): { gap: [number, number] } | null {
  const d = frameOf(f);
  if (d < CRACK) return null;
  const k = Math.min(3, Math.floor((d - CRACK) / 6));
  return { gap: [40 - Math.floor(k / 2), 42 + Math.ceil(k / 2)] };
}

export type Piece = { ch: string; x: number; y: number; rot: number };

/** The pieces the snap throws, in their state at the snap: the bowed ║ of rows 1–15, ╗, ╝, and the last 6 cells of rows 0 and 16. */
const PIECES: readonly Piece[] = [
  ...Array.from({ length: 15 }, (_, i) => ({ ch: '║', x: cellAt(61, i + 1)[0] + wallDx(i + 1, SNAP - 1), y: cellAt(61, i + 1)[1], rot: wallLean(i + 1, SNAP - 1) })),
  { ch: '╗', x: cellAt(61, 0)[0], y: cellAt(61, 0)[1], rot: 0 },
  { ch: '╝', x: cellAt(61, 16)[0], y: cellAt(61, 16)[1], rot: 0 },
  ...[0, 16].flatMap((row) => Array.from({ length: 6 }, (_, i) => ({ ch: '═', x: cellAt(55 + i, row)[0], y: cellAt(55 + i, row)[1], rot: 0 }))),
];

/**
 * The snap is launched one frame before its 16th (L keyed on drop2 6.3& − 1, like every launch here), so on drop2 6.3& itself the column is
 * already bursting rather than standing intact under the OH, the twang and the sparks (R1).
 */
export const SNAP_LAUNCH = SNAP - 1;
/**
 * The snap's flying pieces at `f`: each burst out of the bow (a 40–70 px kick over the first two frames, fanned up and down away from
 * the gauge row), then flung right at 30–50 px/f, up or down by up to 12 px/f, falling (1.2 px/f²), spinning 8–20°/f.
 */
export function snapPieces(f: number): Piece[] {
  const t = f - SNAP_LAUNCH;
  if (t < 0) return [];
  const kick = 1 - Math.exp(-t / 0.9);
  return PIECES.map((p, i) => {
    const vx = 30 + 20 * hash(i, 4301);
    const vy = -12 + 24 * hash(i, 4302);
    const spin = (hash(i, 4303) < 0.5 ? -1 : 1) * ((8 + 12 * hash(i, 4304)) * Math.PI) / 180;
    const fan = clamp((p.y - (MON.y0 + MON.top + 8.5 * MON.cellH)) / (8 * MON.cellH), -1, 1);
    return { ch: p.ch, x: p.x + vx * t + (40 + 30 * hash(i, 4305)) * kick, y: p.y + vy * t + 0.6 * t * t + 70 * fan * kick, rot: p.rot + spin * t + 0.6 * spin * 3 * kick };
  });
}

/** The snap's three sparks (with the twang's 3 sparks): white-hot heads off the bulge's middle rows, each trailing a short green streak, gone by + 8. */
export type Spark = { x: number; y: number; dx: number; dy: number; level: number };
export function snapSparks(f: number): Spark[] {
  const t = f - SNAP_LAUNCH;
  if (t < 0 || t >= 8) return [];
  return [0, 1, 2].map((k) => {
    const ang = (-0.55 + 0.55 * k + 0.25 * (hash(k, 4306) - 0.5)) * 1.2;
    const v = 55 + 25 * hash(k, 4307);
    const [x0, y0] = cellAt(61, 6 + 2 * k);
    const d = v * t * (1 - t / 20);
    return { x: x0 + wallDx(6 + 2 * k, SNAP_LAUNCH) + Math.cos(ang) * d, y: y0 - Math.sin(ang) * d, dx: Math.cos(ang), dy: -Math.sin(ang), level: (1 - t / 8) ** 1.5 };
  });
}

export type Warning = { text: string; row: number; color: RGB; count: number; blink: boolean };
const WARNING_LIST: readonly { from: number; text: string; color: RGB; blink?: boolean }[] = [
  { from: TILT.from, text: MONITOR2.w4[1], color: INK.green },
  { from: SURF[1], text: MONITOR2.overflow[0], color: INK.pink },
  { from: SURF[3], text: MONITOR2.overflow[1], color: INK.pink, blink: true },
  { from: WRAP, text: MONITOR2.overflow[2], color: INK.pink },
];
/** The warning rows (13–15) at `f`, oldest first, the newest on row 15; each types in over 8 f. The W4 line carries over from the corner monitor. */
export function warningsAt(f: number): Warning[] {
  const d = frameOf(f);
  const on = WARNING_LIST.filter((w) => w.from <= d).slice(-3);
  return on.map((w, i) => ({ text: w.text, row: 15 - (on.length - 1 - i), color: w.color, count: Math.ceil(clamp((d - w.from + 1) / 8) * [...w.text].length), blink: !!w.blink }));
}

// ——— Content ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Every string the monitor draws, per atlas: the box and its rows (mono), the dizzy faces (whole, jp), the hero (rounded). */
export const OVERFLOW_STRINGS = {
  mono: [...new Set([...MONITOR2.title, ...MONITOR2.boxGlyphs, ...'═║', ...MONITOR2.rows.join(''), ...MONITOR2.friends.join(''), ...MONITOR2.memory.join(''), ...MONITOR2.hype.join(''), ...[MONITOR2.w4[1], ...MONITOR2.overflow].join(''), ...RAMP, ...'0123456789,-%@', ...KERNEL_HEX])].filter((c) => c.trim() !== ''),
  jp: S31_GAUGE.map((c) => c.face),
  rounded: [...new Set([...SURF_FACE])].filter((c) => c.trim() !== ''),
} as const;

const glyph = (ch: string, x: number, y: number, size: number, color: RGB, o: Partial<Glyph> = {}): Glyph => ({ ch, x: ex(x), y: ey(y), size, color, ...o });

/** A line of mono text from cell (col, row), the first `count` characters. */
function line(out: Glyph[], text: string, col: number, row: number, color: RGB, count = Infinity, alpha = 1): void {
  [...text].slice(0, count).forEach((ch, i) => {
    if (ch.trim() === '') return;
    const [x, y] = cellAt(col + i, row);
    out.push(glyph(ch, x, y, MON.fontPx, color, { alpha }));
  });
}

/**
 * INT_MAX's slam on drop2 6.4 (R1): the digits land squashed (1.16 wide, 0.84 tall, on the cell's floor) and spring back over 3 frames, with
 * a flare (×2.6, bloom) dying over 9.
 */
export function intMaxSlam(f: number): { sx: number; sy: number; flare: number } {
  const t = f - SURF[3];
  if (t < -0.5) return { sx: 1, sy: 1, flare: 1 };
  const u = Math.max(0, t);
  const squash = 0.16 * Math.exp(-u / 1.1) * Math.cos(u * 0.9);
  return { sx: 1 + squash, sy: 1 - squash, flare: 1 + 1.6 * Math.exp(-u / 3) };
}

/**
 * The odometer's glyphs at `f`: double size, right-aligned at x 1795 with a %. A changed digit rolls on a drum inside its cell window
 * (R1-10): on the 16th the old digit is squeezed into the top half of the window and the new one fills the bottom half (a half-turn,
 * darker as it turns away), the frame after the new one is whole — they share the window and never overprint. New leading digits pop in; INT_MAX slams in squashed and
 * flaring, then pulses on the 16ths; the wrap's minus drops in from above.
 */
export function odometerGlyphs(f: number): Glyph[] {
  const out: Glyph[] = [];
  // A 16th after the wrap its last digits roll over to the address the wrap really is: 0x80000000, kernel space (sheet §1.3 F).
  const hex = frameOf(f) >= HEX_AT;
  const now = hex ? KERNEL_HEX : `${memoryText(f)}%`;
  const at = hex ? HEX_AT : memoryChange(f);
  const before = hex ? `${formatFriends(memoryAt(WRAP))}%` : Number.isFinite(at) ? `${formatFriends(memoryAt(at - 1))}%` : now;
  // The drum clicks a half-turn per output frame, like a split flap: half old, half new on the 16th, the new value whole the frame after.
  // Taken at the output frame, so no sub-frame smears the click.
  const roll = Number.isFinite(at) ? clamp((frameOf(f) - at + 1) / 2) : 1;
  const value = memoryAt(f);
  const colour = value >= 0 && value < 65536 ? INK.amber : INK.pink;
  const pulse = value === 2147483647 ? 0.55 + 0.45 * Math.cos((2 * Math.PI * (f - SURF[3])) / 6) : 1;
  const o = MON.odometer;
  const cy = MON.y0 + o.top + o.h / 2;
  const size = MON.fontPx * 2;
  const n = [...now];
  const b = [...before];
  // INT_MAX slams instead of rolling.
  const slam = value === 2147483647 ? intMaxSlam(f) : null;
  if (slam) {
    // Squashed about the number's left edge (its leading 2 stays in frame; the wall it widens toward has flown).
    const ink = scaleRGB(colour, slam.flare);
    const left = o.right - n.length * o.w;
    for (let i = 0; i < n.length; i++) {
      const x = left + (i + 0.5) * o.w * slam.sx;
      out.push(glyph(n[i], x, cy + (o.h * (1 - slam.sy)) / 2, size * slam.sy, ink, { alpha: Math.max(pulse, slam.flare - 1), stretch: slam.sx / slam.sy }));
    }
    return out;
  }
  for (let i = 0; i < n.length; i++) {
    const x = o.right - (n.length - i - 0.5) * o.w;
    const ch = n[i];
    const old = b[b.length - (n.length - i)];
    if (old === ch || roll >= 1) {
      out.push(glyph(ch, x, cy, size, colour, { alpha: pulse }));
      continue;
    }
    if (ch === '-') {
      // The minus drops in from above (an impact landing on the wrap's frame + 3).
      const drop = 1 - impact(f, WRAP + 3, 3);
      out.push(glyph(ch, x, cy - 140 * drop, size, colour, { alpha: 1 - drop * 0.6 }));
      continue;
    }
    if (old === undefined) {
      // A new leading digit pops in.
      const s = 0.6 + 0.4 * roll;
      out.push(glyph(ch, x, cy, size * s, colour, { alpha: roll * pulse }));
      continue;
    }
    // The drum: the window's height split between the leaving digit (top, squeezed toward the lid) and the arriving one (bottom).
    const kOld = 1 - roll;
    const kNew = roll;
    const top = cy - o.h / 2;
    if (kOld > 0.02) out.push(glyph(old, x, top + (kOld * o.h) / 2, size * kOld, scaleRGB(colour, 0.55 + 0.45 * kOld), { alpha: pulse, stretch: 1 / kOld }));
    if (kNew > 0.02) out.push(glyph(ch, x, top + o.h - (kNew * o.h) / 2, size * kNew, scaleRGB(colour, 0.55 + 0.45 * kNew), { alpha: pulse, stretch: 1 / kNew }));
  }
  return out;
}

/** A value that rolls in over 3 f on its change frame (old up and out, new up from below), mono, at cell (col, row). */
function rolling(out: Glyph[], f: number, text: (f: number) => string, changes: readonly number[], col: number, row: number, color: RGB): void {
  const d = frameOf(f);
  const at = changes.filter((c) => c <= d).pop();
  const p = at === undefined ? 1 : clamp((f - at + 0.5) / 3);
  const roll = 1 - (1 - p) ** 3;
  if (roll >= 1 || at === undefined) {
    line(out, text(f), col, row, color);
    return;
  }
  const shift = (g: Glyph, dy: number, a: number) => ({ ...g, y: g.y + dy, alpha: a });
  const fresh: Glyph[] = [];
  const old: Glyph[] = [];
  line(fresh, text(f), col, row, color);
  line(old, text(at - 1), col, row, color);
  for (const g of old) out.push(shift(g, roll * MON.cellH, 1 - roll));
  for (const g of fresh) out.push(shift(g, -(1 - roll) * MON.cellH, roll));
}

/** The gauge: green @ behind the front (stretched ×3 into 40 × 168 cells), the three front cells cycling the ramp on the 16ths (the leading one as full as the front is into it, hud.ts's meter), and the dizzy faces packed into the overflowing interior. */
function gauge(f: number, mono: Glyph[], faces: Glyph[], chips: Shape[], L: OverflowLayout): void {
  const g = MON.gauge;
  const front = frontAt(f);
  const cells = Math.max(0, Math.ceil((front - g.x0) / g.cell));
  const cy = MON.y0 + g.top + g.height / 2;
  const tick = Math.floor((frameOf(f) - TILT.from) / 6);
  const size = 200;
  const stretch = g.cell / (0.6 * size);
  const cycle = RAMP.slice(1);
  // The shimmer on the arp's 16ths (R1): the three front cells flare as they cycle, and a bright pulse runs back through the fill.
  const t16 = (((f - TILT.from) % 6) + 6) % 6;
  const flare = 1 + 1.4 * Math.exp(-t16 / 1.5);
  for (let i = 0; i < cells; i++) {
    const x = g.x0 + (i + 0.5) * g.cell;
    const behind = cells - 1 - i;
    let ch = '@';
    let color: RGB = scaleRGB(INK.fill, 1 + 0.5 * Math.exp(-((behind - 3 - 4 * t16) ** 2) / 4));
    if (behind === 0) {
      ch = meter((100 * (front - (g.x0 + i * g.cell))) / g.cell, 1).trim() || '.';
      color = scaleRGB(INK.text, flare);
    } else if (behind < 3) {
      ch = cycle[(tick + 3 * behind) % cycle.length];
      color = scaleRGB(INK.text, flare);
    }
    mono.push(glyph(ch, x, cy, size, color, { stretch }));
  }
  // The dizzy faces packed into the overflowing interior: three rows 38 px apart, each face green on its own dark chip, cycling a slot a
  // 16th, only where the fill is.
  const end = front - 3 * g.cell;
  const size2 = 22;
  for (let r = 0; r < 3; r++) {
    let x = g.x0 + 14 + (r % 2) * 60;
    let k = tick + 3 * r;
    while (true) {
      const face = S31_GAUGE[((k % S31_GAUGE.length) + S31_GAUGE.length) % S31_GAUGE.length].face;
      const w = L.jp(face) * size2;
      if (x + w + 8 > end) break;
      const y = cy + (r - 1) * 38;
      chips.push({ kind: 'rect', x: ex(x + w / 2), y: ey(y), w: w + 14, h: 30, r: 4, color: INK.ground, alpha: 0.92 });
      faces.push(glyph(face, x + w / 2, y, size2, INK.green));
      x += w + 34;
      k++;
    }
  }
}

/** The monitor at `f`: its box (cracked, bowed, broken), its rows, the odometer, the gauge and the warnings; the dizzy faces on their chips (a layer of their own, over the gauge); the snap's pieces; the hero. */
export function overflowContent(f: number, L: OverflowLayout): { monitor: FlatContent; faces: FlatContent; pieces: FlatContent; hero: Glyph[] } {
  const mono: Glyph[] = [];
  const faces: Glyph[] = [];
  const under: Shape[] = [];
  const snapped = f >= SNAP_LAUNCH;
  const crack = crackAt(f);
  // Row 0: ╔═ title ═…═╗ (the crack's gap and edges; after the snap its last 6 cells and the corner have flown).
  const top = `╔═${MONITOR2.title}${'═'.repeat(MON.cols - 3 - [...MONITOR2.title].length)}╗`;
  [...top].forEach((ch, col) => {
    if (snapped && col >= 55) return;
    let c = ch;
    if (crack) {
      if (col >= crack.gap[0] && col <= crack.gap[1]) return;
      if (col === crack.gap[0] - 1) c = '╪';
      if (col === crack.gap[1] + 1) c = '╬';
    }
    if (c.trim() === '') return;
    const [x, y] = cellAt(col, 0);
    const corner = col === MON.cols - 1 ? { rot: (10 * Math.PI) / 180 * Math.min(1, bowAmplitude(f) / 160) } : {};
    mono.push(glyph(c, x, y, MON.fontPx, '╔═╗╪╬'.includes(c) ? INK.dim : INK.text, corner));
  });
  // Rows 1–15: the walls (the right one bowing, gone after the snap).
  for (let row = 1; row < MON.rows - 1; row++) {
    const [lx, y] = cellAt(0, row);
    mono.push(glyph('║', lx, y, MON.fontPx, INK.dim));
    if (!snapped) {
      // The bowed rows lean along the curve (and stretch to keep joined), so the wall reads as one rubber line, not a staircase.
      const lean = wallLean(row, f);
      mono.push(glyph('║', cellAt(61, row)[0] + wallDx(row, f), y, MON.fontPx / Math.cos(lean), INK.dim, { rot: lean, stretch: Math.cos(lean) }));
    }
  }
  // Row 16: ╚═…═╝.
  for (let col = 0; col < MON.cols; col++) {
    if (snapped && col >= 55) continue;
    const ch = col === 0 ? '╚' : col === MON.cols - 1 ? '╝' : '═';
    const [x, y] = cellAt(col, 16);
    mono.push(glyph(ch, x, y, MON.fontPx, INK.dim, col === MON.cols - 1 ? { rot: (-10 * Math.PI) / 180 * Math.min(1, bowAmplitude(f) / 160) } : {}));
  }
  // The rows: friends, memory (label; the odometer), hype.
  line(mono, MONITOR2.rows[0], 2, 2, INK.green);
  rolling(mono, f, friendsAt, FRIENDS_ROLLS, 12, 2, INK.green);
  line(mono, MONITOR2.rows[1], 2, 4, INK.green);
  mono.push(...odometerGlyphs(f));
  line(mono, MONITOR2.rows[2], 2, 11, INK.green);
  rolling(mono, f, hypeAt, [WRAP], 12, 11, frameOf(f) >= WRAP ? INK.pink : INK.green);
  const chips: Shape[] = [];
  gauge(f, mono, faces, chips, L);
  // The warnings, rows 13–15 (the FATAL blinking 3 on / 3 off).
  for (const w of warningsAt(f)) {
    if (w.blink && Math.floor((frameOf(f) - SURF[3]) / 3) % 2 === 1) continue;
    line(mono, w.text, 2, w.row, w.color, w.count);
  }
  // The snap's pieces fly over him.
  const pieces = snapPieces(f).map((p) => glyph(p.ch, p.x, p.y, MON.fontPx, INK.dim, { rot: p.rot }));
  return {
    monitor: { under, glyphs: { mono }, over: [] },
    faces: { under: chips, glyphs: { jp: faces }, over: [] },
    pieces: { under: [], glyphs: { mono: pieces }, over: [] },
    hero: heroGlyphs(surfer(f), L, INK.hero),
  };
}

/** The reel's hero tube (Drop2Overload's HERO_TUBE): strokes thinned 0.026 em, white-hot in the middle; unlit, the club's dark glass. */
const TUBE = 0.026;
export const GLASS = linear('#1C1A24');
/** His glyphs (rounded, one per character, the face's (•ω•) core centred on (x, y) and `width` wide), squashed, turned; drawn as a neon tube when `tube`. */
export function heroGlyphs(s: Surfer, L: OverflowLayout, color: RGB, alpha = 1, tube = false): Glyph[] {
  const arms = s.arms ?? 1;
  const chars = [...s.face];
  const open = chars.indexOf('(');
  const close = chars.lastIndexOf(')');
  const adv = chars.map((c) => L.rounded(c));
  const core = adv.slice(open, close + 1).reduce((a, b) => a + b, 0);
  const size = s.width / core;
  const left = -adv.slice(0, open).reduce((a, b) => a + b, 0) - core / 2;
  const out: Glyph[] = [];
  let x = left;
  const [c, sn] = [Math.cos(s.rot), Math.sin(s.rot)];
  chars.forEach((ch, i) => {
    const dx = (x + adv[i] / 2) * size * s.sx;
    x += adv[i];
    // Turned about his centre (counter-clockwise positive, the flat world's y up).
    // His arms (outside the brackets) fade with `arms` (the fling's blur), the core never.
    const a = i < open || i > close ? alpha * arms : alpha;
    if (a <= 1e-4) return;
    out.push({ ch, x: ex(s.x) + dx * c, y: ey(s.y) + dx * sn, size: size * s.sy, stretch: s.sx / s.sy, rot: s.rot, color, alpha: a, ...(tube ? { tube: TUBE } : {}) });
  });
  return out;
}

/// ——— The whip-pan into the kernel (drop2 7.4& → 8.1; sheet §1.3 F: it flew onto the reel's neon card as built) ————————————————————

/**
 * The world the pan lands in, centred on world (−2400, 1840) (H4, as built): a layout point (x, y) of the landing frame is the world point
 * (x + CARD.x, y + CARD.y).
 */
export const CARD = { x: -3360, y: MON.y0 } as const;

/** The whip-pan's roll: it swells with the pan (−1.5° at its middle) and lands level on drop2 8.1 (as built it rolled into the reel card's camera). */
export const PAN_ROLL = (f: number): number => (f < PAN.from - 1 ? 0 : ((-1.5 * Math.PI) / 180) * Math.sin(Math.PI * whip(f, PAN.from, PAN.to)));

/**
 * The kernel's look as the pan lands (drop2 8.1): the terminal's finish with no CRT — dark, Defender's emissive red blooming. The pan
 * drains the monitor's CRT into it on its own curve (Drop2Game gameLook); the kernel starts from it.
 */
export const KERNEL_LOOK_IN: Look = (() => {
  const look: Look = { ...terminalLook(0), vignette: 0.25 };
  delete look.crt;
  return look;
})();

/** Defender's emissive red (dark grounds, ×1.6: LAW) and the flood's green, as the pan streaks past them. */
const KERNEL_INK = { red: linear(LAW.defender.emissive, LAW.defender.emissiveGain), green: linear(PALETTES.kernel.flood) } as const;
/** The kernel's lens: 50° vertical, its focal length in px (src/shots/drop2Kernel.ts DK; not imported: the kernel imports this module). */
const KERNEL_FOCAL = 540 / Math.tan((25 * Math.PI) / 180);

/**
 * What the whip-pan flies past (sheet §1.3 F): Defender's kernel space at 0x80000000 already hangs in the world where he lands — its nave,
 * two rows of eight red process pillars receding to the core (layout px of the landing frame: x, the floor y, the top y, the stroke) —
 * and red and green lines in the dark between it and the monitor, at their own depths (z, nearer > 0: the pan's parallax). Everything
 * is drawn from the frame before the wrap, off screen until the pan brings it in; all of it streaks through the slam's blur, so the
 * kernel's own first frame (Drop2Kernel, drop2 8.1) takes over a world of the same colours.
 */
export const NAVE_PILLARS: readonly { x: number; y0: number; y1: number; w: number }[] = Array.from({ length: 8 }, (_, k) => {
  // Round 1 (the act-1 fixer): exactly where the kernel's own first frame stands its pillars (src/shots/drop2Kernel.ts NAVE through its
  // start pose: a 50° lens at its fill distance, pillars ±710 u, 420 u deep apart, from 420 u below the eye to 580 u above it; pinned by
  // tests/drop2Kernel.test.ts), so the pan's blur resolves into the kernel's nave on 8.1 instead of a nave of another shape.
  const s = KERNEL_FOCAL / (KERNEL_FOCAL + 420 * k);
  return [
    { x: 960 - 710 * s, y0: 540 + 420 * s, y1: 540 - 580 * s, w: 16 * s },
    { x: 960 + 710 * s, y0: 540 + 420 * s, y1: 540 - 580 * s, w: 16 * s },
  ];
}).flat();
export const PAN_STREAKS: readonly { x0: number; x1: number; y: number; z: number; hue: 'red' | 'green'; w: number }[] = [
  { x0: -310, x1: -40, y: 1510, z: -1400, hue: 'red', w: 5 },
  { x0: -510, x1: -40, y: 2140, z: -800, hue: 'green', w: 5 },
  { x0: -780, x1: -200, y: 1660, z: 0, hue: 'red', w: 6 },
  { x0: -770, x1: -40, y: 2260, z: 0, hue: 'green', w: 6 },
  { x0: -775, x1: -420, y: 1985, z: 0, hue: 'red', w: 4 },
  { x0: -980, x1: -240, y: 1990, z: 600, hue: 'green', w: 7 },
  { x0: -1150, x1: -220, y: 1590, z: 1100, hue: 'red', w: 8 },
];

/** A lit line between two world layout points (as the club's tubes are drawn): dark glass (normal), then glow, line and hot core (add). */
function neonTube(glass: Shape[], light: Shape[], x0: number, y0: number, x1: number, y1: number, w: number, hue: RGB, level: number, z = 0): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const s: Shape = { kind: 'segment', x: ex((x0 + x1) / 2), y: ey((y0 + y1) / 2), w: len + w, h: w, rot: -Math.atan2(y1 - y0, x1 - x0), color: GLASS, ...(z ? { z } : {}) };
  glass.push(s);
  light.push({ ...s, h: w * 2.8, color: scaleRGB(hue, 0.12 * level), soft: w * 1.4 });
  light.push({ ...s, color: scaleRGB(hue, level) });
  light.push({ ...s, h: w * 0.4, w: len + w * 0.4, color: mixRGB(scaleRGB(hue, 0.9 * level), [level, level, level], 0.5) });
}

/**
 * The world under the whip-pan (from the frame before the wrap): the kernel's nave of red pillars at the landing, a red
 * scan pulse on the 16ths (Defender, a beat behind everything), and the lines in the dark between. `glass` draws normal under him,
 * `light` adds over the glass (still under him).
 */
export function panWorld(f: number): { glass: FlatContent; light: FlatContent } {
  const glass: Shape[] = [];
  const light: Shape[] = [];
  if (f < WRAP - 1) return { glass: { under: [], glyphs: {}, over: [] }, light: { under: [], glyphs: {}, over: [] } };
  const cx = (x: number) => x + CARD.x;
  const cy = (y: number) => y + CARD.y;
  // A pillar pulses on each 16th (the scan, late), hashed on its approved phase.
  const k = HATS2.filter((h) => h <= f).pop() ?? HATS2[0];
  const t = f - k;
  const hot = Math.floor(hash(seedFrame(k), 4310) * NAVE_PILLARS.length);
  NAVE_PILLARS.forEach((p, i) => neonTube(glass, light, cx(p.x), cy(p.y0), cx(p.x), cy(p.y1), p.w, KERNEL_INK.red, 0.8 + (i === hot && t < 4 ? 0.8 * (1 - t / 4) : 0)));
  // The lines in the dark between.
  for (const s of PAN_STREAKS) neonTube(glass, light, s.x0, s.y, s.x1, s.y, s.w, KERNEL_INK[s.hue], 1.2, s.z);
  return { glass: { under: glass, glyphs: {}, over: [] }, light: { under: light, glyphs: {}, over: [] } };
}

/** The snap's sparks as light: a white-hot head and a green streak behind it. */
export function sparkShapes(f: number): Shape[] {
  const out: Shape[] = [];
  for (const s of snapSparks(f)) {
    const len = 70 * s.level + 10;
    out.push({ kind: 'segment', x: ex(s.x - (s.dx * len) / 2), y: ey(s.y - (s.dy * len) / 2), w: len, h: 5, rot: -Math.atan2(s.dy, s.dx), color: scaleRGB(INK.green, 1.4 * s.level), soft: 2 });
    out.push({ kind: 'ellipse', x: ex(s.x), y: ey(s.y), w: 34 * s.level + 6, h: 34 * s.level + 6, color: scaleRGB(INK.green, 0.6 * s.level), soft: 14 });
    out.push({ kind: 'ellipse', x: ex(s.x), y: ey(s.y), w: 9, h: 9, color: [2.4 * s.level, 2.4 * s.level, 2.4 * s.level] });
  }
  return out;
}

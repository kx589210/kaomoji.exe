// The ending's shared pieces (build sheet notes/b58/ending-sheet.md §4–§5): what two parts of the ending must agree on at a
// hand-off — the hero's pose, the dot, the iris, the spots and the seats they fly to, W5's box — plus the ending's palette (the colour
// law) and its motion vocabulary, copied out of drop 2's shared file (src/shots/drop2Shared.ts) so drop 2 can change its own freely.
// Layout px: 1920 × 1080, origin top-left, y down (the design's measurements, notes/extend/ending-final.md §7); the flat world is
// centred and y up: toWorld(). Pure: Node tests import it (tests/outro.test.ts pins the hand-offs and the clearances).
// Append-only for the ending's builders: add a helper or a constant at the end; never change an existing one — a change here is a
// hand-off change, made by the lead with both sides' tests.
import { clamp } from '../engine/math.ts';

export type Point = readonly [number, number];
/** Layout px (top-left, y down) → the flat world (centre, y up). */
export const toWorld = ([x, y]: Point): [number, number] => [x - 960, 540 - y];

// ——— The palette (the colour law, sheet §7): hex, run through linear() by the shots ——————————————————————————————————————————————

export const OUTRO_HEX = {
  /** E1: the blue screen's ground, its vignette edge, its type, its dim type, the navy of chips, outlines and the code's modules. */
  blue: '#1E4FD8',
  blueEdge: '#102A80',
  blueText: '#F2F6FF',
  blueDim: '#A9BCF5',
  navy: '#0B1650',
  /** The refresh band (the seam) and the monitor's first halo: the blue's light. */
  band: '#9DB6FF',
  /** DEFENDER red, emissive (the ending only has dark and mid grounds): the antivirus and nothing else. */
  red: '#FF4A1C',
  /** The hero's amber (×1.9 as HERO_PHOSPHOR on dark), every infected ω, the ✧'s glow; the ✧'s core. */
  amber: '#FFB23E',
  starCore: '#FFE3A8',
  /** The guest's cocktail glass and its last drop, only. */
  pink: '#FF3D8B',
  /** The terminal: its green (cursor, prompt, [ OK ], counters, the hem), its text (mint), its ground; the black outside the apertures. */
  green: '#4CF08C',
  mint: '#D8F5E1',
  ground: '#0C0F0E',
  black: '#000000',
  white: '#FFFFFF',
} as const;

// ——— Motion vocabulary (the ending's L / I / S / F; copies of drop2Shared's, unchanged) ——————————————————————————————————————————

const SPRING_OMEGA = 0.674;
/** Discrete changes on a drum are taken at the output frame. */
export const frameOf = (f: number): number => Math.floor(f + 0.5);
/**
 * L, the launch: a damped spring (ζ 0.67, ω 0.674 rad/f) keyed one frame before its beat `at`, so the beat frame already moves:
 * 16.6 / 47.4 / 75.0 / 93.4 / 102.8 / 105.8 % on at … at + 5, settled by + 11. `zeta` 0.75 is the soft L.
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
/** S, the snap: cubic-out over 6 f to 104 %, then 2 f back to 100 %. */
export function snap(f: number, at: number): number {
  const t = f - at;
  if (t <= 0) return 0;
  if (t < 6) return 1.04 * (1 - (1 - t / 6) ** 3);
  return t < 8 ? 1.04 + (1 - 1.04) * ((t - 6) / 2) : 1;
}
/** F, the flow: ease-in-out sine on u (clamped to 0–1). */
export const flow = (u: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u));

// ——— Hand-offs (sheet §4): both sides of each one read these ————————————————————————————————————————————————————————————————————

/** 5183 → 5184 (drop 2 → E1): his crash face as drop 2 condenses it (src/shots/drop2Shared.ts T7_CONDENSED), where his bytes unfold and the face gathers again. */
export const SEAM_FACE = { face: '(×ω×)', width: 440, centre: [960, 450] as Point } as const;
/** E1: his face on the blue screen, M PLUS Rounded ExtraBold em 230 at the centre until the slide, then in the screen's emoticon slot. */
export const BLUE_FACE = { em: 230, centre: [960, 450] as Point, slot: [526, 320] as Point } as const;
/** E1 → E2 (5297 / 5298 → 5304): line 4, the antivirus's last word, as staged (x 200, baseline 660, 56 px), then centred at x 960 under the line. */
export const LAST_WORD_AT = { size: 56, x: 200, baseline: 660, centreX: 960 } as const;
/** E2: the monitor's line (y 540), the ring it curls into round his face (r 260, his (×ω×) em 160 inside), and the dot it closes to. */
export const MONITOR = { lineY: 540, centre: [960, 540] as Point, ring: 260, face: { em: 160, baseline: 587 }, dot: { core: 28, halo: 40 } } as const;
/** E2 → E3 (5375 → 5376): the dot as the pry starts (the 5370 bulge's tail): 64 px wide, 56 tall, at the centre. */
export const DOT_AT_OPEN = { w: 64, h: 56, centre: [960, 540] as Point } as const;
/**
 * E3: the iris, a circle about the centre: opened to r 400 on the tonic (overshoot 430), pushed to 440 and back to 420 on Enter, strained
 * to 440 on the last doubling; he is ヽ(•ω•)ﾉ em 160 at its centre, rising to y 505 on the second ↑ (the ✧ rides with him).
 * E3 → E4 (5471 → 5472): the burst launches the rim from `strained`; the hop starts from `risen`.
 */
export const IRIS = {
  centre: [960, 540] as Point,
  open: 400,
  overshoot: 430,
  run: 420,
  strained: 440,
  hero: { em: 160, centre: [960, 540] as Point, risen: 505 },
  star: { size: 110, at: [1250, 580] as Point, risen: [1250, 545] as Point },
  prompt: { size: 36, baseline: 690 },
} as const;
/** W5, the readout (the party monitor's slot, style B: src/shots/hud.ts HUD size 19, pitch 27): its box and its rows' centre lines. Screen-space; E3 and E4 both draw it. */
export const W5_BOX = { x0: 40, x1: 554, y0: 868, y1: 1038, size: 19, pitch: 27, rows: { title: 885, friends: 912, frame: 939, defender: 966, bottom: 993, line: 1020 }, valueCol: 12 } as const;
/** The risers' seats (E4): A (headliners 1–4) and B (5–8), their baselines and type sizes, the four seat columns. */
export const SEATS = { A: { baseline: 606, em: 44 }, B: { baseline: 690, em: 52 }, x: [260, 680, 1240, 1660] as const } as const;
/** The seat a headliner's name (A1 … B4) stands for, as a baseline point and its em. */
export const seatAt = (seat: string): { at: Point; em: number } => {
  const row = seat[0] === 'A' ? SEATS.A : SEATS.B;
  return { at: [SEATS.x[Number(seat[1]) - 1], row.baseline], em: row.em };
};
/**
 * E3 → E4: the seven spots (each its own small iris, lit on SPOTS), in HEADLINERS' spot order (1 Swiss … 7 drop 2): centre and radius.
 * On the burst each friend flies from its spot's centre (48 px) to its seat; clear of the main iris (r ≤ 440), of each other, of W5 and
 * of the frame's edge (16 px).
 * Ending fixer a, round 1 (review F1: the top spots crowded the frame's edge, drop 2's kaleidoscope touched the top-right corner and was
 * cropped by the burst's punch): a ring of worlds round the circle — Swiss left; Riso and the transition right, low and high; the
 * cosmos, the club and the interlude across the top; drop 2, the largest, right of centre — each ≥ 30 px inside the frame through its
 * pop (×1.09), the burst's pop (×1.12) and the burst's punch (×1.05 about the centre); tests/outroIris.test.ts measures it.
 */
export const SPOT_AT: readonly { centre: Point; r: number }[] = [
  { centre: [205, 540], r: 110 },
  { centre: [1715, 880], r: 110 },
  { centre: [1715, 180], r: 110 },
  { centre: [205, 180], r: 110 },
  { centre: [500, 178], r: 110 },
  { centre: [1420, 178], r: 110 },
  { centre: [1690, 540], r: 135 },
];
/**
 * E5's landing (outro 5.4, film 5832; U5b, the sheet r4.1: was 5.3 and S01 at −48, (1141, 540) × 15.08): S01 at frame −24 —
 * the cursor cell lit at 1.0, here on screen, at this zoom (s01Aim(−24): 16 × 1.03^−1; tests/outro.test.ts reads S01's live camera).
 */
export const CURSOR_AT_SLAM = { at: [1053.2, 540] as Point, zoom: 15.534 } as const;
/**
 * WP6 (v07; the review, 10-03: the transition from drop 2 into the ending was weak): drop 2 → E1 no longer hands over a grey field and a flat cut to blue. His dark
 * clearing turns into a blue spot as drop 2 drains (src/shots/drop2Crash.ts seamSpot), inhales onto his condensed (×ω×) through the
 * digital zero with the drained text filling in behind it, lands as this stadium on outro 1.1, and the blue screen bursts out of it (src/shots/outroBlue.ts BURST):
 * the bullet time's rings of light ran out of him every 6 frames, and the blue screen is the last of them. Both sides read this stadium:
 * centred on his face, 2·hw × 2·hh px, its edge feathered over `soft` px.
 */
export const SEAM_SPOT = { centre: [960, 450] as Point, hw: 262, hh: 118, soft: 64 } as const;
/** How far layout point (x, y) lies outside SEAM_SPOT's stadium (negative inside): the blue screen's front is a level line of it. */
export const seamSpotDistance = (x: number, y: number): number =>
  Math.hypot(Math.max(0, Math.abs(x - SEAM_SPOT.centre[0]) - (SEAM_SPOT.hw - SEAM_SPOT.hh)), y - SEAM_SPOT.centre[1]) - SEAM_SPOT.hh;

// The comic club "INK"'s shared kit, pure: the palette, the draw-list contract every part of the club speaks (InkDraw), the print look
// (the comic pass, src/engine/post/comicModel.ts), the plates (registration slips), the shutter helper and the stub every part starts
// from. The parts (src/shots/clubInk{Splash,Record,Bar,Lens,Incident,Flight}.ts, one builder each) import this; the dispatcher
// (src/shots/clubInk.ts) routes to them; the scene (src/scenes/clubInk.ts) executes their draw lists on the GPU. Build sheet
// notes/b58/club-sheet.md §9–§10. Screen px at 1080p, origin at the centre, y up. Plain Node loads this file: no three / remotion /
// react imports.
import { frontal, type Pose } from '../engine/camera.ts';
import { type RGB, linear } from '../engine/color.ts';
import type { FlatContent, Paper } from '../engine/flatLayer.ts';
import type { ComicInkLook } from '../engine/post/comicModel.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { Look } from '../engine/types.ts';
import type { InkAtlasId } from '../content/club.ts';
import { CLAPS, CLUB, FLAM, HIT, KICKS, club } from '../score/club.ts';
import { FOV, FRONT } from './swiss.ts';

// ——— The palette (design §7.1; hex as designed, linear for the GPU) ——————————————————————————————————————————————————————————————

/**
 * The inks. Amber is his alone (and his marks: infected ω mouths, infection dots, his eyes in the dark); red the antivirus's alone, as a
 * line screen, never dots; lemon the caption box only. K (keylines, borders, focus lines, the vinyl, lights out) is the void itself: the
 * comic pass keys on it, so one black serves both (the design's #111111 and #07060C are one ink in the engine; sheet §10.2).
 */
export const HEX = {
  VOID: '#07060C',
  PAPER: '#FDF3D8',
  NIGHT: '#23215E',
  CYAN: '#19B8E6',
  PINK: '#F2499B',
  LEMON: '#FFF0A0',
  AMBER: '#FFB23E',
  RED: '#E8402B',
  RED_SHADE: '#9E1F17',
  MAGENTA_PLATE: '#E84094',
  LEMON_PLATE: '#FFFF4B',
} as const;
export const VOID: RGB = linear(HEX.VOID);
export const K: RGB = VOID;
export const PAPER: RGB = linear(HEX.PAPER);
export const NIGHT: RGB = linear(HEX.NIGHT);
export const CYAN: RGB = linear(HEX.CYAN);
export const PINK: RGB = linear(HEX.PINK);
export const LEMON: RGB = linear(HEX.LEMON);
export const AMBER: RGB = linear(HEX.AMBER);
export const RED: RGB = linear(HEX.RED);
export const RED_SHADE: RGB = linear(HEX.RED_SHADE);
/** The rage plates (club 5.2a → 5.2&), only on the guest: printed multiply, magenta′ over lemon′ is exactly RED. */
export const MAGENTA_PLATE: RGB = linear(HEX.MAGENTA_PLATE);
export const LEMON_PLATE: RGB = linear(HEX.LEMON_PLATE);

// ——— The draw-list contract ———————————————————————————————————————————————————————————————————————————————————————————————————

/** Where a draw lands: `ink` paints over (normal blending), `print` overprints (multiply: content colours are transmittances). */
export type InkLayerId = 'ink' | 'print';
/**
 * One draw of a part's frame, executed in order by src/scenes/clubInk.ts: `content` seen through `pose` on layer `layer`; `paper` a ground
 * (the first draw of every frame brings one; null or absent draws over what is there). Glyph keys are atlas ids (src/content/club.ts
 * INK_ATLASES: face, sfx, ui, display, mono). The kit builder extends this type (clips for panels and the burst, the page bake) — sheet §10.
 */
export type InkDraw = { layer: InkLayerId; pose: Pose; content: FlatContent; paper?: Paper | null };
/** What only the browser can measure: each atlas's advances (tests pass a fake). */
export type InkLayout = { advance: Readonly<Record<InkAtlasId, Advance>> };
/** A part of the club, pure: its draw list at instant `f`, and how output frame `frame` is photographed and finished. */
export type InkPart = {
  frame(f: number, L: InkLayout): InkDraw[];
  temporal(frame: number): Temporal;
  look(frame: number): Look;
};

/** The frame, square on: 1 unit = 1 px at 1080p on z = 0. */
export const SCREEN: Pose = frontal(FRONT, 0, 0, FOV);
export { FOV, FRONT };
/** Discrete changes on a drum are taken at the output frame (whole on the drum's frame, never double-exposed). */
export const frameOf = (f: number): number => Math.floor(f + 0.5);
/** A shutter: `samples` sub-frames over `open` frames, no phosphor tail. */
export const shutter = (samples: number, open = 0.5): Temporal => ({ samples, shutter: open, persistence: 0 });

// ——— The print (design §2.3, §7.6) ——————————————————————————————————————————————————————————————————————————————————————————————

/** The colour plate's rest offset from the key (1080p px, y up): every print is a little off register. */
export const PLATE_REST: readonly [number, number] = [1.5, -1];
/**
 * The register slip on a clap (1080p px, y up; alternating in sign clap to clap): 12 px off the key (plan v07 §4: the old 8 px, (6, −5),
 * did not read at 1×; the claps on 2 and 4 are the ink grammar's ring), sounded by the print's thwack (sections/club.mjs THWACK).
 */
export const PLATE_SLIP: readonly [number, number] = [9, -7.5];
/**
 * The colour plate's offset at output frame `frame`: the rest, plus a register slip on every clap — PLATE_SLIP off the key on the clap's
 * own frame, the direction alternating clap to clap, springing back over 16 f (ζ ≈ 0.5). The key never moves.
 */
export function plateAt(frame: number): [number, number] {
  let i = -1;
  for (let k = 0; k < CLAPS.length; k++) if (CLAPS[k] <= frame) i = k;
  if (i < 0) return [PLATE_REST[0], PLATE_REST[1]];
  const t = frame - CLAPS[i];
  const e = t < 16 ? Math.exp(-0.4 * t) * Math.cos(0.69 * t) : 0;
  const d = i % 2 === 0 ? 1 : -1;
  return [PLATE_REST[0] + PLATE_SLIP[0] * d * e, PLATE_REST[1] + PLATE_SLIP[1] * d * e];
}

// ——— The print bump: the kick in ink (continuity plan v07 §4, FW2) ———————————————————————————————————————————————————————————————

/**
 * Every kick of the club, the flam among them, from the dot inking to the last kick before the hit: the ink grammar's pulse. On each the
 * page is struck like a press — it drops `drop` px and its halftone dots spread from the print's 16 px pitch by `pitch` — whole on the
 * kick's own frame (an impact) and recovering over `frames` (the camera rig's punch lands on the same frame: src/score/club.ts
 * clubRigInstant). The & has none: the kicks dominate (the club was the film's least beat-locked part, 83 % on-beat).
 */
export const PRINT_BUMP = { drop: 6, pitch: 2, frames: 6 } as const;
export const BUMP_KICKS: readonly number[] = [...KICKS, FLAM].filter((f) => f >= CLUB.from && f < HIT).sort((a, b) => a - b);
/** The bump at output frame `frame` (0 – 1): 1 on a kick's frame, (1 − t/frames)² after it, 0 between. */
export function bumpAt(frame: number): number {
  const F = Math.floor(frame + 0.5);
  let k = -Infinity;
  for (const b of BUMP_KICKS) if (b <= F) k = b;
  const t = F - k;
  return t >= 0 && t < PRINT_BUMP.frames ? (1 - t / PRINT_BUMP.frames) ** 2 : 0;
}
/** The page's drop at output frame `frame` (screen px, down). */
export const bumpDrop = (frame: number): number => PRINT_BUMP.drop * bumpAt(frame);
/**
 * Club 6 (the approach, plan v07 §4 C6): on its kicks the page also punches in hard — 4 % on the kick's frame, 2.5 % and 1 % on the next
 * two — inside the flight's own continuous move, so its kicks are seen through the roll's shakes.
 */
export const APPROACH_PUNCH: { kicks: readonly number[]; steps: readonly number[] } = { kicks: KICKS.filter((k) => k >= club(6) && k < HIT), steps: [0.04, 0.025, 0.01] };
/** The page's extra zoom at output frame `frame` (0.04 = 4 %). */
export function bumpZoom(frame: number): number {
  const F = Math.floor(frame + 0.5);
  for (const k of APPROACH_PUNCH.kicks) if (F >= k && F - k < APPROACH_PUNCH.steps.length) return APPROACH_PUNCH.steps[F - k];
  return 0;
}
/** The print's dot pitch at output frame `frame` (1080p px on its screen): 16, spreading by PRINT_BUMP.pitch on each kick. */
export const bumpPitch = (frame: number): number => 16 + PRINT_BUMP.pitch * bumpAt(frame);
/**
 * `pose` seen `px` screen px lower (the camera moved up its own up vector by what `px` spans at its target): the bump's drop, for any of
 * the club's poses (frontal, aimed, the receding page's tilted one).
 */
export function dropPose(pose: Pose, px: number, zoom = 0): Pose {
  if (px === 0 && zoom === 0) return pose;
  const [p, t] = [pose.position, pose.target];
  const d: [number, number, number] = [t[0] - p[0], t[1] - p[1], t[2] - p[2]];
  const dist = Math.hypot(d[0], d[1], d[2]) || 1;
  const n: [number, number, number] = [d[0] / dist, d[1] / dist, d[2] / dist];
  const dot = pose.up[0] * n[0] + pose.up[1] * n[1] + pose.up[2] * n[2];
  const u: [number, number, number] = [pose.up[0] - dot * n[0], pose.up[1] - dot * n[1], pose.up[2] - dot * n[2]];
  const ul = Math.hypot(u[0], u[1], u[2]) || 1;
  const s = (px * 2 * dist * Math.tan((pose.fov * Math.PI) / 360)) / 1080 / ul;
  // The zoom: the camera moves in along its view so the target's plane is (1 + zoom) × larger (about the frame's centre).
  const k = dist * (zoom / (1 + zoom));
  const tt: [number, number, number] = [t[0] + u[0] * s, t[1] + u[1] * s, t[2] + u[2] * s];
  return { ...pose, position: [p[0] + u[0] * s + n[0] * k, p[1] + u[1] * s + n[1] * k, p[2] + u[2] * s + n[2] * k], target: tt };
}
/** A draw list as the bump shows it at output frame `frame` (every draw's pose dropped and punched alike). */
export function bumpDraws<T extends { pose: Pose }>(draws: readonly T[], frame: number): T[] {
  const px = bumpDrop(frame);
  const z = bumpZoom(frame);
  return px === 0 && z === 0 ? [...draws] : draws.map((d) => ({ ...d, pose: dropPose(d.pose, px, z) }));
}

/**
 * The comic pass as the club prints with it (sheet §10.2): continuous dot sizes from any flat tint (light is dots, never a gradient), the
 * keylines drawn by the parts themselves (outline 0: the pass would key every dot), paper and key exactly the palette's (so flat PAPER and
 * K print clean), the colour plates `offset` off the key, the dots on the screen `screen` (ride the camera like print; absent = fixed).
 */
export const comicPrint = (offset: readonly [number, number], extra: Partial<ComicInkLook> = {}): ComicInkLook => ({
  amount: 1,
  pitch: 16,
  levels: 0,
  outline: 0,
  paper: PAPER,
  key: K,
  offsets: { c: [offset[0], offset[1]], m: [offset[0], offset[1]], y: [offset[0], offset[1]] },
  ...extra,
});
/** The comic's finishing (design §7.6): linear, no bloom, no aberration (the plates do the fringing), film grain 0.03, no vignette. */
export const INK_FINISH: Look = { toneMapping: 'linear', exposure: 1, bloom: { intensity: 0, threshold: 1, smoothing: 0.1, radius: 0.7 }, aberration: 0, grain: 0.03, vignette: 0 };
/** The printed look of output frame `frame`: the finish and the comic pass with the plates where plateAt puts them, its dots spreading on the kicks (bumpPitch). */
export const inkLook = (frame: number, extra: Partial<ComicInkLook> = {}): Look => ({ ...INK_FINISH, comic: comicPrint(plateAt(frame), { pitch: bumpPitch(frame), ...extra }) });
/** The paper's fibre (FlatLayer paper grain) under every printed panel. */
export const PAPER_GRAIN = 0.04;

// ——— The stub every part starts from ————————————————————————————————————————————————————————————————————————————————————————

/**
 * A part not built yet: its ground, a K bar along the bottom filling over the part's frames [from, to), and a K tick under the bar on
 * every kick (so a stub cut still shows where the beat is). Replace it: it is not part of the design.
 */
export function stubDraw(f: number, from: number, to: number, ground: RGB, kicks: readonly number[]): InkDraw[] {
  const u = Math.min(1, Math.max(0, (f - from) / (to - from)));
  const under: Shape[] = [{ kind: 'rect', x: -960 + 960 * u, y: -500, w: 1920 * u, h: 24, color: ground === VOID ? PAPER : K }];
  const d = frameOf(f);
  if (kicks.some((k) => d >= k && d < k + 6)) under.push({ kind: 'rect', x: 0, y: -460, w: 120, h: 40, color: ground === VOID ? AMBER : CYAN });
  return [{ layer: 'ink', pose: SCREEN, content: { under, glyphs: {}, over: [] }, paper: { color: ground, grain: PAPER_GRAIN } }];
}

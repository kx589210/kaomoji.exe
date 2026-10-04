// E5 CURSOR, outro 5.4 → the film's end (OutroCursor; build sheet notes/b58/ending-sheet.md §3.5 rows 5.4 → end, §4 OUT; U5b, the
// lead's ruling after review round 1: the █ lands on 5.4, was 5.3). Pure. The film runs him again: this last beat is S01's frames −24 … −1
// — its camera (introCamera, at film-relative frame f − LOOP: S01's opening aim, its flow running backwards from frame 0), its ground
// and haze, its look, its sampling — with S01's blink of the cursor on the landing (fading like phosphor), and on the last 32nd + 3 the
// tube settling (power 1 → 0.15) into the warm-up frame 0 starts from. The last frame and frame 0 are one picture apart only by the
// blink: the loop is one more beat.
import { CURSOR as CURSOR_CHAR } from '../content/boot.ts';
import type { Pose } from '../engine/camera.ts';
import { scaleRGB } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease } from '../engine/math.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Look } from '../engine/types.ts';
import { CURSOR, LOOP, OUTRO_SEGMENT, SETTLE, SLAM } from '../score/outro.ts';
import { INK, TERM, cellCenter } from '../worlds/terminal.ts';
import { PHOSPHOR, hazePulse, introCamera, introLook, introTemporal } from './intro.ts';

/** S01's own frame for instant f of the ending's last beat (negative: −24 … −1). */
export const s01Frame = (f: number): number => f - LOOP;
/** The tube's power: 1, settling to 0.15 (inOutSine) over SETTLE so the last frame matches frame 0's first warm-up step (screenPower(0) = 0.15). */
export function outroPower(f: number): number {
  return 1 - 0.85 * ease.inOutSine(clamp((f - SETTLE.from) / (SETTLE.to - 1 - SETTLE.from)));
}
/** The cursor's level: lit through each of S01's blinks replayed from the landing (U5b: one, 5.4), fading like phosphor after each (τ PHOSPHOR). */
export function cursorLevel(f: number): number {
  let level = 0;
  for (const [a, b] of CURSOR) if (f >= a) level = f < b ? 1 : Math.exp(-(f - b) / PHOSPHOR);
  return level;
}
/** The cursor: S01's █ in its cell (0, 0), the terminal's type size, INK.green × 1.1 at its level (flat world, the intro's text plane). */
export function cursorGlyph(f: number): Glyph | null {
  const level = cursorLevel(f);
  if (level <= 0) return null;
  const [x, y] = cellCenter(0, 0);
  return { ch: CURSOR_CHAR, x, y, size: TERM.fontPx, color: scaleRGB(INK.green, 1.1 * level) };
}
/** S01's camera at its frame f − LOOP (the cursor cell, ×16 drifting back to ×15.53 and 93 px off on 5.4). */
export const cursorPose = (f: number): Pose => introCamera(s01Frame(f), [0, 0]);
/** S01's haze pulse (1 before its log). */
export const cursorHaze = (f: number): number => hazePulse(s01Frame(f));
export const cursorLook = (frame: number): Look => introLook(s01Frame(frame));
/**
 * S01's sampling — but its phosphor tail (3 × persistence back from the shutter) never reaches back across the landing into the dive:
 * there the camera was still slamming in, and the tail's sparse past instants stacked the zooming █ into a column of ghosts on the
 * landing (integrator, U1; U5b: 5.4).
 */
export function cursorTemporal(frame: number): Temporal {
  const t = introTemporal(s01Frame(frame));
  if (t.persistence <= 0) return t;
  const room = Math.max(0, (frame - t.shutter / 2 - SLAM.to) / 3);
  return room >= t.persistence ? t : { ...t, persistence: room };
}
export const cursorSegment = (): Segment => ({ from: OUTRO_SEGMENT.from, to: OUTRO_SEGMENT.to });

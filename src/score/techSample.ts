// Event lists of the 5-second tech sample. The picture reads them to animate;
// scripts/audio/tech-sample.mjs reads the same lists to place every sound.
import { TECH_SAMPLE_TEXT } from '../content/text.ts';
import { FRAMES_PER_BEAT } from './tempo.ts';

export const TECH_SAMPLE_FRAMES = 300;

/** Typing starts at frame 12 and advances one character per 32nd note (3 frames). */
export const TYPE_START = 12;
export const TYPE_STEP = 3;
export const typeFrames: number[] = [...TECH_SAMPLE_TEXT.prompt].map((_, i) => TYPE_START + i * TYPE_STEP);
export const typedCount = (frame: number): number => typeFrames.filter((f) => f <= frame).length;

export const STATUS_FRAMES = [60, 66, 72];
export const WHIP = { from: 96, to: 120 };
export const REVEAL = { from: 192, to: 240 };
export const KICKS: number[] = Array.from({ length: 8 }, (_, i) => 96 + i * FRAMES_PER_BEAT);
export const HIT_FRAME = 288;

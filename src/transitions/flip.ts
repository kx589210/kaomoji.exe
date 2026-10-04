// T2 (spec §6): the 16 × 9 face grid of S08 turns over card by card along the
// diagonal like dominoes; each card's back is its piece of S09's first sheet.
// Pure: every card's angle at every frame. src/transitions/tileFlip.ts draws it.
// Positions are part-local (src/score/film.ts): T2 runs from swiss 5.3 to the
// Swiss part's end (riso 1.1).
// Bars 1–14 (design §3.10, E12; build sheet notes/b114/sheet.md §8 W3): the mechanics (the domino order, the angles, the share
// turned, the lean) are v04's frame for frame. What changed: the backs render live, S09's plates converging into register on the fill
// (src/shots/riso.ts s09PreRoll, behind `register`), and between and along the turning cards the Riso world's ink shows, never the
// antivirus's red (the colour law: red is only ever the antivirus).
import type { BuildThreads } from '../content/build.ts';
import { type Pose, frontal } from '../engine/camera.ts';
import { type RGB, multiplyRGB } from '../engine/color.ts';
import { clamp } from '../engine/math.ts';
import type { Segment } from '../engine/temporal.ts';
import { launch } from '../motion/hit.ts';
import { FLIP, RETURN } from '../score/build.ts';
import { FOV, FRONT } from '../shots/swiss.ts';
import { PAPER, PLATE } from '../worlds/riso.ts';

export const CARDS = { cols: 16, rows: 9, size: 120 } as const;
/** Frames a card tips back before it flips (its wind-up). */
export const WINDUP = 4;
/** When card (col, row) starts flipping: along the diagonal from the top-left card (WINDUP frames after swiss 5.3, wound up from the flip's first frame) to the bottom-right one (a beat later), so every card has settled by the Swiss part's end (riso 1.1). */
export const turnStart = (col: number, row: number): number => FLIP.from + WINDUP + ((col + row) / (CARDS.cols + CARDS.rows - 2)) * 24;
/** Angle of card (col, row) at `frame`: 0 shows its front (S08), π its back (S09) — it tips back, flips fast from its start and wobbles past flat (spec §3.1 rule 5). */
export const flipAngle = (frame: number, col: number, row: number): number => Math.PI * launch(frame, turnStart(col, row), { tau: 2.5, bounce: 1, depth: 0.05, len: WINDUP });
/** Centre of card (col, row) (world units, y up): the cards are the S08 grid. */
export const cardCentre = (col: number, row: number): [number, number] => [(col + 0.5) * CARDS.size - 960, 540 - (row + 0.5) * CARDS.size];
/** T2 continues S08 without a cut, back to the SCAN bar's hard cut on swiss 4.3 (RETURN); sub-frames may reach back into S08. */
export const T2_SEGMENT: Segment = { from: RETURN, to: FLIP.to };
/** Sub-frames per frame while cards turn. */
export const T2_SAMPLES = 32;

/** How far the camera leans in over the turning cards (spec §3.1 rule 2: it always flows). */
export const T2_LEAN = 0.02;
/** The camera over the cards at instant `frame`: a sine-squared lean in from FLIP.from (swiss 5.3), in by T2_LEAN at the middle, square on again at FLIP.to (riso 1.1) — so S08 before and S09 after meet it exactly. */
export const t2Camera = (frame: number): Pose => frontal(FRONT / (1 + T2_LEAN * Math.sin(Math.PI * clamp((frame - FLIP.from) / (FLIP.to - FLIP.from))) ** 2), 0, 0, FOV);

/** Share of the cards turned over at `frame`: 0 before T2, 1 once every card shows S09. T2's finishing turns from the Swiss look to the Riso look with it. */
export function turnedShare(frame: number): number {
  let s = 0;
  for (let row = 0; row < CARDS.rows; row++) for (let col = 0; col < CARDS.cols; col++) s += clamp(flipAngle(frame, col, row) / Math.PI);
  return s / (CARDS.cols * CARDS.rows);
}

/** The ink behind and along the turning cards: the Riso world's pink over its blue, printed on its paper (a purple; v04 showed Swiss red here). */
export const T2_INK: RGB = multiplyRGB(multiplyRGB(PAPER, PLATE.pink), PLATE.blue);
/** A card shows that ink on its face as it nears edge-on: fully at edge-on, none once it faces the camera more than this (|cos| of its tilt). */
export const T2_EDGE = 0.3;
/** Whether T2's backs render live (S09's plates converging into register on the fill), or once, from S09's first frame, as v04's did. */
export const backsLive = (th: Pick<BuildThreads, 'register'>): boolean => th.register;

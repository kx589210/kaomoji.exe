// The camera energy of spec §3.1 (v2), following the energy arc. The intro and
// the build (swiss, riso) are written out here: in
// the intro, punches only on its sub pulses and its big hits; in the build, a
// punch on every kick that grows bar by bar. White flashes only on Enter, the
// lock, arriving in the Riso world and the hole; light bumps on the other
// downbeats but never on the red hand-offs; shakes on the big hits, the fill
// and the snare roll, dying in the silent half beat. Positions are part-local
// (src/score/film.ts). The transition, the cosmos, the bridges, the club and, from the break's
// downbeat (break 1.1) on, each section list their own accents in their score
// file (TRANSITION_ACCENTS, COSMOS_ACCENTS, BRIDGE_A_ACCENTS, CLUB_ACCENTS, BREAK_ACCENTS, DROP2_ACCENTS, BRIDGE_B_ACCENTS, OUTRO_ACCENTS:
// EnergyAccent below), merged into PUNCHES and ACCENTS at the end of each list
// — a section's builder never edits this file. A held tail (film.ts partTail)
// or a stub (film.ts STUBS: a bridge not built yet) holds the rig of the frame it holds; shakes are seeded by seedFrame, so they
// keep their approved draws wherever the map moves them. Pure; the Director
// hands rigAt() and flashAt() to the pipeline, and the character flash of
// src/score/cuts.ts with them.
import { type View, covered } from '../engine/view.ts';
import { flash, punch, shake } from '../motion/hit.ts';
import { BREAK_ACCENTS } from './break.ts';
import { BRIDGE_A_ACCENTS } from './bridgeA.ts';
import { BRIDGE_B_ACCENTS } from './bridgeB.ts';
import { FILL, HOLE, KICKS, RETURN, ROLL } from './build.ts';
import { CLUB_ACCENTS, clubRigInstant } from './club.ts';
import { glyphFlashAt } from './cuts.ts';
import { COSMOS_ACCENTS } from './cosmos.ts';
import { DROP2_ACCENTS } from './drop2.ts';
import { ENTER_FRAME, HIGHWAY_START, LAUNCH, LOCK, LOG_START } from './intro.ts';
import { OUTRO_ACCENTS } from './outro.ts';
import { heldFrame, partBar, partFrame, partStart, seedFrame } from './film.ts';
import { FRAMES_PER_BAR, barOfFrame } from './tempo.ts';
import { TRANSITION_ACCENTS } from './transition.ts';

/** A punch: the zoom added at its peak. */
export type Punch = { at: number; amount: number };
/** An accent: how white its flash looks on its frame (0–1, mixed in display space), how hard it shakes (1 ≈ 16 px, 0.34°), and — for a drum that stops dead at a cut — where its shake stops with it. */
export type Accent = { at: number; flash: number; shake: number; until?: number; seed?: number };

/**
 * One camera-energy event of a section from break 1.1 on (the break, drop 2, the outro list theirs in src/score/<section>.ts as
 * `<SECTION>_ACCENTS: readonly EnergyAccent[]`). It covers everything the rig does — leave a field out (or 0) for none of it:
 * - `at`: the frame it starts on; a multiple of 3 (the 32nd-note grid). Everything below starts at 0 on `at` and acts after it.
 * - `punch`: the zoom added at the punch's peak, 1.5 frames after `at`; back to exactly nothing at `at + 14` (motion/hit.ts punch()).
 *   Drop 1 uses 0.035–0.09, the build 0.012–0.063; the break sits below both drops, drop 2 above drop 1.
 * - `flash`: how white the frame goes on `at` (0–1, mixed in display space after tone mapping), dying out by `at + 8`. White flashes
 *   are rare — a few special accents a section; other downbeats take a light bump of 0.15–0.25; none where the picture makes its own
 *   flash.
 * - `shake`: how hard the frame shakes: 1 ≈ 16 px and 0.34° at its peak, dying out by `at + 16`; seeded by `at`. Only on big hits,
 *   fills and rolls, never on plain kicks, claps or hats.
 * - `until`: where the shake stops dead (a hard cut that the drums stop on); the rig is continuous everywhere else.
 * - `seed`: the frame the shake is drawn with, when it must keep a draw approved elsewhere (the club's hit keeps v04's: old 1896);
 *   seedFrame(at) when absent.
 * Rules the section's tests audit through tests/lib/energyAudit.ts: on the grid, no edge of the frame ever showing (the rig zooms in as
 * far as its shakes need), no snap but at a declared cut, never exactly still for more than 12 frames together with the shot's own
 * camera, and no punch that fights a move the scene's own camera launches on the same beat.
 */
export type EnergyAccent = { at: number; punch?: number; flash?: number; shake?: number; until?: number; seed?: number };

/** The accents the sections list in their own score files (the transition's, and every section's from break 1.1 on), in film order. */
const SECTION_ACCENTS: readonly EnergyAccent[] = [...TRANSITION_ACCENTS, ...COSMOS_ACCENTS, ...BRIDGE_A_ACCENTS, ...CLUB_ACCENTS, ...BREAK_ACCENTS, ...DROP2_ACCENTS, ...BRIDGE_B_ACCENTS, ...OUTRO_ACCENTS];

const SHAKE_PX = 16;
const SHAKE_ROLL = 0.006;

/**
 * The arc of the build's kick punches (spec §3.1 rules 3 and the energy curve), keyed by film bar: small on swiss bar 1, the biggest on
 * riso bar 4; downbeats × 1.4. The scan bar (swiss 4) keeps only its last kick (4.4: the 4.1 and 4.2 kicks drop out, 4.3 is RETURN's).
 */
const KICK_ARC: Readonly<Record<number, number>> = {
  [partBar('swiss', 1)]: 0.012,
  [partBar('swiss', 2)]: 0.016,
  [partBar('swiss', 3)]: 0.02,
  [partBar('swiss', 4)]: 0.022,
  [partBar('swiss', 5)]: 0.024,
  [partBar('riso', 1)]: 0.028,
  [partBar('riso', 2)]: 0.032,
  [partBar('riso', 3)]: 0.038,
  [partBar('riso', 4)]: 0.045,
};
/** A build kick's arc amount: its bar's; a bar the arc does not list (bars inserted into or between swiss and riso, whose kicks
 *  KICKS generates) holds the last listed bar's before it instead of punching NaN. Retune KICK_ARC when the build grows. */
const kickArc = (at: number): number => {
  let bar = barOfFrame(at);
  while (KICK_ARC[bar] === undefined && bar > partBar('swiss')) bar -= 1;
  return KICK_ARC[bar];
};

export const PUNCHES: readonly Punch[] = [
  // The intro punches only on its sub pulses and its three big hits — not on the RAIN bar's tilt (intro 2.1), a continuous move.
  { at: HIGHWAY_START, amount: 0.03 },
  { at: partFrame('intro', 4), amount: 0.035 },
  { at: ENTER_FRAME, amount: 0.06 },
  { at: LAUNCH, amount: 0.05 },
  { at: LOCK, amount: 0.06 },
  // The kick under the hole (riso 3.1) takes the hole's punch instead of its own, so the two never stack; so does the groove's return
  // after the scan (swiss 4.3).
  ...KICKS.filter((at) => at !== HOLE && at !== RETURN).map((at) => ({ at, amount: kickArc(at) * (at % FRAMES_PER_BAR === 0 ? 1.4 : 1) })),
  { at: RETURN, amount: 0.05 },
  { at: HOLE, amount: 0.07 },
  // The transition's, the cosmos's, the club's and, from break 1.1 on, every section's punches (each section lists its own).
  ...SECTION_ACCENTS.filter((a) => (a.punch ?? 0) > 0).map((a) => ({ at: a.at, amount: a.punch! })),
];

export const ACCENTS: readonly Accent[] = [
  // The intro: a slight lift (no veil) on the title and the typing's bar head; none on the RAIN bar's tilt (a continuous move), the
  // crane's landing on the highway (intro 3.1: the dark highway read a 0.03 lift as a 1.28× veil, gate G12) or the launch (a plain
  // frame); white only on Enter and the lock.
  { at: LOG_START, flash: 0.03, shake: 0 },
  { at: partFrame('intro', 4), flash: 0.03, shake: 0 },
  { at: ENTER_FRAME, flash: 0.8, shake: 1 },
  { at: LAUNCH, flash: 0, shake: 0.5 },
  { at: LOCK, flash: 0.7, shake: 0.8 },
  // The build: a bump where the picture is paper (swiss 2.1, riso 2.1), none on the red hand-offs (swiss 1.1, swiss 3.1), the iris
  // (swiss 4.1), the pull's landing (swiss 5.1) or the print (riso 4.1); white on arriving in the Riso world and through the hole. The
  // groove's return after the scan (swiss 4.3) jolts.
  ...[partFrame('swiss', 2), partFrame('riso', 2), partFrame('riso', 3)].map((at) => ({ at, flash: 0.2, shake: 0 })),
  { at: RETURN, flash: 0, shake: 0.3 },
  { at: partStart('riso'), flash: 0.45, shake: 0 },
  ...FILL.map((at) => ({ at, flash: 0, shake: 0.25 })),
  { at: HOLE, flash: 0.8, shake: 1 },
  ...ROLL.map((at, i) => ({ at, flash: 0, shake: 0.1 + (0.4 * i) / (ROLL.length - 1) })),
  // The transition's, the cosmos's, the club's and, from break 1.1 on, every section's flashes and shakes (each with its seed, if it keeps one).
  ...SECTION_ACCENTS.filter((a) => (a.flash ?? 0) > 0 || (a.shake ?? 0) > 0).map((a): Accent => ({ at: a.at, flash: a.flash ?? 0, shake: a.shake ?? 0, ...(a.until === undefined ? {} : { until: a.until }), ...(a.seed === undefined ? {} : { seed: a.seed }) })),
];

/**
 * The screen-space camera at instant `at`: every punch's zoom, every shake's offset and roll (seeded by the accent's seed, else its seedFrame), zoomed
 * further where needed so no edge shows. In a held tail or a stub, the rig of the frame it holds (heldFrame).
 */
export function rigAt(at: number): View {
  const frame = heldFrame(at);
  let zoom = 1;
  let x = 0;
  let y = 0;
  let roll = 0;
  for (const p of PUNCHES) if (frame > p.at && frame < p.at + 14) zoom += p.amount * punch(frame, p.at);
  for (const a of ACCENTS) {
    if (a.shake <= 0 || frame <= a.at || frame >= a.at + 16 || frame >= (a.until ?? Infinity)) continue;
    const [sx, sy, sr] = shake(frame, a.at, a.seed ?? seedFrame(a.at));
    x += a.shake * SHAKE_PX * sx;
    y += a.shake * SHAKE_PX * sy;
    roll += a.shake * SHAKE_ROLL * sr;
  }
  return covered({ zoom, x, y, roll });
}

/** How white output frame `frame` flashes: the strongest accent's flash. */
export const flashAt = (frame: number): number => ACCENTS.reduce((m, a) => (a.flash > 0 ? Math.max(m, a.flash * flash(frame, a.at)) : m), 0);

/**
 * The film's energy for the Director: the rig, the white flashes and the 字符闪 character flash (src/score/cuts.ts), all left out together by
 * `energy: false`. In the comic club (club 1.1 → its hit) every sub-frame takes its output frame's rig (src/score/club.ts clubRigInstant):
 * punches and shakes print crisp instead of smearing every keyline into a dotted double line; elsewhere, and on the v04 glass beat, the rig
 * of each instant as before (tests/clubRig.test.ts).
 */
export const ENERGY = { view: (at: number): View => rigAt(clubRigInstant(at)), flash: flashAt, glyphs: glyphFlashAt };

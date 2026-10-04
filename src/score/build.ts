// Events of the build: the parts 'swiss' (5 bars) and 'riso' (4 bars) (spec §7 S05–S12, §8 加速 A/B; the bars 1–14 design
// notes/b112/final.md §3.6–3.14, build sheet notes/b114/sheet.md). The picture (src/shots/swiss.ts, src/shots/riso.ts,
// src/transitions/flip.ts) and the music (scripts/audio/sections/build.mjs) read these lists, so every hit lands on the same frame.
// Positions are part-local (src/score/film.ts): `swiss 3.2` is the Swiss part's bar 3, beat 2; `riso 4.4&` the Riso part's last eighth.
//
//   swiss 1  S05  THE LENS: Müller-Brockmann arcs, Saul Bass cut-paper pieces, the lens tracks his eye
//   swiss 2  S06  the split 1 → 4 → 16 → 64, recast, the re-acquire ticks
//   swiss 3  S07a the glass (first 72 frames = v04's swiss 3), the third hit on 3.4 instead of the exit
//   swiss 4  S07b THE SCAN (new): the iris into the antivirus's POV, 12 hops, `0 threats ✓`, the hard cut back, red bar 3, the pull
//   swiss 5  S08  INFECTION: the Warhol wave, the quarantine and revival; T2 on 5.3–5.4 (v04's swiss 4)
//   riso 1–4 S09–S12 as approved; S12's print steps, sky roller and sun rings
import { S08_GRID, S08_HERO } from '../content/build.ts';
import { partEnd, partFrame, partStart } from './film.ts';
import { FRAMES_PER_BEAT } from './tempo.ts';

const BEAT = FRAMES_PER_BEAT; // 24 frames
const EIGHTH = BEAT / 2; // 12
const SIXTEENTH = BEAT / 4; // 6
const THIRTY_SECOND = BEAT / 8; // 3

/** Frames a, a + step, … below b. */
const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
/** The Swiss part's bar `bar` (1-based), plus `beat` beats (0-based). */
const swiss = (bar: number, beat = 0): number => partFrame('swiss', bar, beat);
/** The Riso part's bar `bar` (1-based), plus `beat` beats (0-based). */
const riso = (bar: number, beat = 0): number => partFrame('riso', bar, beat);

/** The build runs from the Swiss part's downbeat (swiss 1.1) to the drop (the end of the Riso part = the transition's 1.1). */
export const BUILD_START = partStart('swiss');
export const BUILD_END = partEnd('riso');
/** The harmony, one chord a bar (music bible §2, the scan bar holding iii): swiss 1–5 IV V iii iii vi, riso 1–4 IV V iii vi. */
export const BUILD_CHORDS = ['IV', 'V', 'iii', 'iii', 'vi', 'IV', 'V', 'iii', 'vi'] as const;

// ——— swiss 4 · S07b: the scan bar's frames (the drums read them) ———————————————————————————————————————————————————————————————

/** IRIS (swiss 4.1): the lens opens into the antivirus's X-ray POV — r 330 → 1250 over 768–774 (launch τ 2); the kick drops out, a shutter click. */
export const IRIS = swiss(4);
/** The lens condenses into the reticle (r 300 → 92 at module column 1) and the readout appears `[SCAN] grid 000/144 · 0 threats`. */
export const RETICLE = { from: IRIS + THIRTY_SECOND, to: IRIS + 2 * THIRTY_SECOND } as const;
/** The 12 hops, one per 32nd from swiss 4.1e (774 … 807): column k's 12 cells stamp `clean ✓` top → bottom over 2 frames; +12 cells a hop. */
export const HOPS: readonly number[] = Array.from({ length: 12 }, (_, k) => IRIS + SIXTEENTH + THIRTY_SECOND * k);
/** The joke beat (swiss 4.2): hop 7 lands dead on him and pings (r 92 → 160 over 8 frames); nothing locks; the clap through the muffle. */
export const PING = swiss(4, 1);
/** `[SCAN] grid 144/144 · 0 threats ✓` (swiss 4.2a): the ✓ stamps, the readout flashes ×2, the two dry C7 beeps. */
export const ZERO_THREATS = swiss(4, 1.75);
/** The hard cut back to colour (swiss 4.3): the groove slams back, the glass dead-on with the red disc behind him (punch 0.05, shake 0.3). */
export const RETURN = swiss(4, 2);
/** The POV muffle (music): an SVF low-pass on the build's music buses, ramped in over 770–776 and snapping open over 815.5–816. */
export const MUFFLE = { in: { from: IRIS + 2, to: IRIS + 8 }, out: { from: RETURN - 0.5, to: RETURN } } as const;
/** The hidden moves under the X-ray (inOutSine, 768–810): the glass turns dead-on and drifts to (60, 0), the poster re-aims his ω there. */
export const XRAY_MOVES = { from: IRIS, to: ZERO_THREATS } as const;
/** The iris opens: the disc's red annulus r 330 → 1250 over 768–774 (launch τ 2: 75 % by 770, out of frame by 774). */
export const IRIS_OPEN = { from: IRIS, to: IRIS + SIXTEENTH } as const;
/** The ping on him: a second ring r 92 → 160, α 1 → 0 over 8 frames. */
export const PING_RING = { from: PING, to: PING + 8 } as const;
/** The ✓ stamps: the readout flashes ×2 (τ 3) and holds through 815. */
export const STAMP = { from: ZERO_THREATS, to: swiss(4, 2) } as const;
/** Alive after the stamp and after the cut (811–851): scanlines crawl, the reticle pulses at column 12, the glass drifts. */
export const LIVING = { from: ZERO_THREATS + 1, to: swiss(4, 3.5) } as const;

// ——— Music (spec §8) ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Four on the floor until riso 4.3, where the 32nd-note snare roll plays on its own — but not on the scan bar's first two beats (768, 792). */
export const KICKS: readonly number[] = steps(BUILD_START, riso(4, 2), BEAT).filter((f) => f !== IRIS && f !== PING);
/** Closed hats on the off-beats (none under the scan, 780 and 804); every sixteenth in riso bar 3, where S11's halftone pulses with them; none under the 32nd roll. */
export const HATS: readonly number[] = [
  ...steps(swiss(1) + EIGHTH, riso(3), BEAT).filter((f) => f !== swiss(4, 0.5) && f !== swiss(4, 1.5)),
  ...steps(riso(3), riso(4), SIXTEENTH),
  ...steps(riso(4) + EIGHTH, riso(4, 2), BEAT),
];
/** Claps on beats 2 and 4 from swiss 3.2 (spec §8) to the end of riso bar 2 — the one on 792 inside the scan's muffle; the snare roll takes over from riso 3.1. */
export const CLAPS: readonly number[] = steps(swiss(3, 1), riso(3), 2 * BEAT);
/** The fill of swiss bar 5: sixteenth-note snares on its last beat, under the end of the flip; the plates converge on them (REGISTER). */
export const FILL: readonly number[] = steps(swiss(5, 3), partEnd('swiss'), SIXTEENTH);
/** The snare roll (spec §8): eighths through riso bar 3, sixteenths on riso 4.1–4.2, 32nds from riso 4.3 to the last half beat. */
export const ROLL: readonly number[] = [
  ...steps(riso(3), riso(4), EIGHTH),
  ...steps(riso(4), riso(4, 2), SIXTEENTH),
  ...steps(riso(4, 2), riso(4, 3.5), THIRTY_SECOND),
];
/** The last half beat of riso bar 4 is silent, apart from a reverse inhale that ends on the drop (spec §8). */
export const SILENCE = { from: riso(4, 3.5), to: BUILD_END } as const;

// Picture (spec §7 S05–S12, §6 T2 and the first half of T3).

// ——— swiss 1 · S05 THE LENS ——————————————————————————————————————————————————————————————————————————————————————————————————————

/** S05: T1's red contracts into the lens on swiss 1.1 (launch 480.5, τ 2.5), landing 142 px from the centre; the drums enter. */
export const DISC_LAND = { from: partStart('swiss'), to: partStart('swiss') + EIGHTH } as const;
/** The Müller-Brockmann arcs print outward, ring k on 482 + 2k (k = 0 … 5): a ripple out of the lens (an aperture click each). Off the 32nd grid on purpose. */
export const ARC_PRINT: readonly number[] = Array.from({ length: 6 }, (_, k) => partStart('swiss') + 2 + 2 * k);
/** S05: one group of grid rules starts drawing on each eighth note after the downbeat (swiss 1.1& to swiss 1.4&). */
export const RULES: readonly number[] = steps(swiss(1) + EIGHTH, swiss(2), EIGHTH);
/** S05: the bold row rule draws on beat 2 (swiss 1.2). */
export const ROW_RULE = swiss(1, 1);
/** The arcs step ±11° on the kicks of beats 2 and 3 (alternate rings turn opposite ways; launch τ 1.5, no bounce): an aperture clicking. */
export const ARC_STEPS: readonly number[] = [swiss(1, 1), swiss(1, 2)];
/** Saul Bass cut paper: his five pieces, each an impact landing exactly on its eighth — ( from the left, • from the top, ω from below, • from the top, ) from the right. */
export const PIECES: readonly number[] = steps(swiss(1, 1), swiss(1, 3.5), EIGHTH);
/** The lens tracks him (swiss 1.4): the disc slides (launch τ 3) onto his right eye; the arcs ride with it and tighten to 92 %. */
export const LENS_TRACK = swiss(1, 3);
/** … and he blinks on the last eighth (swiss 1.4&): he has noticed. */
export const S05_BLINK = swiss(1, 3.5);
/** A7: the signature small print types beside the footer, two characters a frame, 525–539; it leaves with the labels on 648–654. */
export const SIG_SWISS = { from: swiss(1, 1.875), to: swiss(1, 2.5), leave: swiss(2, 3), gone: swiss(2, 3.25) } as const;
/** v04's S05 (BUILD_THREADS.lens off): the protagonist slides in along the row on swiss 1.3 and blinks on 1.4. */
export const SLIDE = { from: swiss(1, 2), to: swiss(1, 2) + EIGHTH } as const;
export const S05_BLINK_V04 = swiss(1, 3);
/** v04's S08 (BUILD_THREADS.infection off), moved with the map: the ripple from swiss 5.1& (0.9 frames a card from his) and the blink wave on 5.2. */
export const RIPPLE_V04 = swiss(5, 0.5);
export const BLINK_WAVE_V04 = swiss(5, 1);

// ——— swiss 2 · S06 SPLIT —————————————————————————————————————————————————————————————————————————————————————————————————————————

/** S06: the grid splits on every beat of swiss bar 2 into 1, 4, 16 and 64 cells. */
export const SPLITS: readonly number[] = steps(swiss(2), swiss(3), BEAT);
/** At each split the faces burst out on the beat, the new ones up to this many frames after the anchor. */
export const SPLIT_STAGGER = 3;
/** Re-acquire: on each split after the first, 4 red L-ticks snap round his oval (launch from 12 px out, 6 frames). */
export const REACQUIRE: readonly number[] = SPLITS.slice(1);
/** S06: on the last eighth (swiss 2.4&) six innocent cells and his print red — the scan's hits, his among them — and S07 cuts in on red. */
export const RED_CELL = swiss(2, 3.5);
/** S06, level 0 (swiss 2.1): the lens swells over him from its 575 position and he reverses out in paper; the arcs blow out over 576–582 … */
export const ARC_BLOWOUT = { from: swiss(2), to: swiss(2) + SIXTEENTH } as const;
/** … and the giant reversed-out face hops on the hat (swiss 2.1&: 2 % squash, 8 px), so S06's first beat never holds still. */
export const S06_HOP = swiss(2, 0.5);

// ——— swiss 3 · S07a GLASS (672–743 = v04 576–647) ——————————————————————————————————————————————————————————————————————————————

/** A red bar sweeps across on the claps: above him on swiss 3.2, below him on 3.4 (both miss), and through him on 4.4 (bent by the glass). */
export const SWEEPS: readonly number[] = [swiss(3, 1), swiss(3, 3), swiss(4, 3)];
/** S07: the glass face turns faster on beat 3 (swiss 3.3). */
export const GLASS_TURN = swiss(3, 2);
/** The third hit (swiss 3.4), where v04 whipped off: a launch (τ 4) of ry −0.45 that turns him back toward us; the truck decelerates (τ 10). */
export const HIT3 = swiss(3, 3);
/** The reverse swell (music) leads the iris by an eighth: the J-cut. */
export const SWELL = { from: swiss(3, 3.5), to: IRIS } as const;
/** The glass's first 72 frames are v04's swiss 3.1–3.4 (frame for frame); from the third hit on it is a continuation: the disc breathes r 300 → 330 into the iris. */
export const GLASS_KEPT = { from: swiss(3), to: HIT3 } as const;
/**
 * v04's truck window: the glass trucked 200 px over swiss 3.1 → 3.4& (84 frames; v04 ran it to its PULL.from, which is now the SCAN
 * bar's pull, a bar later). The glass keeps that slope to HIT3, then decelerates (τ 10): never derive the slope from PULL again.
 */
export const S07_TRUCK = { from: swiss(3), to: swiss(3, 3.5) } as const;
export const DISC_BREATH = { from: HIT3, to: IRIS } as const;

// ——— swiss 4 → 5 · the pull and S08 INFECTION ————————————————————————————————————————————————————————————————————————————————————

/** Red bar 3 sweeps at his height through him (swiss 4.4): clap, sweep, the dispersion shimmer on the 32nds 840–849. */
export const SWEEP3 = swiss(4, 3);
/** The dispersion shimmer as red bar 3 passes through the glass: a bell on each 32nd of 840–849 (A5 C6 E6 G6). */
export const SHIMMER: readonly number[] = steps(SWEEP3, SWEEP3 + EIGHTH, THIRTY_SECOND);
/** The anchored pull (swiss 4.4&): straight back from his ω (60, 0), 40× → 1×, landing square on the poster on swiss 5.1 (strike τ 2.5). */
export const PULL = { from: swiss(4, 3.5), to: swiss(5) } as const;
/** In the pull the "150" whips left and the disc right (launch τ 3), gone by 858 … */
export const PULL_EXIT = { from: PULL.from, to: PULL.from + SIXTEENTH } as const;
/** … and the glass, under 150 px by then, dissolves into his flat card face drawn in the same place over 858–860. */
export const PULL_FADE = { from: PULL_EXIT.to, to: PULL_EXIT.to + 2 } as const;
/** S08: 12 frames to read the crowd before anything happens. */
export const S08_READ = { from: swiss(5), to: swiss(5, 0.5) } as const;
/** S08: the infection steps, one per sixteenth from swiss 5.1& (876 … 906): a card at Manhattan distance d from his card prints on step ⌈d/2⌉. */
export const INFECT: readonly number[] = steps(swiss(5, 0.5), swiss(5, 2), SIXTEENTH);
/** The antivirus strikes back: the red strips fly in from 882 (from 40 px out) and land on swiss 5.2 round the three copies, which go grey. */
export const QUARANTINE = { in: swiss(5, 1) - SIXTEENTH, at: swiss(5, 1) } as const;
/** The three copies go grey (tint → #9A9A96, face → 60 % ink) over 888–892, and the guest's red ring pulses over 888–896 (a 10 px hop). */
export const GREY = { from: QUARANTINE.at, to: QUARANTINE.at + 4 } as const;
export const GUEST_RING = { from: QUARANTINE.at, to: QUARANTINE.at + 8 } as const;
/** Revival (swiss 5.2&): the strips launch away and each grey card reprints as a Four-Marilyns 2×2; the blink wave starts on his card. */
export const REVIVE = swiss(5, 1.5);
/** The strips fly off (110 px along their normals, ±0.15 rad, α → 0) over 900–906. */
export const STRIPS_OUT = { from: REVIVE, to: REVIVE + SIXTEENTH } as const;
/** S08's camera drift: in toward his card to 1.03 over 864–900 (ease out), back to square by the flip (912, inOutSine). */
export const S08_DRIFT = { in: { from: swiss(5), to: REVIVE }, out: { from: REVIVE, to: swiss(5, 2) } } as const;
/** S08: the blink wave across every copy, from his card (REVIVE + 0.7·d; blinkFrame). */
export const BLINK_WAVE = REVIVE;
/** T2: the grid turns over card by card along the diagonal on swiss 5.3–5.4, to the end of the Swiss part. */
export const FLIP = { from: swiss(5, 2), to: partEnd('swiss') } as const;
/** The plates converge into register on the fill's sixteenths: S09 sheet 0's offsets ×4, ×3, ×2, ×1.4, then ×1 on riso 1.1. */
export const REGISTER: readonly number[] = FILL;

/** Manhattan distance of card (col, row) of the S08 poster from his card. */
export const cardDistance = (col: number, row: number): number => Math.abs(col - S08_HERO[0]) + Math.abs(row - S08_HERO[1]);
/** The frame the wave reaches card (col, row): INFECT[⌈d/2⌉ − 1] (his own card: never; it is the source). */
export const infectFrame = (col: number, row: number): number => {
  const d = cardDistance(col, row);
  return d === 0 ? -Infinity : INFECT[Math.min(INFECT.length, Math.ceil(d / 2)) - 1];
};
/** The blink wave reaches card (col, row) at REVIVE + 0.7·d (not on the grid: a ripple). */
export const blinkFrame = (col: number, row: number): number => REVIVE + 0.7 * cardDistance(col, row);
/** The farthest card of the poster is reached on the last step (906): the whole poster is him, but the guest. */
export const WAVE_DONE = infectFrame(0, S08_GRID.rows - 1);

// ——— riso 1–3 · S09 S10 S11 (as approved, frame for frame) ————————————————————————————————————————————————————————————————————

/** S09, a tear-off flipbook: a new face slams down on every beat of riso bar 1 … */
export const SLAMS: readonly number[] = steps(riso(1), riso(2), BEAT);
/** … and on every sixteenth after the first the sheet on top is torn off, toward the side its arp note sounds (left on the even sixteenths, right on the odd). */
export const TEARS: readonly number[] = steps(riso(1) + SIXTEENTH, riso(2), SIXTEENTH);
/** A8: the press slug (the signature) by the bottom-left registration mark, everywhere the marks are in S09. */
export const SLUG = { from: riso(1), to: riso(2) } as const;
/** S10: the camera bursts through an open mouth on every kick of riso bar 2 (the first is S09's last sheet) … */
export const MOUTHS: readonly number[] = steps(riso(2), riso(3), BEAT);
/** … landing on the next face, filling the frame, on each and … */
export const LANDINGS: readonly number[] = MOUTHS.map((m) => m + EIGHTH);
/** … and bursts through the last mouth on riso 3.1, into S11. */
export const HOLE = riso(3);
/** S11: the halftone face changes on every beat of riso bar 3. */
export const FACES: readonly number[] = steps(riso(3), riso(4), BEAT);

// ——— riso 4 · S12 PRINT → SUNRISE ———————————————————————————————————————————————————————————————————————————————————————————————

/** The inversion print on the snare sixteenths (riso 4.1 … 4.1a): proof 1/4 … 4/4, screens 0.75 / 0.45 / 0.18 / 0, each a 2-frame launch with a clack. */
export const PRINT_STEPS: readonly number[] = steps(riso(4), riso(4, 1), SIXTEENTH);
/** S12: the mouth stretches into the horizon, launching on beat 2 (riso 4.2) … */
export const STRETCH = { from: riso(4, 1), to: riso(4, 1.5) } as const;
/** … the sky roller prints a halftone sky top → bottom over 1272–1280 … */
export const SKY_ROLLER = { from: riso(4, 1), to: riso(4, 1) + 9 } as const;
/** … the sea's bands bounce up on the sixteenths from beat 2 … */
export const SEA = { from: riso(4, 1), to: riso(4, 2) } as const;
/** … the eyes slam together into the sun's core (the sea's ω rows step 20 px per sixteenth from here, once per 32nd from riso 4.3) … */
export const MERGED = riso(4, 1.5);
/** … the sun rises in two hits, on beats 3 and 4 (riso 4.3, 4.4), through the snare roll … */
export const SUNRISE = { from: riso(4, 2), to: riso(4, 3) } as const;
/** … a ring of yellow-plate dots launches off the sun's rim on every 32nd (1296 … 1329; no rays) … */
export const SUN_RINGS: readonly number[] = steps(riso(4, 2), riso(4, 3.5), THIRTY_SECOND);
/** … the sky un-prints and the last rings fade, gone by 1331 … */
export const SKY_UNPRINT = { from: riso(4, 3.25), to: riso(4, 3.5) } as const;
/** … and on the last eighth (riso 4.4&) everything is sucked into the sun. */
export const SUCK = { from: riso(4, 3.5), to: BUILD_END } as const;

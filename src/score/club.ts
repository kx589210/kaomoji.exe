// Events of the comic club "INK" (the film part 'club', 6 bars: film bars 23–28 on the 60-bar map), from its build sheet
// (notes/b58/club-sheet.md; design notes/club3/final.md, motion and timing as in the prototype club3/widget.html). Light becomes
// ink: the cosmos's last point is printed as his • eye on club 1.1 and the club is a comic book come alive — the splash page, the page cut
// by BOOM bands into panels, the cat's record as a Busby Berkeley dance floor, MEANWHILE AT THE BAR (the honeypot cocktail, the
// antivirus's lens POV and its LOCK), SPLASH! (the trap springs, the M×Y overprint makes him red, the quarantine stamp, the throw), and
// out of the page into the cracked glass on club 6.4, which stays exactly the approved v04 glass. The picture (src/shots/clubInk*.ts,
// src/scenes/clubInk.ts) and the music (scripts/audio/sections/club.mjs) read these lists, so every hit lands on the same frame.
//
// Positions are club-local through `club(bar, beat)` = partFrame('club', bar, beat): bar 1-based inside the part, beat 0-based and
// fractional (club(2, 2.125) is club bar 2, beat 3 plus a 32nd). Rules (tests/clubScore.test.ts audits them): every exported frame is
// a multiple of 3 (the 32nd-note grid); export only numbers, number arrays, arrays of [from, to] pairs, { from, to } objects and arrays
// of objects whose frame fields are at / from / to / until (sizes, one-frame staggers and seeds go in the shot modules; a seed field
// rides along unaudited). Windows are { from, to } with `to` exclusive. An event on the club's first downbeat is CLUB.from; a window
// that runs to its end runs to CLUB.to. Plain Node loads this file: erasable TypeScript only, no three / remotion / react imports.
//
// Live: the film draws the club with src/scenes/clubInk.ts (src/scenes/index.ts), its camera energy is CLUB_ACCENTS (merged into
// src/score/energy.ts) and its music scripts/audio/sections/club.mjs (wired in bgm.mjs). v04's neon club (src/scenes/club.ts, the club rows
// of src/score/drop1.ts) is retired but kept: its glass is this club's last beat (glassInstant). KX-ClubInk still previews the club alone.
import type { EnergyAccent } from './energy.ts';
import { partEnd, partFrame, partStart, seedFrame } from './film.ts';
import { FRAMES_PER_BEAT } from './tempo.ts';

const BEAT = FRAMES_PER_BEAT; // 24
const EIGHTH = BEAT / 2; // 12
const SIXTEENTH = BEAT / 4; // 6
const THIRTY_SECOND = BEAT / 8; // 3
/** Frames a, a + step, … below b. */
const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);

/** The club's bar `bar` (1-based), beat `beat` (0-based, fractional): partFrame('club', bar, beat). "club 2.3&" is club(2, 2.5). */
export const club = (bar: number, beat = 0): number => partFrame('club', bar, beat);

// ——— Bounds, cuts, shots ——————————————————————————————————————————————————————————————————————————————————————————————————————

/** The club: from the dot inking on club 1.1 (the cosmos's last frame is the point, 1919) to the glass giving way on break 1.1. */
export const CLUB = { from: partStart('club'), to: partEnd('club') } as const;
/** Club 6.4: he hits the glass, the music is cut dead; the approved v04 glass from here (old 1896 + k). */
export const HIT = club(6, 3);
/** The glass silence: only the hit, the cracks and the creak (post bus) until the break's downbeat. */
export const SILENCE = { from: HIT, to: CLUB.to } as const;
/** The glass gives way on the break's downbeat (break 1.1): the break owns it. */
export const SMASH = CLUB.to;

/** Club 4.1, E6: the hard match cut, record r 300 → the cocktail rim r 300 (MEANWHILE, AT THE BAR…). */
export const MATCH_CUP = club(4);
/** Club 5.1, E10: the hard match cut on his face, inset (•ω•) → ε=┌(•ω•)┘ kicking the cocktail (v04's SIDE). */
export const KICK_CUP = club(5);
/**
 * Sub-frames never cross these (each a [from, to) segment): the comic's three takes and the glass. E1 (1919/1920) and E14 (the hit) are
 * part and segment bounds; E2–E5, E7–E9, E11–E13 are continuous inside their segment.
 */
export const SEGMENTS: readonly (readonly [number, number])[] = [
  [CLUB.from, MATCH_CUP],
  [MATCH_CUP, KICK_CUP],
  [KICK_CUP, HIT],
  [HIT, CLUB.to],
];

/** The renderer that draws each instant (src/scenes/clubInk.ts routes sub-frames by these; each a builder's module). */
export const INK_PARTS: readonly { id: 'splash' | 'record' | 'bar' | 'lens' | 'incident' | 'flight' | 'glass'; from: number; to: number }[] = [
  { id: 'splash', from: CLUB.from, to: club(3) }, // K1 + K2: the splash page and THE PAGE (bars 1–2, one world), the inset and the dive
  { id: 'record', from: club(3), to: MATCH_CUP }, // K3: THE RECORD
  { id: 'bar', from: MATCH_CUP, to: club(4, 2) }, // K4: MEANWHILE, AT THE BAR… (the cocktail, the tilt, the two-shot, the crash zoom)
  { id: 'lens', from: club(4, 2), to: KICK_CUP }, // K5: the antivirus POV, the LOCK, the inset
  { id: 'incident', from: KICK_CUP, to: club(5, 2) }, // K6: SPLASH! (kick, splash, lights out, plates, grab)
  { id: 'flight', from: club(5, 2), to: HIT }, // K7: the throw, the stamp, the receding page, the flight
  { id: 'glass', from: HIT, to: CLUB.to }, // K8: the v04 glass (src/shots/glass.ts, re-keyed)
];

/** The shots of the edit (design §4; 1 beat ≤ shot ≤ 2.5 bars, something changes every beat inside each). */
export const INK_SHOTS: readonly { id: string; from: number; to: number }[] = [
  { id: 'K1', from: CLUB.from, to: club(2) }, // splash
  { id: 'K2', from: club(2), to: club(3) }, // page (two panel landings + an inset)
  { id: 'K3', from: club(3), to: MATCH_CUP }, // record
  { id: 'K4', from: MATCH_CUP, to: club(4, 2) }, // bar
  { id: 'K5', from: club(4, 2), to: KICK_CUP }, // lens (+ the inset at the LOCK)
  { id: 'K6', from: KICK_CUP, to: club(5, 2) }, // incident (kick / splash / dark / red: print-state changes in one framing)
  { id: 'K7', from: club(5, 2), to: HIT }, // flight + page
  { id: 'K8', from: HIT, to: CLUB.to }, // glass
];

// ——— Drums (design §8 drum grid) ————————————————————————————————————————————————————————————————————————————————————————————

/** The throw on club 5.3 (v04's FLIP, + 576): the guest swings him up, the stamp prints, he launches at us; no hats after it. */
export const THROW = club(5, 2);
/** A kick on every beat from the dot inking to club 6.3; none on the hit (the music is cut on it). */
export const KICKS: readonly number[] = steps(CLUB.from, HIT, BEAT);
/** The flam of club 2.3: a second kick a 32nd late (BOOM·BOOM), the narrow band that opens the lounge strip. */
export const FLAM = club(2, 2) + THIRTY_SECOND;
/** Clap + snare on beats 2 and 4 (the 2.2 clap doubled, the 2.4 clap a ripple of 8: the music's). */
export const CLAPS: readonly number[] = steps(club(1, 1), HIT, 2 * BEAT);
/** The scratch "wikka-wikka" on club 2.4& takes that open hat's place. */
export const SCRATCH = club(2, 3.5);
/** Open hats on the &s from club 1.1& to 5.2& (none after the throw, as v04), but the scratch's. */
export const OPEN_HATS: readonly number[] = steps(club(1, 0.5), THROW, BEAT).filter((f) => f !== SCRATCH);
/** Club 4.2e → 4.3a: the antivirus's scanner ticks replace the closed hats (one cell of the [SCAN] balloon each). */
export const SCANNER_TICKS: readonly number[] = steps(club(4, 1.25), club(4, 3), SIXTEENTH);
/** Closed hats on every sixteenth from the dot to the throw, but under the scanner ticks. */
export const HATS: readonly number[] = steps(CLUB.from, THROW, SIXTEENTH).filter((f) => f < SCANNER_TICKS[0] || f > SCANNER_TICKS[SCANNER_TICKS.length - 1]);
/** Club 3.4: the snare fill (each hit nudges one ring of the record out and back: ring 3, ring 2, ring 1, the label). */
export const FILL: readonly number[] = steps(club(3, 3), club(4), SIXTEENTH);
/** Club 4.4& and 4.4a: two snare pickups into the kick. */
export const PICKUPS: readonly number[] = [club(4, 3.5), club(4, 3.75)];
/** The ride on the quarters of club bar 3 (the record's peak). */
export const RIDE: readonly number[] = steps(club(3), MATCH_CUP, BEAT);
/** Crashes: the dot inking, the record (+ needle drop), the scan line (light), the throw. */
export const CRASHES: readonly number[] = [CLUB.from, club(3), club(3, 2), THROW];
/** The supersaw stabs on sixteenths 0, 3, 6, 8, 10, 13 of club bars 1–3 (the lit floor's tiles and the record's sectors step on them). */
export const STABS: readonly number[] = [1, 2, 3].flatMap((bar) => [0, 3, 6, 8, 10, 13].map((s) => club(bar, s / 4)));
/** Through the throw (v04's BUILD_KICKS / BUILD_CLAPS, + 576): a kick a beat, claps on club 5.4 and 6.2. */
export const THROW_KICKS: readonly number[] = steps(THROW, HIT, BEAT);
export const THROW_CLAPS: readonly number[] = [club(5, 3), club(6, 1)];
/** The roll into the hit (v04's ROLL, + 576): eighths over club 6.1, sixteenths over 6.2, thirty-seconds over 6.3. */
export const ROLL: readonly number[] = [...steps(club(6), club(6, 1), EIGHTH), ...steps(club(6, 1), club(6, 2), SIXTEENTH), ...steps(club(6, 2), HIT, THIRTY_SECOND)];

// ——— Harmony and arrangement (music bible §2.1, design §8) ————————————————————————————————————————————————————————————————————

/** The chords (F major; the loop IV–V–iii–vi, the harmonic rhythm doubling into the throw and the hit): each from `at`. */
export const CHORDS: readonly { at: number; chord: 'IV' | 'Vsus' | 'V' | 'iii' | 'vi' }[] = [
  { at: CLUB.from, chord: 'IV' }, // B♭maj9
  { at: club(2), chord: 'Vsus' }, // C9sus4
  { at: club(2, 2), chord: 'V' }, // C9
  { at: club(3), chord: 'iii' }, // Am9
  { at: club(4), chord: 'vi' }, // Dm9
  { at: club(5), chord: 'IV' },
  { at: THROW, chord: 'V' },
  { at: club(6), chord: 'iii' },
  { at: club(6, 2), chord: 'vi' },
];
/** The vocal hook sings bars 1–3 (HOOK[3], HOOK[4], PEAK); silent from club 4.1 (the villain lick answers). */
export const HOOK = { from: CLUB.from, to: MATCH_CUP } as const;
/** The 8-bit arp, bars 2–3 (enters on club 2.1). */
export const ARP = { from: club(2), to: MATCH_CUP } as const;
/** Bar 4 is heard from the bar: pad low-passed 9000 → 1800 Hz to club 4.4, then open again by 5.1; hook, stabs, arp out; drums untouched. */
export const DIP = { from: MATCH_CUP, to: KICK_CUP } as const;
export const DIP_OPENS = club(4, 3);
/** Under the lights-out the pad closes to 500 Hz, snapping open on the throw. */
export const PAD_CLOSE = { from: club(5, 1), to: THROW } as const;

// ——— Club bar 1 · SPLASH (K1) ———————————————————————————————————————————————————————————————————————————————————————————————

/** E1: the cosmos's point (0, 0) is printed as his left • eye; a jagged halftone burst inks the frame from it (past the corners by +6 f). */
export const DOT_INKS = CLUB.from;
/** Pink Ben-Day rings born on the sixteenths, r 260 / 440 / 620 / 800 (the screen spreads with the hats). */
export const BENDAY_RINGS: readonly number[] = steps(club(1, 0.25), club(1, 1.25), SIXTEENTH);
/** Club 1.2: the pull-back (L) to the splash, ヽ(•ω•)ノ, the lit floor card-flipping up under him (1 f stagger outward). */
export const PULL_BACK = club(1, 1);
/** Club 1.2&: the infected crowd pops up behind him (2 f stagger from the centre). */
export const CROWD_UP = club(1, 1.5);
/** Club 1.3: the stomp (tile PINK → CYAN), BOOM out of the floor one letter a frame; the focus lines' vanishing point slides to his feet. */
export const STOMP = club(1, 2);
/** Club 1.3e / 1.3& / 1.3a: the corner box slides in; the tagline ribbon; the barcode digits type in (his signature). */
export const CORNER_BOX = club(1, 2.25);
export const TAGLINE = club(1, 2.5);
export const BARCODE = club(1, 2.75);
/** Club 1.4: the disco point (•ω•)ノ, CLAP! in a burst balloon, the floor's cross; he crouches. */
export const DISCO = club(1, 3);
/** The two leaps (L on the &, I-landing on the kick): each lays a light-cycle trail that a BOOM band inks into a gutter (E2, E3). */
export const LEAPS: readonly { from: number; to: number }[] = [
  { from: club(1, 3.5), to: club(2) },
  { from: club(2, 1.5), to: club(2, 2) },
];

// ——— Club bar 2 · THE PAGE (K2) ———————————————————————————————————————————————————————————————————————————————————————————————

/** The BOOM bands stamping down the trails into gutters: P1 (club 2.1), P2 (2.3), and the flam's narrow band that opens the lounge strip. */
export const BANDS: readonly number[] = [club(2), club(2, 2), FLAM];
/** Club 2.1&: her tear swells and trembles (P1, the Lichtenstein panel). */
export const TEAR = club(2, 0.5);
/** Club 2.2: the high five; amber dots crawl along her tear to her mouth. */
export const HIGH_FIVE = club(2, 1);
/** Club 2.4: the fist bump with the flexer; the Kirby krackle bursts. */
export const FIST_BUMP = club(2, 3);
/** The infections land: her ︿ → amber ω on club 2.2& (the same frame he leaps), the flexer's _ → ω on 2.4e. */
export const INFECTIONS: readonly number[] = [club(2, 1.5), club(2, 3.25)];
/** Club 2.3e → 2.3&: a stray ω spark pops out of his ω and ricochets off the guest's sunglasses: the section's first red, ting!. */
export const SPARK = { from: club(2, 2.25), to: club(2, 2.5) } as const;
export const TING = SPARK.to;
/** Club 2.4&: the round inset pops (the cat DJ's record), its border cut by WIKKA-WIKKA; the dive through it lands on club 3.1 (E4, E5). */
export const INSET = SCRATCH;
export const DIVE = { from: INSET, to: club(3) } as const;

// ——— Club bar 3 · THE RECORD (K3) ——————————————————————————————————————————————————————————————————————————————————————————————

/** Club 3.1: the dance floor is the record; Busby Berkeley rings pop up (2 f per ring outward). */
export const RECORD = club(3);
/**
 * The rings jump 1/32 turn on each kick of bar 3 after the needle drop (the DJ's nudge, continuity plan v07 §4 C3: they jumped on the &s,
 * and the & hit as hard as the kick).
 */
export const BERKELEY_STEPS: readonly number[] = KICKS.filter((f) => f > RECORD && f < MATCH_CUP);
/** Club 3.2: every dancer swaps pose; ring 1 turns outward; readout window A types in. */
export const SWAP = club(3, 1);
/** Club 3.3: the flower formation (L, 2 f by ring); the red scan line sweeps top → bottom one beat late, misses him. */
export const FLOWER = club(3, 2);
export const SCAN_SWEEP = { from: club(3, 2), to: club(3, 2.75) } as const;
/** Club 3.4 → 4.1: the rise (I into the match cut), exponential zoom out, the fill nudging the rings. */
export const RISE = { from: club(3, 3), to: MATCH_CUP } as const;

// ——— Club bar 4 · MEANWHILE, AT THE BAR… (K4, K5) ——————————————————————————————————————————————————————————————————————————————

/** Club 4.1 → 4.2: the glass icon tilts from top view to side view as the camera pulls back to the two-shot (E7; the move starts 2 f in). */
export const TILT = { from: MATCH_CUP, to: club(4, 1) } as const;
/** The villain lick (FM bass wah) on club 4.1& and 4.3&: the bar's answer to the hook. */
export const VILLAIN_LICKS: readonly number[] = [club(4, 0.5), club(4, 2.5)];
/** Club 4.2: his sunglasses flip down (scan mode); the [SCAN] thought balloon pops. */
export const SHADES = club(4, 1);
/** Club 4.2& → 4.3: the crash zoom into his left-on-screen lens (E8, I-landing). */
export const CRASH_ZOOM = { from: club(4, 1.5), to: club(4, 2) } as const;
/** Club 4.3: inside the lens (the antivirus POV); the reticle hops on the 16ths and tags carriers. */
export const LENS = club(4, 2);
export const HOPS: readonly number[] = [club(4, 2.25), club(4, 2.5), club(4, 2.75)];
/** Each carrier's red tag shows for a sixteenth from its hop. */
export const CARRIER_TAGS: readonly { from: number; to: number }[] = HOPS.map((f) => ({ from: f, to: f + SIXTEENTH }));
/** Club 4.4: LOCK — the reticle snaps onto him, red hatching floods the lens; the square inset ×4 slams in (I over a 32nd) (E9). */
export const INSET_SLAM = { from: club(4, 2.875), to: club(4, 3) } as const;
export const LOCK = club(4, 3);
/** The lock's three data blips, a 32nd apart. */
export const DATA_BLIPS: readonly number[] = steps(LOCK + THIRTY_SECOND, LOCK + 4 * THIRTY_SECOND, THIRTY_SECOND);
/** Club 4.4&: in the inset his eyes glance right and a "!" pops: he has seen the FREE cocktail ("oh?"). */
export const NOTICE = club(4, 3.5);
/** The [SCAN] balloon from the shades to the cut: a cell a tick, `1 threat` on the LOCK. */
export const SCAN_BALLOON = { from: SHADES, to: KICK_CUP } as const;

// ——— Club bar 5 · SPLASH! (K6, then K7 from the throw) — v04's club bar 3, + 576 ————————————————————————————————————————————————

/** Club 5.1&: SPLASH! — the cocktail lands on the guest's face, his shades fly, the cherry lands on his head. */
export const SPLASH = club(5, 0.5);
/** Club 5.2: freeze + lights out: only eyes; club 5.2e his eyes ignite red. */
export const LIGHTS_OUT = club(5, 1);
export const RED_EYES = club(5, 1.25);
/** The magenta′ and lemon′ plates of (╯°□°)╯ slide in from ∓260 px (I) and register on him as exact #E8402B on the grab. */
export const PLATES = { from: club(5, 1.375), to: club(5, 1.5) } as const;
/** Club 5.2&: the red panel slams in, his arm crosses the gutter and grabs the hero (E12). */
export const GRAB = club(5, 1.5);
/** Club 5.3&: he crosses panel 9's top border; the K line snaps where he passes. */
export const BORDER_SNAP = club(5, 2.5);
/** Club 5.4: the page reads as a whole page; 8 reaction balloons pop 1.5 f apart round the frame (reactionAt). */
export const PAGE = club(5, 3);
/** The whole club, one 3×3 comic page, recedes while he flies out of it at us (E13): gone behind him by CLEAR. */
export const RECEDE = { from: PAGE, to: club(6, 2.75) } as const;
/** Club 6.1 → 6.3: panels 1–9 flick (+15 % tint, 2 f) on the first nine roll hits. */
export const FLICKS: readonly number[] = ROLL.slice(0, 9);
/** From club 6.3a the comic frame is VOID + him + the 15 primary focus lines (+ the readout): the hand-off frame (plates in register on HIT − 1). */
export const CLEAR = RECEDE.to;

/** Reaction balloon `i` (0–7) pops at this instant: 1.5 frames apart from PAGE (a stagger, not a drum: picture and music both read it). */
export const reactionAt = (i: number): number => PAGE + 1.5 * i;

// ——— The readout (the party monitor, threads.md (c)) and the signature (threads.md (b) row 6) ————————————————————————————————————

/** Window A, on the dance floor; window C, from the trap to the glass (typed in over 8 f, fading over the last 4). */
export const READOUT_A = { from: SWAP, to: MATCH_CUP } as const;
export const READOUT_C = { from: LIGHTS_OUT, to: CLUB.to } as const;
/** The warning line under the box, by window: its text is src/content/club.ts READOUT_LINES[line]. Memory jumps to 128 % (red) on the throw. */
export const READOUT_WARNINGS: readonly { from: number; to: number; line: 'cuteness' | 'scanFloor' | 'honeypot' | 'quarantine' | 'fatal'; level: 'warn' | 'err' }[] = [
  { from: READOUT_A.from, to: FLOWER, line: 'cuteness', level: 'warn' },
  { from: FLOWER, to: READOUT_A.to, line: 'scanFloor', level: 'err' },
  { from: READOUT_C.from, to: THROW, line: 'honeypot', level: 'warn' },
  { from: THROW, to: HIT, line: 'quarantine', level: 'err' },
  { from: HIT, to: READOUT_C.to, line: 'fatal', level: 'err' },
];
/** Where his signature hides (E2 80 A2 20 CF 89 20 E2 80 A2, never decoded): the cover's barcode, the cat's record label, the page indicia. */
export const SIGNATURES: readonly { from: number; to: number }[] = [
  { from: BARCODE, to: club(2) },
  { from: INSET, to: MATCH_CUP },
  { from: THROW, to: CLEAR },
];

// ——— Camera energy (design §2.1 and the camera columns of §3) ———————————————————————————————————————————————————————————————

/** A club accent: an EnergyAccent, and the seed its shake is drawn with (default seedFrame(at)). */
export type ClubAccent = EnergyAccent & { seed?: number };
/** The ink grammar's punch on a plain kick (continuity plan v07 §4: the page punches about 2 % on the kick frame). */
const KICK_PUNCH = 0.02;
/** The kicks where the shot's own camera launches (the pull-back, the rise, the match cut's tilt): no punch fights it there. */
export const KICK_PUNCH_SKIP: readonly number[] = [PULL_BACK, RISE.from, MATCH_CUP];
/**
 * The club's camera energy, for src/score/energy.ts once the club goes live (and the KX-ClubInk preview now): a kick punch +3.5 % on bars
 * 1–3 (+4 % on the stomp and the two landings; none on the pull-back or the rise, which the shot's own camera launches), +2 % / +4 % in bar
 * 4, story hits in 5–6; no white flash anywhere (the glass makes its own). The throw shakes harder into the hit, where the drums stop
 * dead: so do their shakes. The hit's shake keeps v04's draw (seeded as old 1896: the glass beat stays the approved frames exactly).
 */
export const CLUB_ACCENTS: readonly ClubAccent[] = [
  { at: CLUB.from, punch: 0.035 },
  { at: STOMP, punch: 0.04 },
  { at: DISCO, punch: 0.035 },
  { at: club(2), punch: 0.04 },
  { at: HIGH_FIVE, punch: 0.035 },
  { at: club(2, 2), punch: 0.04 },
  { at: FIST_BUMP, punch: 0.035 },
  { at: RECORD, punch: 0.035 },
  { at: SWAP, punch: 0.035 },
  { at: FLOWER, punch: 0.035 },
  { at: SHADES, punch: 0.02 },
  { at: LENS, punch: 0.02 },
  { at: LOCK, punch: 0.04 },
  { at: KICK_CUP, punch: 0.06, shake: 0.25 },
  { at: SPLASH, shake: 0.375 },
  { at: THROW, shake: 0.6 },
  ...THROW_KICKS.filter((f) => f > THROW).map((at, i): ClubAccent => ({ at, punch: 0.03 + 0.005 * i })),
  // The roll shakes the frame on every hit, overlapping as v04's did: about 3 px on the eighths, 5 on the sixteenths, 6 → 9 on the 32nds.
  ...ROLL.map((at): ClubAccent => ({ at, shake: at < club(6, 1) ? 0.19 : at < club(6, 2) ? 0.25 : 0.25 + (0.1 * (at - club(6, 2))) / (HIT - THIRTY_SECOND - club(6, 2)), until: HIT })),
  { at: HIT, punch: 0.07, shake: 1, seed: seedFrame(SMASH) - BEAT },
  // Continuity plan v07 §4 (the ink grammar's kick: the page punches on every beat): a baseline punch on every kick no story accent above
  // already punches, so no kick of the club passes unseen (with the page's drop, src/shots/clubInkKit.ts PRINT_BUMP) — but where the
  // shot's own camera launches on the kick (the pull-back, the rise, the match cut's tilt: KICK_PUNCH_SKIP).
  ...KICKS.filter((k) => k < THROW && !KICK_PUNCH_SKIP.includes(k)).map((at): ClubAccent => ({ at, punch: KICK_PUNCH })),
].filter((a, i, all) => !(a.punch === KICK_PUNCH && a.shake === undefined && all.findIndex((b) => b.at === a.at) !== i));

/**
 * The instant the camera rig (CLUB_ACCENTS' punches and shakes) is taken at for sub-frame instant `at` (build sheet §10.2, review R2-4:
 * the rig never blurs in the club). From club 1.1 to the hit, its output frame's (frameOf: what a draft shows): the pipeline samples each
 * sub-frame through the rig of its own instant, so a punch or a shake smeared the whole frame across the shutter and the comic pass printed
 * every K keyline as a dotted double line for 3–4 frames after each kick and clap. From the hit on, the instant itself: the v04 glass beat
 * keeps v04's motion-blurred hit shake. Used by both energy views: src/score/energy.ts ENERGY (view: (at) => rigAt(clubRigInstant(at))) and
 * src/shots/clubInk.ts INK_ENERGY (view: (at) => inkRigAt(clubRigInstant(at))); tests/clubRig.test.ts measures it.
 * Continuity plan v07 §4 (the club's beat-lock): the rig is taken RIG_LEAD frames ahead of the output frame. A punch (motion/hit.ts) is
 * nothing on its own frame and lands 1.5 frames after it, so every punch of the club landed a frame after its kick (the picture's accent
 * on f + 1). Taken a frame ahead, each punch and shake is on its drum's own frame (89 % of the punch there: an impact) — the kicks are seen
 * where they are heard. The frame before the hit takes the hit's instant (the roll's shakes stop there, as on the hit: the hand-off frame
 * holds still for the cut to the glass).
 */
const RIG_LEAD = 1;
export const clubRigInstant = (at: number): number => (at >= CLUB.from && at < HIT ? Math.min(HIT, Math.floor(at + 0.5) + RIG_LEAD) : at);

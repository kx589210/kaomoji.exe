// The comic club's sound, the part 'club' (6 bars, club 1.1 → break 1.1), from its build sheet (notes/b58/club-sheet.md §11; the
// music bible notes/prep/music.md §1, §2.1, §3, §4.4–4.5, §5 S3, §6, §7) and the frames of src/score/club.ts, so every hit lands on
// the picture's frame (an event on frame f starts on sample f / 60 s × sr: f × 800 at 48 kHz). Positions below are club bar.beat.
//   Drop 1's groove continued: 150 BPM, F major, the loop IV · Vsus→V · iii · vi · IV→V (the throw) · iii→vi (6.3), no tonic; drop 1's
//   drums, the saturated sub, the pluck bass on the &s, the formant vocal-chop hook — HOOK[3], HOOK[4] from drop 1's table, then PEAK, its
//   ceiling G6 — and the 8-bit arp from club 2.1.
//   No chord is held behind the club (since 2026-10-03; a sustained chord bed reads as noise). Drop 1's
//   supersaw pad (7 saws × 7 notes from club 1.1 to the hit, ducked by every kick, holding the master limiter 3–5 dB down through all six
//   bars) and its 35-saw stabs are gone. The chords are carried by the club's own short voices, each on something drawn: a house piano
//   stab on every STABS frame (the lit floor's tiles and the record's grooves step on them), a horn section on the lettered words — BOOM
//   out of the floor, the two BOOM bands, SPLASH! (falling off), the throw (ripping up on C9) — and one horn blip per letter of BRRR,
//   flutter-tonguing up the roll, that swells on Dm9 from CLEAR into the hit (where the master limiter must stand where it stood, so the
//   glass sounds as it did: HIT_SWELL).
//   Every comic gag is the sound of a lettered word or a drawn action, on its frame, and replaces rather than adds: the ink thwack and the
//   sung IV as the dot inks (a tier-2 hit: ink, not fire), the tiles' ratchet, the crowd's pops on the chord, the 808 BOOM tuned to the
//   root, the leaps' zips and paper cuts, the BOOM bands' stamps, the high five's slap, the infection plinks (one chord tone more per
//   generation), the ricochet "ting!" off the guest's shades, the clap ripple, the cat DJ scratching the hook's own last note in place of
//   the open hat, the dive, the needle drop, the ride and bells of the record, the antivirus's scan a beat late on C.
//   Bar 4 is heard from the bar (hook / piano / arp / pluck rest, what still rings of the floor muffled across the match cut, the drums
//   untouched) while the antivirus answers in its own dry voice: the villain lick on vi, the bloops, the shades' click, the scanner ticks
//   climbing C6 → F♯6 in place of the hats, the crash zoom, the lock; "oh?" as he sees the FREE cocktail.
//   Bars 5–6 are v04's club 3–4 moved to the throw on club 5.3 (its kick, clink, splash, lights out, power-down, grab, throw whoosh, "waa",
//   roll and riser), with the comic's own: the pow, the splat and its droplets, the zzt of his red eyes, the plates converging, the red
//   growl, the arm stretching on the haul and the whip round the loop (the throw as src/shots/clubInkB.ts stages it), the QUARANTINE
//   stamp, the border snapping, the reaction pops, the page's fwips, the horns' BRRR.
//   Club 6.4, the hit: every voice ends on its frame (the club's own buses, truncated with a 1.5 ms fade; bgm.mjs gates the mix too) and
//   v04's glass plays on the post bus with v04's code and seeds (the hit, the cracks, the creak; the glass giving way on break 1.1).
// Tier A words (BOOM, the BOOM bands, SPLASH!) are the bar's loudest after the kick: the bed — every bus but the drums, the sub and the
// words' own — ducks under each (TIER_A, as break.mjs's EGG_DUCKS). The antivirus's sounds are dry and narrow (clDry), the virus's wet.
// bgm.mjs reads the hooks below (CUTS, SILENCES, SENDS, PREVIEWS, finish); clubMix.mjs mixes the club alone for its preview.
// Seeds 7000–7999 (the glass keeps drop 1's 2970–2999); event kinds cl… (the glass keeps d1crack and d1shatter).
import { hash } from '../../../src/engine/random.ts';
import * as C from '../../../src/score/club.ts';
import { partBar } from '../../../src/score/film.ts';
import { FPS, FRAMES_PER_BEAT } from '../../../src/score/tempo.ts';
import { SWING, throwPose } from '../../../src/shots/clubInkB.ts';
import { chirp, plip, tink, zip } from '../breakVoices.mjs';
import { armStretch, bloopRoom, growl, hornHit, housePiano, inkThwack, lockChirp, needleBump, needleDrop, paperCut, paperSlap, printThwack, ride, scratch, splat, stampChunk, travellingWhoosh, villainLick, whip } from '../clubVoices.mjs';
import { sweep } from '../drop2Voices.mjs';
import { blip, clap, click, hat, impact, kick, pop, press, riser, snare } from '../drums.mjs';
import { SVF } from '../filters.mjs';
import { fmBell } from '../fm.mjs';
import { WHOOSH_PEAK, crash, reverseCymbal, spark, whoosh } from '../fx.mjs';
import { addMono, duck, panGains, pingPong, stereo, truncate } from '../mix.mjs';
import { ting } from '../outroVoices.mjs';
import { pluckBass, pulseArp } from '../synth.mjs';
import { voxChop } from '../vox.mjs';
import { HOOK, VOICINGS } from './drop1.mjs';

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
/** A picture x (screen px at 1080p, origin at the centre) as a pan (the bible's x / 960 × 0.9). */
const px = (x) => (x / 960) * 0.9;
const club = C.club;
const SIXTEENTH = FRAMES_PER_BEAT / 4;
/**
 * The air over club bars 1–2 (club 1.2 → 3.1, the 16ths and the open hats; club 1.1's beat stays the tier-2 hit): × drop 1's hat gains. The comic's first bar has
 * no arp and a lighter downbeat (a tier-2 hit), and its bars sat 0.3–0.5 dB under riso 4 above 2 kHz; drop 1 stays brighter there than the
 * build's end (tests/drop1Audio.test.mjs: club 1–2 at −23.43 / −23.19 dB against riso 4's −22.59, limit −23.59, on the day it went live).
 */
export const HAT_AIR = 1.25;
export const OPEN_AIR = 1.5;
/**
 * … and club bar 1's further still (beats 2–4, × both): it has no arp yet, so its hats carry the halftone's air alone. Its margin over that
 * limit was 0.16 dB, measured against riso 4, which is being reworked; this buys about 0.6 dB of it (club 1 −22.84 above 2 kHz, round 1 of
 * the fixes), and leaves club 1.1's beat — the tier-2 hit — as it was. M2 took the pad's top octaves out of the bar (about 0.5 dB less
 * above 2 kHz); 1.4 (was 1.25) gives the bar's hats — the 'tss' it draws — part of it back.
 */
export const BAR1_AIR = 1.4;
/** The throw's three sounds of its own (U2's staging, T11): the arm stretching on the haul, the whip round the loop, and the throw whoosh,
 * now 14 frames (from just after the grab, peaking on the throw) so the haul and the loop are heard under it, not v04's 30. */
const STRETCH_GAIN = 0.22;
const WHIP_GAIN = 0.3;
const THROW_WHOOSH = { frames: 14, gain: 0.2 };
/** A stand-in glyph advance: throwPose reads none from the grab to the release (only the follow-through's shoulder does). */
const ADV = (ch) => (ch.charCodeAt(0) > 0x2000 ? 1 : 0.6);
/** The guest's fist on screen at instant g of the throw (px from the centre, y up), and its speed there (px a frame). */
const fist = (g) => throwPose(g, ADV).hand;
const fistSpeed = (g) => {
  const [a, b] = [fist(g - 0.02), fist(g + 0.02)];
  return Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.04;
};

/** The hook's top row, club bar 3 (the record's peak): [sixteenth, MIDI, sixteenths]; its ceiling G6 (club sheet §11). */
export const PEAK = [[0, 84, 1], [1, 88, 1], [2, 91, 2], [4, 88, 1], [5, 86, 1], [6, 84, 2], [8, 83, 3], [11, 84, 1], [12, 88, 4]];
/** The hook by club bar 1–3: HOOK[3] and HOOK[4] (drop 1's shared table, never retyped), then PEAK. */
export const HOOK_ROWS = [HOOK[3], HOOK[4], PEAK];
/** The roots in the sub (B♭1, C2, A1, D2), by chord. */
export const ROOT = { IV: 34, Vsus: 36, V: 36, iii: 33, vi: 38 };

/** The chord sounding at `frame` (the score's CHORDS; before the club, its first). */
export const chordAt = (frame) => {
  let name = C.CHORDS[0].chord;
  for (const c of C.CHORDS) if (frame >= c.at) name = c.chord;
  return name;
};

/**
 * The hook's notes, club bars 1–3 (the score's HOOK window): { frame, bar (club bar), midi, len (frames) }. The picture's head-bob reads
 * the same rows (sheet §3.1). HOOK[4]'s last note falls on the scratch (club 2.4&): the cat DJ scratches it instead of the voice singing it.
 */
export function hookNotes() {
  return HOOK_ROWS.flatMap((row, k) => row.map(([s, m, l]) => ({ frame: club(k + 1) + s * SIXTEENTH, bar: k + 1, midi: m, len: l * SIXTEENTH })));
}

/** The music stops dead on the hit: the plate reverb restarts there, so no tail of the club rings under the glass. */
export const CUTS = [C.HIT];
/** The glass silence (sheet §5.2, bible S3): the mix gated from the hit to the break's downbeat; the glass plays through it on the post bus. */
export const SILENCES = [{ from: C.HIT, to: C.SMASH }];
/**
 * The club's own buses and their reverb sends (bible §6.2's amounts). clDry: the antivirus (the scan, the villain lick, the ticks, the lock,
 * the shades, the zzt, the growl, the ting): dry and narrow (M9). clEgg: the Tier A words (their horn hits too), kept apart so the bed can
 * duck under them. With no chord held, the pad (clPad, 0.25) and the supersaw stabs (clStab, 0.3) are gone; the piano and the horns that carry
 * the chords were made nearly dry (0.12, the cosmos's stabs'), since a plate tail on every stab is the held chord again.
 * Continuity plan v07 (§2.3, FW4: the same room across the line): with that the club was a dry, narrow island between two wide glass
 * worlds (−18.6 dB side/mid on club bar 1 against the cosmos's −15.3). The piano and the brass get a room again — clPiano 0.22, and the
 * horns on the words and the throw on their own bus clBrass at 0.2 (out of the bed's ducks, as clEgg) — still short, no chord held. The
 * BRRR and the swell into the hit stay on clHorn at 0.12: the master limiter at the hit is held where the old club left it (HIT_SWELL), and
 * the glass after it must not move. clGlass (the cosmos's glass send, 0.32) carries the cosmos's tinks into club bar 1 (CARRY_TINKS).
 */
export const SENDS = { clDrums: 0.08, clPiano: 0.22, clHorn: 0.12, clArp: 0.3, clVox: 0.4, clBell: 0.55, clFx: 0.22, clEgg: 0.15, clBass: 0, clSub: 0, clDry: 0.04, clBrass: 0.2, clGlass: 0.32 };
/** Previews of the club's two joins (bgm.mjs writes public/audio/sections/<id>.wav): the dot inking (cosmos 6 → club 2) and the glass (club 6 → break 1). */
export const PREVIEWS = [
  { id: 'ink', fromBar: partBar('cosmos', 6), toBar: partBar('club', 2) },
  { id: 'glass', fromBar: partBar('club', 6), toBar: partBar('break', 1) },
];
/** Nothing to edit in the finished mix: the cut is made in the club's own buses, the glass is on the post bus. */
export function finish() {}

/**
 * The Tier A words (bible §4.5 rule 3, sheet §3.1): the bed (every club bus but clDrums, clSub and clEgg) ducks under each by `depthDb`,
 * reaching it over `leadMs` before the word's frame, holding `holdMs`, back over `releaseMs`.
 */
export const TIER_A = [
  { kind: 'clboom', at: C.STOMP, depthDb: 5, leadMs: 3, holdMs: 50, releaseMs: 50 },
  { kind: 'clband', at: C.BANDS[0], depthDb: 4, leadMs: 3, holdMs: 40, releaseMs: 40 },
  { kind: 'clband', at: C.BANDS[1], depthDb: 4, leadMs: 3, holdMs: 40, releaseMs: 40 },
  { kind: 'clsplash', at: C.SPLASH, depthDb: 5, leadMs: 3, holdMs: 60, releaseMs: 50 },
];
const NOT_BED = ['clDrums', 'clSub', 'clEgg', 'clBrass'];
/**
 * The club's level into the master (every club bus; the glass on the post bus is not touched). M2 took the pad — about as loud as the
 * drums — out of the mix, and the club's voices carry its loudness now: the club keeps its place in the film (the old club's −10.5 LUFS,
 * bars 1–3 at the top; louder than the quieter new cosmos, as it was; the interlude 3 LU under drop 1: tests/breakAudio.test.mjs), so an
 * A/B compares the music at one level.
 */
export const LEVEL_DB = 1.6;
/**
 * Club 1.1, the dot inking, is a tier-2 hit (bible §4.4, M11): under the cosmos's Big Bang by ≥ 0.3 LU — its kick, crash, impact, sung
 * chord and first piano stab lighter than the cosmos's 1.1 (ink, not fire).
 */
const DOWNBEAT = { kick: 0.6, crash: 0.2, impact: 0.1, chord: 0.12, piano: 0.6 / 10 ** (4 / 20) };
/** The sung IV on the dot, its four notes spread ±SUNG_SPREAD (was ±0.3): the club's first beat as wide as the cosmos it leaves (plan v07 §2.3). */
export const SUNG_SPREAD = 0.6;
/**
 * Bar 4 (heard from the bar): what still rings of the floor across the match cut (the hook's echoes, the last piano and arp notes, the
 * rise's bells) dips this far and is low-passed to 1800 Hz until "oh?" (the vox) or club 5.1 (the rest): the room changes on the cut.
 */
export const ROOM_DIP_DB = 8;
/** … and the sub dips with the bar (the villain lick carries the low end there), so the bar sits 2 LU under the club, the drums untouched. */
export const SUB_DIP_DB = 14;
/**
 * The house piano on STABS (club bars 1–3, six a bar: the lit floor's tiles and the record's groove sectors step on them): the chord's
 * voicing (drop 1's VOICINGS, C4–B♭4) with its top doubled an octave up, `frames` long, then the damper (`releaseMs`); the first, on the
 * dot, lighter (DOWNBEAT: the tier-2 hit keeps the level it had).
 * Continuity plan v07 §4 (the club's beat-lock): the stabs were heard as texture, 6–10 dB under the drums on the off-kick 16ths the floor
 * steps on. They are 4 dB up (0.24 → 0.38) with a hard 2 ms click on each attack (`click`), and the off-kick ones (16ths 3, 10 and 13 of
 * the bar: OFF_KICK_PAN) are panned apart, so the 3-3-2 the floor shows is heard.
 */
export const PIANO = { gain: 0.24 * 10 ** (4 / 20), frames: 4, releaseMs: 45, decay: 0.5, bright: 1.12, click: 1, seed: 7600 };
/** The off-kick stabs' pans, by sixteenth of the bar (the others centred). */
export const OFF_KICK_PAN = { 3: -0.35, 10: 0.35, 13: -0.35 };
/**
 * The print's thwack on every clap (plan v07 §4: the picture's colour plate slips 12 px off the key on 2 and 4; this is its sound): a
 * paper slap on a 150 Hz thud, 40 ms, `gain` (6 dB under the clap), panned the way the plate slips (alternating clap to clap).
 */
export const THWACK = { gain: 0.48, tone: 1900, pan: 0.25, seed: 7700 };
/** The 8-bit arp pumps on every kick (plan v07 §4): ducked `depthDb` and back over `releaseMs`, so the 16th bed leaves the kick air. */
export const ARP_PUMP = { depthDb: 3.5, attackMs: 2, releaseMs: 150 };
/** The DJ's nudge on each kick of the record (club 3.2 – 3.4; 3.1 is the needle drop): the needle bumped, `gain`. */
export const NEEDLE_BUMP = { gain: 0.13, seed: 7710 };
/**
 * The cosmos's glass carried through club bar 1 (plan v07 §2.3, FW3): its tuned tinks (FALL's voice, sections/cosmos.mjs GLASS) ring on
 * past the dot — one on each Ben-Day ring the picture prints (club 1.1e → 1.2: FALL's own A6 F6 D6 B♭5 down B♭maj9), then on the e and a
 * 16ths as the cosmos's band blinks were, 3 dB softer every beat — while the club's own closed hats fade in from −9 dB (HAT_FADE_IN).
 */
export const CARRY_TINKS = (() => {
  const out = [];
  const ring = [93, 89, 86, 82];
  C.BENDAY_RINGS.forEach((f, k) => out.push({ at: f, midi: ring[k], pan: (k % 2 ? 1 : -1) * (0.25 + 0.1 * k), soft: false }));
  const ea = [89, 86, 89, 86, 82, 81];
  [1, 2, 3].flatMap((b) => [club(1, b + 0.25), club(1, b + 0.75)]).forEach((f, k) => out.push({ at: f, midi: ea[k], pan: (k % 2 ? 1 : -1) * (0.3 + 0.05 * k), soft: true }));
  return out.map((t) => ({ ...t, gain: 0.2 * (t.soft ? 0.75 : 1) * 10 ** ((-3 * Math.floor((t.at - C.CLUB.from) / FRAMES_PER_BEAT)) / 20), decayMs: t.soft ? 300 : 600 }));
})();
/** Club bar 1's closed hats fade in under the carried glass: −9 dB on its first beat, −6, −3, then full from club 1.4. */
export const hatFadeIn = (f) => (f >= C.CLUB.from && f < club(2) ? 10 ** (Math.min(0, -9 + 3 * Math.floor((f - C.CLUB.from) / FRAMES_PER_BEAT)) / 20) : 1);
/**
 * The horn section (the comic's brass) on the lettered words that are the bar's loudest after the kick — BOOM out of the floor, the two
 * BOOM bands, SPLASH! — and on the throw: the chord's root two octaves over the sub plus its voicing an octave up (B♭3 C5 D5 F5 A5 for IV),
 * a short blat; SPLASH! falls off (the cherry lands on his head: (・_・)) and is gone as the lights go out, the throw rips up a minor
 * third on C9 (he is flung at us).
 */
export const HORNS = [
  { at: C.STOMP, frames: 6, gain: 0.4, fall: 0, seed: 7640 },
  { at: C.BANDS[0], frames: 5, gain: 0.34, fall: 0, seed: 7641 },
  { at: C.BANDS[1], frames: 5, gain: 0.34, fall: 0, seed: 7642 },
  { at: C.SPLASH, frames: 4, gain: 0.4, fall: 5, release: 130, seed: 7643 },
  { at: C.THROW, frames: 14, gain: 0.45, fall: -3, release: 200, seed: 7644 },
];
/** The reaction balloons' piano run up C9 (club 5.4, REACTIONS): a note a balloon, `frames` before the damper. */
export const RUN = { gain: 0.1, frames: 18, decay: 0.6, seed: 7620 };
/** The horns' notes for the chord sounding at `frame`: its root two octaves over the sub's, then its voicing an octave up. */
export const hornNotes = (frame) => {
  const name = chordAt(frame);
  return [ROOT[name] + 24, ...VOICINGS[name].map((m) => m + 12)];
};
/**
 * BRRR (club bar 6): one horn blip per ROLL hit while the letters are stamped (to CLEAR, where the page and its BRRR are swallowed) — Am9,
 * then Dm9 from club 6.3 — each blip leaving two frames or more before the next (a 32nd's blip is one frame and its 20 ms release:
 * flutter-tonguing), growing from `from` to `to` of `gain` up the roll; then the horns hold Dm9 from CLEAR into the hit, swelling, cut
 * dead there with every other voice.
 */
export const BRRR = { gain: 0.7, from: 0.5, to: 1, seed: 7650 };
/**
 * The swell into the hit (CLEAR → HIT, Dm9, from `from` of `gain` to full). The master limiter (bgm.mjs) sees the club's last frames and
 * is still recovering from them when the glass cracks on the post bus, so v04's glass is heard through that recovery: the old club's pad
 * held it 3.29 dB down at the hit (0.8 dB at +100 ms, 0.02 dB at the smash). The swell's gain is set so the limiter stands exactly where
 * it stood: in the film mix of 2026-10-03 its gain at the hit is the old club's to 1e-6 dB, and bgm.wav from the hit on is the old one's
 * but for two samples of the glass silence (1 LSB each, by +127 ms); FALL from break 1.1 on is byte for byte the same. Anything changed
 * in the club's last bars moves this (tests/clubAudio.test.mjs holds it to 0.003 dB on the club alone); nothing else is a gain to hold
 * the limiter.
 */
/**
 * v08 (bridge A built): the plate's modulation clock now runs through the bridge's bar before the club (bgm.mjs plateClock held it while
 * the bridge was a stub), so the club's reverb is the same sound but not the same samples, and at 0.516977 the limiter stood 0.29 dB
 * higher over the glass. Re-calibrated in the film's mix as before (a search on the 0–10 ms window; every window within 0.001 dB of
 * OLD_GLASS_GAIN, tests/clubAudio.test.mjs): 0.5702, +0.86 dB on the swell. Were the plate's clock held through bridge A instead (an
 * integrator's choice in bgm.mjs), 0.516977 would hold again.
 */
export const HIT_SWELL = { gain: 0.5702, from: 0.2, seed: 7670 };
/**
 * The club's width (plan v07 FW4: the club was a narrow island between two wide glass worlds): the claps' two layers, the roll's snares
 * (alternating) and the BRRR's and the swell's horn section spread across the field (hornHit spread; its default 0.5).
 */
export const WIDTH = { claps: [-0.3, 0.35], roll: 0.45, brrr: 0.75, horns: 0.8, hats: [-0.4, 0.45], open: 0.35 };

/**
 * The hook leads, as it does through the cosmos (sections/cosmos.mjs HOOK_NOTE_DB, HOOK_MAX_BOOST_DB, HOOK_LIFT_DB — the same numbers, so
 * the hook's level carries across the seam; tests/clubAudio.test.mjs holds them equal). Its chops sing through fixed soprano formants,
 * so a note's level hangs on its vowel and pitch; each note is sung at one dry level (noteDb, at most maxBoostDb up) and the hook is lifted
 * liftDb. Under the old pad the club's hook sat about 20 LU under the drums; the sung chord on 1.1, "oh?" and "waa" keep their levels.
 */
export const HOOK_LEVEL = { noteDb: -26, maxBoostDb: 18, liftDb: 8 };
/** The vowels the hook cycles through, and where drop 1's hook stood when it reached HOOK[3] (so HOOK[3] sings the vowels it did in v04). */
const VOWEL_CYCLE = ['a', 'i', 'u', 'e', 'o'];
const VOWEL_START = HOOK[0].length + HOOK[1].length + HOOK[2].length;
/** The 8-bit arp's pattern over the chord's four voices, and its duty cycles. */
const ARP_PATTERN = [0, 1, 2, 3, 2, 1, 3, 1];
const ARP_DUTY = [0.125, 0.25, 0.5, 0.25];
/** The crowd's pops (club 1.2&), centre outward: B♭maj9's tones rising (F5 A5 C6 D6 F6). */
const CROWD_NOTES = [77, 81, 84, 86, 89];
/** The reaction balloons (club 5.4), at their screen spots (sheet §3.6), popping up C9's chord tones (E5 G5 B♭5 C6 D6 E6 G6 B♭6). */
const REACTIONS = [[-600, 76], [-60, 79], [480, 82], [-640, 84], [820, 86], [-700, 88], [800, 91], [780, 94]];

/**
 * Renders the club into `stems` at `sr`: its own buses (SENDS; created if missing) and the post bus (the glass). `origin`: the film frame
 * of the stems' first sample (0 for the film; a later frame renders a slice, as the preview and the tests do). Returns every event as
 * { kind, at } (at: the film sample of the event's frame — a whoosh's is its peak, a reversed sound's the frame it swells into, a paper
 * cut's and the whip's the frame each is cut on). `solo(kind, frame)` picks which sounds are rendered (the tests render them one at a
 * time); the bus edits (the Tier A ducks unless `ducks` is false, the cut on the hit) always run.
 */
export function renderClub(stems, sr, { origin = 0, solo = () => true, ducks = true } = {}) {
  const at = (frame) => Math.round((frame / FPS) * sr);
  const n = (stems.post ?? stems.clDrums ?? { L: stems.sub }).L.length;
  stems.post ??= stereo(n);
  for (const name of Object.keys(SENDS)) stems[name] ??= stereo(n);
  // The club's own buffers start on club 1.1 and run to the break (every music voice ends on the hit); the post bus runs on past the
  // glass giving way. `shift` is where their first sample lies in the stems.
  const base = at(C.CLUB.from);
  const len = at(C.SMASH) - base;
  const shift = base - at(origin);
  const lo = (frame) => at(frame) - base;
  const frameAt = (i) => C.CLUB.from + (i * FPS) / sr;
  const own = Object.fromEntries(Object.keys(SENDS).map((k) => [k, stereo(len)]));
  const post = stereo(len + Math.round(0.7 * sr));
  const events = [];
  const mark = (kind, frame) => {
    if (!solo(kind, frame)) return false;
    events.push({ kind, at: at(frame) });
    return true;
  };
  /** Whether to render the sound (kind, frame) — or a further layer `as` of an event already marked — marking the event. */
  const take = (kind, as, frame) => (as ? solo(as, frame) : mark(kind, frame));
  /** One mono voice: `draw(buf)` writes it from 0; it starts on `start` (frame) and is the event (kind, frame), or a layer of one (`as`). */
  const place = (bus, frame, dur, draw, { kind, as, pan = 0, start = frame } = {}) => {
    if (!take(kind, as, frame)) return;
    const buf = new Float32Array(Math.round(dur * sr));
    draw(buf);
    addMono(bus, buf, { at: at(start) - base, pan });
  };
  /** One stereo voice `frames` long: `draw(L, R, m)` writes it from 0 (a sound that travels across the field); otherwise as place. */
  const placeStereo = (bus, frame, frames, draw, { kind, as, start = frame } = {}) => {
    if (!take(kind, as, frame)) return;
    const m = Math.round((frames / FPS) * sr);
    const L = new Float32Array(m);
    const R = new Float32Array(m);
    draw(L, R, m);
    const s = at(start) - base;
    for (let i = Math.max(0, -s); i < Math.min(m, len - s); i++) {
      bus.L[s + i] += L[i];
      bus.R[s + i] += R[i];
    }
  };
  /** A whoosh whose loudest point lands on `peak`. */
  const swoosh = (bus, peak, frames, o, opts) => place(bus, peak, frames / FPS, (b) => whoosh(b, 0, b.length, sr, o), { ...opts, start: peak - WHOOSH_PEAK * frames });
  /** A reversed cymbal swelling from `from` into `to` (the event is `to`). */
  const swell = (bus, from, to, gain, seed) => place(bus, to, (to - from) / FPS, (b) => reverseCymbal(b, b.length, b.length, sr, { gain, seed }), { kind: 'clrevcym', start: from });
  const B = own;
  const kicks = [...C.KICKS, C.FLAM].sort((a, b) => a - b);

  // ——— Drums: four on the floor from the dot to club 6.3, clap + snare on 2 and 4, open hats on the &s, 16th hats to the throw ———————
  C.KICKS.forEach((f, i) => place(B.clDrums, f, 1, (b) => kick(b, 0, sr, { gain: f === C.CLUB.from ? DOWNBEAT.kick : f === C.THROW ? 0.72 : 0.5, f0: 210, f1: 45, pitchMs: 38, decayMs: 260 }, 7000 + i), { kind: 'clkick' }));
  place(B.clDrums, C.FLAM, 1, (b) => kick(b, 0, sr, { gain: 0.4, f0: 210, f1: 45, pitchMs: 38, decayMs: 200 }, 7030), { kind: 'clflamkick' });
  C.CLAPS.forEach((f, i) => {
    place(B.clDrums, f, 0.8, (b) => snare(b, 0, sr, { gain: 0.36, tone: 220, decayMs: 150 }, 7040 + i), { kind: 'clsnare' });
    if (f === C.FIST_BUMP) return; // the ripple claps it (below)
    place(B.clDrums, f, 0.6, (b) => clap(b, 0, sr, { gain: 0.62, tone: 1600 }, 7060 + i), { as: 'clsnare', pan: WIDTH.claps[0] });
    place(B.clDrums, f, 0.6, (b) => clap(b, 0, sr, { gain: 0.45, tone: 1900 }, 7080 + i), { as: 'clsnare', pan: WIDTH.claps[1], start: f + 0.15 });
  });
  // The high five's CLAP!: the clap doubled 3 and 8 ms after it, spread.
  place(B.clDrums, C.HIGH_FIVE, 0.6, (b) => {
    clap(b, Math.round(0.003 * sr), sr, { gain: 0.34, tone: 1750 }, 7100);
  }, { kind: 'clclapdouble', pan: -0.35 });
  place(B.clDrums, C.HIGH_FIVE, 0.6, (b) => clap(b, Math.round(0.008 * sr), sr, { gain: 0.26, tone: 2050 }, 7101), { as: 'clclapdouble', pan: 0.35 });
  // The fist bump's ripple: 8 claps 25 ms apart circling the stereo field, dying away.
  for (let k = 0; k < 8; k++) {
    place(B.clDrums, C.FIST_BUMP, 0.6, (b) => clap(b, Math.round(0.025 * k * sr), sr, { gain: 0.6 * 0.86 ** k, tone: 1600 + 60 * k, tailMs: 70 }, 7102 + k), { kind: k ? undefined : 'clripple', as: k ? 'clripple' : undefined, pan: 0.8 * Math.sin((2 * Math.PI * k) / 8) });
  }
  // The 16ths and the open hats a little brighter over club bars 1–2 than drop 1's (HAT_AIR, OPEN_AIR); club 1.1's beat is untouched.
  C.HATS.forEach((f, i) => {
    const s = Math.round((f - C.CLUB.from) / SIXTEENTH) % 4;
    const air = f >= club(1, 1) && f < club(3) ? HAT_AIR * (f < club(2) ? BAR1_AIR : 1) : 1;
    // Club bar 1's fade in under the cosmos's carried glass (hatFadeIn).
    place(B.clDrums, f, 0.25, (b) => hat(b, 0, sr, { gain: hatFadeIn(f) * air * (s === 2 ? 0.25 : s % 2 ? 0.16 : 0.2), decayMs: 34, cutoff: 9000 }, 7120 + i), { kind: 'clhat', pan: s % 2 ? WIDTH.hats[1] : WIDTH.hats[0] });
  });
  // The cosmos's glass carried through club bar 1 (CARRY_TINKS): FALL's tinks on the Ben-Day rings, then on the e and a, fading.
  CARRY_TINKS.forEach((t, k) => place(B.clGlass, t.at, 0.1 + (5 * t.decayMs) / 3000, (b) => tink(b, 0, sr, { freq: midi(t.midi), gain: t.gain, decayMs: t.decayMs, seed: 7720 + k }), { kind: 'clcarrytink', pan: t.pan }));
  // The print's thwack on every clap (THWACK): the colour plate slipping off the key, heard; panned the way it slips.
  C.CLAPS.forEach((f, i) => place(B.clDrums, f, 0.05, (b) => printThwack(b, 0, sr, { gain: THWACK.gain, tone: THWACK.tone + 120 * (i % 3), seed: THWACK.seed + i }), { kind: 'clthwack', pan: (i % 2 ? -1 : 1) * THWACK.pan }));
  // The DJ's nudge on the record's kicks (3.2 – 3.4; 3.1 is the needle drop): the needle bumped.
  C.KICKS.filter((f) => f > C.RECORD && f < C.MATCH_CUP).forEach((f, i) => place(B.clFx, f, 0.06, (b) => needleBump(b, 0, sr, { gain: NEEDLE_BUMP.gain, seed: NEEDLE_BUMP.seed + i }), { kind: 'clneedlebump', pan: -0.1 }));
  C.OPEN_HATS.forEach((f, i) => place(B.clDrums, f, 0.6, (b) => hat(b, 0, sr, { gain: 0.22 * (f >= club(1, 1) && f < club(3) ? OPEN_AIR * (f < club(2) ? BAR1_AIR : 1) : 1), decayMs: 140, cutoff: 7500 }, 7220 + i), { kind: 'clopenhat', pan: i % 2 ? -WIDTH.open : WIDTH.open }));
  C.RIDE.forEach((f, i) => place(B.clDrums, f, 1.3, (b) => ride(b, 0, sr, { gain: 0.1, bell: midi(100), seed: 7260 + i }), { kind: 'clride', pan: 0.3 }));
  C.FILL.forEach((f, i) => place(B.clDrums, f, 0.5, (b) => snare(b, 0, sr, { gain: 0.16 + 0.07 * i, tone: 240 + 15 * i, decayMs: 90 }, 7270 + i), { kind: 'clfill', pan: -0.2 + 0.13 * i }));
  C.PICKUPS.forEach((f, i) => place(B.clDrums, f, 0.5, (b) => snare(b, 0, sr, { gain: 0.2 + 0.08 * i, tone: 250 + 15 * i, decayMs: 80 }, 7280 + i), { kind: 'clpickup', pan: i ? 0.12 : -0.12 }));
  C.ROLL.forEach((f, i) => place(B.clDrums, f, 0.4, (b) => snare(b, 0, sr, { gain: 0.14 + (0.3 * i) / C.ROLL.length, tone: 230 + 9 * i, decayMs: 80 }, 7290 + i), { kind: 'clroll', pan: i % 2 ? WIDTH.roll : -WIDTH.roll }));
  // Crashes: the dot inking (under the cosmos's own), the record, the flower (light), the throw (v04's).
  const CRASH = { [C.CLUB.from]: [DOWNBEAT.crash, 1.6], [club(3)]: [0.24, 1.4], [club(3, 2)]: [0.13, 1.0], [C.THROW]: [0.36, 1.8] };
  C.CRASHES.forEach((f, i) => place(B.clDrums, f, 4 * CRASH[f][1], (b) => crash(b, 0, sr, { gain: CRASH[f][0], decay: CRASH[f][1] }, 7310 + i), { kind: 'clcrash', pan: i % 2 ? 0.25 : -0.25 }));

  // ——— Harmony on short voices (no chord held): the piano on STABS, the horns on the words and the BRRR, the sub, the pluck,
  // the arp. Nothing rings past its event but the sub (the roots, ducked by every kick). ——————————————————————————————————————————
  /** Bar 4's room: open; closing to 1800 Hz on the match cut (a 16th) and opening again into club 5.1 (the floor's tails, below). */
  const roomCutoff = (f) => {
    if (f >= C.DIP.from && f < C.DIP_OPENS) return 1800 + 7200 * Math.exp(-(f - C.DIP.from) / 2);
    if (f >= C.DIP_OPENS && f < C.DIP.to) return 1800 * 5 ** ((f - C.DIP_OPENS) / (C.DIP.to - C.DIP_OPENS));
    return 9000;
  };
  /** A bus's level through bar 4: down `db` (in over the match cut's 16th, back up into club 5.1 as the room opens). */
  const dipLevel = (f, db) => {
    if (f < C.DIP.from || f >= C.DIP.to) return 1;
    const down = 10 ** (-db / 20);
    if (f < C.DIP_OPENS) return down + (1 - down) * Math.exp(-(f - C.DIP.from) / 2);
    return down * (1 / down) ** ((f - C.DIP_OPENS) / (C.DIP.to - C.DIP_OPENS));
  };
  // The house piano on every STABS frame (bars 1–3): the voicing and its top an octave up, a short stab, the damper down.
  C.STABS.forEach((f, k) => {
    if (!mark('clstab', f)) return;
    const v = VOICINGS[chordAt(f)];
    const sixteenth = Math.round(((f - C.CLUB.from) % (4 * FRAMES_PER_BEAT)) / SIXTEENTH);
    housePiano(B.clPiano.L, B.clPiano.R, lo(f), sr, {
      notes: [...v, v[3] + 12],
      len: lo(f + PIANO.frames) - lo(f),
      gain: PIANO.gain * (f === C.CLUB.from ? DOWNBEAT.piano : 1),
      bright: PIANO.bright,
      decay: PIANO.decay,
      releaseMs: PIANO.releaseMs,
      click: PIANO.click,
      pan: OFF_KICK_PAN[sixteenth] ?? 0,
      seed: PIANO.seed + k,
    });
  });
  // The horns on the words and on the throw, on their own bus (clBrass: out of the bed's ducks, as the words' clEgg; the brass's room).
  HORNS.forEach((h) => {
    if (!mark('clhorn', h.at)) return;
    const bus = B.clBrass;
    hornHit(bus.L, bus.R, lo(h.at), sr, { notes: hornNotes(h.at), len: lo(h.at + h.frames) - lo(h.at), gain: h.gain, fall: h.fall, releaseMs: h.release ?? 60, spread: WIDTH.horns, seed: h.seed });
  });
  // BRRR: a blip a letter up the roll, to CLEAR; then the swell on Dm9 into the hit.
  const letters = C.ROLL.filter((f) => f < C.CLEAR);
  letters.forEach((f, k) => {
    if (!mark('clbrrr', f)) return;
    const next = k + 1 < letters.length ? letters[k + 1] : C.CLEAR;
    const frames = Math.max(1, Math.min(4, next - f - 2));
    const u = k / (letters.length - 1);
    hornHit(B.clHorn.L, B.clHorn.R, lo(f), sr, {
      notes: hornNotes(f), len: lo(f + frames) - lo(f), gain: BRRR.gain * (BRRR.from + (BRRR.to - BRRR.from) * u),
      attackMs: 6, body: 0.6, decayMs: 40, releaseMs: 20, scoop: 0.3, spread: WIDTH.brrr, seed: BRRR.seed + k,
    });
  });
  if (mark('clswell', C.CLEAR)) {
    hornHit(B.clHorn.L, B.clHorn.R, lo(C.CLEAR), sr, { notes: hornNotes(C.CLEAR), len: lo(C.HIT) - lo(C.CLEAR), gain: HIT_SWELL.gain, swell: HIT_SWELL.from, attackMs: 8, scoop: 0.2, spread: WIDTH.brrr, seed: HIT_SWELL.seed });
  }
  // The sub: the root held, saturated a little (heard on small speakers), ducked by every kick and stepping aside for the 808's BOOM.
  if (mark('clsub', C.CLUB.from)) {
    const g = duck(len, kicks.map(lo), sr, { depth: 0.85, attackMs: 2, releaseMs: 120 });
    // Out of the 808's way: down to 3 % over 2 ms on the stomp, held while it rings (230 ms), back over 120 ms.
    const [o, hold, back] = [lo(C.STOMP), Math.round(0.23 * sr), Math.round(0.12 * sr)];
    const boom = (i) => {
      const k = i - o;
      if (k < 0 || k >= hold + back) return 1;
      if (k >= hold) return 0.03 + 0.97 * (0.5 - 0.5 * Math.cos((Math.PI * (k - hold)) / back));
      return 1 - 0.97 * Math.min(1, k / (0.002 * sr));
    };
    let ph = 0;
    for (let i = 0; i < lo(C.HIT); i++) {
      ph += midi(ROOT[chordAt(frameAt(i))]) / sr;
      const v = 0.27 * Math.min(1, i / (0.004 * sr)) * Math.tanh(1.4 * Math.sin(2 * Math.PI * ph)) * Math.min(g[i], boom(i)) * dipLevel(frameAt(i), SUB_DIP_DB);
      B.clSub.L[i] += v;
      B.clSub.R[i] += v;
    }
  }
  // The pluck bass on the &s, an octave above the sub; it rests in bar 4, where the villain lick plays.
  const plucks = C.OPEN_HATS.filter((f) => (f < C.DIP.from || f >= C.DIP.to) && mark('clpluck', f)).map((f) => ({ at: lo(f), len: lo(f + 9) - lo(f), freq: midi(ROOT[chordAt(f)] + 12) }));
  if (plucks.length) {
    const pb = new Float32Array(len);
    pluckBass(pb, plucks, sr, { gain: 0.22, bright: 2200 });
    addMono(B.clBass, pb);
  }
  // The 8-bit arp, club 2.1 → 4.1: sixteenths over the chord two octaves up, alternating sides.
  if (mark('clarp', C.ARP.from)) {
    const arp = [[], []];
    for (let f = C.ARP.from, k = 0; f < C.ARP.to; f += SIXTEENTH, k++) {
      const v = VOICINGS[chordAt(f)];
      arp[k % 2].push({ at: lo(f), len: lo(f + 4) - lo(f), freq: midi(v[ARP_PATTERN[k % 8]] + 24), duty: ARP_DUTY[k % 4] });
    }
    arp.forEach((list, side) => {
      const buf = new Float32Array(len);
      pulseArp(buf, list, sr, { gain: 0.08, cutoff: () => 9000 });
      addMono(B.clArp, buf, { pan: side ? 0.45 : -0.45 });
    });
    // It pumps on every kick (ARP_PUMP): the 16th bed leaves the kick its air.
    const pump = duck(len, kicks.map(lo), sr, { depth: 1 - 10 ** (-ARP_PUMP.depthDb / 20), attackMs: ARP_PUMP.attackMs, releaseMs: ARP_PUMP.releaseMs });
    for (let i = 0; i < len; i++) {
      B.clArp.L[i] *= pump[i];
      B.clArp.R[i] *= pump[i];
    }
  }

  // ——— The voice: the sung IV as the dot inks, the hook (HOOK[3], HOOK[4], PEAK), "oh?", "waa" — wet, with drop 1's ping-pong ———————
  const vox = stereo(len);
  const lead = stereo(len);
  /** A chop into `into`; with `norm` (dB), sung at that dry RMS over its length (boosted at most HOOK.maxBoostDb: the cosmos's leveling). */
  const sing = (frame, o, pan = 0, into = vox, norm = null) => {
    const b = new Float32Array(o.len + Math.round(sr / 10));
    voxChop(b, 0, sr, o);
    const g = norm === null ? 1 : Math.min(10 ** (HOOK_LEVEL.maxBoostDb / 20), 10 ** (norm / 20) / (Math.sqrt(b.subarray(0, o.len).reduce((q, x) => q + x * x, 0) / o.len) || 1e-12));
    addMono(into, b, { at: lo(frame), pan, gain: g });
  };
  // Spread wide (SUNG_SPREAD, plan v07 §2.3): the dot inks in the cosmos's width, not mono.
  if (mark('clsungchord', C.DOT_INKS)) VOICINGS.IV.forEach((m, k) => sing(C.DOT_INKS, { freq: midi(m + 12), len: at(20), vowel: 'a', to: 'o', gain: DOWNBEAT.chord, seed: 7400 + k }, SUNG_SPREAD * (-1 + (2 * k) / 3)));
  hookNotes().forEach((h, k) => {
    const v = VOWEL_START + k;
    const o = { freq: midi(h.midi), vowel: VOWEL_CYCLE[v % 5], to: VOWEL_CYCLE[(v + 2) % 5], seed: 7330 + k };
    if (h.frame === C.SCRATCH) {
      // The cat DJ scratches the note the hook would sing here (wikka-wikka), on the scratch's own "ahh": the record pulled back over the
      // first 16th (it smears back 1.5 turns), pushed forward over the second, landing on the needle drop of club 3.1; in place of 2.4&'s
      // open hat.
      if (!mark('clscratch', h.frame)) return;
      const src = new Float32Array(Math.round(0.6 * sr));
      voxChop(src, 0, sr, { ...o, vowel: 'a', to: 'a', len: Math.round(0.5 * sr), glide: 0, gain: 1 });
      const ms = (SIXTEENTH / FPS) * 1000;
      place(B.clFx, h.frame, (2 * ms) / 1000 + 0.01, (b) => scratch(b, 0, sr, { src, moves: [{ from: 0.24, to: 0.07, ms }, { from: 0.07, to: 0.34, ms }], gain: 0.9, gapMs: 12, seed: 7406 }), { as: 'clscratch', pan: px(260) });
      return;
    }
    if (!mark('clhook', h.frame)) return;
    sing(h.frame, { ...o, len: Math.round((h.len * 0.95 * sr) / FPS), glide: h.len >= 3 * SIXTEENTH ? 1 : 0, gain: 0.3 }, (hash(v, 61) - 0.5) * 0.2, lead, HOOK_LEVEL.noteDb);
  });
  if (mark('cloh', C.NOTICE)) sing(C.NOTICE, { freq: midi(76), len: at(10), vowel: 'o', to: 'a', glide: 3, gain: 0.5, seed: 7404 }, px(-200));
  if (mark('clwaa', C.THROW)) sing(C.THROW, { freq: midi(74), len: at(30), vowel: 'o', to: 'a', glide: 7, gain: 0.3, seed: 7405 });
  pingPong(vox, sr, { time: 0.3, feedback: 0.3, mix: 0.28 });
  pingPong(lead, sr, { time: 0.3, feedback: 0.3, mix: 0.28 });
  const lift = 10 ** (HOOK_LEVEL.liftDb / 20);
  for (let i = 0; i < len; i++) {
    B.clVox.L[i] += vox.L[i] + lift * lead.L[i];
    B.clVox.R[i] += vox.R[i] + lift * lead.R[i];
  }

  // ——— Club 1 · SPLASH ————————————————————————————————————————————————————————————————————————————————————————————————————————
  // The dot inks: an impact (under the cosmos's), the dot's pop with v04's ignite blip, the ink's thwack.
  place(B.clFx, C.DOT_INKS, 1.6, (b) => impact(b, 0, sr, { gain: DOWNBEAT.impact }, 7410), { kind: 'climpact' });
  place(B.clFx, C.DOT_INKS, 0.2, (b) => {
    pop(b, 0, sr, { freq: 1400, gain: 0.13 });
    blip(b, 0, sr, { gain: 0.09, freq: 2637, ms: 40 });
    inkThwack(b, 0, sr, { gain: 0.3, seed: 7411 });
  }, { kind: 'cldot' });
  // The lit floor card-flips up from the centre outward, a frame a column: a ratchet of clicks rising, panned to the tiles.
  for (let k = 0; k <= 4; k++) {
    for (const side of k ? [-1, 1] : [0]) {
      place(B.clFx, C.PULL_BACK + k, 0.05, (b) => click(b, 0, sr, { gain: 0.07, tone: 1800 + 380 * k }, 7500 + 2 * k + (side > 0 ? 1 : 0)), { kind: 'clratchet', pan: 0.148 * k * side, start: C.PULL_BACK + k + (side > 0 ? 0.12 : 0) });
    }
  }
  // The infected crowd pops up from the centre outward, 2 frames apart: B♭maj9's tones rising, quiet.
  for (let k = 0; k <= 4; k++) {
    for (const side of k ? [-1, 1] : [0]) {
      place(B.clFx, C.CROWD_UP + 2 * k, 0.08, (b) => pop(b, 0, sr, { freq: midi(CROWD_NOTES[k]), gain: 0.03 }), { kind: 'clcrowdpop', pan: 0.139 * k * side, start: C.CROWD_UP + 2 * k + (side > 0 ? 0.1 : 0) });
    }
  }
  // The stomp: BOOM out of the floor — an 808 on the bar's root (B♭1), the sub stepping aside, the bed ducking (Tier A).
  place(B.clEgg, C.STOMP, 1.3, (b) => kick(b, 0, sr, { gain: 0.5, f0: 90, f1: midi(ROOT.IV), pitchMs: 30, decayMs: 300 }, 7419), { kind: 'clboom' });
  place(B.clFx, C.CORNER_BOX, 0.06, (b) => paperSlap(b, 0, sr, { gain: 0.12, tone: 2200, seed: 7423 }), { kind: 'clpaper', pan: px(-720) });
  // The tagline ribbon slides in from the left, its swish peaking as it lands.
  placeStereo(B.clFx, C.TAGLINE, 10, (L, R, m) => travellingWhoosh(L, R, 0, m, sr, { from: 900, to: 5200, gain: 0.08, q: 1.4, panFrom: -1, panTo: px(-560), seed: 7424 }), { kind: 'clribbon', start: C.TAGLINE - WHOOSH_PEAK * 10 });
  // The leaps: a zip (a saw 400 → 1600 Hz) as he launches; a paper cut swelling into the landing (the J of E2, E3); the landing's thup and
  // the BOOM band stamped down the trail one letter a frame (Tier A).
  C.LEAPS.forEach((l, i) => {
    place(B.clFx, l.from, 0.25, (b) => sweep(b, 0, sr, { from: 400, to: 1600, ms: 200, wave: 'saw', gain: 0.04, decayMs: 110 }), { kind: 'clzip', pan: 0.35 });
    place(B.clFx, l.to, 4 / FPS, (b) => paperCut(b, b.length, b.length, sr, { gain: 0.1, seed: 7425 + i }), { kind: 'clshk', pan: 0.25, start: l.to - 4 });
    place(B.clEgg, l.to, 0.4, (b) => kick(b, 0, sr, { gain: 0.36, f0: 190, f1: 120, pitchMs: 10, decayMs: 70 }, 7427 + i), { kind: 'clthup' });
    place(B.clEgg, l.to, 0.15, (b) => {
      for (let k = 0; k < 4; k++) paperSlap(b, Math.round((k / FPS) * sr), sr, { gain: 0.18 - 0.025 * k, tone: 900 + 250 * k, seed: 7429 + 4 * i + k });
    }, { kind: 'clband', pan: 0.15 });
  });

  // ——— Club 2 · THE PAGE ————————————————————————————————————————————————————————————————————————————————————————————————————————
  place(B.clFx, C.HIGH_FIVE, 0.06, (b) => paperSlap(b, 0, sr, { gain: 0.35, tone: 2500, seed: 7440 }), { kind: 'clslap', pan: 0.1 });
  // The infections: a plink on a chord tone, one more per generation (M7): D6 over C9sus4, then E6 + B♭6 over C9.
  [[86], [88, 94]].forEach((notes, g) => place(B.clBell, C.INFECTIONS[g], 2.6, (b) => notes.forEach((m) => fmBell(b, 0, sr, { freq: midi(m), gain: 0.075 / Math.sqrt(notes.length), decay: 0.5, index: 3 })), { kind: 'clplink', pan: g ? 0.3 : 0.45 }));
  // The ricochet: the stray ω spark pops out of his ω, flies over the flexer and pings off the guest's shades — ting! (C8, the antivirus's
  // pitch class), a zap and the "pyeww" of it bouncing away: dry, hard right.
  place(B.clFx, C.SPARK.from, 0.08, (b) => pop(b, 0, sr, { freq: midi(89), gain: 0.04 }), { kind: 'clspark', pan: 0 });
  place(B.clDry, C.TING, 0.6, (b) => {
    ting(b, 0, sr, { freq: 4186, gain: 0.2, decay: 0.1 });
    spark(b, 0, sr, { gain: 0.05, tone: 6000 }, 7442);
    sweep(b, Math.round(0.03 * sr), sr, { from: 3800, to: 1300, ms: 230, gain: 0.025, decayMs: 140, vibrato: { hz: 38, semitones: 0.25 } });
  }, { kind: 'clting', pan: 0.85 });
  // Into the record: the reverse cymbal from the fist bump, the dive's whoosh and the WIKKA letters rushing past the frame's edges.
  swell(B.clFx, C.FIST_BUMP, C.RECORD, 0.22, 7443);
  swoosh(B.clFx, C.RECORD, 16, { from: 300, to: 4200, gain: 0.18, q: 1.2, seed: 7444 }, { kind: 'cldive' });
  [6, 8, 10, 12].forEach((d, k) => swoosh(B.clFx, C.DIVE.from + d, 5, { from: 1500, to: 6000, gain: 0.06, q: 1.6, seed: 7445 + k }, { kind: 'clletter', pan: [0.75, -0.6, -0.8, 0.55][k] }));

  // ——— Club 3 · THE RECORD ———————————————————————————————————————————————————————————————————————————————————————————————————————
  place(B.clFx, C.RECORD, 0.2, (b) => needleDrop(b, 0, sr, { gain: 0.22, seed: 7449 }), { kind: 'clneedle' });
  /** A bell glissando up Am9 (C6 E6 G6 B6, 3 frames apart): the dancers swapping, the rise. The flower blooms on A6 C7 E7, a frame apart. */
  const gliss = (frame, notes, step, gain, decay) => notes.forEach((m, k) => place(B.clBell, frame, 2 * decay + 0.2, (b) => fmBell(b, Math.round(((step * k) / FPS) * sr), sr, { freq: midi(m), gain, decay, index: 2.2 }), { kind: k ? undefined : 'clbells', as: k ? 'clbells' : undefined, pan: -0.45 + (0.9 * k) / (notes.length - 1) }));
  gliss(C.SWAP, [84, 88, 91, 95], 3, 0.06, 0.7);
  gliss(C.FLOWER, [93, 96, 100], 1, 0.045, 0.9);
  gliss(C.RISE.from, [84, 88, 91, 95], 3, 0.06, 0.7);
  // The antivirus's scan, a beat late: a dry sine sweeping C4 → C6 over the sweep, travelling left → right; it passes over him and nothing happens.
  placeStereo(B.clDry, C.SCAN_SWEEP.from, C.SCAN_SWEEP.to - C.SCAN_SWEEP.from, (L, R, m) => {
    let ph = 0;
    for (let i = 0; i < m; i++) {
      const u = i / m;
      ph += (midi(60) * 4 ** u) / sr;
      const env = Math.min(1, i / (0.003 * sr)) * Math.min(1, (m - i) / (0.004 * sr));
      const [l, r] = panGains(-0.6 + 1.2 * u);
      const v = 0.05 * env * Math.sin(2 * Math.PI * ph);
      L[i] += v * l;
      R[i] += v * r;
    }
  }, { kind: 'clscan' });
  // The rise: a whoosh peaking on the match cut, a reverse cymbal into it.
  swoosh(B.clFx, C.MATCH_CUP, 34, { from: 200, to: 6000, gain: 0.2, q: 1.1, seed: 7451 }, { kind: 'clrise' });
  swell(B.clFx, C.RISE.from, C.MATCH_CUP, 0.24, 7452);

  // ——— Club 4 · MEANWHILE, AT THE BAR… (the room's dip is below) ———————————————————————————————————————————————————————————————
  mark('cldip', C.DIP.from);
  // The cocktail: a bloop with the kick (E5 → E4, in Dm9), the caption's thunk; the shades: a bloop, a click, the balloon's pop.
  place(B.clFx, C.MATCH_CUP, 0.2, (b) => bloopRoom(b, 0, sr, { from: midi(76), to: midi(64), ms: 120, gain: 0.12 }), { kind: 'clbloop' });
  place(B.clFx, C.SHADES, 0.2, (b) => bloopRoom(b, 0, sr, { from: midi(76), to: midi(64), ms: 120, gain: 0.1 }), { kind: 'clbloop', pan: px(-90) });
  place(B.clFx, C.MATCH_CUP, 0.15, (b) => press(b, 0, sr, { gain: 0.18 }, 7453), { kind: 'clthunk', pan: px(-560) });
  place(B.clDry, C.SHADES, 0.06, (b) => {
    blip(b, 0, sr, { gain: 0.08, freq: 900, ms: 18 });
    click(b, 0, sr, { gain: 0.12, tone: 6500 }, 7454);
  }, { kind: 'clshades', pan: px(400) });
  place(B.clFx, C.SCAN_BALLOON.from, 0.08, (b) => pop(b, 0, sr, { freq: 1200, gain: 0.05 }), { kind: 'clballoon', pan: px(640) });
  // The villain lick: D3 → A2, then A2 → D2 (vi's root and fifth), a 16th a note.
  const lickLen = Math.round((SIXTEENTH / FPS) * sr);
  [[50, 45], [45, 38]].forEach(([a, b2], k) => place(B.clDry, C.VILLAIN_LICKS[k], 0.25, (b) => villainLick(b, 0, sr, { notes: [[a, lickLen], [b2, lickLen]], gain: 0.28 }), { kind: 'cllick' }));
  // The scanner ticks: square, 15 ms, climbing chromatically C6 → F♯6 (the Defender's chromatic exception), at the balloon, then at the
  // reticle inside the lens; each hop echoes 40 ms later.
  C.SCANNER_TICKS.forEach((f, k) => place(B.clDry, f, 0.08, (b) => {
    chirp(b, 0, sr, { from: midi(84 + k), ms: 15, wave: 'square', gain: 0.07, attackMs: 0.5, releaseMs: 2 });
    if (C.HOPS.includes(f)) chirp(b, Math.round(0.04 * sr), sr, { from: midi(84 + k), ms: 15, wave: 'square', gain: 0.03, attackMs: 0.5, releaseMs: 2 });
  }, { kind: 'cltick', pan: f < C.LENS ? px(640) : px(300) }));
  // The crash zoom into his lens: a whoosh travelling from the lens to the centre, peaking as we land inside it.
  placeStereo(B.clFx, C.CRASH_ZOOM.to, 16, (L, R, m) => travellingWhoosh(L, R, 0, m, sr, { from: 400, to: 8000, gain: 0.2, q: 1.2, panFrom: px(345), panTo: 0, seed: 7455 }), { kind: 'clzoom', start: C.CRASH_ZOOM.to - WHOOSH_PEAK * 16 });
  place(B.clDry, C.LOCK, 0.2, (b) => lockChirp(b, 0, sr, { gain: 0.1, seed: 7456 }), { kind: 'cllock', pan: px(-230) });
  C.DATA_BLIPS.forEach((f) => place(B.clDry, f, 0.03, (b) => blip(b, 0, sr, { gain: 0.03, freq: midi(103), ms: 12 }), { kind: 'clblip', pan: px(-200) }));
  swell(B.clFx, C.LOCK, C.KICK_CUP, 0.2, 7457);

  // ——— Club 5 · SPLASH! (v04's club 3, + the comic's) —————————————————————————————————————————————————————————————————————————————
  place(B.clBell, C.KICK_CUP, 1.2, (b) => {
    // v04's clink, raised 5 dB: CLINK! is a Tier B word (within 6 dB of the bed in its band).
    fmBell(b, 0, sr, { freq: 2637, gain: 0.16, decay: 0.5, index: 3.5 });
    fmBell(b, Math.round(0.03 * sr), sr, { freq: 3520, gain: 0.09, decay: 0.4, index: 2.5 });
  }, { kind: 'clclink', pan: px(215) });
  place(B.clFx, C.KICK_CUP, 0.4, (b) => kick(b, 0, sr, { gain: 0.3, f0: 120, f1: 60, pitchMs: 25, decayMs: 90 }, 7460), { kind: 'clpow' });
  swoosh(B.clFx, C.KICK_CUP, 8, { from: 600, to: 3000, gain: 0.1, q: 1.2, seed: 7461 }, { kind: 'clswoosh', pan: -0.2 });
  swell(B.clFx, C.KICK_CUP, C.THROW, 0.3, 7462);
  swoosh(B.clFx, C.SPLASH, 10, { from: 5000, to: 900, gain: 0.16, q: 0.7, seed: 7463 }, { kind: 'clsplash', pan: px(560) });
  place(B.clEgg, C.SPLASH, 0.3, (b) => splat(b, 0, sr, { gain: 0.3, seed: 7464 }), { as: 'clsplash', pan: px(560) });
  [[2, 89, 0.45], [5, 86, 0.62], [8, 82, 0.38]].forEach(([d, m, pan]) => place(B.clFx, C.SPLASH + d, 0.15, (b) => plip(b, 0, sr, { freq: midi(m), gain: 0.04 }), { kind: 'cldroplet', pan }));
  place(B.clFx, C.LIGHTS_OUT, 0.5, (b) => impact(b, 0, sr, { gain: 0.2 }, 7465), { kind: 'cllightsout' });
  place(B.clDry, C.RED_EYES, 0.06, (b) => spark(b, 0, sr, { gain: 0.3, tone: 4000 }, 7466), { kind: 'clzzt', pan: px(580) });
  swoosh(B.clFx, C.RED_EYES, 14, { from: 1800, to: 70, gain: 0.18, q: 0.9, seed: 7467 }, { kind: 'clpowerdown' });
  // The plates: magenta′ from the left, lemon′ from the right, converging on him and registering on the grab.
  [[-0.95, 7468], [0.95, 7469]].forEach(([from, seed], k) => placeStereo(B.clFx, C.PLATES.to, 6, (L, R, m) => travellingWhoosh(L, R, 0, m, sr, { from: 1200, to: 5000, gain: 0.08, q: 1.5, panFrom: from, panTo: px(580), seed }), { kind: k ? undefined : 'clplates', as: k ? 'clplates' : undefined, start: C.PLATES.to - WHOOSH_PEAK * 6 }));
  swoosh(B.clFx, C.GRAB, 8, { from: 700, to: 4500, gain: 0.22, q: 1.3, seed: 7470 }, { kind: 'clgrab' });
  place(B.clFx, C.GRAB, 0.4, (b) => {
    kick(b, 0, sr, { gain: 0.42, f0: 150, f1: 55, pitchMs: 20, decayMs: 70 }, 7471);
    click(b, 0, sr, { gain: 0.14, tone: 900 }, 7472);
  }, { as: 'clgrab' });
  place(B.clDry, C.GRAB, 0.1, (b) => growl(b, 0, sr, { freq: 110, ms: 80, gain: 0.12 }), { kind: 'clgrowl', pan: px(580) });
  // The throw as the picture stages it (clubInkB.ts throwPose, U2), heard move by move. The haul (GRAB → SWING.from): his arm stretches,
  // a rubbery F3 → C4 glide (IV's fifth to its ninth) with a creak on it, its tension the haul's progress, dry (his), panned with his
  // fist. The loop (SWING): the whip — air climbing with the fist's speed round the loop, panned with its x (out left round the bottom,
  // over the top, away right), cut on the throw where he is let go.
  const haul = SWING.from - C.GRAB;
  const swing = SWING.to - SWING.from;
  const reach = Math.hypot(fist(SWING.from)[0] - fist(C.GRAB)[0], fist(SWING.from)[1] - fist(C.GRAB)[1]);
  placeStereo(B.clDry, C.GRAB, haul, (L, R, m) => armStretch(L, R, 0, m, sr, {
    gain: STRETCH_GAIN,
    tension: (p) => Math.hypot(fist(C.GRAB + p * haul)[0] - fist(C.GRAB)[0], fist(C.GRAB + p * haul)[1] - fist(C.GRAB)[1]) / reach,
    pan: (p) => px(fist(C.GRAB + p * haul)[0]),
    seed: 7478,
  }), { kind: 'clstretch' });
  const fastest = Math.max(...Array.from({ length: 4 * swing }, (_, k) => fistSpeed(SWING.from + k / 4)));
  placeStereo(B.clFx, SWING.to, swing, (L, R, m) => whip(L, R, 0, m, sr, {
    gain: WHIP_GAIN,
    speed: (p) => fistSpeed(SWING.from + p * swing) / fastest,
    pan: (p) => px(fist(SWING.from + p * swing)[0]),
    seed: 7479,
  }), { kind: 'clwhip', start: SWING.from });
  // The throw (v04's FLIP): the big kick and crash above, an impact, the whoosh peaking on it, the "waa" above; the stamp prints.
  place(B.clFx, C.THROW, 1.8, (b) => impact(b, 0, sr, { gain: 0.3 }, 7475), { kind: 'climpact' });
  swoosh(B.clFx, C.THROW, THROW_WHOOSH.frames, { from: 300, to: 6000, gain: THROW_WHOOSH.gain, q: 1.1, seed: 7473 }, { kind: 'clthrow' });
  place(B.clFx, C.THROW, 0.3, (b) => stampChunk(b, Math.round(0.05 * sr), sr, { gain: 0.32, seed: 7476 }), { kind: 'clstamp', pan: px(110), start: C.THROW - 3 });
  place(B.clFx, C.BORDER_SNAP, 0.06, (b) => paperSlap(b, 0, sr, { gain: 0.05, tone: 3500, seed: 7477 }), { kind: 'clsnap' });
  REACTIONS.forEach(([x, m], i) => place(B.clFx, C.reactionAt(i), 0.08, (b) => pop(b, 0, sr, { freq: midi(m), gain: 0.05 }), { kind: 'clreaction', pan: px(x) }));
  // … and the house piano runs up C9 with them, a note a balloon at its spot: the whole page revealed (club 5.4's harmony, a beat after the
  // throw's horns), ringing to the page's recede.
  REACTIONS.forEach(([x, m], i) => {
    if (mark('clrun', C.reactionAt(i))) housePiano(B.clPiano.L, B.clPiano.R, lo(C.reactionAt(i)), sr, { notes: [m], len: at(RUN.frames), gain: RUN.gain, pan: px(x), spread: 0.1, decay: RUN.decay, seed: RUN.seed + i });
  });

  // ——— Club 6 · OUT OF THE PAGE (v04's club 4): the roll above, the riser, a reverse cymbal into the hit, the page's fwips ————————————
  // The riser and the reverse cymbal 2 dB under the old club's (0.26, 0.3): LEVEL_DB lifts them, the old pad's limiting held them down,
  // and the build's last beat stays under the cosmos's Big Bang (bible §4.3) with the horns' BRRR on top.
  place(B.clFx, club(6), (C.HIT - club(6)) / FPS, (b) => riser(b, 0, b.length, sr, { gain: 0.2 }, 7480), { kind: 'clriser' });
  swell(B.clFx, club(6, 2), C.HIT, 0.24, 7481);
  C.ROLL.slice(0, 6).forEach((f, k) => place(B.clFx, f, 0.08, (b) => zip(b, 0, sr, { from: 1500, to: 6000, ms: 60, gain: 0.06, seed: 7482 + k }), { kind: 'clfwip', pan: k % 2 ? 0.4 : -0.4 }));

  // ——— Bar 4 is heard from the bar: what still rings of the club across the match cut — the hook's echoes, the rise's bells, the last
  // piano and arp notes — is muffled (roomCutoff and dipLevel, above) until "oh?" (the vox) or club 5.1 (the rest), so the room
  // changes on the cut. The bar's own sounds (the antivirus's, the bloops, the caption) are not.
  for (const [name, to] of [['clVox', C.NOTICE], ['clBell', C.DIP.to], ['clArp', C.DIP.to], ['clPiano', C.DIP.to]]) {
    const b = B[name];
    const [a, e] = [lo(C.DIP.from), lo(to)];
    const fade = Math.round(0.006 * sr);
    for (const x of [b.L, b.R]) {
      const f = new SVF(sr);
      for (let i = a; i < Math.min(len, e + fade); i++) {
        const fr = frameAt(i);
        f.process(x[i], roomCutoff(fr), 0.7);
        const wet = f.lp * dipLevel(fr, ROOM_DIP_DB);
        const w = i < e ? 1 : 1 - (i - e) / fade;
        x[i] = w * wet + (1 - w) * x[i];
      }
    }
  }

  // ——— The bed ducks under the Tier A words ——————————————————————————————————————————————————————————————————————————————————————
  if (ducks) {
    const g = new Float32Array(len).fill(1);
    for (const t of TIER_A) {
      const o = lo(t.at);
      const [lead, hold, rel] = [t.leadMs, t.holdMs, t.releaseMs].map((ms) => Math.round((ms / 1000) * sr));
      for (let i = Math.max(0, o - lead); i < Math.min(len, o + hold + rel); i++) {
        const k = i < o ? (i - (o - lead)) / lead : i < o + hold ? 1 : 1 - (i - o - hold) / rel;
        g[i] = Math.min(g[i], 10 ** ((-t.depthDb * k) / 20));
      }
    }
    for (const [name, b] of Object.entries(B)) {
      if (NOT_BED.includes(name)) continue;
      for (let i = 0; i < len; i++) {
        b.L[i] *= g[i];
        b.R[i] *= g[i];
      }
    }
  }

  // ——— The hit: the music ends on its frame; v04's glass on the post bus (its code and seeds, so the silence is v04's) ———————————————
  const postAt = (frame, dur, draw, { kind, pan = 0 } = {}) => {
    if (kind ? !mark(kind, frame) : false) return;
    const buf = new Float32Array(Math.round(dur * sr));
    draw(buf);
    addMono(post, buf, { at: at(frame) - base, pan });
  };
  if (solo('d1crack', C.HIT)) {
    postAt(C.HIT, 0.5, (b) => impact(b, 0, sr, { gain: 0.5 }, 2970), { kind: 'd1crack' });
    postAt(C.HIT, 0.25, (b) => {
      for (let k = 0; k < 6; k++) click(b, Math.round(0.004 * k * sr), sr, { gain: 0.5 - 0.06 * k, tone: 5000 + 1800 * k }, 2972 + k);
    }, { pan: 0.1 });
    postAt(C.HIT, (C.SMASH - C.HIT) / FPS, (b) => {
      let y = 0;
      let z = 0;
      for (let i = 0; i < b.length; i++) {
        const t = i / sr;
        const x = 2 * hash(i, 2975) - 1;
        // A narrow band of noise near 6 kHz, its pitch wavering (stress in the glass), fading.
        const w = (2 * Math.PI * (6000 + 900 * Math.sin(2 * Math.PI * 7 * t))) / sr;
        y += w * (x - y - 0.3 * z);
        z += w * y;
        b[i] = 0.05 * z * Math.exp(-t / 0.18);
      }
      for (let k = 0; k < 5; k++) fmBell(b, Math.round((0.03 + 0.06 * k) * sr), sr, { freq: 3800 + 2600 * hash(k, 2976), gain: 0.02, decay: 0.15, index: 3 });
    }, { pan: -0.1 });
  }
  // Break 1.1: the glass gives — a soft low knock, a dry crack of the pane coming loose, a breath of glass and a few grains, gone within
  // half a second, under the break's own first note (v04's, drop 1's seeds).
  if (solo('d1shatter', C.SMASH)) {
    postAt(C.SMASH, 0.5, (b) => kick(b, 0, sr, { gain: 0.3, f0: 120, f1: 52, pitchMs: 22, decayMs: 70 }, 2990), { kind: 'd1shatter' });
    postAt(C.SMASH, 0.12, (b) => {
      for (let k = 0; k < 4; k++) click(b, Math.round(0.005 * k * sr), sr, { gain: 0.34 - 0.06 * k, tone: 4200 + 1500 * k }, 2995 + k);
    }, { pan: 0.15 });
    postAt(C.SMASH, 0.35, (b) => whoosh(b, 0, b.length, sr, { from: 7000, to: 2500, gain: 0.07, q: 0.8, seed: 2991 }));
    postAt(C.SMASH, 0.6, (b) => {
      for (let k = 0; k < 5; k++) fmBell(b, Math.round(hash(k, 2992) * 0.18 * sr), sr, { freq: 3000 + 3500 * hash(k, 2993), gain: 0.012 + 0.012 * hash(k, 2994), decay: 0.06, index: 4 });
    }, { pan: 0.1 });
  }

  // Every club bus ends on the hit (a 1.5 ms fade), then reaches the stems at LEVEL_DB; the post bus plays on.
  const end = lo(C.HIT);
  const level = 10 ** (LEVEL_DB / 20);
  for (const [name, b] of Object.entries(B)) {
    for (const [src, dst] of [[b.L, stems[name].L], [b.R, stems[name].R]]) {
      truncate(src, end, sr);
      for (let i = Math.max(0, -shift); i < Math.min(len, n - shift); i++) dst[shift + i] += level * src[i];
    }
  }
  for (const [src, dst] of [[post.L, stems.post.L], [post.R, stems.post.R]]) {
    for (let i = Math.max(0, -shift); i < Math.min(src.length, n - shift); i++) dst[shift + i] += src[i];
  }
  return events;
}

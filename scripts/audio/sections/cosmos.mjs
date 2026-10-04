// The cosmos's sound, the part 'cosmos' (6 bars, cosmos 1.1 → club 1.1): "VERTIGO ∞ · LIGHTSPEED PRESS", bars 3–8 (build sheet
// notes/bcos/sheet.md §4, §11; design notes/cosmos3/final.md §9 bars 15–20; music bible notes/prep/music.md §2.1, §3
// M1/M6/M7/M8/M9/M10/M11/M15, §4.3–4.4, §6). Every frame comes from src/score/cosmos.ts, so every hit lands on the picture's frame (an
// event on frame f starts on sample f × 800 at 48 kHz). Positions below are cosmos bar.beat.
//   Drop 1's groove (sections/drop1.mjs: its VOICINGS, its kit and seeds, the saturated sub on the roots, the pluck bass on the &s, the
//   formant vocal-chop hook, now leading) and break 1 FALL's glass (music bible M2: no chord held) carry
//   the six bars — IV · Vsus → V · iii · vi · IV → V · iii → vi, no tonic: the supersaw wall only as the bang's one-beat chord, then the
//   chords on short sounds only — FALL's tuned tinks on picture events (GLASS), two stabs a bar on the claps, the bells — and every level
//   of scale arrives with a crash, a whoosh and a bell run up the chord.
//   1, THE PRINTED BIG BANG (the drop's tier-1 hit, out of the vacuum): kick 0.72, crash, impact, the explosion burst, the sung B♭maj9
//   with the waltz's swallowed B♭5 on top, the wall for one beat, the sub on B♭1, a glitter swarm. Time freezes on 1.1e and so does the roar: the
//   burst's last two frames held as a wide grain cloud under the groove, while he pastes himself (pops), the bullet-time rig whirrs and
//   whooshes round with the orbit, "hey!" as the fragments lock into 10⁻⁷ m, and the blade's shing on the slice spins the frozen grain up
//   two octaves into the restart, the card fountain flutters, the odometer ticks with the Eames squares and a riser lands on Earth;
//   the glass plays FALL's own figure in the frozen time (A6 F6 · D6 B♭5, then the cascade rising on the fountain and the Eames squares into Earth).
//   2, CITY LIGHTS → SUNRISE: card flaps thickening ring by ring as the stadium wave of lamps runs, a tink down C9sus4 on each ring,
//   the tilt and the crane, "wa" + a vinyl zip on each infection clap, a reverse swell and a glass breath into the sunrise chord (FM
//   bells on C9; the breath gone by 2.4), a glint-tink
//   swarm of flashbulbs, the Moon beam's zap and the Moon's bell, the lock clunk of 8,100,000,000, the whip's fwip and six stamp chks.
//   3, SLINGSHOT SPIROGRAPH: wood-block ratchets pitched by ring, typewriter clacks panned with the overtype cursors (a tink up Am9 as
//   each is pasted, two more as their rings are overtyped), the slingshot's
//   doppler (its tail an octave down in the slow-mo), the boing, "wa" on C6 and the CME's fwoom, the victory lap's whip, bells and the
//   carriage-return ding, the fling and the warp's charge.
//   4, WARP ARM → NEON SPIRAL: the warp jump and boom, the warp drone dipping on the glances, the punch's whoomp, a reversed whoosh that
//   lands exactly on the snap-out with the drone cut dead, a glass dyad on the ignition and a tink up Dm9 on each arm's light burst,
//   the chime arpeggio climbing the 16ths, the quasar's beam zap, the tilt.
//   5, LIGHTNING WEB: an arc zap and a soft tink on its note on every hop (the chord two octaves up, crackle, spreading out across the field), "wa" +
//   glass + the roll's swish, the shield's bounce blips and metallic ping, the spark shower and the red zap-back; THE SCAN — the
//   Defender's dry scanner tone, the vox ducked, the hook's E6 whispered, no "wa" — then the all-clear chime and the hook's own D6s
//   sung as "he-he", and the reticle's two dry C7 beeps (M8: the Defender is dry, narrow, pitch class C).
//   6, EVENT HORIZON: the waltz's answer as bells (C6 C6 A5 A5, M6), a high tink on each band blink, spaghettify zips, ∞'s FM shing cluster, the drain's suck
//   tripling, the sandbox clank (dry, C), a sub sweep 60 → 30 Hz and a reverse cymbal into THE STUTTER (M15, the approved
//   6·6·3·3·3·3): cut from the finished mix in finish(), the neon's sparks and hum written on the content frames it plays, the hook's D6
//   stuttering toward the club's. Every cosmos bus ends by its last frame (cut there), but the plate it rang in rings on into the club
//   (no CUT on club 1.1: continuity plan v07 §2.3), and over the stutter's last two cells the club's piano and brass play into its dot
//   (PRELAP: a J-cut, written into the finished mix after the stutter).
// Seeds: drop 1's (2100–2999) where a voice is drop 1's (the same sound as approved), new voices 6500–6999. Event kinds cs… (drums end
// in "kick" / "clap" / "snare" for check-sync).
import { hash } from '../../../src/engine/random.ts';
import * as C from '../../../src/score/cosmos.ts';
import { partBar } from '../../../src/score/film.ts';
import { FPS, FRAMES_PER_BEAT } from '../../../src/score/tempo.ts';
import { chirp, pad as glassPad, tink, tinkSwarm, zip } from '../breakVoices.mjs';
import {
  arcZap, bladeShing, boing, burst, clank, doppler, drainSuck, flap, fmChirp, grains, hum, lockClunk, metalClick, ratchet, scanner,
  sparkShower, stampChk, swellNoise, travel, typeClack, warpDrone, whoomp, woodBlock,
} from '../cosmosVoices.mjs';
import { sampleOf, stage } from '../cosmosStage.mjs';
import { shaker, sweep } from '../drop2Voices.mjs';
import { blip, clap, hat, impact, kick, pop, riser, snare } from '../drums.mjs';
import { fmBell } from '../fm.mjs';
import { crash, flutter, spark, swarm } from '../fx.mjs';
import { hornHit, housePiano } from '../clubVoices.mjs';
import { LIMIT_DB, MARGIN_DB } from '../limiter.mjs';
import { truePeakDb } from '../meter.mjs';
import { addMono, duck, pingPong, stereo } from '../mix.mjs';
import { plate } from '../reverb.mjs';
import { pluckBass, supersaw } from '../synth.mjs';
import { voxChop } from '../vox.mjs';
import { LEVEL_DB as CLUB_LEVEL_DB, PIANO as CLUB_PIANO } from './club.mjs';
import { VOICINGS } from './drop1.mjs';

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const BEAT = FRAMES_PER_BEAT;
const SIXTEENTH = BEAT / 4;

/**
 * No cut of the plate on club 1.1 (continuity plan v07 §2.3, FW3: the plate restarts only after a designed silence, and 2112 is none).
 * Every cosmos bus still ends on club 1.1 (stage's 1.5 ms fade), but the room they rang in rings on: the plate runs on into the club,
 * whose own sends feed the same plate, so the club's dot opens in the cosmos's air, not dry. (Was [C.COSMOS.to]: the club began dry and
 * mono, −22 dB side/mid on its downbeat against the stutter's −15.6.)
 */
export const CUTS = [];
/** No silence: the stutter is an edit of the finished mix (finish), not a gate. */
export const SILENCES = [];
/**
 * The cosmos's own buses and their reverb sends: drop 1's shared amounts (drums 0.08, chords 0.25, vox 0.4, chime 0.55, fx 0.22, bass 0),
 * the frozen grain wet and wide (0.3), the Defender dry (≤ 0.05, M8/M9), the sub never sent; the glass at FALL's (break.mjs brGlass 0.32);
 * the stabs nearly dry (0.12) and the bells drier than drop 1's chime (0.35, was 0.55): with no chord held, a plate tail on every bell
 * and stab is the held chord again (FALL's bells 0.2, its glass 0.32).
 */
export const SENDS = { csDrums: 0.08, csPad: 0.25, csStab: 0.12, csGlass: 0.32, csVox: 0.4, csBell: 0.35, csFx: 0.22, csGrain: 0.3, csBass: 0, csSub: 0, csDry: 0.04 };
/** The cosmos's own preview of its out-join (bgm.mjs writes public/audio/sections/<id>.wav): the event horizon → the club's dot. */
export const PREVIEWS = [{ id: 'horizon-club', fromBar: partBar('cosmos', 6), toBar: partBar('club', 1) }];

/** The sung chord on the bang (M10): B♭maj9's upper voices an octave up (C5 D5 F5 A5) and the waltz's swallowed B♭5 on top. */
export const BANG_CHORD = [...VOICINGS.IV.map((m) => m + 12), 82];
/** The roots on the sub (B♭1, C2, A1, D2), drop 1's. */
export const ROOT = { IV: 34, Vsus: 36, V: 36, iii: 33, vi: 38 };
/** The chord sounding at frame `f` (C.CHORDS; before the bang, the first). */
export const chordAt = (f) => {
  let name = C.CHORDS[0].chord;
  for (const c of C.CHORDS) if (f >= c.at) name = c.chord;
  return name;
};
/**
 * The stabs, thinned to the claps (two a bar, the backbeat) from the first clap (1.2) to the stutter's content (6.4's clap is in it): no
 * chord held — drop 1's six-a-bar future-bass chop (7 saws × 5 notes, open to 9.9 kHz, +3.5 dB presence, a 0.3 send) sounded in 75 % of
 * the cosmos's 100 ms windows; two short stabs a bar keep the chord's colour on the beat the picture lands on (the shock rings, "wa").
 */
export const STAB_FRAMES = C.CLAPS.filter((f) => f >= C.SHELL && f < C.COSMOS.to);
/** The stab's sound: the voicing (C4–B♭4) and its top an octave up, 3 saws ±0.12 st a note, 4 frames long, a filter snap 5.7 kHz → 700 Hz. */
export const STAB = { gain: 0.15, voices: 3, detune: 0.12, spread: 0.7, q: 1, frames: 4, from: 5000, floor: 700, tauMs: 45, seed: 2851 };
/** The "wa" claps (M7): every infection clap of cosmos 2–6 — none on 5.4 (they play dead under the scan) or in the stutter. */
export const WA_CLAPS = C.CLAPS.filter((f) => f >= C.LEVELS.earth && f !== C.SCAN.from && f < C.STUTTER.from);
/** The hats at drop 1's gains (× 1: the air above 8 kHz is the hats', and drop 2 must stay the brighter drop). */
export const HAT_AIR = 1;
export const OPEN_AIR = 1;
/** The kicks' gains: the bang 0.72 (the tier-1 hit), drop 1's 0.5 after it. */
export const kickGain = (f) => (f === C.BANG ? 0.72 : 0.5);
/**
 * The sub's level (× its 0.27) at frame `f`: under the bang it blooms in over the first beat (from 35 %; the bang kick and the burst's
 * body carry its low end there, and the sub would only spend the limiter's headroom the sung chord needs: bible §4.3), full from 1.2.
 */
export const subLevel = (f) => {
  const u = Math.max(0, Math.min(1, (f - C.BANG) / BEAT));
  return 0.35 + 0.65 * u * u * (3 - 2 * u);
};
/**
 * The harmony. A chord held behind everything is the noise; the model is the glass
 * after the shatter (break 1 FALL). Music bible M2 (binding): no constant bed; harmony on short-decay sounds; at most a brief
 * swell into a section start that decays within a beat or two. So nothing holds a chord from 1.2 on (v02's glass pad, 5 saws × 4 notes
 * pumped under every kick, sounded in 100 % of the cosmos's 100 ms windows at −7 dB under the mix: gone):
 *   - 1.1: drop 1's wall is the bang's chord for its one beat (BANG_PAD; the tier-1 hit, bible §4.3: M2's one allowed swell), faded
 *     under 1.2's kick;
 *   - the glass (GLASS): FALL's tuned tinks down each chord's arpeggio (ARP; IV's is FALL's own A6 F6 D6 B♭5 A5 F5 D5), each on a
 *     picture event and panned where it is on screen — bar 1 is FALL's figure in frozen time (the bang's B♭5, then down the arpeggio
 *     on the shell, the sweep, the lock and the ream, and after the slice the cascade rising in 32nds into Earth), then the lamp wave's rings, the cursors' pastes and overtypes, the slingshot, the ignition and the arms'
 *     light bursts, the lightning's hops, the event horizon's band blinks;
 *   - the stabs on the claps only (STAB_FRAMES), the bells on the levels (ringing a beat or two, not the bar), the chime arpeggio of 4,
 *     the waltz's answer;
 *   - one FALL-sized glass breath swelling into the sunrise's C9 (2.2& → 2.3) and gone by 2.4 (BREATH: the 2001 chord, felt more than heard).
 * The energy is the drums, the sub (the roots under every chord, ducked by every kick) and the hook, which now leads (HOOK_LIFT_DB).
 */
export const BANG_PAD = { gain: 0.2, cutoff: 9000, fadeMs: 80 };
/** Each chord's glass arpeggio, top → bottom (MIDI): its 7th chord's tones over the root, as FALL's B♭maj9 (A F D B♭, no 9th). */
export const ARP = {
  IV: [93, 89, 86, 82, 81, 77, 74], // B♭maj9: A6 F6 D6 B♭5 A5 F5 D5 (FALL's, break.mjs TINKS)
  Vsus: [94, 89, 86, 84, 82, 77, 74], // C9sus4: B♭6 F6 D6 C6 B♭5 F5 D5
  V: [94, 88, 86, 84, 82, 76, 74], // C9: B♭6 E6 D6 C6 B♭5 E5 D5
  iii: [93, 91, 88, 84, 81, 79, 76], // Am9: A6 G6 E6 C6 A5 G5 E5
  vi: [93, 89, 86, 84, 81, 77, 74], // Dm9: A6 F6 D6 C6 A5 F5 D5
};
/**
 * FALL's cascade into the impact (break.mjs TINKS, break 1.4: B♭maj7 rising in 32nds, B♭5 … A7), on the picture's own clock after the
 * slice's shing: the fountain's second fan (1.4e), then the four Eames squares rushing in (32nds) — B♭5 · D6 F6 A6 D7, landing on Earth.
 */
export const CASCADE = [82, 86, 89, 93, 98];
/**
 * The bells ring a beat or two, not the bar (time constants, s; no chord held): the levels' runs (were 0.9), the sunrise's C9 (1.4), the
 * Moon's A6 (1.1), the unwrap's and the lap's chord (0.8), the chime arpeggio of 4 (0.35: its 16ths now strike, not smear).
 */
export const BELL_RING = { level: 0.45, sunrise: 0.8, moon: 0.6, chord: 0.45, chime: 0.22 };
/** A tink's gain and ring (breakVoices tink: an FM glass bell + a click; decayMs/3000 its time constant). FALL's 0.095 / 600 ms sits in a mix 8 LU quieter. */
export const TINK = { gain: 0.2, decayMs: 600, soft: 0.6, short: 300 };
/**
 * The hook leads. Its chops sing through fixed soprano formants, so a note's level hung on its vowel and pitch: dry, the notes spanned
 * 26 dB (G5 on "a" −24 dB RMS, G6 on "i" −50), and under the chords most of rows A and B never reached the ear (−21 … −33 dB under
 * the mix). Each hook note is now sung at one level (HOOK_NOTE_DB, its dry RMS over the note; at most HOOK_MAX_BOOST_DB up), the whisper
 * WHISPER_DB, and the vox bus is lifted HOOK_LIFT_DB from 1.2 (the bang's sung chord as it was: the tier-1 hit's level is set).
 */
export const HOOK_NOTE_DB = -26;
export const WHISPER_DB = -33;
export const HOOK_MAX_BOOST_DB = 18;
export const HOOK_LIFT_DB = 8;
/** The glass breath into the sunrise: FALL's glass pad (3 saws, LP 1.2 kHz, no kick duck) on C9's voicing, at most 0.07. */
export const BREATH = { voices: 3, detune: 0.14, spread: 0.6, peak: 0.07, cutoff: 1200, q: 0.7, tauFrames: 5, seed: 6680 };
/** The breath's level at frame `f`: a swell (u²) from PREDAWN to the sunrise, then dying with BREATH.tauFrames; 0 outside 2.2& → 2.4. */
export const breathLevel = (f) => {
  if (f < C.PREDAWN || f >= C.UNWRAP.at) return 0;
  if (f < C.SUNRISE.at) return BREATH.peak * ((f - C.PREDAWN) / (C.SUNRISE.at - C.PREDAWN)) ** 2;
  return BREATH.peak * Math.exp(-(f - C.SUNRISE.at) / BREATH.tauFrames) * Math.min(1, (C.UNWRAP.at - f) / 2);
};
/** The stabs' filter snap: drop 1's, 20 % higher through cosmos 4 (the galaxy ignites). */
export const stabBright = (f) => (f >= C.LEVELS.galaxy && f < C.LEVELS.web ? 1.2 : 1);
/** The arc zaps' pitches: the chord's upper voices two octaves up, walking up the voicing hop by hop (IV, then V from 5.3). */
export const hopNote = (k) => {
  const f = C.HOPS[k];
  return VOICINGS[chordAt(f)][k % 4] + 24;
};
/** Where hop k's arc strikes (a pan, −1 … 1): breadth-first out from his node, so the zaps spread wider across the field hop by hop. */
export const hopPan = (k) => (k % 2 ? 1 : -1) * Math.min(0.85, 0.12 + 0.07 * k) * (0.75 + 0.25 * hash(k, 6560));
/** A typewriter cursor's pan on a 16th: it runs round its ring 1/8 turn a 16th, its x = cos of its place (cursor k starts k/3 turn on). */
export const cursorPan = (k, n) => 0.75 * Math.cos(2 * Math.PI * (k / 3 + n / 8));
/** One tink of the glass: on frame `at`, MIDI `midi`, pan, why (the picture event), its gain and ring. */
const tinkAt = (at, midi, pan, why, { gain = TINK.gain, decayMs = TINK.decayMs } = {}) => ({ at, midi, pan, why, gain, decayMs });
/**
 * THE GLASS: every tink of the cosmos, in time order, each on a picture event of src/score/cosmos.ts (part-local: C.cs, the score's
 * lists), its note a tone of the chord sounding there (ARP, CASCADE), panned by where the event is on screen.
 */
export const GLASS = (() => {
  const g = [];
  // 1 (IV): FALL's figure in frozen time — the bang is its first note (the sung B♭5 on top); then down the arpeggio in 8ths on the
  // shell, the sweep, the lock and the ream; then the cascade rising on the fountain and the Eames squares into Earth.
  g.push(tinkAt(C.SHELL, ARP.IV[0], 0, 'the shock shell, every card glints'));
  g.push(tinkAt(C.SWEEP, ARP.IV[1], 0.35, 'the light sweep (left → right)'));
  g.push(tinkAt(C.LOCK.from, ARP.IV[2], 0, 'the anamorphic lock'));
  g.push(tinkAt(C.REAM, ARP.IV[3], -0.2, 'the ream, his card edge-on'));
  [C.FOUNTAIN[1].at, ...C.POWERS].forEach((f, k) => g.push(tinkAt(f, CASCADE[k], -0.3 + 0.15 * k, k < 1 ? 'the fountain fanning' : 'an Eames square rushing in', { gain: TINK.gain * 0.9, decayMs: TINK.short })));
  // 2 (Vsus): down the arpeggio on the lamp wave's rings as the front runs out, wider ring by ring (the flaps' field).
  C.WAVE_RINGS.filter((f) => f >= C.TILT_UP && f < C.SUNRISE.at).forEach((f, k) => g.push(tinkAt(f, ARP[chordAt(f)][k], (k % 2 ? 1 : -1) * Math.min(0.85, 0.3 + 0.1 * k), 'a ring of the lamp wave')));
  // 3 (iii): each overtype cursor pasted (up the arpeggio, where it starts on its ring), the slingshot, two rings overtyped (Neptune's is the ding).
  C.CURSORS.forEach((c, k) => g.push(tinkAt(c.at, ARP.iii[2 - k], cursorPan(k, 0), 'an overtype cursor pasted')));
  g.push(tinkAt(C.SLINGSHOT, ARP.iii[0] + 7, 0, 'the slingshot round the Sun'));
  C.CURSORS.slice(0, 2).forEach((c, k) => g.push(tinkAt(c.to, [96, 100][k], cursorPan(k, 8), 'a ring overtyped', { gain: TINK.gain * TINK.soft })));
  // 4 (vi): the neon ignition (a dyad) and the light bursts racing out the arms, up the chord.
  g.push(tinkAt(C.REVEAL, ARP.vi[0], -0.15, 'the neon ignition'));
  g.push(tinkAt(C.REVEAL, ARP.vi[0] + 5, 0.15, 'the neon ignition'));
  C.LIGHT_BURSTS.forEach((f, k) => g.push(tinkAt(f, [96, 100, 105][k], [-0.55, 0.55, -0.2][k], 'a light burst racing out the arms')));
  // 5 (IV → V): the lightning's hops sing their zap's note (the discharge on 5.2 is the roll's glass ping, csglass).
  C.HOPS.forEach((f, k) => {
    if (f !== C.ROLL.at) g.push(tinkAt(f, hopNote(k), hopPan(k), 'an arc hop', { gain: TINK.gain * TINK.soft, decayMs: TINK.short }));
  });
  // 6 (iii → vi): the band blinks on the closed hats (cosmosHole: band = the hat's count from the horizon mod 5, inner → outer), high.
  C.HATS.filter((f) => f >= C.HORIZON.at && f < C.STUTTER.from).forEach((f, k) => {
    const band = (k + 1) % 5;
    g.push(tinkAt(f, ARP[chordAt(f)][band] + 12, (k % 2 ? 1 : -1) * (0.25 + 0.1 * band), 'a band blink', { gain: TINK.gain * TINK.soft, decayMs: TINK.short }));
  });
  return g.sort((a, b) => a.at - b.at);
})();

/**
 * The freeze grain's level (a gain on the grain cloud) at frame `f`: the roar's level as it freezes on TIME.freeze (−6 dB under the
 * burst there), settling to the held −18 dB by the next beat, spun up on the slice (TIME.restart) and cut on SLICE.held.
 */
export const freezeLevel = (f) => {
  if (f < C.TIME.freeze || f >= C.SLICE.held) return 0;
  const settle = 10 ** (-18 / 20) + (10 ** (-3 / 20) - 10 ** (-18 / 20)) * Math.exp(-(f - C.TIME.freeze) / 24);
  return f < C.SLICE.at ? settle : settle * (1 + 1.5 * ((f - C.SLICE.at) / (C.SLICE.held - C.SLICE.at)));
};
/** The grain's playback rate at frame `f`: 1 (frozen) until the slice, then the tape spin-up, +2 octaves (× 4) by SLICE.held. */
export const spinRate = (f) => (f < C.SLICE.at ? 1 : 4 ** Math.min(1, (f - C.SLICE.at) / (C.SLICE.held - C.SLICE.at)));
/** The drain's speed at frame `f` (cosmos 6): 1 → 2 from the horizon to the sandbox, tripled there (6 → 8 into the stutter). */
export const drainSpeed = (f) => (f < C.SANDBOX ? 1 + (f - C.HORIZON.at) / (C.SANDBOX - C.HORIZON.at) : 3 * (2 + (f - C.SANDBOX) / (C.STUTTER.from - C.SANDBOX) * (2 / 3)));
/** The hook voice's gain duck (× on the vox bus) at frame `f`: −10 dB under the scan (the universe plays dead), back on the wink. */
export const voxDuck = (f) => (f >= C.SCAN.from && f < C.WINK ? 10 ** (-10 / 20) : 1);
/**
 * The bed under the bang (bible §4.3: cosmos 1.1 the drop's loudest beat, ≥ every other beat of the cosmos and the club + 0.3 LU, the
 * cosmos −10.1 to −10.2 before the pad's re-voicing): every voice of the cosmos from 1.2 on is mixed BED_DB under the bang's beat — one
 * gain on its own buses, never the master (the limiter gives most of it back: the bed sets the contrast, not the level). With the wall gone
 * from 1.2 (2026-10-02: a constant chord is noise) the bang stands out by itself, so the bed is −0.6 (was −1.8): the
 * groove (drums, sub, stabs) keeps the drop above the transition. Measured (integ2/beats.mjs, lift + cosmos alone): 1.1 −9.34, the next
 * loudest beat −10.35, the club's loudest −9.72, the part −10.77 (bars −10.41 … −11.14; it was −10.18 with the wall: without its
 * density the limiter gives back less). Round 2 (no chord held at all, the hook levelled and lifted; bcos/music3/bed.mjs): 1.1 −9.36,
 * the next loudest beat −10.10, the part −11.11 (bars −10.65 … −11.56).
 */
export const BED_DB = -0.6;
/** The buses the bed leaves at full: the hook's (it keeps v04's level over FX far denser than v04's). */
export const BED_SPARES = ['csVox'];
/** The bed's step lands over this long before 1.2's kick (a raised cosine), so the bang's tails drop under the kick, not before it. */
export const BED_RAMP_MS = 25;
/** The bed's step at frame `f`: 0 through the bang's beat, 1 from 1.2's kick, a raised cosine over the BED_RAMP_MS before it. */
const bedStep = (f) => {
  const u = (f - (C.SHELL - (BED_RAMP_MS / 1000) * FPS)) / ((BED_RAMP_MS / 1000) * FPS);
  return u <= 0 ? 0 : u >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * u);
};
/** The cosmos's own gain at frame `f`: 1 through the bang's beat, BED_DB from 1.2 (ramped over the BED_RAMP_MS before it). */
export const bedGain = (f) => 1 + (10 ** (BED_DB / 20) - 1) * bedStep(f);
/**
 * The bang a little quieter (v08, 2026-10-03: the very start of the
 * cosmos was too loud). One gain on the finished mix, after the limiter (finish()), so the bang keeps its tone, its
 * balance and its squash and only its level moves: BANG_TRIM.db through the bang's beat (1.1 → 1.2), then eased back (a raised cosine
 * in dB) to the approved level by Earth (2.1), a 2 dB swell into the next level's crash. Nothing else sounds there (every transition bus
 * ends on the vacuum, which is digital zero up to the bang's sample), and nothing outside 1.1 → 2.1 changes: the run-up into the vacuum,
 * the plate, the limiter's work and every later bar stay the v08 master's. Measured on bgm.wav (perceived.mjs, 90 dB SPL): the bang's
 * beat −9.36 → −11.36 LUFS, 39.6 → 35.3 sones (−11 %; the model's loudness is compressive: −15 % would take −2.8 dB); bar 1 −10.82 →
 * −12.17 LUFS, 34.1 → 31.6 sones. The bang is still the cosmos's loudest beat to the ear (sones), no longer in LUFS.
 */
export const BANG_TRIM = { db: -2, hold: C.SHELL, to: C.LEVELS.earth };
/** The trim (dB) at film frame `f` (fractional): 0 before the bang and from Earth, BANG_TRIM.db through 1.1, a raised cosine back over 1.2 → 2.1. */
export const bangTrimDb = (f) => {
  if (f < C.BANG || f >= BANG_TRIM.to) return 0;
  if (f < BANG_TRIM.hold) return BANG_TRIM.db;
  return BANG_TRIM.db * (0.5 + 0.5 * Math.cos((Math.PI * (f - BANG_TRIM.hold)) / (BANG_TRIM.to - BANG_TRIM.hold)));
};
/** The trim into the finished mix (in place; its first sample is film frame `origin`; a mix that ends before 2.1 is trimmed up to its end). */
export function bangTrim(L, R, sr, { origin = 0 } = {}) {
  const base = sampleOf(origin, sr);
  const a = Math.max(0, sampleOf(C.BANG, sr) - base);
  const b = Math.min(L.length, sampleOf(BANG_TRIM.to, sr) - base);
  for (let i = a; i < b; i++) {
    const g = 10 ** (bangTrimDb(((base + i) / sr) * FPS) / 20);
    L[i] *= g;
    R[i] *= g;
  }
}

/**
 * Renders the cosmos into `stems` at `sr`: its own buses (SENDS; created if missing). `origin`: the film frame of the stems' first
 * sample (0 for the film). Returns every event as { kind, at } (at: the film sample of its score frame — a whoosh's is its peak, a
 * reversed sound's the frame it stops on; inside the stutter, content time). `solo(kind, frame)` picks which sounds are rendered.
 */
export function renderCosmos(stems, sr, { origin = 0, solo = () => true } = {}) {
  const S = stage(stems, sr, { origin, from: C.COSMOS.from, to: C.COSMOS.to, sends: SENDS, solo });
  const { B, lo, frameAt, len, place, placeStereo, swoosh, swell, mark, take } = S;
  const seconds = (frames) => frames / FPS;
  const kicks = C.KICKS;
  const kickDuck = (depth, releaseMs) => duck(len, kicks.map(lo), sr, { depth, attackMs: 2, releaseMs });

  // ——— Drums: drop 1's kit and seeds — four on the floor from the bang, clap + snare on 2 and 4, the &s open, the 16ths closed ——————
  kicks.forEach((f, i) => place(B.csDrums, f, 1, (b) => kick(b, 0, sr, { gain: kickGain(f), f0: 210, f1: 45, pitchMs: 38, decayMs: 260 }, 2100 + i), { kind: 'cskick' }));
  C.CLAPS.forEach((f, i) => {
    place(B.csDrums, f, 0.8, (b) => snare(b, 0, sr, { gain: 0.36, tone: 220, decayMs: 150 }, 2150 + i), { kind: 'csclap' });
    place(B.csDrums, f, 0.6, (b) => clap(b, 0, sr, { gain: 0.62, tone: 1600 }, 2200 + i), { as: 'csclap', pan: -0.15 });
    place(B.csDrums, f, 0.6, (b) => clap(b, 0, sr, { gain: 0.45, tone: 1900 }, 2250 + i), { as: 'csclap', pan: 0.18, start: f + 0.15 });
  });
  C.FILL.forEach((f, i) => place(B.csDrums, f, 0.5, (b) => snare(b, 0, sr, { gain: 0.16 + 0.07 * i, tone: 240 + 15 * i, decayMs: 90 }, 2300 + i), { kind: 'csfillsnare', pan: -0.2 + 0.13 * i }));
  C.HATS.forEach((f, i) => place(B.csDrums, f, 0.25, (b) => hat(b, 0, sr, { gain: HAT_AIR * (i % 2 ? 0.16 : 0.21), decayMs: 34, cutoff: 9000 }, 2400 + i), { kind: 'cshat', pan: i % 2 ? 0.28 : -0.22 }));
  C.OPEN_HATS.forEach((f, i) => place(B.csDrums, f, 0.6, (b) => hat(b, 0, sr, { gain: OPEN_AIR * 0.22, decayMs: 140, cutoff: 7500 }, 2700 + i), { kind: 'csopenhat', pan: 0.1 }));

  // ——— The harmony (no chord held from 1.2): the bang's wall for one beat, the glass, two stabs a bar, the sub, the pluck —
  if (mark('cspad', C.BANG)) {
    const pad = stereo(len);
    // 1.1: the bang's chord is drop 1's wall (its top two doubled an octave and two octaves up, 9 kHz, its seed), held through the
    // beat and faded out over BANG_PAD.fadeMs under 1.2's kick — the only beat of the cosmos a chord is held in. Its kick does not duck
    // it (the tier-1 hit needs its first beat sustained, bible §4.3).
    const end = lo(C.SHELL);
    const fade = Math.round((BANG_PAD.fadeMs / 1000) * sr);
    const v = VOICINGS[chordAt(C.BANG)];
    supersaw(pad.L, pad.R, [{ at: 0, len: end + fade, freqs: [...v, v[2] + 12, v[3] + 12, v[3] + 24].map(midi) }], sr, { gain: BANG_PAD.gain, cutoff: () => BANG_PAD.cutoff, q: 0.7, spread: 1, seed: 2850 });
    const g = duck(len, kicks.filter((k) => k !== C.BANG).map(lo), sr, { depth: 0.6, attackMs: 2, releaseMs: 160 });
    for (let i = 0; i < Math.min(len, end + fade); i++) {
      const w = i < end ? 1 : 0.5 + 0.5 * Math.cos((Math.PI * (i - end)) / fade);
      B.csPad.L[i] += pad.L[i] * w * g[i];
      B.csPad.R[i] += pad.R[i] * w * g[i];
    }
  }
  // 2.2& → 2.3: the glass breath into the sunrise's C9 (BREATH: FALL's glass pad, 3 saws, LP 1.2 kHz), gone by the unwrap (2.4).
  if (mark('csbreath', C.SUNRISE.at)) {
    const L = new Float32Array(len);
    const R = new Float32Array(len);
    glassPad(L, R, [{ at: lo(C.PREDAWN), len: lo(C.UNWRAP.at) - lo(C.PREDAWN), freqs: VOICINGS[chordAt(C.SUNRISE.at)].map(midi) }], sr, {
      voices: BREATH.voices, detune: BREATH.detune, spread: BREATH.spread, q: BREATH.q, attackMs: 30, releaseMs: 40, seed: BREATH.seed,
      gain: (i) => breathLevel(frameAt(i)),
      cutoff: () => BREATH.cutoff,
    });
    for (let i = 0; i < len; i++) {
      B.csPad.L[i] += L[i];
      B.csPad.R[i] += R[i];
    }
  }
  // The glass (GLASS): FALL's tinks, one on each picture event, on the chord's tones.
  GLASS.forEach((t, k) => place(B.csGlass, t.at, 0.1 + (5 * t.decayMs) / 3000, (b) => tink(b, 0, sr, { freq: midi(t.midi), gain: t.gain, decayMs: t.decayMs, seed: 6700 + k }), { kind: 'cstink', pan: t.pan }));
  // The stabs on the claps (two a bar): the voicing and its top an octave up on three saws, a 4-frame chop, the filter snapping shut.
  if (mark('csstab', STAB_FRAMES[0])) {
    const stabs = stereo(len);
    const list = STAB_FRAMES.map((f) => {
      const v = VOICINGS[chordAt(f)];
      return { at: lo(f), len: lo(f + STAB.frames) - lo(f), freqs: [...v, v[3] + 12].map(midi) };
    });
    const starts = list.map((c) => c.at);
    let si = 0;
    supersaw(stabs.L, stabs.R, list, sr, {
      gain: STAB.gain, voices: STAB.voices, detune: STAB.detune, q: STAB.q, spread: STAB.spread, seed: STAB.seed,
      cutoff: (i) => {
        while (si + 1 < starts.length && starts[si + 1] <= i) si++;
        const t = (i - starts[si]) / sr;
        return t < 0 ? STAB.floor : (STAB.floor + STAB.from * Math.exp(-t / (STAB.tauMs / 1000))) * stabBright(frameAt(i));
      },
    });
    for (let i = 0; i < len; i++) {
      B.csStab.L[i] += stabs.L[i];
      B.csStab.R[i] += stabs.R[i];
    }
  }
  // The sub: the chord's root, saturated (tanh 1.4), ducked hard by every kick; from the sandbox the sweep (below) takes it over.
  if (mark('cssub', C.BANG)) {
    const g = kickDuck(0.85, 120);
    const end = lo(C.SANDBOX);
    const fade = Math.round(0.012 * sr);
    let ph = 0;
    for (let i = 0; i < Math.min(len, end + fade); i++) {
      ph += midi(ROOT[chordAt(frameAt(i))]) / sr;
      const v = 0.27 * subLevel(frameAt(i)) * Math.min(1, i / (0.004 * sr)) * Math.min(1, (end + fade - i) / fade) * Math.tanh(1.4 * Math.sin(2 * Math.PI * ph)) * g[i];
      B.csSub.L[i] += v;
      B.csSub.R[i] += v;
    }
  }
  if (mark('cspluck', C.OPEN_HATS[0])) {
    const pb = new Float32Array(len);
    pluckBass(pb, C.OPEN_HATS.map((f) => ({ at: lo(f), len: lo(f + 9) - lo(f), freq: midi(ROOT[chordAt(f)] + 12) })), sr, { gain: 0.22, bright: 2200 });
    addMono(B.csBass, pb);
  }

  // ——— The hook (M1): HOOK rows 0–2 as drop 1 sang them (its seeds and pans), rows A and B on; ping-pong 0.3 s; ducked under the scan —
  const vox = stereo(len);
  const whisper = stereo(len);
  const bang = stereo(len);
  const sung = (frame, o, pan = 0, dur = 1, into = vox, norm = null) => {
    const b = new Float32Array(Math.round(dur * sr));
    voxChop(b, 0, sr, o);
    // One level a note (HOOK_NOTE_DB): its dry RMS over the sung length, boosted at most HOOK_MAX_BOOST_DB.
    const g = norm === null ? 1 : Math.min(10 ** (HOOK_MAX_BOOST_DB / 20), 10 ** (norm / 20) / Math.sqrt(b.subarray(0, o.len).reduce((q, x) => q + x * x, 0) / o.len || 1e-12));
    addMono(into, b, { at: lo(frame), pan, gain: g });
  };
  const VOWELS = ['a', 'i', 'u', 'e', 'o'];
  C.HOOK.forEach((note, v) => {
    const len16 = note.len;
    const n = Math.round(seconds(len16 * SIXTEENTH * 0.95) * sr);
    const he = note.at >= C.WINK && note.at < C.HORIZON.at;
    const kind = note.whisper ? 'cswhisper' : he ? 'cshehe' : 'cslead';
    if (!take(kind, null, note.at)) return;
    if (note.whisper) sung(note.at, { freq: midi(note.midi), len: n, vowel: 'i', to: 'e', gain: 0.1, breath: 0.6, seed: 6530 }, 0, 1, whisper, WHISPER_DB);
    else if (he) sung(note.at, { freq: midi(note.midi), len: n, vowel: 'e', to: 'e', glide: -1, gain: 0.3, breath: 0.25, seed: 6531 + v }, v % 2 ? 0.12 : -0.12, 1, vox, HOOK_NOTE_DB);
    else sung(note.at, { freq: midi(note.midi), len: n, vowel: VOWELS[v % 5], to: VOWELS[(v + 2) % 5], glide: len16 >= 3 ? 1 : 0, gain: 0.3, seed: 2870 + v }, (hash(v, 61) - 0.5) * 0.2, 1, vox, HOOK_NOTE_DB);
  });
  // "wa" (M7): a u → a chop on the chord's top note + 12 on every infection clap (and the slingshot), panned ±0.3 alternating.
  [...WA_CLAPS, C.SLINGSHOT].sort((a, b) => a - b).forEach((f, k) => {
    if (!take('cswa', null, f)) return;
    const top = f === C.SLINGSHOT ? 84 : VOICINGS[chordAt(f)][3] + 12;
    sung(f, { freq: midi(top), len: Math.round(seconds(9) * sr), vowel: 'u', to: 'a', gain: 0.14, seed: 6540 + k }, k % 2 ? 0.3 : -0.3, 0.3);
  });
  // 1.1, the sung B♭maj9 (M10) with the waltz's swallowed B♭5 on top, a → o; 1.3, "hey!" as the fragments lock (drop 1's resume "hey").
  if (take('cssung', null, C.BANG)) {
    BANG_CHORD.slice(0, 4).forEach((m, k) => sung(C.BANG, { freq: midi(m), len: Math.round(seconds(36) * sr), vowel: 'a', to: 'o', gain: 0.3, seed: 2860 + k }, -0.3 + 0.2 * k, 1, bang));
    sung(C.BANG, { freq: midi(BANG_CHORD[4]), len: Math.round(seconds(36) * sr), vowel: 'a', to: 'o', gain: 0.32, seed: 6520 }, 0, 1, bang);
  }
  if (take('cshey', null, C.LOCK.from)) sung(C.LOCK.from, { freq: midi(81), len: Math.round(seconds(8) * sr), vowel: 'e', to: 'i', glide: 3, gain: 0.28, seed: 2866 }, 0);
  pingPong(vox, sr, { time: 0.3, feedback: 0.3, mix: 0.28 });
  pingPong(bang, sr, { time: 0.3, feedback: 0.3, mix: 0.28 });
  // The hook leads (HOOK_LIFT_DB; the bang's sung chord as it was: the tier-1 hit's level is set). Under the scan it ducks; the whispered
  // E6 is not ducked (it is the whisper) and gets no ping-pong.
  const lift = 10 ** (HOOK_LIFT_DB / 20);
  for (let i = 0; i < len; i++) {
    const g = lift * voxDuck(frameAt(i));
    B.csVox.L[i] += vox.L[i] * g + lift * whisper.L[i] + bang.L[i];
    B.csVox.R[i] += vox.R[i] * g + lift * whisper.R[i] + bang.R[i];
  }

  // ——— Levels of scale: a crash, a whoosh peaking on the downbeat, a bell run up the chord (the horizon's bells are the waltz's answer) ——
  const levels = [C.LEVELS.earth, C.LEVELS.solar, C.LEVELS.galaxy, C.LEVELS.web, C.LEVELS.horizon];
  levels.forEach((f, i) => {
    place(B.csDrums, f, 3, (b) => crash(b, 0, sr, { gain: 0.22, decay: 1.2 }, 2810 + i), { kind: 'cslevel', pan: i % 2 ? 0.3 : -0.3 });
    swoosh(B.csFx, f, 14, { from: 1200, to: 9000, gain: 0.16, q: 1.4, seed: 2830 + i }, { kind: 'cszoom', pan: i % 2 ? -0.25 : 0.25 });
    if (f === C.LEVELS.horizon) return;
    VOICINGS[chordAt(f)].map((m) => m + 24).forEach((m, k) => place(B.csBell, f, 2.5, (b) => fmBell(b, 0, sr, { freq: midi(m), gain: 0.07, decay: BELL_RING.level, index: 2.2 }), { ...(k === 0 ? { kind: 'csbells' } : { as: 'csbells' }), pan: -0.5 + 0.33 * k, start: f + 3 * k }));
  });

  // ——— Cosmos 1: THE PRINTED BIG BANG · BULLET TIME —————————————————————————————————————————————————————————————————————————————
  place(B.csDrums, C.BANG, 5, (b) => crash(b, 0, sr, { gain: 0.36, decay: 1.8 }, 6500), { kind: 'cscrash' });
  place(B.csFx, C.BANG, 1.8, (b) => impact(b, 0, sr, { gain: 0.3 }, 6501), { kind: 'csimpact' });
  // The explosion: pink noise, wide, held 140 ms and dying; frozen on 1.1e (its tail cut in 20 ms) and held as a grain cloud.
  const freezeAt = lo(C.TIME.freeze);
  const burstL = new Float32Array(Math.round(1.5 * sr));
  const burstR = new Float32Array(burstL.length);
  burst(burstL, burstR, 0, sr, { gain: 0.36, decay: 1.4, holdMs: 140, body: 0.2, seed: 6511 });
  if (take('csburst', null, C.BANG)) {
    const fade = Math.round(0.02 * sr);
    for (let i = 0; i < Math.min(burstL.length, freezeAt + fade); i++) {
      const g = i < freezeAt ? 1 : 1 - (i - freezeAt) / fade;
      B.csFx.L[i] += burstL[i] * g;
      B.csFx.R[i] += burstR[i] * g;
    }
  }
  if (take('csfreeze', null, C.TIME.freeze)) {
    const from = lo(C.TIME.freeze - 2);
    const srcL = burstL.slice(from, freezeAt);
    const srcR = burstR.slice(from, freezeAt);
    const a = freezeAt;
    const m = lo(C.SLICE.held) - a;
    const fr = (i) => frameAt(a + i);
    const gk = duck(m, kicks.filter((k) => k >= C.TIME.freeze && k < C.SLICE.held).map((k) => lo(k) - a), sr, { depth: 0.5, attackMs: 2, releaseMs: 140 });
    const rate = (i) => spinRate(fr(i));
    const cutoff = (i) => 2500 * spinRate(fr(i));
    const gl = new Float32Array(m);
    const gr = new Float32Array(m);
    grains(gl, srcL, 0, m, sr, { gain: 1, grainMs: 28, density: 140, rate, cutoff, seed: 6512 });
    grains(gr, srcR, 0, m, sr, { gain: 1, grainMs: 28, density: 140, rate, cutoff, seed: 6513 });
    // Matched to the burst's level on the frame it freezes (rms of the source), then freezeLevel's settle; cut 1.5 ms on SLICE.held.
    const rmsOf = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / Math.max(1, x.length));
    const k0 = (rmsOf(srcL) + rmsOf(srcR)) / Math.max(1e-9, rmsOf(gl.subarray(0, Math.round(0.05 * sr))) + rmsOf(gr.subarray(0, Math.round(0.05 * sr))));
    const ramp = Math.round(0.0015 * sr);
    for (let i = 0; i < m; i++) {
      const g = k0 * freezeLevel(fr(i)) * gk[i] * Math.min(1, (m - i) / ramp) * Math.min(1, i / (0.02 * sr));
      B.csGrain.L[a + i] += gl[i] * g;
      B.csGrain.R[a + i] += gr[i] * g;
    }
    mark('csspin', C.SLICE.at);
  }
  // The glitter swarm of the frozen debris (drop 1's), from the bang to the slice.
  if (take('csglitter', null, C.BANG)) swarm(B.csBell.L, B.csBell.R, lo(C.BANG), lo(C.TIME.restart) - lo(C.BANG), sr, { gain: 0.13, density: 1400, seed: 2822 });
  // CTRL+V in frozen time: a split pop on each paste of the ream, a step higher each time (700 · 832 · 990 Hz).
  C.REAM_PASTES.forEach((p, k) => place(B.csFx, p.at, 0.2, (b) => pop(b, 0, sr, { freq: 700 * 2 ** (k / 4), gain: 0.16 }), { kind: 'cspop', pan: (k - 1) * 0.3 }));
  // 1.2, the bullet-time rig's servo: a ratchet click-whirr peaking 3 frames in.
  place(B.csFx, C.SHELL, 0.2, (b) => ratchet(b, 0, sr, { gain: 0.12, ms: 140, peakMs: 50, seed: 6514 }), { kind: 'csratchet', pan: 0.2 });
  // The orbit's steps: a whoosh across the field each, panned with the orbit (a launch peaks just after its step; the impact on 1.3 lands).
  const orbitSteps = [
    { at: C.ORBIT[2].at, pre: 1, post: 17, peak: 4, gain: 0.17, span: 0.85 },
    { at: C.ORBIT[4].at, pre: 6, post: 8, peak: 6, gain: 0.12, span: 0.5 },
    { at: C.ORBIT[5].at, pre: 1, post: 11, peak: 3, gain: 0.1, span: 0.45 },
    { at: C.ORBIT[6].at, pre: 1, post: 17, peak: 4, gain: 0.18, span: 0.9 },
  ];
  orbitSteps.forEach((o, k) => placeStereo(B.csFx, o.at, seconds(o.pre + o.post), (L, R, m) => travel(L, R, 0, m, sr, { from: 500, to: 4200, gain: o.gain, q: 1.2, panFrom: -o.span, panTo: o.span, peak: o.peak / (o.pre + o.post), seed: 6515 + k }), { kind: 'csorbit', start: o.at - o.pre }));
  // 1.3, the lock "chk" under "hey!".
  place(B.csFx, C.LOCK.from, 0.05, (b) => stampChk(b, 0, sr, { gain: 0.12, seed: 6520 }), { kind: 'cslock' });
  // 1.4, the slice: the blade's shing (it replaces drop 1's ratchet here); the fill, the riser to Earth; the fountain's flutter.
  place(B.csBell, C.SLICE.at, 0.3, (b) => bladeShing(b, 0, sr, { freq: 3200, gain: 0.11, seed: 6506 }), { kind: 'csshing', pan: -0.1 });
  place(B.csFx, C.FILL[0], seconds(C.LEVELS.earth - C.FILL[0]), (b) => riser(b, 0, b.length, sr, { gain: 0.14 }, 2824), { kind: 'csriser' });
  place(B.csFx, C.FOUNTAIN[0].at, seconds(C.LEVELS.earth - C.FOUNTAIN[0].at), (b) => flutter(b, 0, b.length, sr, { gain: 0.12, rate: 30, tone: 2300, seed: 6521 }), { kind: 'csfountain', pan: 0.15 });
  // 1.4&: the odometer ticks with each Eames square rushing in (the label sits top-left: panned right → left).
  C.POWERS.forEach((f, k) => place(B.csFx, f, 0.03, (b) => blip(b, 0, sr, { gain: 0.05, freq: 2637, ms: 8 }), { kind: 'csodo', pan: 0.4 - 0.3 * k }));

  // ——— Cosmos 2: CITY LIGHTS → SUNRISE ——————————————————————————————————————————————————————————————————————————————————————————
  // Card flaps on every ring of the wave until the sunrise, thicker as the rings grow and wider as the front runs out.
  C.WAVE_RINGS.filter((f) => f < C.SUNRISE.at).forEach((f, k) => {
    if (!take('csflap', null, f)) return;
    const count = 2 + k;
    for (let j = 0; j < count; j++) {
      const off = (SIXTEENTH * j) / count + hash(j, 6550 + k) * 0.6;
      place(B.csFx, f, 0.05, (b) => flap(b, 0, sr, { gain: 0.045 + 0.004 * k, tone: 1500 + 1100 * hash(j, 6551 + k), seed: 6552 + 20 * k + j }), { as: 'csflap', pan: (hash(j, 6553 + k) * 2 - 1) * Math.min(0.85, 0.15 + 0.09 * k), start: f + off });
    }
  });
  // 2.1&: the tilt-up flyover (L, settled 18 f later).
  placeStereo(B.csFx, C.TILT_UP, seconds(20), (L, R, m) => travel(L, R, 0, m, sr, { from: 300, to: 2600, gain: 0.12, q: 1.1, panFrom: 0, panTo: 0.2, peak: 0.2, seed: 6560 }), { kind: 'cstilt' });
  // "wa" + a vinyl zip on the infection claps (2.2, 2.4).
  C.CLAPS.filter((f) => f >= C.LEVELS.earth && f < C.LEVELS.solar).forEach((f, k) => place(B.csFx, f, 0.1, (b) => zip(b, 0, sr, { from: 500, to: 5000, ms: 70, gain: 0.12, q: 1.6, seed: 6561 + k }), { kind: 'cszip', pan: k % 2 ? 0.25 : -0.25 }));
  // 2.2& → 2.3: a reverse swell into the sunrise chord: FM bells on C9 (the glass pad opens +0.8 kHz with it: padCutoff); then the crane whoosh.
  swell(B.csFx, C.PREDAWN, C.SUNRISE.at, 0.18, 6562, { kind: 'csswell' });
  VOICINGS.V.map((m) => m + 24).forEach((m, k) => place(B.csBell, C.SUNRISE.at, 2.5, (b) => fmBell(b, 0, sr, { freq: midi(m), gain: 0.05, decay: BELL_RING.sunrise, ratio: 3.5, index: 1.8 }), { ...(k === 0 ? { kind: 'cssunrise' } : { as: 'cssunrise' }), pan: -0.45 + 0.3 * k }));
  placeStereo(B.csFx, C.SUNRISE.at, seconds(16), (L, R, m) => travel(L, R, 0, m, sr, { from: 250, to: 3200, gain: 0.1, q: 1.1, panFrom: -0.2, panTo: 0.2, peak: 0.2, seed: 6563 }), { kind: 'cscrane' });
  // The flashbulbs: a glint-tink swarm on V's tones from the sunrise to the unwrap.
  if (take('cstinks', null, C.SUNRISE.at)) tinkSwarm(B.csBell.L, B.csBell.R, lo(C.SUNRISE.at), lo(C.UNWRAP.at) - lo(C.SUNRISE.at), sr, { tones: VOICINGS.V.flatMap((m) => [m + 36, m + 48]).filter((m) => m <= 108).map(midi), from: 20, to: 70, gain: 0.03, seed: 6564 });
  // 2.3&: the Moon beam's zap (FM 2 → 6 kHz in 6 f) and the Moon's bell (A6).
  place(B.csFx, C.MOON_BEAM, 0.15, (b) => fmChirp(b, 0, sr, { from: 2000, to: 6000, ms: 100, ratio: 1.5, index: 2, gain: 0.06 }), { kind: 'csbeam' });
  place(B.csBell, C.MOON_BEAM, 2, (b) => fmBell(b, 0, sr, { freq: midi(93), gain: 0.07, decay: BELL_RING.moon, ratio: 3.5, index: 1.6 }), { kind: 'csmoon', pan: 0.1 });
  // 2.4: EARTH INFECTED — the lock clunk under the unwrap and a bell chord.
  place(B.csFx, C.UNWRAP.at, 0.3, (b) => lockClunk(b, 0, sr, { gain: 0.22, seed: 6502 }), { kind: 'csclunk' });
  const bellChord = (f, kind) => VOICINGS[chordAt(f)].map((m) => m + 24).forEach((m, k) => place(B.csBell, f, 2, (b) => fmBell(b, 0, sr, { freq: midi(m), gain: 0.05, decay: BELL_RING.chord, index: 2 }), { ...(k === 0 ? { kind } : { as: kind }), pan: -0.4 + 0.27 * k }));
  bellChord(C.UNWRAP.at, 'csbellchord');
  // 2.4& → 3.1: the whip's fwip, peaking two frames before 3.1, left → right, and a dry stamp "chk" for each crisp copy of Earth (every 2 f).
  placeStereo(B.csFx, C.WHIP.to - 2, seconds(C.WHIP.to - C.WHIP.from + 6), (L, R, m) => travel(L, R, 0, m, sr, { from: 700, to: 8000, gain: 0.2, q: 1.3, panFrom: -0.9, panTo: 0.9, peak: (C.WHIP.to - 2 - C.WHIP.from) / (C.WHIP.to - C.WHIP.from + 6), seed: 6565 }), { kind: 'csfwip', start: C.WHIP.from });
  for (let k = 0; k < 6; k++) place(B.csFx, C.WHIP.from, 0.05, (b) => stampChk(b, 0, sr, { gain: 0.08, seed: 6566 + k }), { ...(k === 0 ? { kind: 'csstamp' } : { as: 'csstamp' }), pan: -0.75 + 0.3 * k, start: C.WHIP.from + 2 * k });

  // ——— Cosmos 3: SLINGSHOT SPIROGRAPH ————————————————————————————————————————————————————————————————————————————————————————————
  // The ratchets: a wood-block tick each, pitched up ring by ring (iii's E5, G5, B5).
  C.RATCHETS.forEach((f, k) => place(B.csFx, f, 0.2, (b) => woodBlock(b, 0, sr, { freq: midi([76, 79, 83][k]), gain: 0.1, seed: 6570 + k }), { kind: 'csblock', pan: -0.3 + 0.3 * k }));
  // The overtype cursors: a typewriter clack on every 16th each, panned with the cursor round its ring.
  C.CURSORS.forEach((c, k) => {
    for (let f = c.at, n = 0; f < c.to; f += SIXTEENTH, n++) place(B.csFx, f, 0.04, (b) => typeClack(b, 0, sr, { gain: 0.04, seed: 6575 + 16 * k + n }), { ...(n === 0 && k === 0 ? { kind: 'csclack' } : { as: 'csclack' }), pan: cursorPan(k, n) });
  });
  // 3.2 → 3.3&: the slingshot's doppler, rising into the dive, peaking on the whip round the Sun (3.3), falling away; left → right.
  placeStereo(B.csFx, C.SLINGSHOT, seconds(C.SLOWMO.from - C.DIVE.from), (L, R, m) => doppler(L, R, 0, m, sr, { from: 3600, to: 700, gain: 0.2, q: 1.5, peak: (C.SLINGSHOT - C.DIVE.from) / (C.SLOWMO.from - C.DIVE.from), width: 0.12, panFrom: -0.8, panTo: 0.8, tone: 330, toneGain: 0.3, seed: 6580 }), { kind: 'csdoppler', start: C.DIVE.from });
  // … and its tail in the slow-mo, an octave down (FX only: the music never slows).
  placeStereo(B.csFx, C.SLOWMO.from, seconds(C.SLOWMO.to - C.SLOWMO.from), (L, R, m) => travel(L, R, 0, m, sr, { from: 420, to: 220, gain: 0.07, q: 1.4, panFrom: 0.8, panTo: 0.9, peak: 0.08, seed: 6581 }), { as: 'csdoppler' });
  // 3.3, THE SLINGSHOT: the boing (350 Hz), "wa" on C6 (above), the CME's fwoom swelling out of the Sun.
  place(B.csFx, C.SLINGSHOT, 0.4, (b) => boing(b, 0, sr, { freq: 350, gain: 0.13 }), { kind: 'csboing' });
  placeStereo(B.csFx, C.SLINGSHOT, seconds(18), (L, R, m) => travel(L, R, 0, m, sr, { from: 90, to: 700, gain: 0.2, q: 0.8, panFrom: -0.3, panTo: 0.3, peak: 0.35, seed: 6582 }), { kind: 'cscme' });
  // The "shk" on the infection claps of 3.
  C.CLAPS.filter((f) => f >= C.LEVELS.solar && f < C.LEVELS.galaxy).forEach((f, k) => place(B.csDrums, f, 0.2, (b) => shaker(b, 0, sr, { gain: 0.12, decayMs: 55, attackMs: 6, tone: 8000 }, 6583 + k), { kind: 'csshk', pan: k % 2 ? 0.3 : -0.3 }));
  // 3.4, THE VICTORY LAP: the whip whoosh (6 f), a bell chord and the carriage-return ding (FM 2.6 kHz, 0.6 s).
  placeStereo(B.csFx, C.LAP.at, seconds(10), (L, R, m) => travel(L, R, 0, m, sr, { from: 900, to: 7000, gain: 0.14, q: 1.3, panFrom: 0.6, panTo: -0.6, peak: 0.3, seed: 6584 }), { kind: 'cslap' });
  bellChord(C.LAP.at, 'csbellchord');
  place(B.csBell, C.LAP.at, 1, (b) => fmBell(b, 0, sr, { freq: 2600, gain: 0.08, decay: 0.6, ratio: 1.41, index: 2.4, attackMs: 0.5 }), { kind: 'csding', pan: 0.55 });
  // 3.4& → 4.1: flung out — a whoosh launching (75 % in 3 f) and the warp's charge rising into 4.1.
  placeStereo(B.csFx, C.FLING.from, seconds(14), (L, R, m) => travel(L, R, 0, m, sr, { from: 2000, to: 9000, gain: 0.15, q: 1.2, panFrom: 0, panTo: 0, peak: 0.2, seed: 6585 }), { kind: 'csfling' });
  place(B.csFx, C.FLING.from, seconds(C.FLING.to - C.FLING.from), (b) => riser(b, 0, b.length, sr, { gain: 0.16 }, 6586), { kind: 'cscharge' });

  // ——— Cosmos 4: WARP ARM → NEON SPIRAL —————————————————————————————————————————————————————————————————————————————————————————
  // 4.1, release into warp: the warp jump (a sine climbing two octaves in 12 f) and the boom (the sub 80 → 40 Hz, 400 ms).
  place(B.csFx, C.WARP, 0.5, (b) => sweep(b, 0, sr, { from: midi(50), to: midi(74), ms: 200, gain: 0.08, wave: 'saw', attackMs: 3, decayMs: 220, drive: 1.2 }), { kind: 'cswarp' });
  place(B.csSub, C.WARP, 0.45, (b) => sweep(b, 0, sr, { from: 80, to: 40, ms: 400, gain: 0.22, attackMs: 3, decayMs: 260 }), { kind: 'cswarpboom' });
  // The warp drone, dipping to 15 % on the glances, cut dead on the snap-out (4.3).
  if (take('csdrone', null, C.WARP)) {
    const a = lo(C.WARP);
    const m = lo(C.REVEAL) - a;
    placeStereo(B.csFx, C.WARP, seconds(C.REVEAL - C.WARP), (L, R, mm) => warpDrone(L, R, 0, mm, sr, {
      freq: midi(38), gain: 0.07, seed: 6587,
      level: (i) => {
        const f = frameAt(a + i);
        const g = C.GLANCES.some((w) => f >= w.from && f < w.to) ? 0.15 : 1;
        return g * Math.min(1, (m - i) / (0.0015 * sr));
      },
    }), { as: 'csdrone' });
  }
  // The stardust (drop 1's galaxy swarm) to the match cut.
  if (take('csstardust', null, C.LEVELS.galaxy)) swarm(B.csBell.L, B.csBell.R, lo(C.LEVELS.galaxy), lo(C.LEVELS.web) - lo(C.LEVELS.galaxy), sr, { gain: 0.06, density: 700, seed: 2840 });
  // 4.2, THE DUST-LANE PUNCH: the whoomp; a short whoosh on each "wa" clap of 4.
  place(B.csFx, C.DUST.punch, 0.45, (b) => whoomp(b, 0, sr, { gain: 0.26, seed: 6516 }), { kind: 'cswhoomp' });
  C.CLAPS.filter((f) => f >= C.LEVELS.galaxy && f < C.LEVELS.web).forEach((f, k) => swoosh(B.csFx, f, 8, { from: 1500, to: 7000, gain: 0.1, q: 1.4, seed: 6588 + k }, { kind: 'csshort', pan: k % 2 ? 0.3 : -0.3 }));
  // 4.2& → 4.3: a reversed whoosh stopping exactly on the snap-out.
  place(B.csFx, C.REVEAL, seconds(C.REVEAL - C.GLANCES[1].from), (b) => swellNoise(b, 0, b.length, sr, { from: 500, to: 9000, gain: 0.18, q: 1.2, curve: 2.4, seed: 6589 }), { kind: 'csrevwhoosh', start: C.GLANCES[1].from });
  // The chime arpeggio climbing the 16ths from 4.1& (a four-note run a beat, each beat a step higher up vi's tones).
  const viTones = [0, 1, 2].flatMap((o) => VOICINGS.vi.map((m) => m + 12 + 12 * o));
  for (let f = C.cs(4, 1.5), n = 0; f < C.LEVELS.web; f += SIXTEENTH, n++) {
    const note = viTones[Math.min(viTones.length - 1, Math.floor(n / 4) + (n % 4))];
    place(B.csBell, f, 0.8, (b) => fmBell(b, 0, sr, { freq: midi(note), gain: 0.045, decay: BELL_RING.chime, ratio: 3.5, index: 1.4 }), { ...(n === 0 ? { kind: 'cschime' } : { as: 'cschime' }), pan: -0.5 + ((n % 8) / 7) * 1 });
  }
  // 4.4, QUASAR: the beam zap (a saw 4 kHz → 400 Hz in 10 f).
  place(B.csFx, C.QUASAR.at, 0.3, (b) => sweep(b, 0, sr, { from: 4000, to: 400, ms: 167, gain: 0.07, wave: 'saw', attackMs: 1, decayMs: 120 }), { kind: 'csquasar' });
  // 4.4& → 5.1: the tilt through the disc, a whoosh rising into the match cut.
  placeStereo(B.csFx, C.TILT.from, seconds(C.TILT.to - C.TILT.from + 4), (L, R, m) => travel(L, R, 0, m, sr, { from: 400, to: 6000, gain: 0.13, q: 1.2, panFrom: 0.3, panTo: -0.3, peak: (C.TILT.to - C.TILT.from) / (C.TILT.to - C.TILT.from + 4), seed: 6590 }), { kind: 'csdisc' });

  // ——— Cosmos 5: LIGHTNING WEB ————————————————————————————————————————————————————————————————————————————————————————————————————
  C.HOPS.forEach((f, k) => place(B.csFx, f, 0.06, (b) => arcZap(b, 0, sr, { freq: midi(hopNote(k)), gain: 0.06, crackle: 0.45, seed: 6600 + k }), { kind: 'csarc', pan: hopPan(k) }));
  // 5.2, THE ROLL + THE DISCHARGE: a glass ping and the roll's swish (clockwise: left → right).
  place(B.csBell, C.ROLL.at, 0.7, (b) => tink(b, 0, sr, { freq: midi(93), gain: 0.07, decayMs: 500, seed: 6612 }), { kind: 'csglass', pan: 0.2 });
  placeStereo(B.csFx, C.ROLL.at, seconds(14), (L, R, m) => travel(L, R, 0, m, sr, { from: 600, to: 4000, gain: 0.12, q: 1.3, panFrom: -0.6, panTo: 0.6, peak: 0.25, seed: 6613 }), { kind: 'csroll' });
  // 5.3, THE WALL: bounce blips (5.3, + 3), the shield's metallic ping (the Defender's: dry, C7), the arcs' spark shower, the red zap-back.
  [C.WALL, C.WALL + 3].forEach((f, k) => place(B.csFx, f, 0.08, (b) => chirp(b, 0, sr, { from: 1400 + 400 * k, to: 2800 + 600 * k, ms: 35, gain: 0.07, wave: 'sine', decayMs: 20 }), { ...(k === 0 ? { kind: 'csbounce' } : { as: 'csbounce' }), pan: k ? 0.35 : -0.35 }));
  place(B.csDry, C.WALL, 0.5, (b) => {
    fmBell(b, 0, sr, { freq: midi(96), gain: 0.06, decay: 0.25, ratio: 2.76, index: 1.2, attackMs: 0.3 });
    metalClick(b, 0, sr, { gain: 0.06, seed: 6614 });
  }, { kind: 'csmetal', pan: 0.25 });
  placeStereo(B.csFx, C.WALL, seconds(20), (L, R, m) => sparkShower(L, R, 0, m, sr, { gain: 0.05, density: 1300, tone: 6000, seed: 6615 }), { kind: 'csshower' });
  place(B.csDry, C.WALL + 3, 0.15, (b) => sweep(b, 0, sr, { from: midi(84), to: midi(72), ms: 70, gain: 0.05, wave: 'square', attackMs: 1, decayMs: 50 }), { kind: 'cszapback', pan: 0.25 });
  // 5.4, THE SCAN: a glass ping, no "wa"; the Defender's scanner tone (dry, 2.4 kHz → 900 Hz, a 30 Hz buzz) top → bottom in 12 f.
  place(B.csBell, C.SCAN.from, 0.7, (b) => tink(b, 0, sr, { freq: midi(96), gain: 0.06, decayMs: 400, seed: 6616 }), { kind: 'csglass' });
  place(B.csDry, C.SCAN.from, seconds(C.SCAN.to - C.SCAN.from), (b) => scanner(b, 0, b.length, sr, { from: 2400, to: 900, buzz: 30, gain: 0.06 }), { kind: 'csscan' });
  // 5.4&, the relight with a wink: the Defender's all-clear chime (pure C6 + E6, 0.25 s, dry) — and the hook's D6s sung as "he-he".
  place(B.csDry, C.WINK, 0.35, (b) => {
    for (const m of [84, 88]) fmBell(b, 0, sr, { freq: midi(m), gain: 0.045, decay: 0.12, ratio: 1, index: 0.2, attackMs: 2 });
  }, { kind: 'csallclear' });
  // 5.4a, the hint: two dry Defender beeps on C7 (30 ms each, 60 ms apart).
  place(B.csDry, C.RETICLE, 0.12, (b) => {
    for (const t of [0, 0.06]) sweep(b, Math.round(t * sr), sr, { from: midi(96), to: midi(96), ms: 30, gain: 0.05, attackMs: 1 });
  }, { kind: 'csbeep', pan: 0.15 });

  // ——— Cosmos 6: EVENT HORIZON ————————————————————————————————————————————————————————————————————————————————————————————————————
  // The waltz's answer (M6) as music-box bells: C6 C6 A5 A5. The universe was born to the waltz and leaves on its answer.
  C.WALTZ_ANSWER.forEach((n, k) => place(B.csBell, n.at, 1.5, (b) => {
    fmBell(b, 0, sr, { freq: midi(n.midi), gain: 0.1, decay: 0.7, ratio: 4, index: 1.3, attackMs: 0.8 });
    fmBell(b, 0, sr, { freq: midi(n.midi + 12), gain: 0.035, decay: 0.4, ratio: 3.5, index: 1, attackMs: 0.8 });
  }, { kind: 'csanswer', pan: k % 2 ? 0.15 : -0.15 }));
  // Spaghettified: a short pitch-down zip on the kicks of 6.1 and 6.2.
  C.SPAGHETTI.forEach((f, k) => place(B.csFx, f, 0.2, (b) => zip(b, 0, sr, { from: 3600, to: 260, ms: 140, gain: 0.08, q: 2.4, seed: 6620 + k }), { kind: 'csspaghetti', pan: k ? 0.3 : -0.3 }));
  // 6.2, ∞: an FM shing cluster on iii's tones three octaves up.
  VOICINGS.iii.map((m) => m + 36).forEach((m, k) => place(B.csBell, C.INFINITY, 1, (b) => fmBell(b, 0, sr, { freq: midi(m), gain: 0.03, decay: 0.5, ratio: 1.414, index: 3.2, attackMs: 0.4 }), { ...(k === 0 ? { kind: 'csshing6' } : { as: 'csshing6' }), pan: -0.45 + 0.3 * k, start: C.INFINITY + k * 0.75 }));
  // The drain's suck: a swirl of noise rising with the drain from the horizon, tripling on the sandbox, stopping dead into the stutter.
  if (take('csdrain', null, C.HORIZON.at)) {
    const a = lo(C.HORIZON.at);
    const m = lo(C.STUTTER.from) - a;
    place(B.csFx, C.HORIZON.at, seconds(C.STUTTER.from - C.HORIZON.at), (b) => drainSuck(b, 0, m, sr, { from: 220, to: 3000, gain: 0.055, speed: (u) => drainSpeed(C.HORIZON.at + u * (C.STUTTER.from - C.HORIZON.at)), seed: 6621 }), { as: 'csdrain' });
  }
  // 6.3, SANDBOX ▶: the clank (the Defender's: dry, mono, centred, C3), the sub sweeping 60 → 30 Hz, a reverse cymbal into the stutter.
  place(B.csDry, C.SANDBOX, 0.6, (b) => clank(b, 0, sr, { freq: midi(48), gain: 0.2, seed: 6505 }), { kind: 'csclank' });
  place(B.csSub, C.SANDBOX, seconds(C.STUTTER.from + 12 - C.SANDBOX), (b) => sweep(b, 0, sr, { from: 60, to: 30, ms: (1000 * (C.STUTTER.from + 12 - C.SANDBOX)) / FPS, gain: 0.3, attackMs: 8, drive: 1.4 }), { kind: 'cssubsweep' });
  swell(B.csFx, C.SANDBOX, C.STUTTER.from, 0.2, 6622, { kind: 'csrevcym' });
  // The stutter's neon (M15): a spark on the first frame of each content slice it plays (STUTTER.from + 0, 6, 9), hotter each time, and
  // the transformer's hum from the second, swelling, to the cosmos's end (finish() plays them on each slice).
  const shown = [...new Set(C.STUTTER_SLICES.map((s) => s.shows))];
  shown.forEach((c, k) => place(B.csFx, c, 0.05, (b) => spark(b, 0, sr, { gain: SPARK_GAIN * (1 + 0.25 * k), tone: 4200 + 900 * k }, 6590 + k), { kind: 'csspark', pan: 0.1 - 0.15 * k }));
  const swellFrames = C.stutterFrame(C.STUTTER.to - 1) + 1 - shown[1];
  place(B.csFx, shown[1], seconds(C.COSMOS.to + 3 - shown[1]), (b) => hum(b, 0, b.length, sr, { gain: 0.035, swell: seconds(swellFrames) }), { kind: 'cshum', pan: 0.1 });

  // The bang's beat stands out (bed): every bus from 1.2 on sits BED_DB under it, stepped down over the 25 ms before 1.2's kick — but
  // the hook's (BED_SPARES: it leads, HOOK_LIFT_DB).
  const a = lo(C.SHELL) - Math.round((BED_RAMP_MS / 1000) * sr);
  for (const [name, bus] of Object.entries(B)) {
    if (BED_SPARES.includes(name)) continue;
    for (let i = Math.max(0, a); i < len; i++) {
      const g = bedGain(frameAt(i));
      bus.L[i] *= g;
      bus.R[i] *= g;
    }
  }
  // Every bus ends on club 1.1 (a 1.5 ms fade).
  S.commit();
  return S.events;
}

/**
 * The neon's spark on each content slice the stutter plays (× 1.25 a slice: hotter each time): loud enough that every slice crackles at
 * output time over the 6.4 beat it replays (the mix above 3 kHz at least doubles in its first 3 ms).
 */
export const SPARK_GAIN = 0.84;
/** The stutter's splices cross-fade over this long (equal power), as bgm.mjs's SPLICE_MS. */
export const SPLICE_MS = 1.5;
/** The stutter's trim ramps in and out over this long just outside it (raised cosine), as bgm.mjs's. */
const TRIM_MS = 5;

/**
 * THE STUTTER (cosmos 6.4 → club 1.1, the approved 6·6·3·3·3·3): each output frame plays the finished mix of the frame the picture shows
 * there (stutterFrame); where the playback jumps — into a repeat, and back onto the timeline on club 1.1 — the first SPLICE_MS
 * cross-fade (equal power) from what was playing into the new place. In place, on a mix whose first sample is film frame `origin`.
 * (bgm.mjs's v04 stutter(), reading this part's score.)
 */
export function stutter(L, R, sr, { origin = 0 } = {}) {
  const at = (f) => sampleOf(f, sr) - sampleOf(origin, sr);
  const b = Math.min(L.length, at(C.STUTTER.to + 1));
  const base = at(C.STUTTER.from - 12);
  if (base < 0 || b <= at(C.STUTTER.from)) return;
  // (A mix that ends on club 1.1 — the part alone, cosmosMix.mjs — has no club frame to splice back onto: the edit stops at its end.)
  const srcL = L.slice(base, b);
  const srcR = R.slice(base, b);
  const x = Math.round((SPLICE_MS / 1000) * sr);
  for (let f = C.STUTTER.from; f <= C.STUTTER.to; f++) {
    const shown = C.stutterFrame(f);
    const before = C.stutterFrame(f - 1) + 1;
    if (shown === f && before === f) continue;
    for (let i = at(f), j = at(shown), c = at(before); i < Math.min(b, at(f + 1)); i++, j++, c++) {
      let l = srcL[j - base];
      let r = srcR[j - base];
      const k = i - at(f);
      if (shown !== before && k < x) {
        const w = Math.sin(((k + 0.5) / x) * (Math.PI / 2));
        const o = Math.cos(((k + 0.5) / x) * (Math.PI / 2));
        l = w * l + o * srcL[c - base];
        r = w * r + o * srcR[c - base];
      }
      L[i] = l;
      R[i] = r;
    }
  }
}

/**
 * The stutter turned down as a whole by one gain, a hair (0.02 dB) under `ceilingDb`, when its splices summed two loud passages over it
 * (so the re-limit leaves it be and its repeats stay what they repeat), ramped in and out over TRIM_MS just outside it. In place;
 * returns the gain in dB (0 when it is under). (bgm.mjs's v04 trimStutter().)
 */
export function trimStutter(L, R, sr, ceilingDb, { origin = 0 } = {}) {
  const at = (f) => sampleOf(f, sr) - sampleOf(origin, sr);
  const a = at(C.STUTTER.from);
  const b = at(C.STUTTER.to + 1);
  const ramp = Math.round((TRIM_MS / 1000) * sr);
  if (a - ramp < 0 || a >= L.length) return 0;
  const z = Math.min(L.length, b + ramp);
  const over = truePeakDb(L.subarray(a - ramp, z), R.subarray(a - ramp, z)) - (ceilingDb - 0.02);
  if (over <= 0) return 0;
  const g = 10 ** (-over / 20);
  for (let i = a - ramp; i < z; i++) {
    const k = i < a ? (i - (a - ramp) + 0.5) / ramp : i >= b ? (b + ramp - i - 0.5) / ramp : 1;
    const gain = 1 + (g - 1) * (0.5 - 0.5 * Math.cos(Math.PI * k));
    L[i] *= gain;
    R[i] *= gain;
  }
  return -over;
}

/**
 * The club arrives a beat early (continuity plan v07 §2.3, FW3's J-cut): over the stutter's last two cells the club's own voices play
 * into its dot — a house-piano stab on IV (the club's first chord, its piano's voicing and top) on the cell at STUTTER.from + 18 and a
 * short horn pickup (the club's brass, lipped up into IV) on the last cell, the point — each in the club's room (its piano's and its
 * brass's plate send), at the club's level into the master, `gain` of its stab. They are written into the finished mix after the stutter
 * (anything on a bus there is the stutter's to overwrite), so they are heard once, on the output frames, and the stutter's repeats stay
 * the approved 6·6·3·3·3·3 underneath. The room's tail rings on a little past club 1.1 (the same plate the club's own sends feed).
 */
export const PRELAP = {
  piano: { at: C.STUTTER.from + 18, frames: 3, gain: 0.5, send: 0.22, seed: 6900 },
  horn: { at: C.STUTTER.from + 21, frames: 2, gain: 0.42, send: 0.2, scoop: 1.2, seed: 6901 },
  /** How long the room's tail runs past the voices (s); its last third fades out (no edge). */
  tail: 1.5,
};
/** The club's level into the master (sections/club.mjs LEVEL_DB) and its piano's stab gain (PIANO.gain), so the pickups are its own. */
const CLUB_LEVEL = 10 ** (CLUB_LEVEL_DB / 20);

/** The pickups alone (stereo, from `PRELAP.piano.at`, dry + the club's plate, at the club's level): what prelap() adds into the mix. */
export function prelapVoices(sr) {
  const n = sampleOf(PRELAP.horn.at + PRELAP.horn.frames, sr) - sampleOf(PRELAP.piano.at, sr) + Math.round(PRELAP.tail * sr);
  const at = (f) => sampleOf(f, sr) - sampleOf(PRELAP.piano.at, sr);
  const piano = stereo(n);
  const horn = stereo(n);
  const v = VOICINGS.IV;
  housePiano(piano.L, piano.R, at(PRELAP.piano.at), sr, {
    notes: [...v, v[3] + 12], len: at(PRELAP.piano.at + PRELAP.piano.frames) - at(PRELAP.piano.at), gain: CLUB_PIANO.gain * PRELAP.piano.gain,
    bright: CLUB_PIANO.bright, decay: CLUB_PIANO.decay, releaseMs: CLUB_PIANO.releaseMs, click: 1, seed: PRELAP.piano.seed,
  });
  hornHit(horn.L, horn.R, at(PRELAP.horn.at), sr, {
    notes: [ROOT.IV + 24, ...v.map((m) => m + 12)], len: at(PRELAP.horn.at + PRELAP.horn.frames) - at(PRELAP.horn.at), gain: PRELAP.horn.gain,
    attackMs: 5, body: 0.6, decayMs: 30, releaseMs: 35, scoop: PRELAP.horn.scoop, seed: PRELAP.horn.seed,
  });
  const send = stereo(n);
  for (let i = 0; i < n; i++) {
    send.L[i] = PRELAP.piano.send * piano.L[i] + PRELAP.horn.send * horn.L[i];
    send.R[i] = PRELAP.piano.send * piano.R[i] + PRELAP.horn.send * horn.R[i];
  }
  const wet = plate(send.L, send.R, sr, { predelayMs: 18, decay: 0.62, damping: 0.4 });
  const out = stereo(n);
  const fade = Math.round((PRELAP.tail / 3) * sr);
  for (let i = 0; i < n; i++) {
    const g = i < n - fade ? 1 : 0.5 + 0.5 * Math.cos((Math.PI * (i - (n - fade))) / fade);
    out.L[i] = g * CLUB_LEVEL * (piano.L[i] + horn.L[i] + 0.9 * wet.L[i]);
    out.R[i] = g * CLUB_LEVEL * (piano.R[i] + horn.R[i] + 0.9 * wet.R[i]);
  }
  return out;
}

/** The pickups into the finished mix (in place; the mix's first sample is film frame `origin`; whatever lies past its end is left out). */
export function prelap(L, R, sr, { origin = 0 } = {}) {
  const a = sampleOf(PRELAP.piano.at, sr) - sampleOf(origin, sr);
  if (a < 0 || a >= L.length) return;
  const v = prelapVoices(sr);
  for (let i = 0; i < v.L.length && a + i < L.length; i++) {
    L[a + i] += v.L[i];
    R[a + i] += v.R[i];
  }
}

/**
 * The finished-mix edit bgm.mjs runs after the limiter: the bang's trim (BANG_TRIM, 1.1 → 2.1), the stutter, then its trim under the
 * limiter's aim, then the club's pickups over its last two cells (bgm.mjs re-limits what the edits changed; the bang's trim only lowers).
 */
export function finish(L, R, sr, { origin = 0 } = {}) {
  bangTrim(L, R, sr, { origin });
  stutter(L, R, sr, { origin });
  trimStutter(L, R, sr, LIMIT_DB - MARGIN_DB, { origin });
  prelap(L, R, sr, { origin });
}

/** The cosmos's first and last samples in the film at `sr` (its WAV and its tests). */
export const COSMOS_SAMPLES = (sr) => ({ from: sampleOf(C.COSMOS.from, sr), to: sampleOf(C.COSMOS.to, sr) });

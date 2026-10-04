// The ending's sound, the part 'outro' (its 5 bars, film bars 57–61, the end of the film): CURTAIN CALL. Build sheet notes/b58/ending-sheet.md §8,
// on the music bible (prep/music.md §4.8, M1–M15), every frame from src/score/outro.ts, so every sound lands on the picture's frame
// (an event on frame f starts on sample f / 60 s × sr exactly). Positions in these comments are outro bar.beat.
//   outro 1, IV (Bmaj9), no drums: the relay's thunk as the blue bursts out of his spot, the FM "uh-oh", a soft e-piano (its 1.1 strike
//     an octave up, in the music box's register; WP6) and the blue screen's hum swelling in over the beat; the heartbeat (lub-dub on 1.1
//     and 1.3, drop 2's bullet-time thumps going on) is the kick lane; drop 2's glass ringing into the blue on the burst's 32nds (WP6,
//     where v06 had the band's chatter), the bytes' dump and a click per byte group as his face comes back; a progress tick a 16th up the F♯ scale;
//     the stamp's beep-boop; the 2D code's ticks; the slide's swish and the small print's zip; the guest's smug hm-hm; the promise chime
//     (the wink's ding an octave down); the antivirus's reticle sweeping in, dry and on C (M8).
//   outro 2, Vsus → V: the lock beeps and the ✓'s dry thump in the lub's slot — his last heartbeat — and where the dub should be, only
//     the antivirus's first key; `exit`, Enter, and the CRT powering off as the picture squeezes (the e-piano sags an octave); the
//     flatline's tone and the line's whine (M13), the V muffled under it on a C♯2 pedal; one beep shaped like his ω (the whine dips with
//     it); the curl's stretch, the twitch, the iris-out's glide and its tup; two knocks from inside the dot, a lub and a dub on C♯2; the
//     breath (M4: reverse cymbal and inhale) from the beep into the tonic.
//   outro 3, I (F♯6/9), the film's first tonic: supersaws opening with the iris, the sung chord (M10), F♯1, a soft kick, the bells; W5
//     typing in; the wink's ting (v04's, ruling 13) over a ducked bed and the Defender's two C4 blips; the ✧ twinkling on the 8ths;
//     ↑ ↑ (a key played low, a zip up the pentatonic, a sung pickup); a riser; Enter and the count-in kick; the replication bloops, the
//     boot chime's 1-3-5-9 rebooted in F♯ (M3).
//   outro 4, I, the encore (r4, U5: unhurried; the ending's loudest bar): kick, crash, the chord re-struck under a sidechain
//     keyed to the kicks, drop 2's hook row 1 in its own rhythm with its third below (M1); the drums are the roll call's clock — kicks on
//     the beats, claps on 2 and 4, closed hats on the off-8ths, and every hit a call (R13) — eight headliners one an 8th climbing the F♯
//     scale, each in its world's voice, each a note that rings into its 8th; the wall's chatter, seven flights, his landing; the guest's
//     footsteps from the left wing on the 8ths of 4.3–4.4, the cat's patter dashing in from the right, the two thuds of the plant on
//     4.4a (R14); the bow wave's "aww" swelling to the cat's bow.
//   outro 5, the bows → the cursor (U5 / U6): "ba-da-BUM" — the cat's bow on the kick with a soft crash and its nya; the guest's on the
//     clap, a clink, his hm-hm bending C → C♯ (the infected Defender), his glass's last drop, drop 2's plink, over a ducked bed; the
//     chord lifts for a 32nd (the band's breath) and on his bow THE BUTTON: kick, crash and the I chord struck once more (R16); the band
//     stops on it and the chord, struck forte (BUTTON_STRIKE), rings out under the dive (RING: its low-pass closes over two beats,
//     to 500 Hz as the camera lands in the █ and on to 200 Hz by the ring's end; finish() releases it ≈ 0.5 dB a frame, so S01's
//     cursor tick on the landing sits on the chord's tail (≈ −33 dBFS, −39 above 300 Hz), which then dies, faster, to zero by the
//     ring's end, RING_OUT: 5.4 on the 5.3 landing), with the tube's
//     power-down heard under it (M13's whine falling, faint, gone before the landing); the tick on 5.4 alone (×2), the last sound of the
//     film and its first.
// Every voice is drawn into the ending's own section-long buffers and added into the buses on outro 1.1 (the Defender's into its own
// dry bus, `outdry`); nothing is drawn before 1.1 (drop 2 owns its digital zero and the CUT) or past the film's end. bgm.mjs reads the
// hooks below. The ending is built through on the 61-bar map (r4): every bar of it is heard in bgm.wav.
import { EXIT_TYPED, HEADLINERS } from '../../../src/content/outro.ts';
import { clamp } from '../../../src/engine/math.ts';
import { hash } from '../../../src/engine/random.ts';
import { HOOK2 } from '../../../src/score/drop2.ts';
import { partStart, seedFrame } from '../../../src/score/film.ts';
import * as O from '../../../src/score/outro.ts';
import { FPS, FRAMES_PER_BAR, FRAMES_PER_BEAT } from '../../../src/score/tempo.ts';
import { SPOT_AT, seatAt, springL } from '../../../src/shots/outroShared.ts';
import { chip, knock, tink, zip } from '../breakVoices.mjs';
import { housePiano } from '../clubVoices.mjs';
import { glass } from '../drop2Act2Voices.mjs';
import { sweep, voxLine } from '../drop2Voices.mjs';
import { blip, clap, click, hat, impact, kick, pop, riser } from '../drums.mjs';
import { Biquad } from '../filters.mjs';
import { fmBell } from '../fm.mjs';
import { WHOOSH_PEAK, crash, inhale, reverseCymbal, whoosh } from '../fx.mjs';
import { keyPan, keyPress } from '../keys.mjs';
import { addMono, duck, stereo } from '../mix.mjs';
import { bloop, boing, chokeChannel, cursorTick, ePiano, heartThump, hum, lineWhine, monitorTone, powerOff, relay, repitch, ting, tremolo, twinkle } from '../outroVoices.mjs';
import { subPulse, supersaw } from '../synth.mjs';
import { voxChop } from '../vox.mjs';
import { thirdBelow } from './drop2.mjs';

/** The reverb restarts on 1.1: nothing of drop 2 rings on under the blue screen. */
export const CUTS = [O.OUTRO_START];
/**
 * Only SETTLE is gated (U6): from his bow the I chord and the hall ring on and finish() releases them to exact zero by 5.4; finish() adds
 * the tube's whine and S01's two ticks after the gate, their tails closed into SETTLE. (As first built the mix was gated from SILENT,
 * the choke's end.)
 */
export const SILENCES = [{ from: O.SETTLE.from, to: O.LOOP }];
/** The Defender's own bus (M8, M9): dry and narrow — the reticle, the lock, the ✓, `exit`, its blips, the guest's hums. */
export const SENDS = { outdry: 0.04 };
/** bgm.mjs's PREVIEWS are bar ranges, one span each; the ending's preview wraps round the loop, so it is LOOP_PREVIEW below. */
export const PREVIEWS = [];
/**
 * The `loop` preview (music.md §6.4, and §4.8's loop check; r4: film bar 61 + the intro's first bar): outro 5 — the bows, the button,
 * the ring-out under the dive, the two ticks and the settle's zero — then the film's first bar (frame 0's power-on and S01's ticks), one
 * WAV, so the seam the film loops over is heard from the tree. scripts/audio/outroLoop.mjs writes it (public/audio/sections/loop.wav);
 * bgm.mjs can write it too with loopPreview().
 */
export const LOOP_PREVIEW = {
  id: 'loop',
  spans: [
    { from: O.at(5), to: O.LOOP },
    { from: partStart('intro'), to: partStart('intro') + FRAMES_PER_BAR },
  ],
};
/** LOOP_PREVIEW cut from the finished film mix `L`, `R` (sample rate `sr`) and joined sample-exact: the film's last sample, then its first. */
export function loopPreview(L, R, sr) {
  const at = (frame) => Math.round((frame / FPS) * sr);
  const spans = LOOP_PREVIEW.spans.map((w) => [at(w.from), at(w.to)]);
  if (spans.some(([a, b]) => a < 0 || b > L.length)) throw new Error(`outro: the loop preview needs the whole film (${L.length} samples)`);
  const n = spans.reduce((k, [a, b]) => k + b - a, 0);
  const out = { L: new Float32Array(n), R: new Float32Array(n) };
  let k = 0;
  for (const [a, b] of spans) {
    out.L.set(L.subarray(a, b), k);
    out.R.set(R.subarray(a, b), k);
    k += b - a;
  }
  return out;
}

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
/** A seed in the ending's range (5000–5999) for voice `v` on frame `f`. */
const seed = (v, f) => 5000 + Math.floor(hash(v, seedFrame(f), 5000) * 1000);
/** A picture x (layout px) as a pan, as the sheet places gags: x / 960 − 1, × 0.9. */
const panX = (x) => (x / 960 - 1) * 0.9;
const dbGain = (db) => 10 ** (db / 20);

/** The chords' upper voices (MIDI): drop 2's voicings (+1 on drop 1's) on the e-piano, and the tonic's F♯6/9 on the supersaws. */
export const VOICINGS_OUT = {
  IV: [59, 63, 66, 70, 73],
  Vsus: [61, 66, 68, 71, 75],
  V: [61, 65, 68, 71, 75],
  I: [61, 63, 66, 68, 70, 78, 80, 82, 94],
};
/** Each chord's root (MIDI): B1 (the heartbeat and the hum), C♯2 (the pedal and the knocks), F♯1 under the tonic. */
export const ROOTS_OUT = { IV: 35, Vsus: 37, V: 37, I: 30 };

/** The heartbeat (sheet §8): the lub on B1 at −18 dBFS, the dub at −22, both τ 70 ms; the knocks from inside the dot a lub and a dub on C♯2. */
export const HEART = { lub: { m: 35, gain: dbGain(-18) }, dub: { m: 35, gain: dbGain(-22) }, knocks: { m: 37, gains: [0.12, 0.16] } };
/**
 * WP6 (v07, seam 5376; the review found the transition from drop 2 into the ending weak too): the burst's glass — the bullet time's crown of frozen droplets, in its own
 * glass voice (FW3's carry) — on the burst's 32nds from 1.1 (src/shots/outroBlue.ts BURST): falling down the IV (Bmaj9) from the music box's
 * hanging C♯6 — C♯6 A♯5 F♯5 D♯5, the music box's own rising F♯5 F♯5 A♯5 C♯6 answered downward — each panned further out as the
 * front runs out of his spot; the first, on the downbeat, under the relay and the lub.
 */
export const SEAM_GLASS = { notes: [85, 82, 78, 75], gains: [0.055, 0.085, 0.078, 0.066], decayMs: [220, 260, 300, 400], pans: [0.15, -0.45, 0.65, -0.85] };
/** WP6: the blue screen's hum swells in over the seam's beat (frames), so the new room arrives over the beat, not on it (FW4). */
export const HUM_SWELL = FRAMES_PER_BEAT;
/** The progress ticks, a step up the F♯ major scale on each 16th: C♯6 … B7. */
export const PROGRESS_NOTES = [85, 87, 89, 90, 92, 94, 95, 97, 99, 101, 102, 104, 106, 107];
/** The stamp's beep-boop (R3: in key): A♯4 → F♯4. */
export const STAMP_NOTES = [70, 66];
/** The Defender's pitches (M8: pitch class C, the tritone against F♯): the reticle's sweep C5 → C6, the lock beeps C6, the wink's blips C4. */
export const DEFENDER = { reticle: [72, 84], lock: 84, blips: 60 };
/** The replication bloops (M3): the boot chime's 1-3-5-9 (F A C G on intro 1.3) a semitone up, rising: F♯5 A♯5 C♯6 G♯6. */
export const BLOOP_NOTES = [78, 82, 85, 92];
/** The encore (M1, R13): drop 2's HOOK row 1 (src/score/drop2.ts HOOK2, its first bar: eight notes), one on each of ENCORE's onsets, in the hook's own rhythm. */
export const ENCORE_NOTES = HOOK2.filter((h) => h.at < HOOK2[0].at + FRAMES_PER_BAR).slice(0, O.ENCORE.length).map((h) => h.midi);
/** Each encore note's length in 16ths, the hook's own (2 1 2 2 3 1 2 2: the last held to the bows bar's downbeat). */
export const ENCORE_LENS = HOOK2.filter((h) => h.at < HOOK2[0].at + FRAMES_PER_BAR).slice(0, O.ENCORE.length).map((h) => h.len);
if (ENCORE_NOTES.length !== O.ENCORE.length) throw new Error(`outro: drop 2's hook row 1 has ${ENCORE_NOTES.length} notes for the encore's ${O.ENCORE.length} onsets`);
/** The roll call: the F♯ major scale from F♯6, one note per headliner (HEADLINERS' order), each panned to its seat. An octave over the sheet's F♯5 (r1,
 * kept in r4): six of the eight calls land on a hook note, which sings G♯5–B5, so in its register they were masked (−23 dB in their band); up here both read. */
export const CALL_NOTES = [90, 92, 94, 95, 97, 99, 101, 102];
export const CALL_PANS = HEADLINERS.map((h) => panX(seatAt(h.seat).at[0]));
/**
 * Every call at one level, so the eight worlds read as one climbing line, each heard (U5: one an 8th, readable; r3's were a 32nd each):
 * scaled so its first `bodyMs` hold `rms`, then closed on a raised cosine over `fadeMs` to end by `ms` (three quarters of its 8th: the
 * next call starts clean; the plate rings them on); the last, drop 2's, rings for `lastMs` into the plant.
 */
export const CALL_SHAPE = { rms: 0.075, bodyMs: 30, ms: 150, fadeMs: 60, lastMs: 190 };
/** One call's buffer `b` shaped to CALL_SHAPE, in place. */
export function shapeCall(b, sr, last = false) {
  const { rms, bodyMs, ms, fadeMs, lastMs } = CALL_SHAPE;
  const body = Math.min(b.length, Math.round((bodyMs / 1000) * sr));
  let e = 0;
  for (let i = 0; i < body; i++) e += b[i] * b[i];
  const g = e > 0 ? rms / Math.sqrt(e / body) : 0;
  const end = Math.min(b.length, Math.round(((last ? lastMs : ms) / 1000) * sr));
  const fade = Math.round((fadeMs / 1000) * sr);
  for (let i = 0; i < b.length; i++) {
    const k = i - (end - fade);
    b[i] *= i >= end ? 0 : k > 0 ? g * (0.5 + 0.5 * Math.cos((Math.PI * k) / fade)) : g;
  }
}
/** drop 2's crash plink (sections/drop2.mjs, its freeze: fmBell F♯6, ratio 3.5, index 3, decay 0.4), on the guest's last drop. */
export const PLINK = { midi: 90, ratio: 3.5, index: 3, decay: 0.4, gain: 0.26, pan: -0.6 };
/**
 * The gags' levels after the solo-against-mix pass (music.md §4.5 rule 3: tier A leads its band, tier B within 6 dB of the bed there),
 * measured through the chain (notes/b58/music/audible.mjs): at the sheet's figures most sat 7–24 dB under the bed in their own band.
 * `knocks` are *tok*, *tok!* (the interlude's knuckle on glass, from inside the dot); `bloop` rises from the first count to the last.
 * Round 1: the knocks 0.2 / 0.28 → 0.23 / 0.32 (+1.2 dB), so they still lead the louder breath (SWELL) by ≈ 4 dB in their band; the nya
 * 0.5 → 0.45 with the encore's trim (still within 6 dB of the bed: −5 dB).
 */
export const GAG = {
  uhoh: 0.1, stamp: 0.1, stampClick: 0.08, smug: 0.14, reticle: 0.08, bell: 0.09, defender: 0.08, up: 0.6, zip: 0.08,
  bloop: [0.07, 0.13], nya: 0.45, hmhm: 0.3, knocks: [0.23, 0.32],
};
/** The breath's swell makes room for each knock: −9 dB from 1 ms before it, held 40 ms, back over 60 ms. */
export const KNOCK_DUCK = { depth: 0.355, leadMs: 1, attackMs: 2, holdMs: 40, releaseMs: 60 };
/** The bed under the plink (sheet §8: "the bed ducked 60 ms"): −6 dB from 1 ms before it, held, back over its last 20 ms. */
export const PLINK_DUCK = { depth: 0.5, leadMs: 1, attackMs: 3, holdMs: 36, releaseMs: 20 };
/** The wink's ting (v04 iteration 3, kept: ruling 13 — the FM ding threw its energy above 8 kHz): F♯7 and C♯7 bars, and the glints. */
export const WINK_TING = { high: 0.46, low: 0.24, decay: 0.5, glint: 0.09, glint2: 0.04 };
/** The bed's duck under the wink (v04): −9 dB, down over 3 ms from 2 ms before it, held 50 ms, back over 70 ms. */
export const WINK_DUCK = { depth: 0.355, leadMs: 2, attackMs: 3, holdMs: 50, releaseMs: 70 };
/** The last ticks, 6 dB over S01's own (v04 ruling 13: alone after the choke, at S01's level they could be missed). */
export const LAST_TICK_GAIN = 2;
/** The cat's patter as it dashes on (4.4 → 4.4a, R14): four ticks on the 32nds after the call's kick, over before the plant. */
export const PATTER = [3, 6, 9, 12].map((k) => O.CAT_DASH.from + k);
/** The guest's footsteps (STEPS) panned with him from the left wing (x −260 → 560): −0.9 on the first, −0.4 on the last. */
export const STEP_PANS = [-0.9, -0.73, -0.57, -0.4];
/**
 * The tube powers down with the picture (POWER_DOWN, R16's option; M13's whine, the CRT line's): a dry sine from his bow, falling
 * `from` → `to` Hz on the power-down's own curve (fastest at first, 1 − (1 − u)²), its peak `gainDb`, in over `inFrames` and closed
 * on a raised cosine over `outFrames` to end `gap` frames before the █ lands, so the first tick is clean. finish() adds it after the
 * release (the band's stop never chokes it); the ring's closing low-pass leaves it the only thing up there.
 */
export const TUBE = { from: 11000, to: 4000, gainDb: -41, inFrames: 2, outFrames: 8, gap: 2 };
/**
 * The encore resolves (U6; in v07 the music cut off too abruptly — the whole mix choked to digital zero in ≈ 3 frames on his
 * bow, then nothing but the two ticks). Music fixer, round 2 (R2S-U6-MUSIC); r4 (U5 / U6, the fifth bar): the same gesture over a full
 * beat, from the button. Every point is on the score's frames (STOP, SLAM, TICKS, SETTLE).
 * - The button (R16): on his bow the band plays its last hit — kick, crash and the I chord struck once more (CHORDS_OUT's sixth row) —
 *   then stops on it (STOP): every bus but `buses` chokes over the 32nd (the hand on the cymbal), before the reverb, so the hall rings
 *   on with what it heard.
 * - The I chord rings on with its F♯1: struck on the button `bloomDb` over the encore's level (the room the band leaves, filled; with
 *   BUTTON_STRIKE's accent over the 32nd: ringBloom), and its low-pass closes over the whole ring (RING_OUT: his bow → the ring's end;
 *   ringClose / ringCutoff), log-linearly in two legs: from open (9 / 11 kHz) to `landHz` on the █'s landing (SLAM.to, the first
 *   tick), then on to `closeHz` by RING_OUT.to. The chord darkens as the camera goes into him and on into the █, but it is still the
 *   chord under the landing's tick: its C♯4–A♯4 pass at `landHz` while the tick (1760 Hz) sits ≥ 20 dB over it above 1 kHz.
 * - finish() releases what rings (the chord, its root, the hall) from his bow, dB-linearly to `dbAtTick` on the landing's tick
 *   (TICKS[0]), then on, faster (the damper comes down as the █ lands), dB-linearly to `dbAtEnd` by the ring's end (RING_OUT.to),
 *   its last `taper` frames closed on a raised cosine to exact zero (ringRelease): the tick sits on the chord's tail, and the tail has
 *   died by the ring's end (the second tick on 5.4 when the █ lands on 5.3: that tick is alone, as frame 0's is; SETTLE at the
 *   latest). On the 5.3 landing: ≈ 0.5 dB a frame to the tick (T60 ≈ 2 s), ≈ 1.3 after it over the whole beat 5.3 → 5.4; the tail
 *   under the first tick ≈ −33 dBFS (−39 above 300 Hz: on a laptop it is the chord, not a rumble), under −60 dBFS 6 frames before
 *   the second, no frame falling more than 4 dB while it is over −50 dBFS. Every point is a score name, so a retimed landing
 *   (U5b: 5.4) carries the gesture.
 *   u5 music fixer, round 1 (M1, the taste review of v13): as r4 built it (dbAtTick −23, a 12-frame fade, closeHz reached on SLAM.to)
 *   the filter took the chord's identity faster than the release took its level: above 300 Hz it fell 1–4 dB a frame from 5788 and was
 *   −54 dBFS by 5807, and tick 1 landed on a −47 dBFS bed that was almost all sub-bass (≈ 0.3 s of audible ring).
 * - The ticks' own tails (the plate's, flat at −50 … −57 dBFS) close on a raised cosine over `tickTail` frames into SETTLE instead of
 *   being gated there (tickTail): SETTLE alone is digital zero, so frame 0's power-on still starts from silence.
 */
export const RING = { buses: ['chords', 'sub'], bloomDb: 8, landHz: 500, closeHz: 200, dbAtTick: -12, dbAtEnd: -44, taper: 6, tickTail: 12 };
/** The ring's tail (frames): from the landing's tick (TICKS[0]) to the ring's end (RING_OUT.to), where it is exactly 0. */
export const ringFade = () => O.RING_OUT.to - O.TICKS[0];
/** The low-pass's closing at frame `f` (0 → 1): 0 to his bow, linear over the ring (RING_OUT), 1 after. */
export const ringClose = (f) => clamp((f - O.RING_OUT.from) / (O.RING_OUT.to - O.RING_OUT.from));
/**
 * The ring's low-pass at frame `f` for a voice open at `hz`: `hz` to his bow, then log-linear to RING.landHz on the █'s landing
 * (SLAM.to) and on to RING.closeHz by the ring's end (RING_OUT.to), held after.
 */
export function ringCutoff(hz, f) {
  if (f <= O.RING_OUT.from) return hz;
  if (f <= O.SLAM.to) return hz * (RING.landHz / hz) ** ((f - O.RING_OUT.from) / (O.SLAM.to - O.RING_OUT.from));
  return RING.landHz * (RING.closeHz / RING.landHz) ** clamp((f - O.SLAM.to) / (O.RING_OUT.to - O.SLAM.to));
}
/**
 * The button's chord (R16; u5 music fixer, round 1, M2): the I chord is STRUCK on his bow, `db` over the ring's level on the strike and
 * back to it on a raised cosine over `frames` (the band's 32nd, STOP), so the BUM is the bar's biggest hit above the lows too. As r4
 * built it the chord came in at the encore's level and bloomed over the 32nd: on the button's frame it read −30 dBFS above 300 Hz,
 * 10 dB under the band, and the frame was no bigger than the guest's plink there (−20.2 against −19.2; above 2 kHz −23.0 against −19.9).
 */
export const BUTTON_STRIKE = { db: 6, frames: 3 };
/**
 * The chord's level from his bow at frame `f` (a gain over the encore's): RING.bloomDb at once (the room the band leaves, filled), with
 * BUTTON_STRIKE's accent on top over its first frames. 1 before his bow.
 */
export function ringBloom(f) {
  if (f < O.STOP.from) return 1;
  const u = clamp((f - O.STOP.from) / BUTTON_STRIKE.frames);
  return dbGain(RING.bloomDb) * (1 + (dbGain(BUTTON_STRIKE.db) - 1) * (0.5 + 0.5 * Math.cos(Math.PI * u)));
}
/**
 * finish()'s release at frame `f` (a gain, 1 → 0): 1 to his bow (RING_OUT.from); dB-linear to RING.dbAtTick on the landing's tick
 * (TICKS[0]) and on, faster (the damper comes down as the █ lands), to RING.dbAtEnd by the ring's end (RING_OUT.to); the last
 * RING.taper frames closed on a raised cosine, so it is exactly 0 from the ring's end. Both legs are rings (constant dB a frame): a
 * raised cosine over the whole tail (as M1 first put it) steps 5 dB a frame at −50 dBFS as it closes; this one ≤ 4 while it is heard.
 */
export function ringRelease(f) {
  const { from, to } = O.RING_OUT;
  if (f <= from) return 1;
  if (f >= to) return 0;
  const land = O.TICKS[0];
  const d = f <= land ? (RING.dbAtTick * (f - from)) / (land - from) : RING.dbAtTick + ((RING.dbAtEnd - RING.dbAtTick) * (f - land)) / ringFade();
  const k = f - (to - RING.taper);
  return dbGain(d) * (k > 0 ? 0.5 + 0.5 * Math.cos((Math.PI * k) / RING.taper) : 1);
}
/** A tick's tail at frame `f` (a gain): 1, then closed on a raised cosine over RING.tickTail frames, 0 from SETTLE. */
export function tickTail(f) {
  const k = f - (O.SETTLE.from - RING.tickTail);
  if (k <= 0) return 1;
  return k >= RING.tickTail ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * k) / RING.tickTail);
}

/** Every key the ending presses: the antivirus's `exit` and Enter (dry), W5's four rows (`w5`), ↑ ↑ (the space key played low), his Enter. */
export const TYPED = [
  ...O.KEYS.map((frame, i) => ({ frame, ch: [...EXIT_TYPED][i], kind: 'letter', dry: true })),
  { frame: O.ENTER, ch: '\n', kind: 'enter', dry: true },
  ...[0, 1, 2, 3].map((k) => ({ frame: O.MONITOR_BACK + 2 * k, ch: 'w', kind: 'letter', w5: true })),
  ...O.RECALL.map((frame) => ({ frame, ch: '↑', kind: 'space' })),
  { frame: O.RUN, ch: '\n', kind: 'enter' },
];
if ([...EXIT_TYPED].length !== O.KEYS.length) throw new Error(`outro: ${O.KEYS.length} key frames for "${EXIT_TYPED}"`);

/** The power-off as the CRT squeezes (ENTER → LINE): the e-piano sags an octave as u³ and fades as 1 − u⁶ (heard falling before it is gone). */
export const powerDown = (f) => {
  const u = clamp((f - O.ENTER) / (O.LINE - O.ENTER));
  return { bend: -12 * u ** 3, amp: 1 - u ** 6 };
};
/**
 * The line's ω, heard (0 → 1): the whine dips from 11 to 9 kHz as the pulse dips into his ω on the beep (a quarter sine over a 32nd) and
 * comes back as the curl flattens the ω into its arc (CURL.from → + 6, a half cosine).
 */
export function whineDip(f) {
  if (f < O.BEEP) return 0;
  if (f < O.BEEP + 3) return Math.sin((Math.PI / 2) * ((f - O.BEEP) / 3));
  if (f < O.CURL.from) return 1;
  return f < O.CURL.from + 6 ? 0.5 + 0.5 * Math.cos((Math.PI * (f - O.CURL.from)) / 6) : 0;
}
/** The iris's opening (the pry, springL from outro 3.1): the tonic's top end opens with it. */
export const irisOpen = (f) => springL(f, O.OPEN);

/** A duck's gain curve over `n` samples: down to `depth` over `attackMs` from `leadMs` before `at`, held `holdMs`, back on a raised cosine over `releaseMs`. */
function bedDuck(n, at, sr, { depth, leadMs, attackMs, holdMs, releaseMs }) {
  const g = new Float32Array(n).fill(1);
  const ms = (x) => Math.round((x / 1000) * sr);
  const [a0, a1] = [at - ms(leadMs), at - ms(leadMs) + ms(attackMs)];
  const [r0, r1] = [a1 + ms(holdMs), a1 + ms(holdMs) + ms(releaseMs)];
  for (let i = Math.max(0, a0); i < Math.min(n, r1); i++) {
    const u = i < a1 ? (i - a0) / (a1 - a0) : i < r0 ? 1 : 1 - (i - r0) / (r1 - r0);
    g[i] = 1 - (1 - depth) * (0.5 - 0.5 * Math.cos(Math.PI * u));
  }
  return g;
}
/** WINK_DUCK as a gain curve over `n` samples, its onset at sample `at`. */
export const winkDuck = (n, at, sr) => bedDuck(n, at, sr, WINK_DUCK);

// Levels (linear, pre-limiter), set against the sheet's arc (§8): bar 1 ≈ −18 LUFS, bar 2 ≈ −19 rising to −15, 3.1 ≈ −12 (its bar ≈ −14),
// outro 4 the peak bar ≈ −12.5 with 4.1 −11 to −10.5, outro 5 ≈ −15, the part −15 ± 1 (tests/outroAudio.test.mjs measures them through
// the chain; r4's encore levels are ENCORE_MIX below). Round 1 (R1-MUSIC-ARC): 4.1's loudest
// 400 ms read −10.36 (over the −10.5 cap) once SUB_DUCK let the limiter go, so the encore's bed and kicks came down (SAW_ENCORE 0.72 →
// 0.63, KICK_ENCORE 0.55 → 0.48, the cat's nya 0.5 → 0.45) and the hook a little (LEAD 0.52 → 0.49, HARMONY 0.34 → 0.32): the hook still
// leads; 4.1 now reads −10.8 a beat, −10.6 at its loudest 400 ms.
const EP = 0.11;
const EP_V = 0.05;
/**
 * Round 1 (R1-MUSIC-ARC): bar 2 rises from the beep. The muffled V and its C♯2 pedal hold under the flatline (his death: the bar's floor,
 * 2.2) and swell from the beep (he is alive) to `gain` × by the iris-out's close; the beep and its boing come up to read as the beat's
 * event. As built (round 0) 2.3 was the ending's quietest beat (−21.9 LUFS) and bar 2 −20.2.
 */
export const V_SWELL = { gain: 2, beep: 0.08, boing: 0.06 };
/** The V's and the pedal's swell (1 → V_SWELL.gain) at frame `f`: flat to the beep, linear from the beep to the close, held after. */
export const vSwell = (f) => 1 + (V_SWELL.gain - 1) * clamp((f - O.BEEP) / (O.CLOSE.to - O.BEEP));
/**
 * The F♯1 pulse under each of the encore's kicks (KICKS, the button's included) ducked off the kick's attack (music.md §6.2: the kicks
 * duck the sub, 0.85, release 100–120 ms). Round 0 struck both on the same sample, in phase near 46 Hz: their sum met the limiter 2.6 dB
 * over on 4.1 and 3.6 dB over on the guest's bow, and the MP4's AAC lifted the limited peaks to −1.97 dBTP. The tonic's own pulse (3.1,
 * under the soft kick) blooms as built: its arrival is the knocks' C♯ resolving.
 */
export const SUB_DUCK = { depth: 0.85, attackMs: 2, releaseMs: 110 };
const SAW_A = 0.072;
const SAW_B = 0.04;
const SUNG = 0.14;
/**
 * The encore's levels (r4: its whole bar and the bows bar's two beats; the band's kit on the calls): the supersaws (under the kicks'
 * sidechain, `pump` deep), the hook and its third, the kick on each beat (drop 2's big kick is 0.75 in its denser mix; here the hook
 * leads) and the button's, the claps, the closed hats, the crashes (the burst's, the bows bar's soft one, the button's), the F♯1 on each
 * kick (the burst's and the button's a little fuller), and the band's breath: the chord's level on the button's eve (a 32nd, R16).
 */
export const ENCORE_MIX = {
  saw: 0.5, pump: 0.6, burstPump: 0.2, lead: 0.44, harmony: 0.29, burstKick: 0.55, kick: 0.4, button: 0.6, clap: 0.5, hat: 0.11,
  crash: 0.45, burstImpact: 0.35, flight: 0.03, wall: 0.025, softCrash: 0.12, buttonCrash: 0.45, buttonImpact: 0.25,
  sub: 0.22, subBurst: 0.32, subButton: 0.3, breath: 0.5,
};
/** The breath into the tonic (M4): the reverse cymbal and the inhale, loud enough that bar 2 rises into 3.1 (sheet §8: −19 → −15).
 *  Round 1: +2 dB (0.85 / 0.45 before): with the V's swell, 2.4 reaches ≈ −16 LUFS (−17.9 before). */
export const SWELL = { cymbal: 1.07, inhale: 0.57 };

/**
 * The ending's music, A or B (the whole-film mix pass, 2026-10-03; the music pass's AUDIBLE finding): after M2 (no
 * sustained chord bed; short sounds on visible events; the reference is break 1 FALL) the ending is the one place left with a held bed —
 * the blue screen's e-piano holding Bmaj9, then Vsus / V, under a suitcase tremolo through outro 1–2, and the supersaw F♯6/9 from the
 * iris through outro 3 and pumping under the encore's kicks. B, without the bed, is the film's since 2026-10-03
 * (spec rev 11 §16 item 3; renderOutro's default); A, the earlier ending (U5 / U6), stays behind { style: 'A' }
 * (scripts/audio/endingAB.mjs renders both → output/qa/full-v05/ending-ab/). Nothing of A changes with B: renderOutro({ style: 'B' })
 * only takes a different branch in the e-piano, the tonic's saws and the encore's stabs.
 */
export const ENDING_STYLE = 'B';
/**
 * B, the ending without a bed:
 * - outro 1–2: the e-piano STRUCK on the drawn events (`strikes`): IV on the relay (1.1), the stamp (1.2) and the second lub (1.3); Vsus
 *   on the ✓ (2.1), still sagging with the squeeze (powerDown); the V, muffled, on the line (2.2) and, louder, on the beep (2.3, "he is
 *   alive"). Each note is struck for `beats` and rings out on τ `decay` s (≈ −13 dB by the end of its beat, then the damper closes
 *   it over 60 ms), no tremolo. WP6 (v07, seam 5376): the 1.1 strike is voiced an `octave` up (B4 … C♯6), in the bullet time's
 *   music-box register, its top voice the music box's hanging C♯6 (drop 2 rings it on 1.1 as a ghost); the stamp's IV (1.2) is back in
 *   the blue screen's register: the chord settles down an octave as the glass falls (SEAM_GLASS), and the room changes over the beat.
 * - outro 3: the supersaws open with the iris as one swell (`swell`): struck on 3.1, falling `fall` (e-folds) under a half cosine that
 *   closes them by `beats` beats (the brief swell M2 allows), under the sung chord and the bell arpeggio.
 * - outro 4: no supersaw under the encore (A's ENCORE_MIX.saw there → 0): the roll call's eight notes and one house-piano stab on each
 *   of the encore's kicks (`stab`: the club's piano, sections/club.mjs PIANO, on the I chord, F♯6/9 from C♯4) carry the I chord.
 * - Kept as A: the button's struck chord (M.saw × ringBloom) and its RING ring-out (one struck chord ringing out is a short sound on a
 *   visible event), and every other voice.
 */
export const ENDING_B = {
  piano: {
    strikes: [
      { at: O.OUTRO_START, chord: 'IV', gain: 1, octave: 1 },
      { at: O.STAMP, chord: 'IV', gain: 0.75 },
      { at: O.LUB[1], chord: 'IV', gain: 0.9 },
      { at: O.LAST_BEAT, chord: 'Vsus', gain: 0.75, sag: true },
      { at: O.LINE, chord: 'V', gain: 0.8, muffled: true },
      { at: O.BEEP, chord: 'V', gain: 1.4, muffled: true },
    ],
    gain: 0.13,
    muffled: 0.09,
    beats: 1,
    decay: 0.2,
  },
  swell: { beats: 2, fall: 2 },
  stab: { notes: [61, 66, 70, 75, 80], gain: 0.28, burst: 1.15, frames: 4, decay: 0.5, releaseMs: 45, bright: 1, seed: 5900 },
};
/** B's tonic swell at frame `f` (a gain): 1 on 3.1, falling `fall` e-folds under a half cosine to exactly 0 `beats` beats later. */
export function swellB(f) {
  const u = clamp((f - O.OPEN) / (ENDING_B.swell.beats * FRAMES_PER_BEAT));
  return u >= 1 ? 0 : (0.5 + 0.5 * Math.cos(Math.PI * u)) * Math.exp(-ENDING_B.swell.fall * u);
}

/**
 * Renders the ending into `stems` (bgm.mjs's buses, SENDS's among them) at `sr`. Returns every event as { kind, at } (at in samples: the
 * frame's first sample; a swell's is the frame it swells into; the ticks', which finish() adds after the choke, their frames). Stems may
 * be shorter than the film: nothing is drawn then, but the events are still listed. For tests: `mute` (event kinds) leaves those voices
 * undrawn, `solo` draws only those, and `ducks: false` leaves the bed unducked under the wink and the plink, and the breath under the knocks.
 * `style` is the ending's music, ENDING_STYLE ('B', the film's: ENDING_B, without a bed) or 'A' (the earlier ending's held bed, U5 / U6).
 */
export function renderOutro(stems, sr, { mute = [], solo = null, ducks = true, style = ENDING_STYLE } = {}) {
  if (style !== 'A' && style !== 'B') throw new Error(`outro: no ending style "${style}" (A or B)`);
  const at = (frame) => Math.round((frame / FPS) * sr);
  const base = at(O.OUTRO_START);
  const len = at(O.LOOP) - base;
  const n = stems.sub.length;
  const active = n > base;
  const frameAt = (i) => ((base + i) / sr) * FPS;
  const local = {};
  const bus = (name) => (local[name] ??= stereo(len));
  const sub = new Float32Array(len);
  const events = [];
  const mark = (kind, frame) => events.push({ kind, at: at(frame) });
  const on = (voice) => active && !mute.includes(voice) && (!solo || solo.includes(voice));
  /** One mono voice: `draw(buf)` writes it from 0; it starts on `start` (a frame, maybe fractional). */
  const place = (name, frame, dur, draw, { kind, voice = kind, pan = 0, start = frame, hp = 0 } = {}) => {
    if (kind) mark(kind, frame);
    if (!on(voice)) return;
    const buf = new Float32Array(Math.round(dur * sr));
    draw(buf);
    if (hp) {
      const fs = [Biquad.highpass(sr, hp), Biquad.highpass(sr, hp)];
      for (let i = 0; i < buf.length; i++) buf[i] = fs.reduce((v, f) => f.process(v), buf[i]);
    }
    addMono(bus(name), buf, { at: at(start) - base, pan });
  };
  /** A mono voice into the sub (no reverb; mono below 150 Hz). */
  const placeSub = (frame, dur, draw, { kind, voice = kind } = {}) => {
    if (kind) mark(kind, frame);
    if (!on(voice)) return;
    const buf = new Float32Array(Math.round(dur * sr));
    draw(buf);
    const a = at(frame) - base;
    for (let i = 0; i < buf.length && a + i < len; i++) if (a + i >= 0) sub[a + i] += buf[i];
  };
  const beep = (name, frame, freq, ms, gain, o = {}) => place(name, frame, ms / 1000 + 0.01, (b) => blip(b, 0, sr, { freq, ms, gain }), o);
  /** A whoosh whose loudest point lands on `peak`. */
  const swoosh = (name, peak, frames, o, opts = {}) =>
    place(name, peak, frames / FPS, (b) => whoosh(b, 0, b.length, sr, o), { ...opts, start: peak - WHOOSH_PEAK * frames });
  const sing = (name, frame, o, opts) => place(name, frame, o.len / sr + 0.05, (b) => voxLine(b, 0, sr, o), opts);

  // ——— outro 1.1: the seam. The blue bursts out of his spot: the relay, the uh-oh, the glass ringing out with the front, the hum ———————
  place('fx', O.OUTRO_START, 0.2, (b) => relay(b, 0, sr, { gain: 0.16, seed: seed(1, O.OUTRO_START) }), { kind: 'outrelay' });
  place('chime', O.OUTRO_START, 1.6, (b) => fmBell(b, 0, sr, { freq: midi(75), gain: GAG.uhoh, decay: 0.3, index: 1.6 }), { kind: 'outuhoh', pan: -0.15 });
  place('chime', O.OUTRO_START + 3, 1.6, (b) => fmBell(b, 0, sr, { freq: midi(71), gain: GAG.uhoh, decay: 0.35, index: 1.6 }), { voice: 'outuhoh', pan: 0.15 });
  // WP6 (v07): the band's chatter (three 2–4 kHz blips, one a frame) was a new sound on the downbeat; now drop 2's glass rings into the
  // blue screen (FW3's carry): the bullet time's frozen droplets, its crown's own glass voice (drop2Act2Voices.mjs glass, read only), one
  // on each 32nd of the burst (SEAM_GLASS), falling down the IV from the music box's hanging C♯6 as the front runs out of his spot, each
  // panned further out, in the chime's room.
  SEAM_GLASS.notes.forEach((m, k) =>
    place('chime', O.OUTRO_START + 3 * k, 1.2 * (SEAM_GLASS.decayMs[k] / 1000) * 5, (b) => glass(b, 0, sr, { freq: midi(m), gain: SEAM_GLASS.gains[k], decay: SEAM_GLASS.decayMs[k] / 1000 }), {
      kind: 'outcrown',
      pan: SEAM_GLASS.pans[k],
    }),
  );
  /**
   * The blue screen's hum (mains hum, near enough: B1, the IV's root): B1 with a little second harmonic, −30 dBFS; it pitches down to 30 Hz
   * with the squeeze and is cut on the line. WP6: it swells in over the seam's beat (HUM_SWELL, a raised cosine) as the blue fills the
   * tube, instead of starting whole on the downbeat — the room changes over the beat, not on it (FW4).
   */
  if (on('outhum')) {
    const a = 0;
    const b = at(O.LINE) - base;
    const ramp = Math.round(0.0015 * sr);
    const swell = at(O.OUTRO_START + HUM_SWELL) - base;
    let ph = 0;
    for (let i = a; i < b; i++) {
      const u = clamp((frameAt(i) - O.ENTER) / (O.LINE - O.ENTER));
      ph += (midi(ROOTS_OUT.IV) * (30 / midi(ROOTS_OUT.IV)) ** (u * u)) / sr;
      ph -= Math.floor(ph);
      const env = Math.min(0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, i / swell)), (b - i) / ramp);
      sub[i] += dbGain(-30) * env * (Math.sin(2 * Math.PI * ph) + 0.3 * Math.sin(4 * Math.PI * ph)) / 1.3;
    }
  }
  mark('outhum', O.OUTRO_START);

  // ——— The heartbeat: lub-dub on 1.1 and 1.3 (B1; the kick lane), the ✓ in the lub's slot on 2.1, never a dub on 2.1e ——————————————
  O.LUB.forEach((f) => placeSub(f, 0.5, (b) => heartThump(b, 0, sr, { freq: midi(HEART.lub.m), gain: HEART.lub.gain }), { kind: 'outheart' }));
  O.DUB.forEach((f) => placeSub(f, 0.5, (b) => heartThump(b, 0, sr, { freq: midi(HEART.dub.m), gain: HEART.dub.gain }), { kind: 'outdub' }));

  // ——— The e-piano: IV, Vsus sagging with the squeeze, V muffled from the line until the iris closes ————————————————————————————
  O.CHORDS_OUT.filter((c) => c.chord !== 'I').forEach((c) => mark('outepiano', c.at));
  if (on('outepiano')) {
    const ep = [new Float32Array(len), new Float32Array(len)];
    const bend = (j) => powerDown(frameAt(j)).bend;
    const amp = (j) => powerDown(frameAt(j)).amp;
    // The V, muffled: the monitor's room, through two 1.2 kHz low-passes (below).
    const muffled = [new Float32Array(len), new Float32Array(len)];
    if (style === 'B') {
      // B (ENDING_B.piano): each chord struck on its drawn event and rung out within about a beat; the Vsus on the ✓ still sags with the
      // squeeze; the muffled V struck on the line and on the beep. No tremolo (below).
      const P = ENDING_B.piano;
      const ring = at(O.OUTRO_START + P.beats * FRAMES_PER_BEAT) - base;
      for (const s of P.strikes) {
        VOICINGS_OUT[s.chord].forEach((m, v) => {
          const strum = Math.round(v * (s.muffled ? 0.008 : 0.006) * sr);
          const gain = s.gain * (s.muffled ? P.muffled : P.gain * (v === 0 ? 0.8 : 1));
          ePiano((s.muffled ? muffled : ep)[v % 2], [{ at: at(s.at) - base + strum, len: ring - strum, freq: midi(m + (s.octave ?? 0) * 12), gain }], sr, s.sag ? { bend, amp, decay: P.decay } : { decay: P.decay });
        });
      }
    } else {
      const spans = [
        { chord: 'IV', from: O.CHORDS_OUT[0].at, to: O.CHORDS_OUT[1].at, gain: 1 },
        // The Vsus under the ✓ softer than the blue screen's IV: the lock, the thump and `exit` own 2.1.
        { chord: 'Vsus', from: O.CHORDS_OUT[1].at, to: O.LINE, gain: 0.6 },
      ];
      for (const s of spans) {
        VOICINGS_OUT[s.chord].forEach((m, v) => {
          const strum = Math.round(v * 0.006 * sr);
          ePiano(ep[v % 2], [{ at: at(s.from) - base + strum, len: at(s.to) - at(s.from) - strum, freq: midi(m), gain: EP * s.gain * (v === 0 ? 0.8 : 1) }], sr, { bend, amp, decay: 3.5 });
        });
      }
      // The V, muffled: level under the flatline, swelling from the beep (vSwell).
      const swellV = (j) => vSwell(frameAt(j));
      VOICINGS_OUT.V.forEach((m, v) => {
        ePiano(muffled[v % 2], [{ at: at(O.LINE) - base + Math.round(v * 0.008 * sr), len: at(O.CLOSE.to) - at(O.LINE) - Math.round(v * 0.008 * sr), freq: midi(m), gain: EP_V }], sr, { decay: 3, amp: swellV });
      });
    }
    for (const x of muffled) {
      const fs = [Biquad.lowpass(sr, 1200), Biquad.lowpass(sr, 1200)];
      for (let i = 0; i < len; i++) x[i] = fs.reduce((y, f) => f.process(y), x[i]);
    }
    const piano = stereo(len);
    addMono(piano, ep[0], { pan: -0.35 });
    addMono(piano, ep[1], { pan: 0.35 });
    addMono(piano, muffled[0], { pan: -0.25 });
    addMono(piano, muffled[1], { pan: 0.25 });
    if (style === 'A') tremolo(piano, 0, len, sr, { rate: 4, depth: 0.15 });
    const dst = bus('chords');
    for (let i = 0; i < len; i++) {
      dst.L[i] += piano.L[i];
      dst.R[i] += piano.R[i];
    }
  }

  // ——— 1.1+3 … 1.1a+3: his bytes, the decoder's three clicks, the face gathering —————————————————————————————————————————————————
  [2400, 2000, 1600].forEach((hz, k) => beep('fx', O.HEX + k, hz, 12, 0.03, { kind: k ? undefined : 'outdump', voice: 'outdump', hp: 1000 }));
  /** One click a byte group, at the group's place: E2 80 A2 (left), CF 89 (centre), E2 80 A2 (right, carried in by the gather). */
  const FLIP_TONES = [2600, 2000, 2600];
  const FLIP_X = [481, 960, 1375];
  O.FLIPS.forEach((f, k) => place('fx', f, 0.05, (b) => click(b, 0, sr, { gain: 0.05, tone: FLIP_TONES[k] }, seed(2 + k, f)), { kind: 'outflip', pan: panX(FLIP_X[k]), hp: 1000 }));
  place('fx', O.GATHER.to, 0.12, (b) => {
    click(b, 0, sr, { gain: 0.06, tone: 600 }, seed(5, O.GATHER.to));
    pop(b, 0, sr, { freq: 220, gain: 0.05 });
  }, { kind: 'outthup' });
  O.PROGRESS.forEach((f, k) => beep('fx', f, midi(PROGRESS_NOTES[k]), 8, 0.03, { kind: 'outprogress', pan: -0.3, hp: 1000 }));

  // ——— 1.2: stamped; the code fills; 1.2& the slide and the small print ——————————————————————————————————————————————————————
  beep('fx', O.STAMP, midi(STAMP_NOTES[0]), 50, GAG.stamp, { kind: 'outstamp', pan: 0 });
  beep('fx', O.STAMP + 3, midi(STAMP_NOTES[1]), 60, GAG.stamp, { voice: 'outstamp', pan: 0 });
  place('fx', O.STAMP, 0.05, (b) => click(b, 0, sr, { gain: GAG.stampClick, tone: 900 }, seed(6, O.STAMP)), { voice: 'outstamp' });
  /** The code tile is bottom-left (x 200–432): its ticks sit there. */
  O.CODE_ROWS.forEach((f, k) => place('fx', f, 0.05, (b) => click(b, 0, sr, { gain: 0.02, tone: 4000 }, seed(7 + k, f)), { kind: 'outcode', pan: panX(316), hp: 1000 }));
  swoosh('fx', O.SLOT.from + 2, 10, { from: 1800, to: 500, gain: 0.03, seed: seed(20, O.SLOT.from) }, { kind: undefined, voice: 'outswish', pan: -0.4 });
  mark('outswish', O.SLOT.from);
  for (let k = 0; k < 13; k++) beep('fx', O.SMALL_PRINT + k, 3000 + 1000 * hash(k, 21, 5000), 6, 0.025, { kind: 'outzip', pan: 0.5, hp: 1000 });

  // ——— 1.3: the liquid (the guest's spill: a plip, a splash, his smug hm-hm); 1.4: the promise and his flick; 1.4& the reticle ———————
  place('fx', O.LINES[1], 0.12, (b) => sweep(b, 0, sr, { from: 2200, to: 1300, ms: 30, gain: 0.05, decayMs: 25 }), { kind: 'outplip', pan: -0.2 });
  place('fx', O.LINES[1], 0.1, (b) => zip(b, 0, sr, { from: 3000, to: 3000, ms: 80, gain: 0.03 * 3, q: 3, seed: seed(22, O.LINES[1]) }), { kind: 'outspill', pan: -0.2 });
  place('outdry', O.LINES[1] + 1, 0.45, (b) => hum(b, 0, sr, { note: (t) => (t < 0.15 ? 54 : 49 - 0.4 * Math.min(1, (t - 0.15) / 0.12)), syllables: [[0, 0.1], [0.15, 0.32]], gain: GAG.smug, seed: seed(23, O.LINES[1]) }), { kind: undefined, voice: 'outsmug', pan: -0.2 });
  mark('outsmug', O.LINES[1]);
  place('chime', O.LINES[2], 3, (b) => fmBell(b, 0, sr, { freq: midi(90), gain: 0.035, decay: 0.7, index: 2 }), { kind: 'outpromise', pan: 0.2 });
  place('chime', O.LINES[2] + 3, 3, (b) => fmBell(b, 0, sr, { freq: midi(97), gain: 0.035, decay: 0.7, index: 2 }), { voice: 'outpromise', pan: 0.25 });
  place('fx', O.FLICK.from, 0.06, (b) => sweep(b, 0, sr, { from: midi(97), to: midi(99), ms: 30, gain: 0.03, decayMs: 20 }), { kind: 'outflick', pan: panX(838) });
  /** The reticle's sweep: C5 → C6 as the brackets close, arriving a 32nd before the lock and holding C6 into the lock's own C6 beeps. */
  place('outdry', O.RETICLE.from, (O.RETICLE.to - O.RETICLE.from) / FPS + 0.02, (b) =>
    sweep(b, 0, sr, { from: midi(DEFENDER.reticle[0]), to: midi(DEFENDER.reticle[1]), ms: ((O.RETICLE.to - O.RETICLE.from - 3) / FPS) * 1000, holdMs: (3 / FPS) * 1000, gain: GAG.reticle, attackMs: 3 }),
  { kind: 'outreticle', pan: panX(526) });

  // ——— 2.1: LOCK + ✓, his last heartbeat; 2.1e the dub that never comes: `exit`; 2.1a Enter, the power-off ————————————————————————
  O.LOCK_BEEPS.forEach((f) => beep('outdry', f, midi(DEFENDER.lock), 25, 0.04, { kind: 'outlock', pan: panX(526) }));
  place('outdry', O.LAST_BEAT, 0.3, (b) => kick(b, 0, sr, { gain: 0.2, f0: 180, f1: 70, pitchMs: 15, decayMs: 60 }, seed(24, O.LAST_BEAT)), { kind: 'outlastheart', pan: panX(526) * 0.5 });
  TYPED.filter((t) => t.dry).forEach((t, k) =>
    place('outdry', t.frame, 0.3, (b) => keyPress(b, 0, sr, { kind: t.kind, gain: t.kind === 'enter' ? 0.25 : 0.2, seed: seed(30 + k, t.frame) }), { kind: t.kind === 'enter' ? 'outenter' : 'outkey', pan: keyPan(t.ch) }),
  );
  place('fx', O.ENTER, (O.LINE - O.ENTER) / FPS, (b) => {
    powerOff(b, 0, b.length, sr, { gain: 0.25, seed: seed(40, O.ENTER) });
    whoosh(b, 0, b.length, sr, { from: 3000, to: 200, gain: 0.1, seed: seed(41, O.ENTER) });
  }, { kind: 'outpoweroff' });

  // ——— 2.2: the line is a flatline (the tone, the whine, the V muffled on a C♯2 pedal); 2.3 the beep shaped like his ω ——————————————
  place('fx', O.LINE, 1.7, (b) => {
    click(b, 0, sr, { gain: 0.3, tone: 2500 }, seed(42, O.LINE));
    impact(b, 0, sr, { gain: 0.15 }, seed(43, O.LINE));
  }, { kind: 'outpop' });
  place('fx', O.FLATLINE.from, (O.FLATLINE.to - O.FLATLINE.from) / FPS, (b) => monitorTone(b, 0, b.length, sr, { freq: midi(85), gain: 0.025 }), { kind: 'outflat' });
  {
    const frames = O.WHINE.to - O.WHINE.from;
    place('fx', O.WHINE.from, frames / FPS, (b) =>
      lineWhine(b, 0, b.length, sr, { gain: 0.01, decayMs: 1e9, freq: (k) => {
        const f = O.WHINE.from + (k / sr) * FPS;
        // ±1 % wavering in step with the line's float, and the ω's dip.
        return (11000 - 2000 * whineDip(f)) * (1 + 0.01 * Math.sin(2 * Math.PI * 2.5 * (k / sr)));
      } }),
    { kind: 'outwhine' });
  }
  placeSub(O.WHINE.from, (O.WHINE.to - O.WHINE.from) / FPS, (b) => {
    const ramp = Math.round(0.0015 * sr);
    for (let i = 0; i < b.length; i++) b[i] = 0.08 * vSwell(O.WHINE.from + (i / sr) * FPS) * Math.min(1, i / (0.03 * sr), (b.length - i) / ramp) * Math.sin((2 * Math.PI * midi(ROOTS_OUT.V) * i) / sr);
  }, { kind: 'outpedal' });
  place('fx', O.BEEP, 0.1, (b) => monitorTone(b, 0, Math.round(0.08 * sr), sr, { freq: midi(85), gain: V_SWELL.beep, attackMs: 3, releaseMs: 12 }), { kind: 'outbeep' });
  place('fx', O.BEEP, 0.3, (b) => boing(b, 0, sr, { freq: midi(61), gain: V_SWELL.boing }), { kind: 'outboing' });
  /** The breath (M4, the film's second and last): a reverse cymbal and his inhale from the beep, stopping on the tonic. */
  {
    const swell = (O.BREATH.to - O.BREATH.from) / FPS;
    /** The swell's gain curve over its `n` samples (from BREATH.from): ducked under each knock. */
    const room = (n) => O.KNOCKS.reduce((g, f) => {
      const d = bedDuck(n, at(f) - at(O.BREATH.from), sr, KNOCK_DUCK);
      return g.map((v, i) => v * d[i]);
    }, new Float32Array(n).fill(1));
    const ducked = (draw) => (b) => {
      draw(b);
      if (!ducks) return;
      const g = room(b.length);
      for (let i = 0; i < b.length; i++) b[i] *= g[i];
    };
    place('fx', O.BREATH.to, swell, ducked((b) => reverseCymbal(b, b.length, b.length, sr, { gain: SWELL.cymbal, seed: seed(44, O.BREATH.to) })), { kind: 'outswell', start: O.BREATH.from });
    place('post', O.BREATH.to, swell, ducked((b) => inhale(b, b.length, b.length, sr, { gain: SWELL.inhale, seed: seed(45, O.BREATH.to) })), { voice: 'outswell', start: O.BREATH.from });
  }

  // ——— 2.3& the curl (a stretch), the twitch, 2.4 the iris-out (a glide, a tup), the knocks, the creak ————————————————————————————
  place('fx', O.CURL.from, 0.2, (b) => sweep(b, 0, sr, { from: 300, to: 900, ms: (9 / FPS) * 1000, gain: 0.03, holdMs: 20, vibrato: { semitones: 0.4, hz: 22 } }), { kind: 'outcurl' });
  place('fx', O.TWITCH, 0.04, (b) => sweep(b, 0, sr, { from: midi(56), to: midi(56), ms: (2 / FPS) * 1000, gain: 0.02, wave: 'square' }), { kind: 'outtwitch' });
  place('fx', O.CLOSE.from, 0.17, (b) => sweep(b, 0, sr, { from: 1600, to: 300, ms: ((O.CLOSE.to - O.CLOSE.from) / FPS) * 1000, gain: 0.04, attackMs: 2 }), { kind: 'outclose' });
  place('fx', O.CLOSE.to, 0.05, (b) => click(b, 0, sr, { gain: 0.05, tone: 600 }, seed(46, O.CLOSE.to)), { kind: 'outtup' });
  O.KNOCKS.forEach((f, k) => {
    place('fx', f, 0.1, (b) => knock(b, 0, sr, { gain: GAG.knocks[k], seed: seed(47 + k, f) }), { kind: 'outknock', voice: 'outknock' });
    placeSub(f, 0.5, (b) => heartThump(b, 0, sr, { freq: midi(HEART.knocks.m), gain: HEART.knocks.gains[k] }), { voice: 'outknock' });
  });
  place('vox', O.CREAK, 0.08, (b) => voxLine(b, 0, sr, { len: Math.round((3 / FPS) * sr), note: (t) => 42 + 14 * Math.min(1, t / 0.05), vowel: 'e', to: 'i', gain: 0.03 * 2, breath: 0.2, tune: false, seed: seed(49, O.CREAK) }), { kind: 'outcreak' });

  // ——— 3.1: THE TONIC (F♯6/9), opening with the iris; re-struck on 4.1 under the encore's sidechain; struck once more on the button ———
  for (const c of O.CHORDS_OUT.filter((c) => c.chord === 'I')) mark('outtonic', c.at);
  const M = ENCORE_MIX;
  // The encore pumps on its kicks: the burst's at `burstPump` (the I re-struck lands with the kick), the button's not at all (its chord
  // strikes with it, whole).
  const sidechain = duck(len, O.KICKS.filter((f) => f > O.BURST && f < O.BOWS.hero).map((f) => at(f) - base), sr, { depth: M.pump, attackMs: 2, releaseMs: 150 });
  if (M.burstPump > 0) {
    const d = duck(len, [at(O.BURST) - base], sr, { depth: M.burstPump, attackMs: 2, releaseMs: 150 });
    for (let i = 0; i < len; i++) sidechain[i] = Math.min(sidechain[i], d[i]);
  }
  if (on('outtonic')) {
    const t0 = at(O.OPEN) - base;
    const t1 = at(O.BURST) - base;
    const tb = at(O.ANTICIPATE) - base;
    const t2 = at(O.BOWS.hero) - base;
    const saws = stereo(len);
    const open = (i) => Math.max(0, irisOpen(frameAt(i)));
    // The arrival, then the ring settling 5 dB under it by 3.4 (the bar decays, the riser lifts it into the burst); the encore at full
    // under the kicks' pump; on the button's eve the band's breath (the encore's chord released over the 32nd and lifted to `breath`);
    // from his bow the button's chord, struck (BUTTON_STRIKE) at the level that fills the room the band leaves (U6, ringBloom), ringing on.
    const breath = (i) => 1 - (1 - M.breath) * (0.5 - 0.5 * Math.cos(Math.PI * clamp((i - tb) / (t2 - tb))));
    // B (ENDING_B): the iris's swell alone (swellB), nothing under the encore, the button's chord as A.
    const shape = style === 'B'
      ? (i) => (i < t1 ? swellB(frameAt(i)) : i < t2 ? 0 : M.saw * ringBloom(frameAt(i)))
      : (i) => (i < t1 ? 0.55 + 0.45 * Math.exp(-(frameAt(i) - O.OPEN) / 30) : i < t2 ? M.saw * sidechain[i] * breath(i) : M.saw * ringBloom(frameAt(i)));
    const strikes = [[t0, t1], [t1, tb], [t2, len]];
    const chords = strikes.map(([a, b]) => ({ at: a, len: b - a, freqs: VOICINGS_OUT.I.map(midi) }));
    const high = strikes.map(([a, b]) => ({ at: a, len: b - a, freqs: VOICINGS_OUT.I.map((m) => midi(m + 12)) }));
    // From his bow the low-pass closes (U6, RING): the chord rings on, darker each frame, as the camera goes into him.
    const closing = (hz, i) => ringCutoff(hz, frameAt(i));
    supersaw(saws.L, saws.R, chords, sr, { gain: SAW_A, cutoff: (i) => closing(1200 * (9000 / 1200) ** open(i), i), seed: seed(50, O.OPEN) });
    supersaw(saws.L, saws.R, high, sr, { gain: SAW_B, cutoff: (i) => closing(1500 * (11000 / 1500) ** open(i), i), seed: seed(51, O.OPEN) });
    const dst = bus('chords');
    for (let i = t0; i < len; i++) {
      const g = shape(i);
      dst.L[i] += g * saws.L[i];
      dst.R[i] += g * saws.R[i];
    }
    // The sung chord (M10, the only one on I): "a → o", ringing 1.5 beats and fading as the wink comes.
    [66, 70, 73, 80].forEach((m, k) => {
      const ring = at(O.OPEN + 36) - at(O.OPEN);
      const b = new Float32Array(ring + Math.round(sr / 10));
      voxChop(b, 0, sr, { freq: midi(m), len: ring, vowel: 'a', to: 'o', gain: SUNG, seed: seed(52 + k, O.OPEN) });
      for (let i = 0; i < b.length; i++) b[i] *= Math.exp(-i / sr / 0.9);
      addMono(bus('vox'), b, { at: t0, pan: -0.3 + 0.2 * k });
    });
  }
  // F♯1 under the tonic and on each of the encore's kicks (the button's included): the knocks' C♯ resolves here. The encore's are ducked
  // off their kick's attack (SUB_DUCK).
  const SUBS = [[O.OPEN, 0.3], ...O.KICKS.map((f) => [f, f === O.BURST ? M.subBurst : f === O.BOWS.hero ? M.subButton : M.sub])];
  for (const [f, g] of SUBS) {
    placeSub(f, 3, (b) => {
      subPulse(b, 0, sr, { freq: midi(ROOTS_OUT.I), decayMs: 600, gain: g });
      const d = f === O.OPEN ? null : duck(b.length, [0], sr, SUB_DUCK);
      for (let i = 0; i < b.length; i++) b[i] = ((d ? d[i] : 1) * Math.tanh(1.5 * b[i])) / 1.5;
    }, { voice: 'outtonic' });
  }
  place('drums', O.OPEN, 1.2, (b) => kick(b, 0, sr, { gain: 0.4 }, seed(56, O.OPEN)), { kind: 'outkick' });
  place('fx', O.OPEN, 1.7, (b) => impact(b, 0, sr, { gain: 0.25 }, seed(57, O.OPEN)), { voice: 'outcrash' });
  place('fx', O.OPEN, 5.6, (b) => crash(b, 0, sr, { gain: 0.2 }, seed(58, O.OPEN)), { kind: 'outcrash' });
  place('fx', O.OPEN, 0.1, (b) => pop(b, 0, sr, { freq: 260, gain: 0.1 }), { kind: 'outpomp' });
  /** The bell arpeggio up the tonic on the 32nds: C♯6 F♯6 A♯6 D♯7. */
  [85, 90, 94, 99].forEach((m, k) => place('chime', O.BELLS[k], 4, (b) => fmBell(b, 0, sr, { freq: midi(m), gain: GAG.bell, decay: 0.8, index: 2.2 }), { kind: 'outbell', pan: -0.3 + 0.2 * k }));

  // ——— 3.1& W5 types in; 3.2 THE WINK (the ting over a ducked bed), the Defender's blips; the ✧ on the 8ths ——————————————————————————
  beep('fx', O.MONITOR_BACK, 2600, 25, 0.04, { kind: 'outreadout', pan: panX(297) });
  TYPED.filter((t) => t.w5).forEach((t, k) => place('keys', t.frame, 0.3, (b) => keyPress(b, 0, sr, { kind: 'letter', gain: 0.06, seed: seed(60 + k, t.frame) }), { kind: 'outw5', pan: panX(297) }));
  mark('outwink', O.WINK);
  const wink = on('outwink') ? new Float32Array(Math.round(3 * sr)) : null;
  if (wink) {
    const T = WINK_TING;
    ting(wink, 0, sr, { freq: midi(102), gain: T.high, decay: T.decay });
    ting(wink, 0, sr, { freq: midi(97), gain: T.low, decay: T.decay });
    ting(wink, Math.round((1.5 / FPS) * sr), sr, { freq: midi(109), gain: T.glint, decay: 0.25 });
    fmBell(wink, Math.round((3 / FPS) * sr), sr, { freq: midi(114), gain: T.glint2, decay: 0.25, index: 0.6 });
  }
  /** The Defender's two blips (C4, dry, at W5's x): it notices. They go on after the wink's duck, so the duck never swallows them. */
  const blips = on('outdefender') ? new Float32Array(len) : null;
  O.DEFENDER_BLIPS.forEach((f) => {
    mark('outdefender', f);
    if (blips) blip(blips, at(f) - base, sr, { freq: midi(DEFENDER.blips), ms: 20, gain: GAG.defender });
  });
  O.TWINKLES.forEach((f) => place('chime', f, 0.16, (b) => twinkle(b, 0, sr, { freqs: [midi(114), midi(118), midi(121)], gain: 0.02 }), { kind: 'outtwinkle', pan: panX(1250) }));

  // ——— 3.3, 3.3&: ↑ ↑ (the space key played a fourth lower, a zip up the pentatonic, a sung pickup); the riser into the burst —————————
  const ZIP = [90, 92, 94, 97, 99, 102];
  TYPED.filter((t) => t.ch === '↑').forEach((t, k) => {
    place('keys', t.frame, 0.5, (b) => {
      const key = new Float32Array(Math.round(0.3 * sr));
      keyPress(key, 0, sr, { kind: 'space', gain: GAG.up, seed: seed(64 + k, t.frame) });
      b.set(repitch(key, -5).subarray(0, b.length));
    }, { kind: 'outup' });
    ZIP.forEach((m, z) => beep('fx', t.frame + 1 + z / 2, midi(m), 6, GAG.zip, { voice: 'outup', pan: 0.1 * z - 0.25, hp: 1000 }));
  });
  [73, 75].forEach((m, k) => sing('vox', O.VOX_PICKUPS[k], { len: Math.round(0.11 * sr), note: (t) => m - 0.8 * Math.max(0, 1 - t / 0.04), vowel: 'o', gain: 0.06, seed: seed(66 + k, O.VOX_PICKUPS[k]) }, { kind: 'outpickup', pan: 0 }));
  {
    const frames = O.RISER.to - O.RISER.from;
    place('fx', O.RISER.from, frames / FPS, (b) => {
      riser(b, 0, b.length, sr, { gain: 0.12 }, seed(68, O.RISER.from));
      reverseCymbal(b, b.length, b.length, sr, { gain: 0.15, seed: seed(69, O.RISER.from) });
    }, { kind: 'outriser' });
  }

  // ——— 3.4: Enter, the count-in, the reboot chime (M3) on the counter ———————————————————————————————————————————————————————————
  place('keys', O.RUN, 0.3, (b) => keyPress(b, 0, sr, { kind: 'enter', gain: 0.25, seed: seed(70, O.RUN) }), { kind: 'outenter', pan: keyPan('\n') });
  place('drums', O.RUN, 1.2, (b) => kick(b, 0, sr, { gain: 0.5 }, seed(71, O.RUN)), { kind: 'outkick' });
  const COUNT_X = [828, 962, 1097, 1231];
  O.COUNTER.forEach((f, k) => place('chime', f, 0.35, (b) => bloop(b, 0, sr, { freq: midi(BLOOP_NOTES[k]), gain: GAG.bloop[0] + ((GAG.bloop[1] - GAG.bloop[0]) * k) / 3 }), { kind: 'outbloop', pan: panX(COUNT_X[k]) }));

  // ——— outro 4: THE BURST — the encore's whole bar: the hook with its third in its own rhythm; the drums, the roll call's clock ——————————
  // Every drum hit of the bar is a call (R13): the kick on each beat (and on 5.1, the cat's bow; the button's is below), the claps on
  // 2 and 4 (and the guest's bow), the closed hats on the off-8ths, alternating sides.
  O.KICKS.filter((f) => f !== O.BOWS.hero).forEach((f) => place('drums', f, 1.2, (b) => kick(b, 0, sr, { gain: f === O.BURST ? M.burstKick : M.kick }, seed(72, f)), { kind: 'outkick' }));
  O.CLAPS.forEach((f) => place('drums', f, 0.6, (b) => clap(b, 0, sr, { gain: M.clap }, seed(116, f)), { kind: 'outclap', pan: f === O.BOWS.guest ? -0.1 : 0.05 }));
  O.HATS.forEach((f, k) => place('drums', f, 0.3, (b) => hat(b, 0, sr, { gain: M.hat }, seed(87 + k, f)), { kind: 'outhat', pan: k % 2 ? 0.25 : -0.25 }));
  place('fx', O.BURST, 5.6, (b) => crash(b, 0, sr, { gain: M.crash }, seed(73, O.BURST)), { kind: 'outcrash' });
  place('fx', O.BURST, 1.7, (b) => impact(b, 0, sr, { gain: M.burstImpact }, seed(74, O.BURST)), { voice: 'outcrash' });
  // B (ENDING_B.stab): with no supersaw under the encore, a house-piano stab on the I chord with each of its kicks (the burst's fuller;
  // the button's chord is the saws', as A), on the keys bus, so the band's stop chokes it with the rest.
  if (style === 'B') {
    const st = ENDING_B.stab;
    O.KICKS.filter((f) => f !== O.BOWS.hero).forEach((f, k) => {
      mark('outstab', f);
      if (!on('outstab')) return;
      const keys = bus('keys');
      housePiano(keys.L, keys.R, at(f) - base, sr, {
        notes: st.notes, len: at(f + st.frames) - at(f), gain: st.gain * (f === O.BURST ? st.burst : 1), bright: st.bright, decay: st.decay, releaseMs: st.releaseMs, seed: st.seed + k,
      });
    });
  }
  const VOWELS = ['a', 'i', 'u', 'e', 'o'];
  O.ENCORE.forEach((f, k) => {
    // Each note as long as the hook holds it (ENCORE_LENS, 95 %: a breath between notes), the last held to 5.1.
    const len16 = Math.round(((0.95 * ENCORE_LENS[k] * 6) / FPS) * sr);
    const shape = (m) => (t) => m - 0.6 * Math.max(0, 1 - t / 0.04);
    const vowel = VOWELS[k % 5];
    const to = VOWELS[(k + 2) % 5];
    sing('vox', f, { len: len16, note: shape(ENCORE_NOTES[k]), vowel, to, gain: M.lead, seed: seed(75 + k, f) }, { kind: 'outencore', pan: -0.1 });
    sing('vox', f, { len: len16, note: shape(thirdBelow(ENCORE_NOTES[k])), vowel, to, gain: M.harmony, seed: seed(81 + k, f) }, { voice: 'outharmony', pan: 0.25 });
  });
  /** The roll call, each headliner in its world's own voice, climbing F♯6 → F♯7 (HEADLINERS' order: boot … drop 2), each a note shaped to its 8th (CALL_SHAPE). */
  const CALL_VOICES = {
    boot: (b, hz) => blip(b, 0, sr, { freq: hz, ms: 110, gain: 0.04 }),
    swiss: (b, hz, s) => {
      click(b, 0, sr, { gain: 0.05, tone: hz }, s);
      blip(b, Math.round(0.003 * sr), sr, { freq: hz, ms: 100, gain: 0.012 });
    },
    riso: (b, hz, s) => zip(b, 0, sr, { from: hz * 1.4, to: hz, ms: 110, gain: 0.04 * 3, q: 6, seed: s }),
    transition: (b, hz) => chip(b, [{ at: 0, len: Math.round(0.12 * sr), freq: hz, duty: 0.25 }], sr, { gain: 0.04 / 0.6 }),
    cosmos: (b, hz, s) => voxChop(b, 0, sr, { freq: hz, len: Math.round(0.13 * sr), vowel: 'u', to: 'a', gain: 0.04 * 2.5, seed: s }),
    club: (b, hz) => {
      pop(b, 0, sr, { freq: hz, gain: 0.04 });
      blip(b, Math.round(0.004 * sr), sr, { freq: 2 * hz, ms: 100, gain: 0.012 });
    },
    interlude: (b, hz, s) => tink(b, 0, sr, { freq: hz, gain: 0.04, decayMs: 400, seed: s }),
    drop2: (b, hz) => {
      blip(b, 0, sr, { freq: hz, ms: 40, gain: 0.03 });
      blip(b, Math.round(0.045 * sr), sr, { freq: 2 * hz, ms: 120, gain: 0.03 });
    },
  };
  O.CALLS.forEach((f, k) => {
    const world = HEADLINERS[k].world;
    const last = k === O.CALLS.length - 1;
    place(world === 'cosmos' ? 'vox' : 'fx', f, 0.4, (b) => {
      CALL_VOICES[world](b, midi(CALL_NOTES[k]), seed(94 + k, f));
      shapeCall(b, sr, last);
    }, { kind: 'outcall', pan: CALL_PANS[k] });
  });
  /** The wall prints over WALL_PRINT (back row first): a soft blip a frame, climbing the F♯ major scale from F♯6. */
  const WALL_NOTES = [90, 92, 94, 95, 97, 99, 101, 102, 104, 106, 107, 109];
  for (let f = O.WALL_PRINT.from, k = 0; f < O.WALL_PRINT.to; f++, k++) beep('fx', f, midi(WALL_NOTES[k % WALL_NOTES.length]), 8, M.wall, { kind: 'outwall', pan: (hash(k, 30, 5000) - 0.5) * 1.2, hp: 1000 });
  mark('outflight', O.BURST);
  SPOT_AT.forEach((s, k) => {
    const frames = 6 + Math.round(4 * hash(k, 31, 5000));
    swoosh('fx', O.BURST + 2, frames, { from: 600 + 900 * hash(k, 32, 5000), to: 3000 + 2000 * hash(k, 33, 5000), gain: M.flight, seed: seed(102 + k, O.BURST) }, { voice: 'outflight', pan: panX(s.centre[0]) });
  });
  /** The bow wave's "aww": a sung F♯ A♯ C♯ cluster swelling and falling with the wave (its peak on the cat's bow). */
  {
    const frames = O.BOW_WAVE.to - O.BOW_WAVE.from;
    const n = Math.round((frames / FPS) * sr);
    [66, 70, 73].forEach((m, k) => {
      place('vox', O.BOW_WAVE.from, frames / FPS + 0.05, (b) => {
        voxLine(b, 0, sr, { len: n, note: () => m, vowel: 'a', to: 'o', gain: 0.08, breath: 0.08, seed: seed(110 + k, O.BOW_WAVE.from) });
        const peakAt = ((O.BOWS.cat - O.BOW_WAVE.from) / frames) * n;
        for (let i = 0; i < b.length; i++) b[i] *= i < peakAt ? Math.sin((Math.PI / 2) * (i / peakAt)) ** 2 : Math.max(0, Math.cos((Math.PI / 2) * ((i - peakAt) / (n - peakAt))));
      }, { kind: k ? undefined : 'outaww', voice: 'outaww', pan: -0.4 + 0.4 * k });
    });
  }
  place('fx', O.HOP.to, 0.1, (b) => pop(b, 0, sr, { freq: 150, gain: 0.06 }), { kind: 'outpomf' });
  // ——— 4.3 → 4.4a: the leads walk on last (R14): the guest's steps from the left wing, the cat's patter dashing in from the right, the plant ———
  O.STEPS.forEach((f, k) => place('fx', f, 0.12, (b) => {
    click(b, 0, sr, { gain: 0.02, tone: 520 }, seed(118 + k, f));
    pop(b, 0, sr, { freq: 170, gain: 0.02 });
  }, { kind: 'outstep', pan: STEP_PANS[k] }));
  PATTER.forEach((f, k) => beep('fx', f, 3200 + 300 * k, 5, 0.02, { kind: 'outpatter', pan: 0.6 - 0.1 * k, hp: 1000 }));
  swoosh('fx', O.CAT_DASH.from + 9, O.WALK_ON.to - O.CAT_DASH.from, { from: 2400, to: 700, gain: 0.02, seed: seed(122, O.CAT_DASH.from) }, { voice: 'outpatter', pan: 0.45 });
  [[-0.5, 113], [0.5, 114]].forEach(([pan, v], k) =>
    place('fx', O.WALK_ON.to, 0.2, (b) => kick(b, 0, sr, { gain: 0.04, f0: 140, f1: 70, pitchMs: 10, decayMs: 35 }, seed(v, O.WALK_ON.to)), { kind: k ? undefined : 'outthud', voice: 'outthud', pan }),
  );

  // ——— outro 5.1: the cat bows (the kick above, a soft crash, its nya); 5.1& the guest (the clap above, a clink, his hm-hm C → C♯) ————
  place('fx', O.BOWS.cat, 4, (b) => crash(b, 0, sr, { gain: M.softCrash, decay: 1 }, seed(115, O.BOWS.cat)), { kind: 'outcrash', pan: 0.2 });
  sing('vox', O.BOWS.cat, { len: Math.round(0.14 * sr), note: (t) => 70 + 8 * Math.min(1, t / 0.12), vowel: 'i', to: 'a', gain: GAG.nya, seed: seed(115, O.BOWS.cat) }, { kind: 'outnya', pan: panX(1400) });
  place('chime', O.BOWS.guest, 1.5, (b) => fmBell(b, 0, sr, { freq: midi(97), gain: 0.03, decay: 0.25, index: 2.5 }), { kind: 'outclink', pan: -0.4 });
  /** C3 bending up to C♯3 over 60 ms (the infected Defender, M8), a gap for the plink, then a rising "hmm" to F♯3: content. */
  const hmNote = (t) => (t < 0.11 ? 48 + Math.min(1, Math.max(0, (t - 0.02) / 0.04)) : 49 + 5 * Math.min(1, Math.max(0, (t - 0.14) / 0.03)));
  place('outdry', O.BOWS.guest, 0.4, (b) => hum(b, 0, sr, { note: hmNote, syllables: [[0, 0.1], [0.13, 0.27]], gain: GAG.hmhm, seed: seed(117, O.BOWS.guest) }), { kind: 'outhmhm', pan: panX(560) });
  // ——— 5.1a: his glass's last drop on W5, the plink (over a ducked bed: below) ——————————————————————————————————————————————————
  mark('outplink', O.DROP.to);
  const plink = on('outplink') ? new Float32Array(Math.round(2.2 * sr)) : null;
  if (plink) fmBell(plink, 0, sr, { freq: midi(PLINK.midi), ratio: PLINK.ratio, index: PLINK.index, decay: PLINK.decay, gain: PLINK.gain });
  beep('fx', O.DROP.to, 2600, 25, 0.04, { kind: 'outok', pan: panX(233) });

  // ——— 5.2: THE BUTTON on his bow (R16): kick, crash and the I chord struck once more (above); then the band stops on it (below, before
  // the reverb) and the chord rings out under the dive; the tube's whine, the release and the ticks are finish()'s ————————————————————
  place('drums', O.BOWS.hero, 1.2, (b) => kick(b, 0, sr, { gain: M.button }, seed(119, O.BOWS.hero)), { kind: 'outkick' });
  place('fx', O.BOWS.hero, 5.6, (b) => crash(b, 0, sr, { gain: M.buttonCrash }, seed(120, O.BOWS.hero)), { kind: 'outcrash' });
  place('fx', O.BOWS.hero, 1.7, (b) => impact(b, 0, sr, { gain: M.buttonImpact }, seed(121, O.BOWS.hero)), { voice: 'outcrash' });
  mark('outstop', O.STOP.from);
  mark('outtube', O.POWER_DOWN.from);
  O.TICKS.forEach((f) => mark('outtick', f));

  if (active) {
    // The bed makes room for the wink (−9 dB for 50 ms) and for the plink (−6 dB for 60 ms); the sub rides on. Then the two go on top.
    const g = ducks ? winkDuck(len, at(O.WINK) - base, sr) : new Float32Array(len).fill(1);
    if (ducks) {
      const p = bedDuck(len, at(O.DROP.to) - base, sr, PLINK_DUCK);
      for (let i = 0; i < len; i++) g[i] *= p[i];
    }
    for (const name of Object.keys(local)) {
      if (name === 'post') continue;
      const b = local[name];
      for (let i = 0; i < len; i++) {
        b.L[i] *= g[i];
        b.R[i] *= g[i];
      }
    }
    if (wink) addMono(bus('chime'), wink, { at: at(O.WINK) - base, pan: 0.35 });
    if (blips) addMono(bus('outdry'), blips, { pan: panX(297) });
    if (plink) addMono(bus('chime'), plink, { at: at(O.DROP.to) - base, pan: PLINK.pan });
    // The band stops on his bow (U6): every bus but the tonic's chokes over STOP, before the reverb, so the hall rings on with what it heard.
    const s0 = at(O.STOP.from) - base;
    const stopLen = at(O.STOP.to) - at(O.STOP.from);
    for (const [name, b] of Object.entries(local)) if (!RING.buses.includes(name)) for (const x of [b.L, b.R]) chokeChannel(x, s0, stopLen);
    if (!RING.buses.includes('sub')) chokeChannel(sub, s0, stopLen);
    for (const [name, b] of Object.entries(local)) {
      const dst = (stems[name] ??= stereo(n));
      for (let i = 0; i < len && base + i < n; i++) {
        dst.L[base + i] += b.L[i];
        dst.R[base + i] += b.R[i];
      }
    }
    for (let i = 0; i < len && base + i < n; i++) stems.sub[base + i] += sub[i];
  }
  return events;
}

/** The tube's power-down (TUBE), drawn dry and centred into `L`, `R` (sample rate `sr`): finish() adds it after the release. In place. */
export function tubeWhine(L, R, sr) {
  const at = (frame) => Math.round((frame / FPS) * sr);
  const from = O.POWER_DOWN.from;
  const end = O.SLAM.to - TUBE.gap;
  const a = at(from);
  const n = Math.min(L.length, at(end)) - a;
  if (n <= 0) return;
  const g = dbGain(TUBE.gainDb);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const f = ((a + k) / sr) * FPS - from;
    const u = clamp(f / (O.POWER_DOWN.to - O.POWER_DOWN.from));
    ph += (TUBE.from * (TUBE.to / TUBE.from) ** (1 - (1 - u) ** 2)) / sr;
    ph -= Math.floor(ph);
    const fin = clamp(f / TUBE.inFrames);
    const fout = clamp((end - from - f) / TUBE.outFrames);
    const env = (0.5 - 0.5 * Math.cos(Math.PI * fin)) * (0.5 - 0.5 * Math.cos(Math.PI * fout));
    const v = g * env * Math.sin(2 * Math.PI * ph);
    L[a + k] += v;
    R[a + k] += v;
  }
}

/**
 * THE RELEASE, then the cursor (sheet §8, music.md S6; U6: no hard choke to zero): the band has stopped on his button (renderOutro,
 * before the reverb); what rings on — the I chord closing, its F♯1, the hall — is released from STOP.from by ringRelease (≈ −33 dBFS
 * under the first tick, −39 above 300 Hz: still the chord; exact zero from the second); the tube's power-down is heard over it (tubeWhine, gone before the landing); and
 * S01's cursor tick — exactly as the mix renders it on frame 0, × LAST_TICK_GAIN — is added on each of TICKS (5.3 on the tail, 5.4
 * alone: the film's last sound, and its first), its tail closed into SETTLE (tickTail), so the film's last frames are digital zero into
 * frame 0's power-on (the mix is gated over SETTLE too). In place.
 */
export function finish(L, R, sr) {
  const at = (frame) => Math.round((frame / FPS) * sr);
  const from = at(O.STOP.from);
  const end = Math.min(L.length, at(O.LOOP));
  if (from >= end) return;
  for (let i = from; i < end; i++) {
    const g = ringRelease((i / sr) * FPS);
    L[i] *= g;
    R[i] *= g;
  }
  tubeWhine(L, R, sr);
  const tick = cursorTick(sr);
  const stop = Math.min(end, at(O.SETTLE.from));
  for (const f of O.TICKS) {
    const a = at(f);
    for (let k = 0; k < tick.L.length && a + k < stop; k++) {
      const g = LAST_TICK_GAIN * tickTail(((a + k) / sr) * FPS);
      L[a + k] += g * tick.L[k];
      R[a + k] += g * tick.R[k];
    }
  }
}

// Events of the ending, the film's part 'outro' (its 5 bars, the film's last: film bars 57–61 on the 61-bar map): CURTAIN CALL. Build sheet
// notes/b58/ending-sheet.md (binding, r4), from the design notes/extend/ending-final.md (every graft of its judge taken). Positions
// are the outro's own bars — at(bar, beat), both 1-based: outro 1.1& is at(1, 1.5), outro 2.4a is at(2, 4.75) — so the ending moves with
// its part when bars are inserted before it.
//   outro 1 (E1 BLUE): drop 2's frozen field decodes in place into a blue screen behind a refresh band; his (×ω×) decodes where it stands
//     into his own UTF-8 bytes, which decode back one group a 32nd into (•ω•); stamped (×ω×) on 1.2; he slides into the screen's
//     emoticon slot; the crash log stages one line a beat; a heartbeat (lub-dub) on 1.1 and 1.3; the antivirus's reticle slides in.
//   outro 2 (E1 → E2 MONITOR): the reticle locks and its ✓ lands where his next heartbeat should have been; the dub never comes; `exit`;
//     the CRT squeezes to a line that is a heart monitor's flatline; one heartbeat shaped like his ω; the trace curls into a red ring
//     round his face and closes on him (the cartoon iris-out) to a red dot; two knocks from inside.
//   outro 3 (E3 IRIS): the film's first tonic: he pries the dot open into a circle; the only wink, on the frame the log promised; ↑ ↑ (the
//     antivirus's `exit`, then his own first command); Enter: friends 1 → 2 → 4 → 8, each lighting up in a spot of its own world.
//   outro 4 (E4 CURTAIN CALL; U5 gave the ending its fifth bar): the lens bursts into a stage; every kaomoji of the film prints
//     in; a headliner from every world is called on each 8th, each popping and bowing on a drum hit of the encore; the guest saunters
//     and the cat dashes on from the wings, planting on 4.4a.
//   outro 5 (E5 BOWS → CURSOR, U5 / U6 / U5b): the cat bows on 5.1, the guest on 5.1& (his empty glass lets go of one last drop:
//     `defender 0 threats (•ω•)` on 5.1a), he bows on 5.2: the button. The band stops and the I chord rings out; the bowed tableau holds
//     to 5.2&; then for a beat and a half the company streams into him one after another while the stage powers down like the CRT and
//     the camera dives into him and on into the █ he folds into, landing on S01's pose at −24 on 5.4 with the tick; one blink, then
//     frame 0: the film runs him again.
// The picture (src/scenes/outro*.ts, src/shots/outro*.ts) and the music (scripts/audio/sections/outro.mjs) read these names, so every hit
// lands on the same frame. Rules (tests/outro.test.ts audits them): every exported frame is a multiple of 3 (the 32nd-note grid); export
// only numbers, number arrays, arrays of [from, to] pairs, objects whose every numeric field is a frame, and arrays of objects whose frame
// fields are named at / from / to / until — amounts, zooms and sizes live in the shot modules (the grid audit reads every numeric field of
// a plain object). Windows are { from, to } with `to` exclusive. Per-frame streams (the band's travel, the small print's line a frame,
// the wall's rows a frame, the bows' dips and holds, the power-down's curve, the drop's gravity) are rates, kept in the shots. Plain
// Node loads this file: erasable TypeScript only, no three / remotion / react imports.
import type { GlyphFlash } from './cuts.ts';
import type { EnergyAccent } from './energy.ts';
import { builtEnd, partEnd, partFrame, partStart } from './film.ts';
import { CURSOR_BLINKS } from './intro.ts';
import { FRAMES_PER_BEAT } from './tempo.ts';

const BEAT = FRAMES_PER_BEAT; // 24
const EIGHTH = BEAT / 2; // 12
const SIXTEENTH = BEAT / 4; // 6
const THIRTY_SECOND = BEAT / 8; // 3
/** Frames a, a + step, … below b. */
const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);

/** The outro's bar `bar`, beat `beat` (both 1-based; outro 1.1& is at(1, 1.5), 1.1e at(1, 1.25), 1.1a at(1, 1.75)), as a film frame. */
export const at = (bar: number, beat = 1): number => partFrame('outro', bar, beat - 1);

// ——— Bounds ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The ending starts on its downbeat, outro 1.1: drop 2's frozen bar hands over (1.1 − 1 → 1.1, decoded in place: no cut). */
export const OUTRO_START = partStart('outro');
/**
 * Where the ending's content ends: builtEnd('outro') — the film's end, the outro being built through (src/score/film.ts: no `built`);
 * were bars ever held, the end of its built bars, after which the held tail shows its last built frame. Spans, the segment and the cuts
 * read this.
 */
export const OUTRO_END = builtEnd('outro');
/** The ending's end on the map, built or not: the film's last frame + 1, where frame 0 follows (the loop). The part table reads this. */
export const LOOP = partEnd('outro');

// ——— outro 1 · E1 BLUE: the seam, the bytes, the stamp, the slot, the staged log (no drums; the heartbeat is the kick lane) ———————————

/** The refresh band sweeps the tube top → bottom over outro 1.1's first 3 frames (its front at y 360 / 720 / 1080); the blue arrives behind it. */
export const SEAM_BAND = { from: at(1), to: at(1) + THIRTY_SECOND } as const;
/** His crash face has decoded, where it stands, into his own bytes (`E2 80 A2 20 CF 89 20 E2 80 A2`, amber): they unfold out of his box (L)… */
export const HEX = at(1, 1.125);
/** …¾ wide by outro 1.1e, settled (residual ≤ 2 px) by here; read still to the first flip. */
export const HEX_SETTLED = at(1, 1.375);
/** The heartbeat, lub-dub a 16th apart, on outro 1.1 and 1.3 (B1): drop 2's last heartbeats (drop2 20.1 / 20.3, HEARTBEATS), continued. */
export const LUB: readonly number[] = [at(1), at(1, 3)];
export const DUB: readonly number[] = [at(1, 1.25), at(1, 3.25)];
/** The decoder reads one UTF-8 group a 32nd: `E2 80 A2` → •, `CF 89` → ω, `E2 80 A2` → • (each group collapses, I, into its flip). */
export const FLIPS: readonly number[] = steps(at(1, 1.5), at(1, 1.5) + 3 * THIRTY_SECOND, THIRTY_SECOND);
/** The brackets appear on the second flip and everything gathers (I) into (•ω•) at (960, 450), closing on outro 1.1a + 3. */
export const GATHER = { from: FLIPS[1], to: at(1, 1.875) } as const;
/** outro 1.2: the blue screen stamps his eyes ×: (×ω×), at the centre, with staged line 1 (`Segmentation fault (cute dumped)`). */
export const STAMP = at(1, 2);
/** The staged lines, one a beat: cute dumped (1.2), the liquid (1.3), the promise (1.4), `[DEFENDER] threat removed ✓` (2.1). */
export const LINES: readonly number[] = [at(1, 2), at(1, 3), at(1, 4), at(2)];
/** The 2D code fills three module rows a 16th: rows 1–3 on outro 1.2e … rows 19–21 on 1.3a (decodable from then on). */
export const CODE_ROWS: readonly number[] = steps(at(1, 2.25), at(1, 4), SIXTEENTH);
/** The progress line steps once a 16th from the first flip to 100 % on 1.4a (14 steps; it reads 0 % at the seam). */
export const PROGRESS: readonly number[] = steps(at(1, 1.5), at(2), SIXTEENTH);
/** outro 1.2&: he slides into the screen's emoticon slot, (960, 450) → (526, 320) (L: ¾ by + 3, settled by 1.3). */
export const SLOT = { from: at(1, 2.5), to: at(1, 3) } as const;
/** The body copy types in as he leaves (6 characters a frame), and the small print's lines 1–13 print one a frame from here. */
export const BODY = at(1, 2.5);
export const SMALL_PRINT = at(1, 2.5);
/** outro 1.4: his right × flicks to • for one 16th — still here. */
export const FLICK = { from: at(1, 4), to: at(1, 4.25) } as const;
/** outro 1.4&: the antivirus's reticle slides in (I) and locks on his ω on 2.1. */
export const RETICLE = { from: at(1, 4.5), to: at(2) } as const;
/** The blue screen's camera: a linear push 1.00 → 1.05 about (760, 520) from the seam to Enter (no punch on the seam: the band is the hit). */
export const BLUE_PUSH = { from: OUTRO_START, to: at(2, 1.75) } as const;

// ——— outro 2 · E1 → E2 MONITOR: the ✓, `exit`, the squeeze, the flatline, the ω, the curl, the iris-out, the knocks ————————————————

/** outro 2.1: LOCK + ✓, the readout ladder's last rung: the ✓ thump lands in the lub's slot — his last heartbeat. */
export const LAST_BEAT = at(2);
/** The lock's two beeps (C6, the Defender's pitch class: a tritone against F♯). */
export const LOCK_BEEPS: readonly number[] = [at(2), at(2) + THIRTY_SECOND];
/** drop 2's rhythm game charts the ending's last heartbeat under this name (src/shots/drop2Game.ts NOTES): the ✓ on outro 2.1. */
export const HEARTBEAT = LAST_BEAT;
/** outro 2.1e: where the dub should have been. It never comes; `[FATAL] heartbeat lost: (•ω•)` prints there, alone (small print line 14). */
export const DUB_MISSING = at(2, 1.25);
export const HEARTBEAT_LOST = DUB_MISSING;
/** The antivirus types `exit`, a key a 32nd from the missing dub, and presses Enter on outro 2.1a. */
export const KEYS: readonly number[] = steps(at(2, 1.25), at(2, 1.75), THIRTY_SECOND);
export const ENTER = at(2, 1.75);
/** The CRT squeezes to a line (I into outro 2.2); line 4 is lifted out of the picture and glides to the centre on the same frames. */
export const SQUEEZE = { from: ENTER, to: at(2, 2) } as const;
/** The last word (line 4, `[DEFENDER] threat removed ✓`): lifted at Enter, centred under the line on 2.2, decaying, gone by 2.4. */
export const LAST_WORD = { from: ENTER, to: at(2, 4) } as const;
/** outro 2.2: the line, and it is a heart monitor's flatline: the soft tone and the write head's sweep for the beat. */
export const LINE = at(2, 2);
export const FLATLINE = { from: LINE, to: at(2, 3) } as const;
/** The monitor's screen-space push 1.00 → 1.12 about (960, 540), from the line to the iris-out. */
export const MONITOR_PUSH = { from: LINE, to: at(2, 4) } as const;
/** The line whine (M13) and the C♯2 pedal: from the line to the dot. */
export const WHINE = { from: LINE, to: at(2, 4) + 3 * THIRTY_SECOND } as const;
/** outro 2.3: the beep — one heartbeat runs in from the left and stops at the centre, the trace dipping into his ω (alive). */
export const BEEP = at(2, 3);
export const PULSE = { from: BEEP, to: at(2, 3.5) } as const;
/** The breath into the tonic (M4): reverse cymbal + inhale, from the beep to outro 3.1. */
export const BREATH = { from: BEEP, to: at(3) } as const;
/** outro 2.3&: the trace curls into a circle of its own length (L, ¾ by + 3), round his face — a red ring of r 260 by + 9. The lens's
 *  interior (his (×ω×) inside) exists from CURL.from. */
export const CURL = { from: at(2, 3.5), to: at(2, 3.5) + 3 * THIRTY_SECOND } as const;
/** Inside the ring his eyes twitch: (×ω×) → (+ω+) → (×ω×) for one 32nd. */
export const TWITCH = CURL.to;
/** outro 2.4: the iris-out (I): the ring closes r 260 → 14 on him, to a red dot on + 9. */
export const CLOSE = { from: at(2, 4), to: at(2, 4) + 3 * THIRTY_SECOND } as const;
/** *tok*, *tok!*: the heartbeat knocks from inside the dot (lub, dub on C♯2), and the pry's creak a 32nd before the tonic. */
export const KNOCKS: readonly number[] = [at(2, 4.5), at(2, 4.75)];
export const CREAK = at(3) - THIRTY_SECOND;

// ——— outro 3 · E3 IRIS: the tonic, the pry, the wink, ↑ ↑, the replication ——————————————————————————————————————————————————————

/** outro 3.1: the film's first tonic (F♯6/9); he pries the dot open into a circle (springL); the bell arpeggio on the 32nds. */
export const OPEN = at(3);
export const BELLS: readonly number[] = steps(OPEN, OPEN + 4 * THIRTY_SECOND, THIRTY_SECOND);
/** The iris's camera: punch on the tonic, then a push 1.00 → 1.04 about (960, 540) to the burst. */
export const IRIS_PUSH = { from: OPEN, to: at(4) } as const;
/** outro 3.1&: W5, the readout, types in (8 frames) outside the iris: `friends 1`, the live frame, `defender 0 threats ✓`. */
export const MONITOR_BACK = at(3, 1.5);
/** outro 3.2: (•ω<)✧, the only wink in the film, on the frame the log promised (`next wink at frame …`, its stamp, W5's frame row). */
export const WINK = at(3, 2);
/** The antivirus notices: `defender 1 threat` blinks twice (3 on / 3 off), a blip each. */
export const DEFENDER_BLIPS: readonly number[] = [WINK, WINK + THIRTY_SECOND];
/** outro 3.2&: `[ OK ] (•ω•) survived` under W5. */
export const SURVIVED = at(3, 2.5);
/** The ✧ twinkles on every 8th from the survived line to the burst. */
export const TWINKLES: readonly number[] = steps(SURVIVED, at(4), EIGHTH);
/** outro 3.3 and 3.3&: ↑ (the antivirus's `exit`, recalled red) and ↑ again (`kaomoji --run --party`, his first command), the LEFT arm. */
export const RECALL: readonly number[] = [at(3, 3), at(3, 3.5)];
/** His ヽ arm lets go of the rim for the two ↑ (the rim dents where it held) and pushes again on Enter. */
export const LET_GO = { from: RECALL[0], to: at(3, 4) } as const;
/** The sung pickups after each ↑ (C♯5, D♯5). */
export const VOX_PICKUPS: readonly number[] = RECALL.map((f) => f + SIXTEENTH);
/** outro 3.4: Enter. friends 1 → 2 → 4 → 8 on the 16ths (the big counter, a bloop each: the boot chime's shape in F♯, M3). */
export const RUN = at(3, 4);
export const COUNTER: readonly number[] = steps(RUN, RUN + 4 * SIXTEENTH, SIXTEENTH);
/** The spots light with the counter's last three steps: Swiss (3.4e), Riso + transition (3.4&), cosmos · club · interlude · drop 2 (3.4a). */
export const SPOTS: readonly number[] = COUNTER.slice(1);
/** The riser and reverse cymbal into the burst, from the first ↑. */
export const RISER = { from: RECALL[0], to: at(4) } as const;

// ——— outro 4 · E4 CURTAIN CALL: the burst, the wall, eight calls on the 8ths, the walk-ons (U5: unhurried) ——————————————————————————
// Sheet r4 §3.4. The encore carries the bar: four on the floor (KICKS), claps on 2 and 4 (CLAPS), closed hats on the off-8ths (HATS);
// each of those hits is also a call (CALLS), so every drum hit has its visual event.

/** outro 4.1: the lens bursts into a stage (the pull-back), the wall prints, the seven friends fly from their spots to their seats. */
export const BURST = at(4);
/** The wall prints in over the burst's first 8th, back row first (≈ 30 rows: the rate is the shot's), each face bowing a 32nd after its print. */
export const WALL_PRINT = { from: BURST, to: at(4, 1.5) } as const;
/**
 * The roll call (U5: one per 8th, readable): eight headliners, A1 → A4 along riser A on beats 1–2, B1 → B4 along riser B on beats 3–4,
 * each popping on its 8th and bowing a 32nd later, in its own world's sound, climbing the F♯ major scale (boot … drop 2).
 */
export const CALLS: readonly number[] = steps(BURST, at(5), EIGHTH);
/** The encore's drums: the kick on every beat of outro 4 and on 5.1, then the button (5.2, his bow); claps on 4.2, 4.4 and the guest's bow (5.1&). */
export const KICKS: readonly number[] = [at(4), at(4, 2), at(4, 3), at(4, 4), at(5), at(5, 2)];
export const CLAPS: readonly number[] = [at(4, 2), at(4, 4), at(5, 1.5)];
/** Closed hats on outro 4's off-8ths (each one a call). */
export const HATS: readonly number[] = steps(at(4, 1.5), at(5), BEAT);
/**
 * The encore (M1): drop 2's HOOK row 1 in its own rhythm over outro 4 (its 16ths 0, 2, 3, 6, 8, 11, 12 and 14: src/score/drop2.ts HOOK2's
 * first bar, eight notes), with its third below; it ends on 4.4&, and the band (kicks, claps, the I chord) carries on into 5.1–5.2.
 */
export const ENCORE: readonly number[] = [0, 2, 3, 6, 8, 11, 12, 14].map((k) => BURST + k * SIXTEENTH);
/** He hops from the iris to the front row's centre (lands on 4.1e, its own 16th: no call on it). */
export const HOP = { from: BURST, to: at(4, 1.25) } as const;
/** The pull-back: the camera reframes (L) from the iris's 1.04 to the whole stage, settled on 4.1&. */
export const PULLBACK = { from: BURST, to: at(4, 1.5) } as const;
/**
 * The principals walk on last (the leads come on after the company): the guest saunters in from the left wing from 4.3 (as the calls
 * return to the left, B1), a step on each 8th (STEPS); the cat dashes in from the right wing from 4.4 (under B3 / B4); both plant on their
 * marks on 4.4a, the pickup into the bows bar (two thuds), a 16th of its own.
 */
export const WALK_ON = { from: at(4, 3), to: at(4, 4.75) } as const;
export const CAT_DASH = { from: at(4, 4), to: WALK_ON.to } as const;
/** The guest's steps (a small bob each), on the 8ths of his saunter. */
export const STEPS: readonly number[] = steps(WALK_ON.from, at(5), EIGHTH);
/** The wall's stadium wave of bows, trailing the calls along the rake ("aww"), cresting on the cat's bow, until the guest's. */
export const BOW_WAVE = { from: CALLS[1], to: at(5, 1.5) } as const;

// ——— outro 5 · E5 BOWS → CURSOR: cat, guest + the last drop, the hero = THE BUTTON; the power-down dive into █; S01's blinks ——————————
// Sheet r4 §3.5 (r4.1: U5b, the lead's ruling after review round 1). U5 / U6: the bows are real bows (a dip of
// ≈ 0.4 em with squash, held), and from the held tableau one continuous move (the stage powers down like the CRT, the company streams
// into him one after another, the camera pushes into him and on into the █) with no frame where the stage just vanishes; the band
// stops on his bow and the I chord rings out under the move. U5b: the bowed tableau holds half a beat, the move takes a beat and a
// half, and the █ lands on 5.4 (was 5.3: the last beat was crammed into 24 frames).

/** The principals bow in ascending billing, "ba-da-BUM": the cat on 5.1 (kick), the guest on 5.1& (clap), he on 5.2 (the button). */
export const BOWS = { cat: at(5), guest: at(5, 1.5), hero: at(5, 2) } as const;
/** The guest's bow tips his empty glass: one last pink drop falls and plinks onto W5 on 5.1a (`defender 0 threats (•ω•)`, friends + 1). */
export const DROP = { from: BOWS.guest, to: at(5, 1.75) } as const;
/** He straightens a 32nd before his bow (the anticipation), the follow-spot and the aim gliding back to him. */
export const ANTICIPATE = BOWS.hero - THIRTY_SECOND;
/** The three are down together a 16th into his bow (the bottom of his dip): the company's last picture, the bow line. */
export const TABLEAU = BOWS.hero + SIXTEENTH;
/**
 * U5b: the bowed tableau holds, the company in place and lit, the stage push carrying on (a living hold), so the climax picture settles
 * before anything leaves: from the bottom of his bow to 5.2&, half a beat from the button. Nothing streams, dims or folds inside it.
 */
export const TABLEAU_HOLD = { from: TABLEAU, to: at(5, 2.5) } as const;
/**
 * The band's button and stop: on his bow the band plays its last hit (kick, crash and the I chord, CHORDS_OUT), then every bus but the
 * I chord's chokes over a 32nd (raised cosine, before the reverb); the chord rings out (RING_OUT).
 */
export const STOP = { from: BOWS.hero, to: BOWS.hero + THIRTY_SECOND } as const;
/** The end of the band's stop (the music bible's S6 frame). Since U6 it is not silence: only SETTLE is digital zero. */
export const SILENT = STOP.to;
/**
 * The power-down (U6): from the end of the held tableau to the landing the stage dims and the tube look returns (the CRT powering down
 * around him, its light drawn in to the centre, which is him) until the picture is S01's ground, haze and look on 5.4 (U5b).
 */
export const POWER_DOWN = { from: TABLEAU_HOLD.to, to: at(5, 4) } as const;
/** The fold: his five glyphs slide to his centre while one cursor cell █ grows there, his own size on screen: a 16th from 5.3&, whole a 16th before the landing, so the █ arrives still moving. */
export const FOLD = { from: at(5, 3.5), to: at(5, 3.75) } as const;
/**
 * The company comes home (U1, U6, U5b): from the end of the held tableau every face streams into him ONE AFTER ANOTHER (the wall's
 * faces as sparks, back rows first; the headliners hopping over the top in call order; the cat and the guest, amber by then, rising out
 * of their bows last), all home by FOLD.from, so the fold is him alone: a beat. CLEAR is the same window: r4 clears the stage by the
 * power-down and the stream, not by a hem.
 */
export const ABSORB = { from: TABLEAU_HOLD.to, to: FOLD.from } as const;
export const CLEAR = ABSORB;
/** He holds his bow, still, from its bottom (5.2e) until he folds. */
export const HERO_HOLD = { from: TABLEAU, to: FOLD.from } as const;
/** The stage push, log-linear about the front row from the pull-back's settle through the held tableau (U5b); its velocity carries into the dive. */
export const STAGE_PUSH = { from: PULLBACK.to, to: TABLEAU_HOLD.to } as const;
/**
 * The dive (the slam, kept by name): the push's velocity carried in from the end of the held tableau, accelerating into him and on into
 * the █, landing on S01's pose at its frame −24 on 5.4 with the tick: a beat and a half (U5b; r4: 21 frames, landing on 5.3 at −48).
 */
export const SLAM = { from: TABLEAU_HOLD.to, to: at(5, 4) } as const;
/** The cursor: S01's blinks (src/score/intro.ts CURSOR_BLINKS, intro positions) replayed from the landing, those that start before the loop (U5b: one, on 5.4), fading like phosphor. */
export const CURSOR: readonly (readonly [number, number])[] = CURSOR_BLINKS.map(([a, b]) => [a - partStart('intro') + SLAM.to, b - partStart('intro') + SLAM.to] as const).filter(([a]) => a < LOOP);
/** S01's cursor tick on each blink (U5b: one, on 5.4, the landing): it sits on the I chord's tail and is the last sound of the film (frame 0's is its first). */
export const TICKS: readonly number[] = CURSOR.map(([a]) => a);
/** The tube settles: ground and haze power 1 → 0.15 to the last frame, so frame 0's warm-up (screenPower) continues it; the only digital zero. */
export const SETTLE = { from: at(5, 4.75), to: LOOP } as const;
/** The I chord rings out from the button, darkening as the camera dives, under the landing's tick, and has died by the settle (U5b: one tick, so RING_OUT.to = SETTLE.from, the music fixer's ask). */
export const RING_OUT = { from: STOP.from, to: SETTLE.from } as const;

/**
 * The harmony (music.md §2.2): IV (Bmaj9) under the blue screen, Vsus on the ✓, V on the line, the film's first tonic on the pry,
 * re-struck on the burst, and struck once more as the button on his bow, left to ring (U6).
 */
export const CHORDS_OUT: readonly { at: number; chord: 'IV' | 'Vsus' | 'V' | 'I' }[] = [
  { at: at(1), chord: 'IV' },
  { at: LAST_BEAT, chord: 'Vsus' },
  { at: LINE, chord: 'V' },
  { at: OPEN, chord: 'I' },
  { at: BURST, chord: 'I' },
  { at: BOWS.hero, chord: 'I' },
];

// ——— The parts: which scene part draws which frames (src/scenes/outro.ts) ——————————————————————————————————————————————————————

export type OutroPartName = 'blue' | 'monitor' | 'iris' | 'company' | 'cursor';
/**
 * OutroScene's parts, in order (the sheet's §2): OutroBlue (outro 1.1 → 2.2, the squeeze included), OutroMonitor (2.2 → 3.1), OutroIris
 * (3.1 → 4.1), OutroCompany (4.1 → 5.4: the curtain call, the bows, the held tableau, the power-down dive into █), OutroCursor (5.4 →
 * the end: S01 at −24 … −1; U5b, was 5.3 and −48). One segment: no hard cut; the continuous hand-offs blend under a straddling shutter,
 * the two impact landings (2.2, 5.4) agree at the instant.
 */
export const OUTRO_PARTS: readonly { name: OutroPartName; from: number; to: number }[] = [
  { name: 'blue', from: OUTRO_START, to: LINE },
  { name: 'monitor', from: LINE, to: OPEN },
  { name: 'iris', from: OPEN, to: BURST },
  { name: 'company', from: BURST, to: SLAM.to },
  { name: 'cursor', from: SLAM.to, to: LOOP },
];
/** The part that draws instant `frame` (a sub-frame instant for render, an output frame for the rest); outside the ending, the nearest. */
export function outroPartIndex(frame: number): number {
  const k = OUTRO_PARTS.findIndex((p) => frame >= p.from && frame < p.to);
  return k >= 0 ? k : frame < OUTRO_START ? 0 : OUTRO_PARTS.length - 1;
}
/** The ending has no hard cut: one segment, from its downbeat to the end of its content. */
export const OUTRO_SEGMENT = { from: OUTRO_START, to: OUTRO_END } as const;
/**
 * The seams scripts/check-seams.mjs measures in a cut of the ending (sheet §10.3): drop 2's hand-off and every part hand-off.
 * `continuous`: the same picture on both sides, judged. `impact`: a designed landing (I), reported with `:cut` and not judged — the
 * squeeze lands its line on 2.2 (on 2.2 − 1 the picture is still a band ≈ 42 % of the screen high) and the slam lands the cursor on
 * S01's pose on 5.4 (U5b); there the two parts agree at the instant of the landing, not frame to frame. The loop (the last frame → frame 0)
 * is OutroCursor's seam test. `--seams` for a cut: OUTRO_SEAMS.map((s) => s.kind === 'impact' ? `${s.at}:cut` : s.at).join(',').
 */
export const OUTRO_SEAMS: readonly { at: number; kind: 'continuous' | 'impact' }[] = [
  { at: OUTRO_START, kind: 'continuous' },
  { at: LINE, kind: 'impact' },
  { at: OPEN, kind: 'continuous' },
  { at: BURST, kind: 'continuous' },
  { at: SLAM.to, kind: 'impact' },
];

// ——— Camera energy and the character flash ———————————————————————————————————————————————————————————————————————————————————

/**
 * The ending's camera energy (src/score/energy.ts): soft punches on the stamp (1.2), the liquid (1.3), the promise (1.4), the ✓ (2.1),
 * the tonic (3.1), Enter (3.4), the burst (4.1, the ending's only shake), the encore's claps on 4.2 and 4.4, and the guest's clap (5.1&).
 * None on 1.1 (the seam decodes in place: the band is the hit), none in the monitor (its own push), none from his bow on (the button
 * is his bow and the dive is one continuous move). No white.
 */
export const OUTRO_ACCENTS: readonly EnergyAccent[] = [
  { at: STAMP, punch: 0.03 },
  { at: LINES[1], punch: 0.02 },
  { at: LINES[2], punch: 0.02 },
  { at: LAST_BEAT, punch: 0.03 },
  { at: OPEN, punch: 0.03 },
  { at: RUN, punch: 0.02 },
  { at: BURST, punch: 0.05, shake: 0.3 },
  { at: CLAPS[0], punch: 0.02 },
  { at: CLAPS[1], punch: 0.02 },
  { at: BOWS.guest, punch: 0.03 },
];

/** The ending's character flashes: none — it has no hard cut (the seam is the terminal's own decode, not a GlyphFlash). */
export const OUTRO_GLYPHS: readonly GlyphFlash[] = [];

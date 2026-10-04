// Drop 2's new bars (build sheet notes/bid2/drop2-sheet2.md §3, §8; the design's §8.2 table, local = design frame − 3264): the crane
// bar of the game (5), Defender's scan bars in the built game bar (6, added), the kernel (8), the switch (9: Defender v2.0's half-time
// bar), and act 2's five worlds (10–17). Called by sections/drop2.mjs renderDrop2 with its context (the placing helpers, drop 2's own
// buses, the vocal buses, the harmony): every event comes from a name in src/score/drop2.ts, so the picture and the sound share it.
// Rules (the music bible §4.7, §3): a world's groove changes only on a bar line, the 8th before it carrying the next world's sound (a J-cut);
// each world brings one new timbre on the hook and one signature one-shot on its landing; Defender's sounds are dry (the `d2dry` bus),
// pitch class C (the tritone against F♯: the intruder) and bend to C♯ when they are infected; the virus's are wet; infection = "wa".
import { SIGNATURE_BYTES as SIGNATURE_HEX } from '../../src/content/drop2.ts';
import * as D from '../../src/score/drop2.ts';
import { FRAMES_PER_BEAT } from '../../src/score/tempo.ts';
import { beep, boing, brass, chipNoise, chipTriangle, clang, fmSlap, glass, koto, noiseHit, orchHit, whistle, woodClack } from './drop2Act2Voices.mjs';
import { BLOCK_KI, INK_RUN, KOTO_EDO, SWEEP, hyoshigi, renderEdo } from './drop2Edo.mjs';
import { sweep } from './drop2Voices.mjs';
import { marimba, paneTink } from './drop2Worlds.mjs';
import { click, impact, kick, riser } from './drums.mjs';
import { SVF } from './filters.mjs';
import { fmBell } from './fm.mjs';
import { reverseCymbal, spark, swarm } from './fx.mjs';
import { stereo } from './mix.mjs';
import { pulseArp } from './synth.mjs';

const SIXTEENTH = FRAMES_PER_BEAT / 4;
/** Defender's pitch class: C (MIDI 60 = C4). */
const C = (octave) => 12 * (octave + 1);
/** The signature (threads (b)): the UTF-8 bytes of `• ω •` — E2 80 A2 20 CF 89 20 E2 80 A2 (src/content/drop2.ts SIGNATURE_BYTES), as numbers. */
export const SIGNATURE_BYTES = SIGNATURE_HEX.map((h) => parseInt(h, 16));
/** How Defender reads a byte (design §8.2 bar 43): its high nibble picks the octave of C (2 → C4, 8 → C5, A/C → C6, E → C7), its low nibble the square's duty (0 → 50 %, 2 → 25 %, 9 → 12.5 %, F → 6 %). */
export const byteVoice = (byte) => ({ midi: { 2: C(4), 8: C(5), 10: C(6), 12: C(6), 14: C(7) }[byte >> 4], duty: { 0: 0.5, 2: 0.25, 9: 0.125, 15: 0.0625 }[byte & 15] });
/** The scoreboard loses a pip (Defender's 5 layers falling: 4/5 on 11.3, 3/5 on the line clear, 2/5 on 14.3&, 1/5 on the contact sheet, 0/5 on the give-up). */
export const PIPS = [D.WAVE_CRASH + 2 * FRAMES_PER_BEAT, D.LINE_CLEAR, D.SET_ROTATE.to + FRAMES_PER_BEAT / 2, D.SHEET, D.GIVING_UP];
/** The kernel's hook fragments (8.3–8.4&): row 4's second half (HOOK2 bar 4, from its 3rd beat), sung four bars later through the hang. */
const KERNEL_FRAGMENTS = () => D.HOOK2.filter((h) => h.at >= D.MARCH[2] && h.at < D.GAME).map((h) => ({ ...h, at: h.at + (D.KERNEL.from - D.MARCH[0]) }));

// ——— v07, the continuity plan (docs/2026-10-03-continuity-plan-v07.md, WP2): the hook as one spine through act 2 (FW1), each world's voice
// arriving early on a visible event and the old one ringing on (FW3), and 10.1 loud by its arrangement, not by noise (§3) ——————————————

/**
 * The koto's hook in act 2 (10–11): its gain (0.22 before v07: 9–12 dB under the wave in 500 Hz – 4 kHz), its pluck's soft clip, and row 2's
 * share (bar 11, under the crash: the hook stands there at a little less and the group clip bends it less).
 */
export const KOTO_HOOK = { gain: 1.0, clip: 0.3, row2: 0.8 };
/** 10.1's voices: the sung IV ("a → o", an octave up; 0.24 before v07: 10.1 is loud by its voices, §3). */
export const BURST_VOICES = { sung: 0.32 };
/** The kernel's ghost of the hook on the dominoes (D.DOMINO_HOOK): the left row's koto, the right row's third below at `harmony` (−6 dB). */
export const KERNEL_KOTO = { gain: 0.5, harmony: 0.5, decay: 0.45, bright: 0.45 };
/** The spill's hook head on the koto (D.SPILL_HOOK, 9.4; on the chime bus, his room): a little louder each copy. */
export const SPILL_KOTO = { gain: 0.32, step: 0.03, decay: 0.7, bright: 0.6 };
/** The drafting arcs (9.4&) as the hyoshigi's ki, louder each, up to just under the first block's "chon!" (drop2Edo.mjs BLOCK_KI.first). */
export const SPILL_KI = { freq: 1180, gains: [0.1, 0.14, 0.19, 0.25] };
/** The flood's whoosh into 10.1: 3 dB under its v06 0.22, peaking on the last arc (a 32nd before 10.1: the downbeat is wood and string). */
export const FLOOD_WHOOSH = 0.22 * 10 ** (-3 / 20);
export const FLOOD_PEAK = D.ARCS[D.ARCS.length - 1];
/** The koto's sweep starts this many frames before 10.1, its top string landing on it (143 ms in the plan; 9 frames keeps it on the grid). */
export const SWEEP_LEAD = 9;
/** Memphis's marimba on the colour blips (13.4&): the march's D♯ C♯ B two octaves over the triangle (its A♯ on 14.1: drop2Worlds.mjs). */
export const COLOUR_MARIMBA = { notes: [75, 73, 71], gain: 0.1 };
/** The reversed orchestra hit into 14.1: its level and decay (160 ms before v07: heard only in its last 100 ms). */
export const ORCH_REV = { gain: 0.2, decayMs: 260 };
/** The slabs' boings: the first a 32nd off 14.1 (the face's landing is the orch hit's), on its slab's drawn pop; the others on SLABS. */
export const BOINGS = [D.SLABS[0] + FRAMES_PER_BEAT / 8, ...D.SLABS.slice(1)];
/** The hinge's panes (15.4&, 15.4a): FALL's glass, the mirror trap's voice a beat early. */
export const HINGE_PANE = { gain: 0.09, decayMs: 450 };
/** The pictograms' brass hook (0.12 before v07: 9 dB under the bar in 500 Hz – 4 kHz; the plan: +6 dB, to −4 dB or louder). */
export const BRASS_HOOK = 0.28;
/** The mirror trap's hook in octaves (0.26 before v07), and its last note, 17.2's top (the bar's one hook note), OCTAVES_TOP × louder (it sat 9.4 dB under its bar). */
export const OCTAVES_HOOK = 0.29;
export const OCTAVES_TOP = 1.6;
/**
 * The arcade's chip square hook (0.12 before v07: 6.5–6.7 dB under the arcade and the well), its square's low-pass a little lower (8 kHz
 * before), so the louder hook does not lift the 8-bit world's 6–16 kHz air.
 */
export const CHIP_HOOK = 0.15;
export const CHIP_HOOK_TOP = 6000;

/** Renders bars 5, 6's additions, 8–17 into the context's buses (sections/drop2.mjs renderDrop2). */
export function renderNewBars(c) {
  const { sr, n, at, own, place, swoosh, mark, on, seconds, midi, sing, chordAt2, VOICINGS2, thirdBelow, addPanned } = c;
  const hz = midi;

  // ——— Infection = "wa" (the bible's M7): u → a on the chord's top note + 12, alternating sides; wet ——————————————————————————
  D.WA2.forEach((f, k) => {
    if (!on('d2wa', f)) return;
    const top = VOICINGS2[chordAt2(f)][3] + 12;
    sing(f, { len: at(10), note: () => top, vowel: 'u', to: 'a', gain: 0.16, seed: 8130 + k }, k % 2 ? 0.3 : -0.3);
    mark('d2wa', f);
  });

  // ——— Bar 5: the crane bar (the game renderer from 5.1; the poster rises into a road) ——————————————————————————————————————————
  // The crane: a long whoosh from the cut, loudest as the poster tips past 60° (5.1 + 18) and settling with the road on 5.2.
  swoosh(D.CRANE.from + 18, 24, { from: 250, to: 3200, gain: 0.18, q: 1.1, seed: 8140 }, { kind: 'd2crane', pan: (p) => -0.2 + 0.4 * p });
  // Defender's first probes in the CLAP lane: a dry square on C5, caught — it bends up to C♯5 as his ω stamps into it.
  D.PROBES.forEach((f, k) => place(own.d2dry, f, 0.2, (b) => beep(b, 0, sr, { freq: hz(C(5)), to: hz(C(5) + 1), ms: 150, bendMs: 60, duty: 0.25, gain: 0.07 }), { kind: 'd2probe', pan: 0.25 + 0.1 * k }));
  // The VOX lane's kana sparkle as the sung notes cross the rule (as bar 6's do); the signature's bytes tick on the HAT lane.
  D.VOX_KANA.forEach((f, k) => {
    const note = D.HOOK2.find((h) => h.at === f).midi;
    place(own.chime, f, 1, (b) => fmBell(b, 0, sr, { freq: hz(note + 24), index: 2.5, decay: 0.35, gain: 0.03 }), { kind: 'd2kana', pan: k % 2 ? 0.4 : -0.4 });
  });
  D.HAT_BYTES.forEach((f, k) => place(own.chime, f, 0.2, (b) => fmBell(b, 0, sr, { freq: 2200 + 120 * (SIGNATURE_BYTES[k] % 7), index: 1.2, decay: 0.04, gain: 0.02 }), { kind: 'd2bytetick', pan: 0.45 }));

  // ——— Bar 6 (built, added): Defender's red scan bars are the roll's chips — each tinks dry on C6 and bends to C♯6 as it is notched ———
  D.SCAN_BARS.forEach((f, k) => place(own.d2dry, f, 0.06, (b) => beep(b, 0, sr, { freq: hz(C(6)), to: hz(C(6) + 1), ms: 40, bendMs: 20, duty: 0.125, gain: 0.035 }), { kind: 'd2tink', pan: k % 2 ? 0.2 : -0.2 }));

  // ——— Bar 8: the kernel ————————————————————————————————————————————————————————————————————————————————————————————————————
  // The whip lands in Defender's nave: a metal clank under the kick; the green @ flood pours in from the left.
  place(own.fx, D.KERNEL.from, 2, (b) => clang(b, 0, sr, { freq: 98, gain: 0.22 }, 8150), { kind: 'd2clank', pan: 0.1 });
  if (on('d2flood', D.KERNEL.from)) {
    const roar = new Float32Array(Math.round(seconds(D.CORE_CRACK - D.KERNEL.from) * sr));
    noiseHit(roar, 0, sr, { lo: 300, hi: 7000, attackMs: 60, holdMs: ((D.KERNEL_SCAN - D.KERNEL.from + FRAMES_PER_BEAT) / 60) * 1000, decayMs: 120, gain: 0.13 }, 8151);
    addPanned(own.d2air, roar, at(D.KERNEL.from), (p) => -0.7 + 0.8 * Math.min(1, 2 * p));
    mark('d2flood', D.KERNEL.from);
  }
  // The dominoes: a dry wooden clack per pillar, a semitone up each, the left row left, the right row a 32nd later and right.
  D.DOMINOES_L.forEach((f, k) => place(own.fx, f, 0.08, (b) => woodClack(b, 0, sr, { freq: 900 * 2 ** (k / 12), gain: 0.16 }, 8160 + k), { kind: 'd2domino', pan: -0.5 }));
  D.DOMINOES_R.forEach((f, k) => place(own.fx, f, 0.08, (b) => woodClack(b, 0, sr, { freq: 900 * 2 ** ((k + 0.5) / 12), gain: 0.14 }, 8170 + k), { kind: 'd2domino', pan: 0.5 }));
  // v07 (FW1, the hook's spine: from 8.1 to 10.1 it was gone, so every world after read as a new song): each left pillar plucks hook row 1
  // on the koto as it lands (D.DOMINO_HOOK) — the virus's hook, a ghost in Defender's house, the timbre it will take in act 2 — the right
  // row a diatonic third below, KERNEL_KOTO.harmony under it. Short and a little dark: a ghost, not a lead.
  D.DOMINO_HOOK.forEach((h, k) => {
    place(own.d2music, h.at, 1, (b) => koto(b, 0, sr, { freq: hz(h.midi), gain: KERNEL_KOTO.gain, decay: KERNEL_KOTO.decay, bright: KERNEL_KOTO.bright }, 9470 + k), { kind: 'd2koto', pan: -0.45 });
    place(own.d2music, D.DOMINOES_R[k], 1, (b) => koto(b, 0, sr, { freq: hz(thirdBelow(h.midi)), gain: KERNEL_KOTO.gain * KERNEL_KOTO.harmony, decay: KERNEL_KOTO.decay, bright: KERNEL_KOTO.bright }, 9480 + k), { group: 'd2koto', pan: 0.45 });
  });
  // Defender scans a beat late: a dry sine sweep up the nave (300 → 1.2 kHz over the beat).
  place(own.d2dry, D.KERNEL_SCAN, seconds(FRAMES_PER_BEAT), (b) => sweep(b, 0, sr, { from: 300, to: 1200, ms: 400, gain: 0.07, attackMs: 4 }), { kind: 'd2kscan' });
  // The core ring cracks into an ω: a crack (sparks over a glassy split) and a low thud.
  place(own.fx, D.CORE_CRACK, 0.6, (b) => {
    spark(b, 0, sr, { gain: 0.2, tone: 5200 }, 8180);
    noiseHit(b, 0, sr, { lo: 2000, hi: 9000, attackMs: 0.5, decayMs: 35, gain: 0.12 }, 8181);
    sweep(b, 0, sr, { from: 140, to: 55, ms: 80, gain: 0.25, decayMs: 70 });
  }, { kind: 'd2corecrack', pan: 0 });
  // v1 hangs: the error buzz (a dry square on C3 chopped at 30 Hz) as the mix muffles (the hang's low-pass is on the buses).
  place(own.d2dry, D.HANG.from, 0.3, (b) => {
    const o = new Float32Array(b.length);
    sweep(o, 0, sr, { from: hz(C(3)), to: hz(C(3)), ms: 260, gain: 0.08, wave: 'square', attackMs: 2 });
    for (let i = 0; i < o.length; i++) b[i] += o[i] * (Math.sin((2 * Math.PI * 30 * i) / sr) > -0.3 ? 1 : 0.2);
  }, { kind: 'd2errbuzz' });
  // The install: dry squares on C, an octave up each, on the 32nds of the bar's last 8th; a riser and a reversed cymbal into the switch.
  D.INSTALL_STEPS.forEach((f, k) => place(own.d2dry, f, 0.06, (b) => beep(b, 0, sr, { freq: hz(C(4 + (k % 4))), ms: 40, duty: 0.5, gain: 0.05 }), { kind: 'd2install' }));
  place(own.d2air, D.HANG.from, seconds(D.SWITCH.from - D.HANG.from), (b) => riser(b, 0, b.length, sr, { gain: 0.2 }, 8190), { group: 'd2riser' });
  place(own.d2air, D.INSTALL.from, seconds(D.SWITCH.from - D.INSTALL.from), (b) => reverseCymbal(b, b.length, b.length, sr, { gain: 0.24, seed: 8191 }), { group: 'd2reverse' });
  // The hook in fragments, sung on through the hang (muffled with the mix).
  KERNEL_FRAGMENTS().forEach((h, k) => {
    if (!on('d2kfrag', h.at)) return;
    const len = Math.round(((h.len * SIXTEENTH * 0.95) / 60) * sr);
    sing(h.at, { len, note: (t) => h.midi - 0.6 * Math.max(0, 1 - t / 0.05), vowel: ['a', 'o', 'u', 'a'][k % 4], to: 'o', gain: 0.24, vibrato: h.len >= 3 ? 0.15 : 0, seed: 8195 + k }, k % 2 ? 0.2 : -0.2);
    mark('d2kfrag', h.at);
  });

  // ——— Bar 9: the switch — Defender v2.0's POV, half time, its own figure (no hook) ————————————————————————————————————————————————
  place(own.d2dry, D.V2_READY[0], 0.2, (b) => {
    beep(b, 0, sr, { freq: hz(C(5)), ms: 45, duty: 0.5, gain: 0.07 });
    beep(b, at(D.V2_READY[1] - D.V2_READY[0]), sr, { freq: hz(C(6)), ms: 60, duty: 0.5, gain: 0.07 });
  }, { kind: 'd2v2ready' });
  // The alarm, two tones a tritone apart (D5 / G♯4) an 8th each, dry and quiet, to the spill; and again for the clamp's beat (17.3).
  // v07 (seam 4224, FW3): the alarm arms with the install (8.4&: the red bar filling) on its other tone, an 8th early — Defender v2.0's
  // voice under the kernel's hang, so the switch does not start with every voice new — then sounds as built from 9.1.
  for (const w of [{ from: D.INSTALL.from, to: D.ALARM.from, tone: 1 }, D.ALARM, { from: D.CLAMP.from, to: D.CLAMP.from + FRAMES_PER_BEAT }]) {
    place(own.d2dry, w.from, seconds(w.to - w.from), (b) => {
      const lp = new SVF(sr);
      const o = new Float32Array(b.length);
      const eighth = at(12);
      for (let k = 0; k * eighth < b.length; k++) sweep(o, k * eighth, sr, { from: (k + (w.tone ?? 0)) % 2 ? 415.3 : 587.33, to: (k + (w.tone ?? 0)) % 2 ? 415.3 : 587.33, ms: (eighth / sr) * 1000, gain: 0.035, wave: 'square', attackMs: 2 });
      for (let i = 0; i < b.length; i++) {
        lp.process(o[i], 3000, 0.7);
        b[i] += lp.lp * Math.min(1, (b.length - i) / (0.005 * sr));
      }
    }, { kind: 'd2alarm', pan: -0.15 });
  }
  // Defender's figure: a low dry square, D3 · C♮3 · B2 · A♯2, a beat each (C♮ is the intruder note), low-passed.
  D.DEFENDER_FIGURE.forEach((x) => place(own.d2dry, x.at, seconds(23), (b) => {
    const o = new Float32Array(b.length);
    sweep(o, 0, sr, { from: hz(x.midi), to: hz(x.midi), ms: (22 / 60) * 1000, gain: 0.1, wave: 'square', attackMs: 3 });
    const lp = new SVF(sr);
    for (let i = 0; i < b.length; i++) {
      lp.process(o[i], 1400, 0.9);
      b[i] += lp.lp;
    }
  }, { kind: 'd2figure' }));
  // The exploded scan, a layer an 8th: dry squares on C5, C6, C7; the servo's whirr on the eyes; the lock's thunk on the ω.
  D.EXPLODE.forEach((f, k) => place(own.d2dry, f, 0.1, (b) => beep(b, 0, sr, { freq: hz(C(5 + k)), ms: 70, duty: 0.25, gain: 0.05 }), { kind: 'd2scannote', pan: [-0.3, 0, 0.3][k] }));
  place(own.fx, D.EXPLODE[1], 0.25, (b) => {
    const o = new Float32Array(b.length);
    sweep(o, 0, sr, { from: 120, to: 260, ms: 180, gain: 0.12, wave: 'saw', attackMs: 10 });
    const bp = new SVF(sr);
    for (let i = 0; i < b.length; i++) {
      bp.process(o[i], 900, 2);
      b[i] += bp.bp;
    }
  }, { kind: 'd2servo', pan: 0.2 });
  place(own.d2dry, D.EXPLODE[2], 0.3, (b) => {
    sweep(b, 0, sr, { from: 130, to: 60, ms: 60, gain: 0.3, decayMs: 50 });
    click(b, 0, sr, { gain: 0.25, tone: 1500 }, 8200);
  }, { kind: 'd2lock' });
  // SIGNATURE MATCH: the ten bytes read one a frame, each a dry square on Defender's reading of it (byteVoice) — the film's only one.
  place(own.d2dry, D.SIGNATURE_MATCH.from, 0.25, (b) => {
    const frame = at(1);
    SIGNATURE_BYTES.forEach((byte, k) => {
      const v = byteVoice(byte);
      beep(b, k * frame, sr, { freq: hz(v.midi), ms: (frame / sr) * 1000 - 1, duty: v.duty, gain: 0.06 });
    });
  }, { kind: 'd2bytes' });
  // The box shuts on the backbeat: a clang, and its eight corners clanking round the frame in the eight frames after.
  place(own.d2dry, D.BOX, 2.2, (b) => clang(b, 0, sr, { freq: 140, gain: 0.22 }, 8210), { kind: 'd2box' });
  for (let k = 0; k < 8; k++) place(own.d2dry, D.BOX + k, 1.5, (b) => clang(b, 0, sr, { freq: 620 + 90 * k, gain: 0.05 }, 8211 + k), { pan: Math.sin((2 * Math.PI * k) / 8) * 0.7, group: 'd2box' });
  // The corner bulges under the held breath: a soft rubbery boing (his).
  place(own.fx, D.BULGE, 0.3, (b) => boing(b, 0, sr, { freq: 85, gain: 0.1, ms: 220, hz: 8, depth: 0.5 }), { kind: 'd2bulge', pan: 0.35 });
  // The spill: amber copies popping out of the corners (wet: his). v07 (seam 4320, the Edo pre-lap): each copy pops out as a koto pluck of
  // the hook's head (D.SPILL_HOOK: G♯5 F♯5 G♯5 B5) — bar 9's statement of the hook, the wave's voice a beat early; they were pops a fifth up.
  D.SPILL_HOOK.forEach((h, k) => place(own.chime, h.at, 1.2, (b) => koto(b, 0, sr, { freq: hz(h.midi), gain: SPILL_KOTO.gain + SPILL_KOTO.step * k, decay: SPILL_KOTO.decay, bright: SPILL_KOTO.bright }, 9490 + k), { kind: 'd2koto', pan: -0.4 + 0.25 * k }));
  // The flood (9.4&): every satellite box fails — a whoosh into the burst (v07: 3 dB down, FLOOD_WHOOSH); the drafting arcs of the wave's
  // curl are the hyoshigi's "ki", louder each (SPILL_KI: the kabuki clappers opening the curtain into the first block's "chon!" on 10.1;
  // they were dry ticks). The riser and the reversed crash into 10.1 are gone (v07): the swell was noise into a beat that is wood and string now.
  swoosh(FLOOD_PEAK, 16, { from: 300, to: 4500, gain: FLOOD_WHOOSH, q: 1.2, seed: 8220 }, { kind: 'd2floodwhoosh', pan: (p) => 0.3 - 0.6 * p });
  // (Their kind is the blocks' — d2block, the hyoshigi's: the same clappers, the curtain's ki before the print's chon.)
  D.ARCS.forEach((f, k) => place(own.fx, f, 0.4, (b) => hyoshigi(b, 0, sr, { freq: SPILL_KI.freq, gain: SPILL_KI.gains[k], seed: 9494 + k }), { kind: 'd2block', pan: -0.3 + 0.15 * k }));

  // ——— Bars 10–11: the woodblock wave (layer 1/5) — straight + taiko, the hook on koto; EDO since 2026-10-03 (so the woodblock
  // wave's music sounds more Edo): the koto in the in-scale, hyoshigi on the blocks, and the Edo theatre's voices in scripts/audio/drop2Edo.mjs —————————————
  // 10.1, the film's loudest beat (the slam is finish()'s): the sung IV — iv's B minor turned major — and the koto's sweep up its hirajōshi
  // strings (the in-scale on A♯; it was the pentatonic, which read Chinese more than Edo), the ō-daiko under it (drop2Edo.mjs ODAIKO), the
  // shamisen's one string (its chord on 10.1&), the koto's hook (the choir that held behind it to 10.3 is gone since
  // 2026-10-02: no chord held behind the beat). v07 (a short, heavy hit at the wave's start read as noise): the burst's impact (white noise under a sine drop) and the foam's
  // two noise hits are gone — that beat lands on a quiet keyline print where nothing visibly explodes, and they were the noise. The beat is
  // loud by its arrangement now, not by noise, drive or clip. The sweep starts SWEEP_LEAD early, so its top string lands on 10.1 (a J-cut:
  // the wave's strings arrive under the spill), a string every SWEEP_LEAD / 10 frames.
  if (on('d2sung2')) VOICINGS2.IV.forEach((m, k) => sing(D.BURST, { len: at(20), note: () => m + 12, vowel: 'a', to: 'o', gain: BURST_VOICES.sung, seed: 8231 + k }, -0.3 + 0.2 * k));
  mark('d2sung2', D.BURST);
  place(own.d2music, D.BURST - SWEEP_LEAD, 1.5, (b) => {
    SWEEP.forEach((m, k) => koto(b, at((k * SWEEP_LEAD) / (SWEEP.length - 1)), sr, { freq: hz(m), gain: KOTO_EDO.sweep + 0.007 * k, decay: KOTO_EDO.sweepDecay, bright: 0.7 }, 8240 + k));
    // v07: the strings' spikes rounded off (KOTO_EDO.sweepClip), as the hook's: the top string lands on 10.1's downbeat with the kick.
    for (let i = 0; i < b.length; i++) b[i] = KOTO_EDO.sweepClip * Math.tanh(b[i] / KOTO_EDO.sweepClip);
  }, { kind: 'd2gliss', pan: 0.2 });
  // The print prints block by block on the 16ths (keyline, pale blue, Prussian, the sky and the mountain, the boats): the hyoshigi's
  // "chon!" on each (the kabuki stage's clappers; they were wood clacks) over the baren's thunk, the last the heaviest.
  D.BLOCKS.forEach((f, k) => {
    const last = k === D.BLOCKS.length - 1;
    place(own.fx, f, 0.4, (b) => {
      hyoshigi(b, 0, sr, { freq: 1120 + 15 * k, gain: last ? BLOCK_KI.last : k === 0 ? BLOCK_KI.first : BLOCK_KI.gain + BLOCK_KI.step * k, seed: 8260 + k });
      sweep(b, 0, sr, { from: 140, to: 70, ms: 40, gain: last ? 0.22 : 0.12, decayMs: 35 });
    }, { kind: 'd2block', pan: -0.4 + 0.2 * k });
  });
  // The amber ink climbs the wave's flow lines, a line a 16th: the koto up the in-scale (A♯5 B5 D♯6 E♯6 F♯6 A♯6), left to right with it.
  // Fix round (2026-10-03, the checker: 22–30 dB under the rest in 0.8–3 kHz, so the scale's colour was not heard): ≈ 25 dB louder, its
  // pluck's burst rounded off (a soft clip at KOTO_EDO.inkClip: the string's spike, 20 dB over its ring, would have gone into the group clip).
  D.INFECT_ROWS.forEach((f, k) => {
    place(own.chime, f, 0.8, (b) => {
      koto(b, 0, sr, { freq: hz(INK_RUN[k]), gain: KOTO_EDO.ink + KOTO_EDO.inkStep * k, decay: KOTO_EDO.inkDecay, bright: KOTO_EDO.inkBright }, 9400 + k);
      for (let i = 0; i < b.length; i++) b[i] = KOTO_EDO.inkClip * Math.tanh(b[i] / KOTO_EDO.inkClip);
    }, { kind: 'd2infect', pan: -0.6 + 0.24 * k });
  });
  // The fingers turn toward Defender's boats: a zing (the ōtsuzumi's "kan!" and the "wa" with it).
  place(own.fx, D.CLAWS, 0.2, (b) => sweep(b, 0, sr, { from: 900, to: 3600, ms: 70, gain: 0.06, attackMs: 3 }), { kind: 'd2zing', pan: 0.3 });
  // He lands on the crest: a thump and a splash.
  place(own.fx, D.CREST, 0.6, (b) => {
    kick(b, 0, sr, { gain: 0.3, f0: 120, f1: 50, pitchMs: 30, decayMs: 160 }, 8270);
    noiseHit(b, 0, sr, { lo: 1000, hi: 6000, attackMs: 2, decayMs: 110, gain: 0.08 }, 8271);
  }, { kind: 'd2crest', pan: -0.2 });
  // Into the barrel: the dive's whoosh building from 10.4, loudest on the crash (11.1).
  swoosh(D.BARREL.to, 34, { from: 200, to: 3500, gain: 0.24, q: 1, seed: 8272 }, { kind: 'd2barrel', pan: (p) => 0.4 - 0.4 * p });
  // 11.1: the curl closes on Defender's boats — a crash of foam (ducked by 11.2).
  for (const [seed, pan] of [[8273, -0.5], [8274, 0.5]]) place(own.d2air, D.WAVE_CRASH, 1, (b) => noiseHit(b, 0, sr, { lo: 120, hi: 7000, attackMs: 8, holdMs: 60, decayMs: 120, gain: 0.14 }, seed), { kind: seed === 8273 ? 'd2wavecrash' : undefined, group: 'd2wavecrash', pan });
  // Spat out of the barrel; his seal stamps (and the "wa"); the boat creaks under him on the prow.
  swoosh(D.WAVE_CRASH + 18, 14, { from: 2500, to: 600, gain: 0.14, q: 1.2, seed: 8275 }, { kind: 'd2spit', pan: (p) => -0.2 + 0.6 * p });
  place(own.fx, D.SEAL, 0.25, (b) => {
    woodClack(b, 0, sr, { freq: 380, gain: 0.24 }, 8276);
    sweep(b, 0, sr, { from: 110, to: 60, ms: 50, gain: 0.2, decayMs: 40 });
  }, { kind: 'd2seal', pan: 0.6 });
  place(own.fx, D.PROW, 0.4, (b) => creak(b, sr, { from: 34, to: 20, ms: 300, tone: 700, gain: 0.12 }, 8277), { kind: 'd2creak', pan: 0.4 });
  // The scoreboard loses its pips (dry): two falling squares and a crack, on each layer breached.
  PIPS.forEach((f, k) => place(own.d2dry, f, 0.12, (b) => {
    beep(b, 0, sr, { freq: hz(C(6)), ms: 35, duty: 0.25, gain: 0.05 });
    beep(b, at(2), sr, { freq: hz(C(5)), ms: 45, duty: 0.25, gain: 0.05 });
    spark(b, 0, sr, { gain: 0.06, tone: 6000 }, 8280 + k);
  }, { kind: 'd2pip', pan: -0.5 }));
  // 11.4: Defender downgrades the world — a dry scan tone on C5 under the line (the music bus is crushed a step a 16th: drop2.mjs); the
  // arcade's first "pew" arrives a 16th early (the J-cut).
  place(own.d2dry, D.DOWNSAMPLE.from, seconds(D.DOWNSAMPLE.to - D.DOWNSAMPLE.from), (b) => {
    sweep(b, 0, sr, { from: hz(C(5)), to: hz(C(5)), ms: ((D.DOWNSAMPLE.to - D.DOWNSAMPLE.from) / 60) * 1000, gain: 0.03, wave: 'square', attackMs: 4 });
    for (let i = 0; i < b.length; i++) b[i] *= 0.75 + 0.25 * Math.sin((2 * Math.PI * 20 * i) / sr);
  }, { kind: 'd2scantone' });
  [D.DOWNSAMPLE_STEPS[D.DOWNSAMPLE_STEPS.length - 1], ...D.PEWS].forEach((f) => place(own.d2dry, f, 0.12, (b) => sweep(b, 0, sr, { from: hz(C(6)), to: hz(C(4)), ms: 90, gain: 0.07, wave: 'square', attackMs: 1 }), { kind: 'd2pew', pan: 0 }));
  // The koto's hook (rows 1–2) with its harmony a diatonic third below. The chord is the shamisen's 8ths now (drop2Edo.mjs; 2026-10-03),
  // in place of the koto’s 16ths, which ran on every 16th from 864 to 1055 (the wave’s one constant layer).
  // v07 (FW1): 0.22 → KOTO_HOOK.gain: at 0.22 the hook sat 9–12 dB under the wave in 500 Hz – 4 kHz and the act sounded like a new song;
  // with its spikes rounded off (below) its ring stands ≈ 9 dB higher, 1–4 dB under the bar.
  // Each pluck's spike (the string's first period, ≈ 20 dB over its ring) rounded off at KOTO_HOOK.clip, as the ink run's (KOTO_EDO.inkClip):
  // at the hook's level it would drive the group clip on every note, and the clip's gain would ride every bus with it (v07, §3).
  hookVoice(c, 'koto', (b, h, m, g, seed) => {
    const t = new Float32Array(b.length);
    koto(t, 0, sr, { freq: hz(m), gain: g, decay: 1.1, bright: 0.65 }, seed);
    for (let i = 0; i < b.length; i++) b[i] += KOTO_HOOK.clip * Math.tanh(t[i] / KOTO_HOOK.clip);
  }, { gain: KOTO_HOOK.gain, pan: 0.15, noteGain: (h) => (h.at >= D.WAVE_CRASH ? KOTO_HOOK.row2 : 1) });
  // The Edo theatre: the shamisen, the tsuke, the tsuzumi, the ō-daiko, the closing hyoshigi, the mountain's shakuhachi.
  renderEdo(c);

  // ——— Bar 12: the 8-bit arcade (layer 2/5) — double time + the march, the hook on a chip square ——————————————————————————————————
  place(own.d2music, D.ARCADE.from, 0.3, (b) => {
    pulseArp(b, [70, 73, 77, 82].map((m, k) => ({ at: at(3 * k), len: at(3 * k + (k === 3 ? 9 : 2.5)) - at(3 * k), freq: hz(m), duty: 0.25 })), sr, { gain: 0.12, cutoff: () => 9000 });
  }, { kind: 'd2chipland' });
  D.SPLITS.forEach((f, k) => place(own.chime, f, 0.15, (b) => {
    const m = [78, 80, 82, 85][k];
    pulseArp(b, [{ at: 0, len: at(2), freq: hz(m), duty: 0.25 }, { at: at(2), len: at(3), freq: hz(m + 12), duty: 0.125 }], sr, { gain: 0.09, cutoff: () => 9000 });
  }, { kind: 'd2split', pan: -0.3 + 0.2 * k }));
  place(own.fx, D.DIVE, seconds(D.STOMP - D.DIVE), (b) => sweep(b, 0, sr, { from: 2600, to: 500, ms: ((D.STOMP - D.DIVE) / 60) * 1000, gain: 0.07, attackMs: 4 }), { kind: 'd2dive', pan: 0 });
  place(own.drums, D.STOMP, 0.8, (b) => {
    chipNoise(b, 0, sr, { gain: 0.3, clockHz: 2500, decayMs: 140 }, 8310);
    sweep(b, 0, sr, { from: 160, to: 50, ms: 80, gain: 0.3, wave: 'square', decayMs: 70 });
  }, { kind: 'd2stomp' });
  place(own.drums, D.INVASION, 0.4, (b) => {
    for (let k = 0; k < 3; k++) {
      chipNoise(b, at(3 * k), sr, { gain: 0.2, clockHz: 1800, decayMs: 50 }, 8311 + k);
      sweep(b, at(3 * k), sr, { from: 90, to: 45, ms: 50, gain: 0.18, wave: 'square', decayMs: 40 });
    }
  }, { kind: 'd2thuds' });
  // The four-note march on the NES triangle (D♯ C♯ B A♯, an octave over the sub), quarters → 8ths → 16ths, doubled by a thin pulse.
  if (on('d2march')) {
    const notes = D.MARCH_NOTES.map((f, k) => {
      const next = k + 1 < D.MARCH_NOTES.length ? D.MARCH_NOTES[k + 1] : f + SIXTEENTH;
      return { at: at(f), len: Math.round(0.85 * (at(next) - at(f))), freq: hz([51, 49, 47, 46][k % 4]) };
    });
    const buf = new Float32Array(n);
    // 0.3 → 0.21 on 2026-10-02: with the shine and the pads gone the triangle's low-mids weighed the well's bar darker than drop 1.
    chipTriangle(buf, notes, sr, { gain: 0.21 });
    pulseArp(buf, notes.map((x) => ({ ...x, freq: 2 * x.freq, duty: 0.125 })), sr, { gain: 0.035, cutoff: () => 5000 });
    addMono(own.d2bass, buf, 0);
    D.MARCH_NOTES.forEach((f) => mark('d2march', f));
  }
  // The chip square's hook (rows 3–4): each note as octave arpeggios on the 16ths, short like a cartridge's.
  hookVoice(c, 'chip', (b, h, m, g) => {
    const steps = Math.max(1, h.len);
    pulseArp(b, Array.from({ length: steps }, (_, j) => ({ at: at(j * SIXTEENTH), len: at(j * SIXTEENTH + 5) - at(j * SIXTEENTH), freq: hz(m + (j % 2 ? 12 : 0)), duty: j % 2 ? 0.125 : 0.25 })), sr, { gain: g, cutoff: () => CHIP_HOOK_TOP });
  }, { gain: CHIP_HOOK, pan: 0.1, harmony: false });

  // ——— Bar 13: the voxel well — the tilt, Defender's garbage, the four-line clear ————————————————————————————————————————————————
  place(own.fx, D.VOXEL_TILT.from, 0.5, (b) => {
    sweep(b, 0, sr, { from: 38, to: 76, ms: 300, gain: 0.3, attackMs: 8, decayMs: 260 });
    pulseArp(b, [{ at: 0, len: at(18), freq: 200, duty: 0.25 }], sr, { gain: 0.05, cutoff: (i) => 300 + 3000 * Math.min(1, i / at(18)) });
  }, { kind: 'd2bwoom' });
  place(own.drums, D.WELL, 0.6, (b) => {
    chipNoise(b, 0, sr, { gain: 0.26, clockHz: 2000, decayMs: 150 }, 8320);
    sweep(b, 0, sr, { from: 100, to: 40, ms: 90, gain: 0.26, wave: 'square', decayMs: 70 });
  }, { kind: 'd2wall' });
  D.HARD_DROPS.forEach((f, k) => place(own.fx, f, 0.2, (b) => {
    chipNoise(b, 0, sr, { gain: 0.16, clockHz: 5000, decayMs: 45 }, 8321 + k);
    sweep(b, 0, sr, { from: 800, to: 200, ms: 30, gain: 0.05, wave: 'square' });
  }, { kind: 'd2harddrop', pan: -0.3 + 0.15 * k }));
  D.GARBAGE.forEach((f, k) => place(own.d2dry, f, 0.25, (b) => {
    sweep(b, 0, sr, { from: hz(C(2)), to: hz(C(3)), ms: 110, gain: 0.14, wave: 'square', attackMs: 2 });
    sweep(b, 0, sr, { from: 90, to: 45, ms: 60, gain: 0.2, decayMs: 50 });
  }, { kind: 'd2garbage', pan: 0.2 * (k ? 1 : -1) }));
  place(own.d2music, D.LINE_CLEAR, 0.4, (b) => {
    pulseArp(b, [87, 90, 94, 99].map((m, k) => ({ at: at(3 * k), len: at(3 * k + (k === 3 ? 9 : 2.6)) - at(3 * k), freq: hz(m), duty: 0.25 })), sr, { gain: 0.1, cutoff: () => 10000 });
  }, { kind: 'd2lineclear' });
  if (on('d2voxburst', D.LINE_CLEAR)) {
    const s = stereo(n);
    swarm(s.L, s.R, at(D.LINE_CLEAR), at(24), sr, { gain: 0.09, density: 2500, seed: 8330 });
    c.mixInto(own.d2air, s);
    place(own.d2air, D.LINE_CLEAR, 0.3, (b) => noiseHit(b, 0, sr, { lo: 2000, hi: 10000, attackMs: 1, decayMs: 45, gain: 0.1 }, 8331), { group: 'd2voxburst' });
    mark('d2voxburst', D.LINE_CLEAR);
  }
  // The cubes' colours swap on the 32nds (13.4&): v07 (seam 4704) Memphis's marimba arrives on them, playing the march's D♯ C♯ B
  // (COLOUR_MARIMBA, the triangle's line two octaves up); its A♯ lands on 14.1 with the totem (drop2Worlds.mjs MARIMBA's first pair). They
  // were chip blips: now the voice of the next world, a 16th early, on a visible event (FW3).
  // (On the chime bus, as the blips were: the march's notes are not the well's vi, whose chord bus holds only its chord.)
  D.COLOUR_BLIPS.forEach((f, k) => place(own.chime, f, 0.6, (b) => marimba(b, 0, sr, { freq: hz(COLOUR_MARIMBA.notes[k]), gain: COLOUR_MARIMBA.gain, decay: 0.14 }), { kind: 'd2marimba', pan: 0.3 * (k - 1) }));
  // The J-cut into Memphis: the orchestra hit reversed, swelling over 13.4 into 14.1, where it meets the hit (its event is its end). v07: its
  // decay ORCH_REV.decayMs, so the swell is heard from about 13.4 (the beat before the landing), not only its last 100 ms.
  const orch = (m) => [m - 12, m - 5, m, m + 4, m + 7, m + 12].map(hz);
  if (on('d2orchrev', D.TOTEM)) {
    const buf = new Float32Array(n);
    orchHit(buf, at(D.TOTEM), sr, { freqs: orch(59), gain: ORCH_REV.gain, decayMs: ORCH_REV.decayMs, reverse: true }, 8340);
    addMono(own.d2music, buf, 0);
    // (Its event is where it is first heard, a beat before the hit it swells into: the J-cut's start.)
    mark('d2orchrev', D.TOTEM - FRAMES_PER_BEAT);
  }

  // ——— Bar 14: Memphis (layer 3/5) — straight 80s: the orchestra hit, the FM slap bass, the cowbell, the vox at half speed ——————————
  place(own.d2music, D.TOTEM, 0.7, (b) => orchHit(b, 0, sr, { freqs: orch(59), gain: 0.3 }, 8341), { kind: 'd2orch' });
  // The slabs' boings (v07: BOINGS — the first off the downbeat, onto its slab's drawn pop; 14.1 is the face's landing, the orch hit's).
  BOINGS.forEach((f, k) => place(own.fx, f, 0.35, (b) => boing(b, 0, sr, { freq: hz([63, 66, 70, 71][k]), gain: 0.07, ms: 260 }), { kind: 'd2boing', pan: -0.45 + 0.3 * k }));
  D.PANELS.forEach((f, k) => place(own.d2dry, f, 0.3, (b) => {
    noiseHit(b, 0, sr, { lo: 120, hi: 2500, attackMs: 1, decayMs: 60, gain: 0.28 }, 8350 + k);
    sweep(b, 0, sr, { from: 90, to: 50, ms: 60, gain: 0.25, decayMs: 50 });
  }, { kind: 'd2panel', pan: k ? 0.25 : -0.25 }));
  swoosh(D.SET_ROTATE.to, 12, { from: 400, to: 5000, gain: 0.2, q: 1.3, seed: 8352 }, { kind: 'd2rotate', pan: (p) => -0.6 + 1.2 * p });
  place(own.fx, D.CRANE_UP.from, seconds(D.CRANE_UP.to - D.CRANE_UP.from), (b) => riser(b, 0, b.length, sr, { gain: 0.22 }, 8353), { group: 'd2riser' });
  // The grid snaps on the ruler's 32nds (14.4&): v07 (seam 4800) the drumline's snare roll into 15.1 (sections/drop2.mjs, with the drumline);
  // they were dry clicks.
  if (on('d2slap')) {
    const buf = new Float32Array(n);
    fmSlap(buf, D.COWBELL2.map((f, k) => ({ at: at(f), len: at(f + 10) - at(f), freq: hz(k % 2 ? 59 : 47) })), sr, { gain: 0.24 });
    addMono(own.d2bass, buf, 0);
    D.COWBELL2.forEach((f) => mark('d2slap', f));
  }
  hookVoice(c, 'voxHalf', null, { gain: 0.3, pan: -0.1 });
  // The pea whistle: its J-cut pip on the ruler's third click (14.4&), then the start on 15.1.
  [D.GRID_SNAP[2], D.PICTO].forEach((f, k) => place(own.fx, f, 0.4, (b) => whistle(b, 0, sr, { freq: 2800, ms: k ? 280 : 90, gain: 0.08 }, 8360 + k), { kind: 'd2pea', pan: 0.3 }));

  // ——— Bar 15: the pictograms (layer 4/5) — straight + drumline, the hook on synth-brass stabs —————————————————————————————————————
  // Stabs, not held chords (since 2026-10-02: no chord held behind the beat): each a 16th and a little, then released. v07
  // (FW1): +6 dB (BRASS_HOOK; at 0.12 the hook sat ≈ 6.6 dB under the bar in 500 Hz – 4 kHz).
  hookVoice(c, 'brass', (b, h, m, g) => {
    const stab = [m, thirdBelow(m), thirdBelow(thirdBelow(m))];
    brass(b, stab.map((x) => ({ at: 0, len: at(Math.min(h.len, 1.25) * SIXTEENTH) - at(0), freq: hz(x) })), sr, { gain: g });
  }, { gain: BRASS_HOOK, pan: 0, harmony: false });
  place(own.fx, D.TOUCHE, 1.2, (b) => {
    clang(b, 0, sr, { freq: 1500, gain: 0.1 }, 8370);
    noiseHit(b, 0, sr, { lo: 3000, hi: 10000, attackMs: 1, decayMs: 40, gain: 0.1 }, 8371);
  }, { kind: 'd2foil', pan: 0.2 });
  place(own.d2dry, D.BAR_RISE, 0.25, (b) => sweep(b, 0, sr, { from: hz(C(4)), to: hz(C(5)), ms: 200, gain: 0.05, attackMs: 5 }), { kind: 'd2barrise' });
  D.WORLD_ROLL.forEach((f, k) => place(own.fx, f, 0.06, (b) => {
    click(b, 0, sr, { gain: 0.15, tone: 1800 }, 8372 + k);
    click(b, Math.round(0.001 * sr), sr, { gain: 0.1, tone: 2600 }, 8376 + k);
  }, { kind: 'd2ratchet', pan: k % 2 ? 0.35 : -0.35 }));
  place(own.fx, D.WORLD_ROLL[D.WORLD_ROLL.length - 1], 0.5, (b) => boing(b, 0, sr, { freq: 140, gain: 0.12, ms: 450, hz: 9, depth: 0.4 }), { kind: 'd2bend', pan: 0 });
  place(own.fx, D.SHEET, 0.1, (b) => {
    click(b, 0, sr, { gain: 0.2, tone: 4000 }, 8380);
    click(b, Math.round(0.025 * sr), sr, { gain: 0.14, tone: 3000 }, 8381);
    woodClack(b, 0, sr, { freq: 2500, gain: 0.08 }, 8382);
  }, { kind: 'd2sheet' });
  // v07 (seam 4896, FW3): the hinge's two tones are the mirror trap's panes (FALL's glass, drop2Worlds.mjs paneTink), arriving a beat
  // early on the tiles hinging into the tube; they were plain glass tings.
  [D.HINGE.from, D.HINGE.from + SIXTEENTH].forEach((f, k) => place(own.chime, f, 1.4, (b) => paneTink(b, 0, sr, { freq: hz([94, 97][k]), gain: HINGE_PANE.gain, decayMs: HINGE_PANE.decayMs, seed: 9150 + k }), { kind: 'd2pane', pan: k ? 0.3 : -0.3 }));
  // The J-cut into the light: the glass shimmer thickening over the hinge (no choir under it since 2026-10-02: the glass is the swell).
  if (on('d2shimmer', D.HINGE.from)) {
    const s = stereo(n);
    const v = VOICINGS2.IV;
    for (let k = 0; k < 18; k++) {
      const f = D.HINGE.from + (D.HINGE.to - D.HINGE.from) * Math.sqrt(k / 18);
      const buf = new Float32Array(Math.round(0.5 * sr));
      glass(buf, 0, sr, { freq: hz(v[k % 4] + 24 + 12 * (k % 2)), gain: 0.012 + 0.002 * k, decay: 0.25 });
      addMono(s, buf, (k % 2 ? 1 : -1) * (0.2 + 0.5 * ((k * 7) % 10) / 10), at(f));
    }
    c.mixInto(own.chime, s);
    mark('d2shimmer', D.HINGE.from);
  }

  // ——— Bars 16–17: the mirror trap (layer 5/5) — everything stacked: every lead in octaves ———————————————————————————————————————
  // 16.1, the light: a bell cluster up the IV chord struck on the brightest frame (decay 1.4 → 0.7 s on 2026-10-02: a strike, not a held
  // bloom; FALL's panes carry the bar from 16.1&, drop2Worlds.mjs).
  place(own.chime, D.LIGHT.from, 3, (b) => {
    const v = VOICINGS2.IV;
    [...v.map((m) => m + 24), ...v.map((m) => m + 36)].forEach((m, k) => fmBell(b, at(k * 0.5), sr, { freq: hz(m), gain: 0.05, decay: 0.7, index: 2.4 }));
  }, { kind: 'd2light' });
  D.MIRRORS.filter((x) => x.at > D.LIGHT.from && x.at < c.bar2(17)).forEach((x, k) => place(own.chime, x.at, 0.8, (b) => {
    const v = VOICINGS2[chordAt2(x.at)];
    [0, 2, 3].forEach((j, q) => glass(b, at(q), sr, { freq: hz(v[j] + 24 + 12 * (k % 2)), gain: 0.045, decay: 0.3 }));
  }, { kind: 'd2mirror', pan: [-0.4, 0.4, 0][k % 3] }));
  place(own.d2dry, D.RETICLES_IN, 0.25, (b) => {
    for (let k = 0; k < 4; k++) beep(b, at(3 * k), sr, { freq: hz(C(7)), ms: 30, duty: 0.25, gain: 0.04 });
  }, { kind: 'd2reticle', pan: 0.5 });
  const octavesTop = (h) => h.at === D.HOOK2_ACT2.filter((x) => x.voice === 'octaves').at(-1).at;
  hookVoice(c, 'octaves', (b, h, m, g, seed) => {
    koto(b, 0, sr, { freq: hz(m + 12), gain: 0.5 * g, decay: 1, bright: 0.7 }, seed);
    // (17.2's lift is its voice, koto and brass: its chip arpeggio stays as it was, so the mirror trap's air does not rise with it.)
    pulseArp(b, Array.from({ length: Math.max(1, h.len) }, (_, j) => ({ at: at(j * SIXTEENTH), len: at(j * SIXTEENTH + 5) - at(j * SIXTEENTH), freq: hz(m + 12 + (j % 2 ? 12 : 0)), duty: 0.25 })), sr, { gain: (0.3 * g) / (octavesTop(h) ? OCTAVES_TOP : 1), cutoff: () => 8000 });
    brass(b, [{ at: 0, len: at(h.len * SIXTEENTH) - at(0), freq: hz(m - 12) }], sr, { gain: 0.45 * g });
  }, { gain: OCTAVES_HOOK, pan: 0, vox: true, noteGain: (h) => (octavesTop(h) ? OCTAVES_TOP : 1) });
  // Defender's last stand (17): target locks (dry C, an octave up each), a riser to the reel, the clamp — a slam and thirty clamps panned
  // round the circle — the star's rising creak, the give-up (two detuned saws gliding down a fourth), its reticles falling as dry blips
  // that bend to C♯ (infected), the whip-pan into the reel and a reversed crash into it.
  D.TARGET_LOCKS.forEach((f, k) => place(own.d2dry, f, 0.1, (b) => beep(b, 0, sr, { freq: hz(C(6 + k)), ms: 50, duty: 0.25, gain: 0.045 }), { kind: 'd2targetlock', pan: [-0.4, 0.4, 0][k % 3] }));
  place(own.d2air, D.TARGET_LOCKS[0], seconds(D.REEL.from - D.TARGET_LOCKS[0]), (b) => riser(b, 0, b.length, sr, { gain: 0.26 }, 8390), { group: 'd2riser' });
  place(own.d2dry, D.CLAMP.from, 2.2, (b) => {
    clang(b, 0, sr, { freq: 92, gain: 0.32 }, 8391);
    impact(b, 0, sr, { gain: 0.2 }, 8392);
  }, { kind: 'd2clamp' });
  if (on('d2clamp', D.CLAMP.from)) {
    const s = stereo(n);
    for (let k = 0; k < 30; k++) {
      const buf = new Float32Array(Math.round(0.03 * sr));
      click(buf, 0, sr, { gain: 0.07, tone: 3000 + 70 * k }, 8400 + k);
      addMono(s, buf, Math.sin((2 * Math.PI * k) / 30) * 0.9, at(D.CLAMP.from) + Math.round(0.0015 * k * sr));
    }
    c.mixInto(own.d2dry, s);
  }
  place(own.fx, D.CLAMP.from + 12, seconds(12), (b) => creak(b, sr, { from: 15, to: 45, ms: 200, tone: 900, gain: 0.1 }, 8430), { kind: 'd2starcreak', pan: -0.2 });
  place(own.d2dry, D.GIVING_UP, 0.6, (b) => {
    for (const cents of [-12, 12]) sweep(b, 0, sr, { from: hz(C(5)) * 2 ** (cents / 1200), to: hz(C(5) - 5) * 2 ** (cents / 1200), ms: 380, gain: 0.06, wave: 'saw', attackMs: 6 });
  }, { kind: 'd2giveup' });
  place(own.d2dry, D.GIVING_UP, 0.35, (b) => {
    for (let k = 0; k < 6; k++) {
      const o = C(7 - Math.floor(k / 2));
      beep(b, at(3 * k), sr, { freq: hz(o), to: hz(o + 1), ms: 30, bendMs: 15, duty: 0.25, gain: 0.035 });
    }
  }, { kind: 'd2rain', pan: 0.3 });
  swoosh(D.WHIP_REEL.to, 12, { from: 5000, to: 600, gain: 0.24, q: 1.2, seed: 8431 }, { kind: 'd2whipreel', pan: (p) => 0.6 - 0.6 * p });
  place(own.d2air, D.GIVING_UP, seconds(D.REEL.from - D.GIVING_UP), (b) => reverseCymbal(b, b.length, b.length, sr, { gain: 0.3, seed: 8432 }), { group: 'd2reverse' });
}

/**
 * Act 2's hook voice `voice` (HOOK2_ACT2): each note rendered by `draw(buf, note, midi, gain, seed)` into its own buffer (or sung, when
 * `draw` is null or `vox`), with a diatonic third below at 0.7 × unless `harmony` is false; one event per note, `d2<voice>`. `noteGain(note)`
 * scales one note (v07: the mirror trap's lone 17.2).
 */
function hookVoice(c, voice, draw, { gain: voiceGain, pan = 0, harmony = true, vox = false, noteGain = () => 1 }) {
  const { sr, at, own, on, mark, sing, thirdBelow } = c;
  const kind = `d2${voice.toLowerCase()}`;
  const notes = D.HOOK2_ACT2.filter((h) => h.voice === voice);
  notes.forEach((h, k) => {
    if (!on(kind, h.at)) return;
    const gain = voiceGain * noteGain(h);
    const len = Math.round(((h.len * SIXTEENTH * 0.95) / 60) * sr);
    const shape = (m) => (t) => m - 0.6 * Math.max(0, 1 - t / 0.05);
    if (!draw || vox) {
      sing(h.at, { len, note: shape(h.midi), vowel: ['a', 'o', 'e', 'a', 'u'][k % 5], to: 'a', gain: vox ? 0.85 * gain : gain, vibrato: h.len >= 3 ? 0.15 : 0, seed: 8500 + k }, pan);
      if (harmony) sing(h.at, { len, note: shape(thirdBelow(h.midi)), vowel: ['a', 'o', 'e', 'a', 'u'][k % 5], to: 'a', gain: 0.7 * (vox ? 0.85 * gain : gain), vibrato: h.len >= 3 ? 0.15 : 0, seed: 8550 + k }, -pan - 0.25);
    }
    if (draw) {
      const buf = new Float32Array(Math.round(1.6 * sr));
      draw(buf, h, h.midi, gain, 8600 + 7 * k);
      if (harmony && !vox) draw(buf, h, thirdBelow(h.midi), 0.7 * gain, 8603 + 7 * k);
      addMono(own.d2music, buf, pan, at(h.at));
    }
    mark(kind, h.at);
  });
}

/** A creak: stick-slip pulses (rate gliding `from` → `to` Hz) rung through a band at `tone`, over `ms`. */
function creak(out, sr, { from = 30, to = 20, ms = 300, tone = 700, gain = 0.1 }, seed = 8277) {
  const bp = new SVF(sr);
  const n = Math.min(out.length, Math.round((ms / 1000) * sr));
  let ph = 0;
  let r = seed;
  for (let i = 0; i < n; i++) {
    const rate = from * (to / from) ** (i / n);
    ph += rate / sr;
    let x = 0;
    if (ph >= 1) {
      ph -= 1;
      r = (r * 1103515245 + 12345) % 2147483648;
      x = 0.6 + 0.4 * (r / 2147483648);
    }
    bp.process(x, tone, 6);
    out[i] += gain * 4 * bp.bp * Math.sin((Math.PI * i) / n);
  }
}

/** Adds mono `src` into stereo `dst` from sample `at`, panned (constant power). */
function addMono(dst, src, pan = 0, atSample = 0) {
  const a = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
  const [l, r] = [Math.cos(a), Math.sin(a)];
  for (let i = 0; i < src.length; i++) {
    const j = atSample + i;
    if (j < 0 || j >= dst.L.length) continue;
    dst.L[j] += src[i] * l;
    dst.R[j] += src[i] * r;
  }
}

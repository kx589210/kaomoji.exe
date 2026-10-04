// Drop 2's bullet time (drop2 19.4& – 20.4&; build sheet notes/bid2/drop2-sheet2.md §3 bar 20, §8; the music bible §4.7): the
// program is frozen, the camera is not — so the music comes back after the freeze's silence (S5) on drop 2's own buses (the plate's room,
// not the dry post bus) and stops again for the hand-off's digital zero (ZERO):
//   the frozen chord — Hann grains of the pads' Vsus read around the frame before the crash (the last chord the program played), high-
//   passed at 150 Hz, faded in from 19.4& (the J-cut), −3 dB a beat from 20.3, gone by the zero;
//   the heartbeat — lub-dub on C♯2, the only sub source (20.1 at −18 dBFS, 20.3 at −24): the ending's lub-dub set up (v07, seam 5376:
//   the outro's own heartThump, and 20.3's dub sagging to B1, so the outro's 1.1 lub is the same heart's next beat);
//   the music box (the film's waltz, M6: F♯5 F♯5 A♯5 C♯6), its spring running down (each note a little flatter), the
//   last left hanging into the zero;
//   the crown's frozen droplets ringing as glass on the 32nds as it passes the lens (C♯ E♯ G♯ B D♯ — never F♯: the tonic is the
//   ending's), the orbit's whoosh panned by the camera's angle (right, behind — reverb only — left, front), a reversed cymbal into the
//   drain, and the depth landing as eight soft plate clacks, the outer ring first.
// v08 (bridge B, src/score/bridgeB.ts; the v07 review found the transition into the ending too short): the last beat is a TAPE STOP, as the picture's
// camera is (TAPE_STOP, cameraTime): the frozen chord's grains slow and sag (an octave's half) and are gone by the landing, the music
// box's C♯6 sags a little flatter as it rings on into the bridge (whose music box runs down: sections/bridgeB.mjs), the whoosh and the
// plates' clacks follow the camera's clock; the hand-off's digital zero (ZERO) is now the bridge's last 16th, so drop 2's buses ring on
// into the bridge until it.
import * as D from '../../src/score/drop2.ts';
import { glass, grainFreeze, woodClack } from './drop2Act2Voices.mjs';
import { Biquad, SVF } from './filters.mjs';
import { reverseCymbal } from './fx.mjs';
import { panGains } from './mix.mjs';
import { heartThump } from './outroVoices.mjs';
import { CHORD_OUT, TAPE_STOP, cameraTime } from '../../src/score/bridgeB.ts';
import { tapeStopRate, varispeed, windingBox } from './bridgeBVoices.mjs';

/** v07 (seam 5376): 20.3's dub sags from C♯2 to `to` (MIDI: B1, the outro's lub) over its length. */
export const HEART_SAG = { to: 35 };

/**
 * A heartThump (the outro's heart) whose pitch sags from `freq` to `to` over its length: drawn at `freq` and read back at a rate falling
 * from 1 to to / freq (so it rings a little longer as it drops), into `out` from `at`.
 */
export function sagged(out, at, sr, { freq, to, gain }) {
  const src = new Float32Array(Math.round(0.6 * sr));
  heartThump(src, 0, sr, { freq, gain });
  let len = src.length;
  while (len > 0 && src[len - 1] === 0) len--;
  const r1 = to / freq;
  let pos = 0;
  for (let i = 0; pos < len - 1; i++) {
    const k = Math.floor(pos);
    const v = src[k] + (pos - k) * (src[k + 1] - src[k]);
    if (at + i >= 0 && at + i < out.length) out[at + i] += v;
    pos += 1 + (r1 - 1) * Math.min(1, pos / len);
  }
}

/** The frozen chord's grains are read from the pads' last half second before this frame (the program's last chord: Vsus). */
export const FREEZE_AT = D.CRASH - 3;
/**
 * The frozen chord's level: v09's 0.55, 3 dB down. Since 2026-10-02 it is drop 2's one held chord (a bed behind
 * everything reads as noise; FALL keeps only a faint glass pad), read from pads that sections/drop2.mjs renders for these grains alone.
 */
export const FREEZE_GAIN = 0.55 * 10 ** (-3 / 20);
/** The music box: on (since 2026-10-01); each note this many cents flat, the spring running down. */
export const MUSIC_BOX_ON = true;
export const MUSIC_BOX_FLAT = [0, -4, -9, -16];
/** The crown's glass: C♯ E♯ G♯ B D♯ (a C♯9 without its tonic's F♯), octaves 6–7. */
export const CROWN_NOTES = [85, 89, 92, 95, 99, 97, 101, 104];
/** The orbit's angle (degrees) at frame `f`: 360 · (1 − cos πu) / 2 over ORBIT (src/score/drop2.ts). */
export const orbitDeg = (f) => {
  const u = Math.min(1, Math.max(0, (f - D.ORBIT.from) / (D.ORBIT.to - D.ORBIT.from)));
  return 180 * (1 - Math.cos(Math.PI * u));
};
/**
 * The frozen chord's level (0 … 1) at frame `f`: in over an 8th from BULLET.from, −3 dB a beat from 20.3, out over CHORD_OUT (v08: from
 * 20.4& to bridge B's second beat, dying with the tape stop — it was out over the 5 frames before the zero, then on drop 2's last 16th).
 */
export const freezeLevel = (f) => {
  if (f < D.BULLET.from || f >= CHORD_OUT.to) return 0;
  const inn = Math.min(1, (f - D.BULLET.from) / 12);
  const third = D.HEARTBEATS[1].at;
  const down = f < third ? 1 : 10 ** ((-3 * ((f - third) / 24)) / 20);
  const out = Math.min(1, (CHORD_OUT.to - 1 - f) / (CHORD_OUT.to - 1 - CHORD_OUT.from));
  return inn * down * Math.max(0, out);
};
/**
 * The tape stop's sag (v08): the frozen chord's grains read slower and slower from 20.4 to CHORD_OUT's end, down to `chord` of their pitch;
 * the hanging C♯6 `cents` further flat over the stop.
 */
export const TAPE_SAG = { chord: 0.35, cents: -45 };
/** The reversed cymbal into 20.4& (v07 0.14; v08 half: it leads into the tape stop's middle, and the bridge's first beat follows it at ≤ 25 % less loudness, FW7). */
export const REVERSE_GAIN = 0.07;
/** The output frame (fractional) at which the camera's clock reads drop2 20.4 + `k` (k < 12; the inverse of cameraTime over the stop). */
export const tapeFrameOf = (k) => {
  const span = TAPE_STOP.to - TAPE_STOP.from;
  return TAPE_STOP.from + span * (1 - Math.sqrt(Math.max(0, 1 - (2 * k) / span)));
};

/** Renders the bullet time into the context's buses (sections/drop2.mjs renderDrop2, after the freeze has cut them); `pads` the pads before the kick ducked them. */
export function renderBullet(c, pads) {
  const { sr, n, at, own, place, mark, on, seconds, midi } = c;
  const a = at(D.BULLET.from);
  // The frozen chord runs out by bridge B's second beat (CHORD_OUT, v08); drop 2's buses ring on to the zero (D.ZERO, the bridge's last 16th).
  const z = at(CHORD_OUT.to);
  if (a >= n) return;
  // The frozen chord: grains of each side's pads, the source half a second before FREEZE_AT, high-passed, enveloped by freezeLevel.
  if (on('d2freeze', D.BULLET.from)) {
    const src0 = Math.max(0, at(FREEZE_AT) - Math.round(0.5 * sr));
    for (const [side, seed] of [['L', 8700], ['R', 8701]]) {
      const src = pads[side].slice(src0, at(FREEZE_AT));
      const g = new Float32Array(n);
      grainFreeze(g, src, a, z - a, sr, { gain: 1, grainMs: [80, 120], seed });
      // The tape stop: from 20.4 the grains are read slower and slower, down to TAPE_SAG.chord of their pitch as they run out.
      const s0 = at(TAPE_STOP.from);
      if (s0 < z && z <= n) g.set(varispeed(g.subarray(s0, z), (i) => tapeStopRate(i, { start: 0, span: z - s0, floor: TAPE_SAG.chord }), z - s0), s0);
      const hp = [Biquad.highpass(sr, 150), Biquad.highpass(sr, 150)];
      for (let i = a; i < Math.min(n, z); i++) own.d2chords[side][i] += FREEZE_GAIN * freezeLevel((i / sr) * 60) * hp[1].process(hp[0].process(g[i]));
    }
    mark('d2freeze', D.BULLET.from);
  }
  // The heartbeats on the sub bus: lub on the beat, dub a 16th after, softer. v07 (seam 5376): the outro's own heart (outroVoices.mjs
  // heartThump, read only), and 20.3's dub sags C♯2 → B1 over its length (HEART_SAG), so the outro's 1.1 lub on B1 is the next beat of the
  // same dying heart (20.1, 20.3, outro 1.1, 1.3: a half-note apart).
  D.HEARTBEATS.forEach((h, k) => {
    const peak = 10 ** (h.db / 20);
    for (const [f, freq, gain] of [[h.at, midi(37), peak], [h.dub, midi(37) * 0.94, 0.75 * peak]]) {
      if (!on('d2heart', f)) continue;
      const sag = k === D.HEARTBEATS.length - 1 && f === h.dub;
      if (sag) sagged(own.sub, at(f), sr, { freq: midi(37), to: midi(HEART_SAG.to), gain });
      else heartThump(own.sub, at(f), sr, { freq, gain });
      mark('d2heart', f);
    }
  });
  // The music box.
  // The last (C♯6, on 20.4) hangs on into bridge B, sagging TAPE_SAG.cents with the tape stop (v08).
  if (MUSIC_BOX_ON) {
    D.MUSIC_BOX.forEach((x, k) => {
      const last = k === D.MUSIC_BOX.length - 1;
      const sag = last && x.at === TAPE_STOP.from ? { sag: TAPE_SAG.cents, sagSeconds: (TAPE_STOP.to - TAPE_STOP.from) / 60 } : {};
      place(own.chime, x.at, 3, (b) => b.set(windingBox(sr, { freq: midi(x.midi), cents: MUSIC_BOX_FLAT[k], gain: 0.15, decay: last ? 1.4 : 0.8, seconds: b.length / sr, ...sag })), { kind: 'd2musicbox', pan: 0.1 });
    });
  }
  // The crown's droplets passing the lens on the right.
  D.CROWN_TINGS.forEach((f, k) => place(own.chime, f, 0.6, (b) => glass(b, 0, sr, { freq: midi(CROWN_NOTES[k % CROWN_NOTES.length]), gain: 0.02 + 0.004 * Math.sin((Math.PI * k) / D.CROWN_TINGS.length), decay: 0.22 }), { kind: 'd2crown', pan: 0.15 + (0.6 * k) / D.CROWN_TINGS.length }));
  // The orbit's whoosh: band noise as loud as the camera is fast, panned by its angle; in front on the air bus, behind only in the room.
  if (on('d2orbit', D.BULLET.from)) {
    const bp = new SVF(sr);
    // v08: on the camera's clock (the tape stop slows the last beat; the whoosh is as fast as the camera is, so it fades with it).
    const e = Math.min(n, at(TAPE_STOP.to));
    let s = 8710;
    for (let i = a; i < e; i++) {
      const f0 = (i / sr) * 60;
      const f = cameraTime(f0);
      const rate = f0 <= TAPE_STOP.from ? 1 : Math.max(0, 1 - (f0 - TAPE_STOP.from) / (TAPE_STOP.to - TAPE_STOP.from));
      const th = (orbitDeg(f) * Math.PI) / 180;
      const u = (f - D.ORBIT.from) / (D.ORBIT.to - D.ORBIT.from);
      const speed = Math.max(0, Math.sin(Math.PI * Math.min(1, u))) * rate;
      s = (s * 1103515245 + 12345) % 2147483648;
      bp.process(2 * (s / 2147483648) - 1, 500 + 1800 * speed, 1.2);
      const v = 0.05 * speed * Math.min(1, (i - a) / (0.05 * sr)) * Math.min(1, (e - i) / (0.05 * sr)) * bp.bp;
      const front = 0.5 + 0.5 * Math.cos(th);
      const [l, r] = panGains(Math.sin(th));
      own.d2air.L[i] += v * front * l;
      own.d2air.R[i] += v * front * r;
      own.chime.L[i] += 0.5 * v * (1 - front) * l;
      own.chime.R[i] += 0.5 * v * (1 - front) * r;
    }
    mark('d2orbit', D.BULLET.from);
  }
  // A reversed cymbal into the drain, and the depth landing: eight plate clacks a frame apart, the outer ring first (wide, low).
  // v08: 6 dB softer (REVERSE_GAIN): it swells into the tape stop's middle now, not into a drain, and the tape stop winds down from there.
  place(own.d2air, D.DRAIN.from - 24, seconds(24), (b) => reverseCymbal(b, b.length, b.length, sr, { gain: REVERSE_GAIN, seed: 8720 }), { group: 'd2reverse' });
  // v08: each clack lands where the camera's clock reads its plate's frame (the tape stop spreads them a little).
  place(own.fx, D.PLATES.from, 0.3, (b) => {
    for (let k = 0; k < 8; k++) woodClack(b, Math.round(((tapeFrameOf(D.PLATES.from - TAPE_STOP.from + k) - D.PLATES.from) / 60) * sr), sr, { freq: 650 + 110 * k, gain: 0.05 + 0.004 * k }, 8721 + k);
  }, { kind: 'd2plates' });
}

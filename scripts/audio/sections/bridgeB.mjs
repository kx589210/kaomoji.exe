// Bridge B's sound, the part 'bridgeB' (v08: one bar between drop 2 and the ending; film bar 58, frames 5472–5567 on the 63-bar map;
// score src/score/bridgeB.ts, every frame from it). The v07 review: the turn from the spin into the ending's crash was abrupt and read as a break; the transition was too short.
// Contract: output/qa/v08/MAP-CONTRACT.md.
//
// THE CRASH TAKES TIME: a wind-down, no chord bed. Drop 2's last beat was the tape stop (scripts/audio/drop2Bullet.mjs: the frozen
// chord's grains slowing and sagging to nothing on the landing, the music box's C♯6 sagging as it rings on in); here
//   the music box runs down: A♯5 on the landing, F♯5 a 16th late on the tear, D♯5 later still on the corruption's last 16th, sagging as
//     it rings — the blue screen's glass figure (C♯6 A♯5 F♯5 D♯5, outro 1.1's 32nds) slower and slower, each note flatter, quieter;
//   his heart, slower and late: one lub-dub on 1.1& (B1, the dub 9 frames after and sagging to A1), 60 frames after drop 2's 20.3 and 84
//     before the ending's 1.1 (each beat further apart);
//   the glitches, small and dry, each on its picture's stage: a relay click for the CRT's slip (on the lub), two falling glass tinks for the tear
//     (1.2, FALL's voice), the sound skipping on the corruption (1.3: a 32nd of the mix repeated four times; finish()), and on the freeze
//     (1.4) the stuck buffer — the program's last 32nd looping, quieter and darker each time (finish()) — until the zero, with the blue
//     screen's first glass droplet over it, a beat early (C♯6: the J-cut into its figure on outro 1.1);
//   then the hand-off's digital zero (drop 2's ZERO, now this bar's last 16th: sections/drop2.mjs declares it, restarting the plate on it)
//     and the blue screen's first sounds on outro 1.1 as approved (the glass droplets, the e-piano's C♯6, the music box's ghost).
// The width and the darkness are drop 2's seam treatments, held through the bar (sections/drop2.mjs WIDTH_RAMPS, DARKEN: the side −6 dB,
// a 2.2 kHz low-pass), so the bar sits in the room drop 2 left and the ending opens in.
//
// Hooks (bgm.mjs reads them, in film order: … DROP2, BRIDGE_B, OUTRO): its own buses (SENDS, prefixed `bb`: the music box in the
// chime's room, the heart dry and mono, the glitches dry), its events as { kind, at } (kinds `bb…`; the heartbeats end in "heart" for
// check-sync), no CUTS or SILENCES of its own (drop 2's ZERO is the zero), finish() for the skip and the stuck buffer. Seeds 9100–9199.
import { FPS } from '../../../src/score/tempo.ts';
import { partBar } from '../../../src/score/film.ts';
import * as B from '../../../src/score/bridgeB.ts';
import { tink } from '../breakVoices.mjs';
import { glass } from '../drop2Act2Voices.mjs';
import { skip, stuck, windingBox } from '../bridgeBVoices.mjs';
import { stage } from '../cosmosStage.mjs';
import { sagged } from '../drop2Bullet.mjs';
import { blip, click } from '../drums.mjs';
import { whoosh } from '../fx.mjs';
import { panGains } from '../mix.mjs';

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const dbGain = (db) => 10 ** (db / 20);

/** No cut of its own: drop 2's zero (now this bar's last 16th, D.ZERO) and the outro's downbeat restart the plate. */
export const CUTS = [];
/** No silence of its own: the hand-off's zero is drop 2's (sections/drop2.mjs SILENCES, ZERO = HAND_OFF_ZERO). */
export const SILENCES = [];
/** Its buses: the music box in the chime's room (its send), the heart dry (mono, low), the glitches nearly dry. */
export const SENDS = { bbbox: 0.55, bbheart: 0, bbglitch: 0.04 };
/** The seam whole (bgm.mjs writes public/audio/sections/bridgeB-seam.wav): the bullet time → the bridge → the blue screen's bar. */
export const PREVIEWS = [{ id: 'bridgeB-seam', fromBar: partBar('drop2', 20), toBar: partBar('outro', 1) }];

/** The music box running down (MUSIC_BOX_B): each note's level and ring, and the last one's sag (cents over its first `sagSeconds`). */
export const BOX = { gains: [0.14, 0.12, 0.1], decays: [0.6, 0.55, 0.7], sag: { cents: -100, seconds: 0.35 }, pan: 0.1 };
/** The heart (HEART_B): the lub on B1 at `lub` dBFS sagging to A♯1, the dub at `dub` sagging B1 → A1 (the outro's lub on 1.1 is B1 again). */
export const HEART_B_VOICE = { m: 35, lub: { db: -23, to: 34 }, dub: { db: -27, to: 33 } };
/** The glitches' levels: the slip's relay click, the tear's two glass tinks (D♯7 and B6, falling, a little flat). */
export const GLITCH = { click: { gain: 0.05, tone: 1400 }, tinks: [{ m: 99, gain: 0.05 }, { m: 95, gain: 0.04 }], tinkCents: -35 };
/** The drain's blips (T7's, as built: 1200 900 600 Hz), one a stage: the landing's and the tear's. */
export const DRAIN_BLIPS = [1200, 900];
/** The corruption's skip (SKIP: its 32nd slices) and the freeze's stuck buffer (STUCK: 32nd loops, −2 dB and darker each). */
export const SKIP_EDIT = { stepDb: -1.5 };
export const STUCK_EDIT = { stepDb: -2, lp: [5000, 900] };
/** The freeze's glass (FREEZE_GLASS): the blue screen's crown voice and its first note's level and ring (sections/outro.mjs SEAM_GLASS[0]), over the stuck buffer. */
export const GLASS = { gain: 0.055, decay: 0.3, pan: 0.15 };

/** Renders bridge B into the stems; returns its events as { kind, at } (at in film samples). */
export function renderBridgeB(stems, sr, { origin = 0, solo = () => true } = {}) {
  const S = stage(stems, sr, { origin, from: B.BRIDGE_B_START, to: B.HAND_OFF_ZERO.from, sends: SENDS, solo });
  const { B: bus, place, events, commit } = S;

  // The music box runs down.
  B.MUSIC_BOX_B.forEach((x, k) => {
    const last = k === B.MUSIC_BOX_B.length - 1;
    place(bus.bbbox, x.at, 2.5, (b) => b.set(windingBox(sr, { freq: midi(x.midi), cents: x.cents, gain: BOX.gains[k], decay: BOX.decays[k], seconds: b.length / sr, ...(last ? { sag: BOX.sag.cents, sagSeconds: BOX.sag.seconds } : {}) })), { kind: 'bbmusicbox', pan: BOX.pan });
  });

  // His heart, slower: the lub and the dub, each sagging (drop2Bullet.mjs sagged: the outro's heartThump read back slower and slower).
  const h = HEART_B_VOICE;
  place(bus.bbheart, B.HEART_B.lub, 0.6, (b) => sagged(b, 0, sr, { freq: midi(h.m), to: midi(h.lub.to), gain: dbGain(h.lub.db) }), { kind: 'bbheart' });
  place(bus.bbheart, B.HEART_B.dub, 0.6, (b) => sagged(b, 0, sr, { freq: midi(h.m) * 0.94, to: midi(h.dub.to), gain: dbGain(h.dub.db) }), { as: 'bbheart' });

  // The drain (T7's whoosh and falling blips, drop 2's as built, moved here with the drain): the whoosh on the landing, as the outer rings
  // drain from the edges in; a blip falling a step on the landing and on the tear (the corruption's own sound is the skip). Post bus: dry.
  S.postAt(B.STAGES.colour, 0.2, (b) => whoosh(b, 0, Math.round(0.2 * sr), sr, { from: 4000, to: 300, gain: 0.08, q: 1, seed: 9130 }), { kind: 'bbdrain' });
  [B.STAGES.colour, B.STAGES.tear].forEach((f, k) => S.postAt(f, 0.06, (b) => blip(b, 0, sr, { freq: DRAIN_BLIPS[k], ms: 40, gain: 0.05 }), { kind: 'bbfall', pan: 0.2 - 0.2 * k }));

  // The glitches: the CRT's slip (a relay click), the tear (two glass tinks, falling).
  place(bus.bbglitch, B.SLIP_CLICK, 0.05, (b) => click(b, 0, sr, GLITCH.click, 9120), { kind: 'bbslip', pan: -0.15 });
  B.TEAR_CHIRPS.forEach((f, k) => {
    const t = GLITCH.tinks[k];
    place(bus.bbglitch, f, 0.7, (b) => tink(b, 0, sr, { freq: midi(t.m + GLITCH.tinkCents / 100), gain: t.gain, decayMs: 260, seed: 9121 + k }), { kind: k === 0 ? 'bbtear' : undefined, as: k === 0 ? undefined : 'bbtear', pan: k === 0 ? 0.35 : -0.35 });
  });

  commit({ cut: B.HAND_OFF_ZERO.from });
  // The finished mix's edits are events too (check-sync, the seam checks): the skip and the stuck buffer.
  if (solo('bbskip', B.SKIP.from)) events.push({ kind: 'bbskip', at: Math.round((B.SKIP.from / FPS) * sr) });
  if (solo('bbstuck', B.STUCK.from)) events.push({ kind: 'bbstuck', at: Math.round((B.STUCK.from / FPS) * sr) });
  if (solo('bbcrown', B.FREEZE_GLASS.at)) events.push({ kind: 'bbcrown', at: Math.round((B.FREEZE_GLASS.at / FPS) * sr) });
  return events;
}

/**
 * The finished mix's edits (after drop 2's, before the outro's), in place: the corruption's skip (SKIP: the 32nd before 1.3, four
 * times, each SKIP_EDIT.stepDb quieter) and the freeze's stuck buffer (STUCK: the 32nd before 1.4 looping to the zero, each loop
 * quieter and darker). `origin` is the film frame of the mix's first sample (0: the film).
 */
export function finish(L, R, sr, { origin = 0 } = {}) {
  const at = (frame) => Math.round(((frame - origin) / FPS) * sr);
  const slice = at(B.SKIP.from + 3) - at(B.SKIP.from);
  skip(L, R, { at: at(B.SKIP.from), slice, times: Math.round((B.SKIP.to - B.SKIP.from) / 3), stepDb: SKIP_EDIT.stepDb });
  stuck(L, R, sr, { at: at(B.STUCK.from), to: at(B.STUCK.to), slice, stepDb: STUCK_EDIT.stepDb, lp: STUCK_EDIT.lp });
  // The glass over it (added after the stuck buffer, which replaces the mix there), closed 3 ms before the zero.
  const a = at(B.FREEZE_GLASS.at);
  const z = at(B.HAND_OFF_ZERO.from);
  if (a < 0 || z > L.length) return;
  const g = new Float32Array(z - a);
  glass(g, 0, sr, { freq: 440 * 2 ** ((B.FREEZE_GLASS.midi - 69) / 12), gain: GLASS.gain, decay: GLASS.decay });
  const fade = Math.round(0.003 * sr);
  const [l, r] = panGains(GLASS.pan);
  for (let i = 0; i < g.length; i++) {
    const w = Math.min(1, (g.length - i) / fade);
    L[a + i] += l * w * g[i];
    R[a + i] += r * w * g[i];
  }
}

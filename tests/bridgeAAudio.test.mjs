// Bridge A's sound (scripts/audio/sections/bridgeA.mjs; score src/score/bridgeA.ts): the breath between the cosmos's stutter and club 1.1.
// The cosmos's glass thins out while the club's groove arrives a layer a beat in the club's own voices and room. Measured in a slice of the
// film — the cosmos's last two bars, the bridge, the club's first three — rendered by the three parts' own renderers and mixed as bgm.mjs
// mixes the film (cosmosStage.mjs mixAlone): the events on the score's frames, the bridge's buses inside its bar, the seams' carries and
// new kinds (check-seam-audio.mjs's own counting), the room across both lines (FW4), and the loudness arc: a breath, then a build.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { roomOf, roomStep, seamVoices } from '../scripts/check-seam-audio.mjs';
import { mixAlone } from '../scripts/audio/cosmosStage.mjs';
import { stereo } from '../scripts/audio/mix.mjs';
import * as BA from '../scripts/audio/sections/bridgeA.mjs';
import * as CLUB from '../scripts/audio/sections/club.mjs';
import * as COSMOS from '../scripts/audio/sections/cosmos.mjs';
import * as A from '../src/score/bridgeA.ts';
import { partFrame } from '../src/score/film.ts';
import { FPS } from '../src/score/tempo.ts';

const SR = 48000;
const ORIGIN = partFrame('cosmos', 5);
const TO = partFrame('club', 4);
const n = Math.round(((TO - ORIGIN) / FPS) * SR);
const at = (f) => Math.round(((f - ORIGIN) / FPS) * SR);
const SHARED = { keys: 0.1, fx: 0.22, music: 0.3, chime: 0.55, drums: 0.08, bass: 0, chords: 0.25, vox: 0.4 };
const SENDS = { ...SHARED, ...COSMOS.SENDS, ...BA.SENDS, ...CLUB.SENDS };

/** The slice's stems and events (film frames), with `solo` passed to every renderer. */
function render(solo = () => true) {
  const stems = { post: stereo(n), sub: new Float32Array(n) };
  for (const k of Object.keys(SENDS)) stems[k] = stereo(n);
  const ev = [...COSMOS.renderCosmos(stems, SR, { origin: ORIGIN, solo }), ...BA.renderBridgeA(stems, SR, { origin: ORIGIN, solo }), ...CLUB.renderClub(stems, SR, { origin: ORIGIN, solo })];
  return { stems, events: ev.map((e) => ({ kind: e.kind, frame: (e.at / SR) * FPS })) };
}
const mix = (stems) =>
  mixAlone(stems, SR, {
    origin: ORIGIN,
    sends: SENDS,
    cuts: [...COSMOS.CUTS, ...BA.CUTS, ...CLUB.CUTS],
    silences: [...CLUB.SILENCES],
    finish: (L, R, sr, o) => {
      COSMOS.finish(L, R, sr, o);
      BA.finish(L, R, sr, o);
      CLUB.finish(L, R, sr, o);
    },
  });
const full = render();
const { L, R } = mix(full.stems);
const S = A.BRIDGE_A_START;
const END = A.BRIDGE_A_END;
/** K-weighted momentary loudness (LUFS, 400 ms, ungated) of film frames [a, b) of the mix. */
const K48 = [
  [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
  [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621],
];
const kw = (x) => {
  const z = K48.map(() => [0, 0, 0, 0]);
  return Float64Array.from(x, (v) => {
    let y = v;
    K48.forEach(([b0, b1, b2, a1, a2], k) => {
      const [x1, x2, y1, y2] = z[k];
      const o = b0 * y + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      z[k] = [y, x1, o, y1];
      y = o;
    });
    return y;
  });
};
const kL = kw(L);
const kR = kw(R);
const lufs = (a, b) => {
  let s = 0;
  for (let i = at(a); i < at(b); i++) s += kL[i] * kL[i] + kR[i] * kR[i];
  return -0.691 + 10 * Math.log10(s / (at(b) - at(a)));
};

test('every event of the bridge is a ba… kind on one of the score’s frames, inside its bar; kicks end in "kick", the fill’s snares in "fill"', () => {
  const own = full.events.filter((e) => e.kind.startsWith('ba'));
  assert.ok(own.length > 40, `${own.length} events`);
  const frames = new Set([...A.STABS, ...A.GLASS, ...A.GLASS_THREAD, ...A.HATS, ...A.OPEN_HATS, ...A.KICKS, A.BASS, ...A.PLUCKS, ...A.FILL, A.PICKUP.horn, A.PLATES, A.REGISTER, ...A.HOOK_GHOST.map((h) => h.at), A.SWELL.from]);
  for (const e of own) {
    assert.ok(Math.abs(e.frame - Math.round(e.frame)) < 1e-6 && frames.has(Math.round(e.frame)), `${e.kind} at ${e.frame}`);
    assert.ok(e.frame >= S && e.frame < END, `${e.kind} at ${e.frame} inside the bridge`);
  }
  assert.deepEqual([...new Set(own.filter((e) => /kick$/.test(e.kind)).map((e) => e.frame))], [...A.KICKS]);
  assert.deepEqual([...new Set(own.filter((e) => /fill$/.test(e.kind)).map((e) => e.frame))], [...A.FILL]);
  assert.deepEqual(BA.CUTS, [], 'the plate rings across both lines');
  assert.deepEqual(BA.SILENCES, [], 'a breath, not a hole');
});

test('the bridge’s own buses sound only inside its bar (cut on club 1.1); its sends are the club’s and the cosmos’s glass’s', () => {
  for (const name of Object.keys(BA.SENDS)) {
    const b = full.stems[name];
    let before = 0;
    let after = 0;
    for (let i = 0; i < at(S); i++) before = Math.max(before, Math.abs(b.L[i]), Math.abs(b.R[i]));
    for (let i = at(END); i < n; i++) after = Math.max(after, Math.abs(b.L[i]), Math.abs(b.R[i]));
    assert.equal(before, 0, `${name} before the bridge`);
    assert.equal(after, 0, `${name} after club 1.1`);
  }
  assert.equal(BA.SENDS.baPiano, CLUB.SENDS.clPiano);
  assert.equal(BA.SENDS.baBrass, CLUB.SENDS.clBrass);
  assert.equal(BA.SENDS.baGlass, COSMOS.SENDS.csGlass);
  assert.equal(BA.LEVEL_DB, CLUB.LEVEL_DB);
});

test('club 1.1 is the next beat of something playing: at most 4 new kinds on its downbeat (FW3; v07 had 6), and the bridge carries voices both ways', () => {
  const into = seamVoices(full.events, S);
  assert.ok(into.tail.length >= 1, `the cosmos rings into the bridge: ${into.tail}`);
  assert.ok(into.fresh.length <= 4, `new on the bridge’s downbeat: ${into.fresh}`);
  const club = seamVoices(full.events, END);
  assert.ok(club.fresh.length <= 4, `new on club 1.1: ${club.fresh}`);
  for (const k of ['kick', 'hat', 'stab', 'sub', 'hook']) assert.ok(!club.fresh.includes(k), `${k} is heard in the bridge first`);
  assert.ok(club.tail.length >= 3, `the bridge’s voices go on in club bar 1: ${club.tail}`);
  assert.ok(club.kick.before && club.kick.after && into.kick.after, 'the kick never drops out (FW2)');
});

test('the same room across both lines (FW4): the centroid within ½ octave and side/mid within 3 dB, beat before against beat after', () => {
  const beat = (a) => roomOf(L, R, SR, at(a), at(a + 24));
  for (const line of [S, END]) {
    const st = roomStep(beat(line - 24), beat(line));
    assert.ok(Math.abs(st.centroid) <= 0.5, `${line}: centroid step ${st.centroid.toFixed(2)} oct`);
    assert.ok(Math.abs(st.sideMid) <= 3, `${line}: side/mid step ${st.sideMid.toFixed(2)} dB`);
  }
});

test('the loudness arc: the breath — beat 1 under the stutter’s beat — then a build, every beat of the bridge louder than the last into club 1.1, no step over 3 LU', () => {
  const beats = [S - 24, S, S + 24, S + 48, S + 72, END].map((f) => lufs(f, f + 24));
  const [stutter, b1, b2, b3, b4, club] = beats;
  assert.ok(b1 < stutter - 0.5, `a breath: ${b1.toFixed(2)} against the stutter’s ${stutter.toFixed(2)}`);
  assert.ok(b1 > stutter - 4.5, `… not a hole: ${b1.toFixed(2)}`);
  assert.ok(b3 > b2 && b4 > b3 && club > b4, `the build: ${beats.map((v) => v.toFixed(2)).join(' ')}`);
  for (let i = 1; i < beats.length; i++) assert.ok(Math.abs(beats[i] - beats[i - 1]) <= 3, `step ${i}: ${(beats[i] - beats[i - 1]).toFixed(2)} LU`);
});

test('the hook whispered on the register (HOOK_GHOST) is the hook’s own voice: left out with the hook’s kinds, nothing else moves', () => {
  const noHook = render((kind) => !/hook/.test(kind));
  const a = at(A.HOOK_GHOST[0].at);
  const b = at(END);
  let diff = 0;
  let other = 0;
  for (let i = a; i < b; i++) diff = Math.max(diff, Math.abs(full.stems.baVox.L[i] - noHook.stems.baVox.L[i]));
  for (const name of ['baDrums', 'baPiano', 'baGlass', 'baSub']) for (let i = at(S); i < b; i++) other = Math.max(other, Math.abs(full.stems[name].L[i] - noHook.stems[name].L[i]));
  assert.ok(diff > 1e-3, 'the vox bus holds the whisper');
  assert.equal(other, 0);
});

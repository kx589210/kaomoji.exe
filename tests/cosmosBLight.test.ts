// Renderer B's light, type and finishing (src/shots/cosmosSolarKit.ts, cosmosSolarType.ts, cosmosGalaxyLook.ts) and what it draws with
// (its atlases' strings): the light grammar lands on this renderer's drums and levels only; the type reads the score's exponents and
// counts on their frames, with raised runs and only THREATS in the Defender's red; every character is in the cosmos's atlases; the look
// is the cosmos's (the power-up is the hot overlay's light); the sub-frames are never fewer than the score's, and the hot overlay samples
// the same shutter. Build sheet notes/bcos/sheet.md §4.7, §7, §8.2, §9.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COSMOS_ATLASES, COSMOS_FACES, DISPLAY_TEXTS } from '../src/content/cosmos.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { FLING, LAP, LEVELS, ORBIT_LAND, QUASAR, REVEAL, SLINGSHOT, SLOWMO, TILT, cosmosSegment, cs } from '../src/score/cosmos.ts';
import { cosmosLook, cosmosTemporal } from '../src/shots/cosmosKit.ts';
import * as G from '../src/shots/cosmosGalaxy.ts';
import { SPIRAL_BLOOM_RADIUS, bLook, bTemporal, hotSamples } from '../src/shots/cosmosGalaxyLook.ts';
import { cLook } from '../src/shots/cosmosWebPart.ts';
import * as S from '../src/shots/cosmosSolar.ts';
import * as K from '../src/shots/cosmosSolarKit.ts';
import * as T from '../src/shots/cosmosSolarType.ts';

const B = { from: cs(3), to: cs(5) };
const adv = { display: () => 0.6, mono: () => 0.6 };

test('the light grammar on bars 3–4: paste flares on the two level downbeats, shock rings on 3.2, 4.2 and 4.4, the Eames square on its four locks', () => {
  const flares = new Set<number>();
  const rings = new Map<number, string>();
  const eames = new Set<number>();
  for (let f = B.from; f < B.to; f++) {
    const p = K.pasteFlareAt(f);
    if (p) flares.add(p.at);
    const r = K.shockRingAt(f);
    if (r) rings.set(r.at, r.ink);
    const e = K.eamesAt(f);
    if (e) eames.add(e.at);
  }
  assert.deepEqual([...flares], [LEVELS.solar, LEVELS.galaxy]);
  assert.deepEqual([...rings], [[cs(3, 2), 'cyan'], [cs(4, 2), 'cyan'], [cs(4, 4), 'amber']]);
  assert.deepEqual([...eames], [LEVELS.solar, FLING.from, LEVELS.galaxy, REVEAL]);
  // The flare's starburst closes from Ø 900 in 12 f; the ring races out to 1,300 px in ≈ 10 f.
  assert.equal(K.pasteFlareAt(LEVELS.solar)!.d, 900);
  assert.equal(K.pasteFlareAt(LEVELS.solar + 12), null);
  assert.ok(K.shockRingAt(cs(3, 2) + 10)!.r > 1250);
  // Out on the clap's own frame (its first full step), nothing a frame before.
  assert.ok(K.shockRingAt(cs(4, 2) - 0.25)!.r > 100);
  assert.equal(K.shockRingAt(cs(4, 2) - 0.3), null);
  // The kick's pulse: ×1.35 for 2 f, back over 10 f; it lands whole on the kick's frame.
  assert.equal(K.pulseAt(cs(3, 2) - 0.49), 1.35);
  assert.equal(K.pulseAt(cs(3, 2) + 1.4), 1.35);
  assert.equal(K.pulseAt(cs(3, 2) + 12), 1);
});

test('the type: 10¹³ m on bar 3, rolling to 10²¹ through the fling; 10²¹ m on bar 4, rolling to 10²⁴ through the tilt; raised runs at 0.55 em', () => {
  assert.equal(T.exponentAt(LEVELS.solar), 13);
  assert.equal(T.exponentAt(FLING.from - 1), 13);
  assert.ok(T.exponentAt(FLING.from + 6) > 13 && T.exponentAt(FLING.from + 6) < 21);
  assert.equal(T.exponentAt(LEVELS.galaxy), 21);
  assert.ok(T.exponentAt(TILT.to - 3) > 23 && T.exponentAt(TILT.to - 3) < 24, 'still rolling 3 f before the cut');
  // BC1: the roll lands on a whole 24 two frames before the seam (the label never cuts mid-roll into C's vertical 10²⁴).
  assert.equal(T.exponentAt(TILT.to - 2), 24);
  assert.equal(T.exponentAt(TILT.to - 1), 24);
  const g = T.bTypeAt(LEVELS.solar + 10, adv).filter((x) => x.atlas === 'display');
  const big = Math.max(...g.map((x) => x.size));
  assert.ok(g.some((x) => Math.abs(x.size - big * T.RAISED.size) < 1e-6), 'the exponent is a raised run');
  assert.ok(g.every((x) => Math.abs(x.rot - Math.PI / 2) < 1e-9), 'bar 3’s label reads up the right edge');
  assert.ok(g.some((x) => x.x + 0.36 * x.size > 960), 'cropped by the right edge');
});

test('the counts slam on their frames — 4.2×10¹³ THREATS on 3.4, 9.9×10²⁰ THREATS on 4.4 — the number amber, only THREATS red', () => {
  const at = (f: number) => T.bTypeAt(f, adv).filter((x) => x.ink === 'red' || x.ink === 'amber');
  assert.equal(at(LAP.at - 1).length, 0);
  assert.ok(at(LAP.at).length > 0);
  assert.equal(at(FLING.from).length, 0);
  assert.ok(at(QUASAR.at).length > 0);
  assert.equal(at(QUASAR.at + 12).length, 0);
  for (const f of [LAP.at, QUASAR.at + 3]) {
    const red = T.bTypeAt(f, adv).filter((x) => x.ink === 'red').map((x) => x.ch).join('');
    assert.equal(red, 'THREATS');
  }
});

test('every character renderer B draws is in the cosmos’s atlases (its faces, its words, its type), never a superscript code point', () => {
  const has = (atlas: keyof typeof COSMOS_ATLASES, s: string) => [...s].every((c) => c.trim() === '' || COSMOS_ATLASES[atlas].chars.includes(c));
  // Faces and names are whole atlas entries: each is one of the cosmos's listed strings (check-glyphs tests those against the fonts).
  for (const face of K.B_FACES) assert.ok(COSMOS_FACES.includes(face), `face ${face}`);
  for (const word of K.B_WORDS) assert.ok(DISPLAY_TEXTS.includes(word), `word ${word}`);
  for (let f = B.from; f < B.to; f++) {
    for (const g of T.bTypeAt(f, adv)) assert.ok(has(g.atlas === 'display' ? 'display' : 'mono', g.ch), `${g.ch} on ${f}`);
  }
  for (const s of T.B_TYPE_TEXTS) assert.ok(!/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/u.test(s));
});

test('the finishing: the cosmos’s look (the neon power-up is light, not exposure: it is the hot overlay’s), the spiral’s bloom reaching less far; sub-frames never fewer than the score’s', () => {
  for (let f = B.from; f < B.to; f++) {
    // Round 2 (b-galaxy-ignition-white-milky): from the snap's first in-between frame the spiral keeps the bar's bloom (intensity, knee) at
    // a shorter reach, so its tubes glow tight and the ground between the arms stays the stage's.
    // E15 (BC1): as the tilt lands the look hands over to C's entry look, the one C's 5.1 prints the band with.
    const own = cosmosLook(f);
    if (f < REVEAL - 3) assert.deepEqual(bLook(f), own);
    else if (f < G.TILT_LAND - 4) assert.deepEqual(bLook(f), { ...own, bloom: { ...own.bloom, radius: SPIRAL_BLOOM_RADIUS } });
    else if (f >= G.TILT_LAND) assert.deepEqual(bLook(f), cLook(f));
    const t = bTemporal(f);
    assert.ok(t.samples >= cosmosTemporal(f).samples);
  }
  assert.equal(bTemporal(SLINGSHOT).shutter, 6, 'the slingshot keeps its 6-frame shutter');
  assert.equal(G.powerUpAt(REVEAL - 0.25), 1, 'the power-up whole on the reveal’s frame');
  assert.equal(G.powerUpAt(REVEAL + 8), 0, 'gone by + 8');
});
  assert.ok(SPIRAL_BLOOM_RADIUS < cosmosLook(REVEAL).bloom.radius && SPIRAL_BLOOM_RADIUS >= 0.35, 'tighter than the cosmos’s, still a glow');
  assert.equal(bLook(REVEAL).bloom.intensity, cosmosLook(REVEAL).bloom.intensity, 'the design’s intensity (0.85 → 1.0) kept');
  assert.equal(bLook(REVEAL).bloom.threshold, cosmosLook(REVEAL).bloom.threshold, 'and its knee');

test('the hot overlay samples the frame’s own shutter: one instant in a draft, ≤ the cap in a final, inside the shutter and the segment, weights summing to 1', () => {
  assert.deepEqual(hotSamples(SLINGSHOT, 'draft'), [{ frame: SLINGSHOT, weight: 1, cam: SLINGSHOT }]);
  for (const f of [B.from, SLINGSHOT, SLINGSHOT + 3, REVEAL - 2, QUASAR.at, TILT.to - 1]) {
    const all = temporalSamples(f, bTemporal(f), cosmosSegment(f));
    const s = hotSamples(f, 'final', 8);
    assert.ok(s.length >= 1 && s.length <= 8);
    assert.ok(Math.abs(s.reduce((a, x) => a + x.weight, 0) - 1) < 1e-9);
    const lo = Math.min(...all.map((x) => x.frame));
    const hi = Math.max(...all.map((x) => x.frame));
    for (const x of s) assert.ok(x.frame >= lo - 1e-9 && x.frame <= hi + 1e-9, `${f}: ${x.frame} inside the shutter`);
  }
  // The slingshot's 6-frame shutter is spread evenly (its first and last instants are near the shutter's ends).
  const s = hotSamples(SLINGSHOT, 'final', 8);
  assert.ok(s[s.length - 1].frame - s[0].frame > 4.5);
});

test('the slow-mo exit: the shutter closes from the whip’s 6 f to the house 0.5 f by the slow-mo, so the ribbons decompress into readable rings', () => {
  const sh = (f: number) => bTemporal(f).shutter;
  assert.equal(sh(SLINGSHOT), 6);
  assert.ok(sh(SLINGSHOT + 3) < 6 && sh(SLINGSHOT + 3) > 3, 'still long just past the peak');
  for (let f = SLINGSHOT; f < SLOWMO.from; f++) assert.ok(sh(f + 1) <= sh(f), `closing on ${f}`);
  for (let f = SLOWMO.from; f < LAP.at; f++) assert.equal(sh(f), 0.5, `crisp on ${f}`);
  assert.ok(bTemporal(SLOWMO.from).samples >= 16);
});

test('E11, the morph cut (prototype j4 solar()): on 3.1 each stamp starts where A’s drag trail left it, shrunk to min(90, 0.6 r); it glides onto its slot and fades (1 − u) by 3.1 + 6, keyed to whole output frames', () => {
  const trail = S.trailStamps();
  assert.equal(trail.length, 6);
  for (let k = 0; k < 6; k++) {
    const st = S.stampAt(k, ORBIT_LAND.at)!;
    assert.ok(Math.hypot(st.x - trail[k].x, st.y - trail[k].y) < 0.5, `stamp ${k} starts on A’s`);
    assert.ok(Math.abs(st.r - Math.min(90, 0.6 * trail[k].r)) < 1e-9, `stamp ${k} shrunk on the downbeat`);
    assert.equal(st.alpha, 1);
    // Every sub-frame of an output frame sees the same stamp (drawn once per output frame, outside the sum).
    assert.deepEqual(S.stampAt(k, ORBIT_LAND.at + 2.2), S.stampAt(k, ORBIT_LAND.at + 2));
    // The last frame of the glide: on its slot riding Earth's ring, nearly a ring tile, nearly gone.
    const out = ORBIT_LAND.settled - 1;
    const end = S.stampAt(k, out)!;
    const slot = S.project(S.solarCamera(out), S.slotPoint(k, out))!;
    assert.ok(Math.hypot(end.x - slot.x, end.y - slot.y) < 0.05 * Math.hypot(trail[k].x - slot.x, trail[k].y - slot.y) + 1, `stamp ${k} lands on its slot`);
    assert.ok(Math.abs(end.alpha - 1 / 6) < 1e-9);
  }
  assert.equal(S.stampAt(0, ORBIT_LAND.settled), null);
  assert.equal(S.stampAt(0, ORBIT_LAND.at - 0.6), null);
});

test('the slingshot burst (reserved) lands whole on the kick’s frame through the 6-frame shutter: an overlay keyed to output frames', () => {
  assert.equal(K.slingBurstAt(SLINGSHOT - 1), null, 'nothing on the frame before (the shutter would smear it in from 3.3 − 3)');
  const b = K.slingBurstAt(SLINGSHOT)!;
  assert.equal(b.a, 1);
  assert.ok(K.slingBurstAt(SLINGSHOT + 6)!.a < 0.5);
  assert.ok(K.slingBurstAt(SLINGSHOT + 3)!.reach > b.reach, 'the rays shoot out');
  assert.equal(K.slingBurstAt(SLINGSHOT + 16), null);
});

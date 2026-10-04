// Renderer C's second bar, cosmos 6 "EVENT HORIZON · 10²⁶ m → ∞" (src/shots/cosmosHole.ts, src/shots/cosmosWebLight.ts; build sheet
// notes/bcos/sheet.md §4.6, §6.5, §6.6): the twist and the tilt, the slow push, the disc's spin and drain within the photosensitivity
// caps, the suck, his ride to the photon ring, the Defender at his post, the approved stutter's slices (content, size, turn, tubes), the
// out hand-off's point, and the look and photography renderer C gives its frames.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HERO_FACES } from '../src/content/castCosmos.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import * as CS from '../src/score/cosmos.ts';
import { BAR_LOOK, cosmosLook, powerAt, stageAt } from '../src/shots/cosmosKit.ts';
import * as H from '../src/shots/cosmosHole.ts';
import { ENTRY, cLook, cTemporal, neonAt, webHdrAt, WEB_HDR } from '../src/shots/cosmosWebPart.ts';
import { holeLights } from '../src/shots/cosmosWebLight.ts';

const { HORIZON, STUTTER, POINT, COSMOS } = CS;
const deg = (r: number) => (r * 180) / Math.PI;

test('the twist (E18): the web winds into the spiral as the camera tilts 55° over the plane (L, ≤ 3 % over), the disc fading in as the web’s last frame fades out', () => {
  assert.equal(H.twistAt(HORIZON.at - 1), 0);
  assert.equal(H.tiltAt(HORIZON.at), 0, 'face-on on its first instant: the disc frame equals the web’s (MAD rule at δ = 0)');
  assert.ok(Math.abs(deg(H.tiltAt(HORIZON.at + 3)) / 55 - 0.75) < 0.1, '75 % of the tilt by +3 f');
  assert.ok(Math.abs(deg(H.tiltAt(HORIZON.twisted + 6)) - 55) < 0.2, 'settled at 55°');
  for (let f = HORIZON.at; f < HORIZON.at + 30; f++) assert.ok(deg(H.tiltAt(f)) <= 55 * 1.031);
  const p0 = H.holePicture(HORIZON.at);
  assert.ok(p0.snapshot.alpha > 0.99 && p0.disc.vis < 0.01, 'on 6.1 the picture is the web’s');
  const p1 = H.holePicture(HORIZON.twisted + 6);
  assert.ok(p1.snapshot.alpha < 0.01 && p1.disc.vis > 0.99, 'by the twist’s settle it is the disc’s');
  const s = H.projectDisc({ tilt: 0, zoom: 1, turn: 0 }, 300, -200);
  assert.deepEqual([s.x, s.y], [300, -200], 'face-on, the disc plane maps 1 : 1 to the screen (the web’s frame lands where it was)');
});

test('the camera: the slow push 1.00 → 1.12 by 6.2& + 11 with a surge on every kick, then locked; under the stutter each slice steps the picture down and turns it −30°', () => {
  assert.ok(Math.abs(H.pushAt(CS.cs(6, 3) - 1) / (1 + 0.025 * H.kickPulse(CS.cs(6, 3) - 1)) - 1.12) < 1e-9);
  assert.ok(H.pushAt(HORIZON.at + 12) < H.pushAt(HORIZON.at + 36));
  for (const k of CS.KICKS.filter((k) => k >= HORIZON.at && k < STUTTER.from)) assert.ok(H.pushAt(k + 1) > H.pushAt(k - 1) - 1e-9 || H.kickPulse(k + 1) === 1, `${k}: the kick surges`);
  const radii = CS.STUTTER_SLICES.map((s) => (s.r === 'point' ? 0 : s.r));
  CS.STUTTER_SLICES.forEach((s, i) => {
    const cam = H.holeCam(s.at);
    assert.ok(Math.abs(cam.zoom - H.pushAt(H.contentAt(s.at)) * (radii[i] / H.HOLE.shrinkTo)) < 1e-9, `slice ${i}: disc r ${s.r}`);
    assert.ok(Math.abs(deg(cam.turn) - s.turn) < 1e-9, `slice ${i}: turned ${s.turn}°`);
  });
});

test('the disc turns within the caps: Kepler, ≤ 0.75 turn/s for r ≥ 200 px (photosensitivity); the drain pulls a band inward a beat (×1.6 on the kicks), ×3 from the suck; the suck shrinks it to r 640 by the stutter', () => {
  assert.ok(Math.abs((H.omega(200) * 60) / (2 * Math.PI) - 0.75) < 1e-6);
  for (let r = 200; r < 2200; r += 10) assert.ok((H.omega(r) * 60) / (2 * Math.PI) <= 0.75 + 1e-9);
  for (let r = 60; r < 2000; r += 10) assert.ok(H.omega(r + 10) <= H.omega(r), 'the inside turns faster');
  let prev = -1;
  for (let f = HORIZON.at; f < COSMOS.to; f++) {
    assert.ok(H.drainAt(f) >= prev);
    prev = H.drainAt(f);
  }
  const beat = H.drainAt(HORIZON.at + 24) - H.drainAt(HORIZON.at);
  assert.ok(beat > 0.2 && beat < 0.24, `about a band (0.2) a beat with the kick’s surge (${beat.toFixed(3)})`);
  const sucked = H.drainAt(CS.SANDBOX + 24) - H.drainAt(CS.SANDBOX);
  assert.ok(sucked > 2.9 * 0.2, `×3 from the suck (${sucked.toFixed(3)})`);
  assert.equal(H.routAt(CS.SANDBOX - 1), H.HOLE.rout);
  assert.equal(H.routAt(STUTTER.from), 640);
  assert.ok(H.HOLE.rout * Math.cos((55 * Math.PI) / 180) > 1080, 'until the suck the disc reaches beyond every corner');
});

test('his ride: from where his node was on 5.4a (≈ (−300, +420) face-on) inward to the photon ring by the stutter, carried round clockwise, (>ω<) on the bar’s top note; the Defender rises to his post and is gone from slice 3', () => {
  const r0 = H.heroRide(HORIZON.at);
  const p0 = H.projectDisc({ tilt: 0, zoom: 1, turn: 0 }, r0.r * Math.cos(r0.theta), r0.r * Math.sin(r0.theta));
  assert.ok(Math.hypot(p0.x + 300, p0.y - 420) < 2, 'he starts where his node was');
  const r1 = H.heroRide(STUTTER.from - 1);
  assert.ok(r1.r < H.HOLE.photon * 1.4, `he reaches the photon ring (${r1.r.toFixed(0)})`);
  assert.ok(H.heroRide(HORIZON.at + 24).theta < r0.theta, 'carried clockwise with the disc');
  assert.equal(H.heroRide(H.HOOK_TOP_B).face, HERO_FACES.top);
  assert.equal(H.heroRide(H.HOOK_TOP_B - 1).face, HERO_FACES.face);
  assert.ok(Math.abs(H.defenderPost(HORIZON.twisted + 12).y - H.HOLE.post) < 3, 'the operator at his post over the arch');
  assert.equal(H.defenderPost(CS.STUTTER_SLICES[3].at).alpha, 0, 'gone at r 60');
  assert.equal(H.defenderPost(CS.STUTTER_SLICES[2].at).alpha, 1);
});

test('the approved stutter: every slice shows its content frame exactly (the repeats are the same picture), structure as tubes from the second slice, the stardust gone by the last slice before the point', () => {
  for (let f = STUTTER.from; f < COSMOS.to; f++) assert.equal(H.contentAt(f), CS.stutterFrame(f));
  const S = STUTTER.from;
  const a = H.holePicture(S + 2);
  const b = H.holePicture(S + 8);
  assert.equal(a.cf, b.cf, 'slice 2 replays slice 1’s content');
  assert.deepEqual([a.disc.t, a.disc.drain, a.disc.rout], [b.disc.t, b.disc.drain, b.disc.rout]);
  assert.notEqual(a.cam.zoom, b.cam.zoom, '…one hard step smaller');
  assert.equal(H.holePicture(S).disc.tubes, false);
  for (const s of CS.STUTTER_SLICES.slice(1)) assert.equal(H.holePicture(s.at).disc.tubes, true);
  assert.equal(H.dustAt(POINT.from - 1).length, 0, 'stardust gone by the last slice before the point');
  assert.ok(H.dustAt(CS.SANDBOX + 12).length > 0, 'the VOID corners carry a little stardust after the suck');
  assert.equal(H.dustAt(CS.SANDBOX - 1).length, 0);
  for (let f = STUTTER.from; f < COSMOS.to; f++) assert.equal(cTemporal(f).samples, 1, `${f}: a hard step, no shutter crosses a slice`);
});

test('the out hand-off (sheet §6.5): the last three frames are VOID and one point at the centre — no disc, no hero, no Defender, no lights, the print off (pure #07060C), no grain, no vignette, full neon bloom', () => {
  for (let f = POINT.from; f < COSMOS.to; f++) {
    const p = H.holePicture(f);
    assert.deepEqual([p.point, p.disc.vis, p.arch, p.snapshot.alpha, p.hero, p.defender, p.dust.length, p.rim], [true, 0, 0, 0, null, null, 0, 0]);
    const look = cLook(f);
    assert.deepEqual([look.riso!.amount, look.grain, look.vignette, look.aberration], [0, 0, 0, 0]);
    assert.equal(powerAt(f), 1);
    assert.ok(look.bloom.intensity > 0 && look.bloom.threshold === BAR_LOOK[5].threshold);
  }
  assert.deepEqual({ ...H.POINT_DOT }, { core: 4, amber: 9, glow: 30 });
  assert.equal(H.isPoint(POINT.from - 1), false);
});

test('renderer C’s look: the kit’s night print with the power dial, the neon burning hotter through the two bars (no flash: the print caps it), the print’s exposure lowered so the void stays void', () => {
  // The match cut (E15) comes in on cosmos 4.4's stage (levels, HDR carry) and is C's own night by 5.1e.
  const st = stageAt(CS.MATCH - 1);
  const m = cLook(CS.MATCH);
  assert.deepEqual([m.riso!.levels?.amount ?? 0, m.riso!.hdr ?? 0], [st.levels ? (st.levels.amount ?? 1) : 0, st.hdr ?? 0], 'on 5.1, 4.4’s stage');
  assert.equal(cLook(CS.MATCH + ENTRY).riso!.levels, undefined, 'C’s own night by 5.1e');
  for (const f of [CS.MATCH + ENTRY, CS.WALL, HORIZON.at, CS.SANDBOX, STUTTER.from + 3]) {
    const look = cLook(f);
    const base = cosmosLook(f);
    assert.equal(look.riso!.power, base.riso!.power);
    assert.equal(look.riso!.night, 1);
    assert.ok(look.riso!.exposure! < 1.25 && look.riso!.gamma! > 1.2);
    assert.ok(look.bloom.intensity <= base.bloom.intensity);
    assert.equal(look.flash ?? 0, 0);
  }
  for (let f = CS.MATCH + 1; f < POINT.from; f++) {
    assert.ok(neonAt(f).strokes >= neonAt(f - 1).strokes, `${f}: the tubes only get hotter`);
  }
  assert.ok(neonAt(POINT.from - 4).strokes > neonAt(CS.MATCH).strokes);
  // The web's HDR carry: full from the first hop to the scan (the arcs' white-hot cores), none under the scan's blackout or on the horizon.
  assert.equal(webHdrAt(CS.HOPS[0]), WEB_HDR);
  assert.equal(webHdrAt(CS.SCAN.from - 1), WEB_HDR);
  for (let f = CS.SCAN.from + 6; f < COSMOS.to; f++) assert.equal(webHdrAt(f), 0, `${f}`);
  assert.equal(cLook(CS.WINK).riso!.hdr ?? 0, cosmosLook(CS.WINK).riso!.hdr ?? 0, 'the relight prints as the horizon does');
});

test('the photography: the score’s sub-frames (64 over the twist, never across a stutter slice), the rack raised to 48; lights only where the score puts them (the flare and the Eames square on 6.1, spaghetti on the kicks, the crackles on the slices)', () => {
  for (let f = CS.WINK; f < HORIZON.twisted; f++) assert.equal(cTemporal(f).samples, 64);
  for (const s of CS.STUTTER_SLICES) {
    const seg = CS.cosmosSegment(s.at);
    assert.equal(seg.from, s.at);
    for (const x of temporalSamples(s.at, cTemporal(s.at), seg)) assert.ok(x.frame >= s.at);
  }
  const lights = (f: number) => holeLights(f, H.holePicture(f));
  assert.ok(lights(HORIZON.at + 2).shapes.length > 10, 'the paste flare and the Eames square on 6.1');
  assert.ok(lights(CS.INFINITY + 2).shapes.length > lights(CS.INFINITY + 14).shapes.length, 'the spaghetti on the 6.2 kick');
  assert.equal(lights(POINT.from).shapes.length, 0, 'nothing on the point');
});

// Continuity plan v07 §2.3 (WP1): the club pre-lapped into the stutter — pure data, drawn once the hook-up in
// output/qa/v07/WP1/cosmos-hookup.patch is applied (src/scenes/cosmosCHole.ts, src/shots/cosmosWebLight.ts).
test('the stutter grows the club’s Ben-Day rings: one more concentric ring of dots on each 3-frame cell (+12, +15, +18), accumulating, never blinking, held through the point', () => {
  const S = CS.STUTTER.from;
  assert.deepEqual([...H.STUTTER_RINGS.at], [S + 12, S + 15, S + 18], 'the cells of STUTTER_SLICES from the third');
  assert.deepEqual(CS.STUTTER_SLICES.slice(2, 5).map((s) => s.at), [...H.STUTTER_RINGS.at], 'STUTTER_SLICES unchanged');
  const rings = (f: number) => new Set(H.stutterRingDots(f).map((d) => Math.round(Math.hypot(d.x, d.y) / 50)));
  assert.equal(H.stutterRingDots(S + 11).length, 0, 'none before the first cell');
  let last = 0;
  for (let f = S + 12; f < CS.STUTTER.to; f++) {
    const n = H.stutterRingDots(f).length;
    assert.ok(n >= last, `${f}: rings only accumulate (${n} dots)`);
    last = n;
  }
  assert.ok(rings(S + 12).size < rings(S + 15).size && rings(S + 15).size < rings(S + 18).size, 'a ring a cell');
  assert.ok(H.stutterRingDots(CS.POINT.from + 2).length === H.stutterRingDots(S + 20).length, 'held through the point');
  assert.equal(H.stutterRingDots(CS.STUTTER.to).length, 0, 'the club draws its own from club 1.1');
  for (const d of H.stutterRingDots(S + 19)) assert.ok(Math.hypot(d.x, d.y) < 540 && d.d > 6, 'on screen, dots ≥ 6 px');
});

test('the point as the club’s eye (2109–2111): the amber dot grows toward the eye of club 1.1, keylined, its glow in halftone dots', () => {
  const eyes = [0, 1, 2].map((k) => H.pointEye(CS.POINT.from + k));
  assert.ok(eyes[0].r === H.POINT_DOT.amber && eyes[1].r > eyes[0].r && eyes[2].r > eyes[1].r, 'r 9 → 13 → 17');
  for (const e of eyes) {
    assert.ok(e.keyline >= 2 && e.glow.length > 10, 'a keyline and a halftone glow');
    for (const g of e.glow) assert.ok(Math.hypot(g.x, g.y) > e.r + e.keyline, 'the glow outside the keyline');
  }
});

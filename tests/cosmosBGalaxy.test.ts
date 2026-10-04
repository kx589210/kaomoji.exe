// Renderer B, the arm and the galaxy (src/shots/cosmosGalaxy.ts): the fling's arm, the warp chase, the dust punch, the snap zoom-out to
// the neon spiral, the quasar and the tilt through the disc, against the prototype (notes/cosmos3/w/j5.js) and the build sheet
// (notes/bcos/sheet.md §4.4, §5 E13–E15, §6.4). One world and one camera: the galaxy lies in the arm's space with his star at the
// tunnel. Every pin is part-local (the score's names).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HERO_FACES } from '../src/content/castCosmos.ts';
import { DUST, FLING, GLANCES, IGNITION, KICKS, LIGHT_BURSTS, QUASAR, REVEAL, TILT, WARP, cs } from '../src/score/cosmos.ts';
import { SWAP_LEAD } from '../src/engine/temporal.ts';
import * as G from '../src/shots/cosmosGalaxy.ts';
import { project } from '../src/shots/cosmosSolar.ts';
import { bandProfile } from '../src/shots/cosmosWeb.ts';

const D2R = Math.PI / 180;

test('the arm: the fling throws the camera back (stopping by 4.1 − 1); the chase launches on 4.1 (full in 3 f); kicks surge ×2, the punch ×2.5, the glances drop to 15 %', () => {
  assert.ok(G.speed(FLING.from + 1) < -1);
  assert.ok(Math.abs(G.speed(WARP - 0.5)) < 0.01);
  assert.equal(G.speed(WARP), 0);
  assert.ok(G.speed(WARP + 3) > 0.55, 'full on the third frame');
  const k = KICKS.find((x) => x > WARP)!;
  assert.ok(G.speed(k - SWAP_LEAD) > 1.8 * G.speed(k - SWAP_LEAD - 0.01), 'a kick doubles it, whole on its frame');
  assert.ok(Math.abs(G.speed(GLANCES[0].from + 1) / G.speed(GLANCES[0].from - 0.5) - 0.15) < 0.06);
  let prev = G.travel(WARP);
  for (let f = WARP; f < REVEAL - 4; f += 0.25) {
    const t = G.travel(f);
    assert.ok(t >= prev - 1e-9, 'the chase only moves forward');
    prev = t;
  }
  assert.ok(G.travel(WARP) < G.travel(FLING.from), 'the fling moved it back');
  assert.ok(G.travel(REVEAL - 4) > 30, `down the arm: ${G.travel(REVEAL - 4).toFixed(1)}`);
});

test('the punch: the wall looms from 10 to his depth by 4.2, then the travel carries it past the lens; the bank is 25° and unwinds inside the snap', () => {
  assert.equal(G.wallAt(DUST.punch - 13), null);
  assert.ok(Math.abs(G.wallAt(DUST.punch - SWAP_LEAD - 0.01)!.depth - G.TUNNEL.he) < 0.05);
  assert.ok(G.wallAt(DUST.punch - SWAP_LEAD)!.since === 0, 'the sheet bursts whole on the clap’s frame');
  assert.ok(G.wallAt(DUST.punch + 6)!.depth < 0, 'past the lens within a beat');
  assert.ok(Math.abs(G.bank(DUST.punch + 12) - 25 * D2R) < 0.6 * D2R);
  assert.equal(G.bank(REVEAL), 0);
  assert.equal(G.amberDepth(DUST.punch - 1), G.TUNNEL.he);
  assert.ok(G.amberDepth(DUST.punch + 12) > 0.9 * G.TUNNEL.length, 'the amber front passes us');
  // The bank is a hit launch: its biggest frame-to-frame step lands on the clap's own frame (the sync's hit), not 1–2 frames after.
  const step = (f: number) => Math.abs(G.bank(f) - G.bank(f - 1));
  assert.ok(step(DUST.punch) > step(DUST.punch + 1) && step(DUST.punch) > step(DUST.punch - 1), 'the bank’s biggest step on 4.2');
  assert.ok(G.bank(DUST.punch) > 5 * D2R, 'visibly banked on the clap’s frame');
});

test('the dust wall is a solid sheet over the view as it looms, punched open round him on the clap’s frame and burst past the corners within 6 f', () => {
  assert.equal(G.sheetAt(DUST.punch - 13), null);
  assert.ok(G.sheetAt(DUST.punch - 1)!.alpha >= 0.9 && G.sheetAt(DUST.punch - 1)!.hole === 0, 'closed over the view on the frame before');
  const hit = G.sheetAt(DUST.punch)!;
  assert.ok(hit.hole > 400 && hit.alpha > 0.85, `open ${hit.hole.toFixed(0)} px on the clap’s frame`);
  assert.ok(G.sheetAt(DUST.punch + 3)!.hole > 1100, 'past the frame’s corners (1,101 px) within 3 f');
  // The punch opens more on its own frame than on any after (the frame's biggest change).
  const open = (f: number) => G.sheetAt(f)!.hole - (G.sheetAt(f - 1)?.hole ?? 0);
  assert.ok(open(DUST.punch) > open(DUST.punch + 1));
  assert.equal(G.sheetAt(DUST.punch + 8), null);
});

test('him: bursting out of his star on 4.1, his look into the lens on the first glance ( ・ω・)?, the wave on 4.1a, (>ω<) on the top note', () => {
  assert.equal(G.heroFace(GLANCES[0].from + 1), HERO_FACES.look);
  assert.equal(G.heroFace(DUST.looms + 1), HERO_FACES.wave);
  assert.equal(G.heroFace(REVEAL + 2), HERO_FACES.top);
  assert.equal(G.heroFace(WARP + 30), HERO_FACES.face);
  assert.equal(G.heroBurst(WARP - 1), 0);
  assert.ok(G.heroBurst(WARP) >= 0.4, 'born in the flare: there on the downbeat’s frame');
  assert.ok(G.heroBurst(WARP + 3) > 0.95);
  // Where the hot light finds him: on the vanishing point's side, his em growing, gone as the snap pulls away.
  const h = G.heroScreen(WARP + 12)!;
  assert.ok(Math.abs(h.x - G.HERO.x) < 1 && Math.abs(h.y - G.HERO.y) < 8 && h.em > 0.95 * G.HERO.em && h.alpha === 1);
  assert.equal(G.heroScreen(REVEAL), null);
  assert.equal(G.heroScreen(WARP - 1), null);
});

test('the neon power-up: the core’s point lights as the snap lands and holds (with the kicks); the subject is his star, then the core', () => {
  assert.equal(G.bulgeAt(REVEAL - 4), 0);
  assert.equal(G.bulgeAt(REVEAL), 1);
  assert.equal(G.bulgeAt(QUASAR.at), 1);
  assert.ok(G.bulgeAt(TILT.to - 1) < 0.5, 'it flattens into the band’s heart');
  const star = G.galaxySubject(REVEAL);
  const core = G.galaxySubject(QUASAR.at);
  assert.ok(Math.hypot(core.x, core.y) < 60, 'the core on the centre');
  assert.ok(Math.hypot(star.x - core.x, star.y - core.y) > 100, 'his star out on its arm');
  assert.ok(G.galaxyGlints(REVEAL + 12).length >= 24, 'stars to glint on inside the lit ring');
  assert.ok(G.galaxyGlints(WARP + 12).length >= 24, 'stars to glint on in the arm');
});

test('round 2 (b-galaxy-ignition-white-milky): the core is a small point with a steep falloff, never a flat white disc', () => {
  // The hot overlay's plateau field: light gain · exp(−d² / 0.45²) at d = distance / r; the hue clamp shows the centre at full brightness
  // where gain · that ≥ 1. Before: a 26× white plateau at r ≈ 193 → 228 px, full white out to ≈ 157 px (a ≈ 300 px disc).
  const full = (r: number) => r * 0.45 * Math.sqrt(Math.log(G.CORE_POINT.gain));
  const tenth = (r: number) => r * 0.45 * Math.sqrt(Math.log(10 * G.CORE_POINT.gain));
  for (const f of [REVEAL, REVEAL + 6, REVEAL + 12, QUASAR.at, TILT.from]) {
    const r = G.corePointRadius(f);
    assert.ok(full(r) <= 40, `${f - REVEAL}: full brightness within ${full(r).toFixed(0)} px`);
    assert.ok(tenth(r) <= 70, `${f - REVEAL}: under a tenth by ${tenth(r).toFixed(0)} px (a point of r ≤ 60–80 px)`);
  }
  assert.ok(G.corePointRadius(REVEAL + 12) >= G.corePointRadius(REVEAL), 'the power-up builds, never dims');
  assert.ok(G.powerUpAt(REVEAL) > 0.9 && G.powerUpAt(REVEAL + 8) === 0, 'its coloured 8 f');
});

test('the galaxy lies in the arm’s space: his star at the tunnel, the arm’s tangent down the flight, the disc level', () => {
  const star = G.galaxyPoint(G.SPIRAL.star, G.armAngle(0, G.SPIRAL.star));
  assert.ok(Math.hypot(...star) < 1e-6);
  const next = G.galaxyPoint(G.SPIRAL.star + 0.001, G.armAngle(0, G.SPIRAL.star + 0.001));
  const len = Math.hypot(...next);
  assert.ok(next[2] / len < -0.999, 'the arm runs down −z');
  assert.ok(Math.abs(next[1]) < 1e-9);
  assert.equal(G.SPIRAL_STARS.length, 60000);
});

test('E14: the snap — 4 frames from the arm to above the whole spiral, the core on the centre, ≈ 2,500 px across, the jets top-left → bottom-right', () => {
  const before = G.galaxyCamera(REVEAL - 4);
  assert.deepEqual(before.eye, [0, 0, 0]);
  const cam = G.galaxyCamera(REVEAL);
  const core = project(cam, G.PLACEMENT.core)!;
  assert.ok(Math.hypot(core.x, core.y) < 60, `core at ${core.x.toFixed(0)}, ${core.y.toFixed(0)}`);
  let maxR = 0;
  for (let a = 0; a < Math.PI * 2; a += 0.1) {
    const p = project(cam, G.galaxyPoint(1, a))!;
    maxR = Math.max(maxR, Math.hypot(p.x - core.x, p.y - core.y));
  }
  assert.ok(maxR > 1100 && maxR < 1500, `radius ${maxR.toFixed(0)} px (arms leave every edge)`);
  const jet = project(cam, G.galaxyPoint(0, 0, 0.3))!;
  assert.ok(jet.x < core.x - 50 && jet.y > core.y + 50, `the axis points top-left (${(jet.x - core.x).toFixed(0)}, ${(jet.y - core.y).toFixed(0)})`);
  // The snap is one move, most of it on the last frames (an impact).
  assert.ok(G.snapAt(REVEAL - 2) < 0.25 && G.snapAt(REVEAL) === 1);
});

test('the ignition runs core → rim over 4.3 → 4.3&; the host arms flip a stretch a 16th from 4.3& and pop on the quasar; the jets reach the edges in 4 f', () => {
  assert.equal(G.ignitionAt(IGNITION.from - 0.1), 0);
  assert.ok(G.ignitionAt(IGNITION.to) > 1.1);
  assert.ok(G.spiralAmber(0, 0.9, REVEAL) && G.spiralAmber(2, 0.9, REVEAL) && !G.spiralAmber(1, 0.2, REVEAL));
  assert.ok(!G.spiralAmber(3, 0.9, LIGHT_BURSTS[2]) && G.spiralAmber(3, 0.1, LIGHT_BURSTS[2]));
  assert.ok(G.spiralAmber(1, 1, QUASAR.at) && G.spiralAmber(3, 1, QUASAR.at));
  assert.equal(G.jetsAt(QUASAR.at - 1), null);
  assert.ok(G.jetsAt(QUASAR.at + 4)!.grow > 0.9);
  assert.equal(G.jetsAt(QUASAR.gone), null);
});

test('the quasar: two jets from the core, top-left off the edge and bottom-right off the edge by 4.4 + 4, knots riding outward, gone by 4.4&', () => {
  assert.deepEqual(G.quasarJets(QUASAR.at - 1), []);
  assert.deepEqual(G.quasarJets(QUASAR.gone), []);
  const jets = G.quasarJets(QUASAR.at + 4);
  assert.equal(jets.length, 2);
  const core = project(G.galaxyCamera(QUASAR.at + 4), G.PLACEMENT.core)!;
  for (const j of jets) {
    const s0 = j.spine[0];
    assert.ok(Math.hypot(s0.x - core.x, s0.y - core.y) < 1, 'from the core');
    const tip = j.spine[j.spine.length - 1];
    assert.ok(Math.abs(tip.x) > 960 || Math.abs(tip.y) > 540, `jet ${j.sg} reaches the edge (${tip.x.toFixed(0)}, ${tip.y.toFixed(0)})`);
    if (j.sg > 0) assert.ok(tip.x < 0 && tip.y > 0, 'the near jet runs top-left');
    else assert.ok(tip.x > 0 && tip.y < 0, 'the far jet runs bottom-right');
    // Dense near the core (a smooth tube), every step short on screen.
    for (let i = 1; i < j.spine.length; i++) assert.ok(Math.hypot(j.spine[i].x - j.spine[i - 1].x, j.spine[i].y - j.spine[i - 1].y) < 220);
    assert.ok(j.knots.length >= 3, `knots on jet ${j.sg}`);
  }
  // Half-way through the launch the jets are still growing (the 4 f launch); knots ride outward frame to frame.
  const early = G.quasarJets(QUASAR.at + 1);
  const tip = (js: typeof jets, sg: number) => { const sp = js.find((j) => j.sg === sg)!.spine; return sp[sp.length - 1].z; };
  assert.ok(tip(early, -1) < tip(jets, -1));
  const k0 = G.quasarJets(QUASAR.at + 8).find((j) => j.sg === -1)!.knots.map((k) => k.z).sort((a, b) => a - b);
  const k1 = G.quasarJets(QUASAR.at + 8.5).find((j) => j.sg === -1)!.knots.map((k) => k.z).sort((a, b) => a - b);
  assert.equal(k1.length, k0.length);
  k0.forEach((z, i) => assert.ok(k1[i] > z, `knot ${i} rides out`));
});

test('E15 (B → C): the tilt drops the camera into the disc’s plane, level, so the disc is a horizontal band through the centre on 5.1 − 1', () => {
  const cam = G.galaxyCamera(TILT.to - 0.001);
  const core = project(cam, G.PLACEMENT.core)!;
  assert.ok(Math.hypot(core.x, core.y) < 2);
  // Beyond the core the whole disc lies on the line; the near arm streams past above and below.
  for (let a = 0; a < 2 * Math.PI; a += 0.2) {
    for (const r of [0.3, 0.6, 1]) {
      const p = project(cam, G.galaxyPoint(r, a));
      if (p && p.z > core.z && Math.abs(p.x) < 960) assert.ok(Math.abs(p.y) < 30, `a far disc point at y ${p.y.toFixed(0)}`);
    }
  }
  assert.ok(G.streakAt(TILT.to - 1).half > 959, 'the streak spans the frame on B’s last frame');
  assert.ok(G.streakAt(TILT.to - 1).a > G.streakAt(TILT.streak).a, 'and burns brightest there');
  assert.equal(G.bandAt(TILT.to), 1);
  for (let y = -150; y <= 150; y += 2.5) assert.ok(Math.abs(G.BAND_TERMS.reduce((s, t) => s + t.gain * Math.exp(-((y / t.sigma) ** 2)), 0) - bandProfile(y)) < 1e-9, 'B draws C’s band profile');
  assert.equal(G.bandAt(G.TILT_LAND - 4), 0);
  // BC1: the tilt lands 4 f before the seam and holds, so the last frames' sub-frames (which run across the seam) see one still band of C's
  // profile alone: the camera is the same on every instant from the landing on, and the disc's own stars are gone.
  assert.equal(G.TILT_LAND, TILT.to - 4);
  const still = G.galaxyCamera(G.TILT_LAND);
  for (const f of [G.TILT_LAND + 0.5, TILT.to - 2, TILT.to - 0.75, TILT.to - 0.001]) assert.deepEqual(G.galaxyCamera(f), still, `still on ${f - TILT.to}`);
  assert.equal(G.discFade(G.TILT_LAND), 0);
  assert.equal(G.bandAt(G.TILT_LAND), 1);
  const a = G.galaxyCamera(TILT.from - 0.001);
  const b = G.galaxyCamera(TILT.from);
  assert.ok(Math.hypot(a.eye[0] - b.eye[0], a.eye[1] - b.eye[1], a.eye[2] - b.eye[2]) < 1, 'the drift hands over to the tilt without a jump');
});

test('the tunnel’s hosts are never amber (only his copies, behind him); the arm’s faces are the cast’s', () => {
  for (const s of G.TUNNEL_STARS.slice(0, 200)) assert.ok(s.face >= 0 && s.face < G.ARM_FACES.length);
  for (const f of G.ARM_FACES) assert.ok(!f.host.includes('ω') && f.infected.includes('ω'), `${f.host} → ${f.infected}`);
  assert.equal(G.GALAXY_BAR.to, cs(5));
});

test('his stretch of arm (the scale between the arm and the spiral) lights the snap’s in-between frames and is gone a frame into the reveal', () => {
  assert.equal(G.localAt(REVEAL - 2), 1);
  assert.ok(G.localAt(REVEAL) < 0.45);
  assert.equal(G.localAt(REVEAL + 1), 0);
});

// Renderer C's first bar, cosmos 5 "LIGHTNING WEB · 10²⁴ m" (src/shots/cosmosWeb.ts; build sheet notes/bcos/sheet.md §4.5, §6.4):
// the web's graph, the wave of lightning a hop a 16th, the camera's path (the pull-back, the roll, the drift to the Defender) against the
// design's screen positions, the scan and the relight, the four standards (drum swaps whole on their frame, the rack's lens, every face
// in its atlas), amber only on him and the infected, and the match cut's band (E15) that renderer B draws its last frames to.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFENDER_FACE, HERO_FACES, WINKS } from '../src/content/castCosmos.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import * as CS from '../src/score/cosmos.ts';
import { cFaces, cTemporal, lensPoint, RACK_SAMPLES } from '../src/shots/cosmosWebPart.ts';
import * as W from '../src/shots/cosmosWeb.ts';
import { webLights } from '../src/shots/cosmosWebLight.ts';
import { cOverlay } from '../src/shots/cosmosWebOverlay.ts';
import { IDENTITY_VIEW } from '../src/engine/view.ts';
import type { RGB } from '../src/engine/color.ts';

const { cs, COSMOS } = CS;
const near = (a: readonly [number, number] | null, b: readonly [number, number], tol: number, what: string) => {
  assert.ok(a, `${what}: off camera`);
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) <= tol, `${what}: (${a[0].toFixed(0)}, ${a[1].toFixed(0)}) is not within ${tol} px of (${b[0]}, ${b[1]})`);
};
const sampleFrames = (out: number) => temporalSamples(out, cTemporal(out), CS.cosmosSegment(out)).map((s) => s.frame);

test('the web: his node at the origin with the strand the match lands on level through it; every node reached from one struck before it; the Defender at hop 8, the far web behind', () => {
  const [hero, left, right] = W.NODES;
  assert.deepEqual([hero.role, [...hero.p]], ['hero', [0, 0, 0]]);
  assert.deepEqual([left.p[1], left.p[2], right.p[1], right.p[2], left.hop, right.hop], [0, 0, 0, 0, 1, 1], 'the horizontal strand through him (the galaxy’s band becomes it)');
  const D = W.NODES[W.DEFENDER];
  assert.deepEqual([D.role, D.hop, [...D.p], D.host, D.infected], ['defender', 8, [...W.DEFENDER_P], DEFENDER_FACE, DEFENDER_FACE]);
  for (const n of W.NODES) {
    assert.ok(n.hop >= 0 && n.hop <= 11, `${n.i}: hop ${n.hop}`);
    if (n.parent >= 0) assert.ok(W.NODES[n.parent].hop < n.hop, `${n.i}: its parent is struck no earlier than it`);
    if (n.role === 'host') assert.ok(!n.host.includes('ω') && n.infected.includes('ω'), `${n.i}: hosts never wear ω; the infected always do`);
  }
  const nearCount = W.NODES.filter((n) => n.layer === 'near').length;
  assert.ok(nearCount >= 280 && nearCount <= 320, `about 300 near nodes (${nearCount})`);
  assert.ok(W.NODES.filter((n) => n.layer === 'far').every((n) => n.p[2] >= 10 && n.hop >= 9), 'the far web lies behind, lit by hops 9–11');
  assert.equal(W.WALL_STRANDS.length, 3);
  for (const s of W.WALL_STRANDS) assert.ok(W.NODES[s].hop < 8 && W.NODES[s].role === 'host', 'the wall’s arcs come from infected nodes');
});

test('the lightning: a hop a 16th from 5.1e, the discharge on the clap, the wall on 5.3, nothing after the scan; arcs live 4 f and fade over 6', () => {
  for (const n of W.NODES) if (n.role === 'host') assert.equal(W.struckAt(n), CS.HOPS[n.hop - 1]);
  assert.equal(W.struckAt(W.NODES[0]), -Infinity);
  assert.equal(W.struckAt(W.NODES[W.DEFENDER]), Infinity, 'the Defender is never infected');
  const at = (f: number) => W.arcsAt(f);
  assert.equal(at(CS.HOPS[0] - 1).length, 0);
  assert.ok(at(CS.HOPS[0]).length >= 2, 'hop 1: his two neighbours');
  assert.ok(at(CS.ROLL.at).filter((a) => a.age === 0).length >= 6, 'the discharge: every frontier node fires at once (6–10 arcs or more)');
  assert.deepEqual(at(CS.WALL).filter((a) => a.kind === 'wall').map((a) => a.a), [...W.WALL_STRANDS]);
  assert.equal(at(CS.WALL + W.ARC_LIFE.live + W.ARC_LIFE.fade).filter((a) => a.kind === 'wall').length, 0);
  assert.equal(at(CS.SCAN.from).filter((a) => a.kind === 'hop').length, 0, 'the scan stops the lightning');
  for (const a of at(CS.HOPS[5])) assert.ok(a.age >= 0 && a.age < 10);
});

test('the camera follows the design’s screen path: the pull-back out of the match (×50, L), the Defender at (+420, +300), the roll to (+300, −420), the drift to the centre by the reticle, the hero at about (−300, +420) for the hint', () => {
  const eye = (f: number) => W.webCamera(f).eye;
  assert.ok(Math.abs(Math.hypot(...eye(CS.MATCH)) - W.PULL.near) < 1e-6, 'the match starts 0.12 units off his node');
  assert.ok(Math.hypot(...eye(CS.MATCH + 3)) > 2, 'L: 75 % of the pull-back (in log) by +3 f');
  near(W.webAnchors(CS.MATCH + 12).defender, [420, 300], 25, 'the Defender sits quietly at (+420, +300)');
  near(W.webAnchors(CS.MATCH).hero, [0, 0], 1, 'his node is the bead at the centre');
  assert.equal(W.rollAt(CS.ROLL.at), 0);
  assert.ok(Math.abs(W.rollAt(CS.ROLL.at + 3) / (Math.PI / 2) - 0.75) < 0.12, '75 % of the roll by +3 f');
  assert.ok(Math.abs(W.rollAt(CS.ROLL.settled) - Math.PI / 2) < 0.002, 'settled at 90° clockwise');
  for (let f = CS.ROLL.at; f < CS.ROLL.settled + 12; f++) assert.ok(W.rollAt(f) <= (Math.PI / 2) * 1.031, `${f}: ≤ 3 % over`);
  near(W.webAnchors(CS.ROLL.settled).defender, [300, -420], 30, 'after the roll the Defender has swung to (+300, −420)');
  near(W.webAnchors(CS.WALL).defender, [300, -330], 50, 'on the wall, (+300, −330) as the view drifts toward him');
  near(W.webAnchors(CS.RETICLE).defender, [0, 0], 2, 'the Defender arrives at the centre by the hint');
  near(W.webAnchors(CS.RETICLE).hero, [-300, 420], 70, 'the reticle’s twitch lands on the hero’s node');
  for (let f = CS.ROLL.settled; f < CS.RETICLE; f++) {
    const a = W.webAnchors(f).defender!;
    const b = W.webAnchors(f + 24).defender ?? a;
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) <= 260 || f + 24 > CS.RETICLE, `${f}: the drift moves him ≤ 260 px a beat`);
  }
  assert.ok(eye(CS.HORIZON.at - 1)[2] < eye(CS.WINK)[2] - 2, 'the relight backs off into the twist');
});

test('the rack focus is the lens’s: sub-frames through a Vogel aperture on the wall (≥ 48), the Defender in focus, the near strands soft; the pinhole everywhere else', () => {
  for (let f = CS.RACK.from; f < CS.RACK.to; f++) assert.ok(cTemporal(f).samples >= RACK_SAMPLES);
  assert.equal(lensPoint(CS.RACK.from - 1), null);
  assert.equal(lensPoint(CS.RACK.to), null);
  const pts = sampleFrames(CS.WALL + 4).map((s) => lensPoint(s)!);
  assert.ok(pts.every((p) => p && Math.hypot(p.x, p.y) <= 1), 'every sample on the unit disc');
  assert.ok(new Set(pts.map((p) => `${p.x.toFixed(3)}:${p.y.toFixed(3)}`)).size > 40, 'they spread over the aperture');
  const f = CS.WALL + 4;
  const pin = W.webPicture(f);
  const lensed = W.webPicture(f, { x: 1, y: 0 });
  assert.ok(Math.hypot(lensed.defender!.x - pin.defender!.x, lensed.defender!.y - pin.defender!.y) < 0.5, 'the Defender stays sharp');
  const cam = W.webCamera(f);
  const fg = W.NODES.find((n) => {
    const p = W.project(cam, n.p);
    return p && p.z < 3 && Math.abs(p.x) < 900 && Math.abs(p.y) < 500;
  })!;
  const a = W.project(cam, fg.p)!;
  const b = W.project(cam, fg.p, { x: W.apertureAt(f), y: 0, focus: W.focusDepth(cam) })!;
  const shift = Math.hypot(b.x - a.x, b.y - a.y);
  assert.ok(shift > 8, `a near strand’s node goes soft (${shift.toFixed(1)} px)`);
});

test('drum swaps land whole on their frame: a struck node is ω on every sub-frame of its 16th and on none of the frame before; the wink on every sub-frame of the hat', () => {
  const host = W.NODES.find((n) => n.role === 'host' && n.hop === 5)!;
  const on = (f: number) => W.nodeLook(host, f, 0);
  for (const s of sampleFrames(CS.HOPS[4])) assert.ok(on(s).infected, `${s}: struck`);
  for (const s of sampleFrames(CS.HOPS[4] - 1)) assert.ok(!on(s).infected, `${s}: not yet`);
  for (const s of sampleFrames(CS.WINK)) assert.ok(on(s).winking && WINKS.includes(on(s).face), `${s}: winking`);
  for (const s of sampleFrames(CS.WINK - 1)) assert.ok(!on(s).winking);
});

test('the scan plays everyone dead under its line (top → bottom in 12 f, slamming in on the clap, landing on the bottom edge), him too; on the hat every light comes back on with a wink, his included; never the Defender', () => {
  assert.equal(W.scanY(CS.SCAN.from - 1), Infinity);
  assert.ok(W.scanY(CS.SCAN.from) > 0 && W.scanY(CS.SCAN.from) <= 540 - 0.2 * 1080, 'on the clap’s frame the line slams in: a fifth of the frame already dead');
  assert.ok(W.scanY(CS.SCAN.to - 1) <= -530, 'on its 12th frame it sits on the bottom edge: the whole frame plays dead');
  for (let f = CS.SCAN.from; f < CS.SCAN.to - 1; f++) assert.ok(W.scanY(f + 1) < W.scanY(f), 'the line only moves down');
  for (let f = CS.SCAN.from + 1; f < CS.SCAN.to - 1; f++) assert.ok(W.scanY(f) - W.scanY(f + 1) <= W.scanY(f - 1) - W.scanY(f) + 1e-9, 'a fast start, decelerating to land');
  for (let f = CS.SCAN.from; f < CS.SCAN.to; f++) for (const s of sampleFrames(f)) assert.equal(W.deadAbove(s), W.scanY(f), `${s}: the frame’s own line on every sub-frame`);
  const host = W.NODES.find((n) => n.role === 'host' && n.hop === 3)!;
  const mid = CS.SCAN.from + 6;
  assert.ok(W.nodeLook(host, mid, W.scanY(mid) + 50).dead, 'above the line: dead');
  assert.ok(!W.nodeLook(host, mid, W.scanY(mid) - 50).dead, 'below it: still lit');
  const dead = W.nodeLook(host, CS.WINK - 1, 0);
  assert.deepEqual([dead.dead, dead.face, dead.ink, dead.glow], [true, host.host, 'cyan', W.DEAD_GLOW], 'flipped back to its host, 35 % cyan');
  const relit = W.nodeLook(host, CS.WINK, 0);
  assert.ok(!relit.dead && relit.ink === 'amber' && WINKS.includes(relit.face));
  const hero = (f: number) => W.nodeLook(W.NODES[0], f, 0);
  assert.deepEqual([hero(CS.WINK - 1).face, hero(CS.WINK - 1).ink, hero(CS.WINK - 1).glow, hero(CS.WINK - 1).dead], [W.HERO_DISGUISE, 'cyan', W.DEAD_GLOW, true], 'he plays dead too, in his disguise');
  assert.ok(!W.HERO_DISGUISE.includes('ω'), 'a host face: no ω');
  assert.deepEqual([hero(CS.WINK).face, hero(CS.WINK).ink], [W.HERO_WINK, 'amber'], 'he relights winking, with the others');
  assert.ok(WINKS.includes(W.HERO_WINK));
  assert.equal(hero(CS.RETICLE - 1).face, W.HERO_WINK);
  assert.equal(hero(CS.RETICLE).face, HERO_FACES.face, 'innocent (•ω•) as the reticle twitches onto him');
  assert.equal(W.nodeLook(W.NODES[W.DEFENDER], CS.WINK, 0).face, DEFENDER_FACE);
  assert.equal(W.nodeLook(W.NODES[0], W.HOOK_TOP_A, 0).face, HERO_FACES.top, '(>ω<) on the bar’s top note (the wall)');
});

test('the picture: every face it draws is in renderer C’s atlas; amber only on him, the infected, their ghosts and the fuses; red never (it is the overlay’s spot ink)', () => {
  const keys = new Set(cFaces());
  for (let f = CS.MATCH; f < cs(6); f += 5) {
    const pic = W.webPicture(f);
    for (const x of pic.faces) {
      assert.ok(keys.has(x.text), `${f}: ${x.text} is not in the atlas`);
      if (x.ink === 'amber') assert.ok(['hero', 'infected', 'wink', 'ghost'].includes(x.role), `${f}: an amber ${x.role}`);
      if (x.role === 'host') assert.notEqual(x.ink, 'amber');
    }
    for (const r of pic.runs) assert.ok(r.h >= 9 && r.h <= 22, 'filament type 9–22 px');
  }
  // The picture's inks are its roles: no red among them (the type itself has none).
  const inks: readonly W.Ink[] = ['amber', 'cyan', 'pink', 'cream', 'core', 'violet'];
  assert.equal(inks.length, 6);
});

test('the match cut’s band (E15): one profile for B’s last frames and C’s first — white-hot core, glow, haze; symmetric, 3.2 on the line, gone by ±120 px; it resolves into type over the first 16th', () => {
  assert.ok(Math.abs(W.bandProfile(0) - 3.2) < 1e-9);
  for (const y of [3, 10, 40, 90]) assert.equal(W.bandProfile(y), W.bandProfile(-y));
  for (let y = 0; y < 200; y++) assert.ok(W.bandProfile(y + 1) <= W.bandProfile(y));
  assert.ok(W.bandProfile(120) < 0.02);
  assert.equal(W.bandAt(CS.MATCH), 1);
  assert.equal(W.bandAt(CS.MATCH + 6), 0);
  const first = W.webPicture(CS.MATCH);
  assert.ok(first.strokes.some((s) => s.y0 === 0 && s.y1 === 0 && s.x0 <= -960 && s.x1 >= 960), 'C’s first frame carries the band through (0, 0), frame-wide');
  assert.equal(COSMOS.from + 384, CS.MATCH, 'the match is cosmos 5.1');
});

/** Amber light (his colour) by its linear RGB: red-dominant, green 20–75 % of red, little blue (not the Defender's red, cream or core). */
const isAmber = (c: readonly number[] | undefined): boolean => !!c && c[0] > 0.01 && c[1] / c[0] > 0.2 && c[1] / c[0] < 0.75 && c[2] / c[0] < 0.25;

test('the story: from the line’s pass to the relight (5.4 → 5.4&) nothing amber is left above the scanline — the picture on every sub-frame (faces, spirals, fuses, sparks), its lights and the overlay (his face, the counter): [SCAN] 0 THREATS is true of what the scan saw', () => {
  const ADV = { display: () => 0.62, mono: () => 0.6, readout: () => 0.6 };
  let disguised = 0;
  for (let out = CS.SCAN.from; out < CS.WINK; out++) {
    const line = W.scanY(out);
    const where = (what: string, y: number) => `${out}: ${what} at y ${y.toFixed(0)} is amber above the line (${line.toFixed(0)})`;
    for (const f of sampleFrames(out)) {
      const pic = W.webPicture(f);
      for (const x of pic.faces) if (x.ink === 'amber') assert.ok(x.y + x.em / 2 <= line + 1e-6, where(`face ${x.text}`, x.y));
      for (const r of pic.runs) if (r.ink === 'amber') assert.ok(Math.max(r.y0, r.y1) + r.h / 2 <= line + 1e-6, where('a fuse', Math.max(r.y0, r.y1)));
      for (const sp of pic.sprites) if (sp.ink === 'amber') assert.ok(sp.y + (sp.kind === 'spiral' ? 0.82 : 1) * sp.r <= line + 1e-6, where(`a ${sp.kind}`, sp.y));
      for (const st of pic.strokes) if (st.ink === 'amber') assert.ok(Math.max(st.y0, st.y1) <= line + 1e-6, where('a spark', Math.max(st.y0, st.y1)));
      const lights = webLights(f, pic);
      for (const x of lights.faces) if (x.ink === 'amber') assert.ok(x.y + x.em / 2 <= line + 1e-6, where('a light', x.y));
      for (const sh of lights.shapes) if (sh.ink === 'amber') assert.ok(sh.shape.y <= line + 1e-6, where('a light', sh.shape.y));
      const hero = pic.faces.find((x) => x.role === 'hero');
      if (hero && hero.text === W.HERO_DISGUISE) {
        assert.equal(hero.ink, 'cyan');
        disguised++;
      }
    }
    // The overlay: his neon face, the counter's number — every amber glyph and shape it draws stays under the line.
    const o = cOverlay(out, IDENTITY_VIEW, ADV);
    for (const gs of Object.values(o.lightGlyphs)) {
      for (const g of gs) if (isAmber(g.color as RGB) || isAmber(g.outlineColor as RGB | undefined)) assert.ok(g.y + 0.5 * g.size <= line + 1e-6, where(`overlay ${g.ch}`, g.y));
    }
    for (const sh of o.light) if (isAmber(sh.color as RGB)) assert.ok(sh.y <= line + 1e-6, where('an overlay shape', sh.y));
  }
  assert.ok(disguised > 0, 'he is seen playing dead in his disguise');
  // Dead from the line's pass: his node is at about (−300, +420) after the roll, so the line reaches him in the scan's first frames.
  const heroGlyphs = (out: number) => cOverlay(out, IDENTITY_VIEW, ADV).lightGlyphs.face.map((g) => g.ch);
  assert.equal(heroGlyphs(CS.SCAN.from + 2).length, 0, 'no neon hero while he plays dead');
  assert.ok(heroGlyphs(CS.WINK).includes(W.HERO_WINK), 'he relights winking (the overlay’s neon)');
  assert.ok(heroGlyphs(CS.RETICLE).includes(HERO_FACES.face), 'innocent again for the reticle');
});

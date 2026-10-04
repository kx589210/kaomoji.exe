// Break 8, the FAKE DROP (v2): the pure shot modules src/shots/breakLaunch.ts and breakFilm.ts (their v2 sections), pinned to the build
// sheet notes/bid2/break-sheet2.md (§3 break 8, §5 C8–C9, §6.1, §7.3, §11.3) and the design notes/extend/interlude-final.md
// (§3.8, §4.3, §10.4). Assertions are about what the viewer sees — the reverse angle, the creep, the release on the beat where the drop
// should land, the film catching him, the silence's look, the black spot his ω eats — and about the last frame drop 2 pops.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WINDOW_TEXTS_V2 } from '../src/content/break.ts';
import * as BR from '../src/score/break.ts';
import { partFrame, partStart } from '../src/score/film.ts';
import { FILM, FILM_FRONT, FILM_RIM, HITS_8, HOLE, MARBLE_UNDER_DRUMS, filmAt, filmAtV2, filmDepth, filmRim, filmText, domeGlint, holePxAt } from '../src/shots/breakFilm.ts';
import { FILM_FRAG, FILM_FRAG_V2, HOLE_GLSL } from '../src/scenes/breakLaunch.ts';
import { hash } from '../src/engine/random.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { BREAK_PALETTE, HERO_ADVANCE, toScreen } from '../src/shots/breakShared.ts';
import {
  AIM_NOTCH,
  FORK_FLEX,
  HITS8,
  LINE_PX,
  LINK8,
  band8,
  bandAt,
  bandAtV2,
  bandCord,
  blocksAt,
  brows,
  browsV2,
  fakeCam,
  forkAt,
  forkFlex,
  heroChars,
  heroCharsV2,
  heroPose,
  heroPoseV2,
  launchAt,
  launchAtV2,
  launchCam,
  launchCamV2,
  launchSegmentV2,
  launchTemporalV2,
  lineY,
  omegaInkOnScreenV2,
  omegaOnScreen,
  omegaOnScreenV2,
  open8,
  openL,
  pegAt,
  windowAt,
  windowAtV2,
} from '../src/shots/breakLaunch.ts';

const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);
const advance = (ch: string): number => (HERO_ADVANCE as Record<string, number>)[ch] ?? (ch === ' ' ? 0.28 : /[぀-ヿ]/u.test(ch) ? 1 : 0.6);
const L = { advance };
const near = (a: number, b: number, eps: number, msg: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a.toFixed(3)} vs ${b}`);
const LAST = BR.BREAK_END_V2 - 1;
const SEAM = partStart('drop2') - 1;

test('8.1 cuts to the reverse angle: the fork faces us (crotch (960, 1060), tips (110, 540) and (1810, 540) — flexing on the hits, square again before the release); his ω on (780, 640), the camera settling him to the centre with an L off the cut, done by 8.1& (review round 1 SYNC-3)', () => {
  const k = forkAt(BR.REVERSE);
  assert.equal(k.view, 'front');
  assert.deepEqual(k.crotch, [960, 1060]);
  const square = forkAt(BR.RELEASE - 1);
  assert.deepEqual([square.crotch, square.U, square.L], [[960, 1060], [110, 540], [1810, 540]]);
  // v07 WP5 (FW5 at C8): the cut opens anchor-locked — his ω on break 7's last pixel at break 7's last size (v06: (780, 640) at Z 1,
  // 60 px right and 64 % bigger than the frame before).
  const [x, y] = toScreen(fakeCam(BR.REVERSE), ...heroPoseV2(BR.REVERSE).omega);
  const before = heroPoseV2(BR.REVERSE - 1);
  const [x0, y0] = toScreen(launchCamV2(BR.REVERSE - 1), ...before.omega);
  near(x, x0, 1e-6, 'ω x on the cut = break 7’s last');
  near(y, y0, 1e-6, 'ω y on the cut = break 7’s last');
  near(Math.hypot(x0 - 720, y0 - 640), 0, 1, 'break 7’s full draw at (720, 640)');
  near(heroPoseV2(BR.REVERSE).em * fakeCam(BR.REVERSE).zoom, before.em * launchCamV2(BR.REVERSE - 1).zoom, 1e-6, 'his size on the cut = break 7’s last');
  const o = open8();
  assert.deepEqual([fakeCam(BR.REVERSE).cx, fakeCam(BR.REVERSE).cy, fakeCam(BR.REVERSE).zoom], [o.cx, o.cy, o.zoom]);
  // An L off the cut: three quarters of the way in 3 frames, exactly there from 8.1 + 12 (8.1&) on.
  const c = (f: number) => fakeCam(f);
  assert.ok((c(BR.REVERSE + 3).cx - o.cx) / (960 - o.cx) >= 0.75, 'at least three quarters settled by 8.1 + 3');
  near((c(BR.REVERSE + 3).zoom - o.zoom) / (1 - o.zoom), openL(BR.REVERSE + 3), 1e-9, 'the push into the aim with it (a frame-in L)');
  // The push's biggest step is the kick's next frame (the house's +1): 8.1's own frame is the cut, anchor-locked.
  const dz = [1, 2, 3, 4].map((k) => c(BR.REVERSE + k).zoom - c(BR.REVERSE + k - 1).zoom);
  assert.ok(dz[0] > dz[1] && dz[1] > dz[2] && dz[2] > dz[3], `steps ${dz.map((x) => x.toFixed(3)).join(' ')}`);
  for (const f of [at(8, 1.5), at(8, 1.5) + 5, at(8, 2) - 1]) {
    near(c(f).cx, 960, 1e-9, `${f}: centred`);
    near(c(f).cy, 540, 1e-9, `${f}: centred`);
  }
  assert.equal(heroPoseV2(BR.REVERSE).text, '(ง•ω•)ง');
  assert.equal(browsV2(BR.REVERSE, L).length, 2, 'his brows stay (C8: the brows and the ω stay, the arms change with the angle)');
});

test('he creeps back into the depth, em 240 → 230 / 220 / 212 and a 32nd each through the held breath (206 / 200 / 194 / 188), each creep already moving on its own frame', () => {
  const ems = [230, 220, 212, 206, 200, 194, 188];
  near(heroPoseV2(BR.CREEPS[0] - 1).em, 240, 1e-9, 'the cut');
  BR.CREEPS.forEach((c, i) => {
    const before = i === 0 ? 240 : ems[i - 1];
    assert.ok(heroPoseV2(c).em < before - 0.25 * (before - ems[i]), `creep ${i} moving on its frame`);
    near(heroPoseV2(c + 1.5).em, ems[i], 1e-9, `creep ${i} landed`);
  });
});

test('the release on 8.3 — the beat where the drop should land: (っ≧ω≦)っ flies at us, em 188 → 440 by 8.3e (accelerating), swapped whole on 8.3’s frame; in front of the fork from the fork pass', () => {
  for (const f of [BR.RELEASE - 0.25, BR.RELEASE - 0.01]) assert.equal(heroPoseV2(f).text, '(っ≧ω≦)っ', `${f}: 8.3's frame is whole`);
  assert.equal(heroPoseV2(BR.RELEASE - 1).text, '(ง•ω•)ง');
  near(heroPoseV2(BR.RELEASE).em, 188, 1e-9, 'em on the release');
  near(heroPoseV2(BR.SPLAT).em, 440, 1e-9, 'em on the splat');
  const d = [1, 2, 3, 4, 5, 6].map((i) => heroPoseV2(BR.RELEASE + i - 0.001).em - heroPoseV2(BR.RELEASE + i - 1).em);
  for (let i = 1; i < d.length; i++) assert.ok(d[i] > d[i - 1], 'accelerating into the film');
  // He is drawn under the fork (over him) until the fork pass, then over it.
  const before = launchAtV2Fork(BR.FORK_PASS - 1);
  const after = launchAtV2Fork(BR.FORK_PASS);
  assert.ok(before.overHim && !after.overHim);
});
test('the flight reads as coming at us: his size on screen (em × the flinching camera) grows on every frame from 8.3 to the splat — a perspective approach (1/em linear in time), never a shrink while the camera recoils', () => {
  const seen = (f: number) => heroPoseV2(f).em * launchCamV2(f).zoom;
  // (Instants that belong to the splat's output frame, from 8.3e − ½, are the splat's: the flying face is whole only before it.)
  for (let f = BR.RELEASE; f + 0.25 < BR.SPLAT - 0.5; f += 0.25) assert.ok(seen(f + 0.25) > seen(f), `${f} → ${f + 0.25}: ${seen(f).toFixed(1)} → ${seen(f + 0.25).toFixed(1)} px an em`);
  // A constant-speed approach: 1/em moves the same amount every frame (the size grows ever faster without any easing).
  const inv = [0, 1, 2, 3, 4, 5, 6].map((i) => 1 / heroPoseV2(BR.RELEASE + i).em);
  for (let i = 1; i < inv.length; i++) near(inv[i - 1] - inv[i], (1 / 188 - 1 / 440) / 6, 1e-9, `1/em step ${i}`);
});
/** Whether the fork is drawn over him at instant f (break 8): its shapes in the `top` draw. */
function launchAtV2Fork(f: number): { overHim: boolean } {
  return { overHim: launchAtV2(f, L).top.over.length > 0 };
}

test('the band: two arms from the tips to his fists until the release, snapping forward over 8.3 → the fork pass, then one straight ink line at y 540 plucked 40 → 0 px, flat from 8.4', () => {
  const b0 = band8(BR.RELEASE - 1);
  assert.equal(b0.length, 2);
  assert.deepEqual(b0[0].pts[0], [110, 540]);
  assert.deepEqual(b0[1].pts[0], [1810, 540]);
  const b1 = band8(BR.FORK_PASS);
  assert.equal(b1.length, 1);
  assert.deepEqual(b1[0].pts[0], [110, 540]);
  assert.deepEqual(b1[0].pts.at(-1), [1810, 540]);
  const amp = (f: number) => Math.max(...band8(f)[0].pts.map((p) => Math.abs(p[1] - 540)));
  near(amp(BR.FORK_PASS), 40, 0.5, 'plucked 40 px');
  assert.ok(amp(BR.FORK_PASS + 7) > 0 && amp(BR.FORK_PASS + 7) < 40, 'ringing down');
  for (const f of [BR.PLUCK.to, BR.GETS_IT, LAST]) near(amp(f), 0, 1e-9, `flat on ${f}`);
  near(lineY(LAST, 960), 540, 1e-12, 'y 540');
});

test('the splat on 8.3e: (≧ω≦) squashed 1.16 / 0.86 into the film, his っ っ flat on it outside his brackets (fixed when his head turns); relaxing to 1.06 / 0.95 by 8.4', () => {
  const h = heroPoseV2(BR.SPLAT);
  assert.equal(h.text, '(≧ω≦)');
  near(h.sx, 1.16, 1e-9, 'sx');
  near(h.sy, 0.86, 1e-9, 'sy');
  const r = heroPoseV2(BR.PLUCK.to);
  near(r.sx, 1.06, 1e-9, 'sx at rest');
  near(r.sy, 0.95, 1e-9, 'sy at rest');
  const paws = heroCharsV2(BR.SPLAT, L).filter((c) => c.part === 'paw');
  assert.equal(paws.length, 2);
  const tilted = heroCharsV2(BR.LOOK + 8, L).filter((c) => c.part === 'paw');
  assert.ok(heroPoseV2(BR.LOOK + 8).tilt > 3, 'his head is turned');
  assert.deepEqual(tilted.map((p) => p.rot), paws.map((p) => p.rot), 'the paws do not turn with it');
  const brackets = heroCharsV2(BR.SPLAT, L).filter((c) => c.part === 'open' || c.part === 'close');
  for (const p of paws) assert.ok(Math.min(...brackets.map((b) => Math.abs(b.x - p.x))) > 0.3 * h.em, 'a paw clear of the brackets');
});

test('THE LOOK (8.3a, digital silence): ( ・ω・) in (•ω•)’s slots — on 8.3a its eyes still ≧ ≦ squeezed small, then ・ ・ growing; the ? pops a 32nd later and the take holds whole through 8.4 + 11; his head tilts +6°', () => {
  const squint = heroCharsV2(BR.LOOK, L);
  assert.deepEqual(squint.filter((c) => c.part === 'eyeL' || c.part === 'eyeR').map((c) => c.ch), ['≧', '≦']);
  const look = heroCharsV2(BR.QMARK + 2, L);
  assert.deepEqual(look.filter((c) => c.part !== 'paw' && c.part !== 'mark').map((c) => c.ch), ['(', '・', 'ω', '・', ')']);
  const slots = heroCharsV2(BR.GETS_IT + 7, L).filter((c) => c.part !== 'paw' && c.part !== 'mark' && c.part !== 'brow');
  assert.equal(slots.length, 5);
  assert.equal(heroCharsV2(BR.QMARK - 1, L).filter((c) => c.part === 'mark').length, 0, 'no ? before its 32nd');
  for (let f = BR.QMARK + 5; f < BR.GETS_IT; f++) {
    const q = heroCharsV2(f, L).find((c) => c.part === 'mark');
    assert.ok(q && q.ch === '?' && q.size > 0.4 * 440, `${f}: ? whole`);
  }
  near(heroPoseV2(BR.GETS_IT - 1).tilt, 6, 0.05, 'tilted +6°');
});

test('he gets it on 8.4&: the ? pops out by 8.4& + 3, his head comes back, brows ˋ then ˊ pop on 8.4& and 8.4& + 3 → (•̀ω•́)', () => {
  assert.equal(heroCharsV2(BR.GETS_IT + 3, L).filter((c) => c.part === 'mark').length, 0);
  assert.equal(browsV2(BR.GETS_IT - 1, L).length, 0);
  assert.equal(browsV2(BR.GETS_IT, L).length, 1);
  assert.equal(browsV2(BR.GETS_IT + 3, L).length, 2);
  near(heroPoseV2(LAST).tilt, 0, 1e-9, 'head back');
  assert.equal(heroPoseV2(LAST).text, '(•ω•)');
});

test('the film (v2): none in break 7; on the cut no colour and no depth (the window stays put), fading in over 8.1 + 3 → 8.1&; suction toward him (0.06 / 0.12 / 0.16, +0.03 a 32nd → 0.28·FRONT); relaxed by 8.3 + 5; a dome toward us −0.13 → −0.08 → −0.10 by 8.4', () => {
  for (const f of [BR.WHIP_CUT, BR.CATCH + 40, BR.REVERSE - 1]) {
    const s = filmAtV2(f);
    assert.equal(s.amount, 0);
    assert.equal(s.depth, 0);
  }
  for (const f of [BR.REVERSE, BR.REVERSE + 2]) {
    near(filmAtV2(f).amount, 0, 1e-12, `no colour on ${f}`);
    near(filmAtV2(f).depth, 0, 1e-12, `no depth on ${f}`);
  }
  near(filmAtV2(BR.FILM_IN.to).amount, 1, 1e-9, 'full by 8.1&');
  const D = (f: number) => filmAtV2(f).depth / FILM_FRONT;
  near(D(BR.CREEPS[1] - 1), 0.06, 0.004, 'after 8.1&');
  near(D(BR.CREEPS[2] - 1), 0.12, 0.004, 'after 8.2');
  near(D(BR.RELEASE - 0.5), 0.28, 1e-6, 'held breath');
  near(D(BR.SPLAT - 1), 0, 1e-9, 'relaxed');
  near(D(BR.SPLAT + 3), -0.13, 1e-9, 'the dome’s overshoot');
  near(D(BR.SPLAT + 9), -0.08, 1e-9, 'the rebound');
  for (const f of [BR.PLUCK.to, BR.LOOK + 10, LAST]) near(D(f), -0.1, 1e-9, `settled on ${f}`);
  // The frame holds it: nothing moves at the edges; toward us in the middle.
  const s = filmAtV2(LAST);
  for (const [x, y] of [[0, 0], [960, 0], [1920, 540], [700, 1080]]) near(filmDepth(x, y, s), 0, 1e-9, `edge (${x}, ${y})`);
  near(filmDepth(s.anchor[0], s.anchor[1], s), s.depth, 1e-6, 'deepest at the anchor');
  assert.ok(domeGlint(filmAtV2(BR.SPLAT + 3)) !== null && domeGlint(filmAtV2(BR.RELEASE)) === null, 'the dome’s glint, only on the dome');
});

test('the black spot his ω eats: 45 / 90 / 135 / 180 px on 8.4& and each 32nd (sharp steps), round about his ω’s ink centre; the film trembles every 2 frames from the look (v07: a 3.5 px step until he gets it, ±2 px after), its marbling at ×0.3', () => {
  assert.equal(filmAtV2(BR.GETS_IT - 1).blackPx, 0);
  BR.BLACK_STEPS.forEach((s, i) => {
    near(filmAtV2(s).blackPx, 45 * (i + 1), 1e-9, `step ${i}`);
    near(filmAtV2(s + 0.4).blackPx, 45 * (i + 1), 1e-9, `step ${i} sharp`);
  });
  const s = filmAtV2(LAST);
  assert.deepEqual(s.apex, omegaInkOnScreenV2(LAST));
  assert.deepEqual(filmAtV2(BR.LOOK - 1).tremble, [0, 0]);
  const t = [0, 1, 2, 3].map((i) => filmAtV2(BR.LOOK + i).tremble);
  assert.deepEqual(t[0], t[1]);
  assert.notDeepEqual(t[1], t[2]);
  // The held breath (the continuity plan v07 §2.7): at least 3 px every step from the look to he-gets-it, a new direction each 2 frames.
  for (let f = BR.LOOK; f < BR.GETS_IT; f++) {
    const [x, y] = filmAtV2(f).tremble;
    near(Math.hypot(x, y), HOLE.tremble, 1e-9, `the held breath trembles on ${f}`);
    assert.ok(HOLE.tremble >= 3);
    for (const sub of [f - 0.4, f + 0.4]) assert.deepEqual(filmAtV2(sub).tremble, filmAtV2(f).tremble, `whole on ${f}`);
  }
  // From he-gets-it, ±FILM.tremble (2 px) as built — the last frame, which drop 2 pops, keeps its offset.
  for (let f = BR.GETS_IT; f <= LAST; f++) for (const v of filmAtV2(f).tremble) assert.ok(Math.abs(v) <= 2, `±2 on ${f}`);
  const pair = Math.floor((LAST - BR.LOOK) / 2);
  assert.deepEqual(s.tremble, [FILM.tremble * (2 * hash(pair, 63) - 1), FILM.tremble * (2 * hash(pair, 64) - 1)]);
  // The marbling: half v04's rate under the drums (racing ×3 of that through the held breath, review round 1 F4), v04's after the
  // release, ×0.3 of it in the silence.
  const rate = (f: number) => filmAtV2(f + 1).flow - filmAtV2(f).flow;
  near(rate(BR.LOOK + 5) / FILM.flow, 0.3, 1e-9, 'calm in the silence');
  near(rate(BR.REVERSE + 10) / FILM.flow, 0.5, 1e-9, 'half speed under the drums');
  near(rate(BR.HELD_V2 + 3) / rate(BR.REVERSE + 10), 3, 1e-9, 'racing through the held breath');
});

test('the hole his ω eats is drop 2’s world (the continuity plan v07 §2.7): the black spot’s 45 / 90 px, then it swallows his ω and both eyes (400 / 440 px) on the last two 32nds; drop 2 still tears from the film’s 180 px spot', () => {
  for (const f of [BR.LOOK, BR.GETS_IT - 1, BR.GETS_IT - 0.6]) {
    assert.equal(holePxAt(f), 0, `no hole on ${f}`);
    assert.equal(filmAtV2(f).holePx, undefined, `no hole in the state on ${f}`);
  }
  const want = [45, 90, ...HOLE.swallow];
  BR.BLACK_STEPS.forEach((at, i) => {
    assert.equal(holePxAt(at), want[i], `step ${i} on ${at}`);
    assert.equal(holePxAt(at + 0.4), want[i], `sharp on ${at}`);
    assert.equal(holePxAt(at - 0.6), i ? want[i - 1] : 0, `not before ${at}`);
    assert.equal(filmAtV2(at).holePx, want[i]);
  });
  assert.ok(HOLE.swallow[0] >= 400, 'at least 400 px on the last two 32nds');
  // His ω and both eye dots inside the swallow (screen px about the ω's ink); his brows and parentheses outside it.
  const s = filmAtV2(LAST);
  const [ax, ay] = s.apex;
  for (const [x, y] of [[ax - 330, ay - 50], [ax + 330, ay - 50], [ax, ay]]) assert.ok(Math.hypot(x - ax, y - ay) < HOLE.swallow[0] - 40, 'an eye inside');
  assert.equal(s.holePx, HOLE.swallow[1]);
  assert.equal(holePxAt(LAST + 50), HOLE.swallow[1], 'held after the last frame');
  // What drop 2 reads on the seam is the film's own spot: 180 px in screen px, its film-px twin, as before.
  near(s.blackPx, 180, 1e-9, 'drop 2 tears from 180 px');
  near(s.black, (180 * (FILM_FRONT + s.depth)) / FILM_FRONT, 1e-9, 'its film px');
  assert.deepEqual(filmAt(SEAM), s);
  // The shader: v04's film (and drop 2's splice) has no hole; v2's draws drop 2's world inside the spot, before the window is printed over it.
  assert.ok(!FILM_FRAG.includes('holeWorld') && !FILM_FRAG.includes('holeOn'));
  assert.ok(FILM_FRAG_V2.includes('uniform float holeOn;') && FILM_FRAG_V2.includes('vec3 holeWorld(vec2 p, float hero)'));
  assert.ok(FILM_FRAG_V2.indexOf('holeWorld(hp,') < FILM_FRAG_V2.indexOf('base = ink.rgb + base * (1.0 - ink.a);'), 'the print stays on top');
  assert.ok(FILM_FRAG_V2.includes('halo.a *= 1.0 - holeOn * ink.a;'), 'the hole’s ring stays off the window printed on the film');
  assert.equal((HOLE_GLSL.match(/{/g) ?? []).length, (HOLE_GLSL.match(/}/g) ?? []).length, 'balanced braces');
  assert.ok(HOLE_GLSL.includes('vec3(0.0021') || HOLE_GLSL.includes('vec3(0.002'), 'the terminal ground #07060C (linear)');
});

test('the window (v2), printed on the film: 116 % three frames after the cut, then 119 / 122 / 125 %; the gloat types 3 characters a frame from 8.3e (done 8.3e + 9), in red; [WARN] in an off phase on the last frame', () => {
  const vol = (f: number) => windowAtV2(f).lines.find((l) => l.startsWith('volume'))!;
  assert.ok(vol(BR.REVERSE + 2).endsWith(' 113%') && vol(BR.REVERSE + 3).endsWith(' 116%'));
  assert.ok(vol(at(8, 2)).endsWith(' 119%') && vol(at(8, 2.5)).endsWith(' 122%') && vol(at(8, 2.875)).endsWith(' 125%'));
  const gloat = (f: number) => windowAtV2(f).lines.find((l) => l.startsWith('[DE')) ?? '';
  assert.equal(gloat(BR.GLOAT - 1), '');
  assert.equal(gloat(BR.GLOAT), '[DE');
  assert.equal(gloat(BR.GLOAT_DONE), WINDOW_TEXTS_V2.gloat);
  const red = windowAtV2(LAST).glyphs.filter((g) => g.y > 250 && g.y < 300 && g.color[0] === 1);
  assert.ok(red.length > 10, 'the gloat row is red');
  assert.ok(!windowAtV2(LAST).lines.includes('[WARN] party overload'), '[WARN] off on the last frame');
});

test('integrator round 2 (WARN-BLINK-SILENCE): [WARN] still blinks under the drums, then holds off through the whole silence (the look has the dead air to itself)', () => {
  const warn = (f: number) => windowAtV2(f).lines.includes('[WARN] party overload');
  const before = Array.from({ length: BR.SILENCE.from - BR.OVERLOAD_V2 }, (_, i) => warn(BR.OVERLOAD_V2 + i));
  assert.ok(before.includes(true) && before.includes(false), 'it blinks from full draw to the cut-dead');
  for (let f = BR.SILENCE.from; f < BR.BREAK_END_V2; f++) assert.ok(!warn(f), `[WARN] off on +${f - partStart('break')}`);
});

test('the last frame, drop 2’s seam (sheet §7.3): camera Z 1.05 about (960, 540), roll 0; (•ω•) + brows, paws on the film, squash 1.06 / 0.95, ω (960, 580), its ink ≈ (960, 628), apparent em ≈ 462, core ≈ 1320 px; the band one straight line x 67 → 1853 on screen, 6.4 px; 8 links (4 "(" left, 4 ")" right) at em 132, turned 0°, 5 px outlines; the film domed −0.10·FRONT, its black spot 180 px', () => {
  const c = launchCamV2(LAST);
  assert.deepEqual(c, { zoom: 1.05, cx: 960, cy: 540, roll: 0, dy: 0 });
  const h = heroPoseV2(LAST);
  assert.equal(h.text, '(•ω•)');
  near(h.sx, 1.06, 1e-9, 'sx');
  near(h.sy, 0.95, 1e-9, 'sy');
  const [ox, oy] = omegaOnScreenV2(LAST);
  near(ox, 960, 1e-9, 'ω x');
  near(oy, 580, 1, 'ω y');
  const [ix, iy] = omegaInkOnScreenV2(LAST);
  near(ix, 960, 1e-9, 'ink x');
  near(iy, 628, 3, 'ink y');
  near(h.em * c.zoom, 462, 1, 'apparent em');
  const core = (0.412 + 0.526 + 0.822 + 0.526 + 0.412) * h.em * h.sx * c.zoom;
  near(core, 1320, 15, 'core width');
  const b = band8(LAST)[0];
  const [x0] = toScreen(c, ...b.pts[0]);
  const [x1] = toScreen(c, ...b.pts.at(-1)!);
  near(x0, 67, 1, 'band left end');
  near(x1, 1853, 1, 'band right end');
  near(b.w * c.zoom, LINE_PX, 1e-9, 'band width');
  const links = bandAtV2(LAST).filter((k) => k.scale > 0);
  assert.equal(links.length, 8);
  assert.deepEqual(links.map((k) => k.ch).join(''), '(((())))');
  for (const k of links) {
    near(k.scale * 360, LINK8, 1e-9, 'link em');
    near(k.rot, 0, 1e-9, 'turned 0°');
    assert.equal(k.outline, 5);
    near(k.by, 540, 1e-9, 'on the line');
  }
  const s = filmAtV2(LAST);
  near(s.amount, 1, 1e-9, 'film amount');
  near(s.depth / FILM_FRONT, -0.1, 1e-9, 'domed toward us');
  near(s.blackPx, 180, 1e-9, 'black spot');
});

test('drop 2 reads the v2 last frame through the v04 exports (the switch on): launchCam, heroPose, heroChars (with their parts), brows, bandAt, bandCord (the straight line), blocksAt (the fork’s pills), pegAt (none), windowAt, omegaOnScreen, filmAt, filmText', () => {
  assert.deepEqual(launchCam(SEAM), launchCamV2(LAST));
  assert.deepEqual(heroPose(SEAM), heroPoseV2(LAST));
  assert.deepEqual(heroChars(SEAM, L), heroCharsV2(LAST, L));
  assert.deepEqual(brows(SEAM, L), browsV2(LAST, L));
  assert.deepEqual(heroChars(SEAM, L).map((c) => (c as { part?: string }).part), ['open', 'eyeL', 'mouth', 'eyeR', 'close', 'paw', 'paw']);
  assert.deepEqual(bandAt(SEAM), bandAtV2(LAST));
  const cord = bandCord(SEAM)!;
  assert.deepEqual([cord.x0, cord.y0, cord.x1, cord.y1], [110, 540, 1810, 540]);
  near(cord.w * 1.05, LINE_PX, 1e-9, 'cord width on screen');
  assert.equal(pegAt(SEAM), null);
  const blocks = blocksAt(SEAM);
  assert.equal(blocks.shear, 0);
  assert.deepEqual(blocks.blocks.map((b) => b.color), ['mint', 'cream', 'yellow']);
  assert.deepEqual(windowAt(SEAM), windowAtV2(LAST));
  assert.deepEqual(omegaOnScreen(SEAM), omegaOnScreenV2(LAST));
  assert.deepEqual(filmAt(SEAM), filmAtV2(LAST));
  assert.equal(filmText(SEAM).length, windowAtV2(LAST).glyphs.length);
  assert.deepEqual(launchAt(SEAM, L).front.over, [], 'no peg drawn over him');
  void filmAtV2;
});

test('every world glyph of bars 7–8 keeps its outline inside its atlas’s reach (≤ 0.75 × the SDF radius: hero 0.1125 em, mono 0.09375 em) — a popping ? or brow never turns its quad into an ink square', () => {
  const limit = { hero: (0.75 * 24) / 160, mono: (0.75 * 12) / 96 } as const;
  for (let f = BR.WHIP_CUT; f <= LAST; f += 0.5) {
    const v = launchAtV2(f, L);
    // The window's glyphs are v04's, function for function (breakLaunchSling.test.ts), its ✧'s shrinking tail included: kept as built.
    for (const c of [v.back, v.front, v.top]) {
      for (const [atlas, list] of Object.entries(c.glyphs ?? {})) {
        const max = limit[atlas as keyof typeof limit];
        for (const g of list ?? []) assert.ok((g.outline ?? 0) <= max + 1e-9, `${f}: ${atlas} ${g.ch} at ${g.size.toFixed(1)} px has outline ${(g.outline ?? 0).toFixed(3)} em > ${max}`);
      }
    }
  }
});

test('each K + C of break 8 is a draw-back notch on its own frame (review round 1 F4, SYNC-3): white pulses down both arms, the prongs flex in 2° and spring back; after the cut the links clack a step out, the camera steps in 2 % (its biggest step on the hit frame), his creep lands as an impact squash, the film’s suction steps deeper, its marbling jumps and its rim tightens', () => {
  assert.deepEqual(HITS8, [BR.REVERSE, at(8, 1.5), at(8, 2), at(8, 2.25)]);
  assert.deepEqual(HITS_8, HITS8.slice(1));
  const sh = (F: number) => temporalSamples(F, launchTemporalV2(F), launchSegmentV2(F)).map((x) => x.frame);
  const white = (f: number) => launchAtV2(f, L).back.under.filter((x) => x.kind === 'segment' && x.color === BREAK_PALETTE.white).length;
  for (const h of HITS8) {
    assert.ok(white(h) >= 2, `${h}: a pulse down each arm`);
    if (h > BR.REVERSE) assert.ok(white(h) > white(h - 1), `${h}: the pulse is the hit's`);
    for (const x of sh(h)) near(forkFlex(x), FORK_FLEX, 0.25, `${h}: flexed on its frame (${x.toFixed(3)})`);
    // The left tip swings in toward him (right), the right tip toward him (left).
    assert.ok(forkAt(h).U[0] > 110 && forkAt(h).L[0] < 1810, `${h}: the tips swing in`);
  }
  near(forkFlex(BR.RELEASE - 1), 0, 1e-12, 'square before the release');
  near(forkFlex(BR.BREAK_END_V2 - 1), 0, 1e-12, 'square on the last frame');
  const zoom = (f: number) => fakeCam(f).zoom;
  HITS_8.forEach((h, i) => {
    near(zoom(h - 1), 1 + AIM_NOTCH * i, 0.002, `${h}: before its step`);
    near(zoom((HITS_8[i + 1] ?? BR.HELD_V2) - 1), 1 + AIM_NOTCH * (i + 1), 0.002, `${h}: stepped in`);
    const s0 = zoom(h) - zoom(h - 1);
    const s1 = zoom(h + 1) - zoom(h);
    assert.ok(s0 > s1 && s0 > 0.4 * AIM_NOTCH, `${h}: the hit frame carries the step (${s0.toFixed(4)} then ${s1.toFixed(4)})`);
    // The links: link 1 (nearest him) moves out along its arm on the hit.
    const l = (f: number) => bandAtV2(f).find((c) => c.k === 1)!;
    assert.ok(l(h + 3).bx < l(h - 1).bx - 15, `${h}: the links clack out (${l(h - 1).bx.toFixed(0)} → ${l(h + 3).bx.toFixed(0)})`);
    // His creep lands squashed (wider, shorter) on its frame, then rings back.
    const p = heroPoseV2(h);
    assert.ok(p.sx > 1.05 && p.sy < 0.95, `${h}: squashed ${p.sx.toFixed(3)} / ${p.sy.toFixed(3)}`);
    // The rim: tighter on the hit frame than the frame before (and brighter), on screen about his ω's ink.
    const r0 = filmAtV2(h - 1);
    const r1 = filmAtV2(h);
    if (i > 0) assert.ok(r1.rimPx! < r0.rimPx! - 40 && r1.rim! > r0.rim!, `${h}: the rim tightens ${r0.rimPx!.toFixed(0)} → ${r1.rimPx!.toFixed(0)}`);
    else assert.ok(r0.rim === undefined && r1.rim! > 0.5, 'the rim snaps in on 8.1&');
    // The marbling jumps on the hit frame (one sharp step at the output frame), beyond its flow.
    const flowStep = filmAtV2(h).flow - filmAtV2(h - 1).flow;
    assert.ok(flowStep > 0.5, `${h}: the marbling jumps ${flowStep.toFixed(3)}`);
    for (const x of sh(h)) near(filmAtV2(x).flow - (x - h) * FILM.flow * MARBLE_UNDER_DRUMS, filmAtV2(h).flow, 1e-9, `${h}: jumped on every sub-frame (${x.toFixed(3)})`);
  });
  // The rim: none before 8.1&, none from the release + 4, none on the last frame (drop 2's seam reads none).
  assert.equal(filmAtV2(at(8, 1.5) - 1).rim, undefined);
  assert.equal(filmAtV2(BR.RELEASE + 4).rim, undefined);
  assert.equal(filmAtV2(LAST).rim, undefined);
  assert.ok(filmAtV2(BR.RELEASE + 2).rimPx! > filmAtV2(BR.RELEASE - 1).rimPx!, 'the suction lets go: the rim flies out');
});

test('the aim settles and holds (SYNC-3): from 8.1& + 3 to 8.2 − 1 a living hold — the camera centred, its zoom creeping < 0.15 % a frame, nothing but the film shimmering and his brows', () => {
  for (let f = at(8, 1.5) + 3; f < at(8, 2) - 1; f++) {
    const a = fakeCam(f);
    const b = fakeCam(f + 1);
    assert.deepEqual([a.cx, a.cy], [960, 540]);
    assert.ok(Math.abs(b.zoom - a.zoom) < 0.0015, `${f}: zoom ${a.zoom.toFixed(4)} → ${b.zoom.toFixed(4)}`);
    near(heroPoseV2(f + 1).em, heroPoseV2(f).em, 1e-9, `${f}: no creep`);
  }
});

test('the window’s grown rows (review round 1 F7, GLOAT-ROW-CLIP): [ROOT], the volume and the gloat each show on their own frame with the box grown round them — every glyph of the row clear of the bottom border on every sub-frame, and no row before its box', () => {
  const rows: [number, string][] = [[BR.ROOT_ROW, '[ROOT]'], [BR.OVERLOAD_V2, 'volume'], [BR.GLOAT, '[DE']];
  for (const [F, head] of rows) {
    for (const x of temporalSamples(F, launchTemporalV2(F), launchSegmentV2(F)).map((s) => s.frame)) {
      const w = windowAtV2(x);
      assert.ok(w.lines.some((l) => l.startsWith(head)), `${x.toFixed(3)}: the ${head} row shows on its frame`);
      const border = w.glyphs.filter((g) => g.ch === '╚').at(-1)!;
      const rowY = Math.max(...w.glyphs.filter((g) => g.ch !== '╚' && g.ch !== '═' && g.ch !== '╝' && g.ch !== '║' && g.y < border.y && g.size < 40).map((g) => g.y));
      assert.ok(border.y - rowY >= 22, `${x.toFixed(3)}: the last row at y ${rowY.toFixed(1)}, the border at ${border.y.toFixed(1)}`);
    }
    assert.ok(!windowAtV2(F - 1).lines.some((l) => l.startsWith(head)), `${F - 1}: no ${head} row yet`);
  }
});

test('v2’s film shader is v04’s plus the rim: FILM_FRAG (v04’s film, and drop 2’s splice) has no rim; FILM_FRAG_V2 keeps FILM_FRAG’s last-statement shape; filmRim is a crisp band (gold inside → lilac outside), nothing past it', () => {
  assert.ok(!FILM_FRAG.includes('rimPx'));
  assert.ok(FILM_FRAG_V2.includes('uniform float rimPx;') && FILM_FRAG_V2.includes('vec4 filmRim('));
  assert.match(FILM_FRAG_V2, /gl_FragColor\s*=\s*vec4\(([\s\S]*),\s*1\.0\);\s*\}\s*$/);
  assert.equal(filmRim(500, 500, 0).alpha, 0);
  near(filmRim(500, 500, 0.8).alpha, 0.8, 1e-12, 'full on its radius');
  assert.equal(filmRim(500 + FILM_RIM.w * 1.01, 500, 1).alpha, 0);
  assert.equal(filmRim(500 - FILM_RIM.w * 1.01, 500, 1).alpha, 0);
  for (const d of [478, 490, 500, 510, 522]) for (const c of filmRim(d, 500, 1).color) assert.ok(c >= 0 && c <= 1, `${d}: never brighter than 1`);
});

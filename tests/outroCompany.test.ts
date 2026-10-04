// E4 CURTAIN CALL + E5 BOWS → DIVE (src/shots/outroCompany.ts, outroBows.ts, outroWall.ts; build sheet r4 §3.4–§3.6, §4, §5.1, §6, §7
// E4 / E5, U5 / U6): the burst, the wall printing over the first 8th, the roll call one per 8th (each a pop and a real bow),
// the stadium wave, the kit lighting the stage, the leads walking on last, the bows "ba-da-BUM" (real dips, held), the last drop onto
// W5, the button; the held tableau (U5b: 5.2e → 5.2&); then one continuous move of a beat and a half — the stage powering down onto him
// while the company streams in one after another, the fold, and the dive landing on S01's pose at frame −24 on 5.4.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as C from '../src/content/outro.ts';
import { cellWidth } from '../src/engine/textGrid.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import * as O from '../src/score/outro.ts';
import { introCamera } from '../src/shots/intro.ts';
import * as B from '../src/shots/outroBows.ts';
import * as K from '../src/shots/outroCompany.ts';
import { ROUNDED_INK, armHull, irisHero, irisRadius } from '../src/shots/outroIris.ts';
import { INKS, charPlanOf, omegaPlanOf } from '../src/shots/outroKit.ts';
import { CURSOR_AT_SLAM, SEATS, W5_BOX, seatAt } from '../src/shots/outroShared.ts';
import { WALL_FACES, faceKey } from '../src/shots/outroWall.ts';
import { INK, cellCenter } from '../src/worlds/terminal.ts';

const range = (a: number, b: number, step = 1): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
const ROUND: Record<string, number> = { '(': 0.36, ')': 0.36, '•': 0.42, 'ω': 0.82, '<': 0.6, '－': 1, ヽ: 1, ﾉ: 0.5, '✧': 1 };
const rounded = (ch: string) => ROUND[ch] ?? 0.6;
const mono = () => 0.6;
const L = { plan: omegaPlanOf(mono), wallPlan: omegaPlanOf(mono), chars: charPlanOf(mono), rounded };
/** A face's ink half-width (px) at `em`: its terminal cells at 0.6 em, less a side bearing each side. */
const half = (face: string, em: number) => ([...face].reduce((a, ch) => a + cellWidth(ch), 0) * 0.6 * em) / 2 - 0.06 * em;
/** A stage point on screen (layout px). */
const screen = (f: number, p: readonly [number, number]) => K.onScreen(f, p);
const lum = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const subs = (F: number) => temporalSamples(F, K.companyTemporal(F), { from: O.OUTRO_START, to: O.LOOP }).map((s) => s.frame);
/** JetBrains Mono's parentheses reach 0.48 em below their middle line (the lowest ink of the guest's and the cat's faces). */
const MONO_DESCENT = 0.48;

// ——— 4.1: the burst, the arms, the swallow, the wall ————————————————————————————————————————————————————————————————————————————

test('the burst: the rim launches from the iris’s strained radius, past the corners (1101) by + 6, thinning and fading; the spots pop away in 3 frames, never growing past ×1.12', () => {
  assert.ok(Math.abs(K.burstRadius(O.BURST - 1) - irisRadius(O.BURST - 1)) < 1e-9, 'from where the iris left it');
  assert.ok(K.burstRadius(O.BURST + 6) > 1101, `${K.burstRadius(O.BURST + 6)}`);
  assert.equal(K.companyAperture(O.BURST + 8).rimLevel, 0);
  assert.equal(K.companyAperture(O.BURST + 3).spots.every((s) => s.rim === 0 && s.inside === 0), true);
  for (const f of range(O.BURST, O.BURST + 3, 0.25)) for (const s of K.companyAperture(f).spots) assert.ok(s.scale <= 1.12 * 1.01, `${f}: ×${s.scale}`);
});

test('R2-ARMS-ATTACH: on the burst his arms draw back from the rim into the typed `ヽ(•ω•)ﾉ`, whole for a frame, gone by 4.1 + 4; never folded onto his brackets; the ✧ pops off in 6', () => {
  const arms = (f: number) => K.heroContent(f, rounded).rounded.filter((g) => g.ch === 'ヽ' || g.ch === 'ﾉ');
  const iris = irisHero(O.BURST - 1, rounded);
  for (const [i, g] of arms(O.BURST).entries()) {
    const was = iris.glyphs[5 + i];
    const c = K.heroPlace(O.BURST).centre;
    assert.ok(Math.abs(g.x - (c[0] - 960) - (was.x - (iris.centre[0] - 960))) < 1 && Math.abs(g.rot! - was.rot!) < 1e-9 && Math.abs(g.size - was.size) < 1, `${g.ch} continues`);
  }
  for (const f of range(O.BURST, K.ARMS_GONE, 0.25)) {
    const c = K.heroContent(f, rounded);
    const face = c.rounded.slice(0, 5);
    const a = arms(f);
    assert.equal(a.length, 2, `${f}`);
    for (const g of a) {
      const br = g.ch === 'ヽ' ? face[0] : face[4];
      const b = ROUNDED_INK[br.ch as '(' | ')'].box.map((v) => v * br.size);
      const hull = armHull(g.ch as 'ヽ' | 'ﾉ', { x: g.x, y: g.y, size: g.size, stretch: g.stretch ?? 1, rot: g.rot ?? 0 });
      const xs = hull.map((q) => q[0] - br.x);
      const ys = hull.map((q) => q[1] - br.y);
      const gap = Math.max(b[0] - Math.max(...xs), Math.min(...xs) - b[2], b[1] - Math.max(...ys), Math.min(...ys) - b[3]);
      assert.ok(gap >= 4, `${f}: the ${g.ch} is ${gap.toFixed(1)} px from its bracket`);
      assert.ok(g.ch === 'ヽ' ? Math.max(...xs) < b[2] : Math.min(...xs) > b[0], `${f}: the ${g.ch} on its own side`);
    }
  }
  for (const f of [O.BURST + K.ARMS_OFF.retract, O.BURST + K.ARMS_OFF.retract + K.ARMS_OFF.hold - 0.25]) {
    const c = K.heroContent(f, rounded);
    assert.equal(K.heroFace(f), C.HERO_OUT.alive);
    for (const g of arms(f)) assert.ok(Math.abs(g.rot ?? 0) < 1e-9 && Math.abs(g.y - c.rounded[0].y) < 1e-6 && Math.abs(g.size - c.rounded[0].size) < 1e-6 && (g.alpha ?? 1) === 1, `${f}: the ${g.ch} typed`);
  }
  assert.ok(K.ARMS_GONE <= O.BURST + 4);
  assert.equal(arms(K.ARMS_GONE).length, 0);
  assert.ok(K.heroContent(O.BURST + 5, rounded).rounded.some((g) => g.ch === C.HERO_OUT.star));
  assert.ok(!K.heroContent(O.BURST + 6, rounded).rounded.some((g) => g.ch === C.HERO_OUT.star));
});

test('the iris’s prompt and counter are swallowed by + 4 (a quarter left on + 2): gone before he falls through their line', () => {
  assert.equal(K.swallow(O.BURST), 1);
  assert.ok(Math.abs(K.swallow(O.BURST + 2) - 0.25) < 1e-9);
  assert.equal(K.swallow(O.BURST + 4), 0);
  assert.ok(K.heroPlace(O.BURST + 4).centre[1] < 690 - 0.3 * 36, 'he reaches the prompt line only after it has gone');
});

test('the wall: every other face of the film, each once, no principal and no headliner, raked up to ≤ 20 px, filling y 40 → 545; printed back row first over WALL_PRINT (U5: ≈ 2.5 rows a frame, every row by 4.1&)', () => {
  const keys = WALL_FACES.map(faceKey);
  assert.equal(new Set(keys).size, keys.length);
  const banned = [...Object.values(C.HERO_OUT), ...Object.values(C.GUEST_OUT), ...Object.values(C.CAT_OUT), ...C.HEADLINERS.map((h) => h.face)].map(faceKey);
  for (const b of banned) assert.ok(!keys.includes(b), `${b} is a principal or a headliner`);
  assert.equal(K.WALL_FACES_LAID.length, WALL_FACES.length);
  assert.ok(K.WALL_FACES_LAID[0].size >= 4 && K.WALL_FACES_LAID[0].size <= 14);
  assert.ok(K.WALL_FACES_LAID.at(-1)!.baseline >= 500, 'the wall fills its frame');
  for (const w of K.WALL_FACES_LAID) {
    assert.ok(w.size <= K.WALL.max + 1e-9);
    assert.ok(w.baseline - w.size >= K.WALL.top - 1e-6 && w.baseline <= K.WALL.bottom + 1e-6, `${w.face} at ${w.baseline}`);
    assert.ok(w.x - half(w.face, w.size) >= K.WALL.left - 2 && w.x + half(w.face, w.size) <= K.WALL.right + 2, `${w.face} at x ${w.x}`);
  }
  for (let i = 1; i < K.WALL_FACES_LAID.length; i++) {
    const [a, b] = [K.WALL_FACES_LAID[i - 1], K.WALL_FACES_LAID[i]];
    if (a.row === b.row) assert.ok(a.x + half(a.face, a.size) < b.x - half(b.face, b.size), `${a.face} | ${b.face}`);
    assert.ok(b.at >= a.at, 'back rows first');
  }
  assert.deepEqual([...new Set(K.WALL_FACES_LAID.map((w) => w.at))], range(O.WALL_PRINT.from, O.WALL_PRINT.to), 'every frame of the first 8th prints');
  const perFrame = K.WALL_ROWS / (O.WALL_PRINT.to - O.WALL_PRINT.from);
  assert.ok(perFrame >= 2 && perFrame <= 3, `${perFrame.toFixed(2)} rows a frame`);
});

// ——— 4.1 → 4.4&: the roll call ——————————————————————————————————————————————————————————————————————————————————————————————

test('U5 · the roll call: one headliner an 8th, each popping on its call (×1.25, light 1.8, struck on the frame) and bowing a 32nd later — the bottom on + 6 (the call’s 16th, on the 32nd grid: round-2 review a1) at 0.35 em with squash y 0.85, held 3 frames, up by + 18; lit from its call, waiting dim before it', () => {
  assert.deepEqual(C.HEADLINERS.map((_, k) => K.headlinerSeat(k).call), O.CALLS);
  assert.equal(new Set(O.CALLS).size, O.CALLS.length, 'no two pops on one frame');
  for (const [k, h] of C.HEADLINERS.entries()) {
    const call = O.CALLS[k];
    const seat = seatAt(h.seat);
    const at = K.headlinerAt(k, call + 0.25)!;
    assert.ok(at.pop >= 1.2, `${h.world} pops on its call: ×${at.pop.toFixed(2)}`);
    if (k > 0) {
      const before = K.headlinerAt(k, call - 1)!;
      assert.equal(before.pop, 1, `${h.world} has not popped before its call`);
      assert.ok(before.level <= 0.6 && at.level === 1, `${h.world}: dim (${before.level.toFixed(2)}) until its call, lit on it`);
    }
    const rest = K.headlinerAt(k, call + 30)!;
    const bottom = K.headlinerAt(k, call + 6)!;
    const dip = (bottom.centre[1] - rest.centre[1]) / seat.em;
    assert.ok(dip >= 0.35, `${h.world} dips ${dip.toFixed(2)} em`);
    assert.ok(bottom.sy <= 0.88 && bottom.sx > 1, `${h.world} squashes about its baseline`);
    assert.ok(K.headlinerAt(k, call + 5)!.centre[1] < bottom.centre[1] - 0.5, `${h.world} still going down on + 5`);
    for (const f of range(call + 6, call + 10)) assert.ok(Math.abs(K.headlinerAt(k, f)!.centre[1] - bottom.centre[1]) < 0.05, `${h.world} held on ${f}`);
    assert.ok(Math.abs(K.headlinerAt(k, call + 18)!.centre[1] - rest.centre[1]) < 0.5, `${h.world} up by + 18`);
    assert.ok(K.headlinerAt(k, call + 3)!.centre[1] - rest.centre[1] < 0.01, `${h.world}’s bow starts a 32nd after the pop`);
    // Still rising as the next goes down: a ripple, never in unison.
    if (k < 7) {
      const [a, b] = [K.headlinerAt(k, O.CALLS[k + 1] + 3)!.centre[1], K.headlinerAt(k, O.CALLS[k + 1] + 4)!.centre[1]];
      assert.ok(a > rest.centre[1] + 0.3 && b < a, `${h.world} still rising as the next goes down (${(a - rest.centre[1]).toFixed(2)} px)`);
    }
  }
});

test('U5 · every call is legible: from its call for 12 frames its face (popped, bowing) stays clear of every neighbour’s ink; the friends are seated by 4.1&, shedding their worlds over 4 frames', () => {
  const box = (k: number, f: number) => {
    const h = K.headlinerAt(k, f)!;
    const w = half(C.HEADLINERS[k].face, h.emX);
    return { x0: h.centre[0] - w, x1: h.centre[0] + w, y0: h.centre[1] - 0.5 * h.em, y1: h.centre[1] + 0.5 * h.em };
  };
  // (On the burst the friends fly past the boot's seat for a few frames; from the second call on every call is clear throughout.)
  for (const [k] of C.HEADLINERS.entries()) {
    const clear = range(O.CALLS[k], O.CALLS[k] + 14).filter((f) =>
      range(f, f + 1, 0.25).every((g) =>
        C.HEADLINERS.every((_, j) => {
          if (j === k) return true;
          const [a, b] = [box(k, g), box(j, g)];
          return a.x1 + 8 < b.x0 || b.x1 + 8 < a.x0 || a.y1 < b.y0 || b.y1 < a.y0;
        }),
      ),
    );
    assert.ok(clear.length >= (k === 0 ? 8 : 14), `${C.HEADLINERS[k].world}: legible on ${clear.length} of its first 14 frames`);
  }
  for (const [k, h] of C.HEADLINERS.entries()) {
    const seat = seatAt(h.seat);
    const at = K.headlinerAt(k, O.PULLBACK.to)!;
    assert.ok(Math.abs(at.centre[0] - seat.at[0]) < 2 && Math.abs(at.emX / at.sx - seat.em * at.pop) < 0.6, `${h.world} seated by 4.1&`);
    if (h.spot !== null) {
      assert.equal(K.headlinerAt(k, O.BURST)!.world, 1);
      assert.equal(K.headlinerAt(k, O.BURST + 4)!.world, 0);
    }
  }
});

test('U5 · the stadium wave trails the calls: the wall’s faces nearest a called seat reach the bottom of a bow a 32nd + 4 f after the call (the print wave before it); the wave rolls to the front and crests on the cat’s bow; nothing of it after the guest’s', () => {
  for (const k of [1, 2, 3, 4, 5, 6, 7]) {
    const sx = SEATS.x[k % 4];
    const near = K.WALL_FACES_LAID.filter((w) => Math.abs(w.x - sx) < 40);
    assert.ok(near.length > 5);
    for (const w of near) {
      const bottom = O.CALLS[k] + 3 + B.WALL_BOW.down;
      const d = Math.max(...range(bottom - 1, bottom + 2).map((f) => K.wallBowAt(w, f).dip));
      assert.ok(d >= 0.2, `${w.face} (x ${w.x.toFixed(0)}) dips ${d.toFixed(2)} em after call ${k + 1}`);
    }
  }
  const front = K.WALL_FACES_LAID.filter((w) => w.row === K.WALL_ROWS - 1);
  for (const w of front) assert.ok(K.wallBowAt(w, O.BOWS.cat).dip >= 0.28, `the front row crests on 5.1: ${w.face}`);
  const back = K.WALL_FACES_LAID.filter((w) => w.row === 0);
  assert.ok(Math.max(...back.map((w) => w.waves[2])) < Math.min(...front.map((w) => w.waves[2])) && back[0].waves[2] > O.CALLS[7], 'the roll runs from the back rows to the front, after the last call');
  for (const w of K.WALL_FACES_LAID) for (const f of [O.BOW_WAVE.to + 12, O.BOWS.hero]) assert.equal(K.wallBowAt(w, f).dip, 0);
});

test('U5 · the kit is visible: every kick from 4.2 to 5.1 lights the risers’ lines (+ 40 %, gone in 6 f), every clap of the curtain call the follow-spot (+ 15 % mint, 4 f)', () => {
  const lines = (f: number) => Math.max(...K.stageContent(f, { mono, ...L }).under.filter((s) => s.kind === 'rect').map((s) => s.alpha ?? 1));
  for (const k of O.KICKS.filter((f) => f >= O.at(4, 2) && f <= O.at(5))) {
    assert.ok(lines(k + 0.25) >= 1.35 * lines(k - 2), `the kick on ${k} lights the risers (${lines(k + 0.25).toFixed(3)} vs ${lines(k - 2).toFixed(3)})`);
    assert.ok(Math.abs(lines(k + 6) - lines(k - 2)) < 1e-6, `${k}: back in 6`);
  }
  for (const c of O.CLAPS.filter((f) => f < O.at(5))) {
    const s = (f: number) => K.followSpot(f)!.alpha;
    assert.ok(s(c + 0.25) >= s(c - 2) + 0.06, `the clap on ${c} lights the spot`);
    assert.ok(Math.abs(s(c + 4) - s(c - 2)) < 0.02, `${c}: back in 4`);
  }
});

// ——— 4.3 → 4.4a: the leads walk on last ————————————————————————————————————————————————————————————————————————————————————

test('U5 · the leads come on last: the guest saunters in from the left wing from 4.3 (F3: from x −130, his leading bracket in the frame on the downbeat, ≈ 15 px a frame, a 6 px dip on each 8th), the cat dashes in from the right from 4.4 (≈ 44 px a frame, low and leaning), both plant on 4.4a (squash 1.08 / 0.92, light 1.6 → 1)', () => {
  const g = (f: number) => K.walkOn(f, 'guest');
  const c = (f: number) => K.walkOn(f, 'cat');
  assert.equal(g(O.WALK_ON.from - 1).on, false);
  assert.equal(c(O.CAT_DASH.from - 1).on, false);
  assert.equal(g(O.WALK_ON.from).x, K.FRONT.wings.guest);
  assert.equal(c(O.CAT_DASH.from).x, K.FRONT.wings.cat);
  assert.ok(Math.abs(g(O.WALK_ON.to).x - K.FRONT.guest) < 1e-9 && Math.abs(c(O.WALK_ON.to).x - K.FRONT.cat) < 1e-9);
  const gv = (K.FRONT.guest - K.FRONT.wings.guest) / (O.WALK_ON.to - O.WALK_ON.from);
  const cv = (K.FRONT.wings.cat - K.FRONT.cat) / (O.WALK_ON.to - O.CAT_DASH.from);
  assert.ok(gv > 13 && gv < 24 && cv > 38 && cv < 50, `${gv.toFixed(1)} / ${cv.toFixed(1)} px a frame`);
  // F3: on the carriage return (4.3) his leading bracket is already inside the frame: his first step is seen on the downbeat.
  const lead = screen(O.WALK_ON.from, [g(O.WALK_ON.from).x + half(C.GUEST_OUT.onStage, K.FRONT.em), g(O.WALK_ON.from).y])[0];
  assert.ok(lead >= 40, `his ) at x ${lead.toFixed(0)} on 4.3`);
  for (const f of range(O.WALK_ON.from, O.WALK_ON.to)) assert.ok(g(f + 1).x > g(f).x && (f < O.CAT_DASH.from || c(f + 1).x < c(f).x), `${f}: they keep coming`);
  for (const s of O.STEPS) assert.ok(g(s + 2).y - g(s - 0.5).y >= 5, `a step on ${s}`);
  const mid = (O.CAT_DASH.from + O.WALK_ON.to) / 2;
  assert.ok(c(mid).sy < 0.92 && (c(mid).rot ?? 0) > 0.03, 'the cat runs low, leaning into it');
  for (const who of ['guest', 'cat'] as const) {
    const p = K.walkOn(O.WALK_ON.to + 0.25, who);
    assert.ok(p.sy <= 0.93 && p.sx >= 1.07, `${who} plants: ${p.sy.toFixed(3)} / ${p.sx.toFixed(3)}`);
    assert.ok(Math.max(...range(O.WALK_ON.to, O.WALK_ON.to + 6, 0.25).map((f) => K.walkOn(f, who).light)) >= 1.55, `${who} flares on the plant`);
    assert.ok(Math.abs(K.walkOn(O.WALK_ON.to + 6, who).light - 1) < 1e-9);
    assert.ok(Math.abs(K.walkOn(O.WALK_ON.to + 6, who).sy - 1) < 0.02, `${who} recovers in 6`);
  }
  assert.ok(g(O.WALK_ON.to - 1).light < 1.1, 'the guest walks in from the dark');
});

test('A1 · the front row never touches: from the plant to each lead’s departure, ≥ 24 px of screen between the guest’s ink and his and between his and the cat’s, measured on the faces actually drawn (his (－ω－) from the button, set as he sets it, at his squash and swell; the cat’s bow face at its stretch); the guest’s ink stays ≥ 10 px above W5 on every frame he is on stage (U5: his 0.4 em bow too)', () => {
  // His half-width as set (no side bearing: the strictest reading), the cat's and the guest's ink half-widths.
  const heroHalf = (f: number) => {
    const h = K.heroPlace(f);
    return (K.heroFaceEm(f, rounded) / 2) * h.em * h.sx * (1 + K.HOME.swell * K.charge(f));
  };
  const gGo = K.departAt(K.companyMembers().find((m) => m.kind === 'guest')!);
  const cGo = K.departAt(K.companyMembers().find((m) => m.kind === 'cat')!);
  assert.equal(cGo, O.ABSORB.from + K.STREAM.after.cat);
  let least = Infinity;
  for (const f of range(O.WALK_ON.to, cGo, 0.25)) {
    const hero = K.heroPlace(f);
    const hL = screen(f, [hero.centre[0] - heroHalf(f), hero.centre[1]])[0];
    const hR = screen(f, [hero.centre[0] + heroHalf(f), hero.centre[1]])[0];
    if (f < gGo) {
      const g = K.walkOn(f, 'guest');
      const gR = screen(f, [g.x + half(C.GUEST_OUT.onStage, K.FRONT.em * g.sx), g.y])[0];
      assert.ok(hL - gR >= 24, `${f}: the guest meets him (${gR.toFixed(0)} | ${hL.toFixed(0)})`);
      least = Math.min(least, hL - gR);
    }
    const c = K.walkOn(f, 'cat');
    const cL = screen(f, [c.x - half(K.catFace(f), K.FRONT.em * c.sx), c.y])[0];
    assert.ok(cL - hR >= 24, `${f}: ${K.heroFace(f)} meets the cat (${hR.toFixed(0)} | ${cL.toFixed(0)})`);
    least = Math.min(least, cL - hR);
  }
  // His bow face is no wider than (•ω•) + 10 %: the swap on the button closes his eyes in place.
  assert.ok(K.heroFaceEm(O.BOWS.hero, rounded) <= 1.1 * K.heroFaceEm(O.BOWS.hero - 1, rounded), `(－ω－) ${K.heroFaceEm(O.BOWS.hero, rounded).toFixed(2)} em vs (•ω•) ${K.heroFaceEm(O.BOWS.hero - 1, rounded).toFixed(2)}`);
  assert.ok(least >= 24 && least < 200, `${least}`);
  for (const f of range(O.WALK_ON.from, gGo, 0.25)) {
    const g = K.walkOn(f, 'guest');
    const bottom = screen(f, [g.x, g.y + MONO_DESCENT * K.FRONT.em * g.sy])[1];
    const left = screen(f, [g.x - half(C.GUEST_OUT.onStage, K.FRONT.em * g.sx), g.y])[0];
    if (left < W5_BOX.x1) assert.ok(bottom <= W5_BOX.y0 - 10, `${f}: the guest’s ink at ${bottom.toFixed(1)} (W5 at ${W5_BOX.y0})`);
  }
});

// ——— 5.1 → 5.2e: the bows ———————————————————————————————————————————————————————————————————————————————————————————————

test('R2-U5U6-NOTES / R2T-1 / a1 · real bows, ba-da-BUM, each a launch ON its drum: the cat on 5.1, the guest on 5.1&, he on 5.2 — starting on the hit, ≥ 40 % of the dip on + 1 (his ≥ 55 %), ≥ 60 % by + 2, ≥ 75 % by + 3, at the bottom on + down (a 16th; his 4) to ≥ 0.4 em (his 0.45) with squash y ≤ 0.88, the squash deepest on + 2, coming back ≤ 3 % (middle line and top edge), settled by + 6 and held; on 5.2e all three are down together; the bow faces swap on their drum', () => {
  const rest = { cat: K.walkOn(O.BOWS.cat - 1, 'cat').y, guest: K.walkOn(O.BOWS.guest - 1, 'guest').y, hero: K.heroPlace(O.BOWS.hero - 4).centre[1] };
  const yOf = (who: 'cat' | 'guest' | 'hero', f: number) => (who === 'hero' ? K.heroPlace(f).centre[1] : K.walkOn(f, who).y);
  const syOf = (who: 'cat' | 'guest' | 'hero', f: number) => (who === 'hero' ? K.heroPlace(f).sy : K.walkOn(f, who).sy);
  // The top of the face's ink (≈ 0.45 of its em above its middle line, squashed with it), layout px.
  const topOf = (who: 'cat' | 'guest' | 'hero', f: number) => yOf(who, f) - 0.45 * K.FRONT.em * syOf(who, f);
  for (const [who, at, depth, o, first] of [['cat', O.BOWS.cat, 0.4, B.PRINCIPAL, 0.4], ['guest', O.BOWS.guest, 0.4, B.PRINCIPAL, 0.4], ['hero', O.BOWS.hero, 0.45, B.HERO_BOW, 0.55]] as const) {
    const bottom = at + o.down;
    const settled = at + o.settle;
    const d = (yOf(who, bottom) - rest[who]) / K.FRONT.em;
    assert.ok(d >= depth - 1e-9, `${who} dips ${d.toFixed(3)} em`);
    assert.ok(syOf(who, bottom) <= 0.88, `${who} squashes`);
    assert.ok(yOf(who, at) - rest[who] < 0.01 * K.FRONT.em, `${who} starts on its drum`);
    // A launch: most of the dip lands on the hit's own frames (R2T-1: ≥ 60 % by + 2 on the decoded cut; the r4.1 I curve had ≈ 15 %).
    const full = yOf(who, settled) - rest[who];
    const part = (t: number) => (yOf(who, at + t) - rest[who]) / full;
    assert.ok(part(1) >= first && part(2) >= 0.6 && part(3) >= 0.75, `${who}: ${[1, 2, 3].map((t) => (100 * part(t)).toFixed(0)).join(' / ')} % on + 1 / + 2 / + 3`);
    // The squash leads it: deepest on + 2.
    const sys = range(at, settled + 1, 0.25).map((f) => ({ f, sy: syOf(who, f) }));
    const deepestSquash = sys.reduce((a, b) => (b.sy < a.sy ? b : a));
    assert.ok(Math.abs(deepestSquash.f - (at + 2)) <= 0.25, `${who}'s squash deepest on + ${(deepestSquash.f - at).toFixed(2)}`);
    // ≤ 3 % back up, by its middle line and by its top edge.
    const topFull = topOf(who, settled) - topOf(who, at - 1);
    for (const f of range(at, settled + 2, 0.25)) {
      assert.ok(yOf(who, f) - rest[who] <= 1.03 * full, `${f}: ${who} overshoots its bottom`);
      assert.ok(topOf(who, f) - topOf(who, at - 1) <= 1.03 * topFull, `${f}: ${who}'s top edge comes back ${(topOf(who, f) - topOf(who, at - 1) - topFull).toFixed(2)} px`);
    }
    for (const f of range(settled, settled + 6)) assert.ok(Math.abs(yOf(who, f) - yOf(who, settled)) < 1e-9 && Math.abs(syOf(who, f) - syOf(who, settled)) < 1e-9, `${who} held on ${f}`);
    assert.ok((yOf(who, O.TABLEAU) - rest[who]) / K.FRONT.em >= 0.3, `${who} is down on the tableau`);
  }
  assert.ok(O.BOWS.hero + B.HERO_BOW.settle <= O.TABLEAU, 'his pose settled on the tableau, where the dive takes his cell');
  assert.equal(K.catFace(O.BOWS.cat - 1), C.CAT_OUT.face);
  assert.equal(K.catFace(O.BOWS.cat), C.CAT_OUT.bow);
  assert.equal(K.catFace(O.TABLEAU), C.CAT_OUT.bow, 'held');
  assert.equal(K.heroFace(O.BOWS.hero - 1), C.HERO_OUT.alive);
  assert.equal(K.heroFace(O.BOWS.hero), C.HERO_OUT.bow);
  assert.equal(K.heroFace(O.BURST), C.HERO_OUT.wink, 'still winking on the burst');
  // The anticipation: he straightens (y 1 → 1.05) a 32nd before the button.
  assert.ok(Math.abs(K.heroPlace(O.BOWS.hero - 0.01).sy - 1.05) < 0.005 && K.heroPlace(O.ANTICIPATE).sy === 1);
  // The guest's glass tips 70° on his bow and stays tipped (empty); he peeks up smug on the plink.
  const tip = Math.max(...range(O.BOWS.guest, O.BOWS.hero, 0.5).map(K.glassTip));
  assert.ok(Math.abs(tip - (70 * Math.PI) / 180) < 0.08, `tip ${tip}`);
  assert.ok(K.guestPeek(O.DROP.to + 1) >= 1.5 && K.guestPeek(O.DROP.to - 0.5) === 0 && K.guestPeek(O.DROP.to + 7) === 0);
});

test('the last drop leaves the lip and plinks onto W5’s title bar on DROP.to: W5 counts the guest, and its defender row turns friendly', () => {
  const d = K.dropAt(O.DROP.to - 1e-6)!;
  assert.ok(Math.abs(d.y - W5_BOX.rows.title) < 0.1 && d.x > W5_BOX.x0 && d.x < W5_BOX.x1, `lands at ${d.x}, ${d.y}`);
  assert.equal(K.dropAt(O.DROP.to), null);
  assert.ok(K.splash(O.DROP.to).length > 0);
  for (const f of range(O.DROP.from + 2, O.DROP.to, 0.5)) {
    const p = K.dropAt(f)!;
    const q = K.dropAt(f + 0.5) ?? { y: Infinity };
    assert.ok(q.y > p.y, 'falling');
  }
  assert.equal(K.companyFriends(O.DROP.to) - K.companyFriends(O.DROP.to - 1), 1);
  assert.equal(K.companyFriends(O.DROP.to), 8 + 1 + WALL_FACES.length + 1 + 1, 'honest: him and 7, the boot, the wall, the cat, the guest');
});

test('the follow-spot: blooms on him on 4.1e, widens to the whole front row on 4.4&, narrows on the cat on 5.1, glides to the guest on 5.1& and back to him by 5.2; holds on him through the held tableau (U5b); then irises down to his width by the fold (the CRT’s light collapsing onto him), gone 3 frames into it', () => {
  const s = K.followSpot;
  assert.equal(s(O.HOP.to - 1), null);
  assert.ok(s(O.HOP.to + 8)!.alpha >= 0.07 && Math.abs(s(O.HOP.to + 8)!.x - 960) < 1);
  assert.ok(s(O.CALLS[7] + 9)!.w >= 1200, 'the front row whole');
  assert.ok(Math.abs(s(O.BOWS.cat + 10)!.x - K.FRONT.cat) < 10 && s(O.BOWS.cat + 10)!.w <= 560, 'on the cat');
  assert.ok(Math.abs(s(O.BOWS.guest + 9)!.x - K.FRONT.guest) < 10, 'on the guest');
  assert.ok(Math.abs(s(O.BOWS.hero)!.x - 960) < 1e-6, 'back on him for the button');
  const hisWidth = 2.46 * K.FRONT.em * (1 + K.HOME.swell);
  assert.ok(s(O.FOLD.from)!.w <= hisWidth * 1.05, `${s(O.FOLD.from)!.w.toFixed(0)} vs his ${hisWidth.toFixed(0)}`);
  for (const f of range(O.TABLEAU, O.TABLEAU_HOLD.to)) assert.ok(Math.abs(s(f)!.w - K.SPOT.w) < 6 && Math.abs(s(f)!.x - 960) < 1e-6, `${f}: on him, open`);
  for (const f of range(O.POWER_DOWN.from, O.FOLD.from)) assert.ok(s(f + 1)!.w < s(f)!.w, `${f}: closing`);
  assert.equal(s(O.FOLD.from + 3), null);
});

// ——— 5.2 → 5.3: the power-down, the stream, the fold, the dive (U6: one continuous move) ————————————————————————————————————

test('U6 · the power-down: from the end of the held tableau (U5b: 5.2&) the stage’s light falls like a CRT’s (≈ (1 − u)², fastest first), never by more than 25 % in a frame, and the vignette closes onto him; W5 goes out with it by the fold; nothing dims before', () => {
  assert.equal(O.POWER_DOWN.from, O.TABLEAU_HOLD.to);
  for (const f of range(O.BOWS.hero, O.TABLEAU_HOLD.to, 0.5)) assert.ok(K.stageLevel(f) === 1 && K.stageDim(f, 100, 100) === 1 && K.w5Level(f) === 1, `${f}: the held tableau is lit`);
  assert.equal(K.stageLevel(O.POWER_DOWN.from - 0.25), 1);
  for (const f of range(O.POWER_DOWN.from, O.POWER_DOWN.to)) {
    const [a, b] = [K.stageLevel(f), K.stageLevel(f + 1)];
    assert.ok(b < a && b >= 0.75 * a, `${f}: ${a.toFixed(3)} → ${b.toFixed(3)}`);
  }
  for (const f of range(O.POWER_DOWN.from, O.POWER_DOWN.from + 12)) {
    const u = (f - O.POWER_DOWN.from) / (O.POWER_DOWN.to - O.POWER_DOWN.from);
    assert.ok(Math.abs(K.stageLevel(f) - (1 - u) ** 2) < 1e-9, `${f}`);
  }
  assert.ok(K.stageLevel(O.POWER_DOWN.to - 1) < 0.06, 'all but out on the landing');
  for (const f of range(O.POWER_DOWN.from, O.FOLD.from)) assert.ok(K.vignetteR(f + 1) < K.vignetteR(f), `${f}: the vignette closes`);
  assert.ok(K.vignetteR(O.POWER_DOWN.from) >= 2400, 'the whole frame lit on the button');
  // Far from him the stage goes first; near him it holds longest.
  const f = O.at(5, 3);
  assert.ok(K.stageDim(f, 960 + 900, 300) < 0.5 * K.stageDim(f, 960 + 150, 800));
  assert.equal(K.w5Level(O.POWER_DOWN.from - 1), 1);
  assert.equal(K.w5Level(O.FOLD.from), 0);
  for (const g of range(O.POWER_DOWN.from, O.FOLD.from)) assert.ok(K.w5Level(g + 1) <= K.w5Level(g));
});

test('U6 / U5b · the company streams home after the held tableau: the headliners in call order hopping out from 5.2&, the wall from the outside in, the guest and the cat rising out of their bows last — each principal’s and headliner’s flight ≥ 8 frames; someone in flight on every frame 5.2 + 3 → the fold; all home by FOLD.from, nothing drawn from FOLD.from + 1', () => {
  const members = K.companyMembers();
  assert.equal(members.length, K.WALL_FACES_LAID.length + C.HEADLINERS.length + 2);
  for (const m of members) {
    const [td, ta] = [K.departAt(m), K.arriveAt(m)];
    assert.ok(td >= O.ABSORB.from && ta <= O.FOLD.from + 1e-9 && ta - td >= 3, `${m.face}: ${td.toFixed(2)} → ${ta.toFixed(2)}`);
    if (m.kind !== 'wall') assert.ok(ta - td >= 8, `${m.face} flies ${(ta - td).toFixed(2)} frames`);
    assert.ok(td >= O.TABLEAU_HOLD.to, `${m.face} holds its place through the held tableau`);
    assert.equal(K.streamAt(m, td - 0.01, rounded), null);
    assert.equal(K.gone(td - 0.01, m), false);
    assert.equal(K.gone(td, m), true);
    // It reads where it stood as it lets go: held at its place beside him for its first frame (the dive moves him; it moves with him).
    const held = K.streamAt(m, td + 0.45, rounded)!;
    const fl = K.flightOf(m);
    const hisNow = screen(td + 0.45, K.CELL());
    assert.ok(Math.abs(held.centre[0] - hisNow[0] - (fl.at0[0] - fl.him0[0])) < 1 && held.w === 0, `${m.face} reads where it stood as it lets go`);
    const near = K.streamAt(m, ta - 1e-3, rounded)!;
    const home = K.homeOf(m, ta - 1e-3);
    // A spark ends in his centre; a face passes over its place on top of his head and is gulped into his outline (review a2).
    const end = m.kind === 'wall' ? home : K.contactOf(m, ta - 1e-3, rounded);
    assert.ok(Math.hypot(near.centre[0] - end[0], near.centre[1] - end[1]) < 3, `${m.face} reaches him`);
    if (m.kind !== 'wall') {
      const over = K.streamAt(m, ta - K.STREAM.last, rounded)!;
      const place = K.homeOf(m, ta - K.STREAM.last);
      assert.ok(Math.abs(over.centre[0] - place[0]) < 0.25 * Math.abs(K.flightOf(m).at0[0] - K.flightOf(m).him0[0]) + 40 && over.centre[1] <= place[1] + 1, `${m.face} comes over the top to its place before its gulp`);
    }
    if (m.kind === 'wall') assert.deepEqual(home, screen(ta - 1e-3, K.CELL()), 'a spark into his centre');
    else {
      const pl = K.heroPlace(ta - 1e-3);
      const across = K.landAt(m) * pl.em * (1 + K.HOME.swell * K.charge(ta - 1e-3)) * pl.sx * K.stageAim(ta - 1e-3).zoom;
      assert.ok(home[1] < screen(ta - 1e-3, K.CELL())[1] - 30 && Math.abs(home[0] - screen(ta - 1e-3, K.CELL())[0] - across) < 1e-6, `${m.face} onto its place on top of his head`);
    }
    assert.ok(near.alpha < 0.01, `${m.face} goes into him`);
    assert.equal(K.streamAt(m, ta, rounded), null);
  }
  const wall = members.filter((m) => m.kind === 'wall');
  const byRow = (r: number) => Math.min(...wall.filter((m) => m.row === r).map(K.departAt));
  assert.ok(byRow(0) < byRow(K.WALL_ROWS - 1), 'the back rows first');
  const heads = members.filter((m) => m.kind === 'headliner').sort((a, b) => a.order - b.order);
  for (let i = 1; i < heads.length; i++) assert.ok(K.departAt(heads[i]) > K.departAt(heads[i - 1]), 'in call order');
  const lead = members.filter((m) => m.kind === 'guest' || m.kind === 'cat');
  assert.ok(K.departAt(heads[0]) === O.ABSORB.from && K.departAt(heads.at(-1)!) <= Math.min(...lead.map(K.departAt)), 'the headliners hop out in call order from 5.2&, the leads after them (F1)');
  for (const f of range(O.SLAM.from, O.FOLD.from, 0.5)) assert.ok(members.some((m) => K.streamAt(m, f, rounded) !== null), `${f}: someone is in flight`);
  for (const F of range(O.FOLD.from + 1, O.SLAM.to + 1))
    for (const f of subs(F)) {
      const s = K.streamers(f, L);
      assert.equal(s.wall.length + s.faces.length + s.shapes.length, 0, `${F} (${f.toFixed(3)}): something still in flight`);
    }
  assert.equal(K.charge(O.ABSORB.from), 0);
  assert.equal(K.charge(O.FOLD.from), 1);
  for (const f of range(O.ABSORB.from, O.FOLD.from, 0.25)) assert.ok(K.charge(f + 0.25) >= K.charge(f), `${f}: he only fills`);
});

test('the colour law: nothing red on any frame from ABSORB.to (the guest warms to amber as he comes home), and nothing red-orange on the █', () => {
  const red = (c: readonly number[]) => c[0] > 0.3 && c[1] < 0.12 * c[0] && c[2] < 0.1 * c[0];
  for (const f of range(O.ABSORB.to, O.SLAM.to, 0.25)) {
    const s = K.streamers(f, L);
    const st = K.stageContent(f, { mono, ...L });
    for (const g of [...s.faces, ...s.wall, ...Object.values(st.glyphs).flat()]) assert.ok(!red(g.color), `${f}: ${g.ch} is red`);
    for (const sh of [...s.shapes, ...st.over, ...st.under]) assert.ok(!red(sh.color), `${f}: a red shape`);
    const cur = K.heroContent(f, rounded).cursor;
    if (cur) assert.ok(!red(cur.color), `${f}: the █ is red`);
  }
});

test('U6 · the dive: from the button to 5.3 the camera’s zoom grows on every frame (the push’s speed carried in, no stall), 64 sub-frames; he is ≥ 80 px, centred, and his scale on screen grows to the fold; the █ is born at his centre on FOLD.from + 1 and grows on screen on every frame to the landing, whole on FOLD.to', () => {
  const zoom = (f: number) => K.stageAim(f).zoom;
  for (const f of range(O.POWER_DOWN.from, O.SLAM.to)) assert.ok(zoom(f + 1) > zoom(f), `${f}: ×${zoom(f).toFixed(3)} → ×${zoom(f + 1).toFixed(3)}`);
  const v = (f: number) => Math.log(zoom(f + 0.01) / zoom(f)) / 0.01;
  assert.ok(Math.abs(v(O.SLAM.from - 0.02) - v(O.SLAM.from + 0.001)) < 1e-3, 'the push’s speed carried in');
  const a0 = K.stageAim(O.SLAM.from - 1e-6);
  const a1 = K.stageAim(O.SLAM.from);
  assert.ok(Math.abs(a0.zoom - a1.zoom) < 1e-4 && Math.abs(a0.x - a1.x) < 1e-2 && Math.abs(a0.y - a1.y) < 1e-2);
  for (const f of range(O.BOWS.hero - 1, O.SLAM.to)) assert.equal(K.companyTemporal(f).samples, 64);
  const scale = (f: number) => K.heroPlace(f).em * K.heroPlace(f).sx * (1 + K.HOME.swell * K.charge(f)) * zoom(f);
  for (const f of range(O.BOWS.hero, O.FOLD.from)) assert.ok(scale(f + 1) > scale(f), `${f}: his scale on screen`);
  const block = (f: number) => {
    const c = K.heroContent(f, rounded).cursor;
    return c ? 1.31 * c.size * zoom(f) : 0;
  };
  assert.equal(block(O.FOLD.from), 0);
  for (const f of range(O.FOLD.from + 1, O.SLAM.to)) assert.ok(block(f + 1 - 1e-9) > block(f), `${f}: █ ${block(f).toFixed(0)} → ${block(f + 1 - 1e-9).toFixed(0)} px`);
  assert.ok(Math.abs(K.blockGrow(O.FOLD.to) - 1) < 1e-12 && K.foldAt(O.FOLD.to) === 1);
  for (const f of range(O.BOWS.hero, O.SLAM.to, 0.25)) {
    const z = zoom(f);
    const c = K.heroContent(f, rounded);
    const face = c.rounded.length ? Math.max(...c.rounded.slice(0, 5).map((g) => g.size)) * z : 0;
    const cursor = c.cursor ? 1.31 * c.cursor.size * z : 0;
    assert.ok(Math.max(face, cursor) >= 80, `${f}: face ${face.toFixed(0)} px, █ ${cursor.toFixed(0)} px`);
    const [x, y] = screen(f, K.CELL());
    assert.ok(x > 640 && x < 1280 && y > 360 && y < 900, `${f}: he is at ${x.toFixed(0)}, ${y.toFixed(0)}`);
  }
  // U5b: the push carries him ≈ 130 px an em on 5.3 (the stream reads round a face still on its stage) and ≈ 300 px by the fold.
  const em = (f: number) => K.heroPlace(f).em * (1 + K.HOME.swell * K.charge(f)) * zoom(f);
  assert.ok(em(O.at(5, 3)) >= 115 && em(O.at(5, 3)) <= 170, `${em(O.at(5, 3)).toFixed(0)} px on 5.3`);
  assert.ok(em(O.FOLD.from) >= 260 && em(O.FOLD.from) <= 400, `${em(O.FOLD.from).toFixed(0)} px on the fold`);
});

test('the landing: the dive puts his cell exactly where S01 has its cursor on frame −48 — (1141, 540) at ×15.08, the █ at 22 px, its centre fixed at his bowed centre from the tableau', () => {
  for (const f of range(O.TABLEAU, O.SLAM.to, 0.5)) assert.deepEqual(K.heroPlace(f).centre, K.CELL(), `${f}: held`);
  assert.ok(Math.abs(K.heroContent(O.SLAM.to - 1e-9, rounded).cursor!.size - 22) < 1e-6, 'S01’s 22 px on landing');
  const a = K.stageAim(O.SLAM.to);
  assert.ok(Math.abs(a.zoom - CURSOR_AT_SLAM.zoom) < 1e-9);
  const [sx, sy] = screen(O.SLAM.to, K.CELL());
  assert.ok(Math.abs(sx - CURSOR_AT_SLAM.at[0]) < 1e-6 && Math.abs(sy - CURSOR_AT_SLAM.at[1]) < 1e-6, `${sx}, ${sy}`);
  const p = introCamera(O.SLAM.to - O.LOOP, [0, 0]);
  const z = 3062.5 / (p.position[2] - p.target[2]);
  const [cx, cy] = cellCenter(0, 0);
  const s01 = [960 + (cx - p.target[0]) * z, 540 - (cy - p.target[1]) * z];
  assert.ok(Math.abs(z - a.zoom) / a.zoom < 2e-3, `zoom ${z} vs ${a.zoom}`);
  assert.ok(Math.abs(s01[0] - sx) < 2 && Math.abs(s01[1] - sy) < 2, `S01 has it at ${s01}`);
});

test('the fold over a 16th (U6): his glyphs slide in and shrink on every frame, no step over 30 % of their start; glyphs and █ both visible on FOLD.from + 1 … + 4; amber to FOLD.to, and (F2) the turn to the cursor’s green lands on the tick: under half way on 5.3 − 1, whole on 5.3', () => {
  const ink = (f: number) => {
    const face = K.heroContent(f, rounded).rounded.slice(0, 5);
    if (!face.length) return 0;
    return Math.max(...face.map((g) => g.x + (rounded(g.ch) * g.size * (g.stretch ?? 1)) / 2)) - Math.min(...face.map((g) => g.x - (rounded(g.ch) * g.size * (g.stretch ?? 1)) / 2));
  };
  const w = range(O.FOLD.from, O.FOLD.to + 1).map(ink);
  for (let i = 1; i < w.length; i++) {
    assert.ok(w[i] < w[i - 1], `${O.FOLD.from + i}: ${w[i].toFixed(0)} after ${w[i - 1].toFixed(0)}`);
    assert.ok(w[i - 1] - w[i] <= 0.3 * w[0], `${O.FOLD.from + i}: a step of ${((w[i - 1] - w[i]) / w[0]).toFixed(2)}`);
  }
  for (const f of range(O.FOLD.from + 1, O.FOLD.from + 5)) {
    const c = K.heroContent(f, rounded);
    assert.ok(c.rounded.length >= 5 && c.cursor && c.cursor.size > 0, `${f}: both`);
  }
  assert.equal(K.heroContent(O.FOLD.to, rounded).rounded.length, 0);
  assert.equal(K.heroCool(O.FOLD.to), 0);
  assert.equal(K.heroCool(O.SLAM.to), 1);
  assert.ok(K.heroCool(O.SLAM.to - 1) < 0.5 && K.heroCool(O.FOLD.to + 1) < 0.15, 'amber on 5.2a + 4, lime on 5.3 − 1');
  for (const f of range(O.FOLD.to, O.SLAM.to)) assert.ok(K.heroCool(f + 1) - K.heroCool(f) >= K.heroCool(f) - K.heroCool(Math.max(O.FOLD.to, f - 1)) - 1e-12, `${f}: the turn speeds up into the tick`);
});

test('F3: he is the brightest thing from his bow to the landing — nothing coming home is drawn brighter — and he flares as each principal comes home', () => {
  for (const f of range(O.BOWS.hero, O.SLAM.to, 0.25)) {
    const c = K.heroContent(f, rounded);
    const him = c.rounded.length ? lum(c.rounded[0].color) : lum(c.cursor!.color);
    const s = K.streamers(f, L);
    for (const g of [...s.wall, ...s.faces]) assert.ok(lum(g.color) * (g.alpha ?? 1) < him, `${f}: ${g.ch} (${lum(g.color).toFixed(2)}) outshines him (${him.toFixed(2)})`);
    const st = K.stageContent(f, { mono, ...L });
    for (const g of Object.values(st.glyphs).flat()) assert.ok(lum(g.color) * (g.alpha ?? 1) < him, `${f}: ${g.ch} on stage outshines him`);
  }
  const cat = K.companyMembers().find((m) => m.kind === 'cat')!;
  const ta = K.arriveAt(cat);
  assert.ok(K.arrivalFlare(ta) >= 0.1 && K.arrivalFlare(ta - 0.01) < K.arrivalFlare(ta), 'the cat comes home: a flare');
});

test('F3: short trails — over an output frame a spark moves ≤ 40 px and a face ≤ 24 px (the stream’s own shutters), and a face coming home is never drawn over his until its gulp', () => {
  for (const F of range(O.ABSORB.from, O.FOLD.from + 1))
    for (const m of K.companyMembers()) {
      const k = m.kind === 'wall' ? K.STREAM.shutter.spark : K.STREAM.shutter.face;
      const [a, b] = [K.streamAt(m, K.streamTime(F - 0.25, k), rounded), K.streamAt(m, K.streamTime(F + 0.25, k), rounded)];
      if (!a || !b) continue;
      const d = Math.hypot(a.centre[0] - b.centre[0], a.centre[1] - b.centre[1]);
      assert.ok(d <= (m.kind === 'wall' ? 40 : 24), `${F}: ${m.face} trails ${d.toFixed(0)} px`);
    }
  for (const f of range(O.ABSORB.from, O.FOLD.from, 0.25)) {
    const z = K.stageAim(f).zoom;
    const a = K.stageAim(f);
    const hero = K.heroContent(f, rounded).rounded.slice(0, 5);
    const xs = hero.map((g) => 960 + (g.x - a.x) * z);
    const box = { x0: Math.min(...xs) - 0.18 * hero[0].size * z, x1: Math.max(...xs) + 0.18 * hero[0].size * z, y: 540 - (hero[2].y - a.y) * z, h: 0.45 * hero[2].size * z };
    for (const m of K.companyMembers()) {
      if (m.kind === 'wall') continue;
      const s = K.streamAt(m, f, rounded);
      // (Its gulp, over its last frames, takes it into his outline on purpose: the a2 test below.)
      if (!s || s.alpha < 0.05 || s.scale > 0.9 || K.gulpOf(m, f) > 0) continue;
      const hw = ([...m.face].reduce((acc, ch) => acc + cellWidth(ch), 0) * 0.6 * s.em) / 2 - 0.06 * s.em;
      const apart = s.centre[0] + hw < box.x0 || s.centre[0] - hw > box.x1 || Math.abs(s.centre[1] - box.y) > box.h + 0.4 * s.em;
      assert.ok(apart, `${f}: ${m.face} over his face`);
    }
  }
});

test('F7: on stage the guest is set a glyph at a time, his ￣ dropped to his eye line', () => {
  const st = K.stageContent(O.BOWS.guest - 2, { mono, ...L });
  const guest = st.glyphs.faces.filter((g) => ([...C.GUEST_OUT.onStage].includes(g.ch) && g.ch !== 'ω') || g.ch === '￣');
  const brows = guest.filter((g) => g.ch === '￣');
  const paren = guest.find((g) => g.ch === '(')!;
  assert.equal(brows.length, 2);
  for (const b of brows) assert.ok(Math.abs(paren.y - b.y - 0.28 * b.size) < 1e-6, `${paren.y - b.y}`);
});

test('every face on the wall is drawable in the wall’s font (the mono stack): none would print as tofu', async () => {
  const fs = await import('node:fs');
  const { readCoverage } = (await import('../scripts/lib/cmap.mjs' as string)) as { readCoverage: (b: Uint8Array) => Set<number> };
  const { findMissing } = (await import('../scripts/check-glyphs.mjs' as string)) as { findMissing: (t: unknown, c: unknown, s: unknown) => unknown[] };
  const { FONT_FILES, STACKS } = await import('../src/engine/fonts.ts');
  const { WALL_TEXTS } = await import('../src/shots/outroWall.ts');
  const coverage = new Map<string, Set<number>>();
  for (const f of FONT_FILES) coverage.set(f.family, new Set([...(coverage.get(f.family) ?? []), ...readCoverage(fs.readFileSync(new URL(`../public/${f.file}`, import.meta.url)))]));
  assert.deepEqual(findMissing(WALL_TEXTS, coverage, STACKS), []);
});

test('the █ keeps its light through amber → green (integrator, v12: its luminance dipped under the bloom threshold mid-turn and the halo went out for one frame, 5806), and never turns pale yellow-white', () => {
  const [from, to] = [INKS.hero, INK.green];
  const floor = Math.min(lum(from), lum(to));
  for (const k of range(0, 1.0001, 0.02)) {
    const c = K.coolInk(from, to, k);
    assert.ok(lum(c) >= floor - 1e-9, `k ${k.toFixed(2)}: luminance ${lum(c).toFixed(3)} under ${floor.toFixed(3)}`);
    assert.ok(Math.min(...c) < 0.5 * Math.max(...c), `k ${k.toFixed(2)}: (${c.map((v) => v.toFixed(2)).join(', ')}) washes out`);
  }
  for (const f of range(O.FOLD.to, O.SLAM.to, 0.25)) {
    const cur = K.heroContent(f, rounded).cursor!;
    assert.ok(lum(cur.color) >= 1.1 * floor - 1e-9, `${f}: the █'s light ${lum(cur.color).toFixed(3)}`);
  }
});

// ——— Ending fixer a, round 1 (reviews A1–A8, F1–F3) ——————————————————————————————————————————————————————————————————————————

test('F1 / A5 · the company comes home one after another, each onto its own place: the headliners hop out in call order 1.5 frames apart and land along the top of his head left to right, the guest on his left shoulder, the cat on his right two frames after him, last; no two faces coming home overlap in ink on any output frame, and each stays at ≥ 40 % of its size until its last two frames', () => {
  const faces = K.companyMembers().filter((m) => m.kind !== 'wall');
  const heads = faces.filter((m) => m.kind === 'headliner').sort((a, b) => a.order - b.order);
  const guest = faces.find((m) => m.kind === 'guest')!;
  const cat = faces.find((m) => m.kind === 'cat')!;
  for (let i = 1; i < heads.length; i++) {
    assert.ok(K.arriveAt(heads[i]) - K.arriveAt(heads[i - 1]) >= 1, `${heads[i].face} lands after ${heads[i - 1].face}`);
    assert.ok(K.landAt(heads[i]) > K.landAt(heads[i - 1]), 'left to right in call order');
  }
  assert.ok(K.landAt(guest) < K.landAt(heads[0]) && K.landAt(cat) > K.landAt(heads.at(-1)!), 'the leads on his shoulders');
  assert.ok(K.arriveAt(cat) - K.arriveAt(guest) >= 2 && K.arriveAt(cat) <= O.FOLD.from && K.arriveAt(guest) > K.arriveAt(heads.at(-1)!), 'the headliners, the guest, then the cat, last');
  const arrivals = faces.map(K.arriveAt).sort((a, b) => a - b);
  assert.ok(arrivals.at(-1)! - arrivals[0] >= 5, `arrivals spread over ${(arrivals.at(-1)! - arrivals[0]).toFixed(2)} frames`);
  for (const F of range(O.ABSORB.from, O.FOLD.from + 1)) {
    const boxes: { face: string; x0: number; x1: number; y0: number; y1: number }[] = [];
    for (const m of faces) {
      const st = K.streamAt(m, K.streamTime(F, K.STREAM.shutter.face), rounded);
      if (!st || st.alpha < 0.1) continue;
      if (F < K.arriveAt(m) - K.STREAM.last) assert.ok(st.scale >= K.STREAM.faceShrink - 1e-9, `${F}: ${m.face} at ${st.scale.toFixed(2)}`);
      const hw = half(m.face, st.em);
      boxes.push({ face: m.face, x0: st.centre[0] - hw, x1: st.centre[0] + hw, y0: st.centre[1] - 0.42 * st.em, y1: st.centre[1] + 0.42 * st.em });
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        assert.ok(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0, `${F}: ${a.face} and ${b.face} overlap`);
      }
  }
});

test('A2 / U5b · the button gets its held picture: he is down 4 frames after it (a launch), settled by the tableau and held; through the held tableau (5.2e → 5.2&) nobody leaves and nothing dims; then the wall lets go from the outside in (the farthest first), its sparks home before the fold', () => {
  const bottom = O.BOWS.hero + B.HERO_BOW.down;
  const settled = O.BOWS.hero + B.HERO_BOW.settle;
  assert.ok(settled <= O.TABLEAU);
  for (const f of range(bottom, settled)) assert.ok(Math.abs(K.heroPlace(f).centre[1] - K.heroPlace(settled).centre[1]) < 0.03 * B.HERO_BOW.dip * K.FRONT.em, `${f}: at the bottom (≤ 3 % from it)`);
  for (const f of range(settled, O.FOLD.from)) assert.ok(Math.abs(K.heroPlace(f).centre[1] - K.heroPlace(settled).centre[1]) < 1e-9, `${f}: held`);
  for (const m of K.companyMembers()) assert.ok(!K.gone(O.TABLEAU_HOLD.to - 0.01, m), `${m.face} still in its seat through the held tableau`);
  const wall = K.companyMembers().filter((m) => m.kind === 'wall');
  const far = wall.filter((m) => m.near < 0.1);
  const near = wall.filter((m) => m.near > 0.9);
  assert.ok(Math.max(...far.map(K.departAt)) < Math.min(...near.map(K.departAt)), 'the outside first');
  const arrivals = wall.map(K.arriveAt);
  assert.ok(Math.min(...arrivals) >= O.TABLEAU_HOLD.to + 4 && Math.max(...arrivals) <= O.FOLD.from - 0.5, `${Math.min(...arrivals)} → ${Math.max(...arrivals)}`);
});

test('A3 · the carriage return on 4.3: the stage camera punches 0.02 like the rig does the claps on 4.2 / 4.4 (peak 1.5 frames in, nothing from + 14), riser B’s line flashes + 80 % at its left end (+ 40 % on the other kicks), and a pool of light blooms under B1', () => {
  const at = K.KICK_PUNCH.at;
  assert.equal(at, O.CALLS[4]);
  assert.ok(K.stageAim(at + 1.5).zoom > 1.015 * K.stageAim(at - 0.5).zoom, 'the punch');
  assert.ok(K.stageAim(at + 14).zoom < 1.001 * K.stageAim(at - 0.5).zoom * K.STAGE.push ** (14.5 / (O.STAGE_PUSH.to - O.STAGE_PUSH.from)), 'gone by + 14');
  const st = (f: number) => K.stageContent(f, { mono, ...L });
  const riserB = (f: number, left: boolean) => st(f).under.filter((u) => u.kind === 'rect' && Math.abs(u.y - (540 - K.LINES.ys[1])) < 0.1).at(left ? 0 : -1)!.alpha!;
  assert.ok(riserB(at, true) >= 1.79 * riserB(at - 2, true), `${riserB(at, true)} vs ${riserB(at - 2, true)}`);
  assert.ok(riserB(at + 0.25, true) > riserB(at + 0.25, false), 'brightest at its left end');
  assert.ok(Math.abs(riserB(at + 6, true) - riserB(at - 2, true)) < 1e-9, 'back in 6');
  assert.ok(st(at + 0.25).light.some((l) => l.kind === 'ellipse' && Math.abs(l.x - (K.headlinerSeat(4).at[0] - 960)) < 1), 'the pool under B1');
});

test('A4 · the roll call shows off the worlds: each call from 4.1& flashes its headliner in its own world’s ink and signature for 5 frames (decaying back to phosphor), the boot’s prints in; he glances toward each call and pumps his arms ヽ(•ω•)ﾉ on the claps 4.2 and 4.4', () => {
  const ink = (k: number, f: number) => {
    const h = K.headlinerAt(k, f)!;
    return K.stageContent(f, { mono, ...L }).glyphs.faces.filter((g) => g.ch === C.HEADLINERS[k].face && Math.abs(g.x - (h.centre[0] - 960)) < 1 && Math.abs(g.y - (540 - h.centre[1])) < 1).at(-1)!.color;
  };
  assert.equal(K.worldK(0, O.CALLS[0] + 1), 0);
  for (const k of range(1, 8)) {
    const call = O.CALLS[k];
    assert.ok(K.worldK(k, call + 0.25) > 0.85 && K.worldK(k, call + K.WORLD_FLASH.frames) === 0 && K.worldK(k, call - 1) === 0, `${C.HEADLINERS[k].world}`);
    const [a, b] = [ink(k, call + 0.25), ink(k, call + 8)];
    const diff = Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    assert.ok(diff > 0.2, `${C.HEADLINERS[k].world} wears its world on its call (Δ ${diff.toFixed(2)})`);
    const wf = K.worldFlash(k, call + 0.25, { face: C.HEADLINERS[k].face, centre: K.headlinerAt(k, call + 0.25)!.centre, em: 50, emX: 50 }, L.plan);
    assert.ok(wf.shapes.length + wf.ghosts.length > 0, `${C.HEADLINERS[k].world}: its signature`);
  }
  // The glance: toward each call's side, within its 0.07 / 0.05 em; front by 4.4a + 2; to the cat on its bow, to the guest on his.
  for (const k of range(1, 8)) {
    const [gx, gy] = K.glance(O.CALLS[k] + K.GLANCE.frames);
    const side = Math.sign(K.headlinerSeat(k).at[0] - K.FRONT.hero);
    assert.ok(Math.sign(gx) === side && gy > 0 && Math.hypot(gx / K.GLANCE.x, gy / K.GLANCE.y) <= 1.0001, `call ${k + 1}: ${gx.toFixed(3)}, ${gy.toFixed(3)}`);
  }
  assert.ok(Math.hypot(...K.glance(O.WALK_ON.to + 2)) < 1e-9);
  assert.ok(K.glance(O.BOWS.cat + 2)[0] > 0.06 && K.glance(O.BOWS.guest + 2)[0] < -0.06);
  // The pumps: his typed arms on each clap of the encore, gone by + 9; none between them.
  const arms = (f: number) => K.heroContent(f, rounded).rounded.filter((g) => g.ch === 'ヽ' || g.ch === 'ﾉ');
  for (const c of [O.CLAPS[0], O.CLAPS[1]]) {
    for (const f of range(c, c + 6)) assert.equal(arms(f).length, 2, `${f}: the pump`);
    assert.ok(arms(c + 2)[0].y > arms(c)[0].y, 'up');
    assert.equal(arms(c + K.PUMP.hold + K.PUMP.out).length, 0);
  }
  for (const f of [O.CALLS[1], O.CALLS[4], O.WALK_ON.to, O.BOWS.cat]) assert.equal(arms(f).length, 0, `${f}`);
});

test('A6 · the plink plays in the picture: a 15 px drop, a crown to r 44, the title rule dipping 5 px under it (back by + 6) and flaring pink for 4 frames', () => {
  const crown = (f: number) => Math.max(...K.splash(f).filter((sh) => sh.w === K.PLINK.droplet).map((sh) => Math.hypot(sh.x - (K.DROP_AT[0] - 960), sh.y - (540 - K.DROP_AT[1]))));
  assert.ok(crown(O.DROP.to + 3) >= 0.6 * K.PLINK.crown, `${crown(O.DROP.to + 3)}`);
  const dip = Math.max(...range(O.DROP.to, O.DROP.to + 6, 0.25).map((f) => K.plinkRule(f, K.DROP_AT[0]).dip));
  assert.ok(Math.abs(dip - 5) < 0.3, `${dip}`);
  assert.equal(K.plinkRule(O.DROP.to + 6, K.DROP_AT[0]).dip, 0);
  assert.equal(K.plinkRule(O.DROP.to + 1, K.DROP_AT[0] + K.PLINK.reach + 1).dip, 0);
  assert.ok(K.plinkFlare(O.DROP.to) === 1 && K.plinkFlare(O.DROP.to + 4) === 0);
});

test('A7 · the █ lands carrying on into S01’s drift: the dive’s last 6 frames bend its path out to the right and back, so on the landing it moves left at S01’s own 3.56 px a frame; the landing point and the rest of the dive are untouched', () => {
  const x = (f: number) => screen(f, K.CELL())[0];
  assert.equal(K.diveBend(O.SLAM.to - K.DIVE_BEND.frames), 0);
  assert.ok(Math.abs(K.diveBend(O.SLAM.to)) < 1e-9);
  const v = (x(O.SLAM.to - 1e-3) - x(O.SLAM.to - 0.101)) / 0.1;
  const p0 = introCamera(O.SLAM.to - O.LOOP, [0, 0]);
  const p1 = introCamera(O.SLAM.to - O.LOOP + 1, [0, 0]);
  const [cx] = cellCenter(0, 0);
  const s01 = (p: typeof p0) => 960 + (cx - p.target[0]) * (3062.5 / (p.position[2] - p.target[2]));
  const drift = s01(p1) - s01(p0);
  assert.ok(Math.abs(drift - K.DIVE_BEND.drift) < 0.05, `S01 drifts ${drift.toFixed(3)} px a frame`);
  assert.ok(Math.abs(v - drift) < 0.8, `the █ lands moving ${v.toFixed(2)} px a frame (S01 ${drift.toFixed(2)})`);
  for (const f of range(O.SLAM.to - K.DIVE_BEND.frames, O.SLAM.to)) assert.ok(K.diveBend(f) >= 0 && K.diveBend(f) < 25, `${f}: ${K.diveBend(f).toFixed(1)}`);
});

test('A8 · the ✧ winks out on the burst: it swells, then spins down to nothing by + 6, bright to the end (α ≥ 0.6 of its own), never a dim smudge', () => {
  const star = (f: number) => K.heroContent(f, rounded).rounded.filter((g) => g.ch === C.HERO_OUT.star);
  const body = (f: number) => star(f)[1]?.size ?? 0;
  assert.ok(body(O.BURST + 1.5) > body(O.BURST), 'it swells');
  for (const f of range(O.BURST + 2, O.BURST + 5.5, 0.5)) assert.ok(body(f + 0.5) < body(f), `${f}: it shrinks`);
  for (const f of range(O.BURST, O.BURST + 6, 0.25)) assert.ok((star(f)[1]?.alpha ?? 1) >= 0.6 - 1e-9, `${f}: α ${star(f)[1]?.alpha}`);
  assert.equal(star(O.BURST + 6).length, 0);
});

test('F2 · tick 1 is an impact: from the fold on, the █ grows on screen faster on every frame into the landing (≥ 10 % on its last), and turns from amber to the cursor’s green (and to its light) on the tick, not before', () => {
  const block = (f: number) => K.heroContent(f, rounded).cursor!.size * K.stageAim(f).zoom;
  const g = range(O.FOLD.to, O.SLAM.to + 1).map((f) => block(Math.min(f, O.SLAM.to - 1e-9)));
  for (let i = 2; i < g.length; i++) {
    const [a, b] = [g[i - 1] / g[i - 2] - 1, g[i] / g[i - 1] - 1];
    assert.ok(b > 0.05 && b >= a - 1e-9, `${O.FOLD.to + i}: grows ${(b * 100).toFixed(1)} % after ${(a * 100).toFixed(1)} %`);
  }
  assert.ok(g.at(-1)! / g.at(-2)! - 1 >= 0.1, 'an impact');
  const ink = (f: number) => K.heroContent(f, rounded).cursor!.color;
  const [amber, mid, green] = [ink(O.FOLD.to + 1), ink(O.SLAM.to - 1), ink(O.SLAM.to - 1e-9)];
  assert.ok(amber[0] > amber[1] && mid[0] > 0.5 * amber[0], 'still amber-ish on 5.3 − 1');
  assert.ok(green[1] > 3 * green[0], 'green on the tick');
  assert.ok(lum(green) - lum(mid) > lum(mid) - lum(amber), 'its light rises with the last step');
});

// ——— Ending fixer a, round 2 (reviews R2T-1 / a1: the bows are launches on their drums; a2: the faces go INTO him) ——————————————————

test('a2 · every face coming home goes into him: over its last frames it is gulped from its place above his head into his outline — the guest into his `(`, the cat into his `)`, a headliner into the top of his head, never over his eyes — its last drawn output frame at ≤ 12 % of its size (≤ 25 %: the review’s bar), overlapping his ink on ≥ 1 drawn frame, and its arrival lights a pulse where it went in; the arrival frames are kept (the guest 5817, the cat on the fold)', () => {
  const faces = K.companyMembers().filter((m) => m.kind !== 'wall');
  const guest = faces.find((m) => m.kind === 'guest')!;
  const cat = faces.find((m) => m.kind === 'cat')!;
  assert.equal(K.arriveAt(guest), O.FOLD.from - 3, 'the guest home on 5817');
  assert.equal(K.arriveAt(cat), O.FOLD.from, 'the cat home on the fold');
  /** His glyphs' ink on screen at instant f: each bracket's ink box, and the union of his face (brackets' heights, the others' advances). */
  const hisInk = (f: number) => {
    const a = K.stageAim(f);
    const z = a.zoom;
    const g = K.heroContent(f, rounded).rounded.slice(0, 5);
    const box = (q: (typeof g)[number]) => {
      const sx = 960 + (q.x - a.x) * z;
      const sy = 540 - (q.y - a.y) * z;
      const b = q.ch === '(' || q.ch === ')' ? ROUNDED_INK[q.ch].box : [-0.45 * rounded(q.ch), -0.39, 0.45 * rounded(q.ch), 0.15];
      const st = q.stretch ?? 1;
      return { x0: sx + b[0] * q.size * st * z, x1: sx + b[2] * q.size * st * z, y0: sy - b[3] * q.size * z, y1: sy - b[1] * q.size * z, mid: sy, size: q.size * z };
    };
    const boxes = g.map(box);
    return { open: boxes[0], close: boxes[4], eyes: [boxes[1], boxes[2], boxes[3]], all: { x0: Math.min(...boxes.map((b) => b.x0)), x1: Math.max(...boxes.map((b) => b.x1)), y0: Math.min(...boxes.map((b) => b.y0)), y1: Math.max(...boxes.map((b) => b.y1)) }, mid: boxes[2].mid, size: boxes[2].size };
  };
  const hits = (p: { x0: number; x1: number; y0: number; y1: number }, q: { x0: number; x1: number; y0: number; y1: number }) => p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1;
  for (const m of faces) {
    const ta = K.arriveAt(m);
    const drawn = range(Math.floor(ta) - 6, Math.ceil(ta) + 1).filter((F) => {
      const s = K.streamAt(m, K.streamTime(F, K.STREAM.shutter.face), rounded);
      return s !== null && s.alpha >= 0.05;
    });
    const last = drawn.at(-1)!;
    const sLast = K.streamAt(m, K.streamTime(last, K.STREAM.shutter.face), rounded)!;
    assert.ok(sLast.scale <= 0.12, `${m.face}: ${(100 * sLast.scale).toFixed(0)} % of its size on its last drawn frame (${last})`);
    let inside = 0;
    for (const F of drawn) {
      const f = K.streamTime(F, K.STREAM.shutter.face);
      if (K.gulpOf(m, f) <= 0) continue;
      const s = K.streamAt(m, f, rounded)!;
      const hw = half(m.face, s.em);
      const me = { x0: s.centre[0] - hw, x1: s.centre[0] + hw, y0: s.centre[1] - 0.42 * s.em, y1: s.centre[1] + 0.42 * s.em };
      const ink = hisInk(f);
      const target = m.kind === 'guest' ? ink.open : m.kind === 'cat' ? ink.close : ink.all;
      if (hits(me, target) && s.alpha >= 0.5) inside++;
      // Never over his eyes: the leads stay on their brackets' side of his dashes and ω; a headliner stays above his middle line + 0.18 em.
      if (m.kind === 'headliner') assert.ok(s.centre[1] <= ink.mid - 0.18 * ink.size, `${F}: ${m.face} sinks to his eyes`);
      else for (const e of ink.eyes) assert.ok(!hits(me, { ...e, y0: e.y0, y1: e.y1 }), `${F}: ${m.face} over his eyes`);
    }
    assert.ok(inside >= 1, `${m.face}: in his ink on ${inside} drawn frames`);
    // The contact: its pulse peaks on its arrival and is gone 3 frames later; his glyph there is lit, and a soft glow sits where it went in.
    assert.ok(K.contactPulse(m, ta) === 1 && K.contactPulse(m, ta - 2) === 0 && K.contactPulse(m, ta + 3) === 0);
    const c = K.heroContent(ta, rounded);
    const a = K.stageAim(ta);
    const at = K.contactOf(m, ta, rounded);
    const glow = c.glint.find((s) => s.kind === 'ellipse' && Math.hypot(960 + (s.x - a.x) * a.zoom - at[0], 540 - (s.y - a.y) * a.zoom - at[1]) < 2);
    assert.ok(glow && (glow.alpha ?? 1) >= 0.25, `${m.face}: a glow where it went in`);
  }
  // The guest's and the cat's pulses light their brackets.
  const lit = (f: number, i: number) => lum(K.heroContent(f, rounded).rounded[i].color) / lum(K.heroContent(f, rounded).rounded[2].color);
  assert.ok(lit(K.arriveAt(guest), 0) > 1.3 && lit(K.arriveAt(cat) - 0.01, 4) > 1.25, 'his `(` and `)` flare as they come in');
});

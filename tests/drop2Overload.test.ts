// S32 OVERLOAD (drop2 7.1–8.3 − 1): drop2 bar 7's reel of eight worlds round a locked hero, the honest stutter's holds, S27's blades, the crash-zoom,
// drop 2's own character field and its saturation, E10's guest and his one smooth drop, E9's fps line (src/shots/drop2Overload.ts;
// sheet §4.2 rows drop2 7.1–8.2&, §5.9–§5.10). Pure: a fake layout stands in for what only the browser can measure.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SCREEN_TEXTS } from '../src/content/all.ts';
import type { RGB } from '../src/engine/color.ts';
import { linear } from '../src/engine/color.ts';
import type { FlatContent } from '../src/engine/flatLayer.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { BULLET, CAMERA_LINE, CRASH, DRAIN, CUTS2, DRIP, DROP2_END, GUEST, KICKS2, LATCH, REEL, REEL_BLADES, REGISTER, RINGS, SATURATE, WIPES, stutterFrame } from '../src/score/drop2.ts';
import { BRIDGE_B_END } from '../src/score/bridgeB.ts';
import { CAMERA_FPS_LINE, HERO2 } from '../src/content/drop2.ts';
import { GUEST as GUEST_V04, GUEST_INFECTED } from '../src/content/castDrop2.ts';
import { LAW, RETICLE_HAT, SWISS_OMEGA } from '../src/shots/drop2Shared.ts';
import { PALETTES, drop2Segment, t7CellCentre } from '../src/shots/drop2Shared.ts';
import * as O from '../src/shots/drop2Overload.ts';
import { assertFastMovesSampled, assertNeverStill, screenMove } from './lib/energyAudit.ts';
import { driftZoom } from '../src/shots/drop2Crash.ts';
import { orbitDegrees } from '../src/shots/drop2Bullet.ts';


const range = (a: number, b: number, step = 1) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
/** One advance for everything, brackets a little narrower; ink boxes from it (a face's ink is its advance box less a side bearing). */
const adv = (ch: string) => (ch === ' ' ? 0.3 : '()'.includes(ch) ? 0.45 : 0.7);
const width = (s: string) => [...s].reduce((w, ch) => w + adv(ch), 0);
const ink = new Map<string, O.InkBox>(O.INK_STRINGS.map(([font, text]) => [O.inkKey(font, text), { left: 0.06, right: width(text) - 0.06, up: 0.45, down: 0.4 }]));
const L: O.OverloadLayout = {
  advance: { rounded: adv, jp: adv, mono: () => 0.6, display: adv, bold: () => 0.6 },
  ink,
  ascii: range(0, 40).map((k) => ({ dx: -280 + 14 * k, dy: (k % 8) * 19.2 - 70, ch: '=', lum: 0.6, part: k % 5 })),
  led: range(0, 30).map((k) => [(k % 15) - 7, Math.floor(k / 15) - 1] as const),
  marquee: { width: 60, lit: range(0, 60).map((k) => [k, k % 8] as const) },
};

/** All the draws of an instant of the reel (every card the plan composes, and its strokes). */
function drawsAt(c: number): O.Draw[] {
  const p = O.planAt(c);
  const worlds = p.kind === 'card' ? [p.world] : p.kind === 'edge' ? [p.under, p.over] : [p.base, ...p.blades.filter((b) => b.age >= 0).map((b) => b.world)];
  return [...worlds.flatMap((w) => O.cardFrame(w, c, L).draws), ...p.fx];
}
const glyphsOf = (c: FlatContent): [string, Glyph][] => Object.entries(c.glyphs).flatMap(([k, gs]) => gs.map((g) => [k, g] as [string, Glyph]));
/** The bounding box (layout px) of the hero's glyphs in a card. */
function heroBox(world: O.World, c: number): { cx: number; cy: number; w: number } {
  const gs = O.heroDraws(world, c, L).flatMap((d) => [...glyphsOf(d.content).map(([, g]) => g), ...d.content.under.map((s) => ({ x: s.x, y: s.y, size: 0, stretch: 1, ch: '' }) as Glyph)]);
  const xs = gs.map((g) => g.x + 960);
  const ys = gs.map((g) => 540 - g.y);
  return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, w: Math.max(...xs) - Math.min(...xs) };
}

test('drop2 bar 7 runs the eight worlds in the sheet’s order, each on its own beat and by its own move', () => {
  const at = (c: number) => O.cardAt(c);
  assert.deepEqual([REEL.from, WIPES[0] - 1, WIPES[0], CUTS2[1] - 1, CUTS2[1], WIPES[1], CUTS2[2] - 1, CUTS2[2], WIPES[2], CUTS2[3] - 1, CUTS2[3], REEL_BLADES[0] - 1].map(at), ['neon', 'neon', 'led', 'led', 'swiss', 'riso', 'riso', 'interlude', 'space', 'space', 'terminal', 'terminal']);
  assert.deepEqual(O.CARDS.map((k) => k.by), ['whip', 'scan', 'cut', 'plates', 'cut', 'streaks', 'cut']);
  assert.deepEqual(O.CARDS.filter((k) => k.by === 'cut').map((k) => k.at), CUTS2.slice(1), 'the hard cuts are the kicks drop2 7.2, 7.3, 7.4');
  assert.deepEqual(O.CARDS.filter((k) => ['scan', 'plates', 'streaks'].includes(k.by)).map((k) => k.at), [...WIPES], 'the wipes are on the &s');
  assert.equal(O.planAt(REEL_BLADES[0]).kind, 'blades', 'the eighth: S27’s blades');
  assert.equal(O.planAt(WIPES[0] + 2).kind, 'edge');
  assert.equal(O.planAt(WIPES[2] + 2).kind, 'edge');
  assert.equal(O.planAt(CUTS2[1] + 4).kind, 'card');
});

test('each hard cut is a segment boundary shown whole on its kick, and the two frames before it hold the old shot’s last clean frame (E9)', () => {
  for (const cut of CUTS2.slice(1)) {
    assert.equal(O.overloadSegment(cut).from, cut, `${cut} opens a segment`);
    assert.equal(O.overloadSegment(cut - 1).to, cut);
    const before = O.cardAt(cut - 3);
    for (const f of [cut - 2, cut - 1]) assert.equal(O.cardAt(stutterFrame(f)), before, `${f} still shows ${before}`);
    assert.notEqual(O.cardAt(cut), before, `${cut} shows the new world`);
    for (const s of temporalSamples(cut, O.overloadTemporal(cut), O.overloadSegment(cut))) assert.equal(O.cardAt(O.contentTime(s.frame)), O.cardAt(cut), `every sub-frame of ${cut} is the new world`);
  }
  // A held frame repeats its source exactly: the same content times on every sub-frame.
  const src = temporalSamples(CUTS2[1] - 3, O.overloadTemporal(CUTS2[1] - 3), O.overloadSegment(CUTS2[1] - 3)).map((s) => O.contentTime(s.frame));
  const held = temporalSamples(CUTS2[1] - 2, O.overloadTemporal(CUTS2[1] - 2), O.overloadSegment(CUTS2[1] - 2)).map((s) => O.contentTime(s.frame));
  assert.deepEqual(held.map((c) => c.toFixed(6)), src.map((c) => c.toFixed(6)));
});

test('the LED scan lights 27 columns a frame from drop2 7.1& on the dot lattice; the Riso plates meet 56 px apart and snap into register on drop2 7.3 − 6; the streaks cross the frame by drop2 7.3& + 5', () => {
  assert.equal(O.scanEdge(WIPES[0]), 324);
  for (const c of range(WIPES[0], WIPES[0] + 6)) assert.equal(O.scanEdge(c) % 12, 0, `${c}: a whole column`);
  assert.ok(O.scanEdge(WIPES[0] + 5) >= 1920, 'lit by drop2 7.1& + 5');
  assert.ok(O.pinkEdge(WIPES[1]) > 0 && O.pinkEdge(WIPES[1]) < 960, 'the pink sheet enters from the left');
  assert.ok(O.blueOffset(WIPES[1]) > 960, 'the blue plate enters from the right');
  assert.ok(Math.abs(O.pinkEdge(REGISTER - 1) - 1920) < 1e-6);
  assert.ok(O.PLATES.apart >= 48 && Math.abs(O.blueOffset(REGISTER - 1) - O.PLATES.apart) < 1e-6, 'they meet 56 px out of register');
  assert.ok(Math.abs(O.blueOffset(REGISTER)) < 1e-6, 'and snap into register on drop2 7.3 − 6');
  for (const c of range(WIPES[1], CUTS2[2] - 2)) assert.ok(O.blueOffset(c + 1) <= O.blueOffset(c) + 1e-9, `${c}: the blue plate never backs off`);
  assert.ok(O.streakEdge(WIPES[2]) > 0 && O.streakEdge(WIPES[2] + 5) >= 1920);
});

test('the blades open S27’s six worlds behind their tips, ending in S27’s layout', () => {
  const at = (c: number, x: number, y: number) => O.regionAt(x, y, O.bladesAt(c));
  // S27's final layout (sheet §5.3): one sample point per region.
  const final: [number, number, O.World][] = [[200, 200, 'neon'], [900, 200, 'terminal'], [1700, 300, 'swiss'], [300, 900, 'riso'], [1000, 900, 'interlude'], [1700, 900, 'led']];
  for (const [x, y, w] of final) assert.equal(at(SATURATE[1] - 5, x, y), w, `(${x}, ${y})`);
  // Before its frame a blade opens nothing; on its frame only behind its tip.
  assert.equal(at(REEL_BLADES[0] - 1, 1000, 900), 'terminal');
  assert.equal(at(REEL_BLADES[0], 100, 900), 'interlude', 'C1 runs left → right');
  assert.equal(at(REEL_BLADES[0], 1800, 900), 'terminal', 'not yet ahead of the tip');
  assert.equal(at(REEL_BLADES[1] - 1, 300, 900), 'interlude', 'C3 is not out before drop2 7.4& + 3');
  assert.equal(at(REEL_BLADES[1], 1700, 50), 'swiss', 'C2 runs top → bottom');
  assert.equal(at(REEL_BLADES[1], 1700, 500), 'terminal');
  assert.equal(at(REEL_BLADES[2] - 1, 200, 200), 'terminal', 'C4 is not out before drop2 8.1 − 6');
  assert.equal(at(REEL_BLADES[3] - 1, 1700, 900), 'interlude', 'C5 is not out before drop2 8.1 − 3');
  for (const [k, b] of O.bladesAt(SATURATE[3] - 4).entries()) {
    const n = b.normal;
    const want = ['below', 'right', 'left', 'left', 'right'][k];
    assert.ok(want === 'below' ? n[1] > 0 : want === 'right' ? n[0] > 0 : n[0] < 0, `${b.line.id} opens ${want}`);
  }
});

test('the camera pushes in from drop2 7.1, gathering speed (one continuous move with a roll drift: the cards never settle), crash-zooms to 1.62 on drop2 8.1 and creeps on to 1.84 by the freeze; the hero is locked at 600 px (+4 % on the 8ths) until the crash-zoom carries him to 900 and ≈ 1020', () => {
  const z = (c: number) => O.reelCamera(c).zoom;
  const roll = (c: number) => O.reelCamera(c).roll;
  assert.ok(Math.abs(z(REEL.from) - 1) < 1e-9);
  assert.ok(z(REEL_BLADES[1]) > 1.15 && z(REEL_BLADES[1]) < 1.22, `${z(REEL_BLADES[1])}`);
  for (const c of range(REEL.from + 1, REEL_BLADES[1] + 1)) {
    if (c >= WIPES[0]) assert.ok(Math.log(z(c) / z(c - 1)) > 0.001, `${c}: past the whip's landing the push never slows below ≈ 1 px a frame at the edges`);
    if (c > WIPES[0]) assert.ok(Math.log(z(c) / z(c - 1)) > Math.log(z(c - 1) / z(c - 2)) - 1e-12, `${c}: it gathers speed`);
    assert.ok(Math.abs(roll(c) - roll(c - 1)) > 0.0003, `${c}: the roll drifts`);
  }
  assert.ok(Math.abs(roll(REEL.from)) <= 1.5 * (Math.PI / 180) + 1e-12 && roll(LATCH) === 0);
  assert.ok(Math.abs(z(LATCH) - 1.62) < 1e-6);
  assert.ok(Math.abs(z(CRASH - 1) - 1.84) < 1e-6);
  for (let c = REEL.from; c < CRASH; c += 0.25) {
    assert.ok(z(c + 0.25) >= z(c) - 1e-12, `${c}: the zoom never backs off`);
    assert.ok(z(c) >= 1, `${c}`);
  }
  for (const c of range(REEL.from + 4, REEL_BLADES[1] + 1)) {
    const s = O.heroScale(c);
    assert.ok(s.s >= 0.999 && s.s <= 1.041, `${c}: ${s.s}`);
  }
  assert.ok(Math.abs(O.heroScale(LATCH).s * O.HERO_WIDTH - 900) < 1, `${O.heroScale(LATCH).s * 600}`);
  assert.ok(Math.abs(O.heroScale(CRASH - 1).s * O.HERO_WIDTH - 1020) < 25, `${O.heroScale(CRASH - 1).s * 600}`);
  // He lands from the whip squashed 1.08 / 0.92 and springs back.
  const land = O.heroScale(REEL.from + 0.5);
  assert.ok(Math.abs(land.sx - 1 - 0.08 * Math.exp(-0.225) * Math.cos(0.45)) < 1e-9 && land.sy < 0.95, 'squashed as he lands');
  assert.equal(O.heroScale(REEL.from).sx, 1, 'built over the landing frame’s shutter, not doubled against the whip');
  assert.ok(Math.abs(O.heroScale(REEL.from + 12).sx - 1) < 0.01);
  // Fast moves blur: the crash-zoom gets its sub-frames.
  assertFastMovesSampled(REEL.from, CRASH, (f) => ({ pose: O.cardPose(f), samples: O.overloadTemporal(Math.round(f)).samples }));
});

test('in every world he is dead centre and the same size, in that world’s own dress', () => {
  for (const k of O.CARDS) {
    const c = k.world === 'riso' ? REGISTER + 1 : k.at + 5;
    const b = heroBox(k.world, c);
    assert.ok(Math.abs(b.cx - 960) < 12 && Math.abs(b.cy - 540) < 40, `${k.world}: centre (${b.cx.toFixed(0)}, ${b.cy.toFixed(0)})`);
    if (k.world !== 'terminal' && k.world !== 'led') assert.ok(Math.abs(b.w / 600 - 1) < 0.12, `${k.world}: ${b.w.toFixed(0)} px`);
  }
  // The dress: the Swiss hero is ink with a red ω, the interlude's amber with an ink outline and a hard shadow, the neon one a tube.
  const swiss = O.heroDraws('swiss', CUTS2[1] + 4, L).flatMap((d) => glyphsOf(d.content).map(([, g]) => g));
  assert.deepEqual(swiss.map((g) => g.color === swiss[2].color), [false, false, true, false, false]);
  const inter = O.heroDraws('interlude', CUTS2[2] + 5, L).flatMap((d) => glyphsOf(d.content).map(([, g]) => g));
  assert.ok(inter.some((g) => (g.outline ?? 0) > 0) && inter.length === 10, 'fill with an outline, over its shadow');
  const neon = O.heroDraws('neon', WIPES[0] - 4, L).flatMap((d) => glyphsOf(d.content).map(([, g]) => g));
  assert.ok(neon.every((g) => (g.tube ?? 0) > 0), 'a tube');
  // The tube ignites at full as he lands, with a pop: ×1.6 on drop2 7.1, dying back to 1 over 6 frames; no flicker (R1-05: he arrives lit
  // at 0.6 from the whip, so a dark frame on drop2 7.1 + 1 read as a drop-out, not an ignition).
  const ig = range(REEL.from, WIPES[0] - 4).map(O.ignition);
  assert.ok(Math.abs(ig[0] - 1.6) < 1e-9, `the pop on drop2 7.1 (${ig[0]})`);
  ig.forEach((v, i) => assert.ok(v >= 1 && (i === 0 || v <= ig[i - 1]), `${REEL.from + i}: lit at full or above, never rising again (${v})`));
  assert.equal(O.ignition(REEL.from + 6), 1, 'settled by drop2 7.1 + 6');
  for (let c = REEL.from; c < REEL.from + 6; c += 0.125) assert.ok(O.ignition(c) - O.ignition(c + 0.125) < 0.2, `${c}: the pop decays smoothly`);
});

test('every glyph the reel draws is in its atlas list, and every listed string is on screen in the role it is drawn with', () => {
  const chars = Object.fromEntries(Object.entries(O.OVERLOAD_STRINGS).map(([k, ss]) => [k, new Set(ss.flatMap((s) => [...s]))]));
  for (let c = REEL.from; c < LATCH; c += 0.5) {
    for (const d of drawsAt(c)) for (const [k, g] of glyphsOf(d.content)) assert.ok(chars[k]?.has(g.ch), `${c}: "${g.ch}" in ${k}`);
  }
  for (const d of [O.guestContent(SATURATE[2] - 2, L).glass, O.guestContent(SATURATE[2] - 2, L).light, O.fpsContent(CUTS2[1] + 4, L.advance.mono)]) for (const [k, g] of glyphsOf(d)) assert.ok(chars[k]?.has(g.ch), `"${g.ch}" in ${k}`);
  const role = { rounded: 'rounded', jp: 'jp', mono: 'mono', display: 'display', bold: 'mono' } as const;
  for (const [k, ss] of Object.entries(O.OVERLOAD_STRINGS) as [keyof typeof role, string[]][]) {
    for (const s of ss) {
      const listed = SCREEN_TEXTS.filter((t) => t.role === role[k]).some((t) => t.text.includes(s)) || [...s].every((ch) => SCREEN_TEXTS.some((t) => t.role === role[k] && t.text.includes(ch)));
      assert.ok(listed, `${k}: "${s}" is listed for check-glyphs`);
    }
  }
});

test('the field: the ramp by luminance, the inks keep their world’s colour, the heartbeat’s waves climb a step a kick and his cells stay calm =+*', () => {
  assert.deepEqual([0, 0.05, 0.2, 0.5, 1].map(O.rampIndex), [0, 1, 2, 5, 9]);
  const violet = O.fieldInk(linear(PALETTES.interlude.ground));
  assert.ok(Math.abs(Math.max(...violet) - O.FIELD_INK_GAIN) < 1e-9 && violet[2] > violet[0], 'violet stays violet, at full strength');
  // Each world's ground reads as its own hue in the field; amber is his alone.
  const hues = Object.values(O.FIELD_GROUND).map((g) => O.fieldInk(g).map((v) => +v.toFixed(3)).join());
  assert.equal(new Set(hues).size, hues.length);
  assert.ok(O.HERO_INK[0] > 1.2 && O.HERO_INK[0] > O.HERO_INK[2] * 5, 'he glows amber');
  // The waves leave his centre on each kick of drop2 8.1–8.2, 280 px a frame — already 280 px out on the kick frame, so the hit shows on it.
  assert.equal(O.wavesAt(LATCH, 0), 1);
  assert.equal(O.wavesAt(LATCH, 280), 1);
  assert.equal(O.wavesAt(LATCH, 560), 0);
  assert.equal(O.wavesAt(LATCH + 1, 560), 1);
  for (const k of SATURATE) assert.equal(O.wavesAt(stutterFrame(k - 1), 0), O.wavesAt(k, 0) - 1, `the frame shown before ${k} has no wave of its own yet`);
  assert.equal(O.wavesAt(SATURATE[3] + 1, 0), 4);
  // One step a wave (= + * #), and the last kick (drop2 8.3) completes the wall: every cell but his is @ from drop2 8.2&.
  assert.equal(O.saturate(1, 2, false, SATURATE[2] - 2), 3);
  assert.equal(O.saturate(4, 3, false, SATURATE[3] - 4), 7);
  assert.equal(O.saturate(1, 4, false, SATURATE[3]), 9);
  assert.equal(O.MAXED, SATURATE[3]);
  assert.equal(O.saturate(0, 0, false, O.MAXED), 9, 'from drop2 8.2& everything but him is @');
  assert.equal(O.saturate(0, 0, true, LATCH + 2), 4);
  assert.equal(O.saturate(9, 4, true, CRASH - 2), 6);
  // A synthetic picture: his silhouette (a disc) on violet; at drop2 8.3 − 4 a wall of @ round his calm amber cells.
  const sample: O.FieldSampler = {
    rgb: () => linear(PALETTES.interlude.ground),
    hero: (col, row) => {
      const [x, y] = t7CellCentre(col, row);
      return Math.hypot(x - 960, y - 540) < 300 ? 1 : 0;
    },
  };
  const cells = O.buildField(CRASH - 4, sample);
  assert.equal(cells.length, O.FIELD.cols * O.FIELD.rows);
  for (const cell of cells) {
    if (cell.hero) assert.ok(cell.i >= 4 && cell.i <= 6 && cell.ink === O.HERO_INK, `${cell.col},${cell.row}`);
    else assert.equal(cell.i, 9);
  }
  // The source bleeds into the signature hues over the heartbeat: next to none where the field takes over from the flash on the drop2 8.1
  // kick (3 % on drop2 8.1: the ramp is keyed to the last blade's content frame, drop2 8.1 − 3, the one the flash crumbles), all by drop2 8.2.
  assert.equal(O.fieldTint(REEL_BLADES[3]), 0);
  assert.ok(O.fieldTint(stutterFrame(O.FIELD_FROM)) < 0.05, `${O.fieldTint(stutterFrame(O.FIELD_FROM))}`);
  assert.equal(O.fieldTint(SATURATE[2]), 1);
  for (let c = REEL_BLADES[3]; c < SATURATE[3] - 4; c++) assert.ok(O.fieldTint(c + 1) >= O.fieldTint(c));
  const early = O.buildField(LATCH, sample);
  assert.ok(early.some((cell) => !cell.hero && cell.i < 9), 'at drop2 8.1 the wall is still building');
});

test('SYNC2-01: every kick of drop2 bar 8 lands on its own content frame — each stuttered wave covers the whole field inside its kick frame, never on the frame shown before it, and each one changes the wall', () => {
  // The field's farthest cell from his centre (the grid bleeds past the frame's corners).
  let far = 0;
  for (let row = O.FIELD.r0; row <= O.FIELD.r1; row++) for (let col = O.FIELD.c0; col <= O.FIELD.c1; col++) {
    const [x, y] = t7CellCentre(col, row);
    far = Math.max(far, Math.hypot(x - 960, y - 540));
  }
  for (const [i, k] of SATURATE.entries()) {
    const before = stutterFrame(k - 1);
    assert.ok(before < k && stutterFrame(k) === k, `${k} is a content frame`);
    for (const rho of [0, 200, 600, far]) assert.equal(O.wavesAt(before, rho), i, `${k}: no wave of its own on the frame shown before it (ρ ${rho.toFixed(0)})`);
    if (i === 0) continue; // drop2 8.1's wave runs 280 px a frame from drop2 8.1 − 1 (so drop2 8.1 − 1, the flash's last frame, stays clean)
    for (const rho of [0, 480, 960, far]) assert.equal(O.wavesAt(k, rho), i + 1, `${k}: the wave has reached ρ ${rho.toFixed(0)} on the kick frame itself`);
    assert.ok(O.wavesAt(k - 0.25, 960) === i + 1 && O.wavesAt(k + 0.25, 1280) === i + 1, `${k}: 960 px by k − ¼, 1280 px by k + ¼`);
  }
  assert.equal(O.wavesAt(LATCH, 280), 1);
  assert.equal(O.wavesAt(LATCH, 560), 0);
  assert.equal(O.wavesAt(LATCH - 1, 1), 0, 'drop2 8.1 − 1 stays clean');
  // A uniform wall at the field's starting density: the cells that change between consecutive content frames. Each kick changes nearly
  // every cell (the racing heart: drop2 8.1& > drop2 8.1& + 3, 8.2& is not empty); the frames between kicks add no wave.
  const sample: O.FieldSampler = { rgb: () => O.FIELD_GROUND.neon, hero: () => 0 };
  const shown = [...new Set(Array.from({ length: CRASH - LATCH }, (_, j) => stutterFrame(LATCH + j)))];
  const fields = new Map(shown.map((c) => [c, O.buildField(c, sample).map((cell) => cell.i)]));
  const changed = (c: number): number => {
    const prev = shown[shown.indexOf(c) - 1];
    const a = fields.get(prev)!;
    const b = fields.get(c)!;
    return b.filter((v, j) => v !== a[j]).length / b.length;
  };
  for (const k of SATURATE.slice(1)) assert.ok(changed(k) > 0.99, `${k}: the wave changes the wall (${(100 * changed(k)).toFixed(1)} %)`);
  for (const c of shown.filter((c) => c > LATCH + 4 && !SATURATE.includes(c))) assert.equal(changed(c), 0, `${c}: no wave between the kicks`);
  assert.ok(changed(SATURATE[1]) > changed(SATURATE[1] + 3));
  assert.deepEqual([LATCH + 4, SATURATE[1], SATURATE[2], SATURATE[3]].map((c) => RAMP_AT(fields.get(c)![0])), ['+', '*', '#', '@'], '= + * # @: one step a kick, the last kick completes the wall');
});
const RAMP_AT = (i: number): string => ' .:-=+*#%@'[i];

test('E10: the guest drops in on drop2 8.1; one drop leaves the lip on drop2 8.1 + 6 and falls smoothly, at true time, onto (1600, 1024) on the freeze — clear of his bracket', () => {
  assert.ok(O.guestAt(GUEST - 1).y < -100, 'above the frame');
  assert.ok(Math.abs(O.guestAt(GUEST + 11).y - 150) < 3, 'landed by drop2 8.1& − 1');
  assert.equal(O.dropAt(GUEST), null);
  const d = O.dropAt(CRASH)!;
  assert.deepEqual([d.x, d.y], [O.LAND.x, O.LAND.y]);
  assert.ok(O.LAND.y <= 1040, 'it lands inside the curved frame, the crown above it on screen');
  let prev = O.dropAt(DRIP)!.y;
  let v = 0;
  for (let f = DRIP + 0.25; f <= CRASH; f += 0.25) {
    const y = O.dropAt(f)!.y;
    assert.ok(y - prev >= v - 1e-9, `${f}: it accelerates`);
    v = y - prev;
    prev = y;
  }
  // It never stutters: its sub-frames follow true time, not the picture's content time.
  assert.notEqual(O.dropAt(SATURATE[3] + 2)!.y, O.dropAt(SATURATE[3] + 3)!.y);
  assert.equal(stutterFrame(SATURATE[3] + 2), stutterFrame(SATURATE[3] + 3));
  const right = 960 + (O.heroScale(CRASH - 1).s * O.HERO_WIDTH) / 2;
  assert.ok(right < 1600 - 60, `his bracket ends at ${right.toFixed(0)}`);
});

test('E9: the fps line prints the picture’s real frame rate on the 8ths, green → amber → pink-red, not responding from the freeze, fading with the drain', () => {
  assert.equal(O.fpsAt(REEL.from - 1), null);
  assert.equal(O.fpsAt(REEL.from)!.text, 'fps 60.0 · dropped 0');
  assert.equal(O.fpsAt(SATURATE[3])!.text, 'fps 29.0 · dropped 37');
  assert.equal(O.fpsAt(CRASH)!.text, 'fps 0.0 · not responding');
  const hue = (f: number): RGB => O.fpsAt(f)!.ink;
  assert.deepEqual(hue(REEL.from), linear(PALETTES.terminal.green, 1.3));
  assert.deepEqual(hue(LATCH), linear(PALETTES.terminal.amber, 1.3));
  assert.deepEqual(hue(CRASH), linear(PALETTES.terminal.pink, 1.6), 'not responding: brighter, on its dark backing');
  assert.deepEqual(range(CRASH, CRASH + 24).map((f) => O.fpsAt(f)!.alpha > 0), range(0, 24).map((k) => Math.floor(k / 6) % 2 === 0), 'blinking on the 16ths');
  // v08: the frozen line stays through bridge B and fades with its inhale (gone on its last frame).
  assert.ok(O.fpsAt(BRIDGE_B_END - 1)!.alpha < 0.1 || Math.floor((BRIDGE_B_END - 1 - CRASH) / 6) % 2 === 1);
  assert.equal(O.fpsAt(BRIDGE_B_END), null);
});

test('sub-frames: 64 as he lands, 32 on the wipes, the blades, the crash-zoom and the field; drop 2’s segments; no white flash of its own', () => {
  for (const f of [REEL.from, REEL.from + 1, REEL.from + 2]) assert.equal(O.overloadTemporal(f).samples, 64);
  for (const f of [WIPES[0], WIPES[0] + 5, WIPES[1], WIPES[1] + 6, WIPES[2], WIPES[2] + 5, REEL_BLADES[0], REEL_BLADES[2] + 1, LATCH - 1, SATURATE[2] - 2, CRASH - 1]) assert.ok(O.overloadTemporal(f).samples >= 32, `${f}`);
  for (let f = REEL.from; f < CRASH; f++) {
    assert.deepEqual(O.overloadSegment(f), drop2Segment(f));
    assert.equal(O.overloadLook(f).flash ?? 0, 0);
  }
  assert.equal(O.overloadLook(CUTS2[1] + 4).bloom.intensity, 0, 'Swiss is clean');
  assert.ok(O.overloadLook(REEL.from + 3).bloom.intensity > 0.9, 'neon glows');
  assert.equal(O.overloadLook(SATURATE[2] - 2).crt, undefined, 'no CRT until the freeze');
  assert.ok(KICKS2.includes(LATCH) && SATURATE[0] === LATCH && REEL_BLADES[0] === REEL.from + 84, 'the field latches on a kick; the blades on the reel’s 4&');
});

test('drop 2’s own field takes over on the drop2 8.1 kick (LATCH = drop2 8.1), not a frame early: drop2 8.1 − 1 is still the reel, under the flash’s last frame', () => {
  assert.equal(O.FIELD_FROM, LATCH);
  assert.equal(O.overloadLook(LATCH), O.FIELD_LOOK, 'the field’s finish from the kick');
  assert.notEqual(O.overloadLook(LATCH - 1), O.FIELD_LOOK, 'the reel’s own finish on the frame before it');
});

test('the picture never stands still for more than 12 frames from drop2 7.1 to the hand-off: the camera through the reel (at true time, so the holds drift), the field’s content and the rig’s heartbeat through drop2 8.1–8.2, T7’s drift', () => {
  // The bullet time (drop2 19.4&–20.4&) holds the crash shot's drift: its own orbit moves (tests/drop2Bullet.test.ts).
  const orbiting = (f: number): boolean => f >= BULLET.from && f < DRAIN.from;
  const moved = (f: number): boolean =>
    f < O.FIELD_FROM
      ? screenMove(O.cardPose(f - 1), O.cardPose(f)) > 1e-9
      : f < CRASH
        ? stutterFrame(f) !== stutterFrame(f - 1)
        : orbiting(f)
          ? orbitDegrees(f) !== orbitDegrees(f - 1)
          : driftZoom(f) !== driftZoom(f - 1);
  assertNeverStill(REEL.from, DROP2_END, moved);
  for (const f of [CUTS2[1] - 1, CUTS2[2] - 1, CUTS2[3] - 1, REEL_BLADES[1] - 1]) assert.ok(screenMove(O.cardPose(f - 1), O.cardPose(f)) > 0.05, `${f}: a held frame still moves`);
});

test('from drop2 8.1 he is the one calm, readable shape: the type inside his outline is dark (a soft edge outside it), his =+* hot in the bold mono over his face filled in amber', () => {
  // A synthetic field at drop2 8.2&: a wall of @ round a ring-shaped hero (an outline with a counter inside).
  const sample: O.FieldSampler = {
    rgb: () => linear(PALETTES.swiss.red),
    hero: (col, row) => {
      const [x, y] = t7CellCentre(col, row);
      const e = Math.hypot((x - 960) / 2.6, y - 540);
      return e < 190 && e > 120 ? 1 : 0;
    },
  };
  const cells = O.buildField(SATURATE[3], sample);
  const m = O.clearing(cells);
  const out: Glyph[] = [];
  const n = O.fieldGlyphs(cells, out);
  const type = out.slice(0, n);
  assert.equal(type.length, cells.filter((c) => !c.hero).length, 'his cells are not in the type');
  const spans = O.heroSpans(cells);
  const at = (g: Glyph) => {
    const col = Math.round((g.x + 960 - 84) / 13.2 - 0.5);
    const row = Math.round((540 - g.y - 60) / 30 - 0.5);
    return cells.findIndex((c) => c.col === col && c.row === row);
  };
  const inner = type.filter((g) => m[at(g)] === 1);
  const free = type.filter((g) => m[at(g)] === 0);
  const edge = type.filter((g) => m[at(g)] > 0 && m[at(g)] < 1);
  assert.ok(inner.length > 50 && edge.length > 20, `${inner.length} inside, ${edge.length} on the soft edge`);
  const lum = (g: Glyph) => O.luma(g.color);
  const mean = (gs: Glyph[]) => gs.reduce((a, g) => a + lum(g), 0) / gs.length;
  assert.ok(mean(inner) <= O.CLEARING * mean(free) + 1e-9, 'dark inside his outline');
  assert.ok(mean(edge) > mean(inner) && mean(edge) < mean(free), 'a soft edge');
  for (const [row, [c0, c1]] of spans) {
    for (const cell of cells.filter((c) => c.row === row && !c.hero && c.col > c0 && c.col < c1)) assert.equal(m[cells.indexOf(cell)], 1, `row ${row}: his counter is cleared`);
  }
  const h = O.heroField(cells, SATURATE[3], L);
  assert.equal(h.bold.length, cells.filter((c) => c.hero).length);
  for (const g of h.bold) assert.ok('=+*'.includes(g.ch) && Math.max(...g.color) > 2, 'hot =+*');
  assert.equal(h.rounded.map((g) => g.ch).join(''), O.HERO_FACES.squeeze, 'his face (>ω<) filled under them');
  assert.ok(h.rounded.every((g) => Math.max(...g.color) < 0.5), 'the fill is deep, the strokes hot');
});

test('E10 reads on any colour: the falling drop has a dark halo and a white-pink core; the splash is a crown of 12 droplets ≈ 150 px across and a ring 120 px across', () => {
  const g = O.guestContent(SATURATE[3] - 4, L);
  const d = O.dropAt(SATURATE[3] - 4)!;
  const halo = g.glass.under.find((s) => Math.abs(s.x - (d.x - 960)) < 1 && s.color[0] < 0.02 && (s.alpha ?? 1) > 0.5);
  assert.ok(halo && halo.w > 40, 'a dark halo under the drop');
  assert.ok(g.light.under.some((s) => Math.abs(s.x - (d.x - 960)) < 1 && Math.min(...s.color) > 1.5), 'a white-hot core');
  const splash = O.splash(CRASH);
  const ring = splash.find((s) => s.kind === 'ring')!;
  assert.ok(ring.w >= 96 && ring.w <= 140, `ring ${ring.w}`);
  const beads = splash.filter((s) => s.kind === 'ellipse' && s.w === 8);
  assert.equal(beads.length, 12);
  const xs = beads.map((s) => s.x + 960);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 120, 'a crown, not a dot');
  for (const b of beads) assert.ok(540 - b.y < O.LAND.y && 540 - b.y > O.LAND.y - 70, 'risen above the impact');
});

test('drop2 bar 7’s cards keep moving between their hits: the Riso foot drifts; the interlude presses again on drop2 7.3 + 6, after the flash clears; his face is knocked out of the Riso pink plate', () => {
  const unders = (w: O.World, c: number) => O.cardFrame(w, c, L).draws.flatMap((d) => d.content.under);
  const foot = (c: number) => unders('riso', c).find((s) => s.screen === 10)!;
  assert.ok(foot(CUTS2[2] - 4).angle !== foot(CUTS2[2] - 5).angle && foot(CUTS2[2] - 4).y !== foot(CUTS2[2] - 5).y, 'the halftone drifts');
  assert.deepEqual(O.PRESSES, [CUTS2[2], CUTS2[2] + 6]);
  assert.ok(O.interludePress(CUTS2[2] + 7).x > 3, 'pressed 7 frames after the cut');
  assert.ok(O.interludePress(CUTS2[2] + 5.9).x < 0.2, 'recovered from the first press before the second');
  // The Riso plates: his face knocked out of the pink sheet, paper-white, under the blue plate.
  const knock = O.cardFrame('riso', REGISTER, L).draws.filter((d) => d.blend === 'normal' && d.cam === 'screen').flatMap((d) => d.content.glyphs.jp ?? []);
  assert.equal(knock.length, 5, 'his five glyphs knocked out');
  assert.deepEqual(knock[0].color, linear(PALETTES.riso.ground));
});

test('E9’s line never sits on the type: a feathered dark backing two rows tall behind its chip', () => {
  const c = O.fpsContent(RINGS[0], L.advance.mono);
  const back = c.under[0];
  const chip = c.under[1];
  assert.ok(back.w >= chip.w + 40 && back.h >= 60 && (back.soft ?? 0) > 0);
  assert.ok(Math.max(...O.fpsAt(RINGS[0])!.ink) > 1.5, 'not responding, bright');
});

// ——— The finale's logged changes (sheet §1.3: C on the reel's Swiss card, G on E10) and the bullet time's camera line ————————————————

test('§1.3 C: on the reel’s Swiss card his ω is amber with a 2 px #111 keyline (red is Defender’s alone); the rest of his face stays ink, and nothing changes in the field’s fill', () => {
  for (const c of [CUTS2[1], CUTS2[1] + 7, REEL_BLADES[1] + 2]) {
    const jp = O.heroDraws('swiss', c, L).flatMap((d) => d.content.glyphs.jp ?? []);
    assert.equal(jp.map((g) => g.ch).join(''), HERO2.base);
    const omega = jp.find((g) => g.ch === 'ω')!;
    assert.deepEqual(omega.color, linear(SWISS_OMEGA.fill), `${c}: an amber ω`);
    assert.deepEqual(omega.outlineColor, linear(SWISS_OMEGA.keyline.color));
    assert.ok(Math.abs((omega.outline ?? 0) * omega.size - SWISS_OMEGA.keyline.px) < 1e-9, `${c}: a ${SWISS_OMEGA.keyline.px} px keyline`);
    for (const g of jp.filter((q) => q.ch !== 'ω')) assert.deepEqual(g.color, linear(PALETTES.swiss.ink), `${c}: "${g.ch}" ink`);
  }
  // The field reads his plain fill (the frozen field, and so THE FRAME, are untouched).
  const fill = O.heroDraws('swiss', LATCH, L, true).flatMap((d) => d.content.glyphs.rounded ?? []);
  assert.ok(fill.length > 0 && fill.every((g) => g.outline === undefined));
});

test('§1.3 G: the guest who drops in is infected — (￣ω￣), a red neon tube with an amber ω — wearing Defender’s spun-off reticle as a party hat, tilted 15°, settling with a 4 px bounce; the frozen field still reads v04’s guest', () => {
  const at = GUEST + 20;
  const g = O.guestContent(at, L);
  const lit = g.light.glyphs.rounded ?? [];
  assert.equal(lit.map((q) => q.ch).join(''), GUEST_INFECTED.face);
  assert.equal((g.glass.glyphs.rounded ?? []).map((q) => q.ch).join(''), GUEST_INFECTED.face);
  // Same colour (any intensity): the channels in the same ratios.
  const tone = (a: readonly number[], hex: string) => {
    const b = linear(hex);
    const ka = Math.max(...a);
    const kb = Math.max(...b);
    return [0, 1, 2].every((i) => Math.abs(a[i] / ka - b[i] / kb) < 1e-6);
  };
  for (const q of lit) {
    if (q.ch === 'ω') assert.ok(tone(q.color, LAW.hero), `the ω amber (${q.color})`);
    else assert.ok(tone(q.color, LAW.defender.emissive) && Math.max(...q.color) > 1, `"${q.ch}" Defender’s emissive red (${q.color})`);
  }
  // The hat: four L brackets (eight strokes) and a ring, red, 30 % of the reticle, tilted 15°, above his brow.
  const hat = O.hatShapes(at);
  const strokes = hat.filter((s) => s.kind === 'segment');
  const ring = hat.filter((s) => s.kind === 'ring');
  assert.equal(strokes.length, 8);
  assert.equal(ring.length, 1);
  assert.ok(Math.abs(ring[0].w / 2 - RETICLE_HAT.ring) < 1e-9);
  for (const s of hat) assert.ok(tone(s.color, RETICLE_HAT.color), 'Defender’s red');
  const xs = strokes.map((s) => s.x + 960);
  const ys = strokes.map((s) => 540 - s.y);
  const face = O.guestAt(at);
  assert.ok(Math.max(...ys) < face.y - 0.2 * face.em, `on his head (hat ${Math.max(...ys).toFixed(0)} vs face ${face.y.toFixed(0)})`);
  assert.ok(Math.max(...xs) - Math.min(...xs) <= RETICLE_HAT.box[0] + 30 && Math.max(...xs) - Math.min(...xs) >= 100, 'a 150 × 110 box');
  for (const s of strokes) assert.ok(Math.abs(Math.abs(s.rot ?? 0) % (Math.PI / 2) - (RETICLE_HAT.tilt * Math.PI) / 180) < 1e-6 || Math.abs((Math.abs(s.rot ?? 0) % (Math.PI / 2)) - (Math.PI / 2 - (RETICLE_HAT.tilt * Math.PI) / 180)) < 1e-6, 'tilted 15°');
  // It drops in with him and settles with a 4 px bounce a beat (an 8th) after he lands.
  const top = (f: number) => Math.min(...O.hatShapes(f).map((s) => 540 - s.y));
  const rest = top(GUEST + 30) - O.guestAt(GUEST + 30).y;
  const bounce = Math.min(...range(GUEST + 12, GUEST + 20).map((f) => top(f) - O.guestAt(f).y));
  assert.ok(Math.abs(rest - bounce - RETICLE_HAT.bounce) < 0.5, `a ${RETICLE_HAT.bounce} px bounce (${(rest - bounce).toFixed(2)})`);
  // The frozen field captures v04’s guest, so the sort and THE FRAME stay byte-identical (§1.3 G’s box is the crisp overlay).
  const old = O.guestContent(CRASH, L, { v04: true });
  assert.equal((old.light.glyphs.rounded ?? []).map((q) => q.ch).join(''), GUEST_V04.face);
  assert.equal(old.light.under.filter((s) => tone(s.color, RETICLE_HAT.color)).length, 0, 'no hat in v04');
});

test('the bullet time’s camera line: `camera 60.0 fps · still rolling` types in green over drop2 20.1 → 20.1 + 6 beside the frozen line (which keeps blinking), never blinking itself while it rolls; v08: on through bridge B (where it runs down: tests/bridgeB.test.ts), fading with its inhale', () => {
  const lines = (f: number) => {
    const c = O.fpsContent(f, L.advance.mono);
    const gs = c.glyphs.mono ?? [];
    const rows = new Map<number, Glyph[]>();
    for (const q of gs) rows.set(Math.round(q.y), [...(rows.get(Math.round(q.y)) ?? []), q]);
    return [...rows.values()].map((r) => ({ text: r.map((q) => q.ch).join(''), y: 540 - r[0].y, color: r[0].color, alpha: r[0].alpha ?? 1 }));
  };
  assert.equal(lines(CAMERA_LINE.from - 1).filter((l) => l.text.startsWith('cam')).length, 0, 'not before drop2 20.1');
  const typed = range(CAMERA_LINE.from, CAMERA_LINE.to + 1).map((f) => lines(f).find((l) => l.text.startsWith('cam'))?.text.length ?? 0);
  for (let i = 1; i < typed.length; i++) assert.ok(typed[i] >= typed[i - 1]);
  assert.ok(typed[0] > 0 && typed[0] < CAMERA_FPS_LINE.replace(/ /gu, '').length, 'typing');
  for (const f of [CAMERA_LINE.to, CAMERA_LINE.to + 30, DROP2_END - 13]) {
    const cam = lines(f).find((l) => l.text.startsWith('cam'));
    assert.ok(cam, `${f}: the camera line`);
    assert.equal(cam.text, CAMERA_FPS_LINE.replace(/ /gu, ''));
    assert.deepEqual(cam.color, linear(PALETTES.terminal.green, 1.3));
    assert.equal(cam.alpha, 1, `${f}: steady`);
  }
  // The frozen line blinks on the 16ths underneath, as built; the camera line sits above it, clear of the frame’s bottom.
  const shown = range(CAMERA_LINE.to, CAMERA_LINE.to + 12).find((f) => O.fpsAt(f)!.alpha > 0)!;
  const both = lines(shown);
  const frozen = both.find((l) => l.text.startsWith('fps'))!;
  const cam = both.find((l) => l.text.startsWith('cam'))!;
  assert.ok(cam.y < frozen.y - 20 && cam.y > 960, `${cam.y} above ${frozen.y}`);
  // v08: still steady on drop 2's last frames (the tape stop), gone by bridge B's last.
  assert.equal(lines(DROP2_END - 2).find((l) => l.text.startsWith('cam'))?.alpha, 1, 'on through drop 2’s end');
  const late = lines(BRIDGE_B_END - 2).find((l) => l.text.startsWith('cam'));
  assert.ok(!late || late.alpha < 0.2, 'faded with bridge B’s inhale');
});

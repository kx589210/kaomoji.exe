// Renderer C's screen overlay (src/shots/cosmosWebOverlay.ts; build sheet notes/bcos/sheet.md §7): the Defender's red only on his
// things and only in their windows, placed under the rig; the type's odometer; the party monitor glyph for glyph the approved box's; and
// every character it draws in its atlas.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COSMOS_ATLASES, DEFENDER_TEXT, MONITOR_TEXT } from '../src/content/cosmos.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import { IDENTITY_VIEW } from '../src/engine/view.ts';
import * as CS from '../src/score/cosmos.ts';
import { COLS } from '../src/shots/hud.ts';
import { cFaces } from '../src/shots/cosmosWebPart.ts';
import { type OverlayFrame, SUCKED, TOPPLE, cOverlay, exponentAt, monitorRows, redAt, rigPoint } from '../src/shots/cosmosWebOverlay.ts';

const ADV = { display: () => 0.62, mono: () => 0.6, readout: () => 0.6 };
const { cs, COSMOS, POINT, HORIZON } = CS;
const C_FRAMES = Array.from({ length: COSMOS.to - cs(5) }, (_, i) => cs(5) + i);
const at = (f: number): OverlayFrame => cOverlay(f, IDENTITY_VIEW, ADV);
const text = (gs: readonly Glyph[]) => gs.map((g) => g.ch).join('');
const isRed = (f: number, c: readonly number[]) => {
  const r = redAt(f);
  return c.every((v, i) => Math.abs(v - r[i]) < 1e-9);
};

test('the rig: an in-world point moves with the picture (zoom about the centre, roll, offset); identity leaves it', () => {
  assert.deepEqual(rigPoint(IDENTITY_VIEW, 120, -40), [120, -40]);
  const [x, y] = rigPoint({ zoom: 1.04, x: 3, y: -2, roll: 0 }, 100, 50);
  assert.ok(Math.abs(x - 107) < 1e-9 && Math.abs(y - 50) < 1e-9);
  const [rx, ry] = rigPoint({ zoom: 1, x: 0, y: 0, roll: Math.PI / 2 }, 100, 0);
  assert.ok(Math.abs(rx) < 1e-9 && Math.abs(ry - 100) < 1e-9, 'positive roll turns counter-clockwise, like the view');
});

test('the odometer: 10²⁴ m through the web until the hint, rolling to 26 by 6.1, ticking 26 · 27 · 28 · 29 on the 16ths, then ∞', () => {
  for (let f = CS.MATCH; f < CS.RETICLE; f++) assert.equal(exponentAt(f).e, 24, `${f}`);
  assert.equal(exponentAt(HORIZON.at).e, 26);
  assert.equal(exponentAt(CS.INFINITY - 1).e, 29);
  assert.deepEqual([0, 6, 12, 18].map((t) => exponentAt(HORIZON.at + t).e), [26, 27, 28, 29]);
  // Then the exponent gives up: it topples (accelerating, clockwise) from TOPPLE and lands as ∞, flat, on the clap's frame.
  const nine = (f: number) => at(f).lightGlyphs.display.find((g) => g.ch === '9' && g.size < 200)?.rot ?? 0;
  assert.equal(nine(TOPPLE - 1), 0, 'upright until the topple');
  const r = [TOPPLE, TOPPLE + 1, TOPPLE + 2, TOPPLE + 3].map(nine);
  for (let i = 1; i < r.length; i++) assert.ok(r[i] < r[i - 1] && r[i - 1] - r[i] > (i > 1 ? r[i - 2] - r[i - 1] : 0), 'accelerating');
  assert.ok(r[3] < -0.5, 'well over the frame before the clap');
  const tilt = (f: number) => at(f).lightGlyphs.display.find((g) => g.ch === '∞' && g.size < 200)?.rot;
  assert.equal(tilt(CS.INFINITY - 1), undefined, 'no ∞ before the clap');
  assert.ok(Math.abs(tilt(CS.INFINITY)!) < 1e-9, 'flat on the clap');
});

test('the Defender’s red: his ring and shield on the web, the scanline only while it sweeps, the stamp from the relight to 6.1, the reticle for 4 f, his sandbox’s rim and his post on the horizon, his lines in their windows; nothing at all on the point', () => {
  const redText = (f: number) => text(at(f).lightGlyphs.mono.filter((g) => isRed(f, g.color)));
  for (const f of C_FRAMES) {
    const o = at(f);
    const red = o.light.filter((s) => isRed(f, s.color));
    if (f >= POINT.from) {
      assert.equal(o.light.length + o.dark.length + Object.values(o.lightGlyphs).flat().length + Object.values(o.darkGlyphs).flat().length, 0, `${f}: the point alone`);
      continue;
    }
    assert.ok(red.length > 0, `${f}: his red is on screen (ring, shield or rim)`);
    const stamp = f >= CS.WINK && f < HORIZON.at;
    assert.equal(redText(f).includes(DEFENDER_TEXT.stamp.replaceAll(' ', '')), stamp, `${f}: the stamp`);
    // The operator types it: from its first frame, whole 5 f later.
    const sandbox = f >= CS.SANDBOX && f < POINT.from - 3;
    assert.equal(redText(f).startsWith('[DEF'), sandbox, `${f}: the operator’s line`);
    if (sandbox) assert.equal(redText(f).includes(DEFENDER_TEXT.sandbox.replaceAll(' ', '')), f >= CS.SANDBOX + 5, `${f}: typed in 6 f`);
    assert.equal(redText(f).includes(DEFENDER_TEXT.done.replaceAll(' ', '')), f >= POINT.from - 3, `${f}: the verdict`);
    const wide = red.filter((s) => s.kind === 'segment' && s.w >= 2000);
    assert.equal(wide.length > 0, f >= CS.SCAN.from && f < CS.SCAN.to, `${f}: the scanline only while it sweeps`);
  }
  assert.ok(at(CS.RETICLE).light.filter((s) => s.kind === 'ring' && isRed(CS.RETICLE, s.color)).length >= 2, 'the reticle and the shield’s ring');
  assert.equal(at(CS.RETICLE + 4).light.filter((s) => s.kind === 'ring' && isRed(CS.RETICLE + 4, s.color) && s.w < 100).length, 0, 'the twitch lasts 4 f');
});

test('the counts: amber numbers and a red THREATS — 1.6×10³³ from 5.3&, climbing through the scan to 2.0×10³⁶ on the relight; ∞ THREATS from 6.2 to the stutter', () => {
  const display = (f: number) => at(f).lightGlyphs.display;
  const words = (f: number) => display(f).filter((g) => isRed(f, g.color) || (g.outlineColor && isRed(f, g.outlineColor)));
  assert.equal(words(CS.RACK.to - 1).length, 0);
  assert.equal(text(words(CS.RACK.to)), 'THREATS');
  assert.ok(text(display(CS.RACK.to)).includes('1.6×1033'));
  assert.ok(text(display(CS.WINK)).includes('2.0×1036'));
  assert.ok(text(words(CS.INFINITY)).includes('THREATS'));
  assert.ok(text(display(CS.INFINITY)).includes('∞'));
  assert.equal(words(CS.STUTTER.from).length, 0, 'gone with the stutter');
});

test('the suck swallows ∞ THREATS: whole until the sandbox, the nearest letter already pulled on its frame, every letter spiralling in (nearer, smaller, never brighter than itself), all gone by SUCKED', () => {
  // ∞ THREATS's own glyphs (its glow and core outlines; the scale label's are 0.075 and 0.026).
  const sucked = (f: number) => at(f).lightGlyphs.display.filter((g) => g.outline === 0.07 || g.outline === 0.022);
  const big = (f: number) => at(f).lightGlyphs.display.filter((g) => g.size >= 290);
  assert.ok(big(CS.SANDBOX - 1).length >= 16, 'the slam’s letters (glow + core) all in place on the frame before');
  assert.ok(at(CS.SANDBOX).lightGlyphs.display.some((g) => (g.stretch ?? 1) > 1), 'the drum frame shows the pull');
  // Every letter's light (its copies' alphas summed) never exceeds the letter's own, and its farthest copy only nears the hole.
  const per = (f: number) => {
    const m = new Map<string, { a: number; d: number; n: number }>();
    for (const g of at(f).lightGlyphs.display) {
      if (g.size < 20 && (g.stretch ?? 1) === 1) continue;
      const k = `${g.ch}:${g.outline}`;
      const e = m.get(k) ?? { a: 0, d: 0, n: 0 };
      m.set(k, { a: e.a + (g.alpha ?? 1), d: Math.max(e.d, Math.hypot(g.x, g.y)), n: e.n + 1 });
    }
    return m;
  };
  let prev = per(CS.SANDBOX);
  for (let f = CS.SANDBOX + 1; f < SUCKED; f++) {
    const now = per(f);
    for (const [k, e] of now) {
      assert.ok(e.a <= (k.startsWith('T') ? 2 : 1) + 1e-9, `${f}: ${k} no brighter than itself`);
      const p = prev.get(k);
      // (THREATS has two Ts: one key, two paths.)
      if (p && !k.startsWith('T')) assert.ok(e.d <= p.d + 2, `${f}: ${k} only falls in`);
    }
    prev = now;
  }
  assert.equal(sucked(SUCKED).length, 0, 'all swallowed');
  assert.equal(at(SUCKED - 1).lightGlyphs.display.filter((g) => g.ch === '∞' && g.size > 200).length, 0, 'the big ∞ went in first-ish');
  assert.ok(SUCKED <= CS.MONITOR[1].from + 4, 'gone as the monitor types in');
});

test('the party monitor: the approved box (hud.ts’s frame and gauges) from 6.3&, friends ∞, memory 96 %, cpu 97 %, the warning from 6.3a; inside the stutter it shows its content frame; closed on the fourth slice', () => {
  const [w] = CS.MONITOR.slice(1);
  assert.equal(monitorRows(w.from - 1), null);
  const rows = monitorRows(w.from)!;
  assert.equal(rows[0].frame[0].text.length, COLS);
  assert.ok(rows[0].frame[0].text.includes('kaomoji.exe :: party monitor'));
  assert.deepEqual(rows.slice(1, 4).map((r) => r.text.split(/\s+/)[0]), ['friends', 'memory', 'cpu']);
  assert.ok(rows[1].text.endsWith('∞'));
  assert.ok(rows[2].text.endsWith(`${MONITOR_TEXT.memory}%`) && rows[3].text.endsWith(`${MONITOR_TEXT.cpu}%`));
  assert.equal(rows.length, 5, 'no warning before 6.3a');
  assert.equal(monitorRows(CS.MONITOR_WARN.from)!.at(-1)!.text, MONITOR_TEXT.warn);
  assert.equal(monitorRows(w.to), null);
  assert.equal(w.to, CS.STUTTER.from + 15);
  const readout = (f: number) => at(f).darkGlyphs.readout;
  assert.ok(readout(w.from + 12).length > 60);
  assert.equal(readout(w.to).length, 0);
});

test('every character the overlay draws is in its atlas (display, mono, the readout, the faces)', () => {
  const sets = {
    display: new Set(COSMOS_ATLASES.display.chars),
    mono: new Set(COSMOS_ATLASES.mono.chars),
    readout: new Set(COSMOS_ATLASES.readout.chars),
    face: new Set(cFaces()),
  };
  for (const f of C_FRAMES) {
    const o = at(f);
    for (const [k, gs] of [...Object.entries(o.lightGlyphs), ...Object.entries(o.darkGlyphs)]) {
      for (const g of gs) assert.ok(sets[k as keyof typeof sets].has(g.ch), `${f}: ${g.ch} is not in the ${k} atlas`);
    }
  }
});

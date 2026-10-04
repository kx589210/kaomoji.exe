// S31S THE SWITCH, what each layer draws (src/shots/drop2SwitchFrame.ts): the capacities the scene allocates, every glyph in its atlas,
// the colour law per layer (amber only in his copies; red only Defender's), the X-ray handing over to the blueprint, the bytes typed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import opentype from 'opentype.js';
import { linear } from '../src/engine/color.ts';
import { LAW } from '../src/shots/drop2Shared.ts';
import * as D2 from '../src/score/drop2.ts';
import * as S from '../src/shots/drop2Switch.ts';
import { SWITCH_STRINGS, type SwitchAdvances, type SwitchFrame, project, switchFrame } from '../src/shots/drop2SwitchFrame.ts';
import * as T from '../src/shots/drop2SwitchType.ts';

const buf = readFileSync(new URL('../public/fonts/mplus-rounded-1c-extrabold.ttf', import.meta.url));
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const plans = T.facePlans((ch) => ({ cmds: font.getPath(ch, 0, 0, font.unitsPerEm).commands as T.PathCmd[], advance: T.FACE_CHAR_ADVANCE[ch] }));
const a = (): number => 0.6;
const adv: SwitchAdvances = { mono: a, display: a, jp: () => 1, rounded: (ch) => T.FACE_CHAR_ADVANCE[ch] ?? 2.698 };
const { SWITCH, BURST, CYANOTYPE, BOX, FLOOD, SIGNATURE_MATCH } = D2;
const all = Array.from({ length: (BURST - SWITCH.from) * 4 }, (_, i) => SWITCH.from + i / 4);
const frame = (f: number): SwitchFrame => switchFrame(f, plans, adv);
const same = (c: readonly number[], d: readonly number[]) => c.every((v, i) => Math.abs(v - d[i]) < 1e-9);
const AMBER = S.INK.amber;
const RED = S.INK.red;

test('every layer fits the capacity the scene gives it, at every quarter frame', () => {
  const cap = { grid: 512, blue: 4096, red: 2048, light: 256, scan: 512, hud: 2048, amber: 1024, flood: 1024 };
  for (const f of all) {
    const c = frame(f);
    for (const [k, n] of Object.entries(cap)) {
      const len = (c as unknown as Record<string, unknown[]>)[k].length;
      assert.ok(len <= n, `${f}: ${k} ${len} > ${n}`);
    }
    assert.ok(c.hudText.display.length + c.hudText.mono.length + c.hudText.jp.length <= 512, `${f}: hud glyphs`);
  }
});

test('every glyph is in its atlas', () => {
  const set = (xs: readonly string[]) => new Set(xs.join(''));
  const mono = set(SWITCH_STRINGS.mono);
  const display = set(SWITCH_STRINGS.display);
  const jp = set(SWITCH_STRINGS.jp);
  const rounded = new Set<string>(SWITCH_STRINGS.rounded);
  for (const f of all.filter((_, i) => i % 3 === 0)) {
    const c = frame(f);
    for (const g of [...c.blueText, ...c.redText, ...c.hudText.mono]) assert.ok(mono.has(g.ch), `mono ${g.ch}`);
    for (const g of c.hudText.display) assert.ok(display.has(g.ch), `display ${g.ch}`);
    for (const g of c.hudText.jp) assert.ok(jp.has(g.ch), `jp ${g.ch}`);
    for (const g of [...c.fill, ...c.amber, ...c.flood]) assert.ok(rounded.has(g.ch), `rounded ${g.ch}`);
  }
});

test('the colour law per layer: amber only in his copies and the flood; red only on Defender’s layers (boxes, scan sweeps, the HUD, the 2-frame outline flash)', () => {
  for (const f of all.filter((_, i) => i % 2 === 0)) {
    const c = frame(f);
    for (const s of [...c.grid, ...c.blue, ...c.red, ...c.hud, ...c.light]) assert.ok(!same(s.color, AMBER), `${f}: no amber shape`);
    for (const g of [...c.fill, ...c.blueText, ...c.hudText.mono, ...c.hudText.display]) assert.ok(!same(g.color, AMBER), `${f}: no amber type`);
    for (const g of [...c.amber, ...c.flood]) assert.ok(same(g.color, AMBER), `${f}: his copies are amber`);
    if (!S.outlineRed(f)) for (const s of [...c.blue, ...c.grid]) assert.ok(!same(s.color, RED), `${f}: the blueprint is never red but in its flash`);
  }
  assert.ok(frame(S.RED_FLASH).blue.some((s) => same(s.color, RED)), 'the outline flash');
  assert.ok(same(linear(LAW.hero, 1.2), AMBER));
});

test('9.1: the kernel’s X-ray face (filled, his ω the hot spot) drains into the outline over the cyanotype ramp; the grid draws out from him', () => {
  const t0 = frame(SWITCH.from);
  assert.equal(t0.fill.length, 5);
  assert.ok(t0.fill.find((g) => g.ch === 'ω')!.color[0] > t0.fill.find((g) => g.ch === '(')!.color[0], 'ω hot');
  assert.ok(t0.fill.every((g) => g.alpha === 1));
  assert.equal(t0.grid.length, 0);
  assert.equal(frame(CYANOTYPE.to).fill.length, 0);
  assert.ok(frame(CYANOTYPE.to).grid.length > 150, 'the whole grid by the end of the ramp');
  const mid = frame((CYANOTYPE.from + CYANOTYPE.to) / 2);
  assert.ok(mid.fill.length === 5 && mid.grid.length > 0 && mid.grid.length < frame(CYANOTYPE.to).grid.length);
});

test('the exploded planes carry their own labels (code points, em, Ø), shown only while the plane is lifted', () => {
  const text = (c: SwitchFrame) => c.blueText.map((g) => g.ch).join('');
  assert.equal(text(frame(D2.EXPLODE[0] - 1)), '');
  assert.ok(text(frame(D2.EXPLODE[0] + 6)).includes('U+0028'.replace(/ /g, '')), 'the brackets’ code points');
  assert.ok(text(frame(D2.EXPLODE[1] + 6)).includes('U+2022'));
  assert.ok(text(frame(D2.EXPLODE[2] + 5)).includes('U+03C9'));
  assert.equal(text(frame(BOX)), '', 'gone with the slam');
  // The planes lift: the ω's outline sits 360 px toward the lens before the slam.
  const zs = new Set(frame(D2.EXPLODE[2] + 5).blue.map((s) => Math.round((s.z ?? 0) / 10)));
  assert.ok(zs.size >= 4, 'the sheet and three planes at their depths');
});

test('the projection: front-on at zoom 1 a world px is a screen px about the centre; the axonometric moves nearer planes', () => {
  const p = S.switchPose(SWITCH.from);
  const [x, y] = project(p, [100, 50, 0]);
  assert.ok(Math.abs(x - 1060) < 1e-6 && Math.abs(y - 490) < 1e-6);
  const q = S.switchPose(D2.EXPLODE[0] + 12);
  const a0 = project(q, [0, 0, 0]);
  const a1 = project(q, [0, 0, 360]);
  assert.ok(Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) > 100, 'the ω plane stands off the sheet');
});

test('the HUD types SIGNATURE MATCH a byte a frame, then the big line; the title block and the arcs come with the flood', () => {
  const mono = (c: SwitchFrame) => c.hudText.mono.map((g) => g.ch).join('');
  assert.ok(mono(frame(SIGNATURE_MATCH.from)).includes('MATCHE2'), 'one byte');
  assert.ok(mono(frame(SIGNATURE_MATCH.from + 9)).endsWith('A2100%'), 'ten and 100 %');
  assert.ok(!mono(frame(BOX)).includes('MATCH'));
  assert.ok(mono(frame(BURST - 1)).includes('DWG1/5·WAVE'));
  assert.ok(frame(BURST - 1).hud.length > frame(FLOOD - 1).hud.length, 'the arcs drawn');
  assert.equal(frame(BURST - 1).flood.length, S.floodAt(BURST - 1).length);
  assert.ok(frame(FLOOD + 3).amber.length === 0, 'the copies burst into the flood');
});

test('rev 2: from the flood his outline carries a dark #0B1650 keyline under a 3 px line (he never melts into the glow); before it, none', () => {
  const ON = S.INK.onBlue;
  const keylines = (c: SwitchFrame) => c.blue.filter((s) => s.kind === 'segment' && same(s.color, ON) && s.h >= 8).length;
  assert.equal(keylines(frame(FLOOD - 1)), 0);
  assert.ok(keylines(frame(FLOOD + 2)) > 100, 'every contour keylined');
  assert.ok(keylines(frame(BURST - 1)) > 100);
});

test('rev 2: the bytes ride his box as its label from the stamp to the burst (mono, red on #0B1650), and the chip is gone', () => {
  const mono = (c: SwitchFrame) => c.hudText.mono.map((g) => g.ch).join('');
  const bytes = 'E280A220CF8920E280A2';
  assert.ok(!mono(frame(S.TAG_STAMP - 1)).includes(bytes));
  for (const f of [S.TAG_STAMP, S.TAG_STAMP + 12, FLOOD, BURST - 1]) {
    const c = frame(f);
    assert.ok(mono(c).includes(bytes), `${f}: the label`);
    assert.ok(!mono(c).includes('MATCH'), `${f}: not the chip`);
    assert.ok(c.hudText.mono.filter((g) => same(g.color, RED)).length >= 20, `${f}: red`);
  }
});

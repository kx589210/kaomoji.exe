// The party monitor over drop 2 (src/shots/drop2Monitor.ts; build sheet notes/d2build/sheet.md §7.1): the corner windows that
// carry the readout from the break's overload to S31's full-screen box. Read back like a viewer: which window, what it says, when.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DROP2_TEXTS, MONITOR2 } from '../src/content/drop2.ts';
import { BAR4, DEFENDER_ROWS, DROP2_END, DROP2_START, HAIRLINE, HANG, HATS2, INSTALL, KERNEL, KERNEL_DOLLY, KERNEL_SCAN, W1, W2, W3 } from '../src/score/drop2.ts';
import * as M from '../src/shots/drop2Monitor.ts';

const advance = () => 0.6;
const text = (f: number): string => {
  const g = M.monitorContent(f, advance).glyphs.mono ?? [];
  return g.map((x) => x.ch).join('');
};
const rowsOf = (f: number): string[] => {
  const g = [...(M.monitorContent(f, advance).glyphs.mono ?? [])].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = new Map<number, string>();
  for (const x of g) rows.set(Math.round(x.y), (rows.get(Math.round(x.y)) ?? '') + x.ch);
  return [...rows.values()];
};

test('three windows: W1 over S27, W2 over the cube, W3 over S29 until intro bar 4’s frame — nothing while the break’s window collapses, over intro bar 4, the match cut or S30–T7', () => {
  for (let f = DROP2_START; f < DROP2_END; f++) {
    const inside = M.MONITOR_WINDOWS.some((w) => f >= w.from && f < w.to);
    assert.equal(text(f).length > 0, inside, `${f}`);
  }
  assert.deepEqual(M.MONITOR_WINDOWS.map((w) => [w.from, w.to]), [[W1.from, W1.to], [W2.from, W2.to], [W3.from, W3.to]]);
  assert.equal(text(DROP2_START + 5), '', 'the E5 window collapses first: the system’s one voice never doubles');
  assert.ok(W3.to <= BAR4.from, 'intro bar 4’s frame is S04’s own: no monitor over it');
});

test('a window types in over its first 8 frames from the left, the box and its rows together, then holds', () => {
  const n = (f: number) => text(f).length;
  assert.ok(n(W1.from) > 0, 'something on its first frame');
  for (let f = W1.from; f < W1.from + 7; f++) assert.ok(n(f + 1) > n(f), `${f}: typing`);
  assert.equal(n(W1.from + 7), n(W1.from + 14), 'typed in on its 8th frame');
  assert.ok(rowsOf(W1.from + 10).some((r) => r.startsWith('╔═kaomoji.exe::partymonitor')), 'the hud.ts box');
});

test('the readout: friends ∞, hype ∞, memory over 100 % ticking up one a 16th, red, from the break’s 125 % to S31’s 255 %', () => {
  const rows = rowsOf(W1.from + 10);
  assert.ok(rows.some((r) => r.includes('friends∞')));
  assert.ok(rows.some((r) => r.includes('hype∞')));
  const mem = (f: number) => M.memoryAt(f);
  assert.equal(mem(W1.from), 125);
  let last = 0;
  for (const h of HATS2.filter((x) => x >= W1.from && x < W1.to)) {
    assert.ok(mem(h) >= last, `${h}: never down`);
    assert.equal(mem(h + 3), mem(h), `${h}: steps on the 16th, holds between`);
    last = mem(h);
  }
  assert.ok(mem(W1.to - 1) >= 133);
  assert.ok(mem(W2.from) > mem(W1.to - 1) && mem(W3.from) > mem(W2.to - 1), 'it keeps climbing between windows');
  assert.ok(mem(W3.to - 1) < 255, 'S31 opens on 255 %');
  const m = M.monitorContent(W1.from + 10, advance).glyphs.mono!.find((g) => g.ch === '%')!;
  assert.ok(m.color[0] > m.color[1], 'over 100 %: pink-red');
});

test('each window’s line: W1 resumed (green, steady), W2 costume 3/4 → cache full on drop2 2.4 (amber, blinking 3/3), W3 the unexpected dimension (pink-red)', () => {
  // Defender's red row (item I) types in under the line from its own frame, so the window's line is found by its text, not as the last row.
  const squash = (s: string) => s.replace(/\s/g, '');
  const has = (f: number, s: string) => rowsOf(f).includes(squash(s));
  assert.ok(has(W1.from + 20, MONITOR2.w1));
  assert.ok(has(W1.from + 23, MONITOR2.w1), 'ok lines never blink');
  assert.ok(has(W2.from + 12, MONITOR2.w2[0]));
  const warn = W2.from + 24;
  assert.ok(has(warn, MONITOR2.w2[1]));
  const on = [0, 1, 2, 3, 4, 5].map((k) => rowsOf(warn + k).some((r) => r.includes('[WARN]')));
  assert.deepEqual(on, [true, true, true, false, false, false], 'the warning blinks 3 on, 3 off');
  assert.ok(has(W3.from + 12, MONITOR2.w3));
});

test('a window folds shut over its last 5 frames (squashed toward its middle and fading) and is gone on its last frame', () => {
  const height = (f: number) => {
    const ys = (M.monitorContent(f, advance).glyphs.mono ?? []).map((g) => g.y);
    return Math.max(...ys) - Math.min(...ys);
  };
  assert.ok(height(W1.to - 6) > 100);
  for (let f = W1.to - 5; f < W1.to - 1; f++) assert.ok(height(f + 1) < height(f), `${f}: folding`);
  assert.equal(text(W1.to), '');
});

test('every character the monitor draws is in its atlas list and in drop 2’s mono strings (check-glyphs covers them); it never draws the fps line', () => {
  const mono = new Set(DROP2_TEXTS.filter((t) => t.role === 'mono').flatMap((t) => [...t.text]));
  for (const c of M.MONITOR_CHARS) assert.ok(mono.has(c), `${c} in DROP2_TEXTS (mono)`);
  for (let f = DROP2_START; f < DROP2_END; f += 1) {
    for (const g of M.monitorContent(f, advance).glyphs.mono ?? []) assert.ok(M.MONITOR_CHARS.includes(g.ch), `${f}: ${g.ch}`);
    assert.ok(!text(f).includes('fps'), `${f}: the fps line is Drop2Overload’s`);
  }
});

// ——— Defender's quiet thread (sheet §1.3 item I, §4.4, §7.2; the act-1 fixer, round 1, R1-T03) ——————————————————————————————————————

test('item I: each window gets Defender’s red row on its frame (W1 1.2, W2 2.4e, W3 4.2e) — red, its ω amber — typed in under the line while the box grows a row upward; before it the window is as built', () => {
  const rows = [
    { w: M.MONITOR_WINDOWS[0], at: DEFENDER_ROWS[0], text: '[DEFENDER] sandbox breached (￣ω￣;)' },
    { w: M.MONITOR_WINDOWS[1], at: DEFENDER_ROWS[1], text: '[DEFENDER] 4 scans · 0 matches' },
    { w: M.MONITOR_WINDOWS[2], at: DEFENDER_ROWS[2], text: '[DEFENDER] 2D scanner · axis z unsupported' },
  ];
  for (const r of rows) {
    assert.equal(r.w.defender.at, r.at);
    assert.equal(r.w.defender.text, r.text);
    assert.ok(r.at > r.w.from && r.at < r.w.to - 12, 'inside its window, with time to read');
    assert.ok(!text(r.at - 1).includes('DEFENDER'), `${r.at - 1}: not yet`);
    const g = M.monitorContent(r.at + 10, advance).glyphs.mono!;
    const red = g.filter((x) => 'DEFNR'.includes(x.ch) && x.color[0] > 2 * x.color[1]);
    assert.ok(red.length >= 7, `${r.at + 10}: [DEFENDER] in red`);
    const omega = g.find((x) => x.ch === 'ω');
    if (r.text.includes('ω')) assert.ok(omega && omega.color[1] > 0.3 * omega.color[0], 'its ω amber (the infection)');
    // The box grows upward: its top is a row higher once the row is in; its bottom never moves (the hairline's tag lives under it).
    const box = (f: number) => M.monitorContent(f, advance).under[0];
    const top = (f: number) => box(f).y + box(f).h / 2;
    const bot = (f: number) => box(f).y - box(f).h / 2;
    assert.ok(top(r.at + 4) > top(r.at - 1) + 20, 'a row taller');
    assert.ok(Math.abs(bot(r.at + 4) - bot(r.at - 1)) < 1e-6, 'the bottom stays');
  }
});

test('the hairline: 2 px of Defender’s red at 70 % on the bottom edge, from drop2 1.1& (4 %) to 8.1 (94 %) and 8.4 (100 % · downloaded), growing on its keys, its tag on its tip; handed to the kernel on 8.4&', () => {
  assert.equal(M.hairlineAt(HAIRLINE[0].at - 1), null, 'nothing before its first key');
  for (const k of HAIRLINE) {
    const h = M.hairlineAt(k.at + M.HAIR.grow)!;
    assert.ok(Math.abs(h.pct - k.pct) < 1e-9, `${k.at}: ${k.pct} %`);
    assert.equal(h.y, 1077);
    assert.equal(h.h, 2);
    assert.equal(h.alpha, 0.7);
    assert.ok(M.hairlineAt(k.at)!.pct > (M.hairlineAt(k.at - 1)?.pct ?? 0), `${k.at}: the beat frame already moves`);
  }
  assert.equal(M.hairlineAt(HAIRLINE[0].at + 8)!.tag, 'defender updating 4%');
  assert.equal(M.hairlineAt(HANG.from + 8)!.tag, 'defender v2.0 downloaded');
  assert.equal(M.hairlineAt(INSTALL.from - 1)!.len, 1920);
  assert.equal(M.hairlineAt(INSTALL.from), null, 'the install bar is the kernel’s');
  let last = 0;
  for (let f = HAIRLINE[0].at; f < INSTALL.from; f++) {
    const h = M.hairlineAt(f)!;
    assert.ok(h.pct >= last - 1e-9, `${f}: it never shrinks`);
    last = h.pct;
    const c = M.hairlineContent(f, advance);
    const line = c.under[0];
    assert.ok(line.y - line.h / 2 >= -540 + 2 - 1e-9 && line.y + line.h / 2 <= -540 + 4 + 1e-9, `${f}: on y 1076–1078`);
    for (const g of c.glyphs.mono ?? []) assert.ok(540 - g.y >= 1056 && 540 - g.y < 1080 && g.x >= -960, `${f}: its tag inside item I's strip`);
  }
});

test('the v1 slot (drop2 8): opens on 8.1 in a red 2 px frame, logs `defender.sys v1.0 (￣ω￣;)` · `[SCAN] 1 threat` · `[ERR] 16 processes down` · `[FATAL] … not responding` on their frames, greys with the hang, folds before the install', () => {
  assert.deepEqual(M.SLOT1_LINES.map((l) => l.at), [KERNEL.from, KERNEL_SCAN, KERNEL_DOLLY.to, HANG.from]);
  assert.equal(M.slotContent(KERNEL.from - 1, advance).under.length, 0);
  assert.equal(M.slotContent(INSTALL.from, advance).under.length, 0);
  const slotText = (f: number) => (M.slotContent(f, advance).glyphs.mono ?? []).map((g) => g.ch).join('');
  assert.ok(slotText(KERNEL.from + 10).includes('defender.sysv1.0'));
  assert.ok(slotText(KERNEL_SCAN + 10).includes('[SCAN]1threat'));
  assert.ok(slotText(KERNEL_DOLLY.to + 10).includes('[ERR]16processesdown'));
  assert.ok(slotText(HANG.from + 10).includes('[FATAL]defender.sysnotresponding'));
  const box = M.slotContent(KERNEL.from + 10, advance).under[0];
  assert.equal(box.outline, 2);
  assert.ok(box.outlineColor![0] > 3 * box.outlineColor![1], 'a red frame');
  const grey = M.slotContent(HANG.from + 8, advance).under[0];
  assert.ok(Math.abs(grey.outlineColor![0] - grey.outlineColor![1]) < 0.2, 'greyed by the hang');
  // It sits bottom left, clear of the hero's place.
  assert.ok(box.x - box.w / 2 >= -960 + 40 && box.x + box.w / 2 <= -960 + 700);
  assert.ok(box.y - box.h / 2 >= 540 - 1040);
});

test('the layer draws the windows, the hairline and the slot together (readoutContent), each in its own span', () => {
  for (const f of [W1.from + 30, KERNEL.from + 20, HANG.from + 4]) {
    const all = M.readoutContent(f, advance);
    const parts = [M.monitorContent(f, advance), M.hairlineContent(f, advance), M.slotContent(f, advance)];
    assert.equal(all.under.length, parts.reduce((a, p) => a + p.under.length, 0));
    assert.equal((all.glyphs.mono ?? []).length, parts.reduce((a, p) => a + (p.glyphs.mono ?? []).length, 0));
  }
  for (let f = DROP2_START; f < DROP2_END; f += 3) for (const g of M.readoutContent(f, advance).glyphs.mono ?? []) assert.ok(M.MONITOR_CHARS.includes(g.ch), `${f}: ${g.ch}`);
});

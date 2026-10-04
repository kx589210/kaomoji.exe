// v2 of the flat bars (break 2–5), the party monitor re-voiced (src/shots/breakSystem.ts monitorAtV2 / monitorContentV2; sheet
// notes/bid2/break-sheet2.md §9.2–§9.3, the readout thread): the title counts threats, the gauges count his parts (removed: red, the
// antivirus's; fetched: amber, his), each status line in its speaker's colour — and the monitor steps aside for the antivirus's POV.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MONITOR_ROWS_V2, MONITOR_TITLE_V2 } from '../src/content/break.ts';
import { BREAK_PALETTE } from '../src/shots/breakShared.ts';
import { MONITOR, MONITOR_FOLD, MONITOR_LINES_V2, POV, WIPE } from '../src/score/break.ts';
import { MONITOR_BOX_V2, monitorAtV2, monitorContentV2, speakerOf } from '../src/shots/breakSystem.ts';

test('the readout thread: each v2 line on its frame, in order — hotfix (•ω•), flipped, fetched, the retries, the tofu, his fetch, restored, removing eye.L (again), remove(remove(remove)), the hang, the restart, screen replaced', () => {
  assert.equal(MONITOR_LINES_V2.length, MONITOR_ROWS_V2.length);
  let status = '';
  MONITOR_LINES_V2.forEach((at, k) => {
    if (MONITOR_ROWS_V2[k].status !== undefined) status = MONITOR_ROWS_V2[k].status!;
    const m = monitorAtV2(at);
    if (at >= POV.from && at < POV.to) return;
    assert.ok(m, `shown on ${at}`);
    assert.equal(m!.status, status.includes('[·····]') ? m!.status : status, `line ${k}`);
  });
  const last = monitorAtV2(MONITOR_FOLD.from - 1)!;
  assert.equal(last.status, '[ OK ] restart #1 · screen replaced');
  assert.equal(last.removed, 8);
  assert.equal(last.fetched, 5);
});

test('it is hidden before 2.4, through the POV (we are the antivirus), under the restart wipe’s cover, and folds away in bar 5', () => {
  assert.equal(monitorAtV2(MONITOR.from - 1), null);
  assert.ok(monitorAtV2(MONITOR.from));
  for (let f = POV.from; f < POV.to; f++) assert.equal(monitorAtV2(f), null, `POV ${f}`);
  assert.equal(monitorAtV2(WIPE.from + 3), null);
  assert.equal(monitorAtV2(MONITOR.to), null);
  assert.ok(monitorAtV2(MONITOR_FOLD.to - 1)!.fold > 0.5);
});

test('47 columns: the title with its threat count, two part gauges (2 cells a part), the status, the frame', () => {
  for (let f = MONITOR.from; f < MONITOR.to; f += 5) {
    const m = monitorAtV2(f);
    if (!m) continue;
    assert.equal(m.rows.length, 5);
    for (const r of m.rows) assert.equal([...r].length, MONITOR_BOX_V2.cols, `row width on ${f}: ${r}`);
    assert.ok(m.rows[0].includes(MONITOR_TITLE_V2));
    const filled = [...m.rows[1]].filter((c) => '=+*#%@'.includes(c)).length;
    assert.ok(filled <= 2 * m.removed && filled >= 2 * m.removed - 6, `removed gauge on ${f}`);
  }
});

test('the speaker’s colour: [DEFENDER] red (the antivirus), [ OK ] green, [FAIL] / [HANG] pink, [ .. ] amber (his fetch); the removed gauge red, the fetched gauge amber', () => {
  assert.equal(speakerOf('[DEFENDER] x'), 'defender');
  assert.equal(speakerOf('[ OK ] x'), 'ok');
  assert.equal(speakerOf('[FAIL] x'), 'alarm');
  assert.equal(speakerOf('[HANG] x'), 'alarm');
  assert.equal(speakerOf('[ .. ] x'), 'him');
  const adv = () => 0.6;
  const near = (a: readonly number[], b: readonly number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
  const f = MONITOR.from + 20;
  const c = monitorContentV2(f, adv);
  const mono = c.glyphs.mono ?? [];
  const m = monitorAtV2(f)!;
  assert.equal(m.speaker, 'defender');
  // The status row's letters are red; some gauge cells are red (removed) and some amber (fetched).
  const red = BREAK_PALETTE.red;
  assert.ok(mono.filter((g) => near(g.color, red)).length >= [...m.status].filter((ch) => ch !== ' ').length);
  assert.ok(mono.some((g) => g.color[0] > 0.9 && g.color[1] > 0.3 && g.color[1] < 0.6 && g.color[2] < 0.1), 'amber cells');
});

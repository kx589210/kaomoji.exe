// The system's one voice in break bars 2–5 (src/shots/breakSystem.ts): the party monitor (screen), its patch tags (world), the callout.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BREAK_TEXTS, CALLOUT_CHIP, MONITOR_STATUS, TAG_TEXTS } from '../src/content/break.ts';
import { MONITOR_LINES } from '../src/score/break.ts';
import { calloutAt, monitorAt, monitorContent, tagsAt, tagsContent, calloutContent } from '../src/shots/breakSystem.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

const adv = (): number => 0.6;

test('the monitor: up on 22.4, swept by the restart wipe, back on 25.1 without typing, folded away by 25.2 + 6', () => {
  assert.equal(monitorAt(at(2, 4) - 1), null);
  assert.ok(monitorAt(at(2, 4)));
  assert.ok(monitorAt(at(4, 4.5) - 2));
  assert.equal(monitorAt(at(4, 4.625)), null);
  assert.ok(monitorAt(at(5)));
  assert.equal(monitorAt(at(5))!.typed, 1);
  assert.ok(monitorAt(at(5, 2.125))!.fold > 0);
  assert.equal(monitorAt(at(5, 2.25)), null);
});

test('the monitor’s status line follows MONITOR_LINES and never runs past 40 characters', () => {
  const want: [number, string][] = [
    [at(2, 4), MONITOR_STATUS.patch1],
    [at(3, 3), MONITOR_STATUS.mismatch],
    [at(4, 2.125), MONITOR_STATUS.retry(3)],
    [at(4, 2.5), MONITOR_STATUS.tofu],
    [at(4, 2.75), MONITOR_STATUS.fetch],
    [at(4, 3), MONITOR_STATUS.restored],
    [at(4, 3.5), MONITOR_STATUS.detached],
    [at(4, 4), MONITOR_STATUS.hang],
    [at(5), MONITOR_STATUS.restarted],
  ];
  for (const [f, s] of want) assert.equal(monitorAt(f)!.status, s, `status on ${f}`);
  for (const f of MONITOR_LINES) {
    const m = monitorAt(f);
    if (m) assert.ok(m.status.length <= 40, `${m.status}`);
  }
});

test('integrity climbs in ramp waves (38 → 64 → 89, back to 81, 100 ✓); memory runs away (131 → 199) and resets to 64 %', () => {
  const mon = (f: number) => monitorAt(f)!;
  assert.equal(mon(at(3, 1.25) + 2).integrity, 38);
  assert.equal(mon(at(4, 1.5)).integrity, 64);
  assert.equal(mon(at(4, 3.5) - 2).integrity, 89);
  assert.equal(mon(at(4, 3.5) + 2).integrity, 81);
  assert.equal(mon(at(5, 1.25)).integrity, 100);
  assert.equal(mon(at(2, 4.5)).memory, 131);
  assert.equal(mon(at(4, 4.25) - 1).memory, 199);
  assert.equal(mon(at(5, 1.25)).memory, 64);
  // The wave: a newly filled cell steps through the ramp, so mid-wave the gauge is partly sparse characters.
  const mid = mon(at(2, 4.25)).rows[2];
  assert.ok(/[.:\-=+*#%]/.test(mid), mid);
});

test('the patch tags: T0 is red on our side, then ✓ retrieved; at most four tags at once before the copy burst', () => {
  const t0 = (f: number) => tagsAt(f, adv).find((t) => t.id === 0)!;
  assert.equal(t0(at(2, 2)).full, TAG_TEXTS.t0[0]);
  assert.equal(t0(at(2, 2)).error, true);
  assert.equal(t0(at(2, 4) + 2).full, TAG_TEXTS.t0[1]);
  assert.equal(t0(at(2, 4) + 2).error, false);
  for (let f = at(2); f < at(4, 3.75); f++) assert.ok(tagsAt(f, adv).length <= 4, `${f}`);
  assert.equal(tagsAt(at(3, 1.5) + 1, adv).length, 0, 'the first three fold on 23.1');
  // R1-07b: a copy on every 16th from break 4.3& + 6 to the hang (break 4.3e, 4.3&, 4.3a and 4.3a + 3), for each tag from its own pop on.
  const burst = tagsAt(at(4, 4) - 1, adv);
  for (const t of burst) {
    const since = [at(4, 3.25), at(4, 3.5), at(4, 3.75), at(4, 3.875)].filter((b) => b >= [at(4, 1.5), at(4, 2), at(4, 3.25), at(4, 3.5), at(4, 3.75)][t.id - 4]).length;
    assert.equal(t.copies, since, `tag T${t.id}`);
  }
  assert.ok(burst.some((t) => t.copies === 4), 'four copies on the tags that were up from the first burst');
});

test('the callout frames the 2400 picture (R1-13: x 312–1608, y 176–904, ×1.48), its chip typed, everything outside dimmed', () => {
  const c = calloutAt(at(6) - 1)!;
  assert.deepEqual([c.x0, c.x1, c.y0, c.y1], [312, 1608, 176, 904]);
  assert.equal(c.edges, 1);
  assert.equal(c.chip, CALLOUT_CHIP);
  assert.ok(c.dim > 0.14);
  assert.equal(calloutAt(at(5, 4.5) - 1), null);
});

test('every character the system draws is in the break’s mono texts', () => {
  const mono = new Set(BREAK_TEXTS.filter((t) => t.role === 'mono').flatMap((t) => [...t.text]));
  const seen = new Set<string>();
  for (let f = at(2); f < at(6); f++) {
    for (const c of [monitorContent(f, adv), tagsContent(f, adv), calloutContent(f, adv)]) for (const gs of Object.values(c.glyphs)) for (const g of gs) seen.add(g.ch);
  }
  for (const ch of seen) assert.ok(mono.has(ch), `"${ch}" is not in BREAK_TEXTS (mono)`);
  assert.ok(seen.size > 30);
});

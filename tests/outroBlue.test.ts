// E1 BLUE (src/shots/outroBlue.ts, src/shots/outroSigCode.ts): the seam decoded in place, the bytes, the stamp, the staged log, the
// code, the small print, `exit`, the squeeze and the last word lifted out (build sheet notes/b58/ending-sheet.md §3.1, §4 IN, §5).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DECODE } from '../src/content/boot.ts';
import * as C from '../src/content/outro.ts';
import { type Glyph } from '../src/engine/glyphField.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import * as O from '../src/score/outro.ts';
import { CRISP_INK, DRAINED, crispFace } from '../src/shots/drop2Crash.ts';
import { t7CellCentre } from '../src/shots/drop2Shared.ts';
import { squeezeAt } from '../src/shots/outroAperture.ts';
import { SEAM_SPOT, seamSpotDistance } from '../src/shots/outroShared.ts';
import * as B from '../src/shots/outroBlue.ts';
import { lastWordAt } from '../src/shots/outroMonitor.ts';
import { OUTRO_ATLAS } from '../src/shots/outroStrings.ts';
import { cellWidth } from '../src/engine/textGrid.ts';

/** A fake layout: every mono cell 0.6 em (JetBrains Mono), rounded faces at their real proportions, the display font ≈ 0.5 em. */
const ROUND: Record<string, number> = { '(': 0.36, ')': 0.36, '•': 0.42, 'ω': 0.82, '×': 0.6, '+': 0.6, '<': 0.6, '－': 1, ヽ: 1, ﾉ: 0.5, '✧': 1 };
const L: B.BlueLayout = { mono: () => 0.6, bold: () => 0.6, rounded: (ch) => ROUND[ch] ?? 0.6, display: () => 0.5 };
const range = (a: number, b: number, step = 1): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
/** Every sub-frame of output frame F under the part's own sampling (the ending's whole span, built or not). */
const subs = (F: number): number[] => temporalSamples(F, B.blueTemporal(F), { from: O.OUTRO_START, to: O.LOOP }).map((s) => s.frame);

test('the seam: on outro 1.1 − 1 the field is drop 2’s drained @ on every T7 cell; on 1.1 the cells below the band keep their places and ink, only their glyphs change', () => {
  const before = B.seamField(O.OUTRO_START - 1);
  const cells = (B.FIELD.cols[1] - B.FIELD.cols[0] + 1) * (B.FIELD.rows[1] - B.FIELD.rows[0] + 1);
  assert.equal(before.length, cells);
  for (const g of before) {
    assert.equal(g.ch, '@');
    assert.deepEqual(g.color, DRAINED);
  }
  // Same cells as drop 2's T7 grid (t7CellCentre, layout px).
  const [c0, r0] = [B.FIELD.cols[0], B.FIELD.rows[0]];
  const [lx, ly] = t7CellCentre(c0, r0);
  assert.ok(Math.abs(before[0].x - (lx - 960)) < 1e-9 && Math.abs(before[0].y - (540 - ly)) < 1e-9);
  // WP6: the blue bursts out of his spot. On 1.1 + 1 the front is out past the decode zone's width: inside it nothing (the blue), in the
  // zone ahead of it a new DECODE glyph a frame, beyond it drop 2's @ — every cell where drop 2 left it, in its ink.
  const F = O.OUTRO_START + 1;
  const on = B.seamField(F);
  const front = B.burstFront(F);
  assert.ok(on.length > 0 && on.length < cells, 'the burst has cleared the middle');
  const at = new Map(before.map((g) => [`${g.x},${g.y}`, g]));
  let zone = 0;
  let changed = 0;
  for (const g of on) {
    const old = at.get(`${g.x},${g.y}`);
    assert.ok(old, 'every cell still where drop 2 left it');
    assert.deepEqual(g.color, old.color);
    const d = seamSpotDistance(g.x + 960, 540 - g.y);
    assert.ok(d >= front - 1e-9, 'only outside the front');
    if (d < front + B.BURST.zone) {
      zone++;
      assert.ok([...DECODE].includes(g.ch));
      if (g.ch !== B.seamField(F + 1).find((q) => q.x === g.x && q.y === g.y)?.ch) changed++;
    } else assert.equal(g.ch, '@', 'beyond the zone: drop 2’s @, untouched');
  }
  assert.ok(zone > 100, 'a decode zone ahead of the front');
  assert.ok(B.seamField(O.OUTRO_START + 6).length === 0, 'gone by + 6: the front is past the farthest cell');
  void changed;
});

test('WP6: the burst — the front leaves his spot’s half-lit edge on 1.1 and launches out (cubic-out: ¾ of the way by HEX, his bytes), past the farthest corner by 1.1 + BURST.frames; its ring of light rides it; burstPass inverts it', () => {
  assert.equal(B.burstFront(O.OUTRO_START - 0.01), -Infinity);
  assert.equal(B.burstFront(O.OUTRO_START), -SEAM_SPOT.soft / 2);
  const corner = Math.max(...[[0, 0], [1920, 0], [0, 1080], [1920, 1080]].map(([x, y]) => seamSpotDistance(x, y)));
  assert.ok(B.BURST.reach > corner + 30, `past the farthest corner (${corner.toFixed(0)} px) with its ring`);
  assert.ok(B.burstFront(O.HEX) >= B.BURST.start + 0.75 * (B.BURST.reach - B.BURST.start) - 1e-9, '¾ of the way on HEX');
  assert.equal(B.burstFront(O.OUTRO_START + B.BURST.frames), B.BURST.reach);
  let last = -Infinity;
  let step = Infinity;
  for (let f = O.OUTRO_START; f <= O.OUTRO_START + B.BURST.frames; f += 0.25) {
    const x = B.burstFront(f);
    assert.ok(x >= last, 'outward only');
    if (last > -Infinity) {
      assert.ok(x - last <= step + 1e-9, 'decelerating: a launch, its speed falling');
      step = x - last;
    }
    last = x;
  }
  for (const d of [-200, -32, 0, 100, 400, 700, 900]) {
    const p = B.burstPass(d);
    assert.ok(B.burstFront(p) >= d - 1e-6 && (p === O.OUTRO_START || B.burstFront(p - 1) < d), `burstPass(${d}) = ${p}`);
  }
  assert.equal(B.burstRing(O.OUTRO_START), B.BURST.ring.alpha);
  assert.equal(B.burstRing(O.OUTRO_START + B.BURST.frames), 0);
  // His face is untouched on the downbeat, at the spot's centre: the anchor holds (Δ 0) through drop 2's last frame and 1.1.
  const face = B.heroGlyphs(O.OUTRO_START, L).rounded.map((g) => [g.x + 960, 540 - g.y]);
  const cx = face.reduce((a, [x]) => a + x, 0) / face.length;
  assert.ok(Math.abs(cx - SEAM_SPOT.centre[0]) < 1 && face.every(([, y]) => Math.abs(y - SEAM_SPOT.centre[1]) < 1e-9), 'his face on the spot’s centre');
});

test('WP6: the static copy decodes in behind the front, glyph by glyph — never ahead of it on drop 2’s dark; whole and final by 1.1 + BURST.frames', () => {
  for (let f = O.OUTRO_START; f <= O.OUTRO_START + B.BURST.frames + 3; f += 0.5) {
    const front = B.burstFront(f);
    for (const g of B.staticCopy(f, L).glyphs) assert.ok(seamSpotDistance(g.x + 960, 540 - g.y) <= front + 1e-9, `${f}: ${g.ch} ahead of the front`);
  }
  // (The progress line's first step is 1.1&, after this.)
  const done = B.staticCopy(O.OUTRO_START + B.BURST.frames, L).glyphs.map((g) => g.ch).join('');
  const later = B.staticCopy(O.PROGRESS[0] - 1, L).glyphs.map((g) => g.ch).join('');
  assert.equal(done, later, 'final');
  assert.ok(done.includes('savingfriends'), 'the progress line reads');
});

test('the seam: his (×ω×) on outro 1.1 is drop 2’s crisp face on its last frame — the same glyphs, places, size and ink (Δ 0)', () => {
  const theirs = crispFace(O.OUTRO_START - 1, { advance: { rounded: L.rounded } } as never);
  const mine = B.heroGlyphs(O.OUTRO_START, L).rounded;
  assert.deepEqual(mine.map((g) => g.ch), theirs.map((g) => g.ch));
  mine.forEach((g, i) => {
    assert.ok(Math.abs(g.x - theirs[i].x) < 1e-9 && Math.abs(g.y - theirs[i].y) < 1e-9, `glyph ${i}`);
    assert.equal(g.size, theirs[i].size);
    assert.deepEqual(g.color, CRISP_INK);
  });
});

test('his bytes: on HEX they sit compressed ×0.33 inside his box about x 960 and unfold (¾ by 1.1e, settled by HEX_SETTLED) to their cells x 299–1621 (ink 306–1616) — pure horizontal', () => {
  const xs = (f: number) => B.heroGlyphs(f, L).mono.filter((_, i) => i % 2 === 1).map((g) => g.x + 960);
  const hex = xs(O.HEX);
  const mid = (a: number[]) => (Math.min(...a) + Math.max(...a)) / 2;
  assert.ok(Math.abs(mid(hex) - 960) <= 1, `centred on 960 (${mid(hex)})`);
  assert.ok(Math.max(...hex) - Math.min(...hex) < 0.36 * 1220, 'compressed');
  assert.ok(B.unfold(O.at(1, 1.25)) >= 0.75 && B.unfold(O.at(1, 1.25)) < 1);
  assert.equal(B.unfold(O.HEX_SETTLED), 1);
  const settled = xs(O.HEX_SETTLED);
  const cell = 0.6 * B.BYTES.size;
  const [x0, x1] = [Math.min(...settled) - cell / 2, Math.max(...settled) + cell / 2];
  assert.ok(Math.abs(x0 - 299) < 1 && Math.abs(x1 - 1621) < 1, `cells x ${x0}–${x1}`);
  const ys = new Set(B.heroGlyphs(O.at(1, 1.25), L).mono.filter((_, i) => i % 2 === 1).map((g) => g.y));
  assert.equal(ys.size, 1, 'one line: no vertical travel');
});

test('the decoder reads one group a 32nd into his glyphs (• ω •), the brackets arrive on the second flip, the face closes on GATHER.to and is stamped × on 1.2', () => {
  const rounded = (f: number) => B.heroGlyphs(f, L).rounded.filter((_, i) => i % 2 === 1).map((g) => g.ch);
  assert.deepEqual(rounded(O.FLIPS[0]), ['•']);
  assert.deepEqual(rounded(O.FLIPS[1]).sort(), ['(', ')', '•', 'ω'].sort());
  assert.deepEqual(rounded(O.FLIPS[2]).sort(), ['(', ')', '•', '•', 'ω'].sort());
  assert.deepEqual(rounded(O.GATHER.to), [...C.HERO_OUT.alive]);
  assert.equal(B.faceText(O.STAMP - 1), C.HERO_OUT.alive);
  assert.equal(B.faceText(O.STAMP), C.HERO_OUT.crashed);
  assert.equal(B.faceText(O.FLICK.from), C.HERO_OUT.flick);
  assert.equal(B.faceText(O.FLICK.to), C.HERO_OUT.crashed);
  // His glyph centres when gathered: ( 697 · • 805 · ω 960 · • 1115 · ) 1223 (the sheet's measure, ± the fake advances).
  const xs = B.heroGlyphs(O.GATHER.to, L).rounded.filter((_, i) => i % 2 === 1).map((g) => g.x + 960);
  assert.ok(Math.abs(xs[2] - 960) < 1e-6 && xs[0] < xs[1] && xs[3] < xs[4]);
});

test('every swap on a beat is whole on its frame: each staged line, the stamp, the flips and the ✓ show on every sub-frame of their frame, popped (never a second, unpopped copy)', () => {
  for (const [i, at] of O.LINES.entries()) {
    if (i === 3) continue;
    for (const f of subs(at)) {
      const s = B.stagedLines(f, L, false);
      const sizes = new Set(s.glyphs.filter((g) => (g.alpha ?? 1) === 1).map((g) => +g.size.toFixed(3)));
      assert.ok(s.glyphs.length >= [...C.STAGED[i].text.replaceAll(' ', '')].length, `line ${i + 1} on ${f}`);
      for (const k of sizes) assert.ok(k > 56, `line ${i + 1} popped on sub-frame ${f} (${k})`);
    }
  }
  for (const f of subs(O.STAMP)) assert.equal(B.faceText(f), C.HERO_OUT.crashed);
  for (const [g, at] of O.FLIPS.entries()) for (const f of subs(at)) assert.ok(B.heroGlyphs(f, L).rounded.some((x) => x.ch === C.SIG_GLYPHS[g]), `flip ${g} on ${f}`);
  for (const f of subs(O.LAST_BEAT)) assert.ok(B.antivirusMarks(f).over.some((s) => s.kind === 'segment' && s.h > 15), `the ✓ on ${f}`);
});

test('the staged log stacks: the current line at 56 px on baseline 660, the one before rolled up to 36 px at 45 % on 576; older lines gone', () => {
  const f = O.at(1, 4) + 12;
  const s = B.stagedLines(f, L, false);
  const big = s.glyphs.filter((g) => Math.abs(g.size - 56) < 0.5);
  const small = s.glyphs.filter((g) => Math.abs(g.size - 36) < 0.5);
  assert.equal(big.length, [...C.STAGED[2].text.replaceAll(' ', '')].length);
  assert.equal(small.length, [...C.STAGED[1].text.replaceAll(' ', '')].length);
  for (const g of small) assert.ok(Math.abs((g.alpha ?? 1) - 0.45) < 1e-6);
  // The promise's frame number is in amber (the hero's), its words in the screen's text.
  const amber = big.filter((g) => g.color[0] > 1.5 && g.color[2] < 0.3);
  assert.equal(amber.map((g) => g.ch).join(''), String(O.WINK));
});

test('F8: the code’s paper never sits blank — nothing of the tile before the stamp; its three finder patterns snap in on 1.2, each on its own patch; the whole tile fades in over the 32nd into 1.2e with the first rows', () => {
  const inCode = (s: { x: number; y: number }) => s.x + 960 >= B.CODE.x0 && s.x + 960 <= B.CODE.x0 + B.CODE_TILE(21) && 540 - s.y >= B.CODE.y0 && 540 - s.y <= B.CODE.y0 + B.CODE_TILE(21);
  for (const f of range(O.OUTRO_START, O.STAMP - 0.25, 0.25)) assert.equal(B.staticCopy(f, L).under.filter(inCode).length, 0, `${f}: something of the code before the stamp`);
  const atStamp = B.staticCopy(O.STAMP, L).under.filter(inCode);
  assert.equal(atStamp.filter((s) => s.w === 9 * B.CODE.module).length, 3, 'three finder patches');
  assert.equal(atStamp.filter((s) => s.w === B.CODE_TILE(21)).length, 0, 'no tile yet');
  const modules = atStamp.filter((s) => s.w === B.CODE.module);
  assert.ok(modules.length > 0 && modules.every((s) => {
    const [c, r] = [Math.floor((s.x + 960 - B.CODE.x0) / B.CODE.module) - B.CODE.quiet, Math.floor((540 - s.y - B.CODE.y0) / B.CODE.module) - B.CODE.quiet];
    return B.inFinder(21, r, c);
  }), 'only the finders’ modules');
  assert.equal(B.codeTileIn(O.CODE_ROWS[0] - 3), 0);
  assert.equal(B.codeTileIn(O.CODE_ROWS[0]), 1);
});

test('F7: the guest’s registered face (￣▽￣) on its chip has its ￣ at eye height (BROW_DROP em below the em’s top), inside the chip', () => {
  const f = O.LINES[1] + 6;
  const s = B.stagedLines(f, L, false);
  const big = s.glyphs.filter((g) => Math.abs(g.size - 56) < 0.5);
  const brows = big.filter((g) => g.ch === '￣');
  const tri = big.find((g) => g.ch === '▽')!;
  assert.equal(brows.length, 2);
  for (const b of brows) assert.ok(Math.abs(tri.y - b.y - 0.28 * b.size) < 1e-6, 'dropped 0.28 em');
  const chip = s.under.find((u) => u.kind === 'rect' && u.w < 400 && Math.abs(u.y - tri.y) < 30)!;
  for (const b of brows) assert.ok(b.y + 0.2 * b.size <= chip.y + chip.h / 2, 'the ￣ ink inside the chip');
});

test('the 2D code fills three module rows a 16th from 1.2e and is whole by 1.3a; the progress line steps a 16th to 100 % on 1.4a', () => {
  assert.equal(B.codeRows(O.CODE_ROWS[0] - 1), 0);
  assert.equal(B.codeRows(O.CODE_ROWS[0]), 3);
  assert.equal(B.codeRows(O.CODE_ROWS.at(-1)!), 21);
  assert.equal(B.progressStep(O.OUTRO_START), 0);
  assert.equal(B.progressStep(O.PROGRESS.at(-1)!), C.PROGRESS_STEPS);
  assert.equal(C.progressText(B.progressStep(O.LAST_BEAT)), C.progressText(14));
});

test('the small print: 14 lines at 16 px in the right column (x 1180, ≤ 620 px wide); 13 a frame from 1.2&, the last one alone on the missing dub', () => {
  for (const l of C.SMALL_PRINT_LINES) {
    const w = [...l.text].reduce((a, ch) => a + cellWidth(ch), 0) * 0.6 * B.SMALL.size;
    assert.ok(w <= 620 && B.SMALL.x + w <= 1800, `“${l.text}” is ${w.toFixed(0)} px`);
  }
  assert.deepEqual(C.SMALL_PRINT_LINES.map((_, k) => B.smallPrintAt(k)), [...range(O.SMALL_PRINT, O.SMALL_PRINT + 13), O.DUB_MISSING]);
  const lines = (f: number) => new Set(B.staticCopy(f, L).small.map((g) => g.y)).size;
  assert.equal(lines(O.SMALL_PRINT + 12), 13);
  assert.equal(lines(O.DUB_MISSING - 1), 13);
  assert.equal(lines(O.DUB_MISSING), 14);
});

test('the antivirus’s marks: the reticle slides in on 1.4& and locks round the slot on 2.1, its ✓ on his face there; `exit` a key a 32nd; all DEFENDER red', () => {
  assert.equal(B.antivirusMarks(O.RETICLE.from - 1).over.length, 0);
  assert.ok(B.antivirusMarks(O.RETICLE.from).over.length > 0);
  const red = (s: { color: readonly number[] }) => s.color[0] > 1 && s.color[1] < 0.2;
  for (const s of B.antivirusMarks(O.LAST_BEAT + 6).over) assert.ok(red(s), 'red');
  const typed = (f: number) => B.staticCopy(f, L).glyphs.filter((g) => Math.abs(g.y - (540 - (B.EXIT.baseline - 0.3 * B.EXIT.size))) < 1e-6 && red(g)).length;
  assert.deepEqual(O.KEYS.map((k) => typed(k)), [1, 2, 3, 4]);
  assert.equal(typed(O.KEYS[0] - 1), 0);
});

test('the squeeze and the last word: line 4 leaves the picture on Enter at its own pixels and glides (I) to the centre, where OutroMonitor holds it on 2.2', () => {
  assert.deepEqual(squeezeAt(O.ENTER - 1), { sy: 1, gain: 1, white: 0, edge: 0 });
  assert.ok(squeezeAt(O.LINE - 0.01).sy < 0.01);
  const lifted = B.blueFrame(O.ENTER, L).paint.glyphs.bold.length;
  const before = B.blueFrame(O.ENTER - 1, L).paint.glyphs.bold.length;
  assert.equal(before - lifted, [...C.STAGED[3].text.replaceAll(' ', '')].length, 'line 4 is lifted out of the picture');
  const start = B.lastWordPlace(O.ENTER, L);
  const [x0, b0] = B.pushed(O.ENTER, [B.STAGE.x + (C.STAGED[3].text.length * 0.6 * 56) / 2, B.STAGE.baseline]);
  assert.ok(Math.abs(start.x - x0) < 1e-6 && Math.abs(start.baseline - b0) < 1e-6, 'at identical pixels');
  assert.deepEqual(B.lastWordPlace(O.LINE, L), { x: 960, baseline: 660, size: 56 });
  assert.deepEqual(lastWordAt(O.LINE), B.lastWordPlace(O.LINE, L), 'the monitor takes it where the squeeze left it');
});

test('fast moves blur: 32 sub-frames through the seam, the gather, the slide, the reticle and the squeeze', () => {
  for (const f of [O.OUTRO_START, O.HEX, O.GATHER.to, O.SLOT.from + 2, O.RETICLE.from + 6, O.ENTER + 3]) assert.ok(B.blueTemporal(f).samples >= 32, `${f}`);
});

test('every character E1 draws is in its atlas', () => {
  const seen: Record<string, Set<string>> = { mono: new Set(), bold: new Set(), rounded: new Set(), display: new Set() };
  for (const f of range(O.OUTRO_START, O.LINE)) {
    const fr = B.blueFrame(f, L);
    for (const [k, gs] of Object.entries(fr.paint.glyphs)) for (const g of gs as Glyph[]) seen[k].add(g.ch);
  }
  for (const [k, chars] of Object.entries(seen)) for (const ch of chars) assert.ok((OUTRO_ATLAS[k as keyof typeof OUTRO_ATLAS] as readonly string[]).includes(ch), `“${ch}” in the ${k} atlas`);
});

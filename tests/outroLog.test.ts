// S33 CORE DUMP (outro 1.1–2.1 − 1, build sheet §5.12–§5.13, §9 H5–H6): drop 2's frozen field decodes in place into a hexdump and the crash
// log — dim texture from then on — while outro bar 1 stages its story one line a beat, large (iteration 2, ruling 14), the printed lines
// scroll the log up behind (×ω×), bigger now and lit in the CRT's phosphor (ruling 15), and `exit` is typed — read back from the glyphs
// the shot draws, not from its internals. The aperture (squeeze, line, ω) has its own tests in tests/outroScreen.test.ts.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DECODE as DECODE_CHARS, PROMPT } from '../src/content/boot.ts';
import { SCREEN_TEXTS as FILM_TEXTS } from '../src/content/all.ts';
import { OUTRO_TEXTS as V04_TEXTS } from '../src/content/outroV04.ts';
// The v04 ending's strings left the film's list with it (src/content/outroV04.ts): its salvage sources check against both.
const SCREEN_TEXTS = [...FILM_TEXTS, ...V04_TEXTS];
import { GUEST_FLIP } from '../src/content/castDrop2.ts';
import { HERO_OUT, OUTRO_BACKTRACE, OUTRO_LOG_DECODE, OUTRO_LOG_PRINT, hexRow } from '../src/content/outroV04.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import { SWAP_LEAD, temporalSamples } from '../src/engine/temporal.ts';
import { BACKTRACE, DECODE, DIP, ENTER, GUEST_EXIT, HEARTBEAT, KEYS, LINE, LOG_DECODE, OPEN, OUTRO_START, PROMISE, SCHEDULER_FAIL, SEGFAULT, TABLE, WINK } from '../src/score/outroV04.ts';
import { T7_CONDENSED, T7_GRID } from '../src/shots/drop2Shared.ts';
import { FOV, FRONT_DISTANCE } from '../src/shots/intro.ts';
import {
  LOG_GROW,
  LOG_HERO_INK,
  LOG_PUSH,
  PUSH_TO,
  LOG_TEXTURE,
  OUTRO_LOG_MONO,
  OUTRO_LOG_ROUNDED,
  STAGE,
  STAGE_TYPE,
  type LogLayout,
  buildLogLayout,
  frozenGlyph,
  heroIndex,
  hexdump,
  lastWords,
  logBacking,
  logGlyphs,
  logHero,
  logPlace,
  logPose,
  outroLogLook,
  outroLogTemporal,
  printedLines,
  scrollAt,
  stagedLine,
} from '../src/shots/outroLog.ts';
import { HERO_PHOSPHOR } from '../src/shots/outroPhosphor.ts';
import { OMEGA_DEPTH } from '../src/shots/outroScreen.ts';
import { cellWidth } from '../src/engine/textGrid.ts';
import { INK, cellCenter } from '../src/worlds/terminal.ts';

/** A fake (×ω×) mask: an ellipse over his frozen face, coverage falling off toward its rim. */
const cover = (col: number, row: number): number => {
  const [x, y] = [T7_GRID.left + (col + 0.5) * T7_GRID.cellW, T7_GRID.top + (row + 0.5) * T7_GRID.cellH];
  const d = Math.hypot((x - 960) / 510, (y - 540) / 180);
  return Math.max(0, Math.min(1, (1 - d) * 4));
};
const advance = (ch: string): number => ('()'.includes(ch) ? 0.42 : 0.86);
const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const L: LogLayout = buildLogLayout(cover);

const draw = (f: number): Glyph[] => {
  const out: Glyph[] = [];
  const n = logGlyphs(f, L, out);
  return out.slice(0, n);
};
/** What the screen reads at output frame `f`, row by row (rows by their centre y, columns by x), from the glyphs drawn. */
function screenText(f: number): Map<number, string> {
  const rows = new Map<number, string[]>();
  for (const g of draw(f)) {
    if ((g.alpha ?? 1) < 0.5) continue;
    const row = Math.round((540 - T7_GRID.top - g.y) / T7_GRID.cellH - 0.5);
    const w = cellWidth(g.ch);
    const col = Math.round((g.x + 960 - T7_GRID.left) / T7_GRID.cellW - w / 2);
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row)![col + 10] = g.ch;
    if (w === 2) rows.get(row)![col + 11] = '';
  }
  const out = new Map<number, string>();
  for (const [r, cells] of rows) out.set(r, Array.from(cells, (c) => c ?? ' ').join('').slice(10).trimEnd());
  return out;
}
const cellAt = (f: number, col: number, row: number): Glyph | undefined => {
  const [x, y] = cellCenter(col, row);
  return draw(f).find((g) => Math.abs(g.x - x) < 1 && Math.abs(g.y - y) < 1 && (g.alpha ?? 1) > 0.01);
};

test('H5: the field held @ everywhere at the freeze, and his mask held =, +, * by coverage', () => {
  assert.equal(heroIndex(0), -1);
  assert.equal(heroIndex(0.2), -1);
  assert.equal(heroIndex(0.3), 4);
  assert.equal(heroIndex(0.6), 5);
  assert.equal(heroIndex(0.9), 6);
  assert.equal(frozenGlyph(0, 0, cover), '@');
  const [mc, mr] = [Math.round((960 - T7_GRID.left) / T7_GRID.cellW - 0.5), Math.round((540 - T7_GRID.top) / T7_GRID.cellH - 0.5)];
  assert.equal(frozenGlyph(mc, mr, cover), '*', 'the middle of his face');
  // H5 (round 1, N2): drop 2's drain fills his former cells with dim @ by drop2 end − 4, so until a cell decodes the log draws it like every
  // other held cell — one even field and one face, never his stencil — while the dump still prints the =+* he held at the freeze.
  for (const [c, r] of [[mc, mr], [mc - 3, mr], [mc + 3, mr + 1]]) {
    assert.ok(frozenGlyph(c, r, cover) !== '@', `(${c}, ${r}) was his`);
    const g = cellAt(DECODE - 1, c, r);
    assert.equal(g?.ch, '@', `(${c}, ${r}): his former cell shows the drained @ before the decode`);
    assert.deepEqual(g?.color, cellAt(DECODE - 1, 21, 3)?.color, 'in the field’s own ink');
  }
});

test('the hexdump prints the frozen field: 22 rows, byte j of row r = field cell (r, 9j + 4); @ reads 40, his cells 3d 2b 2a', () => {
  const rows = hexdump(cover);
  assert.equal(rows.length, 22);
  rows.forEach((text, r) => {
    const g = Array.from({ length: 16 }, (_, j) => frozenGlyph(9 * j + 4, r, cover)).join('');
    assert.equal(text, hexRow(r, g), `row ${r}`);
  });
  assert.ok(rows[0].includes('40 40 40 40 40 40 40 40  40 40 40 40 40 40 40 40'), 'the top of the screen was all @');
  assert.ok(rows[0].startsWith('0x7ffd3a40'));
  assert.ok(rows.slice(10, 22).some((r) => /3d|2b|2a/.test(r)), 'his face is in the dump');
});

test('outro 1.1 decodes in place: the dump’s cells flicker through DECODE glyphs on outro 1.1 and 1.1 + 1 and settle on outro 1.1 + 2', () => {
  const before = cellAt(DECODE - 1, 21, 3);
  assert.equal(before?.ch, '@', 'the frozen field until the downbeat');
  for (const f of [DECODE, DECODE + 1]) {
    const g = cellAt(f, 21, 3);
    assert.ok(g && DECODE_CHARS.includes(g.ch), `${f}: a decode glyph (${g?.ch})`);
  }
  const dump = hexdump(cover);
  const s = screenText(DECODE + 2);
  for (let r = 0; r < 22; r++) assert.equal(s.get(r), dump[r], `row ${r} settled on outro 1.1 + 2`);
});

test('outside the dump and the log the field decays to blank, top-down, by outro 1.1 + 6', () => {
  assert.ok(cellAt(DECODE - 1, 100, 2), 'the right side held @ at the freeze');
  assert.equal(cellAt(DECODE + 1, 100, -2), undefined, 'the top margin goes first');
  assert.ok(cellAt(DECODE + 2, 100, 31), 'the bottom still holds');
  for (const [c, r] of [[100, 2], [-5, 10], [139, 33], [100, 31], [85, 0]]) assert.equal(cellAt(DECODE + 7, c, r), undefined, `(${c}, ${r}) blank by outro 1.1& − 5`);
});

test('the crash log decodes into rows 22–29 on the 32nds, each left → right over 6 frames', () => {
  OUTRO_LOG_DECODE.forEach((line, i) => {
    const row = 22 + i;
    assert.equal(cellAt(LOG_DECODE[i] - 1, 0, row)?.ch, '@', `row ${row} still frozen before its 32nd`);
    const f = LOG_DECODE[i] + 8;
    assert.equal(screenText(f).get(row - Math.round(scrollAt(f))), line.text, `row ${row} reads its line`);
  });
  // Left → right: the first cell settles before the last.
  const row = 22;
  const first = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((d) => cellAt(LOG_DECODE[0] + d, 0, row)?.ch === OUTRO_LOG_DECODE[0].text[0]).indexOf(true);
  const lastCol = [...OUTRO_LOG_DECODE[0].text].length - 1;
  const last = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => cellAt(LOG_DECODE[0] + d, lastCol, row)?.ch === OUTRO_LOG_DECODE[0].text.at(-1)).indexOf(true);
  assert.ok(first >= 0 && last > first, `first ${first}, last ${last}`);
});


test('the log’s own printed lines, in time order: the guest, the backtrace one line a frame with the stats and the table among it, the prompt, then the system’s last words (the scheduler, FATAL and the promise) — cute dumped is staged, not printed', () => {
  const lines = printedLines();
  assert.equal(lines.length, OUTRO_LOG_PRINT.length - 1 + OUTRO_BACKTRACE.length, 'every printed line but the inverse one, the backtrace inline');
  assert.ok(!lines.some((l) => l.text === 'Segmentation fault (cute dumped)'), 'cute dumped is the staged headline (stagedLine), not a log row');
  assert.equal(lines[0].at, GUEST_EXIT, 'the log starts printing on outro 1.2');
  assert.equal(lines[0].row, 31, 'one blank row under the decoded log');
  const trace = lines.filter((l) => OUTRO_BACKTRACE.includes(l.text));
  OUTRO_BACKTRACE.forEach((text, i) => assert.deepEqual([trace[i].at, trace[i].text], [BACKTRACE + 1 + Math.floor(i / 3), text], 'three a frame'));
  assert.ok(trace.at(-1)!.at < TABLE, 'the backtrace is done before the table and the prompt (outro 1.2&)');
  for (let i = 1; i < lines.length; i++) {
    assert.ok(lines[i].at >= lines[i - 1].at, `in time order (${lines[i].at} after ${lines[i - 1].at})`);
    assert.equal(lines[i].row, lines[i - 1].row + 1, 'one row each');
  }
  // Iteration 3: Enter is on outro 1.3, so the prompt prints (on outro 1.2&) before it, and only the dying system prints after it — the scheduler
  // that will not stop as `exit` is typed, then the lost heartbeat and its promise on Enter itself.
  const prompt = lines.findIndex((l) => l.text.startsWith(PROMPT));
  assert.equal(lines[prompt].at, KEYS[0]);
  assert.ok(lines[prompt].at < ENTER);
  assert.deepEqual(lines.slice(prompt + 1).map((l) => l.at), [SCHEDULER_FAIL, HEARTBEAT, PROMISE], 'after the prompt: the scheduler, FATAL and the promise');
});

test('each printed line scrolls the log up one row, critically damped (τ 3 f; the backtrace’s τ 1 f): the newest settles on row 30', () => {
  const first = printedLines()[0].at;
  assert.equal(scrollAt(first - 1), 0, 'the decode stays in place: nothing scrolls before outro 1.2');
  for (let f = OUTRO_START; f < OPEN; f += 0.5) assert.ok(scrollAt(f + 0.5) >= scrollAt(f) - 1e-12, `never scrolls back (${f})`);
  assert.ok(scrollAt(first + 1) < 0.3, 'critically damped: it starts from rest');
  const lines = printedLines();
  // Every line printed before Enter has scrolled in (the newest still easing onto row 30); the two on Enter print as the screen squeezes.
  const before = lines.filter((l) => l.at < ENTER);
  const settled = scrollAt(ENTER - 1);
  assert.ok(settled > before.length - 2 && settled <= before.length, `${before.length} lines scrolled by Enter (${settled})`);
  const newest = before.at(-1)!.row - settled;
  assert.ok(newest >= 30 && newest < 32, `the newest line on its way to row 30 (${newest})`);
  // The spew keeps up: no line of the log's own waits below the screen's last row (33) for more than a frame, and the backtrace's
  // (three a frame, scrolling by) for more than four.
  for (const l of lines) assert.ok(l.row - scrollAt(l.at + (OUTRO_BACKTRACE.includes(l.text) ? 4 : 1)) < 33.6, `${l.text.slice(0, 24)}… on screen a frame after it prints (row ${(l.row - scrollAt(l.at + 1)).toFixed(1)})`);
  const all = scrollAt(OPEN);
  assert.ok(all > lines.length - 0.01 && all <= lines.length, `all ${lines.length} by outro 2.1 (${all})`);
});

test('`exit` is typed one key a 32nd after the prompt, the cursor steady after it', () => {
  const row = (f: number) => [...screenText(f).entries()].find(([, t]) => t.startsWith(PROMPT))?.[1];
  assert.equal(row(KEYS[0] - 1), undefined, 'no prompt yet');
  assert.equal(row(KEYS[0]), `${PROMPT}e█`);
  assert.equal(row(KEYS[1]), `${PROMPT}ex█`);
  assert.equal(row(KEYS[2]), `${PROMPT}exi█`);
  assert.equal(row(KEYS[3]), `${PROMPT}exit█`);
  assert.equal(row(ENTER - 1), `${PROMPT}exit█`, 'held until Enter');
});

/** Linear-light luminance (Rec. 709): what the bloom's threshold (0.85, terminalLook) is measured on. */
const lum = (c: readonly number[]): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

test('ruling 14: the log is dim texture once the decode has landed — nothing of it blooms, its rows under half the staged lines’ light', () => {
  // The seam frame and the frame before are drop 2's: untouched (H5, above). From outro 1.1& − 4 the whole log sits at LOG_TEXTURE.
  // Linear light: 0.16 of the ink reads as roughly 40 % as bright on screen (display gamma), where 0.3–0.4 still read as text.
  assert.ok(LOG_TEXTURE >= 0.1 && LOG_TEXTURE <= 0.25, `${LOG_TEXTURE}`);
  for (let f = DECODE + 8; f < ENTER; f += 1) {
    const ls = draw(f).map((g) => lum(g.color) * (g.alpha ?? 1));
    assert.ok(Math.max(...ls) < 0.9, `${f}: a log glyph at luminance ${Math.max(...ls).toFixed(2)} would bloom`);
    const sorted = [...ls].sort((a, b) => a - b);
    assert.ok(sorted[Math.floor(sorted.length / 2)] < 0.5, `${f}: the log’s median luminance ${sorted[Math.floor(sorted.length / 2)].toFixed(2)}`);
  }
  // The decode itself lands at full light (it is outro 1.1's event): a dump cell settling on outro 1.1 + 2 is several times what it is as texture.
  const [a, b] = [cellAt(DECODE + 2, 21, 3)!, cellAt(DECODE + 12, 21, 3)!];
  assert.equal(a.ch, b.ch);
  assert.ok(lum(a.color) > 1 && lum(a.color) > 3 * lum(b.color), `${lum(a.color).toFixed(2)} on outro 1.1 + 2, ${lum(b.color).toFixed(2)} on outro 1.1&`);
});

/** The staged texts, as the ruling names them. */
const STAGED: readonly (readonly [number, string])[] = [
  [SEGFAULT, 'Segmentation fault (cute dumped)'],
  [GUEST_EXIT, GUEST_FLIP.face],
  [TABLE, 'table restored ┬─┬ノ(•ω•ノ)'],
  [PROMISE, `next wink at frame ${WINK}`],
];

/** The type a staged line shows at instant `f`: the picture's (cute dumped, the flip, the table), or for the promise its last words, drawn over the screen. */
const typeAt = (at: number, f: number): Glyph[] => (at === PROMISE ? lastWords(f).bright : [...stagedLine(f).bright, ...stagedLine(f).dark]);

test('ruling 14: outro bar 1 stages one line a beat, large — cute dumped, the guest’s flip, the table set back, the promise — each whole from its own frame’s first sub-frame', () => {
  assert.deepEqual(STAGE.map((s) => [s.at, s.text]), STAGED);
  assert.equal(stagedLine(SEGFAULT - 1).text, '', 'nothing staged before outro 1.1');
  STAGED.forEach(([at, text], i) => {
    const until = i + 1 < STAGED.length ? STAGED[i + 1][0] : ENTER + 6;
    for (let f = at - SWAP_LEAD; f < until - SWAP_LEAD; f += 0.25) assert.equal(stagedLine(f).text, text, `${f}`);
  });
  for (const [at, text] of STAGED) {
    for (const f of [at, at + 6, at + 11]) {
      const gs = [...typeAt(at, f)].sort((a, b) => a.x - b.x);
      assert.equal(gs.map((g) => g.ch).join(''), text.replace(/ /g, ''), `${f}: reads “${text}”`);
      assert.ok(gs.every((g) => g.size >= STAGE_TYPE.size - 1e-9 && g.size >= 60), `${f}: large (≥ 60 px; the log is 22)`);
      assert.ok(gs.every((g) => Math.abs(g.y - gs[0].y) < 1e-9), 'one row');
      const left = gs[0].x - (cellWidth(gs[0].ch) * 0.6 * gs[0].size) / 2;
      const right = gs.at(-1)!.x + (cellWidth(gs.at(-1)!.ch) * 0.6 * gs.at(-1)!.size) / 2;
      near((left + right) / 2, 0, 0.6 * STAGE_TYPE.size, `${f}: centred on x 960`);
    }
  }
  // Cute dumped is an inverse bar (dark type on pink, normal blend); the rest glow in the terminal's inks (additive, ≥ 1: they bloom)
  // on a feathered dark band that keeps the log texture out from behind them.
  const inv = stagedLine(SEGFAULT + 6);
  assert.equal(inv.bright.length, 0);
  assert.ok(inv.dark.every((g) => g.color[0] < 0.02 && g.color[1] < 0.02), 'dark type');
  assert.equal(inv.under.length, 1);
  assert.ok(inv.under[0].color[0] > 0.8 && inv.under[0].w > 1200, 'a wide pink bar');
  for (const [at] of STAGED.slice(1)) {
    const s = stagedLine(at + 6);
    assert.equal(s.dark.length, 0);
    assert.ok(typeAt(at, at + 6).every((g) => Math.max(...g.color) >= 1), `${at}: lit`);
    assert.equal(s.under.length, 1, 'its band');
    assert.ok((s.under[0].soft ?? 0) > 0 && lum(s.under[0].color) < 0.01, 'dark and feathered');
  }
  // The promise's frame number is amber: the wink it promises.
  const promise = [...typeAt(PROMISE, PROMISE + 6)].sort((a, b) => a.x - b.x);
  assert.ok(promise.slice(-4).every((g) => g.color[0] > g.color[1] * 1.5), 'the frame number in amber');
  assert.ok(promise.slice(0, 4).every((g) => g.color[1] > 0.8 * g.color[0]), 'the words in the terminal’s pale text');
});

test('iteration 3: the promise is the last thing visible on the line — it lands with the heartbeat as Enter squeezes the screen, stays whole and unsqueezed over the white line, and fades like phosphor as the ω forms, gone before the lens opens round it', () => {
  const words = (f: number) => lastWords(f);
  for (let f = SEGFAULT; f < PROMISE - SWAP_LEAD; f += 0.25) assert.equal(words(f).bright.length, 0, `${f}: not before the heartbeat`);
  for (let f = PROMISE - SWAP_LEAD; f < PROMISE + 1; f += 0.125) assert.equal(words(f).text, STAGED[3][1], `${f}: whole on every sub-frame of outro 1.3`);
  // The picture keeps only the promise's band (it squeezes away with the screen); the words are drawn over the screen, never squeezed.
  for (let f = PROMISE - SWAP_LEAD; f < OPEN; f += 0.5) assert.equal(stagedLine(f).bright.length + stagedLine(f).dark.length, 0, `${f}: no type in the picture`);
  const readable = (f: number) => {
    const gs = words(f).bright;
    return gs.length > 0 ? Math.min(...gs.map((g) => lum(g.color) * (g.alpha ?? 1))) : 0;
  };
  // Readable through the squeeze and the whole of the line's beat: on outro 1.4 its dimmest glyph is still ≥ 0.3 (linear; ≈ 60 % on screen).
  for (let f = PROMISE; f <= DIP.from; f++) assert.ok(readable(f) >= 0.3, `${f}: dimmest glyph ${readable(f).toFixed(3)}`);
  // A phosphor afterglow, never a still: from the line on it only dims, every frame, and it is gone (not a glyph left) by outro 2.1 − 3.
  for (let f = LINE; f < OPEN - 3; f++) {
    const [a, b] = [readable(f), readable(f + 1)];
    assert.ok(b < a - 0.002 || (b === 0 && a < 0.01), `${f}: fading (${a.toFixed(3)} → ${b.toFixed(3)})`);
  }
  for (let f = OPEN - 3; f < OPEN + 1; f += 0.25) assert.equal(words(f).bright.length, 0, `${f}: gone before the lens opens`);
  // It sits where it was staged — under him, below the line and clear of the ω's bowls.
  const gs = words(DIP.from).bright;
  const top = Math.max(...gs.map((g) => g.y + 0.6 * g.size));
  assert.ok(top < -(OMEGA_DEPTH + 40), `its type's top (${(540 - top).toFixed(0)} px) is below the ω's bowls (${540 + OMEGA_DEPTH} px)`);
  assert.ok(gs.every((g) => Math.abs(g.y - (540 - STAGE_TYPE.y)) < 1e-9 && Math.abs(g.size - STAGE_TYPE.size) < 0.01), 'unsqueezed, on its staged row');
});

test('ruling 14: the hero bigger — he grows from the hand-off (H5: em 163 at (960, 450)) to ≥ 1.4× over outro 1.1 and holds it to Enter, above the staged line', () => {
  // H5 and the decode: where drop 2 left him, exactly, until the growth starts.
  for (let f = OUTRO_START - 0.25; f <= LOG_GROW.from - SWAP_LEAD; f += 0.125) assert.deepEqual(logPlace(f), { x: 960, y: 450, k: 1 }, `${f}`);
  assert.ok(LOG_GROW.scale >= 1.4);
  for (let f = LOG_GROW.to; f < ENTER + 6; f += 0.5) assert.deepEqual(logPlace(f), { x: 960, y: LOG_GROW.centre[1], k: LOG_GROW.scale }, `${f}`);
  assert.ok(LOG_GROW.to <= GUEST_EXIT, 'grown by outro 1.2');
  // One eased growth: never faster than 16 px a frame at his brackets (≈ 1.4 em out) plus his centre.
  for (let f = LOG_GROW.from - 1; f < LOG_GROW.to + 1; f += 0.25) {
    const [a, b] = [logPlace(f), logPlace(f + 0.25)];
    assert.ok(b.k >= a.k && b.y <= a.y, `monotone (${f})`);
    const edge = Math.abs(b.k - a.k) * T7_CONDENSED.em * 1.4 * 4 + Math.abs(b.y - a.y) * 4;
    assert.ok(edge <= 16, `${f}: ${edge.toFixed(2)} px a frame`);
  }
  // His face and his backing travel together; the backing is opaque throughout (it keeps the log texture out from behind him).
  for (let f = OUTRO_START; f < ENTER; f += 3) {
    const xs = logHero(f, advance).glyphs.map((g) => g.x);
    const b = logBacking(f);
    near((Math.min(...xs) + Math.max(...xs)) / 2, b.x, 1, `${f}: face on its backing (x)`);
    near(b.w, 488 * logPlace(f).k, 1e-9, `${f}: the backing scales with him`);
    assert.equal(b.alpha ?? 1, 1);
  }
  // He never overlaps the staged line: his backing's box and the staged band's box are apart on every frame.
  for (let f = SEGFAULT; f < ENTER; f += 0.5) {
    const b = logBacking(f);
    const s = stagedLine(f).under[0];
    assert.ok(b.y - b.h / 2 > s.y + s.h / 2 + 20, `${f}: his backing ends ${(b.y - b.h / 2 - (s.y + s.h / 2)).toFixed(0)} px above the staged line`);
  }
});

test('(×ω×) on the hand-off: (960, 450), 440 px (em 163), on his opaque backing; + eyes on the lost heartbeat, • on the table, × otherwise', () => {
  const at = (f: number) => logHero(f, advance);
  assert.equal(at(OUTRO_START).face, HERO_OUT.crashed);
  const h = at(OUTRO_START);
  const xs = h.glyphs.map((g) => g.x);
  assert.ok(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2) < 1, 'centred on x 960');
  assert.ok(h.glyphs.every((g) => Math.abs(g.y - (540 - T7_CONDENSED.centre[1])) < 1), 'on y 450');
  assert.ok(h.glyphs.every((g) => Math.abs(g.size - T7_CONDENSED.em) < 0.5), 'em 163 on the hand-off frame');
  assert.deepEqual(at(HEARTBEAT).face, HERO_OUT.twitch);
  assert.deepEqual(at(HEARTBEAT + 1).face, HERO_OUT.twitch);
  assert.deepEqual(at(HEARTBEAT + 2).face, HERO_OUT.crashed);
  assert.deepEqual(at(TABLE).face, HERO_OUT.alive);
  assert.deepEqual(at(TABLE + 1).face, HERO_OUT.alive);
  assert.deepEqual(at(TABLE + 2).face, HERO_OUT.crashed);
  // The twitch: −6° on the heartbeat, back by + 8.
  assert.ok(Math.abs(at(HEARTBEAT).rot + (6 * Math.PI) / 180) < 1e-6);
  assert.equal(at(HEARTBEAT - 1).rot, 0);
  assert.ok(Math.abs(at(HEARTBEAT + 8).rot) < 1e-6);
  // The backing on the hand-off: x 716–1204, y 360–540, opaque ground.
  const b = logBacking(OUTRO_START);
  assert.deepEqual([b.x - b.w / 2 + 960, b.x + b.w / 2 + 960, 540 - (b.y + b.h / 2), 540 - (b.y - b.h / 2)], [716, 1204, 360, 540]);
  assert.equal(b.alpha ?? 1, 1);
});

test('ruling 15: he is the CRT’s phosphor — on outro 1.1 drop 2’s flat ink (H5), lit by the decode into amber that blooms, like the intro’s', () => {
  const g0 = logHero(OUTRO_START, advance).glyphs;
  for (const g of g0) assert.deepEqual(g.color, LOG_HERO_INK, 'the hand-off frame is drop 2’s');
  assert.ok(lum(LOG_HERO_INK) < 0.85, 'the flat ink does not bloom (what the review saw as flat UI orange)');
  for (let f = DECODE + 6; f < ENTER + 6; f += 1) {
    for (const g of logHero(f, advance).glyphs) {
      assert.deepEqual(g.color, HERO_PHOSPHOR.ink, `${f}: phosphor amber`);
      assert.equal(g.tube ?? 0, 0, `${f}: amber all the way through (a white-hot core read as a cream neon sign)`);
    }
  }
  assert.ok(lum(HERO_PHOSPHOR.ink) >= 1, `it blooms past the terminal’s threshold (${lum(HERO_PHOSPHOR.ink).toFixed(2)} ≥ 0.85, well into its 0.25 smoothing)`);
  assert.ok(lum(HERO_PHOSPHOR.ink) > lum(INK.amber), 'brighter than the boot log’s amber, which only grazes the bloom');
  const hue = (c: readonly number[]) => c.map((v) => v / Math.max(...c));
  hue(HERO_PHOSPHOR.ink).forEach((v, i) => near(v, hue(INK.amber)[i], 1e-9, 'the terminal’s own amber hue'));
  // The ignition is a ramp over the decode, not a jump on the seam: brighter every frame from outro 1.1 to 1.1 + 6.
  for (let f = DECODE; f < DECODE + 6; f++) assert.ok(lum(logHero(f + 1, advance).glyphs[0].color) > lum(logHero(f, advance).glyphs[0].color), `${f}`);
});

test('every swap of his face is whole on its frame: no shutter sub-frame of a frame shows another face', () => {
  for (const F of [HEARTBEAT - 1, HEARTBEAT, HEARTBEAT + 2, TABLE - 1, TABLE, TABLE + 2]) {
    const faces = new Set(temporalSamples(F, { samples: 16, shutter: 0.5, persistence: 0 }).map((s) => logHero(s.frame, advance).face));
    assert.equal(faces.size, 1, `${F}: ${[...faces]}`);
  }
});

test('the push: 1.00 on the hand-off frame (R12) to 1.04 by the ω about his face, which moves on screen only by its own growth', () => {
  const zoom = (f: number) => FRONT_DISTANCE / logPose(f).position[2];
  assert.ok(Math.abs(zoom(OUTRO_START) - 1) < 1e-9);
  // Iteration 3: the push keeps iteration 2's curve (to outro 1.4 − 1, the frame before the ω), so moving Enter to outro 1.3 leaves outro 1.1–1.2’s
  // camera as it was; it runs on through the squeeze and the line, carrying the last words.
  assert.equal(PUSH_TO, DIP.from - 1);
  assert.ok(Math.abs(zoom(PUSH_TO) - (1 + LOG_PUSH)) < 1e-6);
  assert.ok(Math.abs(zoom(OPEN - 1) - (1 + LOG_PUSH)) < 1e-6, 'held under the ω');
  for (let f = OUTRO_START; f <= PUSH_TO; f += 0.5) {
    const p = logPose(f);
    const z = zoom(f);
    const h = logPlace(f);
    const [fx, fy] = [h.x - 960, 540 - h.y];
    assert.ok(Math.abs((fx - p.target[0]) * z - fx) < 1e-6 && Math.abs((fy - p.target[1]) * z - fy) < 1e-6, `${f}`);
    assert.equal(p.fov, FOV);
    if (f > OUTRO_START) assert.ok(zoom(f) > zoom(f - 0.5), `the push never stops (${f})`);
  }
  // The staged lines stay on screen at the end of the push: their bands' edges, pushed about his face, stay inside the frame.
  const h = logPlace(PUSH_TO);
  const z = zoom(PUSH_TO);
  for (const [at] of STAGED) {
    const s = stagedLine(at + 6).under[0];
    for (const x of [s.x - s.w / 2, s.x + s.w / 2]) assert.ok(Math.abs((x - (h.x - 960)) * z + (h.x - 960)) < 940, `${at}: the band’s edge at ${x.toFixed(0)}`);
    const bottom = 540 - (s.y - s.h / 2);
    assert.ok(h.y + (bottom - h.y) * z < 1040, `${at}: the band’s bottom on screen`);
  }
});

test('the look: H5’s CRT (curvature 0.02, band 0) bending to the terminal’s 0.045 over outro 1.1–1.1 + 4; the scanlines fade out with the squeeze', () => {
  const l0 = outroLogLook(OUTRO_START);
  assert.equal(l0.crt?.curvature, 0.02);
  assert.equal(l0.crt?.band, 0);
  assert.equal(outroLogLook(OUTRO_START + 4).crt?.curvature, 0.045);
  assert.equal(outroLogLook(ENTER - 1).crt?.scanlines, 0.3);
  assert.equal(outroLogLook(OPEN - 1).crt?.scanlines, 0);
});

test('sampling: a faint phosphor tail on the log; 32 sub-frames and no tail on the squeeze and the line', () => {
  for (let f = OUTRO_START; f < ENTER; f += 3) {
    const t = outroLogTemporal(f);
    assert.ok(t.persistence > 0 && (t.afterglow ?? 1) <= 0.3, `${f}`);
  }
  for (let f = ENTER; f < OPEN; f++) {
    const t = outroLogTemporal(f);
    assert.ok(t.samples >= 32 && t.persistence === 0, `${f}`);
  }
});

test('every character the log and the staged lines draw is in its atlas list, and every one of those is checked by check-glyphs in its role', () => {
  const mono = new Set(OUTRO_LOG_MONO);
  for (let f = OUTRO_START; f < OPEN; f += 2) {
    for (const g of draw(f)) assert.ok(mono.has(g.ch), `${f}: "${g.ch}" is not in the log’s mono atlas`);
    const s = stagedLine(f);
    for (const g of [...s.bright, ...s.dark, ...lastWords(f).bright]) assert.ok(mono.has(g.ch), `${f}: staged "${g.ch}"`);
    for (const g of logHero(f, advance).glyphs) assert.ok(OUTRO_LOG_ROUNDED.includes(g.ch), `${f}: "${g.ch}" is not in the hero’s atlas`);
  }
  const checked = (role: string) => new Set(SCREEN_TEXTS.filter((t) => t.role === role).flatMap((t) => [...t.text]));
  const m = checked('mono');
  const r = checked('rounded');
  for (const ch of OUTRO_LOG_MONO) assert.ok(m.has(ch), `"${ch}" (mono) is not in SCREEN_TEXTS`);
  for (const ch of OUTRO_LOG_ROUNDED) assert.ok(r.has(ch), `"${ch}" (rounded) is not in SCREEN_TEXTS`);
});

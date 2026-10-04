import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RGB } from '../src/engine/color.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import type { Advance } from '../src/engine/typeset.ts';
import { BURST, CLUB_END, FLIP, HATS, HIT, LEVELS, RESUME, SILENCE, SMASH, STUTTER } from '../src/score/drop1.ts';
import { SPANS } from '../src/score/spans.ts';
import { partFrame } from '../src/score/film.ts';
import { COLS, HUD_CHARS, HUD_WINDOWS, RAMP, WARNINGS, formatFriends, hudContent, hudLines, meter, monitorAt } from '../src/shots/hud.ts';

const adv: Advance = (ch) => (ch === ' ' ? 0.5 : 0.6);
const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i);
const same = (a: RGB, b: RGB) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
/** Every frame the readout is on screen. */
const onScreen = HUD_WINDOWS.flatMap(([a, b]) => range(a, b));
const windowOf = (f: number) => HUD_WINDOWS.find(([a, b]) => f >= a && f < b);

/** The readout's rows: the box's top edge, friends, memory, cpu, its bottom edge, then the warning line under the box. */
const FRIENDS = 1, MEMORY = 2, CPU = 3, WARNING = 5;

// The readout's own colours, read off lines whose colour never changes: friends are green, a [WARN] line amber, an [ERR] line red.
const GREEN = hudLines(LEVELS.earth + 20)[FRIENDS].color;
const AMBER = hudLines(STUTTER.from)[WARNING].color;
const RED = hudLines(HIT)[WARNING].color;

const glyphsAt = (f: number): readonly Glyph[] => hudContent(f, adv).glyphs.mono ?? [];
/** The characters drawn in colour `c` at `f`, in order (spaces draw nothing). */
const inkOf = (f: number, c: RGB) => glyphsAt(f).filter((g) => same(g.color, c)).map((g) => g.ch).join('');

test('the colours read off the readout are three different ones', () => {
  assert.ok(!same(GREEN, AMBER) && !same(AMBER, RED) && !same(GREEN, RED));
});

test('the readout shows up at the spec moments: on Earth, through the stutter, on the dance floor and from the throw to the shatter — never after it', () => {
  // Sorted, apart, inside Drop 1 and gone before the break: Drop 1's readout is the club's, and the club's span ends on the smash, where the
  // break takes over (a system monitor in the break is the break's own, drawn by its scene from its own files).
  HUD_WINDOWS.forEach(([a, b], i) => {
    assert.ok(a < b, `window ${i} is not empty`);
    if (i > 0) assert.ok(a >= HUD_WINDOWS[i - 1][1], `window ${i} starts after window ${i - 1} ends`);
  });
  assert.ok(HUD_WINDOWS[0][0] >= LEVELS.earth && HUD_WINDOWS[HUD_WINDOWS.length - 1][1] <= SMASH);
  assert.ok(HUD_WINDOWS[HUD_WINDOWS.length - 1][1] <= SPANS.find((s) => s.key === 'club')!.to, 'never past the end of the club that draws it');
  // Up to the club's last frame: the last before the glass breaks, or before the club's held bars, which hold it (src/score/film.ts partTail).
  assert.equal(HUD_WINDOWS[HUD_WINDOWS.length - 1][1], CLUB_END, 'up until the glass breaks');
  // Earth: inside cosmos bar 2, before the solar system arrives.
  const earth = HUD_WINDOWS[0];
  assert.ok(earth[0] >= LEVELS.earth && earth[1] <= LEVELS.solar, `Earth's window ${earth} lies in cosmos bar 2`);
  // The stutter: the whole of it.
  assert.ok(HUD_WINDOWS.some(([a, b]) => a <= STUTTER.from && b >= STUTTER.to), 'a window covers the stutter');
  // The dance floor (club bar 2) …
  assert.ok(onScreen.some((f) => f >= LEVELS.table && f < partFrame('club', 3)), 'up on the dance floor');
  // … and the throw to the shatter, without a break: the readout is up from FLIP to the club's last frame.
  for (const f of range(FLIP - 1, CLUB_END)) assert.ok(windowOf(f), `up at ${f}`);
  assert.ok(windowOf(FLIP - 1) === windowOf(FLIP), 'one window runs across the throw, so the jump to 128% is seen happening');
});

test("Earth's window shows Earth's 8,100,000,000 on every frame (spec §15.8)", () => {
  const [a, b] = HUD_WINDOWS[0];
  for (const f of range(a, b)) assert.equal(hudLines(f)[FRIENDS].text, 'friends  8,100,000,000', `friends at ${f}`);
  // Typed in, it is on screen in green.
  assert.ok(inkOf(a + 20, GREEN).includes('friends8,100,000,000'), inkOf(a + 20, GREEN));
});

test('friends climb with the levels: 1,024 as time snaps back, 8.1e9 on Earth, then every level higher, ∞ on the party table', () => {
  assert.equal(monitorAt(RESUME).friends, 1024);
  assert.equal(monitorAt(LEVELS.earth).friends, 8.1e9);
  assert.equal(monitorAt(LEVELS.solar).friends, 4.2e13);
  assert.equal(monitorAt(LEVELS.galaxy).friends, 9.9e18);
  assert.equal(monitorAt(LEVELS.cosmos).friends, 2.0e24);
  for (const f of range(LEVELS.table, SMASH)) assert.equal(monitorAt(f).friends, Infinity, `∞ at ${f}`);
  // Never down, and only on the sixteenths.
  let last = 0;
  for (const f of range(BURST, SMASH)) {
    const n = monitorAt(f).friends;
    assert.ok(n >= last, `friends never fall (${f}: ${n} < ${last})`);
    if (n !== last && f > BURST) assert.ok(HATS.includes(f), `friends tick over on a sixteenth, not at ${f}`);
    last = n;
  }
  // The stutter's window shows them still climbing, past the galaxy's count.
  const [a, b] = HUD_WINDOWS[1];
  assert.ok(monitorAt(a).friends > 9.9e18 && monitorAt(b - 1).friends > monitorAt(a).friends);
});

test('memory climbs to 99% and holds there, green or amber and never red, until he is thrown', () => {
  let last = 0;
  for (const f of range(BURST, FLIP)) {
    const m = monitorAt(f).memory;
    assert.ok(m <= 99, `memory ${m}% at ${f}`);
    assert.ok(m >= last, `memory never falls (${f})`);
    last = m;
  }
  for (const f of range(LEVELS.table, FLIP)) assert.equal(monitorAt(f).memory, 99, `99% at ${f}`);
  for (const f of onScreen.filter((g) => g < FLIP)) {
    const line = hudLines(f)[MEMORY];
    assert.ok(same(line.color, GREEN) || same(line.color, AMBER), `memory is green or amber at ${f}: ${line.text}`);
    assert.ok(!same(line.color, RED), `memory is not red at ${f}`);
  }
  assert.ok(same(hudLines(FLIP - 1)[MEMORY].color, AMBER), '99% is amber');
});

test('memory jumps to 128% in red on FLIP, the frame he is thrown, and stays there', () => {
  assert.equal(monitorAt(FLIP - 1).memory, 99);
  for (const f of range(FLIP, SILENCE.to)) {
    const line = hudLines(f)[MEMORY];
    assert.equal(monitorAt(f).memory, 128, `128% at ${f}`);
    assert.ok(line.text.endsWith(' 128%'), line.text);
    assert.ok(same(line.color, RED), `red at ${f}`);
  }
  // Seen happening: the frame before, 99% in amber; on FLIP, 128% in red — the readout fully up on both.
  assert.ok(inkOf(FLIP - 1, AMBER).includes(`memory${'@'.repeat(19)}#99%`), inkOf(FLIP - 1, AMBER));
  assert.ok(inkOf(FLIP, RED).includes(`memory${'@'.repeat(20)}128%`), inkOf(FLIP, RED));
  for (const f of [FLIP - 1, FLIP]) for (const g of glyphsAt(f)) assert.equal(g.alpha ?? 1, 1, `fully up at ${f}`);
});

test('cpu climbs to 100% (amber) with memory and stays there', () => {
  assert.equal(monitorAt(LEVELS.table).cpu, 100);
  assert.equal(monitorAt(FLIP).cpu, 100);
  assert.ok(same(hudLines(FLIP)[CPU].color, AMBER));
  assert.ok(same(hudLines(LEVELS.earth + 20)[CPU].color, GREEN));
});

test('each warning is on screen at its spec moment, in its colour', () => {
  const at = (text: string) => WARNINGS.find((w) => w.text === text)!;
  const moments: [string, number, RGB][] = [
    ['[WARN] party exceeds galaxy', STUTTER.from, AMBER],
    ['[WARN] cuteness exceeds safe limits', HUD_WINDOWS.find(([a]) => a >= LEVELS.table)![0] + 12, AMBER],
    ['[ERR] (•ω•) thrown at screen', FLIP, RED],
    ['[FATAL] screen integrity 0%', HIT, RED],
  ];
  for (const [text, f, color] of moments) {
    const w = at(text);
    assert.ok(f >= w.from && f < w.to, `${text} is the warning at ${f}`);
    assert.ok(windowOf(f), `${text}: the readout is up at ${f}`);
    assert.equal(hudLines(f)[WARNING].text, text);
    assert.ok(same(hudLines(f)[WARNING].color, color), `${text} in its colour`);
    assert.ok(inkOf(f, color).includes(text.replaceAll(' ', '')), `${text} drawn at ${f}: ${inkOf(f, color)}`);
  }
  // Each warning is seen in some window.
  for (const w of WARNINGS) assert.ok(onScreen.some((f) => f >= w.from && f < w.to), `${w.text} is seen`);
});

test('the warning blinks on the sixteenths: on for three frames, off for three', () => {
  const text = '[ERR](•ω•)thrownatscreen';
  for (const f of range(FLIP, FLIP + 24)) assert.equal(inkOf(f, RED).includes(text), (f - FLIP) % 6 < 3, `blink at ${f}`);
});

test('the readout never prints a character its atlas lacks', () => {
  for (const f of onScreen) {
    for (const r of hudLines(f)) {
      for (const ch of [r.text, ...r.frame.map((p) => p.text)].join('')) assert.ok(HUD_CHARS.includes(ch), `'${ch}' of "${r.text}" at ${f}`);
    }
  }
});

test('no window ends on an empty outlined box: the text fades with its panel', () => {
  for (const [a, b] of HUD_WINDOWS) {
    const full = hudContent(a + 20, adv);
    const ratio = (glyphsAt(a + 20)[0].alpha ?? 1) / full.under[0].alpha!;
    // From the first character typed to the window's last frame, whenever the panel shows, its text shows, as faded as the panel.
    for (const f of range(a + 1, b)) {
      const c = hudContent(f, adv);
      const gs = glyphsAt(f);
      assert.equal(c.under.length, 1, `the panel at ${f}`);
      assert.ok(gs.length > 0, `text in the panel at ${f} (window ${a}–${b})`);
      for (const g of gs) assert.ok(Math.abs((g.alpha ?? 1) - ratio * c.under[0].alpha!) < 1e-9, `text fades with the panel at ${f}`);
    }
    // The last frame is on its way out, not cut.
    assert.ok(hudContent(b - 1, adv).under[0].alpha! < full.under[0].alpha!, `fading at ${b - 1}`);
    assert.deepEqual(hudContent(b, adv).under, [], `gone at ${b}`);
  }
});

test("a frame's shutter shows one state of the readout: ticking numbers, the blink and the typing never double-print", () => {
  // Sub-frames of output frame F lie within F ± shutter/2; the longest shutter the readout is seen through is the throw's 0.75. Any under a frame must hold.
  const offsets = [-0.49, -0.375, -0.25, -0.1, 0.1, 0.25, 0.375, 0.49];
  for (const f of onScreen) {
    const at = JSON.stringify(hudContent(f, adv));
    for (const d of offsets) assert.equal(JSON.stringify(hudContent(f + d, adv)), at, `sub-frame ${f}${d < 0 ? '' : '+'}${d} shows frame ${f}`);
  }
  // The frames either side of a window draw nothing in any sub-frame.
  for (const [a, b] of HUD_WINDOWS) {
    for (const d of offsets) {
      assert.deepEqual(hudContent(a - 1 + d, adv).under, [], `nothing at ${a - 1}${d}`);
      assert.deepEqual(hudContent(b + d, adv).under, [], `nothing at ${b}${d}`);
    }
  }
});

test('friends print with commas below a trillion, then as mantissa and exponent, then ∞', () => {
  assert.equal(formatFriends(1), '1');
  assert.equal(formatFriends(1024), '1,024');
  assert.equal(formatFriends(8.1e9), '8,100,000,000');
  assert.equal(formatFriends(4.2e13), '4.2e13');
  assert.equal(formatFriends(2.0e24), '2.0e24');
  // The mantissa never reads 10.0: it rounds into the next power.
  assert.equal(formatFriends(9.96e12), '1.0e13');
  assert.equal(formatFriends(9.99e22), '1.0e23');
  assert.equal(formatFriends(Infinity), '∞');
});

test('the readout is a text-mode box (style B): ╔═ title ═╗, ║ rows ║, ╚═╝, every row exactly COLS wide and its content inside the borders', () => {
  for (const f of onScreen) {
    const rows = hudLines(f);
    // Each row laid out in a COLS-wide character grid.
    const grid = rows.map((r) => {
      const line = Array<string>(COLS).fill(' ');
      for (const p of [...r.frame, { col: r.col, text: r.text }]) [...p.text].forEach((ch, i) => (line[p.col + i] = ch));
      return line.join('');
    });
    assert.equal(grid[0].length, COLS, `top edge at ${f}: ${grid[0]}`);
    assert.match(grid[0], /^╔═ kaomoji\.exe :: party monitor ═+╗$/, `top edge at ${f}`);
    for (const i of [FRIENDS, MEMORY, CPU]) {
      assert.equal(grid[i].length, COLS, `row ${i} at ${f} stays inside the box: ${grid[i]}`);
      assert.ok(grid[i][0] === '║' && grid[i][COLS - 1] === '║', `row ${i} has both borders at ${f}: ${grid[i]}`);
      assert.ok(rows[i].col + [...rows[i].text].length <= COLS - 2, `row ${i}'s content clears the right border at ${f}: ${grid[i]}`);
    }
    assert.equal(grid[4], '╚' + '═'.repeat(COLS - 2) + '╝', `bottom edge at ${f}`);
  }
});

test("the box's right border lines up on screen: ╗, every ║ and ╝ are drawn at one x", () => {
  // A frame with the readout fully typed, on each window.
  for (const [a] of HUD_WINDOWS) {
    const gs = glyphsAt(a + 20);
    const right = gs.filter((g) => '╗╝'.includes(g.ch)).map((g) => g.x);
    const sides = gs.filter((g) => g.ch === '║').map((g) => g.x);
    const xs = [...right, ...sides.filter((x) => x > Math.min(...sides))];
    assert.equal(right.length, 2, `╗ and ╝ drawn at ${a + 20}`);
    assert.equal(sides.length, 6, `three rows, two ║ each, at ${a + 20}`);
    for (const x of xs) assert.ok(Math.abs(x - xs[0]) < 1e-9, `right border at one x at ${a + 20}: ${xs}`);
  }
});

test("a gauge is 20 cells of intro bar 4's density ramp: dense where full, the filling cell partway, blank beyond, full over 100", () => {
  assert.equal(RAMP, ' .:-=+*#%@');
  assert.equal(meter(0), ' '.repeat(20));
  assert.equal(meter(50), '@'.repeat(10) + ' '.repeat(10));
  assert.equal(meter(99), '@'.repeat(19) + '#');
  assert.equal(meter(100), '@'.repeat(20));
  assert.equal(meter(128), '@'.repeat(20));
  // A cell fills through the ramp as the percentage climbs: never less dense for more.
  for (let p = 0; p < 100; p++) {
    const [a, b] = [meter(p), meter(p + 1)];
    for (let i = 0; i < 20; i++) assert.ok(RAMP.indexOf(b[i]) >= RAMP.indexOf(a[i]), `cell ${i} from ${p}% to ${p + 1}%`);
  }
});

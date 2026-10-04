// THE SLOT, Defender v2.0's scoreboard (src/shots/drop2SwitchSlot.ts; builder S, fix R1-T02; build sheet notes/bid2/drop2-sheet2.md
// §4.4, §7.2; design §4.4): read back like a viewer — when it opens and closes, what each row says and when, every layer lost as a crack
// on its own frame, the avatar's states — and that it never covers him (each part's own hero export) nor the arcade's HUD or the pill.
// Every frame from the score's names (part-local; no literal frame).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import opentype from 'opentype.js';
import { AVATAR, READOUT2, SCOREBOARD, breached, deploying } from '../src/content/drop2.ts';
import { FONT_FILES, STACKS, type FontRole } from '../src/engine/fonts.ts';
import type { Advance } from '../src/engine/typeset.ts';
import * as D2 from '../src/score/drop2.ts';
import { FRAMES_PER_BEAT } from '../src/score/grid.ts';
import { copiesAt, copyAt, hudLines, mothershipAt } from '../src/shots/drop2Arcade.ts';
import { COPY_H, COPY_W, GP } from '../src/shots/drop2ArcadeSprites.ts';
import { mothershipScreen } from '../src/shots/drop2ArcadeVoxel.ts';
import { heroLimbs } from '../src/shots/drop2Picto.ts';
import * as S from '../src/shots/drop2Switch.ts';
import { FACE_ADVANCE, FACE_INK } from '../src/shots/drop2SwitchType.ts';
import * as L from '../src/shots/drop2SwitchSlot.ts';
import { PLANE, WAVE_CARTOUCHE, blockAt, heroPlane, heroWave, scanLineY, toScreen, waveCam } from '../src/shots/drop2Wave.ts';
import { MOUNTAIN_SHAPE } from '../src/shots/drop2WaveGeom.ts';

const { BOX, GIVING_UP, ARCADE, TOTEM, PICTO, SHEET, TOUCHE, LIGHT, BURST, DOWNSAMPLE, CRANE_UP, HINGE, BARREL, CREST, WAVE_CRASH } = D2;
const { readCoverage } = (await import('../scripts/lib/cmap.mjs' as string)) as { readCoverage: (font: Buffer) => Set<number> };
const BEAT = FRAMES_PER_BEAT;

// Real advances from the font files, through each role's stack (Inter Tight's file is its default instance: × 1.08 for the Black).
type Font = { unitsPerEm: number; charToGlyph(ch: string): { index: number; advanceWidth?: number } };
const fontOf = new Map<string, Font>();
const parse = (file: string): Font => {
  if (!fontOf.has(file)) {
    const b = readFileSync(new URL(`../public/${file}`, import.meta.url));
    fontOf.set(file, opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)) as unknown as Font);
  }
  return fontOf.get(file)!;
};
const advanceFor = (role: FontRole, k = 1): Advance => {
  const files = STACKS[role].map((fam) => FONT_FILES.find((f) => f.family === fam)!.file);
  return (ch) => {
    for (const file of files) {
      const font = parse(file);
      const g = font.charToGlyph(ch);
      if (g.index !== 0) return (k * (g.advanceWidth ?? 0)) / font.unitsPerEm;
    }
    return 1;
  };
};
const adv: L.SlotAdvances = { display: advanceFor('display', 1.08), mono: advanceFor('mono'), dot: advanceFor('dot'), jp: advanceFor('jp') };
const content = (f: number) => L.slotContent(f, adv);
const up = (f: number) => content(f).under.length > 0;
const chars = (f: number, atlas: keyof L.SlotGlyphs) => content(f).glyphs[atlas].map((g) => g.ch).join('');
const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i);
const SPAN = range(BOX - 2, L.SLOT_END + 4);
const same = (a: readonly number[], b: readonly number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
const overlaps = (a: { x0: number; y0: number; x1: number; y1: number }, b: { x0: number; y0: number; x1: number; y1: number }) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

test('it opens on the box’s clang (9.3) with DEFENDER v2.0, its clean avatar and 5/5, exactly where the title’s flight lands, and is gone by 17.4 + 17', () => {
  assert.equal(up(BOX - 1), false, 'nothing before the clang');
  assert.ok(up(BOX));
  assert.equal(chars(BOX, 'display'), 'DEFENDERv2.0');
  assert.equal(chars(BOX, 'jp'), AVATAR.clean);
  assert.equal(chars(BOX, 'mono'), '5/5');
  assert.equal(content(BOX).under.filter((s) => s.kind === 'rect' && s.w === L.SLOT_BOX.x1 - L.SLOT_BOX.x0 && Math.abs(s.h - (L.SLOT_BOX.y1 - L.SLOT_BOX.y0)) < 1e-9).length, 1, 'the box at home, whole on its first frame');
  // The title's flight (drop2Switch.ts titleAt) lands on row 1: its last frame is a hair from the slot's title and avatar.
  const t = S.titleAt(BOX - 1e-3)!;
  assert.ok(Math.abs(t.x - L.SLOT_TITLE.x) < 1 && Math.abs(t.y - L.SLOT_TITLE.y) < 1 && Math.abs(t.size - L.SLOT_TITLE.size) < 1, 'the title lands on row 1');
  assert.ok(Math.abs(t.avatar.x - L.SLOT_AVATAR.x) < 2 && Math.abs(t.avatar.y - L.SLOT_AVATAR.y) < 2 && Math.abs(t.avatar.size - L.SLOT_AVATAR.size) < 2, 'its avatar lands on row 1’s');
  assert.equal(S.titleAt(BOX), null, 'the slot takes over on the clang');
  // Up every frame from the clang to the close but for the light (16.1) and the re-docks' power cycles.
  const gaps = SPAN.filter((f) => f >= BOX && f < L.SLOT_END && !up(f));
  for (const f of gaps) assert.ok((f >= LIGHT.from - 1 && f < LIGHT.from + 7) || f === ARCADE.from - 1 || f === TOTEM - 1, `${f}: dark`);
  assert.ok(up(L.SLOT_END - 2), 'still folding on its last frames');
  assert.equal(L.SLOT_END, GIVING_UP + 17);
  for (let f = L.SLOT_END; f < L.SLOT_END + 24; f++) assert.equal(up(f), false, `${f}: closed`);
  // 先保留: nothing at all on any other drop 2 frame (the carried bars 1–7 and 18–20 never get a pixel of it; Drop2SlotLayer.draw makes
  // no GL call for an empty frame).
  for (let f = D2.DROP2_START; f < D2.DROP2_END; f++) {
    if (f >= BOX && f < L.SLOT_END) continue;
    const c = content(f);
    assert.ok(c.under.length + c.over.length === 0 && Object.values(c.glyphs).every((g) => g.length === 0), `${f}: empty`);
  }
});

test('row 3: every READOUT2 slot line from the box to the give-up, in order, at most one new line a beat, each typed in over 3 f; a count ticking in its line is no new line', () => {
  const want = READOUT2.filter((l) => l.site === 'slot' && l.at > BOX && l.at <= GIVING_UP).map((l) => l.text.replace(/^[▮▯]{5} \d\/5 · /, ''));
  assert.deepEqual(L.STATUS_LINES.map((l) => l.text), want);
  assert.equal(L.STATUS_LINES.at(-1)!.text, breached(4), 'the last line: L5 breached ✗ (its pips are row 2’s)');
  const fresh = L.STATUS_LINES.filter((l) => l.keep === 0);
  for (let i = 1; i < fresh.length; i++) assert.ok(fresh[i].shown - fresh[i - 1].shown >= BEAT, `${fresh[i].text}: a beat after ${fresh[i - 1].text}`);
  for (const [i, l] of L.STATUS_LINES.entries()) {
    assert.ok(l.shown >= l.at && l.shown - l.at <= BEAT, `${l.text}: on its frame or at most a beat late`);
    if (i > 0) assert.ok(l.shown > L.STATUS_LINES[i - 1].shown, 'in order');
    const n = [...l.text].length;
    const s0 = L.statusAt(l.shown)!;
    assert.equal(s0.line, l);
    assert.ok(s0.count > l.keep && s0.count < n, `${l.text}: typing on its first frame (${s0.count})`);
    assert.equal(L.statusAt(l.shown + L.TYPE_FRAMES - 1)!.count, n, `${l.text}: whole on its third frame`);
  }
  // The ticks: [SCAN] 12 → 16 → 24 threats in place, on their own frames.
  const ticks = L.STATUS_LINES.filter((l) => l.keep > 0);
  assert.deepEqual(ticks.map((l) => l.text), ['[SCAN] 16 threats', '[SCAN] 24 threats']);
  for (const l of ticks) assert.equal(l.shown, l.at);
  // The breaches' next layer lands with the next world: L2 on the downsample, L3 on Memphis, L4 on the pictograms, L5 after the light.
  const shownOf = (t: string) => L.STATUS_LINES.find((l) => l.text === t)!.shown;
  assert.equal(shownOf(deploying(1)), DOWNSAMPLE.from);
  assert.equal(shownOf(deploying(2)), TOTEM);
  assert.equal(shownOf(deploying(3)), PICTO);
  assert.ok(shownOf(deploying(4)) >= LIGHT.from + 12, 'after the light, once the slot has re-formed');
  assert.equal(shownOf(deploying(0)), D2.FLOOD, 'L1 on the flood (9.4&)');
  assert.ok(CRANE_UP.from < PICTO && HINGE.from < LIGHT.from);
  // Before the first line, the cursor alone.
  assert.equal(chars(BOX + 6, 'mono'), '5/5');
  // Its [TAGS] and ✗ are red, the rest the readout's pale green.
  const st = content(L.STATUS_LINES.find((l) => l.text.startsWith('[QUARANTINE] wave'))!.shown + 6).glyphs.mono.filter((g) => !/\d|\//.test(g.ch));
  assert.equal(st.map((g) => g.ch).join(''), '[QUARANTINE]wave');
  assert.ok(st.slice(0, 12).every((g) => same(g.color, L.SLOT_INK.red)), 'the tag red');
  assert.ok(st.slice(12).every((g) => same(g.color, L.SLOT_INK.status)), 'the rest pale green');
});

test('row 2: the pips follow SCOREBOARD down, monotone 5 → 0; each layer lost is a 3 f crack on the breach’s own frame (the row jolts), then the pip drops out', () => {
  assert.deepEqual(SCOREBOARD.map((s) => s.left), [5, 4, 3, 2, 1, 0]);
  let last = 5;
  for (const f of range(BOX, L.SLOT_END)) {
    const n = L.pipsLeft(f);
    assert.ok(n <= last, `${f}: never back up`);
    last = n;
  }
  assert.equal(L.pipsLeft(GIVING_UP), 0);
  for (const [i, b] of L.BREACHES.entries()) {
    assert.equal(L.pipsLeft(b - 1), 5 - i, `before breach ${i + 1}`);
    assert.equal(L.pipsLeft(b), 4 - i, `breach ${i + 1} on its frame`);
    const cracks = (f: number) => content(f).over.filter((s) => s.kind === 'segment').length;
    assert.equal(cracks(b - 1), 0);
    for (let t = 0; t < L.CRACK; t++) assert.ok(cracks(b + t) > 0, `breach ${i + 1}: cracked on ${b + t}`);
    assert.equal(cracks(b + L.CRACK), 0, 'the crack lasts 3 f');
    const halves = (f: number) => content(f).over.filter((s) => s.kind === 'rect').length;
    if (b < GIVING_UP + 3) {
      assert.equal(halves(b), 2, 'two halves');
      assert.ok(halves(b + 5) === 2 && halves(b + 12) === 0, 'falling, then gone');
    }
    // The count changes on the breach frame.
    const count = (f: number) => content(f).glyphs.mono.concat(content(f).glyphs.dot).map((g) => g.ch).join('');
    if (up(b)) assert.ok(count(b).includes(`${4 - i}/5`), `${b}: ${count(b)}`);
  }
});

test('row 1: the avatar degrades (clean → sweat on L1’s breach → shock on L2’s → re-infected on the touché, its ω amber → giving up), swapping on each frame', () => {
  assert.deepEqual(
    L.AVATAR_STATES.map((a) => [a.at, a.face]),
    [
      [BOX, AVATAR.clean],
      [SCOREBOARD[1].at, AVATAR.sweat],
      [SCOREBOARD[2].at, AVATAR.shock],
      [TOUCHE, AVATAR.infected],
      [GIVING_UP, AVATAR.givingUp],
    ],
  );
  for (const a of L.AVATAR_STATES.slice(1, 4)) {
    assert.notEqual(chars(a.at - 1, 'jp'), a.face, `${a.at - 1}`);
    assert.equal(chars(a.at, 'jp'), a.face, `${a.at}: swapped on its frame`);
  }
  const om = content(TOUCHE + 4).glyphs.jp.find((g) => g.ch === 'ω')!;
  assert.ok(same(om.color, L.SLOT_INK.amber), 'the infection is his amber');
  assert.ok(content(TOUCHE - 1).glyphs.jp.every((g) => same(g.color, L.SLOT_INK.red)), 'all red before the touché');
});

test('the give-up: crushed under the pill before it lands (its bottom ≤ 943 px), the last pip cracks on 17.4, then grey, folded shut by 17.4 + 17', () => {
  for (let f = GIVING_UP - 3; f < L.SLOT_END; f++) {
    const r = L.slotRect(f);
    if (r) assert.ok(r.y0 >= 944, `${f}: top ${r.y0.toFixed(0)} under the pill`);
  }
  assert.equal(chars(GIVING_UP - 3, 'display'), '', 'row 1 squeezed out');
  assert.ok(content(GIVING_UP).over.some((s) => s.kind === 'segment'), 'the last crack on 17.4');
  assert.equal(L.statusAt(GIVING_UP)!.line.text, breached(4));
  const g = content(L.GREY.to).glyphs.mono;
  assert.ok(g.length > 0 && g.every((x) => x.color[0] < 0.4 && Math.abs(x.color[0] - x.color[1]) < 0.15), 'grey');
});

test('it never covers him: the wave’s carve ghosts it (≤ 20 %), the arcade dock clears the mothership, the copies and the arcade’s own HUD, the well’s mothership, the pictogram’s figure', () => {
  // The wave: wherever his rect (heroWave) meets the box, the slot is ≤ 20 % (since R2-03 its dock never meets him: the test below).
  for (let f = BURST; f < ARCADE.from; f++) {
    const h = heroWave(f);
    const w = (h.width * h.sx) / 2;
    const t = (0.46 * h.width * h.sy) / 2;
    const r = L.slotRect(f);
    const hit = r !== null && overlaps({ x0: h.x - w, y0: h.y - t, x1: h.x + w, y1: h.y + t }, r);
    if (hit) assert.ok(L.dockAt(f)!.alpha <= 0.2 + 1e-9, `${f}: ghosted under his carve`);
  }
  // The arcade and the well: the dock is top left, under the HUD's left lines, clear of him and his copies.
  const box = L.ARCADE_BOX;
  assert.equal((960 - box.x0) % GP, 0);
  assert.equal((540 - box.y0) % GP, 0, 'on the game grid');
  for (let f = ARCADE.from; f < TOTEM; f++) {
    const r = L.slotRect(f);
    if (!r) continue;
    assert.deepEqual([r.x0, r.x1], [box.x0, box.x1]);
    if (f < ARCADE.to) {
      for (const l of hudLines(f)) if (l.align === 0) assert.ok(l.y + 7 * GP < r.y0, `${f}: under the HUD line ${l.text}`);
      const m = mothershipAt(f);
      const mw = (13 * 42 * m.sx) / 2;
      const mh = (9 * 42 * m.sy) / 2;
      assert.ok(!overlaps({ x0: m.cx - mw, y0: m.cy - mh, x1: m.cx + mw, y1: m.cy + mh }, r), `${f}: clear of the mothership`);
      for (const k of copiesAt(f)) {
        const [x, y] = copyAt(k, f);
        assert.ok(!overlaps({ x0: x, y0: y, x1: x + COPY_W * GP, y1: y + COPY_H * GP }, r), `${f}: clear of a copy at (${x}, ${y})`);
      }
    } else {
      const m = mothershipScreen(f);
      assert.ok(960 + m.x - m.width / 2 > r.x1, `${f}: clear of the well’s mothership`);
    }
  }
  assert.equal(content(ARCADE.from + 10).glyphs.mono.length, 0, 'DotGothic16 in 12–13');
  assert.ok(content(ARCADE.from + 10).glyphs.dot.length > 0);
  assert.ok(content(TOTEM + 4).glyphs.mono.length > 0, 'back to mono at home on 14.1');
  // The pictograms: from the plan view's landing to the contact sheet, every limb of his figure clear of the snapped box.
  for (let f = PICTO; f < SHEET; f++) {
    const r = L.slotRect(f)!;
    assert.ok(Math.abs(r.x1 - (r.x0 + (L.SLOT_BOX.x1 - L.SLOT_BOX.x0) * L.PICTO_SCALE)) < 1e-6, `${f}: snapped to ×${L.PICTO_SCALE}`);
    // Each limb is a round-capped stroke: no point of it within half its width of the box.
    for (const j of heroLimbs(f).joints)
      for (let u = 0; u <= 1; u += 1 / 32) {
        const [x, y] = [j.a[0] + (j.b[0] - j.a[0]) * u, j.a[1] + (j.b[1] - j.a[1]) * u];
        const dx = Math.max(r.x0 - x, 0, x - r.x1);
        const dy = Math.max(r.y0 - y, 0, y - r.y1);
        assert.ok(Math.hypot(dx, dy) >= j.w / 2, `${f}: his limb at (${x.toFixed(0)}, ${y.toFixed(0)}) touches the box`);
      }
  }
});

test('R2-03: in the wave it docks top left at ×0.72 (powering on on the burst’s cut), clear of his rect, his wake’s track, the mountain and the cartouche; its type drops to DotGothic16 as the scan line crosses it; the arcade takes it on 12.1', () => {
  const B = L.WAVE_BOX;
  const [W, H] = [L.SLOT_BOX.x1 - L.SLOT_BOX.x0, L.SLOT_BOX.y1 - L.SLOT_BOX.y0];
  assert.deepEqual([B.x0, B.y0], [L.SLOT_BOX.x0, 1080 - L.SLOT_BOX.y1], 'the home box’s margins, top left');
  assert.ok(Math.abs(B.x1 - B.x0 - W * L.ACT2_SCALE) < 1e-9 && Math.abs(B.y1 - B.y0 - H * L.ACT2_SCALE) < 1e-9, '×0.72');
  assert.equal(B.x0, L.ARCADE_BOX.x0, 'the same left edge as the arcade’s dock');
  // The switch keeps it home and whole to its last frame; the burst's cut takes it top left, powering on over 3 f.
  assert.deepEqual(L.slotRect(BURST - 1), { ...L.SLOT_BOX });
  assert.ok(L.dockAt(BURST)!.open > 0 && L.dockAt(BURST)!.open < 0.5, 'a CRT’s line on the cut');
  assert.equal(content(BURST).glyphs.mono.length + content(BURST).glyphs.display.length, 0, 'no type while it powers on');
  assert.equal(L.dockAt(BURST + 3)!.open, 1);
  for (let f = BURST; f < ARCADE.from; f++) {
    const d = L.dockAt(f)!;
    assert.deepEqual([d.x0, d.y0, d.x1, d.y1, d.scale], [B.x0, B.y0, B.x1, B.y1, L.ACT2_SCALE], `${f}: at the wave’s dock`);
    if (f >= BURST + 3 && f < ARCADE.from - 4) assert.equal(d.alpha * d.open, 1, `${f}: whole (nothing to ghost for)`);
  }
  // His rect (heroWave; ≈ 0.46 of his width tall) with 12 px of air, at every sub-frame instant of 10.1 → 12.1.
  for (let f = BURST - 0.5; f < ARCADE.from; f += 0.25) {
    const h = heroWave(f);
    const w = (h.width * h.sx) / 2 + 12;
    const t = (0.46 * h.width * h.sy) / 2 + 12;
    assert.ok(!overlaps({ x0: h.x - w, y0: h.y - t, x1: h.x + w, y1: h.y + t }, B), `${f}: clear of him`);
  }
  // His wake lies where his board carved (the trough and the face, 10.2 + 5.5 → + 15.5; the crest, 10.3 → 10.4): his board is ≈ 66 px
  // under his centre, the ink soaks 20 px in and bleeds to ≈ 46 px wide. So his centre's track over those spans, on screen at every frame
  // up to the crash, stays ≥ 132 px from the dock.
  const dist = (p: readonly number[]) => Math.hypot(Math.max(B.x0 - p[0], 0, p[0] - B.x1), Math.max(B.y0 - p[1], 0, p[1] - B.y1));
  const K = blockAt('boats');
  const track: (readonly [number, number])[] = [];
  for (let t = K + 5.5; t <= BARREL.from; t += 0.25) if (t <= K + 15.5 || t >= CREST) track.push(heroPlane(t));
  for (let f = K; f < WAVE_CRASH; f++) {
    const cam = waveCam(f);
    for (const p of track) assert.ok(dist(toScreen(cam, PLANE.wave, p)) >= 132, `${f}: his wake’s track too near the dock`);
  }
  // The small kaomoji mountain (its own plane) and the cartouche (the paper) on every frame of the wave, 12 px of air.
  for (let f = BURST; f < ARCADE.from; f++) {
    const cam = waveCam(f);
    for (const p of MOUNTAIN_SHAPE) assert.ok(dist(toScreen(cam, PLANE.mountain, p)) >= 12, `${f}: clear of the mountain`);
  }
  const C = WAVE_CARTOUCHE;
  assert.ok(!overlaps({ x0: C.x0 - 12, y0: C.y0 - 12, x1: C.x1 + 12, y1: C.y1 + 12 }, B), 'clear of the cartouche');
  // Mono until the scan line (11.4) crosses its middle, DotGothic16 from that frame; the arcade's dock from 12.1.
  const mid = (B.y0 + B.y1) / 2;
  assert.ok(L.WAVE_8BIT > DOWNSAMPLE.from && L.WAVE_8BIT < DOWNSAMPLE.from + 6, 'early in the sweep (the dock is at the top)');
  assert.ok(scanLineY(L.WAVE_8BIT)! >= mid && (scanLineY(L.WAVE_8BIT - 1) ?? 0) < mid, 'on the frame the line crosses its middle');
  assert.ok(content(L.WAVE_8BIT - 1).glyphs.mono.length > 0 && content(L.WAVE_8BIT - 1).glyphs.dot.length === 0, 'mono before');
  assert.ok(content(L.WAVE_8BIT).glyphs.dot.length > 0 && content(L.WAVE_8BIT).glyphs.mono.length === 0, 'DotGothic16 from it');
  assert.ok(chars(L.WAVE_8BIT, 'dot').includes('L28bit.rom▸deploying'), 'the layer being deployed, in the arcade’s type');
  assert.deepEqual(L.slotRect(ARCADE.from + 3), { x0: L.ARCADE_BOX.x0, y0: L.ARCADE_BOX.y0, x1: L.ARCADE_BOX.x1, y1: L.ARCADE_BOX.y1 });
});

test('act 2 at ×0.72: from the burst to the close every dock but the arcade’s is the home box at ×0.72 (bottom left at home); the switch keeps it whole', () => {
  const [W, H] = [L.SLOT_BOX.x1 - L.SLOT_BOX.x0, L.SLOT_BOX.y1 - L.SLOT_BOX.y0];
  for (let f = BOX; f < BURST; f++) assert.equal(L.dockAt(f)!.scale, 1, `${f}: the switch, full size`);
  for (let f = BURST; f < L.SLOT_END; f++) {
    const d = L.dockAt(f)!;
    if (f >= ARCADE.from && f < TOTEM) {
      assert.equal(d.scale, 1, `${f}: the arcade’s own dock`);
      continue;
    }
    assert.equal(d.scale, L.ACT2_SCALE, `${f}`);
    assert.ok(Math.abs(d.x1 - d.x0 - W * L.ACT2_SCALE) < 1e-9, `${f}: its width`);
    if (f >= TOTEM && f < GIVING_UP - 6) {
      assert.deepEqual([d.x0, d.y1], [L.SLOT_BOX.x0, L.SLOT_BOX.y1], `${f}: anchored bottom left at home`);
      assert.ok(Math.abs(d.y1 - d.y0 - H * L.ACT2_SCALE) < 1e-9, `${f}: its height`);
    }
  }
});

test('every glyph inside its box, every character in its atlas and covered by its role’s fonts, within the layer’s capacities, at every frame', () => {
  const atlasChars = Object.fromEntries(Object.entries(L.SLOT_STRINGS).map(([k, v]) => [k, new Set([...v.join('')])]));
  const sizeOf = { display: adv.display, mono: adv.mono, dot: adv.dot, jp: adv.jp };
  for (const f of SPAN) {
    const c = content(f);
    assert.ok(c.under.length <= L.SLOT_CAPACITY.shapes, `${f}: shapes`);
    const r = L.slotRect(f);
    for (const [k, gs] of Object.entries(c.glyphs) as [keyof L.SlotGlyphs, L.SlotGlyphs[keyof L.SlotGlyphs]][]) {
      assert.ok(gs.length <= L.SLOT_CAPACITY.glyphs, `${f}: ${k} glyphs`);
      for (const g of gs) {
        assert.ok(atlasChars[k].has(g.ch), `${f}: ${g.ch} in the ${k} atlas`);
        const half = (sizeOf[k](g.ch) * g.size) / 2;
        const [x, y] = [g.x + 960, 540 - g.y];
        assert.ok(r && x - half >= r.x0 + 4 && x + half <= r.x1 - 4, `${f}: ${g.ch} (${k}) inside the box (${(x - half).toFixed(0)}–${(x + half).toFixed(0)})`);
        assert.ok(y >= r!.y0 && y <= r!.y1, `${f}: ${g.ch} inside the box vertically`);
      }
    }
  }
  const coverage = new Map<string, Set<number>>();
  for (const f of FONT_FILES) coverage.set(f.family, new Set([...(coverage.get(f.family) ?? []), ...readCoverage(readFileSync(new URL(`../public/${f.file}`, import.meta.url)))]));
  const role: Record<keyof L.SlotGlyphs, FontRole> = { display: 'display', mono: 'mono', dot: 'dot', jp: 'jp' };
  for (const [k, strings] of Object.entries(L.SLOT_STRINGS) as [keyof L.SlotGlyphs, readonly string[]][])
    for (const s of strings)
      for (const ch of s) if (ch !== ' ') assert.ok(STACKS[role[k]].some((fam) => coverage.get(fam)?.has(ch.codePointAt(0)!)), `${ch} (${k}) has a font`);
});

test('the switch’s flood piles up on the scoreboard and round it, never under it (every copy’s landing ink box clear of the box)', () => {
  const inkW = (size: number) => (size * (FACE_INK[2] - FACE_INK[0])) / FACE_ADVANCE;
  const inkH = (size: number) => (size * (FACE_INK[3] - FACE_INK[1])) / FACE_ADVANCE;
  for (const d of S.FLOOD_DROPS) {
    const [x, y] = d.to;
    const r = { x0: x - inkW(d.size) / 2, y0: y - inkH(d.size) / 2, x1: x + inkW(d.size) / 2, y1: y + inkH(d.size) / 2 };
    assert.ok(!overlaps(r, L.SLOT_BOX), `a copy lands under the box at (${x.toFixed(0)}, ${y.toFixed(0)})`);
  }
  assert.ok(S.FLOOD_DROPS.some((d) => d.to[1] < L.SLOT_BOX.y0 && d.to[0] < L.SLOT_BOX.x1), 'some piled on top of it');
});

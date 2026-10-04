// The switch's type-design blueprint of his face (src/shots/drop2SwitchType.ts; build sheet notes/bid2/drop2-sheet2.md §3 bar 9,
// design notes/extend/drop2-final.md §4.7): the real contours of M PLUS Rounded 1c ExtraBold — on-curve points, off-curve handles,
// the outline — laid out exactly where the film's glyph atlas sets (•ω•), and the hardened brows centred over the eyes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import opentype from 'opentype.js';
import { HERO_ADVANCE } from '../src/shots/breakShared.ts';
import { S27_MASTER } from '../src/shots/drop2Shared.ts';
import * as T from '../src/shots/drop2SwitchType.ts';

const buf = readFileSync(new URL('../public/fonts/mplus-rounded-1c-extrabold.ttf', import.meta.url));
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
/** The font's own glyph (opentype.js; engine/opentype.d.ts types only the subset the film uses). */
type FullGlyph = { advanceWidth: number; getPath(x: number, y: number, size: number): { getBoundingBox(): { x1: number; y1: number; x2: number; y2: number } } };
const glyph = (ch: string): FullGlyph => (font as unknown as { charToGlyph(c: string): FullGlyph }).charToGlyph(ch);
const cmds = (ch: string): T.PathCmd[] => font.getPath(ch, 0, 0, font.unitsPerEm).commands as T.PathCmd[];
const plans = T.facePlans((ch) => ({ cmds: cmds(ch), advance: T.FACE_CHAR_ADVANCE[ch] }));

test('a glyph plan is the font’s own outline: its on-curve points lie on the flattened outline, its handles are the quadratic controls, its box is the font’s', () => {
  for (const ch of T.FACE_CHARS) {
    const p = plans.glyphs[ch];
    const bb = glyph(ch).getPath(0, 0, 1000).getBoundingBox();
    assert.ok(Math.abs(T.FACE_CHAR_ADVANCE[ch] - glyph(ch).advanceWidth / font.unitsPerEm) < 1e-9, `${ch}: the film's advance is the font's`);
    assert.ok(p.contours.length >= 1, `${ch}: contours`);
    const quads = cmds(ch).filter((c) => c.type === 'Q').length;
    assert.equal(p.contours.reduce((n, c) => n + c.handles.length, 0), quads, `${ch}: one handle per quadratic`);
    for (const c of p.contours) {
      assert.ok(c.poly.length >= c.on.length, `${ch}: flattened`);
      const near = (q: T.Pt) => Math.min(...c.poly.map((v) => Math.hypot(v[0] - q[0], v[1] - q[1])));
      for (const q of c.on) assert.ok(near(q) < 1e-9, `${ch}: on-curve point on the outline`);
      for (const h of c.handles) assert.ok(c.on.some((q) => q[0] === h.from[0] && q[1] === h.from[1]) || c.on.length === 0, `${ch}: a leader from an on-curve point`);
      const [a, b] = [c.poly[0], c.poly[c.poly.length - 1]];
      assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9, `${ch}: closed`);
    }
    // y up, em units: the box is the font's (y down) flipped.
    const [x0, y0, x1, y1] = p.box;
    assert.ok(Math.abs(x0 - bb.x1 / 1000) < 2e-3 && Math.abs(x1 - bb.x2 / 1000) < 2e-3, `${ch}: x box`);
    assert.ok(Math.abs(y0 + bb.y2 / 1000) < 2e-3 && Math.abs(y1 + bb.y1 / 1000) < 2e-3, `${ch}: y box (flipped)`);
  }
});

test('the face is laid out as the film sets (•ω•): advances are HERO_ADVANCE, the brackets’ ink centred on the face’s centre (S27_MASTER’s convention)', () => {
  for (const ch of ['(', ')', '•', 'ω'] as const) assert.ok(Math.abs(plans.glyphs[ch].advance - HERO_ADVANCE[ch]) < 1e-9, `${ch} advance`);
  assert.ok(Math.abs(T.FACE_ADVANCE - 2.698) < 1e-9);
  assert.deepEqual(T.FACE_PARTS.map((p) => p.ch), ['(', '•', 'ω', '•', ')']);
  assert.deepEqual(T.FACE_PARTS.map((p) => p.layer), ['brackets', 'eyes', 'mouth', 'eyes', 'brackets']);
  // S27_MASTER: em 459.6, left 340, baseline 674.5 for a face 1240 wide centred on (960, 540) — the same rule at any width.
  const em = S27_MASTER.width / T.FACE_ADVANCE;
  assert.ok(Math.abs(em - S27_MASTER.em) < 0.1);
  assert.ok(Math.abs(540 + T.INK_MID * em - S27_MASTER.baseline) < 0.2, 'baseline below the centre by the brackets’ ink mid');
  const box = T.faceInkBox(plans);
  assert.ok(Math.abs((box[1] + box[3]) / 2 - T.INK_MID) < 1e-3, 'the brackets’ ink is centred');
  assert.ok(Math.abs((box[0] + box[2]) / 2 - T.FACE_ADVANCE / 2) < 0.01, 'and the face nearly symmetric');
  for (let i = 0; i < 4; i++) assert.ok(Math.abs(box[i] - T.FACE_INK[i]) < 1e-3, `FACE_INK[${i}] is the font's`);
});

test('the hardened brows sit over the eyes: each mark centred on its eye in x, above it in y', () => {
  const eyes = T.FACE_PARTS.filter((p) => p.layer === 'eyes');
  for (const [k, b] of plans.brows.entries()) {
    const g = plans.glyphs[b.ch];
    const eye = plans.glyphs['•'];
    const cx = b.x + (g.box[0] + g.box[2]) / 2;
    const ex = eyes[k].x + (eye.box[0] + eye.box[2]) / 2;
    assert.ok(Math.abs(cx - ex) < 1e-9, `brow ${k} centred`);
    assert.ok(g.box[1] > eye.box[3], `brow ${k} above the eye`);
  }
  assert.deepEqual(plans.brows.map((b) => b.ch), ['̀', '́']);
});

test('a plan point maps to the world: the face’s centre at (cx, cy), `width` its advance, y up', () => {
  const at = T.emToWorld({ cx: 0, cy: 0, width: 600 });
  const em = 600 / T.FACE_ADVANCE;
  assert.deepEqual(at([0, T.INK_MID]), [-300, 0]);
  assert.deepEqual(at([T.FACE_ADVANCE, T.INK_MID]), [300, 0]);
  const [x, y] = at([T.FACE_ADVANCE / 2, T.INK_MID + 1]);
  assert.ok(Math.abs(x) < 1e-9 && Math.abs(y - em) < 1e-9);
});

test('flattening keeps every segment short at the hero’s size (≤ 12 px at 600 px), and the whole face stays within the shape budget', () => {
  const em = 600 / T.FACE_ADVANCE;
  let segs = 0;
  let points = 0;
  for (const part of [...T.FACE_PARTS, ...plans.brows]) {
    for (const c of plans.glyphs[part.ch].contours) {
      for (let i = 1; i < c.poly.length; i++) {
        const d = Math.hypot(c.poly[i][0] - c.poly[i - 1][0], c.poly[i][1] - c.poly[i - 1][1]) * em;
        assert.ok(d <= 12.5, `${part.ch}: a ${d.toFixed(1)} px segment`);
      }
      segs += c.poly.length - 1;
      points += c.on.length + c.handles.length;
    }
  }
  assert.ok(segs < 1400 && points < 400, `${segs} segments, ${points} points`);
});

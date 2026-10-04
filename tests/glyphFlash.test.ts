// The 字符闪 character flash: the score (src/score/cuts.ts), how it reaches the
// look (Director, ENERGY, mixLook) and the post effect's pure parts
// (src/engine/post/glyphFlash.ts). The picture itself is checked by stills
// (output/qa/glyph-flash/).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import * as THREE from 'three';
import { Director } from '../src/director.ts';
import { GLYPH_ASPECT, GLYPH_RAMP, GlyphFlashEffect, glyphCellPx } from '../src/engine/post/glyphFlash.ts';
import { FLAT_LOOK, type Look, mixLook } from '../src/engine/types.ts';
import { BREAK_END, BREAK_GLYPHS } from '../src/score/break.ts';
import { GLYPH_CELL, GLYPH_SECTIONS, type GlyphFlash, type GlyphSection, glyphAmount, glyphFlashAt } from '../src/score/cuts.ts';
import { SMASH } from '../src/score/drop1.ts';
import { LOCK as WHITE } from '../src/score/intro.ts';
import { DROP2_END, DROP2_GLYPHS } from '../src/score/drop2.ts';
import { ENERGY } from '../src/score/energy.ts';
import { OUTRO_END, OUTRO_GLYPHS } from '../src/score/outro.ts';
import { TOTAL_FRAMES } from '../src/score/tempo.ts';

// The font tools are untyped .mjs; a specifier typed as a plain string keeps tsc from resolving it.
const { readCoverage } = (await import('../scripts/lib/cmap.mjs' as string)) as { readCoverage: (font: Buffer) => Set<number> };

const amounts = (flashes: readonly GlyphFlash[], end: number, frames: readonly number[]) => frames.map((f) => glyphAmount({ flashes, end }, f));

// Iteration 2 (the director's ruling 6, sync review 6): the flash starts ON the cut frame and runs through cut + 3 — it no longer
// straddles the cut (at − 2 … at + 1 put the biggest change two frames before the kick and left the kick frame quiet).
test('a hard cut { at } is characters on at … at+3 at full amount, and only there: never before the cut frame', () => {
  assert.deepEqual(amounts([{ at: 300 }], 400, [297, 298, 299, 300, 301, 302, 303, 304, 305]), [0, 0, 0, 1, 1, 1, 1, 0, 0]);
  assert.deepEqual(amounts([{ at: 300, amount: 0.5 }], 400, [299, 300, 303, 304]), [0, 0.5, 0.5, 0]);
});

test('a held cut { at, through } is characters from at through `through` (inclusive) at its amount, and only there', () => {
  assert.deepEqual(amounts([{ at: 300, through: 305 }], 400, [298, 299, 300, 301, 302, 303, 304, 305, 306]), [0, 0, 1, 1, 1, 1, 1, 1, 0]);
  assert.deepEqual(amounts([{ at: 300, through: 304, amount: 0.5 }], 400, [299, 300, 304, 305]), [0, 0.5, 0.5, 0]);
  assert.deepEqual(amounts([{ at: 300, through: 302 }], 400, [299, 300, 302, 303]), [0, 1, 1, 0], 'shorter than a plain cut: it lets go after `through`');
  assert.deepEqual(amounts([{ at: 300, through: 303 }], 400, [299, 300, 303, 304]), amounts([{ at: 300 }], 400, [299, 300, 303, 304]), 'through at + 3 is a plain cut');
  assert.equal(glyphAmount({ flashes: [{ at: 300, through: 305 }], end: 400 }, 305.5), 0, 'nothing past `through`');
  assert.equal(glyphAmount({ flashes: [{ at: 300, through: 305 }], end: 400 }, 299.5), 0, 'nothing before the cut frame');
});

test('a ramp { at, until } rises from 0 on at to amount on until, then holds to the end of its section', () => {
  const ramp = [{ at: 300, until: 330 }];
  assert.deepEqual(amounts(ramp, 400, [297, 299, 300, 315, 330, 360, 399, 400, 401]), [0, 0, 0, 0.5, 1, 1, 1, 0, 0]);
  assert.deepEqual(amounts([{ at: 300, until: 330, amount: 0.8 }], 400, [300, 315, 330, 399, 400]), [0, 0.4, 0.8, 0.8, 0]);
});

test('overlapping entries take the strongest; fractional frames are fine', () => {
  const list = [{ at: 300, amount: 0.3 }, { at: 300, until: 330 }, { at: 303 }];
  assert.deepEqual(amounts(list, 400, [299, 300, 301, 302, 303, 306, 307, 309]), [0, 0.3, 0.3, 0.3, 1, 1, 7 / 30, 9 / 30]);
  assert.equal(glyphAmount({ flashes: [{ at: 300 }], end: 400 }, 299.5), 0);
  assert.equal(glyphAmount({ flashes: [{ at: 300 }], end: 400 }, 303.5), 0);
  assert.equal(glyphAmount({ flashes: [{ at: 300, until: 330 }], end: 400 }, 307.5), 0.25);
});

test('the film merges the break, drop 2 and the outro, each holding its ramps to its own end', () => {
  assert.deepEqual(
    GLYPH_SECTIONS.map((s) => s.end),
    [BREAK_END, DROP2_END, OUTRO_END],
  );
  assert.equal(GLYPH_SECTIONS[0].flashes, BREAK_GLYPHS);
  assert.equal(GLYPH_SECTIONS[1].flashes, DROP2_GLYPHS);
  assert.equal(GLYPH_SECTIONS[2].flashes, OUTRO_GLYPHS);
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const g = glyphFlashAt(f);
    assert.equal(g.cell, GLYPH_CELL);
    assert.equal(g.amount, Math.max(0, ...GLYPH_SECTIONS.map((s) => glyphAmount(s, f))), `frame ${f}`);
  }
});

test('the intro, the build and drop 1 (to the smash, break 1.1) never flash; every listed entry is well formed and on the grid', () => {
  for (let f = -10; f < SMASH; f++) assert.equal(glyphFlashAt(f).amount, 0, `frame ${f}`);
  for (const s of GLYPH_SECTIONS) {
    for (const e of s.flashes) {
      const name = JSON.stringify(e);
      assert.equal(e.at % 3, 0, `${name}: at on the 3-frame grid`);
      assert.ok(e.at >= SMASH, `${name}: its flash would reach drop 1 (before the smash)`);
      assert.ok(e.at < s.end, `${name}: starts inside its section`);
      if (e.amount !== undefined) assert.ok(e.amount > 0 && e.amount <= 1, `${name}: amount in (0, 1]`);
      if (e.until !== undefined) {
        assert.equal(e.until % 3, 0, `${name}: until on the 3-frame grid`);
        assert.ok(e.until > e.at && e.until <= s.end, `${name}: until after at, inside its section`);
      }
      if (e.through !== undefined) {
        assert.equal(e.until, undefined, `${name}: a held cut is not a ramp`);
        assert.ok(e.through >= e.at && e.through < s.end, `${name}: through at least at, inside its section`);
      }
    }
  }
});

// The white flash runs before the character flash (in the main pass), so a white accent on a character-flash frame lifts black
// above the effect's floor (0.07): a bump of 0.18 turns the black between the characters into a field of dim grey dots, and a
// flash of 0.55 turns the whole frame into one grey block of characters (checked in stills). Below 0.05 black stays blank.
const WHITE_UNDER_GLYPHS = 0.05;
const whiteUnderGlyphs = (sections: readonly GlyphSection[], flash: (f: number) => number): number[] => {
  const bad: number[] = [];
  for (let f = 0; f < TOTAL_FRAMES; f++) if (Math.max(0, ...sections.map((s) => glyphAmount(s, f))) > 0 && flash(f) > WHITE_UNDER_GLYPHS) bad.push(f);
  return bad;
};

test('no white flash under a character flash: an accent with a flash goes on at + 6 or later (or at − 9 or earlier)', () => {
  // The check bites: the intro's lock (WHITE: flash 0.7, 0.32, 0.15, 0.07; v04's club flip, which this used, left with v04's club) under a
  // cut flash on it (its frame and the 3 after).
  assert.deepEqual(whiteUnderGlyphs([{ flashes: [{ at: WHITE }], end: WHITE + 24 }], ENERGY.flash), [WHITE, WHITE + 1, WHITE + 2, WHITE + 3]);
  assert.deepEqual(whiteUnderGlyphs([{ flashes: [{ at: WHITE - 3 }], end: WHITE + 24 }], ENERGY.flash), [WHITE], 'a cut 3 frames before the accent still runs into it');
  assert.deepEqual(whiteUnderGlyphs([{ flashes: [{ at: WHITE - 6 }], end: WHITE + 24 }], ENERGY.flash), [], 'the accent 6 frames after the cut is clear');
  assert.deepEqual(whiteUnderGlyphs(GLYPH_SECTIONS, ENERGY.flash), []);
});

test('the default cell is a readable terminal grid: 12–16 px at 1080p, mono-width cells', () => {
  assert.ok(GLYPH_CELL >= 12 && GLYPH_CELL <= 16);
  assert.deepEqual(glyphCellPx(15, 1080), { w: 9, h: 15 });
  assert.deepEqual(glyphCellPx(15, 2160), { w: 18, h: 30 }, 'a 4K frame is the 1080p grid, scaled');
  assert.deepEqual(glyphCellPx(12, 1080), { w: 7, h: 12 });
  assert.equal(GLYPH_ASPECT, 0.6);
});

test('every ramp character is in JetBrains Mono (the atlas is drawn with the mono role) and the ramp starts with a blank', () => {
  const cov = readCoverage(fs.readFileSync(new URL('../public/fonts/jetbrains-mono.ttf', import.meta.url)));
  assert.equal(GLYPH_RAMP[0], ' ');
  assert.equal(new Set(GLYPH_RAMP).size, [...GLYPH_RAMP].length, 'no character twice');
  for (const ch of GLYPH_RAMP) assert.ok(cov.has(ch.codePointAt(0)!), `U+${ch.codePointAt(0)!.toString(16)} ${ch}`);
});

test('the effect is off (no atlas, the pass skipped) at amount 0, and sizes its cells to the frame', () => {
  const made: [string, number, number][] = [];
  const fx = new GlyphFlashEffect((chars, w, h) => {
    made.push([chars, w, h]);
    return { texture: new THREE.Texture(), count: [...chars].length };
  });
  fx.setSize(3840, 2160);
  assert.equal(fx.configure(undefined), false);
  assert.equal(fx.configure({ amount: 0, cell: 15 }), false);
  assert.equal(made.length, 0, 'no atlas until it is needed');
  assert.equal(fx.configure({ amount: 0.5, cell: 15 }), true);
  assert.equal(fx.configure({ amount: 1, cell: 15 }), true);
  assert.deepEqual(made, [[GLYPH_RAMP, 18, 30]], 'one atlas per cell size, built on first use');
  const u = fx.uniforms;
  assert.equal(u.get('amount')!.value, 1);
  assert.deepEqual((u.get('cellPx')!.value as THREE.Vector2).toArray(), [18, 30]);
  assert.equal(u.get('count')!.value, [...GLYPH_RAMP].length);
  fx.setSize(1920, 1080);
  assert.equal(fx.configure({ amount: 1, cell: 15 }), true);
  assert.deepEqual(made[1], [GLYPH_RAMP, 9, 15]);
  assert.deepEqual((u.get('cellPx')!.value as THREE.Vector2).toArray(), [9, 15]);
  fx.dispose();
});

const scene = (look: Look = FLAT_LOOK) => ({ init: async () => {}, render: () => {}, look: () => look, dispose: () => {} });
const span = (look?: Look) => [{ from: 0, to: 100, make: () => scene(look) }];
const quiet = { view: () => ({ zoom: 1, x: 0, y: 0, roll: 0 }), flash: () => 0 };

test('the director adds the energy’s character flash to the look — only with energy on, only where it flashes', () => {
  const energy = { ...quiet, glyphs: (f: number) => ({ amount: f === 10 ? 1 : f === 11 ? 0.5 : 0, cell: 14 }) };
  const on = new Director(span(), { from: 0, to: 100 }, energy);
  assert.deepEqual(on.look(10).glyphs, { amount: 1, cell: 14 });
  assert.deepEqual(on.look(11).glyphs, { amount: 0.5, cell: 14 });
  assert.equal(on.look(12), FLAT_LOOK, 'no flash: the scene’s look, untouched');
  assert.equal('glyphs' in on.look(12), false);
  const off = new Director(span(), { from: 0, to: 100 });
  assert.equal(off.look(10).glyphs, undefined, 'energy: false (continuity renders) leaves it out');
  const noGlyphs = new Director(span(), { from: 0, to: 100 }, quiet);
  assert.equal(noGlyphs.look(10).glyphs, undefined);
});

test('a scene’s own character flash (a transition’s) and the energy’s: the stronger wins', () => {
  const own: Look = { ...FLAT_LOOK, glyphs: { amount: 0.7, cell: 12 } };
  const energy = { ...quiet, glyphs: (f: number) => ({ amount: f === 10 ? 1 : f === 11 ? 0.4 : 0, cell: 15 }) };
  const d = new Director(span(own), { from: 0, to: 100 }, energy);
  assert.deepEqual(d.look(10).glyphs, { amount: 1, cell: 15 });
  assert.deepEqual(d.look(11).glyphs, { amount: 0.7, cell: 12 });
  assert.deepEqual(d.look(12).glyphs, { amount: 0.7, cell: 12 });
});

test('the film’s energy carries the character flash, and the flash merges with it', () => {
  assert.equal(ENERGY.glyphs, glyphFlashAt);
});

test('mixLook takes the character flash from the nearer look, like the CRT, and adds no key when neither has one', () => {
  const a: Look = { ...FLAT_LOOK, glyphs: { amount: 1, cell: 15 } };
  assert.deepEqual(mixLook(a, FLAT_LOOK, 0.25).glyphs, { amount: 1, cell: 15 });
  assert.equal(mixLook(a, FLAT_LOOK, 0.75).glyphs, undefined);
  assert.equal('glyphs' in mixLook(FLAT_LOOK, FLAT_LOOK, 0.5), false);
});

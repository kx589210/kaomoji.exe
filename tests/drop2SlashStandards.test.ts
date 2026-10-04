// The house standards over Drop2Slash's frames (drop2 1.1–3.1 − 1): every character drawn is in its atlas and in DROP2_TEXTS with the role its
// atlas draws it in (the break’s own last-frame characters, which drop 2 carries through the seam, may be listed by the break: src/content/
// break.ts, with the same role); fast camera moves get enough sub-frames; the camera is never still; sub-frames never leave drop 2's first segment.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BREAK_TEXTS, BREAK_TEXTS_V2 } from '../src/content/break.ts';
import { DROP2_TEXTS } from '../src/content/drop2.ts';
import type { FlatContent } from '../src/engine/flatLayer.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { DROP2_START, POP } from '../src/score/drop2.ts';
import { HERO_ADVANCE, camPose } from '../src/shots/breakShared.ts';
import * as C from '../src/shots/drop2Cube.ts';
import * as S from '../src/shots/drop2Slash.ts';
import { assertFastMovesSampled, assertNeverStill, poseMoved } from './lib/energyAudit.ts';

const ADV: Record<string, number> = HERO_ADVANCE;
const L: S.SlashLayout = { rounded: (ch) => ADV[ch] ?? 0.6, jp: () => 0.9, mono: () => 0.6, display: () => 1.2, dot: () => 1 };
const ROLE = { rounded: 'rounded', jp: 'jp', mono: 'mono', display: 'display', dot: 'dot' } as const;

/** Every glyph key the slash part draws at instant f, per atlas. */
function drawn(f: number): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const add = (key: string, gs: readonly Glyph[] | undefined) => {
    for (const g of gs ?? []) (out.get(key) ?? out.set(key, new Set()).get(key)!).add(g.ch);
  };
  const flat = (c: FlatContent) => {
    for (const [k, gs] of Object.entries(c.glyphs)) add(k, gs);
  };
  if (f < C.CUBE.from || C.visibleFaces(f).some((v) => v.world === 'A')) {
    const hero = S.heroS27(f, L.rounded);
    for (const d of ['interlude', 'swiss', 'neon', 'riso', 'mask'] as const) {
      const x = S.dressHero(hero, d, 1, f);
      add('rounded', [...x.normal, ...x.add, ...x.multiply]);
    }
    add('rounded', S.bandCopies(f, L.rounded));
    flat(S.terminalRegion(f, L));
    flat(S.swissRegion(f, L));
    flat(S.neonRegion(f, L).normal);
    flat(S.neonRegion(f, L).add);
    flat(S.risoRegion(f, L).multiply);
    flat(S.ledRegionSource(f, L).content);
    add('mono', S.tornGlyphs(f).map((g) => ({ ch: g.ch, x: 0, y: 0, size: 1, color: [1, 1, 1] })));
  }
  if (f >= C.CUBE.from) {
    flat(C.swissFace(f, L));
    flat(C.risoFace(f, L));
    flat(C.ledFaceSource(f, L).content);
    flat(C.neonFace(f, L).normal);
    flat(C.neonFace(f, L).add);
    if (f < C.HANDOVER) {
      const d = C.dressCubeHero(C.cubeHero(f, L));
      add(d.atlas, [...d.shadow, ...d.normal, ...d.add, ...d.multiply, ...d.led]);
    }
  }
  return out;
}

test('every character the slash part draws is in its atlas, and listed in DROP2_TEXTS with the role that atlas draws', () => {
  const listed = new Map<string, Set<string>>();
  for (const t of [...DROP2_TEXTS, ...BREAK_TEXTS, ...BREAK_TEXTS_V2]) {
    const set = listed.get(t.role) ?? listed.set(t.role, new Set()).get(t.role)!;
    set.add(t.text);
    for (const ch of t.text) set.add(ch);
  }
  for (let f = DROP2_START; f < POP; f += 1) {
    for (const [key, chs] of drawn(f)) {
      const atlas = new Set(S.SLASH_ATLAS[key as keyof typeof S.SLASH_ATLAS]);
      for (const ch of chs) {
        assert.ok(atlas.has(ch), `${f}: "${ch}" is not in the ${key} atlas`);
        const roleSet = listed.get(ROLE[key as keyof typeof ROLE])!;
        assert.ok(roleSet.has(ch) || [...ch].every((c) => roleSet.has(c)), `${f}: "${ch}" is not listed for ${key} in DROP2_TEXTS`);
      }
    }
  }
});

const camAt = (f: number) => ({ pose: camPose(S.slashCam(f)), samples: S.slashTemporal(f).samples });

test('the camera’s fast moves get at least 32 sub-frames, and it is never still for more than 12 frames', () => {
  assertFastMovesSampled(DROP2_START, POP, camAt);
  assertNeverStill(DROP2_START, POP, poseMoved(camAt));
});

test('sub-frames never leave drop 2’s first segment and the shutter is 180° throughout', () => {
  for (let f = DROP2_START; f < POP; f++) {
    const t = S.slashTemporal(f);
    assert.equal(t.shutter, 0.5);
    const seg = S.slashSegment(f);
    for (const s of temporalSamples(f, t, seg)) assert.ok(s.frame >= seg.from && s.frame < seg.to, `${f}: ${s.frame}`);
  }
});

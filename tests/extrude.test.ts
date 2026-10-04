import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import type * as THREE from 'three';
import { glassText } from '../src/engine/extrude.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = fs.readFileSync(path.join(here, '..', 'public', 'fonts', 'mplus-rounded-1c-black.ttf'));
const font = opentype.parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));

/** Share of the surface's points (vertex positions) whose triangles all agree on one normal. */
function smoothShare(geo: THREE.BufferGeometry): number {
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const byPoint = new Map<string, number[][]>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(2)},${pos.getY(i).toFixed(2)},${pos.getZ(i).toFixed(2)}`;
    const list = byPoint.get(key) ?? [];
    list.push([nor.getX(i), nor.getY(i), nor.getZ(i)]);
    byPoint.set(key, list);
  }
  let one = 0;
  for (const list of byPoint.values()) if (list.every((n) => n[0] * list[0][0] + n[1] * list[0][1] + n[2] * list[0][2] > Math.cos(0.05))) one++;
  return one / byPoint.size;
}

test("the glass face's solids bend light through smooth curves, not facets", () => {
  for (const ch of ['(', 'ω', ')']) {
    const share = smoothShare(glassText(font, ch, { size: 640, depth: 128 }));
    assert.ok(share > 0.8, `${ch}: ${(100 * share).toFixed(0)}% of its points carry one normal`);
  }
});

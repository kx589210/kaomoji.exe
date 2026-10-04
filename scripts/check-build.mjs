// Renders KX-Build at final quality and checks its hand-offs and seams:
//   swiss 1.1 (T1 in): flat Swiss red, centre and corner;
//   the frame before T2 → its first, and T2's last → riso 1.1: T2 starts and ends without a jump;
//   riso 1.3& + 2 frames: pink over blue prints the purple third colour;
//   riso's last frame (T3's first half out): the sun (yellow with a pink core) in the
//   middle and bare paper around it, Phase 4's starting point.
//   node scripts/check-build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { multiplyRGB, srgb8 } from '../src/engine/color.ts';
import { BUILD_START, FLIP } from '../src/score/build.ts';
import { partEnd, partFrame } from '../src/score/film.ts';
import { risoFrame } from '../src/shots/riso.ts';
import { FRONT } from '../src/shots/swiss.ts';
import { PAPER, PLATE } from '../src/worlds/riso.ts';
import { decodePng } from './lib/png.mjs';
import { KX, renderStillsTo } from './lib/remotion.mjs';

/** T1's hand-off (swiss 1.1), the overprint (riso 1.3& + 2 frames) and the sun (riso's last frame); T2 is FLIP. */
const T1 = BUILD_START;
const OVERPRINT = partFrame('riso', 1, 2.5) + 2;
const SUN = partEnd('riso') - 1;
const CHECKED = [T1, FLIP.from - 1, FLIP.from, FLIP.to - 1, FLIP.to, OVERPRINT, SUN];
const files = await renderStillsTo(path.join(KX, 'output', 'qa', 'check-build'), { comp: 'KX-Build', frames: CHECKED.map((f) => f - BUILD_START), scale: 1, inputProps: { quality: 'final', energy: false } });
const img = (film) => decodePng(fs.readFileSync(files.get(film - BUILD_START)));
/** Mean sRGB of a 40 × 40 patch centred on world point (x, y) (origin at the frame's centre, y up). */
const patch = (im, x, y) => {
  const got = [0, 0, 0];
  for (let py = 540 - y - 20; py < 540 - y + 20; py++) {
    for (let px = 960 + x - 20; px < 960 + x + 20; px++) {
      const i = (py * im.width + px) * im.channels;
      for (let c = 0; c < 3; c++) got[c] += im.data[i + c] / 1600;
    }
  }
  return got;
};
const problems = [];
const report = (ok, line) => (ok ? console.log(line) : problems.push(line));
const expect = (name, got, want, tol) =>
  report(Math.max(...got.map((v, c) => Math.abs(v - want[c]))) <= tol, `${name}: got (${got.map((v) => v.toFixed(1)).join(', ')}), want (${want.join(', ')}) ±${tol}`);
/** Mean difference of 8 × 8 block averages: the film grain (seeded per frame) averages out, a real change of picture does not. */
const meanDiff = (a, b) => {
  const k = 8;
  let s = 0;
  let n = 0;
  for (let by = 0; by + k <= a.height; by += k) {
    for (let bx = 0; bx + k <= a.width; bx += k) {
      for (let c = 0; c < 3; c++) {
        let d = 0;
        for (let y = by; y < by + k; y++) for (let x = bx; x < bx + k; x++) d += a.data[(y * a.width + x) * a.channels + c] - b.data[(y * b.width + x) * b.channels + c];
        s += Math.abs(d) / (k * k);
        n++;
      }
    }
  }
  return s / n;
};

const RED = [0xe8, 0x40, 0x2b];
expect(`${T1} centre is Swiss red`, patch(img(T1), 0, 0), RED, 1.5);
expect(`${T1} corner is Swiss red`, patch(img(T1), -900, 480), RED, 1.5);
for (const [a, b] of [[FLIP.from - 1, FLIP.from], [FLIP.to - 1, FLIP.to]]) {
  const d = meanDiff(img(a), img(b));
  report(d <= 1, `${a} → ${b}: mean difference of 8 × 8 blocks ${d.toFixed(2)} / 255 (≤ 1)`);
}
// The overprint patch at OVERPRINT: a point well inside both blocks and clear of the dots and the
// confetti, right of the protagonist (its right edge ≈ x 14) and above the cat (its top ≈ y −65),
// seen through S09's camera (energy off: the rig does not move it).
const at = risoFrame(OVERPRINT, { advance: () => 0.6, hole: [0, 0] });
const under = at.content.under;
const pink = under.find((s) => s.kind === 'rect' && s.color === PLATE.pink && s.w > 1000);
const blue = under.find((s) => s.kind === 'ellipse' && s.color === PLATE.blue && s.w > 800);
const [px, py] = [150, 100];
const c = Math.cos(-(pink.rot ?? 0));
const s = Math.sin(-(pink.rot ?? 0));
const lx = c * (px - pink.x) - s * (py - pink.y);
const ly = s * (px - pink.x) + c * (py - pink.y);
if (Math.abs(lx) > pink.w / 2 - 30 || Math.abs(ly) > pink.h / 2 - 30 || Math.hypot(px - blue.x, py - blue.y) > blue.w / 2 - 30) throw new Error(`the overprint patch is not inside both blocks at ${OVERPRINT}; move it`);
for (const piece of [...at.content.over, ...under.filter((x) => x.color === PLATE.yellow)]) {
  if (Math.hypot(piece.x - px, piece.y - py) < 60) throw new Error(`a dot or a piece of confetti covers the overprint patch at ${OVERPRINT}; move it`);
}
const cam = at.camera;
const zoom = FRONT / (cam.position[2] - cam.target[2]);
const [dx, dy] = [px - cam.target[0], py - cam.target[1]];
const screen = [Math.round((dx * cam.up[1] - dy * cam.up[0]) * zoom), Math.round((dx * cam.up[0] + dy * cam.up[1]) * zoom)];
expect(`${OVERPRINT} pink over blue`, patch(img(OVERPRINT), screen[0], screen[1]), srgb8(multiplyRGB(multiplyRGB(PAPER, PLATE.pink), PLATE.blue)), 5);
expect(`${SUN} the sun core`, patch(img(SUN), 0, 0), srgb8(multiplyRGB(multiplyRGB(PAPER, PLATE.yellow), PLATE.pink)), 5);
expect(`${SUN} paper around the sun`, patch(img(SUN), 0, 240), srgb8(PAPER), 5);
if (problems.length) {
  console.error(`build check FAILED\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('build check OK');

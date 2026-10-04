// The drop2 1.1 seam (SEAM → SEAM + 1: the break's last frame → drop 2's pop) for the v2 interlude (break-sheet2 §7.3, the final
// acceptance). Replaces v04's check-pop (its post / cord checks read v04's peg, gone in v2: pegAt is null; the old file is kept in the
// break integrator's scratch, bid2/integ/backup/scripts_check-pop.mjs). Written by the sling / fake-drop builder, installed by the break
// integrator.
//   1. ω (pure): his ω on screen moves ≤ 150 px from the break's last frame (breakLaunch.ts omegaOnScreen) to drop2 1.1 (drop2Slash.ts
//      omegaScreen).
//   2. The black spot (pure): drop 2's hole opens about the break's black spot — the film point it centres on (filmAt(SEAM).anchor,
//      through filmPoint / project) is seen on the spot's centre (apex) ±2 px, and that is his ω's ink centre (omegaInkOnScreen) ±2 px.
//   3. The band line (rendered, final, energy off): the straight ink line at y 540 (bandCord(SEAM)) — where the break's last frame shows
//      it between his glyphs and the links (a thin line darker than the pixels 9 px above and below) — still shows as a line on drop2 1.1
//      at ≥ 70 % of those points, or has become blade C1 (born from it: behind its head).
//   4. The fork (rendered): the points of its two prongs the break's last frame shows (warm yellow / cream, not violet) are still warm on
//      drop2 1.1 at ≥ 75 % (drop 2 springs the prongs apart and drops them from 1.1 + 1).
// Run from the repository root (stills and sheets go to output/qa/check-pop/):
//   node scripts/check-pop.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const KXDIR = path.join(here, '..');
const load = (p) => import(pathToFileURL(path.join(KXDIR, p)).href);
const { decodePng } = await load('scripts/lib/png.mjs');
const { renderStillsTo } = await load('scripts/lib/remotion.mjs');
const { BREAK_START } = await load('src/score/break.ts');
const { partStart } = await load('src/score/film.ts');
const { bandCord, forkAt, launchCam, omegaInkOnScreen, omegaOnScreen } = await load('src/shots/breakLaunch.ts');
const { filmAt, filmPoint, project } = await load('src/shots/breakFilm.ts');
const { HERO_ADVANCE, toScreen } = await load('src/shots/breakShared.ts');
const SL = await load('src/shots/drop2Slash.ts');

const SEAM = partStart('drop2') - 1;
const OUT = path.join(KXDIR, 'output', 'qa', 'check-pop');
const props = { quality: 'final', energy: false };
const problems = [];
const report = (ok, line) => (ok ? console.log(`  ok   ${line}`) : (console.log(`  FAIL ${line}`), problems.push(line)));
const adv = (ch) => HERO_ADVANCE[ch] ?? (ch === ' ' ? 0.28 : 0.6);

// ——— 1. ω ———
{
  const a = omegaOnScreen(SEAM);
  const b = SL.omegaScreen(SEAM + 1, adv);
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  report(d <= 150, `ω (${a[0].toFixed(0)}, ${a[1].toFixed(0)}) on ${SEAM} → (${b[0].toFixed(0)}, ${b[1].toFixed(0)}) on ${SEAM + 1}: ${d.toFixed(1)} px (≤ 150)`);
}
// ——— 2. The black spot ———
{
  const s = filmAt(SEAM);
  const [hx, hy] = project(filmPoint(s.anchor[0], s.anchor[1], s));
  const dh = Math.hypot(hx - s.apex[0], hy - s.apex[1]);
  report(dh <= 2, `the hole's centre (film anchor, seen) (${hx.toFixed(1)}, ${hy.toFixed(1)}) on the black spot's (${s.apex[0].toFixed(1)}, ${s.apex[1].toFixed(1)}): ${dh.toFixed(2)} px (≤ 2)`);
  const ink = omegaInkOnScreen(SEAM);
  const di = Math.hypot(ink[0] - s.apex[0], ink[1] - s.apex[1]);
  report(di <= 2, `the black spot (${s.blackPx.toFixed(0)} px) round his ω's ink centre (${ink[0].toFixed(1)}, ${ink[1].toFixed(1)}): ${di.toFixed(2)} px (≤ 2)`);
}

// ——— 3–4. Rendered ———
const before = await renderStillsTo(path.join(OUT, 'break'), { comp: 'KX-Break', frames: [SEAM - BREAK_START], scale: 1, inputProps: props });
const after = await renderStillsTo(path.join(OUT, 'drop2'), { comp: 'KX-Drop2', frames: [0], scale: 1, inputProps: props });
const A = decodePng(fs.readFileSync(before.get(SEAM - BREAK_START)));
const B = decodePng(fs.readFileSync(after.get(0)));
const px = (im, x, y) => {
  const i = (Math.round(y) * im.width + Math.round(x)) * im.channels;
  return [im.data[i], im.data[i + 1], im.data[i + 2]];
};
const luma = (im, x, y) => {
  const [r, g, b] = px(im, x, y);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const cam = launchCam(SEAM);
const scr = (x, y) => toScreen(cam, x, y);
const inFrame = ([x, y]) => x >= 12 && x < 1908 && y >= 12 && y < 1068;

// The band line: a thin line darker than the pixels 9 px above and below it (within ±3 px of its line, drop 2's camera starts to unwind).
{
  const c = bandCord(SEAM);
  const lineAt = (im, [x, y], gap) => {
    for (let s = -3; s <= 3; s++) {
      const l = luma(im, x, y + s);
      if (l + gap < luma(im, x, y + s - 9) && l + gap < luma(im, x, y + s + 9)) return true;
    }
    return false;
  };
  const pts = [];
  for (let x = c.x0; x <= c.x1; x += 4) pts.push(scr(x, c.y0 + ((c.y1 - c.y0) * (x - c.x0)) / (c.x1 - c.x0)));
  const shown = pts.filter((p) => inFrame(p) && lineAt(A, p, 30));
  // Drop 2's first blade C1 is born from the line (sheet §7.3): where its head has already run (on drop2 1.1's last sub-frame, its seam a
  // white-hot edge with the new world above), the line has become the blade — continued, not lost.
  const head = SL.bladeHead(0, SEAM + 1.25);
  const bladed = ([x]) => x <= head;
  const kept = shown.filter((p) => bladed(p) || lineAt(B, p, 6));
  report(shown.length >= 0.1 * pts.length, `${SEAM}: the band line shows at ${shown.length} of ${pts.length} points on its line (≥ 10 %: the check sees it)`);
  const lost = shown.filter((p) => !bladed(p) && !lineAt(B, p, 6)).map((p) => Math.round(p[0]));
  console.log(`       blade C1's head on drop2 1.1: x ${head.toFixed(0)}; the line lost (droplets, the pop's burst) at x: ${lost.join(' ') || 'nowhere'}`);
  report(kept.length >= 0.7 * shown.length, `${SEAM} → ${SEAM + 1}: the band line is still a line at ${kept.length} of those ${shown.length} points (${((100 * kept.length) / Math.max(1, shown.length)).toFixed(0)} %, ≥ 70 %)`);
}

// The fork: the prongs' centre lines (inset 30 px from the tips' knots); warm = red − blue ≥ 20 (yellow / cream), violet is cool.
{
  const k = forkAt(SEAM);
  const warm = (im, p, m) => {
    const [r, , b] = px(im, ...p);
    return r - b >= m;
  };
  const pts = [];
  for (const T of [k.U, k.L]) {
    const len = Math.hypot(T[0] - k.crotch[0], T[1] - k.crotch[1]);
    for (let s = 0; s <= len - 60; s += 6) pts.push(scr(k.crotch[0] + ((T[0] - k.crotch[0]) * s) / len, k.crotch[1] + ((T[1] - k.crotch[1]) * s) / len));
  }
  const shown = pts.filter((p) => inFrame(p) && warm(A, p, 20));
  const kept = shown.filter((p) => warm(B, p, 8));
  report(shown.length >= 0.2 * pts.length, `${SEAM}: the fork's prongs show at ${shown.length} of ${pts.length} points (≥ 20 %: the check sees it)`);
  report(kept.length >= 0.75 * shown.length, `${SEAM} → ${SEAM + 1}: the prongs are still drawn at ${kept.length} of those ${shown.length} points (${((100 * kept.length) / Math.max(1, shown.length)).toFixed(0)} %, ≥ 75 %)`);
}

if (problems.length) {
  console.error(`drop 2 pop check (v2) FAILED (${problems.length})`);
  process.exit(1);
}
console.log('drop 2 pop check (v2) OK');

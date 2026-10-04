// Renders Drop 1's seams at final quality (camera energy off, like the
// continuity checks before it) on the film's map (src/score/film.ts) and checks:
//   riso's last frame ↔ cosmos 1.1: the burst opens on the build's last frame (away from the sun) —
//     judged only while riso and the cosmos are next to each other on the map; with a part between
//     them (the transition, 2 bars, on the 60-bar map) the cosmos opens on that part's last frame, so
//     the pair is reported, not judged (it no longer crashes reading a frame KX-Build does not have);
//   the transition's seams, riso → transition and transition → cosmos 1.1: measured and reported,
//     not judged, while the transition is a stub (src/scenes/transition.ts). Once it is built its
//     team judges them (scripts/check-seams.mjs --render --seams …, or here);
//   the cosmos's last frame → club 1.1: the bridge (the club sheet's E1) — the cosmos ends on one point
//     at the frame's centre, and the comic club prints it as his • eye on club 1.1. Club 1.1 is always
//     judged; the cosmos's side only once it is built through (while its last bars are a held tail,
//     they show its last built frame, frozen: reported);
//   the club's last frame → break 1.1 (partStart('break')): the club hands the cracked glass over to
//     the break, which owns it falling away from break 1.1 (KX-Drop1-Smash ends on the club's last
//     frame — its held tail's, the glass trembling — and break 1.1 is KX-Break's first frame): the
//     bright strokes (his face, the cracks) line up.
//   node scripts/check-drop1.mjs
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { BREAK_START } from '../src/score/break.ts';
import { BUILD_END, BUILD_START } from '../src/score/build.ts';
import { DROP1_START, SMASH } from '../src/score/drop1.ts';
import { partEnd, partStart, partTail } from '../src/score/film.ts';
import { TRANSITION_END, TRANSITION_START } from '../src/score/transition.ts';
import { decodePng } from './lib/png.mjs';
import { KX, renderStillsTo } from './lib/remotion.mjs';

const OUT = path.join(KX, 'output', 'qa', 'check-drop1');
/** Riso's last frame: what the burst opens on. */
const S12_LAST = BUILD_END - 1;
/** The hand-off: the cosmos's last frame and club 1.1 (v08's bridge A, a stub, holds the first between them). */
const BRIDGE = [partEnd('cosmos') - 1, partStart('club')];
const CHECKED = [DROP1_START, ...BRIDGE, SMASH - 1];
const props = { quality: 'final', energy: false };
const build = await renderStillsTo(path.join(OUT, 'build'), { comp: 'KX-Build', frames: [S12_LAST - BUILD_START], scale: 1, inputProps: props });
const transition = await renderStillsTo(path.join(OUT, 'transition'), { comp: 'KX-Transition', frames: [0, TRANSITION_END - 1 - TRANSITION_START], scale: 1, inputProps: props });
const files = await renderStillsTo(OUT, { comp: 'KX-Drop1-Smash', frames: CHECKED.map((f) => f - DROP1_START), scale: 1, inputProps: props });
const after = await renderStillsTo(path.join(OUT, 'break'), { comp: 'KX-Break', frames: [SMASH - BREAK_START], scale: 1, inputProps: props });
const img = (film) => {
  if (film === S12_LAST) return decodePng(fs.readFileSync(build.get(S12_LAST - BUILD_START)));
  if (film >= TRANSITION_START && film < TRANSITION_END) return decodePng(fs.readFileSync(transition.get(film - TRANSITION_START)));
  if (film === SMASH) return decodePng(fs.readFileSync(after.get(SMASH - BREAK_START)));
  return decodePng(fs.readFileSync(files.get(film - DROP1_START)));
};
const problems = [];
const report = (ok, line) => (ok ? console.log(line) : problems.push(line));

/** Mean difference of 8 × 8 block averages outside a circle of `r` px round the centre. */
const meanDiff = (a, b, r = 0) => {
  const k = 8;
  let s = 0;
  let n = 0;
  for (let by = 0; by + k <= a.height; by += k) {
    for (let bx = 0; bx + k <= a.width; bx += k) {
      if (Math.hypot(bx + k / 2 - a.width / 2, by + k / 2 - a.height / 2) < r) continue;
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
/** The brightness-weighted centre of the pixels brighter than `floor` within `box` px of the frame's centre, as an offset from the centre. */
const brightCentre = (im, box = 300, floor = 90) => {
  let sx = 0;
  let sy = 0;
  let sw = 0;
  for (let y = im.height / 2 - box; y < im.height / 2 + box; y++) {
    for (let x = im.width / 2 - box; x < im.width / 2 + box; x++) {
      const i = (y * im.width + x) * im.channels;
      const l = 0.2126 * im.data[i] + 0.7152 * im.data[i + 1] + 0.0722 * im.data[i + 2];
      if (l < floor) continue;
      sx += l * x;
      sy += l * y;
      sw += l;
    }
  }
  return sw === 0 ? null : [sx / sw - im.width / 2, sy / sw - im.height / 2];
};
/** Pixels at least `floor` bright in both frames over those bright in either. */
const brightOverlap = (a, b, floor = 170) => {
  let both = 0;
  let either = 0;
  for (let i = 0; i < a.data.length; i += a.channels) {
    const la = 0.2126 * a.data[i] + 0.7152 * a.data[i + 1] + 0.0722 * a.data[i + 2] >= floor;
    const lb = 0.2126 * b.data[i] + 0.7152 * b.data[i + 1] + 0.0722 * b.data[i + 2] >= floor;
    if (la && lb) both++;
    if (la || lb) either++;
  }
  return both / either;
};

// Away from the sun and the burst's first quarter frame (its shockwave reaches ~330 px by the end of cosmos 1.1's shutter).
const d = meanDiff(img(S12_LAST), img(DROP1_START), 360);
const adjacent = partEnd('riso') === partStart('cosmos');
const burstLine = `${S12_LAST} ↔ ${DROP1_START}, the burst opens on riso's last frame away from the sun: mean difference of 8 × 8 blocks ${d.toFixed(2)} / 255 (≤ 1)`;
if (adjacent) report(d <= 1, burstLine);
else console.log(`${burstLine} (reported, not judged: a part sits between riso and the cosmos)`);
// The transition's seams: reported while it is a stub.
for (const [a, b, what] of [
  [S12_LAST, TRANSITION_START, 'riso → transition'],
  [TRANSITION_END - 1, DROP1_START, 'transition → cosmos 1.1'],
]) {
  console.log(`${a} → ${b}, ${what}: mean difference of 8 × 8 blocks ${meanDiff(img(a), img(b)).toFixed(2)} / 255 (reported, not judged: the transition is a stub)`);
}
for (const f of BRIDGE) {
  const c = brightCentre(img(f));
  const line = `${f}: the bright point sits at the centre (offset ${c ? c.map((v) => v.toFixed(0)).join(', ') : 'none'} px, ≤ 40)`;
  if (f < partStart('club') && partTail('cosmos')) console.log(`${line} (reported, not judged: the cosmos's last bars are a held tail)`);
  else report(c !== null && Math.hypot(...c) <= 40, line);
}
const g = brightOverlap(img(SMASH - 1), img(SMASH));
report(g >= 0.5, `${SMASH - 1} → ${SMASH}, the club hands the glass to the break: the face and cracks line up (bright-stroke overlap ${g.toFixed(2)}, ≥ 0.5)`);
if (problems.length) {
  console.error(`drop 1 check FAILED\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('drop 1 check OK');

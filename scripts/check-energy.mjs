// Renders build frames with the camera energy on and off (draft quality, one
// sample: the rig at the frame itself) and checks that it reaches the picture:
// a hold frame is untouched, a downbeat brightens (a bump), a kick punches in
// about the centre (two frames after its onset).
//   node scripts/check-energy.mjs
import fs from 'node:fs';
import path from 'node:path';
import { BUILD_START } from '../src/score/build.ts';
import { partFrame } from '../src/score/film.ts';
import { decodePng } from './lib/png.mjs';
import { KX, renderStillsTo } from './lib/remotion.mjs';

/** A hold (swiss 1.4& + 2 frames), a downbeat (swiss 4.1) and a kick two frames after its onset (swiss 1.2 + 2). */
const AT = { hold: partFrame('swiss', 1, 3.5) + 2, downbeat: partFrame('swiss', 4), kick: partFrame('swiss', 1, 1) + 2 };
const frames = Object.values(AT).map((f) => f - BUILD_START);
const render = (energy) => renderStillsTo(path.join(KX, 'output', 'qa', `check-energy-${energy ? 'on' : 'off'}`), { comp: 'KX-Build', frames, scale: 1, inputProps: { quality: 'draft', energy } });
const on = await render(true);
const off = await render(false);
const img = (files, f) => decodePng(fs.readFileSync(files.get(f - BUILD_START)));
const mean = (im) => im.data.reduce((a, v) => a + v, 0) / im.data.length;
const diff = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.data.length; i++) s += Math.abs(a.data[i] - b.data[i]);
  return s / a.data.length;
};
const centre = (im) => {
  const out = [];
  for (let y = 530; y < 550; y++) for (let x = 950; x < 970; x++) out.push(im.data[(y * im.width + x) * im.channels]);
  return out.reduce((a, v) => a + v, 0) / out.length;
};
const problems = [];
const holdDiff = diff(img(on, AT.hold), img(off, AT.hold));
if (holdDiff > 0.01) problems.push(`hold frame ${AT.hold} differs by ${holdDiff.toFixed(3)} with the energy on`);
const lift = mean(img(on, AT.downbeat)) - mean(img(off, AT.downbeat));
if (lift < 2) problems.push(`downbeat ${AT.downbeat} is only ${lift.toFixed(1)} brighter`);
const kickDiff = diff(img(on, AT.kick), img(off, AT.kick));
if (kickDiff < 1) problems.push(`kick ${AT.kick} barely changes (${kickDiff.toFixed(2)})`);
if (Math.abs(centre(img(on, AT.kick)) - centre(img(off, AT.kick))) > 3) problems.push(`kick ${AT.kick} moved the centre: the punch must zoom about it`);
if (problems.length) {
  console.error(`energy check FAILED\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`energy check OK: hold ${holdDiff.toFixed(3)}, flash +${lift.toFixed(1)}, punch ${kickDiff.toFixed(2)}`);

// Prints the shot timeline and fails if a shot breaks the pacing rules of spec §3.
//   node scripts/check-pacing.mjs
import { checkPacing } from '../src/score/pacing.ts';
import { SHOTS, shotFrames } from '../src/score/shots.ts';
import { FPS } from '../src/score/tempo.ts';

for (const shot of SHOTS) {
  const { from, to } = shotFrames(shot);
  const bars = shot.fromBar === shot.toBar ? `${shot.fromBar}` : `${shot.fromBar}–${shot.toBar}`;
  console.log(
    `${shot.id}  bar ${bars.padEnd(6)} ${(from / FPS).toFixed(1).padStart(5)}–${(to / FPS).toFixed(1).padEnd(5)}s ` +
      `${String(to - from).padStart(4)} f  ${shot.world.padEnd(9)} ${shot.space.padEnd(5)} → ${shot.exit}`,
  );
}
const issues = checkPacing(SHOTS);
if (issues.length) {
  for (const i of issues) console.error(`PACING  ${i.shot}: ${i.problem}`);
  process.exit(1);
}
console.log(`\n${SHOTS.length} shots, pacing OK`);

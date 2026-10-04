// S31V VOXEL, drop2 13.1–14.1 − 1 (3D) (builder A · ARCADE+VOXEL; build sheet notes/bid2/drop2-sheet2.md §3 "drop2 13", §4.10): the
// camera tilts and the arcade stands up as voxels; the well, Defender's garbage, his face in the stack, the four-line clear past the lens,
// the morph into Memphis solids. The arcade and the well are one picture whose camera moves (the tilt is continuous), so one renderer
// draws both: Drop2Arcade (src/scenes/drop2Arcade.ts; the pure shot src/shots/drop2ArcadeVoxel.ts, tests/drop2Arcade.test.ts). This class
// keeps the dispatcher's name and no-argument constructor for the 'voxel' rows (src/scenes/drop2.ts needs no edit).
import { Drop2Arcade } from './drop2Arcade.ts';

export class Drop2Voxel extends Drop2Arcade {}

// Shot and section tables, copied from spec §7. Each row is written in its part's own bars (src/score/film.ts: 1-based inside the
// part); the exported `fromBar` / `toBar` are film bars (1-based, toBar inclusive), derived from the map, so inserting bars moves them.
import { type PartId, partBar, partBars } from './film.ts';
import { FRAMES_PER_BAR, TOTAL_FRAMES, barFrame } from './tempo.ts';

export type World = 'terminal' | 'swiss' | 'riso' | 'pop' | 'brutal' | 'led' | 'blend';
export type Space = '2d' | '2.5d' | '3d';
/** How a shot hands over to the next one. T1–T7 are the section transitions of spec §6. */
export type Exit = 'cut' | 'match' | 'continuous' | 'whip' | 'stutter' | 'punch' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'end';

export type Shot = { id: string; fromBar: number; toBar: number; world: World; space: Space; exit: Exit };

/** A shot from bar `from` to bar `to` (inclusive) of `part`, in the part's own bars. */
const s = (id: string, part: PartId, from: number, to: number, world: World, space: Space, exit: Exit): Shot => ({ id, fromBar: partBar(part, from), toBar: partBar(part, to), world, space, exit });

export const SHOTS: readonly Shot[] = [
  // Bars 1–14 (60-bar map; build sheet notes/b114/sheet.md): the RAIN bar S02R (intro 2) tilts up off the log and cranes down onto
  // the highway; the SCAN bar S07B (swiss 4) irises into the antivirus's POV over the glass and hard-cuts back on 4.3.
  s('S01', 'intro', 1, 1, 'terminal', '2d', 'continuous'),
  s('S02R', 'intro', 2, 2, 'terminal', '3d', 'continuous'),
  s('S02', 'intro', 3, 3, 'terminal', '2.5d', 'whip'),
  s('S03', 'intro', 4, 4, 'terminal', '2d', 'continuous'),
  s('S04', 'intro', 5, 5, 'terminal', '2d', 'T1'),
  s('S05', 'swiss', 1, 1, 'swiss', '2d', 'continuous'),
  s('S06', 'swiss', 2, 2, 'swiss', '2d', 'match'),
  s('S07', 'swiss', 3, 3, 'swiss', '3d', 'continuous'),
  s('S07B', 'swiss', 4, 4, 'swiss', '3d', 'continuous'),
  s('S08', 'swiss', 5, 5, 'swiss', '2d', 'T2'),
  s('S09', 'riso', 1, 1, 'riso', '2d', 'cut'),
  s('S10', 'riso', 2, 2, 'riso', '2.5d', 'punch'),
  s('S11', 'riso', 3, 3, 'riso', '2d', 'cut'),
  s('S12', 'riso', 4, 4, 'riso', '2d', 'T3'),
  // The transition (bars 13–14 on the 58-bar map): one shot until it is built (notes/cosmos3/final.md cuts it).
  s('X01', 'transition', 1, 2, 'riso', '2d', 'cut'),
  s('S13', 'cosmos', 1, 1, 'pop', '3d', 'continuous'),
  s('S14', 'cosmos', 2, 2, 'pop', '2.5d', 'match'),
  s('S15', 'cosmos', 3, 3, 'pop', '2d', 'cut'),
  s('S16', 'cosmos', 4, 4, 'pop', '2d', 'stutter'),
  // Cosmos 5–6, built (notes/bcos/sheet.md §2, §5; they replace the hold H01): S16W the lightning web (3D), which twists into the
  // lensed disc on cs 6.1 (E18, continuous), and S16H the event horizon (2.5D: a real tilted disc + screen-space lensing), crushed by the
  // approved stutter to one amber point, his eye, on club 1.1 (E20). S13–S16 are still v04's rows (the sheet's §12.2 rewrites them).
  // A held tail (src/score/film.ts partTail) is a shot of its own (H01 held cosmos 5–6, H10 the outro, until they were built): the part's
  // last built frame frozen, flat, handing over to the next part as the shot it holds does. No part holds today.
  s('S16W', 'cosmos', 5, 5, 'pop', '3d', 'continuous'),
  s('S16H', 'cosmos', 6, 6, 'pop', '2.5d', 'stutter'),
  // Bridge A (v08, output/qa/v08/MAP-CONTRACT.md; src/score/bridgeA.ts): the bar between the event horizon's point and the comic club's
  // first dot, built — the breath that prints the club round his eye: the camera on the point, pushing in from the cosmos's scale to the
  // club's while the splash's own world (the face's plates, the page, the Ben-Day burst) prints a layer a beat, landing continuously on
  // C1's burst (the same face, the same lattice, at the same zoom).
  s('X02', 'bridgeA', 1, 1, 'pop', '2d', 'continuous'),
  // The comic club INK (notes/b58/club-sheet.md §2, §4; its own edit is src/score/club.ts INK_SHOTS, K1–K8): C1 the splash, whose
  // leap trails into C2's page (continuous); C2's dive through the cat's record lands on C3 (continuous); C3's record match-cuts to the
  // cocktail on club 4.1 (E6); C4's lens inset match-cuts on his face into SPLASH! on 5.1 (E10); C5's throw pulls back into the receding
  // page of C6, the 2.5D page plane he flies out of into the v04 glass on 6.4 (T4).
  s('C1', 'club', 1, 1, 'pop', '2d', 'continuous'),
  s('C2', 'club', 2, 2, 'pop', '2d', 'continuous'),
  s('C3', 'club', 3, 3, 'pop', '2.5d', 'match'),
  s('C4', 'club', 4, 4, 'pop', '2d', 'match'),
  s('C5', 'club', 5, 5, 'pop', '2d', 'continuous'),
  s('C6', 'club', 6, 6, 'pop', '2.5d', 'T4'),
  // The break, THE INTERLUDE (build sheet notes/bid2/break-sheet2.md; v04's notes/break/break-sheet.md): one neo-brutal world.
  // S21's real-3D glass is S20's T4 moment, so S21 counts as 2.5D (3D panes falling into a flat pool) and hands over seamlessly on
  // break 2.1; S23's card flip is 2.5D; S24 ends in the colour-stack restart wipe (the T5 slot); S25 match-cuts (C6, the selection carried
  // across) into S26G, the graph-editor rollercoaster (new), which whips (C7) into S26S, the slingshot (v04's bar 6, carried over one bar
  // later), which hard-cuts to the reverse angle (C8): S26, the fake drop, the break's one 3D shot (the soap film drop 2 pops: T6).
  s('S21', 'break', 1, 1, 'brutal', '2.5d', 'continuous'),
  s('S22', 'break', 2, 2, 'brutal', '2d', 'continuous'),
  s('S23', 'break', 3, 3, 'brutal', '2.5d', 'continuous'),
  s('S24', 'break', 4, 4, 'brutal', '2d', 'T5'),
  s('S25', 'break', 5, 5, 'brutal', '2d', 'match'),
  s('S26G', 'break', 6, 6, 'brutal', '2.5d', 'whip'),
  s('S26S', 'break', 7, 7, 'brutal', '2.5d', 'cut'),
  s('S26', 'break', 8, 8, 'brutal', '3d', 'T6'),
  // Drop 2 (build sheet notes/bid2/drop2-sheet2.md §2.3): act 1 keeps the approved S27–S31 — S27 slices worlds into his face after
  // E6's pop, S28's cube (2.5D) whips onto S29 (3D, raymarched in characters), S30's highway of the song's spectrogram (2.5D) opens to two
  // bars (the crane, then the built game), S31 surfs to the wrap — and the wrap's whip-pan lands in S31K, Defender's kernel (2.5D). S31S is
  // the switch, Defender v2.0's POV (2.5D), burst-cut into act 2's five layers: S31U the woodblock wave (2.5D), S31E the arcade, S31V the
  // voxel well (3D), S31M Memphis (2.5D), S31P the pictograms, S31X the mirror trap, which whips into the kept S32 (the reel, the stuck
  // bar, the crash); S32B is the bullet time (3D), whose drain hands over through T7. The ending is flat.
  s('S27', 'drop2', 1, 1, 'blend', '2d', 'continuous'),
  s('S28', 'drop2', 2, 2, 'blend', '2.5d', 'whip'),
  s('S29', 'drop2', 3, 4, 'blend', '3d', 'match'),
  s('S30', 'drop2', 5, 6, 'swiss', '2.5d', 'whip'),
  s('S31', 'drop2', 7, 7, 'terminal', '2d', 'whip'),
  // S31K → S31S (§5 #10): the install wipe ends in the kernel's ring → v2.0's reticle on 9.1 (shared centre, Ø 900), a hard match in
  // SEGMENT_CUTS, judged on the strokes' overlap.
  s('S31K', 'drop2', 8, 8, 'terminal', '2.5d', 'match'),
  s('S31S', 'drop2', 9, 9, 'blend', '2.5d', 'cut'),
  s('S31U', 'drop2', 10, 11, 'blend', '2.5d', 'continuous'),
  s('S31E', 'drop2', 12, 12, 'blend', '2d', 'continuous'),
  s('S31V', 'drop2', 13, 13, 'blend', '3d', 'continuous'),
  // S31M → S31P (§5 #18): the crane ends in the grid snap on 15.1, a deliberate jump of the whole frame; only his face holds the centre
  // column (≈ 45 px), so the seam is reported, not judged.
  s('S31M', 'drop2', 14, 14, 'blend', '2.5d', 'punch'),
  s('S31P', 'drop2', 15, 15, 'blend', '2d', 'continuous'),
  s('S31X', 'drop2', 16, 17, 'blend', '2d', 'whip'),
  // S32 → S32B: the bullet-time orbit really starts on 19.4& (§5 #30, local 1812 = partFrame('drop2', 19, 3.5)), which a row in whole bars
  // cannot hold, so S32B starts on 20 and 20.1 is the first heartbeat's punch inside the orbit (reported). The real seam, THE FRAME → bullet
  // time, is judged with `check-seams --render --seams <that frame>` (film 5364 on the 63-bar map, 5268 on the 61-bar one; the finale measured change 0.97).
  s('S32', 'drop2', 18, 19, 'blend', '2d', 'punch'),
  s('S32B', 'drop2', 20, 20, 'blend', '3d', 'T7'),
  // Bridge B (v08, src/score/bridgeB.ts): THE CRASH TAKES TIME. The bullet time's tape stop lands front-on on its downbeat (continuous: the
  // same frozen field); the picture comes apart a stage a beat in the terminal's field and ends on H5, out of which the blue screen bursts
  // on outro 1.1, decoding in place (continuous).
  s('X03', 'bridgeB', 1, 1, 'terminal', '2d', 'continuous'),
  s('S33', 'outro', 1, 1, 'terminal', '2d', 'continuous'),
  s('S34', 'outro', 2, 2, 'terminal', '2d', 'continuous'), // E2 MONITOR: the flatline curls into the ring, irises to the dot
  s('S35', 'outro', 3, 3, 'terminal', '2d', 'continuous'), // E3 IRIS: pried open, the wink, ↑ ↑, friends 1 → 8; the burst carries on
  s('S36', 'outro', 4, 4, 'terminal', '2d', 'continuous'), // E4 COMPANY: the burst into the stage, the wall, the eight calls on the 8ths, the walk-ons
  s('S37', 'outro', 5, 5, 'terminal', '2d', 'end'), // E5 BOWS → CURSOR (U5 / U6, outro 4 → 5 bars): cat, guest + the drop, the hero; the power-down push into █; S01's cursor
];

export type SectionId = 'intro' | 'build' | 'transition' | 'drop1' | 'break' | 'drop2' | 'bridgeB' | 'outro';
export type Section = { id: SectionId; fromBar: number; toBar: number; composition: string };

/**
 * The parts each section is made of, in film order (src/score/film.ts FILM): every part in exactly one section. v08: bridge A sits inside
 * drop 1 (a section spans its parts' bars, so it cannot sit between the cosmos and the club on its own); bridge B is a section of its own
 * (KX-BridgeB), so KX-Drop2 and KX-Outro keep their lengths and frame 0.
 */
export const SECTION_PARTS: Readonly<Record<SectionId, readonly PartId[]>> = {
  intro: ['intro'],
  build: ['swiss', 'riso'],
  // eslint-disable-next-line @remotion/non-pure-animation -- the film part 'transition', not a CSS transition
  transition: ['transition'],
  drop1: ['cosmos', 'bridgeA', 'club'],
  break: ['break'],
  drop2: ['drop2'],
  bridgeB: ['bridgeB'],
  outro: ['outro'],
};

/** A section's film bars: from its first part's first bar to its last part's last bar. */
const section = (id: SectionId, composition: string): Section => {
  const parts = SECTION_PARTS[id];
  const last = partBars(parts[parts.length - 1]);
  return { id, fromBar: partBar(parts[0], 1), toBar: last[last.length - 1], composition };
};

export const SECTIONS: readonly Section[] = [
  section('intro', 'KX-Intro'),
  section('build', 'KX-Build'),
  section('transition', 'KX-Transition'),
  section('drop1', 'KX-Drop1'),
  section('break', 'KX-Break'),
  section('drop2', 'KX-Drop2'),
  section('bridgeB', 'KX-BridgeB'),
  section('outro', 'KX-Outro'),
];

/** A part of a section of several parts on its own (drop 1 = the cosmos + bridge A + the club), so its builder can render and cut just that part. */
export type PartComposition = { part: PartId; fromBar: number; toBar: number; composition: string };
const alone = (part: PartId, composition: string): PartComposition => {
  const bars = partBars(part);
  return { part, fromBar: bars[0], toBar: bars[bars.length - 1], composition };
};
export const PART_COMPOSITIONS: readonly PartComposition[] = [alone('cosmos', 'KX-Cosmos'), alone('bridgeA', 'KX-BridgeA'), alone('club', 'KX-Club')];

/** Frame range of a shot: `from` inclusive, `to` exclusive. */
export const shotFrames = (shot: Shot): { from: number; to: number } => ({ from: barFrame(shot.fromBar), to: barFrame(shot.toBar + 1) });

/** The shot on screen at `frame`. Frames outside the film clamp to the first or last shot. */
export const shotAtFrame = (frame: number): Shot => {
  const f = Math.min(Math.max(frame, 0), TOTAL_FRAMES - 1);
  const bar = Math.floor(f / FRAMES_PER_BAR) + 1;
  const found = SHOTS.find((shot) => bar >= shot.fromBar && bar <= shot.toBar);
  if (!found) throw new Error(`no shot covers bar ${bar}`);
  return found;
};

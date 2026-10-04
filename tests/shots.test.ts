import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FILM, TAILS, TOTAL_BARS, TOTAL_FRAMES, partBar, partBars, partFrame } from '../src/score/film.ts';
import { checkPacing } from '../src/score/pacing.ts';
import { SECTION_PARTS, SECTIONS, SHOTS, shotAtFrame, shotFrames, type Shot } from '../src/score/shots.ts';

test('the shot table has 57 contiguous shots that pass the pacing rules: S01–S16 and S21–S37 (the ending built through: S35 the iris, S36 the curtain call, S37 the bows → cursor), the RAIN and SCAN bars’ S02R and S07B, the transition’s X01, the cosmos’s S16W and S16H (its bars 5–6, built: they replace the hold H01), the comic club’s C1–C6, the interlude’s S26G and S26S, drop 2’s new S31K–S31X and S32B, and v08’s bridges X02 and X03 (a bar each)', () => {
  assert.equal(SHOTS.length, 57);
  assert.deepEqual(checkPacing(SHOTS), []);
  assert.equal(new Set(SHOTS.map((s) => s.id)).size, 57);
  assert.deepEqual(SHOTS.filter((s) => s.fromBar >= partBar('cosmos') && s.toBar < partBar('bridgeA')).map((s) => [s.id, s.fromBar, s.toBar]), [['S13', 17, 17], ['S14', 18, 18], ['S15', 19, 19], ['S16', 20, 20], ['S16W', 21, 21], ['S16H', 22, 22]], 'the cosmos, a shot a bar (S13–S16 still v04’s rows: the cosmos sheet §12.2)');
  assert.deepEqual(SHOTS.filter((s) => s.fromBar >= partBar('outro')).map((s) => [s.id, s.fromBar, s.toBar, s.exit]), [['S33', 59, 59, 'continuous'], ['S34', 60, 60, 'continuous'], ['S35', 61, 61, 'continuous'], ['S36', 62, 62, 'continuous'], ['S37', 63, 63, 'end']], 'the ending, a shot a bar, one continuous move (U5: the curtain call outro 4, the bows → cursor outro 5)');
  assert.deepEqual(SHOTS.filter((s) => s.id.startsWith('C')).map((s) => [s.id, s.fromBar, s.toBar]), [1, 2, 3, 4, 5, 6].map((b) => [`C${b}`, partBar('club', b), partBar('club', b)]), 'the comic club INK, a shot a bar (its own edit inside: src/score/club.ts INK_SHOTS)');
  assert.deepEqual(SHOTS.slice(0, 10).map((s) => [s.id, s.fromBar]), [['S01', 1], ['S02R', 2], ['S02', 3], ['S03', 4], ['S04', 5], ['S05', 6], ['S06', 7], ['S07', 8], ['S07B', 9], ['S08', 10]], 'bars 1–14: the RAIN bar and the SCAN bar inserted');
  assert.deepEqual(
    SHOTS.filter((s) => s.id.startsWith('X')).map((s) => [s.id, s.fromBar, s.toBar]),
    [['X01', partBar('transition', 1), partBar('transition', 2)], ['X02', partBar('bridgeA'), partBar('bridgeA')], ['X03', partBar('bridgeB'), partBar('bridgeB')]],
    'the transition, and the v08 bridges (bars 23 and 58)',
  );
  assert.deepEqual([SHOTS.find((s) => s.id === 'X02')!.fromBar, SHOTS.find((s) => s.id === 'X03')!.fromBar], [23, 58]);
});

test('every held tail is held by hold shots (H…) and nothing else: flat, the held part’s world, handing over as the shot they hold does', () => {
  const held = SHOTS.filter((s) => s.id.startsWith('H'));
  const inTail = (bar: number) => TAILS.some((t) => bar >= Math.floor(t.from / 96) + 1 && bar <= t.to / 96);
  for (const s of SHOTS) for (let b = s.fromBar; b <= s.toBar; b++) assert.equal(inTail(b), s.id.startsWith('H'), `${s.id} bar ${b}`);
  for (const h of held) {
    assert.equal(h.space, '2d', h.id);
    const before = SHOTS[SHOTS.indexOf(h) - 1];
    assert.equal(h.world, before.world, `${h.id} holds ${before.id}'s world`);
  }
  assert.equal(held.length, TAILS.length, 'one hold shot per held tail');
  assert.equal(held.length, 0, 'none today: the cosmos (H01) and the outro (H10) are built through');
});

test('only the five hero moments are 3D; the rest stays flat or 2.5D (spec §3, revision 4)', () => {
  // The RAIN bar (S02R, its walls of rain a real 3D world) and the SCAN bar (S07B, the glass still on screen) join the glass's 3D.
  // v04's 3D throw at the glass (S20) left with v04's club: the comic club throws him out of a 2.5D page (C6) into the flat v04 glass.
  // The cosmos's lightning web (S16W, cs 5) is real 3D, its event horizon (S16H, cs 6) a tilted disc with screen-space lensing (2.5D).
  assert.deepEqual(SHOTS.filter((s) => s.space === '3d').map((s) => s.id), ['S02R', 'S07', 'S07B', 'S13', 'S16W', 'S26', 'S29', 'S31V', 'S32B']);
  // 2.5D per section (the break pins its rows S21–S26 in tests/break.test.ts).
  assert.deepEqual(SHOTS.filter((s) => s.space === '2.5d' && s.toBar < partBar('break')).map((s) => s.id), ['S02', 'S10', 'S14', 'S16H', 'C3', 'C6'], 'up to the break: as approved, the event horizon (S16H), and the comic club’s record (C3) and receding page (C6)');
  // Drop 2 (decision A2 of the drop 2 final, adopted by its build sheet): the voxel well and the bullet time join S29's Z-buffer as true 3D.
  assert.deepEqual(SHOTS.filter((s) => s.space === '3d' && s.fromBar >= partBar('drop2')).map((s) => s.id), ['S29', 'S31V', 'S32B'], 'drop 2 and the ending: the Z-buffer, the voxel well, the bullet time');
  assert.deepEqual(SHOTS.filter((s) => s.space === '2.5d' && s.fromBar >= partBar('drop2')).map((s) => s.id), ['S28', 'S30', 'S31K', 'S31S', 'S31U', 'S31M'], 'drop 2 and the ending: the cube, the highway, the kernel, the switch, the wave, Memphis');
});

test('sections cover the film without gaps', () => {
  let next = 1;
  for (const s of SECTIONS) {
    assert.equal(s.fromBar, next);
    next = s.toBar + 1;
  }
  assert.equal(next, TOTAL_BARS + 1);
});

test("every part of the film belongs to exactly one section, in film order, and a section spans its parts' bars", () => {
  assert.deepEqual(Object.keys(SECTION_PARTS), SECTIONS.map((s) => s.id));
  assert.deepEqual(Object.values(SECTION_PARTS).flat(), FILM.map((p) => p.id));
  for (const s of SECTIONS) {
    const bars = SECTION_PARTS[s.id].flatMap((p) => partBars(p));
    assert.deepEqual([s.fromBar, s.toBar], [bars[0], bars[bars.length - 1]], s.id);
  }
});

test('shotAtFrame finds shots and clamps out-of-range frames', () => {
  assert.equal(shotAtFrame(0).id, 'S01');
  assert.equal(shotAtFrame(-0.25).id, 'S01');
  assert.equal(shotAtFrame(partFrame('drop2', 3)).id, 'S29');
  assert.equal(shotAtFrame(partFrame('drop2', 4)).id, 'S29');
  assert.equal(shotAtFrame(partFrame('drop2', 5)).id, 'S30');
  assert.equal(shotAtFrame(TOTAL_FRAMES - 0.25).id, 'S37');
  assert.equal(shotAtFrame(TOTAL_FRAMES + 99999).id, 'S37');
  assert.equal(shotAtFrame(partFrame('outro', 4, 3.5)).id, 'S36');
  assert.equal(shotAtFrame(partFrame('outro', 2)).id, 'S34');
  assert.deepEqual(shotFrames(SHOTS.find((s) => s.id === 'S29')!), { from: partFrame('drop2', 3), to: partFrame('drop2', 5) });
});

test('pacing flags gaps, overlong shots and a short film', () => {
  const base: Shot = { id: 'A', fromBar: 1, toBar: 2, world: 'swiss', space: '2d', exit: 'cut' };
  const issues = checkPacing([base, { ...base, id: 'B', fromBar: 4, toBar: 6 }], 6);
  const text = issues.map((i) => `${i.shot}: ${i.problem}`).join('\n');
  assert.match(text, /B: starts at bar 4, expected 3/);
  assert.match(text, /B: 3 bars is longer than 2.5/);
  assert.deepEqual(checkPacing([base], 6).map((i) => i.shot), ['(end)']);
});

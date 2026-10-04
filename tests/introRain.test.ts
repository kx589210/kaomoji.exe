// The RAIN bar (intro 2, S02R) and the rain sky over the highway (intro 3): src/shots/introRain.ts with the intro's camera
// (build sheet notes/b114/sheet.md §3.2, W1; bars 1–14 design b112/final.md §4.1).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FaceCell } from '../src/actors/asciiFace.ts';
import { RAIN_FACES, RAIN_GLYPHS, RAIN_HUD, RAIN_INK, RAIN_WORLD, SIG_BYTES } from '../src/content/boot.ts';
import type { Pose } from '../src/engine/camera.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import { HIGHWAY_START, LOG_TICKS, RAIN, RAIN_HUD_FADE, RAIN_SKY_OUT, SCAN_HUD_CELLS, SCAN_HUD_TYPE, SCAN_RAIN, SIG_BELL, SIG_RAIN, ZERO_RAIN } from '../src/score/intro.ts';
import { INTRO_GLYPHS, buildIntroLayout, introCamera, introGlyphs } from '../src/shots/intro.ts';
import { DEFENDER_INK, RAIN_KEYS, SIG_KEYS, poseEuler, project, rainGlyphs, rainHudAt, rainLayout, scanZ, sigBytesAt } from '../src/shots/introRain.ts';
import { INK } from '../src/worlds/terminal.ts';

const face: FaceCell[] = [];
for (let row = 10; row < 28; row++) for (let col = 30; col < 146; col++) face.push({ col, row, ch: '#', lum: 0.73, part: col < 50 ? 0 : col < 70 ? 1 : col < 106 ? 2 : col < 126 ? 3 : 4 });
const IL = buildIntroLayout(face);
const cam = (f: number): Pose => introCamera(f, IL.eye);
const R = rainLayout(cam);
const rain = (f: number): Glyph[] => {
  const out: Glyph[] = [];
  const n = rainGlyphs(f, R, cam(f), out);
  return out.slice(0, n);
};
const isRed = (g: Glyph) => g.color.every((v, i) => Math.abs(v - DEFENDER_INK[i]) < 1e-9);
const SIG_WALL = RAIN_WORLD.walls[RAIN_WORLD.sig.wall - 1];
const sigGlyphs = (gs: Glyph[]) => gs.filter((g) => SIG_KEYS.includes(g.ch) && g.x === R.sig.x && g.z === -SIG_WALL);
const frames = (a: number, b: number, step: number) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
const luma = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

test('his signature column: one amber byte a sixteenth from intro 2.1&, complete on 162 (0x00A2), never flickering', () => {
  assert.equal(sigBytesAt(SIG_RAIN[0] - 1), 0);
  assert.equal(sigBytesAt(161), 9);
  assert.equal(sigBytesAt(162), 10);
  assert.equal(SIG_BELL, 162);
  const at162 = sigGlyphs(rain(162));
  assert.deepEqual(
    [...at162].sort((a, b) => b.y - a.y).map((g) => g.ch),
    SIG_BYTES,
    'top-down: E2 80 A2 20 CF 89 20 E2 80 A2',
  );
  // Never flickers: the bytes it shows are the same on every sub-frame between two bytes.
  for (const f of frames(SIG_RAIN[0], 167, 0.5)) {
    const shown = sigGlyphs(rain(f));
    assert.equal(shown.length, sigBytesAt(f), `frame ${f}`);
    shown.forEach((g) => assert.ok(g.color[0] > g.color[2] * 3, `amber at ${f}`));
  }
});

test('the signature column sits on wall 2 in the right third of the frame while it prints (screen x +240 ± 40 over 108–167)', () => {
  for (const f of frames(SIG_RAIN[0], 168, 3)) {
    const p = project(cam(f), R.sig.x, SIG_WALL, cam(f).position[2]);
    assert.ok(p && Math.abs(p.sx - RAIN_WORLD.sig.screenX) <= 40, `frame ${f}: x ${p?.sx.toFixed(0)}`);
  }
});

test('THE SCAN: the red plane sweeps the walls top to bottom over 144–156 and tags the glyphs it crosses — never his amber column', () => {
  assert.equal(scanZ(SCAN_RAIN.from), 2600);
  assert.equal(scanZ(SCAN_RAIN.to), 0);
  assert.equal(scanZ(SCAN_RAIN.from - 1), null);
  let tags = 0;
  for (const f of frames(SCAN_RAIN.from, SCAN_RAIN.to + 4, 0.25)) {
    const gs = rain(f);
    tags += gs.filter(isRed).length;
    for (const g of sigGlyphs(gs)) assert.ok(!isRed(g), `his byte ${g.ch} tagged at ${f}`);
  }
  assert.ok(tags > 1000, `the scan tags the rain: ${tags}`);
  for (const f of [SCAN_RAIN.from - 1, SCAN_RAIN.to + 4]) assert.equal(rain(f).filter(isRed).length, 0, `no tag at ${f}`);
});

test('exactly 8 face columns, one rain face each, every face once, drawn whole and turned 90° clockwise, never next to his column', () => {
  assert.equal(R.faces.length, 8);
  assert.deepEqual(R.faces.map((F) => F.face), [...RAIN_FACES]);
  assert.equal(new Set(RAIN_FACES).size, 8);
  const at = rain(150).filter((g) => RAIN_FACES.includes(g.ch));
  assert.equal(at.length, 8);
  at.forEach((g) => assert.equal(g.rot, -Math.PI / 2));
  for (const F of R.faces) if (F.wall === RAIN_WORLD.sig.wall - 1) assert.ok(Math.abs(F.x - R.sig.x) > 2 * RAIN_WORLD.cols[1], `${F.face} at ${F.x}`);
  // On screen too: no face falls within 150 px of his column while both are in the frame, and each face shows in the frame.
  const seen = new Set<string>();
  for (const f of frames(SIG_RAIN[0], 168, 1)) {
    const c = cam(f);
    const sig = project(c, R.sig.x, SIG_WALL, c.position[2])!;
    for (const g of rain(f).filter((x) => RAIN_FACES.includes(x.ch))) {
      const p = project(c, g.x, -g.z!, g.y);
      if (!p || Math.abs(p.sx) > 960 || Math.abs(p.sy) > 540) continue;
      seen.add(g.ch);
      assert.ok(Math.abs(p.sx - sig.sx) >= 150, `${g.ch} beside his column at ${f}: ${p.sx.toFixed(0)} vs ${sig.sx.toFixed(0)}`);
    }
  }
  assert.equal(seen.size, 8, `faces in the frame: ${[...seen].join(' ')}`);
  for (const k of RAIN_KEYS) assert.ok(INTRO_GLYPHS.includes(k), `${k} is an atlas key`);
});

test('no • ω ･ in the two columns either side of his column; the rain is kaomoji parts only', () => {
  const flank = R.columns.filter((c) => c.role === 1);
  assert.equal(flank.length, 2);
  for (const f of frames(RAIN.from, RAIN.to, 1)) {
    for (const g of rain(f)) {
      if (flank.some((c) => c.x === g.x && -g.z! === RAIN_WORLD.walls[c.wall])) assert.ok(!'•ω･'.includes(g.ch), `${g.ch} beside his column at ${f}`);
      if (!SIG_KEYS.includes(g.ch) && !RAIN_FACES.includes(g.ch)) assert.ok(RAIN_GLYPHS.includes(g.ch) || '✧°´'.includes(g.ch), `${g.ch} at ${f}`);
    }
  }
});

test('the log is frozen through the RAIN bar: no line, scroll, cursor blink or log tick in 96–191', () => {
  const page = (f: number) => {
    const out: Glyph[] = [];
    return out.slice(0, introGlyphs(f, IL, out)).map((g) => [g.ch, g.x, g.y, g.size, ...g.color, g.alpha ?? 1].join());
  };
  const held = page(RAIN.from);
  for (const f of frames(RAIN.from, RAIN.to, 0.5)) assert.deepEqual(page(f), held, `the page moved at ${f}`);
  assert.ok(!held.some((g) => g.startsWith('█,')), 'no cursor on the frozen page');
  assert.equal(LOG_TICKS.filter((f) => f >= RAIN.from && f < RAIN.to).length, 0);
});

test('the readout: [SCAN] kaomoji.exe types on 144–149, its 8 cells fill on the 32nds, `· 0 threats ✓` a beat late (✓ red), gone by 190', () => {
  assert.equal(rainHudAt(SCAN_HUD_TYPE.from - 1), null);
  const text = (f: number) => rainHudAt(f)!.runs.map((r) => r.text).join('');
  assert.equal(text(SCAN_HUD_TYPE.from).startsWith('[SCAN] k'), true);
  assert.equal(text(SCAN_HUD_TYPE.to - 1).startsWith(RAIN_HUD.tag), true);
  for (const [i, f] of SCAN_HUD_CELLS.entries()) assert.equal((text(f).match(/▓/g) ?? []).length, i + 1, `cell ${i + 1} on ${f}`);
  assert.ok(!text(ZERO_RAIN - 1).includes('threats'));
  const done = rainHudAt(ZERO_RAIN)!;
  assert.equal(done.runs.map((r) => r.text).join(''), `${RAIN_HUD.tag} ${'▓'.repeat(8)}${RAIN_HUD.verdict}`);
  assert.deepEqual(done.runs.filter((r) => r.ink === 'red').map((r) => r.text), ['[SCAN]', '✓']);
  assert.ok(done.bright > 1.9, 'the readout brightens ×2 on the verdict');
  assert.ok(rainHudAt(RAIN_HUD_FADE.from + 5)!.alpha < 1);
  assert.equal(rainHudAt(RAIN_HUD_FADE.to), null);
});

test('the tilt: S01 winds up 2° looking lower, then launches up to the horizon — 75 % by 99, settled by about 108 — on S01’s own spot', () => {
  const pitch = (f: number) => {
    const e = poseEuler(cam(f));
    return Math.abs(e.yaw) > 90 ? -180 - e.pitch : e.pitch; // looking back past straight down reads as pitch below −90
  };
  assert.ok(Math.abs(pitch(89) + 90) < 1e-6, 'square down before the wind-up');
  assert.ok(Math.abs(pitch(95.99) + 92) < 0.01, `wound up: ${pitch(95.99)}`);
  assert.ok(Math.abs(pitch(96) + 92) < 1e-6);
  assert.ok((pitch(99) + 92) / 92 >= 0.72, `75 % by 99: ${pitch(99)}`);
  for (const f of frames(108, 168, 2)) assert.ok(Math.abs(pitch(f)) < 0.5, `level at ${f}: ${pitch(f)}`);
  const at = (f: number) => cam(f).position;
  assert.ok(Math.hypot(at(96)[0] - at(95.999)[0], at(96)[1] - at(95.999)[1], at(96)[2] - at(95.999)[2]) < 0.1, 'held at S01’s place');
  assert.ok(Math.abs(cam(108).fov - 42) < 1e-6 && Math.abs(cam(96).fov - 20) < 1e-6, 'FOV 20 → 42');
});

test('the crane lands exactly on the highway on intro 3.1 (E2): the pose of 191.999 is the highway’s of 192', () => {
  const a = cam(HIGHWAY_START - 1e-3);
  const b = cam(HIGHWAY_START);
  assert.ok(Math.hypot(...a.position.map((v, i) => v - b.position[i])) < 0.5, 'within 0.5 px');
  const dir = (p: Pose) => {
    const v = p.target.map((t, i) => t - p.position[i]);
    const l = Math.hypot(...v);
    return v.map((x) => x / l);
  };
  const angle = (u: number[], v: number[]) => (Math.acos(Math.min(1, u.reduce((s, x, i) => s + x * v[i], 0))) * 180) / Math.PI;
  assert.ok(angle(dir(a), dir(b)) < 0.05, `view within 0.05°: ${angle(dir(a), dir(b))}`);
  const ea = poseEuler(a);
  const eb = poseEuler(b);
  assert.ok(Math.abs(ea.roll - eb.roll) < 0.05 && Math.abs(a.fov - b.fov) < 0.05, 'bank and FOV land too');
  // The descent lands firmly: from the cruise's height (1000+), still dropping as it touches the floor's height on 3.1 (the sub lands
  // it; the dome's launch takes the bounce); the backing flows into the highway's own move (its speed there within a few units a frame).
  assert.ok(cam(ZERO_RAIN).position[2] > 1000);
  for (const f of frames(ZERO_RAIN, HIGHWAY_START, 1)) assert.ok(cam(f + 1).position[2] < cam(f).position[2], `descending at ${f}`);
  const drop = (f: number) => cam(f - 0.5).position[2] - cam(f + 0.5).position[2];
  assert.ok(drop(HIGHWAY_START - 1) > 15, `still dropping on the landing: ${drop(HIGHWAY_START - 1).toFixed(1)} a frame`);
  const travel = (f: number) => Math.hypot(cam(f + 0.25).position[0] - cam(f - 0.25).position[0], cam(f + 0.25).position[1] - cam(f - 0.25).position[1]) * 2;
  assert.ok(Math.abs(travel(HIGHWAY_START - 0.3) - travel(HIGHWAY_START + 0.3)) < 6, `the travel flows on: ${travel(HIGHWAY_START - 0.3).toFixed(1)} → ${travel(HIGHWAY_START + 0.3).toFixed(1)}`);
});

test('walls 1–2 leave through the crane; walls 3–6 rain on as the highway’s sky at ≤ 45 % (heads) of the near rows, gone over the whip’s first sixteenth', () => {
  const near = (gs: Glyph[]) => gs.filter((g) => -g.z! < RAIN_WORLD.walls[2]);
  assert.equal(near(rain(HIGHWAY_START - 0.01)).filter((g) => (g.alpha ?? 1) > 0.01).length, 0);
  const cap = 0.45 * luma(INK.text) + 1e-9;
  for (const f of [204, 240, 270]) {
    const gs = rain(f);
    assert.ok(gs.length > 500, `the sky rains at ${f}: ${gs.length}`);
    assert.equal(near(gs).length, 0);
    for (const g of gs) assert.ok(luma(g.color) * (g.alpha ?? 1) <= cap, `${g.ch} at ${f}: ${(luma(g.color) * (g.alpha ?? 1)).toFixed(3)}`);
  }
  assert.equal(rain(RAIN_SKY_OUT.to).length, 0);
  assert.ok(RAIN_INK.skyHead <= 0.45 && RAIN_INK.skyTrail <= 0.2);
});

// E6, the soap film (break 6.3 to the break's end; drop 2 pops it on its downbeat): the pure module src/shots/breakFilm.ts, pinned to the build sheet
// (notes/break/break-sheet.md §4.12, §7.3). It must stay pure (drop 2 imports it read-only to draw the pop), so every property the
// picture relies on is tested here: when the film catches the light, how deep it bulges toward him, that the frame's edges hold it,
// that its deepest point is seen on his ω, where it thins to black, that its colours are soap colours, that it shimmers on the hats.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { WINDOW_TEXTS } from '../src/content/break.ts';
import type { RGB } from '../src/engine/color.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import * as BR from '../src/score/break.ts';
import { linear } from '../src/engine/color.ts';
import { FILM_FRAG } from '../src/scenes/breakLaunch.ts';
import {
  FILM,
  FILM_FRONT,
  blackMask,
  filmAt,
  filmDepth,
  filmEnv,
  filmGradient,
  filmHalo,
  filmLUT,
  filmOver,
  filmPoint,
  filmSeen,
  filmText,
  filmThickness,
  project,
  thinFilmRGB,
} from '../src/shots/breakFilm.ts';
import { heroChars, launchCam, launchSegment, launchTemporal, omegaInkOnScreen, omegaOnScreen } from '../src/shots/breakLaunch.ts';
import { HERO_ADVANCE, toScreen } from '../src/shots/breakShared.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

const near = (a: number, b: number, eps: number, msg: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);
const shutter = (F: number): number[] => temporalSamples(F, launchTemporal(F), launchSegment()).map((s) => s.frame);
const sat = (c: RGB): number => (Math.max(...c) - Math.min(...c)) / (Math.max(...c) + 1e-9);

test('breakFilm.ts is pure: no three, remotion or react — drop 2 imports it in plain Node too', () => {
  const src = fs.readFileSync(new URL('../src/shots/breakFilm.ts', import.meta.url), 'utf8');
  for (const m of ['three', 'remotion', 'react', 'postprocessing']) assert.ok(!new RegExp(`from '${m}`).test(src), `imports ${m}`);
});

test('the film catches the light after 26.3’s hit: its colour holds off through 2448–2450 (the hit frame is the band’s) and fades in over 2451–2459 (sine in-out), then stays', () => {
  near(filmAt(at(6, 3) - 0.1).amount, 0, 0, 'none before 26.3');
  for (const s of [...shutter(at(6, 3)), ...shutter(at(6, 3) + 1), ...shutter(at(6, 3) + 2)]) near(filmAt(s).amount, 0, 0, `none yet on ${s}`);
  near(filmAt(at(6, 3.5) - 1).amount, 1, 0, 'full from 2459');
  near(filmAt(at(6, 3.25) + 1).amount, 0.5, 1e-9, 'halfway (sine in-out)');
  let prev = -1;
  for (let f = at(6, 2.75) - 2; f < BR.BREAK_END; f += 0.5) {
    const a = filmAt(f).amount;
    assert.ok(a >= prev, `never fading (${f})`);
    prev = a;
  }
});

test('the screen catches the light: as the colour fades in, the studio’s reflection sweeps across it from the right (a light sweep), settling on 2459', () => {
  for (const f of [at(6, 3), at(6, 3) + 2, at(6, 3.125)]) assert.ok(filmAt(f).sweep >= 0.8, `the lights start off to the right (${f})`);
  near(filmAt(at(6, 3.5) - 1).sweep, 0, 1e-9, 'settled when the colour is full');
  near(filmAt(BR.BREAK_END - 1).sweep, 0, 0, 'and still');
  let prev = Infinity;
  for (let f = at(6, 3); f <= at(6, 3.5) - 1; f += 0.25) {
    assert.ok(filmAt(f).sweep <= prev, `it only moves left (${f})`);
    prev = filmAt(f).sweep;
  }
  // The key softbox's reflection (tangent x = −0.2 at rest) crosses the flat film's view (|x| ≤ 0.3) during the sweep.
  const key = (f: number) => filmEnv([-0.2 + filmAt(f).sweep, 0.1, 1], 0, filmAt(f).sweep);
  assert.ok(Math.min(...key(at(6, 3.25) + 1)) > 1, 'the key moves with the sweep');
});

test('it bulges toward him on 26.4 and 26.4e (0.10, then 0.18·FRONT, springing) and creeps 0.03·FRONT on each 32nd of the held breath: 0.30·FRONT on 2495', () => {
  near(filmAt(at(6, 4) - 0.1).depth, 0, 0, 'flat before 26.4');
  near(filmAt(at(6, 4.25) - 1).depth, 0.1 * FILM_FRONT, 0.01 * FILM_FRONT, 'about 0.10 FRONT after the first bulge');
  near(filmAt(at(6, 4.5) - 1).depth, 0.18 * FILM_FRONT, 0.006 * FILM_FRONT, 'about 0.18 FRONT before the held breath');
  near(filmAt(BR.BREAK_END - 1).depth, 0.3 * FILM_FRONT, 1e-6, '0.30 FRONT on 2495');
  near(filmAt(at(6, 4.125)).depth, 0.075 * FILM_FRONT, 0.012 * FILM_FRONT, 'a launch: three quarters of the step 3 frames in');
  assert.ok(Math.max(...[at(6, 4) + 2, at(6, 4.125), at(6, 4.25) - 2, at(6, 4.25) - 1].map((f) => filmAt(f).depth)) > 0.1 * FILM_FRONT, 'it overshoots: a soft membrane');
  // Held at its 2495 state for any later v04 instant; from break 8.1 the native launch's film answers (breakLaunchFake.test.ts), which drop 2 reads.
  assert.deepEqual(filmAt(BR.REVERSE - 1), filmAt(BR.BREAK_END - 1), 'held at its 2495 state for any later v04 instant');
});

test('the frame holds it: no displacement on any edge, the deepest point at the anchor, never toward us', () => {
  for (const f of [at(6, 4), at(6, 4.25) + 2, at(6, 4.75), BR.BREAK_END - 1]) {
    const s = filmAt(f);
    for (let t = 0; t <= 1; t += 0.05) {
      for (const [x, y] of [[1920 * t, 0], [1920 * t, 1080], [0, 1080 * t], [1920, 1080 * t]]) near(filmDepth(x, y, s), 0, 1e-9, `edge (${x}, ${y}) on ${f}`);
    }
    near(filmDepth(s.anchor[0], s.anchor[1], s), s.depth, 1e-6, `deepest at the anchor on ${f}`);
    for (let x = 10; x < 1920; x += 97) for (let y = 10; y < 1080; y += 61) assert.ok(filmDepth(x, y, s) >= 0 && filmDepth(x, y, s) <= s.depth + 1e-9);
  }
});

test('its deepest point is seen exactly on his ω’s ink centre (camera and punches included) as it bulges', () => {
  for (const f of [at(6, 4), at(6, 4) + 2, at(6, 4.25), at(6, 4.375), at(6, 4.5) + 2, at(6, 4.75), BR.BREAK_END - 1]) {
    const s = filmAt(f);
    const [sx, sy] = project(filmPoint(s.anchor[0], s.anchor[1], s, false));
    const [wx, wy] = omegaInkOnScreen(f);
    near(sx, wx, 0.01, `apex x on ${f}`);
    near(sy, wy, 0.01, `apex y on ${f}`);
    assert.deepEqual(s.apex.map((v) => +v.toFixed(6)), [wx, wy].map((v) => +v.toFixed(6)));
  }
  // R2-02: the ink centre, not the glyph's placement point (§7.3's (613.8, 573.0)): on the --final still of the break's last frame the ω's amber fill
  // spans x 468–757, y 497–737, so its centre is ≈ (612.5, 617).
  near(filmAt(BR.BREAK_END - 1).apex[0], 612.5, 5, 'apex x on the ω’s ink');
  near(filmAt(BR.BREAK_END - 1).apex[1], 617, 5, 'apex y on the ω’s ink');
  assert.ok(filmAt(BR.BREAK_END - 1).apex[1] - omegaOnScreen(BR.BREAK_END - 1)[1] > 35, 'below the placement point');
});

test('the gradient is the depth’s slope (analytic, used for the normals and the stretch)', () => {
  const s = filmAt(at(6, 4.75));
  for (const [x, y] of [[300, 200], [700, 500], [1200, 800], [1600, 300]]) {
    const h = 0.01;
    const [gx, gy] = filmGradient(x, y, s);
    near(gx, (filmDepth(x + h, y, s) - filmDepth(x - h, y, s)) / (2 * h), 1e-4, `∂x at (${x}, ${y})`);
    near(gy, (filmDepth(x, y + h, s) - filmDepth(x, y - h, s)) / (2 * h), 1e-4, `∂y at (${x}, ${y})`);
  }
});

/** Film points (a 6 px grid round the apex) with the screen distance at which each is seen from the apex. */
const aroundApex = (s: ReturnType<typeof filmAt>, reach: number): { x: number; y: number; dist: number }[] => {
  const out: { x: number; y: number; dist: number }[] = [];
  const [ax, ay] = s.anchor;
  for (let x = ax - reach; x <= ax + reach; x += 6) {
    for (let y = ay - reach; y <= ay + reach; y += 6) {
      const [sx, sy] = filmSeen(x, y, s);
      out.push({ x, y, dist: Math.hypot(sx - s.apex[0], sy - s.apex[1]) });
    }
  }
  return out;
};

test('the black film (R2-02): nothing before 26.4&, then a spot round on screen about his ω’s ink centre, a quarter wider on each 32nd of the held breath (2-frame snaps), 180 px on 2495 — black (< 30 nm) inside', () => {
  near(filmAt(at(6, 4.5) - 0.6).blackPx, 0, 0, 'none before the held breath');
  near(filmAt(at(6, 4.5) - 0.6).black, 0, 0, 'none before the held breath (film px)');
  near(filmAt(BR.BREAK_END - 1).blackPx, FILM.black.radius, 1e-9, 'its full radius on 2495');
  assert.ok(FILM.black.radius >= 175 && FILM.black.radius <= 190, `${FILM.black.radius} px: past the ω’s ink, inside his eyes (measured on 2495)`);
  BR.CREEP.forEach((c, i) => {
    near(filmAt(c + 2).blackPx, (FILM.black.radius * (i + 1)) / 4, 1e-9, `a quarter more on ${c} (+2)`);
    near(filmAt(c - 1).blackPx, (FILM.black.radius * i) / 4, 1e-9, `not before ${c}`);
    assert.ok(filmAt(c).blackPx >= (FILM.black.radius * (i + 0.85)) / 4, `on ${c}’s own frame (the arp’s note), not a frame late`);
    assert.ok(filmAt(c).depth - filmAt(c - 1).depth >= 0.75 * FILM.creep * FILM_FRONT, `the film creeps on ${c}’s own frame too`);
  });
  // One sharp instant per frame: the ring is a crisp line, so a snap is never smeared into a soft disc by the shutter.
  for (let F = at(6, 4.5) - 1; F <= BR.BREAK_END - 1; F++) for (const s of shutter(F)) near(filmAt(s).blackPx, filmAt(F).blackPx, 1e-9, `whole on ${F} (${s})`);
  // Drop 2 opens its hole from the spot in film px about the anchor: `black` is the same spot measured on the film at the apex.
  const s = filmAt(BR.BREAK_END - 1);
  near(s.black, (s.blackPx * (FILM_FRONT + s.depth)) / FILM_FRONT, 1e-9, 'film px = screen px through the bulge’s depth');
  for (const f of [at(6, 4.5) + 2, at(6, 4.75), BR.BREAK_END - 1]) {
    const t = filmAt(f);
    for (const p of aroundApex(t, 280)) {
      if (p.dist < t.blackPx - 2) {
        near(blackMask(p.x, p.y, t), 1, 1e-9, `black inside on ${f} (${p.dist.toFixed(1)} px)`);
        assert.ok(filmThickness(p.x, p.y, t) < 30, `under 30 nm inside on ${f}`);
      }
      if (p.dist > t.blackPx + 1) near(blackMask(p.x, p.y, t), 0, 1e-9, `film outside on ${f} (${p.dist.toFixed(1)} px)`);
    }
  }
});

test('the black spot’s ring (R2-02): one crisp band, 8–12 px, just outside it — silver-white on its inside, gold on its outside, never HDR (no bloom)', () => {
  const R = 150;
  const w = FILM.black.halo;
  assert.ok(w >= 8 && w <= 12, `${w} px wide`);
  for (const d of [0, 60, R - 2]) near(filmHalo(d, R).alpha, 0, 1e-9, `${d} px: nothing inside the black spot`);
  for (let d = R + 1; d <= R + w - 1; d += 0.5) near(filmHalo(d, R).alpha, 1, 1e-9, `${d} px: the ring`);
  for (const d of [R + w + 2, R + 40, R + 300]) near(filmHalo(d, R).alpha, 0, 1e-9, `${d} px: nothing outside it`);
  const inner = filmHalo(R + 1.5, R).color;
  const outer = filmHalo(R + w - 1.5, R).color;
  assert.ok(sat(inner) < 0.15, `silver-white inside (${inner.map((v) => v.toFixed(2))})`);
  assert.ok(outer[0] > outer[1] && outer[1] > outer[2] && sat(outer) > 0.6, `gold outside (${outer.map((v) => v.toFixed(2))})`);
  for (let d = R; d <= R + w; d += 0.5) assert.ok(Math.max(...filmHalo(d, R).color) <= 1, 'no HDR: a crisp line, not a bloom');
  near(filmHalo(R + 4, 0).alpha, 0, 0, 'no spot, no ring');
});

test('on 2495 the ring runs between his ω and his eyes (R2-02): his ω whole inside the clear window, his eyes outside it', () => {
  const s = filmAt(BR.BREAK_END - 1);
  // Measured on the --final still of the break's last frame (rings scanned about the apex): the ω's ink with its outline and hard shadow reaches 0.44 em
  // of its own size from its ink centre, each eye's 0.17 em of its size toward the ω. On screen a glyph's size is × the camera's zoom.
  const zoom = launchCam(BR.BREAK_END - 1).zoom;
  const chars = heroChars(BR.BREAK_END - 1, { advance: (c) => (HERO_ADVANCE as Record<string, number>)[c] ?? 0.6 });
  const omega = chars.find((c) => c.ch === 'ω')!;
  const eyes = chars.filter((c) => c.ch === '•');
  assert.equal(eyes.length, 2);
  const inner = s.blackPx;
  const outer = s.blackPx + FILM.black.halo;
  assert.ok(inner >= 0.44 * omega.size * zoom, `the ring (from ${inner} px) clears the ω’s ink (${(0.44 * omega.size * zoom).toFixed(0)} px)`);
  for (const e of eyes) {
    const [ex, ey] = toScreen(launchCam(BR.BREAK_END - 1), e.x, e.y);
    const gap = Math.hypot(ex - s.apex[0], ey - s.apex[1]) - 0.17 * e.size * zoom;
    assert.ok(outer <= gap, `the ring (to ${outer} px) stays inside the eye at ${gap.toFixed(0)} px`);
  }
});

test('what the film does to the picture (filmOver, R2-01): ink stays #111, his amber stays amber, the black spot is a clear window, the violet ground carries the colour', () => {
  const ink = linear('#111111');
  const amber = linear('#FFB23E');
  const violet = linear('#A78BFA');
  const luma = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const none = { alpha: 0, color: [0, 0, 0] as RGB };
  for (let d = 0; d <= 2600; d += 25) {
    const film = thinFilmRGB(d);
    for (const env of [filmEnv([0, 0, 1]), filmEnv([-0.2, 0.1, 1]), filmEnv([0.6, 0.05, 1]), filmEnv([0.3, 0.2, -1])]) {
      const refl = film.map((v, i) => v * env[i] + FILM.spec * Math.max(env[i] - 0.4, 0)) as unknown as RGB;
      const o = filmOver(ink, { film, refl, amount: 1, hero: 0, black: 0, halo: none });
      assert.ok(luma(o) <= luma(ink) * 1.03 + 1e-9, `ink lifts ≤ 3 % (${d} nm: ${o.map((v) => v.toFixed(4))})`);
      assert.ok(sat(o) < 0.05, `and keeps its hue (${d} nm)`);
      assert.deepEqual(filmOver(amber, { film, refl, amount: 1, hero: 1, black: 0, halo: none }), amber, `his amber untouched (${d} nm)`);
      assert.deepEqual(filmOver(violet, { film, refl, amount: 1, hero: 0, black: 1, halo: none }), violet, `the black spot is clear (${d} nm)`);
    }
  }
  // The thin film’s colour shows on the violet ground (it carries the colour): somewhere in its first orders it shifts a channel by > 0.04.
  const env = filmEnv([0, 0, 1]);
  let shift = 0;
  for (let d = 100; d <= 450; d += 10) {
    const film = thinFilmRGB(d);
    const v = filmOver(violet, { film, refl: film.map((c, i) => c * env[i]) as unknown as RGB, amount: 1, hero: 0, black: 0, halo: none });
    shift = Math.max(shift, ...v.map((c, i) => Math.abs(c - violet[i])));
  }
  assert.ok(shift > 0.04, `violet carries the colour (a channel shifts by ${shift.toFixed(3)})`);
  const thin = thinFilmRGB(420);
  const refl = thin.map((v, i) => v * env[i]) as unknown as RGB;
  const ring = { alpha: 1, color: [1, 1, 1] as RGB };
  const over = filmOver(amber, { film: thin, refl, amount: 1, hero: 1, black: 0, halo: ring });
  assert.ok(over[2] - amber[2] <= 0.3 * (1 - amber[2]) + 1e-9, 'the ring crosses his ink at ≤ 30 %');
  assert.deepEqual(filmOver(violet, { film: thin, refl, amount: 1, hero: 0, black: 0, halo: ring }), [1, 1, 1], 'and is solid on the ground');
});

test('the world is seen 1:1 through the film (R2-01): no lens, no per-channel offset — a soap film is two parallel surfaces a micron apart', () => {
  assert.equal(FILM.lens, 0);
  assert.ok(!/bend/u.test(FILM_FRAG), 'no bend in the shader');
  assert.ok(/texture2D\(backplate, suv\)/u.test(FILM_FRAG), 'the backplate is sampled at its own pixel');
  // Drop 2 splices this shader (scenes/drop2Slash.ts remnantShader): it needs the last `void main() {` and a final gl_FragColor line.
  assert.ok(FILM_FRAG.lastIndexOf('void main() {') > 0);
  assert.ok(/gl_FragColor\s*=\s*vec4\(([\s\S]*),\s*1\.0\);\s*\}\s*$/u.test(FILM_FRAG), 'drop 2’s splice still finds the last line');
  for (const u of ['anchor', 'resolution']) assert.ok(new RegExp(`uniform vec2 ${u};`, 'u').test(FILM_FRAG), `drop 2’s splice reads ${u}`);
});

test('the thickness drains: thicker at the bottom than the top; thinner on the bulge’s slopes than where it is flat, so the fringes contour it', () => {
  const s = filmAt(at(6, 3.5) - 1);
  const row = (y: number) => Array.from({ length: 40 }, (_, i) => filmThickness(24 + 48 * i, y, s)).reduce((a, b) => a + b) / 40;
  assert.ok(row(1000) > row(80) + 150, `bottom ${row(1000).toFixed(0)} nm, top ${row(80).toFixed(0)} nm`);
  const b = filmAt(at(6, 4.5) - 1);
  const [ax, ay] = b.anchor;
  let steep: [number, number] = [ax, ay];
  let g = 0;
  for (let x = 20; x < ax; x += 5) {
    const [gx] = filmGradient(x, ay, b);
    if (Math.abs(gx) > g) [g, steep] = [Math.abs(gx), [x, ay]];
  }
  const avg = (s0: typeof b, x: number, y: number) => {
    let t = 0;
    for (let i = 0; i < 9; i++) t += filmThickness(x, y + (i - 4) * 4, s0);
    return t / 9;
  };
  assert.ok(avg(b, steep[0], steep[1]) < avg(filmAt(at(6, 3.5) - 1), steep[0], steep[1]) * 0.75, 'stretched thin on the slope');
});

test('the marbling flows upward, races through the held breath, and swells on every hat', () => {
  const s0 = filmAt(at(6, 3.25) - 2);
  const s1 = filmAt(at(6, 3.25) - 1);
  const v = FILM.flow * FILM.marbleScale;
  // The pattern one frame later sits v px higher (marbling only: compare the deviation from the drained base; the film is flat here).
  const base = (y: number): number => FILM.thick * (FILM.drainTop + (1 - FILM.drainTop) * (1 - (1 - y / 1080) ** 2));
  let err = 0;
  for (let x = 100; x < 1900; x += 150) {
    for (let y = 300; y < 900; y += 100) err += Math.abs(filmThickness(x, y - v, s1) - base(y - v) - (filmThickness(x, y, s0) - base(y)));
  }
  assert.ok(err / 48 < 6, `the marbling moved up ${v.toFixed(1)} px a frame (mean error ${(err / 48).toFixed(1)} nm)`);
  assert.ok(filmAt(at(6, 4.75)).flow - filmAt(at(6, 4.75) - 1).flow > 2 * (filmAt(at(6, 3.5)).flow - filmAt(at(6, 3.5) - 1).flow), 'it races after 26.4&');
  const hat = BR.CLOSED_HATS.find((h) => h >= at(6, 3))!;
  assert.ok(filmAt(hat).pulse > filmAt(hat + 4).pulse && filmAt(hat).pulse >= 1.39, 'a hat swells it by 40 %');
});

test('the tremble: none before the held breath, ±2 px, a new offset every 2 frames taken at the output frame', () => {
  assert.deepEqual(filmAt(at(6, 4.5) - 1).tremble, [0, 0]);
  const seen = new Set<string>();
  for (let F = at(6, 4.5); F < BR.BREAK_END; F++) {
    const t = filmAt(F).tremble;
    assert.ok(Math.abs(t[0]) <= 2 && Math.abs(t[1]) <= 2, `±2 px on ${F}`);
    for (const s of shutter(F)) assert.deepEqual(filmAt(s).tremble, t, `whole on ${F}`);
    if (F % 2 === 0) assert.deepEqual(filmAt(F + 1).tremble, t, `held for 2 frames from ${F}`);
    seen.add(t.join());
  }
  assert.ok(seen.size >= 4, 'it keeps trembling');
});

test('thin-film colour: black under 30 nm, soap colours (gold, magenta, blue, green) where thin, nearly clear where thick, at most the stylised 0.5', () => {
  for (const d of [0, 10, 20, 29]) assert.ok(Math.max(...thinFilmRGB(d)) < 0.02, `${d} nm is black film`);
  const hues = new Set<string>();
  let peak = 0;
  for (let d = 80; d <= 700; d += 5) {
    const c = thinFilmRGB(d);
    peak = Math.max(peak, ...c);
    if (sat(c) > 0.35) {
      const [r, g, b] = c;
      hues.add(r > g && r > b ? (b > g ? 'magenta' : 'gold') : g > b ? 'green' : 'blue');
    }
  }
  assert.ok(peak >= 0.25 && peak <= 0.5, `stylised reflectance peaks at ${peak.toFixed(3)}`);
  assert.deepEqual([...hues].sort(), ['blue', 'gold', 'green', 'magenta'], 'the soap sequence');
  assert.ok(sat(thinFilmRGB(3000)) < 0.15, 'washed out where thick');
  assert.ok(Math.max(...thinFilmRGB(2000)) < 0.06, 'and nearly invisible: a thick film reflects its physical 4 %');
  // R2-01: the colour is weighted by thinness — the thick film (most of the frame) is almost clear.
  const chroma = (d: number): number => Math.max(...[...Array(21).keys()].map((i) => { const c = thinFilmRGB(d - 50 + 5 * i); return Math.max(...c) - Math.min(...c); }));
  assert.ok(chroma(1000) < 0.15 * chroma(400), `thick (1000 nm: ${chroma(1000).toFixed(3)}) next to clear against thin (400 nm: ${chroma(400).toFixed(3)})`);
  assert.ok(chroma(1300) < 0.01, `no colour at the drained bottom's 1300 nm (${chroma(1300).toFixed(4)})`);
  // Tilting the film thins its optical path: the colour of d at an angle is the colour of a thinner film head-on.
  const tilt = thinFilmRGB(400, 0.8);
  const cosT = Math.sqrt(1 - (1 - 0.8 ** 2) / FILM.n ** 2);
  thinFilmRGB(400 * cosT).forEach((v, i) => near(tilt[i], v, 1e-9, 'Snell'));
});

test('colour only where the film is thin (R2-01): a band of fine fringes at the drained top and on the bulge’s flanks; clear over the middle and the bottom of the frame', () => {
  const chromaAt = (s: ReturnType<typeof filmAt>, x: number, y: number): number => {
    const c = thinFilmRGB(filmThickness(x, y, s));
    return Math.max(...c) - Math.min(...c);
  };
  const band = (s: ReturnType<typeof filmAt>, y0: number, y1: number): number => {
    let t = 0;
    let n = 0;
    for (let x = 20; x < 1920; x += 37) {
      for (let y = y0; y < y1; y += 23) {
        t += chromaAt(s, x, y);
        n++;
      }
    }
    return t / n;
  };
  const flat = filmAt(at(6, 3.5) + 2);
  assert.ok(band(flat, 0, 160) > 0.05, `the drained top shows colour (${band(flat, 0, 160).toFixed(3)})`);
  assert.ok(band(flat, 540, 1080) < 0.01, `the lower half is clear (${band(flat, 540, 1080).toFixed(4)})`);
  assert.ok(band(flat, 540, 1080) < 0.1 * band(flat, 0, 160), 'colour where thin, not over the whole frame');
  // The marbling is fine (R2-01c: about 120 px, not 260 px blotches) with sharp band edges: in the top band the thickness changes by
  // ≥ 5 nm a px on average, so a colour band (≈ 200 nm of the second order) is ≤ 40 px across.
  assert.ok(FILM.marbleScale <= 130, `marbling scale ${FILM.marbleScale} px`);
  let grad = 0;
  let count = 0;
  for (let x = 30; x < 1890; x += 13) {
    for (let y = 10; y < 200; y += 11) {
      grad += Math.hypot(filmThickness(x + 1, y, flat) - filmThickness(x - 1, y, flat), filmThickness(x, y + 1, flat) - filmThickness(x, y - 1, flat)) / 2;
      count++;
    }
  }
  assert.ok(grad / count >= 5, `fine fringes: ${(grad / count).toFixed(2)} nm a px`);
  // On the break's last frame the bulge's steep left flank is stretched thin: colour there, at the frame's middle height.
  const s = filmAt(BR.BREAK_END - 1);
  let flank = 0;
  for (let x = 120; x < s.anchor[0] - 150; x += 10) flank = Math.max(flank, chromaAt(s, x, s.anchor[1]));
  assert.ok(flank > 0.1, `colour on the bulge’s flank (${flank.toFixed(3)})`);
});

test('the LUT the shader samples is thinFilmRGB itself (drop 2 rebuilds the same texture)', () => {
  const lut = filmLUT();
  assert.equal(lut.data.length, lut.size * 4);
  for (const i of [0, 17, 300, lut.size - 1]) {
    const d = (i / (lut.size - 1)) * lut.maxNm;
    thinFilmRGB(d).forEach((v, c) => near(lut.data[4 * i + c], v, 1e-6, `LUT ${i}`));
  }
});

test('the studio it reflects: bright softboxes, thin strips in drop 2’s colours seen only on the bulge, a soft grey behind the screen', () => {
  const key = filmEnv([-0.2, 0.1, 1]);
  assert.ok(Math.min(...key) > 1, 'the key softbox is white and bright');
  const behind = filmEnv([0.3, -0.2, -1]);
  assert.ok(Math.max(...behind) < 1 && sat(behind) < 0.05, 'behind the screen (the steep slopes look there): an even neutral grey, never a light');
  // The blur the shader passes where the dimple minifies the studio softens a light's edge without moving it.
  assert.ok(filmEnv([-0.31, 0.1, 1], 0.05)[0] > filmEnv([-0.31, 0.1, 1])[0], 'blur spreads the edge');
  near(filmEnv([-0.2, 0.1, 1], 0.05)[0], key[0], 0.15, 'and keeps the middle');
  const flat = new Set<string>();
  for (let x = -0.3; x <= 0.3; x += 0.02) for (let y = -0.17; y <= 0.17; y += 0.02) flat.add(sat(filmEnv([x, y, 1])) > 0.5 ? 'colour' : 'neutral');
  assert.deepEqual([...flat], ['neutral'], 'no coloured strip shows while the film is flat');
  let coloured = 0;
  for (let x = -0.9; x <= 0.9; x += 0.03) for (let y = -0.9; y <= 0.9; y += 0.03) if (sat(filmEnv([x, y, 1])) > 0.5 && Math.max(...filmEnv([x, y, 1])) > 0.5) coloured++;
  assert.ok(coloured > 20, 'the strips are out there for the bulge to find');
});

test('filmText: the window printed on the film, every glyph with its place on the film and on screen (the bulge pulls it in), for drop 2 to tear off', () => {
  const t = filmText(BR.BREAK_END - 1);
  const text = t.map((g) => g.ch).join('');
  for (const s of ['access', 'granted', '125%']) assert.ok(text.includes(s.replace(/\s/gu, '')), `${s} is printed`);
  assert.ok(!text.includes(WINDOW_TEXTS.plain), 'no plaintext password on 2495');
  for (const g of t) {
    assert.ok(g.x > 1000 && g.x < 1920 && g.y > 0 && g.y < 300, `${g.ch} in the window's corner`);
    const d = Math.hypot(g.screen[0] - g.x, g.screen[1] - g.y);
    assert.ok(d < 40, `${g.ch} moved ${d.toFixed(1)} px by the bulge`);
    assert.ok(Math.hypot(g.screen[0] - 960, g.screen[1] - 540) <= Math.hypot(g.x - 960, g.y - 540) + 1e-9, 'pulled toward the centre, never out');
  }
  assert.deepEqual(filmText(at(6, 3) - 1), filmText(at(6, 3) - 1).map((g) => ({ ...g, screen: [g.x, g.y] })), 'flat before the bulge: on screen where it is printed');
});

test('2447 → 2448 looks the same: on 2448 the film has (next to) no colour and no depth, so the window printed on it sits exactly where it sat', () => {
  for (const s of shutter(at(6, 3))) {
    const f = filmAt(s);
    assert.ok(f.amount <= 0.002, `colour ${f.amount} at ${s}`);
    assert.equal(f.depth, 0);
  }
  assert.equal(BR.FILM.from, at(6, 3));
});

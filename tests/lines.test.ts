import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RGB } from '../src/engine/color.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import type { Shape } from '../src/engine/shapeField.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { typeset } from '../src/engine/typeset.ts';
import { PANIC } from '../src/content/castDrop1.ts';
import { BUILD_KICKS, CLAPS, FLIP, GRAB, HIT, KICKS, LEVELS, LIGHTS_OUT, ROLL, SIDE, SMASH, SPLASH } from '../src/score/drop1.ts';
import { partFrame } from '../src/score/film.ts';
import { clubSegment, clubTemporal } from '../src/shots/glass.ts';
import { CLUB_TEXTS, type ClubLayout, FORMATIONS, HERO, NEON, TUNNEL, VOID, heroAt, linesFrame } from '../src/shots/lines.ts';

/** Brackets narrow, everything else one width: symmetric enough that a face's middle is the middle of its outer characters. */
const L: ClubLayout = { advance: (ch) => (ch === ' ' ? 0.3 : '()（）'.includes(ch) ? 0.4 : 0.8) };
const P = Math.PI;
const START = LEVELS.cosmos; // club 1.1
const [CROSS, STAR, SPOKES] = FORMATIONS; // club 1.3, club 2.1, club 2.3
const FREEZE = LIGHTS_OUT; // club 3.2
const range = (a: number, b: number, step = 1) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
const hero = (f: number) => {
  const h = heroAt(f);
  assert.ok(h, `(•ω•) is there at ${f}`);
  return h;
};

/** Lit glyphs at `f` (the tubes that are on: the club's light layer and, in front of it, his). */
const lit = (f: number, withHero = true): readonly Glyph[] => {
  const c = linesFrame(f, L, withHero);
  return [...(c.light.glyphs.neon ?? []), ...(c.front.light.glyphs.neon ?? [])];
};
/** The instants the club photographs output frame `F` at (its sub-frames, inside its segment). */
const subframes = (F: number): number[] => temporalSamples(F, clubTemporal(F), clubSegment(F)).map((s) => s.frame);
const unit = (c: RGB) => {
  const n = Math.hypot(...c);
  return c.map((v) => v / n);
};
/** `c` is the neon `hue` at some brightness. */
const isHue = (c: RGB, hue: RGB): boolean => {
  const a = unit(c);
  const b = unit(hue);
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] > 0.9999;
};
const brightness = (gs: readonly Glyph[]) => gs.reduce((s, g) => s + g.color[0] + g.color[1] + g.color[2], 0);

/** The guest: the amber or red sign in the middle (drawn without (•ω•), so only he is amber or red there). */
function guest(f: number): { face: string; red: boolean; x: number; y: number; size: number } {
  const gs = lit(f, false)
    .filter((g) => Math.abs(g.x) < 400 && Math.abs(g.y) < 120 && (isHue(g.color, NEON.amber) || isHue(g.color, NEON.red)))
    .sort((a, b) => a.x - b.x);
  assert.ok(gs.length > 0, `the guest is lit at ${f}`);
  const first = gs[0];
  const last = gs[gs.length - 1];
  const left = first.x - (L.advance(first.ch) * first.size) / 2;
  const right = last.x + (L.advance(last.ch) * last.size) / 2;
  return { face: gs.map((g) => g.ch).join(''), red: gs.every((g) => isHue(g.color, NEON.red)), x: (left + right) / 2, y: gs.reduce((s, g) => s + g.y, 0) / gs.length, size: first.size };
}

/**
 * The formation at `f`: its lines of dancers, each as its direction (in eighths of a half turn) and its signed distance from the
 * centre (to 10 px). A line is a dozen or more big lit glyphs of one size on one straight line; the tunnel's cards, each a size of
 * its own, and the small echoes and lattice are not lines. Sample on frames without a hop.
 */
function formation(f: number): string[] {
  const n = new Map<string, number>();
  for (const g of lit(f, false)) {
    if (g.size < 30) continue;
    const r = g.rot ?? 0;
    let d = ((r % P) + P) % P;
    if (d > P - 1e-3) d -= P;
    const o = -g.x * Math.sin(d) + g.y * Math.cos(d);
    const k = `${Math.round(d / (P / 8))}/${Math.round(o / 10) * 10}/${g.size}`;
    n.set(k, (n.get(k) ?? 0) + 1);
  }
  return [...new Set([...n].filter(([, c]) => c >= 12).map(([k]) => k.split('/').slice(0, 2).join('/')))].sort();
}
const directions = (lines: readonly string[]) => [...new Set(lines.map((l) => Number(l.split('/')[0])))].sort((a, b) => a - b);
const throughCentre = (lines: readonly string[]) => lines.filter((l) => l.endsWith('/0'));

/** How the big dancers move from `f` to `f + 1` (each matched to its nearest twin, outside the guest's clearing): shares moving inwards and along their own line, mean speed. */
function flow(f: number): { n: number; inward: number; along: number; speed: number } {
  const big = (g: number) => lit(g, false).filter((x) => x.size >= 30 && Math.hypot(x.x, x.y) > 300 && Math.abs(x.x) < 960 && Math.abs(x.y) < 540);
  const a = big(f);
  let n = 0;
  let inward = 0;
  let along = 0;
  let speed = 0;
  for (const g of big(f + 1)) {
    let best: Glyph | null = null;
    let bd = Infinity;
    for (const h of a) {
      if (h.ch !== g.ch || h.rot !== g.rot) continue;
      const d = Math.hypot(g.x - h.x, g.y - h.y);
      if (d < bd) [best, bd] = [h, d];
    }
    if (!best || bd > 20) continue;
    n++;
    speed += bd;
    if (Math.hypot(g.x, g.y) < Math.hypot(best.x, best.y)) inward++;
    const r = g.rot ?? 0;
    if (bd > 0.5 && Math.abs(-(g.x - best.x) * Math.sin(r) + (g.y - best.y) * Math.cos(r)) < 0.05) along++;
  }
  return { n, inward: inward / n, along: along / n, speed: speed / n };
}

/** Heights of the lit dancers on the level lines (away from the guest), lowest first. */
const rows = (f: number) => [...new Set(lit(f, false).filter((g) => g.size >= 30 && Math.sin(g.rot ?? 0) === 0 && Math.abs(g.x) > 300).map((g) => Math.round(100 * g.y) / 100))].sort((a, b) => a - b);
/** The kicks that keep the formation (club 1.3, club 2.1 and club 2.3 snap to a new one). */
const steadyKicks = () => KICKS.filter((k) => k > CROSS && k < FREEZE && k !== STAR && k !== SPOKES);

/** The cocktail: the pink tubes (the glass, then the drink running down him), as their middle and how many. */
function cocktail(f: number): { n: number; x: number; y: number; reach: number } {
  const ts = linesFrame(f, L, false).light.under.filter((s) => s.kind === 'segment' && isHue(s.color, NEON.pink));
  const x = ts.reduce((s, t) => s + t.x, 0) / ts.length;
  const y = ts.reduce((s, t) => s + t.y, 0) / ts.length;
  return { n: ts.length, x, y, reach: Math.max(0, ...ts.map((t) => Math.hypot(t.x, t.y) + t.w / 2)) };
}

// ── The guest ────────────────────────────────────────────────────────────

test('on club 1.1 the guest is a point at the far end of a tunnel of dancers and the camera flies in on him: he grows every frame, full size by club 1.3', () => {
  assert.ok(guest(START).size < 8, `a point: ${guest(START).size.toFixed(1)} px`);
  for (const f of range(START + 1, CROSS + 1)) assert.ok(guest(f).size > guest(f - 1).size, `closer at ${f}`);
  assert.ok(guest(CROSS).size >= 60, `full size: ${guest(CROSS).size}`);
  const sizes = new Set(lit(partFrame('club', 1, 1), false).filter((g) => !isHue(g.color, NEON.amber)).map((g) => g.size.toFixed(1)));
  assert.ok(sizes.size > 20, `the tunnel's dancers come in ${sizes.size} sizes (near and far)`);
  // Faster and faster: the camera gains on him, so he grows more in the tunnel's last beat than in its first.
  const growth = (a: number, b: number) => Math.log(guest(b).size / guest(a).size);
  assert.ok(growth(CROSS - 24, CROSS) > 2 * growth(START, START + 24), `last beat ×${Math.exp(growth(CROSS - 24, CROSS)).toFixed(2)}, first ×${Math.exp(growth(START, START + 24)).toFixed(2)}`);
});

test('the tunnel is drawn in perspective with the guest at its vanishing point: the farther (smaller) dancers sit nearer to him', () => {
  for (const f of [START + 6, START + 24, CROSS - 6]) {
    const cards = lit(f, false).filter((g) => !isHue(g.color, NEON.amber) && g.ch !== '✦').sort((a, b) => a.size - b.size);
    const q = Math.floor(cards.length / 4);
    assert.ok(q >= 50, `${f}: ${cards.length} lit glyphs in the tunnel`);
    const dist = (gs: readonly Glyph[]) => gs.reduce((s, g) => s + Math.hypot(g.x, g.y), 0) / gs.length;
    const far = dist(cards.slice(0, q));
    const near = dist(cards.slice(-q));
    assert.ok(far < 0.5 * near, `${f}: the smallest quarter averages ${far.toFixed(0)} px from him, the biggest ${near.toFixed(0)} px`);
  }
});

test('the guest stands still in the middle: calm (￣▽￣) until the kick, wet (・_・) once the drink lands on him, red (╯°□°)╯ from club 3.2 to the hit', () => {
  for (const f of range(START, HIT)) {
    const g = guest(f);
    assert.ok(Math.abs(g.x) < 2 && Math.abs(g.y) < 2, `centred at ${f}: (${g.x.toFixed(1)}, ${g.y.toFixed(1)})`);
    if (f < SIDE) assert.equal(g.face, '(￣▽￣)', `calm at ${f}`);
    else if (f >= SIDE + 12 && f < FREEZE) assert.equal(g.face, '(・_・)', `wet at ${f}`);
    else if (f >= FREEZE) {
      assert.equal(g.face, '(╯°□°)╯', `flipping at ${f}`);
      assert.ok(g.red, `red at ${f}`);
    }
    if (f < FREEZE) assert.ok(!g.red, `not red yet at ${f}`);
  }
  const faces = range(SIDE, SIDE + 13).map((f) => guest(f).face);
  assert.equal(new Set(faces).size, 2, 'one change, within half a beat of the kick');
  assert.ok(faces.indexOf('(・_・)') > 0, 'the drink lands after the kick');
});

test('he holds a cocktail beside his face until club 3.1; the kick flings it up and over onto him, the drink runs down him, and it is gone when the lights die', () => {
  const held = cocktail(CROSS);
  assert.ok(held.n > 0, 'a glass');
  assert.ok(held.x > 60 && held.x < 300 && Math.abs(held.y) < 60, `in his hand, right of his face: (${held.x.toFixed(0)}, ${held.y.toFixed(0)})`);
  for (const f of range(CROSS, SIDE + 1)) assert.deepEqual(cocktail(f), held, `held still at ${f}`);
  const flight = range(SIDE + 1, SIDE + 12).map(cocktail);
  const peak = Math.max(...flight.map((c) => c.y));
  assert.ok(peak > held.y + 80, `flung up: ${peak.toFixed(0)} px`);
  assert.ok(peak > flight[flight.length - 1].y + 20, `and over, coming down onto him: peak ${peak.toFixed(0)}, last ${flight[flight.length - 1].y.toFixed(0)}`);
  assert.ok(flight.every((c) => c.n === held.n), 'the glass flies whole');
  // From the frame he is wet: the glass upturned on him and the drink running down, all over his face.
  for (const f of range(SIDE + 12, FREEZE)) {
    const c = cocktail(f);
    assert.ok(c.n > held.n && Math.abs(c.x) < 50 && c.reach < 200, `${f}: on him (${c.n} tubes round (${c.x.toFixed(0)}, ${c.y.toFixed(0)}), within ${c.reach.toFixed(0)} px)`);
  }
  for (const f of range(FREEZE, HIT, 4)) assert.equal(cocktail(f).n, 0, `${f}: no glass once the lights die`);
});

// ── The formations ───────────────────────────────────────────────────────

test('on club 1.3 the tunnel snaps flat into a cross: two lines of dancers through the guest at right angles', () => {
  assert.deepEqual(formation(CROSS - 1), [], 'the tunnel has no flat lines');
  for (const f of [CROSS + 16, STAR - 1]) {
    const lines = formation(f);
    assert.equal(lines.length, 2, `${f}: ${lines}`);
    assert.equal(throughCentre(lines).length, 2, `${f}: ${lines}`);
    const [a, b] = directions(lines);
    assert.equal(b - a, 4, 'at right angles');
  }
});

test('on club 2.1 the cross becomes a 米 star: lines through the guest in four directions 45° apart, more lines than the cross', () => {
  for (const f of [STAR + 16, SPOKES - 1]) {
    const lines = formation(f);
    assert.deepEqual(directions(throughCentre(lines)), [0, 2, 4, 6], `${f}: ${lines}`);
    assert.ok(lines.length > formation(CROSS + 16).length, `${f}: ${lines}`);
  }
  assert.notDeepEqual(formation(STAR + 16), formation(STAR - 1));
});

test('the formations snap on kicks of the score — the cross on club 1.3, the 米 on club 2.1, the spokes on club 2.3 — and the tunnel runs from club 1.1 to the cross', () => {
  assert.deepEqual([...FORMATIONS], [partFrame('club', 1, 2), partFrame('club', 2), partFrame('club', 2, 2)]);
  for (const f of FORMATIONS) assert.ok(KICKS.includes(f), `${f} is a kick`);
  assert.deepEqual({ ...TUNNEL }, { from: START, to: CROSS });
});

test('on club 2.3 the star turns into spokes streaming in towards the guest: every line runs through him and the dancers move inwards', () => {
  const star = formation(SPOKES - 1);
  for (const f of [SPOKES + 20, SPOKES + 40]) {
    const lines = formation(f);
    assert.notDeepEqual(lines, star, `${f}: the formation changes`);
    assert.ok(lines.length > star.length, `${f}: more lines than the star: ${lines} against ${star}`);
    assert.ok(lines.length >= 4 && throughCentre(lines).length === lines.length, `${f}: ${lines}`);
    const m = flow(f);
    assert.ok(m.n >= 50 && m.inward > 0.9, `${f}: ${(100 * m.inward).toFixed(0)}% of ${m.n} dancers move inwards`);
  }
  const before = flow(SPOKES - 10);
  assert.ok(before.inward < 0.7, `in the star the lines run through: ${(100 * before.inward).toFixed(0)}% move inwards`);
});

test('each formation snaps on its beat: held through the half beat before club 1.3, club 2.1 and club 2.3, already a new shape two frames after', () => {
  for (const at of [CROSS, STAR, SPOKES]) {
    const before = formation(at - 1);
    const early = formation(at - 10);
    assert.ok(early.length === before.length && directions(early).join() === directions(before).join(), `${at}: nothing moves early: ${early} → ${before}`);
    assert.notDeepEqual(directions(formation(at + 2)), directions(before), `${at}: a new shape by ${at + 2}: ${formation(at + 2)}`);
  }
});

/** How much light the dancers put on the screen at `f`: every lit cyan or pink glyph inside the frame, its area (advance × size²) times its brightness. */
const ink = (f: number): number =>
  lit(f, false)
    .filter((g) => g.ch !== '✦' && (isHue(g.color, NEON.cyan) || isHue(g.color, NEON.pink)) && Math.abs(g.x) < 960 && Math.abs(g.y) < 540)
    .reduce((s, g) => s + L.advance(g.ch) * g.size * g.size * (g.color[0] + g.color[1] + g.color[2]), 0);

test('each formation lights more of the screen than the one before: the spokes of club 2.3 more than the 米, every frame from the snap to the kick of club 3.1', () => {
  const mean = (fs: readonly number[]) => fs.reduce((s, f) => s + ink(f), 0) / fs.length;
  const cross = mean(range(CROSS + 12, STAR, 4));
  const star = mean(range(STAR + 12, SPOKES, 4));
  const spokes = range(SPOKES + 12, SIDE, 4);
  assert.ok(star > cross, `the 米 ${star.toFixed(0)} against the cross ${cross.toFixed(0)}`);
  assert.ok(mean(spokes) > star, `the spokes ${mean(spokes).toFixed(0)} against the 米 ${star.toFixed(0)}`);
  for (const f of spokes) assert.ok(ink(f) > 0.95 * star, `${f}: the spokes ${ink(f).toFixed(0)} against the 米's ${star.toFixed(0)}`);
});

test('every line flows along itself like a conveyor, in every formation', () => {
  for (const f of [CROSS + 16, STAR + 38, SPOKES + 40]) {
    const m = flow(f);
    assert.ok(m.n >= 50, `${f}: ${m.n} dancers matched`);
    assert.ok(m.along > 0.9, `${f}: ${(100 * m.along).toFixed(0)}% move along their line`);
    assert.ok(m.speed > 1, `${f}: ${m.speed.toFixed(2)} px a frame`);
  }
});

// ── On the beat ──────────────────────────────────────────────────────────

test('every kick is a hop: the dancers on the level lines leave the floor on the frame after it, all together, and are down again by the next kick', () => {
  const kicks = steadyKicks();
  assert.equal(kicks.length, 4);
  for (const k of kicks) {
    const before = rows(k - 1);
    assert.ok(before.length > 0, `${k}: level lines`);
    assert.ok(rows(k + 1)[0] > before[0] + 1, `${k}: already rising on ${k + 1}`);
    const up = rows(k + 4);
    assert.equal(up.length, before.length, `${k}: the same rows`);
    const lift = up[0] - before[0];
    assert.ok(lift > 5, `${k}: lifted ${lift.toFixed(1)} px`);
    up.forEach((y, i) => assert.ok(Math.abs(y - before[i] - lift) < 0.01, `${k}: every row lifts together`));
    assert.deepEqual(rows(k + 23), before, `${k}: down by the next kick`);
  }
  for (const k of kicks.filter((x) => x < SIDE)) assert.ok(hero(k + 4).y > hero(k - 1).y + 5, `(•ω•) hops on ${k}`);
});

test('each hop lands by the and as softly as it took off: no fall between two frames is bigger than the biggest rise', () => {
  for (const k of steadyKicks()) {
    const ys = range(k - 1, k + 24).map((f) => rows(f)[0]);
    const steps = ys.slice(1).map((y, i) => y - ys[i]);
    const rise = Math.max(...steps);
    const fall = -Math.min(...steps);
    assert.ok(fall <= rise, `${k}: falls ${fall.toFixed(1)} px in a frame, rises at most ${rise.toFixed(1)}`);
    assert.equal(ys[14], ys[0], `${k}: back on the floor by the and`);
  }
});

test('every clap swaps everyone’s pose at once: the lit faces change on each clap and hold through the beat', () => {
  const chars = (f: number) => new Set(lit(f, false).map((g) => g.ch));
  const set = (f: number) => [...chars(f)].sort().join('');
  for (const c of CLAPS.filter((x) => x >= START && x < SIDE)) {
    assert.notEqual(set(c), set(c - 1), `pose swap on ${c}`);
    // Everyone, not some: strokes of the old poses vanish from the whole frame, strokes of the new ones appear.
    const [was, now] = [chars(c - 1), chars(c)];
    assert.ok([...was].some((ch) => !now.has(ch)), `${c}: some old pose is still lit somewhere`);
    assert.ok([...now].some((ch) => !was.has(ch)), `${c}: no new pose`);
    assert.equal(set(c - 12), set(c - 13), `no swap half a beat before ${c}`);
    assert.equal(set(c + 12), set(c + 11), `no swap half a beat after ${c}`);
    if (c > CROSS) assert.notEqual(hero(c).face, hero(c - 1).face, `(•ω•) swaps on ${c} too`);
  }
});

test('on every clap in the lines the lit tubes and the unlit glass trade places: each dancer’s new pose is the one that stood dark beside it', () => {
  /** How many of each character the big dancers show, lit or as unlit glass. */
  const count = (gs: readonly Glyph[] | undefined) => {
    const m = new Map<string, number>();
    for (const g of gs ?? []) if (g.size === 40) m.set(g.ch, (m.get(g.ch) ?? 0) + 1);
    return m;
  };
  const apart = (a: Map<string, number>, b: Map<string, number>) => [...new Set([...a.keys(), ...b.keys()])].reduce((s, k) => s + Math.abs((a.get(k) ?? 0) - (b.get(k) ?? 0)), 0);
  const total = (a: Map<string, number>) => [...a.values()].reduce((s, n) => s + n, 0);
  for (const c of CLAPS.filter((x) => x > CROSS && x < SIDE)) {
    const [was, now] = [linesFrame(c - 1, L, false), linesFrame(c, L, false)];
    const lit0 = count(was.light.glyphs.neon);
    const dark0 = count(was.dark.glyphs.neon);
    const lit1 = count(now.light.glyphs.neon);
    assert.ok(total(lit0) > 100, `${c}: ${total(lit0)} lit strokes`);
    assert.ok(apart(lit1, lit0) > 0.2 * total(lit0), `${c}: the lit poses change`);
    assert.ok(apart(lit1, dark0) <= 0.03 * total(lit0), `${c}: ${apart(lit1, dark0)} lit strokes are not the glass that was dark`);
    assert.ok(apart(count(now.dark.glyphs.neon), lit0) <= 0.03 * total(lit0), `${c}: the old pose goes dark`);
  }
});

// ── (•ω•) ────────────────────────────────────────────────────────────────

test('from club 1.3 (•ω•) dances, walks in beside the guest and kicks the glass on club 3.1', () => {
  const faces = new Set<string>();
  for (const f of range(CROSS, SIDE)) {
    const h = hero(f);
    assert.ok((HERO.dance as readonly string[]).includes(h.face), `${f}: ${h.face}`);
    faces.add(h.face);
  }
  assert.equal(faces.size, 2, 'both dance poses');
  assert.ok(HERO.dance.includes('(•ω•)'));
  assert.ok(Math.hypot(hero(SPOKES - 1).x, hero(SPOKES - 1).y) > 450, 'out on the lines before club 2.3');
  for (const f of range(SIDE, SIDE + 6)) assert.equal(hero(f).face, HERO.kick, `kicking at ${f}, long enough to read`);
  assert.ok(Math.hypot(hero(SIDE).x, hero(SIDE).y) < 400 && hero(SIDE).x > 0, 'beside the guest, on the glass’s side, when he kicks');
});

test('on club 3.2 the guest grabs him: sweating, held over the guest’s head until he is thrown', () => {
  for (const f of range(FREEZE, FLIP)) assert.equal(hero(f).face, HERO.sweat, `${f}`);
  for (const f of range(FREEZE + 14, FLIP)) {
    const h = hero(f);
    assert.ok(h.y > 100 && Math.abs(h.x) < 100, `${f}: held up at (${h.x.toFixed(0)}, ${h.y.toFixed(0)})`);
  }
});

test('on the and of club 3.2 the guest’s hand lands: (•ω•) is yanked over his head as an impact — from a start on the 32nd grid, faster every frame, exactly held on GRAB, a small rebound', () => {
  // His shake while held is sideways only, so his height shows the yank.
  const y = (f: number) => hero(f).y;
  const from = y(LIGHTS_OUT);
  const start = range(LIGHTS_OUT, GRAB + 1).find((f) => y(f + 1) !== from)!;
  assert.equal((start - LIGHTS_OUT) % 3, 0, `the yank starts on the grid: ${start}`);
  for (const f of range(LIGHTS_OUT, start + 1)) assert.equal(y(f), from, `still beside the guest at ${f}`);
  const steps = range(start, GRAB).map((f) => y(f + 1) - y(f));
  steps.slice(1).forEach((s, i) => assert.ok(s > steps[i], `faster every frame into the grab: ${steps.map((v) => v.toFixed(1))}`));
  const held = y(GRAB);
  assert.ok(held > 150, `held up over his head on the grab: ${held.toFixed(1)}`);
  assert.ok(Math.abs(y(GRAB + 1) - held) < 0.2 * steps[steps.length - 1], `stopped on the grab: ${steps[steps.length - 1].toFixed(1)} px into it, ${(y(GRAB + 1) - held).toFixed(1)} after`);
  const rebound = Math.max(...range(GRAB + 1, GRAB + 12).map(y)) - held;
  assert.ok(rebound > 1 && rebound < 0.1 * (held - from), `a small rebound: ${rebound.toFixed(1)} px`);
});

test('on club 3.2 everything else freezes and the lights die: the dancers stop dead and dim to under a third until the throw', () => {
  const crowd = (f: number) => lit(f, false).filter((g) => g.ch !== '✦' && (isHue(g.color, NEON.cyan) || isHue(g.color, NEON.pink)));
  const where = (f: number) => crowd(f).map((g) => `${g.ch}${g.x.toFixed(2)},${g.y.toFixed(2)}`).sort().join('|');
  const lights = brightness(crowd(FREEZE - 1));
  const still = where(FREEZE);
  for (const f of range(FREEZE, FLIP)) {
    assert.equal(where(f), still, `frozen at ${f}`);
    assert.ok(brightness(crowd(f)) < lights / 3, `dark at ${f}`);
  }
  assert.notEqual(where(FREEZE - 1), where(FREEZE - 2), 'moving before');
});

test('thrown on club 3.3, he grows every frame until he fills the screen on the hit', () => {
  for (let f = FLIP + 0.25; f <= HIT; f += 0.25) assert.ok(hero(f).size >= hero(f - 0.25).size, `${f}: ${hero(f - 0.25).size.toFixed(1)} → ${hero(f).size.toFixed(1)}`);
});

test('thrown on club 3.3, he flies at us: small in the guest’s hands, bigger than a sixteenth before at every frame, filling the screen on the hit', () => {
  const at = (f: number) => hero(f).size;
  assert.ok(at(FLIP) < 100, `small when thrown: ${at(FLIP).toFixed(0)} px`);
  for (const f of range(FLIP + 6, HIT + 1)) assert.ok(at(f) > at(f - 6), `${f}: ${at(f - 6).toFixed(1)} → ${at(f).toFixed(1)}`);
  for (const f of range(FLIP + 24, HIT + 1, 24)) assert.ok(at(f) > at(f - 24) * 1.1, `beat ${f}`);
  const last = hero(HIT - 1);
  assert.ok(last.size >= 540, `an em of ${last.size.toFixed(0)} px on the last frame before the glass`);
  assert.ok(typeset(last.face, L.advance).width * last.size > 1920, 'his face wider than the screen');
  assert.ok(at(HIT - 1) > 10 * at(FLIP));
});

test('in flight he panics: a panic face that changes on the beat, at least every other beat, and always keeps his ω', () => {
  for (const f of [...HERO.dance, HERO.kick, HERO.sweat, ...HERO.panic, HERO.dying]) assert.ok(f.includes('ω'), `${f} keeps the ω`);
  const faces = range(FLIP, HIT).map((f) => hero(f).face);
  for (const f of faces) assert.ok((HERO.panic as readonly string[]).includes(f), f);
  assert.ok(new Set(faces).size >= 3, `${new Set(faces).size} different faces`);
  for (let i = 0; i + 48 <= faces.length; i++) assert.ok(new Set(faces.slice(i, i + 48)).size >= 2, `the same face for two beats from ${FLIP + i}`);
  // Only on the beat (the kicks driving the throw), never flickering in between.
  for (let i = 1; i < faces.length; i++) if (faces[i] !== faces[i - 1]) assert.ok(BUILD_KICKS.includes(FLIP + i), `the face changes off the beat at ${FLIP + i}`);
});

test('every beat of the throw has a panic face of its own: the last and biggest never repeats the first', () => {
  const beats = BUILD_KICKS.map((k) => hero(k).face);
  assert.equal(beats.length, 5);
  assert.equal(new Set(beats).size, beats.length, `${beats}`);
  assert.equal(hero(HIT - 1).face, beats[beats.length - 1]);
});

test('the drums of the throw hit him: on each kick and each first drum of the roll after a pause he jumps bigger, well beyond his growth on the frames round it', () => {
  const drums = [...BUILD_KICKS, ...ROLL].sort((a, b) => a - b);
  const accents = drums.filter((d, i) => i > 0 && d > FLIP && d - drums[i - 1] >= 12);
  assert.equal(accents.length, 4, `${accents}`);
  const grow = (f: number) => hero(f).size / hero(f - 1).size - 1;
  for (const d of accents) {
    const round = Math.max(grow(d - 2), grow(d - 1), grow(d + 1), grow(d + 2));
    assert.ok(grow(d) > 1.5 * round, `${d}: +${(100 * grow(d)).toFixed(1)}% against at most +${(100 * round).toFixed(1)}% a frame round it`);
  }
});

test('the throw sends a shock out through the crowd: the dancers pull scared faces from the guest outwards, and by the hit most of them are scared', () => {
  const crowd = (f: number) => lit(f, false).filter((g) => isHue(g.color, NEON.cyan) || isHue(g.color, NEON.pink));
  const dancing = new Set(crowd(FLIP - 1).map((g) => g.ch));
  const scared = new Set(PANIC.flatMap((p) => [...p]));
  /** Glyphs no dance pose has: strokes of scared faces. */
  const fresh = (f: number) => crowd(f).filter((g) => !dancing.has(g.ch));
  assert.equal(fresh(FLIP).length, 0, 'nothing yet on the throw');
  for (const g of fresh(FLIP + 45)) assert.ok(scared.has(g.ch), `${g.ch} is a stroke of a scared face`);
  assert.ok(fresh(FLIP + 45).some((g) => g.size >= 30), 'the dancers on the lines, not only the small ones behind');
  const front = (f: number) => Math.max(...fresh(f).map((g) => Math.hypot(g.x, g.y)));
  const fronts = [FLIP + 20, FLIP + 30, FLIP + 45, FLIP + 60].map(front);
  fronts.slice(1).forEach((r, i) => assert.ok(r > fronts[i] + 50, `the wave runs out: ${fronts.map((x) => x.toFixed(0))}`));
  assert.ok(fronts[0] < 800, `it starts near him: ${fronts[0].toFixed(0)} px`);
  assert.ok(fresh(HIT - 1).length > 0.4 * crowd(HIT - 1).length, `${fresh(HIT - 1).length} of ${crowd(HIT - 1).length} lit strokes are scared by the hit`);
});

test('he shakes all the way to the glass, harder near the hit than near the flip', () => {
  /** Jerk of his position and tilt off a smooth flight: the second difference at `f`. */
  const jerk = (f: number) => {
    const [a, b, c] = [hero(f - 1), hero(f), hero(f + 1)];
    return { p: Math.hypot(a.x - 2 * b.x + c.x, a.y - 2 * b.y + c.y), r: Math.abs(a.rot - 2 * b.rot + c.rot) };
  };
  const mean = (a: number, b: number, k: 'p' | 'r') => range(a, b).reduce((s, f) => s + jerk(f)[k], 0) / (b - a);
  for (const f of range(FLIP + 1, HIT - 3, 2)) assert.ok(jerk(f).p + jerk(f + 1).p > 0.5, `still around ${f}`);
  for (let b = FLIP + 1; b + 24 <= HIT; b += 24) {
    assert.ok(mean(b, b + 24, 'p') > 2, `shaking through the beat from ${b}`);
    assert.ok(mean(b, b + 24, 'r') > 0.01, `tilting through the beat from ${b}`);
  }
  assert.ok(mean(HIT - 25, HIT - 1, 'p') > 2 * mean(FLIP + 1, FLIP + 25, 'p'), 'harder near the hit');
  assert.ok(mean(HIT - 25, HIT - 1, 'r') > mean(FLIP + 1, FLIP + 25, 'r'), 'tilting harder near the hit');
});

// ── Drawing ──────────────────────────────────────────────────────────────

test('drawn without (•ω•), a frame is the same frame minus exactly his face, which is amber', () => {
  const key = (g: Glyph) => `${g.ch}@${g.x.toFixed(3)},${g.y.toFixed(3)},${g.size.toFixed(3)}`;
  for (const f of range(CROSS, HIT, 7)) {
    const rest = new Map<string, number>();
    for (const g of lit(f, false)) rest.set(key(g), (rest.get(key(g)) ?? 0) + 1);
    const extra: Glyph[] = [];
    for (const g of lit(f, true)) {
      const n = rest.get(key(g)) ?? 0;
      if (n > 0) rest.set(key(g), n - 1);
      else extra.push(g);
    }
    assert.equal([...rest.values()].reduce((s, n) => s + n, 0), 0, `${f}: nothing else goes`);
    assert.equal(extra.map((g) => g.ch).join(''), [...hero(f).face].filter((c) => c.trim() !== '').join(''), `${f}`);
    assert.ok(extra.every((g) => isHue(g.color, NEON.amber)), `${f}: amber`);
    assert.deepEqual(linesFrame(f, L, false).dark, linesFrame(f, L, true).dark, `${f}: no unlit glass of him either`);
  }
});

test('(•ω•) hides what he passes in front of: an opaque body in the club’s black behind his tubes covers his whole face, drawn in front of the club', () => {
  /** `p` lies inside rect `s` (turned by its rot), at least `mx` and `my` px inside its edges. */
  const inside = (s: Shape, x: number, y: number, mx: number, my: number) => {
    const r = s.rot ?? 0;
    const u = (x - s.x) * Math.cos(r) + (y - s.y) * Math.sin(r);
    const v = -(x - s.x) * Math.sin(r) + (y - s.y) * Math.cos(r);
    return Math.abs(u) <= s.w / 2 - mx && Math.abs(v) <= s.h / 2 - my;
  };
  for (const f of range(CROSS, HIT, 3)) {
    const c = linesFrame(f, L);
    const body = c.front.dark.under;
    const tubes = c.front.light.glyphs.neon ?? [];
    assert.ok(tubes.length > 0, `${f}: his tubes`);
    assert.equal(body.length, 1, `${f}: one body`);
    const b = body[0];
    assert.ok(b.kind === 'rect' && (b.alpha ?? 1) === 1 && b.color.every((v, i) => v === VOID[i]), `${f}: an opaque body in the club's black`);
    // Every glyph of his face lies on it, a good half em clear of its edges (its soft edge included).
    for (const g of tubes) assert.ok(inside(b, g.x, g.y, 0.4 * g.size * (g.stretch ?? 1) + (b.soft ?? 0), 0.5 * g.size), `${f}: his ${g.ch} at (${g.x.toFixed(0)}, ${g.y.toFixed(0)}) sticks out of his body`);
    // Drawn without him, nothing is in front of the club.
    const bare = linesFrame(f, L, false).front;
    assert.equal(bare.dark.under.length + (bare.light.glyphs.neon ?? []).length, 0, `${f}: nothing in front without him`);
  }
});

test('he shakes from frame to frame, never inside one: from the grab to the hit, across the sub-frames of every frame his face moves as one smooth blur', () => {
  /** His drawn face at instant `s`: its middle and its turn. */
  const face = (s: number) => {
    const gs = linesFrame(s, L).front.light.glyphs.neon ?? [];
    return { x: gs.reduce((a, g) => a + g.x, 0) / gs.length, y: gs.reduce((a, g) => a + g.y, 0) / gs.length, rot: gs[0].rot ?? 0, chars: gs.map((g) => g.ch).join('') };
  };
  for (const F of range(LIGHTS_OUT, HIT)) {
    const ps = subframes(F).map(face);
    for (let i = 1; i < ps.length; i++) {
      assert.equal(ps[i].chars, ps[0].chars, `${F}: one face through the frame`);
      const d = Math.hypot(ps[i].x - ps[i - 1].x, ps[i].y - ps[i - 1].y);
      assert.ok(d < 3, `${F}: his face jumps ${d.toFixed(1)} px between two sub-frames`);
      assert.ok(Math.abs(ps[i].rot - ps[i - 1].rot) < 0.01, `${F}: his face turns ${(ps[i].rot - ps[i - 1].rot).toFixed(3)} rad between two sub-frames`);
    }
  }
});

test('every swap made on a drum is whole on the drum’s frame: each of its sub-frames shows the new state, each of the frame before the old', () => {
  const amberOrRed = (g: Glyph) => isHue(g.color, NEON.amber) || isHue(g.color, NEON.red);
  /** What changes on the drums, on screen: his face, the guest's face, the dancers' poses (their characters) and how bright the big dancers are lit. */
  const state = (s: number): string => {
    const c = linesFrame(s, L);
    const club = (c.light.glyphs.neon ?? []).filter((g) => Math.abs(g.x) < 960 + g.size && Math.abs(g.y) < 540 + g.size);
    const him = (c.front.light.glyphs.neon ?? []).map((g) => g.ch).join('');
    const guest = club.filter((g) => amberOrRed(g) && Math.abs(g.x) < 400 && Math.abs(g.y) < 150).sort((a, b) => a.x - b.x).map((g) => g.ch).join('');
    const dancers = club.filter((g) => !amberOrRed(g) && g.ch !== '✦');
    const poses = [...new Set(dancers.map((g) => g.ch))].sort().join('');
    // (Once the tunnel has faded out and the cross faded in.)
    const lights = s >= TUNNEL.to + 4 ? Math.max(0, ...dancers.filter((g) => g.size >= 30).map((g) => g.color[0] + g.color[1] + g.color[2])).toFixed(2) : '';
    return `${him}|${guest}|${poses}|${lights}`;
  };
  const drums = [...new Set([...CLAPS.filter((c) => c >= START && c <= LIGHTS_OUT), ...FORMATIONS, SIDE, SPLASH, LIGHTS_OUT, ...BUILD_KICKS])].sort((a, b) => a - b);
  for (const e of drums) {
    const now = subframes(e).map(state);
    const was = subframes(e - 1).map(state);
    assert.equal(new Set(now).size, 1, `${e}: its frame mixes ${new Set(now).size} states:\n${[...new Set(now)].join('\n')}`);
    assert.equal(new Set(was).size, 1, `${e - 1}: the frame before mixes ${new Set(was).size} states`);
    assert.notEqual(now[0], was[0], `${e}: the swap shows on its frame`);
  }
});

test('fast moves blur instead of printing copies: on every frame from club 1.1 to the hit, consecutive sub-frames move no lit glyph on screen by more than a tenth of its em (its tube’s stroke)', () => {
  /** Lit glyphs at instant `s`: the club's and his. */
  const glyphs = (s: number): readonly Glyph[] => {
    const c = linesFrame(s, L);
    return [...(c.light.glyphs.neon ?? []), ...(c.front.light.glyphs.neon ?? [])];
  };
  const h = 1e-3;
  let worst = { F: 0, ratio: 0 };
  for (const F of range(START, HIT)) {
    const t = clubTemporal(F);
    const dt = t.shutter / t.samples;
    // The screen speed of every glyph at five instants across the frame's shutter: each glyph matched a thousandth of a frame later to the
    // same character nearest to it. Nothing on screen moves 4 px in that time (4000 px a frame); a glyph is skipped when no character like
    // it lies that close, or when another lies within 8 px (too crowded to tell them apart).
    for (const s of [-0.5, -0.25, 0, 0.25, 0.5].map((k) => F + k * t.shutter).filter((s) => s >= clubSegment(F).from && s + h < clubSegment(F).to)) {
      const [a, b] = [glyphs(s), glyphs(s + h)];
      const cell = (x: number, y: number) => `${Math.floor(x / 8)},${Math.floor(y / 8)}`;
      const grid = new Map<string, Glyph[]>();
      for (const g of b) grid.set(cell(g.x, g.y), [...(grid.get(cell(g.x, g.y)) ?? []), g]);
      for (const g of a) {
        if (Math.abs(g.x) > 960 + g.size || Math.abs(g.y) > 540 + g.size) continue;
        const near: number[] = [];
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const n of grid.get(cell(g.x + 8 * i, g.y + 8 * j)) ?? []) if (n.ch === g.ch) near.push(Math.hypot(n.x - g.x, n.y - g.y));
        near.sort((p, q) => p - q);
        if (!(near[0] < 4) || near[1] < 8) continue;
        const ratio = ((near[0] / h) * dt) / Math.max(0.1 * g.size, 1.5);
        if (ratio > worst.ratio) worst = { F, ratio };
      }
    }
  }
  assert.ok(worst.ratio <= 1, `frame ${worst.F}: copies ${worst.ratio.toFixed(2)} strokes apart`);
});

test('the club’s sub-frames stay in one shot each: the lines from club 1.1 to the hit, the glass to the break, the shards from break 1.1 — no cut on club 3.1', () => {
  for (let f = START; f < HIT; f++) assert.deepEqual(clubSegment(f), { from: START, to: HIT }, `${f}`);
  for (let f = HIT; f < SMASH; f++) assert.deepEqual(clubSegment(f), { from: HIT, to: SMASH }, `${f}`);
  assert.equal(clubSegment(SMASH).from, SMASH);
});

test('every character the club draws is in CLUB_TEXTS, so the atlas has it', () => {
  const atlas = new Set(CLUB_TEXTS.flatMap((t) => [...t]));
  for (const f of range(START, HIT, 3)) {
    const c = linesFrame(f, L);
    // (•ω•) included: he is drawn in front of the club, from the same atlas.
    for (const layer of [c.dark, c.light, c.fore, c.front.dark, c.front.light]) {
      for (const [k, gs] of Object.entries(layer.glyphs)) {
        assert.equal(k, 'neon', 'one atlas');
        for (const g of gs) assert.ok(atlas.has(g.ch), `${f}: ${g.ch} (U+${g.ch.codePointAt(0)!.toString(16)}) is not in the atlas`);
      }
    }
  }
});

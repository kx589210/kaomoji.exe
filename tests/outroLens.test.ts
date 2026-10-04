// S34 STILL HERE (outro 2.1–end − 1, build sheet §4.2 rows outro 2.1–2.4&, §5.13): ヽ(•ω•)ﾉ holds the lens open, the arms let go, the only wink of
// the film lands on the frame the log promised, ↑ recalls the first command, and the cursor blinks S01's two blinks to the last frame;
// W5 comes back calm. Read back from what the shot draws.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SCREEN_TEXTS as FILM_TEXTS } from '../src/content/all.ts';
import { OUTRO_TEXTS as V04_TEXTS } from '../src/content/outroV04.ts';
// The v04 ending's strings left the film's list with it (src/content/outroV04.ts): its salvage sources check against both.
const SCREEN_TEXTS = [...FILM_TEXTS, ...V04_TEXTS];
import { COMMAND, CURSOR, PROMPT, DECODE as DECODE_CHARS } from '../src/content/boot.ts';
import { HERO_OUT, OUTRO_LOG_PRINT, W5 } from '../src/content/outroV04.ts';
import { SWAP_LEAD, temporalSamples } from '../src/engine/temporal.ts';
import { HERO_PHOSPHOR } from '../src/shots/outroPhosphor.ts';
import { ARMS_DOWN, CURSOR as CURSOR_BLINKS, MONITOR_BACK, OPEN, OUTRO_END, PROMISE, RECALL, TWINKLES, WINK } from '../src/score/outroV04.ts';
import { PHOSPHOR, introLook } from '../src/shots/intro.ts';
import { LENS_HERO, OUTRO_LENS_MONO, STAR_HOME, STAR_TWINKLES, OUTRO_LENS_ROUNDED, cursorLevel, lensCommand, lensHero, outroLensLook, outroLensTemporal, w5Content } from '../src/shots/outroLens.ts';
import { BUTTON, lidY, screenAt } from '../src/shots/outroScreen.ts';

/** The button's silence (outro 2.3&–2.4 − 1, round 2): he, the ✧ and the lens hold still; the rim's chase is the only motion. */
const held = (f: number) => f >= BUTTON.from && f < BUTTON.to;

const advance = (ch: string): number => ('()'.includes(ch) ? 0.42 : ch === ' ' ? 0.6 : 0.86);
const mono = (): number => 0.6;
const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const range = (a: number, b: number, step = 1) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);

test('outro 2.1: ヽ(•ω•)ﾉ in amber, em 174, centred (960, 540), the arms riding the top lid as it is pried open', () => {
  const h = lensHero(OPEN + 12, advance);
  assert.equal(h.face, '(•ω•)');
  assert.deepEqual(h.centre, [960, 540]);
  assert.ok(h.arms > 0.99, 'both arms up');
  const arms = h.glyphs.filter((g) => 'ヽﾉ'.includes(g.ch));
  assert.equal(arms.length, 2);
  near(arms[0].x + 960, 676, 1, 'ヽ left of his face');
  near(arms[1].x + 960, 1244, 1, 'ﾉ right of it, symmetric');
  near(arms[0].x + arms[1].x, 0, 1e-9, 'symmetric about x 960');
  // They push the lid: each sits just under the top lid, wherever it is.
  for (const f of [OPEN, OPEN + 2, OPEN + 5, OPEN + 11]) {
    const s = screenAt(f);
    const lid = lidY(s, 640, 'upper');
    const g = lensHero(f, advance).glyphs.find((x) => x.ch === 'ヽ')!;
    near(540 - g.y - lid, 0, 80, `${f}: the arm under the lid`);
    assert.ok(540 - g.y > lid, `${f}: below the lid line`);
  }
});

test('ruling 13: the arms hold the lens open through the wink; from outro 2.2& they slide down 80 px and fade over 12 f, leaving (•ω<)', () => {
  const y = (f: number) => lensHero(f, advance).glyphs.find((g) => g.ch === 'ヽ');
  assert.ok(ARMS_DOWN > WINK + 6, 'still up for a while after the wink');
  for (let f = OPEN; f < ARMS_DOWN - SWAP_LEAD; f += 0.25) assert.equal(lensHero(f, advance).arms, 1, `${f}: both arms up`);
  for (const f of [WINK - 1, WINK, WINK + 3, WINK + 6]) assert.equal(lensHero(f, advance).glyphs.filter((g) => 'ヽﾉ'.includes(g.ch) && (g.alpha ?? 1) === 1).length, 2, `${f}: ヽ(•ω<)ﾉ`);
  assert.ok(lensHero(ARMS_DOWN - 1, advance).arms > 0.99);
  assert.ok(lensHero(ARMS_DOWN + 6, advance).arms < 0.9 && lensHero(ARMS_DOWN + 6, advance).arms > 0.1);
  assert.ok(y(ARMS_DOWN + 6)!.y < y(ARMS_DOWN - 1)!.y - 20, 'sliding down');
  assert.equal(y(ARMS_DOWN + 12), undefined, 'gone by + 12');
});

test('the wink lands on exactly the frame the log promised: (•ω<) whole on every sub-frame of WINK, never a < before outro 2.2 − 2', () => {
  assert.ok(OUTRO_LOG_PRINT.find((l) => l.at === PROMISE && l.text.includes('blink-scheduler:'))!.text.endsWith(String(WINK)));
  /** His right eye: the fourth character of the face (arms and ✧ aside). */
  const eye = (f: number) => lensHero(f, advance).glyphs.filter((g) => !'ヽﾉ✧'.includes(g.ch))[3];
  for (const s of temporalSamples(WINK, outroLensTemporal(WINK))) {
    const g = eye(s.frame);
    assert.equal(g.ch, '<', `${s.frame}`);
    assert.equal(g.morph ?? 0, 0, `crisp at ${s.frame}`);
  }
  for (const f of range(OPEN, WINK - 2, 0.25)) assert.notEqual(eye(f).ch, '<', `no wink before its frame (${f})`);
  for (const f of range(OPEN, WINK - 4, 0.25)) assert.equal(eye(f).morph ?? 0, 0, `a crisp • until the morph (${f})`);
  // The morph: • grows into a dot-sized circle, which becomes the < (one shape all the way).
  const mid = eye(WINK - 2.25);
  assert.ok((mid.morph ?? 0) > 0.8, 'the circle between');
  assert.equal(lensHero(WINK, advance).face, '(•ω<)');
  for (const f of range(WINK, OUTRO_END)) assert.equal(lensHero(f, advance).face, '(•ω<)', `the wink holds (${f})`);
});

test('the wink re-spaces his face without a jump: the < keeps the •’s centre, the brackets glide out over the morph, outro 2.2 lands clean (R1-wink-relayout)', () => {
  // The real font's < is ≈ 0.15 em wider than its •. Laying the face out from the eye it wore pushed the brackets out 13 px at once on
  // the swap and doubled the whole face on that frame's sub-frames; holding (•ω•)'s spacing jammed the < against the ω (7 px against
  // 33). So the eye's slot widens with the morph — one continuous function of time, whole before outro 2.2's first sub-frame.
  const real = (ch: string): number => ({ '(': 0.42, ')': 0.42, '•': 0.44, '<': 0.59, ω: 0.9 })[ch] ?? 0.6;
  const grow = real('<') - real('•');
  /** Each face glyph's offset from his centre in ems (the breathing scales the whole face, so ems are what must hold still). */
  const layout = (f: number) => {
    const h = lensHero(f, real);
    return h.glyphs.filter((g) => !'ヽﾉ✧'.includes(g.ch)).map((g) => ({ ch: g.ch, em: (g.x - (h.centre[0] - 960)) / g.size }));
  };
  const before = layout(OPEN + 12);
  assert.deepEqual(before.map((g) => g.ch).join(''), '(•ω•)');
  // Before the morph: (•ω•) as typeset. After it: (•ω<) as typeset — the left three half the growth left, ) half right, the eye still.
  for (const f of range(OPEN, WINK - 4.25, 0.25)) layout(f).forEach((g, i) => near(g.em, before[i].em, 1e-9, `${f}: ${g.ch}`));
  const shift = [-grow / 2, -grow / 2, -grow / 2, 0, grow / 2];
  for (const f of range(WINK - 0.25, OUTRO_END, 0.25)) layout(f).forEach((g, i) => near(g.em, before[i].em + shift[i], 1e-9, `${f}: ${g.ch} typeset`));
  // In between, every glyph glides: never more than 0.001 em per 1/64 frame (a 13 px jump is 0.075 em).
  const fine = range(WINK - 8, WINK + 4, 1 / 64);
  for (let k = 1; k < fine.length; k++) {
    const [a, b] = [layout(fine[k - 1]), layout(fine[k])];
    b.forEach((g, i) => assert.ok(Math.abs(g.em - a[i].em) <= 1e-3, `${fine[k]}: ${g.ch} jumps ${(g.em - a[i].em).toFixed(4)} em`));
  }
  // The swap frame's sub-frames spread each bracket by a motion blur's width at most (≤ 0.02 em ≈ 3.5 px), never a double image;
  // every sub-frame of outro 2.2 draws one face.
  for (const F of [WINK - 3, WINK - 2, WINK - 1]) {
    const xs = temporalSamples(F, outroLensTemporal(F)).map((s) => layout(s.frame).map((g) => g.em));
    for (const i of [0, 1, 2, 4]) {
      const v = xs.map((x) => x[i]);
      assert.ok(Math.max(...v) - Math.min(...v) <= 0.02, `${F}: glyph ${i} spreads ${(Math.max(...v) - Math.min(...v)).toFixed(4)} em`);
    }
  }
  const at = temporalSamples(WINK, outroLensTemporal(WINK)).map((s) => layout(s.frame).map((g) => g.em));
  for (const x of at) x.forEach((e, i) => near(e, at[0][i], 1e-9, `${WINK}: glyph ${i} on every sub-frame`));
});

test('✧ pops on the wink up and right of his face, inside the lens, 0 → 1.25 → 1, and twinkles on every 8th from outro 2.2& (R1-bar36-quiet)', () => {
  const star = (f: number) => lensHero(f, advance).glyphs.find((g) => g.ch === '✧');
  assert.equal(star(WINK - 1), undefined);
  // The score's twinkles are among them; every 8th after the pop gets one, so the ✧ is never a still sticker — but for the button's
  // silence, where it holds still with everything else (round 2: the score's outro 2.3& twinkle is dropped).
  assert.deepEqual(STAR_TWINKLES, range(WINK + 12, OUTRO_END, 12).filter((t) => !held(t)));
  for (const t of TWINKLES) assert.ok(STAR_TWINKLES.includes(t) || held(t), `${t}`);
  // Its tip never holds still from the pop to the last frame: it swells, settles, turns.
  const tip = (f: number) => {
    const g = star(f)!;
    return { r: g.size / 2, a: g.rot ?? 0 };
  };
  for (let f = WINK + 1; f < OUTRO_END; f++) {
    if (held(f)) continue;
    const [a, b] = [tip(f - 1), tip(f)];
    const move = Math.abs(b.r - a.r) + b.r * Math.abs(b.a - a.a);
    assert.ok(move > 0.3, `${f}: the ✧'s tip moves ${move.toFixed(2)} px`);
  }
  // While his arms hold the lid it pops beyond the ﾉ — ヽ(•ω<)ﾉ✧ — and once they let go it settles beside his face (ruling 13).
  const far = star(WINK + 8)!;
  near(far.x + 960, 960 + LENS_HERO.star.dxArms, 1, 'x, beyond the arm');
  near(540 - far.y, 540 + LENS_HERO.star.dyArms, 1, 'y, beyond the arm');
  const s = { ...star(STAR_HOME.to)!, size: LENS_HERO.star.size };
  const c = lensHero(STAR_HOME.to, advance).centre;
  near(s.x + 960, c[0] + LENS_HERO.star.dx, 1, 'x');
  near(540 - s.y, c[1] + LENS_HERO.star.dy, 1, 'y (he has risen by then)');
  assert.ok(Math.abs(s.x + 960 - 1230) < 16 && Math.abs(540 - s.y - 430) < 25, 'near the sheet’s (1230, 430)');
  // Never on the arm: the ✧'s box (0.45 em each way, with its swell) and the ﾉ's (half its advance across, half an em up and down)
  // stay apart while the arm is there, and the ✧ glides home no faster than 18 px a frame.
  for (let f = WINK; f < STAR_HOME.to; f += 0.25) {
    const h = lensHero(f, advance);
    const arm = h.glyphs.find((g) => g.ch === 'ﾉ');
    const st = h.glyphs.find((g) => g.ch === '✧')!;
    if (arm && (arm.alpha ?? 1) > 0.25) {
      const r = 0.45 * st.size;
      const gap = st.x - r - (arm.x + 0.25 * arm.size);
      const below = arm.y - 0.5 * arm.size - (st.y + r);
      assert.ok(gap >= 0 || below >= 0, `${f}: the ✧ on the ﾉ (gap ${gap.toFixed(1)} px)`);
    }
    if (f + 0.25 < STAR_HOME.to) {
      const nx = lensHero(f + 0.25, advance).glyphs.find((g) => g.ch === '✧')!;
      assert.ok(Math.hypot(nx.x - st.x, nx.y - st.y) * 4 <= 18 + 1e-9, `${f}: the ✧ moves ${(Math.hypot(nx.x - st.x, nx.y - st.y) * 4).toFixed(1)} px a frame`);
    }
  }
  // Its tips (≈ 0.42 em from its centre in M PLUS Rounded; 0.45 with the blur) stay ≥ 4 px under the top lid on every frame, through
  // the lid's breath, the twinkles' swell and his rise (no glyph cut by the lens, none touching the rim).
  for (let f = WINK; f < OUTRO_END; f++) {
    const g = star(f)!;
    const top = 540 - g.y - 0.45 * g.size;
    const lid = lidY(screenAt(f), g.x + 960, 'upper');
    assert.ok(top - lid >= 4, `inside the lens (${f}: ${(top - lid).toFixed(1)} px)`);
  }
  const base = s.size;
  assert.ok(star(WINK + 3)!.size > 1.2 * base, 'the pop peaks at 1.25');
  assert.ok(star(WINK)!.size > 0.5 * base, 'already popping on the wink frame');
  for (const t of STAR_TWINKLES) {
    assert.ok(star(t + 3)!.size > 1.1 * base, `twinkle on ${t}`);
    assert.ok(star(t + 3)!.size > star(t)!.size && star(t + 3)!.size > star(t + 11)!.size, `a swell on ${t}`);
    if (t + 11 < OUTRO_END) near(star(t + 11)!.size, base, base * 0.02, `back just before the next 8th is keyed (${t + 11})`);
  }
  // It moves with him when he rises.
  near(540 - star(OUTRO_END - 1)!.y, 540 + LENS_HERO.star.dy - 35, 1, 'risen with him');
});

test('outro bar 2 is a living hold: his breath runs a quarter beat behind the lens’s, so one of them is always moving (R1-bar36-quiet)', () => {
  // The lids' speed (half the height's change) and his brackets' speed (≈ 1.35 em from his centre) in px a frame, after the arms
  // have gone: where the lens turns, he is at full speed, and the other way round. Before this his breath was half as fast and its
  // turns fell near the lens's, and outro 2.2 + 4 … 2.3 − 1 measured as dead frames.
  const real = (ch: string): number => ({ '(': 0.42, ')': 0.42, '•': 0.44, '<': 0.59, ω: 0.9 })[ch] ?? 0.6;
  const size = (f: number) => lensHero(f, real).glyphs[0].size;
  for (let f = ARMS_DOWN + 12; f < OUTRO_END; f++) {
    if (held(f) || f === BUTTON.to) continue; // the button's silence holds still; outro 2.4 restarts it (tests below)
    const lids = (Math.abs(screenAt(f).h - screenAt(f - 1).h) / 2) * screenAt(f).zoom;
    const face = Math.abs(size(f) - size(f - 1)) * 1.35;
    assert.ok(lids + face > 0.75, `${f}: lids ${lids.toFixed(2)} + face ${face.toFixed(2)} px`);
  }
});

test('outro 2.3: he rises 540 → 505 (L), and the last frame is the hand-off table’s: (•ω<)✧ at (960, 505)', () => {
  near(lensHero(RECALL - 1, advance).centre[1], 540, 1e-9, 'before');
  assert.ok(lensHero(RECALL, advance).centre[1] < 540, 'the launch moves on its own frame');
  // The v04 lens's own last frame (its 2-bar OUTRO_END, src/score/outroV04.ts), pinned to the pose v04's hand-off table gave it. It no
  // longer reads drop 2's HANDOFFS: that table's last row follows the film's ending (src/score/outro.ts), which is not this lens once the
  // outro is built through (ending integrator, b58).
  const last = { frame: OUTRO_END - 1, face: '(•ω<)✧', centre: [960, 505] } as const;
  const h = lensHero(last.frame, advance);
  assert.equal(`${h.face}✧`, last.face);
  near(h.centre[0], last.centre[0], 0.5, 'x');
  near(h.centre[1], last.centre[1], 0.5, 'y');
});

test('iteration 2: the wink’s frame lifts the screen’s exposure (its accent on outro 2.2) and swells no bloom — his phosphor would wash the black round the lens', () => {
  const look = (f: number) => outroLensLook(f);
  assert.ok(look(WINK).exposure > look(WINK - 1).exposure * 1.06, `${look(WINK - 1).exposure.toFixed(3)} → ${look(WINK).exposure.toFixed(3)}`);
  for (let f = WINK + 1; f < WINK + 12; f++) assert.ok(look(f).exposure < look(f - 1).exposure, `${f}: falling back`);
  near(look(WINK + 24).exposure, look(OUTRO_END - 1).exposure, 1e-3, 'gone by the 8th after');
  for (let f = WINK - 1; f <= WINK + 8; f++) {
    assert.ok(look(f).bloom.intensity <= look(f - 1).bloom.intensity + 1e-9 && look(f).bloom.radius <= look(f - 1).bloom.radius + 1e-9, `${f}: no bloom swell`);
    assert.equal(look(f).flash ?? 0, 0, `${f}: no white`);
  }
});

test('ruling 15: in the lens he is the CRT’s phosphor too — face and arms in amber that blooms; the ✧ stays pink', () => {
  const lum = (c: readonly number[]): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  for (let f = OPEN; f < OUTRO_END; f += 0.5) {
    for (const g of lensHero(f, advance).glyphs) {
      if (g.ch === '✧') {
        assert.ok(g.color[0] > 2 * g.color[1], `${f}: the ✧ pink`);
        continue;
      }
      assert.deepEqual(g.color, HERO_PHOSPHOR.ink, `${f}: "${g.ch}" phosphor amber`);
      assert.equal(g.tube ?? 0, 0, `${f}: "${g.ch}" amber all the way through`);
    }
  }
  assert.ok(lum(HERO_PHOSPHOR.ink) >= 1, 'it blooms');
});

test('↑ on outro 2.3 recalls the first command under him: a 3-frame decode shimmer, then `> kaomoji --run --party█` centred on (960, 690)', () => {
  assert.deepEqual(lensCommand(RECALL - 1, mono), []);
  const text = (f: number) => lensCommand(f, mono).map((g) => g.ch).join('');
  const full = `${PROMPT}${COMMAND}${CURSOR}`.replace(/ /g, '');
  for (const f of [RECALL, RECALL + 1]) {
    const gs = lensCommand(f, mono).filter((g) => g.ch !== CURSOR);
    assert.ok(gs.some((g) => DECODE_CHARS.includes(g.ch) && !full.includes(g.ch)) || text(f) !== full, `${f}: shimmering`);
  }
  assert.equal(text(RECALL + 2), full);
  const gs = lensCommand(RECALL + 2, mono);
  const xs = gs.map((g) => g.x);
  near((Math.min(...xs) + Math.max(...xs)) / 2, 0, 36 * 0.6, 'centred on x 960');
  assert.ok(gs.every((g) => Math.abs(540 - g.y - 690) < 1 && g.size === 36), 'JetBrains Mono 36 px on y 690');
});

test('the cursor keeps S01’s timing (R10): lit through each blink, then a phosphor fade; ≈ 29 % on the last frame, as frame 0 relights it', () => {
  for (const f of range(OPEN, RECALL)) assert.equal(cursorLevel(f), 0);
  for (const [a, b] of CURSOR_BLINKS) for (const f of range(a, b)) assert.equal(cursorLevel(f), 1, `${f}`);
  near(cursorLevel(CURSOR_BLINKS[0][1] + PHOSPHOR), Math.exp(-1), 1e-9, 'fading like phosphor');
  near(cursorLevel(OUTRO_END - 1), Math.exp(-(OUTRO_END - 1 - CURSOR_BLINKS[1][1]) / PHOSPHOR), 1e-9, 'the last frame');
  assert.ok(cursorLevel(OUTRO_END - 1) > 0.2 && cursorLevel(OUTRO_END - 1) < 0.35);
  const cur = (f: number) => lensCommand(f, mono).find((g) => g.ch === CURSOR)!;
  assert.ok(cur(OUTRO_END - 1).color[1] < cur(CURSOR_BLINKS[1][0]).color[1] * 0.4, 'the cursor glyph dims with it');
});

test('W5 types in bottom-left on outro 2.2& — friends 1, memory 1%, hype 1%, [ OK ] (•ω•) survived — and is not there before', () => {
  const empty = w5Content(MONITOR_BACK - 1, mono);
  assert.equal(empty.under.length + Object.values(empty.glyphs).flat().length, 0);
  const c = w5Content(MONITOR_BACK + 10, mono);
  const gs = Object.values(c.glyphs).flat();
  const rows = new Map<number, string>();
  for (const g of [...gs].sort((a, b) => a.x - b.x)) rows.set(Math.round(g.y), (rows.get(Math.round(g.y)) ?? '') + g.ch);
  const all = [...rows.values()];
  for (const r of W5.rows) assert.ok(all.some((t) => t.includes(r.replace(/ /g, ''))), `${r}`);
  assert.ok(all.some((t) => t.includes(W5.line.replace(/ /g, ''))), W5.line);
  assert.ok(gs.every((g) => g.x < -960 + 46 + 44 * 0.6 * 19 + 1 && g.y < -540 + 46 + 8 * 27), 'in the monitor’s slot, bottom-left');
  // Typed in over 8 frames.
  const partial = Object.values(w5Content(MONITOR_BACK + 3, mono).glyphs).flat().length;
  assert.ok(partial > 0 && partial < gs.length, 'typing');
});

test('the last frame keeps frame 0’s CRT, so a loop back to the first frame matches; the refresh band rolls on into frame 0’s', () => {
  const end = outroLensLook(OUTRO_END - 1).crt!;
  const first = introLook(0).crt!;
  assert.deepEqual({ ...end, band: 0 }, { ...first, band: 0 });
  near(end.band!, 1 - 1 / 96, 1e-9, 'one frame before the band wraps to frame 0’s 0');
  near(outroLensLook(OUTRO_END - 1).exposure, introLook(0).exposure, 1e-3, 'exposure');
  const [open, last] = [outroLensLook(OPEN).bloom, outroLensLook(OUTRO_END - 1).bloom];
  assert.ok(open.radius > last.radius * 1.2 && open.intensity > last.intensity * 1.2, 'a bloom pulse on the tonic');
  for (let f = OPEN; f < OUTRO_END; f++) assert.ok(outroLensLook(f).bloom.radius <= 0.95, `the blur's radius stays in its range (${f})`);
  assert.ok(outroLensLook(OPEN).crt!.scanlines < 0.1, 'the scanlines come back as it opens');
});

test('sampling: 32 sub-frames while the lens is pried open (outro 2.1–2.1 + 6), 16 after; no phosphor tail (the cursor fades itself)', () => {
  for (let f = OPEN; f <= OPEN + 6; f++) assert.ok(outroLensTemporal(f).samples >= 32, `${f}`);
  for (let f = OPEN + 7; f < OUTRO_END; f++) assert.equal(outroLensTemporal(f).samples, 16, `${f}`);
  for (let f = OPEN; f < OUTRO_END; f++) assert.equal(outroLensTemporal(f).persistence, 0);
});

test('every character the lens draws is in its atlas lists, and every one is checked by check-glyphs in its role', () => {
  const m = new Set(OUTRO_LENS_MONO);
  const r = new Set(OUTRO_LENS_ROUNDED);
  for (let f = OPEN; f < OUTRO_END; f += 0.5) {
    for (const g of lensHero(f, advance).glyphs) assert.ok(r.has(g.ch), `${f}: "${g.ch}" (rounded)`);
    for (const g of lensCommand(f, mono)) assert.ok(m.has(g.ch), `${f}: "${g.ch}" (mono)`);
    for (const g of Object.values(w5Content(f, mono).glyphs).flat()) assert.ok(m.has(g.ch), `${f}: "${g.ch}" (mono)`);
  }
  const checked = (role: string) => new Set(SCREEN_TEXTS.filter((t) => t.role === role).flatMap((t) => [...t.text]));
  for (const ch of OUTRO_LENS_MONO) assert.ok(checked('mono').has(ch), `"${ch}" (mono)`);
  for (const ch of OUTRO_LENS_ROUNDED) assert.ok(checked('rounded').has(ch), `"${ch}" (rounded)`);
  assert.ok([...HERO_OUT.wink].every((ch) => r.has(ch)));
});

test('R-OUT-BUTTON: the last tick flares only the rim (outroScreen.ts) — the lens’s look does not swell, so the black round the lens never lifts to grey', async () => {
  const { TICKS } = await import('../src/score/outroV04.ts');
  const tick = TICKS[TICKS.length - 1];
  for (let f = tick - 1; f <= tick + 8; f++) {
    const [a, b] = [outroLensLook(f - 1).bloom, outroLensLook(f).bloom];
    assert.ok(b.intensity <= a.intensity + 1e-9 && b.radius <= a.radius + 1e-9, `${f}: no bloom swell`);
    assert.equal(outroLensLook(f).flash ?? 0, 0, `${f}: no white`);
  }
});

test('OUT-BUTTON-UNSEEN: through the button’s silence (outro 2.3&–2.4 − 1) he, the ✧ and the recalled command hold exactly still; the tick on outro 2.4 starts them again', () => {
  const real = (ch: string): number => ({ '(': 0.42, ')': 0.42, '•': 0.44, '<': 0.59, ω: 0.9 })[ch] ?? 0.6;
  const face = (f: number) => lensHero(f, real).glyphs.filter((g) => g.ch !== '✧').map((g) => [g.ch, g.x, g.y, g.size]);
  const star = (f: number) => {
    const g = lensHero(f, real).glyphs.find((x) => x.ch === '✧')!;
    return [g.x, g.y, g.size, g.rot ?? 0];
  };
  const command = (f: number) => lensCommand(f, mono).filter((g) => g.ch !== CURSOR).map((g) => [g.ch, g.x, g.y, ...g.color]);
  const subs = (F: number) => temporalSamples(F, outroLensTemporal(F)).map((s) => s.frame);
  const [f0, s0, c0] = [face(BUTTON.from), star(BUTTON.from), command(BUTTON.from)];
  for (let F = BUTTON.from; F < BUTTON.to; F++) {
    for (const f of subs(F)) {
      assert.deepEqual(face(f), f0, `${f}: his face held`);
      if (F < BUTTON.to - 1 || f <= F) assert.deepEqual(star(f), s0, `${f}: the ✧ held (its outro 2.4 twinkle is keyed from outro 2.4 − 1)`);
    }
    assert.deepEqual(command(F), c0, `${F}: the command held`);
  }
  // He was moving into it and moves out of it: breath on both sides, the ✧'s twinkle with the tick.
  assert.notDeepEqual(face(BUTTON.from - 1), f0, 'breathing up to the stop');
  assert.notDeepEqual(face(BUTTON.to + 1), f0, 'breathing again after the tick');
  assert.ok(star(BUTTON.to + 2)[2] > s0[2] * 1.05, 'the ✧ twinkles with the tick');
  // The cursor keeps S01's timing through it (its fade is the film's first blink, not the picture's motion).
  assert.equal(cursorLevel(BUTTON.from), 1);
  assert.ok(cursorLevel(BUTTON.to - 1) < 0.5 && cursorLevel(BUTTON.to) === 1, 'it fades in the silence and relights with the tick');
});
